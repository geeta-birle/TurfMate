const { query, getClient } = require('../config/db');
const { validationResult } = require('express-validator');

// ─────────────────────────────────────────────────────
// @desc    Create booking
// @route   POST /api/bookings
// @access  Private
// ─────────────────────────────────────────────────────
const createBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { slot_id } = req.body;

    await client.query('BEGIN');

    // Lock and fetch slot
    const slotResult = await client.query(
      `SELECT ts.*,
              t.name         AS turf_name,
              t.owner_id,
              t.price_per_hour
       FROM time_slots ts
       JOIN turfs t ON ts.turf_id = t.id
       WHERE ts.id = $1
       FOR UPDATE`,
      [slot_id]
    );

    if (!slotResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false, message: 'Slot not found.',
      });
    }

    const slot = slotResult.rows[0];

    // ── PAST SLOT CHECK via PostgreSQL (avoids timezone bugs) ──
    const timeCheck = await client.query(
      `SELECT (ts.date::date + ts.start_time::time) <= NOW() AS is_past
       FROM time_slots ts WHERE ts.id = $1`,
      [slot_id]
    );

    if (timeCheck.rows[0]?.is_past) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'This slot has already passed. Please select a future slot.',
        code:    'SLOT_EXPIRED',
      });
    }
    // ──────────────────────────────────────────────────────────

    if (slot.status !== 'available') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: slot.status === 'booked'
          ? 'This slot is already booked by another user.'
          : 'This slot is not available.',
      });
    }

    const totalAmount = parseFloat(slot.price_per_hour);
    const platformFee = parseFloat((totalAmount * 0.10).toFixed(2));

    // Lock the slot
    await client.query(
      `UPDATE time_slots SET status = 'booked' WHERE id = $1`,
      [slot_id]
    );

    // Create booking
    const bookingResult = await client.query(
      `INSERT INTO bookings
         (slot_id, organizer_id, total_amount, platform_fee, status)
       VALUES ($1, $2, $3, $4, 'pending')
       RETURNING *`,
      [slot_id, req.user.id, totalAmount, platformFee]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Booking created! Please complete payment.',
      data:    { booking: bookingResult.rows[0] },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────
// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
// ─────────────────────────────────────────────────────
const getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const conditions = ['b.organizer_id = $1'];
    const params     = [req.user.id];
    let   idx        = 2;

    if (status) {
      conditions.push(`b.status = $${idx++}`);
      params.push(status);
    }

    const where  = 'WHERE ' + conditions.join(' AND ');
    const offset = (parseInt(page) - 1) * parseInt(limit);
    params.push(parseInt(limit), offset);

    const result = await query(
      `SELECT b.*,
              t.name    AS turf_name,
              t.city,
              t.address,
              ts.date,
              ts.start_time,
              ts.end_time,
              p.status  AS payment_status,
              p.razorpay_payment_id,
              m.id      AS match_id,
              m.title   AS match_title,
              m.status  AS match_status,
              m.current_players,
              m.team_size
       FROM   bookings b
       JOIN   time_slots ts ON b.slot_id      = ts.id
       JOIN   turfs      t  ON ts.turf_id     = t.id
       LEFT JOIN payments p ON p.booking_id   = b.id
                            AND p.status      = 'success'
       LEFT JOIN matches  m ON m.booking_id   = b.id
       ${where}
       ORDER  BY b.created_at DESC
       LIMIT  $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────
// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
// ─────────────────────────────────────────────────────
const getBooking = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
              t.name    AS turf_name,
              t.city,
              t.address,
              t.lat,
              t.lng,
              ts.date,
              ts.start_time,
              ts.end_time,
              p.status  AS payment_status,
              p.razorpay_payment_id,
              m.id      AS match_id,
              m.title   AS match_title,
              m.status  AS match_status,
              m.current_players,
              m.team_size
       FROM   bookings b
       JOIN   time_slots ts ON b.slot_id      = ts.id
       JOIN   turfs      t  ON ts.turf_id     = t.id
       LEFT JOIN payments p ON p.booking_id   = b.id
                            AND p.status      = 'success'
       LEFT JOIN matches  m ON m.booking_id   = b.id
       WHERE  b.id = $1
         AND  b.organizer_id = $2`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length)
      return res.status(404).json({
        success: false, message: 'Booking not found.',
      });

    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────
// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
// ─────────────────────────────────────────────────────
const cancelBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT b.*, ts.id AS ts_id
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE b.id = $1 AND b.organizer_id = $2
       FOR UPDATE`,
      [req.params.id, req.user.id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false, message: 'Booking not found.',
      });
    }

    const booking = result.rows[0];

    if (booking.status === 'cancelled') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false, message: 'Booking is already cancelled.',
      });
    }

    await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW()
       WHERE id = $1`,
      [req.params.id]
    );

    await client.query(
      `UPDATE time_slots SET status = 'available' WHERE id = $1`,
      [booking.slot_id]
    );

    await client.query('COMMIT');

    res.json({ success: true, message: 'Booking cancelled.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// ─────────────────────────────────────────────────────
// @desc    Get bookings for a turf (owner view)
// @route   GET /api/bookings/turf/:turfId
// @access  Private (owner/admin)
// ─────────────────────────────────────────────────────
const getTurfBookings = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
              u.name    AS organizer_name,
              u.phone   AS organizer_phone,
              t.name    AS turf_name,
              ts.date,
              ts.start_time,
              ts.end_time,
              p.status  AS payment_status
       FROM   bookings b
       JOIN   users      u  ON b.organizer_id = u.id
       JOIN   time_slots ts ON b.slot_id      = ts.id
       JOIN   turfs      t  ON ts.turf_id     = t.id
       LEFT JOIN payments p ON p.booking_id   = b.id
                            AND p.status      = 'success'
       WHERE  ts.turf_id = $1
       ORDER  BY ts.date DESC, ts.start_time DESC`,
      [req.params.turfId]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────
// TEST MODE — confirm booking without Razorpay
// @route   PUT /api/bookings/:id/test-confirm
// @access  Private
// ─────────────────────────────────────────────────────
const testConfirmBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const bookingResult = await client.query(
      `UPDATE bookings
       SET status = 'confirmed', updated_at = NOW()
       WHERE id = $1 AND organizer_id = $2
       RETURNING id, total_amount, platform_fee, organizer_id`,
      [req.params.id, req.user.id]
    );

    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({
        success: false, message: 'Booking not found.',
      });
    }

    const b = bookingResult.rows[0];

    await client.query(
      `INSERT INTO payments
         (booking_id, user_id, razorpay_order_id,
          razorpay_payment_id, amount, type, status)
       VALUES ($1,$2,$3,$4,$5,'booking','success')
       ON CONFLICT DO NOTHING`,
      [
        b.id, b.organizer_id,
        'order_test_' + b.id.slice(0, 8),
        'pay_test_'   + b.id.slice(0, 8),
        parseFloat(b.total_amount) + parseFloat(b.platform_fee),
      ]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Booking confirmed for testing. ✅',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getTurfBookings,
  testConfirmBooking,
};