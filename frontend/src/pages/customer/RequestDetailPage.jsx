import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useLocation, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { requestsAPI } from '../../utils/requestsAPI';
import { playNotificationSound } from '../../components/NotificationToast';
import { StatusBadge, UrgencyBadge, CategoryBadge, StarRating } from '../../components/common/StatusBadge';

const CUSTOMER_NAV = [
  { to: '/dashboard',            label: 'Home',        icon: '🏠' },
  { to: '/customer/request/new', label: 'New Request', icon: '➕' },
  { to: '/customer/requests',    label: 'My Requests', icon: '📋' },
];
const PROVIDER_NAV = [
  { to: '/provider/dashboard', label: 'Home',      icon: '🏠' },
  { to: '/provider/requests',  label: 'My Jobs',   icon: '📋' },
  { to: '/provider/available', label: 'Available', icon: '🔍' },
  { to: '/provider/profile',   label: 'Profile',   icon: '👤' },
];
const ADMIN_NAV = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: '🏠' },
  { to: '/admin/users',     label: 'Users',     icon: '👥' },
  { to: '/admin/requests',  label: 'Requests',  icon: '📋' },
];

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

const formatTime = (d) =>
  new Date(d).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

const formatDateTime = (d) => `${formatDate(d)} at ${formatTime(d)}`;

const Card = ({ children, style = {} }) => (
  <div style={{
    background: '#fff', borderRadius: '12px', padding: '20px',
    border: '1px solid #e8ecf0', boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    ...style,
  }}>
    {children}
  </div>
);

const SectionTitle = ({ children }) => (
  <h3 style={{
    fontSize: '12px', fontWeight: '700', color: '#8a9bb0',
    textTransform: 'uppercase', letterSpacing: '0.7px',
    margin: '0 0 14px', fontFamily: "'Outfit', sans-serif",
  }}>
    {children}
  </h3>
);

// ─── Progress Stepper ──────────────────────────────────────────────────────────
const STEPS = [
  { key: 'submitted',  label: 'Submitted',  icon: '📋', statuses: ['pending'] },
  { key: 'matched',    label: 'Matched',    icon: '🔗', statuses: ['matched', 'scheduled'] },
  { key: 'in_progress',label: 'In Progress',icon: '🔧', statuses: ['in_progress'] },
  { key: 'completed',  label: 'Completed',  icon: '✅', statuses: ['completed'] },
];

const ProgressStepper = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div style={{
        background: '#fff0f0', border: '1px solid #fcd0d0',
        borderRadius: '12px', padding: '16px 20px',
        display: 'flex', alignItems: 'center', gap: '12px',
        fontFamily: "'Outfit', sans-serif",
      }}>
        <span style={{ fontSize: '28px' }}>❌</span>
        <div>
          <div style={{ fontSize: '15px', fontWeight: '700', color: '#c0392b' }}>Request Cancelled</div>
          <div style={{ fontSize: '13px', color: '#e57373', marginTop: '2px' }}>This request has been cancelled.</div>
        </div>
      </div>
    );
  }

  // Find active step index
  const activeIdx = STEPS.findIndex(s => s.statuses.includes(status));

  return (
    <div style={{
      background: '#fff', border: '1px solid #e8ecf0',
      borderRadius: '12px', padding: '20px 24px',
      fontFamily: "'Outfit', sans-serif",
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
    }}>
      <div style={{ fontSize: '12px', fontWeight: '700', color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '18px' }}>
        Job Progress
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
        {STEPS.map((step, i) => {
          const done    = i < activeIdx;
          const active  = i === activeIdx;
          const future  = i > activeIdx;

          return (
            <React.Fragment key={step.key}>
              {/* Step */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: '0 0 auto', minWidth: '72px' }}>
                {/* Circle */}
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: done ? '18px' : '20px',
                  fontWeight: '700',
                  background: done   ? '#27ae60'
                              : active ? 'linear-gradient(135deg, #1a3c5e, #2563a8)'
                              : '#f0f4f8',
                  border: active ? '3px solid #2563a8' : done ? '3px solid #27ae60' : '2px solid #dde3eb',
                  boxShadow: active ? '0 4px 14px rgba(37,99,168,0.35)' : done ? '0 2px 8px rgba(39,174,96,0.25)' : 'none',
                  color: (done || active) ? '#fff' : '#b0bec5',
                  transition: 'all 0.3s ease',
                  position: 'relative',
                }}>
                  {done ? '✓' : step.icon}
                  {active && (
                    <span style={{
                      position: 'absolute', top: '-3px', right: '-3px',
                      width: '12px', height: '12px', borderRadius: '50%',
                      background: '#C17B2A', border: '2px solid #fff',
                      animation: 'pulse-dot 1.5s ease-in-out infinite',
                    }} />
                  )}
                </div>
                {/* Label */}
                <div style={{
                  marginTop: '8px', fontSize: '11px', fontWeight: active ? '700' : '600',
                  color: done ? '#27ae60' : active ? '#1a3c5e' : '#b0bec5',
                  textAlign: 'center', lineHeight: 1.3, whiteSpace: 'nowrap',
                }}>
                  {step.label}
                </div>
              </div>

              {/* Connector line */}
              {i < STEPS.length - 1 && (
                <div style={{
                  flex: 1, height: '3px', margin: '0 4px', marginBottom: '22px',
                  background: i < activeIdx
                    ? 'linear-gradient(90deg, #27ae60, #27ae60)'
                    : i === activeIdx - 1
                    ? 'linear-gradient(90deg, #27ae60, #dde3eb)'
                    : '#f0f4f8',
                  borderRadius: '2px',
                  transition: 'background 0.4s ease',
                }} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

// ─── Main component ────────────────────────────────────────────────────────────
const RequestDetailPage = () => {
  const { id }       = useParams();
  const { user }     = useAuth();
  const { socket }   = useSocket();
  const location     = useLocation();
  const navigate     = useNavigate();
  const chatEndRef   = useRef(null);
  const progressEndRef = useRef(null);

  const [request,       setRequest]       = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [notFound,      setNotFound]      = useState(false);
  const [accessDenied,  setAccessDenied]  = useState(false);
  const [message,       setMessage]       = useState('');
  const [sending,       setSending]       = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showReview,    setShowReview]    = useState(false);
  const [rating,        setRating]        = useState(0);
  const [comment,       setComment]       = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [successMsg,    setSuccessMsg]    = useState(location.state?.successMsg || '');
  const [isScheduledMsg, setIsScheduledMsg] = useState(location.state?.scheduled || false);
  const [errorMsg,      setErrorMsg]      = useState('');

  // Progress update state
  const [progressMsg,     setProgressMsg]     = useState('');
  const [progressSending, setProgressSending] = useState(false);

  const fetchRequest = useCallback(async () => {
    try {
      const res = await requestsAPI.getById(id);
      setRequest(res.data.data);
    } catch (err) {
      if (err.response?.status === 404) setNotFound(true);
      else if (err.response?.status === 403) setAccessDenied(true);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);

  // ── Socket: join room, listen for messages + progress updates ───────────────
  useEffect(() => {
    if (!socket || !id) return;

    const joinRoom = () => socket.emit('join_request', id);
    joinRoom();
    socket.on('connect', joinRoom);

    const handleNewMessage = (msg) => {
      const isFromMe = msg.sender?._id?.toString() === user?._id?.toString();
      if (isFromMe) {
        setRequest(prev => {
          if (!prev) return prev;
          const tempIdx = prev.messages?.findIndex(m => m._id?.toString().startsWith('temp_'));
          if (tempIdx === -1 || tempIdx === undefined) return prev;
          const updated = [...prev.messages];
          updated[tempIdx] = msg;
          return { ...prev, messages: updated };
        });
        return;
      }
      playNotificationSound();
      setRequest(prev => {
        if (!prev) return prev;
        const exists = prev.messages?.some(m => m._id?.toString() === msg._id?.toString());
        if (exists) return prev;
        return { ...prev, messages: [...(prev.messages || []), msg] };
      });
    };

    const handleProgressUpdate = (update) => {
      playNotificationSound();
      setRequest(prev => {
        if (!prev) return prev;
        const exists = prev.progressUpdates?.some(u => u._id?.toString() === update._id?.toString());
        if (exists) return prev;
        return { ...prev, progressUpdates: [...(prev.progressUpdates || []), update] };
      });
    };

    socket.on('new_message',     handleNewMessage);
    socket.on('progress_update', handleProgressUpdate);

    return () => {
      socket.emit('leave_request', id);
      socket.off('connect',        joinRoom);
      socket.off('new_message',    handleNewMessage);
      socket.off('progress_update', handleProgressUpdate);
    };
  }, [socket, id, user?._id]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [request?.messages]);
  useEffect(() => { progressEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [request?.progressUpdates]);

  // ── Send message ─────────────────────────────────────────────────────────────
  const handleSendMessage = async () => {
    if (!message.trim()) return;
    const content = message.trim();
    setMessage('');
    const tempId = `temp_${Date.now()}`;
    const optimistic = {
      _id: tempId, content,
      createdAt: new Date().toISOString(),
      sender: { _id: user._id, firstName: user.firstName, lastName: user.lastName, role: user.role },
    };
    setRequest(prev => prev ? { ...prev, messages: [...(prev.messages || []), optimistic] } : prev);
    setSending(true);
    try {
      await requestsAPI.sendMessage(id, content);
    } catch (err) {
      setRequest(prev => prev ? { ...prev, messages: prev.messages.filter(m => m._id !== tempId) } : prev);
      setMessage(content);
      setErrorMsg(err.response?.data?.message || 'Failed to send message.');
    } finally {
      setSending(false);
    }
  };

  // ── Status update ─────────────────────────────────────────────────────────────
  const handleStatusUpdate = async (status, note = '') => {
    setActionLoading(true);
    setErrorMsg('');
    try {
      await requestsAPI.updateStatus(id, { status, note });
      setSuccessMsg(`Status updated to "${status}".`);
      fetchRequest();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to update status.');
    } finally {
      setActionLoading(false);
    }
  };

  // ── Add progress update ───────────────────────────────────────────────────────
  const handleAddProgress = async () => {
    if (!progressMsg.trim()) return;
    const content = progressMsg.trim();
    setProgressMsg('');
    setProgressSending(true);
    try {
      await requestsAPI.addProgress(id, content);
      // Socket delivers update to both parties; optimistic add for sender
      setRequest(prev => {
        if (!prev) return prev;
        const optimistic = {
          _id:         `temp_prog_${Date.now()}`,
          message:     content,
          addedByRole: 'provider',
          createdAt:   new Date().toISOString(),
          addedBy:     { _id: user._id, firstName: user.firstName, lastName: user.lastName },
        };
        return { ...prev, progressUpdates: [...(prev.progressUpdates || []), optimistic] };
      });
    } catch (err) {
      setProgressMsg(content);
      setErrorMsg(err.response?.data?.message || 'Failed to post update.');
    } finally {
      setProgressSending(false);
    }
  };

  // ── Review ────────────────────────────────────────────────────────────────────
  const handleSubmitReview = async () => {
    if (!rating) { setErrorMsg('Please select a rating.'); return; }
    setReviewLoading(true);
    setErrorMsg('');
    try {
      await requestsAPI.submitReview(id, { rating, comment });
      setSuccessMsg('Review submitted successfully!');
      setShowReview(false);
      fetchRequest();
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Failed to submit review.');
    } finally {
      setReviewLoading(false);
    }
  };

  // ── Loading / error states ────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: 'center', color: '#8a9bb0' }}>
        <div style={{ width: '40px', height: '40px', border: '4px solid #e8ecf0', borderTop: '4px solid #C17B2A', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading request…
      </div>
    </div>
  );

  const backLink  = user?.role === 'admin' ? '/admin/requests' : user?.role === 'provider' ? '/provider/requests' : '/customer/requests';
  const backLabel = user?.role === 'admin' ? 'All Requests' : user?.role === 'provider' ? 'My Jobs' : 'My Requests';

  if (accessDenied) return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🚫</div>
        <h2 style={{ color: '#1a2e44', marginBottom: '8px' }}>Access denied</h2>
        <p style={{ color: '#6b7c93', fontSize: '14px', marginBottom: '16px' }}>You don't have permission to view this request.</p>
        <Link to={backLink} style={{ color: '#C17B2A', fontWeight: '600' }}>← Back to {backLabel}</Link>
      </div>
    </div>
  );

  if (notFound || !request) return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Outfit', sans-serif" }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
        <h2 style={{ color: '#1a2e44', marginBottom: '8px' }}>Request not found</h2>
        <Link to={backLink} style={{ color: '#C17B2A', fontWeight: '600' }}>← Back to {backLabel}</Link>
      </div>
    </div>
  );

  // ── Permissions ───────────────────────────────────────────────────────────────
  const navLinks   = user?.role === 'admin' ? ADMIN_NAV : user?.role === 'provider' ? PROVIDER_NAV : CUSTOMER_NAV;
  const isAdmin    = user?.role === 'admin';
  const isCustomer = request.customer?._id === user?._id || request.customer === user?._id;
  const isProvider = request.provider && (request.provider?._id === user?._id || request.provider === user?._id);

  const canCancel       = user?.role === 'customer' && isCustomer && ['pending', 'matched', 'scheduled'].includes(request.status);
  const canStart        = user?.role === 'provider' && isProvider && ['matched', 'scheduled'].includes(request.status);
  const canComplete     = user?.role === 'customer' && isCustomer && request.status === 'in_progress';
  const canAddProgress  = user?.role === 'provider' && isProvider && request.status === 'in_progress';
  const canChat         = !['pending', 'cancelled'].includes(request.status) && request.provider;
  const canReview       = user?.role === 'customer' && isCustomer && request.status === 'completed' && !request.customerReview;

  const progressUpdates = request.progressUpdates || [];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-dot {
          0%, 100% { transform: scale(1); opacity: 1; }
          50%       { transform: scale(1.4); opacity: 0.6; }
        }
      `}</style>

      {/* ── Navbar ── */}
      <nav style={{ height: '60px', background: '#1a3c5e', display: 'flex', alignItems: 'center', padding: '0 28px', justifyContent: 'space-between', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <Link to="/home" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
          <span style={{ fontSize: '20px' }}>🏠</span>
          <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff' }}>PropMaintain</span>
        </Link>
        <div style={{ display: 'flex', gap: '4px' }}>
          {navLinks.map(({ to, label, icon }) => (
            <Link key={to} to={to} style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', borderRadius: '6px', textDecoration: 'none', fontSize: '13px', fontWeight: '500', color: 'rgba(255,255,255,0.7)' }}>
              {icon} {label}
            </Link>
          ))}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {isAdmin && <span style={{ padding: '3px 10px', background: '#C17B2A', borderRadius: '20px', fontSize: '11px', fontWeight: '800', color: '#fff' }}>ADMIN</span>}
          <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)' }}>👋 {user?.firstName}</span>
        </div>
      </nav>

      <div style={{ maxWidth: '1040px', margin: '28px auto', padding: '0 20px' }}>

        {/* ── Back + title ── */}
        <div style={{ marginBottom: '18px' }}>
          <Link to={backLink} style={{ fontSize: '13px', color: '#6b7c93', textDecoration: 'none', fontWeight: '600', display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '10px' }}>
            ← {backLabel}
          </Link>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0d2137', margin: 0, flex: 1 }}>{request.title}</h1>
            <StatusBadge status={request.status} />
          </div>
        </div>

        {/* ── Progress stepper ── */}
        <div style={{ marginBottom: '18px' }}>
          <ProgressStepper status={request.status} />
        </div>

        {/* ── Alert banners ── */}
        {successMsg && (
          <div style={{
            background:   isScheduledMsg ? '#fff8e6' : '#d4edda',
            border:       `1px solid ${isScheduledMsg ? '#f5c842' : '#c3e6cb'}`,
            borderRadius: '8px',
            padding:      '14px 16px',
            marginBottom: '14px',
            display:      'flex',
            justifyContent: 'space-between',
            alignItems:   'flex-start',
            gap:          '10px',
          }}>
            <div>
              <span style={{ fontSize: '14px', color: isScheduledMsg ? '#7d5700' : '#155724', fontWeight: '700', display: 'block', marginBottom: isScheduledMsg ? '4px' : 0 }}>
                {isScheduledMsg ? '📅 Request Scheduled' : '✅ ' + successMsg}
              </span>
              {isScheduledMsg && (
                <span style={{ fontSize: '13px', color: '#7d5700', lineHeight: 1.5 }}>
                  {successMsg}
                </span>
              )}
            </div>
            <button
              onClick={() => { setSuccessMsg(''); setIsScheduledMsg(false); }}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: isScheduledMsg ? '#7d5700' : '#155724', flexShrink: 0 }}
            >×</button>
          </div>
        )}
        {errorMsg && (
          <div style={{ background: '#fff0f0', border: '1px solid #fcd0d0', borderRadius: '8px', padding: '12px 16px', marginBottom: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '13px', color: '#c0392b' }}>⚠ {errorMsg}</span>
            <button onClick={() => setErrorMsg('')} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#c0392b' }}>×</button>
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: '18px', alignItems: 'start' }}>

          {/* ── LEFT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Request details */}
            <Card>
              <SectionTitle>Request Details</SectionTitle>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '14px' }}>
                <CategoryBadge category={request.category} />
                <UrgencyBadge  urgency={request.urgency} />
                <span style={{ fontSize: '12px', color: '#8a9bb0', display: 'flex', alignItems: 'center' }}>🗓 {formatDate(request.createdAt)}</span>
              </div>
              <p style={{ fontSize: '14px', lineHeight: 1.7, color: '#4a5568', margin: '0 0 14px', whiteSpace: 'pre-wrap' }}>
                {request.description}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                {[
                  ['📍 Address',   `${request.location?.address}, ${request.location?.city} ${request.location?.postcode}`],
                  ['🔧 Service',   request.serviceType],
                  request.preferredDate && ['📅 Preferred',  formatDate(request.preferredDate)],
                  request.scheduledDate && ['📅 Scheduled',  formatDateTime(request.scheduledDate)],
                  request.completedAt   && ['✅ Completed',  formatDateTime(request.completedAt)],
                  request.cancelReason  && ['❌ Reason',     request.cancelReason],
                ].filter(Boolean).map(([k, v]) => (
                  <div key={k} style={{ padding: '10px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #f0f4f8' }}>
                    <div style={{ fontSize: '11px', fontWeight: '700', color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: '3px' }}>{k}</div>
                    <div style={{ fontSize: '13px', color: '#1a2e44', fontWeight: '500' }}>{v}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* ── Action buttons ── */}
            {(canCancel || canStart || canComplete) && (
              <Card>
                <SectionTitle>Actions</SectionTitle>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  {canStart && (
                    <button
                      onClick={() => handleStatusUpdate('in_progress')}
                      disabled={actionLoading}
                      style={{ padding: '10px 20px', background: '#27ae60', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: actionLoading ? 0.6 : 1 }}
                    >
                      🔧 Start Job
                    </button>
                  )}
                  {canComplete && (
                    <button
                      onClick={() => handleStatusUpdate('completed')}
                      disabled={actionLoading}
                      style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #1a3c5e, #2563a8)', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: actionLoading ? 0.6 : 1, boxShadow: '0 4px 12px rgba(37,99,168,0.3)' }}
                    >
                      ✅ Confirm Job Complete
                    </button>
                  )}
                  {canCancel && (
                    <button
                      onClick={() => handleStatusUpdate('cancelled', 'Cancelled by customer')}
                      disabled={actionLoading}
                      style={{ padding: '10px 20px', background: '#fff', border: '1.5px solid #e74c3c', borderRadius: '8px', color: '#e74c3c', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", opacity: actionLoading ? 0.6 : 1 }}
                    >
                      ❌ Cancel Request
                    </button>
                  )}
                </div>
                {canComplete && (
                  <p style={{ margin: '10px 0 0', fontSize: '12px', color: '#8a9bb0' }}>
                    Only confirm completion once the provider has finished all work to your satisfaction.
                  </p>
                )}
              </Card>
            )}

            {/* ── Work Progress Feed ── */}
            {(request.status === 'in_progress' || request.status === 'completed' || progressUpdates.length > 0) && (
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                {/* Header */}
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <SectionTitle>🔧 Work Progress</SectionTitle>
                  <span style={{ fontSize: '12px', color: '#8a9bb0', fontWeight: '600' }}>
                    {progressUpdates.length} update{progressUpdates.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Feed */}
                <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '320px', overflowY: 'auto', background: '#fafbfc' }}>
                  {progressUpdates.length === 0 ? (
                    <div style={{ textAlign: 'center', color: '#b0bec5', fontSize: '13px', padding: '24px 0' }}>
                      {request.status === 'in_progress'
                        ? canAddProgress
                          ? 'Post your first update below to keep the customer informed.'
                          : 'No progress updates yet. The provider will post updates here.'
                        : 'No progress updates were posted.'}
                    </div>
                  ) : (
                    progressUpdates.map((u, i) => (
                      <div key={u._id || i} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                        {/* Timeline dot */}
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #1a3c5e, #2563a8)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', color: '#fff', fontWeight: '700', flexShrink: 0,
                          }}>
                            🔧
                          </div>
                          {i < progressUpdates.length - 1 && (
                            <div style={{ width: '2px', flex: 1, minHeight: '16px', background: '#e8ecf0', marginTop: '4px' }} />
                          )}
                        </div>
                        {/* Content */}
                        <div style={{ flex: 1, paddingBottom: i < progressUpdates.length - 1 ? '8px' : 0 }}>
                          <div style={{ background: '#fff', border: '1px solid #e8ecf0', borderRadius: '10px', padding: '10px 14px', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                            <p style={{ margin: 0, fontSize: '13px', color: '#1a2e44', lineHeight: 1.6 }}>{u.message}</p>
                          </div>
                          <div style={{ fontSize: '11px', color: '#8a9bb0', marginTop: '4px', display: 'flex', gap: '8px' }}>
                            <span>
                              {u.addedBy?.firstName
                                ? `${u.addedBy.firstName} ${u.addedBy.lastName}`
                                : 'Provider'}
                            </span>
                            <span>·</span>
                            <span>{formatDateTime(u.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={progressEndRef} />
                </div>

                {/* Provider input */}
                {canAddProgress && (
                  <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f4f8', display: 'flex', gap: '8px', background: '#fff' }}>
                    <input
                      value={progressMsg}
                      onChange={e => setProgressMsg(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleAddProgress()}
                      placeholder="Post a progress update… (Enter to send)"
                      style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #dde3eb', borderRadius: '8px', fontSize: '13px', fontFamily: "'Outfit', sans-serif", outline: 'none' }}
                    />
                    <button
                      onClick={handleAddProgress}
                      disabled={progressSending || !progressMsg.trim()}
                      style={{ padding: '10px 16px', background: progressSending || !progressMsg.trim() ? '#e8ecf0' : '#1a3c5e', border: 'none', borderRadius: '8px', color: progressSending || !progressMsg.trim() ? '#8a9bb0' : '#fff', fontSize: '13px', fontWeight: '700', cursor: progressSending || !progressMsg.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif" }}
                    >
                      Post
                    </button>
                  </div>
                )}
              </Card>
            )}

            {/* ── Chat ── */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f0f4f8' }}>
                <SectionTitle>💬 Messages</SectionTitle>
              </div>
              <div style={{ height: '280px', overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px', background: '#fafbfc' }}>
                {!canChat ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8a9bb0', fontSize: '13px', textAlign: 'center' }}>
                    💬 Messaging becomes available once a provider is assigned.
                  </div>
                ) : request.messages?.length === 0 ? (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#8a9bb0', fontSize: '13px' }}>
                    No messages yet — start the conversation!
                  </div>
                ) : (
                  request.messages.map((msg, i) => {
                    const isMine = msg.sender?._id === user?._id || msg.sender === user?._id;
                    return (
                      <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start' }}>
                        <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isMine ? '14px 14px 2px 14px' : '14px 14px 14px 2px', background: isMine ? '#1a3c5e' : '#fff', color: isMine ? '#fff' : '#1a2e44', fontSize: '13px', lineHeight: 1.5, border: isMine ? 'none' : '1px solid #e8ecf0' }}>
                          {msg.content}
                        </div>
                        <div style={{ fontSize: '11px', color: '#8a9bb0', marginTop: '3px' }}>
                          {msg.sender?.firstName || (isMine ? user?.firstName : 'Provider')} · {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={chatEndRef} />
              </div>
              {canChat && request.status !== 'completed' && request.status !== 'cancelled' && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid #f0f4f8', display: 'flex', gap: '8px' }}>
                  <input
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                    placeholder="Type a message… (Enter to send)"
                    style={{ flex: 1, padding: '10px 14px', border: '1.5px solid #dde3eb', borderRadius: '8px', fontSize: '13px', fontFamily: "'Outfit', sans-serif", outline: 'none' }}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={sending || !message.trim()}
                    style={{ padding: '10px 16px', background: sending || !message.trim() ? '#e8ecf0' : '#1a3c5e', border: 'none', borderRadius: '8px', color: sending || !message.trim() ? '#8a9bb0' : '#fff', fontSize: '13px', fontWeight: '700', cursor: sending || !message.trim() ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif" }}
                  >
                    Send
                  </button>
                </div>
              )}
            </Card>

            {/* ── Review ── */}
            {canReview && (
              <Card>
                <SectionTitle>⭐ Leave a Review</SectionTitle>
                {!showReview ? (
                  <button
                    onClick={() => setShowReview(true)}
                    style={{ padding: '11px 24px', background: '#C17B2A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
                  >
                    Rate this Service
                  </button>
                ) : (
                  <div>
                    <p style={{ fontSize: '14px', color: '#4a5568', marginBottom: '14px' }}>How was your experience with {request.provider?.firstName}?</p>
                    <div style={{ display: 'flex', gap: '6px', marginBottom: '14px' }}>
                      {[1, 2, 3, 4, 5].map(s => (
                        <button key={s} onClick={() => setRating(s)} style={{ fontSize: '28px', background: 'none', border: 'none', cursor: 'pointer', color: s <= rating ? '#f39c12' : '#dde3eb', transition: 'color 0.2s, transform 0.1s', transform: s <= rating ? 'scale(1.1)' : 'scale(1)' }}>★</button>
                      ))}
                      {rating > 0 && <span style={{ fontSize: '13px', color: '#f39c12', fontWeight: '700', alignSelf: 'center', marginLeft: '6px' }}>{['', 'Poor', 'Fair', 'Good', 'Great', 'Excellent'][rating]}</span>}
                    </div>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Share your experience (optional)…"
                      rows={3}
                      maxLength={1000}
                      style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #dde3eb', borderRadius: '8px', fontSize: '13px', fontFamily: "'Outfit', sans-serif", resize: 'vertical', marginBottom: '12px', boxSizing: 'border-box', outline: 'none' }}
                    />
                    <div style={{ display: 'flex', gap: '10px' }}>
                      <button onClick={handleSubmitReview} disabled={!rating || reviewLoading} style={{ padding: '10px 20px', background: !rating || reviewLoading ? '#8a9bb0' : '#C17B2A', border: 'none', borderRadius: '8px', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: !rating || reviewLoading ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                        {reviewLoading ? 'Submitting…' : 'Submit Review'}
                      </button>
                      <button onClick={() => setShowReview(false)} style={{ padding: '10px 16px', background: '#fff', border: '1.5px solid #dde3eb', borderRadius: '8px', color: '#4a5568', fontSize: '14px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            )}

            {request.customerReview && (
              <Card>
                <SectionTitle>Your Review</SectionTitle>
                <StarRating rating={request.customerReview.rating} size={20} />
                {request.customerReview.comment && (
                  <p style={{ fontSize: '14px', color: '#4a5568', lineHeight: 1.6, margin: '10px 0 0', fontStyle: 'italic' }}>
                    "{request.customerReview.comment}"
                  </p>
                )}
              </Card>
            )}
          </div>

          {/* ── RIGHT COLUMN ── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Provider card */}
            <Card>
              <SectionTitle>Assigned Provider</SectionTitle>
              {request.provider ? (
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: '#1a3c5e', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                      {request.provider.firstName?.charAt(0)}{request.provider.lastName?.charAt(0)}
                    </div>
                    <div>
                      <div style={{ fontSize: '15px', fontWeight: '700', color: '#1a2e44' }}>{request.provider.firstName} {request.provider.lastName}</div>
                      <div style={{ fontSize: '12px', color: '#8a9bb0' }}>{request.provider.email}</div>
                    </div>
                  </div>
                  {request.provider.providerProfile && (
                    <div style={{ fontSize: '13px', color: '#6b7c93', lineHeight: 1.5 }}>
                      ⭐ {request.provider.providerProfile.averageRating?.toFixed(1) || '0.0'} rating
                      · {request.provider.providerProfile.totalReviews || 0} reviews
                      {request.provider.providerProfile.bio && (
                        <p style={{ margin: '8px 0 0', fontStyle: 'italic', fontSize: '12px' }}>"{request.provider.providerProfile.bio}"</p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '12px 0', color: '#8a9bb0', fontSize: '13px' }}>
                  {request.status === 'scheduled'
                    ? `📅 Scheduled for ${formatDateTime(request.scheduledDate)}`
                    : '🔍 Searching for a provider…'}
                </div>
              )}
            </Card>

            {/* Status history */}
            <Card>
              <SectionTitle>Status History</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[...(request.statusHistory || [])].reverse().map((h, i) => (
                  <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: i === 0 ? '#C17B2A' : '#dde3eb', marginTop: '4px', flexShrink: 0 }} />
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: '600', color: '#1a2e44', textTransform: 'capitalize' }}>{h.status?.replace(/_/g, ' ')}</div>
                      <div style={{ fontSize: '11px', color: '#8a9bb0' }}>{formatDateTime(h.changedAt)}</div>
                      {h.note && <div style={{ fontSize: '11px', color: '#6b7c93', marginTop: '2px', fontStyle: 'italic' }}>{h.note}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Customer info (provider sees this) */}
            {isProvider && request.customer && (
              <Card>
                <SectionTitle>Customer</SectionTitle>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#C17B2A', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                    {request.customer.firstName?.charAt(0)}{request.customer.lastName?.charAt(0)}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: '700', color: '#1a2e44' }}>{request.customer.firstName} {request.customer.lastName}</div>
                    <div style={{ fontSize: '12px', color: '#8a9bb0' }}>{request.customer.email}</div>
                    {request.customer.phone && <div style={{ fontSize: '12px', color: '#8a9bb0' }}>📞 {request.customer.phone}</div>}
                  </div>
                </div>
              </Card>
            )}

            {/* Quick stats */}
            {(request.status === 'in_progress' || request.status === 'completed') && progressUpdates.length > 0 && (
              <Card>
                <SectionTitle>Work Stats</SectionTitle>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                    <span style={{ color: '#6b7c93' }}>Progress updates</span>
                    <span style={{ fontWeight: '700', color: '#1a2e44' }}>{progressUpdates.length}</span>
                  </div>
                  {request.lastMatchAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6b7c93' }}>Matched on</span>
                      <span style={{ fontWeight: '700', color: '#1a2e44' }}>{formatDate(request.lastMatchAt)}</span>
                    </div>
                  )}
                  {request.completedAt && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                      <span style={{ color: '#6b7c93' }}>Completed on</span>
                      <span style={{ fontWeight: '700', color: '#27ae60' }}>{formatDate(request.completedAt)}</span>
                    </div>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RequestDetailPage;
