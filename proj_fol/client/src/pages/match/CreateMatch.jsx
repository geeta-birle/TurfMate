import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { matchService } from '../../services/matchService';
import { bookingService } from '../../services/bookingService';
import Loader from '../../components/common/Loader';

const SPORTS = ['football','cricket','basketball','badminton','tennis','volleyball'];
const SKILLS = ['beginner','intermediate','advanced'];

const CreateMatch = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const bookingId = searchParams.get('booking');

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(!!bookingId);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [form, setForm] = useState({
    booking_id: bookingId || '',
    title: '',
    sport_type: 'football',
    team_size: 10,
    skill_level: 'beginner',
    visibility: 'open',
    description: '',
    cost_per_player: '',
  });
  useEffect(() => {
  if (bookingId) {
    setForm(prev => ({ ...prev, booking_id: bookingId }));
    fetchBooking();
  } else {
    setLoading(false);
  }
}, [bookingId]);
  
const fetchBooking = async () => {
  try {
    const { data } = await bookingService.getOne(bookingId);
    const b = data.data;
    setBooking(b);

    // Validate booking is confirmed + paid
    if (b.status !== 'confirmed') {
      setError(
        `Booking is ${b.status}. Please complete payment first.`
      );
    }
  } catch {
    setError('Booking not found or not authorized.');
  } finally {
    setLoading(false);
  }
};

  const handleChange = e => {
    const { name, value } = e.target;
    setForm(p => ({ ...p, [name]: value }));
    setError('');
  };
const handleSubmit = async (e) => {
  e.preventDefault();
  if (!form.title.trim()) { setError('Match title is required.'); return; }
  if (!form.booking_id) { setError('Please select a booking.'); return; }

  setSubmitting(true);
  setError('');
  try {
    const payload = {
      ...form,
      team_size: parseInt(form.team_size),
      cost_per_player: form.cost_per_player
        ? parseFloat(form.cost_per_player) : 0,
    };
    console.log('Creating match with payload:', payload); // ADD THIS
    const { data } = await matchService.create(payload);
    navigate(`/matches/${data.data.id}`);
  } catch (err) {
    console.log('Full error:', err.response?.data); // ADD THIS
    setError(err.response?.data?.message || 'Failed to create match.');
  } finally {
    setSubmitting(false);
  }
};

  if (loading) return <Loader center size="lg" />;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Create a Match 🏆
        </h1>
        <p className="text-gray-500 mt-1">
          Set up your match and invite players to join
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-5 text-sm">
          ⚠️ {error}
        </div>
      )}

      {/* Booking Info */}
      {booking && (
        <div className="card p-4 mb-6 bg-primary-50 border-primary-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex
              items-center justify-center text-xl">🏟️</div>
            <div>
              <p className="font-bold text-gray-900 text-sm">
                {booking.turf_name}
              </p>
              <p className="text-xs text-gray-600">
                📅 {new Date(booking.date).toLocaleDateString('en-IN',
                  { day: 'numeric', month: 'short' })}
                {' ⏰ '}{booking.start_time?.slice(0,5)}
                {' – '}{booking.end_time?.slice(0,5)}
              </p>
            </div>
            <span className="ml-auto badge bg-green-100 text-green-700
              font-semibold">✓ Confirmed</span>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="card p-6 space-y-6">

        {/* Booking ID (if no booking param) */}
        {!bookingId && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              Booking ID <span className="text-red-500">*</span>
            </label>
            <input type="text" name="booking_id"
              value={form.booking_id} onChange={handleChange}
              placeholder="Paste your confirmed booking ID"
              className="input" />
            <p className="text-xs text-gray-400 mt-1">
              You must have a confirmed & paid booking to create a match.
            </p>
          </div>
        )}

        {/* Title */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Match Title <span className="text-red-500">*</span>
          </label>
          <input type="text" name="title" value={form.title}
            onChange={handleChange}
            placeholder="e.g. Saturday Evening Football 5v5"
            className="input" maxLength={100} />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {form.title.length}/100
          </p>
        </div>

        {/* Sport + Skill */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Sport <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {SPORTS.map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(p => ({ ...p, sport_type: s }))}
                  className={`py-2 px-1 rounded-xl border text-xs font-semibold
                    capitalize transition-all text-center
                    ${form.sport_type === s
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Skill Level
            </label>
            <div className="space-y-2">
              {SKILLS.map(s => (
                <button key={s} type="button"
                  onClick={() => setForm(p => ({ ...p, skill_level: s }))}
                  className={`w-full py-2.5 rounded-xl border text-sm font-semibold
                    capitalize transition-all text-left px-4
                    ${form.skill_level === s
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                  {s === 'beginner' ? '🟢' : s === 'intermediate' ? '🟡' : '🔴'} {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Team Size */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Total Players Needed
            <span className="ml-2 text-primary-600 font-bold">
              {form.team_size}
            </span>
          </label>
          <input type="range" name="team_size"
            min={2} max={22} step={1}
            value={form.team_size}
            onChange={handleChange}
            className="w-full accent-primary-600 h-2 cursor-pointer" />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>2 players</span>
            <span>22 players</span>
          </div>
        </div>

        {/* Visibility */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Match Visibility
          </label>
          <div className="grid grid-cols-2 gap-3">
            {[
              { value: 'open', icon: '🌐', title: 'Open Match',
                desc: 'Anyone can discover & join' },
              { value: 'private', icon: '🔒', title: 'Private Match',
                desc: 'Only via invite code' },
            ].map(v => (
              <button key={v.value} type="button"
                onClick={() => setForm(p => ({ ...p, visibility: v.value }))}
                className={`p-4 rounded-xl border-2 text-left transition-all
                  ${form.visibility === v.value
                    ? 'border-primary-600 bg-primary-50'
                    : 'border-gray-200 hover:border-gray-300'}`}>
                <div className="text-2xl mb-1">{v.icon}</div>
                <div className="font-semibold text-gray-900 text-sm">
                  {v.title}
                </div>
                <div className="text-xs text-gray-500 mt-0.5">{v.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Cost Per Player */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Cost Per Player (₹)
            <span className="ml-2 text-xs text-gray-400 font-normal">
              Optional — leave 0 for free
            </span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2
              text-gray-500 font-semibold">₹</span>
            <input type="number" name="cost_per_player"
              value={form.cost_per_player} onChange={handleChange}
              placeholder="0" min={0} className="input pl-8" />
          </div>
          {form.cost_per_player > 0 && form.team_size > 1 && (
            <p className="text-xs text-primary-600 mt-1 font-medium">
              Total collected: ₹{(form.cost_per_player *
                form.team_size).toLocaleString()} from {form.team_size} players
            </p>
          )}
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1.5">
            Description
            <span className="ml-2 text-xs text-gray-400 font-normal">
              Optional
            </span>
          </label>
          <textarea name="description" value={form.description}
            onChange={handleChange} rows={3}
            placeholder="Any special rules, requirements or notes for players..."
            className="input resize-none" maxLength={300} />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {form.description.length}/300
          </p>
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting}
          className="btn-primary w-full py-3.5 text-base">
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"
                fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Creating Match...
            </span>
          ) : 'Create Match 🏆'}
        </button>
      </form>
    </div>
  );
};
export default CreateMatch;