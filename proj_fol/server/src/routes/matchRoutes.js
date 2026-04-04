const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  createMatch, getMatches, getMatch, joinMatch,
  handleJoinRequest, leaveMatch, getMyMatches, cancelMatch,
} = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const matchValidation = [
  body('booking_id').notEmpty().withMessage('Booking ID required'),
  body('title').trim().notEmpty().withMessage('Match title required'),
  body('sport_type').notEmpty().withMessage('Sport type required'),
  body('team_size').isInt({ min: 2, max: 22 }).withMessage('Team size must be 2–22'),
  body('visibility').isIn(['open', 'private']).withMessage('Visibility must be open or private'),
];

// Public
router.get('/', getMatches);
router.get('/my', protect, getMyMatches);
router.get('/:id', getMatch);

// Protected
router.post('/', protect, matchValidation, createMatch);
router.post('/:id/join', protect, joinMatch);
router.put('/:id/players/:playerId', protect, handleJoinRequest);
router.delete('/:id/leave', protect, leaveMatch);
router.put('/:id/cancel', protect, cancelMatch);

module.exports = router;