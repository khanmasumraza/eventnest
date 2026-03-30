import React, { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_URL = 'http://localhost:5000/api'

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .ck-root * { box-sizing: border-box; }
  .ck-root { font-family: 'Plus Jakarta Sans', sans-serif; }
  .ck-mono { font-family: 'DM Mono', monospace; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-check {
    0%   { box-shadow: 0 0 0 0 rgba(67,232,176,.4); }
    70%  { box-shadow: 0 0 0 12px rgba(67,232,176,0); }
    100% { box-shadow: 0 0 0 0 rgba(67,232,176,0); }
  }

  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(.75); }
  }

  .ck-fade { animation: fadeUp .4s cubic-bezier(.22,1,.36,1) both; }

  .ck-input {
    width: 100%;
    background: #080c14;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 11px;
    padding: 13px 16px;
    color: #f0f4ff;
    font-size: 14px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500;
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease;
    -webkit-text-fill-color: #f0f4ff;
  }
  .ck-input:focus {
    border-color: rgba(99,102,241,.5);
    box-shadow: 0 0 0 3px rgba(99,102,241,.08);
  }
  .ck-input::placeholder { color: #374151; -webkit-text-fill-color: #374151; }
  .ck-input:-webkit-autofill,
  .ck-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px #080c14 inset !important;
    -webkit-text-fill-color: #f0f4ff !important;
  }

  .ck-label {
    display: block;
    font-size: 11px; font-weight: 700;
    letter-spacing: .07em; color: #4b5563;
    text-transform: uppercase; margin-bottom: 7px;
  }

  .ck-card {
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 18px;
    padding: 28px;
  }

  .ck-btn-primary {
    width: 100%; padding: 15px;
    border: none; border-radius: 13px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 15px; font-weight: 800;
    cursor: pointer;
    transition: transform .15s ease, box-shadow .2s ease, opacity .15s ease;
    display: flex; align-items: center; justify-content: center; gap: 9px;
  }
  .ck-btn-primary:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .ck-btn-primary:disabled { opacity: .55; cursor: not-allowed; }

  .ck-btn-ghost {
    width: 100%; padding: 11px;
    background: none; border: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-size: 13px; font-weight: 600; color: #4b5563;
    cursor: pointer; transition: color .15s ease;
  }
  .ck-btn-ghost:hover { color: #9ca3af; }

  .ck-step-line {
    height: 2px; width: 48px; border-radius: 99px;
    transition: background .3s ease;
  }

  .ck-success-dot {
    animation: pulse-check 1.5s ease-in-out;
  }

  .ck-trust-badge {
    display: flex; align-items: center; gap: 6px;
    font-size: 11px; color: #374151; font-weight: 600;
  }

  @media (max-width: 768px) {
    .ck-grid { grid-template-columns: 1fr !important; }
    .ck-sidebar-sticky { position: static !important; }
  }
`

function Checkout() {
  const { id }       = useParams()
  const navigate     = useNavigate()
  const { user, isAuthenticated } = useAuth()

  const [event, setEvent]           = useState(null)
  const [loading, setLoading]       = useState(true)
  const [processing, setProcessing] = useState(false)
  const [error, setError]           = useState('')
  const [step, setStep]             = useState(1)
  const [btnLoading, setBtnLoading] = useState(false)

  const hasCalledRef = useRef(false)
  useEffect(() => { hasCalledRef.current = false }, [id])

  const [attendeeInfo, setAttendeeInfo] = useState({
    name:    user?.name    || '',
    email:   user?.email   || '',
    phone:   user?.phone   || '',
    college: user?.college || '',
    batch:   user?.batch   || '',
  })

  const [razorpayOrder, setRazorpayOrder] = useState(null)
  const [paymentResult, setPaymentResult] = useState(null)
  const [verifying, setVerifying]         = useState(false)

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: `/event/${id}/checkout` } })
      return
    }
    fetchEvent()
  }, [id, isAuthenticated, navigate])

  const fetchEvent = async () => {
    try {
      const res       = await axios.get(`${API_URL}/events/${id}`)
      const eventData = res.data.event || res.data
      setEvent(eventData)
      if (user) {
        setAttendeeInfo({
          name:    user.name    || '',
          email:   user.email   || '',
          phone:   user.phone   || '',
          college: user.college || '',
          batch:   user.batch   || '',
        })
      }
    } catch (err) {
      setError('Event not found')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setAttendeeInfo({ ...attendeeInfo, [name]: value })
  }

  const validateDetails = () => {
    const requiredFields = event?.requiredFields || ['name', 'email']
    const missing = []
    requiredFields.forEach(field => {
      if (!attendeeInfo[field] || attendeeInfo[field].trim() === '') missing.push(field)
    })
    if (missing.length > 0) { setError(`Please fill in: ${missing.join(', ')}`); return false }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (attendeeInfo.email && !emailRegex.test(attendeeInfo.email)) { setError('Please enter a valid email'); return false }
    setError(''); return true
  }

  const handleRazorpayPayment = async () => {
    if (!validateDetails()) return
    try {
      setProcessing(true); setError('')
      const token = localStorage.getItem('token')
      const res = await axios.post(`${API_URL}/payments/create-order`, { eventId: id, attendeeInfo }, {
        headers: { Authorization: `Bearer ${token}` },
      })
      loadRazorpay()
      setTimeout(() => {
        const options = {
          key: res.data.key,
          amount: res.data.amount,
          currency: res.data.currency,
          name: res.data.name,
          description: res.data.description,
          image: res.data.image,
          order_id: res.data.orderId,
          handler: async function (response) {
            setVerifying(true)
            const verifyRes = await axios.post(`${API_URL}/payments/verify`, {
              razorpay_order_id:  response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              eventId: id,
              attendeeInfo,
            }, { headers: { Authorization: `Bearer ${token}` } })
            console.log('🚀 REDIRECTING TO:', `/ticket/${verifyRes.data.ticketId}`)
            if (verifyRes.data.success) {
              navigate(`/ticket/${verifyRes.data.ticketId}`)
            } else {
              setError('Payment verification failed')
            }
            setVerifying(false)
          },
          prefill: res.data.prefill,
          theme: res.data.theme,
          method: { upi: true, card: false, netbanking: false, wallet: true },
        }
        const rzp = new window.Razorpay(options)
        rzp.open()
      }, 500)
    } catch (err) {
      console.error(err)
      setError(err.response?.data?.message || 'Payment setup failed')
    } finally {
      setProcessing(false)
    }
  }

  const loadRazorpay = useCallback(() => {
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => console.log('Razorpay loaded')
    document.body.appendChild(script)
  }, [])

const proceed = async () => {
  if (hasCalledRef.current) return
  if (!validateDetails()) return

  hasCalledRef.current = true

  try {
    if (isFree) {
      await registerFree()
    } else {
      hasCalledRef.current = false
      setStep(2)
    }
  } catch (err) {
    hasCalledRef.current = false
    setProcessing(false)
  }
}

const registerFree = async () => {
  try {
    setProcessing(true)
    setError('')
    const token = localStorage.getItem('token')
    const res = await axios.post(`${API_URL}/events/${id}/register`, { attendeeInfo }, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    })

    if (res.data?.success) {
      setPaymentResult(res.data)
      setStep(3)
    } else {
      throw new Error('Registration failed')
    }
  } catch (err) {
    console.error(err)
    setError(err.response?.data?.message || 'Registration failed')
    throw err
  } finally {
    setProcessing(false)
  }
}

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    alert('UPI ID copied to clipboard!')
  }

  /* ── LOADING ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,.15)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
        <p style={{ color: "#4b5563", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Loading checkout…</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
        <h2 style={{ color: "#f0f4ff", fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 700 }}>Event not found</h2>
        <Link to="/explore" style={{ color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>Browse Events</Link>
      </div>
    )
  }

  const eventDate  = new Date(event.date)
  const isFree     = event.paymentType === 'free' || !event.ticketPrice || event.ticketPrice === 0
  const requiredFields = event.requiredFields || ['name', 'email']

  const stepLabels = ['Details', 'Payment', 'Confirmed']

  return (
    <>
      <style>{STYLES}</style>

      {/* Verifying overlay */}
      <AnimatePresence>
        {verifying && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{
              position: "fixed", inset: 0, zIndex: 50,
              background: "rgba(8,12,20,.92)",
              display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: 16,
            }}
          >
            <div style={{ width: 48, height: 48, border: "3px solid rgba(99,102,241,.15)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
            <div style={{ textAlign: "center" }}>
              <p style={{ fontSize: 18, fontWeight: 700, color: "#f0f4ff", margin: "0 0 6px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                ✅ Payment successful!
              </p>
              <p style={{ fontSize: 13, color: "#4b5563", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Preparing your ticket…
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="ck-root" style={{ minHeight: "100vh", background: "#080c14", padding: "40px 0 80px" }}>
      <div style={{ maxWidth: 920, margin: "0 auto", padding: "0 24px" }}>

          <div style={{
  textAlign: "center",
  marginBottom: 20,
}}>
  <p style={{
    fontSize: 13, fontWeight: 600,
    color: "#9ca3af", margin: "0 0 5px",
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    overflow: "hidden", textOverflow: "ellipsis",
    whiteSpace: "nowrap", maxWidth: 440,
    marginLeft: "auto", marginRight: "auto",
  }}>
    🎪 {event?.title || "Event Registration"}
  </p>
  <div style={{
    display: "inline-flex", alignItems: "center",
    gap: 6,
    padding: "4px 12px",
    background: "rgba(99,102,241,.08)",
    border: "1px solid rgba(99,102,241,.2)",
    borderRadius: 99,
  }}>
    <div style={{
      width: 5, height: 5, borderRadius: "50%",
      background: "#6366f1",
      boxShadow: "0 0 4px rgba(99,102,241,.8)",
    }} />
    <span style={{
      fontSize: 11, fontWeight: 700,
      letterSpacing: ".07em", color: "#6366f1",
      textTransform: "uppercase",
      fontFamily: "'Plus Jakarta Sans', sans-serif",
    }}>
      {step === 1 && "Step 1 of 3 — Fill your details"}
      {step === 2 && "Step 2 of 3 — Payment"}
      {step === 3 && "Step 3 of 3 — Confirmed"}
    </span>
  </div>
</div>

          {/* ── STEP INDICATOR ── */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 20 }}>
{[1, 2, 3].map((s) => {
                const circleStyle = {
                  width: 32, height: 32, borderRadius: "50%",
                  background: step >= s ? "#6366f1" : "rgba(255,255,255,.05)",
                  border: step >= s ? "none" : "1px solid rgba(255,255,255,.08)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 13, fontWeight: 700,
                  color: step >= s ? "#fff" : "#374151",
                  boxShadow: step === s ? "0 0 16px rgba(99,102,241,.4)" : "none",
                  transition: "all .3s ease",
                };
                return (
                  <React.Fragment key={s}>
                    <div
                      onClick={() => {
                        if (s < step) setStep(s)
                      }}
                      style={{
                        display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
                        cursor: s < step ? "pointer" : "default",
                      }}
                    >
                      <div style={circleStyle}>
                        {step > s ? (
                          <svg width="14" height="14" fill="none" stroke="#fff" strokeWidth="2.5" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : s}
                      </div>
                      <span style={{
                        fontSize: 10, fontWeight: 700, letterSpacing: ".06em",
                        color: step >= s ? "#6366f1" : "#374151",
                        textTransform: "uppercase",
                        transition: "color .3s ease",
                      }}>
                        {stepLabels[s - 1]}
                      </span>
                    </div>
                    {s < 3 && (
                      <div className="ck-step-line" style={{
                        background: step > s ? "#6366f1" : "rgba(255,255,255,.06)",
                        marginBottom: 20,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
          </div>

          {/* ── ERROR ── */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginBottom: 20, padding: "13px 18px",
                  background: "rgba(239,68,68,.08)", border: "1px solid rgba(239,68,68,.2)",
                  borderRadius: 12, color: "#f87171", fontSize: 13, fontWeight: 600,
                  textAlign: "center",
                }}
              >
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── MAIN GRID ── */}
          <div className="ck-grid" style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: 20, alignItems: "start" }}>

            {/* ── LEFT — STEPS ── */}
            <div>
              <AnimatePresence mode="wait">

                {/* STEP 1 — ATTENDEE INFO */}
                {step === 1 && (
                  <motion.div key="step1"
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    className="ck-card"
                  >
                    <div style={{ marginBottom: 24 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f0f4ff", margin: "0 0 4px" }}>
                        Attendee Information
                      </h2>
                      <p style={{ fontSize: 12, color: "#4b5563", margin: 0, fontWeight: 500 }}>
                        Please confirm your details for this event
                      </p>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                      {requiredFields.includes('name') && (
                        <div>
                          <label className="ck-label">Full Name *</label>
                          <input className="ck-input" type="text" name="name" value={attendeeInfo.name} onChange={handleInputChange} placeholder="Your full name" />
                        </div>
                      )}
                      {requiredFields.includes('email') && (
                        <div>
                          <label className="ck-label">Email *</label>
                          <input className="ck-input" type="email" name="email" value={attendeeInfo.email} onChange={handleInputChange} placeholder="your@email.com" />
                        </div>
                      )}
                      {requiredFields.includes('phone') && (
                        <div>
                          <label className="ck-label">Phone Number *</label>
                          <input className="ck-input" type="tel" name="phone" value={attendeeInfo.phone} onChange={handleInputChange} placeholder="10-digit number" />
                        </div>
                      )}
                      {requiredFields.includes('college') && (
                        <div>
                          <label className="ck-label">College / Institution *</label>
                          <input className="ck-input" type="text" name="college" value={attendeeInfo.college} onChange={handleInputChange} placeholder="Your college name" />
                        </div>
                      )}
                      {requiredFields.includes('batch') && (
                        <div>
                          <label className="ck-label">Batch / Year *</label>
                          <input className="ck-input" type="text" name="batch" value={attendeeInfo.batch} onChange={handleInputChange} placeholder="e.g. 2024" />
                        </div>
                      )}
                    </div>

                    <button
                      onClick={proceed}
                      disabled={processing || btnLoading}
                      className="ck-btn-primary"
                      style={{
                        marginTop: 24,
                        background: "#6366f1",
                        color: "#fff",
                        boxShadow: "0 4px 20px rgba(99,102,241,.35)",
                      }}
                    >
                      {processing ? (
                        <>
                          <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
                          Processing…
                        </>
                      ) : (
                        <>Continue →</>
                      )}
                    </button>
                  </motion.div>
                )}

                {/* STEP 2 — PAYMENT */}
                {step === 2 && (
                  <motion.div key="step2"
                    initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
                    className="ck-card"
                  >
                    <div style={{ marginBottom: 24 }}>
                      <h2 style={{ fontSize: 17, fontWeight: 800, color: "#f0f4ff", margin: "0 0 4px" }}>
                        Payment
                      </h2>
                      <p style={{ fontSize: 12, color: "#4b5563", margin: 0, fontWeight: 500 }}>
                        {isFree ? "This is a free event — no payment required" : "Secure payment via Razorpay"}
                      </p>
                    </div>

                    {isFree ? (
                      /* FREE EVENT */
                      <div style={{ textAlign: "center", padding: "24px 0" }}>
                        <div style={{
                          width: 64, height: 64, borderRadius: "50%",
                          background: "rgba(67,232,176,.1)", border: "1px solid rgba(67,232,176,.2)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          margin: "0 auto 16px", fontSize: 28,
                        }}>
                          🎉
                        </div>
                        <h3 style={{ fontSize: 16, fontWeight: 700, color: "#f0f4ff", margin: "0 0 6px" }}>
                          Free Event
                        </h3>
                        <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 24px", lineHeight: 1.6 }}>
                          No payment needed. Click below to complete your registration.
                        </p>
                        <button
                          onClick={registerFree}
                          disabled={processing}
                          className="ck-btn-primary"
                          style={{
                            background: "#43e8b0",
                            color: "#080c14",
                            boxShadow: "0 4px 20px rgba(67,232,176,.3)",
                          }}
                        >
                          {processing ? (
                            <>
                              <div style={{ width: 16, height: 16, border: "2px solid rgba(8,12,20,.2)", borderTop: "2px solid #080c14", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
                              Registering…
                            </>
                          ) : (
                            <>✓ Complete Registration</>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* PAID EVENT — RAZORPAY ONLY */
                      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

                        {/* Amount summary */}
                        <div style={{
                          background: "#080c14",
                          border: "1px solid rgba(255,255,255,.07)",
                          borderLeft: "3px solid #6366f1",
                          borderRadius: "0 14px 14px 0", padding: "20px",
                          display: "flex", alignItems: "center", justifyContent: "space-between",
                        }}>
                          <div>
                            <div style={{
                              width: 6, height: 6, borderRadius: "50%",
                              background: "#43e8b0",
                              animation: "pulse-dot 1.8s ease-in-out infinite",
                              display: "inline-block", marginRight: 6,
                              boxShadow: "0 0 4px rgba(67,232,176,.6)",
                            }} />
                            <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "#4b5563", textTransform: "uppercase", margin: "0 0 5px" }}>
                              Amount Due
                            </p>
                            <p style={{ fontSize: 28, fontWeight: 800, color: "#f0f4ff", margin: 0, fontFamily: "'DM Mono', monospace" }}>
                              ₹{event.ticketPrice}
                            </p>
                          </div>
                          <div style={{
                            width: 48, height: 48, borderRadius: 13,
                            background: "rgba(99,102,241,.15)",
                            border: "1px solid rgba(99,102,241,.2)",
                            display: "flex", alignItems: "center", justifyContent: "center",
                          }}>
                            <svg width="22" height="22" fill="none" 
                              stroke="#a5b4fc" strokeWidth="1.8" 
                              viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round"
                                d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"/>
                            </svg>
                          </div>
                        </div>

                        {/* Payment methods info */}
                        <div style={{
                          background: "#080c14",
                          border: "1px solid rgba(255,255,255,.07)",
                          borderRadius: 14, padding: "16px 20px",
                        }}>
                          <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".07em", color: "#4b5563", textTransform: "uppercase", margin: "0 0 14px" }}>
                            Accepted Payment Methods
                          </p>
                          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                            {["📱 GPay", "📲 PhonePe", "💰 Paytm", "🏦 UPI"].map(m => (
                              <span key={m} style={{
                                fontSize: 12, fontWeight: 600, color: "#6b7280",
                                background: "rgba(255,255,255,.04)",
                                border: "1px solid rgba(255,255,255,.07)",
                                padding: "6px 12px", borderRadius: 99,
                              }}>
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Pay button */}
                        <button
                          onClick={handleRazorpayPayment}
                          disabled={processing}
                          className="ck-btn-primary"
                          style={{
                            background: "#6366f1",
                            color: "#fff",
                            boxShadow: "0 4px 24px rgba(99,102,241,.4)",
                            fontSize: 16,
                            letterSpacing: ".03em",
                          }}
                        >
                          {processing ? (
                            <>
                              <div style={{ width: 18, height: 18, border: "2px solid rgba(255,255,255,.3)", borderTop: "2px solid #fff", borderRadius: "50%", animation: "spin .6s linear infinite" }} />
                              Opening Payment…
                            </>
                          ) : (
                            <>
                              🔒 Pay ₹{event.ticketPrice} Securely
                            </>
                          )}
                        </button>

                        {/* Trust badges */}
                        <div style={{ display: "flex", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
                          <div className="ck-trust-badge">
                            <span>🔒</span> 256-bit SSL
                          </div>
                          <div className="ck-trust-badge">
                            <span>✅</span> Powered by Razorpay
                          </div>
                          <div className="ck-trust-badge">
                            <span>🛡️</span> PCI DSS Secure
                          </div>
                        </div>
                      </div>
                    )}

                    <button onClick={() => setStep(1)} className="ck-btn-ghost" style={{ marginTop: 8 }}>
                      ← Back to Details
                    </button>
                  </motion.div>
                )}

                {/* STEP 3 — CONFIRMATION */}
                {step === 3 && (
                  <motion.div key="step3"
                    initial={{ opacity: 0, scale: .97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}
                    className="ck-card"
                    style={{ textAlign: "center", padding: "40px 28px" }}
                  >
                    <div
                      className="ck-success-dot"
                      style={{
                        width: 72, height: 72, borderRadius: "50%",
                        background: "rgba(67,232,176,.12)",
                        border: "1px solid rgba(67,232,176,.25)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        margin: "0 auto 20px", fontSize: 32,
                      }}
                    >
                      ✅
                    </div>

                    <h3 style={{ fontSize: 20, fontWeight: 800, color: "#f0f4ff", margin: "0 0 8px" }}>
                      {isFree ? 'Registration Complete!' : 'Payment Submitted!'}
                    </h3>
                    <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 24px", lineHeight: 1.6 }}>
                      {isFree
                        ? 'Your ticket has been created successfully.'
                        : 'Payment submitted. Organizer will verify and confirm your ticket.'}
                    </p>

                    {paymentResult?.registration && (
                      <div style={{
                        background: "#080c14",
                        border: "1px solid rgba(255,255,255,.07)",
                        borderRadius: 12, padding: "14px 18px",
                        marginBottom: 24, display: "inline-block",
                      }}>
                        <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#4b5563", textTransform: "uppercase", margin: "0 0 4px" }}>
                          Ticket ID
                        </p>
                        <p className="ck-mono" style={{ fontSize: 14, fontWeight: 700, color: "#6366f1", margin: 0 }}>
                          {paymentResult.registration.ticketId}
                        </p>
                      </div>
                    )}

                    {isFree ? (
                      <button
                        onClick={() => navigate(`/ticket/${paymentResult?.registration?.ticketId}`)}
                        className="ck-btn-primary"
                        style={{ background: "#6366f1", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,.35)" }}
                      >
                        🎫 View My Ticket
                      </button>
                    ) : (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="ck-btn-primary"
                        style={{ background: "#6366f1", color: "#fff", boxShadow: "0 4px 20px rgba(99,102,241,.35)" }}
                      >
                        Go to Dashboard
                      </button>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* ── RIGHT — ORDER SUMMARY ── */}
            <div className="ck-sidebar-sticky" style={{ position: "sticky", top: 96 }}>
              <div className="ck-card" style={{ padding: "22px" }}>
                <p style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#4b5563", textTransform: "uppercase", margin: "0 0 16px" }}>
                  Order Summary
                </p>

                {/* Event thumbnail */}
                <div style={{ display: "flex", gap: 12, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ width: 56, height: 56, borderRadius: 12, overflow: "hidden", flexShrink: 0, background: "#080c14" }}>
                    <img
                      src={event.image || 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=200'}
                      alt={event.title}
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", margin: "0 0 3px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {event.title}
                    </p>
                    <p style={{ fontSize: 11, color: "#4b5563", margin: 0, fontWeight: 500 }}>
                      {eventDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Details */}
                <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 18, paddingBottom: 18, borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  {[
                    { label: "Venue",           value: event.venue || "TBD" },
                    { label: "City",            value: event.city  || "TBD" },
                    { label: "Seats Available", value: event.capacity - event.registered },
                  ].map(row => (
                    <div key={row.label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: "#9ca3af", fontWeight: 600 }}>{row.value}</span>
                    </div>
                  ))}
                </div>

                {/* Total */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "#d1d5db" }}>Total</span>
                  <span className="ck-mono" style={{ fontSize: 22, fontWeight: 800, color: "#f0f4ff" }}>
{isFree ? 'Free' : `₹${event.ticketPrice}`}
                  </span>
                </div>

                {/* Secure note */}
                {!isFree && (
                  <div style={{
                    marginTop: 16, padding: "10px 14px",
                    background: "rgba(67,232,176,.05)", border: "1px solid rgba(67,232,176,.12)",
                    borderRadius: 10, display: "flex", alignItems: "center", gap: 7,
                  }}>
                    <span style={{ fontSize: 14 }}>🔒</span>
                    <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>
                      Secured by Razorpay
                    </span>
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  )
}

export default Checkout