# Screw Defect Inspection AI (PatchCore Vision Platform)

Industrial unsupervised few-shot anomaly detection platform for metal screw defect inspection. Built with **React**, **FastAPI**, **WebSockets**, and **PyTorch PatchCore** (WideResNet-50-2 backbone).

---

## Key Capabilities

1. **Zero-Defect Onboarding:** Requires only 10–20 defect-free screw photos to construct the initial unsupervised manifold. No defective images required for training.
2. **Real-Time Webcam Streaming:** Browser-side motion differencing stability detector dispatches stable frames to FastAPI via WebSocket.
3. **PatchCore Anomaly Engine:** Extracts mid-level patch hierarchies (WideResNet `layer2` + `layer3`), applies greedy minimax coreset subsampling ($\alpha = 0.05$), and computes density-reweighted nearest-neighbor anomaly scores.
4. **Micro-Defect Localization:** Bicubic upsampling and connected-component analysis locate scratches, burrs, pinholes, rust, and thread damage with bounding boxes and thermal JET colormaps.
5. **Zero-Latency Dynamic Sliders:** Operators can adjust image threshold ($\tau_{\text{img}}$), pixel threshold ($\tau_{\text{pix}}$), and min defect area with instant UI updates without server re-inference.
6. **Safe Loop Learning:** Confirmed defects are archived for benchmark evaluation; operator false alarms are staged into temporary buffers for versioned, reversible memory bank updates.

---

## Quickstart

### 1. Backend Server
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```
- API Docs: `http://localhost:8000/docs`
- WebSocket: `ws://localhost:8000/ws/inspect`

### 2. Frontend Application
```powershell
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:3000`

---

## Evaluation & CLI Scripts

### Benchmark Evaluation (AUROC, Precision, Recall, Latency)
```powershell
python scripts/evaluate_model.py --good backend/data/validation/good --defective backend/data/validation/defective
```

### Calibrate Thresholds
```powershell
python scripts/calibrate_thresholds.py --dir backend/data/reference/screw_v1 --budget 0.01
```

### Build Memory Bank from Reference Images
```powershell
python scripts/build_memory_bank.py --product screw_v1 --dir backend/data/reference/screw_v1
```

### Single Image Inference
```powershell
python scripts/run_inference.py --image path/to/screw.jpg --threshold 0.55
```
