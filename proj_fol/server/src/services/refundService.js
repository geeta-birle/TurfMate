import api from './api';

export const refundService = {
  request: (data) => api.post('/refunds', data),
  getOne:  (id)   => api.get(`/refunds/${id}`),
  getMine: (params) => api.get('/refunds/my', { params }),
};