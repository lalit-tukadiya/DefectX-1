"""REST endpoints for manual inspection, inspection history, and threshold configurations.
"""
import os
import uuid
import time
from typing import List, Dict, Any, Optional
import cv2
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from workers.inference_worker import inspect_frame_async

router = APIRouter(prefix="/api/v1/inspection", tags=["Inspection"])

# In-memory inspection history for the session
INSPECTION_HISTORY: List[Dict[str, Any]] = []

CURRENT_CONFIG = {
    "image_threshold": 0.55,
    "pixel_threshold": 0.40,
    "min_defect_area": 12,
    "product_name": "screw_v1"
}


class ThresholdUpdateRequest(BaseModel):
    image_threshold: float
    pixel_threshold: float
    min_defect_area: int


@router.post("/upload")
async def inspect_uploaded_image(
    file: UploadFile = File(...),
    image_threshold: Optional[float] = Form(None),
    pixel_threshold: Optional[float] = Form(None),
    min_defect_area: Optional[int] = Form(None)
):
    """Inspects a single uploaded screw image (JPG/PNG)."""
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)

    if image_bgr is None:
        raise HTTPException(status_code=400, detail="Invalid image file format")

    img_th = image_threshold if image_threshold is not None else CURRENT_CONFIG["image_threshold"]
    pix_th = pixel_threshold if pixel_threshold is not None else CURRENT_CONFIG["pixel_threshold"]
    area_th = min_defect_area if min_defect_area is not None else CURRENT_CONFIG["min_defect_area"]

    result = await inspect_frame_async(
        image_bgr,
        image_threshold=img_th,
        pixel_threshold=pix_th,
        min_area=area_th
    )

    record_id = str(uuid.uuid4())[:8]
    history_record = {
        "id": record_id,
        "timestamp": time.time(),
        "filename": file.filename,
        "decision": result["decision"],
        "anomaly_score": result["anomaly_score"],
        "defects_count": len(result.get("defect_regions", [])),
        "latency_ms": result["latency_ms"],
        "status": result["status"]
    }
    INSPECTION_HISTORY.insert(0, history_record)
    result["record_id"] = record_id

    return result


@router.get("/history")
async def get_inspection_history():
    """Returns the list of recent inspections and aggregate yield metrics."""
    total = len(INSPECTION_HISTORY)
    pass_cnt = sum(1 for r in INSPECTION_HISTORY if r["decision"] == "PASS")
    reject_cnt = sum(1 for r in INSPECTION_HISTORY if r["decision"] == "REJECT")
    low_q_cnt = sum(1 for r in INSPECTION_HISTORY if r["status"] == "LOW_QUALITY_CAPTURE")
    yield_rate = (pass_cnt / total * 100.0) if total > 0 else 100.0
    avg_latency = (sum(r["latency_ms"] for r in INSPECTION_HISTORY) / total) if total > 0 else 0.0

    return {
        "summary": {
            "total_inspections": total,
            "pass_count": pass_cnt,
            "reject_count": reject_cnt,
            "low_quality_count": low_q_cnt,
            "yield_percentage": round(yield_rate, 1),
            "avg_latency_ms": round(avg_latency, 1)
        },
        "history": INSPECTION_HISTORY[:50]
    }


@router.get("/config")
async def get_threshold_config():
    return CURRENT_CONFIG


@router.post("/config")
async def update_threshold_config(req: ThresholdUpdateRequest):
    CURRENT_CONFIG["image_threshold"] = req.image_threshold
    CURRENT_CONFIG["pixel_threshold"] = req.pixel_threshold
    CURRENT_CONFIG["min_defect_area"] = req.min_defect_area
    return {"status": "SUCCESS", "config": CURRENT_CONFIG}
