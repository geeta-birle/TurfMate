import { useState, useEffect, useCallback } from 'react';
import { Link }                               from 'react-router-dom';
import { walletService }                      from '../../services/walletService';
import { useAuth }                            from '../../context/AuthContext';
import Loader                                 from '../../components/common/Loader';

const CATEGORY_LABELS = {
  topup:                    { label: 'Wallet Top-up',      icon: '💳', color: 'text-green-600' },
  match_join:               { label: 'Match Payment',      icon: '⚽', color: 'text-red-500'   },
  match_refund:             { label: 'Match Refund',       icon: '↩️', color: 'text-green-600' },
  settlement_to_owner:      { label: 'Settlement',         icon: '🏟️', color: 'text-blue-600'  },
  settlement_platform_fee:  { label: 'Platform Fee',       icon: '💰', color: 'text-purple-600'},
  cancellation_penalty:     { label: 'Penalty Received',   icon: '⚠️', color: 'text-orange-600'},
  booking_payment:          { label: 'Booking Payment',    icon: '📋', color: 'text-red-500'   },
  initial_balance:          { label: 'Initial Balance',    icon: '🎁', color: 'text-green-600' },
};

const FILTERS = [
  { value: '',                        label: 'All' },
  { value: 'match_join',              label: '⚽ Match Payments' },
  { value: 'match_refund',            label: '↩️ Refunds' },
  { value: 'topup',                   label: '💳 Top-ups' },
  { value: 'settlement_to_owner',     label: '🏟️ Settlements' },
  { value: 'settlement_platform_fee', label: '💰 Platform Fees' },
];

export default function Wallet() {
  const { user } = useAuth();

  const [wallet,          setWallet]          = useState(null);
  const [transactions,    setTransactions]    = useState([]);
  const [pagination,      setPagination]      = useState({});
  const [loading,         setLoading]         = useState(true);
  const [txnLoading,      setTxnLoading]      = useState(false);
  const [activeTab,       setActiveTab]       = useState('overview');
  const [topupAmount,     setTopupAmount]     = useState('');
  const [topupLoading,    setTopupLoading]    = useState(false);
  const [msg,             setMsg]             = useState({ text: '', type: '' });
  const [page,            setPage]            = useState(1);
  const [categoryFilter,  setCategoryFilter]  = useState('');

  const showMsg = (text, type = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  const fetchWallet = useCallback(async () => {
    try {
      const { data } = await walletService.getWallet();
      setWallet(data.data);
    } catch {
      showMsg('Failed to load wallet.', 'error');
    } finally { setLoading(false); }
  }, []);

  // Define fetchTransactions BEFORE useEffect that calls it
  const fetchTransactions = useCallback(async () => {
    setTxnLoading(true);
    try {
      const { data } = await walletService.getTransactions({
        page,
        limit: 15,
        ...(categoryFilter ? { category: categoryFilter } : {}),
      });
      setTransactions(data.data || []);
      setPagination(data.pagination || {});
    } catch {
      showMsg('Failed to load transactions.', 'error');
    } finally { setTxnLoading(false); }
  }, [page, categoryFilter]);

  // Now useEffect can safely reference fetchTransactions
  useEffect(() => { fetchWallet(); }, [fetchWallet]);
  useEffect(() => { fetchTransactions(); }, [fetchTransactions]);

  const handleTopUp = async () => {
    const amount = parseFloat(topupAmount);
    if (!amount || amount < 100) {
      showMsg('Minimum top-up is ₹100.', 'error'); return;
    }
    setTopupLoading(true);
    try {
      const { data } = await walletService.createTopUpOrder({ amount });
      const order    = data.data;

      const options = {
        key:         order.key,
        amount:      order.amount,
        currency:    order.currency,
        name:        'TurfMate Wallet',
        description: 'Add money to wallet',
        order_id:    order.order_id,
        prefill:     order.prefill,
        theme:       { color: '#16a34a' },
        handler: async (response) => {
          try {
            await walletService.verifyTopUp({
              razorpay_order_id:   response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature:  response.razorpay_signature,
              amount:              order.amount,
            });
            showMsg(`₹${topupAmount} added to wallet! ✅`);
            setTopupAmount('');
            fetchWallet();
            fetchTransactions();
          } catch {
            showMsg('Payment verification failed.', 'error');
          } finally { setTopupLoading(false); }
        },
        modal: { ondismiss: () => setTopupLoading(false) },
      };

      new window.Razorpay(options).open();
    } catch (err) {
      showMsg(err.response?.data?.message || 'Failed to initiate payment.', 'error');
      setTopupLoading(false);
    }
  };

  if (loading) return <Loader center size="lg" />;

  const QUICK_AMOUNTS = [100, 500, 1000, 2000, 5000];
  const balance       = parseFloat(wallet?.balance || 0);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="page-container py-8 max-w-4xl">

        <div className="mb-8">
          <p className="text-sm text-gray-400 font-medium mb-1">Finance</p>
          <h1 className="page-title">My Wallet</h1>
        </div>

        {/* Alert */}
        {msg.text && (
          <div className={`rounded-xl px-4 py-3 mb-5 text-sm
            flex items-center gap-2 animate-fade-up
            ${msg.type === 'error' ? 'alert-error' : 'alert-success'}`}>
            {msg.type === 'error' ? '⚠️' : '✅'} {msg.text}
          </div>
        )}

        {/* Balance Card */}
        <div className="card mb-6 overflow-hidden animate-fade-up">
          <div className="bg-gradient-to-br from-green-600 to-green-800
            p-6 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-40 h-40 bg-white/5
              rounded-full -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5
              rounded-full translate-y-1/2 -translate-x-1/2" />
            <div className="relative">
              <p className="text-green-100 text-sm font-medium mb-1">
                Available Balance
              </p>
              <p className="text-4xl font-bold mb-3">
                ₹{balance.toLocaleString('en-IN', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
              <div className="flex gap-4 text-sm text-green-100">
                <span>📥 {wallet?.stats?.total_credits || 0} credits</span>
                <span>📤 {wallet?.stats?.total_debits  || 0} debits</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-3 divide-x divide-gray-100 p-4">
            {[
              { label: 'Total In',  value: wallet?.stats?.total_credited || 0, color: 'text-green-600' },
              { label: 'Total Out', value: wallet?.stats?.total_debited  || 0, color: 'text-red-500'   },
              {
                label: 'Net',
                value: (parseFloat(wallet?.stats?.total_credited || 0) -
                        parseFloat(wallet?.stats?.total_debited  || 0)),
                color: 'text-gray-900',
              },
            ].map(s => (
              <div key={s.label} className="text-center px-4">
                <p className={`text-lg font-bold ${s.color}`}>
                  ₹{parseFloat(s.value).toLocaleString()}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-bar mb-6">
          {[
            { id: 'overview',      label: '📊 Overview' },
            { id: 'topup',         label: '➕ Add Money' },
            { id: 'transactions',  label: '📋 History' },
          ].map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-3 animate-fade-up">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900">Recent Activity</h2>
              <button onClick={() => setActiveTab('transactions')}
                className="text-xs text-green-600 font-semibold">
                View all →
              </button>
            </div>
            {transactions.slice(0, 6).length === 0 ? (
              <div className="card p-10 empty-state">
                <div className="empty-icon">💳</div>
                <p className="empty-title">No transactions yet</p>
                <p className="empty-desc">
                  Your activity will appear here
                </p>
              </div>
            ) : transactions.slice(0, 6).map(txn =>
              <TransactionRow key={txn.id} txn={txn} />
            )}
          </div>
        )}

        {/* Top-up Tab */}
        {activeTab === 'topup' && (
          <div className="card p-6 animate-fade-up">
            <h2 className="font-bold text-gray-900 text-lg mb-1">
              Add Money to Wallet
            </h2>
            <p className="text-gray-500 text-sm mb-6">
              Secure payments via Razorpay — UPI, cards, netbanking
            </p>

            <div className="mb-5">
              <p className="label">Quick Select</p>
              <div className="flex flex-wrap gap-2">
                {QUICK_AMOUNTS.map(a => (
                  <button key={a} type="button"
                    onClick={() => setTopupAmount(String(a))}
                    className={`px-4 py-2 rounded-xl border-2 text-sm
                      font-semibold transition-all
                      ${topupAmount === String(a)
                        ? 'border-green-600 bg-green-50 text-green-700'
                        : 'border-gray-200 text-gray-600 hover:border-green-300'}`}>
                    ₹{a.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-6">
              <label className="label">Or Enter Amount</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2
                  text-gray-500 font-semibold">₹</span>
                <input type="number" value={topupAmount}
                  onChange={e => setTopupAmount(e.target.value)}
                  placeholder="Enter amount (min ₹100)"
                  className="input pl-8 text-base" min={100} max={50000} />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Min: ₹100 · Max: ₹50,000
              </p>
            </div>

            <button onClick={handleTopUp}
              disabled={topupLoading || !topupAmount}
              className="btn-primary w-full py-3.5 text-base
                disabled:opacity-50">
              {topupLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin w-4 h-4"
                    viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12"
                      r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor"
                      d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  Opening Payment...
                </span>
              ) : `💳 Add ₹${topupAmount || '0'} to Wallet`}
            </button>
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <div className="animate-fade-up">
            <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
              {FILTERS.map(f => (
                <button key={f.value}
                  onClick={() => { setCategoryFilter(f.value); setPage(1); }}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold
                    whitespace-nowrap border transition-all
                    ${categoryFilter === f.value
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-white text-gray-600 border-gray-200'}`}>
                  {f.label}
                </button>
              ))}
            </div>

            {txnLoading ? <Loader center /> : (
              <>
                <div className="space-y-3">
                  {transactions.length === 0 ? (
                    <div className="card p-12 empty-state">
                      <div className="empty-icon">📋</div>
                      <p className="empty-title">No transactions</p>
                      <p className="empty-desc">Nothing to show here</p>
                    </div>
                  ) : transactions.map(txn => (
                    <TransactionRow key={txn.id} txn={txn} />
                  ))}
                </div>

                {pagination.totalPages > 1 && (
                  <div className="flex justify-center gap-2 mt-6">
                    <button onClick={() => setPage(p => p - 1)}
                      disabled={page === 1}
                      className="btn-secondary py-2 px-4 text-sm disabled:opacity-40">
                      ← Prev
                    </button>
                    <span className="flex items-center text-sm text-gray-500 px-2">
                      {page} / {pagination.totalPages}
                    </span>
                    <button onClick={() => setPage(p => p + 1)}
                      disabled={page === pagination.totalPages}
                      className="btn-secondary py-2 px-4 text-sm disabled:opacity-40">
                      Next →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Transaction Row Component ─────────────────────────
function TransactionRow({ txn }) {
  const meta      = CATEGORY_LABELS[txn.category] ||
                    { label: txn.category, icon: '💰', color: 'text-gray-600' };
  const isCredit  = txn.type === 'credit';

  return (
    <div className="card p-4 flex items-center gap-4">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center
        text-xl flex-shrink-0
        ${isCredit ? 'bg-green-50' : 'bg-red-50'}`}>
        {meta.icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-gray-900 text-sm">{meta.label}</p>
        <p className="text-xs text-gray-400 mt-0.5 truncate">
          {txn.description}
        </p>
        <p className="text-[10px] text-gray-300 mt-0.5">
          {new Date(txn.created_at).toLocaleString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit',
          })}
        </p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`font-bold text-sm
          ${isCredit ? 'text-green-600' : 'text-red-500'}`}>
          {isCredit ? '+' : '-'}₹{parseFloat(txn.amount).toLocaleString()}
        </p>
        <p className="text-[10px] text-gray-400 mt-0.5">
          Bal: ₹{parseFloat(txn.balance_after).toLocaleString()}
        </p>
      </div>
    </div>
  );
}