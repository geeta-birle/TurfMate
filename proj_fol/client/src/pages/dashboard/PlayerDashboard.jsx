import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from 'recharts';

const StatCard = ({ icon, label, value, sub, color = 'primary' }) => {
  const colors = {
    primary: 'bg-primary-50 text-primary-600',
    blue:    'bg-blue-50 text-blue-600',
    yellow:  'bg-yellow-50 text-yellow-600',
    red:     'bg-red-50 text-red-600',
  };
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-gray-500 text-sm font-medium">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center
          text-lg ${colors[color]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-extrabold text-gray-900">{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  );
};

const PlayerDashboard = () => {
  const { user } = useAuth();
  const [bookings, setBookings] = useState([]);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      const [b, m] = await Promise.all([
        bookingService.getMine({ limit: 5 }),
        matchService.getMine({ role: 'all' }),
      ]);
      setBookings(b.data.data);
      setMatches(m.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Build activity chart data from bookings
  const chartData = (() => {
    const months = ['Jan','Feb','Mar','Apr','May','Jun',
                    'Jul','Aug','Sep','Oct','Nov','Dec'];
    const counts = Array(6).fill(0).map((_, i) => {
      const d = new Date();
      d.setMonth(d.getMonth() - (5 - i));
      return {
        month: months[d.getMonth()],
        bookings: bookings.filter(b => {
          const bd = new Date(b.date || b.created_at);
          return bd.getMonth() === d.getMonth() &&
                 bd.getFullYear() === d.getFullYear();
        }).length,
      };
    });
    return counts;
  })();

  const totalSpent = bookings
    .filter(b => b.payment_status === 'success')
    .reduce((sum, b) => sum + parseFloat(b.total_amount || 0) +
      parseFloat(b.platform_fee || 0), 0);

  const confirmedBookings = bookings.filter(b => b.status === 'confirmed').length;
  const myMatches = matches.filter(m => m.is_organizer).length;
  const joinedMatches = matches.filter(m => !m.is_organizer).length;

  if (loading) return <Loader center size="lg" />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center
        justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Welcome back, {user?.name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-gray-500 mt-1">
            Here's your activity overview
          </p>
        </div>
        <div className="flex gap-3">
          <Link to="/turfs" className="btn-primary">Book a Turf</Link>
          <Link to="/matches" className="btn-secondary">Find Matches</Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon="📋" label="Total Bookings"
          value={bookings.length} sub="All time" />
        <StatCard icon="✅" label="Confirmed"
          value={confirmedBookings} sub="Active slots" color="blue" />
        <StatCard icon="🏆" label="Matches Created"
          value={myMatches} sub="As organizer" color="yellow" />
        <StatCard icon="🤝" label="Matches Joined"
          value={joinedMatches} sub="As player" color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Activity Chart */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-bold text-gray-900">Booking Activity</h2>
            <span className="text-xs text-gray-400">Last 6 months</span>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={chartData}
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#9ca3af' }}
                axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: 'none',
                  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                cursor={{ fill: '#f0fdf4' }} />
              <Bar dataKey="bookings" fill="#16a34a" radius={[6, 6, 0, 0]}
                name="Bookings" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Spend Summary */}
        <div className="card p-6">
          <h2 className="font-bold text-gray-900 mb-5">Spend Summary</h2>
          <div className="text-center py-4 mb-4 bg-primary-50 rounded-2xl">
            <p className="text-xs text-gray-500 mb-1">Total Spent</p>
            <p className="text-4xl font-extrabold text-primary-600">
              ₹{totalSpent.toLocaleString()}
            </p>
            <p className="text-xs text-gray-400 mt-1">All time</p>
          </div>
          <div className="space-y-3">
            {[
              { label: 'Avg per booking',
                value: bookings.length
                  ? `₹${(totalSpent / bookings.length).toFixed(0)}`
                  : '₹0' },
              { label: 'This month',
                value: `₹${bookings
                  .filter(b => {
                    const d = new Date(b.created_at);
                    const now = new Date();
                    return d.getMonth() === now.getMonth() &&
                           d.getFullYear() === now.getFullYear();
                  })
                  .reduce((s, b) => s + parseFloat(b.total_amount || 0), 0)
                  .toLocaleString()}` },
            ].map(item => (
              <div key={item.label} className="flex justify-between
                items-center py-2 border-b border-gray-100 last:border-0">
                <span className="text-sm text-gray-500">{item.label}</span>
                <span className="font-bold text-gray-900">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Recent Bookings</h2>
          <Link to="/bookings/my"
            className="text-sm text-primary-600 font-medium hover:underline">
            View all →
          </Link>
        </div>
        {bookings.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">📋</div>
            <p className="text-gray-500 mb-4">No bookings yet</p>
            <Link to="/turfs" className="btn-primary">Book Your First Turf</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {bookings.slice(0, 5).map(b => (
              <Link key={b.id} to={`/bookings/${b.id}`}
                className="flex items-center gap-4 p-3 rounded-xl
                  hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex
                  items-center justify-center text-xl flex-shrink-0">🏟️</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate
                    group-hover:text-primary-600">
                    {b.turf_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(b.date).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short' })}
                    {' · '}{b.start_time?.slice(0, 5)}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className={`badge capitalize font-semibold text-xs
                    ${b.status === 'confirmed'
                      ? 'bg-green-100 text-green-700'
                      : b.status === 'cancelled'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-yellow-100 text-yellow-700'}`}>
                    {b.status}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* My Matches */}
      <div className="card p-6 mt-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">My Matches</h2>
          <Link to="/matches"
            className="text-sm text-primary-600 font-medium hover:underline">
            Find more →
          </Link>
        </div>
        {matches.length === 0 ? (
          <div className="text-center py-10">
            <div className="text-5xl mb-3">🏆</div>
            <p className="text-gray-500 mb-4">No matches yet</p>
            <Link to="/matches" className="btn-primary">Find a Match</Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {matches.slice(0, 4).map(m => (
              <Link key={m.id} to={`/matches/${m.id}`}
                className="flex items-center gap-3 p-3 rounded-xl
                  border border-gray-100 hover:border-primary-200
                  hover:bg-primary-50 transition-all group">
                <div className="w-10 h-10 bg-primary-50 rounded-xl flex
                  items-center justify-center text-xl flex-shrink-0">⚽</div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {m.title}
                  </p>
                  <p className="text-xs text-gray-400">
                    {new Date(m.date).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short' })}
                    {' · '}{m.current_players}/{m.team_size} players
                  </p>
                </div>
                {m.is_organizer && (
                  <span className="badge bg-primary-100 text-primary-700
                    text-xs flex-shrink-0">Host</span>
                )}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default PlayerDashboard;