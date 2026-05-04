import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { matchService } from '../../services/matchService';
import { refundService } from '../../services/refundService';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import ChatWindow from '../../components/chat/ChatWindow';
import Loader from '../../components/common/Loader';

const SPORT_ICONS = {
  football: '⚽', cricket: '🏏', basketball: '🏀',
  badminton: '🏸', tennis: '🎾', volleyball: '🏐',
};

const MatchDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket, joinMatchRoom, leaveMatchRoom } = useSocket();
  const navigate = useNavigate();

  const [match, setMatch] = useState(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [refunding, setRefunding] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [showInviteInput, setShowInviteInput] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeTab, setActiveTab] = useState('details');
  const [pendingRefunds, setPendingRefunds] = useState([]);

  const fetchMatch = useCallback(async () => {
    try {
      const { data } = await matchService.getOne(id);
      setMatch(data.data);
    } catch {
      setError('Match not found.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchMatch(); }, [fetchMatch]);

  useEffect(() => {
    if (!match || !socket) return;
    joinMatchRoom(id);

    socket.on('player_joined', ({ current_players }) => {
      setMatch(prev => ({
        ...prev,
        current_players,
        status: current_players >= prev.team_size ? 'full' : 'open',
      }));
    });

    socket.on('player_left', ({ current_players }) => {
      setMatch(prev => ({ ...prev, current_players, status: 'open' }));
    });

    socket.on('match_updated', (updates) => {
      setMatch(prev => ({ ...prev, ...updates }));
    });

    return () => {
      leaveMatchRoom(id);
      socket.off('player_joined');
      socket.off('player_left');
      socket.off('match_updated');
    };
  }, [id, match, socket, joinMatchRoom, leaveMatchRoom]);

  // Fetch pending refunds when organizer opens refunds tab
  useEffect(() => {
    const isOrganizerCheck = user && match?.organizer_id === user.id;
    if (activeTab === 'refunds' && isOrganizerCheck) {
      refundService.getPending()
        .then(({ data }) => setPendingRefunds(
          data.data.filter(r => r.match_id === id)
        ))
        .catch(() => {});
    }
  }, [activeTab, id, user, match?.organizer_id]);

  const isOrganizer = user && match?.organizer_id === user.id;
  const isPlayer    = match?.players?.some(p => p.player_id === user?.id);
  const isPending   = match?.pending_requests?.some(p => p.player_id === user?.id);
  const spotsLeft   = match ? match.team_size - match.current_players : 0;
  const isMember    = isOrganizer || isPlayer;

  const handleJoin = async () => {
    if (!user) { navigate('/login'); return; }
    if (match.visibility === 'private' && !inviteCode) {
      setShowInviteInput(true);
      return;
    }
    setJoining(true);
    setError('');
    try {
      const { data } = await matchService.join(id, { invite_code: inviteCode });
      setSuccess(data.message);
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to join match.');
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async () => {
    if (!window.confirm('Are you sure you want to leave this match?')) return;
    setLeaving(true);
    setError('');
    try {
      await matchService.leave(id);
      setSuccess('You left the match.');
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to leave match.');
    } finally {
      setLeaving(false);
    }
  };

  const handleRefund = async () => {
    if (!window.confirm(
      'Request a refund? The match organizer will need to approve it. ' +
      'You\'ll receive 80% back if approved (10% platform fee + 10% cancellation penalty deducted).'
    )) return;
    setRefunding(true);
    setError('');
    try {
      const { data } = await refundService.request({
        match_id: id,
        reason: 'Player requested refund',
      });
      setSuccess(
        `Refund request submitted! ₹${data.data.refund_amount} will be ` +
        `credited once the organizer approves.`
      );
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.message || 'Refund request failed.');
    } finally {
      setRefunding(false);
    }
  };

  const handleRequest = async (playerId, action) => {
    try {
      await matchService.handleRequest(id, playerId, { action });
      setSuccess(`Player ${action}d successfully.`);
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleRefundReview = async (requestId, action, refundAmount) => {
    try {
      await refundService.review(requestId, action);
      setSuccess(
        action === 'approve'
          ? `Refund of ₹${parseFloat(refundAmount).toLocaleString()} approved.`
          : 'Refund request rejected.'
      );
      setPendingRefunds(prev => prev.filter(r => r.id !== requestId));
    } catch (err) {
      setError(err.response?.data?.message || 'Action failed.');
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Cancel this match? All players will be notified.'))
      return;
    try {
      await matchService.cancel(id);
      setSuccess('Match cancelled.');
      fetchMatch();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to cancel.');
    }
  };

  const copyInviteLink = () => {
    const link = `${window.location.origin}/matches/${id}?code=${match.invite_code}`;
    navigator.clipboard.writeText(link);
    setSuccess('Invite link copied!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (loading) return <Loader center size="lg" />;
  if (!match) return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-4">
      <div className="text-6xl">😕</div>
      <p className="text-xl text-gray-600">Match not found</p>
      <Link to="/matches" className="btn-primary">Back to Matches</Link>
    </div>
  );

  const fillPercent = (match.current_players / match.team_size) * 100;

  // Build tabs dynamically
  const tabs = ['details', 'players'];
  if (isOrganizer && match.pending_requests?.length > 0) tabs.push('requests');
  if (isOrganizer) tabs.push('refunds');

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm text-gray-500 mb-6">
        <Link to="/" className="hover:text-primary-600">Home</Link>
        <span>›</span>
        <Link to="/matches" className="hover:text-primary-600">Matches</Link>
        <span>›</span>
        <span className="text-gray-900 font-medium truncate">{match.title}</span>
      </nav>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700
          rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2">
          <span>⚠️</span> {error}
          <button onClick={() => setError('')} className="ml-auto">✕</button>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700
          rounded-xl px-4 py-3 mb-5 text-sm flex items-center gap-2">
          <span>✅</span> {success}
          <button onClick={() => setSuccess('')} className="ml-auto">✕</button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

        {/* ── Left Column ─────────────────────────── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Match Header */}
          <div className="card p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-16 h-16 bg-primary-50 rounded-2xl flex
                items-center justify-center text-4xl flex-shrink-0">
                {SPORT_ICONS[match.sport_type] || '🏆'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <h1 className="text-2xl font-extrabold text-gray-900">
                    {match.title}
                  </h1>
                  <span className={`badge font-semibold capitalize
                    ${match.status === 'open'      ? 'bg-green-100 text-green-700'
                    : match.status === 'full'      ? 'bg-red-100 text-red-700'
                    : match.status === 'cancelled' ? 'bg-gray-100 text-gray-600'
                    : 'bg-blue-100 text-blue-700'}`}>
                    {match.status}
                  </span>
                  <span className={`badge font-semibold capitalize
                    ${match.visibility === 'private'
                      ? 'bg-yellow-100 text-yellow-700'
                      : 'bg-primary-100 text-primary-700'}`}>
                    {match.visibility === 'private' ? '🔒 Private' : '🌐 Open'}
                  </span>
                </div>
                <p className="text-gray-500 capitalize">
                  {match.sport_type} • {match.skill_level} level
                </p>
              </div>
            </div>

            {/* Match Info Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
              {[
                {
                  icon: '📅', label: 'Date',
                  value: new Date(match.date).toLocaleDateString('en-IN',
                    { day: 'numeric', month: 'short', year: 'numeric' }),
                },
                {
                  icon: '⏰', label: 'Time',
                  value: `${match.start_time?.slice(0,5)} – ${match.end_time?.slice(0,5)}`,
                },
                { icon: '📍', label: 'Venue', value: match.turf_name },
                {
                  icon: '💰', label: 'Cost',
                  value: match.cost_per_player > 0
                    ? `₹${parseFloat(match.cost_per_player).toLocaleString()}/player`
                    : 'Free',
                },
              ].map(item => (
                <div key={item.label} className="bg-gray-50 rounded-xl p-3">
                  <div className="text-lg mb-1">{item.icon}</div>
                  <div className="text-xs text-gray-500 mb-0.5">{item.label}</div>
                  <div className="text-sm font-semibold text-gray-900 truncate">
                    {item.value}
                  </div>
                </div>
              ))}
            </div>

            {/* Players Progress */}
            <div className="mb-2">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-700">
                  Players ({match.current_players}/{match.team_size})
                </span>
                <span className={`text-sm font-bold
                  ${spotsLeft === 0 ? 'text-red-500' : 'text-primary-600'}`}>
                  {spotsLeft === 0 ? 'Match Full!' : `${spotsLeft} spots left`}
                </span>
              </div>
              <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-500
                  ${fillPercent >= 100 ? 'bg-red-400'
                  : fillPercent >= 75  ? 'bg-yellow-400'
                  : 'bg-primary-500'}`}
                  style={{ width: `${Math.min(fillPercent, 100)}%` }} />
              </div>
            </div>

            {match.description && (
              <p className="text-gray-600 text-sm leading-relaxed mt-4
                pt-4 border-t border-gray-100">
                {match.description}
              </p>
            )}
          </div>

          {/* Tabs */}
          <div className="card overflow-hidden">
            <div className="flex border-b border-gray-100">
              {tabs.map(tab => (
                <button key={tab} onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-3.5 text-sm font-semibold capitalize
                    transition-colors border-b-2 -mb-px
                    ${activeTab === tab
                      ? 'border-primary-600 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
                  {tab}
                  {tab === 'requests' && match.pending_requests?.length > 0 && (
                    <span className="ml-1.5 bg-red-500 text-white text-xs
                      rounded-full px-1.5 py-0.5">
                      {match.pending_requests.length}
                    </span>
                  )}
                  {tab === 'refunds' && pendingRefunds.length > 0 && (
                    <span className="ml-1.5 bg-amber-500 text-white text-xs
                      rounded-full px-1.5 py-0.5">
                      {pendingRefunds.length}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="p-5">

              {/* ── Details Tab ── */}
              {activeTab === 'details' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50
                    rounded-xl">
                    <div className="w-10 h-10 rounded-full bg-primary-100
                      flex items-center justify-center font-bold
                      text-primary-700">
                      {match.organizer_name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900 text-sm">
                        {match.organizer_name}
                      </p>
                      <p className="text-xs text-gray-500">Match Organizer</p>
                    </div>
                    <span className="ml-auto badge bg-primary-100
                      text-primary-700">Host</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Venue</p>
                      <p className="font-semibold text-gray-900">
                        {match.turf_name}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {match.address}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-3">
                      <p className="text-gray-500 text-xs mb-1">Invite Code</p>
                      <p className="font-bold text-primary-600 text-lg
                        tracking-widest">
                        {isMember ? match.invite_code : '••••••'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ── Players Tab ── */}
              {activeTab === 'players' && (
                <div className="space-y-3">
                  {match.players?.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No confirmed players yet
                    </p>
                  ) : (
                    match.players.map((p, i) => (
                      <div key={p.player_id} className="flex items-center
                        gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                        <div className="w-9 h-9 rounded-full bg-primary-100
                          flex items-center justify-center font-bold
                          text-primary-700 text-sm flex-shrink-0">
                          {p.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <Link to={`/players/${p.player_id}`}
                            className="font-semibold text-gray-900 text-sm
                              hover:text-primary-600 transition-colors">
                            {p.name}
                            {p.player_id === match.organizer_id && (
                              <span className="ml-2 badge bg-primary-100
                                text-primary-700 text-xs">Host</span>
                            )}
                          </Link>
                          <p className="text-xs text-gray-500 capitalize">
                            {p.skill_level}
                          </p>
                        </div>
                        <span className="text-xs text-gray-400">#{i + 1}</span>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Join Requests Tab ── */}
              {activeTab === 'requests' && isOrganizer && (
                <div className="space-y-3">
                  {match.pending_requests?.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No pending requests
                    </p>
                  ) : (
                    match.pending_requests.map(p => (
                      <div key={p.player_id} className="flex items-center
                        gap-3 p-3 rounded-xl bg-yellow-50 border
                        border-yellow-100">
                        <div className="w-9 h-9 rounded-full bg-yellow-100
                          flex items-center justify-center font-bold
                          text-yellow-700 text-sm flex-shrink-0">
                          {p.name?.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm">
                            {p.name}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {p.skill_level}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRequest(p.player_id, 'approve')}
                            className="bg-green-500 hover:bg-green-600
                              text-white text-xs font-semibold px-3 py-1.5
                              rounded-lg transition-colors">
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => handleRequest(p.player_id, 'reject')}
                            className="bg-red-100 hover:bg-red-200 text-red-600
                              text-xs font-semibold px-3 py-1.5 rounded-lg
                              transition-colors">
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* ── Refund Requests Tab ── */}
              {activeTab === 'refunds' && isOrganizer && (
                <div className="space-y-3">
                  {pendingRefunds.length === 0 ? (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No pending refund requests
                    </p>
                  ) : (
                    pendingRefunds.map(r => (
                      <div key={r.id} className="p-4 rounded-xl bg-amber-50
                        border border-amber-200">
                        <div className="flex items-center justify-between
                          gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-amber-100
                              flex items-center justify-center font-bold
                              text-amber-700 text-sm flex-shrink-0">
                              {r.player_name?.charAt(0)}
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900 text-sm">
                                {r.player_name}
                              </p>
                              <p className="text-xs text-gray-500">
                                Requesting ₹{parseFloat(r.refund_amount)
                                  .toLocaleString()} refund
                              </p>
                            </div>
                          </div>
                          <p className="font-bold text-gray-900 text-sm
                            flex-shrink-0">
                            ₹{parseFloat(r.amount).toLocaleString()} paid
                          </p>
                        </div>

                        {/* Breakdown */}
                        <div className="grid grid-cols-3 gap-2 text-center
                          text-xs mb-3">
                          <div className="bg-green-50 rounded-lg p-2">
                            <p className="text-green-700 font-bold">
                              ₹{parseFloat(r.refund_amount).toLocaleString()}
                            </p>
                            <p className="text-gray-500 mt-0.5">To player (80%)</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-700 font-bold">
                              ₹{parseFloat(r.platform_fee).toLocaleString()}
                            </p>
                            <p className="text-gray-500 mt-0.5">Platform (10%)</p>
                          </div>
                          <div className="bg-gray-50 rounded-lg p-2">
                            <p className="text-gray-700 font-bold">
                              ₹{parseFloat(r.penalty_amount).toLocaleString()}
                            </p>
                            <p className="text-gray-500 mt-0.5">Penalty (10%)</p>
                          </div>
                        </div>

                        {r.reason && (
                          <p className="text-xs text-gray-500 italic mb-3">
                            Reason: "{r.reason}"
                          </p>
                        )}

                        <div className="bg-amber-100 rounded-lg px-3 py-2
                          text-xs text-amber-700 mb-3">
                          ⚠️ Approving will debit ₹{parseFloat(r.amount)
                            .toLocaleString()} from your wallet.
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => handleRefundReview(
                              r.id, 'approve', r.refund_amount
                            )}
                            className="flex-1 bg-green-500 hover:bg-green-600
                              text-white text-xs font-semibold px-3 py-2
                              rounded-lg transition-colors">
                            ✓ Approve Refund
                          </button>
                          <button
                            onClick={() => handleRefundReview(r.id, 'reject')}
                            className="flex-1 bg-red-100 hover:bg-red-200
                              text-red-600 text-xs font-semibold px-3 py-2
                              rounded-lg transition-colors">
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Chat — members only */}
          {isMember && (
            <ChatWindow matchId={id} matchStatus={match.status} />
          )}
        </div>

        {/* ── Right Column ────────────────────────── */}
        <div className="space-y-4">

          {/* Action Card */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">Actions</h3>

            {/* Private invite code input */}
            {showInviteInput && (
              <div className="mb-4">
                <label className="block text-sm font-semibold text-gray-700
                  mb-1.5">Enter Invite Code</label>
                <input type="text" value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXX" maxLength={6}
                  className="input text-center tracking-widest font-bold
                    text-lg uppercase" />
              </div>
            )}

            {/* Not logged in */}
            {!user && (
              <Link to="/login"
                className="btn-primary w-full py-3 text-center block">
                Login to Join Match
              </Link>
            )}

            {/* Organizer actions */}
            {isOrganizer && (
              <div className="space-y-3">
                <button onClick={copyInviteLink}
                  className="btn-secondary w-full py-3 flex items-center
                    justify-center gap-2">
                  <span>🔗</span> Copy Invite Link
                </button>
                {match.status !== 'cancelled' && (
                  <button onClick={handleCancel}
                    className="w-full py-3 bg-red-50 hover:bg-red-100
                      text-red-600 font-semibold rounded-xl border
                      border-red-200 transition-colors">
                    Cancel Match
                  </button>
                )}
              </div>
            )}

            {/* Player actions */}
            {user && !isOrganizer && (
              <>
                {isPending && (
                  <div className="text-center py-3 bg-yellow-50 rounded-xl
                    border border-yellow-200 text-yellow-700 text-sm
                    font-medium">
                    ⏳ Request pending approval
                  </div>
                )}

                {isPlayer && !isPending && (
                  <div className="space-y-3">
                    <button onClick={handleLeave} disabled={leaving}
                      className="w-full py-3 bg-red-50 hover:bg-red-100
                        text-red-600 font-semibold rounded-xl border
                        border-red-200 transition-colors">
                      {leaving ? 'Leaving...' : '🚪 Leave Match'}
                    </button>

                    {parseFloat(match.cost_per_player) > 0
                      && !['completed', 'cancelled'].includes(match.status) && (
                      <button onClick={handleRefund} disabled={refunding}
                        className="w-full py-3 bg-amber-50 hover:bg-amber-100
                          text-amber-700 font-semibold rounded-xl border
                          border-amber-200 transition-colors text-sm">
                        {refunding
                          ? 'Submitting...'
                          : '↩️ Request Refund (80% back)'}
                      </button>
                    )}
                  </div>
                )}

                {!isPlayer && !isPending
                  && match.status !== 'cancelled'
                  && match.status !== 'completed' && (
                  <button onClick={handleJoin}
                    disabled={joining || match.status === 'full'}
                    className="btn-primary w-full py-3 disabled:opacity-50">
                    {joining ? (
                      <span className="flex items-center justify-center gap-2">
                        <svg className="animate-spin h-4 w-4"
                          viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12"
                            r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor"
                            d="M4 12a8 8 0 018-8v8z" />
                        </svg>
                        Joining...
                      </span>
                    ) : match.status === 'full'
                      ? '😔 Match Full'
                      : showInviteInput
                      ? 'Submit Code & Join'
                      : match.visibility === 'private'
                      ? '🔒 Enter Code to Join'
                      : '🙌 Join Match'}
                  </button>
                )}
              </>
            )}
          </div>

          {/* Match Stats Card */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-4">Match Info</h3>
            <div className="space-y-3 text-sm">
              {[
                { label: 'Sport',       value: match.sport_type,  style: 'capitalize' },
                { label: 'Skill Level', value: match.skill_level, style: 'capitalize' },
                { label: 'Team Size',   value: `${match.team_size} players` },
                { label: 'Spots Left',  value: spotsLeft === 0 ? 'Full' : `${spotsLeft} spots` },
                { label: 'Visibility',  value: match.visibility,  style: 'capitalize' },
                {
                  label: 'Cost/Player',
                  value: match.cost_per_player > 0
                    ? `₹${parseFloat(match.cost_per_player).toLocaleString()}`
                    : 'Free',
                },
              ].map(item => (
                <div key={item.label} className="flex justify-between
                  items-center py-2 border-b border-gray-50 last:border-0">
                  <span className="text-gray-500">{item.label}</span>
                  <span className={`font-semibold text-gray-900
                    ${item.style || ''}`}>
                    {item.value}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Venue Card */}
          <div className="card p-5">
            <h3 className="font-bold text-gray-900 mb-3">Venue</h3>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="font-semibold text-gray-900">{match.turf_name}</p>
              <p className="text-sm text-gray-500 mt-1">{match.address}</p>
              <p className="text-sm text-gray-500">{match.city}</p>
              <Link to={`/turfs/${match.turf_id}`}
                className="text-primary-600 text-sm font-medium mt-2
                  inline-block hover:underline">
                View Turf →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MatchDetail;