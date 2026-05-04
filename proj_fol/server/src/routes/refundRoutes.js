const express = require('express');
const router = express.Router();
const { body, param } = require('express-validator');
const {
  requestRefund,
  reviewRefund,
  getPendingRefunds,
  getMyRefunds,
  getRefund,
} = require('../controllers/refundController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect);

// Player requests a refund
router.post('/',
  [body('match_id').notEmpty().withMessage('Match ID required')],
  requestRefund
);

// Organizer reviews (approve/reject) a refund request
router.put('/:requestId/review',
  [
    param('requestId').notEmpty(),
    body('action').isIn(['approve', 'reject'])
      .withMessage('Action must be approve or reject'),
  ],
  reviewRefund
);

// Organizer sees pending requests awaiting their approval
router.get('/pending', getPendingRefunds);

// Player sees their own refund history
router.get('/my', getMyRefunds);

// Single refund detail
router.get('/:id', getRefund);

module.exports = router;