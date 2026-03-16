import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const ProviderDashboard = () => {
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

        {/* ── Profile Card ── */}
        <div style={styles.card}>
          <div style={styles.profileHeader}>
            <div style={styles.avatar}>
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div style={styles.profileInfo}>
              <h1 style={styles.heading}>{user?.firstName} {user?.lastName}</h1>
              <p style={styles.subheading}>{user?.email}</p>
              <span style={styles.roleBadge}>🔧 Service Provider</span>
            </div>
          </div>

          {/* ── Info Grid ── */}
          <div style={styles.infoGrid}>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Full Name</span>
              <span style={styles.infoValue}>{user?.firstName} {user?.lastName}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Email</span>
              <span style={styles.infoValue}>{user?.email}</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Role</span>
              <span style={styles.infoValue}>Service Provider</span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Account Status</span>
              <span style={{ ...styles.infoValue, color: '#27ae60', fontWeight: '700' }}>
                ✅ Active
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Verification Status</span>
              <span style={{ ...styles.infoValue, color: '#f39c12', fontWeight: '700' }}>
                ⏳ Pending Verification
              </span>
            </div>
            <div style={styles.infoItem}>
              <span style={styles.infoLabel}>Availability</span>
              <span style={{ ...styles.infoValue, color: '#27ae60', fontWeight: '700' }}>
                🟢 Available
              </span>
            </div>
          </div>
        </div>

        {/* ── Stats Row ── */}
        <div style={styles.statsRow}>
          {[
            { icon: '📋', label: 'Total Jobs',      value: '0', color: '#1a3c5e' },
            { icon: '⏳', label: 'Pending',          value: '0', color: '#f39c12' },
            { icon: '✅', label: 'Completed',        value: '0', color: '#27ae60' },
            { icon: '⭐', label: 'Average Rating',   value: 'N/A', color: '#e67e22' },
          ].map(({ icon, label, value, color }) => (
            <div key={label} style={styles.statCard}>
              <span style={styles.statIcon}>{icon}</span>
              <span style={{ ...styles.statValue, color }}>{value}</span>
              <span style={styles.statLabel}>{label}</span>
            </div>
          ))}
        </div>

        {/* ── Service Categories ── */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>🛠️ Service Categories</h2>
          <p style={styles.sectionSubtitle}>
            Complete your profile to start receiving service requests.
          </p>
          <div style={styles.categoryGrid}>
            {[
              { icon: '🔨', title: 'Home Repair',    desc: 'Plumbing, electrical, carpentry' },
              { icon: '🏡', title: 'Home Upgrade',   desc: 'Renovation, painting, flooring' },
              { icon: '💻', title: 'Tech & Digital', desc: 'Device repair, network setup' },
            ].map(({ icon, title, desc }) => (
              <div key={title} style={styles.categoryCard}>
                <span style={styles.categoryIcon}>{icon}</span>
                <h3 style={styles.categoryTitle}>{title}</h3>
                <p style={styles.categoryDesc}>{desc}</p>
                <span style={styles.comingSoonTag}>Coming Soon</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Coming Soon ── */}
        <div style={styles.card}>
          <h2 style={styles.sectionTitle}>🚧 Coming Soon</h2>
          <div style={styles.featureList}>
            {[
              { icon: '📍', text: 'Set your service area and availability radius' },
              { icon: '📅', text: 'Manage your availability schedule' },
              { icon: '📬', text: 'Receive and respond to service requests' },
              { icon: '💬', text: 'Chat with customers in real-time' },
              { icon: '⭐', text: 'View your ratings and reviews' },
              { icon: '💰', text: 'Track your earnings and job history' },
            ].map(({ icon, text }) => (
              <div key={text} style={styles.featureItem}>
                <span style={styles.featureIcon}>{icon}</span>
                <span style={styles.featureText}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Logout Button ── */}
        <button onClick={handleLogout} style={styles.logoutBtnLarge}>
          🚪 Logout
        </button>

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

  // ── Navbar ──
  navbar: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '0 32px',
    height:         '64px',
    background:     '#1a3c5e',
    boxShadow:      '0 2px 8px rgba(0,0,0,0.15)',
  },
  navLeft:  { display: 'flex', alignItems: 'center' },
  navRight: { display: 'flex', alignItems: 'center', gap: '16px' },
  logo: {
    fontSize:   '20px',
    fontWeight: '700',
    color:      '#ffffff',
  },
  welcomeText: {
    fontSize: '14px',
    color:    'rgba(255,255,255,0.85)',
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
  },

  // ── Content ──
  content: {
    maxWidth: '900px',
    margin:   '32px auto',
    padding:  '0 24px',
    display:  'flex',
    flexDirection: 'column',
    gap:      '24px',
  },
  card: {
    background:   '#ffffff',
    borderRadius: '12px',
    padding:      '28px',
    boxShadow:    '0 2px 12px rgba(0,0,0,0.08)',
  },

  // ── Profile ──
  profileHeader: {
    display:      'flex',
    alignItems:   'center',
    gap:          '20px',
    marginBottom: '24px',
  },
  avatar: {
    width:          '64px',
    height:         '64px',
    borderRadius:   '50%',
    background:     '#1a3c5e',
    color:          '#ffffff',
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    fontSize:       '22px',
    fontWeight:     '700',
    flexShrink:     0,
  },
  profileInfo: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '4px',
  },
  heading: {
    fontSize:   '22px',
    fontWeight: '700',
    color:      '#0d2137',
    margin:     0,
  },
  subheading: {
    fontSize: '14px',
    color:    '#6b7c93',
    margin:   0,
  },
  roleBadge: {
    display:      'inline-block',
    padding:      '3px 10px',
    background:   '#e8f4fd',
    color:        '#1a3c5e',
    borderRadius: '20px',
    fontSize:     '12px',
    fontWeight:   '600',
    width:        'fit-content',
  },

  // ── Info Grid ──
  infoGrid: {
    display:             'grid',
    gridTemplateColumns: '1fr 1fr',
    gap:                 '12px',
  },
  infoItem: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '4px',
    padding:       '14px',
    background:    '#f8fafc',
    borderRadius:  '8px',
    border:        '1px solid #e8ecf0',
  },
  infoLabel: {
    fontSize:      '11px',
    fontWeight:    '600',
    color:         '#8a9bb0',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },
  infoValue: {
    fontSize:   '14px',
    fontWeight: '500',
    color:      '#1a2e44',
  },

  // ── Stats ──
  statsRow: {
    display:             'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap:                 '16px',
  },
  statCard: {
    background:     '#ffffff',
    borderRadius:   '12px',
    padding:        '20px',
    boxShadow:      '0 2px 12px rgba(0,0,0,0.08)',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    gap:            '6px',
    textAlign:      'center',
  },
  statIcon:  { fontSize: '24px' },
  statValue: { fontSize: '24px', fontWeight: '700' },
  statLabel: { fontSize: '12px', color: '#8a9bb0', fontWeight: '500' },

  // ── Categories ──
  sectionTitle: {
    fontSize:     '18px',
    fontWeight:   '700',
    color:        '#0d2137',
    margin:       '0 0 6px',
  },
  sectionSubtitle: {
    fontSize:     '13px',
    color:        '#8a9bb0',
    margin:       '0 0 20px',
  },
  categoryGrid: {
    display:             'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap:                 '16px',
  },
  categoryCard: {
    padding:       '20px',
    background:    '#f8fafc',
    borderRadius:  '10px',
    border:        '1px solid #e8ecf0',
    display:       'flex',
    flexDirection: 'column',
    gap:           '6px',
    alignItems:    'flex-start',
  },
  categoryIcon:  { fontSize: '28px' },
  categoryTitle: { fontSize: '15px', fontWeight: '700', color: '#1a2e44', margin: 0 },
  categoryDesc:  { fontSize: '12px', color: '#8a9bb0', margin: 0 },
  comingSoonTag: {
    marginTop:    '8px',
    padding:      '3px 8px',
    background:   '#fff3cd',
    color:        '#856404',
    borderRadius: '4px',
    fontSize:     '11px',
    fontWeight:   '600',
  },

  // ── Features ──
  featureList: {
    display:       'flex',
    flexDirection: 'column',
    gap:           '12px',
  },
  featureItem: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    padding:    '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    border:     '1px solid #e8ecf0',
  },
  featureIcon: { fontSize: '20px' },
  featureText: { fontSize: '14px', color: '#4a5568' },

  // ── Logout ──
  logoutBtnLarge: {
    width:        '100%',
    padding:      '13px',
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

export default ProviderDashboard;