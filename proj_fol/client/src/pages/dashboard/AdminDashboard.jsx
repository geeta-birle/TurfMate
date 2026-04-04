import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts';
import Loader from '../../components/common/Loader';
import api from '../../services/api';

const COLORS = ['#16a34a','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [pendingTurfs, setPendingTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [actionMsg, setActionMsg] = useState('');

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [dashRes, analyticsRes, turfsRes] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/analytics?period=7'),
        api.get('/admin/turfs?is_approved=false'),
      ]);
      setStats(dashRes.data.data);
      setAnalytics(analyticsRes.data.data);
      setPendingTurfs(turfsRes.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const handleTurfAction = async (turfId, ownerId, approve) => {
    try {
      await api.put(`/admin/turfs/${turfId}/status`, {
        is_approved: approve,
        is_active: approve,
        reason: approve ? null : 'Does not meet platform guidelines',
      });
      setActionMsg(`Turf ${approve ? 'approved' : 'rejected'} successfully!`);
      setTimeout(() => setActionMsg(''), 3000);
      fetchData();
    } catch {
      setActionMsg('Action failed. Try again.');
    }
  };

  const handleUserAction = async (userId, isActive) => {
    try {
      await api.put(`/admin/users/${userId}/status`, {
        is_active: isActive,
        reason: isActive ? null : 'Policy violation',
      });
      setActionMsg(`User ${isActive ? 'activated' : 'suspended'}.`);
      setTimeout(() => setActionMsg(''), 3000);
    } catch {
      setActionMsg('Action failed.');
    }
  };

  if (loading) return <Loader center size="lg" />;
  if (!stats) return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-500">Failed to load dashboard.</p>
    </div>
  );

  const sportData = analytics?.sport_breakdown?.map(s => ({
    name: s.sport_type,
    value: parseInt(s.matches),
  })) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">
          Admin Dashboard
        </h1>
        <p className="text-gray-500 mt-0.5">Platform overview & management</p>
      </div>

      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700
          rounded-xl px-4 py-3 mb-5 text-sm">
          ✅ {actionMsg}
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[
          { icon: '👥', label: 'Total Users',
            value: stats.users.total, sub: `+${stats.users.new_this_month} this month`,
            color: 'bg-blue-50' },
          { icon: '🏟️', label: 'Total Turfs',
            value: stats.turfs.total,
            sub: `${stats.turfs.pending_approval} pending`,
            color: 'bg-green-50' },
          { icon: '📋', label: 'Total Bookings',
            value: stats.bookings.total,
            sub: `${stats.bookings.confirmed} confirmed`,
            color: 'bg-purple-50' },
          { icon: '💰', label: 'Platform Revenue',
            value: `₹${parseFloat(stats.revenue.total_platform_revenue)
              .toLocaleString()}`,
            sub: `₹${parseFloat(stats.revenue.this_month)
              .toLocaleString()} this month`,
            color: 'bg-orange-50' },
        ].map(s => (
          <div key={s.label} className="card p-5">
            <div className={`w-10 h-10 ${s.color} rounded-xl flex
              items-center justify-center text-xl mb-3`}>
              {s.icon}
            </div>
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-sm text-gray-500 mt-0.5">{s.label}</p>
            <p className="text-xs text-primary-600 font-medium mt-1">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit
        overflow-x-auto">
        {['overview', 'turfs', 'users', 'bookings'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`px-5 py-2 rounded-lg text-sm font-semibold
              capitalize transition-all whitespace-nowrap
              ${activeTab === tab
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'}`}>
            {tab}
            {tab === 'turfs' && pendingTurfs.length > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs
                rounded-full px-1.5 py-0.5">
                {pendingTurfs.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">
                Daily Revenue (7 days)
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics?.daily_revenue || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }}
                    tickFormatter={d => new Date(d)
                      .toLocaleDateString('en-IN', { weekday: 'short' })} />
                  <YAxis tick={{ fontSize: 11 }}
                    tickFormatter={v => `₹${v}`} />
                  <Tooltip
                    formatter={(v, n) => [
                      n === 'revenue' ? `₹${v}` : v,
                      n === 'revenue' ? 'Revenue' : 'Bookings'
                    ]} />
                  <Bar dataKey="revenue" fill="#16a34a" radius={[6,6,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Sport Breakdown */}
            <div className="card p-5">
              <h3 className="font-bold text-gray-900 mb-4">
                Matches by Sport
              </h3>
              {sportData.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={sportData} cx="50%" cy="50%"
                      innerRadius={55} outerRadius={85}
                      paddingAngle={3} dataKey="value">
                      {sportData.map((_, i) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(v, n) => [v, n]} />
                    <Legend iconType="circle" iconSize={8}
                      formatter={v => (
                        <span className="text-xs capitalize text-gray-600">
                          {v}
                        </span>
                      )} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-52">
                  <p className="text-gray-400 text-sm">No match data yet</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { label: 'Players', value: stats.users.players, icon: '👤' },
              { label: 'Owners', value: stats.users.owners, icon: '🏟️' },
              { label: 'Open Matches', value: stats.matches.open, icon: '⚽' },
              { label: 'Completed', value: stats.matches.completed, icon: '✅' },
            ].map(s => (
              <div key={s.label} className="card p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Turfs Tab */}
      {activeTab === 'turfs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-gray-900">
              Pending Approval ({pendingTurfs.length})
            </h2>
          </div>
          {pendingTurfs.length === 0 ? (
            <div className="text-center py-12 card">
              <div className="text-4xl mb-2">✅</div>
              <p className="text-gray-500">All turfs reviewed!</p>
            </div>
          ) : (
            pendingTurfs.map(turf => (
              <div key={turf.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start
                  gap-4">
                  <div className="w-16 h-16 bg-gray-100 rounded-xl
                    flex items-center justify-center text-3xl flex-shrink-0">
                    🏟️
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-gray-900">{turf.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      📍 {turf.address}, {turf.city}
                    </p>
                    <div className="flex flex-wrap gap-3 mt-2 text-xs
                      text-gray-500">
                      <span>👤 {turf.owner_name}</span>
                      <span>📧 {turf.owner_email}</span>
                      <span>📞 {turf.owner_phone}</span>
                      <span>💰 ₹{turf.price_per_hour}/hr</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {turf.sport_types?.map(s => (
                        <span key={s} className="badge bg-primary-50
                          text-primary-700 capitalize text-xs">{s}</span>
                      ))}
                      {turf.amenities?.map(a => (
                        <span key={a} className="badge bg-gray-100
                          text-gray-600 capitalize text-xs">{a}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleTurfAction(turf.id, turf.owner_id, true)}
                      className="bg-green-500 hover:bg-green-600 text-white
                        font-semibold px-4 py-2 rounded-xl text-sm
                        transition-colors">
                      ✓ Approve
                    </button>
                    <button
                      onClick={() => handleTurfAction(turf.id, turf.owner_id, false)}
                      className="bg-red-100 hover:bg-red-200 text-red-600
                        font-semibold px-4 py-2 rounded-xl text-sm
                        transition-colors">
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <UserManagement onAction={handleUserAction} />
      )}

      {/* Bookings Tab */}
      {activeTab === 'bookings' && (
        <BookingManagement />
      )}
    </div>
  );
};

// ── Sub Components ────────────────────────────────────────

const UserManagement = ({ onAction }) => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { fetchUsers(); }, [search, roleFilter]);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      const { data } = await api.get('/admin/users', { params });
      setUsers(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex gap-3 mb-5">
        <input type="text" placeholder="Search name or email..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="input flex-1" />
        <select value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="input w-36">
          <option value="">All Roles</option>
          <option value="player">Player</option>
          <option value="owner">Owner</option>
          <option value="admin">Admin</option>
        </select>
      </div>

      {loading ? <Loader center /> : (
        <div className="space-y-3">
          {users.map(u => (
            <div key={u.id} className="card p-4 flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary-100 flex
                items-center justify-center font-bold text-primary-700
                flex-shrink-0">
                {u.name?.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-gray-900 text-sm">
                    {u.name}
                  </p>
                  <span className={`badge text-xs capitalize
                    ${u.role === 'admin' ? 'bg-purple-100 text-purple-700'
                      : u.role === 'owner' ? 'bg-blue-100 text-blue-700'
                      : 'bg-gray-100 text-gray-600'}`}>
                    {u.role}
                  </span>
                  {!u.is_active && (
                    <span className="badge bg-red-100 text-red-700 text-xs">
                      Suspended
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{u.email}</p>
                <p className="text-xs text-gray-400">
                  {u.total_bookings} bookings · Joined{' '}
                  {new Date(u.created_at).toLocaleDateString('en-IN',
                    { month: 'short', year: 'numeric' })}
                </p>
              </div>
              <div className="flex gap-2 flex-shrink-0">
                {u.role !== 'admin' && (
                  <button
                    onClick={() => onAction(u.id, !u.is_active)}
                    className={`text-xs font-semibold px-3 py-1.5 rounded-lg
                      transition-colors
                      ${u.is_active
                        ? 'bg-red-100 hover:bg-red-200 text-red-600'
                        : 'bg-green-100 hover:bg-green-200 text-green-600'}`}>
                    {u.is_active ? 'Suspend' : 'Activate'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const BookingManagement = () => {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchBookings(); }, [statusFilter]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const { data } = await api.get('/admin/bookings', { params });
      setBookings(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  return (
    <div>
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {['', 'pending', 'confirmed', 'cancelled', 'completed'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-4 py-2 rounded-full text-sm font-semibold
              whitespace-nowrap border transition-all capitalize
              ${statusFilter === s
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      {loading ? <Loader center /> : (
        <div className="space-y-3">
          {bookings.map(b => (
            <div key={b.id} className="card p-4 flex items-center gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <p className="font-semibold text-gray-900 text-sm">
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
                </div>
                <p className="text-xs text-gray-500">
                  👤 {b.organizer_name} · 📅{' '}
                  {new Date(b.date).toLocaleDateString('en-IN',
                    { day: 'numeric', month: 'short' })}
                  {' · ⏰ '}{b.start_time?.slice(0,5)}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="font-bold text-gray-900 text-sm">
                  ₹{(parseFloat(b.total_amount) +
                    parseFloat(b.platform_fee)).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400">
                  Fee: ₹{parseFloat(b.platform_fee).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;