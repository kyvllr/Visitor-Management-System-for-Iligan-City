// src/config/api.jsx
const API_BASE_URL = import.meta.env.VITE_API_URL || (
  typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:5001'
    : 'https://visitor-management-system-for-iligan-city.onrender.com'
);

if (typeof window !== 'undefined') {
  console.log('🌐 Current hostname:', window.location.hostname);
  console.log('🔗 Using API_BASE_URL:', API_BASE_URL);
}

export default API_BASE_URL;