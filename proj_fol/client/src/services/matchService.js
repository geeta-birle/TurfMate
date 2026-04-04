import api from './api';

export const matchService = {
  getAll: (params) => api.get('/matches', { params }),
  getOne: (id) => api.get(`/matches/${id}`),
  getMine: (params) => api.get('/matches/my', { params }),
  create: (data) => api.post('/matches', data),
  join: (id, data) => api.post(`/matches/${id}/join`, data),
  handleRequest: (id, playerId, data) =>
    api.put(`/matches/${id}/players/${playerId}`, data),
  leave: (id) => api.delete(`/matches/${id}/leave`),
  cancel: (id) => api.put(`/matches/${id}/cancel`),
};