import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const sidebarItems = [
  { path: '/organiser/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/organiser/events', label: 'Events', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/organiser/create', label: 'Create Event', icon: 'M12 4v16m8-8H4' },
  { path: '/organiser/attendees', label: 'Attendees', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
  { path: '/organiser/tickets', label: 'Tickets', icon: 'M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z' },
  { path: '/organiser/analytics', label: 'Analytics', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/organiser/payouts', label: 'Payouts', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  { path: '/organiser/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

// Derive a clean page title from the current path
function getPageTitle(pathname) {
  const map = {
    '/organiser/dashboard': 'Dashboard',
    '/organiser/events':    'Events',
    '/organiser/create':    'Create Event',
    '/organiser/attendees': 'Attendees',
    '/organiser/tickets':   'Tickets',
    '/organiser/analytics': 'Analytics',
    '/organiser/payouts':   'Payouts',
    '/organiser/settings':  'Settings',
  };
  return map[pathname] ?? 'Organizer Workspace';
}

function OrganizerLayout({ children }) {
  const location = useLocation();
  const navigate  = useNavigate();
  const { user, setUser } = useAuth();

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  const pageTitle = getPageTitle(location.pathname);

  return (
    <div className="min-h-screen bg-[#0B0F19] flex">

      {/* ── Sidebar ── */}
      <aside className="w-[220px] bg-[#121826] border-r border-[#1F2937] flex flex-col fixed h-full">

        {/* Logo */}
        <div className="p-5 border-b border-[#1F2937]">
          <Link to="/organiser/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#6366F1] rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">EN</span>
            </div>
            <span className="text-[#E5E7EB] font-semibold">EventNest</span>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {sidebarItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[#6366F1]/10 text-[#6366F1]'
                    : 'text-[#9CA3AF] hover:text-[#E5E7EB] hover:bg-white/5'
                }`}
              >
                <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User + Sign out */}
        <div className="p-4 border-t border-[#1F2937]">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-[#6366F1]/20 rounded-full flex items-center justify-center shrink-0">
              <span className="text-[#6366F1] text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-[#E5E7EB] truncate">{user?.name || 'User'}</p>
              <p className="text-[11px] text-[#6B7280]">Organizer</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="w-full px-3 py-1.5 text-[13px] text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-all duration-150 text-left"
          >
            Sign out
          </button>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 ml-[220px] flex flex-col min-h-screen">

        {/* Top bar — just title + notification bell + avatar. No Create Event here. */}
        <header className="h-14 bg-[#121826] border-b border-[#1F2937] flex items-center justify-between px-6 sticky top-0 z-10">
          <h2 className="text-[15px] font-semibold text-[#E5E7EB]">{pageTitle}</h2>

          <div className="flex items-center gap-3">
            {/* Bell */}
            <button className="p-1.5 text-[#6B7280] hover:text-[#E5E7EB] hover:bg-white/5 rounded-lg transition-all duration-150">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>

            {/* Avatar only — name already in sidebar */}
            <div className="w-8 h-8 bg-[#6366F1]/20 rounded-full flex items-center justify-center cursor-pointer">
              <span className="text-[#6366F1] text-sm font-semibold">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-6 flex-1">
          {children}
        </main>
      </div>
    </div>
  );
}

export default OrganizerLayout;