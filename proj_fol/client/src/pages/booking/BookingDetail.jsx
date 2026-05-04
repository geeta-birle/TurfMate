import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';
import { paymentService } from '../../services/paymentService';
import Loader from '../../components/common/Loader';

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
  completed: 'bg-blue-100 text-blue-700',
};

const BookingDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paying, setPaying] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => { fetchBooking(); }, [id]);

  const fetchBooking = async () => {
    try {
      const { data } = await bookingService.getOne(id);
      setBooking(data.data);
    } catch {
      setError('Booking not found.');
    } finally {
      setLoading(false);
    }
  };

  // ── Razorpay Payment ──────────────────────────────────
  const handlePayment = async () => {
    setPaying(true);
    setError('');
    try {
      const { data } = await paymentService.createOrder({ booking_id: id });
      const order = data.data;

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: 'TurfMate',
        description: `Booking for ${booking.turf_name}`,
        order_id: order.order_id,
        prefill: order.prefill,
        theme: { color: '#16a34a' },
        handler: async (response) => {
          try {
            await paymentService.verifyPayment({
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              booking_id: id,
            });
            navigate(`/bookings/${id}/success`);
          } catch {
            setError('Payment verification failed. Contact support.');
            setPaying(false);
          }
        },
        modal: { ondismiss: () => setPaying(false) },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        setError(`Payment failed: ${response.error.description}`);
        setPaying(false);
      });
      rzp.open();
    } catch (err) {
      setError(err.response?.data?.message || 'Payment initiation failed.');
      setPaying(false);
    }
  };

  // ── Cancel Booking ────────────────────────────────────
  const handleCancel = async () => {
    if (!window.confirm('Cancel this booking? A refund will be processed.'))
      return;
    setCancelling(true);
    try {
      await bookingService.cancel(id);
      setSuccess('Booking cancelled successfully.');
      fetchBooking();
    } catch (err) {
      setError(err.response?.data?.message || 'Cancellation failed.');
    } finally {
      setCancelling(false);
    }
  };

  const formatTime = (t) => {
    if (!t) return '';
    const [h, m] = t.split(':');
    const hour = parseInt(h);
    return `${hour > 12 ? hour - 12 : hour || 12}:${m} ${hour >= 12 ? 'PM' : 'AM'}`;
  };

  if (loading) return <Loader center size="lg" />;
  if (!booking) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-6xl">😕</div>
      <p className="text-xl text-gray-600">Booking not found</p>
      <Link to="/bookings/my" className="btn-primary">My Bookings</Link>
    </div>
  );

  // ── Computed States ───────────────────────────────────
  const isPaid      = booking.payment_status === 'success';
  const isConfirmed = booking.status === 'confirmed' && isPaid;
  const isPending   = booking.status === 'pending' || !isPaid;
  const canPay      = isPending && booking.status !== 'cancelled';
  const canCancel   = ['pending', 'confirmed'].includes(booking.status);
  const hasMatch    = !!booking.match_id;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        <span>›</span>
        <Link to="/bookings/my" className="hover:text-primary-600">My Bookings</Link>
        <span>›</span>
        <span className="text-gray-900">Booking Details</span>
      </nav>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-5 text-sm leading-relaxed">
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700
          rounded-xl px-4 py-3 mb-5 text-sm">
          ✅ {success}
        </div>
      )}

      {/* Status Banner */}
      <div className={`rounded-2xl p-5 mb-6 flex items-center
        justify-between gap-4
        ${isConfirmed
          ? 'bg-green-50 border border-green-200'
          : booking.status === 'cancelled'
          ? 'bg-red-50 border border-red-200'
          : 'bg-yellow-50 border border-yellow-200'}`}>
        <div>
          <p className={`font-bold text-lg
            ${isConfirmed ? 'text-green-800'
              : booking.status === 'cancelled' ? 'text-red-800'
              : 'text-yellow-800'}`}>
            {isConfirmed
              ? '✅ Booking Confirmed'
              : booking.status === 'cancelled'
              ? '❌ Booking Cancelled'
              : '⏳ Payment Pending'}
          </p>
          <p className={`text-sm mt-0.5
            ${isConfirmed ? 'text-green-600'
              : booking.status === 'cancelled' ? 'text-red-600'
              : 'text-yellow-600'}`}>
            {isConfirmed
              ? 'Your slot is confirmed! Create a match to invite players.'
              : booking.status === 'cancelled'
              ? 'This booking has been cancelled.'
              : 'Complete payment below to confirm your slot.'}
          </p>
        </div>
        <span className={`badge text-sm font-bold capitalize
          px-3 py-1.5 flex-shrink-0
          ${STATUS_STYLES[booking.status]}`}>
          {booking.status}
        </span>
      </div>

      {/* Main Details Card */}
      <div className="card p-6 mb-5">
        <h2 className="font-bold text-gray-900 text-lg mb-5">Booking Details</h2>

        <div className="space-y-4">

          {/* Turf */}
          <div className="flex items-start gap-4 p-4 bg-gray-50 rounded-xl">
            <div className="w-12 h-12 bg-primary-100 rounded-xl flex
              items-center justify-center text-2xl flex-shrink-0">
              🏟️
            </div>
            <div>
              <p className="font-bold text-gray-900">{booking.turf_name}</p>
              <p className="text-sm text-gray-500">
                {booking.address}, {booking.city}
              </p>
              <Link to={`/turfs/${booking.turf_id}`}
                className="text-xs text-primary-600 hover:underline mt-1 inline-block">
                View Turf →
              </Link>
            </div>
          </div>

          {/* Slot Details */}
          <div className="grid grid-cols-3 gap-3">
            {[
              {
                icon: '📅', label: 'Date',
                value: new Date(booking.date).toLocaleDateString('en-IN', {
                  weekday: 'short', day: 'numeric', month: 'long',
                }),
              },
              { icon: '⏰', label: 'Start', value: formatTime(booking.start_time) },
              { icon: '⏰', label: 'End',   value: formatTime(booking.end_time) },
            ].map(item => (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xl mb-1">{item.icon}</div>
                <div className="text-xs text-gray-500">{item.label}</div>
                <div className="font-bold text-gray-900 text-sm mt-0.5">{item.value}</div>
              </div>
            ))}
          </div>

          {/* Payment Breakdown */}
          <div className="border border-gray-100 rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 font-semibold text-gray-700 text-sm">
              Payment Summary
            </div>
            <div className="p-4 space-y-2.5 text-sm">
              <div className="flex justify-between text-gray-600">
                <span>Turf booking</span>
                <span>₹{parseFloat(booking.total_amount).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Platform fee (10%)</span>
                <span>₹{parseFloat(booking.platform_fee).toLocaleString()}</span>
              </div>
              <div className="border-t border-gray-100 pt-2.5 flex
                justify-between font-bold text-gray-900">
                <span>Total</span>
                <span className="text-primary-600 text-base">
                  ₹{(
                    parseFloat(booking.total_amount) +
                    parseFloat(booking.platform_fee)
                  ).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Payment ID (if paid) */}
          {booking.razorpay_payment_id && (
            <div className="flex justify-between items-center text-sm
              bg-green-50 rounded-xl px-4 py-3">
              <span className="text-gray-600">Payment ID</span>
              <span className="font-mono text-xs text-green-700 font-semibold">
                {booking.razorpay_payment_id}
              </span>
            </div>
          )}

          {/* Booking ID */}
          <div className="flex justify-between items-center text-sm
            bg-gray-50 rounded-xl px-4 py-3">
            <span className="text-gray-600">Booking ID</span>
            <span className="font-mono text-xs text-gray-500">
              {booking.id?.slice(0, 8).toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* ── Match Card — only after confirmed + paid ── */}
      {isConfirmed && (
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-900 mb-3">Match</h3>
          {hasMatch ? (
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-gray-900">{booking.match_title}</p>
                <p className="text-sm text-gray-500 capitalize">
                  {booking.match_status} · {booking.current_players}/{booking.team_size} players
                </p>
              </div>
              <Link to={`/matches/${booking.match_id}`}
                className="btn-outline text-sm py-2 flex-shrink-0">
                View Match →
              </Link>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-4xl mb-2">🏆</div>
              <p className="text-gray-500 text-sm mb-4">
                No match yet. Create one to invite players and split the cost!
              </p>
              <Link to={`/matches/create?booking=${id}`} className="btn-primary">
                🏆 Create Match & Invite Players
              </Link>
            </div>
          )}
        </div>
      )}

      {/* ── Payment Pending Actions ─────────────────── */}
      {canPay && (
        <div className="card p-5 mb-5">
          <h3 className="font-bold text-gray-900 mb-2">Complete Payment</h3>
          <p className="text-sm text-gray-500 mb-4">
            Pay to confirm your slot and unlock match creation.
          </p>
          <button onClick={handlePayment} disabled={paying}
            className="btn-primary w-full py-3 text-base">
            {paying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12"
                    r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                </svg>
                Opening Payment...
              </span>
            ) : '💳 Pay Now via Razorpay'}
          </button>
        </div>
      )}

      {/* ── Bottom Action Bar ───────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
        {canCancel && (
          <button onClick={handleCancel} disabled={cancelling}
            className="flex-1 py-3 bg-red-50 hover:bg-red-100
              text-red-600 font-semibold rounded-xl border
              border-red-200 transition-colors">
            {cancelling ? 'Cancelling...' : '✕ Cancel Booking'}
          </button>
        )}
        <Link to="/bookings/my"
          className="btn-secondary py-3 px-6 text-center flex-1 sm:flex-none">
          ← My Bookings
        </Link>
      </div>
    </div>
  );
};

export default BookingDetail;