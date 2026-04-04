import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { usersAPI } from '../../utils/requestsAPI';
import AppNavbar from '../../components/AppNavbar';

const NAV_LINKS = [
  { to: '/provider/dashboard', label: 'Home',      icon: '🏠' },
  { to: '/provider/requests',  label: 'My Jobs',   icon: '📋' },
  { to: '/provider/available', label: 'Available',  icon: '🔍' },
  { to: '/provider/profile',   label: 'Profile',   icon: '👤' },
];

const CATEGORY_OPTIONS = [
  { value: 'home_repair',   label: 'Home Repair',    icon: '🔧', desc: 'Plumbing, electrical, carpentry' },
  { value: 'home_upgrade',  label: 'Home Upgrade',   icon: '🏡', desc: 'Renovation, painting, flooring' },
  { value: 'tech_digital',  label: 'Tech & Digital', icon: '💻', desc: 'Device repair, network setup' },
];

const ProviderProfilePage = () => {
  const { user, updateUser } = useAuth();
  const navigate   = useNavigate();

  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [toggling,      setToggling]      = useState(false);
  const [serverError,   setServerError]   = useState('');
  const [successMsg,    setSuccessMsg]    = useState('');

  const [form, setForm] = useState({
    firstName:          '',
    lastName:           '',
    phone:              '',
    businessName:       '',
    bio:                '',
    serviceCategories:  [],
    skills:             [],
    availabilityRadius: 25,
    isAvailable:        true,
  });
  const [skillInput, setSkillInput] = useState('');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await usersAPI.getProfile();
        const u   = res.data.data;
        const pp  = u.providerProfile || {};
        setForm({
          firstName:          u.firstName          || '',
          lastName:           u.lastName           || '',
          phone:              u.phone              || '',
          businessName:       pp.businessName      || '',
          bio:                pp.bio               || '',
          serviceCategories:  pp.serviceCategories || [],
          skills:             pp.skills            || [],
          availabilityRadius: pp.availabilityRadius ?? 25,
          isAvailable:        pp.isAvailable       ?? true,
        });
      } catch (err) {
        setServerError('Failed to load profile.');
      } finally {
        setLoading(false);
        setSaving(false);
      }
    };
    fetchProfile();
  }, []);

  const toggleCategory = (val) => {
    setForm(f => ({
      ...f,
      serviceCategories: f.serviceCategories.includes(val)
        ? f.serviceCategories.filter(c => c !== val)
        : [...f.serviceCategories, val],
    }));
  };

  const addSkill = () => {
    const s = skillInput.trim();
    if (s && !form.skills.includes(s)) {
      setForm(f => ({ ...f, skills: [...f.skills, s] }));
    }
    setSkillInput('');
  };

  const removeSkill = (s) => {
    setForm(f => ({ ...f, skills: f.skills.filter(x => x !== s) }));
  };

  const handleSkillKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addSkill(); }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setServerError('');
    setSuccessMsg('');
    setSaving(true);
    try {
      const res = await usersAPI.updateProfile({
        firstName:          form.firstName,
        lastName:           form.lastName,
        phone:              form.phone || undefined,
        businessName:       form.businessName,
        serviceCategories:  form.serviceCategories,
        skills:             form.skills,
        bio:                form.bio,
        availabilityRadius: form.availabilityRadius,
      });
      if (updateUser) updateUser(res.data.data);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => navigate('/provider/dashboard'), 1500);
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAvailability = async () => {
    setToggling(true);
    setServerError('');
    try {
      const res = await usersAPI.toggleAvailability();
      setForm(f => ({ ...f, isAvailable: res.data.isAvailable }));
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to toggle availability.');
    } finally {
      setToggling(false);
    }
  };

  const isVerified = user?.providerProfile?.isVerified;

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>
        <AppNavbar links={NAV_LINKS} />
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 'calc(100vh - 60px)' }}>
          <div style={spinnerStyle} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Navbar ── */}
      <AppNavbar links={NAV_LINKS} />

      <div style={{ maxWidth: '720px', margin: '32px auto', padding: '0 20px' }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#0d2137', margin: '0 0 4px' }}>
            My Profile
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7c93', margin: 0 }}>
            Update your details, services, and availability.
          </p>
        </div>

        {/* ── Alerts ── */}
        {serverError && (
          <div style={{ background: '#f8d7da', border: '1px solid #f5c6cb', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', fontSize: '14px', color: '#721c24', fontWeight: '600' }}>
            ⚠️ {serverError}
          </div>
        )}
        {successMsg && (
          <div style={{ background: '#d4edda', border: '1px solid #c3e6cb', borderRadius: '10px', padding: '14px 18px', marginBottom: '18px', fontSize: '14px', color: '#155724', fontWeight: '600' }}>
            ✅ {successMsg}
          </div>
        )}

        {/* ── Verification badge ── */}
        <div style={cardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '13px', color: '#6b7c93', margin: '0 0 4px' }}>Verification Status</p>
              <span style={{
                display: 'inline-block', padding: '4px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: '700',
                background: isVerified ? '#d4edda' : '#fff3cd',
                color:      isVerified ? '#155724' : '#856404',
              }}>
                {isVerified ? '✅ Verified Provider' : '⏳ Pending Verification'}
              </span>
            </div>

            {/* Availability toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '13px', color: '#4a5568', fontWeight: '600' }}>Availability:</span>
              <button
                onClick={handleToggleAvailability}
                disabled={toggling}
                style={{
                  display: 'flex', alignItems: 'center', gap: '8px',
                  padding: '8px 18px', borderRadius: '24px', border: 'none', cursor: 'pointer',
                  fontFamily: "'Outfit', sans-serif", fontSize: '13px', fontWeight: '700',
                  background: form.isAvailable ? '#27ae60' : '#e74c3c',
                  color: '#fff', opacity: toggling ? 0.6 : 1, transition: 'background 0.25s',
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: 'rgba(255,255,255,0.8)', display: 'inline-block' }} />
                {toggling ? 'Updating…' : form.isAvailable ? 'Available' : 'Unavailable'}
              </button>
            </div>
          </div>
        </div>

        {/* ── Profile Form ── */}
        <form onSubmit={handleSave}>

          {/* Personal info */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Personal Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {[
                { label: 'First Name', key: 'firstName', placeholder: 'John' },
                { label: 'Last Name',  key: 'lastName',  placeholder: 'Smith' },
              ].map(({ label, key, placeholder }) => (
                <div key={key}>
                  <label style={labelStyle}>{label}</label>
                  <input
                    value={form[key]}
                    onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                    placeholder={placeholder}
                    style={inputStyle}
                  />
                </div>
              ))}
              <div>
                <label style={labelStyle}>Phone</label>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+44 7700 900000"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>Business Name</label>
                <input
                  value={form.businessName}
                  onChange={e => setForm(f => ({ ...f, businessName: e.target.value }))}
                  placeholder="Smith & Sons Maintenance"
                  style={inputStyle}
                />
              </div>
            </div>
            <div style={{ marginTop: '16px' }}>
              <label style={labelStyle}>Bio <span style={{ fontWeight: '400', color: '#8a9bb0' }}>({form.bio.length}/500)</span></label>
              <textarea
                value={form.bio}
                onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                maxLength={500}
                rows={4}
                placeholder="Tell customers about your experience, qualifications, and the services you specialise in…"
                style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
              />
            </div>
          </div>

          {/* Service categories */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Service Categories</h2>
            <p style={{ fontSize: '13px', color: '#6b7c93', margin: '0 0 16px' }}>
              Select the categories you offer. You will only receive jobs in your selected categories.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
              {CATEGORY_OPTIONS.map(({ value, label, icon, desc }) => {
                const active = form.serviceCategories.includes(value);
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleCategory(value)}
                    style={{
                      padding: '16px 12px', borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                      border: active ? '2px solid #C17B2A' : '2px solid #e8ecf0',
                      background: active ? '#fdf3e3' : '#f8fafc',
                      fontFamily: "'Outfit', sans-serif", transition: 'all 0.18s',
                    }}
                  >
                    <div style={{ fontSize: '24px', marginBottom: '6px' }}>{icon}</div>
                    <div style={{ fontSize: '13px', fontWeight: '700', color: '#1a2e44', marginBottom: '4px' }}>{label}</div>
                    <div style={{ fontSize: '11px', color: '#8a9bb0' }}>{desc}</div>
                    {active && <div style={{ marginTop: '8px', fontSize: '11px', fontWeight: '700', color: '#C17B2A' }}>✓ Selected</div>}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Skills */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Skills</h2>
            <p style={{ fontSize: '13px', color: '#6b7c93', margin: '0 0 12px' }}>
              Type a skill and press Enter to add it.
            </p>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
              <input
                value={skillInput}
                onChange={e => setSkillInput(e.target.value)}
                onKeyDown={handleSkillKeyDown}
                placeholder="e.g. Boiler repair, CCTV installation…"
                style={{ ...inputStyle, flex: 1, marginBottom: 0 }}
              />
              <button
                type="button"
                onClick={addSkill}
                style={{ padding: '10px 18px', background: '#1a3c5e', color: '#fff', border: 'none', borderRadius: '8px', fontFamily: "'Outfit', sans-serif", fontWeight: '700', cursor: 'pointer', fontSize: '13px', whiteSpace: 'nowrap' }}
              >
                Add
              </button>
            </div>
            {form.skills.length > 0 && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {form.skills.map(s => (
                  <span key={s} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '5px 12px', background: '#e8f4fd', borderRadius: '20px', fontSize: '13px', fontWeight: '600', color: '#1a3c5e' }}>
                    {s}
                    <button
                      type="button"
                      onClick={() => removeSkill(s)}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#8a9bb0', fontSize: '15px', lineHeight: 1, padding: '0 0 1px' }}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            {form.skills.length === 0 && (
              <p style={{ fontSize: '13px', color: '#8a9bb0', margin: 0 }}>No skills added yet.</p>
            )}
          </div>

          {/* Availability radius */}
          <div style={cardStyle}>
            <h2 style={sectionTitleStyle}>Service Radius</h2>
            <p style={{ fontSize: '13px', color: '#6b7c93', margin: '0 0 16px' }}>
              Set how far you are willing to travel for jobs.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <input
                type="range"
                min={1}
                max={100}
                value={form.availabilityRadius}
                onChange={e => setForm(f => ({ ...f, availabilityRadius: Number(e.target.value) }))}
                style={{ flex: 1, minWidth: '180px', accentColor: '#C17B2A', cursor: 'pointer' }}
              />
              <div style={{ textAlign: 'center', minWidth: '72px' }}>
                <span style={{ fontSize: '28px', fontWeight: '800', color: '#C17B2A' }}>{form.availabilityRadius}</span>
                <span style={{ fontSize: '14px', color: '#6b7c93', display: 'block' }}>km</span>
              </div>
            </div>
          </div>

          {/* Save button */}
          <button
            type="submit"
            disabled={saving}
            style={{
              width: '100%', padding: '14px', background: saving ? '#a0856b' : '#C17B2A',
              border: 'none', borderRadius: '8px', color: '#fff', fontSize: '16px', fontWeight: '700',
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif",
              boxShadow: '0 4px 14px rgba(193,123,42,0.3)', marginBottom: '32px',
              transition: 'background 0.2s',
            }}
          >
            {saving ? 'Saving…' : 'Save Profile'}
          </button>
        </form>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

const cardStyle = {
  background: '#fff', borderRadius: '12px', border: '1px solid #e8ecf0',
  boxShadow: '0 2px 8px rgba(0,0,0,0.05)', padding: '24px', marginBottom: '20px',
};
const sectionTitleStyle = {
  fontSize: '16px', fontWeight: '800', color: '#0d2137', margin: '0 0 16px',
};
const labelStyle = {
  display: 'block', fontSize: '12px', fontWeight: '700', color: '#4a5568',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px',
};
const inputStyle = {
  width: '100%', padding: '10px 14px', border: '1px solid #dde3eb', borderRadius: '8px',
  fontSize: '14px', color: '#1a2e44', background: '#fafbfc', fontFamily: "'Outfit', sans-serif",
  boxSizing: 'border-box',
};
const spinnerStyle = {
  width: '40px', height: '40px', border: '4px solid #e8ecf0',
  borderTopColor: '#C17B2A', borderRadius: '50%', animation: 'spin 0.7s linear infinite',
};

export default ProviderProfilePage;
