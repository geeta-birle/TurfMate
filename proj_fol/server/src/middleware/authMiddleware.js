const { verifyAccessToken } = require('../utils/jwt');
const { query }             = require('../config/db');

// ─────────────────────────────────────────────────────────────
// protect — verify JWT and attach fresh user to req.user
// ─────────────────────────────────────────────────────────────
const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
        code: 'NO_TOKEN',
      });
    }

    const token = authHeader.split(' ')[1];

    // verifyAccessToken throws on expiry or tampering
    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Token expired. Please refresh.',
          code: 'TOKEN_EXPIRED',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
        code: 'INVALID_TOKEN',
      });
    }

    // FIX 1: Fetch all fields that controllers actually use.
    // Original only fetched id, name, email, role, is_active —
    // missing avatar_url, skill_level, phone used by several controllers.
    const result = await query(
      `SELECT id, name, email, role, phone, city,
              avatar_url, skill_level, is_active, is_verified
       FROM users WHERE id = $1`,
      [decoded.id]
    );

    if (!result.rows.length) {
      return res.status(401).json({
        success: false,
        message: 'User not found.',
        code: 'USER_NOT_FOUND',
      });
    }

    const user = result.rows[0];

    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.',
        code: 'ACCOUNT_DEACTIVATED',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    // Catch unexpected DB errors — don't leak internals
    return res.status(500).json({
      success: false,
      message: 'Authentication error. Please try again.',
    });
  }
};

// ─────────────────────────────────────────────────────────────
// authorize — role-based access control
// Must be used AFTER protect
// ─────────────────────────────────────────────────────────────
const authorize = (...roles) => (req, res, next) => {
  // FIX 2: Guard against protect not being called first
  if (!req.user) {
    return res.status(401).json({
      success: false,
      message: 'Not authenticated.',
    });
  }

  // FIX 3: Admin can always access any role-protected route
  if (req.user.role === 'admin' || roles.includes(req.user.role)) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: `Access denied. Required role: ${roles.join(' or ')}.`,
    code: 'FORBIDDEN',
  });
};

module.exports = { protect, authorize };