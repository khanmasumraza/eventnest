import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

/* ── 200+ colleges ── */
const ALL_COLLEGES = [
  "IIT Bombay","IIT Delhi","IIT Madras","IIT Kharagpur","IIT Roorkee","IIT Kanpur","IIT Guwahati","IIT Hyderabad","IIT Indore","IIT Jodhpur",
  "NIT Trichy","NIT Surathkal","NIT Warangal","NIT Calicut","NIT Rourkela","NIT Allahabad","NIT Nagpur","NIT Jaipur","NIT Surat","NIT Patna",
  "BITS Pilani","BITS Goa","BITS Hyderabad",
  "Mumbai University","Delhi University","Pune University","Osmania University","Anna University","Bangalore University","Calcutta University",
  "VJTI Mumbai","SPIT Mumbai","DJSCE Mumbai","KJ Somaiya College of Engineering","Sardar Patel College of Engineering","Fr. Conceicao Rodrigues College",
  "Thakur College of Engineering and Technology","Thakur Institute of Management Studies and Research","Thadomal Shahani Engineering College",
  "Atharva College of Engineering","Atharva Institute of Management Studies","Atharva School of Business",
  "NMIMS Mumbai","NMIMS Navi Mumbai","NMIMS Indore","NMIMS Bangalore","NMIMS Hyderabad",
  "Symbiosis Institute of Technology","Symbiosis Institute of Business Management","Symbiosis International University",
  "COEP Pune","PICT Pune","VIT Pune","MIT Pune","Sinhgad College of Engineering","MAEER MIT College","DY Patil College of Engineering Pune",
  "VIT Vellore","VIT Chennai","VIT Bhopal","VIT AP",
  "SRM University Chennai","SRM University Delhi-NCR","SRM University Amaravati",
  "Amity University Noida","Amity University Mumbai","Amity University Gurgaon",
  "Manipal Institute of Technology","Manipal University Jaipur","Manipal University Dubai",
  "LPU Jalandhar","Chandigarh University","Thapar University",
  "IIIT Hyderabad","IIIT Bangalore","IIIT Delhi","IIIT Allahabad","IIIT Pune","IIIT Gwalior",
  "IIM Ahmedabad","IIM Bangalore","IIM Calcutta","IIM Lucknow","IIM Kozhikode","IIM Indore","IIM Shillong",
  "XLRI Jamshedpur","SPJIMR Mumbai","MDI Gurgaon","IMT Ghaziabad","Great Lakes Chennai",
  "Jadavpur University","Presidency University Kolkata","IIEST Shibpur",
  "Osmania University Hyderabad","Andhra University","Sri Venkateswara University",
  "University of Hyderabad","JNTU Hyderabad","JNTU Kakinada",
  "RVCE Bangalore","PES University Bangalore","BMS College of Engineering","MS Ramaiah Institute of Technology",
  "Christ University Bangalore","Jain University Bangalore",
  "Fergusson College Pune","Abasaheb Garware College","SP College Pune",
  "St. Xavier's College Mumbai","Jai Hind College Mumbai","HR College Mumbai","Mithibai College Mumbai","Ruia College Mumbai",
  "Hansraj College Delhi","Miranda House Delhi","Kirori Mal College Delhi","Ramjas College Delhi","LSR College Delhi",
  "IIT (ISM) Dhanbad","ISM University of Management and Technology",
  "Nirma University Ahmedabad","PDPU Ahmedabad","GLS University Ahmedabad","Ahmedabad University",
  "KIIT University Bhubaneswar","SOA University Bhubaneswar",
  "Tata Institute of Fundamental Research","TISS Mumbai","TISS Hyderabad",
  "PSG College of Technology Coimbatore","Coimbatore Institute of Technology","REC Coimbatore",
  "College of Engineering Guindy","SSN College of Engineering Chennai","Saveetha Engineering College",
  "SASTRA University","Shanmugha Arts Science Technology and Research Academy",
  "DCE Delhi","Netaji Subhas University of Technology","Guru Gobind Singh Indraprastha University",
  "National Institute of Fashion Technology","NIFT Mumbai","NIFT Delhi","NIFT Bangalore",
  "National Institute of Design Ahmedabad","Pearl Academy",
  "Woxsen University","OP Jindal University","Ashoka University","Shiv Nadar University","Azim Premji University",
  "Harvard University","MIT Massachusetts","Stanford University","Oxford University","Cambridge University",
  "University of Toronto","University of Melbourne","National University of Singapore","ETH Zurich",
  "Other"
]

const batchYears = ["2018","2019","2020","2021","2022","2023","2024","2025","2026"]

const interestTags = [
  "AI","Hackathons","Startup","Music","Gaming",
  "Workshops","Tech Talks","Networking","Sports","Art",
  "Coding","Blockchain","Web3","ML/AI","Design"
]

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .pf-root * { box-sizing: border-box; }
  .pf-root { font-family: 'Plus Jakarta Sans', sans-serif; }
  .pf-mono { font-family: 'DM Mono', monospace; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .pf-tab {
    background: none; border: none; cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: color .15s ease;
    padding: 12px 20px;
    font-size: 13px; font-weight: 600;
    white-space: nowrap;
    border-bottom: 2px solid transparent;
  }

  .pf-input {
    display: block;
    width: 100%;
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 11px;
    padding: 12px 14px;
    color: #f0f4ff;
    font-size: 13px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500;
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease;
    -webkit-text-fill-color: #f0f4ff;
  }
  .pf-input:focus {
    border-color: rgba(99,102,241,.5);
    box-shadow: 0 0 0 3px rgba(99,102,241,.08);
    background: #0f1623;
  }
  .pf-input:disabled {
    -webkit-text-fill-color: #374151;
    color: #374151;
    cursor: not-allowed;
  }
  .pf-input::placeholder { color: #374151; -webkit-text-fill-color: #374151; }
  .pf-input:-webkit-autofill,
  .pf-input:-webkit-autofill:hover,
  .pf-input:-webkit-autofill:focus {
    -webkit-box-shadow: 0 0 0px 1000px #0f1623 inset !important;
    -webkit-text-fill-color: #f0f4ff !important;
    caret-color: #f0f4ff;
  }

  .pf-select {
    display: block; width: 100%;
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 11px;
    padding: 12px 14px;
    color: #f0f4ff;
    font-size: 13px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500;
    outline: none;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    transition: border-color .15s ease;
  }
  .pf-select:focus { border-color: rgba(99,102,241,.5); box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
  .pf-select option { background: #0f1623; color: #f0f4ff; }

  .pf-social-row {
    display: flex; align-items: center; gap: 10px;
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 11px;
    padding: 11px 14px;
    transition: border-color .15s ease;
  }
  .pf-social-row:focus-within { border-color: rgba(99,102,241,.5); box-shadow: 0 0 0 3px rgba(99,102,241,.08); }
  .pf-social-input {
    flex: 1; background: transparent; border: none; outline: none;
    color: #d1d5db; font-size: 13px; font-weight: 500;
    font-family: 'Plus Jakarta Sans', sans-serif;
    -webkit-text-fill-color: #d1d5db;
  }
  .pf-social-input::placeholder { color: #374151; -webkit-text-fill-color: #374151; }

  .pf-label {
    display: block;
    font-size: 11px; font-weight: 700;
    letter-spacing: .07em; color: #4b5563;
    text-transform: uppercase; margin-bottom: 7px;
  }

  .pf-save-btn {
    transition: transform .15s ease, box-shadow .2s ease;
    cursor: pointer; border: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .pf-save-btn:hover:not(:disabled) {
    transform: translateY(-1px);
  }
  .pf-save-btn:disabled { opacity: .6; cursor: not-allowed; }

  .pf-college-dropdown {
    position: absolute; z-index: 100; width: 100%; top: calc(100% + 4px);
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.1);
    border-radius: 12px; overflow: hidden;
    box-shadow: 0 16px 40px rgba(0,0,0,.6);
    max-height: 240px; overflow-y: auto;
  }
  .pf-college-opt {
    width: 100%; text-align: left; background: none; border: none; cursor: pointer;
    padding: 10px 14px; font-size: 13px; color: #9ca3af; font-weight: 500;
    font-family: 'Plus Jakarta Sans', sans-serif;
    display: flex; align-items: center; gap: 8px;
    transition: background .1s ease, color .1s ease;
  }
  .pf-college-opt:hover { background: rgba(99,102,241,.1); color: #f0f4ff; }

  .pf-error { font-size: 11px; color: #f87171; margin-top: 5px; font-weight: 600; }
  .pf-valid { font-size: 11px; color: #43e8b0; margin-top: 5px; font-weight: 600; }

  .pf-stat-card {
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 14px; padding: 18px 20px;
    transition: border-color .2s ease, transform .2s ease;
  }
  .pf-stat-card:hover { border-color: rgba(99,102,241,.25); transform: translateY(-2px); }

  .pf-activity-row {
    display: flex; align-items: flex-start; gap: 12px;
    padding: 14px 16px;
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 14px;
    transition: border-color .15s ease;
  }
  .pf-activity-row:hover { border-color: rgba(99,102,241,.2); }

  .pf-interest-tag {
    border: none; cursor: pointer;
    font-family: 'Plus Jakarta Sans', sans-serif;
    transition: all .15s ease;
    padding: 9px 18px; border-radius: 99px;
    font-size: 13px; font-weight: 600;
  }
  .pf-interest-tag:hover { transform: translateY(-1px); }

  @media (max-width: 640px) {
    .pf-grid-2 { grid-template-columns: 1fr !important; }
    .pf-stats-grid { grid-template-columns: 1fr 1fr !important; }
  }
`

function Profile() {
  const navigate    = useNavigate()
  const { user, logout, login } = useAuth()

  const [activeTab, setActiveTab]         = useState('profile')
  const [loading, setLoading]             = useState(false)
  const [fetching, setFetching]           = useState(true)
  const [buttonState, setButtonState]     = useState('idle')
  const [successMessage, setSuccessMessage] = useState(false)
  const [profilePhoto, setProfilePhoto]   = useState(null)
  const [photoPreview, setPhotoPreview]   = useState('')
  const [errors, setErrors]               = useState({})
  const [collegeQuery, setCollegeQuery]   = useState('')
  const [collegeSuggestions, setCollegeSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions]       = useState(false)
  const [savedData, setSavedData] = useState(null)
  const collegeRef  = useRef(null)

  const [stats] = useState({ eventsAttended: 12, eventsHosted: 3, followers: 45, following: 18 })
  const [activities] = useState([
    { id: 1, text: "Registered for AI Hackathon",  time: "2 hours ago", type: "register" },
    { id: 2, text: "Attended Startup Meetups",      time: "1 day ago",   type: "attend"   },
    { id: 3, text: "Hosted Web3 Workshop",          time: "3 days ago",  type: "host"     },
  ])

  const [formData, setFormData] = useState({
    name: '', phone: '', college: '', batch: '',
    bio: '', linkedin: '', twitter: '', instagram: '', website: '',
    interests: [],
  })

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    const source = savedData || user
    setFormData({
      name:      source.name      || '',
      phone:     source.phone     || '',
      college:   source.college   || '',
      batch:     source.batch     || '',
      bio:       source.bio       || '',
      linkedin:  source.linkedin  || '',
      twitter:   source.twitter   || '',
      instagram: source.instagram || '',
      website:   source.website   || '',
      interests: source.interests || [],
    })
    setCollegeQuery(source.college || '')
    setPhotoPreview(source.profilePhoto || user?.profilePhoto || '')
    setTimeout(() => setFetching(false), 500)
  }, [user, navigate, savedData])

  useEffect(() => {
    const handler = (e) => {
      if (collegeRef.current && !collegeRef.current.contains(e.target))
        setShowSuggestions(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  /* ── local college search — instant, no API needed ── */
  const searchColleges = useCallback((q) => {
    if (!q || q.length < 1) { setCollegeSuggestions([]); setShowSuggestions(false); return }
    const filtered = ALL_COLLEGES.filter(c =>
      c.toLowerCase().includes(q.toLowerCase())
    ).slice(0, 8)
    setCollegeSuggestions(filtered)
    setShowSuggestions(filtered.length > 0)
  }, [])

  const handleCollegeInput = (e) => {
    const val = e.target.value
    setCollegeQuery(val)
    setFormData(f => ({ ...f, college: val }))
    searchColleges(val)
  }

  const handleCollegeSelect = (name) => {
    setCollegeQuery(name)
    setFormData(f => ({ ...f, college: name }))
    setShowSuggestions(false)
    setErrors(e => ({ ...e, college: '' }))
  }

  const validateName    = v => (!v || v.length < 3) ? 'At least 3 characters' : !/^[A-Za-z\s]+$/.test(v) ? 'Letters only' : ''
  const validatePhone   = v => !v ? '' : !/^\d+$/.test(v) ? 'Digits only' : v.length !== 10 ? 'Must be 10 digits' : ''
  const validateCollege = v => (!v || v.length < 2) ? 'At least 2 characters' : ''

  const handleChange = (e) => {
    const { name, value } = e.target
    let val = value
    if (name === 'name')  val = value.replace(/[^A-Za-z\s]/g, '')
    if (name === 'phone') val = value.replace(/[^0-9]/g, '').slice(0, 10)
    setFormData(f => ({ ...f, [name]: val }))
    let err = ''
    if (name === 'name')  err = validateName(val)
    if (name === 'phone') err = validatePhone(val)
    setErrors(e => ({ ...e, [name]: err }))
  }

  const handleInterestToggle = (tag) => {
    const cur = formData.interests || []
    setFormData(f => ({
      ...f,
      interests: cur.includes(tag) ? cur.filter(i => i !== tag) : [...cur, tag],
    }))
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files[0]
    if (file) { setProfilePhoto(file); setPhotoPreview(URL.createObjectURL(file)) }
  }

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) e.preventDefault()
    const nameErr    = validateName(formData.name)
    const phoneErr   = validatePhone(formData.phone)
    const collegeErr = validateCollege(formData.college)
    setErrors({ name: nameErr, phone: phoneErr, college: collegeErr })
    if (nameErr || phoneErr || collegeErr) return

    setLoading(true)
    setButtonState('saving')
    try {
      await api.put('/auth/profile', {
        name: formData.name, phone: formData.phone,
        college: formData.college, batch: formData.batch,
        bio: formData.bio, linkedin: formData.linkedin,
        twitter: formData.twitter, instagram: formData.instagram,
        website: formData.website, interests: formData.interests,
      })
      if (profilePhoto) {
        const fd = new FormData()
        fd.append('profilePhoto', profilePhoto)
        await api.post('/auth/upload-photo', fd, { headers: { 'Content-Type': 'multipart/form-data' } })
      }
      // Refresh AuthContext with latest user data
      try {
        const token = localStorage.getItem('token')
        if (token) await login(token)
      } catch (e) {}

      setSavedData({ ...formData })
      setButtonState('saved')
      setSuccessMessage(true)
      setTimeout(() => { setSuccessMessage(false); setButtonState('idle') }, 2500)
    } catch (err) {
      console.error('Profile update failed:', err)
      setButtonState('idle')
    } finally {
      setLoading(false)
    }
  }

  const getAvatarUrl = () => {
    if (photoPreview) return photoPreview
    if (user?.profilePhoto) return user.profilePhoto
    return `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=6366f1&color=fff&size=150`
  }

  const completion = (() => {
    let c = 0
    if (formData.name)                c += 10
    if (formData.phone?.length === 10) c += 15
    if (formData.college)             c += 20
    if (formData.batch)               c += 10
    if (formData.bio)                 c += 10
    if (photoPreview)                 c += 20
    if (stats.eventsAttended > 0)     c += 15
    return c
  })()

  if (!user) return null

  if (fetching) {
    return (
      <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 40, height: 40, border: "3px solid rgba(99,102,241,.15)", borderTop: "3px solid #6366f1", borderRadius: "50%", animation: "spin .8s linear infinite" }} />
      </div>
    )
  }

  return (
    <>
      <style>{STYLES}</style>
      <div className="pf-root" style={{ minHeight: "100vh", background: "#080c14" }}>

        {/* ══ HEADER ══ */}
        <div style={{
          background: "#0f1623",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          padding: "28px 0 0",
        }}>
          <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px" }}>

            {/* Avatar + info row */}
            <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 20, flexWrap: "wrap" }}>

              {/* Avatar */}
              <label style={{ cursor: "pointer", flexShrink: 0, position: "relative" }}>
                <img
                  src={getAvatarUrl()}
                  alt={user.name}
                  style={{
                    width: 72, height: 72, borderRadius: "50%",
                    objectFit: "cover",
                    border: "2px solid rgba(99,102,241,.35)",
                    display: "block",
                  }}
                />
                <div style={{
                  position: "absolute", inset: 0, borderRadius: "50%",
                  background: "rgba(0,0,0,.55)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  opacity: 0, transition: "opacity .15s",
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = 1}
                  onMouseLeave={e => e.currentTarget.style.opacity = 0}
                >
                  <svg width="18" height="18" fill="none" stroke="#fff" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <input type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: "none" }} />
              </label>

              {/* Name + email + role */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3, flexWrap: "wrap" }}>
                  <h1 style={{ fontSize: 20, fontWeight: 800, color: "#f0f4ff", margin: 0 }}>
                    {user.name}
                  </h1>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: ".07em",
                    color: "#6366f1", background: "rgba(99,102,241,.12)",
                    border: "1px solid rgba(99,102,241,.2)",
                    padding: "2px 9px", borderRadius: 99, textTransform: "uppercase",
                  }}>
                    {user.role}
                  </span>
                </div>
                <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 10px", fontWeight: 500 }}>
                  {user.email}
                </p>
                {/* Completion */}
                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <div style={{ width: 140, height: 4, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
                    <div style={{
                      width: `${completion}%`, height: "100%",
                      background: completion === 100 ? "#43e8b0" : "#6366f1",
                      borderRadius: 99, transition: "width .6s ease",
                    }} />
                  </div>
                  <span className="pf-mono" style={{ fontSize: 11, color: completion === 100 ? "#43e8b0" : "#6366f1", fontWeight: 600 }}>
                    {completion}%
                  </span>
                  <span style={{ fontSize: 11, color: "#374151", fontWeight: 500 }}>
                    {completion === 100 ? "Complete 🎉" : "profile completion"}
                  </span>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display: "flex", overflowX: "auto", gap: 0 }}>
              {['profile', 'stats', 'interests', 'activity'].map(tab => (
                <button
                  key={tab}
                  className="pf-tab"
                  onClick={() => setActiveTab(tab)}
                  style={{
                    color: activeTab === tab ? "#f0f4ff" : "#4b5563",
                    borderBottom: activeTab === tab ? "2px solid #6366f1" : "2px solid transparent",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ CONTENT ══ */}
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "28px 24px 64px" }}>

          {/* Success */}
          <AnimatePresence>
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{
                  marginBottom: 20, padding: "12px 18px",
                  background: "rgba(67,232,176,.08)", border: "1px solid rgba(67,232,176,.2)",
                  borderRadius: 12, color: "#43e8b0", fontSize: 13, fontWeight: 600,
                  display: "flex", alignItems: "center", gap: 8,
                }}
              >
                ✓ Profile updated successfully!
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── PROFILE TAB ── */}
          {activeTab === 'profile' && (
            <motion.form onSubmit={handleSubmit} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 18 }}
            >
              {/* Name + Phone */}
              <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div>
                  <label className="pf-label">Name *</label>
                  <input className="pf-input" type="text" name="name" value={formData.name} onChange={handleChange} placeholder="Your full name"
                    style={{ borderColor: errors.name ? "rgba(248,113,113,.5)" : undefined }}
                  />
                  {errors.name && <p className="pf-error">{errors.name}</p>}
                </div>
                <div>
                  <label className="pf-label">Phone</label>
                  <input className="pf-input" type="tel" name="phone" value={formData.phone} onChange={handleChange} placeholder="10-digit number" maxLength={10}
                    style={{ borderColor: errors.phone ? "rgba(248,113,113,.5)" : undefined }}
                  />
                  {errors.phone && <p className="pf-error">{errors.phone}</p>}
                  {formData.phone && !errors.phone && formData.phone.length === 10 && <p className="pf-valid">✓ Valid</p>}
                </div>
              </div>

              {/* College + Batch */}
              <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <div ref={collegeRef} style={{ position: "relative" }}>
                  <label className="pf-label">College / Institution *</label>
                  <input
                    className="pf-input"
                    type="text"
                    value={collegeQuery}
                    onChange={handleCollegeInput}
                    onFocus={() => collegeQuery.length >= 1 && searchColleges(collegeQuery)}
                    placeholder="Search college..."
                    autoComplete="off"
                    style={{ borderColor: errors.college ? "rgba(248,113,113,.5)" : undefined }}
                  />
                  {errors.college && <p className="pf-error">{errors.college}</p>}
                  <AnimatePresence>
                    {showSuggestions && collegeSuggestions.length > 0 && (
                      <motion.div className="pf-college-dropdown"
                        initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      >
                        {collegeSuggestions.map((name, i) => (
                          <button key={i} type="button" className="pf-college-opt" onClick={() => handleCollegeSelect(name)}>
                            <span style={{ fontSize: 14 }}>🎓</span>
                            <span>{name}</span>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div>
                  <label className="pf-label">Batch / Year</label>
                  <div style={{ position: "relative" }}>
                    <select className="pf-select" name="batch" value={formData.batch} onChange={handleChange}>
                      <option value="">Select year</option>
                      {batchYears.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <div style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      pointerEvents: "none", color: "#4b5563",
                    }}>
                      <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div>
                <label className="pf-label">Bio</label>
                <textarea className="pf-input" name="bio" value={formData.bio} onChange={handleChange}
                  rows={3} placeholder="Tell us about yourself…" style={{ resize: "none" }}
                />
              </div>

              {/* Social */}
              <div>
                <label className="pf-label" style={{ marginBottom: 10 }}>Social Links</label>
                <div className="pf-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  <div className="pf-social-row">
                    <svg width="15" height="15" fill="#3b82f6" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
                    <input className="pf-social-input" type="text" name="linkedin" value={formData.linkedin} onChange={handleChange} placeholder="LinkedIn URL" />
                  </div>
                  <div className="pf-social-row">
                    <svg width="15" height="15" fill="#38bdf8" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
                    <input className="pf-social-input" type="text" name="twitter" value={formData.twitter} onChange={handleChange} placeholder="Twitter handle" />
                  </div>
                  <div className="pf-social-row">
                    <svg width="15" height="15" fill="#ec4899" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    <input className="pf-social-input" type="text" name="instagram" value={formData.instagram} onChange={handleChange} placeholder="Instagram handle" />
                  </div>
                  <div className="pf-social-row">
                    <svg width="15" height="15" fill="none" stroke="#818cf8" strokeWidth="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>
                    <input className="pf-social-input" type="text" name="website" value={formData.website} onChange={handleChange} placeholder="Website URL" />
                  </div>
                </div>
              </div>

              {/* Save */}
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 4 }}>
                <button type="submit" disabled={loading || buttonState === 'saved'} className="pf-save-btn"
                  style={{
                    padding: "12px 32px",
                    background: buttonState === 'saved' ? "#43e8b0" : "#6366f1",
                    borderRadius: 12,
                    color: buttonState === 'saved' ? "#080c14" : "#fff",
                    fontSize: 13, fontWeight: 700,
                    boxShadow: "0 4px 16px rgba(99,102,241,.3)",
                  }}
                >
                  {buttonState === 'idle' && 'Save Changes'}
                  {buttonState === 'saving' && 'Saving…'}
                  {buttonState === 'saved'  && '✓ Saved'}
                </button>
              </div>
            </motion.form>
          )}

          {/* ── STATS TAB ── */}
          {activeTab === 'stats' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="pf-stats-grid"
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}
            >
              {[
                { label: "Attended",  value: stats.eventsAttended, icon: "🗓", accent: "#6366f1" },
                { label: "Hosted",    value: stats.eventsHosted,   icon: "🎪", accent: "#43e8b0" },
                { label: "Followers", value: stats.followers,      icon: "👥", accent: "#8b5cf6" },
                { label: "Following", value: stats.following,      icon: "➕", accent: "#f59e0b" },
              ].map((s, i) => (
                <motion.div key={s.label} className="pf-stat-card"
                  initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.07 }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 10,
                    background: `${s.accent}12`, border: `1px solid ${s.accent}25`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, marginBottom: 12,
                  }}>{s.icon}</div>
                  <div className="pf-mono" style={{ fontSize: 26, fontWeight: 800, color: "#f0f4ff", lineHeight: 1, marginBottom: 5 }}>
                    {s.value}
                  </div>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".06em", color: "#4b5563", textTransform: "uppercase" }}>
                    {s.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {/* ── INTERESTS TAB ── */}
          {activeTab === 'interests' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 20, fontWeight: 500 }}>
                Select topics you care about — we'll personalize your event feed.
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {interestTags.map(tag => {
                  const selected = (formData.interests || []).includes(tag)
                  return (
                    <button key={tag} className="pf-interest-tag" onClick={() => handleInterestToggle(tag)}
                      style={{
                        color: selected ? "#f0f4ff" : "#6b7280",
                        background: selected ? "#6366f1" : "rgba(255,255,255,.04)",
                        border: selected ? "1px solid rgba(99,102,241,.5)" : "1px solid rgba(255,255,255,.07)",
                        boxShadow: selected ? "0 2px 12px rgba(99,102,241,.3)" : "none",
                      }}
                    >
                      {selected && "✓ "}{tag}
                    </button>
                  )
                })}
              </div>
              <div style={{ marginTop: 24, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={handleSubmit} className="pf-save-btn"
                  style={{ padding: "11px 28px", background: "#6366f1", borderRadius: 11, color: "#fff", fontSize: 13, fontWeight: 700, boxShadow: "0 4px 16px rgba(99,102,241,.3)" }}
                >
                  Save Interests
                </button>
              </div>
            </motion.div>
          )}

          {/* ── ACTIVITY TAB ── */}
          {activeTab === 'activity' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              style={{ display: "flex", flexDirection: "column", gap: 10 }}
            >
              {activities.map((a, i) => (
                <motion.div key={a.id} className="pf-activity-row"
                  initial={{ opacity: 0, x: -14 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 }}
                >
                  <div style={{
                    width: 38, height: 38, borderRadius: 11, flexShrink: 0,
                    background: a.type === 'register' ? "rgba(99,102,241,.12)" : a.type === 'attend' ? "rgba(67,232,176,.1)" : "rgba(245,158,11,.1)",
                    border: a.type === 'register' ? "1px solid rgba(99,102,241,.2)" : a.type === 'attend' ? "1px solid rgba(67,232,176,.2)" : "1px solid rgba(245,158,11,.2)",
                    display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17,
                  }}>
                    {a.type === 'register' ? '🎫' : a.type === 'attend' ? '✅' : '🎉'}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: "#d1d5db", margin: "0 0 3px" }}>{a.text}</p>
                    <p style={{ fontSize: 11, color: "#374151", margin: 0, fontWeight: 500 }}>{a.time}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

        </div>
      </div>
    </>
  )
}

export default Profile