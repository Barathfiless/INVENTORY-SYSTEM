import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  getProfile: () => api.get('/auth/profile'),
  updateProfile: (data) => api.put('/auth/profile', data),
};

export const productAPI = {
  getAll: (params) => api.get('/products', { params }),
  getById: (id) => api.get(`/products/${id}`),
  getCategories: () => api.get('/products/categories'),
  getAdminAll: () => api.get('/products/admin/all'),
  getStock: () => api.get('/products/admin/stock'),
  create: (data) => api.post('/products', data),
  update: (id, data) => api.put(`/products/${id}`, data),
  delete: (id) => api.delete(`/products/${id}`),
};

export const purchaseAPI = {
  getAll: (params) => api.get('/purchases', { params }),
  create: (data) => api.post('/purchases', data),
  delete: (id, config) => api.delete(`/purchases/${id}`, config),
};

export const saleAPI = {
  getAll: (params) => api.get('/sales', { params }),
  create: (data) => api.post('/sales', data),
  delete: (id, config) => api.delete(`/sales/${id}`, config),
};

export const orderAPI = {
  create: (data) => api.post('/orders', data),
  getMy: () => api.get('/orders/my'),
  getById: (id) => api.get(`/orders/${id}`),
  getAll: () => api.get('/orders'),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
};

export const reportAPI = {
  getDashboard: () => api.get('/reports/dashboard'),
  getReports: (params) => api.get('/reports', { params }),
};

export default api;
