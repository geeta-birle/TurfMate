import { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link }               from 'react-router-dom';
import { turfService }                                 from '../../services/turfService';
import { bookingService }                              from '../../services/bookingService';
import { useAuth }                                     from '../../context/AuthContext';
import Loader                                          from '../../components/common/Loader';

// ── Helpers ───────────────────────────────────────────
const formatTime = (t) => {
  if (!t) return '';
  const [h, m] = t.split(':');
  const hour   = parseInt(h);
  return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
};

const getGoogleMapsUrl = (turf) => {
  if (turf?.lat && turf?.lng)
    return `https://www.google.com/maps/dir/?api=1&destination=${turf.lat},${turf.lng}`;
  return `https://www.google.com/maps/search/?api=1&query=${
    encodeURIComponent(`${turf?.name} ${turf?.address} ${turf?.city}`)
  }`;
};

// Generate 7 dates using LOCAL timezone — runs once outside component
const generateDates = () => {
  const dates = [];
  const now   = new Date();
  for (let i = 0; i < 7; i++) {
    const d     = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const year  = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day   = String(d.getDate()).padStart(2, '0');
    dates.push({
      dateStr: `${year}-${month}-${day}`,
      dateObj: d,
      isToday: i === 0,
    });
  }
  return dates;
};

// ── Static constant — computed once at module level ───
const DATES = generateDates();
const TODAY = DATES[0].dateStr;

// ── Review Form ───────────────────────────────────────
const ReviewForm = ({ turfId, user, onSubmitted }) => {
  const [rating,     setRating]     = useState(0);
  const [hovered,    setHovered]    = useState(0);
  const [comment,    setComment]    = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState(false);
  const [open,       setOpen]       = useState(false);

  if (!user) return (
    <div className="bg-gray-50 rounded-xl p-4 text-center
      border border-dashed border-gray-200">
      <p className="text-gray-500 text-sm">
        <Link to="/login" className="text-green-600 font-semibold">
          Login
        </Link>{' '}to write a review
      </p>
    </div>
  );

  if (success) return (
    <div className="bg-green-50 border border-green-200
      rounded-xl p-4 text-center">
      <div className="text-3xl mb-2">🎉</div>
      <p className="text-green-700 font-semibold">
        Review submitted! Thank you.
      </p>
    </div>
  );

  if (!open) return (
    <button onClick={() => setOpen(true)}
      className="w-full py-3 border-2 border-dashed border-green-200
        text-green-600 font-semibold rounded-xl hover:bg-green-50
        transition-colors flex items-center justify-center gap-2">
      ✍️ Write a Review
    </button>
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) { setError('Please select a rating.'); return; }
    setSubmitting(true);
    setError('');
    try {
      await turfService.addReview(turfId, { rating, comment });
      setSuccess(true);
      onSubmitted?.();
    } catch (err) {
      setError(err.response?.data?.message ||
        'You can only review turfs you have booked.');
    } finally { setSubmitting(false); }
  };

  return (
    <form onSubmit={handleSubmit}
      className="bg-gray-50 rounded-xl p-5 border border-gray-200">
      <h4 className="font-bold text-gray-900 mb-4">Write a Review</h4>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-4 text-sm">⚠️ {error}</div>
      )}
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Rating *
        </label>
        <div className="flex gap-1">
          {[1,2,3,4,5].map(star => (
            <button key={star} type="button"
              onClick={() => setRating(star)}
              onMouseEnter={() => setHovered(star)}
              onMouseLeave={() => setHovered(0)}
              className={`text-3xl transition-all cursor-pointer hover:scale-110
                ${star <= (hovered || rating)
                  ? 'text-yellow-400' : 'text-gray-200'}`}>
              ★
            </button>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Comment
          <span className="text-gray-400 font-normal ml-1">(optional)</span>
        </label>
        <textarea value={comment}
          onChange={e => setComment(e.target.value)}
          rows={3} maxLength={500}
          placeholder="Share your experience..."
          className="input resize-none" />
        <p className="text-xs text-gray-400 mt-1 text-right">
          {comment.length}/500
        </p>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => setOpen(false)}
          className="btn-secondary flex-1 py-2.5">
          Cancel
        </button>
        <button type="submit"
          disabled={submitting || !rating}
          className="btn-primary flex-1 py-2.5 disabled:opacity-50">
          {submitting ? 'Submitting...' : '⭐ Submit Review'}
        </button>
      </div>
    </form>
  );
};

// ─────────────────────────────────────────────────────
// Main TurfDetail Component
// ─────────────────────────────────────────────────────
const TurfDetail = () => {
  const { id }   = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [turf,         setTurf]         = useState(null);
  const [slots,        setSlots]        = useState([]);
  const [selectedDate, setSelectedDate] = useState(TODAY);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [booking,      setBooking]      = useState(false);
  const [error,        setError]        = useState('');

  // ── Fetch turf data ─────────────────────────────────
  const fetchTurf = useCallback(async () => {
    try {
      const { data } = await turfService.getOne(id);
      setTurf(data.data);
    } catch {
      setError('Turf not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  // ── Fetch slots for a given date ────────────────────
  const fetchSlots = useCallback(async (date) => {
    if (!date) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    setSlots([]);
    setError('');
    try {
      const { data } = await turfService.getSlots(id, { date });
      setSlots(data.data || []);
    } catch (err) {
      const msg = err.response?.data?.message;
      const code = err.response?.data?.code;
      if (code !== 'PAST_DATE') {
        setError(msg || 'Failed to load slots. Please try again.');
      }
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [id]);

  // ── On mount: load turf + today's slots ────────────
  useEffect(() => {
    fetchTurf();
  }, [fetchTurf]);

  // ── Fetch slots whenever selectedDate changes ───────
  // This is the KEY FIX — selectedDate starts as TODAY
  // so slots load immediately on mount
  useEffect(() => {
    if (selectedDate) {
      fetchSlots(selectedDate);
    }
  }, [selectedDate, fetchSlots]);

  // ── Handlers ────────────────────────────────────────
  const handleDateSelect = (dateStr) => {
    setSelectedDate(dateStr); // triggers the useEffect above
  };

  const handleBookSlot = async () => {
    if (!user)         { navigate('/login'); return; }
    if (!selectedSlot) { setError('Please select a slot.'); return; }
    setBooking(true);
    setError('');
    try {
      const { data } = await bookingService.create({
        slot_id: selectedSlot.id,
      });
      navigate(`/bookings/${data.data.booking.id}`);
    } catch (err) {
      setError(err.response?.data?.message ||
        'Booking failed. Please try again.');
    } finally {
      setBooking(false);
    }
  };

  // ── Parse PostgreSQL array fields ───────────────────
  const parseArr = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string')
      return val.replace(/^{|}$/g, '')
        .split(',')
        .map(s => s.replace(/^"|"$/g, '').trim())
        .filter(Boolean);
    return [];
  };

  // ── Loading / error states ──────────────────────────
  if (loading) return <Loader center size="lg" />;

  if (!turf) return (
    <div className="flex flex-col items-center justify-center
      min-h-screen gap-4">
      <div className="text-6xl">😕</div>
      <p className="text-gray-600">Turf not found.</p>
      <Link to="/turfs" className="btn-primary">Browse Turfs</Link>
    </div>
  );

  const images       = parseArr(turf.images);
  const sportTypes   = parseArr(turf.sport_types);
  const amenities    = parseArr(turf.amenities);
  const avgRating    = parseFloat(turf.avg_rating   || 0);
  const totalReviews = parseInt(turf.total_reviews  || 0);

  return (
    <div className="min-h-screen bg-slate-50">

      {/* ── Hero ────────────────────────────────────── */}
      <div className="relative h-72 sm:h-96 overflow-hidden bg-gray-900">
        {images[0] ? (
          <img src={images[0]} alt={turf.name}
            className="w-full h-full object-cover opacity-80" />
        ) : (
          <div className="w-full h-full flex items-center justify-center
            bg-gradient-to-br from-green-800 to-green-600">
            <span className="text-8xl">🏟️</span>
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t
          from-black/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-wrap gap-2 mb-2">
              {sportTypes.map(s => (
                <span key={s}
                  className="badge bg-green-600 text-white capitalize">
                  {s}
                </span>
              ))}
              {turf.surface_type && (
                <span className="badge bg-white/20 text-white">
                  {turf.surface_type}
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-white mb-1">
              {turf.name}
            </h1>
            <p className="text-gray-200 flex items-center gap-1">
              📍 {turf.address}, {turf.city}
            </p>
          </div>
        </div>
        <button onClick={() => navigate(-1)}
          className="absolute top-4 left-4 bg-black/40 hover:bg-black/60
            text-white rounded-full w-10 h-10 flex items-center
            justify-center transition-colors backdrop-blur-sm">
          ←
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left Column ──────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">

            {/* Quick Info */}
            <div className="card p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                  { label: 'per hour',  value: `₹${parseFloat(turf.price_per_hour).toLocaleString()}`, bg: 'bg-green-50',  color: 'text-green-600'  },
                  { label: `${totalReviews} reviews`, value: avgRating > 0 ? `${avgRating.toFixed(1)} ★` : '—', bg: 'bg-yellow-50', color: 'text-yellow-600' },
                  { label: 'sports',   value: sportTypes.length, bg: 'bg-blue-50',   color: 'text-blue-600'   },
                  { label: 'bookings', value: turf.total_bookings || 0, bg: 'bg-purple-50', color: 'text-purple-600' },
                ].map(s => (
                  <div key={s.label}
                    className={`text-center p-3 ${s.bg} rounded-xl`}>
                    <p className={`text-xl font-bold ${s.color}`}>
                      {s.value}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>

              {/* Google Maps link */}
              <div className="flex flex-wrap gap-3 mt-4 pt-4
                border-t border-gray-100">
                <a href={getGoogleMapsUrl(turf)}
                  target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 bg-blue-50
                    hover:bg-blue-100 text-blue-700 font-semibold
                    px-4 py-2.5 rounded-xl border border-blue-200
                    transition-all text-sm">
                  <svg className="w-4 h-4" viewBox="0 0 24 24"
                    fill="currentColor">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7
                      13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0
                      9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5
                      2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                  </svg>
                  Get Directions on Google Maps
                </a>
              </div>
            </div>

            {/* Description */}
            {turf.description && (
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 mb-3">About</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {turf.description}
                </p>
              </div>
            )}

            {/* Amenities */}
            {amenities.length > 0 && (
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 mb-3">
                  Amenities
                </h3>
                <div className="flex flex-wrap gap-2">
                  {amenities.map(a => (
                    <span key={a}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700
                        rounded-full text-sm font-medium capitalize">
                      ✓ {a}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Reviews */}
            <div className="card p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900">
                  Reviews
                  {totalReviews > 0 && (
                    <span className="ml-2 text-gray-400 font-normal">
                      ({totalReviews})
                    </span>
                  )}
                </h3>
                {avgRating > 0 && (
                  <div className="flex items-center gap-1 bg-yellow-50
                    px-3 py-1.5 rounded-xl">
                    <span className="text-yellow-500">★</span>
                    <span className="font-bold text-gray-900">
                      {avgRating.toFixed(1)}
                    </span>
                    <span className="text-gray-400 text-sm">/ 5</span>
                  </div>
                )}
              </div>

              {/* Rating breakdown */}
              {(turf.reviews?.length ?? 0) > 0 && (
                <div className="mb-5 p-4 bg-gray-50 rounded-xl">
                  {[5,4,3,2,1].map(star => {
                    const count   = turf.reviews.filter(
                      r => r.rating === star
                    ).length;
                    const percent = turf.reviews.length
                      ? (count / turf.reviews.length) * 100 : 0;
                    return (
                      <div key={star}
                        className="flex items-center gap-3 mb-1.5">
                        <span className="text-xs text-gray-500 w-3">
                          {star}
                        </span>
                        <span className="text-yellow-400 text-xs">★</span>
                        <div className="flex-1 bg-gray-200 rounded-full h-2">
                          <div className="bg-yellow-400 h-2 rounded-full
                            transition-all duration-500"
                            style={{ width: `${percent}%` }} />
                        </div>
                        <span className="text-xs text-gray-400 w-4">
                          {count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}

              <ReviewForm
                turfId={id}
                user={user}
                onSubmitted={fetchTurf}
              />

              <div className="space-y-4 mt-5">
                {!turf.reviews?.length ? (
                  <div className="text-center py-8">
                    <div className="text-4xl mb-2">💬</div>
                    <p className="text-gray-400 text-sm">
                      No reviews yet. Be the first!
                    </p>
                  </div>
                ) : turf.reviews.map(r => (
                  <div key={r.id}
                    className="flex gap-3 pb-4 border-b border-gray-100
                      last:border-0">
                    <div className="w-9 h-9 rounded-full bg-green-100
                      flex items-center justify-center font-bold
                      text-green-700 text-sm flex-shrink-0">
                      {(r.reviewer_name || r.name || 'U')
                        .charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {r.reviewer_name || r.name}
                        </span>
                        <span className="text-xs text-gray-400">
                          {new Date(r.created_at)
                            .toLocaleDateString('en-IN', {
                              day: 'numeric', month: 'short',
                              year: 'numeric',
                            })}
                        </span>
                      </div>
                      <div className="flex gap-0.5 mb-1">
                        {[1,2,3,4,5].map(i => (
                          <span key={i} className={`text-sm
                            ${i <= r.rating
                              ? 'text-yellow-400' : 'text-gray-200'}`}>
                            ★
                          </span>
                        ))}
                      </div>
                      {r.comment && (
                        <p className="text-sm text-gray-600 leading-relaxed">
                          {r.comment}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right Column — Booking Widget ─────────── */}
          <div className="space-y-4">
            <div className="card p-5 lg:sticky lg:top-20">
              <h3 className="font-bold text-gray-900 mb-4">Book a Slot</h3>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700
                  rounded-xl px-4 py-3 mb-4 text-sm flex items-start gap-2">
                  <span className="flex-shrink-0">⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              {/* Date Tabs */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500
                  uppercase tracking-wider mb-2">
                  Select Date
                </p>
                <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                  {DATES.map(({ dateStr, dateObj, isToday }) => (
                    <button
                      key={dateStr}
                      onClick={() => handleDateSelect(dateStr)}
                      className={`flex-shrink-0 flex flex-col items-center
                        px-3 py-2 rounded-xl border-2 transition-all
                        min-w-[54px] focus:outline-none
                        ${selectedDate === dateStr
                          ? 'border-green-600 bg-green-600 text-white shadow-sm'
                          : 'border-gray-200 bg-white hover:border-green-300 text-gray-700'
                        }`}>
                      <span className="text-[10px] font-bold uppercase
                        tracking-wider leading-tight opacity-80">
                        {isToday ? 'Today' : dateObj.toLocaleDateString(
                          'en-IN', { weekday: 'short' }
                        )}
                      </span>
                      <span className="text-xl font-extrabold leading-tight">
                        {dateObj.getDate()}
                      </span>
                      <span className="text-[10px] opacity-70 leading-tight">
                        {dateObj.toLocaleDateString(
                          'en-IN', { month: 'short' }
                        )}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Slot Grid */}
              <div className="mb-4">
                <p className="text-xs font-semibold text-gray-500
                  uppercase tracking-wider mb-2">
                  Time Slots
                  {slots.length > 0 && (
                    <span className="ml-2 text-green-600 normal-case
                      font-medium">
                      ({slots.filter(s =>
                        s.status === 'available' ||
                        s.effective_status === 'available'
                      ).length} available)
                    </span>
                  )}
                </p>

                {slotsLoading ? (
                  <div className="flex flex-col items-center
                    justify-center py-10 gap-3">
                    <div className="animate-spin h-7 w-7 rounded-full
                      border-[3px] border-green-100 border-t-green-600" />
                    <p className="text-xs text-gray-400">
                      Loading slots...
                    </p>
                  </div>
                ) : slots.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <div className="text-3xl mb-2">📅</div>
                    <p className="text-gray-500 text-sm font-medium">
                      No slots available
                    </p>
                    <p className="text-gray-400 text-xs mt-1">
                      Try a different date or check back later
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 max-h-72
                    overflow-y-auto pr-1 scrollbar-thin
                    scrollbar-thumb-gray-200">
                    {slots.map(slot => {
                      const status   = slot.effective_status || slot.status;
                      const isBooked  = status === 'booked';
                      const isBlocked = status === 'blocked';
                      const isAvail   = !isBooked && !isBlocked;
                      const isSel     = selectedSlot?.id === slot.id;

                      return (
                        <button
                          key={slot.id}
                          type="button"
                          onClick={() => isAvail
                            ? setSelectedSlot(isSel ? null : slot)
                            : undefined
                          }
                          disabled={!isAvail}
                          className={`p-2.5 rounded-xl border-2 text-left
                            text-xs transition-all duration-150
                            focus:outline-none
                            ${isSel
                              ? 'border-green-600 bg-green-50 shadow-sm ring-2 ring-green-200'
                              : isBooked
                              ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed'
                              : isBlocked
                              ? 'border-gray-100 bg-gray-100 opacity-50 cursor-not-allowed'
                              : 'border-gray-200 bg-white hover:border-green-400 hover:bg-green-50 cursor-pointer active:scale-95'
                            }`}>
                          <p className={`font-bold text-xs leading-tight
                            ${isSel ? 'text-green-700'
                              : !isAvail ? 'text-gray-400'
                              : 'text-gray-800'}`}>
                            {formatTime(slot.start_time)}
                          </p>
                          <p className={`text-[10px] leading-tight mt-0.5
                            ${isSel ? 'text-green-600'
                              : !isAvail ? 'text-gray-400'
                              : 'text-gray-500'}`}>
                            {formatTime(slot.end_time)}
                          </p>
                          <div className="mt-1.5">
                            {isSel ? (
                              <span className="text-[9px] font-bold
                                text-green-700 bg-green-200 px-1.5 py-0.5
                                rounded-full">✓ Selected</span>
                            ) : isBooked ? (
                              <span className="text-[9px] font-bold
                                text-red-400 px-1.5 py-0.5">Booked</span>
                            ) : isBlocked ? (
                              <span className="text-[9px] font-bold
                                text-gray-400 px-1.5 py-0.5">Blocked</span>
                            ) : (
                              <span className="text-[9px] font-bold
                                text-green-600">
                                ₹{parseFloat(
                                  slot.price_per_hour ||
                                  turf.price_per_hour
                                ).toLocaleString()}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Booking Summary */}
              {selectedSlot && (
                <div className="bg-green-50 border border-green-200
                  rounded-xl p-3 mb-4">
                  <p className="font-semibold text-green-800 text-sm mb-2">
                    📋 Booking Summary
                  </p>
                  <div className="space-y-1.5 text-sm text-green-700">
                    <div className="flex justify-between">
                      <span>Time</span>
                      <span className="font-semibold">
                        {formatTime(selectedSlot.start_time)} –{' '}
                        {formatTime(selectedSlot.end_time)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Date</span>
                      <span className="font-semibold">
                        {(() => {
                          const [y, m, d] = selectedDate.split('-');
                          return new Date(
                            parseInt(y), parseInt(m) - 1, parseInt(d)
                          ).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'long',
                          });
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Turf fee</span>
                      <span>
                        ₹{parseFloat(turf.price_per_hour)
                          .toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between text-green-600
                      text-xs">
                      <span>Platform fee (10%)</span>
                      <span>
                        ₹{(parseFloat(turf.price_per_hour) * 0.10)
                          .toLocaleString('en-IN',
                            { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex justify-between font-bold
                      text-green-800 border-t border-green-200 pt-1.5">
                      <span>Total Payable</span>
                      <span>
                        ₹{(parseFloat(turf.price_per_hour) * 1.10)
                          .toLocaleString('en-IN',
                            { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Book Button */}
              <button
                onClick={handleBookSlot}
                disabled={!selectedSlot || booking}
                className="btn-primary w-full py-3.5 text-sm font-semibold
                  disabled:opacity-50 disabled:cursor-not-allowed">
                {booking ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4"
                      viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12"
                        r="10" stroke="currentColor" strokeWidth="4"/>
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z"/>
                    </svg>
                    Creating Booking...
                  </span>
                ) : selectedSlot
                  ? '🏟️ Book This Slot'
                  : 'Select a Slot to Book'}
              </button>

              {!user && (
                <p className="text-center text-xs text-gray-400 mt-3">
                  <Link to="/login"
                    className="text-green-600 font-semibold hover:underline">
                    Login
                  </Link>{' '}required to book
                </p>
              )}
            </div>

            {/* Location Card */}
            <div className="card overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 flex
                items-center justify-between">
                <h3 className="font-bold text-gray-900 text-sm">
                  📍 Location
                </h3>
                <a href={getGoogleMapsUrl(turf)}
                  target="_blank" rel="noopener noreferrer"
                  className="text-xs text-blue-600 hover:underline
                    font-medium">
                  Open in Maps →
                </a>
              </div>
              <div className="px-4 py-3 bg-gray-50">
                <p className="text-sm text-gray-600">
                  {turf.address}
                </p>
                <p className="text-sm text-gray-500 mt-0.5">
                  {turf.city}
                  {turf.state ? `, ${turf.state}` : ''}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TurfDetail;