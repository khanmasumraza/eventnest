const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const { processWithdraw } = require('../controllers/payoutController')
const { payoutRateLimiter } = require('../middleware/securityMiddleware')

/* ================ PAYOUT / WITHDRAWAL ROUTES ================ */

router.post('/withdraw', protect, payoutRateLimiter, processWithdraw)

module.exports = router
