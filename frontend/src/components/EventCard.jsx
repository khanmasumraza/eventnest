import React, { useState } from "react";
import PropTypes from "prop-types";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://localhost:5000/api";

const CATEGORY_COLORS = {
  Workshop:   { bg: "rgba(99,102,241,.12)",  border: "rgba(99,102,241,.25)",  text: "#a5b4fc" },
  Cultural:   { bg: "rgba(236,72,153,.1)",   border: "rgba(236,72,153,.2)",   text: "#f9a8d4" },
  Sports:     { bg: "rgba(67,232,176,.1)",   border: "rgba(67,232,176,.2)",   text: "#6ee7b7" },
  Volunteer:  { bg: "rgba(245,158,11,.1)",   border: "rgba(245,158,11,.2)",   text: "#fcd34d" },
  Hackathon:  { bg: "rgba(139,92,246,.12)",  border: "rgba(139,92,246,.25)",  text: "#c4b5fd" },
  Fest:       { bg: "rgba(244,63,94,.1)",    border: "rgba(244,63,94,.2)",    text: "#fda4af" },
  Conference: { bg: "rgba(14,165,233,.1)",   border: "rgba(14,165,233,.2)",   text: "#7dd3fc" },
  Meetup:     { bg: "rgba(6,182,212,.1)",    border: "rgba(6,182,212,.2)",    text: "#67e8f9" },
  Other:      { bg: "rgba(100,116,139,.1)",  border: "rgba(100,116,139,.2)",  text: "#94a3b8" },
};

const getCategoryStyle = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;

const getInitialColor = (title = "") => {
  const colors = ["#6366f1","#8b5cf6","#06b6d4","#10b981","#f59e0b","#ef4444","#ec4899"]
  return colors[title.charCodeAt(0) % colors.length]
}

const EventCard = ({ event, isAuthenticated, onRegister, index, isFavorite, onToggleFavorite, attendees, isRegistered }) => {
  const navigate = useNavigate();
  const [showReminder, setShowReminder]   = useState(false);
  const [reminderSet, setReminderSet]     = useState(false);
  const [reminderLabel, setReminderLabel] = useState("");
  const [favAnim, setFavAnim]             = useState(false);

  const capacityLeft       = event.capacity - event.registered;
  const capacityPercentage = Math.min((event.registered / event.capacity) * 100, 100);
  const isFull             = capacityLeft <= 0;
  const eventId            = event._id || event.id;
  const catStyle           = getCategoryStyle(event.category);
  const accentColor        = getInitialColor(event.title || "")
  const displayAttendees   = attendees?.slice(0, 5) || [];

  const progressColor =
    capacityPercentage < 40 ? "#43e8b0" :
    capacityPercentage < 80 ? "#f59e0b" : "#ef4444";

  const openEvent = () => {
    if (eventId) navigate(`/event/${eventId}`)
    else console.error("Event ID is undefined:", event)
  };

  const handleFavoriteClick = async (e) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate("/login"); return; }
    setFavAnim(true);
    setTimeout(() => setFavAnim(false), 400);
    if (onToggleFavorite) onToggleFavorite(eventId);
  };

  const handleReminderClick = async (e, reminderTime, label) => {
    e.stopPropagation();
    if (!isAuthenticated) { navigate("/login"); return; }
    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/events/${eventId}/reminder`,
        { reminderTime },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setReminderSet(true);
      setReminderLabel(label);
      setShowReminder(false);
    } catch (error) {
      console.error("Error setting reminder:", error);
    }
  };

  return (
    <motion.div
      onClick={openEvent}
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: .4, delay: index * 0.06, ease: [.22,1,.36,1] }}
      style={{
        cursor: "pointer",
        background: "#0f1623",
        border: "1px solid rgba(255,255,255,.07)",
        borderRadius: 16,
        overflow: "hidden",
        position: "relative",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}
    >
      {/* top accent line */}


      <div style={{ padding: "16px 18px 18px" }}>

        {/* ── HEADER ── */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14, gap: 10 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 11, flex: 1, minWidth: 0 }}>
            <div style={{
              width: 38, height: 38, borderRadius: 11, flexShrink: 0,
              background: "rgba(255,255,255,.04)",
              border: "1px solid rgba(255,255,255,.08)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 14, fontWeight: 800, color: accentColor,
            }}>
              {event.title?.charAt(0)?.toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <h3 style={{
                fontSize: 14, fontWeight: 700, color: "#f0f4ff",
                margin: "0 0 3px", lineHeight: 1.3,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
              }}>
                {event.title}
              </h3>
              <p style={{ fontSize: 11, color: "#4b5563", margin: 0, fontWeight: 500 }}>
                {new Date(event.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · {event.city}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".05em",
              color: catStyle.text,
              background: catStyle.bg,
              border: `1px solid ${catStyle.border}`,
              padding: "3px 9px", borderRadius: 99,
              textTransform: "uppercase",
            }}>
              {event.category}
            </span>

            {/* Heart */}
            <motion.button
              onClick={handleFavoriteClick}
              animate={favAnim ? { scale: [1, 1.5, 1] } : { scale: 1 }}
              transition={{ duration: .35 }}
              style={{
                width: 30, height: 30, borderRadius: "50%",
                background: isFavorite ? "rgba(239,68,68,.15)" : "rgba(255,255,255,.05)",
                border: isFavorite ? "1px solid rgba(239,68,68,.3)" : "1px solid rgba(255,255,255,.08)",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", padding: 0,
                transition: "background .15s ease, border-color .15s ease",
              }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24"
                fill={isFavorite ? "#ef4444" : "none"}
                stroke={isFavorite ? "#ef4444" : "#6b7280"}
                strokeWidth="2"
              >
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                />
              </svg>
            </motion.button>
          </div>
        </div>

        {/* divider */}
        <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 14 }} />

        {/* attendees */}
        {displayAttendees.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ display: "flex" }}>
              {displayAttendees.map((a, i) => (
                <div key={i} style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(99,102,241,.2)",
                  border: "2px solid #0f1623",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#a5b4fc",
                  marginLeft: i > 0 ? -6 : 0,
                }}>
                  {a.name?.charAt(0) || a.email?.charAt(0) || "?"}
                </div>
              ))}
              {attendees?.length > 5 && (
                <div style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "rgba(255,255,255,.06)",
                  border: "2px solid #0f1623",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 9, fontWeight: 700, color: "#6b7280",
                  marginLeft: -6,
                }}>
                  +{attendees.length - 5}
                </div>
              )}
            </div>
            <span style={{ fontSize: 11, color: "#374151", fontWeight: 600 }}>attending</span>
          </div>
        )}

        {/* price + spots */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{
            fontSize: 18, fontWeight: 800,
            color: event.price === 0 ? "#43e8b0" : "#f0f4ff",
            fontFamily: "'DM Mono', monospace",
          }}>
            {event.price === 0 ? "Free" : `₹${event.price}`}
          </span>
          <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 600 }}>
            {capacityLeft} spots left
          </span>
        </div>

        {/* progress bar */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${capacityPercentage}%` }}
              transition={{ duration: .8, ease: [.22,1,.36,1] }}
              style={{
                height: "100%", borderRadius: 99,
                background: progressColor,
                boxShadow: "none",
              }}
            />
          </div>
        </div>

        {/* ── ACTIONS ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, position: "relative" }}>

          {/* Remind */}
          <div style={{ position: "relative", flexShrink: 0 }}>
            <motion.button
              whileTap={{ scale: .97 }}
              onClick={e => {
                e.stopPropagation();
                if (isAuthenticated) setShowReminder(!showReminder);
                else navigate("/login");
              }}
              style={{
                padding: "9px 29px",
                background: reminderSet ? "rgba(67,232,176,.1)" : "rgba(255,255,255,.04)",
                border: reminderSet ? "1px solid rgba(67,232,176,.25)" : "1px solid rgba(255,255,255,.08)",
                borderRadius: 10,
                color: reminderSet ? "#43e8b0" : "#6b7280",
                fontSize: 12, fontWeight: 600,
                cursor: "pointer",
                display: "flex", alignItems: "center", gap: 5,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                transition: "all .15s ease",
                whiteSpace: "nowrap",
              }}
            >
              {reminderSet ? (
                <>
                  <svg width="11" height="11" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  Set
                </>
              ) : (
                <>
                  <svg width="11" height="11" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                  Remind
                </>
              )}
            </motion.button>

            <AnimatePresence>
              {showReminder && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                  style={{
                    position: "absolute", bottom: "calc(100% + 6px)", left: 0,
                    background: "#0f1623",
                    border: "1px solid rgba(255,255,255,.1)",
                    borderRadius: 12, overflow: "hidden",
                    zIndex: 50,
                    boxShadow: "0 16px 40px rgba(0,0,0,.6)",
                    minWidth: 160,
                  }}
                >
                  {[
                    { key: "1day",   label: "1 day before"      },
                    { key: "3hours", label: "3 hours before"    },
                    { key: "30min",  label: "30 minutes before" },
                  ].map(opt => (
                    <button
                      key={opt.key}
                      onClick={e => handleReminderClick(e, opt.key, opt.label)}
                      style={{
                        width: "100%", textAlign: "left", background: "none", border: "none",
                        padding: "10px 14px", fontSize: 12, color: "#9ca3af", fontWeight: 600,
                        cursor: "pointer", fontFamily: "'Plus Jakarta Sans', sans-serif",
                        transition: "background .1s ease, color .1s ease",
                        display: "flex", alignItems: "center", gap: 8,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(99,102,241,.1)"; e.currentTarget.style.color = "#f0f4ff"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = "none"; e.currentTarget.style.color = "#9ca3af"; }}
                    >
                      🔔 {opt.label}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── REGISTER BUTTON — green when already registered ── */}
          <motion.button
            whileTap={{ scale: .97 }}
            onClick={e => { e.stopPropagation(); onRegister(eventId); }}
            disabled={!isAuthenticated || isFull || isRegistered}
            style={{
              flex: 2,
              padding: "8px 10px",
              background: isRegistered
                ? "rgba(67,232,176,.15)"
                : isFull
                ? "rgba(255,255,255,.04)"
                : "#6366f1",
              border: isRegistered
                ? "1px solid rgba(67,232,176,.3)"
                : isFull
                ? "1px solid rgba(255,255,255,.07)"
                : "1px solid transparent",
              borderRadius: 10,
              color: isRegistered ? "#43e8b0" : isFull ? "#374151" : "#fff",
              fontSize: 13, fontWeight: 700,
              cursor: isFull || !isAuthenticated || isRegistered ? "not-allowed" : "pointer",
              opacity: !isAuthenticated && !isFull && !isRegistered ? .55 : 1,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              boxShadow: "none",
              transition: "background .15s ease, box-shadow .15s ease",
              textAlign: "center",
            }}
          >
            {isRegistered
              ? "✓ Registered"
              : isFull
              ? "Full"
              : isAuthenticated
              ? "Register"
              : "Login to Register"}
          </motion.button>

        </div>

      </div>
    </motion.div>
  );
};

EventCard.propTypes = {
  event:            PropTypes.object.isRequired,
  isAuthenticated:  PropTypes.bool.isRequired,
  onRegister:       PropTypes.func.isRequired,
  index:            PropTypes.number.isRequired,
  isFavorite:       PropTypes.bool,
  onToggleFavorite: PropTypes.func,
  attendees:        PropTypes.array,
  isRegistered:     PropTypes.bool, // NEW
};

export default EventCard;