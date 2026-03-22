import React, { useState } from 'react'
import axios from 'axios'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const API_URL = 'http://localhost:5000/api'

function CreateEvent() {
  const navigate = useNavigate()
  const { user, token } = useAuth()
  
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    // Basic Info
    title: '',
    description: '',
    category: 'Workshop',
    
    // Date & Time
    date: '',
    time: '10:00 AM',
    
    // Location
    venue: '',
    city: '',
    
    // Banner
    bannerUrl: '',
    
    // Capacity & Pricing
    capacity: 100,
    price: 0,
    
    // Organizer Details
    organizerDetails: {
      name: '',
      contact: '',
      description: ''
    },
    
    // Required Attendee Fields
    requiredFields: ['name', 'email'],
    
    // Schedule
    schedule: []
  })

  // Available attendee fields
  const attendeeFields = [
    { key: 'name', label: 'Full Name', required: true },
    { key: 'email', label: 'Email Address', required: true },
    { key: 'phone', label: 'Phone Number', required: false },
    { key: 'college', label: 'College/Institution', required: false },
    { key: 'batch', label: 'Batch/Year', required: false }
  ]

  const categories = [
    'Hackathon',
    'Fest',
    'Workshop',
    'Conference',
    'Cultural',
    'Sports',
    'Meetup',
    'Other'
  ]
  const timeSlots = [
    '09:00 AM', '10:00 AM', '11:00 AM', '12:00 PM',
    '01:00 PM', '02:00 PM', '03:00 PM', '04:00 PM', '05:00 PM', '06:00 PM'
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    if (name.startsWith('organizer.')) {
      const field = name.split('.')[1]
      setFormData({
        ...formData,
        organizerDetails: {
          ...formData.organizerDetails,
          [field]: value
        }
      })
    } else {
      setFormData({ ...formData, [name]: value })
    }
  }

  const handleFieldToggle = (field) => {
    const fields = formData.requiredFields
    if (fields.includes(field)) {
      // Don't allow removing name and email
      if (field === 'name' || field === 'email') return
      setFormData({
        ...formData,
        requiredFields: fields.filter(f => f !== field)
      })
    } else {
      setFormData({
        ...formData,
        requiredFields: [...fields, field]
      })
    }
  }

  const addScheduleItem = () => {
    setFormData({
      ...formData,
      schedule: [...formData.schedule, { time: '', title: '', description: '' }]
    })
  }

  const updateScheduleItem = (index, field, value) => {
    const newSchedule = [...formData.schedule]
    newSchedule[index][field] = value
    setFormData({ ...formData, schedule: newSchedule })
  }

  const removeScheduleItem = (index) => {
    const newSchedule = formData.schedule.filter((_, i) => i !== index)
    setFormData({ ...formData, schedule: newSchedule })
  }

  const validateStep = () => {
    switch (step) {
      case 1:
        if (!formData.title || formData.title.length < 5) {
          setError('Title must be at least 5 characters')
          return false
        }
        if (!formData.description || formData.description.length < 20) {
          setError('Description must be at least 20 characters')
          return false
        }
        break
      case 2:
        if (!formData.date || new Date(formData.date) <= new Date()) {
          setError('Event date must be in the future')
          return false
        }
        if (!formData.venue) {
          setError('Venue is required')
          return false
        }
        if (!formData.city) {
          setError('City is required')
          return false
        }
        break
      case 3:
        if (formData.capacity < 1 || formData.capacity > 10000) {
          setError('Capacity must be between 1 and 10,000')
          return false
        }
        if (formData.price < 0) {
          setError('Price cannot be negative')
          return false
        }
        break
      default:
        break
    }
    setError('')
    return true
  }

  const nextStep = () => {
    if (validateStep()) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
    setError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log("🚀 Creating event payload:", formData);

      const res = await axios.post(
        `${API_URL}/events`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      )

      console.log("✅ Event created:", res.data)

      if (res.status === 201) {
        alert('Event created successfully!')
        navigate(`/event/${res.data._id}`)
      }
    } catch (err) {
      console.error("❌ Create event error FULL:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(
        err.response?.data?.message ||
        'Error creating event'
      );
    } finally {
      setLoading(false)
    }
  }

  // Redirect if not organizer
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl font-bold mb-4">Create New Event</h1>
          <p className="text-slate-400">Fill in the details to create your event</p>
        </motion.div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-12">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all ${
                  step >= s
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-800 text-slate-400'
                }`}
              >
                {s}
              </div>
              {s < 4 && (
                <div
                  className={`w-16 h-1 mx-2 rounded ${
                    step > s ? 'bg-indigo-500' : 'bg-slate-800'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400 text-center">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Basic Information</h2>
              
              <div className="space-y-6">
                <div>
                  <label className="block text-sm text-slate-400 mb-2">Event Title *</label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleChange}
                    placeholder="Enter event title"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Description *</label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleChange}
                    rows={4}
                    placeholder="Describe your event (min 20 characters)"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Category</label>
                  <select
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  >
                    {categories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Date & Location */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Date & Location</h2>
              
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
                      {timeSlots.map(time => (
                        <option key={time} value={time}>{time}</option>
                      ))}
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

                <div>
                  <label className="block text-sm text-slate-400 mb-2">Banner Image URL</label>
                  <input
                    type="url"
                    name="bannerUrl"
                    value={formData.bannerUrl}
                    onChange={handleChange}
                    placeholder="https://example.com/banner.jpg"
                    className="w-full px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  {formData.bannerUrl && (
                    <img
                      src={formData.bannerUrl}
                      alt="Banner preview"
                      className="mt-4 w-full h-48 object-cover rounded-lg"
                    />
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 3: Capacity & Pricing */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Capacity & Pricing</h2>
              
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
              </div>
            </motion.div>
          )}

          {/* Step 4: Attendee Fields */}
          {step === 4 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              <h2 className="text-2xl font-semibold mb-6">Attendee Information</h2>
              <p className="text-slate-400 mb-6">Select what information to collect from attendees during checkout:</p>
              
              <div className="space-y-4 mb-8">
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
                      <span className="font-medium">{field.label}</span>
                      {field.required && (
                        <span className="text-xs text-slate-500">(Required)</span>
                      )}
                    </div>
                  </label>
                ))}
              </div>

              {/* Summary */}
              <div className="bg-slate-800 rounded-lg p-6">
                <h3 className="font-semibold mb-4">Event Summary</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-slate-400">Title:</span>
                    <p className="font-medium">{formData.title || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Date:</span>
                    <p className="font-medium">{formData.date || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Venue:</span>
                    <p className="font-medium">{formData.venue || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Capacity:</span>
                    <p className="font-medium">{formData.capacity} seats</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Price:</span>
                    <p className="font-medium">₹{formData.price}</p>
                  </div>
                  <div>
                    <span className="text-slate-400">Fields to collect:</span>
                    <p className="font-medium">{formData.requiredFields.join(', ')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-6 border-t border-slate-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="px-6 py-3 bg-slate-800 hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="px-6 py-3 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="px-8 py-3 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-lg font-medium disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Event'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}

export default CreateEvent

