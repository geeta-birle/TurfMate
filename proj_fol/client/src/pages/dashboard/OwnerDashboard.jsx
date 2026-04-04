import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line,
} from 'recharts';
import { turfService } from '../../services/turfService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

const OwnerDashboard = () => {
  const { user } = useAuth();
  const [turfs, setTurfs] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [t, b] = await Promise.all([
        turfService.getMine(),
        bookingService.getMine({ limit: 10 }),
      ]);
      setTurfs(t.data.data);
      setBookings(b.data.data);

      setAnalytics({
        daily_revenue: [
          { date: 'Mon', revenue: 2400, bookings: 3 },
          { date: 'Tue', revenue: 1398, bookings: 2 },
          { date: 'Wed', revenue: 4800, bookings: 5 },
          { date: 'Thu', revenue: 3908, bookings: 4 },
          { date: 'Fri', revenue: 5800, bookings: 6 },
          { date: 'Sat', revenue: 8000, bookings: 9 },
          { date: 'Sun', revenue: 7200, bookings: 8 },
        ],
      });
    } catch {}
    finally { setLoading(false); }
  };

  const totalRevenue = turfs.reduce((sum, t) =>
    sum + parseFloat(t.total_revenue || 0), 0);
  const totalBookings = turfs.reduce((sum, t) =>
    sum + parseInt(t.total_bookings || 0), 0);
  const activeTurfs = turfs.filter(t => t.is_active && t.is_approved).length;
  const pendingTurfs = turfs.filter(t => !t.is_approved).length;

  if (loading) return <Loader center size="lg" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center
        justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Owner Dashboard
          </h1>
          <p className="text-gray-500 mt-0.5">
            Welcome back, {user?.name?.split(' ')[0]}
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/turfs/create" className="btn-primary">
            + Add Turf
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '🏟️', label: 'My Turfs',
            value: turfs.length, color: 'bg-blue-50' },
          { icon: '✅', label: 'Active Turfs',
            value: activeTurfs, color: 'bg-green-50' },
          { icon: '📋', label: 'Total Bookings',
            value: totalBookings, color: 'bg-purple-50' },
          { icon: '💰', label: 'Total Revenue',
            value: `₹${totalRevenue.toLocaleString()}`, color: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="card p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${s.color} rounded-xl flex
              items-center justify-center text-2xl flex-shrink-0`}>
              {s.icon}
            </div>
            <div>
              <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
              <p className="text-sm text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Pending Approval Alert */}
      {pendingTurfs > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl
          px-5 py-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-semibold text-yellow-800">
              {pendingTurfs} turf{pendingTurfs > 1 ? 's' : ''} pending approval
            </p>
            <p className="text-sm text-yellow-600">
              Admin will review and approve your listing soon.
            </p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        {['overview', 'turfs', 'bookings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold
              capitalize transition-all
              ${activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && analytics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">
              Revenue This Week
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }}
                  tickFormatter={v => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Bar dataKey="revenue" fill="#16a34a" radius={[6,6,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">
              Bookings This Week
            </h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={analytics.daily_revenue}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip formatter={(v) => [v, 'Bookings']} />
                <Line type="monotone" dataKey="bookings"
                  stroke="#16a34a" strokeWidth={2.5}
                  dot={{ fill: '#16a34a', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Quick Actions */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { icon: '🏟️', label: 'Add New Turf',
                to: '/turfs/create', color: 'bg-green-50 hover:bg-green-100' },
              { icon: '📅', label: 'Manage Slots',
                to: turfs[0] ? `/turfs/${turfs[0].id}/manage` : '#',
                color: 'bg-blue-50 hover:bg-blue-100' },
              { icon: '📋', label: 'View Bookings',
                to: '#', color: 'bg-purple-50 hover:bg-purple-100',
                onClick: () => setActiveTab('bookings') },
              { icon: '👁️', label: 'View My Turfs',
                to: '#', color: 'bg-orange-50 hover:bg-orange-100',
                onClick: () => setActiveTab('turfs') },
            ].map(a => (
              a.onClick ? (
                <button key={a.label} onClick={a.onClick}
                  className={`${a.color} rounded-2xl p-4 text-center
                    transition-colors w-full`}>
                  <div className="text-3xl mb-2">{a.icon}</div>
                  <p className="text-sm font-semibold text-gray-700">
                    {a.label}
                  </p>
                </button>
              ) : (
                <Link key={a.label} to={a.to}
                  className={`${a.color} rounded-2xl p-4 text-center
                    transition-colors`}>
                  <div className="text-3xl mb-2">{a.icon}</div>
                  <p className="text-sm font-semibold text-gray-700">
                    {a.label}
                  </p>
                </Link>
              )
            ))}
          </div>
        </div>
      )}

      {/* Turfs Tab */}
      {activeTab === 'turfs' && (
        <div className="space-y-4">
          {turfs.length === 0 ? (
            <div className="text-center py-16 card">
              <div className="text-5xl mb-3">🏟️</div>
              <h3 className="font-bold text-gray-900 mb-2">No turfs yet</h3>
              <p className="text-gray-500 text-sm mb-4">
                Add your first turf to start receiving bookings
              </p>
              <Link to="/turfs/create" className="btn-primary">
                + Add Turf
              </Link>
            </div>
          ) : (
            turfs.map(turf => (
              <div key={turf.id} className="card p-5 flex flex-col
                sm:flex-row sm:items-center gap-4">

                {/* Turf Image / Icon */}
                <div className="w-16 h-16 bg-primary-50 rounded-xl
                  overflow-hidden flex-shrink-0">
                  {turf.images?.length ? (
                    <img src={turf.images[0]} alt={turf.name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center
                      justify-center text-3xl">🏟️</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{turf.name}</h3>
                    <span className={`badge text-xs font-semibold
                      ${turf.is_approved
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'}`}>
                      {turf.is_approved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                    {!turf.is_active && (
                      <span className="badge bg-red-100 text-red-700 text-xs">
                        Inactive
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    📍 {turf.city} · ₹{parseFloat(turf.price_per_hour)
                      .toLocaleString()}/hr
                  </p>
                  <div className="flex flex-wrap gap-3 mt-1.5 text-xs
                    text-gray-400">
                    <span>📋 {turf.total_bookings || 0} bookings</span>
                    <span>💰 ₹{parseFloat(turf.total_revenue || 0)
                      .toLocaleString()} revenue</span>
                    <span>⭐ {turf.avg_rating > 0
                      ? parseFloat(turf.avg_rating).toFixed(1)
                      : 'No reviews'}</span>
                  </div>

                  {/* Sport Tags */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {(Array.isArray(turf.sport_types)
                      ? turf.sport_types
                      : typeof turf.sport_types === 'string'
                      ? turf.sport_types.replace(/[{}"]/g, '').split(',')
                      : []
                    ).map(s => (
                      <span key={s} className="badge bg-primary-50
                        text-primary-700 capitalize text-xs">
                        {s.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Link to={`/turfs/${turf.id}`}
                    className="btn-secondary text-sm py-2 px-4">
                    👁 View
                  </Link>
                  <Link to={`/turfs/${turf.id}/manage`}
                    className="btn-primary text-sm py-2 px-4">
                    ⚙️ Manage
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <div className="space-y-3">
          {bookings.length === 0 ? (
            <div className="text-center py-12 card">
              <div className="text-4xl mb-2">📋</div>
              <p className="text-gray-400">No bookings yet</p>
            </div>
          ) : (
            bookings.map(b => (
              <Link key={b.id} to={`/bookings/${b.id}`}
                className="card p-4 flex items-center gap-4
                  hover:border-primary-200 group">

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm
                      group-hover:text-primary-600 transition-colors">
                      {b.turf_name}
                    </p>
                    <span className={`badge text-xs capitalize
                      ${b.status === 'confirmed'
                        ? 'bg-green-100 text-green-700'
                        : b.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : b.status === 'cancelled'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-blue-100 text-blue-700'}`}>
                      {b.status}
                    </span>
                    {b.payment_status === 'success' && (
                      <span className="badge bg-green-100 text-green-700
                        text-xs">✓ Paid</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    📅 {new Date(b.date).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short', year: 'numeric' })}
                    {' · ⏰ '}{b.start_time?.slice(0,5)}
                    {' – '}{b.end_time?.slice(0,5)}
                  </p>
                  {b.match_title && (
                    <p className="text-xs text-primary-600 font-medium mt-1">
                      🏆 {b.match_title}
                    </p>
                  )}
                </div>

                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900">
                    ₹{(parseFloat(b.total_amount) +
                      parseFloat(b.platform_fee)).toLocaleString()}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">total</p>
                </div>
              </Link>
            ))
          )}
        </div>
      )}
    </div>
  );
};
export default OwnerDashboard;