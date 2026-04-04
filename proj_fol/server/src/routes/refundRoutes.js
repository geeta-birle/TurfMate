const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const { requestRefund, getRefund, getMyRefunds } = require('../controllers/refundController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.post('/',
  [
    body('booking_id').notEmpty().withMessage('Booking ID required'),
    body('reason').trim().notEmpty().withMessage('Reason required'),
  ],
  requestRefund
);
router.get('/my', getMyRefunds);
router.get('/:id', getRefund);

module.exports = router;