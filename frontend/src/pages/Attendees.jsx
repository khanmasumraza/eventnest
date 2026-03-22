import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const API_URL = 'http://localhost:5000/api';

function Attendees() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user, token } = useAuth();
  
  const [event, setEvent] = useState(null);
  const [attendees, setAttendees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (!user || user.role !== 'organiser') {
      navigate('/login');
      return;
    }
    fetchData();
  }, [user, navigate, id]);

  const fetchData = async () => {
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      
      // Fetch event details
      const eventRes = await axios.get(`${API_URL}/events/${id}`, config);
      setEvent(eventRes.data);
      
      // Fetch attendees
      const attendeesRes = await axios.get(`${API_URL}/events/${id}/attendees`, config);
      setAttendees(attendeesRes.data || []);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleManualCheckIn = async (attendeeId) => {
    try {
      const attendee = attendees.find(a => a._id === attendeeId);
      if (!attendee) return;
      
      await axios.post(`${API_URL}/events/checkin`, 
        { ticketId: attendee.ticketId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setAttendees(attendees.map(a => 
        a._id === attendeeId 
          ? { ...a, status: 'checked-in', checkedInAt: new Date() }
          : a
      ));
    } catch (error) {
      console.error('Check-in error:', error);
      alert(error.response?.data?.message || 'Check-in failed');
    }
  };

  const handleVerifyPayment = async (attendeeId) => {
    try {
      await axios.put(
        `${API_URL}/registrations/${attendeeId}/verify`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setAttendees(attendees.map(a => 
        a._id === attendeeId 
          ? { ...a, paymentStatus: 'verified', status: 'paid' }
          : a
      ));
      alert('Payment verified successfully!');
    } catch (error) {
      console.error('Verify payment error:', error);
      alert(error.response?.data?.message || 'Failed to verify payment');
    }
  };

  const handleRejectPayment = async (attendeeId) => {
    if (!window.confirm('Are you sure you want to reject this payment?')) return;
    
    try {
      await axios.put(
        `${API_URL}/registrations/${attendeeId}/reject`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      // Update local state
      setAttendees(attendees.map(a => 
        a._id === attendeeId 
          ? { ...a, paymentStatus: 'failed', status: 'cancelled' }
          : a
      ));
      alert('Payment rejected');
    } catch (error) {
      console.error('Reject payment error:', error);
      alert(error.response?.data?.message || 'Failed to reject payment');
    }
  };

  const exportCSV = () => {
    const headers = ['Name', 'Email', 'Phone', 'College', 'TicketID', 'Amount', 'Registration Date'];
    const rows = filteredAttendees.map(a => [
      a.attendeeInfo?.name || a.user?.name || 'N/A',
      a.attendeeInfo?.email || a.user?.email || 'N/A',
      a.attendeeInfo?.phone || '-',
      a.attendeeInfo?.college || '-',
      a.ticketId || '-',
      a.amount || 0,
      a.createdAt ? new Date(a.createdAt).toLocaleDateString() : '-'
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event?.title || 'attendees'}-attendees.csv`;
    a.click();
  };

  const filteredAttendees = attendees.filter(a => {
    const searchLower = searchTerm.toLowerCase();
    return (
      a.attendeeInfo?.name?.toLowerCase().includes(searchLower) ||
      a.attendeeInfo?.email?.toLowerCase().includes(searchLower) ||
      a.ticketId?.toLowerCase().includes(searchLower)
    );
  });

  if (!user || user.role !== 'organiser') {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">Access Denied</h2>
          <p className="text-slate-400">Only organizers can access this page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link
                to="/organiser/events"
                className="text-slate-400 hover:text-white"
              >
                ← Back to Events
              </Link>
            </div>
            <h1 className="text-3xl font-bold mb-2">{event?.title || 'Event'} - Attendees</h1>
            <p className="text-slate-400">
              {attendees.length} registered • {attendees.filter(a => a.status === 'checked-in').length} checked in
            </p>
          </div>
          
          <div className="flex gap-3">
            <Link
              to="/organiser/checkin"
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
              </svg>
              QR Scan
            </Link>
            <button
              onClick={exportCSV}
              className="px-4 py-2 bg-indigo-500 hover:bg-indigo-600 rounded-lg font-medium transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by name, email, or ticket ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full md:w-96 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Table */}
        {filteredAttendees.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center"
          >
            <svg className="w-16 h-16 mx-auto mb-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <h3 className="text-xl font-semibold mb-2">No attendees found</h3>
            <p className="text-slate-400">
              {searchTerm ? 'Try a different search term' : 'No one has registered for this event yet'}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden"
          >
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-800">
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Name</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Email</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Phone</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Payment</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Ticket ID</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Status</th>
                    <th className="text-left py-4 px-6 text-sm font-medium text-slate-400">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAttendees.map((attendee, index) => (
                    <motion.tr
                      key={attendee._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="border-b border-slate-800 hover:bg-slate-800/50"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full flex items-center justify-center text-xs font-bold">
                            {(attendee.attendeeInfo?.name || attendee.user?.name || 'U').charAt(0)}
                          </div>
                          <span className="font-medium">
                            {attendee.attendeeInfo?.name || attendee.user?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {attendee.attendeeInfo?.email || attendee.user?.email || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-slate-300">
                        {attendee.attendeeInfo?.phone || '-'}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs px-2 py-1 rounded ${
                          attendee.paymentStatus === 'verified' || attendee.paymentStatus === 'completed'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : attendee.paymentStatus === 'pending'
                            ? 'bg-amber-500/20 text-amber-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {attendee.paymentStatus || 'pending'}
                        </span>
                        {attendee.paymentStatus === 'pending' && attendee.utrNumber && (
                          <p className="text-xs text-slate-500 mt-1">UTR: {attendee.utrNumber}</p>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <span className="font-mono text-xs text-indigo-400 bg-indigo-500/10 px-2 py-1 rounded">
                          {attendee.ticketId?.slice(0, 12)}...
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`text-xs px-2 py-1 rounded ${
                          attendee.status === 'checked-in'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-slate-700 text-slate-300'
                        }`}>
                          {attendee.status === 'checked-in' ? '✓ Checked In' : 'Not Checked In'}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex gap-2 flex-wrap">
                          {/* Payment Verification Buttons */}
                          {attendee.paymentStatus === 'pending' && attendee.amount > 0 && (
                            <>
                              <button
                                onClick={() => handleVerifyPayment(attendee._id)}
                                className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded hover:bg-emerald-500/30 transition-colors"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleRejectPayment(attendee._id)}
                                className="px-3 py-1 bg-red-500/20 text-red-400 text-xs rounded hover:bg-red-500/30 transition-colors"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {/* Check-in Button */}
                          {attendee.status !== 'checked-in' && attendee.paymentStatus !== 'pending' && (
                            <button
                              onClick={() => handleManualCheckIn(attendee._id)}
                              className="px-3 py-1 bg-emerald-500/20 text-emerald-400 text-xs rounded hover:bg-emerald-500/30 transition-colors"
                            >
                              Check In
                            </button>
                          )}
                          {/* View Ticket */}
                          {attendee.ticketId && (
                            <Link
                              to={`/ticket/${attendee.ticketId}`}
                              className="px-3 py-1 bg-indigo-500/20 text-indigo-400 text-xs rounded hover:bg-indigo-500/30 transition-colors"
                            >
                              View Ticket
                            </Link>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}

export default Attendees;

