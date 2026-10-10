"""Statistical threshold calibration for industrial anomaly classification.
"""
from typing import List, Tuple, Dict
import numpy as np


def calibrate_normal_thresholds(
    normal_image_scores: List[float],
    normal_pixel_max_scores: List[float],
    false_alarm_budget: float = 0.01
) -> Dict[str, float]:
    """Calibrates baseline thresholds using extreme value percentiles from normal reference sets."""
    if not normal_image_scores:
        return {"image_threshold": 0.55, "pixel_threshold": 0.40}

    percentile = (1.0 - false_alarm_budget) * 100.0
    img_thresh = float(np.percentile(normal_image_scores, percentile))
    # Add a 10% safety margin for unseen manufacturing variations
    calibrated_img_thresh = round(img_thresh * 1.10, 3)

    if normal_pixel_max_scores:
        pix_thresh = float(np.percentile(normal_pixel_max_scores, percentile))
        calibrated_pix_thresh = round(pix_thresh * 1.10, 3)
    else:
        calibrated_pix_thresh = 0.40

    return {
        "image_threshold": max(0.2, min(0.95, calibrated_img_thresh)),
        "pixel_threshold": max(0.15, min(0.90, calibrated_pix_thresh))
    }
