const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const {
  register,
  login,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  updateProfile,
  changePassword,
} = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

// Validation rules
const registerValidation = [
  body('name').trim().notEmpty().withMessage('Name is required').isLength({ max: 100 }),
  body('email').isEmail().withMessage('Valid email required').normalizeEmail(),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[A-Za-z])(?=.*\d)/)
    .withMessage('Password must contain letters and numbers'),
  body('phone')
    .optional()
    .isMobilePhone('en-IN')
    .withMessage('Valid Indian phone number required'),
  body('role')
    .optional()
    .isIn(['player', 'owner'])
    .withMessage('Role must be player or owner'),
];

router.post('/register', registerValidation, register);
router.post('/login', login);
router.post('/logout', protect, logout);
router.get('/me', protect, getMe);
router.put('/profile', protect, updateProfile);
router.put('/change-password', protect, changePassword);
router.get('/verify-email/:token', verifyEmail);
router.post('/resend-verification', resendVerification);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

module.exports = router;