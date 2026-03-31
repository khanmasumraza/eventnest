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
  statCard: {
    background: '#0d1220', border: '1px solid rgba(255,255,255,0.06)',
    borderRadius: '14px', padding: '18px 20px', display: 'flex',
    flexDirection: 'column', gap: '8px', minWidth: '0',
  },
  statLabel: { color: '#6b7280', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' },
  statValue: { color: '#e5e7eb', fontSize: '26px', fontWeight: 700, lineHeight: 1 },
  statTrend: { color: '#34d399', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px' },
  card: { background: '#0d1220', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '16px', padding: '22px' },
  cardTitle: { color: '#e5e7eb', fontSize: '16px', fontWeight: 600, marginBottom: '16px' },
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

// ✅ Moved outside component — pure utility, no hooks needed
function getTimeAgo(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (mins < 60) return `${mins} min ago`
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  return `${days} day${days > 1 ? 's' : ''} ago`
}

function OrganizerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [events, setEvents] = useState([])
  const [tickets, setTickets] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('30')

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'organizer') { navigate('/dashboard'); return }
    fetchOrganizerData()
  }, [user])

  const fetchOrganizerData = async () => {
    try {
      const eventsRes = await api.get('/events/my-events')
      const rawData = eventsRes.data?.events || eventsRes.data
      const organizerEvents = Array.isArray(rawData) ? rawData : []
      setEvents(organizerEvents)

      try {
        const ticketsRes = await api.get('/tickets/organizer/all')
        setTickets(ticketsRes.data?.tickets || ticketsRes.data || [])
      } catch {
        setTickets([])
      }
    } catch (error) {
      console.error('❌ Dashboard data error:', error.response?.data || error.message)
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
    return events
      .filter(e => new Date(e.date) >= new Date())
      .sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  }, [events])

  const chartData = useMemo(() => {
    const days = parseInt(timeFilter)
    const now = new Date()
    const buckets = {}

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(d.getDate() - i)
      const key = d.toISOString().split('T')[0]
      buckets[key] = { tickets: 0, date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) }
    }

    tickets.forEach(ticket => {
      if (!ticket.createdAt) return
      const key = new Date(ticket.createdAt).toISOString().split('T')[0]
      if (buckets[key]) buckets[key].tickets += 1
    })

    return Object.values(buckets)
  }, [timeFilter, tickets])

  // ✅ getTimeAgo is now defined above, so this useMemo works fine
  const activities = useMemo(() => {
    if (tickets.length === 0 && events.length === 0) return []

    const items = []

    const recentTickets = [...tickets]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 3)

    recentTickets.forEach(ticket => {
      const eventTitle = ticket.event?.title || 'an event'
      const userName = ticket.user?.name || 'Someone'
      const timeAgo = getTimeAgo(ticket.createdAt)
      items.push({
        id: ticket._id,
        type: 'purchase',
        text: `${userName} purchased a ticket for ${eventTitle}`,
        time: timeAgo,
        _rawTime: ticket.createdAt,
      })
    })

    const recentEvents = [...events]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 2)

    recentEvents.forEach(event => {
      items.push({
        id: event._id,
        type: 'register',
        text: `Event "${event.title}" created`,
        time: getTimeAgo(event.createdAt),
        _rawTime: event.createdAt,
      })
    })

    return items
      .sort((a, b) => new Date(b._rawTime) - new Date(a._rawTime))
      .slice(0, 5)
  }, [tickets, events])

  const formatCurrency = (amount) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(amount)

  const maxTickets = Math.max(...chartData.map(d => d.tickets), 1)
  const activityDot = { purchase: '#34d399', register: '#6366f1', reminder: '#f59e0b' }

  const thisWeekTickets = useMemo(() => {
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return tickets.filter(t => t.createdAt && new Date(t.createdAt) >= weekAgo).length
  }, [tickets])

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" }}>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }} className="stats-grid">
          {[
            { label: 'Total events', value: stats.totalEvents, trend: null, icon: '📅' },
            {
              label: 'Tickets sold', value: stats.ticketsSold,
              trend: thisWeekTickets > 0 ? `+${thisWeekTickets} this week` : null,
              icon: '🎫'
            },
            { label: 'Revenue', value: formatCurrency(stats.revenue), trend: null, icon: '💰' },
            { label: 'Upcoming', value: stats.upcomingEvents, trend: null, icon: '🔥' },
          ].map((s, i) => (
            <div key={i} style={S.statCard}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={S.statLabel}>{s.label}</span>
                <span style={{ fontSize: '18px', opacity: 0.7 }}>{s.icon}</span>
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

          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '120px' }}>
            {chartData.map((d, i) => {
              const heightPct = d.tickets > 0
                ? Math.max((d.tickets / maxTickets) * 100, 8)
                : 3
              return (
                <div
                  key={i}
                  title={`${d.date}: ${d.tickets} ticket${d.tickets !== 1 ? 's' : ''}`}
                  style={{
                    flex: 1, height: '100%',
                    display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
                    cursor: d.tickets > 0 ? 'pointer' : 'default',
                  }}
                >
                  <div style={{
                    width: '100%', borderRadius: '4px 4px 0 0',
                    background: d.tickets > 0
                      ? (i === chartData.length - 1 ? '#6366f1' : 'rgba(99,102,241,0.5)')
                      : 'rgba(255,255,255,0.04)',
                    height: `${heightPct}%`,
                    transition: 'height 0.3s',
                  }} />
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
            <span style={{ color: '#4b5563', fontSize: '11px' }}>{chartData[0]?.date}</span>
            <span style={{ color: '#4b5563', fontSize: '11px' }}>{chartData[chartData.length - 1]?.date}</span>
          </div>

          {chartData.every(d => d.tickets === 0) && (
            <p style={{ color: '#4b5563', fontSize: '12px', textAlign: 'center', marginTop: '8px' }}>
              No ticket sales in this period
            </p>
          )}
        </div>

        {/* ── Next event + Activity ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,320px)', gap: '16px' }} className="dash-grid">

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
                      📍 {nextEvent.city || nextEvent.venue || 'TBD'} · {new Date(nextEvent.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
                  {[
                    { label: 'Sold', value: nextEvent.registered || 0 },
                    { label: 'Remaining', value: Math.max((nextEvent.capacity || 0) - (nextEvent.registered || 0), 0) },
                  ].map((item, i) => (
                    <div key={i} style={{ background: '#080c14', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '10px', padding: '12px' }}>
                      <p style={{ color: '#6b7280', fontSize: '11px', margin: '0 0 4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{item.label}</p>
                      <p style={{ color: '#e5e7eb', fontSize: '20px', fontWeight: 700, margin: 0 }}>{item.value}</p>
                    </div>
                  ))}
                </div>

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
                  <Link to={`/organiser/attendees?event=${nextEvent._id}`} style={S.btnPrimary}>
                    View attendees
                  </Link>
                  <Link to={`/organiser/events`} style={S.btnOutline}>
                    All events
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

          {/* Activity feed */}
          <div style={S.card}>
            <div style={S.cardTitle}>Recent activity</div>
            {activities.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {activities.map((a, idx) => (
                  <div key={idx} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
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
            ) : (
              <div style={{ textAlign: 'center', padding: '24px 0' }}>
                <p style={{ color: '#4b5563', fontSize: '13px' }}>No recent activity yet</p>
              </div>
            )}
          </div>
        </div>

        {/* ── Empty state ── */}
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
            <Link to="/organiser/create" style={{ ...S.btnPrimary, display: 'inline-flex', marginTop: '8px' }}>
              Create event →
            </Link>
          </div>
        )}

      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg) } }
        @media (max-width: 900px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr) !important; }
          .dash-grid { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </OrganizerLayout>
  )
}

export default OrganizerDashboard