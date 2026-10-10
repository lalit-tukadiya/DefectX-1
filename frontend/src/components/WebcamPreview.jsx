import React, { useRef, useEffect, useState } from 'react';
import { Camera, CameraOff, AlertTriangle, CheckCircle2, Loader2, Upload, Crosshair } from 'lucide-react';
import { StabilityDetector } from '../utils/stabilityDetector';
import { captureVideoFrameBase64 } from '../utils/frameUtils';

export default function WebcamPreview({
  onStableFrameCaptured,
  onManualCapture,
  onFileUpload,
  isAnalyzing,
  currentStatus,
  connectionState
}) {
  const videoRef = useRef(null);
  const fileInputRef = useRef(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [motionInfo, setMotionInfo] = useState({ delta: 0, stableFrames: 0 });
  const detectorRef = useRef(new StabilityDetector({ minStableFrames: 8, threshold: 3.2 }));
  const frameIntervalRef = useRef(null);

  // Start Webcam
  useEffect(() => {
    let stream = null;
    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'environment' }
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          setCameraActive(true);
          setCameraError(null);
        }
      } catch (err) {
        console.warn('Webcam access error:', err);
        setCameraError('Webcam not detected or access denied. You can still use the image upload option.');
        setCameraActive(false);
      }
    }
    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(t => t.stop());
      }
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, []);

  // Frame stability detection loop
  useEffect(() => {
    if (!cameraActive || isAnalyzing) return;

    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current || isAnalyzing) return;

      const res = detectorRef.current.processFrame(videoRef.current);
      setMotionInfo({ delta: res.motionDelta, stableFrames: res.stableFrames });

      if (res.isStable && !isAnalyzing) {
        const frameBase64 = captureVideoFrameBase64(videoRef.current);
        if (frameBase64) {
          detectorRef.current.reset();
          onStableFrameCaptured(frameBase64);
        }
      }
    }, 90);

    return () => {
      if (frameIntervalRef.current) clearInterval(frameIntervalRef.current);
    };
  }, [cameraActive, isAnalyzing, onStableFrameCaptured]);

  const handleManualCaptureClick = () => {
    if (!videoRef.current) return;
    const frame = captureVideoFrameBase64(videoRef.current);
    if (frame) {
      onManualCapture(frame);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      onFileUpload(file);
    }
  };

  // Status Badge Styles
  const getStatusBadge = () => {
    switch (currentStatus) {
      case 'ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-400 border border-cyan-800 animate-pulse">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> ANALYZING
          </span>
        );
      case 'SCREW_DETECTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-950/80 text-blue-400 border border-blue-800">
            <Crosshair className="w-3.5 h-3.5" /> STABILIZING ({motionInfo.stableFrames}/8)
          </span>
        );
      case 'LOW_QUALITY_CAPTURE':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-400 border border-amber-800">
            <AlertTriangle className="w-3.5 h-3.5" /> LOW QUALITY CAPTURE
          </span>
        );
      case 'RESULT_READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/80 text-emerald-400 border border-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" /> INSPECTION COMPLETE
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-800/80 text-slate-400 border border-slate-700">
            WAITING FOR SCREW
          </span>
        );
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-cyan-400" />
          <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-wider">Live Camera Feed</h2>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge()}
          <span className={`w-2.5 h-2.5 rounded-full ${connectionState ? 'bg-emerald-500' : 'bg-red-500'}`} title={connectionState ? 'WebSocket Connected' : 'WebSocket Disconnected'} />
        </div>
      </div>

      {/* Video Viewport */}
      <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-contain ${!cameraActive ? 'hidden' : ''}`}
        />

        {!cameraActive && (
          <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400">
            <CameraOff className="w-12 h-12 mb-3 text-slate-600" />
            <p className="text-sm font-medium">{cameraError || 'Initializing optical camera device...'}</p>
            <p className="text-xs text-slate-500 mt-1 max-w-sm">Use a dark matte backdrop and diffuse light for metal screws.</p>
          </div>
        )}

        {/* Optical Crosshair Overlay */}
        {cameraActive && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="w-48 h-48 border border-cyan-500/30 rounded-lg relative">
              <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-cyan-400" />
              <span className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-cyan-400/80 font-mono">
                INSPECTION REGION
              </span>
            </div>
          </div>
        )}

        {/* Motion telemetry pill */}
        {cameraActive && (
          <div className="absolute bottom-3 left-3 bg-slate-950/80 backdrop-blur border border-slate-800 text-[11px] font-mono px-2.5 py-1 rounded text-slate-300">
            Motion: {motionInfo.delta} | Steady: {motionInfo.stableFrames} frames
          </div>
        )}
      </div>

      {/* Manual Actions Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/40 flex items-center justify-between gap-3">
        <button
          onClick={handleManualCaptureClick}
          disabled={!cameraActive || isAnalyzing}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
        >
          <Camera className="w-4 h-4" />
          Capture Screw Photo
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium border border-slate-700 transition"
        >
          <Upload className="w-3.5 h-3.5" />
          Upload Image
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  );
}
