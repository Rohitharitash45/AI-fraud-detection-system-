import axios from 'axios';

// ── Axios Instance ────────────────────────────────────────────
const API = axios.create({
  baseURL: 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // ✅ matches supports_credentials=True in Flask CORS
});

// ── Request Interceptor: Auto-attach JWT Token ────────────────
// This ensures @jwt_required() routes never get a 401
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`; // ✅ Flask expects "Bearer <token>"
  }
  return config;
});

// ── Response Interceptor: Handle Token Expiry ─────────────────
// If access token expires (401), clear storage and redirect to login
API.interceptors.response.use(
  (response) => response, // pass through successful responses
  (error) => {
    if (error.response?.status === 401) {
      const isAuthRoute =
        error.config.url.includes('/auth/login') ||
        error.config.url.includes('/auth/register');

      // ✅ Only redirect on 401 for protected routes, not login/register
      if (!isAuthRoute) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error); // always re-throw so components can catch
  }
);

// ── AUTH ROUTES ───────────────────────────────────────────────
// Each returns axios response → access data via r.data in components
export const loginUser    = (data) => API.post('/auth/login', data);
export const registerUser = (data) => API.post('/auth/register', data);
export const getMe        = ()     => API.get('/auth/me');
export const refreshToken = ()     => API.post('/auth/refresh');

// ── SCANNING ROUTES ───────────────────────────────────────────
export const scanUrl      = (url)    => API.post('/detect', { url });
export const scanSms      = (text)   => API.post('/analyze-sms', { text });
export const checkNumber  = (number) => API.post('/check-number', { number });
export const reportScam   = (url)    => API.post('/report-scam', { url });

// ── DASHBOARD & HISTORY ───────────────────────────────────────
export const getHistory  = () => API.get('/history');
export const getMyStats  = () => API.get('/api/stats');

// ── MULTI SCAN ────────────────────────────────────────────────
export const multiScan = (data) => API.post('/detect-bulk', data);

// ── VOICE SCAN ────────────────────────────────────────────────
// Must use multipart/form-data — axios handles this when you pass FormData
export const scanVoice = (formData) =>
  API.post('/detect_voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const voiceScan = (formData) =>
  API.post('/detect_voice', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// ── OCR SCAN ──────────────────────────────────────────────────
export const ocrScan = (file) => {
  const formData = new FormData();
  formData.append("file", file);

  return API.post("/analyze-image", formData); // ✅ no headers
  
};



// ── PROFILE ───────────────────────────────────────────────────
export const getUserProfile = () => API.get('/auth/me');
export const updateProfile  = (data) => API.put('/auth/me', data);

export default API;