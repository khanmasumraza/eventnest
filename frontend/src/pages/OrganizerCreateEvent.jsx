import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';





const steps = [
  { id: 1, label: 'Basic Info' },
  { id: 2, label: 'Date & Location' },
  { id: 3, label: 'Tickets' },
  { id: 4, label: 'Event Page' },
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
  { id: 'Other', label: 'Other', icon: '📌' },
];

function OrganizerCreateEvent() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    title: '',
    category: '',
    description: '',
    coverImage: '',
    
    // Step 2: Date & Location
    venue: '',
    city: '',
    date: '',
    startTime: '',
    endTime: '',
    
    // Step 3: Tickets & Payments
    price: 0,
    capacity: 100,
    ticketType: 'General',
    paymentType: 'free', // 'free' | 'upi'
    organizerUpiId: '',
    organizerName: '',
    ticketPrice: 0,
    paymentInstructions: '',
    
    // Step 4: Event Page
    agenda: '',
    speakers: '',
    gallery: [],
    
    // Step 5: Publish
    status: 'draft',
  });

  const [upiQrFile, setUpiQrFile] = useState(null);

  // Check for duplicate event from existing event
  useEffect(() => {
    if (location.state?.duplicateEvent) {
      const event = location.state.duplicateEvent;
      setFormData(prev => ({
        ...prev,
        title: event.title || '',
        category: event.category || '',
        description: event.description || '',
        venue: event.venue || '',
        city: event.city || '',
        date: event.date ? new Date(event.date).toISOString().split('T')[0] : '',
        price: event.price || 0,
        capacity: event.capacity || 100,
      }));
    }
  }, [location.state]);

  const handleChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
  };

  const handleCategorySelect = (categoryId) => {
    setFormData(prev => ({ ...prev, category: categoryId }));
  };

  const handleSubmit = async (statusOverride) => {
    setError('');
    setLoading(true);

    try {
      // Frontend validation for UPI payments
      if (formData.paymentType === 'upi') {
        if (!formData.organizerUpiId || !formData.organizerName) {
          setError('Organizer UPI ID and name are required for paid events');
          setLoading(false);
          return;
        }
        if (!formData.ticketPrice || formData.ticketPrice <= 0) {
          setError('Ticket price must be greater than 0 for paid events');
          setLoading(false);
          return;
        }
      }

      console.log("🚀 Creating event payload:", formData);

      const fd = new FormData();

      // Basic fields
      fd.append('title', formData.title);
      fd.append('category', formData.category);
      fd.append('description', formData.description);

      // Date & location
      if (formData.venue) fd.append('venue', formData.venue);
      if (formData.city) fd.append('city', formData.city);
      if (formData.date) fd.append('date', formData.date);

      // Capacity & base price (kept for backward compatibility)
      fd.append('capacity', String(formData.capacity || 0));
      fd.append('price', String(formData.paymentType === 'upi' ? formData.ticketPrice : 0));

      // Payment fields
      fd.append('paymentType', formData.paymentType);
      if (formData.paymentType === 'upi') {
        fd.append('organizerUpiId', formData.organizerUpiId);
        fd.append('organizerName', formData.organizerName || user?.name || '');
        fd.append('ticketPrice', String(formData.ticketPrice));
        if (formData.paymentInstructions) {
          fd.append('paymentInstructions', formData.paymentInstructions);
        }
        if (upiQrFile) {
          fd.append('organizerQrImage', upiQrFile);
        }
      }

      // Status
      const finalStatus = statusOverride || formData.status;
      fd.append('status', finalStatus);

      const res = await api.post('/events', fd, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      console.log("✅ Event created:", res.data)

      if (res.data._id) {
        if (formData.status === 'published') {
          navigate('/organiser/events');
        } else {
          navigate('/organiser/events');
        }
      }
    } catch (err) {
      console.error("❌ Create event error FULL:", {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
      });
      setError(
        err.response?.data?.message ||
        'Failed to create event'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Event Title *
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleChange}
                placeholder="Enter event title"
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Category *
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => handleCategorySelect(cat.id)}
                    className={`p-3 rounded-lg text-[14px] font-medium transition-all duration-200 ${
                      formData.category === cat.id
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-[#0B0F19] border border-[#1F2937] text-[#9CA3AF] hover:border-[#6366F1] hover:text-[#E5E7EB]'
                    }`}
                  >
                    <span className="block text-lg mb-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Description
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleChange}
                placeholder="Describe your event..."
                rows={4}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors resize-none"
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Venue *
              </label>
              <input
                type="text"
                name="venue"
                value={formData.venue}
                onChange={handleChange}
                placeholder="Enter venue name"
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                City *
              </label>
              <input
                type="text"
                name="city"
                value={formData.city}
                onChange={handleChange}
                placeholder="Enter city"
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Event Date *
              </label>
              <input
                type="date"
                name="date"
                value={formData.date}
                onChange={handleChange}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                  Start Time
                </label>
                <input
                  type="time"
                  name="startTime"
                  value={formData.startTime}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                  End Time
                </label>
                <input
                  type="time"
                  name="endTime"
                  value={formData.endTime}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1] transition-colors"
                />
              </div>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Ticket Type
              </label>
              <select
                name="ticketType"
                value={formData.ticketType}
                onChange={handleChange}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1] transition-colors"
              >
                <option value="General">General Admission</option>
                <option value="VIP">VIP</option>
                <option value="Early Bird">Early Bird</option>
                <option value="Student">Student</option>
              </select>
            </div>

            {/* Payment Type */}
            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Payment Type
              </label>
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="free"
                    checked={formData.paymentType === 'free'}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#6366F1]"
                  />
                  <span className="text-[14px] text-[#E5E7EB]">Free Event</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="paymentType"
                    value="upi"
                    checked={formData.paymentType === 'upi'}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#6366F1]"
                  />
                  <span className="text-[14px] text-[#E5E7EB]">Paid Event (UPI)</span>
                </label>
              </div>
            </div>

            {/* UPI payment configuration */}
            {formData.paymentType === 'upi' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                    Organizer UPI ID *
                  </label>
                  <input
                    type="text"
                    name="organizerUpiId"
                    value={formData.organizerUpiId}
                    onChange={handleChange}
                    placeholder="example@upi"
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                    Organizer Name *
                  </label>
                  <input
                    type="text"
                    name="organizerName"
                    value={formData.organizerName}
                    onChange={handleChange}
                    placeholder="Name shown in UPI"
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                    Ticket Price (INR) *
                  </label>
                  <input
                    type="number"
                    name="ticketPrice"
                    value={formData.ticketPrice}
                    onChange={handleChange}
                    placeholder="Enter ticket price"
                    min="1"
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                    UPI QR Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => setUpiQrFile(e.target.files?.[0] || null)}
                    className="w-full text-[14px] text-[#E5E7EB]"
                  />
                  <p className="text-[12px] text-[#9CA3AF] mt-1">
                    Upload a QR code that attendees can scan to pay via UPI.
                  </p>
                </div>

                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                    Payment Instructions (optional)
                  </label>
                  <textarea
                    name="paymentInstructions"
                    value={formData.paymentInstructions}
                    onChange={handleChange}
                    placeholder="Any special instructions for attendees about UPI payments..."
                    rows={3}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors resize-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Capacity *
              </label>
              <input
                type="number"
                name="capacity"
                value={formData.capacity}
                onChange={handleChange}
                placeholder="Enter capacity"
                min="1"
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
              />
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Agenda
              </label>
              <textarea
                name="agenda"
                value={formData.agenda}
                onChange={handleChange}
                placeholder="Describe your event agenda..."
                rows={4}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors resize-none"
              />
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Speakers
              </label>
              <textarea
                name="speakers"
                value={formData.speakers}
                onChange={handleChange}
                placeholder="List your speakers (one per line)..."
                rows={3}
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors resize-none"
              />
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="bg-[#0B0F19] border border-[#1F2937] rounded-xl p-6">
              <h3 className="text-[18px] font-medium mb-4">Event Preview</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#9CA3AF]">Title</span>
                  <span className="text-[14px] text-[#E5E7EB]">{formData.title || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#9CA3AF]">Category</span>
                  <span className="text-[14px] text-[#E5E7EB]">{formData.category || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#9CA3AF]">Date</span>
                  <span className="text-[14px] text-[#E5E7EB]">{formData.date || 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#9CA3AF]">Location</span>
                  <span className="text-[14px] text-[#E5E7EB]">{formData.venue && formData.city ? `${formData.venue}, ${formData.city}` : 'Not set'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#9CA3AF]">Price</span>
{formData.paymentType === 'upi'
  ? `₹${formData.ticketPrice}`
  : 'Free'}
                </div>
                <div className="flex justify-between">
                  <span className="text-[14px] text-[#9CA3AF]">Capacity</span>
                  <span className="text-[14px] text-[#E5E7EB]">{formData.capacity} attendees</span>
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
                <p className="text-[14px] text-[#EF4444]">{error}</p>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <OrganizerLayout>
      <div className="max-w-3xl mx-auto">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Create Event</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">Fill in the details to create your event</p>
        </div>

        {/* Steps Indicator */}
        <div className="flex items-center justify-between mb-8">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-medium transition-all duration-200 ${
                    currentStep >= step.id
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#1F2937] text-[#9CA3AF]'
                  }`}
                >
                  {step.id}
                </div>
                <span className="text-[12px] text-[#9CA3AF] mt-2">{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-2 ${
                    currentStep > step.id ? 'bg-[#6366F1]' : 'bg-[#1F2937]'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Form Content */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between mt-6">
          <button
            onClick={() => setCurrentStep(prev => prev - 1)}
            disabled={currentStep === 1}
            className="px-6 py-2.5 bg-[#121826] border border-[#1F2937] text-[#E5E7EB] rounded-lg font-medium hover:border-[#6366F1] hover:text-[#6366F1] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>

          {currentStep < 5 ? (
            <button
              onClick={() => setCurrentStep(prev => prev + 1)}
              className="px-6 py-2.5 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200"
            >
              Continue
            </button>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => handleSubmit('draft')}
                disabled={loading}
                className="px-6 py-2.5 bg-[#121826] border border-[#1F2937] text-[#E5E7EB] rounded-lg font-medium hover:border-[#6366F1] hover:text-[#6366F1] transition-all duration-200 disabled:opacity-50"
              >
                Save Draft
              </button>
              <button
                onClick={() => handleSubmit('published')}
                disabled={loading}
                className="px-6 py-2.5 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Publishing...' : 'Publish Event'}
              </button>
            </div>
          )}
        </div>
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerCreateEvent;

