import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import OrganizerLayout from '../components/OrganizerLayout';

const API_URL = 'http://localhost:5000/api';

function OrganizerSettings() {
  const navigate = useNavigate();
  const { user, token, setUser } = useAuth();

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    organizerName: user?.organizerName || '',
    organizationName: user?.organizationName || '',
    category: user?.category || '',
    emailNotifications: true,
    pushNotifications: true,
    weeklyDigest: false,
    upiId: user?.organizerPayment?.upiId || '',
  });

  const [qrCodeFile, setQrCodeFile] = useState(null);
  const [qrCodePreview, setQrCodePreview] = useState(user?.organizerPayment?.qrCode || '');
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState('');
  const [paymentError, setPaymentError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    if (user.role !== 'organizer') {
      navigate('/dashboard');
      return;
    }
  }, [user, navigate]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleQrCodeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setQrCodeFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setQrCodePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const config = {
        headers: { Authorization: `Bearer ${token}` }
      };

      await axios.put(
        `${API_URL}/users/profile`,
        {
          name: formData.name,
          phone: formData.phone,
          organizerName: formData.organizerName,
          organizationName: formData.organizationName,
        },
        config
      );

      const updatedUser = { ...user, ...formData };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setSuccess('Settings saved successfully!');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSetup = async (e) => {
    e.preventDefault();
    setPaymentError('');
    setPaymentSuccess('');
    setPaymentLoading(true);

    try {
      const formDataPayload = new FormData();
      formDataPayload.append('upiId', formData.upiId);
      if (qrCodeFile) {
        formDataPayload.append('qrCode', qrCodeFile);
      }

      const config = {
        headers: { 
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      };

      const response = await axios.post(
        `${API_URL}/organizer/payment-setup`,
        formDataPayload,
        config
      );

      // Update local user with new payment info
      const updatedPaymentInfo = response.data.organizerPayment;
      const updatedUser = { 
        ...user, 
        organizerPayment: updatedPaymentInfo 
      };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      setUser(updatedUser);

      setPaymentSuccess('Payment setup updated successfully!');
    } catch (err) {
      setPaymentError(err.response?.data?.message || 'Failed to save payment setup');
    } finally {
      setPaymentLoading(false);
    }
  };

  return (
    <OrganizerLayout>
      <div className="max-w-3xl mx-auto space-y-8">
        <div>
          <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Settings</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">Manage your organizer profile and preferences</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Organizer Profile Section */}
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
            <h2 className="text-[18px] font-medium mb-6">Organizer Profile</h2>
            
            <div className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">Your Name</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    disabled
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#6B7280] cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">Organizer Name</label>
                  <input
                    type="text"
                    name="organizerName"
                    value={formData.organizerName}
                    onChange={handleChange}
                    placeholder="Your organizer name"
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
                <div>
                  <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">Organization Name</label>
                  <input
                    type="text"
                    name="organizationName"
                    value={formData.organizationName}
                    onChange={handleChange}
                    placeholder="Your organization (optional)"
                    className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">Primary Category</label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1]"
                >
                  <option value="">Select a category</option>
                  <option value="Music">Music</option>
                  <option value="Tech">Tech</option>
                  <option value="Startup">Startup</option>
                  <option value="Community">Community</option>
                  <option value="Education">Education</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
            <h2 className="text-[18px] font-medium mb-6">Notification Settings</h2>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-[14px] font-medium text-[#E5E7EB]">Email Notifications</p>
                  <p className="text-[12px] text-[#9CA3AF]">Receive email updates about your events</p>
                </div>
                <input
                  type="checkbox"
                  name="emailNotifications"
                  checked={formData.emailNotifications}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-[#6366F1] bg-[#0B0F19] border-[#1F2937]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-[14px] font-medium text-[#E5E7EB]">Push Notifications</p>
                  <p className="text-[12px] text-[#9CA3AF]">Receive push notifications on your device</p>
                </div>
                <input
                  type="checkbox"
                  name="pushNotifications"
                  checked={formData.pushNotifications}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-[#6366F1] bg-[#0B0F19] border-[#1F2937]"
                />
              </label>

              <label className="flex items-center justify-between cursor-pointer">
                <div>
                  <p className="text-[14px] font-medium text-[#E5E7EB]">Weekly Digest</p>
                  <p className="text-[12px] text-[#9CA3AF]">Receive weekly summary of your event performance</p>
                </div>
                <input
                  type="checkbox"
                  name="weeklyDigest"
                  checked={formData.weeklyDigest}
                  onChange={handleChange}
                  className="w-5 h-5 rounded text-[#6366F1] bg-[#0B0F19] border-[#1F2937]"
                />
              </label>
            </div>
          </div>

          {/* Messages */}
          {error && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
              <p className="text-[14px] text-[#EF4444]">{error}</p>
            </div>
          )}

          {success && (
            <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg">
              <p className="text-[14px] text-[#22C55E]">{success}</p>
            </div>
          )}

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="h-10 px-6 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all disabled:opacity-50"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>

        {/* UPI Payment Setup Section */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <h2 className="text-[18px] font-medium mb-2">Payment Setup (UPI)</h2>
          <p className="text-[14px] text-[#9CA3AF] mb-6">
            Set up your UPI payment details to receive payments directly from attendees.
          </p>

          <form onSubmit={handlePaymentSetup} className="space-y-5">
            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                UPI ID
              </label>
              <input
                type="text"
                name="upiId"
                value={formData.upiId}
                onChange={handleChange}
                placeholder="yourname@upi"
                className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1]"
              />
              <p className="text-[12px] text-[#9CA3AF] mt-1">
                Example: yourname@upi, mobile@upi
              </p>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-[#E5E7EB] mb-2">
                Upload QR Code
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleQrCodeChange}
                    className="hidden"
                  />
                  <div className="px-4 py-2 bg-[#1F2937] text-[#E5E7EB] rounded-lg hover:bg-[#374151] transition-colors">
                    Choose File
                  </div>
                </label>
                <span className="text-[14px] text-[#9CA3AF]">
                  {qrCodeFile ? qrCodeFile.name : 'No file chosen'}
                </span>
              </div>
              
              {qrCodePreview && (
                <div className="mt-4 p-4 bg-[#0B0F19] rounded-lg inline-block">
                  <img 
                    src={qrCodePreview} 
                    alt="QR Code Preview" 
                    className="w-32 h-32 object-contain"
                  />
                </div>
              )}
            </div>

            {paymentError && (
              <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg">
                <p className="text-[14px] text-[#EF4444]">{paymentError}</p>
              </div>
            )}

            {paymentSuccess && (
              <div className="p-3 bg-[#22C55E]/10 border border-[#22C55E]/30 rounded-lg">
                <p className="text-[14px] text-[#22C55E]">{paymentSuccess}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={paymentLoading}
              className="h-10 px-6 bg-[#10B981] text-white rounded-lg font-medium hover:brightness-110 transition-all disabled:opacity-50"
            >
              {paymentLoading ? 'Saving...' : 'Save Payment Details'}
            </button>
          </form>
        </div>
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerSettings;

