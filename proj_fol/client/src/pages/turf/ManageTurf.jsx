import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { turfService } from '../../services/turfService';
import { bookingService } from '../../services/bookingService';
import Loader from '../../components/common/Loader';

const DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const ManageTurf = () => {
  const { id } = useParams();
  const [turf, setTurf] = useState(null);
  const [slots, setSlots] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('slots');
  const [generating, setGenerating] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [genForm, setGenForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
    open_time: '06:00',
    close_time: '22:00',
    slot_duration: 60,
    days_of_week: [0,1,2,3,4,5,6],
  });

  useEffect(() => { fetchData(); }, [id]);
  useEffect(() => { fetchSlots(); }, [selectedDate]);

  const fetchData = async () => {
    try {
      const [turfRes, bookingsRes] = await Promise.all([
        turfService.getOne(id),
        bookingService.getTurfBookings(id, { limit: 20 }),
      ]);
      setTurf(turfRes.data.data);
      setBookings(bookingsRes.data.data);
    } catch (err) {
      setError('Failed to load turf data.');
    } finally {
      setLoading(false);
    }
  };

  const fetchSlots = async () => {
    try {
      const { data } = await turfService.getSlots(id, { date: selectedDate });
      setSlots(data.data);
    } catch {}
  };

  const handleGenerate = async (e) => {
    e.preventDefault();
    setGenerating(true);
    setError('');
    try {
      const { data } = await turfService.generateSlots(id, genForm);
      setSuccess(`${data.data.total_generated} slots generated successfully!`);
      fetchSlots();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Generation failed.');
    } finally {
      setGenerating(false);
    }
  };

  const handleSlotStatus = async (slotId, status) => {
    try {
      await turfService.updateSlot(id, slotId, { status });
      fetchSlots();
      setSuccess(`Slot ${status === 'blocked' ? 'blocked' : 'unblocked'} successfully!`);
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      setError('Failed to update slot.');
    }
  };

  const toggleDay = (day) => {
    setGenForm(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort(),
    }));
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  const next7Days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    return d;
  });

  const slotStats = {
    available: slots.filter(s => s.status === 'available').length,
    booked:    slots.filter(s => s.status === 'booked').length,
    blocked:   slots.filter(s => s.status === 'blocked').length,
  };

  if (loading) return <Loader center size="lg" />;
  if (!turf) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-6xl">😕</div>
      <p className="text-gray-500 text-xl">Turf not found.</p>
      <Link to="/dashboard/owner" className="btn-primary">Back to Dashboard</Link>
    </div>
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        <span>›</span>
        <Link to="/dashboard/owner" className="hover:text-primary-600">My Turfs</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium">{turf.name}</span>
      </nav>

      {/* Alerts */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700
          rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2">
          ✅ {success}
          <button onClick={() => setSuccess('')} className="ml-auto">✕</button>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2">
          ⚠️ {error}
          <button onClick={() => setError('')} className="ml-auto">✕</button>
        </div>
      )}

      {/* Turf Header Card */}
      <div className="card p-5 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="w-14 h-14 bg-primary-100 rounded-xl flex
            items-center justify-center text-3xl flex-shrink-0">🏟️</div>
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900">
                {turf.name}
              </h1>
              <span className={`badge font-semibold text-xs
                ${turf.is_approved
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'}`}>
                {turf.is_approved ? '✓ Approved' : '⏳ Pending Approval'}
              </span>
              {!turf.is_active && (
                <span className="badge bg-red-100 text-red-700 text-xs">
                  Inactive
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500">
              📍 {turf.address}, {turf.city} ·
              ₹{parseFloat(turf.price_per_hour).toLocaleString()}/hr ·
              ⭐ {turf.avg_rating > 0
                ? parseFloat(turf.avg_rating).toFixed(1)
                : 'No reviews yet'}
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Link to={`/turfs/${id}`}
              className="btn-secondary text-sm py-2 px-4">
              👁 View Public
            </Link>
          </div>
        </div>
      </div>

      {/* Pending Approval Warning */}
      {!turf.is_approved && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl
          p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-semibold text-yellow-800 text-sm">
              Pending Admin Approval
            </p>
            <p className="text-yellow-600 text-xs mt-0.5">
              Your turf is under review. You can still add slots but they
              won't be visible until approved.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {[
          { key: 'slots',    label: '📅 Slots' },
          { key: 'generate', label: '⚡ Generate' },
          { key: 'bookings', label: '📋 Bookings' },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold
              transition-all whitespace-nowrap
              ${activeTab === tab.key
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── SLOTS TAB ───────────────────────────────── */}
      {activeTab === 'slots' && (
        <div>
          {/* Date Selector */}
          <div className="flex gap-2 overflow-x-auto pb-2 mb-5">
            {next7Days.map((d, i) => {
              const dateStr = d.toISOString().split('T')[0];
              const isSelected = selectedDate === dateStr;
              return (
                <button key={i} onClick={() => setSelectedDate(dateStr)}
                  className={`flex flex-col items-center py-2.5 px-3
                    rounded-xl border transition-all flex-shrink-0 min-w-[52px]
                    ${isSelected
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                  <span className="text-xs font-medium">
                    {DAYS[d.getDay()]}
                  </span>
                  <span className={`text-lg font-bold mt-0.5
                    ${isSelected ? 'text-white' : 'text-gray-900'}`}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Slot Stats */}
          <div className="grid grid-cols-3 gap-3 mb-5">
            {[
              { label: 'Available', count: slotStats.available,
                bg: 'bg-green-50', text: 'text-green-700',
                badge: 'bg-green-100 text-green-800' },
              { label: 'Booked', count: slotStats.booked,
                bg: 'bg-blue-50', text: 'text-blue-700',
                badge: 'bg-blue-100 text-blue-800' },
              { label: 'Blocked', count: slotStats.blocked,
                bg: 'bg-red-50', text: 'text-red-700',
                badge: 'bg-red-100 text-red-800' },
            ].map(s => (
              <div key={s.label} className={`${s.bg} rounded-xl p-4 text-center`}>
                <p className={`text-3xl font-extrabold ${s.text}`}>
                  {s.count}
                </p>
                <p className={`text-xs font-semibold ${s.text} mt-0.5`}>
                  {s.label}
                </p>
              </div>
            ))}
          </div>

          {/* Slots Grid */}
          {slots.length === 0 ? (
            <div className="text-center py-16 card">
              <div className="text-5xl mb-3">📅</div>
              <h3 className="font-bold text-gray-900 mb-2">
                No slots for this date
              </h3>
              <p className="text-gray-400 text-sm mb-4">
                Use the Generate tab to create slots for this turf
              </p>
              <button onClick={() => setActiveTab('generate')}
                className="btn-primary">
                ⚡ Generate Slots
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4
              xl:grid-cols-5 gap-3">
              {slots.map(slot => (
                <div key={slot.id}
                  className={`rounded-xl border-2 p-3 flex flex-col gap-2
                    transition-all
                    ${slot.status === 'available'
                      ? 'bg-green-50 border-green-200'
                      : slot.status === 'booked'
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-red-50 border-red-200'}`}>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">
                      {formatTime(slot.start_time)}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      → {formatTime(slot.end_time)}
                    </p>
                  </div>
                  <span className={`badge text-xs font-semibold capitalize
                    self-start
                    ${slot.status === 'available'
                      ? 'bg-green-200 text-green-800'
                      : slot.status === 'booked'
                      ? 'bg-blue-200 text-blue-800'
                      : 'bg-red-200 text-red-800'}`}>
                    {slot.status}
                  </span>
                  {slot.status !== 'booked' && (
                    <button
                      onClick={() => handleSlotStatus(
                        slot.id,
                        slot.status === 'blocked' ? 'available' : 'blocked'
                      )}
                      className={`text-xs font-semibold py-1.5 px-2
                        rounded-lg transition-colors w-full text-center
                        ${slot.status === 'blocked'
                          ? 'bg-green-200 hover:bg-green-300 text-green-800'
                          : 'bg-red-200 hover:bg-red-300 text-red-800'}`}>
                      {slot.status === 'blocked' ? '🔓 Unblock' : '🔒 Block'}
                    </button>
                  )}
                  {slot.status === 'booked' && (
                    <span className="text-xs text-blue-600 font-medium
                      text-center">
                      Reserved
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── GENERATE TAB ────────────────────────────── */}
      {activeTab === 'generate' && (
        <div className="max-w-2xl">
          <div className="card p-6">
            <h3 className="font-bold text-gray-900 mb-1">
              Auto-Generate Slots
            </h3>
            <p className="text-gray-500 text-sm mb-6">
              Automatically create time slots for a date range.
              Existing slots won't be duplicated.
            </p>

            <form onSubmit={handleGenerate} className="space-y-5">
              {/* Date Range */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold
                    text-gray-700 mb-1.5">Start Date</label>
                  <input type="date" value={genForm.start_date}
                    onChange={e => setGenForm(p => ({
                      ...p, start_date: e.target.value }))}
                    className="input"
                    min={new Date().toISOString().split('T')[0]} />
                </div>
                <div>
                  <label className="block text-sm font-semibold
                    text-gray-700 mb-1.5">End Date</label>
                  <input type="date" value={genForm.end_date}
                    onChange={e => setGenForm(p => ({
                      ...p, end_date: e.target.value }))}
                    className="input"
                    min={genForm.start_date} />
                </div>
              </div>

              {/* Times */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold
                    text-gray-700 mb-1.5">Opening Time</label>
                  <input type="time" value={genForm.open_time}
                    onChange={e => setGenForm(p => ({
                      ...p, open_time: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="block text-sm font-semibold
                    text-gray-700 mb-1.5">Closing Time</label>
                  <input type="time" value={genForm.close_time}
                    onChange={e => setGenForm(p => ({
                      ...p, close_time: e.target.value }))}
                    className="input" />
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-semibold
                  text-gray-700 mb-1.5">Slot Duration</label>
                <div className="flex gap-2">
                  {[30, 60, 90, 120].map(d => (
                    <button key={d} type="button"
                      onClick={() => setGenForm(p => ({
                        ...p, slot_duration: d }))}
                      className={`flex-1 py-2.5 rounded-xl border-2
                        text-sm font-semibold transition-all
                        ${genForm.slot_duration === d
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                      {d}m
                    </button>
                  ))}
                </div>
              </div>

              {/* Days of Week */}
              <div>
                <label className="block text-sm font-semibold
                  text-gray-700 mb-2">Days of Week</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day, i) => (
                    <button key={i} type="button"
                      onClick={() => toggleDay(i)}
                      className={`w-12 h-12 rounded-xl border-2 text-xs
                        font-bold transition-all
                        ${genForm.days_of_week.includes(i)
                          ? 'bg-primary-600 text-white border-primary-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                      {day}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {genForm.days_of_week.length} days selected
                </p>
              </div>

              {/* Preview */}
              <div className="bg-primary-50 border border-primary-100
                rounded-xl p-4">
                <p className="text-sm font-semibold text-gray-900 mb-2">
                  Preview
                </p>
                <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                  <div>📅 {genForm.start_date} → {genForm.end_date}</div>
                  <div>⏰ {genForm.open_time} – {genForm.close_time}</div>
                  <div>⏱ {genForm.slot_duration} min slots</div>
                  <div>📆 {genForm.days_of_week.length} days/week</div>
                </div>
              </div>

              <button type="submit" disabled={generating}
                className="btn-primary w-full py-3 text-base">
                {generating ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"
                      fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10"
                        stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Generating...
                  </span>
                ) : '⚡ Generate Slots'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ── BOOKINGS TAB ────────────────────────────── */}
      {activeTab === 'bookings' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900">
              Recent Bookings ({bookings.length})
            </h3>
          </div>

          {bookings.length === 0 ? (
            <div className="text-center py-16 card">
              <div className="text-5xl mb-3">📋</div>
              <h3 className="font-bold text-gray-900 mb-2">
                No bookings yet
              </h3>
              <p className="text-gray-400 text-sm">
                Bookings will appear here once players start booking
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {bookings.map(b => (
                <div key={b.id} className="card p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center
                    gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-semibold text-gray-900 text-sm">
                          {b.organizer_name}
                        </p>
                        <span className={`badge text-xs capitalize
                          ${b.status === 'confirmed'
                            ? 'bg-green-100 text-green-700'
                            : b.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : b.status === 'completed'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-yellow-100 text-yellow-700'}`}>
                          {b.status}
                        </span>
                        {b.match_title && (
                          <span className="badge bg-purple-100
                            text-purple-700 text-xs">
                            🏆 {b.match_title}
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs
                        text-gray-500">
                        <span>
                          📅 {new Date(b.date).toLocaleDateString('en-IN',
                            { day: 'numeric', month: 'short',
                              year: 'numeric' })}
                        </span>
                        <span>
                          ⏰ {b.start_time?.slice(0,5)}
                          {' – '}{b.end_time?.slice(0,5)}
                        </span>
                        {b.organizer_phone && (
                          <span>📞 {b.organizer_phone}</span>
                        )}
                        {b.current_players && (
                          <span>
                            👥 {b.current_players}/{b.team_size} players
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      <div className="text-right">
                        <p className="font-bold text-gray-900">
                          ₹{parseFloat(b.total_amount).toLocaleString()}
                        </p>
                        <p className="text-xs text-gray-400">booking</p>
                      </div>
                      {b.match_id && (
                        <Link to={`/matches/${b.match_id}`}
                          className="btn-secondary text-xs py-1.5 px-3">
                          View Match
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
export default ManageTurf;