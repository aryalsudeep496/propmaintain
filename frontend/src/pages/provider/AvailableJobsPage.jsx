import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { requestsAPI } from '../../utils/requestsAPI';
import { CategoryBadge, UrgencyBadge } from '../../components/common/StatusBadge';
import AppNavbar from '../../components/AppNavbar';

const NAV_LINKS = [
  { to: '/provider/dashboard', label: 'Home',      icon: '🏠' },
  { to: '/provider/requests',  label: 'My Jobs',   icon: '📋' },
  { to: '/provider/available', label: 'Available',  icon: '🔍' },
  { to: '/provider/profile',   label: 'Profile',   icon: '👤' },
];

const catIcon = (c) => ({ home_repair: '🔧', home_upgrade: '🏡', tech_digital: '💻' })[c] || '🛠️';

const formatDate = (d) =>
  new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

// ─── Job Detail Modal ──────────────────────────────────────────────────────────
const JobModal = ({ job, onClose, onAccept, accepting }) => {
  if (!job) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 800 }}
      />

      {/* Modal */}
      <div style={{
        position: 'fixed', top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        zIndex: 801,
        width: '560px', maxWidth: 'calc(100vw - 32px)',
        background: '#fff', borderRadius: '18px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
        fontFamily: "'Outfit', sans-serif",
        maxHeight: '85vh', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #1a3c5e 0%, #2563a8 100%)',
          padding: '20px 24px 16px',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'flex-start' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px', flexShrink: 0 }}>
                {catIcon(job.category)}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#fff', lineHeight: 1.25 }}>
                  {job.title}
                </h2>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px', flexWrap: 'wrap' }}>
                  <CategoryBadge category={job.category} />
                  <UrgencyBadge  urgency={job.urgency} />
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', borderRadius: '8px', width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px', lineHeight: 1, flexShrink: 0 }}
            >
              ×
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>

          {/* Meta row */}
          <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', marginBottom: '16px', fontSize: '13px', color: '#6b7c93' }}>
            <span>📍 {job.location?.address ? `${job.location.address}, ` : ''}{job.location?.city}{job.location?.postcode ? ` ${job.location.postcode}` : ''}</span>
            <span>🗓 Posted {formatDate(job.createdAt)}</span>
            <span>👤 {job.customer?.firstName} {job.customer?.lastName}</span>
          </div>

          {/* Description */}
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px', marginBottom: '16px', border: '1px solid #f0f4f8' }}>
            <p style={{ fontSize: '11px', fontWeight: '700', color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 8px' }}>Description</p>
            <p style={{ fontSize: '14px', color: '#1a2e44', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>{job.description}</p>
          </div>

          {/* Service type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #f0f4f8' }}>
              <p style={{ fontSize: '11px', fontWeight: '700', color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Service Type</p>
              <p style={{ fontSize: '13px', color: '#1a2e44', margin: 0, fontWeight: '600' }}>{job.serviceType}</p>
            </div>
            {job.preferredDate && (
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px 14px', border: '1px solid #f0f4f8' }}>
                <p style={{ fontSize: '11px', fontWeight: '700', color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.5px', margin: '0 0 4px' }}>Preferred Date</p>
                <p style={{ fontSize: '13px', color: '#1a2e44', margin: 0, fontWeight: '600' }}>{formatDate(job.preferredDate)}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f4f8', display: 'flex', gap: '10px', flexShrink: 0 }}>
          <button
            onClick={() => onAccept(job._id)}
            disabled={accepting}
            style={{
              flex: 1, padding: '12px 0',
              background: accepting ? '#8a9bb0' : 'linear-gradient(135deg, #27ae60, #1e8449)',
              color: '#fff', border: 'none', borderRadius: '10px',
              fontSize: '15px', fontWeight: '700', cursor: accepting ? 'not-allowed' : 'pointer',
              fontFamily: "'Outfit', sans-serif",
              boxShadow: accepting ? 'none' : '0 4px 12px rgba(39,174,96,0.3)',
            }}
          >
            {accepting ? 'Accepting…' : '✓ Accept Job'}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '12px 20px',
              background: '#f0f4f8', color: '#4a5568',
              border: '1.5px solid #dde3eb', borderRadius: '10px',
              fontSize: '14px', fontWeight: '700', cursor: 'pointer',
              fontFamily: "'Outfit', sans-serif",
            }}
          >
            Close
          </button>
        </div>
      </div>
    </>
  );
};

// ─── Main Page ─────────────────────────────────────────────────────────────────
const AvailableJobsPage = () => {
  const navigate = useNavigate();

  const [jobs,       setJobs]       = useState([]);
  const [myMatched,  setMyMatched]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState('');
  const [viewJob,    setViewJob]    = useState(null);
  const [accepting,  setAccepting]  = useState(false);
  const [acceptErr,  setAcceptErr]  = useState('');

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const res = await requestsAPI.getAvailable();
      setJobs(res.data.data       || []);
      setMyMatched(res.data.myMatched || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load available jobs.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const handleAccept = async (jobId) => {
    setAccepting(true);
    setAcceptErr('');
    try {
      await requestsAPI.acceptJob(jobId);
      setViewJob(null);
      navigate(`/provider/requests/${jobId}`, {
        state: { successMsg: 'Job accepted! You can now start work.' },
      });
    } catch (err) {
      setAcceptErr(err.response?.data?.message || 'Failed to accept job.');
      setAccepting(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>

      <AppNavbar links={NAV_LINKS} />

      <div style={{ maxWidth: '920px', margin: '32px auto', padding: '0 20px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0d2137', margin: '0 0 4px' }}>
              Browse Jobs
              {!loading && (myMatched.length + jobs.length) > 0 && (
                <span style={{ marginLeft: '10px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '2px 10px', borderRadius: '20px', background: '#C17B2A', color: '#fff', fontSize: '12px', fontWeight: '800' }}>
                  {myMatched.length + jobs.length}
                </span>
              )}
            </h1>
            <p style={{ fontSize: '14px', color: '#6b7c93', margin: 0 }}>
              {myMatched.length > 0
                ? `${myMatched.length} job${myMatched.length > 1 ? 's' : ''} matched to you · ${jobs.length} open`
                : 'Open jobs within your service area. View details or accept directly.'}
            </p>
          </div>
          <button
            onClick={fetchJobs}
            disabled={loading}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '10px 18px', background: '#1a3c5e', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", opacity: loading ? 0.7 : 1 }}
          >
            🔄 {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {/* ── Accept error ── */}
        {acceptErr && (
          <div style={{ background: '#fff0f0', border: '1px solid #fcd0d0', borderRadius: '10px', padding: '12px 16px', marginBottom: '16px', fontSize: '14px', color: '#c0392b', fontWeight: '600' }}>
            ⚠ {acceptErr}
            <button onClick={() => setAcceptErr('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: '#c0392b' }}>×</button>
          </div>
        )}

        {/* ── Fetch error ── */}
        {error && (
          <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', fontSize: '14px', color: '#721c24', fontWeight: '600' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ── Your Matched Jobs ── */}
        {!loading && myMatched.length > 0 && (
          <div style={{ marginBottom: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px', fontWeight: '800', color: '#1a3c5e' }}>🔗 Matched to You</span>
              <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', background: '#1a3c5e', padding: '2px 10px', borderRadius: '20px' }}>{myMatched.length}</span>
              <span style={{ fontSize: '13px', color: '#6b7c93' }}>— These jobs are assigned to you and ready to start</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {myMatched.map(job => (
                <div key={job._id} style={{ background: '#fff', borderRadius: '14px', border: '2px solid #1a3c5e', boxShadow: '0 4px 16px rgba(26,60,94,0.12)', overflow: 'hidden' }}>
                  {/* Banner */}
                  <div style={{ background: 'linear-gradient(135deg, #1a3c5e, #2563a8)', padding: '8px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '13px', fontWeight: '700', color: '#fff' }}>🔗 Matched to You — Ready to Start</span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.75)', background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: '20px' }}>
                      {job.urgency?.toUpperCase()}
                    </span>
                  </div>
                  <div style={{ padding: '16px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px' }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '10px', background: '#eef2f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        {catIcon(job.category)}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1a2e44', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.title}</h3>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <CategoryBadge category={job.category} />
                          <UrgencyBadge  urgency={job.urgency} />
                        </div>
                      </div>
                    </div>
                    <p style={{ fontSize: '13px', color: '#4a5568', margin: '0 0 10px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {job.description}
                    </p>
                    <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#8a9bb0', flexWrap: 'wrap', marginBottom: '14px' }}>
                      <span>📍 {job.location?.city}{job.location?.postcode ? `, ${job.location.postcode}` : ''}</span>
                      <span>🔧 {job.serviceType}</span>
                      <span>👤 {job.customer?.firstName} {job.customer?.lastName}</span>
                      <span>🗓 {formatDate(job.createdAt)}</span>
                    </div>
                    <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f0f4f8', paddingTop: '14px' }}>
                      <button
                        onClick={() => setViewJob(job)}
                        style={{ flex: 1, padding: '10px 0', background: '#f0f4f8', color: '#1a3c5e', border: '1.5px solid #dde3eb', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                      >
                        👁 View Details
                      </button>
                      <button
                        onClick={() => handleAccept(job._id)}
                        disabled={accepting}
                        style={{ flex: 2, padding: '10px 0', background: accepting ? '#8a9bb0' : 'linear-gradient(135deg, #27ae60, #1e8449)', color: '#fff', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '700', cursor: accepting ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', boxShadow: accepting ? 'none' : '0 3px 10px rgba(39,174,96,0.25)' }}
                      >
                        ✓ {accepting ? 'Starting…' : 'Accept & Start'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ height: '1px', background: '#e8ecf0', margin: '24px 0' }} />
          </div>
        )}

        {/* ── Open Jobs ── */}
        {!loading && jobs.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px' }}>
            <span style={{ fontSize: '15px', fontWeight: '800', color: '#0d2137' }}>🟢 Open Jobs</span>
            <span style={{ fontSize: '12px', fontWeight: '700', color: '#fff', background: '#27ae60', padding: '2px 10px', borderRadius: '20px' }}>{jobs.length}</span>
          </div>
        )}

        {/* ── Job list ── */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: '120px', background: '#fff', borderRadius: '12px', border: '1px solid #e8ecf0', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px', background: '#fff', borderRadius: '14px', border: '1px solid #e8ecf0' }}>
            <div style={{ fontSize: '56px', marginBottom: '16px' }}>🔍</div>
            <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#1a2e44', margin: '0 0 8px' }}>No jobs available right now</h3>
            <p style={{ fontSize: '14px', color: '#8a9bb0', marginBottom: '20px' }}>
              No open jobs match your service categories and area. Check back later or update your profile.
            </p>
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
              <button onClick={fetchJobs} style={{ padding: '11px 24px', background: '#C17B2A', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}>
                🔄 Refresh
              </button>
              <Link to="/provider/profile" style={{ display: 'inline-block', padding: '11px 24px', background: '#1a3c5e', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '14px', fontWeight: '700' }}>
                ✏️ Update Profile
              </Link>
            </div>
          </div>
        ) : (
          <>
            {/* ── Section counts ── */}
            {(() => {
              const open    = jobs.filter(j => !j.provider);
              const matched = jobs.filter(j =>  j.provider);
              return (
                <div style={{ display: 'flex', gap: '10px', marginBottom: '16px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#27ae60', background: '#e8f8ef', padding: '4px 12px', borderRadius: '20px' }}>
                    🟢 {open.length} Open
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563a8', background: '#e8f0fb', padding: '4px 12px', borderRadius: '20px' }}>
                    🔗 {matched.length} Matched (not started)
                  </span>
                </div>
              );
            })()}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {jobs.map(job => {
              const isMatched = !!job.provider;
              return (
              <div
                key={job._id}
                style={{
                  background: '#fff', borderRadius: '14px',
                  border: isMatched ? '1px solid #c3d9f7' : '1px solid #e8ecf0',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                  overflow: 'hidden',
                  opacity: isMatched ? 0.88 : 1,
                }}
              >
                {/* Matched banner */}
                {isMatched && (
                  <div style={{ background: '#e8f0fb', padding: '6px 20px', borderBottom: '1px solid #c3d9f7', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '700', color: '#2563a8' }}>🔗 Matched</span>
                    <span style={{ fontSize: '12px', color: '#4a5568' }}>
                      Assigned to <strong>{job.provider.firstName} {job.provider.lastName}</strong> — not yet started
                    </span>
                  </div>
                )}

                <div style={{ padding: '18px 20px' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '10px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: '#f0f4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                      {catIcon(job.category)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <h3 style={{ fontSize: '15px', fontWeight: '700', color: '#1a2e44', margin: '0 0 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {job.title}
                      </h3>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        <CategoryBadge category={job.category} />
                        <UrgencyBadge  urgency={job.urgency} />
                      </div>
                    </div>
                  </div>

                  {/* Description preview */}
                  <p style={{ fontSize: '13px', color: '#4a5568', margin: '0 0 10px', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {job.description}
                  </p>

                  {/* Meta */}
                  <div style={{ display: 'flex', gap: '14px', fontSize: '12px', color: '#8a9bb0', flexWrap: 'wrap', marginBottom: '14px' }}>
                    <span>📍 {job.location?.city}{job.location?.postcode ? `, ${job.location.postcode}` : ''}</span>
                    <span>🔧 {job.serviceType}</span>
                    <span>🗓 {formatDate(job.createdAt)}</span>
                    <span>👤 {job.customer?.firstName} {job.customer?.lastName}</span>
                  </div>

                  {/* ── Action buttons ── */}
                  <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #f0f4f8', paddingTop: '14px' }}>
                    {/* View Details — always shown */}
                    <button
                      onClick={() => setViewJob(job)}
                      style={{
                        flex: 1, padding: '10px 0',
                        background: '#f0f4f8', color: '#1a3c5e',
                        border: '1.5px solid #dde3eb', borderRadius: '8px',
                        fontSize: '13px', fontWeight: '700', cursor: 'pointer',
                        fontFamily: "'Outfit', sans-serif",
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                      }}
                    >
                      👁 View Details
                    </button>

                    {/* Accept — only for unassigned jobs */}
                    {!isMatched ? (
                      <button
                        onClick={() => handleAccept(job._id)}
                        disabled={accepting}
                        style={{
                          flex: 1, padding: '10px 0',
                          background: accepting ? '#8a9bb0' : 'linear-gradient(135deg, #27ae60, #1e8449)',
                          color: '#fff', border: 'none', borderRadius: '8px',
                          fontSize: '13px', fontWeight: '700',
                          cursor: accepting ? 'not-allowed' : 'pointer',
                          fontFamily: "'Outfit', sans-serif",
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                          boxShadow: accepting ? 'none' : '0 3px 10px rgba(39,174,96,0.25)',
                        }}
                      >
                        ✓ Accept Job
                      </button>
                    ) : (
                      <div style={{
                        flex: 1, padding: '10px 0',
                        background: '#f0f4f8', color: '#8a9bb0',
                        border: '1.5px solid #dde3eb', borderRadius: '8px',
                        fontSize: '13px', fontWeight: '600',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                        fontFamily: "'Outfit', sans-serif",
                      }}>
                        🔗 Already Matched
                      </div>
                    )}
                  </div>
                </div>
              </div>
              );
            })}
          </div>
          </>
        )}
      </div>

      {/* ── Job detail modal ── */}
      <JobModal
        job={viewJob}
        onClose={() => setViewJob(null)}
        onAccept={handleAccept}
        accepting={accepting}
      />

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }
      `}</style>
    </div>
  );
};

export default AvailableJobsPage;
