import React, { useEffect, useState } from "react";
import api from "../utils/api";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import EventCard from "../components/EventCard";
import { useAuth } from "../context/AuthContext";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .ex-root { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(14px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .ex-search {
    width: 100%;
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    padding: 13px 16px 13px 44px;
    color: #f0f4ff;
    font-size: 14px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 500;
    outline: none;
    transition: border-color .15s ease, box-shadow .15s ease;
  }
  .ex-search:focus {
    border-color: rgba(99,102,241,.5);
    box-shadow: 0 0 0 3px rgba(99,102,241,.08);
  }
  .ex-search::placeholder { color: #374151; }

  .ex-select {
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 12px;
    padding: 13px 36px 13px 14px;
    color: #9ca3af;
    font-size: 13px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    font-weight: 600;
    outline: none;
    cursor: pointer;
    appearance: none;
    -webkit-appearance: none;
    transition: border-color .15s ease;
    white-space: nowrap;
  }
  .ex-select:focus { border-color: rgba(99,102,241,.5); }
  .ex-select option { background: #0f1623; color: #f0f4ff; }

  .ex-select-wrap {
    position: relative; flex-shrink: 0;
  }
  .ex-select-wrap::after {
    content: '';
    position: absolute; right: 12px; top: 50%;
    transform: translateY(-50%);
    width: 0; height: 0;
    border-left: 4px solid transparent;
    border-right: 4px solid transparent;
    border-top: 5px solid #4b5563;
    pointer-events: none;
  }

  .ex-empty {
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding: 80px 24px; text-align: center;
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 18px;
  }

  @media (max-width: 640px) {
    .ex-filter-row { flex-direction: column !important; }
    .ex-select-row { flex-direction: row !important; gap: 8px !important; }
    .ex-select { flex: 1; }
  }
`;

function Explore() {
  const { user }   = useAuth();
  const navigate   = useNavigate();

  const [events, setEvents]                   = useState([]);
  const [filteredEvents, setFilteredEvents]   = useState([]);
  const [search, setSearch]                   = useState("");
  const [category, setCategory]               = useState("All");
  const [city, setCity]                       = useState("All");
  const [cities, setCities]                   = useState(["All"]);
  const [favorites, setFavorites]             = useState([]);
  const [registeredEvents, setRegisteredEvents] = useState([]); // NEW

  useEffect(() => {
    if (!user) return
    const loadFavorites = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await api.get('/auth/profile', {
          headers: { Authorization: `Bearer ${token}` }
        })
        const userFavs = res.data?.favorites || 
                         res.data?.user?.favorites || []
        setFavorites(userFavs.map(f => f._id || f))
      } catch (err) {
        console.log('Could not load favorites:', err)
      }
    }

    const loadRegistrations = async () => {
      try {
        const token = localStorage.getItem('token')
        const res = await api.get('/registrations/my-tickets', {
          headers: { Authorization: `Bearer ${token}` }
        })
        // res.data is array of tickets, each has { event: { _id, ... } }
        const ids = res.data
          .filter(t => t.event && t.event._id)
          .map(t => t.event._id)
        setRegisteredEvents(ids)
      } catch (err) {
        console.log('Could not load registrations:', err)
      }
    }

    loadFavorites()
    loadRegistrations()
  }, [user])

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await api.get("/events");
        let eventData = [];
        if (Array.isArray(res.data)) eventData = res.data;
        else if (res.data?.events && Array.isArray(res.data.events)) eventData = res.data.events;
        else if (typeof res.data === "object") {
          const possibleArray = Object.values(res.data).find(v => Array.isArray(v));
          if (possibleArray) eventData = possibleArray;
        }
        setEvents(eventData);
        setFilteredEvents(eventData);
        setCities(["All", ...new Set(eventData.map(e => e.city).filter(Boolean))]);
      } catch (err) {
        console.error("Unable to load events", err);
        setEvents([]); setFilteredEvents([]);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    let filtered = [...events];
    if (search)          filtered = filtered.filter(e => e.title?.toLowerCase().includes(search.toLowerCase()));
    if (category !== "All") filtered = filtered.filter(e => e.category === category);
    if (city !== "All")     filtered = filtered.filter(e => e.city === city);
    setFilteredEvents(filtered);
  }, [search, category, city, events]);

  const handleToggleFavorite = async (eventId) => {
    if (!user) { return }
    const token = localStorage.getItem('token')
    const isCurrentlyFav = favorites.includes(eventId)
    
    // Optimistic UI update first
    setFavorites(prev =>
      isCurrentlyFav
        ? prev.filter(id => id !== eventId)
        : [...prev, eventId]
    )
    
    try {
      await api.post(
        `/events/${eventId}/favorite`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      )
    } catch (err) {
      // Revert on failure
      console.error('Favorite toggle failed:', err)
      setFavorites(prev =>
        isCurrentlyFav
          ? [...prev, eventId]
          : prev.filter(id => id !== eventId)
      )
    }
  };

  return (
    <>
      <style>{STYLES}</style>
      <div className="ex-root" style={{ minHeight: "100vh", background: "#080c14", padding: "32px 0 80px" }}>
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "0 24px" }}>

          {/* ── HEADER ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .4, ease: [.22,1,.36,1] }}
            style={{ marginBottom: 24 }}
          >
            <h1 style={{ fontSize: 24, fontWeight: 800, color: "#f0f4ff", margin: "0 0 4px" }}>
              Explore Events
            </h1>
            <p style={{ fontSize: 13, color: "#4b5563", margin: 0, fontWeight: 500 }}>
              Discover experiences happening near you
            </p>
          </motion.div>

          {/* ── FILTER BAR ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .4, ease: [.22,1,.36,1], delay: .05 }}
            style={{
              background: "#0f1623",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 16,
              padding: "16px",
              marginBottom: 24,
            }}
          >
            <div className="ex-filter-row" style={{ display: "flex", gap: 10, alignItems: "center" }}>
              {/* Search */}
              <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
                <svg
                  width="16" height="16" fill="none" stroke="#4b5563" strokeWidth="2"
                  viewBox="0 0 24 24"
                  style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", pointerEvents: "none" }}
                >
                  <circle cx="11" cy="11" r="8" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  className="ex-search"
                  type="text"
                  placeholder="Search events, cities, categories…"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>

              {/* Selects */}
              <div className="ex-select-row" style={{ display: "flex", gap: 10 }}>
                <div className="ex-select-wrap">
                  <select className="ex-select" value={category} onChange={e => setCategory(e.target.value)}>
                    <option value="All">All Categories</option>
                    <option value="Hackathon">Hackathon</option>
                    <option value="Fest">Fest</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Conference">Conference</option>
                    <option value="Cultural">Cultural</option>
                    <option value="Sports">Sports</option>
                    <option value="Meetup">Meetup</option>
                  </select>
                </div>
                <div className="ex-select-wrap">
                  <select className="ex-select" value={city} onChange={e => setCity(e.target.value)}>
                    {cities.map(c => <option key={c} value={c}>{c === "All" ? "All Cities" : c}</option>)}
                  </select>
                </div>
              </div>
            </div>
          </motion.div>

          {/* ── COUNT ── */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 18 }}>
            <span style={{
              fontSize: 11, fontWeight: 700, letterSpacing: ".07em",
              color: "#6366f1", background: "rgba(99,102,241,.1)",
              border: "1px solid rgba(99,102,241,.2)",
              padding: "3px 10px", borderRadius: 99,
              fontFamily: "'DM Mono', monospace",
            }}>
              {filteredEvents.length}
            </span>
            <span style={{ fontSize: 13, color: "#4b5563", fontWeight: 500 }}>
              event{filteredEvents.length !== 1 ? "s" : ""} found
            </span>
          </div>

          {/* ── GRID ── */}
          {filteredEvents.length === 0 ? (
            <div className="ex-empty">
              <span style={{ fontSize: 40, marginBottom: 16 }}>🔍</span>
              <p style={{ fontSize: 16, fontWeight: 700, color: "#d1d5db", margin: "0 0 6px" }}>
                No events found
              </p>
              <p style={{ fontSize: 13, color: "#4b5563", margin: 0, lineHeight: 1.6 }}>
                Try adjusting your search or filters
              </p>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 16,
              }}
            >
              {filteredEvents.map((event, index) => (
                <EventCard
                  key={event._id}
                  event={event}
                  index={index}
                  isAuthenticated={!!user}
                  onRegister={id => navigate(`/event/${id}`)}
                  isFavorite={favorites.includes(event._id)}
                  onToggleFavorite={handleToggleFavorite}
                  isRegistered={registeredEvents.includes(event._id)} // NEW
                />
              ))}
            </motion.div>
          )}

        </div>
      </div>
    </>
  );
}

export default Explore;