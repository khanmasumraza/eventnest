import { Routes, Route, Navigate, Outlet } from 'react-router-dom'

import AuthLayout from './layouts/AuthLayout'
import MainLayout from './layouts/MainLayout'

import Home from './pages/Home'
import Explore from './pages/Explore'
import Login from './pages/Login'
import AuthSuccess from './pages/AuthSuccess'
import Dashboard from './pages/Dashboard'
import Tickets from './pages/Tickets'
import Profile from './pages/Profile'
import Checkout from './pages/Checkout'
import Ticket from './pages/Ticket'
import CheckIn from './pages/CheckIn'
import PaymentRequired from './pages/PaymentRequired'
import OrganizerStart from './pages/OrganizerStart'
import OrganizerDashboard from './pages/OrganizerDashboard'
import OrganizerEvents from './pages/OrganizerEvents'
import OrganizerCreateEvent from './pages/OrganizerCreateEvent'
import OrganizerAnalytics from './pages/OrganizerAnalytics'
import OrganizerPayouts from './pages/OrganizerPayouts'

import OrganizerTickets from './pages/OrganizerTickets'
import ChatInbox from './pages/ChatInbox'
import ChatBoxWrapper from './pages/ChatBoxWrapper'
import EventDetails from './components/EventDetails'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import { ChatProvider } from './context/chatContext'

// ─── Organiser shell (no global navbar) ────────────────────────────────────
const OrganizerShell = () => (
  <div style={{ minHeight: '100vh', background: '#080c14' }}>
    <Outlet />
  </div>
)

// ─── Auth guard ─────────────────────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, isInitialized } = useAuth()

  if (!isInitialized) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
        Loading...
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  return children
}

// ─── App ────────────────────────────────────────────────────────────────────
function AppContent() {
  return (
    <Routes>
      {/* ── AUTH ── */}
      <Route
        path="/login"
        element={
          <AuthLayout>
            <Login />
          </AuthLayout>
        }
      />
      <Route
        path="/payment-required"
        element={
          <AuthLayout>
            <PaymentRequired />
          </AuthLayout>
        }
      />
      <Route path="/auth/success" element={<AuthSuccess />} />

      {/* ── ORGANISER (no global navbar) ── */}
      <Route element={<OrganizerShell />}>
        <Route
          path="organiser"
          element={<Navigate to="/organiser/dashboard" replace />}
        />
        <Route
          path="organizer/*"
          element={<Navigate to="/organiser/dashboard" replace />}
        />

        <Route
          path="organiser/start"
          element={
            <ProtectedRoute>
              <OrganizerStart />
            </ProtectedRoute>
          }
        />
        <Route
          path="organiser/dashboard"
          element={
            <ProtectedRoute>
              <OrganizerDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="organiser/events"
          element={
            <ProtectedRoute>
              <OrganizerEvents />
            </ProtectedRoute>
          }
        />
        <Route
          path="organiser/create"
          element={
            <ProtectedRoute>
              <OrganizerCreateEvent />
            </ProtectedRoute>
          }
        />
        <Route
          path="organiser/analytics"
          element={
            <ProtectedRoute>
              <OrganizerAnalytics />
            </ProtectedRoute>
          }
        />
        <Route
          path="organiser/payouts"
          element={
            <ProtectedRoute>
              <OrganizerPayouts />
            </ProtectedRoute>
          }
        />

        {/* Attendees + Tickets → same component. /attendees redirects to /tickets */}
        <Route
          path="organiser/tickets"
          element={
            <ProtectedRoute>
              <OrganizerTickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="organiser/attendees"
          element={<Navigate to="/organiser/tickets" replace />}
        />

        {/* Legacy / unused routes kept as redirects so nothing 404s */}
        <Route
          path="organiser/inbox"
          element={<Navigate to="/organiser/dashboard" replace />}
        />
        <Route
          path="organiser/event/:id/attendees"
          element={<Navigate to="/organiser/tickets" replace />}
        />
        <Route
          path="organiser/checkin"
          element={
            <ProtectedRoute>
              <CheckIn />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* ── MAIN (with global navbar) ── */}
      <Route element={<MainLayout />}>
        <Route index element={<Home />} />
        <Route path="explore" element={<Explore />} />
        <Route path="event/:id" element={<EventDetails />} />
        <Route path="event/:id/checkout" element={<Checkout />} />
        <Route path="ticket/:ticketId" element={<Ticket />} />

        <Route
          path="dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="tickets"
          element={
            <ProtectedRoute>
              <Tickets />
            </ProtectedRoute>
          }
        />
        <Route
          path="profile"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />

        <Route
          path="chat"
          element={
            <ProtectedRoute>
              <ChatInbox />
            </ProtectedRoute>
          }
        >
          <Route path=":userId" element={<ChatBoxWrapper />} />
        </Route>

        <Route
          path="admin"
          element={
            <ProtectedRoute>
              <div>Admin Panel</div>
            </ProtectedRoute>
          }
        />
      </Route>
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <ChatProvider>
          <AppContent />
        </ChatProvider>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App
