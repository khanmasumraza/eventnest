import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

function OrganizerTickets() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();

  const [events, setEvents]               = useState([]);
  const [selectedEvent, setSelectedEvent] = useState('');
  const [tickets, setTickets]             = useState([]);
  const [loading, setLoading]             = useState(true);
  const [ticketsLoading, setTicketsLoading] = useState(false);
  const [searchQuery, setSearchQuery]     = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchEvents();
  }, [user]);

  useEffect(() => {
    if (selectedEvent) fetchTickets();
  }, [selectedEvent]);

  const fetchEvents = async () => {
    try {
      const res  = await api.get('/events/my-events');
      const list = res.data?.events || res.data || [];
      setEvents(list);
      const preselect = location.state?.eventId;
      if (preselect && list.find(e => e._id === preselect)) {
        setSelectedEvent(preselect);
      } else if (list.length > 0) {
        setSelectedEvent(list[0]._id);
      }
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchTickets = async () => {
    setTicketsLoading(true);
    try {
      const res = await api.get(`/tickets/event/${selectedEvent}`);
      setTickets(res.data?.tickets || res.data || []);
    } catch (err) {
      console.error('Error fetching tickets:', err);
      setTickets([]);
    } finally {
      setTicketsLoading(false);
    }
  };

  const filtered = tickets.filter(t =>
    t.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.ticketId?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const fmt = (d) =>
    new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric',
    });

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center h-72">
          <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout>
      <div className="space-y-4">

        {/* ── Toolbar ── */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">

          {/* Event selector — full width on mobile */}
          <select
            value={selectedEvent}
            onChange={e => { setSelectedEvent(e.target.value); setSearchQuery(''); }}
            className="
              w-full sm:w-auto
              bg-[#0d1220] border border-white/[0.07] rounded-lg
              px-3 py-2.5 sm:py-2
              text-[13px] text-[#E5E7EB]
              focus:outline-none focus:border-[#6366F1] transition-colors cursor-pointer
            "
          >
            {events.map(ev => (
              <option key={ev._id} value={ev._id}>{ev.title}</option>
            ))}
          </select>

          {/* Search + count row */}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="relative flex-1 min-w-0">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-[14px] h-[14px] text-[#4B5563]"
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search name, email, ticket ID…"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="
                  w-full
                  bg-[#0d1220] border border-white/[0.07] rounded-lg
                  pl-9 pr-4 py-2.5 sm:py-2
                  text-[13px] text-[#E5E7EB] placeholder-[#4B5563]
                  focus:outline-none focus:border-[#6366F1] transition-colors
                "
              />
            </div>

            {tickets.length > 0 && (
              <span className="text-[12px] text-[#4B5563] whitespace-nowrap shrink-0">
                {filtered.length}/{tickets.length}
              </span>
            )}
          </div>
        </div>

        {/* ── Loading spinner ── */}
        {ticketsLoading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
          </div>

        ) : filtered.length > 0 ? (
          <>
            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden md:block bg-[#0d1220] border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {['Attendee', 'Email', 'Ticket ID', 'Amount', 'Date'].map(h => (
                      <th
                        key={h}
                        className="text-left py-3 px-5 text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.06em]"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((ticket, i) => (
                    <tr
                      key={ticket._id}
                      className={`border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors ${
                        i === filtered.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 bg-[#6366F1]/10 rounded-full flex items-center justify-center shrink-0">
                            <span className="text-[#6366F1] text-[11px] font-semibold">
                              {(ticket.user?.name || '?').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <span className="text-[13px] text-[#E5E7EB] font-medium">
                            {ticket.user?.name || ticket.attendeeInfo?.name || 'N/A'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 text-[13px] text-[#6B7280]">
                        {ticket.user?.email || ticket.attendeeInfo?.email || 'N/A'}
                      </td>
                      <td className="py-3.5 px-5">
                        <span className="text-[12px] text-[#6366F1] font-mono bg-[#6366F1]/8 px-2 py-0.5 rounded">
                          {ticket.ticketId?.slice(0, 14)}…
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-[13px] text-[#E5E7EB]">
                        {ticket.amount === 0
                          ? <span className="text-[#22C55E] text-[12px] font-medium">Free</span>
                          : `₹${ticket.amount}`}
                      </td>
                      <td className="py-3.5 px-5 text-[13px] text-[#6B7280]">
                        {fmt(ticket.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS (< md) ── */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {filtered.map(ticket => (
                <div
                  key={ticket._id}
                  className="
                    bg-[#0d1220] border border-white/[0.07] rounded-xl
                    px-4 py-3.5
                    flex flex-col gap-3
                    active:bg-white/[0.02] transition-colors
                  "
                >
                  {/* Top row: avatar + name + amount */}
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 bg-[#6366F1]/10 rounded-full flex items-center justify-center shrink-0">
                      <span className="text-[#6366F1] text-[13px] font-semibold">
                        {(ticket.user?.name || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-medium text-[#E5E7EB] truncate">
                        {ticket.user?.name || ticket.attendeeInfo?.name || 'N/A'}
                      </p>
                      <p className="text-[12px] text-[#4B5563] truncate mt-0.5">
                        {ticket.user?.email || ticket.attendeeInfo?.email || 'N/A'}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      {ticket.amount === 0
                        ? <span className="text-[#22C55E] text-[13px] font-semibold">Free</span>
                        : <span className="text-[15px] font-semibold text-[#E5E7EB]">₹{ticket.amount}</span>
                      }
                    </div>
                  </div>

                  {/* Bottom row: ticket ID + date */}
                  <div className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.05]">
                    <span className="text-[11px] text-[#6366F1] font-mono bg-[#6366F1]/8 px-2 py-1 rounded truncate max-w-[60%]">
                      {ticket.ticketId?.slice(0, 18)}…
                    </span>
                    <span className="text-[12px] text-[#4B5563] shrink-0">
                      {fmt(ticket.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>

        ) : (
          /* ── Empty state ── */
          <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl py-16 text-center px-6">
            <div className="w-10 h-10 bg-[#6366F1]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
              </svg>
            </div>
            <p className="text-[14px] text-[#6B7280]">
              {searchQuery
                ? 'No results — try a different search'
                : 'No tickets sold for this event yet'}
            </p>
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerTickets;