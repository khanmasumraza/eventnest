import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';



const categoryIcons = {
  'Hackathon': '💻',
  'Fest': '🎉',
  'Workshop': '🛠️',
  'Conference': '🎤',
  'Sports': '⚽',
  'Cultural': '🎭',
  'Meetup': '👋',
  'Other': '📌'
};

function OrganizerEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
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

  const fetchEvents = async () => {
    try {
const res = await api.get('/events/my-events');
      setEvents(res.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredEvents = events.filter(event => 
    event.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    event.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getEventStatus = (event) => {
    const eventDate = new Date(event.date);
    const now = new Date();
    
    if (eventDate < now) return { label: 'Past', class: 'bg-[#6B7280]/20 text-[#9CA3AF]' };
    if (eventDate > now && (eventDate.getTime() - now.getTime()) < 7 * 24 * 60 * 60 * 1000) 
      return { label: 'Upcoming', class: 'bg-[#6366F1]/20 text-[#6366F1]' };
    return { label: 'Active', class: 'bg-[#22C55E]/20 text-[#22C55E]' };
  };

  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleDuplicate = (event) => {
    // Navigate to create page with pre-filled data
    navigate('/organiser/create', { state: { duplicateEvent: event } });
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
            <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Events</h1>
            <p className="text-[14px] text-[#9CA3AF] mt-1">Manage your events</p>
          </div>
          <Link
            to="/organiser/create"
            className="h-10 px-4 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Event
          </Link>
        </div>

        {/* Search Bar */}
        <div className="max-w-md">
          <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#6B7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search events..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121826] border border-[#1F2937] rounded-lg pl-11 pr-4 py-2.5 text-[#E5E7EB] placeholder-[#6B7280] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>
        </div>

        {/* Events Table */}
        {filteredEvents.length > 0 ? (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1F2937]">
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Event</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Date</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Tickets Sold</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Revenue</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Status</th>
                    <th className="text-left py-4 px-6 text-[14px] font-medium text-[#9CA3AF]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map((event) => {
                    const status = getEventStatus(event);
                    const revenue = (event.registered || 0) * (event.price || 0);
                    
                    return (
                      <tr key={event._id} className="border-b border-[#1F2937] hover:bg-[#1F2937]/30 transition-colors">
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-[#6366F1]/20 rounded-lg flex items-center justify-center text-lg">
                              {categoryIcons[event.category] || '🎉'}
                            </div>
                            <div>
                              <p className="text-[14px] font-medium text-[#E5E7EB]">{event.title}</p>
                              <p className="text-[12px] text-[#9CA3AF]">{event.city}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-[14px] text-[#E5E7EB]">
                            {new Date(event.date).toLocaleDateString('en-US', { 
                              month: 'short', 
                              day: 'numeric',
                              year: 'numeric' 
                            })}
                          </p>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-[14px] text-[#E5E7EB]">
                            {event.registered || 0} / {event.capacity || 0}
                          </p>
                          <div className="w-20 h-1.5 bg-[#1F2937] rounded-full mt-1 overflow-hidden">
                            <div 
                              className="h-full bg-[#6366F1] rounded-full"
                              style={{ width: `${Math.min(((event.registered || 0) / (event.capacity || 1)) * 100, 100)}%` }}
                            ></div>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <p className="text-[14px] text-[#E5E7EB] font-medium">{formatCurrency(revenue)}</p>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`px-2.5 py-1 rounded-full text-[12px] font-medium ${status.class}`}>
                            {status.label}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-2">
                            <Link
                              to={`/event/${event._id}`}
                              className="p-2 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg transition-all duration-200"
                              title="View"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                            </Link>
                            <Link
                              to={`/organiser/event/${event._id}/attendees`}
                              className="p-2 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg transition-all duration-200"
                              title="Manage Attendees"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </Link>
                            <button
                              onClick={() => handleDuplicate(event)}
                              className="p-2 text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-[#1F2937] rounded-lg transition-all duration-200"
                              title="Duplicate"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6366F1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium mb-2">No events found</h3>
            <p className="text-[14px] text-[#9CA3AF] mb-6">
              {searchQuery ? 'Try a different search term' : 'Start by creating your first event'}
            </p>
            <Link
              to="/organiser/create"
              className="px-6 py-3 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 inline-block"
            >
              Create Event
            </Link>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerEvents;

