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

// Get single ticket - requires authentication
router.get('/:ticketId', protect, ticketController.getTicket)

// Verify ticket QR code (organizer only)
router.get('/verify/:ticketId', protect, ticketController.verifyTicket)

// Payment routes (also available via paymentRoutes)
router.post(
  '/:ticketId/payment',
  protect,
  paymentRateLimiter,
  paymentController.submitPayment,
)
router.get('/:ticketId/payment', protect, paymentController.getPaymentStatus)

module.exports = router
