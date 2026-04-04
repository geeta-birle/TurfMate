const { v4: uuidv4 } = require('uuid');

// Generate random invite code for matches
const generateInviteCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

// Calculate platform fee
const calculatePlatformFee = (amount) => {
  const feePercent = parseFloat(process.env.PLATFORM_FEE_PERCENT) || 10;
  return parseFloat(((amount * feePercent) / 100).toFixed(2));
};

// Format amount to paise (Razorpay uses paise)
const toPaise = (amount) => Math.round(amount * 100);

// Paginate helper
const getPagination = (page = 1, limit = 10) => {
  const offset = (page - 1) * limit;
  return { limit: parseInt(limit), offset };
};

// Build pagination meta
const paginationMeta = (total, page, limit) => ({
  total,
  page: parseInt(page),
  limit: parseInt(limit),
  totalPages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

// Parse PostgreSQL array string into JS array
const parsePostgresArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    return val
      .replace(/^{|}$/g, '')   // remove { and }
      .split(',')
      .map(s => s.replace(/^"|"$/g, '').trim()) // remove quotes
      .filter(Boolean);
  }
  return [];
};

// Parse all array fields on a turf object
const parseTurfArrays = (turf) => {
  if (!turf) return turf;
  return {
    ...turf,
    sport_types: parsePostgresArray(turf.sport_types),
    amenities:   parsePostgresArray(turf.amenities),
    images:      parsePostgresArray(turf.images),
  };
};

module.exports = {
  generateInviteCode,
  calculatePlatformFee,
  toPaise,
  getPagination,
  paginationMeta,
  parsePostgresArray,
  parseTurfArrays,
};
