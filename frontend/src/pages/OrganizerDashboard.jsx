import React, { useEffect, useState, useMemo } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'
import OrganizerLayout from '../components/OrganizerLayout'

const categoryIcons = {
  'Hackathon': '💻',
  'Fest': '🎉',
  'Workshop': '🛠️',
  'Conference': '🎤',
  'Sports': '⚽',
  'Cultural': '🎭',
  'Meetup': '👋',
  'Other': '📌'
}

function OrganizerDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState('30')
  const [activities, setActivities] = useState([])

  useEffect(() => {
    if (!user) { navigate('/login'); return }
    if (user.role !== 'organizer') { navigate('/dashboard'); return }
    fetchOrganizerData()
  }, [user, timeFilter])

  const fetchOrganizerData = async () => {
    try {
const eventsRes = await api.get('/organizer/events')
      const rawData = eventsRes.data?.events || eventsRes.data

      console.log("📦 Organizer API response:", rawData, Array.isArray(rawData))

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
    upcomingEvents: events.filter(e => new Date(e.date) >= new Date()).length
  }), [events])

  const nextEvent = useMemo(() => {
    return events.filter(e => new Date(e.date) >= new Date()).sort((a, b) => new Date(a.date) - new Date(b.date))[0] || null
  }, [events])

  const chartData = useMemo(() => {
    const days = parseInt(timeFilter)
    const now = new Date()
    return Array.from({ length: days }, (_, i) => {
      const date = new Date(now)
      date.setDate(date.getDate() - (days - 1 - i))
      const mockSales = Math.floor(Math.random() * 20) + (events.length > 0 ? 5 : 0)
      return { date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), tickets: mockSales, revenue: mockSales * 500 }
    })
  }, [timeFilter, events])

  const getSeatProgressColor = (registered, capacity) => {
    const pct = (registered / capacity) * 100
    if (pct < 40) return 'bg-green-500'
    if (pct < 80) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(amount)

  if (loading) {
    return (
      <OrganizerLayout>
        <div className="flex items-center justify-center h-96">
          <div className="w-12 h-12 border-4 border-[#6366F1] border-t-transparent rounded-full animate-spin"></div>
        </div>
      </OrganizerLayout>
    )
  }

  return (
    <OrganizerLayout>
      <div className="space-y-10">

        <div>
          <h1 className="text-[28px] font-semibold text-[#E5E7EB]">Dashboard</h1>
          <p className="text-[14px] text-[#9CA3AF] mt-1">How are your events performing?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Events', value: stats.totalEvents, icon: '📅' },
            { label: 'Tickets Sold', value: stats.ticketsSold, icon: '🎫' },
            { label: 'Revenue', value: formatCurrency(stats.revenue), icon: '💰' },
            { label: 'Upcoming Events', value: stats.upcomingEvents, icon: '🔥' },
          ].map((stat, idx) => (
            <div key={idx} className="bg-[#121826] border border-[#1F2937] rounded-xl p-6 hover:-translate-y-0.5 transition-all duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[14px] text-[#9CA3AF]">{stat.label}</p>
                  <p className="text-2xl font-semibold mt-1">{stat.value}</p>
                </div>
                <span className="text-3xl">{stat.icon}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-[18px] font-medium">Ticket Sales Performance</h2>
              <p className="text-[14px] text-[#9CA3AF]">Track your ticket sales over time</p>
            </div>
            <div className="flex gap-2">
              {['7', '30', '90'].map((days) => (
                <button key={days} onClick={() => setTimeFilter(days)} className={`px-3 py-1.5 rounded-lg text-[14px] font-medium transition-all duration-200 ${timeFilter === days ? 'bg-[#6366F1] text-white' : 'bg-[#0B0F19] text-[#9CA3AF] hover:text-[#E5E7EB] border border-[#1F2937]'}`}>
                  {days} days
                </button>
              ))}
            </div>
          </div>
          <div className="h-64 flex items-end gap-1">
            {chartData.map((data, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full bg-[#6366F1] rounded-t transition-all duration-300 hover:brightness-110" style={{ height: `${Math.max((data.tickets / 20) * 100, 4)}%` }} title={`${data.tickets} tickets - ${formatCurrency(data.revenue)}`}></div>
              </div>
            ))}
          </div>
          <div className="flex justify-between mt-2 text-[12px] text-[#6B7280]">
            <span>{chartData[0]?.date}</span>
            <span>{chartData[chartData.length - 1]?.date}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-8">
            <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6 h-full">
              <h2 className="text-[18px] font-medium mb-4">Next Event</h2>
              {nextEvent ? (
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-14 h-14 bg-[#6366F1]/20 rounded-xl flex items-center justify-center text-2xl">{categoryIcons[nextEvent.category] || '🎉'}</div>
                    <div className="flex-1">
                      <h3 className="text-[16px] font-medium">{nextEvent.title}</h3>
                      <p className="text-[14px] text-[#9CA3AF]">📍 {nextEvent.city} • {new Date(nextEvent.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-[#0B0F19] border border-[#1F2937] rounded-lg p-3">
                      <p className="text-[12px] text-[#9CA3AF]">Tickets Sold</p>
                      <p className="text-lg font-semibold">{nextEvent.registered || 0}</p>
                    </div>
                    <div className="bg-[#0B0F19] border border-[#1F2937] rounded-lg p-3">
                      <p className="text-[12px] text-[#9CA3AF]">Seats Remaining</p>
                      <p className="text-lg font-semibold">{(nextEvent.capacity || 0) - (nextEvent.registered || 0)}</p>
                    </div>
                  </div>
                  <div className="mb-4">
                    <div className="h-2 bg-[#1F2937] rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${getSeatProgressColor(nextEvent.registered, nextEvent.capacity)}`} style={{ width: `${Math.min(((nextEvent.registered || 0) / (nextEvent.capacity || 1)) * 100, 100)}%` }}></div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Link to={`/organiser/event/${nextEvent._id}/attendees`} className="px-4 py-2.5 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 h-10 flex items-center">View Attendees</Link>
                    <Link to={`/event/${nextEvent._id}`} className="px-4 py-2.5 bg-[#121826] border border-[#1F2937] text-[#E5E7EB] rounded-lg font-medium hover:border-[#6366F1] hover:text-[#6366F1] transition-all duration-200 h-10 flex items-center">Manage Event</Link>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[#9CA3AF] mb-4">No upcoming events</p>
                  <Link to="/organiser/create" className="px-4 py-2 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 inline-block">Create Your First Event</Link>
                </div>
              )}
            </div>
          </div>

          <div className="lg:col-span-4">
            <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-6 h-full">
              <h2 className="text-[18px] font-medium mb-4">Recent Activity</h2>
              <div className="space-y-3">
                {activities.map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-2 ${activity.type === 'purchase' ? 'bg-green-500' : activity.type === 'register' ? 'bg-[#6366F1]' : activity.type === 'reminder' ? 'bg-yellow-500' : 'bg-gray-500'}`}></div>
                    <div>
                      <p className="text-[14px]">{activity.text}</p>
                      <p className="text-[12px] text-[#9CA3AF]">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {events.length === 0 && (
          <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-12 text-center">
            <div className="w-16 h-16 bg-[#6366F1]/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-[#6366F1]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-[18px] font-medium mb-2">No events yet</h3>
            <p className="text-[14px] text-[#9CA3AF] mb-6">Start by creating your first event</p>
            <Link to="/organiser/create" className="px-6 py-3 bg-[#6366F1] text-white rounded-lg font-medium hover:brightness-110 transition-all duration-200 inline-block">Create Event</Link>
          </div>
        )}

      </div>
    </OrganizerLayout>
  )
}

export default OrganizerDashboard