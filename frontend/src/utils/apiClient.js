import axios from 'axios';

import Toast from '../components/Toast.js';

// SessionStorage Key Shim for Tohfa compatibility
const originalGetItem = sessionStorage.getItem.bind(sessionStorage);
const originalSetItem = sessionStorage.setItem.bind(sessionStorage);
const originalRemoveItem = sessionStorage.removeItem.bind(sessionStorage);

const KEY_MAP = {
  'access_token': 'tohfa_access_token',
  'refresh_token': 'tohfa_refresh_token',
  'user': 'tohfa_user'
};

sessionStorage.getItem = function(key) {
  const mappedKey = KEY_MAP[key] || key;
  return originalGetItem(mappedKey);
};

sessionStorage.setItem = function(key, value) {
  const mappedKey = KEY_MAP[key] || key;
  originalSetItem(mappedKey, value);
};

sessionStorage.removeItem = function(key) {
  const mappedKey = KEY_MAP[key] || key;
  originalRemoveItem(mappedKey);
};

const apiClient = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' }
});

// Attach access token to every request or mock guest responses
apiClient.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    if (config.headers) {
      delete config.headers['Content-Type'];
      delete config.headers['content-type'];
      if (typeof config.headers.delete === 'function') {
        config.headers.delete('Content-Type');
        config.headers.delete('content-type');
      }
    }
  }
  const token = sessionStorage.getItem('tohfa_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
    return config;
  }

  // Guest user handling
  const url = config.url || '';
  const method = (config.method || 'get').toLowerCase();

  // If method is GET, mock responses for protected endpoints called on public pages
  if (method === 'get') {
    if (url.includes('/cart')) {
      return Promise.reject({
        isMock: true,
        mockResponse: { data: { success: true, data: { items: [], item_count: 0 } } }
      });
    }
    if (url.includes('/wishlist')) {
      return Promise.reject({
        isMock: true,
        mockResponse: { data: { success: true, data: { items: [], count: 0 } } }
      });
    }
    if (url.includes('/profile/me')) {
      return Promise.reject({
        isMock: true,
        mockResponse: { data: { success: false, message: 'Not logged in' } }
      });
    }
    if (url.includes('/notifications')) {
      return Promise.reject({
        isMock: true,
        mockResponse: { data: { success: true, unread_count: 0, notifications: [] } }
      });
    }
  }

  // Any other protected endpoint request from a guest user redirects to login
  const isPublicEndpoint = url.includes('/products') || url.includes('/categories') || url.includes('/hero-slides') || url.includes('/auth/') || url.includes('/sellers/');
  if (!isPublicEndpoint) {
    window.location.href = `/auth/login.html?redirect=${encodeURIComponent(window.location.href)}`;
    // Abort/Cancel request
    const cancelTokenSource = axios.CancelToken.source();
    config.cancelToken = cancelTokenSource.token;
    cancelTokenSource.cancel('Guest user redirected to login.');
  }

  return config;
});

// Auto-refresh on 401
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => error ? prom.reject(error) : prom.resolve(token));
  failedQueue = [];
};

function prefixRelativeUrls(obj) {
  if (!obj) return obj;
  if (typeof obj === 'string') {
    if (obj.startsWith('/uploads/') || obj.startsWith('/media/')) {
      const apiHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' ? '' : 'https://api.thetohfa.in';
      return apiHost + obj;
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(prefixRelativeUrls);
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      obj[key] = prefixRelativeUrls(obj[key]);
    }
  }
  return obj;
}

apiClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = prefixRelativeUrls(response.data);
    }
    const url = response.config?.url;
    const method = response.config?.method;
    if (url && (url.includes('/cart') || url.includes('/cart/items')) && ['post', 'put', 'patch', 'delete'].includes(method.toLowerCase())) {
      window.dispatchEvent(new CustomEvent('tohfa-cart-updated'));
    }
    return response;
  },
  async (error) => {
    if (error.isMock) {
      return Promise.resolve(error.mockResponse);
    }
    // If it's a cancelled request from a guest, don't show any error toast or attempt refresh
    if (axios.isCancel(error)) {
      return Promise.reject(error);
    }

    const refreshToken = sessionStorage.getItem('tohfa_refresh_token');
    const originalRequest = error.config;

    // Auto-refresh on 401 (only if refresh token exists)
    if (error.response?.status === 401) {
      if (!refreshToken) {
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        });
      }
      originalRequest._retry = true;
      isRefreshing = true;
      try {
        const { data } = await axios.post('/api/auth/refresh', { refresh_token: refreshToken });
        sessionStorage.setItem('tohfa_access_token', data.data.access_token);
        processQueue(null, data.data.access_token);
        originalRequest.headers.Authorization = `Bearer ${data.data.access_token}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        processQueue(refreshError, null);
        sessionStorage.clear();
        window.location.href = '/auth/login.html';
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Global error toast for non-401 requests
    // For GET read operations, suppress automatic error toasts so background data loads don't flood the UI with popups.
    // For mutation requests (POST/PUT/PATCH/DELETE), show error toast unless suppressToast is set to true.
    if (error.response?.status !== 401 && !error.config?.suppressToast) {
      const isGet = (error.config?.method || 'get').toLowerCase() === 'get';
      const forceShow = error.config?.showToastOnError === true;
      if (!isGet || forceShow) {
        const msg = error.response?.data?.message || error.message || 'Request failed';
        Toast.show(msg, 'error');
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
