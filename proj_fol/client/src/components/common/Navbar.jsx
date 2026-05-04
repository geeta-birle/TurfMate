import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';

const NAV_LINKS = [
  { label: 'Turfs',   path: '/turfs',   icon: '🏟️' },
  { label: 'Matches', path: '/matches', icon: '⚽' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const { unreadCount } = useNotifications();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef(null);

  const isActive = (path) => location.pathname.startsWith(path);

  useEffect(() => {
    const handler = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target))
        setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/');
    setProfileOpen(false);
  };

  const roleColors = {
    admin:  'bg-purple-100 text-purple-700',
    owner:  'bg-blue-100 text-blue-700',
    player: 'bg-green-100 text-green-700',
  };

  return (
    <>
      <nav className="bg-white border-b border-gray-100 sticky top-0
        z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">

            {/* Logo */}
            <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
              <div className="w-8 h-8 bg-green-600 rounded-lg flex
                items-center justify-center shadow-sm">
                <svg className="w-4 h-4 text-white" viewBox="0 0 24 24"
                  fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48
                    10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/>
                </svg>
              </div>
              <span className="text-lg font-bold text-gray-900 tracking-tight">
                Turf<span className="text-green-600">Mate</span>
              </span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center gap-1">
              {NAV_LINKS.map(link => (
                <Link key={link.path} to={link.path}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg
                    text-sm font-medium transition-all duration-150
                    ${isActive(link.path)
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <span className="text-base">{link.icon}</span>
                  {link.label}
                </Link>
              ))}
              {user && (
                <Link to="/dashboard"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg
                    text-sm font-medium transition-all duration-150
                    ${isActive('/dashboard')
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}>
                  <span className="text-base">📊</span>
                  Dashboard
                </Link>
              )}
            </div>

            {/* Right Side */}
            <div className="flex items-center gap-2">
              {user ? (
                <>
                  {/* Notifications */}
                  <Link to="/notifications"
                    className="relative p-2 rounded-xl hover:bg-gray-100
                      transition-colors text-gray-500 hover:text-gray-700">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
                      stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round"
                        strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032
                        2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0
                        .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0
                        11-6 0v-1m6 0H9"/>
                    </svg>
                    {unreadCount > 0 && (
                      <span className="absolute top-1 right-1 min-w-[18px]
                        h-[18px] bg-red-500 text-white text-[10px] font-bold
                        rounded-full flex items-center justify-center px-1
                        ring-2 ring-white">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </Link>

                  {/* Profile Dropdown */}
                  <div className="relative" ref={profileRef}>
                    <button onClick={() => setProfileOpen(!profileOpen)}
                      className="flex items-center gap-2 pl-2 pr-3 py-1.5
                        rounded-xl hover:bg-gray-100 transition-colors
                        border border-transparent hover:border-gray-200">
                      <div className="w-7 h-7 bg-green-600 rounded-lg flex
                        items-center justify-center text-white font-bold
                        text-xs flex-shrink-0">
                        {user.name?.charAt(0).toUpperCase()}
                      </div>
                      <div className="hidden md:block text-left">
                        <p className="text-sm font-semibold text-gray-800
                          leading-tight">
                          {user.name?.split(' ')[0]}
                        </p>
                        <p className="text-[10px] text-gray-400 capitalize
                          leading-tight">
                          {user.role}
                        </p>
                      </div>
                      <svg className="w-3.5 h-3.5 text-gray-400
                        hidden md:block" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round"
                          strokeWidth={2.5} d="M19 9l-7 7-7-7"/>
                      </svg>
                    </button>

                    {profileOpen && (
                      <div className="absolute right-0 top-full mt-2 w-56
                        bg-white rounded-2xl shadow-xl border border-gray-100
                        py-1.5 z-50 animate-scale-in overflow-hidden">

                        {/* User info header */}
                        <div className="px-4 py-3 border-b border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-green-600 rounded-xl
                              flex items-center justify-center text-white
                              font-bold text-sm flex-shrink-0">
                              {user.name?.charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-gray-900
                                text-sm truncate">{user.name}</p>
                              <p className="text-xs text-gray-400 truncate">
                                {user.email}
                              </p>
                            </div>
                          </div>
                          <span className={`mt-2 inline-flex text-[10px]
                            font-semibold px-2 py-0.5 rounded-full capitalize
                            ${roleColors[user.role] || 'bg-gray-100 text-gray-600'}`}>
                            {user.role}
                          </span>
                        </div>

                        {/* Menu items */}
                        {[
                          { icon: '👤', label: 'My Profile',    to: '/profile' },
                          { icon: '📊', label: 'Dashboard',     to: '/dashboard' },
                          { icon: '📋', label: 'My Bookings',   to: '/bookings/my' },
                          { icon: '🏆', label: 'My Matches',    to: '/matches/my' },
                          { icon: '🔔', label: 'Notifications', to: '/notifications' },
                          { icon: '💰', label: 'My Wallet', to: '/wallet' },
                        ].map(item => (
                          <Link key={item.to} to={item.to}
                            onClick={() => setProfileOpen(false)}
                            className="flex items-center gap-3 px-4 py-2.5
                              text-sm text-gray-700 hover:bg-gray-50
                              transition-colors">
                            <span className="text-base w-5 text-center
                              flex-shrink-0">{item.icon}</span>
                            {item.label}
                          </Link>
                        ))}

                        <div className="border-t border-gray-100 mt-1 pt-1">
                          <button onClick={handleLogout}
                            className="flex items-center gap-3 px-4 py-2.5
                              text-sm text-red-600 hover:bg-red-50
                              transition-colors w-full">
                            <span className="text-base w-5 text-center
                              flex-shrink-0">🚪</span>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="btn-ghost text-sm px-4 py-2">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary text-sm
                    px-4 py-2 shadow-sm">
                    Get Started
                  </Link>
                </div>
              )}

              {/* Mobile menu toggle */}
              <button onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden p-2 rounded-xl hover:bg-gray-100
                  transition-colors ml-1">
                <svg className="w-5 h-5 text-gray-600" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    strokeWidth={2} d={menuOpen
                      ? 'M6 18L18 6M6 6l12 12'
                      : 'M4 6h16M4 12h16M4 18h16'}/>
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-gray-100 bg-white
            animate-fade-in">
            <div className="px-4 py-3 space-y-1">
              {NAV_LINKS.map(link => (
                <Link key={link.path} to={link.path}
                  onClick={() => setMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-medium transition-colors
                    ${isActive(link.path)
                      ? 'bg-green-50 text-green-700'
                      : 'text-gray-700 hover:bg-gray-50'}`}>
                  <span>{link.icon}</span> {link.label}
                </Link>
              ))}
              {user && (
                <Link to="/dashboard"
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl
                    text-sm font-medium text-gray-700 hover:bg-gray-50">
                  <span>📊</span> Dashboard
                </Link>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* Email verification banner */}
      {user && !user.is_verified && (
        <div className="bg-amber-500 text-white text-center py-2.5 px-4
          text-sm font-medium flex items-center justify-center gap-3">
          <span>📧 Please verify your email to access all features.</span>
        </div>
      )}
    </>
  );
}