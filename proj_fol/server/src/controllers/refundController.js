const Razorpay = require('razorpay');
const { query, getClient } = require('../config/db');
const { toPaise } = require('../utils/helpers');
const { createNotification } = require('./notificationController');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Request a refund
// @route   POST /api/refunds
// @access  Private
const requestRefund = async (req, res, next) => {
  const client = await getClient();
  try {
    const { booking_id, reason } = req.body;

    await client.query('BEGIN');

    // Get booking + payment details
    const bookingResult = await client.query(
      `SELECT b.*, p.id as payment_id, p.razorpay_payment_id,
        p.amount as paid_amount, p.status as payment_status,
        ts.date, ts.start_time, t.name as turf_name, t.owner_id
       FROM bookings b
       JOIN payments p ON p.booking_id = b.id AND p.type = 'booking'
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE b.id = $1 AND b.organizer_id = $2
       FOR UPDATE`,
      [booking_id, req.user.id]
    );

    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = bookingResult.rows[0];

    // Validations
    if (booking.payment_status !== 'success') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No successful payment found for this booking.',
      });
    }

    if (booking.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot refund a completed booking.',
      });
    }

    // Check if refund already requested
    const existingRefund = await client.query(
      `SELECT id, status FROM refunds WHERE booking_id = $1`,
      [booking_id]
    );

    if (existingRefund.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `Refund already ${existingRefund.rows[0].status}.`,
      });
    }

    // Calculate refund amount based on cancellation timing
    const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilSlot = (slotDateTime - now) / (1000 * 60 * 60);

    let refundPercent = 0;
    let refundNote = '';

    if (hoursUntilSlot >= 24) {
      refundPercent = 100;
      refundNote = 'Full refund (cancelled 24+ hours before)';
    } else if (hoursUntilSlot >= 6) {
      refundPercent = 50;
      refundNote = '50% refund (cancelled 6-24 hours before)';
    } else if (hoursUntilSlot >= 2) {
      refundPercent = 25;
      refundNote = '25% refund (cancelled 2-6 hours before)';
    } else {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'No refund available within 2 hours of the slot.',
      });
    }

    const refundAmount = parseFloat(
      ((booking.paid_amount * refundPercent) / 100).toFixed(2)
    );

    // Initiate Razorpay refund
    let razorpayRefund = null;
    try {
      razorpayRefund = await razorpay.payments.refund(
        booking.razorpay_payment_id,
        {
          amount: toPaise(refundAmount),
          notes: { booking_id, reason, refund_note: refundNote },
        }
      );
    } catch (rzpError) {
      await client.query('ROLLBACK');
      return res.status(502).json({
        success: false,
        message: 'Refund initiation failed with payment gateway.',
        error: rzpError.message,
      });
    }

    // Save refund record
    const refund = await client.query(
      `INSERT INTO refunds
        (payment_id, booking_id, user_id, razorpay_refund_id, amount, reason, status)
       VALUES ($1, $2, $3, $4, $5, $6, 'processing')
       RETURNING *`,
      [
        booking.payment_id, booking_id, req.user.id,
        razorpayRefund.id, refundAmount, reason,
      ]
    );

    // Update booking status to cancelled
    await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [booking_id]
    );

    // Free up the slot
    await client.query(
      `UPDATE time_slots SET status = 'available' WHERE id = $1`,
      [booking.slot_id]
    );

    // Update payment status
    await client.query(
      `UPDATE payments SET status = 'refunded' WHERE id = $1`,
      [booking.payment_id]
    );

    await client.query('COMMIT');

    // Notify user + turf owner
    await createNotification(req.user.id, {
      type: 'refund_initiated',
      title: 'Refund Initiated ✅',
      message: `₹${refundAmount} refund initiated (${refundPercent}%). Expected in 5-7 business days.`,
      data: { booking_id, refund_id: refund.rows[0].id },
    });

    await createNotification(booking.owner_id, {
      type: 'booking_cancelled',
      title: 'Booking Cancelled',
      message: `A booking for "${booking.turf_name}" has been cancelled with a refund.`,
      data: { booking_id },
    });

    res.status(201).json({
      success: true,
      message: `Refund of ₹${refundAmount} initiated successfully.`,
      data: {
        refund: refund.rows[0],
        refund_amount: refundAmount,
        refund_percent: refundPercent,
        note: refundNote,
        expected: '5-7 business days',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Get refund status
// @route   GET /api/refunds/:id
// @access  Private
const getRefund = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, b.status as booking_status,
        ts.date, ts.start_time, t.name as turf_name
       FROM refunds r
       JOIN bookings b ON r.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE r.id = $1 AND r.user_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Refund not found.' });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// @desc    Get my refunds
// @route   GET /api/refunds/my
// @access  Private
const getMyRefunds = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT r.*, ts.date, ts.start_time,
        t.name as turf_name
       FROM refunds r
       JOIN bookings b ON r.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE r.user_id = $1
       ORDER BY r.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// @desc    Razorpay refund webhook handler (called from paymentController)
// @access  Internal
const handleRefundWebhook = async (payload) => {
  try {
    const refundEntity = payload.refund.entity;
    const razorpayRefundId = refundEntity.id;
    const status = refundEntity.status === 'processed' ? 'completed' : 'failed';

    const result = await query(
      `UPDATE refunds SET status = $1, updated_at = NOW()
       WHERE razorpay_refund_id = $2
       RETURNING *, user_id`,
      [status, razorpayRefundId]
    );

    if (result.rows.length) {
      await createNotification(result.rows[0].user_id, {
        type: status === 'completed' ? 'refund_completed' : 'refund_failed',
        title: status === 'completed' ? 'Refund Completed ✅' : 'Refund Failed ❌',
        message: status === 'completed'
          ? `Your refund of ₹${result.rows[0].amount} has been credited.`
          : `Your refund of ₹${result.rows[0].amount} failed. Contact support.`,
        data: { refund_id: result.rows[0].id },
      });
    }
  } catch (err) {
    console.error('Refund webhook error:', err.message);
  }
};

module.exports = { requestRefund, getRefund, getMyRefunds, handleRefundWebhook };