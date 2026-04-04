import api from './api';

export const bookingService = {
  create: (data) => api.post('/bookings', data),
  getMine: (params) => api.get('/bookings/my', { params }),
  getOne: (id) => api.get(`/bookings/${id}`),
  cancel: (id) => api.put(`/bookings/${id}/cancel`),
  getTurfBookings: (turfId, params) =>
    api.get(`/bookings/turf/${turfId}`, { params }),
};