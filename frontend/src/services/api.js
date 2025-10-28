import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '/api';

// Create axios instance with credentials
const apiClient = axios.create({
  baseURL: API_URL,
  withCredentials: true
});

export const authService = {
  login: () => window.location.href = `${API_URL}/auth/login`,
  logout: async () => await apiClient.get('/auth/logout'),
  checkAuthStatus: async () => {
    const response = await apiClient.get('/auth/status');
    return response.data;
  }
};

export const invoiceService = {
  getBillingPeriods: async () => {
    const response = await apiClient.get('/invoices/billing-periods');
    return response.data;
  },
  
  getInvoiceData: async (invoiceId) => {
    const response = await apiClient.get(`/invoices/invoice/${invoiceId}`, {
      responseType: 'text'
    });
    return response.data;
  }
};

export const dropletService = {
  getLiveCosts: async () => {
    const response = await apiClient.get('/droplets/live-costs');
    return response.data;
  },
  
  getDropletNames: async (dropletIds) => {
    const response = await apiClient.post('/droplets/names', { dropletIds });
    return response.data;
  }
};