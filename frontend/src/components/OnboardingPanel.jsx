import React, { useState } from 'react';
import { UploadCloud, CheckCircle, AlertTriangle, Cpu, Layers, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';

export default function OnboardingPanel({ onMemoryBankBuilt }) {
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [buildResult, setBuildResult] = useState(null);

  const handleFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    setSelectedFiles(files);
    const newPreviews = files.map((f) => URL.createObjectURL(f));
    setPreviews(newPreviews);
    setStatusMessage(null);
  };

  const handleUploadAndBuild = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setStatusMessage({ type: 'info', text: 'Uploading reference images to edge server...' });

    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => {
        formData.append('files', file);
      });
      formData.append('product_name', 'screw_v1');

      const uploadRes = await api.uploadReferenceImages(formData);

      setIsUploading(false);
      setIsBuilding(true);
      setStatusMessage({ type: 'info', text: 'Extracting patch hierarchies & running greedy coreset subsampling...' });

      const buildRes = await api.buildMemoryBank('screw_v1');
      setBuildResult(buildRes);
      setStatusMessage({
        type: 'success',
        text: `Success! Built memory bank with ${buildRes.coreset_size} patches across ${buildRes.reference_count} reference samples.`
      });
      onMemoryBankBuilt?.();
    } catch (err) {
      const detail = err.response?.data?.detail || err.message;
      setStatusMessage({ type: 'error', text: `Failed to construct memory bank: ${detail}` });
    } finally {
      setIsUploading(false);
      setIsBuilding(false);
    }
  };

  const imageCount = selectedFiles.length;
  const isCountInsufficient = imageCount > 0 && imageCount < 10;

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 shadow-xl flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" />
            Screw Profile Onboarding (Few-Shot PatchCore)
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Upload 10–20 defect-free normal screw samples to build the initial unsupervised normal manifold.
          </p>
        </div>
        <span className="px-3 py-1 bg-cyan-950/80 border border-cyan-800 text-cyan-400 font-mono text-xs rounded-full">
          Profile: screw_v1
        </span>
      </div>

      {/* Upload Dropzone */}
      <div className="border-2 border-dashed border-slate-700 hover:border-cyan-500 rounded-xl p-8 flex flex-col items-center justify-center text-center bg-slate-950/50 transition cursor-pointer relative">
        <input
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleFilesSelected}
          className="absolute inset-0 opacity-0 cursor-pointer"
        />
        <UploadCloud className="w-12 h-12 text-cyan-400 mb-3" />
        <p className="text-sm font-semibold text-slate-200">
          Drop 10–20 normal screw photos here, or click to browse
        </p>
        <p className="text-xs text-slate-500 mt-1">
          Supported formats: PNG, JPG, JPEG (diffuse lighting, dark matte backdrop recommended)
        </p>
      </div>

      {/* Image Counter & Warnings */}
      <div className="flex items-center justify-between bg-slate-950/80 px-4 py-3 rounded-lg border border-slate-800">
        <div className="flex items-center gap-2">
          <ImageIcon className="w-4 h-4 text-cyan-400" />
          <span className="text-xs text-slate-300">
            Selected Samples: <strong className="font-mono text-cyan-400">{imageCount}</strong> / 20
          </span>
        </div>

        {isCountInsufficient && (
          <div className="flex items-center gap-1.5 text-xs text-amber-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>Fewer than 10 images uploaded. At least 10 required to prevent high false alarms.</span>
          </div>
        )}

        {imageCount >= 10 && (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400">
            <CheckCircle className="w-4 h-4 shrink-0" />
            <span>Optimal sample count for greedy coreset construction.</span>
          </div>
        )}
      </div>

      {/* Previews Grid */}
      {previews.length > 0 && (
        <div className="flex flex-col gap-2">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reference Previews</span>
          <div className="grid grid-cols-5 md:grid-cols-10 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/40 rounded-lg border border-slate-800">
            {previews.map((src, idx) => (
              <div key={idx} className="relative aspect-square rounded overflow-hidden border border-slate-700 bg-slate-900">
                <img src={src} alt={`Ref ${idx + 1}`} className="w-full h-full object-cover" />
                <span className="absolute bottom-0 right-0 bg-slate-950/80 text-[9px] px-1 font-mono text-slate-300">
                  #{idx + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={handleUploadAndBuild}
        disabled={isUploading || isBuilding || imageCount < 10}
        className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-lg shadow-cyan-900/30 transition flex items-center justify-center gap-2"
      >
        <Layers className="w-4 h-4" />
        {isUploading
          ? 'Uploading Images...'
          : isBuilding
          ? 'Subsampling Coreset & Building Memory Bank...'
          : 'Build Screw Memory Bank'}
      </button>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className={`p-4 rounded-xl border text-xs flex items-center gap-2.5 ${
          statusMessage.type === 'success'
            ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
            : statusMessage.type === 'error'
            ? 'bg-rose-950/60 border-rose-800 text-rose-300'
            : 'bg-cyan-950/60 border-cyan-800 text-cyan-300'
        }`}>
          {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 shrink-0" />}
          {statusMessage.type === 'error' && <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{statusMessage.text}</span>
        </div>
      )}
    </div>
  );
}
