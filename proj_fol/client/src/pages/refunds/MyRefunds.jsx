import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { refundService } from '../../services/refundService';
import Loader from '../../components/common/Loader';

const STATUS_STYLES = {
  pending:   'bg-yellow-100 text-yellow-700',
  processed: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-700',
};

const STATUS_LABELS = {
  pending:   '⏳ Awaiting Approval',
  processed: '✅ Refunded',
  rejected:  '❌ Rejected',
};

const MyRefunds = () => {
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    refundService.getMine()
      .then(({ data }) => setRefunds(data.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Loader center size="lg" />;

  const totalRefunded = refunds
    .filter(r => r.status === 'processed')
    .reduce((sum, r) => sum + parseFloat(r.refund_amount), 0);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/dashboard" className="hover:text-primary-600">Dashboard</Link>
        <span>›</span>
        <Link to="/wallet" className="hover:text-primary-600">Wallet</Link>
        <span>›</span>
        <span className="text-gray-900">My Refunds</span>
      </nav>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">My Refunds</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            {refunds.length} request{refunds.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      {totalRefunded > 0 && (
        <div className="card p-4 mb-6 bg-gradient-to-r from-amber-500
          to-amber-600 border-0 text-white flex items-center justify-between">
          <div>
            <p className="text-amber-100 text-sm font-medium">
              Total refunded to wallet
            </p>
            <p className="text-2xl font-bold">
              ₹{totalRefunded.toLocaleString()}
            </p>
          </div>
          <div className="text-4xl opacity-80">↩️</div>
        </div>
      )}

      {refunds.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="text-5xl mb-3">💰</div>
          <h3 className="font-bold text-gray-900 mb-2">No refund requests yet</h3>
          <p className="text-gray-500 text-sm mb-4">
            Request a refund from a paid match at least 2 hours before it starts.
          </p>
          <Link to="/matches/my" className="btn-primary">My Matches</Link>
        </div>
      ) : (
        <div className="space-y-4">
          {refunds.map(r => {
            const paid    = parseFloat(r.amount);
            const refunded = parseFloat(r.refund_amount);
            const fee     = parseFloat(r.platform_fee);
            const penalty = parseFloat(r.penalty_amount);

            return (
              <div key={r.id} className="card p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-amber-50 rounded-xl flex
                      items-center justify-center text-2xl flex-shrink-0">
                      💰
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{r.match_title}</p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        📅 {new Date(r.match_date).toLocaleDateString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                        })}
                        {' · ⏰ '}{r.start_time?.slice(0, 5)}
                      </p>
                      {r.reason && (
                        <p className="text-xs text-gray-400 mt-1 italic">
                          "{r.reason}"
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`font-bold text-lg
                      ${r.status === 'processed' ? 'text-green-600' : 'text-gray-700'}`}>
                      {r.status === 'processed' ? '+' : ''}₹{refunded.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-400">
                      of ₹{paid.toLocaleString()} paid
                    </p>
                  </div>
                </div>

                {/* Breakdown — only show if processed */}
                {r.status === 'processed' && (
                  <div className="grid grid-cols-3 gap-2 text-center text-xs mb-4">
                    <div className="bg-green-50 rounded-lg p-2.5">
                      <p className="text-green-700 font-bold text-sm">
                        ₹{refunded.toLocaleString()}
                      </p>
                      <p className="text-gray-500 mt-0.5">Refunded (80%)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-gray-700 font-bold text-sm">
                        ₹{fee.toLocaleString()}
                      </p>
                      <p className="text-gray-500 mt-0.5">Platform (10%)</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-2.5">
                      <p className="text-gray-700 font-bold text-sm">
                        ₹{penalty.toLocaleString()}
                      </p>
                      <p className="text-gray-500 mt-0.5">Penalty (10%)</p>
                    </div>
                  </div>
                )}

                {r.status === 'pending' && (
                  <div className="bg-yellow-50 rounded-xl px-4 py-3 mb-4
                    text-sm text-yellow-700 border border-yellow-200">
                    ⏳ Waiting for match organizer to approve your refund request.
                  </div>
                )}

                {r.status === 'rejected' && (
                  <div className="bg-red-50 rounded-xl px-4 py-3 mb-4
                    text-sm text-red-600 border border-red-200">
                    ❌ Your refund request was declined by the organizer.
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <span className={`badge text-xs font-semibold
                    ${STATUS_STYLES[r.status]}`}>
                    {STATUS_LABELS[r.status]}
                  </span>
                  <Link to={`/matches/${r.match_id}`}
                    className="text-xs text-primary-600 hover:underline">
                    View Match →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRefunds;