import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { turfService } from '../../services/turfService';

const SPORTS = ['football','cricket','basketball','badminton','tennis','volleyball'];
const AMENITIES = ['parking','washroom','floodlights','changing room',
  'drinking water','cafeteria','first aid','equipment rental',
  'air conditioning','coaching','scoreboard','pavilion'];

const CreateTurf = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    lat: '',
    lng: '',
    surface_type: 'artificial grass',
    price_per_hour: '',
    sport_types: [],
    amenities: [],
  });

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const toggleSport = (sport) => {
    setForm(prev => ({
      ...prev,
      sport_types: prev.sport_types.includes(sport)
        ? prev.sport_types.filter(s => s !== sport)
        : [...prev.sport_types, sport],
    }));
  };

  const toggleAmenity = (amenity) => {
    setForm(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity],
    }));
  };

  const validate = () => {
    if (!form.name.trim()) return 'Turf name is required.';
    if (!form.address.trim()) return 'Address is required.';
    if (!form.city.trim()) return 'City is required.';
    if (!form.price_per_hour) return 'Price per hour is required.';
    if (form.sport_types.length === 0) return 'Select at least one sport.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setSubmitting(true);
    try {
      const payload = {
        ...form,
        price_per_hour: parseFloat(form.price_per_hour),
        lat: form.lat ? parseFloat(form.lat) : null,
        lng: form.lng ? parseFloat(form.lng) : null,
      };
      const { data } = await turfService.create(payload);
      navigate(`/turfs/${data.data.id}/manage`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create turf.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        <span>›</span>
        <span className="text-gray-900">Create Turf</span>
      </nav>

      <div className="mb-8">
        <h1 className="text-2xl font-extrabold text-gray-900">
          List Your Turf 🏟️
        </h1>
        <p className="text-gray-500 mt-1">
          Fill in the details. Admin will review and approve within 24 hours.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-5 text-sm">
          ⚠️ {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Basic Info */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Basic Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Turf Name *
              </label>
              <input type="text" name="name" value={form.name}
                onChange={handleChange} placeholder="e.g. Green Arena Turf"
                className="input" maxLength={150} />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Description
              </label>
              <textarea name="description" value={form.description}
                onChange={handleChange} rows={3}
                placeholder="Describe your turf, facilities, nearby landmarks..."
                className="input resize-none" maxLength={500} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Surface Type
                </label>
                <select name="surface_type" value={form.surface_type}
                  onChange={handleChange} className="input">
                  {['artificial grass','natural grass','wooden',
                    'concrete','synthetic'].map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Price Per Hour (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2
                    text-gray-500">₹</span>
                  <input type="number" name="price_per_hour"
                    value={form.price_per_hour}
                    onChange={handleChange} placeholder="1200"
                    className="input pl-8" min={1} />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Location</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                Full Address *
              </label>
              <input type="text" name="address" value={form.address}
                onChange={handleChange}
                placeholder="Street, Area, Landmark"
                className="input" />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                City *
              </label>
              <input type="text" name="city" value={form.city}
                onChange={handleChange} placeholder="Pune"
                className="input" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Latitude (optional)
                </label>
                <input type="number" name="lat" value={form.lat}
                  onChange={handleChange} placeholder="18.5590"
                  className="input" step="any" />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Longitude (optional)
                </label>
                <input type="number" name="lng" value={form.lng}
                  onChange={handleChange} placeholder="73.7868"
                  className="input" step="any" />
              </div>
            </div>
            <p className="text-xs text-gray-400">
              💡 Find lat/lng by right-clicking your location on Google Maps
            </p>
          </div>
        </div>

        {/* Sports */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">
            Sports Available *
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {SPORTS.map(sport => {
              const icons = {
                football: '⚽', cricket: '🏏', basketball: '🏀',
                badminton: '🏸', tennis: '🎾', volleyball: '🏐',
              };
              const selected = form.sport_types.includes(sport);
              return (
                <button key={sport} type="button"
                  onClick={() => toggleSport(sport)}
                  className={`py-3 px-2 rounded-xl border-2 text-center
                    transition-all text-xs font-semibold capitalize
                    ${selected
                      ? 'bg-primary-600 text-white border-primary-600'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-primary-300'}`}>
                  <div className="text-2xl mb-1">{icons[sport]}</div>
                  {sport}
                </button>
              );
            })}
          </div>
        </div>

        {/* Amenities */}
        <div className="card p-6">
          <h3 className="font-bold text-gray-900 mb-4">Amenities</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {AMENITIES.map(amenity => {
              const selected = form.amenities.includes(amenity);
              return (
                <button key={amenity} type="button"
                  onClick={() => toggleAmenity(amenity)}
                  className={`py-2.5 px-3 rounded-xl border text-sm
                    font-medium capitalize text-left transition-all
                    flex items-center gap-2
                    ${selected
                      ? 'bg-primary-50 border-primary-400 text-primary-700'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                  <span className={`w-4 h-4 rounded border flex items-center
                    justify-center flex-shrink-0 text-xs
                    ${selected
                      ? 'bg-primary-600 border-primary-600 text-white'
                      : 'border-gray-300'}`}>
                    {selected && '✓'}
                  </span>
                  {amenity}
                </button>
              );
            })}
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4
          flex gap-3">
          <span className="text-2xl">ℹ️</span>
          <div>
            <p className="font-semibold text-blue-900 text-sm">
              After submission
            </p>
            <p className="text-blue-700 text-sm mt-0.5">
              Your turf will be reviewed by our admin team and approved
              within 24 hours. You can add time slots after approval.
            </p>
          </div>
        </div>

        {/* Submit */}
        <button type="submit" disabled={submitting}
          className="btn-primary w-full py-4 text-base">
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24"
                fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10"
                  stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor"
                  d="M4 12a8 8 0 018-8v8z" />
              </svg>
              Submitting...
            </span>
          ) : '🏟️ Submit Turf for Approval'}
        </button>
      </form>
    </div>
  );
};
export default CreateTurf;