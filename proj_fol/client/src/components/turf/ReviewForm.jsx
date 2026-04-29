import { useState } from 'react';
import { turfService } from '../../services/turfService';

const ReviewForm = ({ turfId, user, onReviewSubmitted }) => {
  const [formOpen, setFormOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) {
      setError('Please login to write a review');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      await turfService.addReview(turfId, {
        rating,
        comment: comment.trim(),
      });
      setSuccess('Review posted successfully!');
      setRating(5);
      setComment('');
      setFormOpen(false);
      setTimeout(() => setSuccess(''), 3000);
      if (onReviewSubmitted) onReviewSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to post review');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="mb-6 pb-6 border-b border-gray-200">
      {!formOpen ? (
        <button
          onClick={() => setFormOpen(true)}
          className="btn-primary w-full py-2.5 text-sm"
        >
          Write a Review ✏️
        </button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-gray-50 p-4 rounded-xl">
            {/* Rating Selector */}
            <div className="mb-4">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Rating
              </label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    className="text-3xl transition-all hover:scale-110"
                  >
                    <span
                      className={
                        star <= rating ? 'text-yellow-400' : 'text-gray-300'
                      }
                    >
                      ★
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Your Review
              </label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Share your experience with this turf..."
                rows="4"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
              <p className="text-xs text-gray-400 mt-1">
                {comment.length}/500 characters
              </p>
            </div>

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700
                rounded-lg px-3 py-2 text-sm">
                {error}
              </div>
            )}

            {success && (
              <div className="mt-3 bg-green-50 border border-green-200 text-green-700
                rounded-lg px-3 py-2 text-sm">
                {success}
              </div>
            )}

            {/* Buttons */}
            <div className="flex gap-2 mt-4">
              <button
                type="submit"
                disabled={loading || comment.trim().length === 0}
                className="flex-1 bg-primary-600 text-white py-2 rounded-lg
                  hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed
                  font-medium text-sm transition-all"
              >
                {loading ? 'Posting...' : 'Post Review'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormOpen(false);
                  setComment('');
                  setRating(5);
                  setError('');
                }}
                className="flex-1 bg-gray-200 text-gray-700 py-2 rounded-lg
                  hover:bg-gray-300 font-medium text-sm transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
};

export default ReviewForm;
