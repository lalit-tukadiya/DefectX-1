"""CLI script to run PatchCore inference on a test image.
"""
import os
import sys
import argparse
import cv2

sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "backend")))
from model.patchcore_engine import load_screw_model, predict_screw


def main():
    parser = argparse.ArgumentParser(description="Run PatchCore inference on a single image")
    parser.add_argument("--image", required=True, help="Path to test image")
    parser.add_argument("--threshold", type=float, default=0.55, help="Image-level threshold")
    parser.add_argument("--output", default="artifacts/results/inference_result.jpg", help="Output annotated path")
    args = parser.parse_args()

    if not os.path.exists(args.image):
        print(f"Error: Image {args.image} not found.")
        sys.exit(1)

    load_screw_model()
    img_bgr = cv2.imread(args.image)
    result = predict_screw(img_bgr, image_threshold=args.threshold)

    print("=" * 50)
    print("INSPECTION RESULT")
    print("=" * 50)
    print(f"Decision:         {result['decision']}")
    print(f"Anomaly Score:    {result['anomaly_score']:.4f} (Threshold: {args.threshold})")
    print(f"Defects Detected: {len(result['defect_regions'])}")

    os.makedirs(os.path.dirname(args.output), exist_ok=True)
    cv2.imwrite(args.output, result["heatmap_overlay"])
    print(f"Result heatmap saved to: {args.output}")


if __name__ == "__main__":
    main()
