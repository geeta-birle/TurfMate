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
const { query } = require('../config/db');

router.use(protect);

router.post('/',
  [body('slot_id').notEmpty().withMessage('Slot ID is required')],
  createBooking
);

router.get('/my', getMyBookings);
router.get('/turf/:turfId', authorize('owner', 'admin'), getTurfBookings);

// ── IMPORTANT: specific routes before /:id ──
router.put('/:id/cancel', cancelBooking);

// Test mode only — confirm booking without payment
router.put('/:id/test-confirm', async (req, res, next) => {
  try {
    // Confirm booking
    const bookingResult = await query(
      `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 AND organizer_id = $2
       RETURNING id`,
      [req.params.id, req.user.id]
    );

    if (!bookingResult.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Booking not found or not authorized.',
      });
    }

    // Add test payment record
    await query(
      `INSERT INTO payments
        (booking_id, user_id, razorpay_order_id,
         razorpay_payment_id, amount, type, status)
       SELECT
         b.id,
         b.organizer_id,
         'order_test_' || LEFT(b.id::text, 8),
         'pay_test_' || LEFT(b.id::text, 8),
         b.total_amount + b.platform_fee,
         'booking',
         'success'
       FROM bookings b
       WHERE b.id = $1
       ON CONFLICT DO NOTHING`,
      [req.params.id]
    );

    res.json({
      success: true,
      message: 'Booking confirmed for testing. ✅',
    });
  } catch (err) {
    next(err);
  }
});

router.get('/:id', getBooking);

module.exports = router;