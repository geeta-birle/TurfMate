import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../../services/api';
import Loader from '../../components/common/Loader';

const SPORT_ICONS = {
  football: '⚽', cricket: '🏏', basketball: '🏀',
  badminton: '🏸', tennis: '🎾', volleyball: '🏐',
};

const PlayerProfile = () => {
  const { id } = useParams();
  const [player, setPlayer] = useState(null);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchProfile(); }, [id]);

  const fetchProfile = async () => {
    try {
      const [playerRes, matchesRes] = await Promise.all([
        api.get(`/players/${id}/profile`),
        api.get(`/players/${id}/matches`),
      ]);
      setPlayer(playerRes.data.data);
      setMatches(matchesRes.data.data || []);
    } catch {}
    finally { setLoading(false); }
  };

  if (loading) return <Loader center size="lg" />;
  if (!player) return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-6xl mb-4">👤</div>
      <p className="text-gray-500 text-xl">Player not found</p>
      <Link to="/matches" className="btn-primary mt-4">Browse Matches</Link>
    </div>
  );

  const completedMatches = matches.filter(
    m => m.status === 'completed').length;
  const upcomingMatches = matches.filter(
    m => ['open','full'].includes(m.status)).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Profile Card */}
      <div className="card p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-center
          sm:items-start gap-5">
          <div className="w-20 h-20 rounded-2xl bg-primary-100 flex
            items-center justify-center text-primary-700 font-extrabold
            text-3xl flex-shrink-0 shadow-sm">
            {player.name?.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h1 className="text-2xl font-extrabold text-gray-900 mb-1">
              {player.name}
            </h1>
            <div className="flex flex-wrap gap-2 mb-3 justify-center
              sm:justify-start">
              <span className="badge bg-primary-100 text-primary-700
                font-semibold capitalize">
                {player.role}
              </span>
              {player.skill_level && (
                <span className="badge bg-orange-100 text-orange-700
                  font-semibold capitalize">
                  {player.skill_level}
                </span>
              )}
              {player.city && (
                <span className="badge bg-gray-100 text-gray-600">
                  📍 {player.city}
                </span>
              )}
              {player.is_verified && (
                <span className="badge bg-green-100 text-green-700">
                  ✓ Verified
                </span>
              )}
            </div>
            {player.bio && (
              <p className="text-gray-500 text-sm leading-relaxed">
                {player.bio}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { icon: '🏆', label: 'Total Matches',
            value: matches.length },
          { icon: '✅', label: 'Completed',
            value: completedMatches },
          { icon: '📅', label: 'Upcoming',
            value: upcomingMatches },
        ].map(s => (
          <div key={s.label} className="card p-4 text-center">
            <div className="text-2xl mb-1">{s.icon}</div>
            <p className="text-2xl font-extrabold text-gray-900">{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Recent Matches */}
      <div className="card p-5">
        <h2 className="font-bold text-gray-900 mb-4">Recent Matches</h2>
        {matches.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-2">🏆</div>
            <p className="text-gray-400 text-sm">No matches yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {matches.slice(0, 5).map(m => (
              <Link key={m.id} to={`/matches/${m.id}`}
                className="flex items-center gap-3 p-3 rounded-xl
                  hover:bg-gray-50 transition-colors group">
                <div className="w-10 h-10 bg-primary-50 rounded-lg
                  flex items-center justify-center text-xl flex-shrink-0">
                  {SPORT_ICONS[m.sport_type] || '🏆'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm
                    group-hover:text-primary-600 truncate">{m.title}</p>
                  <p className="text-xs text-gray-500">
                    {new Date(m.date).toLocaleDateString('en-IN',
                      { day: 'numeric', month: 'short' })}
                    {' · '}{m.turf_name}
                  </p>
                </div>
                <span className={`badge text-xs capitalize
                  ${m.status === 'completed'
                    ? 'bg-blue-100 text-blue-700'
                    : m.status === 'open'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600'}`}>
                  {m.status}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
export default PlayerProfile;
