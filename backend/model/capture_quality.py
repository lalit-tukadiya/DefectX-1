"""Industrial capture quality assessment module.
Evaluates blur, exposure, contrast, and foreground part presence before inference.
"""
from typing import Dict, Any, Tuple
import cv2
import numpy as np


class QualityAssessmentResult:
    def __init__(self, is_valid: bool, score: float, reasons: list, metrics: Dict[str, Any]):
        self.is_valid = is_valid
        self.score = score
        self.reasons = reasons
        self.metrics = metrics

    def to_dict(self) -> Dict[str, Any]:
        return {
            "is_valid": self.is_valid,
            "score": round(self.score, 3),
            "reasons": self.reasons,
            "metrics": {k: round(v, 4) if isinstance(v, float) else v for k, v in self.metrics.items()}
        }


def check_capture_quality(
    image_bgr: np.ndarray,
    min_laplacian_var: float = 100.0,
    max_overexposure_ratio: float = 0.18,
    max_underexposure_ratio: float = 0.35,
    min_contrast_rms: float = 0.12,
    min_screw_presence_ratio: float = 0.04
) -> QualityAssessmentResult:
    """Performs pre-inference gating tests on input frames."""
    if image_bgr is None or image_bgr.size == 0:
        return QualityAssessmentResult(False, 0.0, ["EMPTY_FRAME"], {})

    gray = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2GRAY)
    total_pixels = float(gray.size)
    reasons = []

    # 1. Blur Detection (Laplacian Variance)
    laplacian_var = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    if laplacian_var < min_laplacian_var:
        reasons.append(f"BLUR_DETECTED: Variance {laplacian_var:.1f} < {min_laplacian_var}")

    # 2. Exposure Checks
    overexposed_px = np.count_nonzero(gray >= 250)
    overexposure_ratio = overexposed_px / total_pixels
    if overexposure_ratio > max_overexposure_ratio:
        reasons.append(f"OVEREXPOSURE_DETECTED: {overexposure_ratio:.2%} saturated pixels")

    underexposed_px = np.count_nonzero(gray <= 15)
    underexposure_ratio = underexposed_px / total_pixels
    if underexposure_ratio > max_underexposure_ratio:
        reasons.append(f"UNDEREXPOSURE_DETECTED: {underexposure_ratio:.2%} dark pixels")

    # 3. RMS Contrast
    norm_gray = gray.astype(np.float32) / 255.0
    contrast_rms = float(norm_gray.std())
    if contrast_rms < min_contrast_rms:
        reasons.append(f"LOW_CONTRAST_DETECTED: RMS {contrast_rms:.3f} < {min_contrast_rms}")

    # 4. Foreground / Screw Presence Check (Otsu threshold on inverted/difference)
    _, thresh = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
    foreground_ratio = float(np.count_nonzero(thresh)) / total_pixels
    if foreground_ratio < min_screw_presence_ratio:
        reasons.append(f"NO_SCREW_DETECTED: Foreground area {foreground_ratio:.2%} < {min_screw_presence_ratio}")

    # Aggregate Quality Score (0.0 to 1.0)
    blur_score = min(1.0, laplacian_var / (min_laplacian_var * 2.0))
    exposure_score = max(0.0, 1.0 - (overexposure_ratio + underexposure_ratio))
    contrast_score = min(1.0, contrast_rms / 0.25)
    presence_score = 1.0 if foreground_ratio >= min_screw_presence_ratio else 0.2

    overall_score = float((blur_score * 0.4) + (exposure_score * 0.3) + (contrast_score * 0.2) + (presence_score * 0.1))
    is_valid = len(reasons) == 0

    metrics = {
        "laplacian_var": laplacian_var,
        "overexposure_ratio": overexposure_ratio,
        "underexposure_ratio": underexposure_ratio,
        "contrast_rms": contrast_rms,
        "foreground_ratio": foreground_ratio
    }

    return QualityAssessmentResult(is_valid, overall_score, reasons, metrics)
