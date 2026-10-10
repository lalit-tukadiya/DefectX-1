import React, { useState, useEffect, useRef } from 'react';
import { ShieldCheck, Video, Cpu, BarChart2, Radio } from 'lucide-react';
import WebcamPreview from './components/WebcamPreview';
import InspectionResult from './components/InspectionResult';
import ThresholdControls from './components/ThresholdControls';
import FeedbackPanel from './components/FeedbackPanel';
import OnboardingPanel from './components/OnboardingPanel';
import ResultsDashboard from './components/ResultsDashboard';
import { InspectionWebSocket } from './services/websocket';
import { api } from './services/api';

export default function App() {
  const [activeTab, setActiveTab] = useState('inspect'); // 'inspect', 'onboard', 'dashboard'
  const [wsConnected, setWsConnected] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('WAITING_FOR_SCREW');
  const [latestResult, setLatestResult] = useState(null);

  // Dynamic Threshold States (Updated instantly without model rerun)
  const [imageThreshold, setImageThreshold] = useState(0.55);
  const [pixelThreshold, setPixelThreshold] = useState(0.40);
  const [minDefectArea, setMinDefectArea] = useState(12);

  const wsClientRef = useRef(null);
  const frameCounterRef = useRef(0);

  // Initialize WebSocket connection
  useEffect(() => {
    const ws = new InspectionWebSocket('ws://localhost:8000/ws/inspect');
    wsClientRef.current = ws;

    ws.on('connection_change', ({ isConnected }) => {
      setWsConnected(isConnected);
    });

    ws.on('INSPECTION_RESULT', (payload) => {
      setIsAnalyzing(false);
      setLatestResult(payload);
      if (payload.status === 'LOW_QUALITY_CAPTURE') {
        setCurrentStatus('LOW_QUALITY_CAPTURE');
      } else {
        setCurrentStatus('RESULT_READY');
      }
    });

    ws.on('CAPTURE_REJECTED', (payload) => {
      setIsAnalyzing(false);
      setCurrentStatus('LOW_QUALITY_CAPTURE');
    });

    ws.on('ERROR', (payload) => {
      setIsAnalyzing(false);
      console.error('Inspection error:', payload);
      setCurrentStatus('WAITING_FOR_SCREW');
    });

    ws.connect();

    return () => {
      ws.disconnect();
    };
  }, []);

  // Frame dispatch handler
  const handleDispatchFrame = (imageBase64) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setCurrentStatus('ANALYZING');
    frameCounterRef.current += 1;

    const dispatched = wsClientRef.current?.sendFrame(
      frameCounterRef.current,
      imageBase64,
      {
        image_threshold: imageThreshold,
        pixel_threshold: pixelThreshold,
        min_defect_area: minDefectArea
      }
    );

    if (!dispatched) {
      // Fallback: If WebSocket is disconnected, dispatch via REST upload
      setIsAnalyzing(false);
      setCurrentStatus('WAITING_FOR_SCREW');
    }
  };

  // Manual File Upload handler
  const handleFileUpload = async (file) => {
    setIsAnalyzing(true);
    setCurrentStatus('ANALYZING');
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('image_threshold', imageThreshold);
      formData.append('pixel_threshold', pixelThreshold);
      formData.append('min_defect_area', minDefectArea);

      const res = await api.inspectImage(formData);
      setLatestResult(res);
      setCurrentStatus(res.status === 'LOW_QUALITY_CAPTURE' ? 'LOW_QUALITY_CAPTURE' : 'RESULT_READY');
    } catch (err) {
      console.error('File inspection failed:', err);
      setCurrentStatus('WAITING_FOR_SCREW');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleResetThresholds = () => {
    setImageThreshold(0.55);
    setPixelThreshold(0.40);
    setMinDefectArea(12);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur sticky top-0 z-50 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-slate-100 tracking-tight flex items-center gap-2">
              Screw Defect Inspection AI
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800">
                PatchCore Edge
              </span>
            </h1>
            <p className="text-[11px] text-slate-400">Industrial Unsupervised Vision Platform</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('inspect')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'inspect'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Video className="w-3.5 h-3.5" /> Live Inspection
          </button>
          <button
            onClick={() => setActiveTab('onboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'onboard'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" /> Onboarding
          </button>
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
              activeTab === 'dashboard'
                ? 'bg-cyan-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" /> Telemetry & Yield
          </button>
        </nav>

        {/* WebSocket Status Indicator */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 hidden md:inline">Profile: <strong className="text-slate-200 font-mono">screw_v1</strong></span>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950 border border-slate-800">
            <Radio className={`w-3.5 h-3.5 ${wsConnected ? 'text-emerald-400 animate-pulse' : 'text-rose-500'}`} />
            <span className="font-mono text-[10px] text-slate-300">
              {wsConnected ? 'WS LIVE' : 'WS OFFLINE'}
            </span>
          </div>
        </div>
      </header>

      {/* Main View Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        {activeTab === 'inspect' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Live Webcam Preview (5 cols) */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <WebcamPreview
                onStableFrameCaptured={handleDispatchFrame}
                onManualCapture={handleDispatchFrame}
                onFileUpload={handleFileUpload}
                isAnalyzing={isAnalyzing}
                currentStatus={currentStatus}
                connectionState={wsConnected}
              />
              <ThresholdControls
                imageThreshold={imageThreshold}
                setImageThreshold={setImageThreshold}
                pixelThreshold={pixelThreshold}
                setPixelThreshold={setPixelThreshold}
                minDefectArea={minDefectArea}
                setMinDefectArea={setMinDefectArea}
                onReset={handleResetThresholds}
              />
            </div>

            {/* Right Column: Inspection Results & Feedback (7 cols) */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <InspectionResult
                result={latestResult}
                imageThreshold={imageThreshold}
                pixelThreshold={pixelThreshold}
              />
              <FeedbackPanel
                currentResult={latestResult}
                onFeedbackSubmitted={() => console.log('Feedback submitted')}
              />
            </div>
          </div>
        )}

        {activeTab === 'onboard' && (
          <OnboardingPanel onMemoryBankBuilt={() => setActiveTab('inspect')} />
        )}

        {activeTab === 'dashboard' && (
          <ResultsDashboard />
        )}
      </main>
    </div>
  );
}
