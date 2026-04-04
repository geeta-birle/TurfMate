import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { value: 'player', label: 'Player', icon: '⚽', desc: 'Join matches & book turfs' },
  { value: 'owner', label: 'Turf Owner', icon: '🏟️', desc: 'List & manage your turfs' },
];

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: '', email: '', password: '',
    confirmPassword: '', phone: '', city: '', role: 'player',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState(1); // 2-step form

  const handleChange = (e) => {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!form.name.trim()) return 'Full name is required.';
    if (!form.email) return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Enter a valid email.';
    if (!form.password) return 'Password is required.';
    if (form.password.length < 8) return 'Password must be at least 8 characters.';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password))
      return 'Password must contain letters and numbers.';
    if (form.password !== form.confirmPassword) return 'Passwords do not match.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError('');
    setStep(2);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.city.trim()) { setError('City is required.'); return; }
    setLoading(true);
    try {
      const { confirmPassword, ...submitData } = form;
      await register(submitData);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white
      flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center
              justify-center text-white font-bold text-lg shadow-lg">T</div>
            <span className="text-2xl font-extrabold text-gray-900">
              Turf<span className="text-primary-600">Mate</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">Create your account</h1>
          <p className="text-gray-500 mt-1">Join the community. Play more.</p>
        </div>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 mb-6">
          {[1, 2].map((s) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center
                text-sm font-bold transition-all
                ${step >= s
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-200 text-gray-400'}`}>
                {step > s ? '✓' : s}
              </div>
              <span className={`text-xs font-medium ${step >= s
                ? 'text-primary-600' : 'text-gray-400'}`}>
                {s === 1 ? 'Account' : 'Profile'}
              </span>
              {s < 2 && <div className={`flex-1 h-0.5 rounded
                ${step > s ? 'bg-primary-600' : 'bg-gray-200'}`} />}
            </div>
          ))}
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700
              rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Full Name
                </label>
                <input type="text" name="name" value={form.name}
                  onChange={handleChange} placeholder="John Doe"
                  className="input" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="you@example.com"
                  className="input" />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'}
                    name="password" value={form.password}
                    onChange={handleChange} placeholder="Min 8 chars + numbers"
                    className="input pr-11" />
                  <button type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                      text-gray-400 hover:text-gray-600">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016
                        0zM2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268
                        2.943 9.542 7-1.274 4.057-5.064 7-9.542
                        7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </div>
                {/* Password strength */}
                {form.password && (
                  <div className="mt-2 flex gap-1">
                    {[1,2,3,4].map(i => (
                      <div key={i} className={`h-1 flex-1 rounded-full transition-all
                        ${form.password.length >= i * 2 + 2
                          ? i <= 1 ? 'bg-red-400'
                            : i <= 2 ? 'bg-yellow-400'
                            : i <= 3 ? 'bg-blue-400'
                            : 'bg-green-400'
                          : 'bg-gray-200'}`} />
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Confirm Password
                </label>
                <input type="password" name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange} placeholder="••••••••"
                  className="input" />
              </div>

              <button type="button" onClick={handleNext}
                className="btn-primary w-full py-3 text-base">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Role Selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(p => ({ ...p, role: r.value }))}
                      className={`p-4 rounded-xl border-2 text-left transition-all
                        ${form.role === r.value
                          ? 'border-primary-600 bg-primary-50'
                          : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-2xl mb-1">{r.icon}</div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {r.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">{r.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  Phone Number
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2
                    text-gray-500 text-sm font-medium">+91</span>
                  <input type="tel" name="phone" value={form.phone}
                    onChange={handleChange} placeholder="9876543210"
                    className="input pl-12" maxLength={10} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                  City
                </label>
                <input type="text" name="city" value={form.city}
                  onChange={handleChange} placeholder="Pune"
                  className="input" />
              </div>

              <div className="flex gap-3">
                <button type="button" onClick={() => setStep(1)}
                  className="btn-secondary flex-1 py-3">
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="btn-primary flex-2 py-3 flex-1">
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"
                        fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10"
                          stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z" />
                      </svg>
                      Creating...
                    </span>
                  ) : 'Create Account 🎉'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Already have an account?{' '}
            <Link to="/login" className="text-primary-600 font-semibold
              hover:text-primary-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default Register;