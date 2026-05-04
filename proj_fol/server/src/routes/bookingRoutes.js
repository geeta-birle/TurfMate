const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getTurfBookings,
} = require('../controllers/bookingController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/',
  [body('slot_id').notEmpty().withMessage('Slot ID is required')],
  createBooking
);

router.get('/my', getMyBookings);
router.get('/turf/:turfId', authorize('owner', 'admin'), getTurfBookings);

// ── IMPORTANT: specific routes before /:id ──
router.put('/:id/cancel', cancelBooking);

router.get('/:id', getBooking);

module.exports = router;