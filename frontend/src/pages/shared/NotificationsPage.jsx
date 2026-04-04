import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/requestsAPI';
import AppNavbar from '../../components/AppNavbar';

const CUSTOMER_NAV = [
  { to: '/dashboard',            label: 'Home',           icon: '🏠' },
  { to: '/customer/request/new', label: 'New Request',    icon: '➕' },
  { to: '/customer/requests',    label: 'My Requests',    icon: '📋' },
  { to: '/customer/notifications', label: 'Notifications', icon: '🔔' },
];

const PROVIDER_NAV = [
  { to: '/provider/dashboard',     label: 'Home',           icon: '🏠' },
  { to: '/provider/requests',      label: 'My Jobs',        icon: '📋' },
  { to: '/provider/available',     label: 'Available',       icon: '🔍' },
  { to: '/provider/profile',       label: 'Profile',        icon: '👤' },
  { to: '/provider/notifications', label: 'Notifications',  icon: '🔔' },
];

const TYPE_ICON = {
  request_created:      '📋',
  request_matched:      '🔗',
  request_scheduled:    '📅',
  request_in_progress:  '🔧',
  request_completed:    '✅',
  request_cancelled:    '❌',
  new_message:          '💬',
  review_received:      '⭐',
};

const NotificationsPage = () => {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const isProvider = user?.role === 'provider';
  const navLinks   = isProvider ? PROVIDER_NAV : CUSTOMER_NAV;
  const detailBase = isProvider ? '/provider/requests' : '/customer/requests';

  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [markingAll,    setMarkingAll]    = useState(false);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [page,          setPage]          = useState(1);
  const [pagination,    setPagination]    = useState({});

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersAPI.getNotifications({ page, limit: 20 });
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error('fetchNotifications error:', err);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await usersAPI.markAsRead('all');
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('markAllRead error:', err);
    } finally {
      setMarkingAll(false);
    }
  };

  const handleClickNotification = async (notif) => {
    if (!notif.isRead) {
      try {
        await usersAPI.markAsRead([notif._id]);
        setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, isRead: true } : n));
        setUnreadCount(c => Math.max(0, c - 1));
      } catch (err) {
        console.error('markRead error:', err);
      }
    }
    if (notif.data?.requestId) {
      navigate(`${detailBase}/${notif.data.requestId}`);
    }
  };

  const formatDate = (d) => {
    const date  = new Date(d);
    const now   = new Date();
    const diffMs = now - date;
    const diffM  = Math.floor(diffMs / 60000);
    const diffH  = Math.floor(diffMs / 3600000);
    const diffD  = Math.floor(diffMs / 86400000);
    if (diffM < 1)  return 'Just now';
    if (diffM < 60) return `${diffM}m ago`;
    if (diffH < 24) return `${diffH}h ago`;
    if (diffD < 7)  return `${diffD}d ago`;
    return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Navbar ── */}
      <AppNavbar links={navLinks} />

      <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0d2137', margin: '0 0 4px' }}>
              Notifications
              {unreadCount > 0 && (
                <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px', borderRadius: '50%', background: '#C17B2A', color: '#fff', fontSize: '12px', fontWeight: '800' }}>
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7c93', margin: 0 }}>
              {unreadCount} unread · {pagination.total ?? 0} total
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={markingAll}
              style={{ padding: '8px 16px', background: '#fff', border: '1px solid #dde3eb', borderRadius: '8px', fontSize: '13px', fontWeight: '700', color: '#1a3c5e', cursor: markingAll ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", opacity: markingAll ? 0.6 : 1 }}
            >
              {markingAll ? 'Marking…' : '✓ Mark all as read'}
            </button>
          )}
        </div>

        {/* ── List ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {[1, 2, 3, 4].map(i => (
              <div key={i} style={{ height: '72px', background: '#fff', borderRadius: '12px', border: '1px solid #e8ecf0', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '14px', border: '1px solid #e8ecf0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔔</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2e44', margin: '0 0 8px' }}>No notifications yet</h3>
            <p style={{ fontSize: '14px', color: '#8a9bb0' }}>
              You will be notified about your {isProvider ? 'jobs' : 'requests'}, messages, and updates here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {notifications.map(notif => (
              <div
                key={notif._id}
                onClick={() => handleClickNotification(notif)}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '14px',
                  padding: '16px 18px',
                  background: notif.isRead ? '#fff' : '#eef5ff',
                  borderRadius: '12px',
                  border: '1px solid #e8ecf0',
                  borderLeft: notif.isRead ? '1px solid #e8ecf0' : '4px solid #1a3c5e',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                  cursor: notif.data?.requestId ? 'pointer' : 'default',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => { if (notif.data?.requestId) e.currentTarget.style.background = notif.isRead ? '#f8fafc' : '#deeeff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = notif.isRead ? '#fff' : '#eef5ff'; }}
              >
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px', flexShrink: 0 }}>
                  {TYPE_ICON[notif.type] || '🔔'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <p style={{ fontSize: '14px', fontWeight: notif.isRead ? '600' : '700', color: '#1a2e44', margin: '0 0 3px', lineHeight: 1.3 }}>
                      {notif.title}
                    </p>
                    <span style={{ fontSize: '11px', color: '#8a9bb0', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {formatDate(notif.createdAt)}
                    </span>
                  </div>
                  <p style={{ fontSize: '13px', color: '#4a5568', margin: 0, lineHeight: 1.5 }}>
                    {notif.message}
                  </p>
                  {notif.data?.requestId && (
                    <span style={{ fontSize: '11px', color: '#1a3c5e', fontWeight: '700', marginTop: '4px', display: 'inline-block' }}>
                      View details →
                    </span>
                  )}
                </div>
                {!notif.isRead && (
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#C17B2A', flexShrink: 0, marginTop: '5px' }} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px', alignItems: 'center' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={paginationBtnStyle(page === 1)}>‹ Prev</button>
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button key={p} onClick={() => setPage(p)} style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #dde3eb', background: page === p ? '#1a3c5e' : '#fff', color: page === p ? '#fff' : '#4a5568', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>{p}</button>
            ))}
            <button onClick={() => setPage(p => Math.min(pagination.pages, p + 1))} disabled={page === pagination.pages} style={paginationBtnStyle(page === pagination.pages)}>Next ›</button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

const paginationBtnStyle = (disabled) => ({
  padding: '8px 14px', borderRadius: '8px', border: '1px solid #dde3eb', background: '#fff',
  fontSize: '13px', fontWeight: '600', cursor: disabled ? 'not-allowed' : 'pointer',
  color: disabled ? '#c0cdd8' : '#4a5568', fontFamily: "'Outfit', sans-serif",
});

export default NotificationsPage;
