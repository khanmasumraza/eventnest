# EventNest Implementation Plan

## Project Analysis Summary

### Current State

- **Backend**: Express + MongoDB with auth, events CRUD, registration, waitlist
- **Frontend**: React + Tailwind + Framer Motion with Home, Explore, Login, Register, Dashboard, OrganiserDashboard, EventDetails
- **Missing**: Payment system, secure tickets, real-time updates, user profile, checkout, organizer analytics

### Technology Stack

- Frontend: React 19, TailwindCSS 3.4, Framer Motion 12, React Router 7, Axios
- Backend: Node.js, Express 5, MongoDB/Mongoose, JWT Auth
- Real-time: Socket.io
- Payment: Razorpay (recommended for India)
- Security: crypto (HMAC SHA256 for ticket signatures)

---

## Implementation Phases

### Phase 1: Core Infrastructure & Real-time

#### 1.1 Backend Socket.io Setup

- Install socket.io in backend
- Create socket controller for real-time events
- Setup CORS for socket connections
- Create events: `registration`, `payment-success`, `seat-update`

#### 1.2 Database Models Enhancement

- **Payment Model**: razorpayPaymentId, amount, currency, status, timestamp
- **Enhanced Registration**: digitalSignature, paymentId, attendeeInfo (dynamic fields)
- **User Enhancement**: phone, college, batch, profilePhoto

---

### Phase 2: Authentication & User Management

#### 2.1 Enhanced User Model

```javascript
phone: String,
college: String,
batch: String,
profilePhoto: String,
```

#### 2.2 Backend Routes

- PUT /api/auth/profile - Update profile
- GET /api/auth/profile - Get current user profile
- POST /api/auth/upload-photo - Upload profile photo

#### 2.3 Frontend: User Profile Page

- Display user info with edit capability
- Show registered events list
- Show tickets/payment history
- Profile photo upload

---

### Phase 3: Event Creation Enhancement

#### 3.1 Event Model Enhancement

```javascript
organizerDetails: {
  name: String,
  contact: String,
  description: String
},
requiredFields: [String], // Fields to collect from attendees
ticketTypes: [{
  name: String,
  price: Number,
  quantity: Number
}],
schedule: [{
  time: String,
  title: String,
  description: String
}],
```

#### 3.2 Frontend: Enhanced Create Event Form

- Multi-step form with progress
- Banner image upload
- Dynamic attendee fields selection
- Schedule builder

---

### Phase 4: Checkout & Payment System

#### 4.1 Backend Payment Controller

- POST /api/payments/create-order - Create Razorpay order
- POST /api/payments/verify - Verify payment signature
- POST /api/payments/webhook - Handle payment webhooks

#### 4.2 Frontend: Checkout Page (/event/:id/checkout)

- Display event summary
- Dynamic form based on organizer required fields
- Payment integration (Razorpay)
- Order confirmation

---

### Phase 5: Digital Event Cards

#### 5.1 Secure Ticket Generation

- Generate unique ticketId with UUID
- Create HMAC-SHA256 digital signature
- Store signature in database
- Generate QR code with ticket data

#### 5.2 Ticket Model Enhancement

```javascript
digitalSignature: String,
paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
attendeeInfo: {
  name: String,
  email: String,
  phone: String,
  college: String,
  batch: String
},
ticketSecret: String, // For verification
```

#### 5.3 Frontend: Ticket View

- Digital ID card design
- QR code display
- Animated elements to prevent screenshots
- Download/print option

---

### Phase 6: Organizer Dashboard

#### 6.1 Backend Analytics

- GET /api/events/:id/analytics - Revenue, registrations
- GET /api/events/:id/attendees - Full attendee list with filters
- GET /api/organizer/stats - Overall organizer stats

#### 6.2 Frontend: Organizer Dashboard

- Total tickets sold
- Total revenue
- Seats remaining
- Recent payments list
- Attendee table with export

---

### Phase 7: Real-time Updates

#### 7.1 Socket.io Events

- `new-registration` - Notify organizer of new registration
- `payment-received` - Real-time payment notification
- `seat-update` - Update seat counts across clients

#### 7.2 Frontend Integration

- Connect to socket on dashboard mount
- Real-time notification toast
- Live seat count updates

---

### Phase 8: Event Sharing

#### 8.1 Backend Routes

- GET /api/events/:id/share - Get shareable link data
- GET /api/events/:id/qr - Generate event QR code

#### 8.2 Frontend: Share Features

- Copy link button
- Generate QR code for event
- Social share buttons

---

### Phase 9: Admin Panel

#### 9.1 Backend Routes

- GET /api/admin/events - All events with filters
- PUT /api/admin/events/:id/approve
- PUT /api/admin/events/:id/reject
- GET /api/admin/users - User management
- GET /api/admin/stats - Platform statistics

#### 9.2 Frontend: Admin Dashboard

- Pending events list
- User management
- Platform analytics

---

### Phase 10: UI/UX Polish

- Consistent dark theme with purple-indigo gradient
- Framer Motion animations throughout
- Responsive design
- Loading states
- Error handling
- Toast notifications

---

## File Structure

```
backend/
├── controllers/
│   ├── authController.js (enhanced)
│   ├── eventController.js (enhanced)
│   ├── paymentController.js (new)
│   ├── ticketController.js (new)
│   └── socketController.js (new)
├── models/
│   ├── User.js (enhanced)
│   ├── Event.js (enhanced)
│   ├── Registration.js (enhanced)
│   ├── Payment.js (new)
│   └── Waitlist.js (existing)
├── routes/
│   ├── authRoutes.js (enhanced)
│   ├── eventRoutes.js (enhanced)
│   ├── paymentRoutes.js (new)
│   └── ticketRoutes.js (new)
├── services/
│   ├── socketService.js (new)
│   ├── paymentService.js (new)
│   └── ticketService.js (new)
├── middleware/
│   ├── authMiddleware.js (enhanced)
│   └── paymentMiddleware.js (new)
└── server.js (enhanced with socket.io)

frontend/
├── src/
│   ├── pages/
│   │   ├── Home.jsx (enhanced)
│   │   ├── Explore.jsx (enhanced)
│   │   ├── Login.jsx (enhanced)
│   │   ├── Register.jsx (enhanced)
│   │   ├── Dashboard.jsx (enhanced)
│   │   ├── OrganiserDashboard.jsx (enhanced)
│   │   ├── EventDetails.jsx (enhanced)
│   │   ├── Profile.jsx (new)
│   │   ├── Checkout.jsx (new)
│   │   ├── Ticket.jsx (new)
│   │   ├── CreateEvent.jsx (new)
│   │   └── AdminDashboard.jsx (new)
│   ├── components/
│   │   ├── Navbar.jsx (enhanced)
│   │   ├── EventCard.jsx (enhanced)
│   │   ├── EventDetails.jsx (enhanced)
│   │   ├── TicketCard.jsx (new)
│   │   ├── AttendeeTable.jsx (new)
│   │   ├── PaymentModal.jsx (new)
│   │   └── ShareModal.jsx (new)
│   ├── context/
│   │   ├── AuthContext.jsx (enhanced)
│   │   └── SocketContext.jsx (new)
│   ├── hooks/
│   │   ├── useSocket.js (new)
│   │   └── usePayment.js (new)
│   └── services/
│       ├── api.js (new)
│       └── socket.js (new)
```

---

## Priority Implementation Order

1. **Socket.io Setup** - Foundation for real-time
2. **User Profile** - Essential for user management
3. **Checkout System** - Core revenue flow
4. **Digital Tickets** - Key feature
5. **Organizer Dashboard** - Event management
6. **Admin Panel** - Platform control
7. **Event Sharing** - Growth features

---

## Dependencies to Install

### Backend

```bash
npm install socket.io razorpay uuid crypto
```

### Frontend

```bash
npm install socket.io-client @razorpay/checkout
```
