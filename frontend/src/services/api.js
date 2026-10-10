import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const api = {
  // Inspection
  inspectImage: async (formData) => {
    const res = await client.post('/api/v1/inspection/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  getHistory: async () => {
    const res = await client.get('/api/v1/inspection/history');
    return res.data;
  },

  getConfig: async () => {
    const res = await client.get('/api/v1/inspection/config');
    return res.data;
  },

  updateConfig: async (config) => {
    const res = await client.post('/api/v1/inspection/config', config);
    return res.data;
  },

  // Onboarding
  uploadReferenceImages: async (formData) => {
    const res = await client.post('/api/v1/onboarding/upload-references', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  buildMemoryBank: async (productName = 'screw_v1') => {
    const res = await client.post(`/api/v1/onboarding/build-memory-bank?product_name=${productName}`);
    return res.data;
  },

  getProfile: async () => {
    const res = await client.get('/api/v1/onboarding/profile');
    return res.data;
  },

  // Feedback
  confirmDefect: async (payload) => {
    const res = await client.post('/api/v1/feedback/confirm-defect', payload);
    return res.data;
  },

  markFalseAlarm: async (payload) => {
    const res = await client.post('/api/v1/feedback/mark-false-alarm', payload);
    return res.data;
  },

  getFeedbackSummary: async () => {
    const res = await client.get('/api/v1/feedback/summary');
    return res.data;
  },
};
