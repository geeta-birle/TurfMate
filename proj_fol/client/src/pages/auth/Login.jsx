import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const from = location.state?.from?.pathname || '/dashboard';
  const successMsg = location.state?.message;

  const [form, setForm]         = useState({ email: '', password: '' });
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [showPwd, setShowPwd]   = useState(false);

  const handleChange = e => {
    setForm(p => ({ ...p, [e.target.name]: e.target.value }));
    setError('');
  };

  const handleSubmit = async e => {
    e.preventDefault();
    if (!form.email || !form.password) {
      setError('Please fill in all fields.'); return;
    }
    setLoading(true);
    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Invalid credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">

      {/* Left panel — decorative */}
      <div className="hidden lg:flex lg:w-1/2 bg-green-600 relative
        overflow-hidden items-center justify-center">
        <div className="absolute inset-0 opacity-20"
          style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg
            width='60' height='60' viewBox='0 0 60 60'
            xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none'
            fill-rule='evenodd'%3E%3Cg fill='%23ffffff'
            fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`}} />
        <div className="relative text-white text-center px-12">
          <div className="w-20 h-20 bg-white/20 rounded-3xl flex
            items-center justify-center mx-auto mb-6 backdrop-blur-sm
            animate-float">
            <svg className="w-10 h-10 text-white" viewBox="0 0 24 24"
              fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48
                10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
            </svg>
          </div>
          <h2 className="text-3xl font-bold mb-3">
            India's Sports Community
          </h2>
          <p className="text-green-100 leading-relaxed">
            Book turfs, create matches and find players — all in one place.
          </p>
          <div className="mt-8 space-y-3">
            {[
              '✓ 50+ verified turfs in Pune',
              '✓ Real-time match discovery',
              '✓ Cost splitting with players',
            ].map(f => (
              <p key={f} className="text-green-100 text-sm">{f}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center
        px-6 py-12">
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
            Welcome back
          </h1>
          <p className="text-gray-500 mb-8 text-sm">
            Sign in to continue to TurfMate
          </p>

          {successMsg && (
            <div className="alert-success mb-5">
              <span>✅</span> {successMsg}
            </div>
          )}
          {error && (
            <div className="alert-error mb-5">
              <span>⚠️</span> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="label">Email address</label>
              <input type="email" name="email" value={form.email}
                onChange={handleChange} placeholder="you@example.com"
                className="input" autoComplete="email" />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="label mb-0">Password</label>
                <Link to="/forgot-password"
                  className="text-xs text-green-600 font-semibold
                    hover:text-green-700">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPwd ? 'text' : 'password'}
                  name="password" value={form.password}
                  onChange={handleChange} placeholder="••••••••"
                  className="input pr-11" autoComplete="current-password"/>
                <button type="button" onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600 transition-colors">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor">
                    {showPwd ? (
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2} d="M13.875 18.825A10.05 10.05 0
                        0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97
                        0 011.563-3.029m5.858.908a3 3 0 114.243
                        4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532
                        7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0
                        0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025
                        0 01-4.132 5.411m0 0L21 21"/>
                    ) : (
                      <>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3
                          0 016 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2} d="M2.458 12C3.732 7.943 7.523
                          5 12 5c4.478 0 8.268 2.943 9.542 7-1.274
                          4.057-5.064 7-9.542 7-4.477
                          0-8.268-2.943-9.542-7z"/>
                      </>
                    )}
                  </svg>
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base mt-2">
              {loading ? (
                <>
                  <svg className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10"
                      stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Signing in...
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-8">
            New to TurfMate?{' '}
            <Link to="/register"
              className="text-green-600 font-semibold hover:text-green-700">
              Create a free account
            </Link>
          </p>

          {/* Demo accounts */}
          <div className="mt-8 pt-6 border-t border-gray-100">
            <p className="text-xs text-gray-400 text-center mb-3 font-medium">
              Demo Accounts
            </p>
            <div className="grid grid-cols-3 gap-2">
              {[
                { role: 'Player', email: 'arjun@gmail.com', color: 'bg-green-50 text-green-700 border-green-200' },
                { role: 'Owner',  email: 'rahul@gmail.com', color: 'bg-blue-50 text-blue-700 border-blue-200' },
                { role: 'Admin',  email: 'admin@turfmate.com', color: 'bg-purple-50 text-purple-700 border-purple-200' },
              ].map(d => (
                <button key={d.role}
                  onClick={() => setForm({
                    email: d.email, password: 'Test1234'
                  })}
                  className={`text-xs font-semibold py-2 px-3 rounded-xl
                    border transition-all hover:shadow-sm ${d.color}`}>
                  {d.role}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-gray-400 text-center mt-2">
              All use password: Test1234
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}