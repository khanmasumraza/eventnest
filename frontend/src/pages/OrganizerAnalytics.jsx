import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

function OrganizerAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [events, setEvents] = useState([]);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState('30');
  const [tooltip, setTooltip] = useState(null);
  const [revenueTooltip, setRevenueTooltip] = useState(null);

  useEffect(() => {
    if (!user) { navigate('/login'); return; }
    if (user.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      // Fetch events
      const eventsRes = await api.get('/events/my-events');
      const eventsData = eventsRes.data || [];
      setEvents(eventsData);

      // Fetch all tickets for organizer's events
      // Try dedicated endpoint first, fallback to per-event
      try {
        const ticketsRes = await api.get('/tickets/organizer/all');
        setTickets(ticketsRes.data?.tickets || ticketsRes.data || []);
      } catch {
        // Fallback: fetch tickets per event
        const allTickets = [];
        for (const event of eventsData) {
          try {
            const tRes = await api.get(`/tickets/event/${event._id}`);
            const t = tRes.data?.tickets || tRes.data || [];
            allTickets.push(...t.map(tk => ({ ...tk, eventId: event._id, eventTitle: event.title })));
          } catch {}
        }
        setTickets(allTickets);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  // ─── STATS from real data ───────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalTickets = events.reduce((sum, e) => sum + (e.registered || 0), 0);
    const totalRevenue = events.reduce((sum, e) => sum + ((e.registered || 0) * (e.price || 0)), 0);
    const totalCapacity = events.reduce((sum, e) => sum + (e.capacity || 0), 0);
    const conversionRate = totalCapacity > 0 ? ((totalTickets / totalCapacity) * 100).toFixed(1) : 0;
    return {
      totalTickets,
      totalRevenue,
      totalCapacity,
      conversionRate,
      avgTicketPrice: totalTickets > 0 ? (totalRevenue / totalTickets).toFixed(0) : 0,
    };
  }, [events]);

  // ─── REAL CHART DATA from tickets ──────────────────────────────────────
  const chartData = useMemo(() => {
    const days = parseInt(timeFilter);
    const now = new Date();
    const buckets = {};

    // Build empty buckets
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      buckets[key] = { tickets: 0, revenue: 0 };
    }

    // Fill from real ticket createdAt dates
    tickets.forEach((ticket) => {
      const createdAt = ticket.createdAt;
      if (!createdAt) return;
      const key = new Date(createdAt).toISOString().split('T')[0];
      if (buckets[key] !== undefined) {
        buckets[key].tickets += 1;
        // revenue: use event price since ticket may not have amount field
        const price = ticket.event?.price || ticket.amount || ticket.price || 0;
        buckets[key].revenue += price;
      }
    });

    return Object.entries(buckets).map(([dateKey, val]) => {
      const d = new Date(dateKey);
      return {
        dateKey,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        tickets: val.tickets,
        revenue: val.revenue,
      };
    });
  }, [timeFilter, tickets]);

  // ─── Per-event breakdown ────────────────────────────────────────────────
  const eventBreakdown = useMemo(() => {
    return events
      .map(e => ({
        title: e.title,
        registered: e.registered || 0,
        capacity: e.capacity || 0,
        revenue: (e.registered || 0) * (e.price || 0),
        price: e.price || 0,
        fillRate: e.capacity > 0 ? Math.round((e.registered / e.capacity) * 100) : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue);
  }, [events]);

  const maxTickets = Math.max(...chartData.map(d => d.tickets), 1);
  const maxRevenue = Math.max(...chartData.map(d => d.revenue), 1);

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount);

  // ─── Export CSV ─────────────────────────────────────────────────────────
  const exportCSV = () => {
    const rows = [
      ['Date', 'Tickets Sold', 'Revenue'],
      ...chartData.map(d => [d.date, d.tickets, d.revenue]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-${timeFilter}days.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
        </div>
      </OrganizerLayout>
    );
  }

  return (
    <OrganizerLayout>
      <div className="space-y-8">

        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Analytics</h1>
            <p className="text-[14px] text-[#9CA3AF] mt-1">Track your event performance</p>
          </div>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#121826] border border-[#1F2937] rounded-lg text-[14px] text-[#9CA3AF] hover:text-white hover:border-[#6366F1] transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Export CSV
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Tickets Sold', value: stats.totalTickets, icon: '🎫', sub: `${events.length} events` },
            { label: 'Total Revenue', value: formatCurrency(stats.totalRevenue), icon: '💰', sub: `Avg ${formatCurrency(stats.avgTicketPrice)}/ticket` },
            { label: 'Conversion Rate', value: `${stats.conversionRate}%`, icon: '📊', sub: `${stats.totalCapacity} total capacity` },
            { label: 'Avg. Ticket Price', value: formatCurrency(stats.avgTicketPrice), icon: '💵', sub: stats.totalTickets > 0 ? 'per ticket' : 'no sales yet' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className="bg-[#121826] border border-[#1F2937] rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)] hover:border-[#6366F1]/30 transition-all duration-200"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[13px] text-[#9CA3AF]">{stat.label}</p>
                  <p className="text-xl font-semibold mt-1 text-[#E5E7EB]">{stat.value}</p>
                  <p className="text-[11px] text-[#6B7280] mt-1">{stat.sub}</p>
                </div>
                <span className="text-2xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Ticket Sales Trend — REAL DATA */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h2 className="text-[18px] font-medium text-[#E5E7EB]">Ticket Sales Trend</h2>
              <p className="text-[13px] text-[#9CA3AF]">Tickets sold per day</p>
            </div>
            <div className="flex gap-2">
              {['7', '30', '90'].map((days) => (
                <button
                  key={days}
                  onClick={() => setTimeFilter(days)}
                  className={`px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    timeFilter === days
                      ? 'bg-[#6366F1] text-white'
                      : 'bg-[#0B0F19] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#1F2937]'
                  }`}
                >
                  {days} days
                </button>
              ))}
            </div>
          </div>

          {/* Y-axis + Chart */}
          <div className="flex gap-3">
            {/* Y-axis labels */}
            <div className="flex flex-col justify-between text-[11px] text-[#6B7280] pb-6" style={{ minWidth: 28 }}>
              <span>{maxTickets}</span>
              <span>{Math.round(maxTickets * 0.75)}</span>
              <span>{Math.round(maxTickets * 0.5)}</span>
              <span>{Math.round(maxTickets * 0.25)}</span>
              <span>0</span>
            </div>

            <div className="flex-1 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="border-t border-[#1F2937]/60 w-full" />
                ))}
              </div>

              {/* Bars */}
              <div className="h-56 flex items-end gap-0.5 relative z-10" style={{ minHeight: '224px' }}>
                {chartData.map((data, idx) => {
                  const heightPct = data.tickets > 0
                    ? Math.max((data.tickets / maxTickets) * 100, 8)
                    : 2;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col justify-end relative group"
                      style={{ height: '100%' }}
                      onMouseEnter={() => setTooltip({ idx, data })}
                      onMouseLeave={() => setTooltip(null)}
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-500 cursor-pointer ${
                          data.tickets > 0
                            ? 'bg-[#6366F1] group-hover:bg-[#818CF8]'
                            : 'bg-[#1F2937]/40'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      {/* Tooltip */}
                      {tooltip?.idx === idx && data.tickets > 0 && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0B0F19] border border-[#374151] rounded-lg px-3 py-2 text-[12px] whitespace-nowrap z-50 shadow-xl pointer-events-none">
                          <p className="text-[#9CA3AF]">{data.date}</p>
                          <p className="text-white font-semibold">{data.tickets} ticket{data.tickets !== 1 ? 's' : ''}</p>
                          {data.revenue > 0 && <p className="text-[#22C55E]">{formatCurrency(data.revenue)}</p>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* X-axis labels */}
              <div className="flex justify-between mt-2 text-[11px] text-[#6B7280]">
                <span>{chartData[0]?.date}</span>
                {timeFilter === '30' && <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>}
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          </div>

          {/* No data notice */}
          {chartData.every(d => d.tickets === 0) && (
            <p className="text-center text-[13px] text-[#6B7280] mt-4">
              No ticket sales in this period yet
            </p>
          )}
        </div>

        {/* Revenue Growth — REAL DATA */}
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <div className="mb-6">
            <h2 className="text-[18px] font-medium text-[#E5E7EB]">Revenue Growth</h2>
            <p className="text-[13px] text-[#9CA3AF]">Revenue generated over time</p>
          </div>

          <div className="flex gap-3">
            {/* Y-axis */}
            <div className="flex flex-col justify-between text-[11px] text-[#6B7280] pb-6" style={{ minWidth: 44 }}>
              <span>₹{(maxRevenue / 1000).toFixed(1)}k</span>
              <span>₹{(maxRevenue * 0.75 / 1000).toFixed(1)}k</span>
              <span>₹{(maxRevenue * 0.5 / 1000).toFixed(1)}k</span>
              <span>₹{(maxRevenue * 0.25 / 1000).toFixed(1)}k</span>
              <span>₹0</span>
            </div>

            <div className="flex-1 relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none pb-6">
                {[0,1,2,3,4].map(i => (
                  <div key={i} className="border-t border-[#1F2937]/60 w-full" />
                ))}
              </div>

              <div className="h-44 flex items-end gap-0.5 relative z-10" style={{ minHeight: '176px' }}>
                {chartData.map((data, idx) => {
                  const heightPct = data.revenue > 0
                    ? Math.max((data.revenue / maxRevenue) * 100, 8)
                    : 2;
                  return (
                    <div
                      key={idx}
                      className="flex-1 flex flex-col justify-end relative group"
                      style={{ height: '100%' }}
                      onMouseEnter={() => setRevenueTooltip(idx)}
                      onMouseLeave={() => setRevenueTooltip(null)}
                    >
                      <div
                        className={`w-full rounded-t transition-all duration-500 cursor-pointer ${
                          data.revenue > 0
                            ? 'bg-[#22C55E]/80 group-hover:bg-[#22C55E]'
                            : 'bg-[#1F2937]/40'
                        }`}
                        style={{ height: `${heightPct}%` }}
                      />
                      {revenueTooltip === idx && data.revenue > 0 && (
                        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-[#0B0F19] border border-[#374151] rounded-lg px-3 py-2 text-[12px] whitespace-nowrap z-50 shadow-xl pointer-events-none">
                          <p className="text-[#9CA3AF]">{data.date}</p>
                          <p className="text-[#22C55E] font-semibold">{formatCurrency(data.revenue)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-between mt-2 text-[11px] text-[#6B7280]">
                <span>{chartData[0]?.date}</span>
                {timeFilter === '30' && <span>{chartData[Math.floor(chartData.length / 2)]?.date}</span>}
                <span>{chartData[chartData.length - 1]?.date}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Per-Event Breakdown */}
        {eventBreakdown.length > 0 && (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
            <h2 className="text-[18px] font-medium text-[#E5E7EB] mb-1">Per-Event Breakdown</h2>
            <p className="text-[13px] text-[#9CA3AF] mb-5">Performance across all your events</p>

            <div className="space-y-4">
              {eventBreakdown.map((e, idx) => (
                <div key={idx} className="group">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <span className="text-[14px] font-medium text-[#E5E7EB] truncate max-w-xs">{e.title}</span>
                    <div className="flex items-center gap-4 text-[13px]">
                      <span className="text-[#9CA3AF]">{e.registered}/{e.capacity} sold</span>
                      <span className="text-[#22C55E] font-medium">{formatCurrency(e.revenue)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                        e.fillRate >= 75 ? 'bg-green-500/15 text-green-400' :
                        e.fillRate >= 40 ? 'bg-yellow-500/15 text-yellow-400' :
                        'bg-[#1F2937] text-[#6B7280]'
                      }`}>
                        {e.fillRate}% full
                      </span>
                    </div>
                  </div>
                  <div className="h-2 bg-[#0B0F19] rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${e.fillRate}%`,
                        background: e.fillRate >= 75 ? '#22C55E' : e.fillRate >= 40 ? '#F59E0B' : '#6366F1',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {events.length === 0 && (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6366F1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium mb-2">No data yet</h3>
            <p className="text-[14px] text-[#9CA3AF]">Create events to see your analytics</p>
          </div>
        )}

      </div>
    </OrganizerLayout>
  );
}

export default OrganizerAnalytics;