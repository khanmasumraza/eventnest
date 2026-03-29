import React, { useState, useRef, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useAuth } from "../context/AuthContext"
import { useChatContext } from "../context/chatContext"

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');

  .nb-root { font-family: 'Plus Jakarta Sans', sans-serif; }

  .nb-link {
    font-size: 14px; font-weight: 600; letter-spacing: -.01em;
    color: #9ca3af; text-decoration: none;
    padding: 6px 2px; position: relative;
    transition: color .15s ease;
  }
  .nb-link:hover { color: #f0f4ff; }
  .nb-link.active { color: #f0f4ff; }
  .nb-link.active::after {
    content: '';
    position: absolute; bottom: -2px; left: 0; right: 0;
    height: 2px; border-radius: 99px; background: #6366f1;
  }

  .nb-dropdown-item {
    display: flex; align-items: center; gap: 10px;
    padding: 9px 16px;
    font-size: 13px; font-weight: 600;
    color: #9ca3af; text-decoration: none;
    transition: background .12s ease, color .12s ease;
    cursor: pointer; border: none; background: none;
    width: 100%; text-align: left;
    font-family: 'Plus Jakarta Sans', sans-serif;
  }
  .nb-dropdown-item:hover { background: rgba(255,255,255,.04); color: #f0f4ff; }
  .nb-dropdown-item:hover svg { stroke: #f0f4ff; }
  .nb-dropdown-item.danger { color: #f87171; }
  .nb-dropdown-item.danger svg { stroke: #f87171; }
  .nb-dropdown-item.danger:hover { background: rgba(239,68,68,.08); }

  .nb-avatar-btn {
    display: flex; align-items: center; gap: 8px;
    background: none; border: none; cursor: pointer;
    padding: 4px 8px 4px 4px; border-radius: 99px;
    transition: background .15s ease;
  }
  .nb-avatar-btn:hover { background: rgba(255,255,255,.06); }

  .nb-sign-in {
    font-size: 13px; font-weight: 700;
    color: #fff; text-decoration: none;
    padding: 8px 18px; background: #6366f1;
    border-radius: 10px;
    transition: background .15s ease;
    box-shadow: 0 2px 12px rgba(99,102,241,.3);
  }
  .nb-sign-in:hover { background: #4f46e5; }

  .nb-icon-box {
    width: 28px; height: 28px; border-radius: 8px;
    background: rgba(255,255,255,.05);
    display: flex; align-items: center; justify-content: center;
    flex-shrink: 0;
  }

  .nb-chat-badge {
    position: absolute;
    top: -7px; right: -10px;
    min-width: 18px; height: 18px;
    background: #6366f1;
    color: #fff;
    font-size: 10px; font-weight: 800;
    border-radius: 99px;
    display: flex; align-items: center; justify-content: center;
    padding: 0 5px;
    border: 2px solid rgba(8,12,20,.9);
    animation: badge-pop .2s ease;
    pointer-events: none;
  }

  @keyframes badge-pop {
    0% { transform: scale(0.5); opacity: 0; }
    70% { transform: scale(1.15); }
    100% { transform: scale(1); opacity: 1; }
  }

  @media (max-width: 768px) {
    .nb-links { display: none !important; }
    .nb-name { display: none !important; }
  }
`

function Navbar() {
  const { user, logout, isAuthenticated } = useAuth()
  const { totalUnread } = useChatContext()
  const [showDropdown, setShowDropdown]   = useState(false)
  const dropdownRef = useRef(null)
  const location    = useLocation()

  const handleLogout = () => { setShowDropdown(false); logout() }

  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target))
        setShowDropdown(false)
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const isActive = (path) => location.pathname === path

  const getInitials = (name, email) => {
    if (name) {
      const parts = name.split(" ")
      if (parts.length > 1) return (parts[0][0] + parts[1][0]).toUpperCase()
      return parts[0][0].toUpperCase()
    }
    if (email) return email[0].toUpperCase()
    return "U"
  }

  const getAvatarUrl = () => {
    if (user?.profilePhoto) return user.profilePhoto
    if (user?.avatar)       return user.avatar
    return null
  }

  const avatarUrl = getAvatarUrl()

  return (
    <>
      <style>{STYLES}</style>
      <motion.nav
        className="nb-root"
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.4 }}
        style={{
          position: "sticky", top: 0, zIndex: 50,
          background: "rgba(8,12,20,.9)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          borderBottom: "1px solid rgba(255,255,255,.07)",
          padding: "0 28px", height: 64,
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}
      >
        {/* ── LOGO ── */}
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <span style={{ fontSize: 24 }}>🎪</span>
          <span style={{
            fontSize: 18, fontWeight: 800,
            background: "linear-gradient(135deg, #a5b4fc, #6366f1)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            EventNest
          </span>
        </Link>

        {/* ── RIGHT SIDE ── */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>

          {/* Nav links — hidden on mobile */}
          <div className="nb-links" style={{ display: "flex", alignItems: "center", gap: 24 }}>
            <Link to="/explore" className={`nb-link${isActive("/explore") ? " active" : ""}`}>
              Explore
            </Link>
            {isAuthenticated && (
              <>
                <Link to="/dashboard" className={`nb-link${isActive("/dashboard") ? " active" : ""}`}>
                  Dashboard
                </Link>
                <Link to="/tickets" className={`nb-link${isActive("/tickets") ? " active" : ""}`}>
                  My Tickets
                </Link>

                {/* ── CHAT LINK WITH BADGE ── */}
                <Link
                  to="/chat"
                  className={`nb-link${isActive("/chat") ? " active" : ""}`}
                  style={{ position: "relative" }}
                >
                  💬 Chat
                  <AnimatePresence>
                    {totalUnread > 0 && (
                      <motion.span
                        key="badge"
                        className="nb-chat-badge"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.5, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {totalUnread > 99 ? "99+" : totalUnread}
                      </motion.span>
                    )}
                  </AnimatePresence>
                </Link>
              </>
            )}
          </div>

          {/* Sign in */}
          {!isAuthenticated && (
            <Link to="/login" className="nb-sign-in">Sign in</Link>
          )}

          {/* Avatar + dropdown */}
          {isAuthenticated && (
            <div style={{ position: "relative" }} ref={dropdownRef}>
              <button className="nb-avatar-btn" onClick={() => setShowDropdown(!showDropdown)}>
                {/* Avatar circle */}
                <div style={{
                  width: 34, height: 34, borderRadius: "50%",
                  background: "#6366f1",
                  border: "2px solid rgba(99,102,241,.5)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  overflow: "hidden", flexShrink: 0,
                }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontSize: 12, fontWeight: 800, color: "#fff" }}>
                      {getInitials(user?.name, user?.email)}
                    </span>
                  )}
                </div>

                {/* Name */}
                <span className="nb-name" style={{
                  fontSize: 13, fontWeight: 600, color: "#d1d5db",
                  maxWidth: 120, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                }}>
                  {user?.name}
                </span>

                {/* Chevron */}
                <svg
                  width="12" height="12" fill="none" stroke="#6b7280" strokeWidth="2.5" viewBox="0 0 24 24"
                  style={{ transition: "transform .2s ease", transform: showDropdown ? "rotate(180deg)" : "rotate(0)" }}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* ── DROPDOWN ── */}
              <AnimatePresence>
                {showDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: .97 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: .97 }}
                    transition={{ duration: 0.18, ease: [.22,1,.36,1] }}
                    style={{
                      position: "absolute", right: 0, top: "calc(100% + 8px)",
                      width: 220,
                      background: "#0f1623",
                      border: "1px solid rgba(255,255,255,.09)",
                      borderRadius: 16,
                      boxShadow: "0 20px 60px rgba(0,0,0,.7), 0 0 0 1px rgba(99,102,241,.08)",
                      overflow: "hidden", zIndex: 100,
                    }}
                  >
                    {/* User header */}
                    <div style={{
                      padding: "14px 16px",
                      borderBottom: "1px solid rgba(255,255,255,.06)",
                      display: "flex", alignItems: "center", gap: 10,
                    }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: "50%",
                        background: "#6366f1", border: "2px solid rgba(99,102,241,.3)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        overflow: "hidden", flexShrink: 0,
                      }}>
                        {avatarUrl ? (
                          <img src={avatarUrl} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        ) : (
                          <span style={{ fontSize: 13, fontWeight: 800, color: "#fff" }}>
                            {getInitials(user?.name, user?.email)}
                          </span>
                        )}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: "#f0f4ff", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user?.name}
                        </p>
                        <p style={{ fontSize: 11, color: "#374151", margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {user?.email}
                        </p>
                      </div>
                    </div>

                    {/* Menu items */}
                    <div style={{ padding: "6px 0" }}>
                      <Link to="/profile" className="nb-dropdown-item" onClick={() => setShowDropdown(false)}>
                        <div className="nb-icon-box">
                          <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"/>
                          </svg>
                        </div>
                        My Profile
                      </Link>

                      <Link to="/dashboard" className="nb-dropdown-item" onClick={() => setShowDropdown(false)}>
                        <div className="nb-icon-box">
                          <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
                            <rect x="3" y="3" width="7" height="7" rx="1"/>
                            <rect x="14" y="3" width="7" height="7" rx="1"/>
                            <rect x="3" y="14" width="7" height="7" rx="1"/>
                            <rect x="14" y="14" width="7" height="7" rx="1"/>
                          </svg>
                        </div>
                        Dashboard
                      </Link>

                      <Link to="/tickets" className="nb-dropdown-item" onClick={() => setShowDropdown(false)}>
                        <div className="nb-icon-box">
                          <svg width="14" height="14" fill="none" stroke="#9ca3af" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z"/>
                          </svg>
                        </div>
                        My Tickets
                      </Link>
                    </div>

                    {/* Logout */}
                    <div style={{ borderTop: "1px solid rgba(255,255,255,.06)", padding: "6px 0" }}>
                      <button onClick={handleLogout} className="nb-dropdown-item danger">
                        <div className="nb-icon-box" style={{ background: "rgba(239,68,68,.08)" }}>
                          <svg width="14" height="14" fill="none" stroke="#f87171" strokeWidth="1.8" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/>
                          </svg>
                        </div>
                        Logout
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </motion.nav>
    </>
  )
}

export default Navbar