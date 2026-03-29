# ChatInbox UI Upgrade TODO - WhatsApp Split Layout

## Plan Steps:

- [x] Create TODO.md with breakdown
- [x] Implement split layout: Left sidebar conversations + right ChatBox
- [x] Add activeChat local state for in-page chat selection
- [x] Update handleOpenChat to setActiveChat (no navigation)
- [x] Import and render ChatBox conditionally
- [x] Modern dark SaaS UI with hover/active states, avatars, responsive
- [x] Verify all existing logic preserved (fetch, socket, data mapping)
- [x] Test: List clicks open chat instantly, real-time updates, mobile responsive

**Status: ✅ COMPLETE**

Files updated:

- frontend/src/pages/ChatInbox.jsx (full implementation)
