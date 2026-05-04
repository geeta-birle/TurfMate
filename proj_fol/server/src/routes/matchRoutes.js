const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../middleware/authMiddleware');

const {
  createMatch,
  getMatches,
  getMatch,          // used as getMatchById — same function
  joinMatch,
  handleJoinRequest,
  leaveMatch,
  getMyMatches,
  cancelMatch,
  updateMatchStatus,
  deleteMatch,
} = require('../controllers/matchController');

// ───────────────────────────────────────────────
// PUBLIC ROUTES
// ───────────────────────────────────────────────

// Discover open matches
router.get('/', getMatches);

// Must be BEFORE /:id so Express doesn't swallow "my" as an :id param
router.get('/my', protect, getMyMatches);

// Single match detail
router.get('/:id', getMatch);

// ───────────────────────────────────────────────
// PROTECTED ROUTES
// ───────────────────────────────────────────────

// Create match (after confirmed booking)
router.post('/', protect, createMatch);

// Join match with wallet payment
router.post('/:id/join', protect, joinMatch);

// Leave match with wallet refund/reversal
// NOTE: DELETE with a body is unreliable in some HTTP clients;
//       using POST /leave is more compatible and matches the controller.
router.post('/:id/leave', protect, leaveMatch);

// Cancel match (organizer or admin)
router.put('/:id/cancel', protect, cancelMatch);

// Approve / reject a pending join request (organizer only)
// PUT /api/matches/:id/players/:playerId  { action: 'approve'|'reject' }
router.put('/:id/players/:playerId', protect, handleJoinRequest);

// Update match status (admin / organizer)
router.patch('/:id/status', protect, updateMatchStatus);

// Delete match (admin only)
router.delete('/:id', protect, authorize('admin'), deleteMatch);

module.exports = router;