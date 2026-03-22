import React, { useEffect, useState, useCallback } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import EventCard from "./EventCard";

const API_URL = "http://localhost:5000/api";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .ed-root { font-family: 'Plus Jakarta Sans', sans-serif; }
  .ed-mono { font-family: 'DM Mono', monospace; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(.75); }
  }

  .ed-fade-1 { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) .05s both; }
  .ed-fade-2 { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) .15s both; }
  .ed-fade-3 { animation: fadeUp .5s cubic-bezier(.22,1,.36,1) .25s both; }

  .ed-cta-btn {
    transition: transform .15s ease, box-shadow .2s ease, opacity .15s ease;
    cursor: pointer;
  }
  .ed-cta-btn:hover {
    transform: translateY(-1px);
    opacity: .92;
  }

  .ed-share-btn {
    transition: background .15s ease, border-color .15s ease;
    cursor: pointer;
  }
  .ed-share-btn:hover {
    background: rgba(255,255,255,.08) !important;
    border-color: rgba(255,255,255,.15) !important;
  }

  .ed-info-pill {
    display: inline-flex; align-items: center; gap: 7px;
    padding: 8px 14px;
    background: rgba(255,255,255,.04);
    border: 1px solid rgba(255,255,255,.07);
    border-radius: 99px;
    font-size: 13px; font-weight: 600; color: #9ca3af;
  }

  .ed-sidebar {
    position: sticky;
    top: 88px;
  }

  .ed-progress-bar {
    transition: width .6s cubic-bezier(.22,1,.36,1);
    border-radius: 99px;
  }

  @media (max-width: 768px) {
    .ed-grid { grid-template-columns: 1fr !important; }
    .ed-sidebar { position: static !important; }
    .ed-hero-title { font-size: 28px !important; }
    .ed-pills { flex-wrap: wrap !important; }
  }
`;

/* initials fallback — same as other pages */
const getInitials = (title = "") => {
  const words = title.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}
const getAccentColor = (title = "") => {
  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b"]
  return colors[title.charCodeAt(0) % colors.length]
}

function EventDetails() {
  const { id }       = useParams();
  const navigate     = useNavigate();
  const { user }     = useAuth();

  const [event, setEvent]                         = useState(null);
  const [similarEvents, setSimilarEvents]         = useState([]);
  const [loading, setLoading]                     = useState(true);
  const [error, setError]                         = useState(null);
  const [registrationStatus, setRegistrationStatus] = useState({ registered: false, ticketId: null });
  const [seatsLeft, setSeatsLeft]                 = useState(0);
  const [progressPercentage, setProgressPercentage] = useState(0);
  const [imgError, setImgError]                   = useState(false);
  const [copyLabel, setCopyLabel]                 = useState("Copy link");

  const fetchEventData = useCallback(async () => {
    if (!id || id === "undefined") {
      setError("Invalid event ID");
      setLoading(false);
      return;
    }
    try {
      const eventRes  = await axios.get(`${API_URL}/events/${id}`);
      const eventData = eventRes.data?.event || eventRes.data;
      setEvent(eventData);

      const registered = eventData.registered || 0;
      const capacity   = eventData.capacity   || 250;
      setSeatsLeft(capacity - registered);
      setProgressPercentage(Math.min((registered / capacity) * 100, 100));

      if (user) {
        try {
          const statusRes = await axios.get(
            `${API_URL}/registrations/${id}/registration-status`,
            { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
          );
          setRegistrationStatus({
            registered: statusRes.data?.registered || false,
            ticketId:   statusRes.data?.ticketId   || null,
          });
        } catch { console.log("Not registered yet"); }
      }

      const allEvents   = await axios.get(`${API_URL}/events`);
      const eventsArray = Array.isArray(allEvents.data)
        ? allEvents.data
        : allEvents.data?.events || [];

      setSimilarEvents(
        eventsArray.filter(e => e._id !== id && e.category === eventData.category).slice(0, 3)
      );
    } catch (err) {
      console.error("Error loading event:", err);
      setError("Event not found");
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => { fetchEventData(); }, [fetchEventData]);

  const handleRegister = () => {
    if (!user) { navigate("/login", { state: { from: `/event/${id}/checkout` } }); return; }
    navigate(`/event/${id}/checkout`);
  };
  const handleViewTicket = () => {
    if (registrationStatus.ticketId) navigate(`/ticket/${registrationStatus.ticketId}`);
  };

  const handleShare = (platform) => {
    const url  = window.location.href;
    const text = `Check out this event: ${event?.title || ""}`;
    if (platform === "facebook") {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "twitter") {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, "_blank");
    } else if (platform === "linkedin") {
      window.open(`https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(text)}`, "_blank");
    } else if (platform === "whatsapp") {
      window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + url)}`, "_blank");
    } else if (platform === "copy") {
      navigator.clipboard.writeText(url);
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Copy link"), 2000);
    }
  };

  const getProgressColor = () => {
    if (progressPercentage < 40) return "#43e8b0";
    if (progressPercentage < 80) return "#f59e0b";
    return "#ef4444";
  };

  /* ── LOADING ── */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid rgba(99,102,241,.15)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%", animation: "spin .8s linear infinite",
        }} />
      </div>
    );
  }

  /* ── ERROR ── */
  if (error || !event) {
    return (
      <div style={{ minHeight: "100vh", background: "#080c14", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ textAlign: "center", padding: "0 24px" }}>
          <span style={{ fontSize: 48, display: "block", marginBottom: 16 }}>🎪</span>
          <h2 style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff", margin: "0 0 8px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            {error || "Event not found"}
          </h2>
          <p style={{ fontSize: 13, color: "#4b5563", margin: "0 0 24px", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            The event you are looking for does not exist.
          </p>
          <Link to="/explore" style={{
            padding: "10px 24px", background: "#6366f1", borderRadius: 11,
            color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none",
          }}>
            Browse Events
          </Link>
        </div>
      </div>
    );
  }

  const eventDate    = new Date(event.date);
  const isEventFull  = seatsLeft <= 0;
  const accentColor  = getAccentColor(event.title || "")
  const initials     = getInitials(event.title || "")
  const showFallback = imgError || !event.image
  const progressColor = getProgressColor()

  const dateStr = eventDate.toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  });

  return (
    <>
      <style>{STYLES}</style>
      <div className="ed-root" style={{ minHeight: "100vh", background: "#080c14" }}>

        {/* ══ HERO ══ */}
        <div style={{ position: "relative", width: "100%", height: 460, overflow: "hidden" }}>

          {/* Image or initials fallback */}
          {!showFallback ? (
            <img
              src={event.image}
              alt={event.title}
              onError={() => setImgError(true)}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <div style={{
              width: "100%", height: "100%",
              background: "#0a0e1a",
              backgroundImage: `
                repeating-linear-gradient(45deg, rgba(255,255,255,.012) 0px, rgba(255,255,255,.012) 1px, transparent 1px, transparent 14px),
                repeating-linear-gradient(-45deg, rgba(255,255,255,.012) 0px, rgba(255,255,255,.012) 1px, transparent 1px, transparent 14px)
              `,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <div style={{
                width: 90, height: 90, borderRadius: 24,
                background: `${accentColor}12`,
                border: `1px solid ${accentColor}25`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <span style={{
                  fontSize: 32, fontWeight: 800, color: accentColor,
                  fontFamily: "'Plus Jakarta Sans', sans-serif",
                }}>
                  {initials}
                </span>
              </div>
            </div>
          )}

          {/* Gradient overlay — dark to transparent, NOT purple */}
          <div style={{
            position: "absolute", inset: 0,
            background: "linear-gradient(to top, #080c14 0%, rgba(8,12,20,.75) 40%, rgba(8,12,20,.2) 100%)",
          }} />

          {/* Hero content */}
          <div style={{
            position: "absolute", bottom: 0, left: 0, right: 0,
            maxWidth: 1100, margin: "0 auto", padding: "0 28px 36px",
          }}>
            {/* Category badge */}
            <div style={{ marginBottom: 14 }}>
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".08em",
                color: accentColor,
                background: `${accentColor}15`,
                border: `1px solid ${accentColor}30`,
                padding: "4px 12px", borderRadius: 99,
                textTransform: "uppercase",
              }}>
                {event.category}
              </span>
            </div>

            <h1
              className="ed-hero-title ed-fade-1"
              style={{
                fontSize: 42, fontWeight: 800, color: "#f0f4ff",
                margin: "0 0 16px", lineHeight: 1.15,
                maxWidth: 700,
                textShadow: "0 2px 20px rgba(0,0,0,.5)",
              }}
            >
              {event.title}
            </h1>

            {/* Info pills */}
            <div className="ed-pills ed-fade-2" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <span className="ed-info-pill">
                <span>📅</span>
                {dateStr}
              </span>
              <span className="ed-info-pill">
                <span>🕐</span>
                {event.time || "10:00 AM"}
              </span>
              <span className="ed-info-pill">
                <span>📍</span>
                {event.venue ? `${event.venue}, ` : ""}{event.city || ""}
              </span>
            </div>

            {/* Attending */}
            {(event.registered || 0) > 0 && (
              <div className="ed-fade-3" style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{
                  width: 7, height: 7, borderRadius: "50%",
                  background: "#43e8b0",
                  animation: "pulse-dot 1.8s ease-in-out infinite",
                  boxShadow: "0 0 6px rgba(67,232,176,.6)",
                }} />
                <span style={{ fontSize: 13, color: "#6b7280", fontWeight: 500 }}>
                  +{event.registered} people attending
                </span>
              </div>
            )}
          </div>
        </div>

        {/* ══ MAIN CONTENT ══ */}
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 28px 80px" }}>
          <div
            className="ed-grid"
            style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: 40, alignItems: "start" }}
          >

            {/* ── LEFT ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 40 }}>

              {/* About */}
              <div className="ed-fade-2">
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
                  <div style={{ width: 3, height: 22, borderRadius: 99, background: accentColor, boxShadow: `0 0 8px ${accentColor}60` }} />
                  <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f0f4ff", margin: 0 }}>
                    About Event
                  </h2>
                </div>
                <p style={{
                  fontSize: 14, color: "#6b7280", lineHeight: 1.8,
                  fontWeight: 500, margin: 0,
                }}>
                  {event.description || "No description available."}
                </p>
              </div>

              {/* Event details row */}
              <div className="ed-fade-3" style={{
                display: "grid", gridTemplateColumns: "1fr 1fr",
                gap: 12,
              }}>
                {[
                  { icon: "📅", label: "Date", value: eventDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) },
                  { icon: "🕐", label: "Time", value: event.time || "10:00 AM" },
                  { icon: "📍", label: "Venue", value: event.venue || "TBD" },
                  { icon: "🏙", label: "City", value: event.city || "TBD" },
                ].map(item => (
                  <div key={item.label} style={{
                    background: "#0f1623",
                    border: "1px solid rgba(255,255,255,.07)",
                    borderRadius: 14,
                    padding: "16px 18px",
                    display: "flex", alignItems: "center", gap: 12,
                  }}>
                    <div style={{
                      width: 36, height: 36, borderRadius: 10,
                      background: `${accentColor}10`,
                      border: `1px solid ${accentColor}20`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 16, flexShrink: 0,
                    }}>
                      {item.icon}
                    </div>
                    <div>
                      <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#374151", textTransform: "uppercase", marginBottom: 3 }}>
                        {item.label}
                      </div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: "#d1d5db" }}>
                        {item.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

            </div>

            {/* ── RIGHT SIDEBAR ── */}
            <div className="ed-sidebar ed-fade-2">
              <div style={{
                background: "#0f1623",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 20,
                overflow: "hidden",
                boxShadow: "0 24px 48px rgba(0,0,0,.4)",
              }}>

                {/* Price header */}
                <div style={{
                  padding: "22px 22px 18px",
                  borderBottom: "1px solid rgba(255,255,255,.06)",
                }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", color: "#374151", textTransform: "uppercase", margin: "0 0 6px" }}>
                    Event Price
                  </p>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
                    <span style={{ fontSize: 34, fontWeight: 800, color: "#f0f4ff", fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {event.price === 0 ? "Free" : `₹${event.price}`}
                    </span>
                    {event.price > 0 && (
                      <span style={{ fontSize: 12, color: "#4b5563", fontWeight: 500 }}>per person</span>
                    )}
                  </div>
                </div>

                {/* Seats */}
                <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>
                      {event.registered || 0} / {event.capacity} seats
                    </span>
                    <span className="ed-mono" style={{ fontSize: 11, color: progressColor, fontWeight: 600 }}>
                      {Math.round(progressPercentage)}%
                    </span>
                  </div>
                  <div style={{ height: 5, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
                    <div
                      className="ed-progress-bar"
                      style={{
                        width: `${progressPercentage}%`,
                        height: "100%",
                        background: progressColor,
                        boxShadow: `0 0 8px ${progressColor}60`,
                      }}
                    />
                  </div>
                  <p style={{ fontSize: 11, color: "#374151", margin: "6px 0 0", fontWeight: 600 }}>
                    {isEventFull ? "No spots remaining" : `${seatsLeft} spots remaining`}
                  </p>
                </div>

                {/* CTA */}
                <div style={{ padding: "18px 22px", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
                  {registrationStatus.registered ? (
                    <button
                      onClick={handleViewTicket}
                      className="ed-cta-btn"
                      style={{
                        width: "100%", padding: "14px",
                        background: "#43e8b0",
                        border: "none", borderRadius: 13,
                        color: "#080c14", fontSize: 14, fontWeight: 800,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        boxShadow: "0 4px 20px rgba(67,232,176,.3)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      🎫 View My Ticket
                    </button>
                  ) : isEventFull ? (
                    <button style={{
                      width: "100%", padding: "14px",
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(255,255,255,.08)",
                      borderRadius: 13,
                      color: "#4b5563", fontSize: 14, fontWeight: 700,
                      fontFamily: "'Plus Jakarta Sans', sans-serif",
                      cursor: "not-allowed",
                    }}>
                      Event Full
                    </button>
                  ) : (
                    <button
                      onClick={handleRegister}
                      className="ed-cta-btn"
                      style={{
                        width: "100%", padding: "14px",
                        background: "#6366f1",
                        border: "none", borderRadius: 13,
                        color: "#fff", fontSize: 14, fontWeight: 800,
                        fontFamily: "'Plus Jakarta Sans', sans-serif",
                        boxShadow: "0 4px 20px rgba(99,102,241,.35)",
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                      }}
                    >
                      Register Now →
                    </button>
                  )}
                </div>

                {/* Organizer */}
                <div style={{
                  padding: "14px 22px",
                  borderBottom: "1px solid rgba(255,255,255,.06)",
                  display: "flex", alignItems: "center", gap: 10,
                }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9,
                    background: "rgba(99,102,241,.12)",
                    border: "1px solid rgba(99,102,241,.2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 15,
                  }}>
                    🎪
                  </div>
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#374151", textTransform: "uppercase" }}>
                      Organizer
                    </div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: "#9ca3af" }}>
                      EventNest
                    </div>
                  </div>
                </div>

                {/* Share */}
                <div style={{ padding: "16px 22px" }}>
                  <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".08em", color: "#374151", textTransform: "uppercase", margin: "0 0 12px" }}>
                    Share this event
                  </p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {[
                      { key: "whatsapp", icon: "💬", label: "WhatsApp" },
                      { key: "twitter",  icon: "𝕏",  label: "Twitter"  },
                      { key: "facebook", icon: "👥", label: "Facebook" },
                      { key: "copy",     icon: "🔗", label: copyLabel  },
                    ].map(s => (
                      <button
                        key={s.key}
                        onClick={() => handleShare(s.key)}
                        className="ed-share-btn"
                        style={{
                          padding: "9px 10px",
                          background: "rgba(255,255,255,.03)",
                          border: "1px solid rgba(255,255,255,.07)",
                          borderRadius: 10,
                          color: "#6b7280", fontSize: 12, fontWeight: 600,
                          fontFamily: "'Plus Jakarta Sans', sans-serif",
                          display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                          cursor: "pointer",
                        }}
                      >
                        <span>{s.icon}</span>
                        <span>{s.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* ── SIMILAR EVENTS ── */}
          {similarEvents.length > 0 && (
            <div style={{ marginTop: 60, paddingTop: 40, borderTop: "1px solid rgba(255,255,255,.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                <div style={{ width: 3, height: 22, borderRadius: 99, background: "#6366f1", boxShadow: "0 0 8px rgba(99,102,241,.6)" }} />
                <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f0f4ff", margin: 0 }}>
                  Similar Events
                </h2>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
                {similarEvents.map((ev, i) => (
                  <EventCard
                    key={ev._id}
                    event={ev}
                    index={i}
                    isAuthenticated={!!user}
                    onRegister={() => {}}
                  />
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
}

export default EventDetails;