"""Statistical Threshold Calibration CLI.
Calibrates image and pixel thresholds using extreme value percentiles of normal samples.
"""
import os
import sys
import argparse
import numpy as np
import cv2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from model.patchcore_engine import load_screw_model, predict_screw


def calibrate(normal_dir: str, fp_budget: float = 0.01):
    print("=" * 60)
    print("CALIBRATING ADAPTIVE THRESHOLDS FOR NORMAL DISTRIBUTION")
    print("=" * 60)
    load_screw_model()

    files = [os.path.join(normal_dir, f) for f in os.listdir(normal_dir) if f.lower().endswith(('.jpg', '.png'))] if os.path.exists(normal_dir) else []
    if not files:
        print(f"No samples found in {normal_dir}. Using standard default thresholds (0.55 / 0.40).")
        return 0.55, 0.40

    scores = []
    for p in files:
        img = cv2.imread(p)
        if img is None: continue
        res = predict_screw(img)
        scores.append(res["anomaly_score"])

    pct = (1.0 - fp_budget) * 100.0
    recommended_img_th = float(np.percentile(scores, pct)) * 1.10
    recommended_pix_th = recommended_img_th * 0.75

    print(f"Processed {len(scores)} reference normal images.")
    print(f"Max Normal Score:        {np.max(scores):.4f}")
    print(f"99th Percentile Score:   {np.percentile(scores, 99):.4f}")
    print(f"Calibrated Image Cutoff: {recommended_img_th:.3f}")
    print(f"Calibrated Pixel Cutoff: {recommended_pix_th:.3f}")
    print("=" * 60)
    return recommended_img_th, recommended_pix_th


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--dir", default="backend/data/reference/screw_v1")
    parser.add_argument("--budget", type=float, default=0.01)
    args = parser.parse_args()
    calibrate(args.dir, args.budget)
