const express = require('express');
const router = express.Router();
const {
  getDashboard, getUsers, updateUserStatus,
  getTurfs, updateTurfStatus, getBookings,
  getRefunds, getAnalytics,
} = require('../controllers/adminController');
const { protect, authorize } = require('../middleware/authMiddleware');

router.use(protect, authorize('admin'));

router.get('/dashboard', getDashboard);
router.get('/analytics', getAnalytics);
router.get('/users', getUsers);
router.put('/users/:id/status', updateUserStatus);
router.get('/turfs', getTurfs);
router.put('/turfs/:id/status', updateTurfStatus);
router.get('/bookings', getBookings);
router.get('/refunds', getRefunds);

module.exports = router;