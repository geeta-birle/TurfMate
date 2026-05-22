const bcrypt   = require('bcryptjs');
const crypto   = require('crypto');
const { query, getClient } = require('../config/db');
const {
  generateAccessToken,
  generateRefreshToken,
  verifyRefreshToken,
} = require('../utils/jwt');
const { sendEmail, emailTemplates } = require('../utils/email');
const { validationResult } = require('express-validator');

// ─────────────────────────────────────────────────────────────
// @desc    Register user
// @route   POST /api/auth/register
// @access  Public
// ─────────────────────────────────────────────────────────────
const register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ success: false, errors: errors.array() });

    const { name, email, password, phone, role = 'player', city } = req.body;

    // FIX 1: Only allow valid roles on registration — never let a user
    // self-assign 'admin'. 'owner' is allowed if your business permits it.
    const allowedRoles = ['player', 'owner'];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed: ${allowedRoles.join(', ')}`,
      });
    }

    // Check existing user — email and phone separately so the error is clear
    const emailCheck = await query(
      'SELECT id FROM users WHERE email = $1', [email]
    );
    if (emailCheck.rows.length) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }

    if (phone) {
      const phoneCheck = await query(
        'SELECT id FROM users WHERE phone = $1', [phone]
      );
      if (phoneCheck.rows.length) {
        return res.status(409).json({
          success: false,
          message: 'An account with this phone number already exists.',
        });
      }
    }

    const salt          = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(password, salt);

    const emailVerifyToken   = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const result = await query(
      `INSERT INTO users
        (name, email, password_hash, phone, role, city,
         email_verify_token, email_verify_expires, is_verified)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,false)
       RETURNING id, name, email, phone, role, city`,
      [name, email, password_hash, phone, role, city,
       emailVerifyToken, emailVerifyExpires]
    );

    const user = result.rows[0];

    const accessToken  = generateAccessToken({ id: user.id, role: user.role });
    const refreshToken = generateRefreshToken({ id: user.id });

    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [refreshToken, user.id]
    );

    // FIX 2: Await the email send so errors surface — fire-and-forget
    // swallowed failures silently. Wrap in try/catch so a mail error
    // doesn't break the registration response.
    try {
      const verifyUrl       = `${process.env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
      const { subject, html } = emailTemplates.verifyEmail(user.name, verifyUrl);
      await sendEmail({ to: user.email, subject, html });
    } catch (mailErr) {
      console.error('⚠️  Verification email failed to send:', mailErr.message);
      // Non-fatal — user is registered, they can request a resend
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        user: {
          id:          user.id,
          name:        user.name,
          email:       user.email,
          phone:       user.phone,
          role:        user.role,
          city:        user.city,
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

// ─────────────────────────────────────────────────────────────
// @desc    Verify email
// @route   GET /api/auth/verify-email/:token
// @access  Public
// ─────────────────────────────────────────────────────────────
const verifyEmail = async (req, res, next) => {
  try {
    const { token } = req.params;

    // FIX 3: Also check expiry in the same query to avoid a TOCTOU gap
    const result = await query(
      `SELECT id, name, email, email_verify_expires
       FROM users
       WHERE email_verify_token = $1
         AND is_verified        = false
         AND email_verify_expires > NOW()`,
      [token]
    );

    if (!result.rows.length) {
      // Could be expired OR already used — check which
      const used = await query(
        `SELECT id FROM users
         WHERE email_verify_token = $1 AND is_verified = true`,
        [token]
      );
      if (used.rows.length) {
        return res.status(400).json({
          success: false,
          message: 'This link has already been used. You can log in.',
        });
      }
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid or has expired.',
        code: 'TOKEN_EXPIRED',
      });
    }

    const user = result.rows[0];

    await query(
      `UPDATE users SET
        is_verified          = true,
        email_verify_token   = NULL,
        email_verify_expires = NULL,
        updated_at           = NOW()
       WHERE id = $1`,
      [user.id]
    );

    res.json({
      success: true,
      message: 'Email verified successfully! You can now log in.',
      data: { email: user.email },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Resend verification email
// @route   POST /api/auth/resend-verification
// @access  Public
// ─────────────────────────────────────────────────────────────
const resendVerification = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email is required.',
      });
    }

    const result = await query(
      'SELECT id, name, email, is_verified FROM users WHERE email = $1',
      [email]
    );

    // FIX 4: Don't reveal whether the email exists — prevents enumeration
    if (!result.rows.length || result.rows[0].is_verified) {
      return res.json({
        success: true,
        message: 'If your email is registered and unverified, a new link has been sent.',
      });
    }

    const user               = result.rows[0];
    const emailVerifyToken   = crypto.randomBytes(32).toString('hex');
    const emailVerifyExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await query(
      `UPDATE users SET
        email_verify_token   = $1,
        email_verify_expires = $2
       WHERE id = $3`,
      [emailVerifyToken, emailVerifyExpires, user.id]
    );

    try {
      const verifyUrl       = `${process.env.CLIENT_URL}/verify-email?token=${emailVerifyToken}`;
      const { subject, html } = emailTemplates.verifyEmail(user.name, verifyUrl);
      await sendEmail({ to: user.email, subject, html });
    } catch (mailErr) {
      console.error('⚠️  Resend email failed:', mailErr.message);
    }

    res.json({
      success: true,
      message: 'If your email is registered and unverified, a new link has been sent.',
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Forgot password
// @route   POST /api/auth/forgot-password
// @access  Public
// ─────────────────────────────────────────────────────────────
const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required.' });
    }

    const result = await query(
      'SELECT id, name, email FROM users WHERE email = $1',
      [email]
    );

    // Always return the same response — prevents email enumeration
    const genericMsg = 'If an account exists with that email, a reset link has been sent.';

    if (!result.rows.length) {
      return res.json({ success: true, message: genericMsg });
    }

    const user        = result.rows[0];
    const resetToken  = crypto.randomBytes(32).toString('hex');
    // FIX 5: Store a HASH of the reset token in the DB, not the raw token.
    // If the DB is compromised, attackers can't use raw tokens directly.
    const tokenHash   = crypto.createHash('sha256').update(resetToken).digest('hex');
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await query(
      `UPDATE users SET
        reset_password_token   = $1,
        reset_password_expires = $2
       WHERE id = $3`,
      [tokenHash, resetExpires, user.id]
    );

    const resetUrl        = `${process.env.CLIENT_URL}/reset-password?token=${resetToken}`;
    const { subject, html } = emailTemplates.resetPassword(user.name, resetUrl);

    try {
      await sendEmail({ to: user.email, subject, html });
    } catch (mailErr) {
      console.error('⚠️  Reset email failed:', mailErr.message);
    }

    res.json({ success: true, message: genericMsg });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Reset password
// @route   POST /api/auth/reset-password
// @access  Public
// ─────────────────────────────────────────────────────────────
const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Token and new password are required.',
      });
    }

    // FIX 5 (continued): Hash the incoming token before DB lookup
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const result = await query(
      `SELECT id FROM users
       WHERE reset_password_token   = $1
         AND reset_password_expires > NOW()`,
      [tokenHash]
    );

    if (!result.rows.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired reset link.',
      });
    }

    // FIX 6: Enforce minimum password length at the controller level
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters.',
      });
    }

    const salt          = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    await query(
      `UPDATE users SET
        password_hash          = $1,
        reset_password_token   = NULL,
        reset_password_expires = NULL,
        refresh_token          = NULL,
        updated_at             = NOW()
       WHERE id = $2`,
      [password_hash, result.rows[0].id]
    );

    res.json({
      success: true,
      message: 'Password reset successful! Please log in with your new password.',
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
// ─────────────────────────────────────────────────────────────
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.',
      });
    }

    const result = await query(
      `SELECT id, name, email, password_hash, role, city,
              phone, is_verified, is_active
       FROM users WHERE email = $1`,
      [email]
    );

    // FIX 7: Use constant-time comparison path even when user not found
    // to prevent timing attacks that reveal whether an email is registered.
    const dummyHash = '$2a$12$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
    const user      = result.rows[0] || { password_hash: dummyHash };

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!result.rows.length || !isPasswordValid) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.',
      });
    }

    if (!user.is_verified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email before logging in.',
        code: 'EMAIL_NOT_VERIFIED',
      });
    }

    const accessToken  = generateAccessToken({ id: user.id, role: user.role });
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
          id:          user.id,
          name:        user.name,
          email:       user.email,
          phone:       user.phone,
          role:        user.role,
          city:        user.city,
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

// ─────────────────────────────────────────────────────────────
// @desc    Refresh access token
// @route   POST /api/auth/refresh
// @access  Public (uses refresh token)
// FIX 8: This route was completely missing — the frontend gets
// TOKEN_EXPIRED errors with no way to recover without a full logout.
// ─────────────────────────────────────────────────────────────
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token required.',
      });
    }

    let decoded;
    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired refresh token. Please log in again.',
        code: 'REFRESH_EXPIRED',
      });
    }

    // Verify token matches what's stored (rotation check)
    const result = await query(
      `SELECT id, name, email, role, city, phone,
              is_verified, is_active, refresh_token
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!result.rows.length || result.rows[0].refresh_token !== token) {
      return res.status(401).json({
        success: false,
        message: 'Refresh token is no longer valid. Please log in again.',
        code: 'REFRESH_INVALID',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated.',
      });
    }

    // Issue new tokens (rotation — old refresh token is replaced)
    const newAccessToken  = generateAccessToken({ id: user.id, role: user.role });
    const newRefreshToken = generateRefreshToken({ id: user.id });

    await query(
      'UPDATE users SET refresh_token = $1 WHERE id = $2',
      [newRefreshToken, user.id]
    );

    res.json({
      success: true,
      data: {
        accessToken:  newAccessToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Get current user
// @route   GET /api/auth/me
// @access  Private
// ─────────────────────────────────────────────────────────────
const getMe = async (req, res, next) => {
  try {
    const result = await query(
      `SELECT id, name, email, phone, role, city,
              is_verified, avatar_url, created_at
       FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Logout user
// @route   POST /api/auth/logout
// @access  Private
// ─────────────────────────────────────────────────────────────
const logout = async (req, res, next) => {
  try {
    await query(
      'UPDATE users SET refresh_token = NULL WHERE id = $1',
      [req.user.id]
    );
    res.json({ success: true, message: 'Logged out successfully.' });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
// ─────────────────────────────────────────────────────────────
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, city } = req.body;

    const updates = [];
    const values  = [];
    let idx = 1;

    if (name)  { updates.push(`name  = $${idx++}`); values.push(name);  }
    if (phone) { updates.push(`phone = $${idx++}`); values.push(phone); }
    if (city)  { updates.push(`city  = $${idx++}`); values.push(city);  }

    if (!updates.length) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update.',
      });
    }

    // FIX 9: Check phone uniqueness before updating
    if (phone) {
      const phoneCheck = await query(
        'SELECT id FROM users WHERE phone = $1 AND id != $2',
        [phone, req.user.id]
      );
      if (phoneCheck.rows.length) {
        return res.status(409).json({
          success: false,
          message: 'This phone number is already in use.',
        });
      }
    }

    updates.push(`updated_at = NOW()`);
    values.push(req.user.id);

    const result = await query(
      `UPDATE users SET ${updates.join(', ')}
       WHERE id = $${idx}
       RETURNING id, name, email, phone, role, city, is_verified`,
      values
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    res.json({ success: true, message: 'Profile updated.', data: result.rows[0] });
  } catch (err) {
    next(err);
  }
};

// ─────────────────────────────────────────────────────────────
// @desc    Change password
// @route   PUT /api/auth/change-password
// @access  Private
// ─────────────────────────────────────────────────────────────
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 8 characters.',
      });
    }

    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password must be different from current password.',
      });
    }

    const result = await query(
      'SELECT password_hash FROM users WHERE id = $1',
      [req.user.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const isValid = await bcrypt.compare(currentPassword, result.rows[0].password_hash);
    if (!isValid) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect.',
      });
    }

    const salt          = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(newPassword, salt);

    // Invalidate all sessions by clearing refresh token
    await query(
      `UPDATE users SET
        password_hash = $1,
        refresh_token = NULL,
        updated_at    = NOW()
       WHERE id = $2`,
      [password_hash, req.user.id]
    );

    res.json({ success: true, message: 'Password changed. Please log in again.' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  register,
  login,
  refreshToken,
  verifyEmail,
  resendVerification,
  forgotPassword,
  resetPassword,
  getMe,
  logout,
  updateProfile,
  changePassword,
};