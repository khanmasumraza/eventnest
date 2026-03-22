import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useNavigate, Link } from "react-router-dom";
import api from "../utils/api";

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .db-root { font-family: 'Plus Jakarta Sans', sans-serif; }

  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(18px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes pulse-dot {
    0%,100% { opacity: 1; transform: scale(1); }
    50%      { opacity: .5; transform: scale(.75); }
  }
  @keyframes countUp {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes shimmerSweep {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(400%); }
  }

  .db-fade-1 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) .05s both; }
  .db-fade-2 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) .13s both; }
  .db-fade-3 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) .21s both; }
  .db-fade-4 { animation: fadeUp .45s cubic-bezier(.22,1,.36,1) .29s both; }

  .db-stat-card:hover { transform: translateY(-2px); border-color: rgba(99,102,241,.35) !important; }
  .db-stat-card { transition: transform .2s ease, border-color .2s ease; }
  .db-stat-number { animation: countUp .5s cubic-bezier(.22,1,.36,1) .3s both; }

  .db-next-card::before {
    content: '';
    position: absolute; inset: 0;
    background: radial-gradient(ellipse 60% 50% at 80% 50%, rgba(99,102,241,.08) 0%, transparent 70%);
    border-radius: inherit;
    pointer-events: none;
  }
  .db-next-card::after {
    content: '';
    position: absolute; top: 0; left: 0;
    width: 25%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,.025), transparent);
    animation: shimmerSweep 4s ease-in-out 2s infinite;
    pointer-events: none;
    border-radius: inherit;
  }

  .db-activity-row:hover { background: rgba(255,255,255,.04); }
  .db-activity-row { transition: background .15s ease; }

  .db-view-btn:hover { background: rgba(99,102,241,.2) !important; border-color: rgba(99,102,241,.5) !important; }
  .db-view-btn { transition: background .15s ease, border-color .15s ease; }

  .db-ticket-btn:hover { background: #4f46e5 !important; box-shadow: 0 4px 20px rgba(99,102,241,.45); }
  .db-ticket-btn { transition: background .15s ease, box-shadow .2s ease; }

  .db-explore-btn:hover { background: rgba(255,255,255,.07) !important; }
  .db-explore-btn { transition: background .15s ease; }

  .db-live-dot { animation: pulse-dot 1.8s ease-in-out infinite; }

  .db-progress-bar {
    background: linear-gradient(90deg, #6366f1, #8b5cf6);
    border-radius: 99px;
    transition: width .6s cubic-bezier(.22,1,.36,1);
  }

  .db-mono { font-family: 'DM Mono', monospace; }

  .db-upcoming-link:hover .db-upcoming-arrow { transform: translateX(3px); }
  .db-upcoming-arrow { transition: transform .15s ease; }

  @media (max-width: 768px) {
    .db-root-inner { height: auto !important; overflow-y: auto !important; padding: 16px 0 40px !important; }
    .db-grid { display: flex !important; flex-direction: column !important; height: auto !important; min-height: 0 !important; gap: 12px !important; }
    .db-left-col { height: auto !important; overflow: visible !important; width: 100% !important; }
    .db-right-col { height: auto !important; overflow: visible !important; width: 100% !important; }
    .db-stat-row { display: grid !important; grid-template-columns: 1fr 1fr !important; gap: 10px !important; }
    .db-overview { flex: none !important; }
    .db-inner-container { padding: 0 16px !important; height: auto !important; display: block !important; }
  }
`;

const fmt = (d) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });

const daysUntil = (d) => {
  const diff = new Date(d) - new Date();
  return Math.ceil(diff / 86400000);
};

const hoursUntil = (d) => {
  const diff = new Date(d) - new Date();
  return Math.floor(diff / 3600000);
};

const relativeTime = (dateStr) => {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now - date;
  const diffMins  = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays  = Math.floor(diffMs / 86400000);
  if (diffMins  < 1)  return "Just now";
  if (diffMins  < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays  < 7)  return `${diffDays} days ago`;
  return fmt(dateStr);
};

const CountdownBadge = ({ date }) => {
  const days = daysUntil(date);
  if (days < 0) return null;
  const label = days === 0 ? "Today" : days === 1 ? "Tomorrow" : `In ${days}d`;
  return (
    <span style={{
      fontSize: 11, fontWeight: 700, letterSpacing: ".06em",
      color: "#4b5563",
      background: "rgba(255,255,255,.05)",
      border: "1px solid rgba(255,255,255,.08)",
      padding: "3px 9px", borderRadius: 99,
      textTransform: "uppercase",
    }}>
      {label}
    </span>
  );
};

const StatCard = ({ label, value, icon, accent, subLabel, subLink }) => (
  <div className="db-stat-card" style={{
    background: "#0f1623",
    border: "1px solid rgba(255,255,255,.07)",
    borderRadius: 14,
    padding: "14px 16px",
    flex: 1,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    minHeight: 105,
  }}>
    <div style={{
      position: "absolute", top: -20, right: -20,
      width: 70, height: 70, borderRadius: "50%",
      background: `${accent}22`, filter: "blur(18px)", pointerEvents: "none",
    }} />
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div style={{
        width: 26, height: 26, borderRadius: 7,
        background: `${accent}15`, border: `1px solid ${accent}30`,
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13,
      }}>
        {icon}
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".07em", color: "#374151", textTransform: "uppercase" }}>
        {label}
      </span>
    </div>
    <div className="db-stat-number db-mono" style={{
      fontSize: 26, fontWeight: 800, color: "#f0f4ff", lineHeight: 1, marginTop: 8,
    }}>
      {value}
    </div>
    {subLink ? (
      <Link to={subLink} style={{
        fontSize: 11, color: accent, fontWeight: 600,
        textDecoration: "none", marginTop: 5, opacity: 0.85,
      }}>
        {subLabel} →
      </Link>
    ) : (
      <span style={{ fontSize: 11, color: "#374151", marginTop: 5 }}>{subLabel}</span>
    )}
  </div>
);

function Dashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [favCount, setFavCount]   = useState(0);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!user) { navigate("/login"); return; }
    fetchUserData();
    const interval = setInterval(() => setTick(t => t + 1), 60000);
    return () => clearInterval(interval);
  }, [user]);

  const fetchUserData = async () => {
    try {
      console.log("📡 Fetching user dashboard...");
      const res = await api.get("/registrations/my-tickets");
      console.log("🎫 Tickets:", res.data);
      setTickets(res.data || []);

      // fetch favorites count from user profile
      try {
        const token = localStorage.getItem("token");
        const profileRes = await api.get("/auth/profile", {
          headers: { Authorization: `Bearer ${token}` }
        });
        const favs = profileRes.data?.favorites || profileRes.data?.user?.favorites || [];
        setFavCount(favs.length);
      } catch (e) {
        console.log("Could not load favorites count:", e);
      }

    } catch (err) {
      console.error("❌ Dashboard error:", err.response || err.message);
    } finally {
      setLoading(false);
    }
  };

  const upcoming       = tickets.filter((t) => new Date(t.event?.date) >= new Date());
  const past           = tickets.filter((t) => new Date(t.event?.date) < new Date());
  const recentActivity = tickets.slice(0, 4);

  if (loading) {
    return (
      <div style={{
        minHeight: "100vh", display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 16,
        background: "#080c14",
      }}>
        <div style={{
          width: 44, height: 44,
          border: "3px solid rgba(99,102,241,.15)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%",
          animation: "spin .8s linear infinite",
        }} />
        <p style={{ color: "#4b5563", fontSize: 13, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
          Loading your dashboard…
        </p>
      </div>
    );
  }

  const nextEvent = upcoming[0];

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="db-root db-root-inner"
        style={{
          height: "calc(100vh - 64px)",
          overflow: "hidden",
          background: "#080c14",
          padding: "20px 0",
        }}
      >
        <div
          className="db-inner-container"
          style={{
            maxWidth: 1100, margin: "0 auto", padding: "0 28px",
            height: "100%", display: "flex", flexDirection: "column",
          }}
        >
          <div
            className="db-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 320px",
              gap: 16, flex: 1, minHeight: 0,
            }}
          >
            {/* ── LEFT COLUMN ── */}
            <div className="db-left-col" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>

              {/* NEXT EVENT */}
              <div className="db-fade-2 db-next-card" style={{
                background: "#0f1623",
                border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 18, padding: "20px 24px 18px",
                position: "relative", overflow: "hidden", flexShrink: 0,
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <div className="db-live-dot" style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: nextEvent ? "#43e8b0" : "#4b5563",
                    }} />
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".09em", color: "#4b5563", textTransform: "uppercase" }}>
                      Next Event
                    </span>
                  </div>
                  {nextEvent && <CountdownBadge date={nextEvent.event?.date} />}
                </div>

                {nextEvent ? (
                  <>
                    <h2 style={{
                      fontSize: 19, fontWeight: 800, color: "#f0f4ff",
                      marginBottom: 12, lineHeight: 1.3,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {nextEvent.event?.title}
                    </h2>
                    <div style={{ display: "flex", gap: 16, marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📅</span>
                        <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500 }}>{fmt(nextEvent.event?.date)}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <span style={{ width: 26, height: 26, borderRadius: 7, background: "rgba(99,102,241,.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12 }}>📍</span>
                        <span style={{ fontSize: 13, color: "#9ca3af", fontWeight: 500, maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {nextEvent.event?.venue}, {nextEvent.event?.city}
                        </span>
                      </div>
                    </div>

                    {(() => {
                      const days   = daysUntil(nextEvent.event?.date);
                      const cap    = 30;
                      const pct    = Math.max(0, Math.min(100, 100 - (days / cap) * 100));
                      const totalMs = new Date(nextEvent.event?.date) - new Date();
                      const d = Math.floor(totalMs / 86400000);
                      const h = Math.floor((totalMs % 86400000) / 3600000);
                      const m = Math.floor((totalMs % 3600000) / 60000);
                      return (
                        <div style={{ marginBottom: 16 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                            <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 600, letterSpacing: ".05em" }}>EVENT PROXIMITY</span>
                            {totalMs > 0 ? (
                              <span className="db-mono" style={{ fontSize: 11, color: "#6366f1", display: "inline-flex", alignItems: "center", gap: 4 }}>
                                <span>{String(d).padStart(2,"0")}d</span>
                                <span style={{ color: "#374151" }}>:</span>
                                <span>{String(h).padStart(2,"0")}h</span>
                                <span style={{ color: "#374151" }}>:</span>
                                <span>{String(m).padStart(2,"0")}m</span>
                              </span>
                            ) : (
                              <span className="db-mono" style={{ fontSize: 11, color: "#43e8b0" }}>Now</span>
                            )}
                          </div>
                          <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 99, overflow: "hidden" }}>
                            <div className="db-progress-bar" style={{ width: `${pct}%`, height: "100%" }} />
                          </div>
                        </div>
                      );
                    })()}

                    <Link to={`/ticket/${nextEvent.ticketId}`} className="db-ticket-btn" style={{
                      display: "inline-flex", alignItems: "center", gap: 8,
                      padding: "10px 20px", background: "#6366f1", color: "#fff",
                      borderRadius: 11, fontSize: 13, fontWeight: 700,
                      textDecoration: "none", letterSpacing: ".02em",
                    }}>
                      View Ticket
                      <svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </Link>
                  </>
                ) : (
                  <div style={{ textAlign: "center", padding: "20px 0 4px" }}>
                    <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.07)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, margin: "0 auto 12px" }}>📅</div>
                    <p style={{ fontSize: 14, fontWeight: 700, color: "#d1d5db", marginBottom: 4 }}>No upcoming events</p>
                    <p style={{ fontSize: 12, color: "#4b5563", marginBottom: 16, lineHeight: 1.6 }}>Browse events and register for your next experience</p>
                    <Link to="/explore" className="db-explore-btn" style={{
                      display: "inline-flex", alignItems: "center", gap: 7,
                      padding: "9px 18px", background: "rgba(255,255,255,.05)",
                      border: "1px solid rgba(255,255,255,.08)", color: "#9ca3af",
                      borderRadius: 10, fontSize: 13, fontWeight: 600, textDecoration: "none",
                    }}>
                      Explore Events →
                    </Link>
                  </div>
                )}
              </div>

              {/* STAT CARDS — favorites now shows real count */}
              <div className="db-fade-3 db-stat-row" style={{ display: "flex", gap: 10, flexShrink: 0 }}>
                <StatCard label="Upcoming" value={upcoming.length} icon="🗓" accent="#6366f1"
                  subLabel={upcoming.length > 0 ? `Next in ${daysUntil(upcoming[0]?.event?.date)}d` : "No events yet"}
                />
                <StatCard label="Past" value={past.length} icon="✅" accent="#8b5cf6"
                  subLabel={past.length > 0 ? `${past.length} attended` : "None yet"}
                />
                <StatCard label="Tickets" value={tickets.length} icon="🎫" accent="#43e8b0"
                  subLabel={tickets.length > 0 ? "View all" : "No tickets yet"}
                  subLink={tickets.length > 0 ? "/tickets" : null}
                />
                <StatCard label="Favorites" value={favCount} icon="⭐" accent="#f59e0b"
                  subLabel={favCount > 0 ? "View saved" : "Save events"}
                  subLink="/explore"
                />
              </div>

              {/* FILLER / UPCOMING LIST */}
              {upcoming.length <= 1 && (
                <div className="db-fade-4" style={{
                  flex: 1, minHeight: 0, background: "#0f1623",
                  border: "1px solid rgba(255,255,255,.07)", borderRadius: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 10,
                }}>
                  <span style={{ fontSize: 24 }}>🗓</span>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#4b5563", textAlign: "center", margin: 0 }}>
                    No other upcoming events
                  </p>
                  <Link to="/explore" style={{ fontSize: 12, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>
                    Explore events →
                  </Link>
                </div>
              )}

              {upcoming.length > 1 && (
                <div className="db-fade-4" style={{
                  background: "#0f1623", border: "1px solid rgba(255,255,255,.07)",
                  borderRadius: 18, overflow: "hidden", flex: 1, minHeight: 0,
                  display: "flex", flexDirection: "column",
                }}>
                  <div style={{ padding: "12px 20px 10px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: ".08em", color: "#4b5563", textTransform: "uppercase" }}>All Upcoming</span>
                    <span className="db-mono" style={{ fontSize: 11, color: "#6366f1", fontWeight: 500 }}>{upcoming.length} events</span>
                  </div>
                  <div style={{ overflowY: "auto", flex: 1 }}>
                    {upcoming.slice(1).map((t, i) => (
                      <Link key={i} to={`/ticket/${t.ticketId}`} className="db-activity-row db-upcoming-link" style={{
                        display: "flex", alignItems: "center", justifyContent: "space-between",
                        padding: "11px 20px",
                        borderBottom: i < upcoming.length - 2 ? "1px solid rgba(255,255,255,.04)" : "none",
                        textDecoration: "none",
                      }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, minWidth: 0 }}>
                          <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#6366f1", flexShrink: 0, boxShadow: "0 0 6px rgba(99,102,241,.6)" }} />
                          <span style={{ fontSize: 13, fontWeight: 600, color: "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.event?.title}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
                          <span style={{ fontSize: 11, color: "#4b5563", fontWeight: 500 }}>{fmt(t.event?.date)}</span>
                          <svg className="db-upcoming-arrow" width="13" height="13" fill="none" stroke="#4b5563" strokeWidth="2" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 18l6-6-6-6" />
                          </svg>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* ── RIGHT COLUMN ── */}
            <div className="db-right-col" style={{ display: "flex", flexDirection: "column", gap: 12, height: "100%", overflow: "hidden" }}>

              {/* RECENT ACTIVITY */}
              <div className="db-fade-2" style={{ background: "#0f1623", border: "1px solid rgba(255,255,255,.07)", borderRadius: 18, overflow: "hidden", flexShrink: 0 }}>
                <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(255,255,255,.05)", display: "flex", alignItems: "center", gap: 8 }}>
                  <div className="db-live-dot" style={{ width: 6, height: 6, borderRadius: "50%", background: "#43e8b0", boxShadow: "0 0 5px rgba(67,232,176,.7)" }} />
                  <h3 style={{ fontSize: 13, fontWeight: 700, color: "#e5e7eb" }}>Recent Activity</h3>
                </div>

                {recentActivity.length === 0 ? (
                  <div style={{ padding: "28px 18px", textAlign: "center" }}>
                    <p style={{ fontSize: 13, color: "#4b5563", marginBottom: 14 }}>No activity yet</p>
                    <Link to="/explore" style={{ fontSize: 13, color: "#6366f1", fontWeight: 600, textDecoration: "none" }}>Start exploring →</Link>
                  </div>
                ) : (
                  <div>
                    {recentActivity.map((t, i) => (
                      <div key={i} className="db-activity-row" style={{ padding: "10px 18px", borderBottom: i < recentActivity.length - 1 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 3 }}>
                          <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".06em", color: "#43e8b0", background: "rgba(67,232,176,.1)", border: "1px solid rgba(67,232,176,.2)", padding: "2px 7px", borderRadius: 99, textTransform: "uppercase" }}>
                            Registered
                          </span>
                          <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 500 }}>
                            {relativeTime(t.createdAt || Date.now())}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, fontWeight: 600, color: "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 4 }}>
                          {t.event?.title}
                        </p>
                      </div>
                    ))}
                    <div style={{ padding: "10px 18px" }}>
                      <Link to="/tickets" className="db-view-btn" style={{
                        display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                        padding: "9px", background: "rgba(255,255,255,.03)",
                        border: "1px solid rgba(255,255,255,.07)", borderRadius: 10,
                        fontSize: 12, fontWeight: 600, color: "#6b7280", textDecoration: "none",
                      }}>
                        View all
                        <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </Link>
                    </div>
                  </div>
                )}
              </div>

              {/* OVERVIEW */}
              <div className="db-fade-3 db-overview" style={{
                background: "#0f1623", border: "1px solid rgba(255,255,255,.07)",
                borderRadius: 18, padding: "16px 18px",
                flex: 1, minHeight: 0, display: "flex", flexDirection: "column",
              }}>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: ".09em", color: "#4b5563", textTransform: "uppercase", marginBottom: 12, flexShrink: 0 }}>
                  Overview
                </p>
                <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "flex-start", gap: 4 }}>
                  {[
                    { label: "Total Tickets", value: tickets.length, color: "#6366f1", sub: tickets.length > 0 ? "across all events" : "Register for events" },
                    { label: "Upcoming",      value: upcoming.length, color: "#43e8b0", sub: upcoming.length > 0 ? `Next in ${daysUntil(upcoming[0]?.event?.date)}d` : "No upcoming events" },
                    { label: "Past",          value: past.length,     color: "#8b5cf6", sub: past.length > 0 ? "events attended" : "None attended yet" },
                  ].map(({ label, value, color, sub }) => (
                    <div key={label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: label !== "Past" ? "1px solid rgba(255,255,255,.05)" : "none" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div style={{ width: 3, height: 28, borderRadius: 99, background: color, boxShadow: `0 0 8px ${color}60` }} />
                        <div>
                          <div style={{ fontSize: 12, color: "#6b7280", fontWeight: 500 }}>{label}</div>
                          <div style={{ fontSize: 10, color: "#374151", marginTop: 1 }}>{sub}</div>
                        </div>
                      </div>
                      <span className="db-mono db-stat-number" style={{ fontSize: 20, fontWeight: 700, color: "#f0f4ff" }}>
                        {value}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Dashboard;