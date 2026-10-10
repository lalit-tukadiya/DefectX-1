/**
 * Robust WebSocket client for real-time live webcam frame streaming.
 */
export class InspectionWebSocket {
  constructor(url = 'ws://localhost:8000/ws/inspect') {
    this.url = url;
    this.ws = null;
    this.listeners = new Map();
    this.isConnected = false;
    this.reconnectTimer = null;
  }

  connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.isConnected = true;
        this.emit('connection_change', { isConnected: true });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data.payload);
        } catch (err) {
          console.error('Failed to parse WebSocket message', err);
        }
      };

      this.ws.onclose = () => {
        this.isConnected = false;
        this.emit('connection_change', { isConnected: false });
        this.scheduleReconnect();
      };

      this.ws.onerror = (err) => {
        console.error('WebSocket connection error:', err);
        this.ws.close();
      };
    } catch (e) {
      this.scheduleReconnect();
    }
  }

  scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, 2500);
  }

  sendFrame(frameId, imageBase64, clientParams) {
    if (!this.isConnected || !this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }

    this.ws.send(JSON.stringify({
      type: 'INSPECT_FRAME',
      payload: {
        frame_id: frameId,
        timestamp: Date.now() / 1000,
        image_base64: imageBase64,
        client_params: clientParams
      }
    }));
    return true;
  }

  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  off(event, callback) {
    if (!this.listeners.has(event)) return;
    this.listeners.set(event, this.listeners.get(event).filter(cb => cb !== callback));
  }

  emit(event, data) {
    if (!this.listeners.has(event)) return;
    this.listeners.get(event).forEach(cb => cb(data));
  }

  disconnect() {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) this.ws.close();
  }
}
