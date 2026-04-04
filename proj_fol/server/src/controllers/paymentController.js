const Razorpay = require('razorpay');
const crypto = require('crypto');
const { query, getClient } = require('../config/db');
const { toPaise } = require('../utils/helpers');
const { getIO } = require('../config/socket');

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// @desc    Create Razorpay order
// @route   POST /api/payments/create-order
// @access  Private
const createOrder = async (req, res, next) => {
  try {
    const { booking_id } = req.body;

    const result = await query(
      `SELECT b.*, b.total_amount + b.platform_fee as payable_amount,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE b.id = $1 AND b.organizer_id = $2`,
      [booking_id, req.user.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Booking not found.' });

    const booking = result.rows[0];

    if (booking.status === 'confirmed')
      return res.status(400).json({ success: false, message: 'Booking already paid.' });

    if (booking.status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Booking is cancelled.' });

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount: toPaise(booking.payable_amount),
      currency: 'INR',
      receipt: `booking_${booking_id.slice(0, 8)}`,
      notes: {
        booking_id,
        turf_name: booking.turf_name,
        date: booking.date,
        user_id: req.user.id,
      },
    });

    // Save pending payment record
    await query(
      `INSERT INTO payments (booking_id, user_id, razorpay_order_id, amount, type, status)
       VALUES ($1, $2, $3, $4, 'booking', 'pending')
       ON CONFLICT DO NOTHING`,
      [booking_id, req.user.id, order.id, booking.payable_amount]
    );

    res.json({
      success: true,
      data: {
        order_id: order.id,
        amount: order.amount,
        currency: order.currency,
        key: process.env.RAZORPAY_KEY_ID,
        booking_id,
        prefill: {
          name: req.user.name,
          email: req.user.email,
        },
        notes: order.notes,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify payment signature & confirm booking
// @route   POST /api/payments/verify
// @access  Private
const verifyPayment = async (req, res, next) => {
  const client = await getClient();
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      booking_id,
    } = req.body;

    // Verify signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({
        success: false,
        message: 'Payment verification failed. Invalid signature.',
      });
    }

    await client.query('BEGIN');

    // Update payment record
    await client.query(
      `UPDATE payments SET
        razorpay_payment_id = $1,
        status = 'success',
        metadata = $2
       WHERE razorpay_order_id = $3`,
      [
        razorpay_payment_id,
        JSON.stringify({ razorpay_order_id, razorpay_signature }),
        razorpay_order_id,
      ]
    );

    // Confirm booking
    const bookingResult = await client.query(
      `UPDATE bookings SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1
       RETURNING *, (SELECT owner_id FROM turfs t
                     JOIN time_slots ts ON ts.turf_id = t.id
                     WHERE ts.id = bookings.slot_id) as turf_owner_id`,
      [booking_id]
    );

    await client.query('COMMIT');

    const booking = bookingResult.rows[0];

    // Notify organizer + turf owner via socket
    try {
      const io = getIO();
      io.to(`user:${req.user.id}`).emit('new_notification', {
        type: 'payment_success',
        title: 'Payment Successful! ✅',
        message: 'Your booking is confirmed. Create a match to invite players!',
        data: { booking_id },
      });
      if (booking.turf_owner_id) {
        io.to(`user:${booking.turf_owner_id}`).emit('new_notification', {
          type: 'booking_confirmed',
          title: 'Booking Confirmed',
          message: 'A booking has been confirmed for your turf.',
          data: { booking_id },
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: 'Payment verified! Booking confirmed. 🎉',
      data: {
        booking_id,
        payment_id: razorpay_payment_id,
        status: 'confirmed',
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Razorpay webhook (server-to-server)
// @route   POST /api/payments/webhook
// @access  Public (Razorpay server)
const webhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature'];
    const body = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest('hex');

    if (signature !== expectedSignature) {
      return res.status(400).json({ success: false, message: 'Invalid webhook signature.' });
    }

    const { event, payload } = req.body;

    if (event === 'payment.failed') {
      const orderId = payload.payment.entity.order_id;
      await query(
        `UPDATE payments SET status = 'failed' WHERE razorpay_order_id = $1`,
        [orderId]
      );
    }

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// @desc    Get payment history
// @route   GET /api/payments/my
// @access  Private
const getMyPayments = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT p.*, b.status as booking_status,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id
       LEFT JOIN time_slots ts ON b.slot_id = ts.id
       LEFT JOIN turfs t ON ts.turf_id = t.id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, verifyPayment, webhook, getMyPayments };