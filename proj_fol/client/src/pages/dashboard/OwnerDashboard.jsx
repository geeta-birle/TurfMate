import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, LineChart, Line, Area, AreaChart,
} from 'recharts';
import { turfService } from '../../services/turfService';
import { bookingService } from '../../services/bookingService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

const CustomTooltip = ({ active, payload, label, prefix = '₹' }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg
      px-3 py-2 text-sm">
      <p className="text-gray-500 text-xs mb-1">{label}</p>
      {payload.map(p => (
        <p key={p.name} className="font-bold text-gray-900">
          {prefix}{typeof p.value === 'number'
            ? p.value.toLocaleString() : p.value}
        </p>
      ))}
    </div>
  );
};

export default function OwnerDashboard() {
  const { user } = useAuth();
  const [turfs, setTurfs]       = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const MOCK_REVENUE = [
    { day: 'Mon', revenue: 2400, bookings: 3 },
    { day: 'Tue', revenue: 1800, bookings: 2 },
    { day: 'Wed', revenue: 5200, bookings: 6 },
    { day: 'Thu', revenue: 3800, bookings: 4 },
    { day: 'Fri', revenue: 6100, bookings: 7 },
    { day: 'Sat', revenue: 9200, bookings: 11 },
    { day: 'Sun', revenue: 8400, bookings: 10 },
  ];

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [t, b] = await Promise.all([
        turfService.getMine(),
        bookingService.getMine({ limit: 20 }),
      ]);
      setTurfs(t.data.data);
      setBookings(b.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) return <Loader center size="lg" />;

  const totalRevenue  = turfs.reduce((s, t) =>
    s + parseFloat(t.total_revenue || 0), 0);
  const totalBookings = turfs.reduce((s, t) =>
    s + parseInt(t.total_bookings || 0), 0);
  const approved      = turfs.filter(t => t.is_active && t.is_approved).length;
  const pending       = turfs.filter(t => !t.is_approved).length;

  const stats = [
    { icon: '🏟️', label: 'My Turfs',       value: turfs.length,
      sub: `${approved} approved`,    color: 'bg-blue-50 text-blue-600' },
    { icon: '📋', label: 'Total Bookings',  value: totalBookings,
      sub: 'All time',                color: 'bg-purple-50 text-purple-600' },
    { icon: '💰', label: 'Total Revenue',
      value: `₹${totalRevenue.toLocaleString()}`,
      sub: 'Confirmed bookings',      color: 'bg-green-50 text-green-600' },
    { icon: '⭐', label: 'Avg Rating',
      value: turfs.length
        ? (turfs.reduce((s, t) =>
          s + parseFloat(t.avg_rating || 0), 0) / turfs.length).toFixed(1)
        : '—',
      sub: 'Across all turfs',        color: 'bg-amber-50 text-amber-600' },
  ];

  const parseArr = (val) => {
    if (Array.isArray(val)) return val;
    if (typeof val === 'string')
      return val.replace(/[{}"]/g,'').split(',').filter(Boolean);
    return [];
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-container py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center
          justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-gray-400 font-medium mb-1">
              Owner Dashboard
            </p>
            <h1 className="page-title">{user?.name}</h1>
          </div>
          <Link to="/turfs/create" className="btn-primary">
            + List New Turf
          </Link>
        </div>

        {/* Pending alert */}
        {pending > 0 && (
          <div className="alert-warning mb-6 animate-fade-up">
            <span className="text-xl flex-shrink-0">⏳</span>
            <div>
              <p className="font-semibold">
                {pending} turf{pending > 1 ? 's' : ''} awaiting approval
              </p>
              <p className="text-yellow-700 text-xs mt-0.5">
                Admin will review within 24 hours.
              </p>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={s.label}
              className="stat-card animate-fade-up"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500 font-medium">{s.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="tabs-bar mb-6">
          {['overview','turfs','bookings'].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`tab-btn capitalize ${activeTab === tab ? 'active' : ''}`}>
              {tab === 'overview' ? '📊 Overview'
                : tab === 'turfs' ? '🏟️ My Turfs'
                : '📋 Bookings'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Revenue Chart */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900">Revenue</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      This week
                    </p>
                  </div>
                  <span className="badge-green">
                    ↑ 12% vs last week
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={MOCK_REVENUE}>
                    <defs>
                      <linearGradient id="revGrad" x1="0" y1="0"
                        x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a"
                          stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#16a34a"
                          stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3"
                      stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false}
                      tickLine={false} tickFormatter={v => `₹${v}`} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="revenue"
                      stroke="#16a34a" strokeWidth={2.5}
                      fill="url(#revGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Bookings Chart */}
              <div className="card p-5">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <h3 className="font-bold text-gray-900">Bookings</h3>
                    <p className="text-xs text-gray-400 mt-0.5">
                      Daily count
                    </p>
                  </div>
                  <span className="badge-blue">
                    43 this week
                  </span>
                </div>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={MOCK_REVENUE} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3"
                      stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }}
                      axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 11 }} axisLine={false}
                      tickLine={false} />
                    <Tooltip content={
                      <CustomTooltip prefix="" />} />
                    <Bar dataKey="bookings" fill="#16a34a"
                      radius={[6,6,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Quick links */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: '➕', label: 'Add Turf',     to: '/turfs/create',    color: 'hover:border-green-300 hover:bg-green-50' },
                { icon: '⚙️', label: 'Manage Slots',
                  to: turfs[0] ? `/turfs/${turfs[0].id}/manage` : '#',      color: 'hover:border-blue-300 hover:bg-blue-50' },
                { icon: '📋', label: 'View Bookings',
                  onClick: () => setActiveTab('bookings'),                   color: 'hover:border-purple-300 hover:bg-purple-50' },
                { icon: '🏟️', label: 'View Turfs',
                  onClick: () => setActiveTab('turfs'),                      color: 'hover:border-orange-300 hover:bg-orange-50' },
              ].map(a => (
                a.onClick ? (
                  <button key={a.label} onClick={a.onClick}
                    className={`card p-4 border-2 border-gray-100
                      transition-all text-left group ${a.color}`}>
                    <div className="text-2xl mb-2
                      group-hover:scale-110 transition-transform">
                      {a.icon}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">
                      {a.label}
                    </p>
                  </button>
                ) : (
                  <Link key={a.label} to={a.to}
                    className={`card p-4 border-2 border-gray-100
                      transition-all group ${a.color}`}>
                    <div className="text-2xl mb-2
                      group-hover:scale-110 transition-transform">
                      {a.icon}
                    </div>
                    <p className="font-semibold text-gray-800 text-sm">
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
              <div className="card p-12 empty-state">
                <div className="empty-icon">🏟️</div>
                <p className="empty-title">No turfs listed yet</p>
                <p className="empty-desc">
                  Start earning by listing your first turf
                </p>
                <Link to="/turfs/create" className="btn-primary">
                  + List a Turf
                </Link>
              </div>
            ) : turfs.map(turf => (
              <div key={turf.id} className="card p-5 flex flex-col
                sm:flex-row sm:items-center gap-4
                hover:shadow-md transition-shadow">

                {/* Image */}
                <div className="w-full sm:w-20 h-32 sm:h-16 rounded-xl
                  overflow-hidden flex-shrink-0 bg-gray-100">
                  {parseArr(turf.images)[0] ? (
                    <img src={parseArr(turf.images)[0]}
                      alt={turf.name}
                      className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center
                      justify-center text-2xl">🏟️</div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900 truncate">
                      {turf.name}
                    </h3>
                    <span className={turf.is_approved
                      ? 'badge-green' : 'badge-yellow'}>
                      {turf.is_approved ? '✓ Approved' : '⏳ Pending'}
                    </span>
                    {!turf.is_active && (
                      <span className="badge-red">Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    📍 {turf.city} ·
                    ₹{parseFloat(turf.price_per_hour).toLocaleString()}/hr
                  </p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs
                    text-gray-400">
                    <span>📋 {turf.total_bookings || 0} bookings</span>
                    <span>💰 ₹{parseFloat(turf.total_revenue || 0)
                      .toLocaleString()} earned</span>
                    <span>⭐ {turf.avg_rating > 0
                      ? parseFloat(turf.avg_rating).toFixed(1)
                      : 'No reviews'}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 flex-shrink-0">
                  <Link to={`/turfs/${turf.id}`}
                    className="btn-secondary text-sm py-2 px-3">
                    View
                  </Link>
                  <Link to={`/turfs/${turf.id}/manage`}
                    className="btn-primary text-sm py-2 px-3">
                    ⚙️ Manage
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bookings Tab */}
        {activeTab === 'bookings' && (
          <div className="space-y-3">
            {bookings.length === 0 ? (
              <div className="card p-12 empty-state">
                <div className="empty-icon">📋</div>
                <p className="empty-title">No bookings yet</p>
                <p className="empty-desc">
                  Bookings will appear here once players book your turfs
                </p>
              </div>
            ) : bookings.map(b => (
              <Link key={b.id} to={`/bookings/${b.id}`}
                className="card p-4 flex items-center gap-4
                  hover:shadow-md transition-all group">
                <div className="w-10 h-10 bg-gray-100 rounded-xl flex
                  items-center justify-center text-lg flex-shrink-0
                  group-hover:scale-110 transition-transform">
                  🏟️
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm
                    truncate group-hover:text-green-600 transition-colors">
                    {b.turf_name}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    📅 {new Date(b.date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                    {' · ⏰ '}{b.start_time?.slice(0,5)}
                    {' – '}{b.end_time?.slice(0,5)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm">
                    ₹{(parseFloat(b.total_amount) +
                      parseFloat(b.platform_fee)).toLocaleString()}
                  </p>
                  <span className={b.status === 'confirmed'
                    ? 'badge-green' : b.status === 'pending'
                    ? 'badge-yellow' : b.status === 'cancelled'
                    ? 'badge-red' : 'badge-blue'}>
                    {b.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}