import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { turfService } from '../../services/turfService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

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

          {/* Reviews */}
          {turf.reviews?.length > 0 && (
            <div className="card p-6">
              <h3 className="font-bold text-gray-900 mb-4">
                Reviews ({turf.total_reviews})
              </h3>
              <div className="space-y-4">
                {turf.reviews.map(r => (
                  <div key={r.id} className="flex gap-3 pb-4
                    border-b border-gray-100 last:border-0">
                    <div className="w-9 h-9 rounded-full bg-gray-100 flex
                      items-center justify-center font-semibold text-gray-600
                      text-sm flex-shrink-0">
                      {r.reviewer_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-semibold text-gray-900 text-sm">
                          {r.reviewer_name}
                        </span>
                        <div className="flex">
                          {[1,2,3,4,5].map(i => (
                            <span key={i} className={`text-sm
                              ${i <= r.rating
                                ? 'text-yellow-400' : 'text-gray-200'}`}>★</span>
                          ))}
                        </div>
                      </div>
                      {r.comment && (
                        <p className="text-sm text-gray-600">{r.comment}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
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