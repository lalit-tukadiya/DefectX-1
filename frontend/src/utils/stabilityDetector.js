/**
 * Inter-frame motion and stability detection using offscreen canvas differencing.
 */
export class StabilityDetector {
  constructor({
    threshold = 3.5,
    minStableFrames = 7,
    checkIntervalMs = 80,
    sampleWidth = 160,
    sampleHeight = 120
  } = {}) {
    this.threshold = threshold;
    this.minStableFrames = minStableFrames;
    this.checkIntervalMs = checkIntervalMs;
    this.sampleWidth = sampleWidth;
    this.sampleHeight = sampleHeight;

    this.prevImageData = null;
    this.consecutiveStableCount = 0;
    this.canvas = document.createElement('canvas');
    this.canvas.width = sampleWidth;
    this.canvas.height = sampleHeight;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
  }

  processFrame(videoElement) {
    if (!videoElement || videoElement.readyState < 2) {
      return { isStable: false, motionDelta: 0, stableFrames: 0 };
    }

    this.ctx.drawImage(videoElement, 0, 0, this.sampleWidth, this.sampleHeight);
    const currImageData = this.ctx.getImageData(0, 0, this.sampleWidth, this.sampleHeight);
    const currData = currImageData.data;

    if (!this.prevImageData) {
      this.prevImageData = currData;
      return { isStable: false, motionDelta: 0, stableFrames: 0 };
    }

    let diffSum = 0;
    const numPixels = this.sampleWidth * this.sampleHeight;

    // Fast grayscale difference sample (stride 4)
    for (let i = 0; i < currData.length; i += 4) {
      const gCurr = (currData[i] * 0.299 + currData[i + 1] * 0.587 + currData[i + 2] * 0.114);
      const gPrev = (this.prevImageData[i] * 0.299 + this.prevImageData[i + 1] * 0.587 + this.prevImageData[i + 2] * 0.114);
      diffSum += Math.abs(gCurr - gPrev);
    }

    const motionDelta = diffSum / numPixels;
    this.prevImageData = currData;

    if (motionDelta < this.threshold) {
      this.consecutiveStableCount++;
    } else {
      this.consecutiveStableCount = 0;
    }

    const isStable = this.consecutiveStableCount >= this.minStableFrames;
    return {
      isStable,
      motionDelta: Number(motionDelta.toFixed(2)),
      stableFrames: this.consecutiveStableCount
    };
  }

  reset() {
    this.consecutiveStableCount = 0;
    this.prevImageData = null;
  }
}
