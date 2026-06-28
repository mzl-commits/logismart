import axios from 'axios';

const api = axios.create({
  baseURL: '/api/',
  headers: { 'Content-Type': 'application/json' },
  xsrfCookieName: 'csrftoken',
  xsrfHeaderName: 'X-CSRFToken',
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || error.response.status === 403)) {
      // Don't redirect on /me/ check itself to prevent redirect loops during initial page load
      if (!error.config.url.includes('me/')) {
        window.location.href = '/login/?next=' + encodeURIComponent(window.location.pathname);
      }
    }
    return Promise.reject(error);
  }
);

export default api;
