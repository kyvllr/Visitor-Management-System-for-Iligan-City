// src/config/api.jsx
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : '/api'
);

export default API_BASE_URL;