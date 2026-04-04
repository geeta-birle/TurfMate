import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useNotifications } from '../context/NotificationContext';
import { notificationService } from '../services/notificationService';

const NOTIF_ICONS = {
  new_booking:       '📋',
  booking_confirmed: '✅',
  payment_success:   '💳',
  player_joined:     '🙌',
  join_request:      '📩',
  request_approved:  '✅',
  request_rejected:  '❌',
  match_cancelled:   '🚫',
  player_left:       '👋',
  turf_approved:     '🏟️',
  turf_rejected:     '❌',
  account_banned:    '🚫',
  account_activated: '✅',
  refund_initiated:  '💸',
  refund_completed:  '💰',
  refund_failed:     '❌',
};

const timeAgo = (date) => {
  const diff = (Date.now() - new Date(date)) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const Notifications = () => {
  const { notifications, unreadCount, markAllRead, fetchNotifications }
    = useNotifications();
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(false);

  const handleMarkAllRead = async () => {
    await markAllRead();
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.delete(id);
      fetchNotifications();
    } catch {}
  };

  const handleDeleteAll = async () => {
    if (!window.confirm('Delete all notifications?')) return;
    setLoading(true);
    try {
      await notificationService.deleteAll();
      fetchNotifications();
    } catch {}
    finally { setLoading(false); }
  };

  const handleMarkOne = async (id) => {
    try {
      await notificationService.markRead(id);
      fetchNotifications();
    } catch {}
  };

  const filtered = filter === 'unread'
    ? notifications.filter(n => !n.is_read)
    : notifications;

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm text-primary-600 font-medium mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {unreadCount > 0 && (
            <button onClick={handleMarkAllRead}
              className="btn-secondary text-sm py-2">
              ✓ Mark all read
            </button>
          )}
          {notifications.length > 0 && (
            <button onClick={handleDeleteAll} disabled={loading}
              className="text-sm text-red-500 hover:text-red-700
                font-medium px-3 py-2 rounded-xl hover:bg-red-50
                transition-colors">
              🗑️ Clear all
            </button>
          )}
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 mb-5">
        {['all', 'unread'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-full text-sm font-semibold
              border transition-all capitalize
              ${filter === f
                ? 'bg-primary-600 text-white border-primary-600'
                : 'bg-white text-gray-600 border-gray-200'}`}>
            {f}
            {f === 'unread' && unreadCount > 0 && (
              <span className="ml-1.5 bg-red-500 text-white text-xs
                rounded-full px-1.5 py-0.5">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      {filtered.length === 0 ? (
        <div className="text-center py-20 card">
          <div className="text-6xl mb-4">🔔</div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">
            {filter === 'unread' ? 'All caught up!' : 'No notifications'}
          </h3>
          <p className="text-gray-500 text-sm">
            {filter === 'unread'
              ? 'No unread notifications.'
              : 'Notifications will appear here.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(n => (
            <div key={n.id}
              className={`card p-4 flex items-start gap-3 transition-all
                ${!n.is_read
                  ? 'bg-primary-50/50 border-primary-100'
                  : 'hover:bg-gray-50'}`}>

              {/* Icon */}
              <div className={`w-10 h-10 rounded-xl flex items-center
                justify-center text-xl flex-shrink-0
                ${!n.is_read ? 'bg-primary-100' : 'bg-gray-100'}`}>
                {NOTIF_ICONS[n.type] || '🔔'}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {n.title && (
                      <p className={`text-sm font-bold
                        ${!n.is_read ? 'text-gray-900' : 'text-gray-700'}`}>
                        {n.title}
                      </p>
                    )}
                    <p className={`text-sm mt-0.5
                      ${!n.is_read ? 'text-gray-700' : 'text-gray-500'}`}>
                      {n.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      {timeAgo(n.created_at)}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {!n.is_read && (
                      <button onClick={() => handleMarkOne(n.id)}
                        title="Mark as read"
                        className="w-7 h-7 rounded-lg hover:bg-primary-100
                          flex items-center justify-center text-primary-600
                          transition-colors text-xs font-bold">
                        ✓
                      </button>
                    )}
                    <button onClick={() => handleDelete(n.id)}
                      title="Delete"
                      className="w-7 h-7 rounded-lg hover:bg-red-100
                        flex items-center justify-center text-red-400
                        transition-colors text-xs">
                      ✕
                    </button>
                  </div>
                </div>

                {/* Action Links based on type */}
                {n.data && (
                  <div className="mt-2">
                    {n.data.booking_id && (
                      <Link to={`/bookings/${n.data.booking_id}`}
                        className="text-xs text-primary-600 font-semibold
                          hover:underline">
                        View Booking →
                      </Link>
                    )}
                    {n.data.match_id && (
                      <Link to={`/matches/${n.data.match_id}`}
                        className="text-xs text-primary-600 font-semibold
                          hover:underline">
                        View Match →
                      </Link>
                    )}
                    {n.data.turf_id && (
                      <Link to={`/turfs/${n.data.turf_id}`}
                        className="text-xs text-primary-600 font-semibold
                          hover:underline">
                        View Turf →
                      </Link>
                    )}
                  </div>
                )}
              </div>

              {/* Unread dot */}
              {!n.is_read && (
                <div className="w-2 h-2 bg-primary-500 rounded-full
                  flex-shrink-0 mt-1.5" />
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
export default Notifications;