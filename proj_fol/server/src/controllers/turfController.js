const { query, getClient } = require('../config/db');
const {
  getPagination,
  paginationMeta,
  parseTurfArrays,
} = require('../utils/helpers');
const { validationResult } = require('express-validator');

// @desc    Create turf
// @route   POST /api/turfs
// @access  Private (owner only)
const createTurf = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const {
      name, description, address, city,
      lat, lng, sport_types, surface_type,
      amenities, price_per_hour,
    } = req.body;

    const images = req.files ? req.files.map(f => f.path) : [];

    const result = await query(
      `INSERT INTO turfs
        (owner_id, name, description, address, city, lat, lng,
         sport_types, surface_type, amenities, images, price_per_hour)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
       RETURNING *`,
      [
        req.user.id, name, description, address, city,
        lat, lng, sport_types, surface_type,
        amenities || [], images, price_per_hour,
      ]
    );

    res.status(201).json({
      success: true,
      message: 'Turf created! Pending admin approval.',
      data: parseTurfArrays(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all turfs (with search + filter)
// @route   GET /api/turfs
// @access  Public
const getTurfs = async (req, res, next) => {
  try {
    const {
      city, sport_type, min_price, max_price,
      date, page = 1, limit = 10, search,
    } = req.query;

    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = ['t.is_active = true', 't.is_approved = true'];
    let params = [];
    let idx = 1;

    if (city) {
      conditions.push(`LOWER(t.city) = LOWER($${idx++})`);
      params.push(city);
    }
    if (sport_type) {
      conditions.push(`$${idx++} = ANY(t.sport_types)`);
      params.push(sport_type);
    }
    if (min_price) {
      conditions.push(`t.price_per_hour >= $${idx++}`);
      params.push(min_price);
    }
    if (max_price) {
      conditions.push(`t.price_per_hour <= $${idx++}`);
      params.push(max_price);
    }
    if (search) {
      conditions.push(`(t.name ILIKE $${idx} OR t.address ILIKE $${idx++})`);
      params.push(`%${search}%`);
    }

    let dateJoin = '';
    if (date) {
      dateJoin = `
        AND t.id NOT IN (
          SELECT DISTINCT ts.turf_id FROM time_slots ts
          WHERE ts.date = $${idx++} AND ts.status = 'booked'
        )`;
      params.push(date);
    }

    const whereClause = conditions.length
      ? 'WHERE ' + conditions.join(' AND ')
      : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM turfs t ${whereClause} ${dateJoin}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(lim, offset);
    const result = await query(
      `SELECT t.*, u.name as owner_name, u.phone as owner_phone
       FROM turfs t
       JOIN users u ON t.owner_id = u.id
       ${whereClause} ${dateJoin}
       ORDER BY t.avg_rating DESC, t.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({
      success: true,
      data: result.rows.map(parseTurfArrays),
      pagination: paginationMeta(total, page, lim),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get single turf
// @route   GET /api/turfs/:id
// @access  Public
const getTurf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT t.*, u.name as owner_name, u.phone as owner_phone,
              u.email as owner_email
       FROM turfs t
       JOIN users u ON t.owner_id = u.id
       WHERE t.id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });

    const reviews = await query(
      `SELECT r.*, u.name as reviewer_name, u.avatar_url
       FROM reviews r
       JOIN users u ON r.reviewer_id = u.id
       WHERE r.target_id = $1 AND r.target_type = 'turf'
       ORDER BY r.created_at DESC LIMIT 10`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...parseTurfArrays(result.rows[0]),
        reviews: reviews.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update turf
// @route   PUT /api/turfs/:id
// @access  Private (owner only)
const updateTurf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT owner_id FROM turfs WHERE id = $1', [id]
    );
    if (!existing.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (existing.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const {
      name, description, address, city, lat, lng,
      sport_types, surface_type, amenities, price_per_hour, is_active,
    } = req.body;

    const result = await query(
      `UPDATE turfs SET
        name          = COALESCE($1,  name),
        description   = COALESCE($2,  description),
        address       = COALESCE($3,  address),
        city          = COALESCE($4,  city),
        lat           = COALESCE($5,  lat),
        lng           = COALESCE($6,  lng),
        sport_types   = COALESCE($7,  sport_types),
        surface_type  = COALESCE($8,  surface_type),
        amenities     = COALESCE($9,  amenities),
        price_per_hour = COALESCE($10, price_per_hour),
        is_active     = COALESCE($11, is_active),
        updated_at    = NOW()
       WHERE id = $12
       RETURNING *`,
      [name, description, address, city, lat, lng,
       sport_types, surface_type, amenities, price_per_hour, is_active, id]
    );

    res.json({
      success: true,
      message: 'Turf updated.',
      data: parseTurfArrays(result.rows[0]),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete turf
// @route   DELETE /api/turfs/:id
// @access  Private (owner only)
const deleteTurf = async (req, res, next) => {
  try {
    const { id } = req.params;

    const existing = await query(
      'SELECT owner_id FROM turfs WHERE id = $1', [id]
    );
    if (!existing.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (existing.rows[0].owner_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await query('UPDATE turfs SET is_active = false WHERE id = $1', [id]);

    res.json({ success: true, message: 'Turf deactivated successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─── SLOT MANAGEMENT ─────────────────────────────────────

// @desc    Get available slots for a turf
// @route   GET /api/turfs/:id/slots
// @access  Public
const getSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { date, month } = req.query;

    let conditions = ['turf_id = $1'];
    let params = [id];
    let idx = 2;

    if (date) {
      conditions.push(`date = $${idx++}`);
      params.push(date);
    } else if (month) {
      conditions.push(
        `DATE_TRUNC('month', date) = DATE_TRUNC('month', $${idx++}::date)`
      );
      params.push(month);
    } else {
      conditions.push(
        `date >= CURRENT_DATE AND date <= CURRENT_DATE + INTERVAL '7 days'`
      );
    }

    const result = await query(
      `SELECT * FROM time_slots
       WHERE ${conditions.join(' AND ')}
       ORDER BY date, start_time`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// @desc    Add slots manually
// @route   POST /api/turfs/:id/slots
// @access  Private (owner only)
const addSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { slots } = req.body;

    const turf = await query(
      'SELECT owner_id FROM turfs WHERE id = $1', [id]
    );
    if (!turf.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.rows[0].owner_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    if (!Array.isArray(slots) || !slots.length)
      return res.status(400).json({ success: false, message: 'Slots array required.' });

    const values = slots.map((_, i) => {
      const base = i * 4;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
    });

    const params = slots.flatMap(s => [id, s.date, s.start_time, s.end_time]);

    const result = await query(
      `INSERT INTO time_slots (turf_id, date, start_time, end_time)
       VALUES ${values.join(', ')}
       ON CONFLICT (turf_id, date, start_time) DO NOTHING
       RETURNING *`,
      params
    );

    res.status(201).json({
      success: true,
      message: `${result.rows.length} slot(s) added.`,
      data: result.rows,
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Auto-generate slots for a date range
// @route   POST /api/turfs/:id/slots/generate
// @access  Private (owner only)
const generateSlots = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      start_date,
      end_date,
      open_time = '06:00',
      close_time = '22:00',
      slot_duration = 60,
      days_of_week = [0, 1, 2, 3, 4, 5, 6],
    } = req.body;

    const turf = await query(
      'SELECT owner_id FROM turfs WHERE id = $1', [id]
    );
    if (!turf.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.rows[0].owner_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const slots = [];
    const current = new Date(start_date);
    const end = new Date(end_date);

    while (current <= end) {
      if (days_of_week.includes(current.getDay())) {
        const dateStr = current.toISOString().split('T')[0];
        const [openH, openM] = open_time.split(':').map(Number);
        const [closeH, closeM] = close_time.split(':').map(Number);
        let startMins = openH * 60 + openM;
        const endMins = closeH * 60 + closeM;

        while (startMins + slot_duration <= endMins) {
          const startH   = String(Math.floor(startMins / 60)).padStart(2, '0');
          const startMin = String(startMins % 60).padStart(2, '0');
          const endH     = String(Math.floor((startMins + slot_duration) / 60)).padStart(2, '0');
          const endMin   = String((startMins + slot_duration) % 60).padStart(2, '0');
          slots.push({
            date: dateStr,
            start_time: `${startH}:${startMin}`,
            end_time:   `${endH}:${endMin}`,
          });
          startMins += slot_duration;
        }
      }
      current.setDate(current.getDate() + 1);
    }

    if (!slots.length)
      return res.status(400).json({ success: false, message: 'No slots generated.' });

    const chunkSize = 100;
    let inserted = 0;

    for (let i = 0; i < slots.length; i += chunkSize) {
      const chunk = slots.slice(i, i + chunkSize);
      const values = chunk.map((_, j) => {
        const base = j * 4;
        return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`;
      });
      const params = chunk.flatMap(s => [id, s.date, s.start_time, s.end_time]);
      const r = await query(
        `INSERT INTO time_slots (turf_id, date, start_time, end_time)
         VALUES ${values.join(', ')}
         ON CONFLICT (turf_id, date, start_time) DO NOTHING
         RETURNING id`,
        params
      );
      inserted += r.rows.length;
    }

    res.status(201).json({
      success: true,
      message: `${inserted} slots generated successfully.`,
      data: { total_generated: inserted, total_attempted: slots.length },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Block / unblock a slot
// @route   PUT /api/turfs/:id/slots/:slotId
// @access  Private (owner only)
const updateSlot = async (req, res, next) => {
  try {
    const { id, slotId } = req.params;
    const { status } = req.body;

    const turf = await query(
      'SELECT owner_id FROM turfs WHERE id = $1', [id]
    );
    if (!turf.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });
    if (turf.rows[0].owner_id !== req.user.id)
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    const result = await query(
      `UPDATE time_slots SET status = $1
       WHERE id = $2 AND turf_id = $3
       RETURNING *`,
      [status, slotId, id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Slot not found.' });

    res.json({ success: true, message: 'Slot updated.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// @desc    Get owner's own turfs
// @route   GET /api/turfs/my
// @access  Private (owner)
const getMyTurfs = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT t.*,
        (SELECT COUNT(*) FROM bookings b
         JOIN time_slots ts ON b.slot_id = ts.id
         WHERE ts.turf_id = t.id AND b.status = 'confirmed') as total_bookings,
        (SELECT COALESCE(SUM(b.total_amount), 0) FROM bookings b
         JOIN time_slots ts ON b.slot_id = ts.id
         WHERE ts.turf_id = t.id AND b.status = 'confirmed') as total_revenue
       FROM turfs t
       WHERE t.owner_id = $1
       ORDER BY t.created_at DESC`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows.map(parseTurfArrays),
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Add review to turf
// @route   POST /api/turfs/:id/review
// @access  Private (player who booked)
const addReview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;

    const booked = await query(
      `SELECT b.id FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       WHERE ts.turf_id = $1 AND b.organizer_id = $2
       AND b.status IN ('confirmed', 'completed') LIMIT 1`,
      [id, req.user.id]
    );

    if (!booked.rows.length)
      return res.status(403).json({
        success: false,
        message: 'You can only review turfs you have booked.',
      });

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const review = await client.query(
        `INSERT INTO reviews (reviewer_id, target_id, target_type, rating, comment)
         VALUES ($1, $2, 'turf', $3, $4)
         RETURNING *`,
        [req.user.id, id, rating, comment]
      );

      await client.query(
        `UPDATE turfs SET
          avg_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews WHERE target_id = $1 AND target_type = 'turf'
          ),
          total_reviews = (
            SELECT COUNT(*) FROM reviews
            WHERE target_id = $1 AND target_type = 'turf'
          )
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      res.status(201).json({
        success: true,
        message: 'Review submitted.',
        data: review.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Update review
// @route   PUT /api/turfs/:id/review/:reviewId
// @access  Private (review owner)
const updateReview = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;
    const { rating, comment } = req.body;

    // Check if review exists and belongs to user
    const reviewCheck = await query(
      `SELECT id FROM reviews
       WHERE id = $1 AND reviewer_id = $2 AND target_id = $3 AND target_type = 'turf'`,
      [reviewId, req.user.id, id]
    );

    if (!reviewCheck.rows.length)
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to edit it.',
      });

    const client = await getClient();
    try {
      await client.query('BEGIN');

      const review = await client.query(
        `UPDATE reviews SET rating = $1, comment = $2
         WHERE id = $3
         RETURNING *`,
        [rating, comment, reviewId]
      );

      // Recalculate turf ratings
      await client.query(
        `UPDATE turfs SET
          avg_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews WHERE target_id = $1 AND target_type = 'turf'
          )
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Review updated.',
        data: review.rows[0],
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

// @desc    Delete review
// @route   DELETE /api/turfs/:id/review/:reviewId
// @access  Private (review owner)
const deleteReview = async (req, res, next) => {
  try {
    const { id, reviewId } = req.params;

    // Check if review exists and belongs to user
    const reviewCheck = await query(
      `SELECT id FROM reviews
       WHERE id = $1 AND reviewer_id = $2 AND target_id = $3 AND target_type = 'turf'`,
      [reviewId, req.user.id, id]
    );

    if (!reviewCheck.rows.length)
      return res.status(404).json({
        success: false,
        message: 'Review not found or you do not have permission to delete it.',
      });

    const client = await getClient();
    try {
      await client.query('BEGIN');

      // Delete the review
      await client.query(
        `DELETE FROM reviews WHERE id = $1`,
        [reviewId]
      );

      // Recalculate turf ratings
      await client.query(
        `UPDATE turfs SET
          avg_rating = (
            SELECT ROUND(AVG(rating)::numeric, 2)
            FROM reviews WHERE target_id = $1 AND target_type = 'turf'
          ),
          total_reviews = (
            SELECT COUNT(*) FROM reviews
            WHERE target_id = $1 AND target_type = 'turf'
          )
         WHERE id = $1`,
        [id]
      );

      await client.query('COMMIT');

      res.status(200).json({
        success: true,
        message: 'Review deleted.',
      });
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createTurf,
  getTurfs,
  getTurf,
  updateTurf,
  deleteTurf,
  getSlots,
  addSlots,
  generateSlots,
  updateSlot,
  getMyTurfs,
  addReview,
  updateReview,
  deleteReview,
};