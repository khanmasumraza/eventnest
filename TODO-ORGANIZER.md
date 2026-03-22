# Organizer Dashboard Fix Plan

## Issues
1. **Frontend**: Wrong API `/api/events/my-events` (❌ no route)
2. **Backend**: No POST /api/organizer/events create
3. **Role refresh**: Frontend needs refetch after becomeOrganizer
4. **Empty state**: Good, but needs organizer routes

## Step-by-Step Fix

### 1. Backend Routes (organizerRoutes.js)
```
POST /api/organizer/events (createEvent)
GET /api/organizer/events (getOrganizerEvents ✓)
GET /api/organizer/dashboard (getDashboardStats ✓)
```

### 2. Backend Controller (organizerController.js)
Add `createEvent` function

### 3. Frontend (OrganiserDashboard.jsx)
```
Change:
- /api/events/my-events → /api/organizer/events
- Add createEvent form/modal
- Refetch user after role change
```

### 4. Test
```
1. Become organizer → role=user → organizer
2. Dashboard loads events/stats
3. Create event → POST /api/organizer/events
4. List shows new event
```

**Ready to implement backend first?**
