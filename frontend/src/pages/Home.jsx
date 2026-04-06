import React, { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../utils/api"
import EventCard from "../components/EventCard"

function CountUp({ end }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.span
      ref={ref}
      initial={{ opacity: 0 }}
      animate={inView ? { opacity: 1 } : {}}
      className="text-3xl font-bold"
    >
      {inView ? end : 0}
    </motion.span>
  )
}

function FadeSection({ children }) {
  const ref = useRef(null)
  const inView = useInView(ref, { once: true })
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  )
}

function Home() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  const titleWords = ["Discover", "Events", "That", "Matter"]

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get("/events")
        const eventsData = Array.isArray(res.data?.events)
          ? res.data.events
          : Array.isArray(res.data)
          ? res.data
          : []
        setEvents(eventsData.slice(0, 3))
      } catch (error) {
        console.error("Error fetching events:", error)
        setEvents([])
      } finally {
        setLoading(false)
      }
    }
    fetchEvents()
  }, [])

  const handleBecomeOrganizer = async () => {
    if (!user) {
      navigate("/login", { state: { from: "/organiser/dashboard" } })
      return
    }

    if (user.role === "organizer") {
      navigate("/organiser/dashboard")
      return
    }

    try {
      const token = localStorage.getItem("token")
      const res = await api.put(
        "/auth/become-organizer",
        { organizerName: user.name, organizationName: "", category: "General" },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      const newToken = res.data?.token
      if (newToken) {
        await login(newToken)
      }
      navigate("/organiser/dashboard")
    } catch (err) {
      if (err.response?.data?.error === "ALREADY_ORGANIZER") {
        navigate("/organiser/dashboard")
      } else {
        console.error("Become organizer failed:", err)
      }
    }
  }

  return (
    <div className="bg-slate-950 text-white">
      {/* HERO */}
      <section className="pt-32 pb-24 px-6 max-w-6xl mx-auto">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-8">
          {titleWords.map((word, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.6,
                delay: index * 0.2,
              }}
            >
              {word}
            </motion.div>
          ))}
        </h1>
        <p className="text-slate-400 text-lg max-w-xl mb-10">
          A modern platform to create, manage and explore high-quality events.
        </p>
        <div className="flex gap-4">
          <button
            onClick={() => navigate("/explore")}
            className="px-8 py-3 border border-white/30 rounded-md font-semibold hover:bg-slate-800"
          >
            Explore Events
          </button>
          <button
            onClick={handleBecomeOrganizer}
            className="px-8 py-3 border border-slate-700 rounded-md font-semibold hover:bg-slate-800"
          >
            Become an Organizer
          </button>
        </div>
      </section>

      {/* TRENDING EVENTS */}
      <section className="py-24 px-6 max-w-6xl mx-auto border-t border-slate-800">
        <h2 className="text-3xl font-bold mb-4">
          Trending Events This Week
        </h2>
        <p className="text-slate-400 mb-10">
          See what communities are attending right now.
        </p>
        {loading ? (
          <p className="text-slate-400">Loading events...</p>
        ) : events.length === 0 ? (
          <p className="text-slate-400">No events available</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((event, index) => (
              <EventCard
                key={event._id || index}
                event={event}
                isAuthenticated={!!user}
                index={index}
                onRegister={(id) => navigate(`/event/${id}`)}
                isFavorite={false}
                onToggleFavorite={() => {}}
                isRegistered={false}
              />
            ))}
          </div>
        )}
      </section>

      {/* STATS */}
      <FadeSection>
        <section className="py-20 border-t border-slate-800">
          <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-12 text-center">
            <div>
              <CountUp end="500+" />
              <p className="text-slate-400 mt-2">Events Hosted</p>
            </div>
            <div>
              <CountUp end="20K+" />
              <p className="text-slate-400 mt-2">Active Users</p>
            </div>
            <div>
              <CountUp end="100+" />
              <p className="text-slate-400 mt-2">Organisers</p>
            </div>
          </div>
        </section>
      </FadeSection>

      {/* FOOTER */}
      <footer className="border-t border-slate-800 py-10 text-center text-slate-500 text-sm">
        © {new Date().getFullYear()} EventNest
      </footer>
    </div>
  )
}

export default Home