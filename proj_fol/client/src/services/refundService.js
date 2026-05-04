import api from './api';

export const refundService = {
  request:    (data)           => api.post('/refunds', data),
  review:     (id, action)     => api.put(`/refunds/${id}/review`, { action }),
  getPending: ()               => api.get('/refunds/pending'),
  getMine:    (params)         => api.get('/refunds/my', { params }),
  getOne:     (id)             => api.get(`/refunds/${id}`),
};