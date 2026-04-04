const { query } = require('../config/db');
const { getPagination, paginationMeta } = require('../utils/helpers');
const { createNotification } = require('./notificationController');

// @desc    Platform dashboard stats
// @route   GET /api/admin/dashboard
// @access  Admin
const getDashboard = async (req, res, next) => {
  try {
    const [
      usersResult, turfsResult, bookingsResult,
      revenueResult, matchesResult, activeResult,
    ] = await Promise.all([
      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE role = 'player') as players,
        COUNT(*) FILTER (WHERE role = 'owner') as owners,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') as new_this_month
        FROM users WHERE is_active = true`),

      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_approved = true) as approved,
        COUNT(*) FILTER (WHERE is_approved = false) as pending_approval,
        COUNT(*) FILTER (WHERE is_active = false) as inactive
        FROM turfs`),

      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '7 days') as this_week
        FROM bookings`),

      query(`SELECT
        COALESCE(SUM(platform_fee), 0) as total_platform_revenue,
        COALESCE(SUM(platform_fee) FILTER (
          WHERE created_at >= NOW() - INTERVAL '30 days'), 0) as this_month,
        COALESCE(SUM(platform_fee) FILTER (
          WHERE created_at >= NOW() - INTERVAL '7 days'), 0) as this_week
        FROM bookings WHERE status = 'confirmed'`),

      query(`SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'open') as open,
        COUNT(*) FILTER (WHERE status = 'full') as full,
        COUNT(*) FILTER (WHERE status = 'completed') as completed
        FROM matches`),

      query(`SELECT COUNT(DISTINCT organizer_id) as active_organizers
        FROM bookings
        WHERE created_at >= NOW() - INTERVAL '30 days'`),
    ]);

    // Revenue chart — last 7 days
    const revenueChart = await query(
      `SELECT
        DATE(created_at) as date,
        COALESCE(SUM(platform_fee), 0) as revenue,
        COUNT(*) as bookings
       FROM bookings
       WHERE status = 'confirmed'
       AND created_at >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(created_at)
       ORDER BY date ASC`
    );

    res.json({
      success: true,
      data: {
        users: usersResult.rows[0],
        turfs: turfsResult.rows[0],
        bookings: bookingsResult.rows[0],
        revenue: revenueResult.rows[0],
        matches: matchesResult.rows[0],
        active_organizers: activeResult.rows[0].active_organizers,
        revenue_chart: revenueChart.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all users
// @route   GET /api/admin/users
// @access  Admin
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 20, is_active } = req.query;
    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (role) { conditions.push(`role = $${idx++}`); params.push(role); }
    if (search) {
      conditions.push(`(name ILIKE $${idx} OR email ILIKE $${idx++})`);
      params.push(`%${search}%`);
    }
    if (is_active !== undefined) {
      conditions.push(`is_active = $${idx++}`);
      params.push(is_active === 'true');
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM users ${whereClause}`, params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT id, name, email, phone, role, city, skill_level,
        is_verified, is_active, created_at,
        (SELECT COUNT(*) FROM bookings WHERE organizer_id = users.id) as total_bookings
       FROM users ${whereClause}
       ORDER BY created_at DESC
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

// @desc    Ban or activate user
// @route   PUT /api/admin/users/:id/status
// @access  Admin
const updateUserStatus = async (req, res, next) => {
  try {
    const { is_active, reason } = req.body;

    if (req.params.id === req.user.id)
      return res.status(400).json({ success: false, message: 'Cannot modify your own account.' });

    const result = await query(
      `UPDATE users SET is_active = $1 WHERE id = $2
       RETURNING id, name, email, is_active`,
      [is_active, req.params.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'User not found.' });

    await createNotification(req.params.id, {
      type: is_active ? 'account_activated' : 'account_banned',
      title: is_active ? 'Account Activated' : 'Account Suspended',
      message: is_active
        ? 'Your account has been reactivated.'
        : `Your account has been suspended. Reason: ${reason || 'Policy violation'}`,
      data: {},
    });

    res.json({
      success: true,
      message: `User ${is_active ? 'activated' : 'banned'} successfully.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all turfs (pending approval)
// @route   GET /api/admin/turfs
// @access  Admin
const getTurfs = async (req, res, next) => {
  try {
    const { is_approved, page = 1, limit = 20 } = req.query;
    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (is_approved !== undefined) {
      conditions.push(`t.is_approved = $${idx++}`);
      params.push(is_approved === 'true');
    }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM turfs t ${whereClause}`, params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT t.*, u.name as owner_name, u.email as owner_email, u.phone as owner_phone
       FROM turfs t
       JOIN users u ON t.owner_id = u.id
       ${whereClause}
       ORDER BY t.created_at DESC
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

// @desc    Approve or reject turf
// @route   PUT /api/admin/turfs/:id/status
// @access  Admin
const updateTurfStatus = async (req, res, next) => {
  try {
    const { is_approved, is_active, reason } = req.body;

    const result = await query(
      `UPDATE turfs SET
        is_approved = COALESCE($1, is_approved),
        is_active = COALESCE($2, is_active),
        updated_at = NOW()
       WHERE id = $3
       RETURNING *, owner_id`,
      [is_approved, is_active, req.params.id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Turf not found.' });

    const turf = result.rows[0];

    await createNotification(turf.owner_id, {
      type: is_approved ? 'turf_approved' : 'turf_rejected',
      title: is_approved ? 'Turf Approved! 🎉' : 'Turf Listing Rejected',
      message: is_approved
        ? `Your turf "${turf.name}" has been approved and is now live!`
        : `Your turf "${turf.name}" was not approved. Reason: ${reason || 'Does not meet guidelines'}`,
      data: { turf_id: turf.id },
    });

    res.json({
      success: true,
      message: `Turf ${is_approved ? 'approved' : 'rejected'}.`,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get all bookings
// @route   GET /api/admin/bookings
// @access  Admin
const getBookings = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) { conditions.push(`b.status = $${idx++}`); params.push(status); }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    const countResult = await query(
      `SELECT COUNT(*) FROM bookings b ${whereClause}`, params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT b.*,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.city,
        u.name as organizer_name, u.email as organizer_email,
        p.status as payment_status, p.razorpay_payment_id
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       LEFT JOIN payments p ON p.booking_id = b.id AND p.type = 'booking'
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

// @desc    Get all refunds
// @route   GET /api/admin/refunds
// @access  Admin
const getRefunds = async (req, res, next) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = [];
    let params = [];
    let idx = 1;

    if (status) { conditions.push(`r.status = $${idx++}`); params.push(status); }

    const whereClause = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

    params.push(lim, offset);
    const result = await query(
      `SELECT r.*, u.name as user_name, u.email as user_email,
        t.name as turf_name, ts.date
       FROM refunds r
       JOIN users u ON r.user_id = u.id
       JOIN bookings b ON r.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      params
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// @desc    Revenue analytics
// @route   GET /api/admin/analytics
// @access  Admin
const getAnalytics = async (req, res, next) => {
  try {
    const { period = '30' } = req.query; // days

    const [dailyRevenue, topTurfs, topCities, sportBreakdown] = await Promise.all([
      // Daily revenue
      query(
        `SELECT DATE(b.created_at) as date,
          COUNT(*) as bookings,
          COALESCE(SUM(b.total_amount), 0) as gross,
          COALESCE(SUM(b.platform_fee), 0) as platform_fee
         FROM bookings b
         WHERE b.status = 'confirmed'
         AND b.created_at >= NOW() - INTERVAL '${parseInt(period)} days'
         GROUP BY DATE(b.created_at)
         ORDER BY date ASC`
      ),

      // Top performing turfs
      query(
        `SELECT t.name, t.city,
          COUNT(b.id) as total_bookings,
          COALESCE(SUM(b.total_amount), 0) as revenue
         FROM turfs t
         LEFT JOIN time_slots ts ON ts.turf_id = t.id
         LEFT JOIN bookings b ON b.slot_id = ts.id AND b.status = 'confirmed'
         GROUP BY t.id, t.name, t.city
         ORDER BY revenue DESC LIMIT 10`
      ),

      // Bookings by city
      query(
        `SELECT t.city, COUNT(b.id) as bookings,
          COALESCE(SUM(b.total_amount), 0) as revenue
         FROM bookings b
         JOIN time_slots ts ON b.slot_id = ts.id
         JOIN turfs t ON ts.turf_id = t.id
         WHERE b.status = 'confirmed'
         GROUP BY t.city ORDER BY bookings DESC`
      ),

      // Sport type breakdown
      query(
        `SELECT m.sport_type, COUNT(*) as matches,
          COUNT(mp.id) as total_players
         FROM matches m
         LEFT JOIN match_players mp ON mp.match_id = m.id
         AND mp.status = 'confirmed'
         GROUP BY m.sport_type ORDER BY matches DESC`
      ),
    ]);

    res.json({
      success: true,
      data: {
        daily_revenue: dailyRevenue.rows,
        top_turfs: topTurfs.rows,
        top_cities: topCities.rows,
        sport_breakdown: sportBreakdown.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard, getUsers, updateUserStatus,
  getTurfs, updateTurfStatus, getBookings,
  getRefunds, getAnalytics,
};