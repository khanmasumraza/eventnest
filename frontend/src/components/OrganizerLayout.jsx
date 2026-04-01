import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

const navItems = [
  {
    path: '/organiser/dashboard',
    label: 'Dashboard',
    d: 'M4 5a1 1 0 011-1h4a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zm10 0a1 1 0 011-1h4a1 1 0 011 1v2a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zm10-3a1 1 0 011-1h4a1 1 0 011 1v7a1 1 0 01-1 1h-4a1 1 0 01-1-1v-7z',
  },
  {
    path: '/organiser/events',
    label: 'Events',
    d: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
  },
  {
    path: '/organiser/tickets',
    label: 'Attendees',
    d: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    path: '/organiser/analytics',
    label: 'Analytics',
    d: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
  },
  {
    path: '/organiser/payouts',
    label: 'Payouts',
    d: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  },
];

const pageTitles = {
  '/organiser/dashboard': 'Dashboard',
  '/organiser/events':    'Events',
  '/organiser/create':    'Create Event',
  '/organiser/attendees': 'Attendees',
  '/organiser/tickets':   'Attendees',
  '/organiser/analytics': 'Analytics',
  '/organiser/payouts':   'Payouts',
};

function Icon({ d, size = 15 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6}
      strokeLinecap="round" strokeLinejoin="round"
      style={{ flexShrink: 0 }}
    >
      <path d={d} />
    </svg>
  );
}

/* Sidebar nav link — desktop only */
function NavLink({ item, active }) {
  const [hovered, setHovered] = useState(false);
  return (
    <Link
      to={item.path}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
        padding: '8px 10px',
        borderRadius: '10px',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        textDecoration: 'none',
        transition: 'all 0.15s',
        position: 'relative',
        color: active ? '#818cf8' : hovered ? '#e5e7eb' : '#6b7280',
        background: active
          ? 'rgba(99,102,241,0.1)'
          : hovered
          ? 'rgba(255,255,255,0.04)'
          : 'transparent',
      }}
    >
      {active && (
        <span style={{
          position: 'absolute', left: 0, top: '50%',
          transform: 'translateY(-50%)',
          width: '3px', height: '16px',
          borderRadius: '0 3px 3px 0',
          background: '#6366f1',
        }} />
      )}
      <Icon d={item.d} size={15} />
      {item.label}
    </Link>
  );
}

function OrganizerLayout({ children }) {
  const location = useLocation();
  const [mounted, setMounted] = useState(false);
  const [homeHovered, setHomeHovered] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 30);
    return () => clearTimeout(t);
  }, []);

  const pageTitle = pageTitles[location.pathname] ?? 'Workspace';

  return (
    <div style={{
      minHeight: '100vh',
      background: '#080c14',
      display: 'flex',
      fontFamily: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>

      {/* ══════════════════════════════════
          SIDEBAR — hidden on mobile, visible md+
         ══════════════════════════════════ */}
      <aside className="organizer-sidebar">
        {/* Logo */}
        <div style={{
          padding: '18px 14px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.05)',
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
        }}>
          <div style={{
            width: '28px', height: '28px',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
            borderRadius: '8px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ color: 'white', fontWeight: 700, fontSize: '10px' }}>EN</span>
          </div>
          <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '14px' }}>EventNest</span>
        </div>

        {/* Nav links */}
        <nav style={{
          flex: 1,
          padding: '10px 8px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}>
          {navItems.map(item => (
            <NavLink
              key={item.path}
              item={item}
              active={location.pathname === item.path}
            />
          ))}
        </nav>

        {/* Homepage link */}
        <div style={{
          borderTop: '1px solid rgba(255,255,255,0.05)',
          padding: '12px 8px 16px',
        }}>
          <Link
            to="/"
            onMouseEnter={() => setHomeHovered(true)}
            onMouseLeave={() => setHomeHovered(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px 10px',
              borderRadius: '10px',
              fontSize: '13px',
              fontWeight: 400,
              textDecoration: 'none',
              transition: 'all 0.15s',
              color: homeHovered ? '#e5e7eb' : '#4b5563',
              background: homeHovered ? 'rgba(255,255,255,0.04)' : 'transparent',
            }}
          >
            <Icon
              size={14}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
            Homepage
          </Link>
        </div>
      </aside>

      {/* ══════════════════════════════════
          MAIN CONTENT AREA
         ══════════════════════════════════ */}
      <div className="organizer-main">

        {/* Top header */}
        <header className="organizer-header">
          {/* Logo mark — mobile only */}
          <div className="organizer-header-logo">
            <div style={{
              width: '24px', height: '24px',
              background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
              borderRadius: '6px',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ color: 'white', fontWeight: 700, fontSize: '9px' }}>EN</span>
            </div>
            <span style={{ color: '#e5e7eb', fontWeight: 700, fontSize: '13px' }}>EventNest</span>
          </div>

          {/* Page title — always visible */}
          <span style={{ color: '#6b7280', fontSize: '13px', fontWeight: 500 }}>
            {pageTitle}
          </span>
        </header>

        {/* Page content */}
        <main
          className="organizer-content"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? 'translateY(0)' : 'translateY(6px)',
            transition: 'opacity 0.25s ease, transform 0.25s ease',
          }}
        >
          {children}
        </main>
      </div>

      {/* ══════════════════════════════════
          BOTTOM NAV — mobile only (md hidden)
         ══════════════════════════════════ */}
      <nav className="organizer-bottom-nav">
        {navItems.map(item => {
          const active = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="organizer-bottom-nav-item"
              style={{
                color: active ? '#818cf8' : '#4b5563',
                background: 'none',
              }}
            >
              {/* Active indicator dot */}
              {active && (
                <span style={{
                  position: 'absolute',
                  top: '4px',
                  width: '4px', height: '4px',
                  borderRadius: '50%',
                  background: '#6366f1',
                }} />
              )}
              <Icon d={item.d} size={20} />
              <span style={{
                fontSize: '10px',
                fontWeight: active ? 600 : 400,
                marginTop: '2px',
                lineHeight: 1,
              }}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.06); border-radius: 4px; }

        /* ── SIDEBAR ── */
        .organizer-sidebar {
          width: 210px;
          background: #0a0f1c;
          border-right: 1px solid rgba(255,255,255,0.05);
          display: none;          /* hidden on mobile */
          flex-direction: column;
          position: fixed;
          height: 100%;
          z-index: 20;
        }

        /* ── MAIN ── */
        .organizer-main {
          flex: 1;
          margin-left: 0;        /* no sidebar offset on mobile */
          display: flex;
          flex-direction: column;
          min-height: 100vh;
        }

        /* ── HEADER ── */
        .organizer-header {
          height: 48px;
          background: #0a0f1c;
          border-bottom: 1px solid rgba(255,255,255,0.05);
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 16px;
          position: sticky;
          top: 0;
          z-index: 10;
        }

        /* Logo in header — mobile only */
        .organizer-header-logo {
          display: flex;
          align-items: center;
          gap: 7px;
        }

        /* ── CONTENT ── */
        .organizer-content {
          padding: 16px 16px 80px;   /* bottom padding clears the bottom nav */
          flex: 1;
        }

        /* ── BOTTOM NAV ── */
        .organizer-bottom-nav {
          display: flex;             /* visible on mobile */
          position: fixed;
          bottom: 0; left: 0; right: 0;
          background: #0a0f1c;
          border-top: 1px solid rgba(255,255,255,0.05);
          z-index: 30;
          padding-bottom: env(safe-area-inset-bottom, 0px);
        }

        .organizer-bottom-nav-item {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 3px;
          padding: 10px 4px;
          text-decoration: none;
          position: relative;
          transition: color 0.15s;
        }

        /* ── md+ (768px) — sidebar layout ── */
        @media (min-width: 768px) {
          .organizer-sidebar {
            display: flex;           /* show sidebar */
          }
          .organizer-main {
            margin-left: 210px;      /* offset for sidebar */
          }
          .organizer-header {
            height: 44px;
            padding: 0 24px;
            justify-content: flex-start;   /* title only, no logo needed */
          }
          .organizer-header-logo {
            display: none;           /* sidebar has the logo, hide from header */
          }
          .organizer-content {
            padding: 24px;           /* full desktop padding, no bottom offset */
          }
          .organizer-bottom-nav {
            display: none;           /* hide bottom nav on desktop */
          }
        }
      `}</style>
    </div>
  );
}

export default OrganizerLayout;