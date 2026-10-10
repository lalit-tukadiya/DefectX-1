"""Threaded inference worker maintaining bounded queue and latest-frame semantics.
Prevents blocking the asyncio event loop during deep learning model execution.
"""
import asyncio
import base64
import time
from typing import Dict, Any, Optional
import cv2
import numpy as np

from model.capture_quality import check_capture_quality
from model.preprocessing import preprocess_image
from model.patchcore_engine import predict_screw, generate_heatmap_overlay, extract_defect_regions


def bgr_to_base64_jpeg(image_bgr: np.ndarray, quality: int = 80) -> str:
    """Encodes BGR numpy image to base64 JPEG data URL."""
    success, buffer = cv2.imencode(".jpg", image_bgr, [int(cv2.IMWRITE_JPEG_QUALITY), quality])
    if not success:
        return ""
    b64 = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/jpeg;base64,{b64}"


def map_to_base64_png(anomaly_map: np.ndarray) -> str:
    """Encodes 0.0-1.0 float anomaly map as 8-bit PNG base64 for client-side thresholding."""
    norm = np.clip(anomaly_map, 0.0, 1.0)
    u8 = (norm * 255.0).astype(np.uint8)
    success, buffer = cv2.imencode(".png", u8)
    if not success:
        return ""
    b64 = base64.b64encode(buffer).decode("utf-8")
    return f"data:image/png;base64,{b64}"


def run_sync_inspection(
    image_bgr: np.ndarray,
    image_threshold: float = 0.55,
    pixel_threshold: float = 0.40,
    min_area: int = 12
) -> Dict[str, Any]:
    """CPU/GPU worker task executed in thread pool."""
    start_t = time.perf_counter()

    # 1. Quality Assessment Gate
    q_start = time.perf_counter()
    quality = check_capture_quality(image_bgr)
    q_ms = (time.perf_counter() - q_start) * 1000.0

    if not quality.is_valid:
        return {
            "status": "LOW_QUALITY_CAPTURE",
            "decision": "REJECT",
            "anomaly_score": 1.0,
            "quality_metrics": quality.to_dict(),
            "latency_ms": round((time.perf_counter() - start_t) * 1000.0, 2),
            "defect_regions": [],
            "heatmap_image_base64": "",
            "annotated_image_base64": bgr_to_base64_jpeg(image_bgr),
            "raw_anomaly_map_base64": ""
        }

    # 2. Preprocessing
    p_start = time.perf_counter()
    tensor, compensated_rgb = preprocess_image(image_bgr)
    p_ms = (time.perf_counter() - p_start) * 1000.0

    # 3. PatchCore Inference
    inf_start = time.perf_counter()
    result = predict_screw(
        image_bgr,
        image_threshold=image_threshold,
        pixel_threshold=pixel_threshold,
        min_area=min_area
    )
    inf_ms = (time.perf_counter() - inf_start) * 1000.0

    # 4. Annotation overlays
    annotated_bgr = image_bgr.copy()
    for region in result["defect_regions"]:
        x, y, w, h = region["bbox"]
        cv2.rectangle(annotated_bgr, (x, y), (x + w, y + h), (0, 0, 255), 2)
        cv2.putText(
            annotated_bgr,
            f"Score: {region['max_anomaly_score']:.2f}",
            (x, max(15, y - 5)),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.5,
            (0, 0, 255),
            1
        )

    total_latency_ms = (time.perf_counter() - start_t) * 1000.0

    return {
        "status": "RESULT_READY",
        "decision": result["decision"],
        "anomaly_score": result["anomaly_score"],
        "image_threshold": image_threshold,
        "pixel_threshold": pixel_threshold,
        "latency_ms": round(total_latency_ms, 2),
        "quality_metrics": quality.to_dict(),
        "defect_regions": result["defect_regions"],
        "heatmap_image_base64": bgr_to_base64_jpeg(result["heatmap_overlay"]),
        "annotated_image_base64": bgr_to_base64_jpeg(annotated_bgr),
        "raw_anomaly_map_base64": map_to_base64_png(result["anomaly_map"]),
        "latency_breakdown": {
            "quality_ms": round(q_ms, 2),
            "preprocessing_ms": round(p_ms, 2),
            "inference_ms": round(inf_ms, 2)
        }
    }


async def inspect_frame_async(
    image_bgr: np.ndarray,
    image_threshold: float = 0.55,
    pixel_threshold: float = 0.40,
    min_area: int = 12
) -> Dict[str, Any]:
    """Asynchronous wrapper that offloads processing to a thread worker."""
    return await asyncio.to_thread(
        run_sync_inspection,
        image_bgr,
        image_threshold,
        pixel_threshold,
        min_area
    )
