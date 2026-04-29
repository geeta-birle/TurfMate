import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const Navbar = () => {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  const navLinks = [
    { label: 'Turfs', path: '/turfs' },
    { label: 'Matches', path: '/matches' },
    ...(user ? [{ label: 'Dashboard', path: '/dashboard' }] : []),
  ];

  const isActive = (path) => location.pathname.startsWith(path);

  return (
    <nav className="bg-white border-b border-gray-100 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center
                            justify-center text-white font-bold text-sm">T</div>
            <span className="text-xl font-bold text-gray-900">
              Turf<span className="text-primary-600">Mate</span>
            </span>
          </Link>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-1">
            {navLinks.map(link => (
              <Link key={link.path} to={link.path}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                  ${isActive(link.path)
                    ? 'bg-primary-50 text-primary-700'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}>
                {link.label}
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user ? (
              <>
                {/* Notifications Bell */}
                <Link to="/notifications" className="relative p-2 rounded-lg
                  hover:bg-gray-100 transition-colors">
                  <svg className="w-5 h-5 text-gray-600" fill="none"
                    viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6
                         6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4
                         17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  {unreadCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 h-4 w-4
                      bg-red-500 rounded-full text-white text-xs
                      flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </Link>

                {/* Profile Dropdown */}
                <div className="relative">
                  <button onClick={() => setProfileOpen(!profileOpen)}
                    className="flex items-center gap-2 p-1.5 rounded-xl
                      hover:bg-gray-100 transition-colors">
                    <div className="w-8 h-8 rounded-full bg-primary-100
                      flex items-center justify-center text-primary-700
                      font-semibold text-sm">
                      {user.name?.charAt(0).toUpperCase()}
                    </div>
                    <span className="hidden md:block text-sm font-medium
                      text-gray-700">{user.name?.split(' ')[0]}</span>
                    <svg className="w-4 h-4 text-gray-400" fill="none"
                      viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white
                      rounded-xl shadow-lg border border-gray-100 py-1 z-50"
                      onMouseLeave={() => setProfileOpen(false)}>
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="text-sm font-semibold text-gray-900">
                          {user.name}</p>
                        <p className="text-xs text-gray-500 capitalize">
                          {user.role}</p>
                      </div>
                      {[
                        { label: 'Profile', path: '/profile' },
                        { label: 'Dashboard', path: '/dashboard' },
                        { label: 'My Bookings', path: '/bookings/my' },
                      ].map(item => (
                        <Link key={item.path} to={item.path}
                          onClick={() => setProfileOpen(false)}
                          className="block px-4 py-2 text-sm text-gray-700
                            hover:bg-gray-50 transition-colors">
                          {item.label}
                        </Link>
                      ))}
                      <hr className="my-1 border-gray-100" />
                      <button onClick={handleLogout}
                        className="w-full text-left px-4 py-2 text-sm
                          text-red-600 hover:bg-red-50 transition-colors">
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Link to="/login" className="btn-secondary text-sm py-2 px-4">
                  Login
                </Link>
                <Link to="/register" className="btn-primary text-sm py-2 px-4">
                  Sign Up
                </Link>
              </div>
            )}

            {/* Mobile menu */}
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-gray-100">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round"
                  strokeWidth={2} d={menuOpen
                    ? 'M6 18L18 6M6 6l12 12'
                    : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>

      {/* Email verification banner */}
      {user && !user.is_verified && (
        <div className="bg-yellow-500 text-white text-center py-2 px-4
          text-sm font-medium">
          📧 Please verify your email address.{' '}
          <button
            onClick={async () => {
              try {
                await api.post('/auth/resend-verification',
                  { email: user.email });
                alert('Verification email sent! Check your inbox.');
              } catch {
                alert('Failed to send. Try again.');
              }
            }}
            className="underline font-bold hover:text-yellow-100">
            Resend verification email
          </button>
        </div>
)}
        {/* Mobile Nav */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 py-2">
            {navLinks.map(link => (
              <Link key={link.path} to={link.path}
                onClick={() => setMenuOpen(false)}
                className="block px-4 py-2.5 text-sm font-medium text-gray-700
                  hover:bg-gray-50 rounded-lg">
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </nav>
  );
};
export default Navbar;