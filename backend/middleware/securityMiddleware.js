const rateLimit = require('express-rate-limit')

const paymentRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 min
  message: 'Too many payment requests, try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        'Too many payment requests from this IP, please try again in 15 minutes.',
      retryAfter: 900,
    })
  },
})

const payoutRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 requests per 15 min
  message: 'Too many withdrawal requests, try again later',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message:
        'Too many withdrawal requests from this IP, please try again in 15 minutes.',
      retryAfter: 900,
    })
  },
})

const generalRateLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests',
})

module.exports = {
  paymentRateLimiter,
  payoutRateLimiter,
  generalRateLimiter,
  paymentValidations: {
    refund: (req, res, next) => next(),
  },
}
