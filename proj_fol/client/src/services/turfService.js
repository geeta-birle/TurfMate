import api from './api';

export const turfService = {
  getAll:        (params) => api.get('/turfs', { params }),
  getOne:        (id) => api.get(`/turfs/${id}`),
  create:        (data) => api.post('/turfs', data),
  update:        (id, data) => api.put(`/turfs/${id}`, data),
  delete:        (id) => api.delete(`/turfs/${id}`),
  getMine:       () => api.get('/turfs/my'),
  getSlots:      (id, params) => api.get(`/turfs/${id}/slots`, { params }),
  addSlots:      (id, data) => api.post(`/turfs/${id}/slots`, data),
  generateSlots: (id, data) => api.post(`/turfs/${id}/slots/generate`, data),
  updateSlot:    (turfId, slotId, data) => api.put(`/turfs/${turfId}/slots/${slotId}`, data),
  addReview:     (id, data) => api.post(`/turfs/${id}/review`, data),
};