const { query, getClient } = require('../config/db');
const { calculatePlatformFee, getPagination, paginationMeta } = require('../utils/helpers');
const { validationResult } = require('express-validator');
const { getIO } = require('../config/socket');

// @desc    Create booking
// @route   POST /api/bookings
// @access  Private (player/owner)
const createBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { slot_id, notes } = req.body;

    await client.query('BEGIN');

    // Lock the slot row to prevent double booking
    const slotResult = await client.query(
      `SELECT ts.*, t.price_per_hour, t.name as turf_name, t.owner_id
       FROM time_slots ts
       JOIN turfs t ON ts.turf_id = t.id
       WHERE ts.id = $1 AND ts.status = 'available'
       FOR UPDATE`,
      [slot_id]
    );

    if (!slotResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'Slot is no longer available. Please choose another.',
      });
    }

    const slot = slotResult.rows[0];

    // Calculate duration in hours
    const start = new Date(`1970-01-01T${slot.start_time}`);
    const end = new Date(`1970-01-01T${slot.end_time}`);
    const hours = (end - start) / (1000 * 60 * 60);
    const total_amount = parseFloat((hours * slot.price_per_hour).toFixed(2));
    const platform_fee = calculatePlatformFee(total_amount);

    // Mark slot as booked
    await client.query(
      `UPDATE time_slots SET status = 'booked' WHERE id = $1`,
      [slot_id]
    );

    // Create booking
    const booking = await client.query(
      `INSERT INTO bookings (slot_id, organizer_id, total_amount, platform_fee, notes)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [slot_id, req.user.id, total_amount, platform_fee, notes]
    );

    await client.query('COMMIT');

    // Notify turf owner via socket
    try {
      const io = getIO();
      io.to(`user:${slot.owner_id}`).emit('new_notification', {
        type: 'new_booking',
        title: 'New Booking!',
        message: `Your turf "${slot.turf_name}" has a new booking for ${slot.date}`,
        data: { booking_id: booking.rows[0].id },
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: 'Booking created! Complete payment to confirm.',
      data: {
        booking: booking.rows[0],
        slot: {
          date: slot.date,
          start_time: slot.start_time,
          end_time: slot.end_time,
          turf_name: slot.turf_name,
        },
        payment_summary: {
          subtotal: total_amount,
          platform_fee,
          total: parseFloat((total_amount + platform_fee).toFixed(2)),
        },
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Get my bookings
// @route   GET /api/bookings/my
// @access  Private
const getMyBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = ['b.organizer_id = $1'];
    let params = [req.user.id];
    let idx = 2;

    if (status) {
      conditions.push(`b.status = $${idx++}`);
      params.push(status);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`,
      params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT b.*,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.address, t.city, t.images,
        p.status as payment_status, p.razorpay_payment_id,
        m.id as match_id, m.title as match_title, m.status as match_status
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.type = 'booking'
       LEFT JOIN matches m ON m.booking_id = b.id
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: paginationMeta(parseInt(countResult.rows[0].count), page, lim),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single booking
// @route   GET /api/bookings/:id
// @access  Private
const getBooking = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT b.*,
        ts.date, ts.start_time, ts.end_time,
        t.id as turf_id, t.name as turf_name, t.address, t.city,
        t.images, t.price_per_hour,
        u.name as organizer_name, u.phone as organizer_phone,
        p.status as payment_status, p.razorpay_payment_id, p.razorpay_order_id,
        m.id as match_id, m.title as match_title, m.current_players,
        m.team_size, m.status as match_status, m.invite_code
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.type = 'booking'
       LEFT JOIN matches m ON m.booking_id = b.id
       WHERE b.id = $1`,
      [req.params.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Booking not found.' });

    const booking = result.rows[0];

    // Only organizer or turf owner or admin can view
    if (
      booking.organizer_id !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      // Check if user is the turf owner
      const isOwner = await query(
        'SELECT id FROM turfs WHERE id = $1 AND owner_id = $2',
        [booking.turf_id, req.user.id]
      );
      if (!isOwner.rows.length)
        return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    res.json({ success: true, data: booking });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel booking
// @route   PUT /api/bookings/:id/cancel
// @access  Private
const cancelBooking = async (req, res, next) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');

    const result = await client.query(
      `SELECT b.*, ts.date, ts.start_time
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE b.id = $1 FOR UPDATE`,
      [req.params.id]
    );

    if (!result.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Booking not found.' });
    }

    const booking = result.rows[0];

    if (booking.organizer_id !== req.user.id && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Not authorized.' });
    }

    if (['cancelled', 'completed'].includes(booking.status)) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Booking is already ${booking.status}.`,
      });
    }

    // Check cancellation window (must be 2+ hours before slot)
    const slotDateTime = new Date(`${booking.date}T${booking.start_time}`);
    const now = new Date();
    const hoursUntilSlot = (slotDateTime - now) / (1000 * 60 * 60);

    if (hoursUntilSlot < 2 && req.user.role !== 'admin') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Cannot cancel booking within 2 hours of the slot.',
      });
    }

    // Cancel booking + free up slot
    await client.query(
      `UPDATE bookings SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [booking.id]
    );
    await client.query(
      `UPDATE time_slots SET status = 'available' WHERE id = $1`,
      [booking.slot_id]
    );

    // Cancel associated match if exists
    await client.query(
      `UPDATE matches SET status = 'cancelled' WHERE booking_id = $1`,
      [booking.id]
    );

    await client.query('COMMIT');

    res.json({
      success: true,
      message: 'Booking cancelled. Refund will be processed in 5-7 business days.',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Get owner's turf bookings
// @route   GET /api/bookings/turf/:turfId
// @access  Private (owner)
const getTurfBookings = async (req, res, next) => {
  try {
    const { turfId } = req.params;
    const { status, date, page = 1, limit = 10 } = req.query;
    const { limit: lim, offset } = getPagination(page, limit);

    // Verify ownership
    const turf = await query(
      'SELECT id FROM turfs WHERE id = $1 AND owner_id = $2',
      [turfId, req.user.id]
    );
    if (!turf.rows.length)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    let conditions = ['ts.turf_id = $1'];
    let params = [turfId];
    let idx = 2;

    if (status) { conditions.push(`b.status = $${idx++}`); params.push(status); }
    if (date) { conditions.push(`ts.date = $${idx++}`); params.push(date); }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id ${whereClause}`,
      params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT b.*, ts.date, ts.start_time, ts.end_time,
        u.name as organizer_name, u.phone as organizer_phone,
        m.id as match_id, m.title as match_title,
        m.current_players, m.team_size
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN users u ON b.organizer_id = u.id
       LEFT JOIN matches m ON m.booking_id = b.id
       ${whereClause}
       ORDER BY ts.date DESC, ts.start_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
      pagination: paginationMeta(parseInt(countResult.rows[0].count), page, lim),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createBooking,
  getMyBookings,
  getBooking,
  cancelBooking,
  getTurfBookings,
};