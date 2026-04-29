import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

const STATUS_BADGE = {
  confirmed: 'badge-green',
  pending:   'badge-yellow',
  cancelled: 'badge-red',
  completed: 'badge-blue',
};

const MATCH_STATUS = {
  open:      'badge-green',
  full:      'badge-red',
  completed: 'badge-blue',
  cancelled: 'badge-gray',
};

export default function PlayerDashboard() {
  const { user } = useAuth();
  const [bookings, setBookings]   = useState([]);
  const [matches, setMatches]     = useState([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [b, m] = await Promise.all([
        bookingService.getMine({ limit: 5 }),
        matchService.getMine({ limit: 5 }),
      ]);
      setBookings(b.data.data);
      setMatches(m.data.data);
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) return <Loader center size="lg" />;

  const confirmed  = bookings.filter(b => b.status === 'confirmed').length;
  const upcoming   = matches.filter(m =>
    ['open','full'].includes(m.status)).length;
  const totalSpent = bookings
    .filter(b => b.status === 'confirmed')
    .reduce((s, b) => s + parseFloat(b.total_amount || 0) +
      parseFloat(b.platform_fee || 0), 0);

  const stats = [
    { icon: '📋', label: 'Total Bookings',  value: bookings.length,
      color: 'bg-blue-50 text-blue-600',   to: '/bookings/my' },
    { icon: '✅', label: 'Confirmed',        value: confirmed,
      color: 'bg-green-50 text-green-600', to: '/bookings/my?status=confirmed' },
    { icon: '🏆', label: 'My Matches',       value: matches.length,
      color: 'bg-purple-50 text-purple-600', to: '/matches/my' },
    { icon: '📅', label: 'Upcoming',         value: upcoming,
      color: 'bg-orange-50 text-orange-600', to: '/matches/my' },
  ];

  const quickActions = [
    { icon: '🏟️', label: 'Book a Turf',   to: '/turfs',
      desc: 'Find & reserve your slot', color: 'border-green-200 hover:border-green-400 hover:bg-green-50' },
    { icon: '⚽', label: 'Find Matches',  to: '/matches',
      desc: 'Join open games near you', color: 'border-blue-200 hover:border-blue-400 hover:bg-blue-50' },
    { icon: '👤', label: 'My Profile',    to: '/profile',
      desc: 'Update your details',      color: 'border-purple-200 hover:border-purple-400 hover:bg-purple-50' },
    { icon: '🔔', label: 'Notifications', to: '/notifications',
      desc: 'View all updates',         color: 'border-orange-200 hover:border-orange-400 hover:bg-orange-50' },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-container py-8">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center
          justify-between gap-4 mb-8">
          <div>
            <p className="text-sm text-gray-400 font-medium mb-1">
              Welcome back 👋
            </p>
            <h1 className="page-title">{user?.name}</h1>
            <p className="text-gray-500 mt-0.5 text-sm">
              {user?.city && `📍 ${user.city} · `}
              <span className="capitalize">{user?.skill_level} player</span>
            </p>
          </div>
          <div className="flex gap-3">
            <Link to="/matches" className="btn-secondary text-sm">
              Find Match
            </Link>
            <Link to="/turfs" className="btn-primary text-sm">
              Book Turf
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((s, i) => (
            <Link key={s.label} to={s.to}
              className="stat-card hover:shadow-md transition-all
                duration-200 group animate-fade-up"
              style={{ animationDelay: `${i * 0.08}s` }}>
              <div className={`stat-icon ${s.color}`}>{s.icon}</div>
              <div>
                <p className="text-2xl font-bold text-gray-900
                  group-hover:text-green-600 transition-colors">
                  {s.value}
                </p>
                <p className="text-xs text-gray-500 font-medium">
                  {s.label}
                </p>
              </div>
            </Link>
          ))}
        </div>

        {/* Total spent banner */}
        {totalSpent > 0 && (
          <div className="card p-4 mb-6 bg-gradient-to-r from-green-600
            to-green-700 border-0 text-white flex items-center
            justify-between animate-fade-up delay-300">
            <div>
              <p className="text-green-100 text-sm font-medium">
                Total spent on bookings
              </p>
              <p className="text-2xl font-bold">
                ₹{totalSpent.toLocaleString()}
              </p>
            </div>
            <div className="text-4xl opacity-80">💳</div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">

          {/* Recent Bookings */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">Recent Bookings</h2>
              <Link to="/bookings/my"
                className="text-xs text-green-600 font-semibold
                  hover:text-green-700 transition-colors">
                View all →
              </Link>
            </div>
            {bookings.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-icon">🏟️</div>
                <p className="empty-title">No bookings yet</p>
                <p className="empty-desc">Book your first turf slot</p>
                <Link to="/turfs" className="btn-primary text-sm">
                  Browse Turfs
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {bookings.map(b => (
                  <Link key={b.id} to={`/bookings/${b.id}`}
                    className="flex items-center gap-3 p-3 rounded-xl
                      hover:bg-gray-50 transition-colors group">
                    <div className="w-10 h-10 bg-green-50 rounded-xl
                      flex items-center justify-center flex-shrink-0
                      text-xl group-hover:scale-110 transition-transform">
                      🏟️
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900
                        truncate group-hover:text-green-600 transition-colors">
                        {b.turf_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(b.date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short'
                        })} · {b.start_time?.slice(0,5)}
                      </p>
                    </div>
                    <span className={STATUS_BADGE[b.status] || 'badge-gray'}>
                      {b.status}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* My Matches */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900">My Matches</h2>
              <Link to="/matches/my"
                className="text-xs text-green-600 font-semibold
                  hover:text-green-700 transition-colors">
                View all →
              </Link>
            </div>
            {matches.length === 0 ? (
              <div className="empty-state py-10">
                <div className="empty-icon">⚽</div>
                <p className="empty-title">No matches yet</p>
                <p className="empty-desc">
                  Join an open match or create your own
                </p>
                <Link to="/matches" className="btn-primary text-sm">
                  Find Matches
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {matches.map(m => {
                  const fill = (m.current_players / m.team_size) * 100;
                  return (
                    <Link key={m.id} to={`/matches/${m.id}`}
                      className="flex items-center gap-3 p-3 rounded-xl
                        hover:bg-gray-50 transition-colors group">
                      <div className="w-10 h-10 bg-purple-50 rounded-xl
                        flex items-center justify-center flex-shrink-0
                        text-xl group-hover:scale-110 transition-transform">
                        🏆
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900
                          truncate group-hover:text-green-600 transition-colors">
                          {m.title}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <div className="progress-bar flex-1">
                            <div className={`progress-fill
                              ${fill >= 100 ? 'bg-red-400'
                                : fill >= 75 ? 'bg-amber-400'
                                : 'bg-green-500'}`}
                              style={{ width: `${Math.min(fill,100)}%` }} />
                          </div>
                          <span className="text-xs text-gray-400 flex-shrink-0">
                            {m.current_players}/{m.team_size}
                          </span>
                        </div>
                      </div>
                      <span className={MATCH_STATUS[m.status] || 'badge-gray'}>
                        {m.status}
                      </span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div>
          <h2 className="font-bold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {quickActions.map((a, i) => (
              <Link key={a.label} to={a.to}
                className={`card p-4 border-2 transition-all duration-200
                  group animate-fade-up ${a.color}`}
                style={{ animationDelay: `${i * 0.08}s` }}>
                <div className="text-3xl mb-3 group-hover:scale-110
                  transition-transform duration-200">
                  {a.icon}
                </div>
                <p className="font-semibold text-gray-900 text-sm mb-0.5">
                  {a.label}
                </p>
                <p className="text-xs text-gray-400">{a.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}