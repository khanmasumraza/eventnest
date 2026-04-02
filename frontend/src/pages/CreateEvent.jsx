import React, { useState } from 'react'
import axios from 'axios'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_URL = 'http://localhost:5000/api'

// Step labels
const STEPS = ['Basics', 'When & Where', 'Tickets', 'Details', 'Publish']

function CreateEvent() {
  const navigate = useNavigate()
  const { user, token } = useAuth()

  const [step, setStep]               = useState(1)
  const [completedSteps, setCompleted] = useState([])   // ✅ track completed steps
  const [loading, setLoading]         = useState(false)
  const [error, setError]             = useState('')     // ✅ only set on Next click, not on typing

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: 'Workshop',
    date: '',
    time: '10:00 AM',
    venue: '',
    city: '',
    bannerUrl: '',
    capacity: 100,
    price: 0,
    organizerDetails: { name: '', contact: '', description: '' },
    requiredFields: ['name', 'email'],
    schedule: []
  })

  const attendeeFields = [
    { key: 'name',    label: 'Full Name',           required: true },
    { key: 'email',   label: 'Email Address',        required: true },
    { key: 'phone',   label: 'Phone Number',         required: false },
    { key: 'college', label: 'College/Institution',  required: false },
    { key: 'batch',   label: 'Batch/Year',           required: false }
  ]

  const categories = ['Hackathon','Fest','Workshop','Conference','Cultural','Sports','Meetup','Other']
  const timeSlots  = ['09:00 AM','10:00 AM','11:00 AM','12:00 PM','01:00 PM','02:00 PM','03:00 PM','04:00 PM','05:00 PM','06:00 PM']

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('organizer.')) {
      const field = name.split('.')[1]
      setFormData({ ...formData, organizerDetails: { ...formData.organizerDetails, [field]: value } })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleFieldToggle = (field) => {
    if (field === 'name' || field === 'email') return
    const fields = formData.requiredFields
    setFormData({
      ...formData,
      requiredFields: fields.includes(field)
        ? fields.filter(f => f !== field)
        : [...fields, field]
    })
  }

  const addScheduleItem = () => {
    setFormData({ ...formData, schedule: [...formData.schedule, { time: '', title: '', description: '' }] })
  }

  const updateScheduleItem = (index, field, value) => {
    const s = [...formData.schedule]
    s[index][field] = value
    setFormData({ ...formData, schedule: s })
  }

  const removeScheduleItem = (index) => {
    setFormData({ ...formData, schedule: formData.schedule.filter((_, i) => i !== index) })
  }

  // ✅ Validation only runs on Next click, not on typing
  const validateStep = (s) => {
    switch (s) {
      case 1:
        if (!formData.title || formData.title.length < 5)
          return 'Title must be at least 5 characters'
        if (!formData.description || formData.description.length < 20)
          return 'Description must be at least 20 characters'
        return null
      case 2:
        if (!formData.date || new Date(formData.date) <= new Date())
          return 'Event date must be in the future'
        if (!formData.venue)  return 'Venue is required'
        if (!formData.city)   return 'City is required'
        return null
      case 3:
        if (formData.capacity < 1 || formData.capacity > 10000)
          return 'Capacity must be between 1 and 10,000'
        if (formData.price < 0)
          return 'Price cannot be negative'
        return null
      default:
        return null
    }
  }

  const nextStep = () => {
    const err = validateStep(step)
    if (err) { setError(err); return }
    setError('')
    // ✅ Mark current step as completed
    if (!completedSteps.includes(step)) {
      setCompleted([...completedSteps, step])
    }
    setStep(step + 1)
  }

  const prevStep = () => {
    setStep(step - 1)
    setError('')
  }

  // ✅ Allow clicking step number only if already completed or current
  const handleStepClick = (s) => {
    if (s === step) return
    if (completedSteps.includes(s) || s < step) {
      setError('')
      setStep(s)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${API_URL}/events`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
      })
      if (res.status === 201) {
        alert('Event created successfully!')
        navigate(`/event/${res.data._id}`)
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating event')
    } finally {
      setLoading(false)
    }
  }

  if (!user || user.role !== 'organiser') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">Only organizers can create events.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white py-12">
      <div className="max-w-3xl mx-auto px-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Create New Event</h1>
          <p className="text-slate-400">Fill in the details to create your event</p>
        </motion.div>

        {/* ✅ 5-step Progress Bar with clickable completed steps */}
        <div className="flex justify-center mb-12">
          {STEPS.map((label, idx) => {
            const s         = idx + 1
            const isDone    = completedSteps.includes(s)
            const isCurrent = step === s
            const isClickable = isDone || s < step

            return (
              <div key={s} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    onClick={() => handleStepClick(s)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all
                      ${isCurrent  ? 'bg-indigo-500 text-white ring-4 ring-indigo-500/30' : ''}
                      ${isDone && !isCurrent ? 'bg-indigo-500 text-white' : ''}
                      ${!isDone && !isCurrent ? 'bg-slate-800 text-slate-400' : ''}
                      ${isClickable ? 'cursor-pointer hover:scale-105' : 'cursor-default'}
                    `}
                  >
                    {isDone && !isCurrent
                      ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      : s
                    }
                  </div>
                  <span className={`text-[10px] mt-1.5 font-medium ${isCurrent ? 'text-indigo-400' : isDone ? 'text-indigo-400' : 'text-slate-600'}`}>
                    {label}
                  </span>
                </div>
                {s < STEPS.length && (
                  <div className={`w-12 h-1 mx-2 mb-5 rounded ${isDone ? 'bg-indigo-500' : 'bg-slate-800'}`} />
                )}
              </div>
            )
          })}
        </div>

        {/* Error — only shows after clicking Next */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          <AnimatePresence mode="wait">

            {/* ── Step 1: Basics ── */}
            {step === 1 && (
              <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
                <div className="space-y-6">
                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Event Banner</label>
                    <div className="w-full h-36 border-2 border-dashed border-slate-700 rounded-xl flex flex-col items-center justify-center gap-2 bg-slate-800/50">
                      <span className="text-2xl">🖼️</span>
                      <p className="text-slate-400 text-sm">Upload event banner</p>
                      <p className="text-slate-600 text-xs">1200 × 628px recommended · JPG, PNG</p>
                    </div>
                    <input
                      type="url"
                      name="bannerUrl"
                      value={formData.bannerUrl}
                      onChange={handleChange}
                      placeholder="Or paste banner image URL"
                      className="w-full mt-3 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                    />
                    {formData.bannerUrl && (
                      <img src={formData.bannerUrl} alt="Preview" className="mt-3 w-full h-48 object-cover rounded-lg" />
                    )}
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Event Title *</label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      placeholder="Give your event a name that sells itself"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Category *</label>
                    <div className="grid grid-cols-4 gap-3">
                      {categories.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => setFormData({ ...formData, category: cat })}
                          className={`py-3 rounded-xl text-sm font-medium transition-all border ${
                            formData.category === cat
                              ? 'bg-indigo-500/20 border-indigo-500 text-indigo-300'
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-500'
                          }`}
                        >
                          {cat}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Description *</label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={4}
                      placeholder="What will attendees experience? What should they bring? What's the vibe?"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                    />
                    <p className="text-xs text-slate-500 mt-1">{formData.description.length} / 20 min characters</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 2: When & Where ── */}
            {step === 2 && (
              <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-6">When & Where</h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Date *</label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        min={new Date().toISOString().split('T')[0]}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Time</label>
                      <select
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        {timeSlots.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">Venue *</label>
                    <input
                      type="text"
                      name="venue"
                      value={formData.venue}
                      onChange={handleChange}
                      placeholder="Enter venue address"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm text-slate-400 mb-2">City *</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      placeholder="Enter city"
                      className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 3: Tickets ── */}
            {step === 3 && (
              <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-6">Tickets</h2>
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Capacity *</label>
                      <input
                        type="number"
                        name="capacity"
                        value={formData.capacity}
                        onChange={handleChange}
                        min="1"
                        max="10000"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Max: 10,000 attendees</p>
                    </div>
                    <div>
                      <label className="block text-sm text-slate-400 mb-2">Ticket Price (₹)</label>
                      <input
                        type="number"
                        name="price"
                        value={formData.price}
                        onChange={handleChange}
                        min="0"
                        className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Set 0 for free events</p>
                    </div>
                  </div>

                  {/* Preview */}
                  <div className="bg-slate-800 rounded-xl p-5">
                    <p className="text-sm text-slate-400 mb-2">Ticket preview</p>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{formData.title || 'Your Event'}</span>
                      <span className={`text-xl font-bold ${formData.price > 0 ? 'text-white' : 'text-green-400'}`}>
                        {formData.price > 0 ? `₹${formData.price}` : 'FREE'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{formData.capacity} spots available</p>
                  </div>
                </div>
              </motion.div>
            )}

            {/* ── Step 4: Details (Attendee Fields + Schedule) ── */}
            {step === 4 && (
              <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-2">Attendee Information</h2>
                <p className="text-slate-400 mb-6 text-sm">Select what to collect from attendees during checkout:</p>

                <div className="space-y-3 mb-8">
                  {attendeeFields.map(field => (
                    <label
                      key={field.key}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                        formData.requiredFields.includes(field.key)
                          ? 'bg-indigo-500/10 border-indigo-500/50'
                          : 'bg-slate-800 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={formData.requiredFields.includes(field.key)}
                          onChange={() => handleFieldToggle(field.key)}
                          disabled={field.required}
                          className="w-5 h-5 rounded border-slate-600 bg-slate-700 text-indigo-500 focus:ring-indigo-500"
                        />
                        <span className="font-medium text-sm">{field.label}</span>
                        {field.required && <span className="text-xs text-slate-500">(Required)</span>}
                      </div>
                    </label>
                  ))}
                </div>

                {/* Schedule */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold">Schedule <span className="text-slate-500 text-sm font-normal">(optional)</span></h3>
                    <button
                      type="button"
                      onClick={addScheduleItem}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-500/20 text-indigo-400 rounded-lg text-sm hover:bg-indigo-500/30 transition-colors"
                    >
                      + Add item
                    </button>
                  </div>
                  {formData.schedule.map((item, idx) => (
                    <div key={idx} className="flex gap-3 mb-3">
                      <input
                        type="text"
                        placeholder="Time"
                        value={item.time}
                        onChange={e => updateScheduleItem(idx, 'time', e.target.value)}
                        className="w-28 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <input
                        type="text"
                        placeholder="Title"
                        value={item.title}
                        onChange={e => updateScheduleItem(idx, 'title', e.target.value)}
                        className="flex-1 px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                      <button
                        type="button"
                        onClick={() => removeScheduleItem(idx)}
                        className="px-3 py-2 text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── Step 5: Publish (Summary) ── */}
            {step === 5 && (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-2xl font-semibold mb-2">Ready to Publish?</h2>
                <p className="text-slate-400 mb-6 text-sm">Review your event details before publishing.</p>

                {/* Summary card */}
                <div className="bg-slate-800 rounded-xl p-6 space-y-4">
                  {formData.bannerUrl && (
                    <img src={formData.bannerUrl} alt="Banner" className="w-full h-40 object-cover rounded-lg" />
                  )}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Title</p>
                      <p className="font-medium">{formData.title || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Category</p>
                      <p className="font-medium">{formData.category}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Date & Time</p>
                      <p className="font-medium">{formData.date || '—'} · {formData.time}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Venue</p>
                      <p className="font-medium">{formData.venue || '—'}, {formData.city || '—'}</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Capacity</p>
                      <p className="font-medium">{formData.capacity} seats</p>
                    </div>
                    <div>
                      <p className="text-slate-400 text-xs mb-1">Price</p>
                      <p className={`font-semibold ${formData.price > 0 ? 'text-white' : 'text-green-400'}`}>
                        {formData.price > 0 ? `₹${formData.price}` : 'Free'}
                      </p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs mb-1">Description</p>
                      <p className="font-medium text-slate-300 text-xs leading-relaxed line-clamp-3">{formData.description || '—'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-slate-400 text-xs mb-1">Collecting from attendees</p>
                      <p className="font-medium">{formData.requiredFields.join(', ')}</p>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-slate-500 mt-4 text-center">
                  You can edit this event after publishing from your dashboard.
                </p>
              </motion.div>
            )}

          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                ← Back
              </button>
            ) : <div />}

            {step < 5 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
              >
                Continue →
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg font-medium disabled:opacity-50 hover:opacity-90 transition-opacity"
              >
                {loading ? 'Publishing...' : '🚀 Publish Event'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateEvent