const { query, getClient } = require('../config/db');
const { generateInviteCode, getPagination, paginationMeta } = require('../utils/helpers');
const { validationResult } = require('express-validator');
const { getIO } = require('../config/socket');

// @desc    Create match (after confirmed booking)
// @route   POST /api/matches
// @access  Private
const createMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const {
      booking_id, title, sport_type, team_size,
      skill_level, visibility, description, cost_per_player,
    } = req.body;

    await client.query('BEGIN');

    // Verify booking belongs to user & is confirmed
    const bookingResult = await client.query(
      `SELECT b.*, ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.city
       FROM bookings b
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE b.id = $1 AND b.organizer_id = $2 AND b.status = 'confirmed'`,
      [booking_id, req.user.id]
    );

    if (!bookingResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Booking not found or not confirmed yet.',
      });
    }

    // Check match doesn't already exist for this booking
    const existingMatch = await client.query(
      'SELECT id FROM matches WHERE booking_id = $1',
      [booking_id]
    );
    if (existingMatch.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: 'A match already exists for this booking.',
      });
    }

    // Generate unique invite code
    let invite_code;
    let isUnique = false;
    while (!isUnique) {
      invite_code = generateInviteCode();
      const check = await client.query(
        'SELECT id FROM matches WHERE invite_code = $1',
        [invite_code]
      );
      if (!check.rows.length) isUnique = true;
    }

    // Create match — organizer auto-joins as first player
    const match = await client.query(
      `INSERT INTO matches
        (booking_id, title, sport_type, team_size, current_players,
         cost_per_player, skill_level, visibility, description, invite_code)
       VALUES ($1,$2,$3,$4,1,$5,$6,$7,$8,$9)
       RETURNING *`,
      [
        booking_id, title, sport_type, team_size,
        cost_per_player || 0, skill_level, visibility,
        description, invite_code,
      ]
    );

    // Add organizer as confirmed player
// Add organizer as confirmed player
await client.query(
  `INSERT INTO match_players (match_id, player_id, status, payment_status)
   VALUES ($1, $2, 'confirmed', 'success')`,
  [match.rows[0].id, req.user.id]
);

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      message: 'Match created successfully! 🏆',
      data: {
        ...match.rows[0],
        booking: bookingResult.rows[0],
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Discover open matches
// @route   GET /api/matches
// @access  Public
const getMatches = async (req, res, next) => {
  try {
    const {
      city, sport_type, skill_level, date,
      page = 1, limit = 10,
    } = req.query;

    const { limit: lim, offset } = getPagination(page, limit);

    let conditions = [
      "m.visibility = 'open'",
      "m.status IN ('open', 'full')",
      'ts.date >= CURRENT_DATE',
    ];
    let params = [];
    let idx = 1;

    if (city) {
      conditions.push(`LOWER(t.city) = LOWER($${idx++})`);
      params.push(city);
    }
    if (sport_type) {
      conditions.push(`m.sport_type = $${idx++}`);
      params.push(sport_type);
    }
    if (skill_level) {
      conditions.push(`m.skill_level = $${idx++}`);
      params.push(skill_level);
    }
    if (date) {
      conditions.push(`ts.date = $${idx++}`);
      params.push(date);
    }

    const whereClause = 'WHERE ' + conditions.join(' AND ');

    const countResult = await query(
      `SELECT COUNT(*) FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       ${whereClause}`,
      params
    );

    params.push(lim, offset);
    const result = await query(
      `SELECT m.*,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.address, t.city, t.images,
        u.name as organizer_name, u.avatar_url as organizer_avatar,
        (m.team_size - m.current_players) as spots_left
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       ${whereClause}
       ORDER BY ts.date ASC, ts.start_time ASC
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

// @desc    Get single match detail
// @route   GET /api/matches/:id
// @access  Public
const getMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT m.*,
        ts.date, ts.start_time, ts.end_time,
        t.id as turf_id, t.name as turf_name, t.address,
        t.city, t.images, t.lat, t.lng,
        u.id as organizer_id, u.name as organizer_name,
        u.avatar_url as organizer_avatar,
        (m.team_size - m.current_players) as spots_left
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       WHERE m.id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    // Get confirmed players
    const players = await query(
      `SELECT mp.*, u.name, u.avatar_url, u.skill_level, u.city
       FROM match_players mp
       JOIN users u ON mp.player_id = u.id
       WHERE mp.match_id = $1 AND mp.status = 'confirmed'
       ORDER BY mp.joined_at ASC`,
      [id]
    );

    // Get pending requests (for organizer)
    const pendingRequests = await query(
      `SELECT mp.*, u.name, u.avatar_url, u.skill_level
       FROM match_players mp
       JOIN users u ON mp.player_id = u.id
       WHERE mp.match_id = $1 AND mp.status = 'pending'`,
      [id]
    );

    res.json({
      success: true,
      data: {
        ...result.rows[0],
        players: players.rows,
        pending_requests: pendingRequests.rows,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Join match by ID or invite code
// @route   POST /api/matches/:id/join
// @access  Private (player)
const joinMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;
    const { invite_code } = req.body;

    await client.query('BEGIN');

    // Find match — support join by ID or invite code
    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id,
        ts.date, ts.start_time, t.name as turf_name
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE (m.id = $1 OR m.invite_code = $2)
       FOR UPDATE`,
      [id, invite_code || '']
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    const match = matchResult.rows[0];

    // Validate match state
    if (match.status === 'cancelled' || match.status === 'completed') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: `Match is ${match.status}.`,
      });
    }

    if (match.status === 'full') {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Match is full. No spots available.',
      });
    }

    // Check private match — must have invite code
    if (match.visibility === 'private' && match.invite_code !== invite_code) {
      await client.query('ROLLBACK');
      return res.status(403).json({
        success: false,
        message: 'Invalid invite code for this private match.',
      });
    }

    // Can't join own match
    if (match.organizer_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'You are the organizer of this match.',
      });
    }

    // Check already joined
    const alreadyJoined = await client.query(
      'SELECT id, status FROM match_players WHERE match_id = $1 AND player_id = $2',
      [match.id, req.user.id]
    );

    if (alreadyJoined.rows.length) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        success: false,
        message: `You already ${alreadyJoined.rows[0].status === 'pending'
          ? 'requested to join'
          : 'joined'} this match.`,
      });
    }

    // Add player — auto confirm if open, else pending
    const playerStatus = match.visibility === 'open' ? 'confirmed' : 'pending';

    await client.query(
      `INSERT INTO match_players (match_id, player_id, status)
       VALUES ($1, $2, $3)`,
      [match.id, req.user.id, playerStatus]
    );

    // Update player count if confirmed
    if (playerStatus === 'confirmed') {
      const newCount = match.current_players + 1;
      const newStatus = newCount >= match.team_size ? 'full' : 'open';

      await client.query(
        `UPDATE matches SET current_players = $1, status = $2 WHERE id = $3`,
        [newCount, newStatus, match.id]
      );
    }

    await client.query('COMMIT');

    // Notify organizer via socket
    try {
      const io = getIO();
      io.to(`user:${match.organizer_id}`).emit('new_notification', {
        type: playerStatus === 'confirmed' ? 'player_joined' : 'join_request',
        title: playerStatus === 'confirmed' ? 'Player Joined! 🙌' : 'New Join Request',
        message: `${req.user.name} ${playerStatus === 'confirmed'
          ? 'joined'
          : 'requested to join'} your match "${match.title}"`,
        data: { match_id: match.id },
      });

      // Broadcast to match room
      io.to(`match:${match.id}`).emit('player_joined', {
        player: { id: req.user.id, name: req.user.name },
        current_players: match.current_players + (playerStatus === 'confirmed' ? 1 : 0),
      });
    } catch (_) {}

    res.status(201).json({
      success: true,
      message: playerStatus === 'confirmed'
        ? 'You joined the match! 🎉'
        : 'Join request sent! Waiting for organizer approval.',
      data: { match_id: match.id, status: playerStatus },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Approve or reject join request
// @route   PUT /api/matches/:id/players/:playerId
// @access  Private (organizer only)
const handleJoinRequest = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id, playerId } = req.params;
    const { action } = req.body; // 'approve' | 'reject'

    if (!['approve', 'reject'].includes(action))
      return res.status(400).json({ success: false, message: 'Action must be approve or reject.' });

    await client.query('BEGIN');

    // Verify organizer
    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1 FOR UPDATE`,
      [id]
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    const match = matchResult.rows[0];

    if (match.organizer_id !== req.user.id) {
      await client.query('ROLLBACK');
      return res.status(403).json({ success: false, message: 'Only organizer can manage requests.' });
    }

    if (action === 'approve' && match.current_players >= match.team_size) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'Match is already full.' });
    }

    const newStatus = action === 'approve' ? 'confirmed' : 'rejected';

    await client.query(
      `UPDATE match_players SET status = $1 WHERE match_id = $2 AND player_id = $3`,
      [newStatus, id, playerId]
    );

    if (action === 'approve') {
      const newCount = match.current_players + 1;
      const newMatchStatus = newCount >= match.team_size ? 'full' : 'open';
      await client.query(
        `UPDATE matches SET current_players = $1, status = $2 WHERE id = $3`,
        [newCount, newMatchStatus, id]
      );
    }

    await client.query('COMMIT');

    // Notify player
    try {
      const io = getIO();
      io.to(`user:${playerId}`).emit('new_notification', {
        type: action === 'approve' ? 'request_approved' : 'request_rejected',
        title: action === 'approve' ? 'Request Approved! ✅' : 'Request Rejected',
        message: action === 'approve'
          ? `You've been approved to join "${match.title}"!`
          : `Your request to join "${match.title}" was declined.`,
        data: { match_id: id },
      });

      if (action === 'approve') {
        io.to(`match:${id}`).emit('player_joined', {
          player: { id: playerId },
          current_players: match.current_players + 1,
        });
      }
    } catch (_) {}

    res.json({
      success: true,
      message: `Player ${action === 'approve' ? 'approved' : 'rejected'} successfully.`,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Leave a match
// @route   DELETE /api/matches/:id/leave
// @access  Private (player)
const leaveMatch = async (req, res, next) => {
  const client = await getClient();
  try {
    const { id } = req.params;

    await client.query('BEGIN');

    const matchResult = await client.query(
      `SELECT m.*, b.organizer_id FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1 FOR UPDATE`,
      [id]
    );

    if (!matchResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(404).json({ success: false, message: 'Match not found.' });
    }

    const match = matchResult.rows[0];

    if (match.organizer_id === req.user.id) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        success: false,
        message: 'Organizer cannot leave. Cancel the match instead.',
      });
    }

    const playerResult = await client.query(
      `DELETE FROM match_players
       WHERE match_id = $1 AND player_id = $2 AND status = 'confirmed'
       RETURNING id`,
      [id, req.user.id]
    );

    if (!playerResult.rows.length) {
      await client.query('ROLLBACK');
      return res.status(400).json({ success: false, message: 'You are not in this match.' });
    }

    // Decrease player count
    const newCount = Math.max(0, match.current_players - 1);
    await client.query(
      `UPDATE matches SET current_players = $1,
        status = CASE WHEN status = 'full' THEN 'open' ELSE status END
       WHERE id = $2`,
      [newCount, id]
    );

    await client.query('COMMIT');

    // Notify match room
    try {
      const io = getIO();
      io.to(`match:${id}`).emit('player_left', {
        player_id: req.user.id,
        current_players: newCount,
      });
      io.to(`user:${match.organizer_id}`).emit('new_notification', {
        type: 'player_left',
        title: 'Player Left',
        message: `${req.user.name} left your match "${match.title}"`,
        data: { match_id: id },
      });
    } catch (_) {}

    res.json({ success: true, message: 'You left the match.' });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
};

// @desc    Get my matches (as organizer or player)
// @route   GET /api/matches/my
// @access  Private
const getMyMatches = async (req, res, next) => {
  try {
    const { role = 'all' } = req.query; // 'organizer' | 'player' | 'all'

    let matchIds = new Set();

    if (role === 'all' || role === 'organizer') {
      const result = await query(
        `SELECT m.id FROM matches m
         JOIN bookings b ON m.booking_id = b.id
         WHERE b.organizer_id = $1`,
        [req.user.id]
      );
      result.rows.forEach(r => matchIds.add(r.id));
    }

    if (role === 'all' || role === 'player') {
      const result = await query(
        `SELECT match_id as id FROM match_players
         WHERE player_id = $1 AND status = 'confirmed'`,
        [req.user.id]
      );
      result.rows.forEach(r => matchIds.add(r.id));
    }

    if (!matchIds.size)
      return res.json({ success: true, data: [] });

    const ids = Array.from(matchIds);
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');

    const result = await query(
      `SELECT m.*,
        ts.date, ts.start_time, ts.end_time,
        t.name as turf_name, t.city, t.images,
        u.name as organizer_name,
        (m.team_size - m.current_players) as spots_left,
        CASE WHEN b.organizer_id = $${ids.length + 1}
             THEN true ELSE false END as is_organizer
       FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       JOIN users u ON b.organizer_id = u.id
       WHERE m.id IN (${placeholders})
       ORDER BY ts.date DESC`,
      [...ids, req.user.id]
    );

    res.json({ success: true, data: result.rows });
  } catch (err) {
    next(err);
  }
};

// @desc    Cancel match (organizer only)
// @route   PUT /api/matches/:id/cancel
// @access  Private (organizer)
const cancelMatch = async (req, res, next) => {
  try {
    const { id } = req.params;

    const result = await query(
      `SELECT m.*, b.organizer_id FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1`,
      [id]
    );

    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    if (result.rows[0].organizer_id !== req.user.id && req.user.role !== 'admin')
      return res.status(403).json({ success: false, message: 'Not authorized.' });

    await query(
      `UPDATE matches SET status = 'cancelled', updated_at = NOW() WHERE id = $1`,
      [id]
    );

    // Notify all players
    const players = await query(
      `SELECT player_id FROM match_players WHERE match_id = $1 AND status = 'confirmed'`,
      [id]
    );

    try {
      const io = getIO();
      players.rows.forEach(p => {
        io.to(`user:${p.player_id}`).emit('new_notification', {
          type: 'match_cancelled',
          title: 'Match Cancelled ❌',
          message: `The match "${result.rows[0].title}" has been cancelled.`,
          data: { match_id: id },
        });
      });
      io.to(`match:${id}`).emit('match_updated', { status: 'cancelled' });
    } catch (_) {}

    res.json({ success: true, message: 'Match cancelled.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  createMatch, getMatches, getMatch, joinMatch,
  handleJoinRequest, leaveMatch, getMyMatches, cancelMatch,
};