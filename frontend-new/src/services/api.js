import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Services
export const vehicleService = {
  park: (data) => api.post('/vehicles/park', data),
  exit: (data) => api.post('/vehicles/exit', data),
  lookup: (vehicleId) => api.get(`/vehicles/lookup/${vehicleId}`),
  getBill: (vehicleId) => api.get(`/vehicles/bill/${vehicleId}`),
  getParked: (params) => api.get('/vehicles/parked', { params }),
  search: (params) => api.get('/vehicles/search', { params }),
  getHistory: (vehicleId, limit = 10) => api.get(`/vehicles/${vehicleId}/history`, { params: { limit } }),
};

export const slotService = {
  getAll: (params) => api.get('/slots', { params }),
  getSummary: () => api.get('/slots/summary'),
  getById: (id) => api.get(`/slots/${id}`),
  create: (data) => api.post('/slots', data),
  update: (id, data) => api.put(`/slots/${id}`, data),
  setMaintenance: (id) => api.put(`/slots/${id}/maintenance`),
  delete: (id) => api.delete(`/slots/${id}`),
};

export const reservationService = {
  create: (data) => api.post('/reservations', data),
  getAll: (params) => api.get('/reservations', { params }),
  getById: (id) => api.get(`/reservations/${id}`),
  getToday: () => api.get('/reservations/list/today'),
  cancel: (id, reason) => api.put(`/reservations/${id}/cancel`, { reason }),
  checkIn: (id) => api.post(`/reservations/${id}/checkin`),
};

export const analyticsService = {
  getDashboard: () => api.get('/analytics/dashboard'),
  getRevenue: (period) => api.get('/analytics/revenue', { params: { period } }),
  getOccupancy: () => api.get('/analytics/occupancy'),
  getHistory: (params) => api.get('/analytics/history', { params }),
  export: (params) => api.get('/analytics/export', { params }),
};

export const pricingService = {
  getPricing: () => api.get('/pricing'),
  getEstimate: (vehicleType, hours) => api.post('/pricing/estimate', { vehicleType, hours }),
};

export const paymentService = {
  createOrder: (data) => api.post('/payments/order', data),
  verifyPayment: (data) => api.post('/payments/verify', data),
};

export const authService = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  checkPhone: (phone) => api.get(`/auth/check-phone/${phone}`),
  getMe: () => api.get('/auth/me'),
  updateDetails: (data) => api.put('/auth/updatedetails', data),
  updatePassword: (data) => api.put('/auth/updatepassword', data),
  logout: () => api.post('/auth/logout'),
};

export default api;
