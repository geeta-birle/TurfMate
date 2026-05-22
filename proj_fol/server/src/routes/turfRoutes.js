const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const {
  createTurf, getTurfs, getTurf, updateTurf,
  deleteTurf, getSlots, addSlots, generateSlots,
  updateSlot, getMyTurfs, addReview, updateReview, deleteReview,
} = require('../controllers/turfController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Validation
const turfValidation = [
  body('name').trim().notEmpty().withMessage('Turf name is required'),
  body('address').trim().notEmpty().withMessage('Address is required'),
  body('city').trim().notEmpty().withMessage('City is required'),
  body('sport_types').isArray({ min: 1 }).withMessage('At least one sport type required'),
  body('price_per_hour').isFloat({ min: 1 }).withMessage('Valid price required'),
];

// Public
router.get('/', getTurfs);
router.get('/my', protect, authorize('owner'), getMyTurfs);
// IMPORTANT: specific routes before generic /:id
router.get('/:id/slots', getSlots);
router.get('/:id', getTurf);

// Owner only
router.post('/', protect, authorize('owner'), turfValidation, createTurf);
router.put('/:id', protect, authorize('owner', 'admin'), updateTurf);
router.delete('/:id', protect, authorize('owner', 'admin'), deleteTurf);
router.post('/:id/slots', protect, authorize('owner'), addSlots);
router.post('/:id/slots/generate', protect, authorize('owner'), generateSlots);
router.put('/:id/slots/:slotId', protect, authorize('owner'), updateSlot);

// Player (must have completed booking)
router.post('/:id/review', protect, authorize('player'), addReview);
router.put('/:id/review/:reviewId', protect, authorize('player'), updateReview);
router.delete('/:id/review/:reviewId', protect, authorize('player'), deleteReview);

module.exports = router;