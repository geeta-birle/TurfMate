import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchService } from '../../services/matchService';
import { useAuth } from '../../context/AuthContext';
import Loader from '../../components/common/Loader';

const SPORT_ICONS = {
  football: '⚽', cricket: '🏏', basketball: '🏀',
  badminton: '🏸', tennis: '🎾', volleyball: '🏐',
};

const STATUS_STYLES = {
  open:      'bg-green-100 text-green-700',
  full:      'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
  cancelled: 'bg-gray-100 text-gray-600',
};

const MyMatches = () => {
  const { user } = useAuth();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => { fetchMatches(); }, [roleFilter]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const { data } = await matchService.getMine({ role: roleFilter });
      setMatches(data.data);
    } catch {}
    finally { setLoading(false); }
  };

  const filtered = statusFilter
    ? matches.filter(m => m.status === statusFilter)
    : matches;

  const organized = matches.filter(m => m.is_organizer).length;
  const joined    = matches.filter(m => !m.is_organizer).length;
  const upcoming  = matches.filter(m =>
    ['open','full'].includes(m.status)).length;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center
        justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            My Matches
          </h1>
          <p className="text-gray-500 mt-0.5">
            {matches.length} total · {upcoming} upcoming
          </p>
        </div>
        <Link to="/matches" className="btn-primary">
          Find Matches
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: '🏆', label: 'Organized', value: organized,
            color: 'bg-purple-50' },
          { icon: '🙌', label: 'Joined', value: joined,
            color: 'bg-blue-50' },
          { icon: '📅', label: 'Upcoming', value: upcoming,
            color: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className={`card p-4 text-center ${s.color}`}>
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Role Filter */}
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {[
            { value: 'all', label: 'All' },
            { value: 'organizer', label: '🏆 Organized' },
            { value: 'player', label: '🙌 Joined' },
          ].map(f => (
            <button key={f.value} onClick={() => setRoleFilter(f.value)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold
                transition-all
                ${roleFilter === f.value
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'}`}>
              {f.label}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex gap-2 overflow-x-auto">
          {['','open','full','completed','cancelled'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold
                whitespace-nowrap border transition-all capitalize
                ${statusFilter === s
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200'}`}>
              {s || 'All Status'}
            </button>
          ))}
        </div>
      </div>

      {/* Matches List */}
      {loading ? <Loader center /> : filtered.length === 0 ? (
        <div className="text-center py-16 card">
          <div className="text-5xl mb-3">🏆</div>
          <h3 className="font-bold text-gray-900 mb-2">No matches found</h3>
          <p className="text-gray-500 text-sm mb-4">
            {roleFilter === 'organizer'
              ? 'Book a turf and create your first match!'
              : 'Browse open matches and join one!'}
          </p>
          <Link to={roleFilter === 'organizer' ? '/turfs' : '/matches'}
            className="btn-primary">
            {roleFilter === 'organizer' ? 'Book a Turf' : 'Find Matches'}
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map(m => {
            const spotsLeft = m.team_size - m.current_players;
            const fillPercent = (m.current_players / m.team_size) * 100;
            return (
              <Link key={m.id} to={`/matches/${m.id}`}
                className="card p-5 flex flex-col sm:flex-row gap-4
                  hover:border-primary-200 group">

                {/* Sport Icon */}
                <div className="w-14 h-14 bg-primary-50 rounded-xl flex
                  items-center justify-center text-3xl flex-shrink-0">
                  {SPORT_ICONS[m.sport_type] || '🏆'}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900
                      group-hover:text-primary-600 transition-colors">
                      {m.title}
                    </h3>
                    <span className={`badge text-xs font-semibold capitalize
                      ${STATUS_STYLES[m.status] || 'bg-gray-100 text-gray-600'}`}>
                      {m.status}
                    </span>
                    {m.is_organizer && (
                      <span className="badge bg-purple-100 text-purple-700
                        text-xs font-semibold">
                        🏆 Organizer
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-3 text-xs text-gray-500
                    mb-3">
                    <span>📅 {new Date(m.date).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    <span>⏰ {m.start_time?.slice(0,5)}</span>
                    <span>📍 {m.turf_name}, {m.city}</span>
                    <span className="capitalize">⚽ {m.sport_type}</span>
                  </div>

                  {/* Progress Bar */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">
                        {m.current_players}/{m.team_size} players
                      </span>
                      <span className={`font-semibold
                        ${spotsLeft === 0
                          ? 'text-red-500'
                          : 'text-primary-600'}`}>
                        {spotsLeft === 0 ? 'Full' : `${spotsLeft} spots left`}
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all
                        ${fillPercent >= 100 ? 'bg-red-400'
                          : fillPercent >= 75 ? 'bg-yellow-400'
                          : 'bg-primary-500'}`}
                        style={{ width: `${Math.min(fillPercent, 100)}%` }} />
                    </div>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  {m.cost_per_player > 0 ? (
                    <p className="font-bold text-primary-600">
                      ₹{parseFloat(m.cost_per_player).toLocaleString()}
                      <span className="text-xs font-normal text-gray-400">
                        /player
                      </span>
                    </p>
                  ) : (
                    <span className="badge bg-green-100 text-green-700
                      font-semibold">Free</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};
export default MyMatches;