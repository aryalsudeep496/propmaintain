import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { requestsAPI, CATEGORIES } from '../../utils/requestsAPI';
import AppNavbar from '../../components/AppNavbar';

const NAV_LINKS = [
  { to: '/dashboard',            label: 'Home',         icon: '🏠' },
  { to: '/customer/request/new', label: 'New Request',  icon: '➕' },
  { to: '/customer/requests',    label: 'My Requests',  icon: '📋' },
];

// ─── Step indicator ────────────────────────────────────────────────────────────
const StepBar = ({ current }) => {
  const steps = ['Service Details', 'Location', 'Review & Submit'];
  return (
    <div style={{ display: 'flex', gap: '8px', marginBottom: '28px' }}>
      {steps.map((label, i) => {
        const num   = i + 1;
        const done  = current > num;
        const active = current === num;
        return (
          <div key={label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{
              height:       '4px',
              borderRadius: '2px',
              background:   done || active ? '#C17B2A' : '#e8ecf0',
              transition:   'background 0.3s',
            }} />
            <span style={{
              fontSize:   '11px',
              fontWeight: active ? '700' : '500',
              color:      active ? '#C17B2A' : done ? '#27ae60' : '#8a9bb0',
              fontFamily: "'Outfit', sans-serif",
            }}>
              {done ? '✓ ' : `${num}. `}{label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

// ─── Field wrapper ─────────────────────────────────────────────────────────────
const Field = ({ label, required, error, hint, children }) => (
  <div style={{ marginBottom: '16px' }}>
    {label && (
      <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', color: '#1a2e44', marginBottom: '6px', fontFamily: "'Outfit', sans-serif" }}>
        {label} {required && <span style={{ color: '#e74c3c' }}>*</span>}
      </label>
    )}
    {children}
    {error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#e74c3c', fontFamily: "'Outfit', sans-serif" }}>⚠ {error}</p>}
    {hint && !error && <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8a9bb0', fontFamily: "'Outfit', sans-serif" }}>{hint}</p>}
  </div>
);

const inputStyle = (hasError = false) => ({
  width:        '100%',
  padding:      '11px 14px',
  border:       `1.5px solid ${hasError ? '#e74c3c' : '#dde3eb'}`,
  borderRadius: '8px',
  fontSize:     '14px',
  fontFamily:   "'Outfit', sans-serif",
  color:        '#1a2e44',
  background:   hasError ? '#fff8f8' : '#fff',
  outline:      'none',
  boxSizing:    'border-box',
  transition:   'border-color 0.2s',
});

// ─── Main component ────────────────────────────────────────────────────────────
const NewRequestPage = () => {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState('');
  const [errors, setErrors]       = useState({});

  const [form, setForm] = useState({
    category:      '',
    serviceType:   '',
    title:         '',
    description:   '',
    urgency:       'medium',
    address:       '',
    city:          '',
    postcode:      '',
    preferredDate: '',
  });

  const set = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  // ── Validation per step ──────────────────────────────────────────────────────
  const validateStep1 = () => {
    const e = {};
    if (!form.category)    e.category    = 'Please select a category';
    if (!form.serviceType) e.serviceType = 'Please select a service type';
    if (!form.title || form.title.length < 5)
      e.title = 'Title must be at least 5 characters';
    if (!form.description || form.description.length < 20)
      e.description = 'Description must be at least 20 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e = {};
    if (!form.address)  e.address  = 'Address is required';
    if (!form.city)     e.city     = 'City is required';
    if (!form.postcode) e.postcode = 'Postcode is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const nextStep = () => {
    if (step === 1 && !validateStep1()) return;
    if (step === 2 && !validateStep2()) return;
    setStep(s => s + 1);
  };

  const prevStep = () => setStep(s => s - 1);

  // ── Submit ───────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setServerError('');
    setSubmitting(true);
    try {
      const payload = {
        category:      form.category,
        serviceType:   form.serviceType,
        title:         form.title,
        description:   form.description,
        urgency:       form.urgency,
        location: {
          address:  form.address,
          city:     form.city,
          postcode: form.postcode,
        },
        preferredDate: form.preferredDate || undefined,
      };

      const res = await requestsAPI.create(payload);
      navigate(`/customer/requests/${res.data.data._id}`, {
        state: { successMsg: res.data.message },
      });
    } catch (err) {
      setServerError(err.response?.data?.message || 'Failed to submit request. Please try again.');
      setSubmitting(false);
    }
  };

  const catKeys = Object.keys(CATEGORIES);
  const serviceTypes = form.category ? CATEGORIES[form.category]?.types || [] : [];

  return (
    <div style={{ minHeight: '100vh', background: '#f0f4f8', fontFamily: "'Outfit', sans-serif" }}>

      {/* ── Navbar ── */}
      <AppNavbar links={NAV_LINKS} />

      {/* ── Page body ── */}
      <div style={{ maxWidth: '620px', margin: '32px auto', padding: '0 20px' }}>

        <div style={{ marginBottom: '24px' }}>
          <h1 style={{ fontSize: '22px', fontWeight: '800', color: '#0d2137', margin: '0 0 4px' }}>
            New Service Request
          </h1>
          <p style={{ fontSize: '14px', color: '#6b7c93', margin: 0 }}>
            Fill in the details and we'll match you with the best available provider.
          </p>
        </div>

        <StepBar current={step} />

        <div style={{ background: '#fff', borderRadius: '14px', padding: '28px', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e8ecf0' }}>

          {/* ════════════════════════════════
              STEP 1 — Service Details
          ════════════════════════════════ */}
          {step === 1 && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a2e44', margin: '0 0 20px' }}>What service do you need?</h2>

              {/* Category cards */}
              <Field label="Category" required error={errors.category}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '10px' }}>
                  {catKeys.map(key => {
                    const cat    = CATEGORIES[key];
                    const active = form.category === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => { set('category', key); set('serviceType', ''); }}
                        style={{
                          display:       'flex',
                          flexDirection: 'column',
                          alignItems:    'center',
                          gap:           '6px',
                          padding:       '14px 10px',
                          border:        `2px solid ${active ? cat.color : '#dde3eb'}`,
                          borderRadius:  '10px',
                          background:    active ? `${cat.color}12` : '#fff',
                          cursor:        'pointer',
                          transition:    'all 0.2s',
                          fontFamily:    "'Outfit', sans-serif",
                        }}
                      >
                        <span style={{ fontSize: '24px' }}>{cat.icon}</span>
                        <span style={{ fontSize: '11px', fontWeight: '700', color: active ? cat.color : '#4a5568', textAlign: 'center' }}>
                          {cat.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Field>

              {/* Service type */}
              {form.category && (
                <Field label="Service Type" required error={errors.serviceType}>
                  <select
                    value={form.serviceType}
                    onChange={e => set('serviceType', e.target.value)}
                    style={inputStyle(!!errors.serviceType)}
                  >
                    <option value="">Select a service type…</option>
                    {serviceTypes.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </Field>
              )}

              {/* Title */}
              <Field label="Request Title" required error={errors.title}
                hint={`${form.title.length}/150 — be specific so providers understand quickly`}>
                <input
                  type="text"
                  value={form.title}
                  onChange={e => set('title', e.target.value)}
                  placeholder="e.g. Leaking kitchen tap needs urgent fixing"
                  maxLength={150}
                  style={inputStyle(!!errors.title)}
                />
              </Field>

              {/* Description */}
              <Field label="Description" required error={errors.description}
                hint={`${form.description.length}/2000 — describe the problem in detail`}>
                <textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe the issue — when it started, how bad it is, what you've already tried…"
                  rows={4}
                  maxLength={2000}
                  style={{ ...inputStyle(!!errors.description), resize: 'vertical' }}
                />
              </Field>

              {/* Urgency */}
              <Field label="Urgency">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' }}>
                  {[
                    { value: 'low',       label: 'Low',       color: '#2e7d32' },
                    { value: 'medium',    label: 'Medium',    color: '#f57f17' },
                    { value: 'high',      label: 'High',      color: '#e65100' },
                    { value: 'emergency', label: 'Emergency', color: '#880e4f' },
                  ].map(({ value, label, color }) => {
                    const active = form.urgency === value;
                    return (
                      <button
                        key={value}
                        type="button"
                        onClick={() => set('urgency', value)}
                        style={{
                          padding:      '9px 4px',
                          border:       `2px solid ${active ? color : '#dde3eb'}`,
                          borderRadius: '8px',
                          background:   active ? `${color}12` : '#fff',
                          color:        active ? color : '#8a9bb0',
                          fontSize:     '12px',
                          fontWeight:   '700',
                          cursor:       'pointer',
                          fontFamily:   "'Outfit', sans-serif",
                          transition:   'all 0.2s',
                        }}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </Field>
            </div>
          )}

          {/* ════════════════════════════════
              STEP 2 — Location
          ════════════════════════════════ */}
          {step === 2 && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a2e44', margin: '0 0 20px' }}>Where is the service needed?</h2>

              <Field label="Street Address" required error={errors.address}>
                <input
                  type="text"
                  value={form.address}
                  onChange={e => set('address', e.target.value)}
                  placeholder="e.g. 42 High Street"
                  style={inputStyle(!!errors.address)}
                />
              </Field>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="City" required error={errors.city}>
                  <input
                    type="text"
                    value={form.city}
                    onChange={e => set('city', e.target.value)}
                    placeholder="e.g. Glasgow"
                    style={inputStyle(!!errors.city)}
                  />
                </Field>
                <Field label="Postcode" required error={errors.postcode}>
                  <input
                    type="text"
                    value={form.postcode}
                    onChange={e => set('postcode', e.target.value.toUpperCase())}
                    placeholder="e.g. G1 1AA"
                    style={inputStyle(!!errors.postcode)}
                  />
                </Field>
              </div>

              <Field label="Preferred Date" hint="Optional — leave blank to request as soon as possible">
                <input
                  type="date"
                  value={form.preferredDate}
                  onChange={e => set('preferredDate', e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  style={inputStyle(false)}
                />
              </Field>
            </div>
          )}

          {/* ════════════════════════════════
              STEP 3 — Review & Submit
          ════════════════════════════════ */}
          {step === 3 && (
            <div>
              <h2 style={{ fontSize: '16px', fontWeight: '700', color: '#1a2e44', margin: '0 0 20px' }}>Review your request</h2>

              {/* Summary card */}
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '18px', border: '1px solid #e8ecf0', marginBottom: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {[
                    ['Category',    CATEGORIES[form.category]?.icon + ' ' + CATEGORIES[form.category]?.label],
                    ['Service',     form.serviceType],
                    ['Title',       form.title],
                    ['Urgency',     form.urgency.charAt(0).toUpperCase() + form.urgency.slice(1)],
                    ['Address',     form.address],
                    ['City',        form.city],
                    ['Postcode',    form.postcode],
                    form.preferredDate && ['Preferred Date', new Date(form.preferredDate).toLocaleDateString()],
                  ].filter(Boolean).map(([k, v]) => (
                    <div key={k} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '12px', fontWeight: '700', color: '#8a9bb0', minWidth: '100px', textTransform: 'uppercase', letterSpacing: '0.4px', paddingTop: '1px' }}>{k}</span>
                      <span style={{ fontSize: '13px', color: '#1a2e44', fontWeight: '500', flex: 1 }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Description preview */}
              <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px', border: '1px solid #e8ecf0', marginBottom: '20px' }}>
                <span style={{ fontSize: '11px', fontWeight: '700', color: '#8a9bb0', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: '6px' }}>Description</span>
                <p style={{ fontSize: '13px', color: '#4a5568', lineHeight: 1.6, margin: 0 }}>{form.description}</p>
              </div>

              {/* Info box */}
              <div style={{ background: '#f0f6ff', border: '1px solid #bee3f8', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#2b6cb0', lineHeight: 1.5 }}>
                ℹ️ Once submitted, we will try to match you with an available provider immediately. If no provider is available, your request will be scheduled for the next available slot.
              </div>

              {serverError && (
                <div style={{ background: '#fff0f0', border: '1px solid #fcd0d0', borderRadius: '8px', padding: '12px 14px', marginBottom: '16px', fontSize: '13px', color: '#c0392b' }}>
                  ⚠ {serverError}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Navigation buttons ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', gap: '12px' }}>
          {step > 1 ? (
            <button
              type="button"
              onClick={prevStep}
              style={{ padding: '11px 24px', border: '1.5px solid #dde3eb', borderRadius: '8px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#4a5568', cursor: 'pointer', fontFamily: "'Outfit', sans-serif" }}
            >
              ← Back
            </button>
          ) : (
            <Link to="/customer/requests" style={{ padding: '11px 24px', border: '1.5px solid #dde3eb', borderRadius: '8px', background: '#fff', fontSize: '14px', fontWeight: '600', color: '#4a5568', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", textDecoration: 'none' }}>
              Cancel
            </Link>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={nextStep}
              style={{ padding: '11px 28px', border: 'none', borderRadius: '8px', background: '#C17B2A', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: '0 4px 12px rgba(193,123,42,0.3)' }}
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={submitting}
              style={{ padding: '11px 28px', border: 'none', borderRadius: '8px', background: submitting ? '#8a9bb0' : '#C17B2A', color: '#fff', fontSize: '14px', fontWeight: '700', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: "'Outfit', sans-serif", boxShadow: submitting ? 'none' : '0 4px 12px rgba(193,123,42,0.3)' }}
            >
              {submitting ? 'Submitting…' : '✅ Submit Request'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default NewRequestPage;
