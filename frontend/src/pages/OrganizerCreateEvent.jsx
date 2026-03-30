import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

const steps = [
  { id: 1, label: 'Basic info' },
  { id: 2, label: 'Date & venue' },
  { id: 3, label: 'Tickets' },
  { id: 4, label: 'Details' },
  { id: 5, label: 'Publish' },
];

const categories = [
  { id: 'Hackathon', label: 'Hackathon', icon: '💻' },
  { id: 'Fest', label: 'Fest', icon: '🎉' },
  { id: 'Workshop', label: 'Workshop', icon: '🛠️' },
  { id: 'Conference', label: 'Conference', icon: '🎤' },
  { id: 'Sports', label: 'Sports', icon: '⚽' },
  { id: 'Cultural', label: 'Cultural', icon: '🎭' },
  { id: 'Meetup', label: 'Meetup', icon: '👋' },
  { id: 'Music', label: 'Music', icon: '🎵' },
];

/* ─── Shared input style ─────────────────────────────── */
const inputStyle = {
  width: '100%', boxSizing: 'border-box',
  background: '#080c14',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: '10px', padding: '11px 14px',
  color: '#e5e7eb', fontSize: '14px', outline: 'none',
  transition: 'border-color 0.15s', fontFamily: 'inherit',
};

const labelStyle = {
  display: 'block', color: '#9ca3af',
  fontSize: '12px', fontWeight: 500,
  marginBottom: '6px', textTransform: 'uppercase',
  letterSpacing: '0.04em',
};

/* ─── Stepper input (inc / dec) ──────────────────────── */
function StepperInput({ label, value, onChange, min = 0, max = 99999, step = 1, prefix = '', suffix = '', hint = '' }) {
  const [focused, setFocused] = useState(false);

  const change = (delta) => {
    const next = Math.min(Math.max((parseInt(value) || 0) + delta, min), max);
    onChange(next);
  };

  return (
    <div>
      {label && <label style={labelStyle}>{label}</label>}
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#080c14',
        border: `1px solid ${focused ? '#6366f1' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '10px', overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}>
        <button
          type="button"
          onClick={() => change(-step)}
          style={{
            width: '44px', height: '44px', flexShrink: 0,
            background: 'rgba(255,255,255,0.03)',
            border: 'none', borderRight: '1px solid rgba(255,255,255,0.06)',
            color: '#9ca3af', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >−</button>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2px' }}>
          {prefix && <span style={{ color: '#6b7280', fontSize: '14px' }}>{prefix}</span>}
          <input
            type="number"
            value={value}
            onChange={e => onChange(Math.min(Math.max(parseInt(e.target.value) || 0, min), max))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e5e7eb', fontSize: '18px', fontWeight: 700,
              textAlign: 'center', width: '80px', fontFamily: 'inherit',
              /* hide arrows */
              MozAppearance: 'textfield',
            }}
          />
          {suffix && <span style={{ color: '#6b7280', fontSize: '13px' }}>{suffix}</span>}
        </div>

        <button
          type="button"
          onClick={() => change(step)}
          style={{
            width: '44px', height: '44px', flexShrink: 0,
            background: 'rgba(255,255,255,0.03)',
            border: 'none', borderLeft: '1px solid rgba(255,255,255,0.06)',
            color: '#9ca3af', fontSize: '18px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'background 0.1s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.07)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.03)'}
        >+</button>
      </div>
      {hint && <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '5px' }}>{hint}</p>}
    </div>
  );
}

/* ─── UPI Handle Input ───────────────────────────────── */
function UpiInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  const [status, setStatus] = useState('idle'); // idle | valid | invalid

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);
    if (val.includes('@') && val.split('@')[1]?.length > 0) {
      setStatus('valid');
    } else {
      setStatus('idle');
    }
  };

  const suggestions = ['@okaxis', '@okicici', '@oksbi', '@ybl', '@ibl', '@axl', '@upi'];

  return (
    <div>
      <label style={labelStyle}>UPI ID (handle) *</label>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#080c14',
        border: `1px solid ${focused ? '#6366f1' : status === 'valid' ? 'rgba(52,211,153,0.4)' : 'rgba(255,255,255,0.08)'}`,
        borderRadius: '10px', overflow: 'hidden',
        transition: 'border-color 0.15s',
      }}>
        <div style={{
          padding: '0 12px', display: 'flex', alignItems: 'center', gap: '6px',
          borderRight: '1px solid rgba(255,255,255,0.06)', height: '44px', flexShrink: 0,
        }}>
          <span style={{ fontSize: '16px' }}>💳</span>
          <span style={{ color: '#4b5563', fontSize: '13px', fontWeight: 500 }}>UPI</span>
        </div>
        <input
          type="text"
          value={value}
          onChange={handleChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder="yourname@okaxis"
          style={{
            flex: 1, background: 'transparent', border: 'none', outline: 'none',
            color: '#e5e7eb', fontSize: '14px', padding: '11px 14px',
            fontFamily: 'inherit',
          }}
        />
        {status === 'valid' && (
          <div style={{ padding: '0 12px', color: '#34d399', fontSize: '16px' }}>✓</div>
        )}
      </div>

      {/* Quick suggestions */}
      <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '8px' }}>
        <span style={{ color: '#4b5563', fontSize: '11px', alignSelf: 'center' }}>Common handles:</span>
        {suggestions.map(s => (
          <button
            key={s}
            type="button"
            onClick={() => {
              const base = value.split('@')[0] || 'yourname';
              onChange(base + s);
              setStatus('valid');
            }}
            style={{
              padding: '3px 8px', borderRadius: '6px', fontSize: '11px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#6b7280', cursor: 'pointer', transition: 'all 0.1s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(99,102,241,0.1)'; e.currentTarget.style.color = '#818cf8'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#6b7280'; }}
          >
            {s}
          </button>
        ))}
      </div>
      <p style={{ color: '#4b5563', fontSize: '12px', marginTop: '5px' }}>
        Attendees will pay to this UPI ID after registering
      </p>
    </div>
  );
}

/* ─── Main component ─────────────────────────────────── */
function OrganizerCreateEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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

  const [upiQrFile, setUpiQrFile] = useState(null);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState(null);

  useEffect(() => {
    if (location.state?.duplicateEvent) {
      const ev = location.state.duplicateEvent;
      setFormData(prev => ({
        ...prev,
        title: ev.title || '', category: ev.category || '',
        description: ev.description || '', venue: ev.venue || '',
        city: ev.city || '',
        date: ev.date ? new Date(ev.date).toISOString().split('T')[0] : '',
        ticketPrice: ev.price || 0, capacity: ev.capacity || 100,
      }));
    }
  }, [location.state]);

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

  const handleSubmit = async (statusOverride) => {
    setError('');
    setLoading(true);
    try {
      if (formData.paymentType === 'upi') {
        if (!formData.organizerUpiId || !formData.organizerName) {
          setError('UPI ID and organizer name are required for paid events');
          setLoading(false); return;
        }
        if (!formData.ticketPrice || formData.ticketPrice <= 0) {
          setError('Ticket price must be greater than 0');
          setLoading(false); return;
        }
      }

      const fd = new FormData();
      fd.append('title', formData.title);
      fd.append('category', formData.category);
      fd.append('description', formData.description);
      if (formData.venue) fd.append('venue', formData.venue);
      if (formData.city) fd.append('city', formData.city);
      if (formData.date) fd.append('date', formData.date);
      if (formData.startTime) fd.append('startTime', formData.startTime);
      if (formData.endTime) fd.append('endTime', formData.endTime);
      fd.append('capacity', String(formData.capacity || 0));
      fd.append('price', String(formData.paymentType === 'upi' ? formData.ticketPrice : 0));
      fd.append('paymentType', formData.paymentType);
      if (formData.paymentType === 'upi') {
        fd.append('organizerUpiId', formData.organizerUpiId);
        fd.append('organizerName', formData.organizerName || user?.name || '');
        fd.append('ticketPrice', String(formData.ticketPrice));
        if (formData.paymentInstructions) fd.append('paymentInstructions', formData.paymentInstructions);
        if (upiQrFile) fd.append('organizerQrImage', upiQrFile);
      }
      if (formData.agenda) fd.append('agenda', formData.agenda);
      if (formData.speakers) fd.append('speakers', formData.speakers);
      if (coverFile) fd.append('coverImage', coverFile);
      fd.append('status', statusOverride || formData.status);

      const res = await api.post('/events', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (res.data._id) navigate('/organiser/events');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create event');
    } finally {
      setLoading(false);
    }
  };

  /* ── Step content ── */
  const renderStep = () => {
    switch (currentStep) {

      /* ─── Step 1: Basic Info ─── */
      case 1: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Event title *</label>
            <input
              type="text" name="title" value={formData.title} onChange={handleChange}
              placeholder="Give your event a great name"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div>
            <label style={labelStyle}>Category *</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              {categories.map(cat => (
                <button
                  key={cat.id} type="button"
                  onClick={() => set('category', cat.id)}
                  style={{
                    padding: '12px 8px', borderRadius: '10px', cursor: 'pointer',
                    border: formData.category === cat.id ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.07)',
                    background: formData.category === cat.id ? 'rgba(99,102,241,0.15)' : '#080c14',
                    color: formData.category === cat.id ? '#818cf8' : '#6b7280',
                    fontSize: '12px', fontWeight: formData.category === cat.id ? 600 : 400,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px',
                    transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>{cat.icon}</span>
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={labelStyle}>Description</label>
            <textarea
              name="description" value={formData.description} onChange={handleChange}
              placeholder="Tell attendees what your event is about…"
              rows={4}
              style={{ ...inputStyle, resize: 'vertical', lineHeight: '1.5' }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>
      );

      /* ─── Step 2: Date & Venue ─── */
      case 2: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={labelStyle}>Event date *</label>
            <input type="date" name="date" value={formData.date} onChange={handleChange}
              style={{ ...inputStyle, colorScheme: 'dark' }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Start time</label>
              <input type="time" name="startTime" value={formData.startTime} onChange={handleChange}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
            <div>
              <label style={labelStyle}>End time</label>
              <input type="time" name="endTime" value={formData.endTime} onChange={handleChange}
                style={{ ...inputStyle, colorScheme: 'dark' }}
                onFocus={e => e.target.style.borderColor = '#6366f1'}
                onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Venue name *</label>
            <input type="text" name="venue" value={formData.venue} onChange={handleChange}
              placeholder="Hall name, building, address"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div>
            <label style={labelStyle}>City *</label>
            <input type="text" name="city" value={formData.city} onChange={handleChange}
              placeholder="Mumbai, Delhi, Bangalore…"
              style={inputStyle}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>
      );

      /* ─── Step 3: Tickets & Payment ─── */
      case 3: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Free / Paid toggle */}
          <div>
            <label style={labelStyle}>Ticket type</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              {[
                { val: 'free', label: 'Free event', icon: '🎟️', desc: 'No payment needed' },
                { val: 'upi', label: 'Paid event', icon: '💳', desc: 'Collect via UPI' },
              ].map(opt => (
                <button
                  key={opt.val} type="button"
                  onClick={() => set('paymentType', opt.val)}
                  style={{
                    padding: '16px', borderRadius: '12px', cursor: 'pointer', textAlign: 'left',
                    border: formData.paymentType === opt.val ? '1.5px solid #6366f1' : '1px solid rgba(255,255,255,0.07)',
                    background: formData.paymentType === opt.val ? 'rgba(99,102,241,0.1)' : '#080c14',
                    display: 'flex', flexDirection: 'column', gap: '4px', transition: 'all 0.15s',
                  }}
                >
                  <span style={{ fontSize: '20px' }}>{opt.icon}</span>
                  <span style={{ color: formData.paymentType === opt.val ? '#e5e7eb' : '#9ca3af', fontSize: '14px', fontWeight: 600 }}>
                    {opt.label}
                  </span>
                  <span style={{ color: '#4b5563', fontSize: '12px' }}>{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Capacity */}
          <StepperInput
            label="Capacity (attendees)"
            value={formData.capacity}
            onChange={v => set('capacity', v)}
            min={1} max={100000} step={10}
            suffix=" seats"
            hint="How many people can attend this event"
          />

          {/* UPI payment details */}
          {formData.paymentType === 'upi' && (
            <div style={{
              display: 'flex', flexDirection: 'column', gap: '20px',
              padding: '20px', borderRadius: '14px',
              background: 'rgba(99,102,241,0.04)',
              border: '1px solid rgba(99,102,241,0.12)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '16px' }}>💳</span>
                <span style={{ color: '#e5e7eb', fontSize: '15px', fontWeight: 600 }}>UPI payment setup</span>
              </div>

              {/* Ticket price stepper */}
              <StepperInput
                label="Ticket price *"
                value={formData.ticketPrice}
                onChange={v => set('ticketPrice', v)}
                min={1} max={100000} step={50}
                prefix="₹"
                hint="Amount each attendee pays via UPI"
              />

              {/* UPI ID with handle suggestions */}
              <UpiInput
                value={formData.organizerUpiId}
                onChange={v => set('organizerUpiId', v)}
              />

              {/* Organizer display name */}
              <div>
                <label style={labelStyle}>Display name on UPI *</label>
                <input
                  type="text" name="organizerName"
                  value={formData.organizerName} onChange={handleChange}
                  placeholder="Name attendees see when paying"
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* QR upload */}
              <div>
                <label style={labelStyle}>UPI QR code <span style={{ color: '#4b5563', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
                <div style={{
                  border: '1.5px dashed rgba(99,102,241,0.25)', borderRadius: '10px',
                  padding: '20px', textAlign: 'center', cursor: 'pointer',
                  background: 'rgba(99,102,241,0.03)',
                }}
                  onClick={() => document.getElementById('qr-upload').click()}
                >
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                    {upiQrFile ? `✅ ${upiQrFile.name}` : 'Click to upload QR image'}
                  </p>
                  <p style={{ color: '#4b5563', fontSize: '11px', marginTop: '4px' }}>
                    Attendees can scan this to pay quickly
                  </p>
                </div>
                <input id="qr-upload" type="file" accept="image/*"
                  onChange={e => setUpiQrFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
              </div>

              {/* Payment instructions */}
              <div>
                <label style={labelStyle}>
                  Payment instructions <span style={{ color: '#4b5563', textTransform: 'none', fontWeight: 400 }}>(optional)</span>
                </label>
                <textarea
                  name="paymentInstructions" value={formData.paymentInstructions} onChange={handleChange}
                  placeholder="e.g. Pay and send screenshot to WhatsApp +91…"
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical' }}
                  onFocus={e => e.target.style.borderColor = '#6366f1'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
                />
              </div>

              {/* Preview box */}
              <div style={{
                background: '#080c14', border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: '10px', padding: '14px',
              }}>
                <p style={{ color: '#4b5563', fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 8px' }}>
                  What attendees will see
                </p>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'rgba(99,102,241,0.1)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                  }}>💳</div>
                  <div>
                    <p style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 600, margin: '0 0 2px' }}>
                      Pay ₹{formData.ticketPrice || '0'}
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '12px', margin: 0 }}>
                      to {formData.organizerUpiId || 'yourname@okaxis'}
                      {formData.organizerName ? ` · ${formData.organizerName}` : ''}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      );

      /* ─── Step 4: Event details (agenda / speakers / cover) ─── */
      case 4: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Cover image */}
          <div>
            <label style={labelStyle}>Cover image</label>
            <div
              style={{
                border: '1.5px dashed rgba(255,255,255,0.1)', borderRadius: '12px',
                overflow: 'hidden', cursor: 'pointer',
                background: coverPreview ? 'transparent' : '#080c14',
              }}
              onClick={() => document.getElementById('cover-upload').click()}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="cover preview"
                  style={{ width: '100%', height: '180px', objectFit: 'cover', display: 'block' }} />
              ) : (
                <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '28px', opacity: 0.4 }}>🖼️</span>
                  <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>Click to upload cover image</p>
                  <p style={{ color: '#4b5563', fontSize: '11px', margin: 0 }}>1200 × 628px recommended · PNG, JPG</p>
                </div>
              )}
            </div>
            <input id="cover-upload" type="file" accept="image/*" onChange={handleCoverChange} style={{ display: 'none' }} />
            {coverPreview && (
              <button type="button" onClick={() => { setCoverFile(null); setCoverPreview(null); }}
                style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: '12px', cursor: 'pointer', marginTop: '6px' }}>
                Remove image
              </button>
            )}
          </div>

          <div>
            <label style={labelStyle}>Agenda <span style={{ color: '#4b5563', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              name="agenda" value={formData.agenda} onChange={handleChange}
              placeholder="9:00 AM — Registration&#10;10:00 AM — Opening keynote&#10;11:30 AM — Workshop sessions…"
              rows={5}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>

          <div>
            <label style={labelStyle}>Speakers / guests <span style={{ color: '#4b5563', textTransform: 'none', fontWeight: 400 }}>(optional)</span></label>
            <textarea
              name="speakers" value={formData.speakers} onChange={handleChange}
              placeholder="Rahul Shah — CEO, TechCorp&#10;Priya Mehta — AI Researcher…"
              rows={3}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => e.target.style.borderColor = '#6366f1'}
              onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.08)'}
            />
          </div>
        </div>
      );

      /* ─── Step 5: Publish ─── */
      case 5: return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Summary card */}
          <div style={{
            background: '#080c14', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: '14px', overflow: 'hidden',
          }}>
            {coverPreview && (
              <img src={coverPreview} alt="cover"
                style={{ width: '100%', height: '140px', objectFit: 'cover' }} />
            )}
            <div style={{ padding: '18px' }}>
              <h3 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                {formData.title || 'Untitled event'}
              </h3>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '0 0 16px' }}>
                {formData.city ? `📍 ${formData.venue ? formData.venue + ', ' : ''}${formData.city}` : 'Location not set'}
                {formData.date ? ` · ${new Date(formData.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''}
              </p>

              {[
                { label: 'Category', value: formData.category || '—' },
                { label: 'Capacity', value: formData.capacity ? `${formData.capacity} seats` : '—' },
                { label: 'Ticket price', value: formData.paymentType === 'upi' ? `₹${formData.ticketPrice}` : 'Free' },
                { label: 'UPI ID', value: formData.paymentType === 'upi' ? (formData.organizerUpiId || '—') : 'N/A' },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                }}>
                  <span style={{ color: '#6b7280', fontSize: '13px' }}>{row.label}</span>
                  <span style={{ color: '#e5e7eb', fontSize: '13px', fontWeight: 500 }}>{row.value}</span>
                </div>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ padding: '12px 14px', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '10px' }}>
              <p style={{ color: '#f87171', fontSize: '13px', margin: 0 }}>{error}</p>
            </div>
          )}
        </div>
      );

      default: return null;
    }
  };

  return (
    <OrganizerLayout>
      <div style={{ maxWidth: '640px', margin: '0 auto', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

        {/* Header */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{ color: '#e5e7eb', fontSize: '24px', fontWeight: 700, margin: '0 0 4px' }}>Create event</h1>
          <p style={{ color: '#6b7280', fontSize: '14px', margin: 0 }}>Step {currentStep} of {steps.length} — {steps[currentStep - 1].label}</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px' }}>
          {steps.map((step, i) => (
            <React.Fragment key={step.id}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '50%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '13px', fontWeight: 700, transition: 'all 0.2s',
                  background: currentStep > step.id ? '#6366f1' : currentStep === step.id ? '#6366f1' : 'rgba(255,255,255,0.05)',
                  color: currentStep >= step.id ? 'white' : '#4b5563',
                  border: currentStep === step.id ? '2px solid rgba(99,102,241,0.4)' : '2px solid transparent',
                }}>
                  {currentStep > step.id ? '✓' : step.id}
                </div>
                <span style={{
                  fontSize: '11px', fontWeight: currentStep === step.id ? 600 : 400,
                  color: currentStep === step.id ? '#818cf8' : '#4b5563',
                  whiteSpace: 'nowrap',
                }}>{step.label}</span>
              </div>
              {i < steps.length - 1 && (
                <div style={{
                  flex: 1, height: '2px', margin: '0 4px', marginBottom: '18px',
                  background: currentStep > step.id ? '#6366f1' : 'rgba(255,255,255,0.06)',
                  transition: 'background 0.3s',
                }} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form card */}
        <div style={{
          background: '#0d1220',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '16px', padding: '24px',
          marginBottom: '16px',
        }}>
          {renderStep()}
        </div>

        {/* Navigation */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
          <button
            onClick={() => setCurrentStep(p => p - 1)}
            disabled={currentStep === 1}
            style={{
              padding: '11px 20px', borderRadius: '10px',
              background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
              color: currentStep === 1 ? '#374151' : '#9ca3af',
              fontSize: '14px', fontWeight: 500, cursor: currentStep === 1 ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
            }}
          >
            ← Back
          </button>

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(p => p + 1)}
              style={{
                padding: '11px 24px', borderRadius: '10px',
                background: '#6366f1', border: 'none',
                color: 'white', fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', transition: 'opacity 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.88'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}
            >
              Continue →
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                style={{
                  padding: '11px 20px', borderRadius: '10px',
                  background: 'transparent', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#9ca3af', fontSize: '14px', fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                Save draft
              </button>
              <button
                onClick={() => handleSubmit('published')}
                disabled={loading}
                style={{
                  padding: '11px 24px', borderRadius: '10px',
                  background: loading ? '#374151' : '#6366f1', border: 'none',
                  color: loading ? '#6b7280' : 'white', fontSize: '14px', fontWeight: 600,
                  cursor: loading ? 'not-allowed' : 'pointer',
                }}
              >
                {loading ? 'Publishing…' : 'Publish event →'}
              </button>
            </div>
          )}
        </div>

      </div>

      <style>{`
        input[type=number]::-webkit-inner-spin-button,
        input[type=number]::-webkit-outer-spin-button { -webkit-appearance: none; }
        input[type=number] { -moz-appearance: textfield; }
        @media (max-width: 640px) {
          .cat-grid { grid-template-columns: repeat(3, 1fr) !important; }
        }
      `}</style>
    </OrganizerLayout>
  );
}

export default OrganizerCreateEvent;