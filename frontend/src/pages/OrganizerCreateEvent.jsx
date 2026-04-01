import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

/* ─────────────────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────────────────── */
const DRAFT_KEY = 'eventnest_create_draft';

const STEPS = [
  { id: 1, label: 'Basics' },
  { id: 2, label: 'When & Where' },
  { id: 3, label: 'Tickets' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Publish' },
];

// IDs are lowercase to match backend enum exactly
const VALID_CATEGORIES = ['Hackathon', 'Fest', 'Workshop', 'Conference', 'Sports', 'Cultural', 'Meetup', 'Other'];

const CATEGORIES = [
  { id: 'Hackathon',  label: 'Hackathon',  icon: '💻' },
  { id: 'Fest',       label: 'Fest',       icon: '🎉' },
  { id: 'Workshop',   label: 'Workshop',   icon: '🛠️' },
  { id: 'Conference', label: 'Conference', icon: '🎤' },
  { id: 'Sports',     label: 'Sports',     icon: '⚽' },
  { id: 'Cultural',   label: 'Cultural',   icon: '🎭' },
  { id: 'Meetup',     label: 'Meetup',     icon: '👋' },
  { id: 'Other',      label: 'Other',      icon: '✨' },
];

const INDIAN_CITIES = [
  'Mumbai','Delhi','Bangalore','Hyderabad','Ahmedabad','Chennai','Kolkata','Surat','Pune','Jaipur',
  'Lucknow','Kanpur','Nagpur','Indore','Thane','Bhopal','Visakhapatnam','Pimpri-Chinchwad','Patna','Vadodara',
  'Ghaziabad','Ludhiana','Agra','Nashik','Faridabad','Meerut','Rajkot','Kalyan-Dombivali','Vasai-Virar','Varanasi',
  'Srinagar','Aurangabad','Dhanbad','Amritsar','Navi Mumbai','Allahabad','Ranchi','Howrah','Coimbatore','Jabalpur',
  'Gwalior','Vijayawada','Jodhpur','Madurai','Raipur','Kota','Guwahati','Chandigarh','Solapur','Hubli-Dharwad',
  'Bareilly','Moradabad','Mysore','Tiruchirappalli','Tiruppur','Dehradun','Noida','Gurugram','Kochi','Bhubaneswar',
];

const INITIAL_FORM = {
  title: '', category: '', description: '',
  venue: '', city: '', date: '', startTime: '', endTime: '',
  paymentType: 'free',
  organizerUpiId: '', organizerName: '',
  ticketPrice: 0, capacity: 100,
  paymentInstructions: '',
  agenda: '', speakers: '',
  status: 'draft',
};

/* ─────────────────────────────────────────────────────────
   STEP VALIDATION
───────────────────────────────────────────────────────── */
function validateStep(step, formData) {
  const errors = {};
  if (step === 1) {
    if (!formData.title?.trim()) errors.title = 'Event title is required';
    if (!formData.category || !VALID_CATEGORIES.includes(formData.category))
      errors.category = 'Select a category';
  }
  if (step === 2) {
    if (!formData.date) errors.date = 'Event date is required';
    else {
      const d = new Date(formData.date);
      const today = new Date(); today.setHours(0, 0, 0, 0);
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
      if (!formData.organizerUpiId?.includes('@') || formData.organizerUpiId.split('@')[1]?.length === 0)
        errors.organizerUpiId = 'Enter a valid UPI ID (e.g. name@okaxis)';
      if (!formData.organizerName?.trim())
        errors.organizerName = 'Display name is required';
    }
  }
  return errors;
}

function hasStepErrors(step, formData) {
  return Object.keys(validateStep(step, formData)).length > 0;
}

/* ─────────────────────────────────────────────────────────
   TIME PICKER — 12-hour AM/PM
───────────────────────────────────────────────────────── */
// Convert "HH:MM" 24h → { hour, minute, period }
function parse24h(val) {
  if (!val) return { hour: '12', minute: '00', period: 'AM' };
  const [h, m] = val.split(':').map(Number);
  const period = h < 12 ? 'AM' : 'PM';
  const hour = h === 0 ? '12' : h > 12 ? String(h - 12) : String(h);
  return { hour, minute: String(m).padStart(2, '0'), period };
}
// Convert { hour, minute, period } → "HH:MM" 24h
function to24h({ hour, minute, period }) {
  let h = parseInt(hour);
  if (period === 'AM' && h === 12) h = 0;
  if (period === 'PM' && h !== 12) h += 12;
  return `${String(h).padStart(2, '0')}:${minute}`;
}
// Format for display
function formatTime12(val) {
  if (!val) return '';
  const { hour, minute, period } = parse24h(val);
  return `${hour}:${minute} ${period}`;
}

function TimePicker({ value, onChange, error, label, required }) {
  const [open, setOpen] = useState(false);
  const { hour, minute, period } = parse24h(value);
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);
  const [p, setP] = useState(period);
  const ref = useRef(null);

  // Sync if value changes externally
  useEffect(() => {
    const parsed = parse24h(value);
    setH(parsed.hour); setM(parsed.minute); setP(parsed.period);
  }, [value]);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const commit = (nh, nm, np) => {
    const v = to24h({ hour: nh || h, minute: nm || m, period: np || p });
    onChange(v);
  };

  const hours   = Array.from({ length: 12 }, (_, i) => String(i + 1));
  const minutes = ['00', '15', '30', '45'];

  return (
    <div ref={ref} className="relative">
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
        </label>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-[10px] text-sm transition-all
          bg-[#0d1017] border ${error ? 'border-red-500' : open ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/[0.07]'}
          text-slate-200 hover:border-white/[0.14]`}
      >
        <span className={value ? 'text-slate-200' : 'text-slate-500'}>
          {value ? formatTime12(value) : 'Select time'}
        </span>
        <span className="text-slate-500 text-xs">🕐</span>
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1.5 z-50 bg-[#111520] border border-white/[0.1] rounded-xl shadow-2xl p-3 min-w-[220px]">
          <div className="flex gap-2">
            {/* Hour */}
            <div className="flex-1">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 text-center">Hour</p>
              <div className="grid grid-cols-3 gap-1">
                {hours.map(hr => (
                  <button key={hr} type="button"
                    onClick={() => { setH(hr); commit(hr, m, p); }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all
                      ${h === hr ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  >{hr}</button>
                ))}
              </div>
            </div>
            {/* Minute */}
            <div className="w-16">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 text-center">Min</p>
              <div className="flex flex-col gap-1">
                {minutes.map(mn => (
                  <button key={mn} type="button"
                    onClick={() => { setM(mn); commit(h, mn, p); }}
                    className={`py-1.5 rounded-lg text-xs font-medium transition-all
                      ${m === mn ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  >{mn}</button>
                ))}
              </div>
            </div>
            {/* AM/PM */}
            <div className="w-14">
              <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1.5 text-center">Period</p>
              <div className="flex flex-col gap-1">
                {['AM', 'PM'].map(pd => (
                  <button key={pd} type="button"
                    onClick={() => { setP(pd); commit(h, m, pd); }}
                    className={`py-2 rounded-lg text-xs font-semibold transition-all
                      ${p === pd ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                  >{pd}</button>
                ))}
              </div>
            </div>
          </div>
          <button type="button" onClick={() => setOpen(false)}
            className="mt-3 w-full py-1.5 rounded-lg text-xs text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 transition-all font-medium">
            Done
          </button>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   CITY AUTOCOMPLETE
───────────────────────────────────────────────────────── */
function CitySelect({ value, onChange, error }) {
  const [query, setQuery] = useState(value || '');
  const [open, setOpen]   = useState(false);
  const ref = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  const filtered = query.length > 0
    ? INDIAN_CITIES.filter(c => c.toLowerCase().startsWith(query.toLowerCase())).slice(0, 8)
    : INDIAN_CITIES.slice(0, 8);

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const select = (city) => { setQuery(city); onChange(city); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <input
        type="text" value={query}
        onChange={e => { setQuery(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        placeholder="Search city…"
        className={`w-full px-3.5 py-2.5 rounded-[10px] text-sm bg-[#0d1017] text-slate-200 placeholder-slate-500
          border transition-all outline-none
          ${error ? 'border-red-500' : open ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/[0.07] hover:border-white/[0.14]'}`}
      />
      {open && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1.5 z-50 bg-[#111520] border border-white/[0.1] rounded-xl overflow-hidden shadow-2xl">
          {filtered.map(city => (
            <div key={city} onMouseDown={() => select(city)}
              className={`flex items-center gap-2 px-3.5 py-2.5 text-sm cursor-pointer transition-colors border-b border-white/[0.04] last:border-0
                ${city === value ? 'bg-indigo-500/10 text-indigo-300' : 'text-slate-300 hover:bg-white/[0.04]'}`}>
              <span className="text-xs">📍</span> {city}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   STEPPER INPUT
───────────────────────────────────────────────────────── */
function StepperInput({ label, value, onChange, min = 0, max = 99999, step = 1, prefix = '', suffix = '', hint, error, required }) {
  const [focused, setFocused] = useState(false);
  const nudge = (delta) => onChange(Math.min(Math.max((parseInt(value) || 0) + delta, min), max));

  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
        </label>
      )}
      <div className={`flex items-center bg-[#0d1017] rounded-[10px] overflow-hidden border transition-all
        ${error ? 'border-red-500' : focused ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'border-white/[0.07]'}`}>
        <button type="button" onClick={() => nudge(-step)}
          className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 border-r border-white/[0.07] text-lg transition-all shrink-0">
          −
        </button>
        <div className="flex-1 flex items-center justify-center gap-1">
          {prefix && <span className="text-slate-500 text-sm">{prefix}</span>}
          <input type="number" value={value}
            onChange={e => onChange(Math.min(Math.max(parseInt(e.target.value) || 0, min), max))}
            onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
            className="bg-transparent border-none outline-none text-white text-lg font-bold text-center w-20 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          {suffix && <span className="text-slate-500 text-xs">{suffix}</span>}
        </div>
        <button type="button" onClick={() => nudge(step)}
          className="w-11 h-11 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 border-l border-white/[0.07] text-lg transition-all shrink-0">
          +
        </button>
      </div>
      {hint && !error && <p className="text-slate-600 text-xs mt-1.5">{hint}</p>}
      {error && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   FIELD WRAPPER
───────────────────────────────────────────────────────── */
function Field({ label, error, required, hint, children }) {
  return (
    <div>
      {label && (
        <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
          {label}{required && <span className="text-indigo-400 ml-0.5">*</span>}
        </label>
      )}
      {children}
      {hint && !error && <p className="text-slate-600 text-xs mt-1.5">{hint}</p>}
      {error && <p className="text-red-400 text-xs mt-1.5 flex items-center gap-1"><span>⚠</span>{error}</p>}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   SHARED INPUT CLASS BUILDER
───────────────────────────────────────────────────────── */
function inputCls(error, focused) {
  return `w-full px-3.5 py-2.5 rounded-[10px] text-sm bg-[#0d1017] text-slate-200 placeholder-slate-500
    border transition-all outline-none font-[inherit]
    ${error
      ? 'border-red-500 focus:border-red-400 focus:ring-2 focus:ring-red-500/20'
      : 'border-white/[0.07] hover:border-white/[0.14] focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'}`;
}

/* ─────────────────────────────────────────────────────────
   UPI INPUT
───────────────────────────────────────────────────────── */
function UpiInput({ value, onChange, error }) {
  const isValid = value?.includes('@') && value.split('@')[1]?.length > 0;
  const handles = ['@okaxis', '@okicici', '@oksbi', '@ybl', '@ibl', '@axl'];

  return (
    <Field label="UPI ID" required error={error} hint="Attendees will pay to this UPI ID after registering">
      <div className={`flex items-center bg-[#0d1017] rounded-[10px] overflow-hidden border transition-all
        ${error ? 'border-red-500' : isValid ? 'border-emerald-500/40' : 'border-white/[0.07] focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-500/20'}`}>
        <div className="flex items-center gap-1.5 px-3 border-r border-white/[0.07] shrink-0 h-11">
          <span className="text-sm">💳</span>
          <span className="text-slate-500 text-xs font-semibold">UPI</span>
        </div>
        <input type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="yourname@okaxis"
          className="flex-1 bg-transparent border-none outline-none text-slate-200 text-sm px-3 py-2.5 min-w-0"
        />
        {isValid && <div className="px-3 text-emerald-400 text-sm shrink-0">✓</div>}
      </div>
      <div className="flex flex-wrap gap-1.5 mt-2 items-center">
        <span className="text-slate-600 text-[11px]">Quick:</span>
        {handles.map(h => (
          <button key={h} type="button"
            onClick={() => onChange((value.split('@')[0] || 'yourname') + h)}
            className="px-2 py-0.5 rounded-md text-[11px] bg-white/[0.03] border border-white/[0.07] text-slate-500
              hover:bg-indigo-500/10 hover:text-indigo-400 hover:border-indigo-500/30 transition-all">
            {h}
          </button>
        ))}
      </div>
    </Field>
  );
}

/* ─────────────────────────────────────────────────────────
   COVER UPLOAD
───────────────────────────────────────────────────────── */
function CoverUpload({ preview, onChange, onRemove }) {
  return (
    <div>
      <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
        Event banner
      </label>
      <div
        onClick={() => document.getElementById('cover-upload').click()}
        className={`relative cursor-pointer rounded-xl overflow-hidden border-[1.5px] border-dashed transition-all
          ${preview ? 'border-indigo-500/50' : 'border-white/[0.07] hover:border-white/[0.14] bg-[#0d1017]'}`}
      >
        {preview ? (
          <>
            <img src={preview} alt="Banner preview" className="w-full h-40 sm:h-48 object-cover block" />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/40 transition-all flex items-center justify-center">
              <span className="opacity-0 hover:opacity-100 text-white text-xs font-semibold bg-black/60 px-3 py-1.5 rounded-lg transition-all">
                Change image
              </span>
            </div>
          </>
        ) : (
          <div className="h-32 sm:h-36 flex flex-col items-center justify-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg">🖼️</div>
            <div className="text-center px-4">
              <p className="text-slate-400 text-sm font-medium mb-0.5">Upload event banner</p>
              <p className="text-slate-600 text-xs">1200 × 628px recommended · JPG, PNG</p>
            </div>
          </div>
        )}
      </div>
      <input id="cover-upload" type="file" accept="image/*" onChange={onChange} className="hidden" />
      {preview && (
        <button type="button" onClick={onRemove}
          className="text-slate-500 text-xs mt-1.5 hover:text-slate-300 transition-colors">
          ✕ Remove image
        </button>
      )}
      <p className="text-slate-600 text-xs mt-1.5">First thing attendees see on the event card — make it count.</p>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────────────────── */
function OrganizerCreateEvent() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { user }  = useAuth();

  useEffect(() => {
    if (user && user.role !== 'organizer') navigate('/organiser/register', { replace: true });
  }, [user, navigate]);

  const [currentStep,     setCurrentStep]     = useState(1);
  const [loading,         setLoading]         = useState(false);
  const [submitError,     setSubmitError]      = useState('');
  const [stepErrors,      setStepErrors]       = useState({});
  const [completedSteps,  setCompletedSteps]   = useState(new Set());
  const [toast,           setToast]            = useState('');
  const [draftRestored,   setDraftRestored]    = useState(false);

  const [formData, setFormData] = useState(INITIAL_FORM);
  const [coverFile,    setCoverFile]    = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);
  const [upiQrFile,    setUpiQrFile]    = useState(null);

  /* ── Toast helper ── */
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3500);
  };

  /* ── Draft restore on mount ── */
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      // Sanitize: only restore fields that exist in INITIAL_FORM
      const sanitized = {};
      Object.keys(INITIAL_FORM).forEach(key => {
        if (saved[key] !== undefined) sanitized[key] = saved[key];
      });
      // Normalize to proper-case — e.g. 'music' → 'Music'
      if (sanitized.category) {
        const norm = sanitized.category.charAt(0).toUpperCase() + sanitized.category.slice(1).toLowerCase();
        sanitized.category = VALID_CATEGORIES.includes(norm) ? norm : '';
      }
      // Validate ticketPrice / capacity as numbers
      if (sanitized.ticketPrice !== undefined) sanitized.ticketPrice = Number(sanitized.ticketPrice) || 0;
      if (sanitized.capacity    !== undefined) sanitized.capacity    = Number(sanitized.capacity)    || 100;

      setFormData(prev => ({ ...prev, ...sanitized }));
      setDraftRestored(true);
      showToast('Draft restored — pick up where you left off');
    } catch { /* ignore corrupt draft */ }
  }, []);

  /* ── Duplicate event prefill ── */
  useEffect(() => {
    if (!location.state?.duplicateEvent) return;
    const ev = location.state.duplicateEvent;
    setFormData(prev => ({
      ...prev,
      title:       ev.title    ? `${ev.title} (copy)` : '',
      category:    (() => { const raw = ev.category || ''; const norm = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase(); return VALID_CATEGORIES.includes(norm) ? norm : ''; })(),
      description: ev.description || '',
      venue:       ev.venue    || '',
      city:        ev.city     || '',
      date:        ev.date     ? new Date(ev.date).toISOString().split('T')[0] : '',
      ticketPrice: Number(ev.price)    || 0,
      capacity:    Number(ev.capacity) || 100,
    }));
  }, [location.state]);

  /* ── Auto-save draft (debounced 800ms) ── */
  const draftTimer = useRef(null);
  useEffect(() => {
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
    }, 800);
    return () => clearTimeout(draftTimer.current);
  }, [formData]);

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
    // Revoke previous blob URL to avoid memory leaks
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    setCoverPreview(URL.createObjectURL(file));
  };

  /* ── Navigation ── */
  const tryAdvance = () => {
    const errors = validateStep(currentStep, formData);
    if (Object.keys(errors).length > 0) { setStepErrors(errors); return; }
    setStepErrors({});
    setCompletedSteps(prev => new Set([...prev, currentStep]));
    setCurrentStep(p => p + 1);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpTo = (stepId) => {
    if (stepId === currentStep) return;
    if (stepId < currentStep) { setStepErrors({}); setCurrentStep(stepId); return; }
    for (let s = currentStep; s < stepId; s++) {
      const errors = validateStep(s, formData);
      if (Object.keys(errors).length > 0) { setStepErrors(errors); setCurrentStep(s); return; }
    }
    setCurrentStep(stepId);
  };

  /* ── Build FormData for API ── */
  const buildFormData = (statusOverride) => {
    const fd = new FormData();
    fd.append('title',       formData.title.trim());
    fd.append('category',    formData.category);           // always a valid VALID_CATEGORIES value
    fd.append('description', formData.description);
    if (formData.venue)     fd.append('venue',     formData.venue);
    if (formData.city)      fd.append('city',      formData.city);
    if (formData.date)      fd.append('date',      formData.date);
    if (formData.startTime) fd.append('startTime', formData.startTime);
    if (formData.endTime)   fd.append('endTime',   formData.endTime);
    fd.append('capacity',   String(formData.capacity || 0));
    fd.append('price',      String(formData.paymentType === 'upi' ? formData.ticketPrice : 0));
    fd.append('paymentType', formData.paymentType);
    if (formData.paymentType === 'upi') {
      fd.append('organizerUpiId',  formData.organizerUpiId);
      fd.append('organizerName',   formData.organizerName || user?.name || '');
      fd.append('ticketPrice',     String(formData.ticketPrice));
      if (formData.paymentInstructions) fd.append('paymentInstructions', formData.paymentInstructions);
      if (upiQrFile) fd.append('organizerQrImage', upiQrFile);
    }
    if (formData.agenda)   fd.append('agenda',   formData.agenda);
    if (formData.speakers) fd.append('speakers', formData.speakers);
    if (coverFile)         fd.append('coverImage', coverFile);
    fd.append('status', statusOverride || formData.status);
    return fd;
  };

  /* ── Save & exit as draft ── */
  const saveAndExit = async () => {
    setLoading(true);
    try {
      await api.post('/events', buildFormData('draft'), { headers: { 'Content-Type': 'multipart/form-data' } });
      localStorage.removeItem(DRAFT_KEY);
      navigate('/organiser/events');
    } catch {
      showToast('Could not save draft — check connection');
    } finally {
      setLoading(false);
    }
  };

  /* ── Final submit ── */
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
      // Log full error so we can see exactly what backend rejected
      console.error('[EventCreate] 400 details:', JSON.stringify(err.response?.data, null, 2));
      // Backend may return { message } or { errors: [{field, message}] } or { error }
      const data = err.response?.data;
      const msg = data?.message || data?.error
        || (Array.isArray(data?.errors) ? data.errors.map(e => e.message || e.msg).join(', ') : null)
        || 'Failed to create event';
      setSubmitError(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ─────────────────────────────────────────────────────
     STEP CONTENT
  ───────────────────────────────────────────────────── */
  const E = stepErrors;

  const renderStep = () => {
    switch (currentStep) {

      /* ── Step 1: Basics ── */
      case 1: return (
        <div className="flex flex-col gap-5">
          <CoverUpload
            preview={coverPreview}
            onChange={handleCoverChange}
            onRemove={() => { setCoverFile(null); if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverPreview(null); }}
          />

          <Field label="Event title" required error={E.title}>
            <input
              type="text" name="title" value={formData.title} onChange={handleChange}
              onBlur={() => {
                if (!formData.title?.trim()) setStepErrors(p => ({ ...p, title: 'Event title is required' }));
                else setStepErrors(p => { const n = { ...p }; delete n.title; return n; });
              }}
              placeholder="Give your event a name that sells itself"
              className={inputCls(E.title)}
            />
          </Field>

          <Field label="Category" required error={E.category}>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {CATEGORIES.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => {
                    set('category', cat.id);
                    setStepErrors(p => { const n = { ...p }; delete n.category; return n; });
                  }}
                  className={`p-3 rounded-xl cursor-pointer flex flex-col items-center gap-1.5 transition-all font-[inherit]
                    ${formData.category === cat.id
                      ? 'border-[1.5px] border-indigo-500 bg-indigo-500/10 text-indigo-300'
                      : `border ${E.category ? 'border-red-500/30' : 'border-white/[0.07]'} bg-[#0d1017] text-slate-400 hover:border-white/[0.14] hover:text-slate-300`
                    }`}
                >
                  <span className="text-xl">{cat.icon}</span>
                  <span className="text-[11.5px] font-medium">{cat.label}</span>
                </button>
              ))}
            </div>
          </Field>

          <Field label="Description" hint="Help attendees understand what your event is about">
            <textarea
              name="description" value={formData.description} onChange={handleChange}
              placeholder="What will attendees experience? What should they bring? What's the vibe?"
              rows={4}
              className={`${inputCls(false)} resize-y leading-relaxed`}
            />
          </Field>
        </div>
      );

      /* ── Step 2: Date & Venue ── */
      case 2: return (
        <div className="flex flex-col gap-5">
          <Field label="Event date" required error={E.date}>
            <input type="date" name="date" value={formData.date} onChange={handleChange}
              min={new Date().toISOString().split('T')[0]}
              onBlur={() => {
                const errs = validateStep(2, formData);
                if (errs.date) setStepErrors(p => ({ ...p, date: errs.date }));
                else setStepErrors(p => { const n = { ...p }; delete n.date; return n; });
              }}
              className={`${inputCls(E.date)} [color-scheme:dark]`}
            />
          </Field>

          {/* Times — stack on mobile, side-by-side on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <TimePicker
              label="Start time"
              value={formData.startTime}
              onChange={v => set('startTime', v)}
            />
            <TimePicker
              label="End time"
              value={formData.endTime}
              error={E.endTime}
              onChange={v => {
                set('endTime', v);
                // Validate after change
                const updated = { ...formData, endTime: v };
                const errs = validateStep(2, updated);
                if (errs.endTime) setStepErrors(p => ({ ...p, endTime: errs.endTime }));
                else setStepErrors(p => { const n = { ...p }; delete n.endTime; return n; });
              }}
            />
          </div>
          {E.endTime && <p className="text-red-400 text-xs -mt-3 flex items-center gap-1"><span>⚠</span>{E.endTime}</p>}

          <Field label="Venue name" required error={E.venue} hint="Hall name, building, or full address">
            <input type="text" name="venue" value={formData.venue} onChange={handleChange}
              placeholder="e.g. Nehru Centre Auditorium, Worli"
              onBlur={() => {
                if (!formData.venue?.trim()) setStepErrors(p => ({ ...p, venue: 'Venue name is required' }));
                else setStepErrors(p => { const n = { ...p }; delete n.venue; return n; });
              }}
              className={inputCls(E.venue)}
            />
          </Field>

          <Field label="City" required error={E.city}>
            <CitySelect
              value={formData.city}
              onChange={v => {
                set('city', v);
                if (INDIAN_CITIES.includes(v)) setStepErrors(p => { const n = { ...p }; delete n.city; return n; });
              }}
              error={E.city}
            />
          </Field>
        </div>
      );

      /* ── Step 3: Tickets ── */
      case 3: return (
        <div className="flex flex-col gap-6">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
              Ticket type
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { val: 'free', label: 'Free',  icon: '🎟️', desc: 'Open registration, no payment' },
                { val: 'upi',  label: 'Paid',  icon: '💳', desc: 'Collect fees via UPI' },
              ].map(opt => (
                <button key={opt.val} type="button"
                  onClick={() => set('paymentType', opt.val)}
                  className={`p-4 rounded-xl cursor-pointer text-left flex flex-col gap-1 transition-all font-[inherit]
                    ${formData.paymentType === opt.val
                      ? 'border-[1.5px] border-indigo-500 bg-indigo-500/10'
                      : 'border border-white/[0.07] bg-[#0d1017] hover:border-white/[0.14]'}`}
                >
                  <span className="text-xl">{opt.icon}</span>
                  <span className={`text-sm font-semibold ${formData.paymentType === opt.val ? 'text-slate-200' : 'text-slate-400'}`}>
                    {opt.label}
                  </span>
                  <span className="text-slate-500 text-xs">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <StepperInput
            label="Capacity" value={formData.capacity}
            onChange={v => set('capacity', v)}
            min={1} max={100000} step={10} suffix=" seats"
            hint="Maximum number of attendees"
          />

          {formData.paymentType === 'upi' && (
            <div className="flex flex-col gap-5 p-4 sm:p-5 rounded-xl bg-indigo-500/[0.03] border border-indigo-500/20">
              <div className="flex items-center gap-2">
                <span className="text-sm">💳</span>
                <span className="text-slate-200 text-sm font-semibold">UPI payment setup</span>
              </div>

              <StepperInput
                label="Ticket price" required
                value={formData.ticketPrice}
                onChange={v => set('ticketPrice', v)}
                min={1} max={100000} step={50} prefix="₹"
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
                  className={inputCls(E.organizerName)}
                />
              </Field>

              {/* QR upload */}
              <div>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  UPI QR code <span className="text-slate-600 normal-case tracking-normal font-normal">(optional)</span>
                </label>
                <div
                  onClick={() => document.getElementById('qr-upload').click()}
                  className="border-[1.5px] border-dashed border-indigo-500/20 rounded-xl p-5 text-center cursor-pointer hover:border-indigo-500/40 transition-all bg-indigo-500/[0.01]"
                >
                  <p className="text-slate-400 text-sm mb-0.5">{upiQrFile ? `✅ ${upiQrFile.name}` : 'Click to upload QR image'}</p>
                  <p className="text-slate-600 text-xs">Attendees scan this to pay instantly</p>
                </div>
                <input id="qr-upload" type="file" accept="image/*"
                  onChange={e => setUpiQrFile(e.target.files?.[0] || null)} className="hidden" />
              </div>

              <Field label="Payment instructions" hint="e.g. Pay and send screenshot to WhatsApp +91…">
                <textarea
                  name="paymentInstructions" value={formData.paymentInstructions} onChange={handleChange}
                  placeholder="Any instructions for attendees after paying"
                  rows={3} className={`${inputCls(false)} resize-y`}
                />
              </Field>

              {/* Live preview */}
              <div className="bg-[#0d1017] border border-white/[0.07] rounded-xl p-3.5">
                <p className="text-slate-600 text-[10px] uppercase tracking-wider mb-2.5">Attendee payment card preview</p>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-lg shrink-0">💳</div>
                  <div className="min-w-0">
                    <p className="text-slate-200 text-sm font-semibold mb-0.5 truncate">Pay ₹{formData.ticketPrice || '0'}</p>
                    <p className="text-slate-400 text-xs truncate">
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
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-2.5 p-3.5 bg-indigo-500/10 border border-indigo-500/20 rounded-xl">
            <span className="text-base mt-px">ℹ️</span>
            <p className="text-indigo-300 text-sm m-0">
              Everything here is optional — you can fill it in after publishing too.
            </p>
          </div>

          <Field label="Agenda" hint="A clear schedule helps attendees plan their day">
            <textarea
              name="agenda" value={formData.agenda} onChange={handleChange}
              placeholder={'9:00 AM — Registration\n10:00 AM — Opening keynote\n11:30 AM — Workshop sessions\n1:00 PM — Lunch break'}
              rows={6} className={`${inputCls(false)} resize-y leading-relaxed`}
            />
          </Field>

          <Field label="Speakers / guests">
            <textarea
              name="speakers" value={formData.speakers} onChange={handleChange}
              placeholder={'Rahul Shah — CEO, TechCorp\nPriya Mehta — AI Researcher, IIT Bombay'}
              rows={4} className={`${inputCls(false)} resize-y leading-relaxed`}
            />
          </Field>
        </div>
      );

      /* ── Step 5: Review & Publish ── */
      case 5: return (
        <div className="flex flex-col gap-4">
          {/* Steps health check */}
          {[1, 2, 3].map(s => {
            const errs = validateStep(s, formData);
            if (Object.keys(errs).length === 0) return null;
            return (
              <div key={s} className="flex items-center justify-between gap-3 p-3.5 bg-red-500/[0.07] border border-red-500/20 rounded-xl">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-red-400 shrink-0">⚠</span>
                  <span className="text-red-300 text-sm truncate">
                    Step {s} ({STEPS[s - 1].label}) — {Object.keys(errs).length} issue{Object.keys(errs).length > 1 ? 's' : ''} to fix
                  </span>
                </div>
                <button type="button" onClick={() => { setStepErrors(errs); setCurrentStep(s); }}
                  className="text-red-400 text-xs font-semibold hover:text-red-300 transition-colors shrink-0">
                  Fix →
                </button>
              </div>
            );
          })}

          {/* Summary card */}
          <div className="bg-[#0d1017] border border-white/[0.07] rounded-xl overflow-hidden">
            {coverPreview && (
              <img src={coverPreview} alt="Banner" className="w-full h-36 sm:h-44 object-cover block" />
            )}
            <div className="p-4 sm:p-5">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="min-w-0">
                  <h3 className="text-slate-200 text-lg font-bold mb-0.5 truncate">
                    {formData.title || <span className="text-slate-500 italic font-normal">Untitled event</span>}
                  </h3>
                  <p className="text-slate-400 text-sm">{formData.category || '—'}</p>
                </div>
                <span className={`shrink-0 px-2.5 py-1 rounded-full text-xs font-semibold
                  ${formData.paymentType === 'upi'
                    ? 'bg-indigo-500/10 text-indigo-300'
                    : 'bg-emerald-500/10 text-emerald-400'}`}>
                  {formData.paymentType === 'upi' ? `₹${formData.ticketPrice}` : 'Free'}
                </span>
              </div>

              {[
                { icon: '📅', label: 'Date',     value: formData.date ? new Date(formData.date).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' }) : '—' },
                { icon: '🕐', label: 'Time',     value: formData.startTime ? `${formatTime12(formData.startTime)}${formData.endTime ? ` – ${formatTime12(formData.endTime)}` : ''}` : '—' },
                { icon: '📍', label: 'Location', value: formData.venue ? `${formData.venue}${formData.city ? `, ${formData.city}` : ''}` : (formData.city || '—') },
                { icon: '🎫', label: 'Capacity', value: formData.capacity ? `${formData.capacity} seats` : '—' },
                ...(formData.paymentType === 'upi' ? [{ icon: '💳', label: 'UPI ID', value: formData.organizerUpiId || '—' }] : []),
              ].map((row, i, arr) => (
                <div key={i} className={`flex items-center gap-2.5 py-2.5 ${i < arr.length - 1 ? 'border-b border-white/[0.04]' : ''}`}>
                  <span className="text-sm w-4 shrink-0">{row.icon}</span>
                  <span className="text-slate-500 text-xs w-16 shrink-0">{row.label}</span>
                  <span className="text-slate-300 text-sm font-medium truncate">{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {submitError && (
            <div className="p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl">
              <p className="text-red-300 text-sm m-0">⚠ {submitError}</p>
            </div>
          )}

          <p className="text-slate-600 text-xs text-center">
            Only you and your team can see this event until it's published.
          </p>
        </div>
      );

      default: return null;
    }
  };

  /* ─────────────────────────────────────────────────────
     STEPPER BAR — Mobile: vertical list, Desktop: horizontal
  ───────────────────────────────────────────────────── */
  const StepperBar = () => (
    <>
      {/* Mobile: compact horizontal dots */}
      <div className="flex sm:hidden items-center mb-5">
        {STEPS.map((step, i) => {
          const isCompleted = currentStep > step.id;
          const isActive    = currentStep === step.id;
          const hasError    = isCompleted && hasStepErrors(step.id, formData);
          return (
            <React.Fragment key={step.id}>
              <button type="button" onClick={() => currentStep >= step.id && jumpTo(step.id)}
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shrink-0
                  ${hasError    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                  : isCompleted ? 'bg-indigo-500 text-white'
                  : isActive    ? 'bg-indigo-500 text-white ring-2 ring-indigo-500/30'
                  : 'bg-white/5 text-slate-500'}`}
              >
                {hasError ? '!' : isCompleted ? '✓' : step.id}
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 transition-all ${isCompleted ? 'bg-indigo-500' : 'bg-white/[0.07]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Desktop: horizontal with labels */}
      <div className="hidden sm:flex items-start mb-6">
        {STEPS.map((step, i) => {
          const isCompleted = currentStep > step.id;
          const isActive    = currentStep === step.id;
          const isLocked    = currentStep < step.id;
          const hasError    = isCompleted && hasStepErrors(step.id, formData);
          return (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center gap-1.5">
                <button type="button"
                  onClick={() => !isLocked && jumpTo(step.id)}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                    ${hasError    ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                    : isCompleted ? 'bg-indigo-500 text-white'
                    : isActive    ? 'bg-indigo-500 text-white ring-2 ring-indigo-500/30'
                    : 'bg-white/5 text-slate-500 cursor-not-allowed'}`}
                >
                  {hasError ? '!' : isCompleted ? '✓' : step.id}
                </button>
                <span className={`text-[10.5px] whitespace-nowrap font-medium
                  ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}>
                  {step.label}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 mt-4 transition-all ${isCompleted ? 'bg-indigo-500' : 'bg-white/[0.07]'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </>
  );

  /* ─────────────────────────────────────────────────────
     RENDER
  ───────────────────────────────────────────────────── */
  return (
    <OrganizerLayout>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 px-4 py-3 bg-[#1a2035] border border-white/[0.07] rounded-xl text-slate-400 text-sm shadow-2xl animate-[slideIn_0.25s_ease]">
          <span className="text-emerald-400">✓</span>
          {toast}
        </div>
      )}

      <div className="max-w-xl mx-auto px-4 sm:px-0 font-[family-name:var(--font-jakarta,_'Plus_Jakarta_Sans',_'DM_Sans',_sans-serif)]">

        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between mb-6">
          <div>
            <h1 className="text-slate-200 text-[20px] sm:text-[22px] font-bold mb-0.5">Create event</h1>
            <p className="text-slate-500 text-xs sm:text-sm">
              Step {currentStep} of {STEPS.length} —{' '}
              <span className="text-slate-400">{STEPS[currentStep - 1].label}</span>
            </p>
          </div>
          <div className="flex gap-2 sm:items-center">
            {currentStep > 1 && (
              <button type="button" onClick={saveAndExit} disabled={loading}
                className="flex-1 sm:flex-none py-3 sm:py-2 px-4 rounded-xl text-sm font-medium text-slate-400
                  border border-white/[0.07] hover:border-white/[0.14] hover:text-slate-300 transition-all bg-transparent">
                Save & exit
              </button>
            )}
            <button type="button" onClick={() => navigate('/organiser/events')}
              className="flex-1 sm:flex-none py-3 sm:py-2 px-4 rounded-xl text-sm font-medium text-slate-500
                border border-white/[0.07] hover:border-white/[0.14] hover:text-slate-400 transition-all bg-transparent">
              ← Events
            </button>
          </div>
        </div>

        {/* ── Stepper ── */}
        <StepperBar />

        {/* ── Form card ── */}
        <div className="bg-[#111520] border border-white/[0.07] rounded-xl p-4 sm:p-6 mb-4">
          {renderStep()}
        </div>

        {/* ── Nav buttons ── */}
        <div className="flex items-center justify-between gap-3 pb-8">
          <button type="button"
            onClick={() => { setStepErrors({}); setCurrentStep(p => p - 1); }}
            disabled={currentStep === 1}
            className={`py-3 sm:py-2.5 px-5 rounded-xl text-sm font-medium transition-all bg-transparent font-[inherit]
              ${currentStep === 1
                ? 'border border-white/[0.04] text-slate-600 cursor-not-allowed'
                : 'border border-white/[0.07] text-slate-400 hover:border-white/[0.14] hover:text-slate-300 cursor-pointer'}`}
          >
            ← Back
          </button>

          {currentStep < 5 ? (
            <button type="button" onClick={tryAdvance}
              className="flex-1 sm:flex-none py-3 sm:py-2.5 px-7 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-sm font-semibold transition-all cursor-pointer font-[inherit]">
              Continue →
            </button>
          ) : (
            <div className="flex flex-col sm:flex-row gap-2 flex-1 sm:flex-none">
              <button type="button" onClick={() => handleSubmit('draft')} disabled={loading}
                className="w-full sm:w-auto py-3 sm:py-2.5 px-5 rounded-xl text-sm font-medium text-slate-400
                  border border-white/[0.07] hover:border-white/[0.14] hover:text-slate-300 transition-all bg-transparent
                  disabled:opacity-50 disabled:cursor-not-allowed font-[inherit]">
                Save draft
              </button>
              <button type="button"
                onClick={() => handleSubmit('published')}
                disabled={loading || [1, 2, 3].some(s => hasStepErrors(s, formData))}
                className={`w-full sm:w-auto py-3 sm:py-2.5 px-7 rounded-xl text-sm font-semibold transition-all font-[inherit]
                  ${loading || [1, 2, 3].some(s => hasStepErrors(s, formData))
                    ? 'bg-white/5 text-slate-500 cursor-not-allowed'
                    : 'bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer'}`}
              >
                {loading ? 'Publishing…' : 'Publish event →'}
              </button>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input[type=date]::-webkit-calendar-picker-indicator { filter: invert(0.5); cursor: pointer; }
      `}</style>
    </OrganizerLayout>
  );
}

export default OrganizerCreateEvent;