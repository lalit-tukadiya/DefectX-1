"""Image preprocessing, lighting compensation and robustness augmentation pipeline.
"""
from typing import Tuple, List, Optional
import cv2
import numpy as np
import torch
import torchvision.transforms as T


IMAGENET_MEAN = [0.485, 0.456, 0.406]
IMAGENET_STD = [0.229, 0.224, 0.225]


def apply_gray_world_white_balance(image_bgr: np.ndarray) -> np.ndarray:
    """Balances color channels based on the Gray-World assumption."""
    b, g, r = cv2.split(image_bgr.astype(np.float32))
    b_mean, g_mean, r_mean = b.mean(), g.mean(), r.mean()
    if b_mean == 0 or g_mean == 0 or r_mean == 0:
        return image_bgr
    gray_mean = (b_mean + g_mean + r_mean) / 3.0
    b = np.clip(b * (gray_mean / b_mean), 0, 255)
    g = np.clip(g * (gray_mean / g_mean), 0, 255)
    r = np.clip(r * (gray_mean / r_mean), 0, 255)
    return cv2.merge([b, g, r]).astype(np.uint8)


def apply_clahe_contrast(image_bgr: np.ndarray, clip_limit: float = 2.0, tile_grid: Tuple[int, int] = (8, 8)) -> np.ndarray:
    """Applies CLAHE on the L-channel of LAB color space to equalize local illumination."""
    lab = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2LAB)
    l, a, b = cv2.split(lab)
    clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=tile_grid)
    l_eq = clahe.apply(l)
    lab_eq = cv2.merge([l_eq, a, b])
    return cv2.cvtColor(lab_eq, cv2.COLOR_LAB2BGR)


def apply_gamma_correction(image_bgr: np.ndarray, gamma: float = 1.05) -> np.ndarray:
    """Non-linear exposure curve adjustment."""
    inv_gamma = 1.0 / gamma
    table = np.array([((i / 255.0) ** inv_gamma) * 255 for i in np.arange(0, 256)]).astype("uint8")
    return cv2.LUT(image_bgr, table)


def preprocess_image(
    image_bgr: np.ndarray,
    target_size: Tuple[int, int] = (256, 256),
    enable_clahe: bool = True,
    enable_white_balance: bool = True,
    enable_gamma: bool = True,
    gamma: float = 1.05
) -> Tuple[torch.Tensor, np.ndarray]:
    """Compensates illumination and converts image to standardized PyTorch tensor.
    
    Returns:
        (tensor_chw, compensated_rgb_ndarray)
    """
    img = image_bgr.copy()
    if enable_white_balance:
        img = apply_gray_world_white_balance(img)
    if enable_clahe:
        img = apply_clahe_contrast(img)
    if enable_gamma and abs(gamma - 1.0) > 1e-3:
        img = apply_gamma_correction(img, gamma)

    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    img_resized = cv2.resize(img_rgb, target_size, interpolation=cv2.INTER_AREA)

    # Tensor normalization
    tensor = torch.from_numpy(img_resized).permute(2, 0, 1).float() / 255.0
    mean = torch.tensor(IMAGENET_MEAN).view(3, 1, 1)
    std = torch.tensor(IMAGENET_STD).view(3, 1, 1)
    norm_tensor = (tensor - mean) / std

    return norm_tensor.unsqueeze(0), img_resized


def get_robustness_augmentations(image_rgb: np.ndarray) -> List[np.ndarray]:
    """Generates controlled photometric and geometric variations for memory-bank creation.
    Does NOT distort or blur excessively to prevent masking real micro-defects.
    """
    h, w = image_rgb.shape[:2]
    augmented_list = [image_rgb]

    # 1. Subtle lighting jitter
    for factor in [0.95, 1.05]:
        jittered = np.clip(image_rgb.astype(np.float32) * factor, 0, 255).astype(np.uint8)
        augmented_list.append(jittered)

    # 2. Subtle rotation (+/- 3 degrees)
    for angle in [-3.0, 3.0]:
        mat = cv2.getRotationMatrix2D((w / 2, h / 2), angle, 1.0)
        rotated = cv2.warpAffine(image_rgb, mat, (w, h), borderMode=cv2.BORDER_REFLECT_101)
        augmented_list.append(rotated)

    # 3. Subtle scale (+/- 2%)
    for scale in [0.98, 1.02]:
        mat = cv2.getRotationMatrix2D((w / 2, h / 2), 0.0, scale)
        scaled = cv2.warpAffine(image_rgb, mat, (w, h), borderMode=cv2.BORDER_REFLECT_101)
        augmented_list.append(scaled)

    return augmented_list
