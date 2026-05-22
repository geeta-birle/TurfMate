import api from './api';

export const bookingService = {
  create: (data) => {
    // 🔒 Validate before sending request
    if (!data || !data.slot_id) {
      console.error('Booking failed: slot_id is missing');
      return Promise.reject({
        response: {
          data: { message: 'Slot ID is required.' },
        },
      });
    }

    return api.post('/bookings', {
      slot_id: data.slot_id,
    });
  },

  getMine: (params) =>
    api.get('/bookings/my', { params }),

  getOne: (id) =>
    api.get(`/bookings/${id}`),

  cancel: (id) =>
    api.put(`/bookings/${id}/cancel`),

  getTurfBookings: (turfId, params) =>
    api.get(`/bookings/turf/${turfId}`, { params }),
};