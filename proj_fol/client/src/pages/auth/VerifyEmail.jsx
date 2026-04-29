import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import api from '../../services/api';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [status, setStatus] = useState('loading'); // loading | success | error | expired
  const [message, setMessage] = useState('');
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState('');

  useEffect(() => {
    if (token) verifyToken();
    else setStatus('error');
  }, [token]);

  const verifyToken = async () => {
    try {
      const { data } = await api.get(`/auth/verify-email/${token}`);
      setStatus('success');
      setMessage(data.message);
    } catch (err) {
      const code = err.response?.data?.code;
      if (code === 'TOKEN_EXPIRED') {
        setStatus('expired');
      } else {
        setStatus('error');
      }
      setMessage(err.response?.data?.message || 'Verification failed.');
    }
  };

  const handleResend = async (e) => {
    e.preventDefault();
    setResending(true);
    try {
      await api.post('/auth/resend-verification', { email: resendEmail });
      setResendSuccess('Verification email sent! Check your inbox.');
    } catch (err) {
      setResendSuccess(err.response?.data?.message || 'Failed to resend.');
    } finally {
      setResending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50
      to-white flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        {/* Loading */}
        {status === 'loading' && (
          <div className="card p-8">
            <div className="w-16 h-16 bg-primary-100 rounded-full flex
              items-center justify-center mx-auto mb-4">
              <div className="animate-spin h-8 w-8 border-4
                border-primary-200 border-t-primary-600 rounded-full" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">
              Verifying your email...
            </h2>
            <p className="text-gray-500 mt-2">Please wait a moment.</p>
          </div>
        )}

        {/* Success */}
        {status === 'success' && (
          <div className="card p-8">
            <div className="w-20 h-20 bg-green-100 rounded-full flex
              items-center justify-center mx-auto mb-4">
              <span className="text-4xl">✅</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Email Verified!
            </h2>
            <p className="text-gray-500 mb-6">{message}</p>
            <Link to="/login" className="btn-primary w-full py-3
              text-base block text-center">
              Login to TurfMate →
            </Link>
          </div>
        )}

        {/* Expired */}
        {status === 'expired' && (
          <div className="card p-8">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex
              items-center justify-center mx-auto mb-4">
              <span className="text-4xl">⏰</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Link Expired
            </h2>
            <p className="text-gray-500 mb-6">
              Your verification link has expired. Request a new one below.
            </p>
            {resendSuccess ? (
              <div className="bg-green-50 border border-green-200
                text-green-700 rounded-xl px-4 py-3 text-sm">
                ✅ {resendSuccess}
              </div>
            ) : (
              <form onSubmit={handleResend} className="space-y-3">
                <input type="email" value={resendEmail}
                  onChange={e => setResendEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="input" required />
                <button type="submit" disabled={resending}
                  className="btn-primary w-full py-3">
                  {resending ? 'Sending...' : 'Resend Verification Email'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div className="card p-8">
            <div className="w-20 h-20 bg-red-100 rounded-full flex
              items-center justify-center mx-auto mb-4">
              <span className="text-4xl">❌</span>
            </div>
            <h2 className="text-2xl font-extrabold text-gray-900 mb-2">
              Verification Failed
            </h2>
            <p className="text-gray-500 mb-6">
              {message || 'Invalid verification link.'}
            </p>
            <div className="space-y-3">
              {resendSuccess ? (
                <div className="bg-green-50 border border-green-200
                  text-green-700 rounded-xl px-4 py-3 text-sm">
                  ✅ {resendSuccess}
                </div>
              ) : (
                <form onSubmit={handleResend} className="space-y-3">
                  <input type="email" value={resendEmail}
                    onChange={e => setResendEmail(e.target.value)}
                    placeholder="Enter your email to resend"
                    className="input" required />
                  <button type="submit" disabled={resending}
                    className="btn-primary w-full py-3">
                    {resending ? 'Sending...' : 'Resend Verification Email'}
                  </button>
                </form>
              )}
              <Link to="/login"
                className="block text-sm text-gray-500 hover:text-gray-700">
                Back to Login
              </Link>
            </div>
          </div>
        )}

        {/* Logo */}
        <Link to="/" className="inline-flex items-center gap-2 mt-6">
          <div className="w-7 h-7 bg-primary-600 rounded-lg flex
            items-center justify-center text-white font-bold text-sm">
            T
          </div>
          <span className="font-bold text-gray-600">TurfMate</span>
        </Link>
      </div>
    </div>
  );
};
export default VerifyEmail;