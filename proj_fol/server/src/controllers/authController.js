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
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

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

    // Insert user
    const result = await query(
      `INSERT INTO users (name, email, password_hash, phone, role, city)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, name, email, phone, role, city, created_at`,
      [name, email, password_hash, phone, role, city]
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Save refresh token to DB
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [
      refreshToken,
      user.id,
    ]);

    // Send welcome email (non-blocking)
    const { subject, html } = emailTemplates.welcome(user.name);
    sendEmail({ to: user.email, subject, html });

    res.status(201).json({
      success: true,
      message: 'Registration successful!',
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          city: user.city,
        },
        accessToken,
        refreshToken,
      },
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
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { email, password } = req.body;

    // Find user
    const result = await query(
      `SELECT id, name, email, phone, role, password_hash, 
              city, avatar_url, skill_level, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact support.',
      });
    }

    // Verify password
// Verify password
const isMatch = await bcrypt.compare(password, user.password_hash);

// DEBUG - remove after fixing
console.log('Input password:', password);
console.log('Stored hash:', user.password_hash);
console.log('Hash length:', user.password_hash?.length);
console.log('Match result:', isMatch);

if (!isMatch) {
  return res.status(401).json({
    success: false,
    message: 'Invalid email or password.',
  });
}
    // Generate tokens
    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    // Update refresh token in DB
    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [
      refreshToken,
      user.id,
    ]);

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
          avatar_url: user.avatar_url,
          skill_level: user.skill_level,
        },
        accessToken,
        refreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.',
      });
    }

    const decoded = verifyRefreshToken(token);

    // Verify token matches DB
    const result = await query(
      'SELECT id, role, refresh_token, is_active FROM users WHERE id = $1',
      [decoded.id]
    );

    const user = result.rows[0];

    if (!user || user.refresh_token !== token || !user.is_active) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token.',
      });
    }

    // Issue new tokens (token rotation)
    const newAccessToken = generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    await query('UPDATE users SET refresh_token = $1 WHERE id = $2', [
      newRefreshToken,
      user.id,
    ]);

    res.json({
      success: true,
      data: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Refresh token expired. Please login again.',
      });
    }
    next(err);
  }
};

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, avatar_url,
              skill_level, city, bio, is_verified, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (err) {
    next(err);
  }
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res, next) => {
  try {
    await query('UPDATE users SET refresh_token = NULL WHERE id = $1', [
      req.user.id,
    ]);

    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, city, bio, skill_level } = req.body;

    const result = await query(
      `UPDATE users 
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           city = COALESCE($3, city),
           bio = COALESCE($4, bio),
           skill_level = COALESCE($5, skill_level),
           updated_at = NOW()
       WHERE id = $6
       RETURNING id, name, email, phone, role, city, bio, skill_level, avatar_url`,
      [name, phone, city, bio, skill_level, req.user.id]
    );

    res.json({
      success: true,
      message: 'Profile updated.',
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
    const { currentPassword, newPassword } = req.body;

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    const isMatch = await bcrypt.compare(
      currentPassword,
      result.rows[0].password_hash
    );

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    const salt = await bcrypt.genSalt(12);
    const newHash = await bcrypt.hash(newPassword, salt);

    await query(
      'UPDATE users SET password_hash = $1, refresh_token = NULL WHERE id = $2',
      [newHash, req.user.id]
    );

    res.json({ success: true, message: 'Password changed. Please login again.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  getMe,
  logout,
  updateProfile,
  changePassword,
};