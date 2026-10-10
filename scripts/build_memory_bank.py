"""CLI Script to construct the PatchCore Memory Bank from reference folder.
"""
import os
import sys
import argparse

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from model.patchcore_engine import build_memory_bank


def main():
    parser = argparse.ArgumentParser(description="Build Memory Bank for Product")
    parser.add_argument("--product", default="screw_v1", help="Product profile name")
    parser.add_argument("--dir", default="backend/data/reference/screw_v1", help="Reference images directory")
    args = parser.parse_args()

    ref_dir = args.dir
    if not os.path.exists(ref_dir):
        print(f"Error: Directory {ref_dir} does not exist.")
        sys.exit(1)

    image_paths = [
        os.path.join(ref_dir, f) for f in os.listdir(ref_dir)
        if f.lower().endswith(('.jpg', '.jpeg', '.png', '.bmp'))
    ]

    print(f"Found {len(image_paths)} reference images for product '{args.product}'.")
    if len(image_paths) < 10:
        print("Warning: Recommended sample count is 10-20 defect-free images.")

    print("Constructing memory bank with greedy coreset subsampling...")
    res = build_memory_bank(image_paths)
    print(f"Memory bank created successfully! Coreset patches: {res.get('coreset_patches')}, Version: {res.get('version')}")


if __name__ == "__main__":
    main()
