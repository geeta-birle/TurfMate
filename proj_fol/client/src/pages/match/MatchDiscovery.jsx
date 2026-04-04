import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { matchService } from '../../services/matchService';
import Loader from '../../components/common/Loader';

const SPORTS = ['football','cricket','basketball','badminton','tennis','volleyball'];
const SKILLS = ['beginner','intermediate','advanced'];

const SPORT_ICONS = {
  football: '⚽', cricket: '🏏', basketball: '🏀',
  badminton: '🏸', tennis: '🎾', volleyball: '🏐',
};

const STATUS_STYLES = {
  open: 'bg-green-100 text-green-700',
  full: 'bg-red-100 text-red-700',
  ongoing: 'bg-blue-100 text-blue-700',
};

const MatchCard = ({ match }) => {
  const spotsLeft = match.team_size - match.current_players;
  const fillPercent = (match.current_players / match.team_size) * 100;

  return (
    <Link to={`/matches/${match.id}`}
      className="card p-5 flex flex-col gap-4 group hover:border-primary-200">

      {/* Top Row */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-primary-50 rounded-xl flex items-center
            justify-center text-2xl flex-shrink-0">
            {SPORT_ICONS[match.sport_type] || '🏆'}
          </div>
          <div>
            <h3 className="font-bold text-gray-900 group-hover:text-primary-600
              transition-colors leading-tight">{match.title}</h3>
            <p className="text-xs text-gray-500 capitalize mt-0.5">
              {match.sport_type} • {match.skill_level}
            </p>
          </div>
        </div>
        <span className={`badge ${STATUS_STYLES[match.status] ||
          'bg-gray-100 text-gray-600'} capitalize font-semibold flex-shrink-0`}>
          {match.status}
        </span>
      </div>

      {/* Info Row */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-1.5 text-gray-600">
          <span>📅</span>
          <span>{new Date(match.date).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short'
          })}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <span>⏰</span>
          <span>{match.start_time?.slice(0,5)}</span>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600 col-span-2">
          <span>📍</span>
          <span className="truncate">{match.turf_name}, {match.city}</span>
        </div>
      </div>

      {/* Players Progress */}
      <div>
        <div className="flex justify-between items-center mb-1.5">
          <span className="text-xs font-semibold text-gray-600">
            Players ({match.current_players}/{match.team_size})
          </span>
          <span className={`text-xs font-bold
            ${spotsLeft === 0 ? 'text-red-500' : 'text-primary-600'}`}>
            {spotsLeft === 0 ? 'Full' : `${spotsLeft} spot${spotsLeft > 1 ? 's' : ''} left`}
          </span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-500
            ${fillPercent >= 100 ? 'bg-red-400'
              : fillPercent >= 75 ? 'bg-yellow-400'
              : 'bg-primary-500'}`}
            style={{ width: `${Math.min(fillPercent, 100)}%` }} />
        </div>
      </div>

      {/* Bottom Row */}
      <div className="flex items-center justify-between pt-2 border-t
        border-gray-100">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-full bg-primary-100 flex items-center
            justify-center text-xs font-bold text-primary-700">
            {match.organizer_name?.charAt(0)}
          </div>
          <span className="text-xs text-gray-500">{match.organizer_name}</span>
        </div>
        {match.cost_per_player > 0 ? (
          <span className="text-sm font-bold text-primary-600">
            ₹{parseFloat(match.cost_per_player).toLocaleString()}
            <span className="text-xs font-normal text-gray-400">/player</span>
          </span>
        ) : (
          <span className="badge bg-green-100 text-green-700 font-semibold">
            Free to join
          </span>
        )}
      </div>
    </Link>
  );
};

const MatchDiscovery = () => {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    sport_type: '', skill_level: '', city: '', date: '', page: 1,
  });

  useEffect(() => { fetchMatches(); }, [filters]);

  const fetchMatches = async () => {
    setLoading(true);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const { data } = await matchService.getAll(params);
      setMatches(data.data);
      setPagination(data.pagination);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ sport_type: '', skill_level: '', city: '', date: '', page: 1 });
  };

  const hasFilters = filters.sport_type || filters.skill_level ||
    filters.city || filters.date;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end
        justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-900 mb-1">
            Find Matches
          </h1>
          <p className="text-gray-500">
            {pagination.total || 0} open matches near you
          </p>
        </div>
        <Link to="/turfs" className="btn-primary whitespace-nowrap">
          + Create Match
        </Link>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6
        shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <input type="text" placeholder="City..."
            value={filters.city}
            onChange={e => updateFilter('city', e.target.value)}
            className="input text-sm" />

          <input type="date" value={filters.date}
            onChange={e => updateFilter('date', e.target.value)}
            className="input text-sm" min={new Date().toISOString().split('T')[0]} />

          <select value={filters.skill_level}
            onChange={e => updateFilter('skill_level', e.target.value)}
            className="input text-sm capitalize">
            <option value="">All Levels</option>
            {SKILLS.map(s => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>

          {hasFilters && (
            <button onClick={clearFilters}
              className="text-sm text-red-500 hover:text-red-700
                font-medium transition-colors flex items-center gap-1">
              ✕ Clear filters
            </button>
          )}
        </div>

        {/* Sport chips */}
        <div className="flex gap-2 overflow-x-auto pt-3 mt-3 border-t
          border-gray-100">
          <button onClick={() => updateFilter('sport_type', '')}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold
              whitespace-nowrap border transition-all
              ${!filters.sport_type
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200'}`}>
            All Sports
          </button>
          {SPORTS.map(s => (
            <button key={s}
              onClick={() => updateFilter('sport_type',
                filters.sport_type === s ? '' : s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold
                whitespace-nowrap border transition-all capitalize
                flex items-center gap-1
                ${filters.sport_type === s
                  ? 'bg-primary-600 text-white border-primary-600'
                  : 'bg-white text-gray-600 border-gray-200'}`}>
              {SPORT_ICONS[s]} {s}
            </button>
          ))}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <Loader center size="lg" />
      ) : matches.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🏆</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            No matches found
          </h3>
          <p className="text-gray-500 mb-6">
            Be the first to create a match in your city!
          </p>
          <Link to="/turfs" className="btn-primary">
            Book a Turf & Create Match
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {matches.map(match => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => updateFilter('page', filters.page - 1)}
                disabled={!pagination.hasPrev}
                className="btn-secondary py-2 px-4 disabled:opacity-40">
                ← Prev
              </button>
              <span className="text-sm text-gray-600 font-medium">
                Page {filters.page} of {pagination.totalPages}
              </span>
              <button
                onClick={() => updateFilter('page', filters.page + 1)}
                disabled={!pagination.hasNext}
                className="btn-secondary py-2 px-4 disabled:opacity-40">
                Next →
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};
export default MatchDiscovery;