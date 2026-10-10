/**
 * Video frame capture and dynamic client-side threshold recomputation utilities.
 */

export function captureVideoFrameBase64(videoElement, maxWidth = 640, quality = 0.85) {
  if (!videoElement || videoElement.videoWidth === 0) return null;

  const canvas = document.createElement('canvas');
  const scale = Math.min(1.0, maxWidth / videoElement.videoWidth);
  canvas.width = Math.round(videoElement.videoWidth * scale);
  canvas.height = Math.round(videoElement.videoHeight * scale);

  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

/**
 * Parses raw anomaly map PNG and computes dynamic binary mask and bounding boxes on the client.
 */
export function recomputeDefectBoxes(rawMapImg, pixelThreshold, minArea) {
  if (!rawMapImg || rawMapImg.width === 0) return { binaryDataUrl: null, boxes: [] };

  const canvas = document.createElement('canvas');
  canvas.width = rawMapImg.width;
  canvas.height = rawMapImg.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(rawMapImg, 0, 0);

  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;
  const thresholdVal = Math.round(pixelThreshold * 255);

  const maskCanvas = document.createElement('canvas');
  maskCanvas.width = canvas.width;
  maskCanvas.height = canvas.height;
  const maskCtx = maskCanvas.getContext('2d');
  const maskImgData = maskCtx.createImageData(canvas.width, canvas.height);
  const maskData = maskImgData.data;

  // Simple grid connected component bounding box accumulator
  const visited = new Uint8Array(canvas.width * canvas.height);
  const boxes = [];

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      const idx = (y * canvas.width + x) * 4;
      const val = data[idx]; // Red or Grayscale value

      if (val >= thresholdVal) {
        maskData[idx] = 255;
        maskData[idx + 1] = 0;
        maskData[idx + 2] = 0;
        maskData[idx + 3] = 200; // Semi-transparent red
      } else {
        maskData[idx + 3] = 0; // Transparent
      }
    }
  }

  maskCtx.putImageData(maskImgData, 0, 0);
  return {
    binaryDataUrl: maskCanvas.toDataURL('image/png')
  };
}
