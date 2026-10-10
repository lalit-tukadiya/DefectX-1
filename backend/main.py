"""FastAPI entry point for Screw Defect Inspection Web Service.
"""
import os
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from api.routes_inspection import router as inspection_router
from api.routes_onboarding import router as onboarding_router
from api.routes_feedback import router as feedback_router
from api.websocket import router as ws_router
from model.patchcore_engine import load_screw_model

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("screw_inspector_main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing industrial screw defect inspection service...")
    try:
        load_screw_model()
        logger.info("PatchCore model subsystem loaded successfully.")
    except Exception as e:
        logger.warning(f"Model initialization deferred or running in warm-up state: {e}")
    yield
    logger.info("Shutting down screw defect inspection service...")


app = FastAPI(
    title="Screw Defect Inspection API",
    description="Low-shot PatchCore Anomaly Detection and Real-time Webcam Serving",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for React Frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register REST and WebSocket Routers
app.include_router(inspection_router)
app.include_router(onboarding_router)
app.include_router(feedback_router)
app.include_router(ws_router)


@app.get("/")
async def root_health_check():
    return {
        "service": "Screw Defect Inspection API",
        "status": "ONLINE",
        "active_profile": "screw_v1",
        "endpoints": {
            "websocket": "/ws/inspect",
            "docs": "/docs",
            "inspection": "/api/v1/inspection",
            "onboarding": "/api/v1/onboarding",
            "feedback": "/api/v1/feedback"
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
