import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { turfService } from '../../services/turfService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import ReviewForm from '../../components/turf/ReviewForm';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TurfDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [turf, setTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [booking, setBooking] = useState(false);
  const [activeImage, setActiveImage] = useState(0);
  const [error, setError] = useState('');
  const [editingReviewId, setEditingReviewId] = useState(null);
  const [editRating, setEditRating] = useState(5);
  const [editComment, setEditComment] = useState('');

  // Add this helper function at top of TurfDetail.jsx
    const getGoogleMapsUrl = (turf) => {
      if (turf.lat && turf.lng) {
        return `https://www.google.com/maps/dir/?api=1&destination=${turf.lat},${turf.lng}`;
      }
      const query = encodeURIComponent(`${turf.name}, ${turf.address}, ${turf.city}`);
      return `https://www.google.com/maps/search/?api=1&query=${query}`;
    };


  // Generate next 7 days
  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  useEffect(() => {
    fetchTurf();
    const today = new Date().toISOString().split('T')[0];
    setSelectedDate(today);
  }, [id]);

  useEffect(() => {
    if (selectedDate) fetchSlots();
  }, [selectedDate]);

  const fetchTurf = async () => {
    try {
      const { data } = await turfService.getOne(id);
      setTurf(data.data);
    } catch {
      setError('Turf not found.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    setSlotsLoading(true);
    try {
      const { data } = await turfService.getSlots(id, { date: selectedDate });
      setSlots(data.data);
      setSelectedSlot(null);
    } catch {}
    finally { setSlotsLoading(false); }
  };
const handleBookSlot = async () => {
  if (!user) { navigate('/login'); return; }
  if (!selectedSlot) return;
  setBooking(true);
  try {
    const { data } = await bookingService.create({ slot_id: selectedSlot.id });
    navigate(`/bookings/${data.data.booking.id}`);  // ← check this line
  } catch (err) {
    setError(err.response?.data?.message || 'Booking failed.');
  } finally {
    setBooking(false);
  }
};

  const formatTime = (t) => {
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const handleEditReview = (review) => {
    setEditingReviewId(review.id);
    setEditRating(review.rating);
    setEditComment(review.comment || '');
  };

  const handleSaveReview = async () => {
    if (!editComment.trim()) return;
    try {
      await turfService.updateReview(id, editingReviewId, {
        rating: editRating,
        comment: editComment.trim(),
      });
      setEditingReviewId(null);
      await fetchTurf();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update review.');
    }
  };

  const handleDeleteReview = async (reviewId) => {
    if (!window.confirm('Are you sure you want to delete this review?')) return;
    try {
      await turfService.deleteReview(id, reviewId);
      await fetchTurf();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete review.');
    }
  };

  if (loading) return <Loader center size="lg" />;
  if (error && !turf) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-6xl">😕</div>
      <p className="text-xl text-gray-600">{error}</p>
      <Link to="/turfs" className="btn-primary">Back to Turfs</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <span>›</span>
        <Link to="/turfs" className="hover:text-primary-600">Turfs</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{turf.name}</span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Column ─────────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Image Gallery */}
          <div className="card overflow-hidden">
            <div className="relative h-72 sm:h-96 bg-gradient-to-br
              from-primary-100 to-primary-200">
              {turf.images?.length ? (
                <img src={turf.images[activeImage]} alt={turf.name}
                  className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center
                  justify-center text-8xl">🏟️</div>
              )}
              {turf.images?.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2
                  flex gap-2">
                  {turf.images.map((_, i) => (
                    <button key={i} onClick={() => setActiveImage(i)}
                      className={`w-2.5 h-2.5 rounded-full transition-all
                        ${i === activeImage
                          ? 'bg-white scale-125'
                          : 'bg-white/50 hover:bg-white/80'}`} />
                  ))}
                </div>
              )}
            </div>
            {turf.images?.length > 1 && (
              <div className="flex gap-2 p-3 overflow-x-auto">
                {turf.images.map((img, i) => (
                  <img key={i} src={img} alt=""
                    onClick={() => setActiveImage(i)}
                    className={`w-16 h-16 object-cover rounded-lg cursor-pointer
                      border-2 transition-all flex-shrink-0
                      ${i === activeImage
                        ? 'border-primary-500'
                        : 'border-transparent opacity-60 hover:opacity-100'}`} />
                ))}
              </div>
            )}
          </div>

          {/* Turf Info */}
          <div className="card p-6">
            <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
              <div>
                <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
                  {turf.name}
                </h1>
                <p className="text-gray-500 flex items-center gap-1">
                  <span>📍</span> {turf.address}, {turf.city}
                </p>
              </div>
              <div className="text-right">
                <div className="text-3xl font-extrabold text-primary-600">
                  ₹{parseFloat(turf.price_per_hour).toLocaleString()}
                </div>
                <div className="text-sm text-gray-400">per hour</div>
              </div>
            </div>
            {/* After the address paragraph */}
            <div className="flex flex-wrap gap-3 mt-4">
              <a
                href={getGoogleMapsUrl(turf)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-blue-50 hover:bg-blue-100
                  text-blue-700 font-semibold px-4 py-2.5 rounded-xl border
                  border-blue-200 transition-all duration-200 text-sm hover:shadow-md">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                </svg>
                Get Directions
              </a>

              <a
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${turf.name} ${turf.address} ${turf.city}`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-gray-50 hover:bg-gray-100
                  text-gray-700 font-semibold px-4 py-2.5 rounded-xl border
                  border-gray-200 transition-all duration-200 text-sm">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.5 3l-.16.03L15 5.1 9 3 3.36 4.9c-.21.07-.36.25-.36.48V20.5c0 .28.22.5.5.5l.16-.03L9 18.9l6 2.1 5.64-1.9c.21-.07.36-.25.36-.48V3.5c0-.28-.22-.5-.5-.5zM15 19l-6-2.11V5l6 2.11V19z"/>
                </svg>
                View on Map
              </a>
            </div>

            {/* Rating */}
            {turf.avg_rating > 0 && (
              <div className="flex items-center gap-2 mb-4">
                <div className="flex">
                  {[1,2,3,4,5].map(i => (
                    <span key={i} className={`text-lg
                      ${i <= Math.round(turf.avg_rating)
                        ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                  ))}
                </div>
                <span className="font-bold text-gray-900">
                  {parseFloat(turf.avg_rating).toFixed(1)}
                </span>
                <span className="text-gray-400 text-sm">
                  ({turf.total_reviews} reviews)
                </span>
              </div>
            )}

            {/* Sports */}
           <div className="flex flex-wrap gap-2 mb-4">
              {(Array.isArray(turf.sport_types)
                ? turf.sport_types
                : typeof turf.sport_types === 'string'
                ? turf.sport_types.replace(/[{}"]/g, '').split(',')
                : []
              ).map(s => (
                <span key={s} className="badge bg-primary-100 text-primary-700
                  capitalize font-semibold px-3 py-1">{s.trim()}</span>
              ))}
            </div>

            {turf.description && (
              <p className="text-gray-600 leading-relaxed mb-4">
                {turf.description}
              </p>
            )}

            {/* Amenities */}
            {turf.amenities?.length > 0 && (
              <div>
                <h3 className="font-bold text-gray-900 mb-3">Amenities</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {turf.amenities.map(a => (
                    <div key={a} className="flex items-center gap-2 text-sm
                      text-gray-600 bg-gray-50 rounded-lg px-3 py-2 capitalize">
                      <span className="text-primary-500">✓</span> {a}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Owner Info */}
          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-4">Turf Owner</h3>
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-100 flex
                items-center justify-center text-primary-700 font-bold text-lg">
                {turf.owner_name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{turf.owner_name}</p>
                <p className="text-sm text-gray-500">{turf.owner_phone}</p>
              </div>
            </div>
          </div>

          {/* Reviews Section */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-gray-900 text-lg">
                Reviews
                {turf.total_reviews > 0 && (
                  <span className="ml-2 text-gray-400 font-normal text-base">
                    ({turf.total_reviews})
                  </span>
                )}
              </h3>
              {/* Overall Rating */}
              {turf.avg_rating > 0 && (
                <div className="flex items-center gap-2 bg-primary-50
                  px-3 py-1.5 rounded-xl">
                  <span className="text-yellow-500 text-lg">★</span>
                  <span className="font-extrabold text-gray-900">
                    {parseFloat(turf.avg_rating).toFixed(1)}
                  </span>
                  <span className="text-gray-400 text-sm">/ 5</span>
                </div>
              )}
            </div>

            {/* Rating Breakdown */}
            {turf.reviews?.length > 0 && (
              <div className="mb-6 p-4 bg-gray-50 rounded-xl">
                <div className="space-y-2">
                  {[5,4,3,2,1].map(star => {
                    const count = turf.reviews.filter(
                      r => r.rating === star).length;
                    const percent = turf.reviews.length
                      ? (count / turf.reviews.length) * 100 : 0;
                    return (
                      <div key={star} className="flex items-center gap-3">
                        <span className="text-xs text-gray-500 w-3">
                          {star}
                        </span>
                        <span className="text-yellow-400 text-xs">★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-yellow-400 h-2 rounded-full
                              transition-all duration-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400 w-4">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Write Review Form */}
            <ReviewForm
              turfId={id}
              user={user}
              onReviewSubmitted={fetchTurf}
            />

            {/* Reviews List */}
            {turf.reviews?.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2">💬</div>
                <p className="text-gray-400 text-sm">
                  No reviews yet. Be the first to review!
                </p>
              </div>
            ) : (
              <div className="space-y-4 mt-6">
                {turf.reviews.map(r => (
                  <div key={r.id} className="flex gap-3 pb-4
                    border-b border-gray-100 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-primary-100
                      flex items-center justify-center font-semibold
                      text-primary-700 text-sm flex-shrink-0">
                      {r.reviewer_name?.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      {editingReviewId === r.id ? (
                        // Edit Form
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <div className="mb-3">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                              Rating
                            </label>
                            <div className="flex gap-2">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <button
                                  key={star}
                                  type="button"
                                  onClick={() => setEditRating(star)}
                                  className="text-2xl transition-all hover:scale-110"
                                >
                                  <span
                                    className={
                                      star <= editRating ? 'text-yellow-400' : 'text-gray-300'
                                    }
                                  >
                                    ★
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                          <textarea
                            value={editComment}
                            onChange={(e) => setEditComment(e.target.value)}
                            placeholder="Update your review..."
                            rows="3"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg
                              focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none text-sm"
                          />
                          <div className="flex gap-2 mt-3">
                            <button
                              onClick={handleSaveReview}
                              className="flex-1 bg-primary-600 text-white py-1.5 rounded-lg
                                hover:bg-primary-700 font-medium text-sm transition-all"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingReviewId(null)}
                              className="flex-1 bg-gray-200 text-gray-700 py-1.5 rounded-lg
                                hover:bg-gray-300 font-medium text-sm transition-all"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-semibold text-gray-900 text-sm">
                              {r.reviewer_name}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-400">
                                {new Date(r.created_at).toLocaleDateString('en-IN', {
                                  day: 'numeric', month: 'short', year: 'numeric',
                                })}
                              </span>
                              {user && user.id === r.reviewer_id && (
                                <div className="flex gap-1">
                                  <button
                                    onClick={() => handleEditReview(r)}
                                    className="text-xs text-primary-600 hover:text-primary-700
                                      font-semibold transition-colors"
                                  >
                                    ✏️
                                  </button>
                                  <button
                                    onClick={() => handleDeleteReview(r.id)}
                                    className="text-xs text-red-600 hover:text-red-700
                                      font-semibold transition-colors"
                                  >
                                    🗑️
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                          {/* Stars */}
                          <div className="flex gap-0.5 mb-1.5">
                            {[1,2,3,4,5].map(i => (
                              <span key={i} className={`text-sm
                                ${i <= r.rating
                                  ? 'text-yellow-400'
                                  : 'text-gray-200'}`}>
                                ★
                              </span>
                            ))}
                          </div>
                          {r.comment && (
                            <p className="text-sm text-gray-600 leading-relaxed">
                              {r.comment}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── Right Column: Booking Widget ────────────── */}
        <div className="lg:col-span-1">
          <div className="card p-6 sticky top-24">
            <h2 className="text-lg font-bold text-gray-900 mb-5">
              Book a Slot
            </h2>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700
                rounded-xl px-4 py-3 mb-4 text-sm">
                {error}
              </div>
            )}

            {/* Date Picker */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Select Date
              </label>
              <div className="grid grid-cols-7 gap-1">
                {next7Days.map((d, i) => {
                  const dateStr = d.toISOString().split('T')[0];
                  const isSelected = selectedDate === dateStr;
                  return (
                    <button key={i} onClick={() => setSelectedDate(dateStr)}
                      className={`flex flex-col items-center py-2 rounded-xl
                        border transition-all text-xs
                        ${isSelected
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                      <span className="font-medium">
                        {DAYS[d.getDay()]}
                      </span>
                      <span className={`font-bold text-sm mt-0.5
                        ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                        {d.getDate()}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Slots */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Available Slots
              </label>
              {slotsLoading ? (
                <Loader center size="sm" />
              ) : slots.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-xl">
                  <p className="text-gray-400 text-sm">No slots available</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Try another date
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto">
                  {slots.map(slot => {
                    const isAvailable = slot.status === 'available';
                    const isSelected = selectedSlot?.id === slot.id;
                    return (
                      <button key={slot.id}
                        onClick={() => isAvailable && setSelectedSlot(slot)}
                        disabled={!isAvailable}
                        className={`py-2.5 px-2 rounded-xl border text-xs font-semibold
                          transition-all text-center
                          ${isSelected
                            ? 'bg-primary-600 text-white border-primary-600'
                            : isAvailable
                            ? 'bg-white text-gray-700 border-gray-200 hover:border-primary-400'
                            : 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed line-through'}`}>
                        {formatTime(slot.start_time)}
                        <span className="block text-gray-400 font-normal
                          text-xs">
                          {formatTime(slot.end_time)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Summary */}
            {selectedSlot && (
              <div className="bg-primary-50 rounded-xl p-4 mb-4 border
                border-primary-100">
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">
                  Booking Summary
                </h4>
                <div className="space-y-1.5 text-sm">
                  <div className="flex justify-between text-gray-600">
                    <span>Date</span>
                    <span className="font-medium">{selectedDate}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Time</span>
                    <span className="font-medium">
                      {formatTime(selectedSlot.start_time)} –{' '}
                      {formatTime(selectedSlot.end_time)}
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Rate</span>
                    <span className="font-medium">
                      ₹{parseFloat(turf.price_per_hour).toLocaleString()}/hr
                    </span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Platform fee (10%)</span>
                    <span className="font-medium">
                      ₹{(turf.price_per_hour * 0.1).toFixed(0)}
                    </span>
                  </div>
                  <div className="border-t border-primary-200 pt-2 mt-2
                    flex justify-between font-bold text-gray-900">
                    <span>Total</span>
                    <span className="text-primary-600">
                      ₹{(turf.price_per_hour * 1.1).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <button onClick={handleBookSlot}
              disabled={!selectedSlot || booking}
              className="btn-primary w-full py-3 text-base disabled:opacity-50">
              {booking ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"
                    fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Booking...
                </span>
              ) : !selectedSlot ? 'Select a Slot' : 'Book Now →'}
            </button>

            {!user && (
              <p className="text-center text-xs text-gray-400 mt-3">
                <Link to="/login" className="text-primary-600 font-medium">
                  Login
                </Link>{' '}to book this turf
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default TurfDetail;