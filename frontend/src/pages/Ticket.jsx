import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useParams, Link, useNavigate } from "react-router-dom"
import api from "../utils/api"
import html2canvas from 'html2canvas'

function logError(type, payload) {
  if (process.env.NODE_ENV === "development") console.error(type, payload)
  try {
    localStorage.setItem("lastError", JSON.stringify({ type, payload, time: new Date().toISOString() }))
  } catch (e) {}
}

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .tk-root * { box-sizing: border-box; }
  .tk-root { font-family: 'Plus Jakarta Sans', sans-serif; }
  .tk-mono { font-family: 'DM Mono', monospace; }

  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(20px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(.75); }
  }

  .tk-confirmed-dot { animation: pulse-dot 1.8s ease-in-out infinite; }

  .tk-card {
    background: #0f1623;
    border: 1px solid rgba(255,255,255,.08);
    border-radius: 20px;
    overflow: hidden;
    box-shadow: 0 24px 60px rgba(0,0,0,.5), 0 0 0 1px rgba(99,102,241,.08);
  }

  .tk-tear {
    display: flex;
    align-items: center;
    position: relative;
  }
  .tk-tear::before {
    content: '';
    position: absolute;
    left: 24px; right: 24px; top: 50%;
    border-top: 1.5px dashed rgba(255,255,255,.07);
  }
  .tk-notch {
    width: 18px; height: 18px; border-radius: 50%;
    background: #080c14;
    border: 1px solid rgba(255,255,255,.07);
    flex-shrink: 0;
    position: relative; z-index: 1;
  }
  .tk-notch-l { margin-left: -9px; }
  .tk-notch-r { margin-left: auto; margin-right: -9px; }

  .tk-btn:hover { opacity: .82; }
  .tk-btn { transition: opacity .15s ease; cursor: pointer; }

  .tk-share-btn:hover { border-color: rgba(99,102,241,.5) !important; background: rgba(99,102,241,.15) !important; }
  .tk-share-btn { transition: border-color .15s ease, background .15s ease; }

  .tk-initials-bg {
    background-color: #0f1623;
    background-image:
      repeating-linear-gradient(
        45deg,
        rgba(255,255,255,.015) 0px,
        rgba(255,255,255,.015) 1px,
        transparent 1px,
        transparent 12px
      ),
      repeating-linear-gradient(
        -45deg,
        rgba(255,255,255,.015) 0px,
        rgba(255,255,255,.015) 1px,
        transparent 1px,
        transparent 12px
      );
  }

  @media print {
    @page {
      margin: 0;
      size: auto;
    }
    nav,
    .tk-actions,
    .tk-page-label,
    .tk-footer {
      display: none !important;
    }
    body {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
      color-adjust: exact !important;
      background: #080c14 !important;
    }
    .tk-root {
      background: #080c14 !important;
      padding: 20px !important;
      min-height: auto !important;
    }
    .tk-card {
      background: #0f1623 !important;
      border: 1px solid rgba(255,255,255,.08) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .tk-status-bar {
      background: rgba(67,232,176,.07) !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .tk-initials-bg {
      background-color: #0f1623 !important;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    .tk-qr-wrap {
      background: #fff !important;
    }
  }
`;

const getInitials = (title = "") => {
  const words = title.trim().split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

const getAccentColor = (title = "") => {
  const colors = ["#6366f1", "#8b5cf6", "#06b6d4", "#10b981", "#f59e0b", "#ef4444"]
  const idx = title.charCodeAt(0) % colors.length
  return colors[idx]
}

function Ticket() {
  const { ticketId }            = useParams()
  const navigate                = useNavigate()
  const [ticket, setTicket]     = useState(null)
  const [event, setEvent]       = useState(null)
  const [loading, setLoading]   = useState(true)
  const [imgError, setImgError] = useState(false)
  const [shareLabel, setShareLabel] = useState("Share")
  const ticketRef = React.useRef(null)

  useEffect(() => { window.__ticketErrorLogged = false }, [])

  useEffect(() => {
    if (!loading && (!ticket || !event) && !window.__ticketErrorLogged) {
      window.__ticketErrorLogged = true
      logError("STATE_FAILURE", { ticketExists: !!ticket, eventExists: !!event })
    }
  }, [loading, ticket, event])

  useEffect(() => {
    const fetchTicket = async () => {
      try {
        const token = localStorage.getItem("token")
        if (!token) logError("MISSING_TOKEN", {})
        if (!ticketId) return

        const res = await api.get(`/tickets/${ticketId}`)
        if (!res?.data?.success) logError("INVALID_RESPONSE", res.data)
        if (!res.data.ticket)    logError("MISSING_TICKET", {})
        if (!res.data.event && !res.data.ticket?.event) logError("MISSING_EVENT", {})

        if (res.data.success) {
          setTicket(res.data.ticket)
          setEvent(res.data.event || res.data.ticket?.event || null)
        } else {
          logError("NON_SUCCESS_RESPONSE", { data: res.data })
        }
      } catch (error) {
        if (process.env.NODE_ENV === "development") {
          logError("TICKET_API_ERROR", {
            message: error.message,
            status: error.response?.status,
            data: error.response?.data,
          })
        }
        if (error.response?.status === 401) logError("AUTH_ERROR", { reason: "Unauthorized" })
        if (error.response?.status === 404) logError("TICKET_NOT_FOUND", { ticketId })
        if (error.response?.status >= 500)  logError("SERVER_ERROR", { status: error.response.status })
      } finally {
        setLoading(false)
      }
    }
    fetchTicket()
  }, [ticketId])

  const handleShare = async () => {
    const ticketUrl = window.location.href
    const shareText = `🎫 I'm attending ${event?.title || "an event"}! Here's my ticket: ${ticketUrl}`

    if (navigator.share) {
      try {
        setShareLabel("…")

        const canvas = await html2canvas(ticketRef.current, {
          backgroundColor: "#0f1623",
          scale: 2,
          useCORS: true,
          allowTaint: true,
          logging: false,
          width: ticketRef.current.scrollWidth,
          height: ticketRef.current.scrollHeight,
          windowWidth: ticketRef.current.scrollWidth,
          windowHeight: ticketRef.current.scrollHeight,
          scrollX: 0,
          scrollY: -window.scrollY,
          x: 0,
          y: 0,
        })

        await new Promise((resolve) => {
          canvas.toBlob(async (blob) => {
            if (blob) {
              const file = new File(
                [blob],
                `ticket-${ticket.ticketId}.png`,
                { type: "image/png" }
              )

              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                  await navigator.share({
                    files: [file],
                    title: event?.title || "My Ticket",
                    text: `🎫 I'm attending ${event?.title}!`,
                  })
                  setShareLabel("Share")
                  resolve()
                  return
                } catch (e) {}
              }

              try {
                await navigator.share({
                  title: event?.title || "My Ticket",
                  text: shareText,
                  url: ticketUrl,
                })
              } catch (e) {}

              setShareLabel("Share")
              resolve()
            }
          }, "image/png")
        })

      } catch (err) {
        setShareLabel("Share")
      }
      return
    }

    const waUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`
    window.open(waUrl, "_blank")
  }

  // ── FIXED: eventId bhi state mein pass karo ──────────────────────────
  const handleChatNavigation = async () => {
    const organizerId =
      event?.organiser?._id?.toString() ||
      (typeof event?.organiser === 'string' ? event?.organiser : null) ||
      event?.organizer?._id?.toString() ||
      (typeof event?.organizer === 'string' ? event?.organizer : null) ||
      ticket?.event?.organiser?._id?.toString() ||
      (typeof ticket?.event?.organiser === 'string' ? ticket?.event?.organiser : null) ||
      ticket?.event?.organizer?._id?.toString() ||
      (typeof ticket?.event?.organizer === 'string' ? ticket?.event?.organizer : null) ||
      ticket?.organiser?._id?.toString() || ticket?.organiser ||
      ticket?.organizer?._id?.toString() || ticket?.organizer

    // ✅ Resolve eventId from all possible sources
    const eventId =
      event?._id?.toString() ||
      ticket?.event?._id?.toString() ||
      ticket?.eventId?.toString() ||
      null

    console.log("CHAT NAV → organizerId:", organizerId, "eventId:", eventId)

    const isValidMongoId = (id) => /^[0-9a-fA-F]{24}$/.test(id)

    if (!isValidMongoId(organizerId)) {
      console.error("Invalid organizerId:", organizerId)
      alert("Chat is not available for this event yet.")
      return
    }

    // Check if conversation already exists — reuse it
    try {
      const token = localStorage.getItem("token")
      const res = await fetch("http://localhost:5000/api/chat/conversations", {
        headers: { Authorization: `Bearer ${token}` },
      })
      const data = await res.json()
      if (data.success && data.conversations?.length > 0) {
        const existing = data.conversations.find(
          (c) => c.userId?.toString() === organizerId
        )
        if (existing) {
          console.log("♻️ Reusing existing chat with:", organizerId)
          // ✅ eventId state mein pass karo (existing conversation)
          navigate(`/chat/${organizerId}`, {
            state: { eventId: existing.eventId?.toString() || eventId }
          })
          return
        }
      }
    } catch (err) {
      console.error("Chat check failed:", err)
    }

    // ✅ New conversation — eventId state mein pass karo
    navigate(`/chat/${organizerId}`, {
      state: { eventId }
    })
  }

  /* ── LOADING ── */
  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080c14",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
      }}>
        <div style={{
          width: 40, height: 40,
          border: "3px solid rgba(99,102,241,.15)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%", animation: "spin .8s linear infinite",
        }} />
        <p style={{ color: "#4b5563", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Loading your ticket…
        </p>
      </div>
    )
  }

  /* ── INVALID ── */
  if (!ticket || !event) {
    return (
      <div style={{
        minHeight: "100vh", background: "#080c14",
        display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 12,
      }}>
        <span style={{ fontSize: 36 }}>🎫</span>
        <p style={{ color: "#9ca3af", fontSize: 15, fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 600 }}>
          Ticket not found
        </p>
        <Link to="/dashboard" style={{ color: "#6366f1", fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
          ← Back to Dashboard
        </Link>
      </div>
    )
  }

  if (!ticket?.qrCode) logError("MISSING_QR", { ticketId: ticket?.ticketId })

  const eventDate    = event?.date ? new Date(event.date) : null
  const initials     = getInitials(event.title)
  const accentColor  = getAccentColor(event.title)
  const showFallback = imgError || !event.image

  const dateStr = eventDate
    ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "TBD"

  const dayStr = eventDate
    ? eventDate.toLocaleDateString("en-US", { weekday: "long" })
    : ""

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="tk-root"
        style={{
          minHeight: "100vh",
          background: "#080c14",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          padding: "24px 16px 48px",
        }}
      >
        {/* Page label */}
        <p
          className="tk-page-label"
          style={{
            fontSize: 11, fontWeight: 700, letterSpacing: ".1em",
            color: "#374151", textTransform: "uppercase",
            marginBottom: 20,
          }}
        >
          Your Digital Event Pass
        </p>

        {/* TICKET CARD */}
        <motion.div
          className="tk-card tk-card-ref"
          ref={ticketRef}
          style={{ width: "100%", maxWidth: 420 }}
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .5, ease: [.22, 1, .36, 1] }}
        >
          {/* STATUS BAR */}
          <div
            className="tk-status-bar"
            style={{
              display: "flex", alignItems: "center", justifyContent: "space-between",
              padding: "10px 18px",
              background: "rgba(67,232,176,.07)",
              borderBottom: "1px solid rgba(67,232,176,.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <div
                className="tk-confirmed-dot"
                style={{ width: 7, height: 7, borderRadius: "50%", background: "#43e8b0" }}
              />
              <span style={{
                fontSize: 11, fontWeight: 700, letterSpacing: ".09em",
                color: "#43e8b0", textTransform: "uppercase",
              }}>
                Confirmed
              </span>
            </div>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: ".08em",
              color: "#374151", textTransform: "uppercase",
            }}>
              General Admission
            </span>
          </div>

          {/* EVENT IMAGE / INITIALS FALLBACK */}
          <div style={{ height: 140, position: "relative", overflow: "hidden" }}>
            {!showFallback ? (
              <img
                src={event.image}
                alt={event.title}
                onError={() => setImgError(true)}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div
                className="tk-initials-bg"
                style={{
                  width: "100%", height: "100%",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative",
                }}
              >
                <div style={{
                  position: "absolute",
                  width: 120, height: 120, borderRadius: "50%",
                  background: `${accentColor}18`,
                  filter: "blur(30px)",
                }} />
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: `${accentColor}15`,
                  border: `1px solid ${accentColor}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  position: "relative", zIndex: 1,
                }}>
                  <span style={{
                    fontSize: 22, fontWeight: 800, color: accentColor,
                    fontFamily: "'Plus Jakarta Sans', sans-serif",
                    letterSpacing: "-.02em",
                  }}>
                    {initials}
                  </span>
                </div>
              </div>
            )}
            <div style={{
              position: "absolute", bottom: 0, left: 0, right: 0, height: 48,
              background: "linear-gradient(to top, #0f1623, transparent)",
            }} />
          </div>

          {/* EVENT TITLE + META */}
          <div style={{ padding: "16px 20px 0" }}>
            <h2 style={{
              fontSize: 18, fontWeight: 800, color: "#f0f4ff",
              margin: "0 0 3px", lineHeight: 1.25,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}>
              {event.title}
            </h2>
            <p style={{ fontSize: 12, color: "#4b5563", margin: 0, fontWeight: 500 }}>
              {dayStr}{dayStr && " · "}{dateStr}
            </p>
          </div>

          {/* 3-COL META */}
          <div style={{
            display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
            padding: "14px 20px 14px",
            gap: 0,
            borderBottom: "1px solid rgba(255,255,255,.05)",
          }}>
            {[
              { icon: "📅", label: "Date", value: eventDate ? eventDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "TBD" },
              { icon: "🕐", label: "Time", value: event.time || "TBD" },
              { icon: "📍", label: "Venue", value: event.venue || "TBD" },
            ].map((item, i) => (
              <div
                key={item.label}
                style={{
                  display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
                  borderRight: i < 2 ? "1px solid rgba(255,255,255,.05)" : "none",
                  padding: "0 8px",
                }}
              >
                <span style={{ fontSize: 15 }}>{item.icon}</span>
                <span style={{
                  fontSize: 9, fontWeight: 700, letterSpacing: ".07em",
                  color: "#374151", textTransform: "uppercase",
                }}>
                  {item.label}
                </span>
                <span style={{
                  fontSize: 12, fontWeight: 700, color: "#d1d5db",
                  textAlign: "center",
                  overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                  maxWidth: "100%",
                }}>
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* TEAR LINE */}
          <div className="tk-tear">
            <div className="tk-notch tk-notch-l" />
            <div className="tk-notch tk-notch-r" />
          </div>

          {/* TICKET ID + PRICE */}
          <div style={{
            display: "flex", justifyContent: "space-between", alignItems: "center",
            padding: "16px 20px 12px",
          }}>
            <div>
              <p style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".08em",
                color: "#374151", textTransform: "uppercase", margin: "0 0 4px",
              }}>
                Ticket ID
              </p>
              <p className="tk-mono" style={{
                fontSize: 12, fontWeight: 600, color: "#6366f1", margin: 0,
                overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                maxWidth: 200,
              }}>
                {ticket.ticketId}
              </p>
            </div>
            <div style={{ textAlign: "right" }}>
              <p style={{
                fontSize: 9, fontWeight: 700, letterSpacing: ".08em",
                color: "#374151", textTransform: "uppercase", margin: "0 0 4px",
              }}>
                Price
              </p>
              <p style={{
                fontSize: 17, fontWeight: 800, color: "#f0f4ff", margin: 0,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}>
                {event.price === 0 || event.price == null
                  ? "Free"
                  : `₹${event.price ?? ticket.amount}`}
              </p>
            </div>
          </div>

          {/* QR CODE */}
          <div style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "4px 20px 16px", gap: 10,
          }}>
            <div
              className="tk-qr-wrap"
              style={{
                background: "#fff", padding: 12,
                borderRadius: 14,
                boxShadow: "0 4px 24px rgba(0,0,0,.4)",
              }}
            >
              <img
                src={ticket.qrCode}
                alt="QR Code"
                style={{ width: 140, height: 140, display: "block" }}
              />
            </div>
            <p style={{ fontSize: 11, color: "#374151", margin: 0, fontWeight: 600, letterSpacing: ".04em" }}>
              SCAN AT EVENT ENTRY
            </p>
          </div>

          {/* INFO STRIP */}
          <div style={{
            background: "rgba(255,255,255,.02)",
            borderTop: "1px solid rgba(255,255,255,.04)",
            padding: "10px 20px",
            display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap",
          }}>
            {["📱 Mobile valid", "🪪 Bring valid ID", "🚫 No refunds"].map((item) => (
              <span key={item} style={{ fontSize: 10, color: "#374151", fontWeight: 600 }}>
                {item}
              </span>
            ))}
          </div>
        </motion.div>

        {/* ACTIONS */}
        <motion.div
          className="tk-actions"
          style={{ width: "100%", maxWidth: 420, marginTop: 14, display: "flex", flexDirection: "column", gap: 9 }}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: .4, ease: [.22, 1, .36, 1], delay: .25 }}
        >
          {/* Download + Share */}
          <div style={{ display: "flex", gap: 9 }}>
            <button
              onClick={() => {
                const style = document.createElement('style')
                style.innerHTML = `* { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }`
                document.head.appendChild(style)
                window.print()
                setTimeout(() => document.head.removeChild(style), 1000)
              }}
              className="tk-btn"
              style={{
                flex: 1, padding: "12px 16px",
                background: "rgba(255,255,255,.04)",
                border: "1px solid rgba(255,255,255,.08)",
                borderRadius: 12,
                color: "#9ca3af", fontSize: 13, fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              📥 Download
            </button>

            <button
              onClick={handleShare}
              className="tk-btn tk-share-btn"
              style={{
                flex: 1, padding: "12px 16px",
                background: "rgba(99,102,241,.1)",
                border: "1px solid rgba(99,102,241,.2)",
                borderRadius: 12,
                color: "#a5b4fc", fontSize: 13, fontWeight: 600,
                fontFamily: "'Plus Jakarta Sans', sans-serif",
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              }}
            >
              🔗 {shareLabel}
            </button>
          </div>

          {/* Chat with Organizer */}
          <button
            onClick={handleChatNavigation}
            className="tk-btn"
            style={{
              width: "100%",
              padding: "12px 16px",
              background: "#0f1623",
              border: "1px solid rgba(255,255,255,.07)",
              borderRadius: 12,
              color: "#a5b4fc",
              fontSize: 13,
              fontWeight: 600,
              fontFamily: "'Plus Jakarta Sans', sans-serif",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
              transition: "all .15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "#6366f1"
              e.currentTarget.style.borderColor = "#6366f1"
              e.currentTarget.style.color = "#fff"
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#0f1623"
              e.currentTarget.style.borderColor = "rgba(255,255,255,.07)"
              e.currentTarget.style.color = "#a5b4fc"
            }}
          >
            💬 Chat with Organizer
          </button>
        </motion.div>

        {/* Footer */}
        <p
          className="tk-footer"
          style={{
            fontSize: 11, color: "#1f2937", marginTop: 20,
            fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 500,
          }}
        >
          Non-transferable · EventNest © 2026
        </p>
      </div>
    </>
  )
}

export default Ticket