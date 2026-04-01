import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

function OrganizerAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [events, setEvents]         = useState([]);
  const [tickets, setTickets]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');
  const [tooltip, setTooltip]       = useState(null);
  const [revTooltip, setRevTooltip] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const eventsRes  = await api.get('/events/my-events');
      const eventsData = eventsRes.data?.events || eventsRes.data || [];
      setEvents(eventsData);
      try {
        const ticketsRes = await api.get('/tickets/organizer/all');
        setTickets(ticketsRes.data?.tickets || ticketsRes.data || []);
      } catch {
        const allTickets = [];
        for (const event of eventsData) {
          try {
            const tRes = await api.get(`/tickets/event/${event._id}`);
            const t    = tRes.data?.tickets || tRes.data || [];
            allTickets.push(...t.map(tk => ({ ...tk, eventId: event._id, eventTitle: event.title })));
          } catch {}
        }
        setTickets(allTickets);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  const stats = useMemo(() => {
    const totalTickets  = events.reduce((s, e) => s + (e.registered || 0), 0);
    const totalRevenue  = events.reduce((s, e) => s + ((e.registered || 0) * (e.price || 0)), 0);
    const totalCapacity = events.reduce((s, e) => s + (e.capacity || 0), 0);
    return {
      totalTickets,
      totalRevenue,
      totalCapacity,
      conversionRate: totalCapacity > 0 ? ((totalTickets / totalCapacity) * 100).toFixed(1) : 0,
      avgTicketPrice: totalTickets > 0 ? Math.round(totalRevenue / totalTickets) : 0,
    };
  }, [events]);

  const chartData = useMemo(() => {
    const days    = parseInt(timeFilter);
    const now     = new Date();
    const buckets = {};
    for (let i = days - 1; i >= 0; i--) {
      const d   = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      buckets[key] = { tickets: 0, revenue: 0 };
    }
    tickets.forEach(ticket => {
      if (!ticket.createdAt) return;
      const key = new Date(ticket.createdAt).toISOString().split('T')[0];
      if (buckets[key]) {
        buckets[key].tickets += 1;
        buckets[key].revenue += ticket.event?.price || ticket.amount || 0;
      }
    });
    return Object.entries(buckets).map(([dateKey, val]) => {
      const d = new Date(dateKey);
      return { dateKey, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), ...val };
    });
  }, [timeFilter, tickets]);

  const eventBreakdown = useMemo(() =>
    events.map(e => ({
      title:      e.title,
      registered: e.registered || 0,
      capacity:   e.capacity   || 0,
      revenue:    (e.registered || 0) * (e.price || 0),
      fillRate:   e.capacity > 0 ? Math.round((e.registered / e.capacity) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue),
  [events]);

  const maxTickets = Math.max(...chartData.map(d => d.tickets), 1);
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(n);

  const exportCSV = () => {
    const rows = [['Date', 'Tickets Sold', 'Revenue'], ...chartData.map(d => [d.date, d.tickets, d.revenue])];
    const blob = new Blob([rows.map(r => r.join(',')).join('\n')], { type: 'text/csv' });
    const a    = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(blob), download: `analytics-${timeFilter}d.csv`,
    });
    a.click();
  };

  if (loading) return (
    <OrganizerLayout>
      <div className="flex items-center justify-center h-72">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    </OrganizerLayout>
  );

  const statCards = [
    { label: 'Tickets sold',     value: stats.totalTickets,         sub: `across ${events.length} events`,            color: '#6366f1' },
    { label: 'Revenue',          value: fmt(stats.totalRevenue),    sub: `avg ${fmt(stats.avgTicketPrice)} / ticket`,  color: '#22c55e' },
    { label: 'Conversion rate',  value: `${stats.conversionRate}%`, sub: `${stats.totalCapacity} total capacity`,      color: '#f59e0b' },
    { label: 'Avg ticket price', value: fmt(stats.avgTicketPrice),  sub: stats.totalTickets > 0 ? 'per ticket' : 'no sales yet', color: '#3b82f6' },
  ];

  return (
    <OrganizerLayout>
      <div className="space-y-4">

        {/* ── Stat cards: 2-col on mobile, 4-col on lg ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {statCards.map((s, i) => (
            <div key={i} className="bg-[#0d1220] border border-white/[0.06] rounded-xl p-3.5 sm:p-4">
              <div className="flex items-center gap-2 mb-2.5">
                <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color }} />
                <p className="text-[10px] sm:text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.06em] truncate">
                  {s.label}
                </p>
              </div>
              {/* Slightly smaller value text on mobile so ₹ amounts don't overflow */}
              <p className="text-[18px] sm:text-[22px] font-semibold text-[#E5E7EB] leading-none mb-1 truncate">
                {s.value}
              </p>
              <p className="text-[10px] sm:text-[11px] text-[#4B5563] truncate">{s.sub}</p>
            </div>
          ))}
        </div>

        {/* ── Ticket Sales chart ── */}
        <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl p-4 sm:p-5">

          {/* Header: stacks on mobile, side-by-side on sm+ */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
            <p className="text-[13px] font-semibold text-[#E5E7EB]">Ticket sales</p>

            <div className="flex items-center gap-2 flex-wrap">
              {/* Time filter pills */}
              <div className="flex gap-1.5">
                {['7', '30', '90'].map(d => (
                  <button
                    key={d}
                    onClick={() => setTimeFilter(d)}
                    className={`px-3 py-1.5 sm:py-1 rounded-lg text-[12px] font-medium transition-all ${
                      timeFilter === d
                        ? 'bg-[#6366F1] text-white'
                        : 'bg-white/[0.03] text-[#6B7280] hover:text-[#E5E7EB] border border-white/[0.06]'
                    }`}
                  >
                    {d}d
                  </button>
                ))}
              </div>

              <div className="w-px h-4 bg-white/[0.08]" />

              {/* Export — icon-only on very small screens */}
              <button
                onClick={exportCSV}
                className="flex items-center gap-1.5 px-3 py-1.5 sm:py-1 rounded-lg text-[12px] text-[#6B7280] border border-white/[0.06] bg-white/[0.03] hover:text-[#E5E7EB] hover:border-white/[0.12] transition-all"
              >
                <svg className="w-[13px] h-[13px] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span className="hidden xs:inline">Export CSV</span>
              </button>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3">
            {/* Y-axis labels */}
            <div
              className="flex flex-col justify-between text-[10px] text-[#374151] pb-5 select-none"
              style={{ minWidth: 20 }}
            >
              {[maxTickets, Math.round(maxTickets * .75), Math.round(maxTickets * .5), Math.round(maxTickets * .25), 0].map((v, i) => (
                <span key={i}>{v}</span>
              ))}
            </div>

            <div className="flex-1 relative min-w-0">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
                {[0,1,2,3,4].map(i => <div key={i} className="border-t border-white/[0.04] w-full" />)}
              </div>

              {/* Taller on mobile (touch-friendly visual), shorter on desktop */}
              <div className="h-40 sm:h-48 flex items-end gap-px relative z-10">
                {chartData.map((d, i) => {
                  const h = d.tickets > 0 ? Math.max((d.tickets / maxTickets) * 100, 6) : 1.5;
                  return (
                    <div
                      key={i}
                      className="flex-1 h-full flex flex-col justify-end relative group"
                      onMouseEnter={() => setTooltip({ i, d })}
                      onMouseLeave={() => setTooltip(null)}
                      onTouchStart={() => setTooltip({ i, d })}  /* mobile tap */
                      onTouchEnd={() => setTimeout(() => setTooltip(null), 1500)}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          d.tickets > 0 ? 'bg-[#6366f1] group-hover:bg-[#818cf8]' : 'bg-white/[0.03]'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                      {tooltip?.i === i && d.tickets > 0 && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#080c14] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap z-50 shadow-xl pointer-events-none">
                          <p className="text-[#6B7280]">{d.date}</p>
                          <p className="text-white font-semibold">{d.tickets} ticket{d.tickets !== 1 ? 's' : ''}</p>
                          {d.revenue > 0 && <p className="text-[#22c55e]">{fmt(d.revenue)}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between mt-1.5 text-[10px] text-[#374151]">
                <span>{chartData[0]?.date}</span>
                {timeFilter === '30' && <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>}
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          </div>

          {chartData.every(d => d.tickets === 0) && (
            <p className="text-center text-[12px] text-[#374151] mt-3">No sales in this period</p>
          )}
        </div>

        {/* ── Revenue Growth chart ── */}
        <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl p-4 sm:p-5">
          <p className="text-[13px] font-semibold text-[#E5E7EB] mb-5">Revenue growth</p>

          <div className="flex gap-2 sm:gap-3">
            {/* Y-axis: compact ₹ labels, shrink gracefully */}
            <div
              className="flex flex-col justify-between text-[10px] text-[#374151] pb-5 select-none"
              style={{ minWidth: 32 }}
            >
              {[maxRevenue, maxRevenue * .75, maxRevenue * .5, maxRevenue * .25, 0].map((v, i) => (
                <span key={i}>₹{v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}</span>
              ))}
            </div>

            <div className="flex-1 relative min-w-0">
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-5">
                {[0,1,2,3,4].map(i => <div key={i} className="border-t border-white/[0.04] w-full" />)}
              </div>

              <div className="h-32 sm:h-36 flex items-end gap-px relative z-10">
                {chartData.map((d, i) => {
                  const h = d.revenue > 0 ? Math.max((d.revenue / maxRevenue) * 100, 6) : 1.5;
                  return (
                    <div
                      key={i}
                      className="flex-1 h-full flex flex-col justify-end relative group"
                      onMouseEnter={() => setRevTooltip(i)}
                      onMouseLeave={() => setRevTooltip(null)}
                      onTouchStart={() => setRevTooltip(i)}
                      onTouchEnd={() => setTimeout(() => setRevTooltip(null), 1500)}
                    >
                      <div
                        className={`w-full rounded-t-sm transition-all duration-300 ${
                          d.revenue > 0 ? 'bg-[#22c55e]/70 group-hover:bg-[#22c55e]' : 'bg-white/[0.03]'
                        }`}
                        style={{ height: `${h}%` }}
                      />
                      {revTooltip === i && d.revenue > 0 && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#080c14] border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-[11px] whitespace-nowrap z-50 shadow-xl pointer-events-none">
                          <p className="text-[#6B7280]">{d.date}</p>
                          <p className="text-[#22c55e] font-semibold">{fmt(d.revenue)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between mt-1.5 text-[10px] text-[#374151]">
                <span>{chartData[0]?.date}</span>
                {timeFilter === '30' && <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>}
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Per-event breakdown ── */}
        {eventBreakdown.length > 0 && (
          <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl p-4 sm:p-5">
            <p className="text-[13px] font-semibold text-[#E5E7EB] mb-4">Per-event breakdown</p>
            <div className="space-y-4">
              {eventBreakdown.map((e, i) => (
                <div key={i}>
                  {/* Stack on mobile, row on sm+ */}
                  <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-2 mb-1.5">
                    <span className="text-[13px] font-medium text-[#D1D5DB] truncate sm:max-w-xs">
                      {e.title}
                    </span>

                    {/* Stats row — always horizontal, wraps if needed */}
                    <div className="flex items-center gap-2 sm:gap-3 text-[12px] flex-wrap">
                      <span className="text-[#6B7280]">{e.registered}/{e.capacity}</span>
                      <span className="text-[#22c55e] font-medium">{fmt(e.revenue)}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        e.fillRate >= 75 ? 'bg-green-500/10 text-green-400' :
                        e.fillRate >= 40 ? 'bg-yellow-500/10 text-yellow-400' :
                        'bg-white/[0.04] text-[#6B7280]'
                      }`}>
                        {e.fillRate}%
                      </span>
                    </div>
                  </div>

                  <div className="h-1 bg-white/[0.04] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${e.fillRate}%`,
                        background: e.fillRate >= 75 ? '#22c55e' : e.fillRate >= 40 ? '#f59e0b' : '#6366f1',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {events.length === 0 && (
          <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl py-16 text-center px-6">
            <div className="w-10 h-10 bg-[#6366F1]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <p className="text-[14px] text-[#6B7280]">No data yet — create events to see analytics</p>
          </div>
        )}

      </div>
    </OrganizerLayout>
  );
}

export default OrganizerAnalytics;