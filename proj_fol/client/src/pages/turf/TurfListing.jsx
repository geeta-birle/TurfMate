import { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { turfService } from '../../services/turfService';
import Loader from '../../components/common/Loader';

const SPORTS = ['football','cricket','basketball','badminton','tennis','volleyball'];

const TurfCard = ({ turf }) => (
  <Link to={`/turfs/${turf.id}`} className="card group overflow-hidden flex flex-col">
    <div className="relative h-44 bg-gradient-to-br from-primary-100 to-primary-200 overflow-hidden">
      {turf.images?.length ? (
        <img src={turf.images[0]} alt={turf.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-5xl">🏟️</div>
      )}
      <div className="absolute top-3 left-3 flex gap-1 flex-wrap">
        {(Array.isArray(turf.sport_types)
          ? turf.sport_types
          : typeof turf.sport_types === 'string'
          ? turf.sport_types.replace(/[{}"]/g, '').split(',')
          : []
        ).slice(0, 2).map(s => (
          <span key={s} className="badge bg-white/90 text-gray-700 capitalize shadow-sm">
            {s.trim()}
          </span>
        ))}
      </div>
      {turf.avg_rating > 0 && (
        <div className="absolute top-3 right-3 bg-white/90 rounded-lg px-2 py-1 flex items-center gap-1 shadow-sm">
          <span className="text-yellow-500 text-xs">★</span>
          <span className="text-xs font-bold text-gray-800">{parseFloat(turf.avg_rating).toFixed(1)}</span>
        </div>
      )}
    </div>

    <div className="p-4 flex flex-col flex-1">
      <h3 className="font-bold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors truncate">
        {turf.name}
      </h3>
      <p className="text-sm text-gray-500 mb-3 flex items-center gap-1">
        <span>📍</span>
        <span className="truncate">{turf.address}, {turf.city}</span>
      </p>

      {turf.amenities?.length > 0 && (
        <div className="flex gap-1 flex-wrap mb-3">
          {turf.amenities.slice(0, 3).map(a => (
            <span key={a} className="badge bg-gray-100 text-gray-600 capitalize text-xs">{a}</span>
          ))}
        </div>
      )}

      <div className="mt-auto flex items-center justify-between pt-3 border-t border-gray-100">
        <div>
          <span className="text-xl font-extrabold text-primary-600">
            ₹{parseFloat(turf.price_per_hour).toLocaleString()}
          </span>
          <span className="text-xs text-gray-400">/hr</span>
        </div>
        <span className="text-xs font-medium text-primary-600 bg-primary-50 px-3 py-1 rounded-full">
          Book Now →
        </span>
      </div>
    </div>
  </Link>
);

const TurfListing = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [turfs, setTurfs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    sport_type: searchParams.get('sport_type') || '',
    min_price: searchParams.get('min_price') || '',
    max_price: searchParams.get('max_price') || '',
    city: searchParams.get('city') || '',
    page: 1,
  });
  const [error, setError] = useState(null);

  const debounceTimer = useRef(null);

  useEffect(() => {
    // Clear previous timer
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    
    // Set new timer to fetch after 500ms of no changes
    debounceTimer.current = setTimeout(() => {
      fetchTurfs();
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [filters]);

  const fetchTurfs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = Object.fromEntries(
        Object.entries(filters).filter(([_, v]) => v !== '')
      );
      const { data } = await turfService.getAll(params);
      setTurfs(data.data);
      setPagination(data.pagination);
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Too many requests. Please wait a moment before trying again.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Unable to connect to server. Please ensure the backend is running on port 5000.');
      } else {
        setError('Failed to load turfs. Please try again.');
      }
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const updateFilter = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', sport_type: '', min_price: '', max_price: '', city: '', page: 1 });
    setSearchParams({});
  };

  const hasActiveFilters = filters.sport_type || filters.min_price ||
    filters.max_price || filters.city;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 mb-1">Find Turfs</h1>
        <p className="text-gray-500">
          {pagination.total || 0} turfs available
          {filters.city && ` in ${filters.city}`}
        </p>
      </div>

      {/* Search + Filter Bar */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 mb-6 shadow-sm">
        <div className="flex gap-3 flex-col sm:flex-row">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
              fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input type="text" placeholder="Search turf name or area..."
              value={filters.search}
              onChange={e => updateFilter('search', e.target.value)}
              className="input pl-10" />
          </div>

          <input type="text" placeholder="City"
            value={filters.city}
            onChange={e => updateFilter('city', e.target.value)}
            className="input w-full sm:w-36" />

          <button onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 whitespace-nowrap
              ${hasActiveFilters ? 'border-primary-400 text-primary-600' : ''}`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13
                   13.414V19a1 1 0 01-1.447.894l-4-2A1 1 0 017 17v-3.586L3.293
                   6.707A1 1 0 013 6V4z" />
            </svg>
            Filters
            {hasActiveFilters && <span className="w-2 h-2 bg-primary-500 rounded-full" />}
          </button>
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Sport
              </label>
              <div className="flex flex-wrap gap-2">
                {SPORTS.map(s => (
                  <button key={s}
                    onClick={() => updateFilter('sport_type', filters.sport_type === s ? '' : s)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all capitalize
                      ${filters.sport_type === s
                        ? 'bg-primary-600 text-white border-primary-600'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Price Range (₹/hr)
              </label>
              <div className="flex gap-2 items-center">
                <input type="number" placeholder="Min"
                  value={filters.min_price}
                  onChange={e => updateFilter('min_price', e.target.value)}
                  className="input w-24 text-sm" />
                <span className="text-gray-400">—</span>
                <input type="number" placeholder="Max"
                  value={filters.max_price}
                  onChange={e => updateFilter('max_price', e.target.value)}
                  className="input w-24 text-sm" />
              </div>
            </div>

            <div className="flex items-end">
              {hasActiveFilters && (
                <button onClick={clearFilters}
                  className="text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                  ✕ Clear all filters
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Sport Quick Filter Chips */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
        <button onClick={() => updateFilter('sport_type', '')}
          className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all
            ${!filters.sport_type
              ? 'bg-primary-600 text-white border-primary-600'
              : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
          All Sports
        </button>
        {SPORTS.map(s => (
          <button key={s}
            onClick={() => updateFilter('sport_type', filters.sport_type === s ? '' : s)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition-all capitalize
              ${filters.sport_type === s
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Results */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <div>
            <p className="text-sm font-medium text-red-600">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-600 hover:text-red-700">
            ✕
          </button>
        </div>
      )}
      {loading ? (
        <Loader center size="lg" />
      ) : turfs.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No turfs found</h3>
          <p className="text-gray-500 mb-6">Try adjusting your filters or search in a different area</p>
          <button onClick={clearFilters} className="btn-primary">Clear Filters</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {turfs.map(turf => <TurfCard key={turf.id} turf={turf} />)}
          </div>

          {pagination.totalPages > 1 && (
            <div className="flex justify-center items-center gap-2 mt-10">
              <button
                onClick={() => updateFilter('page', filters.page - 1)}
                disabled={!pagination.hasPrev}
                className="btn-secondary py-2 px-4 disabled:opacity-40">
                ← Prev
              </button>
              <div className="flex gap-1">
                {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                  .filter(p => Math.abs(p - filters.page) <= 2)
                  .map(p => (
                    <button key={p}
                      onClick={() => updateFilter('page', p)}
                      className={`w-9 h-9 rounded-lg text-sm font-semibold transition-all
                        ${p === filters.page
                          ? 'bg-primary-600 text-white'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-primary-300'}`}>
                      {p}
                    </button>
                  ))}
              </div>
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

export default TurfListing;