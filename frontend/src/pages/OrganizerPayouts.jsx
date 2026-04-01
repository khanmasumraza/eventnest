import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import OrganizerLayout from '../components/OrganizerLayout';

/* ── tiny animated counter ── */
function CountUp({ target, duration = 900, prefix = '₹' }) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = null;
    const step = (ts) => {
      if (!start) start = ts;
      const p    = Math.min((ts - start) / duration, 1);
      const ease = 1 - Math.pow(1 - p, 3);
      setVal(Math.round(target * ease));
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [target, duration]);

  return (
    <span>
      {prefix}
      {new Intl.NumberFormat('en-IN').format(val)}
    </span>
  );
}

/* ── animated fill bar ── */
function FillBar({ pct, color }) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 120);
    return () => clearTimeout(t);
  }, [pct]);

  return (
    <div className="relative h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
      <div
        className="absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out"
        style={{ width: `${width}%`, background: color }}
      />
      <div
        className="absolute inset-y-0 rounded-full overflow-hidden transition-all duration-700 ease-out"
        style={{ width: `${width}%`, left: 0 }}
      >
        <div
          className="absolute inset-0 opacity-50"
          style={{
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.35) 50%, transparent 100%)`,
            animation: 'shimmer 2s infinite',
          }}
        />
      </div>
    </div>
  );
}

export default function OrganizerPayouts() {
  const navigate  = useNavigate();
  const { user }  = useAuth();
  const [events,   setEvents]   = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [withdrew, setWithdrew] = useState(false);
  const [pulse,    setPulse]    = useState(false);

  useEffect(() => {
    if (!user)                     { navigate('/login');     return; }
    if (user.role !== 'organizer') { navigate('/dashboard'); return; }
    fetchData();
  }, [user]);

  const fetchData = async () => {
    try {
      const res  = await api.get('/events/my-events');
      const data = res.data?.events || res.data || [];
      setEvents(data);
    } catch (err) {
      console.error('Error fetching payouts:', err);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) =>
    new Intl.NumberFormat('en-IN', {
      style: 'currency', currency: 'INR', minimumFractionDigits: 0,
    }).format(Math.round(n));

  const stats = useMemo(() => {
    const totalRevenue = events.reduce((s, e) => s + ((e.registered || 0) * (e.price || 0)), 0);
    const platformFee  = totalRevenue * 0.10;
    const netEarnings  = totalRevenue - platformFee;
    return { totalRevenue, platformFee, netEarnings };
  }, [events]);

  const eventRows = useMemo(() =>
    events
      .map(e => ({
        title:      e.title,
        registered: e.registered || 0,
        capacity:   e.capacity   || 0,
        net:        (e.registered || 0) * (e.price || 0) * 0.9,
        fillRate:   e.capacity > 0 ? Math.round((e.registered / e.capacity) * 100) : 0,
      }))
      .sort((a, b) => b.net - a.net),
  [events]);

  const handleWithdraw = () => {
    setPulse(true);
    setTimeout(() => setPulse(false), 600);
    setWithdrew(true);
    setTimeout(() => setWithdrew(false), 3000);
  };

  if (loading) return (
    <OrganizerLayout>
      <div className="flex items-center justify-center h-72">
        <div className="w-8 h-8 border-2 border-[#6366F1] border-t-transparent rounded-full animate-spin" />
      </div>
    </OrganizerLayout>
  );

  const canWithdraw = stats.netEarnings >= 100;

  return (
    <OrganizerLayout>
      {/* global keyframes */}
      <style>{`
        @keyframes shimmer {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulseRing {
          0%   { box-shadow: 0 0 0 0 rgba(99,102,241,0.5); }
          70%  { box-shadow: 0 0 0 10px rgba(99,102,241,0); }
          100% { box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes dotBlink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        .card-in    { animation: fadeUp 0.4s ease both; }
        .pulse-ring { animation: pulseRing 0.6s ease-out; }
      `}</style>

      <div className="space-y-4">

        {/* ── Stat cards: 1-col on xs, 2-col on sm, 3-col on lg ── */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {[
            {
              label: 'Total revenue', value: stats.totalRevenue,
              sub: 'gross ticket sales', color: '#6366f1',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              ),
            },
            {
              label: 'Platform fee', value: stats.platformFee,
              sub: '10% of gross revenue', color: '#f59e0b',
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M9 14l6-6m0 0H9m6 0v6M3 12a9 9 0 1118 0A9 9 0 013 12z" />
                </svg>
              ),
            },
            {
              label: 'Net earnings', value: stats.netEarnings,
              sub: 'available to withdraw', color: '#22c55e',
              live: true,
              icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ),
            },
          ].map((s, i) => (
            <div
              key={i}
              className="card-in bg-[#0d1220] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden group hover:border-white/[0.12] transition-colors duration-300"
              style={{ animationDelay: `${i * 80}ms` }}
            >
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none rounded-xl"
                style={{ background: `radial-gradient(ellipse at top left, ${s.color}0d, transparent 60%)` }}
              />

              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{
                      background: s.color,
                      animation: s.live ? 'dotBlink 1.8s ease-in-out infinite' : 'none',
                    }}
                  />
                  <p className="text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.06em]">
                    {s.label}
                  </p>
                </div>
                <div style={{ color: s.color, opacity: 0.5 }}>{s.icon}</div>
              </div>

              {/* Slightly smaller on mobile to prevent ₹ overflow in 2-col grid */}
              <p className="text-[18px] sm:text-[22px] font-semibold text-[#E5E7EB] leading-none mb-1 tabular-nums truncate">
                <CountUp target={s.value} duration={700 + i * 150} />
              </p>
              <p className="text-[11px] text-[#4B5563]">{s.sub}</p>

              <div
                className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-500 rounded-b-xl"
                style={{ background: `linear-gradient(90deg, ${s.color}, transparent)` }}
              />
            </div>
          ))}
        </div>

        {/* ── Withdrawal card ── */}
        <div
          className="card-in bg-[#0d1220] border border-white/[0.06] rounded-xl p-4 sm:p-5"
          style={{ animationDelay: '240ms' }}
        >
          {/* Amount + button: stacks on mobile, side-by-side on sm+ */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4 mb-5">
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <p className="text-[11px] font-semibold text-[#4B5563] uppercase tracking-[0.06em]">
                  Available for withdrawal
                </p>
                {canWithdraw && (
                  <span
                    className="inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-widest"
                    style={{ background: 'rgba(34,197,94,0.12)', color: '#4ade80' }}
                  >
                    <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#4ade80', display: 'inline-block', animation: 'dotBlink 1.5s infinite' }} />
                    ready
                  </span>
                )}
              </div>

              {/* Fluid font: big on md+, slightly smaller on mobile */}
              <p className="text-[28px] sm:text-[36px] font-semibold text-[#E5E7EB] leading-none tabular-nums">
                <CountUp target={stats.netEarnings} duration={800} />
              </p>
              <p className="text-[11px] text-[#4B5563] mt-1.5">
                Instant transfer · no hold · min ₹100
              </p>
            </div>

            {/* Withdraw button — full width on mobile */}
            <button
              onClick={handleWithdraw}
              disabled={!canWithdraw || withdrew}
              className={`w-full sm:w-auto shrink-0 flex items-center justify-center gap-2 px-5 py-3 sm:py-2 rounded-xl text-[13px] font-semibold transition-all duration-300
                ${pulse ? 'pulse-ring' : ''}
                ${withdrew
                  ? 'bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/25 cursor-default'
                  : canWithdraw
                    ? 'bg-[#6366F1] hover:bg-[#4f51c8] text-white shadow-lg shadow-indigo-500/20 hover:shadow-indigo-500/40 active:scale-95'
                    : 'bg-white/[0.03] text-[#4B5563] border border-white/[0.06] cursor-not-allowed'
                }`}
            >
              {withdrew ? (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                  </svg>
                  Sent!
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  {canWithdraw ? 'Withdraw' : 'Min ₹100'}
                </>
              )}
            </button>
          </div>

          <div className="border-t border-white/[0.04] mb-4" />

          {/* 3-step flow: 1-col on mobile, 3-col on sm+ */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-3">
            {[
              { dot: '#6366f1', num: '01', title: 'Ticket sold',      desc: 'Revenue recorded instantly when attendee pays' },
              { dot: '#f59e0b', num: '02', title: '10% fee deducted', desc: 'Platform fee removed automatically — no action needed' },
              { dot: '#22c55e', num: '03', title: 'Withdraw anytime', desc: 'No hold period · funds land in your account instantly' },
            ].map((step, i) => (
              <div key={i} className="relative group flex sm:block gap-3 items-start">
                {/* Horizontal connector on desktop only */}
                {i < 2 && (
                  <div className="hidden lg:block absolute top-[7px] left-[calc(100%+6px)] w-3 border-t border-dashed border-white/[0.08]" />
                )}
                {/* On mobile: dot + number stacked left, text right */}
                <div className="flex items-center gap-2 sm:mb-1.5 shrink-0">
                  <div
                    className="w-2 h-2 rounded-full shrink-0 transition-transform duration-200 group-hover:scale-125"
                    style={{ background: step.dot, boxShadow: `0 0 6px ${step.dot}88` }}
                  />
                  <span className="text-[10px] font-bold text-[#374151] tabular-nums">{step.num}</span>
                </div>
                <div>
                  <p className="text-[12px] font-semibold text-[#D1D5DB] mb-0.5">{step.title}</p>
                  <p className="text-[11px] text-[#4B5563] leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Revenue by event ── */}
        {eventRows.length > 0 && (
          <div
            className="card-in bg-[#0d1220] border border-white/[0.06] rounded-xl overflow-hidden"
            style={{ animationDelay: '320ms' }}
          >
            {/* header */}
            <div className="flex items-center justify-between px-4 sm:px-5 py-4 border-b border-white/[0.05]">
              <p className="text-[13px] font-semibold text-[#E5E7EB]">Revenue by event</p>
              <span className="text-[11px] text-[#4B5563]">{eventRows.length} events</span>
            </div>

            {/* ── DESKTOP TABLE (sm+) ── */}
            <div className="hidden sm:block">
              <div className="grid grid-cols-[1.8rem_1fr_5rem_5rem_4rem] gap-x-4 px-5 py-2.5 border-b border-white/[0.04]">
                <span />
                {['Event', 'Tickets', 'Net', 'Fill'].map((h, i) => (
                  <span
                    key={h}
                    className={`text-[10px] font-semibold text-[#374151] uppercase tracking-widest ${i > 0 ? 'text-right' : ''}`}
                  >
                    {h}
                  </span>
                ))}
              </div>

              <div className="divide-y divide-white/[0.04]">
                {eventRows.map((e, i) => {
                  const fillColor =
                    e.fillRate >= 75 ? '#4ade80' :
                    e.fillRate >= 40 ? '#fbbf24' : '#6366f1';
                  return (
                    <div
                      key={i}
                      className="grid grid-cols-[1.8rem_1fr_5rem_5rem_4rem] gap-x-4 items-center px-5 py-3.5 hover:bg-white/[0.02] transition-colors duration-150 group"
                    >
                      <span
                        className="text-[11px] font-bold tabular-nums"
                        style={{ color: i === 0 ? '#818cf8' : '#374151' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-[#C9D1D9] truncate group-hover:text-white transition-colors">
                        {e.title}
                      </span>
                      <span className="text-[12px] tabular-nums text-[#6B7280] text-right">
                        {e.registered}<span className="text-[#374151]">/{e.capacity}</span>
                      </span>
                      <span className="text-[13px] font-semibold tabular-nums text-[#4ade80] text-right">
                        {fmt(e.net)}
                      </span>
                      <span className="text-[12px] font-bold tabular-nums text-right" style={{ color: fillColor }}>
                        {e.fillRate}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── MOBILE CARDS (< sm) ── */}
            <div className="sm:hidden divide-y divide-white/[0.04]">
              {eventRows.map((e, i) => {
                const fillColor =
                  e.fillRate >= 75 ? '#4ade80' :
                  e.fillRate >= 40 ? '#fbbf24' : '#6366f1';
                return (
                  <div key={i} className="px-4 py-3.5">
                    {/* row 1: rank + title */}
                    <div className="flex items-center gap-2 mb-2.5">
                      <span
                        className="text-[11px] font-bold tabular-nums w-5 shrink-0"
                        style={{ color: i === 0 ? '#818cf8' : '#374151' }}
                      >
                        {i + 1}
                      </span>
                      <span className="text-[13px] font-medium text-[#C9D1D9] truncate">
                        {e.title}
                      </span>
                    </div>

                    {/* row 2: 3 stats side-by-side */}
                    <div className="flex items-center justify-between pl-7">
                      <div>
                        <p className="text-[10px] text-[#374151] mb-0.5">Tickets</p>
                        <p className="text-[12px] tabular-nums text-[#6B7280]">
                          {e.registered}<span className="text-[#374151]">/{e.capacity}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#374151] mb-0.5">Net</p>
                        <p className="text-[13px] font-semibold tabular-nums text-[#4ade80]">
                          {fmt(e.net)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-[#374151] mb-0.5">Fill</p>
                        <p className="text-[12px] font-bold tabular-nums" style={{ color: fillColor }}>
                          {e.fillRate}%
                        </p>
                      </div>
                    </div>

                    {/* fill bar */}
                    <div className="mt-2.5 pl-7">
                      <FillBar pct={e.fillRate} color={fillColor} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Empty state ── */}
        {events.length === 0 && (
          <div className="bg-[#0d1220] border border-white/[0.06] rounded-xl py-16 text-center px-6">
            <div className="w-10 h-10 bg-[#6366F1]/10 rounded-xl flex items-center justify-center mx-auto mb-3">
              <svg className="w-5 h-5 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-[14px] text-[#6B7280]">No payouts yet — create events to start earning</p>
          </div>
        )}

      </div>
    </OrganizerLayout>
  );
}