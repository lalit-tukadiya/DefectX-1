"""WebSocket endpoint for real-time webcam frame inspection.
"""
import base64
import json
import logging
from typing import Dict, Any
import cv2
import numpy as np
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from workers.inference_worker import inspect_frame_async

router = APIRouter()
logger = logging.getLogger("websocket_inspector")


def decode_base64_image(b64_string: str) -> np.ndarray:
    """Decodes data URL or raw base64 image string to OpenCV BGR ndarray."""
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    img_bytes = base64.b64decode(b64_string)
    nparr = np.frombuffer(img_bytes, np.uint8)
    image_bgr = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    return image_bgr


@router.websocket("/ws/inspect")
async def websocket_inspect_endpoint(websocket: WebSocket):
    await websocket.accept()
    logger.info("Inspection WebSocket client connected")
    
    try:
        while True:
            raw_text = await websocket.receive_text()
            data = json.loads(raw_text)
            msg_type = data.get("type", "INSPECT_FRAME")

            if msg_type == "PING":
                await websocket.send_json({"type": "PONG", "payload": {}})
                continue

            payload = data.get("payload", {})
            frame_id = payload.get("frame_id", 0)
            b64_image = payload.get("image_base64", "")
            client_params = payload.get("client_params", {})

            img_thresh = float(client_params.get("image_threshold", 0.55))
            pix_thresh = float(client_params.get("pixel_threshold", 0.40))
            min_area = int(client_params.get("min_defect_area", 12))

            if not b64_image:
                await websocket.send_json({
                    "type": "ERROR",
                    "payload": {"frame_id": frame_id, "error": "EMPTY_IMAGE_PAYLOAD"}
                })
                continue

            try:
                frame_bgr = decode_base64_image(b64_image)
                if frame_bgr is None:
                    raise ValueError("Failed to decode frame image")
            except Exception as e:
                await websocket.send_json({
                    "type": "ERROR",
                    "payload": {"frame_id": frame_id, "error": f"IMAGE_DECODE_ERROR: {str(e)}"}
                })
                continue

            # Run asynchronous worker inference
            result = await inspect_frame_async(
                frame_bgr,
                image_threshold=img_thresh,
                pixel_threshold=pix_thresh,
                min_area=min_area
            )
            result["frame_id"] = frame_id

            await websocket.send_json({
                "type": "INSPECTION_RESULT",
                "payload": result
            })

    except WebSocketDisconnect:
        logger.info("Inspection WebSocket client disconnected")
    except Exception as e:
        logger.error(f"WebSocket unhandled error: {e}", exc_info=True)
