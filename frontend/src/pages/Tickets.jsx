import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import api from "../utils/api";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .tl-root { font-family: 'Plus Jakarta Sans', sans-serif; }
  .tl-mono { font-family: 'DM Mono', monospace; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }

  .tl-tab {
    transition: color .15s ease, border-color .15s ease;
    cursor: pointer;
    background: none;
    border: none;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }

  .tl-card {
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 16px;
    transition: border-color .2s ease, transform .2s ease;
    cursor: default;
  }
  .tl-card:hover {
    border-color: rgba(99,102,241,.3);
    transform: translateY(-1px);
  }

  .tl-view-btn {
    transition: background .15s ease;
    text-decoration: none;
  }
  .tl-view-btn:hover { background: #4f46e5 !important; }

  .tl-explore-btn:hover { opacity: .85; }
  .tl-explore-btn { transition: opacity .15s ease; text-decoration: none; }

  @media (max-width: 600px) {
    .tl-card-inner {
      flex-direction: column !important;
      align-items: flex-start !important;
      gap: 14px !important;
    }
    .tl-card-right {
      flex-direction: row !important;
      align-items: center !important;
      justify-content: space-between !important;
      width: 100% !important;
    }
    .tl-card-right-meta {
      align-items: flex-start !important;
    }
  }
`;

/* same initials + accent logic as Ticket.jsx */
const getInitials = (title = "") => {
  const words = title.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
const getAccentColor = (title = "") => {
  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]
  return colors[title.charCodeAt(0) % colors.length]
}

const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })

function Tickets() {
  const navigate = useNavigate();
  const [tickets, setTickets]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const [activeTab, setActiveTab] = useState("upcoming");

  useEffect(() => {
    const fetchTickets = async () => {
      const token = localStorage.getItem('token');
      if (!token) { navigate('/login'); return; }
      try {
        const res = await api.get("/registrations/my-tickets");
        console.log("🎫 Tickets API response:", res.data);
        setTickets(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        console.error('❌ Error fetching tickets:', err);
        setError('Failed to load tickets');
      } finally {
        setLoading(false);
      }
    };
    fetchTickets();
  }, [navigate]);

  /* ── loading ── */
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080c14",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid rgba(99,102,241,.15)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%", animation: "spin .8s linear infinite",
        }} />
      </div>
    );
  }

  /* ── filter tabs ── */
  const now      = new Date();
  const upcoming = tickets.filter(t => t.event?.date && new Date(t.event.date) >= now);
  const past     = tickets.filter(t => t.event?.date && new Date(t.event.date) < now);
  const shown    = activeTab === "upcoming" ? upcoming : past;

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="tl-root"
        style={{ minHeight: "100vh", background: "#080c14", padding: "32px 16px 64px" }}
      >
        <div style={{ maxWidth: 720, margin: "0 auto" }}>

          {/* ── HEADER ── */}
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .4, ease: [.22,1,.36,1] }}
            style={{ marginBottom: 28 }}
          >
            <h1 style={{
              fontSize: 24, fontWeight: 800, color: "#f0f4ff",
              margin: "0 0 4px",
            }}>
              My Tickets
            </h1>
            <p style={{ fontSize: 13, color: "#4b5563", margin: 0, fontWeight: 500 }}>
              View all your registered event tickets
            </p>
          </motion.div>

          {/* ── TABS ── */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: .4, ease: [.22,1,.36,1], delay: .05 }}
            style={{
              display: "flex", gap: 4,
              background: "#0f1623",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 12,
              padding: 4,
              marginBottom: 20,
              width: "fit-content",
            }}
          >
            {[
              { key: "upcoming", label: "Upcoming", count: upcoming.length },
              { key: "past",     label: "Past",     count: past.length },
            ].map(tab => (
              <button
                key={tab.key}
                className="tl-tab"
                onClick={() => setActiveTab(tab.key)}
                style={{
                  padding: "8px 18px",
                  borderRadius: 9,
                  fontSize: 13, fontWeight: 700,
                  color: activeTab === tab.key ? "#f0f4ff" : "#4b5563",
                  background: activeTab === tab.key ? "#1e2536" : "transparent",
                  border: activeTab === tab.key
                    ? "1px solid rgba(99,102,241,.25)"
                    : "1px solid transparent",
                  display: "flex", alignItems: "center", gap: 7,
                }}
              >
                {tab.label}
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  color: activeTab === tab.key ? "#6366f1" : "#374151",
                  background: activeTab === tab.key ? "rgba(99,102,241,.15)" : "rgba(255,255,255,.04)",
                  padding: "1px 7px", borderRadius: 99,
                  fontFamily: "'DM Mono', monospace",
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </motion.div>

          {/* ── ERROR ── */}
          {error && (
            <div style={{
              marginBottom: 16, padding: "12px 16px",
              background: "rgba(239,68,68,.08)",
              border: "1px solid rgba(239,68,68,.2)",
              borderRadius: 12, color: "#f87171", fontSize: 13, fontWeight: 500,
            }}>
              {error}
            </div>
          )}

          {/* ── EMPTY STATE ── */}
          {shown.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: .4, ease: [.22,1,.36,1] }}
              style={{
                background: "#0f1623",
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 18,
                padding: "52px 24px",
                textAlign: "center",
              }}
            >
              <span style={{ fontSize: 36, display: "block", marginBottom: 14 }}>
                {activeTab === "upcoming" ? "🗓" : "📭"}
              </span>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: "#d1d5db", margin: "0 0 6px" }}>
                {activeTab === "upcoming" ? "No upcoming events" : "No past events"}
              </h3>
              <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 22px", lineHeight: 1.6 }}>
                {activeTab === "upcoming"
                  ? "Browse events and register for your next experience"
                  : "Events you've attended will appear here"}
              </p>
              {activeTab === "upcoming" && (
                <Link
                  to="/explore"
                  className="tl-explore-btn"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 7,
                    padding: "10px 22px",
                    background: "#6366f1",
                    borderRadius: 11,
                    color: "#fff", fontSize: 13, fontWeight: 700,
                    boxShadow: "0 4px 16px rgba(99,102,241,.3)",
                  }}
                >
                  Explore Events →
                </Link>
              )}
            </motion.div>
          ) : (

            /* ── TICKET LIST ── */
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {shown.map((ticket, index) => {
                const event       = ticket.event;
                const title       = ticket.eventDeleted ? "Event Deleted" : (event?.title || "Unknown Event")
                const initials    = getInitials(title)
                const accentColor = getAccentColor(title)
                const isPast      = event?.date && new Date(event.date) < now

                return (
                  <motion.div
                    key={ticket.ticketId || ticket._id}
                    className="tl-card"
                    initial={{ opacity: 0, y: 14 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: .35, ease: [.22,1,.36,1], delay: index * 0.06 }}
                  >
                    <div
                      className="tl-card-inner"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "18px 20px",
                        gap: 16,
                      }}
                    >
                      {/* LEFT — thumbnail + info */}
                      <div style={{ display: "flex", alignItems: "center", gap: 14, flex: 1, minWidth: 0 }}>

                        {/* Thumbnail */}
                        <div style={{
                          width: 52, height: 52, borderRadius: 13,
                          overflow: "hidden", flexShrink: 0,
                          background: `${accentColor}12`,
                          border: `1px solid ${accentColor}25`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          position: "relative",
                        }}>
                          {event?.image ? (
                            <img
                              src={event.image}
                              alt={title}
                              style={{ width: "100%", height: "100%", objectFit: "cover" }}
                              onError={e => { e.target.style.display = "none" }}
                            />
                          ) : (
                            <span style={{
                              fontSize: 16, fontWeight: 800, color: accentColor,
                              fontFamily: "'Plus Jakarta Sans', sans-serif",
                            }}>
                              {initials}
                            </span>
                          )}
                          {/* past overlay */}
                          {isPast && (
                            <div style={{
                              position: "absolute", inset: 0,
                              background: "rgba(0,0,0,.45)",
                              display: "flex", alignItems: "center", justifyContent: "center",
                            }}>
                              <span style={{ fontSize: 18 }}>✓</span>
                            </div>
                          )}
                        </div>

                        {/* Event info */}
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <h3 style={{
                            fontSize: 15, fontWeight: 700, color: "#f0f4ff",
                            margin: "0 0 4px",
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {title}
                          </h3>
                          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                              📅 {event?.date ? fmtDate(event.date) : "TBD"}
                            </span>
                            <span style={{
                              fontSize: 12, color: "#6b7280", fontWeight: 500,
                              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                              maxWidth: 180,
                            }}>
                              📍 {event?.venue || "N/A"}{event?.city ? `, ${event.city}` : ""}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* RIGHT — price + id + button */}
                      <div
                        className="tl-card-right"
                        style={{
                          display: "flex", flexDirection: "column",
                          alignItems: "flex-end", gap: 6, flexShrink: 0,
                        }}
                      >
                        <div className="tl-card-right-meta" style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                          <span style={{ fontSize: 15, fontWeight: 800, color: "#f0f4ff" }}>
                            {ticket.amount === 0 ? "Free" : `₹${ticket.amount}`}
                          </span>
                          <span className="tl-mono" style={{
                            fontSize: 10, color: "#374151", fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                            maxWidth: 140,
                          }}>
                            {ticket.ticketId}
                          </span>
                        </div>

                        {!ticket.eventDeleted && ticket.ticketId && (
                          <Link
                            to={`/ticket/${ticket.ticketId}`}
                            className="tl-view-btn"
                            style={{
                              padding: "7px 16px",
                              background: "#6366f1",
                              borderRadius: 9,
                              color: "#fff", fontSize: 12, fontWeight: 700,
                              letterSpacing: ".02em",
                            }}
                          >
                            View Ticket
                          </Link>
                        )}

                        {ticket.eventDeleted && (
                          <span style={{
                            fontSize: 11, fontWeight: 600,
                            color: "#ef4444",
                            background: "rgba(239,68,68,.08)",
                            border: "1px solid rgba(239,68,68,.2)",
                            padding: "3px 10px", borderRadius: 99,
                          }}>
                            Event Deleted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* bottom accent line */}
                    <div style={{
                      height: 2,
                      background: `linear-gradient(90deg, ${accentColor}40, transparent)`,
                      borderRadius: "0 0 16px 16px",
                    }} />
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* ── FOOTER COUNT ── */}
          {shown.length > 0 && (
            <p style={{
              textAlign: "center", fontSize: 12, color: "#1f2937",
              marginTop: 24, fontWeight: 500,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
            }}>
              {shown.length} ticket{shown.length !== 1 ? "s" : ""} · EventNest
            </p>
          )}

        </div>
      </div>
    </>
  );
}

export default Tickets;