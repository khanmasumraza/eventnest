import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const DRAFT_KEY = 'eventnest_create_draft';

const STEPS = [
  { id: 1, label: 'Basics',  icon: '✦' },
  { id: 2, label: 'When & Where', icon: '✦' },
  { id: 3, label: 'Tickets', icon: '✦' },
  { id: 4, label: 'Details', icon: '✦' },
  { id: 5, label: 'Publish', icon: '✦' },
];

const CATEGORIES = [
  { id: 'Hackathon',   label: 'Hackathon',   icon: '💻' },
  { id: 'Fest',        label: 'Fest',        icon: '🎉' },
  { id: 'Workshop',    label: 'Workshop',    icon: '🛠️' },
  { id: 'Conference',  label: 'Conference',  icon: '🎤' },
  { id: 'Sports',      label: 'Sports',      icon: '⚽' },
  { id: 'Cultural',    label: 'Cultural',    icon: '🎭' },
  { id: 'Meetup',      label: 'Meetup',      icon: '👋' },
  { id: 'Music',       label: 'Music',       icon: '🎵' },
];

// Top Indian cities — no manual typing needed
const INDIAN_CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Hyderabad', 'Ahmedabad',
  'Chennai', 'Kolkata', 'Surat', 'Pune', 'Jaipur',
  'Lucknow', 'Kanpur', 'Nagpur', 'Indore', 'Thane',
  'Bhopal', 'Visakhapatnam', 'Pimpri-Chinchwad', 'Patna', 'Vadodara',
  'Ghaziabad', 'Ludhiana', 'Agra', 'Nashik', 'Faridabad',
  'Meerut', 'Rajkot', 'Kalyan-Dombivali', 'Vasai-Virar', 'Varanasi',
  'Srinagar', 'Aurangabad', 'Dhanbad', 'Amritsar', 'Navi Mumbai',
  'Allahabad', 'Ranchi', 'Howrah', 'Coimbatore', 'Jabalpur',
  'Gwalior', 'Vijayawada', 'Jodhpur', 'Madurai', 'Raipur',
  'Kota', 'Guwahati', 'Chandigarh', 'Solapur', 'Hubli-Dharwad',
  'Bareilly', 'Moradabad', 'Mysore', 'Tiruchirappalli', 'Tiruppur',
  'Dehradun', 'Noida', 'Gurugram', 'Kochi', 'Bhubaneswar',
];

/* ─────────────────────────────────────────────────────────
   STEP VALIDATION
───────────────────────────────────────────────────────── */
function validateStep(step, formData) {
  const errors = {};
  if (step === 1) {
    if (!formData.title?.trim()) errors.title = 'Event title is required';
    if (!formData.category)      errors.category = 'Select a category';
  }
  if (step === 2) {
    if (!formData.date)          errors.date = 'Event date is required';
    else {
      const d = new Date(formData.date);
      const today = new Date(); today.setHours(0,0,0,0);
      if (d < today) errors.date = 'Date must be in the future';
    }
    if (!formData.venue?.trim()) errors.venue = 'Venue name is required';
    if (!formData.city)          errors.city = 'City is required';
    if (formData.startTime && formData.endTime && formData.endTime <= formData.startTime)
      errors.endTime = 'End time must be after start time';
  }
  if (step === 3) {
    if (formData.paymentType === 'upi') {
      if (!formData.ticketPrice || formData.ticketPrice <= 0)
        errors.ticketPrice = 'Ticket price must be greater than ₹0';
      if (!formData.organizerUpiId?.includes('@'))
        errors.organizerUpiId = 'Enter a valid UPI ID (e.g. name@okaxis)';
      if (!formData.organizerName?.trim())
        errors.organizerName = 'Display name is required';
    }
  }
  // Step 4 is optional — no blocking
  return errors;
}

function hasStepErrors(step, formData) {
  return Object.keys(validateStep(step, formData)).length > 0;
}

/* ─────────────────────────────────────────────────────────
   DESIGN TOKENS
───────────────────────────────────────────────────────── */
const T = {
  bg:         '#07090f',
  surface:    '#0d1017',
  surfaceAlt: '#111520',
  border:     'rgba(255,255,255,0.07)',
  borderHov:  'rgba(255,255,255,0.14)',
  accent:     '#6366f1',
  accentLow:  'rgba(99,102,241,0.12)',
  accentGlow: 'rgba(99,102,241,0.25)',
  success:    '#22c55e',
  danger:     '#ef4444',
  dangerLow:  'rgba(239,68,68,0.1)',
  text:       '#e2e8f0',
  textMid:    '#94a3b8',
  textLow:    '#475569',
  radius:     '10px',
  radiusLg:   '14px',
};

const inputBase = {
  width: '100%', boxSizing: 'border-box',
  background: T.surface,
  border: `1px solid ${T.border}`,
  borderRadius: T.radius,
  padding: '11px 14px',
  color: T.text,
  fontSize: '14px',
  outline: 'none',
  transition: 'border-color 0.15s, box-shadow 0.15s',
  fontFamily: "'Plus Jakarta Sans', 'DM Sans', sans-serif",
};

const labelBase = {
  display: 'block',
  color: T.textMid,
  fontSize: '11.5px',
  fontWeight: 600,
  marginBottom: '7px',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

/* ─────────────────────────────────────────────────────────
   REUSABLE COMPONENTS
───────────────────────────────────────────────────────── */

/** Inline field error */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p style={{ color: '#f87171', fontSize: '12px', marginTop: '5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
      <span>⚠</span> {msg}
    </p>
  );
}

/** Text / textarea input wrapper with focus ring + error state */
function Field({ label, error, required, hint, children }) {
  return (
    <div>
      {label && (
        <label style={labelBase}>
          {label}{required && <span style={{ color: T.accent, marginLeft: '3px' }}>*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p style={{ color: T.textLow, fontSize: '12px', marginTop: '5px' }}>{hint}</p>}
      <FieldError msg={error} />
    </div>
  );
}

/** City autocomplete dropdown */
function CitySelect({ value, onChange, error }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const filtered = query.length > 0
    ? INDIAN_CITIES.filter(c => c.toLowerCase().startsWith(query.toLowerCase())).slice(0, 8)
    : INDIAN_CITIES.slice(0, 8);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (city) => {
    setQuery(city);
    onChange(city);
    setOpen(false);
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search city…"
        style={{
          ...inputBase,
          borderColor: error ? T.danger : (open ? T.accent : T.border),
          boxShadow: open ? `0 0 0 3px ${T.accentGlow}` : 'none',
        }}
      />
      {open && filtered.length > 0 && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 999,
          background: T.surfaceAlt,
          border: `1px solid ${T.borderHov}`,
          borderRadius: T.radius,
          overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}>
          {filtered.map(city => (
            <div
              key={city}
              onMouseDown={() => select(city)}
              style={{
                padding: '10px 14px',
                color: city === value ? T.accent : T.text,
                fontSize: '14px',
                cursor: 'pointer',
                background: city === value ? T.accentLow : 'transparent',
                transition: 'background 0.1s',
                borderBottom: `1px solid ${T.border}`,
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.04)'}
              onMouseLeave={e => e.currentTarget.style.background = city === value ? T.accentLow : 'transparent'}
            >
              📍 {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Numeric stepper */
function StepperInput({ label, value, onChange, min = 0, max = 99999, step = 1, prefix = '', suffix = '', hint, error }) {
  const [focused, setFocused] = useState(false);
  const nudge = (delta) => onChange(Math.min(Math.max((parseInt(value) || 0) + delta, min), max));
  const btnStyle = {
    width: '44px', height: '44px', flexShrink: 0,
    background: 'rgba(255,255,255,0.03)',
    border: 'none',
    color: T.textMid, fontSize: '18px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'background 0.1s',
  };
  return (
    <Field label={label} error={error} hint={hint}>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: T.surface,
        border: `1px solid ${focused ? T.accent : error ? T.danger : T.border}`,
        borderRadius: T.radius, overflow: 'hidden',
        boxShadow: focused ? `0 0 0 3px ${T.accentGlow}` : 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        <button type="button" onClick={() => nudge(-step)} style={{ ...btnStyle, borderRight: `1px solid ${T.border}` }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >−</button>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '3px' }}>
          {prefix && <span style={{ color: T.textLow, fontSize: '14px' }}>{prefix}</span>}
          <input
            type="number" value={value}
            onChange={e => onChange(Math.min(Math.max(parseInt(e.target.value) || 0, min), max))}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: T.text, fontSize: '18px', fontWeight: 700,
              textAlign: 'center', width: '80px', fontFamily: 'inherit',
              MozAppearance: 'textfield',
            }}
          />
          {suffix && <span style={{ color: T.textLow, fontSize: '13px' }}>{suffix}</span>}
        </div>
        <button type="button" onClick={() => nudge(step)} style={{ ...btnStyle, borderLeft: `1px solid ${T.border}` }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >+</button>
      </div>
    </Field>
  );
}

/** UPI ID input */
function UpiInput({ value, onChange, error }) {
  const [focused, setFocused] = useState(false);
  const isValid = value?.includes('@') && value.split('@')[1]?.length > 0;
  const handles = ['@okaxis', '@okicici', '@oksbi', '@ybl', '@ibl', '@axl'];

  return (
    <Field label="UPI ID" required error={error} hint="Attendees will pay to this UPI ID after registering">
      <div style={{
        display: 'flex', alignItems: 'center',
        background: T.surface,
        border: `1px solid ${error ? T.danger : focused ? T.accent : isValid ? 'rgba(34,197,94,0.4)' : T.border}`,
        borderRadius: T.radius, overflow: 'hidden',
        boxShadow: focused ? `0 0 0 3px ${T.accentGlow}` : 'none',
        transition: 'all 0.15s',
      }}>
        <div style={{
          padding: '0 12px', height: '44px', display: 'flex', alignItems: 'center', gap: '6px',
          borderRight: `1px solid ${T.border}`, flexShrink: 0,
        }}>
          <span style={{ fontSize: '15px' }}>💳</span>
          <span style={{ color: T.textLow, fontSize: '12px', fontWeight: 600 }}>UPI</span>
        </div>
        <input
          type="text" value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          placeholder="yourname@okaxis"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: T.text, fontSize: '14px', padding: '11px 14px', fontFamily: 'inherit' }}
        />
        {isValid && <div style={{ padding: '0 12px', color: T.success, fontSize: '15px' }}>✓</div>}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', marginTop: '8px', alignItems: 'center' }}>
        <span style={{ color: T.textLow, fontSize: '11px' }}>Quick:</span>
        {handles.map(h => (
          <button key={h} type="button"
            onClick={() => onChange((value.split('@')[0] || 'yourname') + h)}
            style={{
              padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
              background: 'rgba(255,255,255,0.04)', border: `1px solid ${T.border}`,
              color: T.textLow, cursor: 'pointer', transition: 'all 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = T.accentLow; e.currentTarget.style.color = '#818cf8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = T.textLow; }}
          >{h}</button>
        ))}
      </div>
    </Field>
  );
}

/** Cover image upload — used in Step 1 */
function CoverUpload({ preview, onChange, onRemove }) {
  return (
    <div>
      <label style={labelBase}>Event banner</label>
      <div
        onClick={() => document.getElementById('cover-upload').click()}
        style={{
          border: `1.5px dashed ${preview ? T.accent : T.border}`,
          borderRadius: T.radiusLg,
          overflow: 'hidden',
          cursor: 'pointer',
          background: preview ? 'transparent' : T.surface,
          transition: 'border-color 0.2s',
          position: 'relative',
        }}
        onMouseEnter={e => !preview && (e.currentTarget.style.borderColor = T.borderHov)}
        onMouseLeave={e => !preview && (e.currentTarget.style.borderColor = T.border)}
      >
        {preview ? (
          <>
            <img src={preview} alt="Banner preview"
              style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }} />
            <div style={{
              position: 'absolute', inset: 0,
              background: 'rgba(0,0,0,0)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0)'}
            >
              <span style={{
                color: 'white', fontSize: '13px', fontWeight: 600,
                background: 'rgba(0,0,0,0.6)', padding: '6px 14px', borderRadius: '8px',
                opacity: 0, transition: 'opacity 0.2s',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = 1}
              >Change image</span>
            </div>
          </>
        ) : (
          <div style={{ height: '140px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: T.accentLow, display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '20px',
            }}>🖼️</div>
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: T.textMid, fontSize: '14px', margin: '0 0 3px', fontWeight: 500 }}>Upload event banner</p>
              <p style={{ color: T.textLow, fontSize: '12px', margin: 0 }}>1200 × 628px recommended · JPG, PNG</p>
            </div>
          </div>
        )}
      </div>
      <input id="cover-upload" type="file" accept="image/*" onChange={onChange} style={{ display: 'none' }} />
      {preview && (
        <button type="button" onClick={onRemove}
          style={{ background: 'none', border: 'none', color: T.textLow, fontSize: '12px', cursor: 'pointer', marginTop: '6px', padding: 0 }}>
          ✕ Remove image
        </button>
      )}
      <p style={{ color: T.textLow, fontSize: '12px', marginTop: '5px' }}>
        This is the first thing attendees see on the event card — make it count.
      </p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
function OrganizerCreateEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  // Guard: only verified organizers
  useEffect(() => {
    if (user && user.role !== 'organizer') {
      navigate('/organiser/register', { replace: true });
    }
  }, [user, navigate]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [stepErrors, setStepErrors] = useState({});  // { fieldName: 'error msg' }
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [draftToast, setDraftToast] = useState('');   // '' | 'restored' | 'saved'

  const [formData, setFormData] = useState({
    title: '', category: '', description: '',
    venue: '', city: '', date: '', startTime: '', endTime: '',
    paymentType: 'free',
    organizerUpiId: '', organizerName: '',
    ticketPrice: 0, capacity: 100,
    paymentInstructions: '',
    agenda: '', speakers: '',
    status: 'draft',
  });

  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [upiQrFile, setUpiQrFile] = useState(null);

  /* ── Draft restore on mount ── */
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (raw) {
      try {
        const saved = JSON.parse(raw);
        setFormData(prev => ({ ...prev, ...saved }));
        showToast('Draft restored — pick up where you left off');
      } catch { /* ignore */ }
    }
  }, []);

  /* ── Duplicate event prefill ── */
  useEffect(() => {
    if (location.state?.duplicateEvent) {
      const ev = location.state.duplicateEvent;
      setFormData(prev => ({
        ...prev,
        title: `${ev.title} (copy)` || '',
        category: ev.category || '',
        description: ev.description || '',
        venue: ev.venue || '',
        city: ev.city || '',
        date: ev.date ? new Date(ev.date).toISOString().split('T')[0] : '',
        ticketPrice: ev.price || 0,
        capacity: ev.capacity || 100,
      }));
    }
  }, [location.state]);

  /* ── Auto-save to localStorage (debounced 800ms) ── */
  const draftTimer = useRef(null);
  useEffect(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [formData]);

  const showToast = (msg) => {
    setDraftToast(msg);
    setTimeout(() => setDraftToast(''), 3500);
  };

  /* ── Field helpers ── */
  const set = (field, val) => setFormData(prev => ({ ...prev, [field]: val }));
  const handleChange = (e) => {
    const { name, value, type } = e.target;
    set(name, type === 'number' ? (parseInt(value) || 0) : value);
  };

  const handleCoverChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCoverFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  /* ── Step validation ── */
  const tryAdvance = () => {
    const errors = validateStep(currentStep, formData);
    if (Object.keys(errors).length > 0) {
      setStepErrors(errors);
      return;
    }
    setStepErrors({});
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(p => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpTo = (stepId) => {
    if (stepId === currentStep) return;
    if (stepId < currentStep) {
      setStepErrors({});
      setCurrentStep(stepId);
      return;
    }
    // Trying to jump forward — validate all steps up to target
    for (let s = currentStep; s < stepId; s++) {
      const errors = validateStep(s, formData);
      if (Object.keys(errors).length > 0) {
        setStepErrors(errors);
        setCurrentStep(s);
        return;
      }
    }
    setCurrentStep(stepId);
  };

  /* ── Save & exit draft ── */
  const saveAndExit = async () => {
    setLoading(true);
    try {
      const fd = buildFormData('draft');
      await api.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      localStorage.removeItem(DRAFT_KEY);
      navigate('/organiser/events');
    } catch {
      showToast('Could not save draft — check connection');
    } finally {
      setLoading(false);
    }
  };

  /* ── Submit ── */
  const buildFormData = (statusOverride) => {
    const fd = new FormData();
    fd.append('title',       formData.title);
    fd.append('category',    formData.category);
    fd.append('description', formData.description);
    if (formData.venue)     fd.append('venue',     formData.venue);
    if (formData.city)      fd.append('city',      formData.city);
    if (formData.date)      fd.append('date',      formData.date);
    if (formData.startTime) fd.append('startTime', formData.startTime);
    if (formData.endTime)   fd.append('endTime',   formData.endTime);
    fd.append('capacity',    String(formData.capacity || 0));
    fd.append('price',       String(formData.paymentType === 'upi' ? formData.ticketPrice : 0));
    fd.append('paymentType', formData.paymentType);
    if (formData.paymentType === 'upi') {
      fd.append('organizerUpiId',  formData.organizerUpiId);
      fd.append('organizerName',   formData.organizerName || user?.name || '');
      fd.append('ticketPrice',     String(formData.ticketPrice));
      if (formData.paymentInstructions)
        fd.append('paymentInstructions', formData.paymentInstructions);
      if (upiQrFile) fd.append('organizerQrImage', upiQrFile);
    }
    if (formData.agenda)   fd.append('agenda',   formData.agenda);
    if (formData.speakers) fd.append('speakers', formData.speakers);
    if (coverFile)         fd.append('coverImage', coverFile);
    fd.append('status', statusOverride || formData.status);
    return fd;
  };

  const handleSubmit = async (statusOverride) => {
    setSubmitError('');
    setLoading(true);
    try {
      const res = await api.post('/events', buildFormData(statusOverride), {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.data._id) {
        localStorage.removeItem(DRAFT_KEY);
        navigate('/organiser/events');
      }
    } catch (err) {
      setSubmitError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────
     STEP CONTENT
  ───────────────────────────────────────────────────── */
  const E = stepErrors; // shorthand

  const renderStep = () => {
    switch (currentStep) {

      /* ── Step 1: Basics ── */
      case 1: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {/* Banner first — SaaS feel */}
          <CoverUpload
            preview={coverPreview}
            onChange={handleCoverChange}
            onRemove={() => { setCoverFile(null); setCoverPreview(null); }}
          />

          <Field label="Event title" required error={E.title}>
            <input
              type="text" name="title" value={formData.title} onChange={handleChange}
              onBlur={() => {
                if (!formData.title?.trim()) setStepErrors(p => ({ ...p, title: 'Event title is required' }));
                else setStepErrors(p => { const n = { ...p }; delete n.title; return n; });
              }}
              placeholder="Give your event a name that sells itself"
              style={{
                ...inputBase,
                borderColor: E.title ? T.danger : T.border,
                boxShadow: 'none',
              }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
              onBlurCapture={e => { e.target.style.borderColor = E.title ? T.danger : T.border; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          <Field label="Category" required error={E.category}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => {
                    set('category', cat.id);
                    setStepErrors(p => { const n = { ...p }; delete n.category; return n; });
                  }}
                  style={{
                    padding: '12px 6px', borderRadius: '10px', cursor: 'pointer',
                    border: formData.category === cat.id
                      ? `1.5px solid ${T.accent}`
                      : `1px solid ${E.category ? 'rgba(239,68,68,0.3)' : T.border}`,
                    background: formData.category === cat.id ? T.accentLow : T.surface,
                    color: formData.category === cat.id ? '#818cf8' : T.textMid,
                    fontSize: '11.5px', fontWeight: formData.category === cat.id ? 600 : 400,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </Field>

          <Field label="Description" hint="Help attendees understand what your event is about">
            <textarea
              name="description" value={formData.description} onChange={handleChange}
              placeholder="What will attendees experience? What should they bring? What's the vibe?"
              rows={4}
              style={{ ...inputBase, resize: 'vertical', lineHeight: '1.6' }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
            />
          </Field>
        </div>
      );

      /* ── Step 2: Date & Venue ── */
      case 2: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <Field label="Event date" required error={E.date}>
            <input type="date" name="date" value={formData.date} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              onBlur={() => {
                const errors = validateStep(2, formData);
                if (errors.date) setStepErrors(p => ({ ...p, date: errors.date }));
                else setStepErrors(p => { const n = { ...p }; delete n.date; return n; });
              }}
              style={{
                ...inputBase, colorScheme: 'dark',
                borderColor: E.date ? T.danger : T.border,
              }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
              onBlurCapture={e => { e.target.style.borderColor = E.date ? T.danger : T.border; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Start time">
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                style={{ ...inputBase, colorScheme: 'dark' }}
                onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
                onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
              />
            </Field>
            <Field label="End time" error={E.endTime}>
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange}
                style={{ ...inputBase, colorScheme: 'dark', borderColor: E.endTime ? T.danger : T.border }}
                onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
                onBlur={e => {
                  e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none';
                  const errors = validateStep(2, formData);
                  if (errors.endTime) setStepErrors(p => ({ ...p, endTime: errors.endTime }));
                  else setStepErrors(p => { const n = { ...p }; delete n.endTime; return n; });
                }}
              />
            </Field>
          </div>

          <Field label="Venue name" required error={E.venue}
            hint="Hall name, building, or full address">
            <input type="text" name="venue" value={formData.venue} onChange={handleChange}
              placeholder="e.g. Nehru Centre Auditorium, Worli"
              onBlur={() => {
                if (!formData.venue?.trim()) setStepErrors(p => ({ ...p, venue: 'Venue name is required' }));
                else setStepErrors(p => { const n = { ...p }; delete n.venue; return n; });
              }}
              style={{ ...inputBase, borderColor: E.venue ? T.danger : T.border }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
              onBlurCapture={e => { e.target.style.borderColor = E.venue ? T.danger : T.border; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          <Field label="City" required error={E.city}>
            <CitySelect
              value={formData.city}
              onChange={v => {
                set('city', v);
                if (v) setStepErrors(p => { const n = { ...p }; delete n.city; return n; });
              }}
              error={E.city}
            />
          </Field>
        </div>
      );

      /* ── Step 3: Tickets ── */
      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div>
            <label style={labelBase}>Ticket type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { val: 'free', label: 'Free', icon: '🎟️', desc: 'Open registration, no payment' },
                { val: 'upi',  label: 'Paid',  icon: '💳', desc: 'Collect fees via UPI' },
              ].map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => set('paymentType', opt.val)}
                  style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    border: formData.paymentType === opt.val ? `1.5px solid ${T.accent}` : `1px solid ${T.border}`,
                    background: formData.paymentType === opt.val ? T.accentLow : T.surface,
                    display: 'flex', flexDirection: 'column', gap: '4px',
                    transition: 'all 0.15s', fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{opt.icon}</span>
                  <span style={{ color: formData.paymentType === opt.val ? T.text : T.textMid, fontSize: '14px', fontWeight: 600 }}>
                    {opt.label}
                  </span>
                  <span style={{ color: T.textLow, fontSize: '12px' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <StepperInput
            label="Capacity"
            value={formData.capacity}
            onChange={v => set('capacity', v)}
            min={1} max={100000} step={10}
            suffix=" seats"
            hint="Maximum number of attendees"
          />

          {formData.paymentType === 'upi' && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '20px',
              padding: '20px', borderRadius: T.radiusLg,
              background: 'rgba(99,102,241,0.04)',
              border: `1px solid ${T.accentGlow}`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '15px' }}>💳</span>
                <span style={{ color: T.text, fontSize: '14px', fontWeight: 600 }}>UPI payment setup</span>
              </div>

              <StepperInput
                label="Ticket price"
                required
                value={formData.ticketPrice}
                onChange={v => set('ticketPrice', v)}
                min={1} max={100000} step={50}
                prefix="₹"
                hint="Amount each attendee pays"
                error={E.ticketPrice}
              />

              <UpiInput
                value={formData.organizerUpiId}
                onChange={v => {
                  set('organizerUpiId', v);
                  if (v?.includes('@') && v.split('@')[1]?.length > 0)
                    setStepErrors(p => { const n = { ...p }; delete n.organizerUpiId; return n; });
                }}
                error={E.organizerUpiId}
              />

              <Field label="Display name on UPI" required error={E.organizerName}
                hint="Name attendees see when paying">
                <input type="text" name="organizerName"
                  value={formData.organizerName} onChange={handleChange}
                  placeholder="e.g. Tech Fest 2025"
                  onBlur={() => {
                    if (!formData.organizerName?.trim())
                      setStepErrors(p => ({ ...p, organizerName: 'Display name is required' }));
                    else setStepErrors(p => { const n = { ...p }; delete n.organizerName; return n; });
                  }}
                  style={{ ...inputBase, borderColor: E.organizerName ? T.danger : T.border }}
                  onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
                  onBlurCapture={e => { e.target.style.borderColor = E.organizerName ? T.danger : T.border; e.target.style.boxShadow = 'none'; }}
                />
              </Field>

              <div>
                <label style={labelBase}>UPI QR code <span style={{ color: T.textLow, textTransform: 'none', fontWeight: 400, letterSpacing: 0 }}>(optional)</span></label>
                <div style={{
                  border: `1.5px dashed ${T.accentGlow}`, borderRadius: T.radius,
                  padding: '20px', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(99,102,241,0.02)',
                }} onClick={() => document.getElementById('qr-upload').click()}>
                  <p style={{ color: T.textMid, fontSize: '13px', margin: '0 0 4px' }}>
                    {upiQrFile ? `✅ ${upiQrFile.name}` : 'Click to upload QR image'}
                  </p>
                  <p style={{ color: T.textLow, fontSize: '11px', margin: 0 }}>Attendees scan this to pay instantly</p>
                </div>
                <input id="qr-upload" type="file" accept="image/*"
                  onChange={e => setUpiQrFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>

              <Field label="Payment instructions" hint="e.g. Pay and send screenshot to WhatsApp +91…">
                <textarea
                  name="paymentInstructions" value={formData.paymentInstructions} onChange={handleChange}
                  placeholder="Any instructions for attendees after paying"
                  rows={3}
                  style={{ ...inputBase, resize: 'vertical' }}
                  onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
                  onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
                />
              </Field>

              {/* Live preview */}
              <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radius, padding: '14px' }}>
                <p style={{ color: T.textLow, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 10px' }}>
                  Attendee payment card preview
                </p>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: T.accentLow, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>💳</div>
                  <div>
                    <p style={{ color: T.text, fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>Pay ₹{formData.ticketPrice || '0'}</p>
                    <p style={{ color: T.textMid, fontSize: '12px', margin: 0 }}>
                      {formData.organizerUpiId || 'yourname@okaxis'}
                      {formData.organizerName ? ` · ${formData.organizerName}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );

      /* ── Step 4: Details (optional) ── */
      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: '10px',
            padding: '12px 14px',
            background: T.accentLow,
            border: `1px solid ${T.accentGlow}`,
            borderRadius: T.radius,
          }}>
            <span style={{ fontSize: '16px' }}>ℹ️</span>
            <p style={{ color: '#818cf8', fontSize: '13px', margin: 0 }}>
              Everything on this step is optional — you can fill it in after publishing too.
            </p>
          </div>

          <Field label="Agenda" hint="A clear schedule helps attendees plan their day">
            <textarea
              name="agenda" value={formData.agenda} onChange={handleChange}
              placeholder={'9:00 AM — Registration\n10:00 AM — Opening keynote\n11:30 AM — Workshop sessions\n1:00 PM — Lunch break'}
              rows={6}
              style={{ ...inputBase, resize: 'vertical', lineHeight: '1.6' }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
            />
          </Field>

          <Field label="Speakers / guests">
            <textarea
              name="speakers" value={formData.speakers} onChange={handleChange}
              placeholder={'Rahul Shah — CEO, TechCorp\nPriya Mehta — AI Researcher, IIT Bombay'}
              rows={4}
              style={{ ...inputBase, resize: 'vertical', lineHeight: '1.6' }}
              onFocus={e => { e.target.style.borderColor = T.accent; e.target.style.boxShadow = `0 0 0 3px ${T.accentGlow}`; }}
              onBlur={e => { e.target.style.borderColor = T.border; e.target.style.boxShadow = 'none'; }}
            />
          </Field>
        </div>
      );

      /* ── Step 5: Review & Publish ── */
      case 5: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Steps health check */}
          {[1,2,3].map(s => {
            const errs = validateStep(s, formData);
            if (Object.keys(errs).length === 0) return null;
            return (
              <div key={s} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '12px 14px',
                background: 'rgba(239,68,68,0.07)',
                border: '1px solid rgba(239,68,68,0.2)',
                borderRadius: T.radius,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: T.danger }}>⚠</span>
                  <span style={{ color: '#f87171', fontSize: '13px' }}>
                    Step {s} ({STEPS[s-1].label}) — {Object.keys(errs).length} issue{Object.keys(errs).length > 1 ? 's' : ''} to fix
                  </span>
                </div>
                <button type="button" onClick={() => { setStepErrors(errs); setCurrentStep(s); }}
                  style={{ background: 'none', border: 'none', color: '#f87171', fontSize: '12px', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  Fix →
                </button>
              </div>
            );
          })}

          {/* Summary card */}
          <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: T.radiusLg, overflow: 'hidden' }}>
            {coverPreview && (
              <img src={coverPreview} alt="Banner"
                style={{ width: '100%', height: '160px', objectFit: 'cover', display: 'block' }} />
            )}
            <div style={{ padding: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', marginBottom: '16px' }}>
                <div>
                  <h3 style={{ color: T.text, fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                    {formData.title || <span style={{ color: T.textLow, fontStyle: 'italic' }}>Untitled event</span>}
                  </h3>
                  <p style={{ color: T.textMid, fontSize: '13px', margin: 0 }}>
                    {formData.category || '—'}
                  </p>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
                  background: formData.paymentType === 'upi' ? T.accentLow : 'rgba(34,197,94,0.1)',
                  color: formData.paymentType === 'upi' ? '#818cf8' : T.success,
                  whiteSpace: 'nowrap', flexShrink: 0,
                }}>
                  {formData.paymentType === 'upi' ? `₹${formData.ticketPrice}` : 'Free'}
                </span>
              </div>

              {[
                { icon: '📅', label: 'Date', value: formData.date ? new Date(formData.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { icon: '🕐', label: 'Time', value: formData.startTime ? `${formData.startTime}${formData.endTime ? ` – ${formData.endTime}` : ''}` : '—' },
                { icon: '📍', label: 'Location', value: formData.venue ? `${formData.venue}${formData.city ? `, ${formData.city}` : ''}` : (formData.city || '—') },
                { icon: '🎫', label: 'Capacity', value: formData.capacity ? `${formData.capacity} seats` : '—' },
                ...(formData.paymentType === 'upi' ? [
                  { icon: '💳', label: 'UPI ID', value: formData.organizerUpiId || '—' },
                ] : []),
              ].map((row, i, arr) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '10px 0',
                  borderBottom: i < arr.length - 1 ? `1px solid ${T.border}` : 'none',
                }}>
                  <span style={{ fontSize: '14px', width: '18px', flexShrink: 0 }}>{row.icon}</span>
                  <span style={{ color: T.textLow, fontSize: '13px', width: '70px', flexShrink: 0 }}>{row.label}</span>
                  <span style={{ color: T.text, fontSize: '13px', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {submitError && (
            <div style={{ padding: '12px 14px', background: T.dangerLow, border: `1px solid rgba(239,68,68,0.2)`, borderRadius: T.radius }}>
              <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>⚠ {submitError}</p>
            </div>
          )}

          <p style={{ color: T.textLow, fontSize: '12px', textAlign: 'center', margin: 0 }}>
            Only you and your team can see this event until it's published.
          </p>
        </div>
      );

      default: return null;
    }
  };

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <OrganizerLayout>
      {/* Toast */}
      {draftToast && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 9999,
          background: '#1a2035',
          border: `1px solid ${T.border}`,
          borderRadius: '10px',
          padding: '12px 16px',
          color: T.textMid,
          fontSize: '13px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: '8px',
          animation: 'slideIn 0.25s ease',
        }}>
          <span style={{ color: T.success }}>✓</span>
          {draftToast}
        </div>
      )}

      <div style={{
        maxWidth: '620px', margin: '0 auto',
        fontFamily: "'Plus Jakarta Sans', 'DM Sans', -apple-system, sans-serif",
      }}>

        {/* ── Header + exit ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '28px' }}>
          <div>
            <h1 style={{ color: T.text, fontSize: '22px', fontWeight: 700, margin: '0 0 3px' }}>Create event</h1>
            <p style={{ color: T.textLow, fontSize: '13px', margin: 0 }}>
              Step {currentStep} of {STEPS.length} — <span style={{ color: T.textMid }}>{STEPS[currentStep - 1].label}</span>
            </p>
          </div>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={saveAndExit}
                disabled={loading}
                style={{
                  padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textMid, cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHov; e.currentTarget.style.color = T.text; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textMid; }}
              >
                Save & exit
              </button>
            )}
            <button
              type="button"
              onClick={() => navigate('/organiser/events')}
              style={{
                padding: '8px 14px', borderRadius: '8px', fontSize: '13px',
                background: 'transparent',
                border: `1px solid ${T.border}`,
                color: T.textLow, cursor: 'pointer',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.borderHov; e.currentTarget.style.color = T.textMid; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = T.border; e.currentTarget.style.color = T.textLow; }}
            >
              ← Events
            </button>
          </div>
        </div>

        {/* ── Clickable stepper ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', marginBottom: '24px' }}>
          {STEPS.map((step, i) => {
            const isCompleted = currentStep > step.id;
            const isActive    = currentStep === step.id;
            const isLocked    = currentStep < step.id;
            const hasError    = isCompleted && hasStepErrors(step.id, formData);

            return (
              <React.Fragment key={step.id}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => !isLocked && jumpTo(step.id)}
                    style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '12px', fontWeight: 700,
                      cursor: isLocked ? 'not-allowed' : 'pointer',
                      border: isActive ? `2px solid ${T.accentGlow}` : '2px solid transparent',
                      background: hasError ? 'rgba(239,68,68,0.15)' : isCompleted ? T.accent : isActive ? T.accent : T.surfaceAlt,
                      color: hasError ? T.danger : (isCompleted || isActive) ? 'white' : T.textLow,
                      transition: 'all 0.2s',
                      fontFamily: 'inherit',
                      outline: 'none',
                    }}
                  >
                    {hasError ? '!' : isCompleted ? '✓' : step.id}
                  </button>
                  <span style={{
                    fontSize: '10.5px', fontWeight: isActive ? 600 : 400,
                    color: isActive ? '#818cf8' : T.textLow,
                    whiteSpace: 'nowrap', maxWidth: '62px', textAlign: 'center',
                  }}>{step.label}</span>
                </div>
                {i < STEPS.length - 1 && (
                  <div style={{
                    flex: 1, height: '2px', margin: '16px 4px 0',
                    background: isCompleted ? T.accent : T.border,
                    transition: 'background 0.3s',
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ── Form card ── */}
        <div style={{
          background: T.surfaceAlt,
          border: `1px solid ${T.border}`,
          borderRadius: T.radiusLg,
          padding: '24px',
          marginBottom: '16px',
        }}>
          {renderStep()}
        </div>

        {/* ── Navigation ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            type="button"
            onClick={() => { setStepErrors({}); setCurrentStep(p => p - 1); }}
            disabled={currentStep === 1}
            style={{
              padding: '11px 20px', borderRadius: T.radius,
              background: 'transparent',
              border: `1px solid ${currentStep === 1 ? 'rgba(255,255,255,0.04)' : T.border}`,
              color: currentStep === 1 ? T.textLow : T.textMid,
              fontSize: '14px', fontWeight: 500,
              cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', transition: 'all 0.15s',
            }}
          >
            ← Back
          </button>

          {currentStep < 5 ? (
            <button
              type="button"
              onClick={tryAdvance}
              style={{
                padding: '11px 28px', borderRadius: T.radius,
                background: T.accent, border: 'none',
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
                transition: 'opacity 0.15s, transform 0.1s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Continue →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                style={{
                  padding: '11px 20px', borderRadius: T.radius,
                  background: 'transparent',
                  border: `1px solid ${T.border}`,
                  color: T.textMid, fontSize: '14px', fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Save draft
              </button>
              <button
                type="button"
                onClick={() => handleSubmit('published')}
                disabled={loading || [1,2,3].some(s => hasStepErrors(s, formData))}
                style={{
                  padding: '11px 28px', borderRadius: T.radius,
                  background: [1,2,3].some(s => hasStepErrors(s, formData)) ? T.surfaceAlt : (loading ? '#374151' : T.accent),
                  border: 'none',
                  color: [1,2,3].some(s => hasStepErrors(s, formData)) ? T.textLow : (loading ? T.textLow : 'white'),
                  fontSize: '14px', fontWeight: 600,
                  cursor: loading || [1,2,3].some(s => hasStepErrors(s, formData)) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit', transition: 'opacity 0.15s',
                }}
              >
                {loading ? 'Publishing…' : 'Publish event →'}
              </button>
            </div>
          )}
        </div>

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        input[type=time]::-webkit-calendar-picker-indicator { filter: invert(0.6); cursor: pointer; }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @media (max-width: 520px) {
          .cat-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </OrganizerLayout>
  );
}

export default OrganizerCreateEvent;