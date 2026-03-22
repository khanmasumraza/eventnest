const express = require('express')
const router = express.Router()

const {
  processPayment,
  submitPaymentProof,
  createPaymentOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
  getMyPayments,
  requestRefund,
  getAuditLogs,
} = require('../controllers/paymentController')

console.log('Payment controller imports check:')
console.log('processPayment:', typeof processPayment)
console.log('submitPaymentProof:', typeof submitPaymentProof)
console.log('createPaymentOrder:', typeof createPaymentOrder)
console.log('verifyPayment:', typeof verifyPayment)
console.log('handleWebhook:', typeof handleWebhook)

const { protect } = require('../middleware/authMiddleware')

const {
  paymentRateLimiter,
  generalRateLimiter,
  paymentValidations,
} = require('../middleware/securityMiddleware')

/* ================= RATE LIMITER ================= */

router.use(generalRateLimiter)

/* ================= PAYMENT FLOW ================= */

/*
Main checkout verification
Used when frontend confirms payment
*/
router.post('/verify', protect, paymentRateLimiter, verifyPayment)

/*
Create Razorpay order
Called before opening Razorpay checkout
*/
router.post('/create-order', protect, paymentRateLimiter, createPaymentOrder)

/*
Submit manual UPI payment proof (UTR)
*/
router.post('/submit', protect, paymentRateLimiter, submitPaymentProof)

/* ================= WEBHOOK ================= */

const razorpayWebhook = require('../middleware/razorpayWebhook')
console.log(
  'razorpayWebhook.verify:',
  typeof razorpayWebhook.verifyRazorpayWebhook,
)
console.log('handleWebhook:', typeof handleWebhook)

router.post('/webhook', [
  (req, res, next) => {
    console.log('Webhook middleware test')
    next()
  },
  razorpayWebhook.verifyRazorpayWebhook,
  handleWebhook,
])

/* ================= USER ROUTES ================= */

router.get('/status/:orderId', protect, getPaymentStatus) // Dynamic: orderId or ticketId

router.get('/my-payments', protect, getMyPayments)

router.post(
  '/refund/:registrationId',
  protect,
  paymentValidations.refund,
  requestRefund,
)

/* ================= ADMIN ROUTES ================= */

router.get('/audit-logs', protect, getAuditLogs)

module.exports = router
