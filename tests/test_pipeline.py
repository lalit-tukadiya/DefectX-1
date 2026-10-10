"""Unit tests for capture quality, preprocessing, and localization.
"""
import pytest
import numpy as np
import cv2

from backend.model.capture_quality import check_capture_quality
from backend.model.preprocessing import preprocess_image, apply_gray_world_white_balance, apply_clahe_contrast
from backend.model.localization import localize_defect_regions, generate_heatmap_overlay


def test_quality_check_on_blank_frame():
    blank = np.zeros((256, 256, 3), dtype=np.uint8)
    res = check_capture_quality(blank)
    assert not res.is_valid
    assert any("UNDEREXPOSURE" in r or "NO_SCREW" in r for r in res.reasons)


def test_quality_check_on_valid_synthetic_screw():
    # Synthetic frame: dark background with bright textured rectangle
    frame = np.full((300, 300, 3), 30, dtype=np.uint8)
    cv2.rectangle(frame, (100, 80), (180, 240), (200, 200, 200), -1)
    # Add texture/noise
    noise = np.random.randint(0, 40, (300, 300, 3), dtype=np.uint8)
    frame = cv2.add(frame, noise)

    res = check_capture_quality(frame, min_laplacian_var=10.0)
    assert res.score > 0.0


def test_preprocessing_output_shapes():
    frame = np.random.randint(0, 255, (480, 640, 3), dtype=np.uint8)
    tensor, resized_rgb = preprocess_image(frame, target_size=(256, 256))
    assert tensor.shape == (1, 3, 256, 256)
    assert resized_rgb.shape == (256, 256, 3)


def test_localization_components():
    map_norm = np.zeros((100, 100), dtype=np.float32)
    # Inject a 5x5 defective hot-spot
    map_norm[40:45, 40:45] = 0.95
    regions = localize_defect_regions(map_norm, pixel_threshold=0.5, min_area_pixels=10)
    assert len(regions) == 1
    assert regions[0]["area_pixels"] == 25
    assert regions[0]["max_anomaly_score"] == 0.95
