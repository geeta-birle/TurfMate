import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from '../components/common/ProtectedRoute';

import VerifyEmail     from '../pages/auth/VerifyEmail';
import ForgotPassword  from '../pages/auth/ForgotPassword';
import ResetPassword   from '../pages/auth/ResetPassword';

import Home            from '../pages/Home';
import Login           from '../pages/auth/Login';
import Register        from '../pages/auth/Register';
import TurfListing     from '../pages/turf/TurfListing';
import TurfDetail      from '../pages/turf/TurfDetail';
import CreateTurf      from '../pages/turf/CreateTurf';
import ManageTurf      from '../pages/turf/ManageTurf';
import MatchDiscovery  from '../pages/match/MatchDiscovery';
import MatchDetail     from '../pages/match/MatchDetail';
import CreateMatch     from '../pages/match/CreateMatch';
import MyMatches       from '../pages/match/MyMatches';
import BookingDetail   from '../pages/booking/BookingDetail';
import BookingSuccess  from '../pages/booking/BookingSuccess';
import MyBookings      from '../pages/booking/MyBookings';
import PlayerDashboard from '../pages/dashboard/PlayerDashboard';
import OwnerDashboard  from '../pages/dashboard/OwnerDashboard';
import AdminDashboard  from '../pages/dashboard/AdminDashboard';
import Profile         from '../pages/profile/Profile';
import Notifications   from '../pages/Notifications';
import PlayerProfile   from '../pages/player/PlayerProfile';

const AppRoutes = () => {
  const { user } = useAuth();

  return (
    <Routes>

      {/* ── Public ──────────────────────────────── */}
      <Route path="/" element={<Home />} />

      {/* IMPORTANT: specific turf routes BEFORE /turfs/:id */}
      <Route path="/turfs" element={<TurfListing />} />
      <Route path="/turfs/create" element={
        <ProtectedRoute roles={['owner']}>
          <CreateTurf />
        </ProtectedRoute>
      } />
      <Route path="/turfs/:id/manage" element={
        <ProtectedRoute roles={['owner', 'admin']}>
          <ManageTurf />
        </ProtectedRoute>
      } />
      <Route path="/turfs/:id" element={<TurfDetail />} />

      {/* IMPORTANT: specific match routes BEFORE /matches/:id */}
      <Route path="/matches" element={<MatchDiscovery />} />
      <Route path="/matches/my" element={
        <ProtectedRoute><MyMatches /></ProtectedRoute>
      } />
      <Route path="/matches/create" element={
        <ProtectedRoute><CreateMatch /></ProtectedRoute>
      } />
      <Route path="/matches/:id" element={<MatchDetail />} />

      {/* ── Auth ────────────────────────────────── */}
      <Route path="/login"
        element={user
          ? <Navigate to="/dashboard" replace />
          : <Login />} />
      <Route path="/register"
        element={user
          ? <Navigate to="/dashboard" replace />
          : <Register />} />

      {/* ── Protected ───────────────────────────── */}
      <Route path="/bookings/my" element={
        <ProtectedRoute><MyBookings /></ProtectedRoute>
      } />
      <Route path="/bookings/:id/success" element={
        <ProtectedRoute><BookingSuccess /></ProtectedRoute>
      } />
      <Route path="/bookings/:id" element={
        <ProtectedRoute><BookingDetail /></ProtectedRoute>
      } />

      <Route path="/profile" element={
        <ProtectedRoute><Profile /></ProtectedRoute>
      } />
      <Route path="/notifications" element={
        <ProtectedRoute><Notifications /></ProtectedRoute>
      } />

      {/* ── Player Profile (public) ──────────────── */}
      <Route path="/players/:id" element={<PlayerProfile />} />

      {/* ── Dashboard Redirect ───────────────────── */}
      <Route path="/dashboard" element={
        <ProtectedRoute>
          {user?.role === 'owner'
            ? <Navigate to="/dashboard/owner" replace />
            : user?.role === 'admin'
            ? <Navigate to="/dashboard/admin" replace />
            : <Navigate to="/dashboard/player" replace />}
        </ProtectedRoute>
      } />

      {/* ── Dashboards ──────────────────────────── */}
      <Route path="/dashboard/player" element={
        <ProtectedRoute roles={['player']}>
          <PlayerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/owner" element={
        <ProtectedRoute roles={['owner']}>
          <OwnerDashboard />
        </ProtectedRoute>
      } />
      <Route path="/dashboard/admin" element={
        <ProtectedRoute roles={['admin']}>
          <AdminDashboard />
        </ProtectedRoute>
      } />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* ── 404 ─────────────────────────────────── */}
      <Route path="*" element={
        <div className="flex flex-col items-center justify-center
          min-h-screen gap-4">
          <div className="text-8xl font-black text-gray-200">404</div>
          <p className="text-gray-500 text-xl">Page not found</p>
          <a href="/" className="btn-primary">Go Home</a>
        </div>
      } />

    </Routes>
  );
};
export default AppRoutes;