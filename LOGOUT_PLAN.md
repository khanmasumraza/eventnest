# Logout Implementation Plan

**Information Gathered:**
- AuthContext.jsx: logout() clears token/user/isAuthenticated but no navigation
- Navbar.jsx: calls logout() → handleLogout closes dropdown but no redirect
- ProtectedRoute.jsx: already redirects unauth to /login
- No useNavigate in AuthContext

**Plan:**
**frontend/src/context/AuthContext.jsx**
1. Import useNavigate from 'react-router-dom'
2. In AuthProvider: const navigate = useNavigate()
3. Update logout(): localStorage.removeItem("token") + set states + navigate("/login", { replace: true })

**frontend/src/components/Navbar.jsx**
1. No changes needed (calls logout() which now navigates)

**Dependent Files:** None (ProtectedRoute already safe)

**Followup steps:**
1. cd frontend && npm start
2. Login → Navbar dropdown → Logout → verify /login redirect + clean state

