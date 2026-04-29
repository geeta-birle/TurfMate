import { useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import api from '../../services/api';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [form, setForm] = useState({
    newPassword: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.newPassword) {
      setError('Password is required.'); return;
    }
    if (form.newPassword.length < 8) {
      setError('Password must be at least 8 characters.'); return;
    }
    if (!/(?=.*[A-Za-z])(?=.*\d)/.test(form.newPassword)) {
      setError('Password must contain letters and numbers.'); return;
    }
    if (form.newPassword !== form.confirmPassword) {
      setError('Passwords do not match.'); return;
    }

    setLoading(true);
    setError('');
    try {
      await api.post('/auth/reset-password', {
        token,
        newPassword: form.newPassword,
      });
      navigate('/login', {
        state: { message: 'Password reset! Please login with your new password.' }
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Reset failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!token) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-6xl mb-4">❌</div>
        <h2 className="text-xl font-bold text-gray-900 mb-2">
          Invalid Reset Link
        </h2>
        <Link to="/forgot-password" className="btn-primary mt-4 inline-block">
          Request New Link
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50
      to-white flex items-center justify-center px-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-primary-600 rounded-xl flex
              items-center justify-center text-white font-bold text-lg">
              T
            </div>
            <span className="text-2xl font-extrabold text-gray-900">
              Turf<span className="text-primary-600">Mate</span>
            </span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900">
            Reset Password 🔒
          </h1>
          <p className="text-gray-500 mt-1">
            Enter your new password below.
          </p>
        </div>

        <div className="card p-8">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700
              rounded-xl px-4 py-3 mb-5 text-sm">
              ⚠️ {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-gray-700
                mb-1.5">New Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={e => setForm(p => ({
                    ...p, newPassword: e.target.value }))}
                  placeholder="Min 8 chars + numbers"
                  className="input pr-11" />
                <button type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2
                    text-gray-400 hover:text-gray-600">
                  {showPassword ? '🙈' : '👁️'}
                </button>
              </div>
              {/* Password strength */}
              {form.newPassword && (
                <div className="mt-2 flex gap-1">
                  {[1,2,3,4].map(i => (
                    <div key={i} className={`h-1 flex-1 rounded-full
                      transition-all
                      ${form.newPassword.length >= i * 2 + 2
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
              <label className="block text-sm font-semibold text-gray-700
                mb-1.5">Confirm New Password</label>
              <input
                type={showPassword ? 'text' : 'password'}
                value={form.confirmPassword}
                onChange={e => setForm(p => ({
                  ...p, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                className="input" />
              {form.confirmPassword && (
                <p className={`text-xs mt-1 ${
                  form.newPassword === form.confirmPassword
                    ? 'text-green-600' : 'text-red-500'}`}>
                  {form.newPassword === form.confirmPassword
                    ? '✓ Passwords match'
                    : '✗ Passwords do not match'}
                </p>
              )}
            </div>

            <button type="submit" disabled={loading}
              className="btn-primary w-full py-3 text-base">
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4"
                    viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12"
                      r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Resetting...
                </span>
              ) : '🔒 Reset Password'}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link to="/login" className="text-primary-600 font-semibold
              hover:text-primary-700">
              ← Back to Login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};
export default ResetPassword;