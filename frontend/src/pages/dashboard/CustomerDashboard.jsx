import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const CustomerDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/auth/login');
  };

  return (
    <div style={styles.page}>
      {/* ── Navbar ── */}
      <nav style={styles.navbar}>
        <div style={styles.navLeft}>
          <span style={styles.logo}>🏠 PropMaintain</span>
        </div>
        <div style={styles.navRight}>
          <span style={styles.welcomeText}>
            👋 Welcome, {user?.firstName} {user?.lastName}
          </span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            🚪 Logout
          </button>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div style={styles.content}>
        <div style={styles.card}>
          <h1 style={styles.heading}>Customer Dashboard</h1>
          <p style={styles.subheading}>
            You are logged in as <strong>{user?.email}</strong>
          </p>
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Name</span>
              <span style={styles.infoValue}>{user?.firstName} {user?.lastName}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{user?.email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Role</span>
              <span style={styles.infoValue}>{user?.role}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Account Status</span>
              <span style={{ ...styles.infoValue, color: '#27ae60', fontWeight: '700' }}>
                ✅ Active
              </span>
            </div>
          </div>

          <div style={styles.comingSoon}>
            <h3 style={styles.comingSoonTitle}>🚧 Coming Soon</h3>
            <p style={styles.comingSoonText}>
              Service requests, provider matching, and scheduling are being built.
            </p>
          </div>

          <button onClick={handleLogout} style={styles.logoutBtnLarge}>
            🚪 Logout
          </button>
        </div>
      </div>
    </div>
  );
};

const styles = {
  page: {
    minHeight:  '100vh',
    background: '#f0f4f8',
    fontFamily: "'DM Sans', sans-serif",
  },
  navbar: {
    display:         'flex',
    justifyContent:  'space-between',
    alignItems:      'center',
    padding:         '0 32px',
    height:          '64px',
    background:      '#1a3c5e',
    boxShadow:       '0 2px 8px rgba(0,0,0,0.15)',
  },
  navLeft: {
    display:    'flex',
    alignItems: 'center',
  },
  logo: {
    fontSize:   '20px',
    fontWeight: '700',
    color:      '#ffffff',
    fontFamily: "'DM Sans', sans-serif",
  },
  navRight: {
    display:    'flex',
    alignItems: 'center',
    gap:        '16px',
  },
  welcomeText: {
    fontSize:   '14px',
    color:      'rgba(255,255,255,0.85)',
    fontFamily: "'DM Sans', sans-serif",
  },
  logoutBtn: {
    padding:      '8px 16px',
    background:   'rgba(255,255,255,0.15)',
    border:       '1px solid rgba(255,255,255,0.3)',
    borderRadius: '6px',
    color:        '#ffffff',
    fontSize:     '13px',
    fontWeight:   '600',
    cursor:       'pointer',
    fontFamily:   "'DM Sans', sans-serif",
    transition:   'background 0.2s',
  },
  content: {
    maxWidth:  '800px',
    margin:    '40px auto',
    padding:   '0 24px',
  },
  card: {
    background:   '#ffffff',
    borderRadius: '12px',
    padding:      '32px',
    boxShadow:    '0 2px 12px rgba(0,0,0,0.08)',
  },
  heading: {
    fontSize:     '24px',
    fontWeight:   '700',
    color:        '#0d2137',
    margin:       '0 0 8px',
  },
  subheading: {
    fontSize:     '14px',
    color:        '#6b7c93',
    margin:       '0 0 28px',
  },
  infoGrid: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '16px',
    marginBottom:        '28px',
  },
  infoItem: {
    display:        'flex',
    flexDirection:  'column',
    gap:            '4px',
    padding:        '16px',
    background:     '#f8fafc',
    borderRadius:   '8px',
    border:         '1px solid #e8ecf0',
  },
  infoLabel: {
    fontSize:   '11px',
    fontWeight: '600',
    color:      '#8a9bb0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize:   '15px',
    fontWeight: '500',
    color:      '#1a2e44',
  },
  comingSoon: {
    background:   '#f0f6ff',
    border:       '1px solid #bee3f8',
    borderRadius: '8px',
    padding:      '20px',
    marginBottom: '24px',
    textAlign:    'center',
  },
  comingSoonTitle: {
    fontSize:     '16px',
    fontWeight:   '700',
    color:        '#2b6cb0',
    margin:       '0 0 8px',
  },
  comingSoonText: {
    fontSize:   '13px',
    color:      '#4a5568',
    margin:     0,
  },
  logoutBtnLarge: {
    width:        '100%',
    padding:      '12px',
    background:   '#e74c3c',
    border:       'none',
    borderRadius: '8px',
    color:        '#ffffff',
    fontSize:     '15px',
    fontWeight:   '600',
    cursor:       'pointer',
    fontFamily:   "'DM Sans', sans-serif",
  },
};

export default CustomerDashboard;