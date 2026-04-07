import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI } from '../../utils/requestsAPI';
import { StatusBadge, UrgencyBadge, CategoryBadge } from '../../components/common/StatusBadge';
import AppNavbar from '../../components/AppNavbar';

const NAV_LINKS = [
  { to: '/provider/dashboard', label: 'Home',      icon: '🏠' },
  { to: '/provider/requests',  label: 'My Jobs',   icon: '📋' },
  { to: '/provider/available', label: 'Available',  icon: '🔍' },
  { to: '/provider/profile',   label: 'Profile',   icon: '👤' },
];

const STATUS_FILTERS = [
  { value: '',            label: 'All' },
  { value: 'matched',     label: 'Matched' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'pending',     label: 'Pending' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

const ProviderJobsPage = () => {
  const { user }      = useAuth();

  const [jobs,          setJobs]          = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [filter,        setFilter]        = useState('');
  const [page,          setPage]          = useState(1);
  const [pagination,    setPagination]    = useState({});
  const [matchedCount,  setMatchedCount]  = useState(0);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 10 };
      if (filter) params.status = filter;
      const [res, matchedRes] = await Promise.all([
        requestsAPI.getMy(params),
        requestsAPI.getMy({ status: 'matched', limit: 100 }),
      ]);
      setJobs(res.data.data || []);
      setPagination(res.data.pagination || {});
      setMatchedCount(matchedRes.data.pagination?.total || 0);
    } catch (err) {
      console.error('fetchJobs error:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleFilter = (val) => { setFilter(val); setPage(1); };

  const formatDate = (d) =>
    new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Navbar ── */}
      <AppNavbar links={NAV_LINKS} />

      <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0d2137', margin: '0 0 4px' }}>My Jobs</h1>
            <p style={{ fontSize: '14px', color: '#6b7c93', margin: 0 }}>
              {pagination.total ?? '…'} total job{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <Link to="/provider/available" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#C17B2A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 12px rgba(193,123,42,0.3)' }}>
            🔍 Browse Available Jobs
          </Link>
        </div>

        {/* ── Filter tabs ── */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(({ value, label }) => {
            const isMatched = value === 'matched';
            const isActive  = filter === value;
            return (
              <button
                key={value}
                onClick={() => handleFilter(value)}
                style={{
                  padding: '6px 14px', borderRadius: '20px', border: 'none',
                  fontSize: '12px', fontWeight: '600', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif",
                  background: isActive ? '#1a3c5e' : isMatched && matchedCount > 0 ? '#e8f0fb' : '#e8ecf0',
                  color:      isActive ? '#fff'    : isMatched && matchedCount > 0 ? '#1a3c5e' : '#6b7c93',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {label}
                {isMatched && matchedCount > 0 && (
                  <span style={{
                    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                    width: '18px', height: '18px', borderRadius: '50%',
                    background: isActive ? '#fff' : '#1a3c5e',
                    color:      isActive ? '#1a3c5e' : '#fff',
                    fontSize: '10px', fontWeight: '800', lineHeight: 1,
                  }}>
                    {matchedCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Job list ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '90px', background: '#fff', borderRadius: '12px', border: '1px solid #e8ecf0', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fff', borderRadius: '14px', border: '1px solid #e8ecf0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>🗂️</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2e44', margin: '0 0 8px' }}>
              {filter ? `No ${filter.replace('_', ' ')} jobs` : 'No jobs yet'}
            </h3>
            <p style={{ fontSize: '14px', color: '#8a9bb0', marginBottom: '20px' }}>
              {filter ? 'Try a different filter.' : 'Browse available jobs to get started.'}
            </p>
            <Link to="/provider/available" style={{ display: 'inline-block', padding: '11px 28px', background: '#C17B2A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
              Browse Jobs
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {jobs.map(job => (
              <Link
                key={job._id}
                to={`/provider/requests/${job._id}`}
                style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '18px 20px', background: '#fff', borderRadius: '12px', border: '1px solid #e8ecf0', textDecoration: 'none', boxShadow: '0 2px 6px rgba(0,0,0,0.04)', transition: 'box-shadow 0.2s, transform 0.2s' }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {job.category === 'home_repair' ? '🔧' : job.category === 'home_upgrade' ? '🏡' : '💻'}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a2e44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {job.title}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <CategoryBadge category={job.category} />
                    <UrgencyBadge  urgency={job.urgency} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#8a9bb0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>👤 {job.customer?.firstName} {job.customer?.lastName}</span>
                    <span>📍 {job.location?.city}</span>
                    <span>🗓 {formatDate(job.createdAt)}</span>
                    {job.messages?.length > 0 && (
                      <span>💬 {job.messages.length} message{job.messages.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>
                <span style={{ fontSize: '18px', color: '#dde3eb', flexShrink: 0 }}>›</span>
              </Link>
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

export default ProviderJobsPage;
