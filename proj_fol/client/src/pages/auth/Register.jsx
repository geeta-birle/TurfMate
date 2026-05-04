import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ROLES = [
  { value: 'player', icon: '⚽', label: 'Player',
    desc: 'Join matches & book turfs' },
  { value: 'owner',  icon: '🏟️', label: 'Turf Owner',
    desc: 'List & manage your turfs' },
];

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    name: '', email: '', password: '', confirmPassword: '',
    phone: '', city: '', role: 'player',
  });
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPwd, setShowPwd] = useState(false);

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const validateStep1 = () => {
    if (!form.name.trim())  return 'Full name is required.';
    if (!form.email)        return 'Email is required.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Invalid email.';
    if (!form.password)     return 'Password is required.';
    if (form.password.length < 8) return 'Min 8 characters.';
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.password))
      return 'Must contain letters and numbers.';
    if (form.password !== form.confirmPassword)
      return 'Passwords do not match.';
    return null;
  };

  const handleNext = () => {
    const err = validateStep1();
    if (err) { setError(err); return; }
    setError(''); setStep(2);
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.phone.trim()) { setError('Phone number is required.'); return; }
    if (form.phone.length !== 10) { setError('Phone number must be 10 digits.'); return; }
    if (!/^\d{10}$/.test(form.phone)) { setError('Phone number must contain only digits.'); return; }
    if (!form.city.trim()) { setError('City is required.'); return; }
    setLoading(true);
    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Registration failed.');
    } finally { setLoading(false); }
  };

  const strength = form.password
    ? form.password.length >= 12 ? 4
    : form.password.length >= 10 ? 3
    : form.password.length >= 8  ? 2 : 1
    : 0;

  const strengthLabels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['', 'bg-red-400', 'bg-amber-400',
    'bg-blue-400', 'bg-green-500'];

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Left Panel */}
      <div className="hidden lg:flex lg:w-2/5 bg-gray-950 relative
        overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-5"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg
            width='60' height='60' viewBox='0 0 60 60'
            xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff'
            fill-opacity='1' fill-rule='evenodd'%3E%3Ccircle cx='30'
            cy='30' r='4'/%3E%3C/g%3E%3C/svg%3E")` }}/>
        <div className="relative text-white px-12 text-center">
          <h2 className="text-4xl font-bold mb-4 leading-tight">
            Join the
            <span className="text-green-400"> Community</span>
          </h2>
          <p className="text-gray-400 leading-relaxed mb-8">
            Thousands of players and turf owners are already playing smarter.
          </p>

          {/* Steps preview */}
          <div className="space-y-4 text-left">
            {[
              { n: '1', t: 'Create account', d: 'Takes 2 minutes' },
              { n: '2', t: 'Browse turfs',   d: 'Filter by sport & price' },
              { n: '3', t: 'Book & play',    d: 'Instant confirmation' },
            ].map(s => (
              <div key={s.n} className="flex items-center gap-4">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex
                  items-center justify-center text-sm font-bold
                  flex-shrink-0">
                  {s.n}
                </div>
                <div>
                  <p className="font-semibold text-sm">{s.t}</p>
                  <p className="text-gray-400 text-xs">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div className="flex-1 flex items-center justify-center
        px-6 py-12 overflow-y-auto">
        <div className="w-full max-w-md">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 mb-8">
            <div className="w-9 h-9 bg-green-600 rounded-xl flex
              items-center justify-center shadow-sm">
              <svg className="w-4 h-4 text-white" viewBox="0 0 24 24"
                fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10
                  10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900">
              Turf<span className="text-green-600">Mate</span>
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-gray-900 mb-1">
            Create your account
          </h1>
          <p className="text-gray-500 mb-6 text-sm">
            Join for free. No credit card required.
          </p>

          {/* Step indicator */}
          <div className="flex items-center gap-3 mb-8">
            {[1, 2].map(s => (
              <div key={s} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center
                  justify-center text-sm font-bold transition-all
                  ${step >= s
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 text-gray-400'}`}>
                  {step > s ? '✓' : s}
                </div>
                <span className={`text-xs font-medium
                  ${step >= s ? 'text-green-600' : 'text-gray-400'}`}>
                  {s === 1 ? 'Account' : 'Profile'}
                </span>
                {s < 2 && (
                  <div className={`flex-1 h-px
                    ${step > s ? 'bg-green-400' : 'bg-gray-200'}`}/>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="alert-error mb-5">
              <span>⚠️</span> {error}
            </div>
          )}

          {/* Step 1 */}
          {step === 1 && (
            <div className="space-y-4 animate-fade-up">
              <div>
                <label className="label">Full Name</label>
                <input type="text" name="name" value={form.name}
                  onChange={handleChange} placeholder="John Doe"
                  className="input"/>
              </div>
              <div>
                <label className="label">Email Address</label>
                <input type="email" name="email" value={form.email}
                  onChange={handleChange} placeholder="you@example.com"
                  className="input"/>
              </div>
              <div>
                <label className="label">Password</label>
                <div className="relative">
                  <input type={showPwd ? 'text' : 'password'}
                    name="password" value={form.password}
                    onChange={handleChange}
                    placeholder="Min 8 characters + numbers"
                    className="input pr-11"/>
                  <button type="button"
                    onClick={() => setShowPwd(!showPwd)}
                    className="absolute right-3 top-1/2 -translate-y-1/2
                      text-gray-400 hover:text-gray-600 text-sm">
                    {showPwd ? '🙈' : '👁️'}
                  </button>
                </div>
                {form.password && (
                  <div className="mt-2 space-y-1">
                    <div className="flex gap-1">
                      {[1,2,3,4].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full
                          transition-all ${i <= strength
                            ? strengthColors[strength] : 'bg-gray-200'}`}/>
                      ))}
                    </div>
                    <p className={`text-xs font-medium
                      ${strength >= 3 ? 'text-green-600'
                        : strength === 2 ? 'text-amber-600'
                        : 'text-red-500'}`}>
                      {strengthLabels[strength]} password
                    </p>
                  </div>
                )}
              </div>
              <div>
                <label className="label">Confirm Password</label>
                <input type="password" name="confirmPassword"
                  value={form.confirmPassword}
                  onChange={handleChange} placeholder="••••••••"
                  className="input"/>
                {form.confirmPassword && (
                  <p className={`text-xs mt-1 font-medium
                    ${form.password === form.confirmPassword
                      ? 'text-green-600' : 'text-red-500'}`}>
                    {form.password === form.confirmPassword
                      ? '✓ Passwords match'
                      : '✗ Passwords do not match'}
                  </p>
                )}
              </div>
              <button type="button" onClick={handleNext}
                className="btn-primary w-full py-3 mt-2">
                Continue →
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <form onSubmit={handleSubmit}
              className="space-y-4 animate-fade-up">

              {/* Role */}
              <div>
                <label className="label">I am a...</label>
                <div className="grid grid-cols-2 gap-3">
                  {ROLES.map(r => (
                    <button key={r.value} type="button"
                      onClick={() => setForm(p => ({
                        ...p, role: r.value }))}
                      className={`p-4 rounded-xl border-2 text-left
                        transition-all
                        ${form.role === r.value
                          ? 'border-green-600 bg-green-50'
                          : 'border-gray-200 hover:border-gray-300'}`}>
                      <div className="text-2xl mb-1">{r.icon}</div>
                      <div className="font-semibold text-gray-900 text-sm">
                        {r.label}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        {r.desc}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="label">Phone Number</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2
                    -translate-y-1/2 text-gray-500 text-sm font-medium">
                    +91
                  </span>
                  <input type="tel" name="phone" value={form.phone}
                    onChange={handleChange} placeholder="9876543210"
                    className="input pl-12" maxLength={10}/>
                </div>
              </div>

              <div>
                <label className="label">City</label>
                <input type="text" name="city" value={form.city}
                  onChange={handleChange} placeholder="Pune"
                  className="input"/>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)}
                  className="btn-secondary flex-1 py-3">
                  ← Back
                </button>
                <button type="submit" disabled={loading}
                  className="btn-primary flex-1 py-3">
                  {loading ? (
                    <>
                      <svg className="animate-spin w-4 h-4"
                        viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12"
                          r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor"
                          d="M4 12a8 8 0 018-8v8z"/>
                      </svg>
                      Creating...
                    </>
                  ) : 'Create Account 🎉'}
                </button>
              </div>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-8">
            Already have an account?{' '}
            <Link to="/login"
              className="text-green-600 font-semibold hover:text-green-700">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}