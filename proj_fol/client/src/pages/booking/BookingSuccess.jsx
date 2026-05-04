import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { bookingService } from '../../services/bookingService';

const BookingSuccess = () => {
  const { id } = useParams();
  const [booking, setBooking] = useState(null);

  useEffect(() => {
    bookingService.getOne(id)
      .then(({ data }) => setBooking(data.data))
      .catch(() => {});
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 to-white
      flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">

        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center
          justify-center mx-auto mb-6 animate-bounce">
          <span className="text-5xl">✅</span>
        </div>

        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
          Booking Confirmed!
        </h1>
        <p className="text-gray-500 mb-6">
          Your slot has been booked successfully. Now create a match
          and invite players!
        </p>

        {booking && (
          <div className="card p-5 mb-6 text-left">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Turf</span>
                <span className="font-semibold">{booking.turf_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Date</span>
                <span className="font-semibold">
                  {new Date(booking.date).toLocaleDateString('en-IN',
                    { day: 'numeric', month: 'long' })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Time</span>
                <span className="font-semibold">
                  {booking.start_time?.slice(0,5)} –{' '}
                  {booking.end_time?.slice(0,5)}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col gap-3">
          <Link to={`/matches/create?booking=${id}`}
            className="btn-primary py-3 text-base">
            🏆 Create Match & Invite Players
          </Link>
          <Link to="/dashboard"
            className="btn-secondary py-3">
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BookingSuccess;