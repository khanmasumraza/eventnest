import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import OrganizerLayout from '../components/OrganizerLayout'

const categoryIcons = {
  'Hackathon': '💻', 'Fest': '🎉', 'Workshop': '🛠️', 'Conference': '🎤',
  'Sports': '⚽', 'Cultural': '🎭', 'Meetup': '👋', 'Other': '📌',
  'Music': '🎵', 'Tech': '💻', 'Startup': '🚀', 'Community': '🤝',
  'Education': '📚', 'Food': '🍕',
}

const STAT_META = [
  { accent: '#6366f1', iconBg: 'rgba(99,102,241,0.12)', icon: '📅' },
  { accent: '#22c55e', iconBg: 'rgba(34,197,94,0.10)',   icon: '🎫' },
  { accent: '#f59e0b', iconBg: 'rgba(245,158,11,0.10)',  icon: '💰' },
  { accent: '#a78bfa', iconBg: 'rgba(167,139,250,0.10)', icon: '🔥' },
]
const ACTIVITY_DOT = { purchase: '#22c55e', register: '#6366f1', reminder: '#f59e0b' }

function getTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 60) return `${mins} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

// ── Animated counter — counts up from 0 on mount ──────────────
function AnimatedNumber({ value, delay = 0, duration = 900 }) {
  const [display, setDisplay] = useState(0)
  const num = parseFloat(value) || 0

  useEffect(() => {
    let start = null
    const step = (ts) => {
      if (!start) start = ts
      const elapsed = ts - start - delay
      if (elapsed < 0) { requestAnimationFrame(step); return }
      const progress = Math.min(elapsed / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(ease * num))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [value, delay, duration])

  return <>{display.toLocaleString('en-IN')}</>
}

// ── Bar that animates its height on mount ─────────────────────
function ChartBar({ d, i, max, isLast, chartVisible }) {
  const [height, setHeight] = useState(0)
  const target = d.tickets > 0 ? Math.max((d.tickets / max) * 100, 8) : 3
  const [hover, setHover] = useState(false)

  useEffect(() => {
    if (!chartVisible) return
    const t = setTimeout(() => setHeight(target), i * 8)
    return () => clearTimeout(t)
  }, [chartVisible, target, i])

  const barBg = d.tickets > 0
    ? isLast
      ? 'linear-gradient(to top, #4f46e5, #818cf8)'
      : i % 2 === 0
        ? 'rgba(99,102,241,0.55)'
        : 'rgba(99,102,241,0.42)'
    : 'rgba(255,255,255,0.04)'

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        flex: 1, height: '100%',
        display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
        position: 'relative', cursor: d.tickets > 0 ? 'pointer' : 'default',
      }}
    >
      {hover && d.tickets > 0 && (
        <div style={{
          position: 'absolute', bottom: 'calc(100% + 6px)', left: '50%',
          transform: 'translateX(-50%)',
          background: '#1e2a3a', border: '1px solid rgba(255,255,255,0.1)',
          color: '#f1f5f9', fontSize: '10px', fontWeight: 600,
          padding: '3px 7px', borderRadius: '6px', whiteSpace: 'nowrap', zIndex: 10,
        }}>
          {d.tickets} {d.tickets === 1 ? 'ticket' : 'tickets'}
        </div>
      )}
      <div style={{
        width: '100%', borderRadius: '4px 4px 0 0',
        background: barBg,
        height: `${height}%`,
        transition: 'height 0.55s cubic-bezier(0.34,1.4,0.64,1), opacity 0.15s',
        opacity: hover ? 0.8 : 1,
      }} />
    </div>
  )
}

// ── Shared styles ──────────────────────────────────────────────
const card = {
  background: '#0d1220',
  border: '1px solid rgba(255,255,255,0.06)',
  borderRadius: '16px',
  padding: '20px',
}
const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', background: '#6366f1', color: 'white',
  border: 'none', borderRadius: '9px', fontSize: '12px', fontWeight: 600,
  cursor: 'pointer', textDecoration: 'none', fontFamily: 'inherit',
}
const btnOutline = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '8px 16px', background: 'transparent', color: '#94a3b8',
  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '9px',
  fontSize: '12px', fontWeight: 500, cursor: 'pointer',
  textDecoration: 'none', fontFamily: 'inherit',
}

// slide-up helper
const slide = (visible, delay = 0) => ({
  opacity:   visible ? 1 : 0,
  transform: visible ? 'translateY(0)' : 'translateY(14px)',
  transition: `opacity 0.35s ease ${delay}ms, transform 0.35s ease ${delay}ms`,
})

// ── Main ───────────────────────────────────────────────────────
function OrganizerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events,     setEvents]     = useState([])
  const [tickets,    setTickets]    = useState([])
  const [loading,    setLoading]    = useState(true)
  const [timeFilter, setTimeFilter] = useState('30')

  // animation gates — fired after data loads
  const [statsIn,  setStatsIn]  = useState(false)
  const [chartIn,  setChartIn]  = useState(false)
  const [bottomIn, setBottomIn] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'organizer') { navigate('/dashboard'); return }
    fetchOrganizerData()
  }, [user])

  useEffect(() => {
    if (loading) return
    setTimeout(() => setStatsIn(true),  80)
    setTimeout(() => setChartIn(true),  240)
    setTimeout(() => setBottomIn(true), 400)
  }, [loading])

  const fetchOrganizerData = async () => {
    try {
      const eventsRes = await api.get('/events/my-events')
      const rawData   = eventsRes.data?.events || eventsRes.data
      setEvents(Array.isArray(rawData) ? rawData : [])
      try {
        const ticketsRes = await api.get('/tickets/organizer/all')
        setTickets(ticketsRes.data?.tickets || ticketsRes.data || [])
      } catch { setTickets([]) }
    } catch (err) {
      console.error('❌ Dashboard error:', err.response?.data || err.message)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => ({
    totalEvents:    events.length,
    ticketsSold:    events.reduce((s, e) => s + (e.registered || 0), 0),
    revenue:        events.reduce((s, e) => s + ((e.registered || 0) * (e.price || 0)), 0),
    upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length,
  }), [events])

  const nextEvent = useMemo(() =>
    events.filter(e => new Date(e.date) >= new Date())
          .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null,
  [events])

  const chartData = useMemo(() => {
    const days = parseInt(timeFilter)
    const now = new Date()
    const buckets = {}
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now); d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      buckets[key] = { tickets: 0, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    }
    tickets.forEach(t => {
      if (!t.createdAt) return
      const key = new Date(t.createdAt).toISOString().split('T')[0]
      if (buckets[key]) buckets[key].tickets += 1
    })
    return Object.values(buckets)
  }, [timeFilter, tickets])

  const activities = useMemo(() => {
    const items = []
    ;[...tickets].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 3)
      .forEach(t => items.push({
        id: t._id, type: 'purchase',
        text: `${t.user?.name || 'Someone'} purchased a ticket for ${t.event?.title || 'an event'}`,
        time: getTimeAgo(t.createdAt), _rawTime: t.createdAt,
      }))
    ;[...events].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 2)
      .forEach(e => items.push({
        id: e._id, type: 'register',
        text: `Event "${e.title}" created`,
        time: getTimeAgo(e.createdAt), _rawTime: e.createdAt,
      }))
    return items.sort((a, b) => new Date(b._rawTime) - new Date(a._rawTime)).slice(0, 5)
  }, [tickets, events])

  const thisWeekTickets = useMemo(() => {
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    return tickets.filter(t => t.createdAt && new Date(t.createdAt) >= weekAgo).length
  }, [tickets])

  const formatCurrency = (n) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n)

  const maxTickets = Math.max(...chartData.map(d => d.tickets), 1)
  const fillPct    = nextEvent
    ? Math.min(((nextEvent.registered || 0) / (nextEvent.capacity || 1)) * 100, 100)
    : 0
  const fillColor  = fillPct > 80 ? '#f87171' : '#6366f1'

  const statItems = [
    { label: 'Total Events',  num: stats.totalEvents,    formatted: null,                       trend: null },
    { label: 'Tickets Sold',  num: stats.ticketsSold,    formatted: null,                       trend: thisWeekTickets > 0 ? `+${thisWeekTickets} this week` : null },
    { label: 'Revenue',       num: null,                 formatted: formatCurrency(stats.revenue), trend: null },
    { label: 'Upcoming',      num: stats.upcomingEvents, formatted: null,                       trend: null },
  ]

  if (loading) {
    return (
      <OrganizerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{
            width: '36px', height: '36px',
            border: '3px solid rgba(99,102,241,0.15)',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
        </div>
      </OrganizerLayout>
    )
  }

  return (
    <OrganizerLayout>
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '14px',
        fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      }}>

        {/* ── Stat cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }} className="stats-grid">
          {statItems.map((s, i) => {
            const { accent, iconBg, icon } = STAT_META[i]
            return (
              <div key={i} style={{
                ...slide(statsIn, i * 55),
                background: '#0d1220',
                border: '1px solid rgba(255,255,255,0.06)',
                borderTop: `2px solid ${accent}`,
                borderRadius: '14px',
                padding: '16px 18px',
                display: 'flex', flexDirection: 'column', minWidth: 0,
              }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: iconBg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '16px', marginBottom: '12px',
                }}>{icon}</div>
                <div style={{ color: '#475569', fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '4px' }}>
                  {s.label}
                </div>
                <div style={{ color: '#f1f5f9', fontSize: '28px', fontWeight: 700, lineHeight: 1 }}>
                  {s.formatted
                    ? s.formatted
                    : <AnimatedNumber value={s.num} delay={i * 55 + 180} />
                  }
                </div>
                {s.trend && (
                  <div style={{ color: '#22c55e', fontSize: '11px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    ↑ {s.trend}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* ── Chart ── */}
        <div style={{ ...card, ...slide(chartIn) }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, marginBottom: '3px' }}>Ticket sales</div>
              <div style={{ color: '#475569', fontSize: '12px' }}>Tickets sold per day</div>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['7', '30', '90'].map(d => (
                <button key={d} onClick={() => setTimeFilter(d)} style={{
                  padding: '5px 11px', borderRadius: '8px',
                  fontSize: '11px', fontWeight: 600, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                  background: timeFilter === d ? '#6366f1' : 'rgba(255,255,255,0.04)',
                  color:      timeFilter === d ? 'white'   : '#475569',
                }}>{d}d</button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '110px' }}>
            {chartData.map((d, i) => (
              <ChartBar
                key={`${timeFilter}-${i}`}
                d={d} i={i} max={maxTickets}
                isLast={i === chartData.length - 1}
                chartVisible={chartIn}
              />
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px' }}>
            <span style={{ color: '#334155', fontSize: '10px' }}>{chartData[0]?.date}</span>
            <span style={{ color: '#334155', fontSize: '10px' }}>{chartData[chartData.length - 1]?.date}</span>
          </div>

          {chartData.every(d => d.tickets === 0) && (
            <p style={{ color: '#334155', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
              No ticket sales in this period
            </p>
          )}
        </div>

        {/* ── Bottom row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,300px)', gap: '12px' }} className="dash-grid">

          {/* Next event */}
          <div style={{ ...card, ...slide(bottomIn) }}>
            <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Next event</div>

            {nextEvent ? (
              <>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '16px' }}>
                  <div style={{
                    width: '46px', height: '46px', borderRadius: '12px', flexShrink: 0,
                    background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                  }}>
                    {categoryIcons[nextEvent.category] || '🎉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: '#f1f5f9', fontSize: '15px', fontWeight: 700, marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nextEvent.title}
                    </div>
                    <div style={{ color: '#475569', fontSize: '12px' }}>
                      📍 {nextEvent.city || nextEvent.venue || 'TBD'}
                      &nbsp;·&nbsp;
                      {new Date(nextEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                  {[
                    { label: 'Sold',      value: nextEvent.registered || 0,                                                color: '#f1f5f9' },
                    { label: 'Remaining', value: Math.max((nextEvent.capacity || 0) - (nextEvent.registered || 0), 0),     color: '#22c55e' },
                  ].map((item, i) => (
                    <div key={i} style={{
                      background: '#111827', border: '1px solid rgba(255,255,255,0.05)',
                      borderRadius: '10px', padding: '10px 12px',
                    }}>
                      <div style={{ color: '#475569', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                        {item.label}
                      </div>
                      <div style={{ color: item.color, fontSize: '20px', fontWeight: 700 }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#475569', fontSize: '11px' }}>Capacity</span>
                    <span style={{ color: '#94a3b8', fontSize: '11px' }}>{Math.round(fillPct)}%</span>
                  </div>
                  <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '999px', background: fillColor,
                      width: bottomIn ? `${fillPct}%` : '0%',
                      transition: 'width 0.8s cubic-bezier(0.34,1.2,0.64,1) 0.3s',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <Link to={`/organiser/attendees?event=${nextEvent._id}`} style={btnPrimary}>View attendees</Link>
                  <Link to="/organiser/events" style={btnOutline}>All events</Link>
                </div>
              </>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px',
                  background: 'rgba(99,102,241,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', fontSize: '22px',
                }}>📅</div>
                <p style={{ color: '#94a3b8', fontSize: '14px', marginBottom: '16px' }}>No upcoming events</p>
                <Link to="/organiser/create" style={btnPrimary}>Create your first event</Link>
              </div>
            )}
          </div>

          {/* Activity — items slide in from left, staggered */}
          <div style={{ ...card, ...slide(bottomIn, 80) }}>
            <div style={{ color: '#f1f5f9', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>Recent activity</div>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                {activities.map((a, idx) => (
                  <div key={idx} style={{
                    display: 'flex', alignItems: 'flex-start', gap: '10px',
                    opacity:   bottomIn ? 1 : 0,
                    transform: bottomIn ? 'translateX(0)' : 'translateX(-10px)',
                    transition: `opacity 0.3s ease ${200 + idx * 55}ms, transform 0.3s ease ${200 + idx * 55}ms`,
                  }}>
                    <div style={{
                      width: '7px', height: '7px', borderRadius: '50%',
                      flexShrink: 0, marginTop: '4px',
                      background: ACTIVITY_DOT[a.type] || '#475569',
                    }} />
                    <div>
                      <p style={{ color: '#c4c9d4', fontSize: '12px', margin: '0 0 2px', lineHeight: 1.5 }}>{a.text}</p>
                      <p style={{ color: '#334155', fontSize: '11px', margin: 0 }}>{a.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#334155', fontSize: '13px' }}>No recent activity yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
        {events.length === 0 && (
          <div style={{ ...card, ...slide(bottomIn, 120), textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: '60px', height: '60px', borderRadius: '16px',
              background: 'rgba(99,102,241,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 16px', fontSize: '26px',
            }}>🎪</div>
            <h3 style={{ color: '#f1f5f9', fontSize: '17px', fontWeight: 600, margin: '0 0 8px' }}>
              Create your first event
            </h3>
            <p style={{ color: '#475569', fontSize: '13px', marginBottom: '24px' }}>
              Start selling tickets and managing attendees in minutes
            </p>
            <Link to="/organiser/create" style={{ ...btnPrimary, display: 'inline-flex' }}>
              Create event →
            </Link>
          </div>
        )}

      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-grid  { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </OrganizerLayout>
  )
}

export default OrganizerDashboard