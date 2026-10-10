import React from 'react';
import { Sliders, RefreshCw, Info } from 'lucide-react';

export default function ThresholdControls({
  imageThreshold,
  setImageThreshold,
  pixelThreshold,
  setPixelThreshold,
  minDefectArea,
  setMinDefectArea,
  onReset
}) {
  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-xl flex flex-col gap-4">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-cyan-400" />
          <h3 className="text-xs font-semibold text-slate-200 uppercase tracking-wider">Dynamic Thresholds</h3>
        </div>
        <button
          onClick={onReset}
          className="text-slate-400 hover:text-cyan-400 transition text-[11px] flex items-center gap-1"
          title="Reset to factory baseline calibration"
        >
          <RefreshCw className="w-3 h-3" /> Reset
        </button>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 bg-slate-950/60 p-2 rounded border border-slate-800">
        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
        <span>Sliders dynamically update PASS/REJECT and masks without rerunning inference.</span>
      </div>

      {/* 1. Image-Level Threshold */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300 font-medium">Image Decision Cutoff (&tau;<sub>img</sub>)</span>
          <span className="font-mono text-cyan-400 font-bold">{imageThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          value={imageThreshold}
          onChange={(e) => setImageThreshold(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0.00 (Strict Reject)</span>
          <span>1.00 (Pass All)</span>
        </div>
      </div>

      {/* 2. Pixel-Level Threshold */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300 font-medium">Pixel Anomaly Cutoff (&tau;<sub>pix</sub>)</span>
          <span className="font-mono text-cyan-400 font-bold">{pixelThreshold.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          value={pixelThreshold}
          onChange={(e) => setPixelThreshold(parseFloat(e.target.value))}
          className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0.00 (High Sensitivity)</span>
          <span>1.00 (Low Sensitivity)</span>
        </div>
      </div>

      {/* 3. Min Defect Area */}
      <div className="flex flex-col gap-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-slate-300 font-medium">Min Defect Area (Noise Filter)</span>
          <span className="font-mono text-cyan-400 font-bold">{minDefectArea} px</span>
        </div>
        <input
          type="range"
          min="0"
          max="200"
          step="2"
          value={minDefectArea}
          onChange={(e) => setMinDefectArea(parseInt(e.target.value))}
          className="w-full accent-cyan-400 bg-slate-800 h-1.5 rounded cursor-pointer"
        />
        <div className="flex justify-between text-[10px] text-slate-500 font-mono">
          <span>0 px (Sensor Noise)</span>
          <span>200 px (Macro-Only)</span>
        </div>
      </div>
    </div>
  );
}
