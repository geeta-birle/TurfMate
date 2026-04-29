import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email) { setError('Email is required.'); return; }
    setLoading(true);
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Forgot Password?
          </h1>
          <p className="text-gray-500 mt-1">
            No worries! Enter your email and we'll send a reset link.
          </p>
        </div>

        <div className="card p-8">
          {sent ? (
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex
                items-center justify-center mx-auto mb-4">
                <span className="text-3xl">📧</span>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-2">
                Check Your Email
              </h3>
              <p className="text-gray-500 text-sm mb-6">
                If an account exists for <strong>{email}</strong>,
                a password reset link has been sent.
                Check your inbox and spam folder.
              </p>
              <p className="text-xs text-gray-400 mb-4">
                Link expires in 1 hour.
              </p>
              <Link to="/login" className="btn-primary w-full py-3
                block text-center">
                Back to Login
              </Link>
            </div>
          ) : (
            <>
              {error && (
                <div className="bg-red-50 border border-red-200
                  text-red-700 rounded-xl px-4 py-3 mb-5 text-sm">
                  ⚠️ {error}
                </div>
              )}
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold
                    text-gray-700 mb-1.5">
                    Email Address
                  </label>
                  <input type="email" value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="input" autoComplete="email" />
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
                      Sending...
                    </span>
                  ) : '📧 Send Reset Link'}
                </button>
              </form>
              <p className="text-center text-sm text-gray-500 mt-6">
                Remember your password?{' '}
                <Link to="/login" className="text-primary-600
                  font-semibold hover:text-primary-700">
                  Sign in
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default ForgotPassword;