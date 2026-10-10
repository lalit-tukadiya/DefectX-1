"""REST endpoints for product onboarding and memory bank construction.
"""
import os
import shutil
import uuid
from typing import List, Dict, Any
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from model.patchcore_engine import build_memory_bank

router = APIRouter(prefix="/api/v1/onboarding", tags=["Onboarding"])

REFERENCE_BASE_DIR = "data/reference"
os.makedirs(REFERENCE_BASE_DIR, exist_ok=True)

ACTIVE_PROFILES = {
    "screw_v1": {
        "name": "screw_v1",
        "description": "Industrial Hex Socket Screw",
        "reference_image_count": 0,
        "is_model_ready": False,
        "version": "1.0.0"
    }
}


@router.get("/profile")
async def get_active_profile():
    return ACTIVE_PROFILES["screw_v1"]


@router.post("/upload-references")
async def upload_reference_images(
    files: List[UploadFile] = File(...),
    product_name: str = Form("screw_v1")
):
    """Uploads 10-20 defect-free normal screw images for few-shot onboarding."""
    if len(files) < 1:
        raise HTTPException(status_code=400, detail="No files uploaded")

    save_dir = os.path.join(REFERENCE_BASE_DIR, product_name)
    os.makedirs(save_dir, exist_ok=True)

    saved_paths = []
    for file in files:
        file_ext = os.path.splitext(file.filename)[1].lower()
        if file_ext not in [".jpg", ".jpeg", ".png", ".bmp"]:
            continue
        dest_filename = f"{uuid.uuid4().hex[:8]}_{file.filename}"
        dest_path = os.path.join(save_dir, dest_filename)
        with open(dest_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
        saved_paths.append(dest_path)

    total_refs = len(os.listdir(save_dir))
    ACTIVE_PROFILES[product_name]["reference_image_count"] = total_refs

    warning_msg = None
    if total_refs < 10:
        warning_msg = f"Only {total_refs} reference images available. 10-20 images strongly recommended for optimal normal manifold coverage."

    return {
        "status": "SUCCESS",
        "uploaded_count": len(saved_paths),
        "total_reference_images": total_refs,
        "warning": warning_msg
    }


@router.post("/build-memory-bank")
async def trigger_build_memory_bank(product_name: str = "screw_v1"):
    """Initiates patch extraction and greedy coreset subsampling for product profile."""
    save_dir = os.path.join(REFERENCE_BASE_DIR, product_name)
    if not os.path.exists(save_dir):
        raise HTTPException(status_code=400, detail="No reference images directory found for product")

    image_paths = [
        os.path.join(save_dir, f) for f in os.listdir(save_dir)
        if f.lower().endswith((".jpg", ".jpeg", ".png", ".bmp"))
    ]

    if len(image_paths) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient reference images: found {len(image_paths)}, minimum 10 required for safe memory bank initialization."
        )

    result = build_memory_bank(image_paths)
    ACTIVE_PROFILES[product_name]["is_model_ready"] = True
    ACTIVE_PROFILES[product_name]["version"] = result.get("version", "1.0.0")

    return {
        "status": "COMPLETED",
        "product_name": product_name,
        "reference_count": len(image_paths),
        "coreset_size": result.get("coreset_patches", 2500),
        "version": ACTIVE_PROFILES[product_name]["version"]
    }
