import axios from 'axios';

const adminApiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach admin token to every request
adminApiClient.interceptors.request.use((config) => {
  const token = sessionStorage.getItem('tohfa_admin_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  failedQueue = [];
};

// Redirect to login on 401/403 or try silent refresh
adminApiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if ((error.response?.status === 401 || error.response?.status === 403) && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
        .then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return adminApiClient(originalRequest);
        })
        .catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      const refreshToken = sessionStorage.getItem('tohfa_admin_refresh_token');
      if (refreshToken) {
        try {
          const res = await axios.post('/api/admin/auth/refresh', { refresh_token: refreshToken }, {
            headers: { 'Content-Type': 'application/json' }
          });
          if (res.data?.success) {
            const { access_token, refresh_token } = res.data.data;
            sessionStorage.setItem('tohfa_admin_token', access_token);
            sessionStorage.setItem('tohfa_admin_refresh_token', refresh_token);
            
            // Sync session across tabs
            window.dispatchEvent(new Event('tohfa-session-sync'));

            processQueue(null, access_token);
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
            isRefreshing = false;
            return adminApiClient(originalRequest);
          }
        } catch (refreshError) {
          processQueue(refreshError, null);
          isRefreshing = false;
          sessionStorage.removeItem('tohfa_admin_token');
          sessionStorage.removeItem('tohfa_admin_refresh_token');
          window.location.href = '/admin/login.html';
          return Promise.reject(refreshError);
        }
      } else {
        isRefreshing = false;
        sessionStorage.removeItem('tohfa_admin_token');
        window.location.href = '/admin/login.html';
      }
    }
    return Promise.reject(error);
  }
);

export default adminApiClient;
