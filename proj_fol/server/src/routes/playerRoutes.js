const express = require('express');
const router = express.Router();
const { query } = require('../config/db');

router.get('/:id/profile', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, role, skill_level, city, bio,
              avatar_url, is_verified, created_at
       FROM users WHERE id = $1 AND is_active = true`,
      [req.params.id]
    );
    if (!result.rows.length)
      return res.status(404).json({ success: false, message: 'Player not found.' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) { next(err); }
});

router.get('/:id/matches', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT m.*, ts.date, ts.start_time, ts.end_time,
              t.name as turf_name, t.city
       FROM match_players mp
       JOIN matches m ON mp.match_id = m.id
       JOIN bookings b ON m.booking_id = b.id
       JOIN time_slots ts ON b.slot_id = ts.id
       JOIN turfs t ON ts.turf_id = t.id
       WHERE mp.player_id = $1 AND mp.status = 'confirmed'
       ORDER BY ts.date DESC LIMIT 10`,
      [req.params.id]
    );
    res.json({ success: true, data: result.rows });
  } catch (err) { next(err); }
});

module.exports = router;