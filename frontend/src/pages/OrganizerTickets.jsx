import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';



function OrganizerTickets() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (user.role !== 'organizer') {
      navigate('/dashboard');
      return;
    }

    fetchEvents();
  }, [user]);

  useEffect(() => {
    if (selectedEvent) {
      fetchTickets();
    }
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
const res = await api.get('/events/my-events');
      setEvents(res.data || []);
      
      if (res.data?.length > 0) {
        setSelectedEvent(res.data[0]._id);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    try {
const res = await api.get(`/events/${selectedEvent}/attendees`);
      setTickets(res.data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const filteredTickets = tickets.filter(ticket => 
    ticket.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticketId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout>
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Tickets</h1>
            <p className="text-[14px] text-[#9CA3AF] mt-1">View all tickets for your events</p>
          </div>
        </div>

        {/* Event Selector */}
        <div className="max-w-md">
          <select
            value={selectedEvent}
            onChange={(e) => setSelectedEvent(e.target.value)}
            className="w-full bg-[#121826] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:border-[#6366F1] transition-colors"
          >
            {events.map((event) => (
              <option key={event._id} value={event._id}>
                {event.title}
              </option>
            ))}
          </select>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search by name, email, or ticket ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121826] border border-[#1F2937] rounded-lg pl-11 pr-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>
        </div>

        {/* Tickets Table */}
        {filteredTickets.length > 0 ? (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1F2937]">
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Attendee</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Email</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Ticket ID</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Amount</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTickets.map((ticket) => (
                    <tr key={ticket._id} className="border-b border-[#1F2937] hover:bg-[#1F2937]/30 transition-colors">
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#E5E7EB] font-medium">
                          {ticket.user?.name || ticket.attendeeInfo?.name || 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#9CA3AF]">
                          {ticket.user?.email || ticket.attendeeInfo?.email || 'N/A'}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#6366F1] font-mono">
                          {ticket.ticketId?.slice(0, 12)}...
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#E5E7EB]">
                          {ticket.amount === 0 ? 'Free' : `₹${ticket.amount}`}
                        </p>
                      </td>
                      <td className="py-4 px-6">
                        <p className="text-[14px] text-[#9CA3AF]">
                          {formatDate(ticket.createdAt)}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6366F1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium mb-2">No tickets found</h3>
            <p className="text-[14px] text-[#9CA3AF]">
              {searchQuery ? 'Try a different search term' : 'No tickets sold for this event yet'}
            </p>
          </div>
        )}

        {/* Summary */}
        {tickets.length > 0 && (
          <div className="flex items-center justify-between text-[14px] text-[#9CA3AF]">
            <p>Showing {filteredTickets.length} of {tickets.length} tickets</p>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerTickets;

