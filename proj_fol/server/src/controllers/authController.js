const bcrypt = require('bcryptjs');
const { query } = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');
const { validationResult } = require('express-validator');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const crypto = require('crypto');

// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, phone, role = 'player', city } = req.body;

    // Check existing user
    const existing = await query(
      'SELECT id FROM users WHERE email = $1 OR phone = $2',
      [email, phone]
    );
    if (existing.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'Email or phone already registered.',
      });
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    // Generate email verification token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24hrs

    // Insert user — is_verified = false until email confirmed
    const result = await query(
      `INSERT INTO users
        (name, email, password_hash, phone, role, city,
         email_verify_token, email_verify_expires, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8, false)
       RETURNING id, name, email, phone, role, city`,
      [name, email, password_hash, phone, role, city,
       emailVerifyToken, emailVerifyExpires]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // Send verification email
    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
    const { subject, html } = emailTemplates.verifyEmail(user.name, verifyUrl);
    sendEmail({ to: user.email, subject, html });

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          city: user.city,
          is_verified: false,
        },
        accessToken,
        refreshToken,
        email_verification_required: true,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    const result = await query(
      `SELECT id, name, email, email_verify_expires
       FROM users
       WHERE email_verify_token = $1
       AND is_verified = false`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or already used verification link.',
      });
    }

    const user = result.rows[0];

    // Check expiry
    if (new Date() > new Date(user.email_verify_expires)) {
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. Please request a new one.',
        code: 'TOKEN_EXPIRED',
      });
    }

    // Mark as verified
    await query(
      `UPDATE users SET
        is_verified = true,
        email_verify_token = NULL,
        email_verify_expires = NULL,
        updated_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully! You can now login.',
      data: { email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await query(
      'SELECT id, name, email, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'No account found with this email.',
      });
    }

    const user = result.rows[0];

    if (user.is_verified) {
      return res.status(400).json({
        success: false,
        message: 'Email is already verified.',
      });
    }

    // Generate new token
    const emailVerifyToken = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `UPDATE users SET
        email_verify_token = $1,
        email_verify_expires = $2
       WHERE id = $3`,
      [emailVerifyToken, emailVerifyExpires, user.id]
    );

    const verifyUrl = `${process.env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
    const { subject, html } = emailTemplates.verifyEmail(user.name, verifyUrl);
    sendEmail({ to: user.email, subject, html });

    res.json({
      success: true,
      message: 'Verification email sent! Please check your inbox.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    // Always return success to prevent email enumeration
    if (!result.rows.length) {
      return res.json({
        success: true,
        message: 'If an account exists, a reset link has been sent.',
      });
    }

    const user = result.rows[0];
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users SET
        reset_password_token = $1,
        reset_password_expires = $2
       WHERE id = $3`,
      [resetToken, resetExpires, user.id]
    );

    const resetUrl = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const { subject, html } = emailTemplates.resetPassword(user.name, resetUrl);
    sendEmail({ to: user.email, subject, html });

    res.json({
      success: true,
      message: 'If an account exists, a reset link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    const result = await query(
      `SELECT id FROM users
       WHERE reset_password_token = $1
       AND reset_password_expires > NOW()`,
      [token]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await query(
      `UPDATE users SET
        password_hash = $1,
        reset_password_token = NULL,
        reset_password_expires = NULL,
        refresh_token = NULL,
        updated_at = NOW()
       WHERE id = $2`,
      [password_hash, result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Password reset successful! Please login with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const result = await query(
      'SELECT id, name, email, password_hash, role, city, phone, is_verified FROM users WHERE email = $1',
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    // Check if email is verified
    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    res.json({
      success: true,
      message: 'Login successful!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          city: user.city,
          is_verified: user.is_verified,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const result = await query(
      'SELECT id, name, email, phone, role, city, is_verified, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    const userId = req.user.id;

    await query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [userId]
    );

    res.json({
      success: true,
      message: 'Logout successful!',
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Update user profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { name, phone, city } = req.body;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (name) {
      updates.push(`name = $${paramCount}`);
      values.push(name);
      paramCount++;
    }
    if (phone) {
      updates.push(`phone = $${paramCount}`);
      values.push(phone);
      paramCount++;
    }
    if (city) {
      updates.push(`city = $${paramCount}`);
      values.push(city);
      paramCount++;
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    updates.push(`updated_at = NOW()`);
    values.push(userId);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount} RETURNING id, name, email, phone, role, city, is_verified`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.json({
      success: true,
      message: 'Profile updated successfully!',
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required.',
      });
    }

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [userId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    // Hash new password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = $1, refresh_token = NULL, updated_at = NOW() WHERE id = $2',
      [password_hash, userId]
    );

    res.json({
      success: true,
      message: 'Password changed successfully!',
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
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
};