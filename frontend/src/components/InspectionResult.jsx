import React, { useState } from 'react';
import { CheckCircle, XCircle, AlertCircle, Eye, Layers, Box, Flame } from 'lucide-react';

export default function InspectionResult({ result, imageThreshold, pixelThreshold }) {
  const [activeLayer, setActiveLayer] = useState('overlay'); // 'overlay', 'heatmap', 'mask', 'annotated'

  if (!result) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500 min-h-[380px]">
        <Eye className="w-12 h-12 mb-3 text-slate-700" />
        <h3 className="text-sm font-semibold text-slate-400">No Inspection Performed Yet</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-xs">
          Position a screw steadily in front of the lens or upload an image to trigger automatic PatchCore anomaly detection.
        </p>
      </div>
    );
  }

  // Dynamic decision evaluation using local image threshold slider
  const effectiveDecision = result.anomaly_score >= imageThreshold ? 'REJECT' : 'PASS';
  const isPass = effectiveDecision === 'PASS';
  const defectCount = result.defect_regions?.length || 0;

  const renderActiveImage = () => {
    switch (activeLayer) {
      case 'heatmap':
        return result.heatmap_image_base64 || result.annotated_image_base64;
      case 'annotated':
        return result.annotated_image_base64;
      case 'mask':
        return result.raw_anomaly_map_base64 || result.heatmap_image_base64;
      default:
        return result.heatmap_image_base64 || result.annotated_image_base64;
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl overflow-hidden flex flex-col shadow-xl">
      {/* Header with Pass / Reject Indicator */}
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isPass 
          ? 'bg-emerald-950/40 border-emerald-900/60' 
          : 'bg-rose-950/40 border-rose-900/60'
      }`}>
        <div className="flex items-center gap-2">
          {isPass ? (
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          ) : (
            <XCircle className="w-5 h-5 text-rose-500" />
          )}
          <span className={`text-base font-bold tracking-wider ${
            isPass ? 'text-emerald-300' : 'text-rose-400'
          }`}>
            {effectiveDecision}
          </span>
        </div>

        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">
            Score: <strong className="font-mono text-slate-200">{result.anomaly_score?.toFixed(3)}</strong> / {imageThreshold.toFixed(2)}
          </span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Latency: <strong className="font-mono text-cyan-400">{result.latency_ms || 0}ms</strong>
          </span>
        </div>
      </div>

      {/* Layer Switcher Tabs */}
      <div className="flex border-b border-slate-800 bg-slate-950/60 px-2 pt-2 gap-1 text-xs">
        <button
          onClick={() => setActiveLayer('overlay')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium transition ${
            activeLayer === 'overlay'
              ? 'bg-slate-800 text-cyan-400 border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" /> Heatmap Blend
        </button>
        <button
          onClick={() => setActiveLayer('annotated')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium transition ${
            activeLayer === 'annotated'
              ? 'bg-slate-800 text-cyan-400 border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Box className="w-3.5 h-3.5" /> Bounding Boxes
        </button>
        <button
          onClick={() => setActiveLayer('heatmap')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg font-medium transition ${
            activeLayer === 'heatmap'
              ? 'bg-slate-800 text-cyan-400 border-t border-x border-slate-700'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Flame className="w-3.5 h-3.5" /> Thermal Map
        </button>
      </div>

      {/* Inspection Visual Viewport */}
      <div className="relative aspect-[4/3] bg-slate-950 flex items-center justify-center overflow-hidden">
        <img
          src={renderActiveImage()}
          alt="Inspection View"
          className="w-full h-full object-contain"
        />

        {/* Defect Counter Overlay */}
        <div className="absolute top-3 left-3 bg-slate-950/85 backdrop-blur px-2.5 py-1 rounded border border-slate-800 text-[11px] text-slate-300">
          Detected Micro-Defects: <strong className={defectCount > 0 ? 'text-rose-400' : 'text-emerald-400'}>{defectCount}</strong>
        </div>
      </div>

      {/* Detailed Defect Breakdown List */}
      {defectCount > 0 && (
        <div className="p-3 border-t border-slate-800 bg-slate-950/40 max-h-36 overflow-y-auto text-xs">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Localized Regions</p>
          <div className="space-y-1.5">
            {result.defect_regions.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between px-2.5 py-1.5 rounded bg-slate-800/60 border border-slate-700/50">
                <span className="font-mono text-rose-300">Region #{reg.id}</span>
                <span className="text-slate-400">Area: <strong className="text-slate-200">{reg.area_pixels} px</strong></span>
                <span className="text-slate-400">Max Score: <strong className="text-rose-400 font-mono">{reg.max_anomaly_score}</strong></span>
                <span className="text-slate-500 text-[10px]">BBox: [{reg.bbox.join(',')}]</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
