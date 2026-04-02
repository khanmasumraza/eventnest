import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

const categoryInitial = (category) => {
  const map = {
    Hackathon: 'H', Fest: 'F', Workshop: 'W', Conference: 'C',
    Sports: 'S', Cultural: 'C', Meetup: 'M', Other: 'O',
    Music: 'M', Tech: 'T', Startup: 'S', Community: 'C',
    Education: 'E', Food: 'F',
  };
  return map[category] || (category?.[0]?.toUpperCase() ?? '?');
};

const categoryColor = (category) => {
  const map = {
    Hackathon: '#6366f1', Fest: '#f59e0b', Workshop: '#3b82f6',
    Conference: '#8b5cf6', Sports: '#22c55e', Cultural: '#ec4899',
    Meetup: '#14b8a6', Tech: '#6366f1', Startup: '#f97316',
    Music: '#a855f7', Community: '#10b981', Education: '#0ea5e9',
    Food: '#ef4444', Other: '#6b7280',
  };
  return map[category] || '#6366f1';
};

function getStatus(event) {
  const now     = new Date();
  const date    = new Date(event.date);
  const diffDays = (date - now) / 86400000;
  if (date < now)      return { label: 'Past',     cls: 'text-[#6B7280] bg-[#6B7280]/10' };
  if (diffDays <= 7)   return { label: 'Soon',     cls: 'text-[#F59E0B] bg-[#F59E0B]/10' };
  if (diffDays <= 30)  return { label: 'Upcoming', cls: 'text-[#6366F1] bg-[#6366F1]/10' };
  return                      { label: 'Active',   cls: 'text-[#22C55E] bg-[#22C55E]/10' };
}

function OrganizerEvents() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events,      setEvents]      = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchEvents();
  }, [user]);

  const fetchEvents = async () => {
    try {
      const res = await api.get('/events/my-events');
      setEvents(res.data?.events || res.data || []);
    } catch (err) {
      console.error('Error fetching events:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = events.filter(e =>
    e.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    e.city?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // ✅ FIXED: Show ticket price, not revenue (revenue = 0 when no registrations yet)
  const fmtPrice = (price) => {
    if (!price || price === 0) return 'Free';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(price);
  };

  // ✅ Revenue = registrations × price (shown separately on mobile)
  const fmtRevenue = (event) => {
    const revenue = (event.registered || 0) * (event.price || 0);
    if (revenue === 0) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0
    }).format(revenue);
  };

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  if (loading) return (
    <OrganizerLayout>
      <div className="flex items-center justify-center h-72">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    </OrganizerLayout>
  );

  return (
    <OrganizerLayout>
      <div className="space-y-4">

        {/* ── Toolbar ── */}
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">

          {/* Search */}
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
              placeholder="Search events…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d1220] border border-white/[0.07] rounded-lg pl-9 pr-4 py-2.5 sm:py-2 text-[13px] text-[#E5E7EB] placeholder-[#4B5563] focus:outline-none focus:border-[#6366F1] transition-colors"
            />
          </div>

          {/* Count */}
          <span className="text-[12px] text-[#4B5563] shrink-0">
            {filtered.length} event{filtered.length !== 1 ? 's' : ''}
          </span>

          {/* New event button */}
          <Link
            to="/organiser/create"
            className="shrink-0 flex items-center gap-1.5 px-3 sm:px-4 py-2.5 sm:py-2 bg-[#6366F1] text-white rounded-lg text-[13px] font-medium hover:bg-[#5558e3] transition-colors no-underline"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span className="hidden xs:inline sm:inline">New event</span>
          </Link>
        </div>

        {/* ── Data ── */}
        {filtered.length > 0 ? (
          <>
            {/* ── DESKTOP TABLE (md+) ── */}
            <div className="hidden md:block bg-[#0d1220] border border-white/[0.06] rounded-xl overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.05]">
                    {/* ✅ Changed "Revenue" → "Price" */}
                    {['Event', 'Date', 'Tickets', 'Price', 'Status', ''].map((h, i) => (
                      <th
                        key={i}
                        className={`py-3 px-5 text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.06em] ${h === '' ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event, i) => {
                    const status  = getStatus(event);
                    const fillPct = Math.min(((event.registered || 0) / (event.capacity || 1)) * 100, 100);
                    const color   = categoryColor(event.category);

                    return (
                      <tr
                        key={event._id}
                        className={`hover:bg-white/[0.02] transition-colors ${i < filtered.length - 1 ? 'border-b border-white/[0.04]' : ''}`}
                      >
                        {/* Event */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 text-[12px] font-bold"
                              style={{ background: color + '22', color }}
                            >
                              {categoryInitial(event.category)}
                            </div>
                            <div>
                              <p className="text-[13px] font-medium text-[#E5E7EB] leading-tight">{event.title}</p>
                              <p className="text-[11px] text-[#4B5563] leading-tight mt-0.5">{event.city || '—'}</p>
                            </div>
                          </div>
                        </td>
                        {/* Date */}
                        <td className="py-3.5 px-5 text-[13px] text-[#9CA3AF]">{fmtDate(event.date)}</td>
                        {/* Tickets */}
                        <td className="py-3.5 px-5">
                          <p className="text-[13px] text-[#E5E7EB]">{event.registered || 0} / {event.capacity || 0}</p>
                          <div className="w-16 h-1 bg-white/[0.06] rounded-full mt-1.5 overflow-hidden">
                            <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${fillPct}%` }} />
                          </div>
                        </td>
                        {/* ✅ FIXED: Show ticket price, not revenue */}
                        <td className="py-3.5 px-5 text-[13px] font-medium">
                          <span className={event.price > 0 ? 'text-[#E5E7EB]' : 'text-[#22C55E]'}>
                            {fmtPrice(event.price)}
                          </span>
                        </td>
                        {/* Status */}
                        <td className="py-3.5 px-5">
                          <span className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${status.cls}`}>
                            {status.label}
                          </span>
                        </td>
                        {/* Actions */}
                        <td className="py-3.5 px-5">
                          <div className="flex items-center justify-end">
                            <a
                              href={`/event/${event._id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 px-2.5 py-1 text-[11px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/[0.05] rounded-lg transition-all font-medium"
                            >
                              <svg className="w-[13px] h-[13px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                              View
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── MOBILE CARDS (< md) ── */}
            <div className="flex flex-col gap-2.5 md:hidden">
              {filtered.map((event) => {
                const status  = getStatus(event);
                const fillPct = Math.min(((event.registered || 0) / (event.capacity || 1)) * 100, 100);
                const color   = categoryColor(event.category);

                return (
                  <div
                    key={event._id}
                    className="bg-[#0d1220] border border-white/[0.07] rounded-xl px-4 py-3.5 flex flex-col gap-3"
                  >
                    {/* Row 1: icon + title + status */}
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0 text-[13px] font-bold"
                        style={{ background: color + '22', color }}
                      >
                        {categoryInitial(event.category)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-medium text-[#E5E7EB] truncate leading-tight">
                          {event.title}
                        </p>
                        <p className="text-[11px] text-[#4B5563] mt-0.5">
                          {event.city || '—'} · {fmtDate(event.date)}
                        </p>
                      </div>
                      <span className={`shrink-0 px-2 py-0.5 rounded-md text-[11px] font-semibold ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>

                    {/* Row 2: tickets fill bar */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[11px] text-[#4B5563]">Tickets</span>
                        <span className="text-[12px] text-[#E5E7EB]">
                          {event.registered || 0}
                          <span className="text-[#4B5563]"> / {event.capacity || 0}</span>
                        </span>
                      </div>
                      <div className="h-1 bg-white/[0.06] rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-[#6366F1]" style={{ width: `${fillPct}%` }} />
                      </div>
                    </div>

                    {/* Row 3: price + view button */}
                    <div className="flex items-center justify-between pt-0.5 border-t border-white/[0.05]">
                      <div>
                        {/* ✅ FIXED: Show price per ticket, not revenue */}
                        <p className="text-[10px] text-[#4B5563] mb-0.5">Price / ticket</p>
                        <p className={`text-[14px] font-semibold ${event.price > 0 ? 'text-[#E5E7EB]' : 'text-[#22C55E]'}`}>
                          {fmtPrice(event.price)}
                        </p>
                      </div>
                      <a
                        href={`/event/${event._id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 text-[12px] text-[#6B7280] hover:text-[#E5E7EB] bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] rounded-lg transition-all font-medium"
                      >
                        <svg className="w-[13px] h-[13px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                            d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        View
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          </>

        ) : (
          <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl py-20 text-center px-6">
            <div className="w-10 h-10 bg-[#6366F1]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <p className="text-[14px] text-[#6B7280] mb-4">
              {searchQuery ? 'No events match your search' : 'No events yet'}
            </p>
            {!searchQuery && (
              <Link
                to="/organiser/create"
                className="inline-block px-4 py-2.5 bg-[#6366F1] text-white rounded-lg text-[13px] font-medium hover:bg-[#5558e3] transition-colors no-underline"
              >
                Create your first event
              </Link>
            )}
          </div>
        )}
      </div>
    </OrganizerLayout>
  );
}

export default OrganizerEvents;