import React, { useState, useCallback } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import MiniChatPanel from './MiniChatPanel';

/**
 * AppNavbar — shared navbar for all authenticated customer/provider pages.
 *
 * Props:
 *   links       : Array<{ to, label, icon, notif? }>  — nav link items
 *   unreadCount : number (optional, default 0)         — badge on notif link
 */
const AppNavbar = ({ links = [], unreadCount = 0 }) => {
  const { user, logout }  = useAuth();
  const navigate          = useNavigate();
  const location          = useLocation();

  const [chatOpen,   setChatOpen]   = useState(false);
  const [chatUnread, setChatUnread] = useState(0);

  const handleLogout    = async () => { await logout(); navigate('/auth/login'); };
  const handleChatUnread = useCallback((n) => setChatUnread(n), []);

  return (
    <nav style={navStyle}>
      {/* ── Logo ── */}
      <Link
        to="/home"
        style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none', flexShrink: 0 }}
      >
        <span style={{ fontSize: '20px' }}>🏠</span>
        <span style={{ fontSize: '16px', fontWeight: '800', color: '#fff', fontFamily: "'Outfit', sans-serif" }}>
          PropMaintain
        </span>
      </Link>

      {/* ── Nav links ── */}
      <div style={{ display: 'flex', gap: '4px' }}>
        {links.map(({ to, label, icon, notif }) => (
          <Link
            key={to}
            to={to}
            style={{
              display: 'flex', alignItems: 'center', gap: '5px', position: 'relative',
              padding: '6px 12px', borderRadius: '6px', textDecoration: 'none',
              fontSize: '13px', fontWeight: '500', fontFamily: "'Outfit', sans-serif",
              color:      location.pathname === to ? '#fff' : 'rgba(255,255,255,0.7)',
              background: location.pathname === to ? 'rgba(255,255,255,0.15)' : 'transparent',
              flexShrink: 0,
            }}
          >
            {icon} {label}
            {notif && unreadCount > 0 && (
              <span style={{
                position: 'absolute', top: '2px', right: '4px',
                width: '16px', height: '16px', borderRadius: '50%',
                background: '#C17B2A', color: '#fff',
                fontSize: '9px', fontWeight: '800',
                display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
              }}>
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </Link>
        ))}
      </div>

      {/* ── Right section: chat + name + logout ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>

        {/* Chat icon */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => { setChatOpen(o => !o); setChatUnread(0); }}
            title="Messages"
            style={{
              position: 'relative',
              background: chatOpen ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.25)', borderRadius: '8px',
              width: '36px', height: '36px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '16px', flexShrink: 0,
            }}
          >
            💬
            {chatUnread > 0 && (
              <span style={{
                position: 'absolute', top: '-5px', right: '-5px',
                background: '#e74c3c', color: '#fff',
                borderRadius: '10px', padding: '1px 5px',
                fontSize: '10px', fontWeight: '800', lineHeight: 1.4,
              }}>
                {chatUnread}
              </span>
            )}
          </button>

          {chatOpen && (
            <>
              {/* Click-outside backdrop — sits BELOW the right section (z:199) */}
              <div
                onClick={() => setChatOpen(false)}
                style={{ position: 'fixed', inset: 0, zIndex: 199 }}
              />
              {/* Chat panel — above backdrop */}
              <div style={{
                position: 'absolute', top: 'calc(100% + 10px)', right: 0,
                width: '620px', zIndex: 300,
                boxShadow: '0 12px 40px rgba(0,0,0,0.18)', borderRadius: '14px',
              }}>
                <MiniChatPanel onUnread={handleChatUnread} />
              </div>
            </>
          )}
        </div>

        <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', fontFamily: "'Outfit', sans-serif", flexShrink: 0 }}>
          👋 {user?.firstName}
        </span>
        <button onClick={handleLogout} style={navBtnStyle}>🚪 Logout</button>
      </div>
    </nav>
  );
};

const navStyle = {
  height: '60px', background: '#1a3c5e',
  display: 'flex', alignItems: 'center',
  padding: '0 28px', justifyContent: 'space-between', gap: '8px',
  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
  position: 'sticky', top: 0, zIndex: 100,
  overflow: 'visible',
};

const navBtnStyle = {
  padding: '7px 14px', background: 'rgba(255,255,255,0.15)',
  border: '1px solid rgba(255,255,255,0.3)', borderRadius: '6px',
  color: '#fff', fontSize: '13px', fontWeight: '600', cursor: 'pointer',
  fontFamily: "'Outfit', sans-serif", flexShrink: 0,
};

export default AppNavbar;
