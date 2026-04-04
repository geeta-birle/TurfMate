const express = require('express');
const router = express.Router();
const {
  createOrder, verifyPayment, webhook, getMyPayments,
} = require('../controllers/paymentController');
const { protect } = require('../middleware/authMiddleware');

// Webhook must be before express.json() middleware — raw body needed
router.post('/webhook', express.raw({ type: 'application/json' }), webhook);

router.use(protect);
router.post('/create-order', createOrder);
router.post('/verify', verifyPayment);
router.get('/my', getMyPayments);

module.exports = router;