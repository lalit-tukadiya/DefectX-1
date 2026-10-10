"""Anomaly localization, upsampling, heatmap blending, and bounding box extraction.
"""
from typing import List, Dict, Any, Tuple, Optional
import cv2
import numpy as np
import torch
import torch.nn.functional as F


def upsample_and_smooth_anomaly_map(
    anomaly_map_tensor: torch.Tensor,
    target_shape: Tuple[int, int],
    gaussian_sigma: float = 4.0
) -> np.ndarray:
    """Upsamples patch score grid to full frame dimensions and applies 2D Gaussian smoothing."""
    # Input tensor shape: (H_feat, W_feat)
    tensor_4d = anomaly_map_tensor.unsqueeze(0).unsqueeze(0).float()
    h, w = target_shape

    # Bicubic interpolation
    upsampled = F.interpolate(tensor_4d, size=(h, w), mode="bicubic", align_corners=False)
    map_np = upsampled.squeeze().numpy()

    # Gaussian smoothing
    kernel_size = int(2 * math_ceil(2 * gaussian_sigma) + 1)
    if kernel_size % 2 == 0:
        kernel_size += 1
    smoothed = cv2.GaussianBlur(map_np, (kernel_size, kernel_size), gaussian_sigma)
    return np.clip(smoothed, 0.0, None)


def math_ceil(val: float) -> int:
    return int(np.ceil(val))


def generate_heatmap_overlay(
    image_bgr: np.ndarray,
    anomaly_map_norm: np.ndarray,
    alpha: float = 0.5,
    colormap: int = cv2.COLORMAP_JET
) -> np.ndarray:
    """Blends thermal colormap with raw image frame."""
    h, w = image_bgr.shape[:2]
    norm_01 = np.clip(anomaly_map_norm, 0.0, 1.0)
    u8_map = (norm_01 * 255.0).astype(np.uint8)

    if u8_map.shape[:2] != (h, w):
        u8_map = cv2.resize(u8_map, (w, h), interpolation=cv2.INTER_CUBIC)

    colored_heatmap = cv2.applyColorMap(u8_map, colormap)
    overlay = cv2.addWeighted(colored_heatmap, alpha, image_bgr, 1.0 - alpha, 0)
    return overlay


def localize_defect_regions(
    anomaly_map_norm: np.ndarray,
    pixel_threshold: float = 0.40,
    min_area_pixels: int = 12,
    target_shape: Optional[Tuple[int, int]] = None
) -> List[Dict[str, Any]]:
    """Extracts connected defect components, bounding boxes, centroids, and severity."""
    norm = np.clip(anomaly_map_norm, 0.0, 1.0)
    if target_shape is not None and norm.shape[:2] != target_shape:
        norm = cv2.resize(norm, (target_shape[1], target_shape[0]), interpolation=cv2.INTER_CUBIC)

    binary_mask = (norm >= pixel_threshold).astype(np.uint8) * 255
    num_labels, labels, stats, centroids = cv2.connectedComponentsWithStats(binary_mask, connectivity=8)

    defects = []
    for i in range(1, num_labels):
        area = int(stats[i, cv2.CC_STAT_AREA])
        if area >= min_area_pixels:
            x = int(stats[i, cv2.CC_STAT_LEFT])
            y = int(stats[i, cv2.CC_STAT_TOP])
            w = int(stats[i, cv2.CC_STAT_WIDTH])
            h = int(stats[i, cv2.CC_STAT_HEIGHT])
            cx, cy = centroids[i]

            region_mask = (labels == i)
            max_val = float(norm[region_mask].max()) if np.any(region_mask) else 0.0

            defects.append({
                "id": i,
                "bbox": [x, y, w, h],
                "centroid": [round(float(cx), 1), round(float(cy), 1)],
                "area_pixels": area,
                "max_anomaly_score": round(max_val, 3),
                "defect_type": "surface_irregularity"
            })

    return defects
