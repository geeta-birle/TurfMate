import { useState, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
  AreaChart, Area,
} from 'recharts';
import Loader from '../../components/common/Loader';
import api from '../../services/api';

const PIE_COLORS = ['#16a34a','#3b82f6','#f59e0b','#ef4444','#8b5cf6'];

export default function AdminDashboard() {
  const [stats, setStats]       = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [pending, setPending]   = useState([]);
  const [users, setUsers]       = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [msg, setMsg]           = useState('');
  const [search, setSearch]     = useState('');
  const [roleFilter, setRoleFilter] = useState('');

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    try {
      const [d, a, t] = await Promise.all([
        api.get('/admin/dashboard'),
        api.get('/admin/analytics?period=7'),
        api.get('/admin/turfs?is_approved=false'),
      ]);
      setStats(d.data.data);
      setAnalytics(a.data.data);
      setPending(t.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    const params = {};
    if (search) params.search = search;
    if (roleFilter) params.role = roleFilter;
    const { data } = await api.get('/admin/users', { params });
    setUsers(data.data);
  };

  const fetchBookings = async () => {
    const { data } = await api.get('/admin/bookings');
    setBookings(data.data);
  };

  useEffect(() => {
    if (activeTab === 'users') fetchUsers();
    if (activeTab === 'bookings') fetchBookings();
  }, [activeTab, search, roleFilter]);

  const toast = (m) => { setMsg(m); setTimeout(() => setMsg(''), 3000); };

  const approveTurf = async (id, approve) => {
    await api.put(`/admin/turfs/${id}/status`, {
      is_approved: approve, is_active: approve,
    });
    toast(`Turf ${approve ? 'approved ✅' : 'rejected ❌'}`);
    fetchAll();
  };

  const toggleUser = async (id, active) => {
    await api.put(`/admin/users/${id}/status`, { is_active: active });
    toast(`User ${active ? 'activated ✅' : 'suspended 🚫'}`);
    fetchUsers();
  };

  if (loading) return <Loader center size="lg" />;
  if (!stats)  return (
    <div className="flex items-center justify-center min-h-screen">
      <p className="text-gray-400">Failed to load dashboard.</p>
    </div>
  );

  const overviewStats = [
    { icon: '👥', label: 'Total Users',   value: stats.users.total,
      sub: `+${stats.users.new_this_month} this month`,
      color: 'bg-blue-50 text-blue-600' },
    { icon: '🏟️', label: 'Turfs',         value: stats.turfs.total,
      sub: `${stats.turfs.pending_approval} pending`,
      color: 'bg-green-50 text-green-600' },
    { icon: '📋', label: 'Bookings',       value: stats.bookings.total,
      sub: `${stats.bookings.confirmed} confirmed`,
      color: 'bg-purple-50 text-purple-600' },
    { icon: '💰', label: 'Platform Revenue',
      value: `₹${parseFloat(stats.revenue.total_platform_revenue)
        .toLocaleString()}`,
      sub: `₹${parseFloat(stats.revenue.this_month)
        .toLocaleString()} this month`,
      color: 'bg-amber-50 text-amber-600' },
  ];

  const sportData = (analytics?.sport_breakdown || []).map(s => ({
    name: s.sport_type,
    value: parseInt(s.matches),
  }));

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-container py-8">

        {/* Header */}
        <div className="mb-8">
          <p className="text-sm text-gray-400 font-medium mb-1">
            Admin Panel
          </p>
          <h1 className="page-title">Platform Overview</h1>
        </div>

        {msg && (
          <div className="alert-success mb-5 animate-fade-up">
            <span>✅</span> {msg}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {overviewStats.map((s, i) => (
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
        <div className="tabs-bar mb-6 overflow-x-auto">
          {[
            { id: 'overview',  label: '📊 Overview' },
            { id: 'turfs',     label: `🏟️ Pending (${pending.length})` },
            { id: 'users',     label: '👥 Users' },
            { id: 'bookings',  label: '📋 Bookings' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`tab-btn whitespace-nowrap
                ${activeTab === t.id ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Revenue Chart */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 mb-1">
                  Daily Revenue
                </h3>
                <p className="text-xs text-gray-400 mb-5">Last 7 days</p>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={analytics?.daily_revenue || []}>
                    <defs>
                      <linearGradient id="adminGrad" x1="0" y1="0"
                        x2="0" y2="1">
                        <stop offset="5%" stopColor="#16a34a"
                          stopOpacity={0.15}/>
                        <stop offset="95%" stopColor="#16a34a"
                          stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3"
                      stroke="#f0f0f0" vertical={false}/>
                    <XAxis dataKey="date" tick={{ fontSize: 11 }}
                      axisLine={false} tickLine={false}
                      tickFormatter={d => new Date(d)
                        .toLocaleDateString('en-IN',
                          { weekday: 'short' })}/>
                    <YAxis tick={{ fontSize: 11 }} axisLine={false}
                      tickLine={false}
                      tickFormatter={v => `₹${v}`}/>
                    <Tooltip formatter={v => [`₹${v}`, 'Revenue']}/>
                    <Area type="monotone" dataKey="revenue"
                      stroke="#16a34a" strokeWidth={2.5}
                      fill="url(#adminGrad)" dot={false}/>
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Sport Pie */}
              <div className="card p-5">
                <h3 className="font-bold text-gray-900 mb-1">
                  Matches by Sport
                </h3>
                <p className="text-xs text-gray-400 mb-3">
                  All time breakdown
                </p>
                {sportData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie data={sportData} cx="50%" cy="50%"
                        innerRadius={50} outerRadius={80}
                        paddingAngle={3} dataKey="value">
                        {sportData.map((_, i) => (
                          <Cell key={i}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}/>
                        ))}
                      </Pie>
                      <Tooltip/>
                      <Legend iconType="circle" iconSize={8}
                        formatter={v => (
                          <span style={{ fontSize: 12,
                            textTransform: 'capitalize' }}>{v}</span>
                        )}/>
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-48">
                    <p className="text-gray-400 text-sm">
                      No match data yet
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Platform quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { icon: '👤', label: 'Players',     value: stats.users.players },
                { icon: '🏟️', label: 'Owners',      value: stats.users.owners },
                { icon: '⚽', label: 'Open Matches', value: stats.matches.open },
                { icon: '✅', label: 'Completed',    value: stats.matches.completed },
              ].map(s => (
                <div key={s.label} className="card p-4 text-center">
                  <div className="text-2xl mb-2">{s.icon}</div>
                  <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                  <p className="text-xs text-gray-400">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PENDING TURFS */}
        {activeTab === 'turfs' && (
          <div className="space-y-4">
            {pending.length === 0 ? (
              <div className="card p-12 empty-state">
                <div className="empty-icon">✅</div>
                <p className="empty-title">All turfs reviewed!</p>
                <p className="empty-desc">No pending approvals.</p>
              </div>
            ) : pending.map(turf => (
              <div key={turf.id} className="card p-5">
                <div className="flex flex-col sm:flex-row sm:items-start
                  gap-4">
                  <div className="w-full sm:w-24 h-20 sm:h-16 rounded-xl
                    overflow-hidden bg-gray-100 flex-shrink-0">
                    <div className="w-full h-full flex items-center
                      justify-center text-3xl">🏟️</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-bold text-gray-900">
                        {turf.name}
                      </h3>
                      <span className="badge-yellow">⏳ Pending Review</span>
                    </div>
                    <p className="text-sm text-gray-500">
                      📍 {turf.address}, {turf.city}
                    </p>
                    <div className="flex flex-wrap gap-4 mt-2 text-xs
                      text-gray-400">
                      <span>👤 {turf.owner_name}</span>
                      <span>📧 {turf.owner_email}</span>
                      <span>💰 ₹{turf.price_per_hour}/hr</span>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button onClick={() => approveTurf(turf.id, true)}
                      className="btn-primary text-sm py-2 px-4
                        bg-green-600">
                      ✓ Approve
                    </button>
                    <button onClick={() => approveTurf(turf.id, false)}
                      className="btn-danger text-sm py-2 px-4">
                      ✕ Reject
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* USERS */}
        {activeTab === 'users' && (
          <div>
            <div className="flex gap-3 mb-5">
              <div className="relative flex-1">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2
                  w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24"
                  stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0
                    11-14 0 7 7 0 0114 0z"/>
                </svg>
                <input type="text" placeholder="Search name or email..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-10" />
              </div>
              <select value={roleFilter}
                onChange={e => setRoleFilter(e.target.value)}
                className="input w-36">
                <option value="">All Roles</option>
                <option value="player">Player</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
              </select>
            </div>

            <div className="space-y-3">
              {users.map(u => (
                <div key={u.id} className="card p-4 flex items-center
                  gap-4">
                  <div className="w-10 h-10 bg-green-600 rounded-xl flex
                    items-center justify-center text-white font-bold
                    text-sm flex-shrink-0">
                    {u.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-gray-900 text-sm">
                        {u.name}
                      </p>
                      <span className={
                        u.role === 'admin' ? 'badge-purple'
                        : u.role === 'owner' ? 'badge-blue'
                        : 'badge-gray'}>
                        {u.role}
                      </span>
                      {!u.is_active && (
                        <span className="badge-red">Suspended</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {u.email} ·{' '}
                      {u.total_bookings} bookings
                    </p>
                  </div>
                  {u.role !== 'admin' && (
                    <button
                      onClick={() => toggleUser(u.id, !u.is_active)}
                      className={`text-xs font-semibold px-3 py-1.5
                        rounded-lg transition-colors flex-shrink-0
                        ${u.is_active
                          ? 'bg-red-50 hover:bg-red-100 text-red-600 border border-red-200'
                          : 'bg-green-50 hover:bg-green-100 text-green-600 border border-green-200'}`}>
                      {u.is_active ? 'Suspend' : 'Activate'}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* BOOKINGS */}
        {activeTab === 'bookings' && (
          <div className="space-y-3">
            {bookings.map(b => (
              <div key={b.id} className="card p-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <p className="font-semibold text-gray-900 text-sm">
                      {b.turf_name}
                    </p>
                    <span className={b.status === 'confirmed'
                      ? 'badge-green' : b.status === 'pending'
                      ? 'badge-yellow' : b.status === 'cancelled'
                      ? 'badge-red' : 'badge-blue'}>
                      {b.status}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400">
                    👤 {b.organizer_name} ·
                    📅 {new Date(b.date).toLocaleDateString('en-IN', {
                      day: 'numeric', month: 'short', year: 'numeric'
                    })}
                    {' · ⏰ '}{b.start_time?.slice(0,5)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-gray-900 text-sm">
                    ₹{(parseFloat(b.total_amount) +
                      parseFloat(b.platform_fee)).toLocaleString()}
                  </p>
                  <p className="text-[10px] text-gray-400">
                    Fee: ₹{parseFloat(b.platform_fee).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}