import React, { useEffect, useState, useCallback } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI } from '../../utils/requestsAPI';
import { StatusBadge, UrgencyBadge, CategoryBadge } from '../../components/common/StatusBadge';
import AppNavbar from '../../components/AppNavbar';

const NAV_LINKS = [
  { to: '/dashboard',            label: 'Home',        icon: '🏠' },
  { to: '/customer/request/new', label: 'New Request', icon: '➕' },
  { to: '/customer/requests',    label: 'My Requests', icon: '📋' },
];

const STATUS_FILTERS = [
  { value: '',            label: 'All' },
  { value: 'pending',     label: 'Pending' },
  { value: 'matched',     label: 'Matched' },
  { value: 'scheduled',   label: 'Scheduled' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed',   label: 'Completed' },
  { value: 'cancelled',   label: 'Cancelled' },
];

const CustomerRequestsPage = () => {
  const { user }     = useAuth();
  const location     = useLocation();
  const successMsg   = location.state?.successMsg || '';

  const [requests,   setRequests]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [filter,     setFilter]     = useState('');
  const [page,       setPage]       = useState(1);
  const [pagination, setPagination] = useState({});
  const [showBanner, setShowBanner] = useState(!!successMsg);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 8 };
      if (filter) params.status = filter;
      const res = await requestsAPI.getMy(params);
      setRequests(res.data.data || []);
      setPagination(res.data.pagination || {});
    } catch (err) {
      console.error('Failed to fetch requests:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  // Reset to page 1 when filter changes
  const handleFilter = (value) => {
    setFilter(value);
    setPage(1);
  };

  const formatDate = (dateStr) =>
    new Date(dateStr).toLocaleDateString('en-GB', {
      day: '2-digit', month: 'short', year: 'numeric',
    });

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Navbar ── */}
      <AppNavbar links={NAV_LINKS} />

      <div style={{ maxWidth: '900px', margin: '32px auto', padding: '0 20px' }}>

        {/* ── Success banner (after creating a request) ── */}
        {showBanner && (
          <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '10px', padding: '14px 18px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '14px', color: '#155724', fontWeight: '600' }}>
              ✅ {successMsg}
            </span>
            <button
              onClick={() => setShowBanner(false)}
              style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer', color: '#155724', lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        )}

        {/* ── Header row ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0d2137', margin: '0 0 4px' }}>My Requests</h1>
            <p style={{ fontSize: '14px', color: '#6b7c93', margin: 0 }}>
              {pagination.total ?? '…'} total request{pagination.total !== 1 ? 's' : ''}
            </p>
          </div>
          <Link
            to="/customer/request/new"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#C17B2A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700', boxShadow: '0 4px 12px rgba(193,123,42,0.3)' }}
          >
            ➕ New Request
          </Link>
        </div>

        {/* ── Status filter tabs ── */}
        <div style={{ display: 'flex', gap: '6px', marginBottom: '20px', flexWrap: 'wrap' }}>
          {STATUS_FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => handleFilter(value)}
              style={{
                padding:      '6px 14px',
                borderRadius: '20px',
                border:       'none',
                fontSize:     '12px',
                fontWeight:   '600',
                cursor:       'pointer',
                fontFamily:   "'Outfit', sans-serif",
                transition:   'all 0.2s',
                background:   filter === value ? '#1a3c5e' : '#e8ecf0',
                color:        filter === value ? '#fff' : '#6b7c93',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* ── Request list ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '90px', background: '#fff', borderRadius: '12px', border: '1px solid #e8ecf0', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : requests.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 24px', background: '#fff', borderRadius: '14px', border: '1px solid #e8ecf0' }}>
            <div style={{ fontSize: '48px', marginBottom: '16px' }}>📭</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2e44', margin: '0 0 8px' }}>
              {filter ? `No ${filter.replace('_', ' ')} requests` : 'No requests yet'}
            </h3>
            <p style={{ fontSize: '14px', color: '#8a9bb0', marginBottom: '20px' }}>
              {filter ? 'Try a different filter or create a new request.' : 'Book your first property maintenance service.'}
            </p>
            <Link
              to="/customer/request/new"
              style={{ display: 'inline-block', padding: '11px 28px', background: '#C17B2A', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}
            >
              Book a Service
            </Link>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {requests.map(req => (
              <Link
                key={req._id}
                to={`/customer/requests/${req._id}`}
                style={{
                  display:        'flex',
                  alignItems:     'center',
                  gap:            '16px',
                  padding:        '18px 20px',
                  background:     '#fff',
                  borderRadius:   '12px',
                  border:         '1px solid #e8ecf0',
                  textDecoration: 'none',
                  boxShadow:      '0 2px 6px rgba(0,0,0,0.04)',
                  transition:     'box-shadow 0.2s, transform 0.2s',
                }}
                onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(0,0,0,0.1)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 6px rgba(0,0,0,0.04)'; e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {/* Category icon */}
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                  {req.category === 'home_repair' ? '🔧' : req.category === 'home_upgrade' ? '🏡' : '💻'}
                </div>

                {/* Main info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#1a2e44', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {req.title}
                    </span>
                    <StatusBadge status={req.status} />
                  </div>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                    <CategoryBadge category={req.category} />
                    <UrgencyBadge  urgency={req.urgency} />
                  </div>
                  <div style={{ fontSize: '12px', color: '#8a9bb0', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <span>📍 {req.location?.city}</span>
                    <span>🗓 {formatDate(req.createdAt)}</span>
                    {req.provider && (
                      <span>👷 {req.provider.firstName} {req.provider.lastName}</span>
                    )}
                    {req.messages?.length > 0 && (
                      <span>💬 {req.messages.length} message{req.messages.length !== 1 ? 's' : ''}</span>
                    )}
                  </div>
                </div>

                {/* Arrow */}
                <span style={{ fontSize: '18px', color: '#dde3eb', flexShrink: 0 }}>›</span>
              </Link>
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {pagination.pages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '24px', alignItems: 'center' }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #dde3eb', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: page === 1 ? 'not-allowed' : 'pointer', color: page === 1 ? '#c0cdd8' : '#4a5568', fontFamily: "'Outfit', sans-serif" }}
            >
              ‹ Prev
            </button>

            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => setPage(p)}
                style={{ width: '36px', height: '36px', borderRadius: '8px', border: '1px solid #dde3eb', background: page === p ? '#1a3c5e' : '#fff', color: page === p ? '#fff' : '#4a5568', fontSize: '13px', fontWeight: '600', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
              >
                {p}
              </button>
            ))}

            <button
              onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              style={{ padding: '8px 14px', borderRadius: '8px', border: '1px solid #dde3eb', background: '#fff', fontSize: '13px', fontWeight: '600', cursor: page === pagination.pages ? 'not-allowed' : 'pointer', color: page === pagination.pages ? '#c0cdd8' : '#4a5568', fontFamily: "'Outfit', sans-serif" }}
            >
              Next ›
            </button>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default CustomerRequestsPage;