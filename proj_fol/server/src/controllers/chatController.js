const { query } = require('../config/db');

// @desc    Get chat history for a match
// @route   GET /api/chat/:matchId
// @access  Private (match players only)
const getChatHistory = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;

    // Verify user is part of this match
    const isMember = await query(
      `SELECT 1 FROM match_players
       WHERE match_id = $1 AND player_id = $2 AND status = 'confirmed'
       UNION
       SELECT 1 FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1 AND b.organizer_id = $2`,
      [matchId, req.user.id]
    );

    if (!isMember.rows.length)
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this match.',
      });

    const countResult = await query(
      `SELECT COUNT(*) FROM messages
       WHERE match_id = $1 AND is_deleted = false`,
      [matchId]
    );

    const result = await query(
      `SELECT m.*, u.name as sender_name, u.avatar_url as sender_avatar
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.match_id = $1 AND m.is_deleted = false
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [matchId, limit, offset]
    );

    res.json({
      success: true,
      data: result.rows.reverse(), // Return oldest first
      pagination: {
        total: parseInt(countResult.rows[0].count),
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(countResult.rows[0].count / limit),
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Send message (also saves to DB)
// @route   POST /api/chat/:matchId
// @access  Private (match players only)
const sendMessage = async (req, res, next) => {
  try {
    const { matchId } = req.params;
    const { content } = req.body;

    if (!content?.trim())
      return res.status(400).json({ success: false, message: 'Message cannot be empty.' });

    if (content.length > 500)
      return res.status(400).json({ success: false, message: 'Message too long (max 500 chars).' });

    // Verify user is part of match
    const isMember = await query(
      `SELECT 1 FROM match_players
       WHERE match_id = $1 AND player_id = $2 AND status = 'confirmed'
       UNION
       SELECT 1 FROM matches m
       JOIN bookings b ON m.booking_id = b.id
       WHERE m.id = $1 AND b.organizer_id = $2`,
      [matchId, req.user.id]
    );

    if (!isMember.rows.length)
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this match.',
      });

    // Check match is not cancelled
    const matchResult = await query(
      `SELECT status FROM matches WHERE id = $1`,
      [matchId]
    );

    if (!matchResult.rows.length)
      return res.status(404).json({ success: false, message: 'Match not found.' });

    if (matchResult.rows[0].status === 'cancelled')
      return res.status(400).json({ success: false, message: 'Cannot chat in a cancelled match.' });

    // Save message
    const result = await query(
      `INSERT INTO messages (match_id, sender_id, content)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [matchId, req.user.id, content.trim()]
    );

    const message = {
      ...result.rows[0],
      sender_name: req.user.name,
    };

    // Broadcast via socket to match room
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`match:${matchId}`).emit('receive_message', message);
    } catch (_) {}

    res.status(201).json({ success: true, data: message });
  } catch (err) {
    next(err);
  }
};

// @desc    Delete a message (soft delete)
// @route   DELETE /api/chat/:matchId/:messageId
// @access  Private (sender only)
const deleteMessage = async (req, res, next) => {
  try {
    const { matchId, messageId } = req.params;

    const result = await query(
      `UPDATE messages SET is_deleted = true
       WHERE id = $1 AND match_id = $2 AND sender_id = $3
       RETURNING id`,
      [messageId, matchId, req.user.id]
    );

    if (!result.rows.length)
      return res.status(404).json({
        success: false,
        message: 'Message not found or not authorized.',
      });

    // Notify match room of deletion
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to(`match:${matchId}`).emit('message_deleted', { message_id: messageId });
    } catch (_) {}

    res.json({ success: true, message: 'Message deleted.' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getChatHistory, sendMessage, deleteMessage };