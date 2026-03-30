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

const S = {
  // Stat card
  statCard: {
    background: '#0d1220', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '16px', padding: '20px 22px', display: 'flex',
    flexDirection: 'column', gap: '10px', flex: '1 1 140px', minWidth: '0',
  },
  statLabel: { color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { color: '#e5e7eb', fontSize: '26px', fontWeight: 700, lineHeight: 1 },
  statTrend: { color: '#34d399', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  // Section card
  card: { background: '#0d1220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '22px' },
  cardTitle: { color: '#e5e7eb', fontSize: '16px', fontWeight: 600, marginBottom: '16px' },
  // Button
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', background: '#6366f1', color: 'white',
    border: 'none', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', textDecoration: 'none', transition: 'opacity 0.15s',
  },
  btnOutline: {
    display: 'inline-flex', alignItems: 'center', gap: '6px',
    padding: '9px 18px', background: 'transparent',
    color: '#9ca3af', border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '10px', fontSize: '13px', fontWeight: 500,
    cursor: 'pointer', textDecoration: 'none', transition: 'all 0.15s',
  },
}

function OrganizerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('30')
  const [activities, setActivities] = useState([])
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'organizer') { navigate('/dashboard'); return }
    fetchOrganizerData()
  }, [user, timeFilter])

  const fetchOrganizerData = async () => {
    try {
      const eventsRes = await api.get('/organizer/events')
      const rawData = eventsRes.data?.events || eventsRes.data
      const organizerEvents = Array.isArray(rawData) ? rawData : []
      setEvents(organizerEvents)
      setActivities([
        { id: 1, type: 'purchase', text: 'New ticket purchased for Tech Bootcamp', time: '2 hours ago' },
        { id: 2, type: 'register', text: 'New attendee registered for Workshop', time: '5 hours ago' },
        { id: 3, type: 'reminder', text: 'Reminder email sent to attendees', time: '1 day ago' },
        { id: 4, type: 'purchase', text: 'New ticket purchased for Meetup', time: '2 days ago' },
      ])
    } catch (error) {
      console.error('❌ Organizer data error:', error.response?.data || error.message)
    } finally {
      setLoading(false)
    }
  }

  const stats = useMemo(() => ({
    totalEvents: events.length,
    ticketsSold: events.reduce((sum, e) => sum + (e.registered || 0), 0),
    revenue: events.reduce((sum, e) => sum + ((e.registered || 0) * (e.price || 0)), 0),
    upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length,
  }), [events])

  const nextEvent = useMemo(() => {
    return events.filter(e => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  }, [events])

  const chartData = useMemo(() => {
    const days = parseInt(timeFilter)
    const now = new Date()
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (days - 1 - i))
      const mockSales = Math.floor(Math.random() * 20) + (events.length > 0 ? 5 : 0)
      return { date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), tickets: mockSales }
    })
  }, [timeFilter, events])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const maxTickets = Math.max(...chartData.map(d => d.tickets), 1)

  const activityDot = { purchase: '#34d399', register: '#6366f1', reminder: '#f59e0b' }

  if (loading) {
    return (
      <OrganizerLayout>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
          <div style={{
            width: '40px', height: '40px', border: '3px solid rgba(99,102,241,0.2)',
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ color: '#e5e7eb', fontSize: '24px', fontWeight: 700, margin: 0 }}>
              Welcome back{user?.name ? `, ${user.name.split(' ')[0]}` : ''} 👋
            </h1>
            <p style={{ color: '#6b7280', fontSize: '14px', margin: '4px 0 0' }}>
              Here's how your events are performing
            </p>
          </div>
          <Link to="/organiser/create" style={S.btnPrimary}>
            <span style={{ fontSize: '16px', lineHeight: 1 }}>+</span> Create event
          </Link>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
          {[
            { label: 'Total events', value: stats.totalEvents, trend: null, icon: '📅' },
            { label: 'Tickets sold', value: stats.ticketsSold, trend: '+12 this week', icon: '🎫' },
            { label: 'Revenue', value: formatCurrency(stats.revenue), trend: null, icon: '💰' },
            { label: 'Upcoming', value: stats.upcomingEvents, trend: null, icon: '🔥' },
          ].map((s, i) => (
            <div key={i} style={S.statCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={S.statLabel}>{s.label}</span>
                <span style={{ fontSize: '20px' }}>{s.icon}</span>
              </div>
              <div style={S.statValue}>{s.value}</div>
              {s.trend && <div style={S.statTrend}><span>↑</span>{s.trend}</div>}
            </div>
          ))}
        </div>

        {/* ── Chart ── */}
        <div style={S.card}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '20px' }}>
            <div>
              <div style={S.cardTitle}>Ticket sales</div>
              <p style={{ color: '#6b7280', fontSize: '13px', margin: '-10px 0 0' }}>Tickets sold per day</p>
            </div>
            <div style={{ display: 'flex', gap: '4px' }}>
              {['7', '30', '90'].map(d => (
                <button key={d} onClick={() => setTimeFilter(d)} style={{
                  padding: '6px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: 500,
                  border: 'none', cursor: 'pointer', transition: 'all 0.15s',
                  background: timeFilter === d ? '#6366f1' : 'rgba(255,255,255,0.04)',
                  color: timeFilter === d ? 'white' : '#6b7280',
                }}>
                  {d}d
                </button>
              ))}
            </div>
          </div>
          {/* Bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
            {chartData.map((d, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0',
                  background: i === chartData.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.25)',
                  height: `${Math.max((d.tickets / maxTickets) * 100, 4)}%`,
                  transition: 'height 0.3s',
                }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ color: '#4b5563', fontSize: '11px' }}>{chartData[0]?.date}</span>
            <span style={{ color: '#4b5563', fontSize: '11px' }}>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>

        {/* ── Next event + Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: '16px' }}>

          {/* Next event */}
          <div style={S.card}>
            <div style={S.cardTitle}>Next event</div>
            {nextEvent ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', marginBottom: '16px' }}>
                  <div style={{
                    width: '48px', height: '48px', borderRadius: '12px',
                    background: 'rgba(99,102,241,0.12)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0,
                  }}>
                    {categoryIcons[nextEvent.category] || '🎉'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <h3 style={{ color: '#e5e7eb', fontSize: '16px', fontWeight: 600, margin: '0 0 4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {nextEvent.title}
                    </h3>
                    <p style={{ color: '#6b7280', fontSize: '13px', margin: 0 }}>
                      📍 {nextEvent.city} · {new Date(nextEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                {/* Seat stats */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: 'Sold', value: nextEvent.registered || 0 },
                    { label: 'Remaining', value: (nextEvent.capacity || 0) - (nextEvent.registered || 0) },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#080c14', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                      <p style={{ color: '#e5e7eb', fontSize: '20px', fontWeight: 700, margin: 0 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

                {/* Progress */}
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <span style={{ color: '#6b7280', fontSize: '12px' }}>Capacity</span>
                    <span style={{ color: '#9ca3af', fontSize: '12px' }}>
                      {Math.round(((nextEvent.registered || 0) / (nextEvent.capacity || 1)) * 100)}%
                    </span>
                  </div>
                  <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '999px', overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: '999px',
                      background: ((nextEvent.registered || 0) / (nextEvent.capacity || 1)) > 0.8 ? '#f87171' : '#6366f1',
                      width: `${Math.min(((nextEvent.registered || 0) / (nextEvent.capacity || 1)) * 100, 100)}%`,
                      transition: 'width 0.4s',
                    }} />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <Link to={`/organiser/event/${nextEvent._id}/attendees`} style={S.btnPrimary}>
                    View attendees
                  </Link>
                  <Link to={`/event/${nextEvent._id}`} style={S.btnOutline}>
                    Manage event
                  </Link>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '32px 0' }}>
                <div style={{
                  width: '56px', height: '56px', borderRadius: '14px',
                  background: 'rgba(99,102,241,0.1)', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '24px',
                }}>📅</div>
                <p style={{ color: '#9ca3af', fontSize: '14px', marginBottom: '16px' }}>No upcoming events</p>
                <Link to="/organiser/create" style={S.btnPrimary}>Create your first event</Link>
              </div>
            )}
          </div>

          {/* Recent activity */}
          <div style={S.card}>
            <div style={S.cardTitle}>Recent activity</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activities.map(a => (
                <div key={a.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                  <div style={{
                    width: '8px', height: '8px', borderRadius: '50%', flexShrink: 0, marginTop: '5px',
                    background: activityDot[a.type] || '#6b7280',
                  }} />
                  <div>
                    <p style={{ color: '#d1d5db', fontSize: '13px', margin: '0 0 2px', lineHeight: 1.4 }}>{a.text}</p>
                    <p style={{ color: '#4b5563', fontSize: '12px', margin: 0 }}>{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Empty state (no events at all) ── */}
        {events.length === 0 && (
          <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '16px',
              background: 'rgba(99,102,241,0.1)', display: 'flex',
              alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', fontSize: '28px',
            }}>🎪</div>
            <h3 style={{ color: '#e5e7eb', fontSize: '18px', fontWeight: 600, margin: '0 0 8px' }}>
              Create your first event
            </h3>
            <p style={{ color: '#6b7280', fontSize: '14px', marginBottom: '24px' }}>
              Start selling tickets and managing attendees in minutes
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxWidth: '280px', margin: '0 auto' }}>
              {['Complete your organizer profile', 'Create your first event', 'Set up UPI payout'].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                  <div style={{
                    width: '22px', height: '22px', borderRadius: '6px', flexShrink: 0,
                    background: i === 0 ? '#6366f1' : 'rgba(255,255,255,0.05)',
                    border: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '11px', color: i === 0 ? 'white' : '#4b5563', fontWeight: 700,
                  }}>
                    {i === 0 ? '✓' : i + 1}
                  </div>
                  <span style={{ color: i === 0 ? '#9ca3af' : '#6b7280', fontSize: '13px', textDecoration: i === 0 ? 'line-through' : 'none' }}>
                    {item}
                  </span>
                </div>
              ))}
            </div>
            <Link to="/organiser/create" style={{ ...S.btnPrimary, display: 'inline-flex', marginTop: '24px' }}>
              Create event →
            </Link>
          </div>
        )}

      </div>

      {/* Responsive styles */}
      <style>{`
        @media (max-width: 768px) {
          .dash-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </OrganizerLayout>
  )
}

export default OrganizerDashboard