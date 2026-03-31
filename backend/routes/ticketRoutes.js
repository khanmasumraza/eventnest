const express = require('express')
const router = express.Router()
const { protect, isOrganizer } = require('../middleware/authMiddleware')
const ticketController = require('../controllers/ticketController')
const paymentController = require('../controllers/paymentController')
const {
  paymentRateLimiter,
  generalRateLimiter,
} = require('../middleware/securityMiddleware')

// Apply general rate limiter to all routes
router.use(generalRateLimiter)

// ✅ NEW — Get all tickets for organizer's events (must be BEFORE /:ticketId)
router.get('/organizer/all', protect, isOrganizer, ticketController.getOrganizerAllTickets)

// Get attendees for a specific event (organizer only)
router.get('/event/:eventId', protect, isOrganizer, ticketController.getEventAttendees)

// Create pending ticket
router.post('/', protect, paymentRateLimiter, ticketController.createTicket)

// Submit payment for ticket
router.post(
  '/:ticketId/pay',
  protect,
  paymentRateLimiter,
  ticketController.verifyPaymentAndActivateTicket,
)

// Activate ticket (after organizer verifies payment)
router.post(
  '/:ticketId/activate',
  protect,
  isOrganizer,
  ticketController.activateTicket,
)

// Get user's tickets
router.get('/my-tickets', protect, ticketController.getMyTickets)

// Verify ticket QR code (organizer only) — must be BEFORE /:ticketId
router.get('/verify/:ticketId', protect, ticketController.verifyTicket)

// Get single ticket
router.get('/:ticketId', protect, ticketController.getTicket)

// Payment routes
router.post(
  '/:ticketId/payment',
  protect,
  paymentRateLimiter,
  paymentController.submitPayment,
)
router.get('/:ticketId/payment', protect, paymentController.getPaymentStatus)

module.exports = router