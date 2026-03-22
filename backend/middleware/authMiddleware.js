const jwt = require('jsonwebtoken')
const User = require('../models/User')

/* ============================================================ */
/* AUTH PROTECTION                                              */
/* ============================================================ */
const protect = async (req, res, next) => {
  console.log(`🔐 [${req.requestId || 'NO-ID'}] AUTH MIDDLEWARE START`)

  try {
    let token

    console.log(
      `🔍 [${req.requestId || 'NO-ID'}] AUTH HEADER:`,
      req.headers.authorization
        ? req.headers.authorization.substring(0, 20) + '...'
        : 'MISSING',
    )

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1]

      console.log(
        `✅ [${req.requestId || 'NO-ID'}] TOKEN EXTRACTED:`,
        token.substring(0, 20) + '...',
      )
    }

    if (!token) {
      console.warn(`⚠️ [${req.requestId || 'NO-ID'}] NO TOKEN PROVIDED`)
      return res.status(401).json({
        success: false,
        code: 'TOKEN_MISSING',
        message: 'Not authorized, token missing',
      })
    }

    // FIX: Hard fail if JWT_SECRET missing — never use fallback
    // If this throws, the global error handler catches it
    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error('❌ FATAL: JWT_SECRET not defined in environment')
      return res.status(500).json({
        success: false,
        code: 'SERVER_CONFIG_ERROR',
        message: 'Server authentication configuration error',
      })
    }

    console.log(`🔓 [${req.requestId || 'NO-ID'}] JWT VERIFY START`)

    let decoded
    try {
      decoded = jwt.verify(token, secret)
    } catch (jwtError) {
      // FIX: Distinguish between expired and invalid tokens
      // Frontend can use the code to show appropriate message
      if (jwtError.name === 'TokenExpiredError') {
        console.warn(
          `⏰ [${req.requestId || 'NO-ID'}] TOKEN EXPIRED at:`,
          jwtError.expiredAt,
        )
        return res.status(401).json({
          success: false,
          code: 'TOKEN_EXPIRED',
          message: 'Session expired, please login again',
        })
      }

      if (jwtError.name === 'JsonWebTokenError') {
        console.error(
          `❌ [${req.requestId || 'NO-ID'}] TOKEN INVALID:`,
          jwtError.message,
        )
        return res.status(401).json({
          success: false,
          code: 'TOKEN_INVALID',
          message: 'Not authorized, token invalid',
        })
      }

      // Any other JWT error
      console.error(
        `❌ [${req.requestId || 'NO-ID'}] TOKEN ERROR:`,
        jwtError.message,
      )
      return res.status(401).json({
        success: false,
        code: 'TOKEN_ERROR',
        message: 'Not authorized',
      })
    }

    console.log(`✅ [${req.requestId || 'NO-ID'}] JWT DECODED:`, decoded)
    console.log(`👤 [${req.requestId || 'NO-ID'}] FETCHING USER:`, decoded.id)

    const user = await User.findById(decoded.id).select('-password')

    console.log(
      `✅ [${req.requestId || 'NO-ID'}] USER FOUND:`,
      user?._id || 'NOT FOUND',
    )

    if (!user) {
      console.warn(
        `⚠️ [${req.requestId || 'NO-ID'}] USER NOT FOUND IN DB:`,
        decoded.id,
      )
      return res.status(401).json({
        success: false,
        code: 'USER_NOT_FOUND',
        message: 'User account no longer exists',
      })
    }

    // Attach user to request for downstream route handlers
    req.user = user

    console.log(
      `🚀 [${req.requestId || 'NO-ID'}] AUTH SUCCESS - USER:`,
      user.name,
    )

    next()
  } catch (error) {
    // Catch unexpected errors (DB failures etc.)
    console.error(
      `❌ [${req.requestId || 'NO-ID'}] AUTH MIDDLEWARE UNEXPECTED ERROR:`,
      error.message,
    )
    return res.status(500).json({
      success: false,
      code: 'AUTH_ERROR',
      message: 'Authentication failed due to server error',
    })
  }
}

/* ============================================================ */
/* ORGANIZER ACCESS                                             */
/* ============================================================ */
const isOrganizer = (req, res, next) => {
  // protect() must run before this middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    })
  }

  if (req.user.role === 'organizer' || req.user.role === 'admin') {
    return next()
  }

  return res.status(403).json({
    success: false,
    code: 'NOT_ORGANIZER',
    message: 'Organizer access required',
  })
}

/* ============================================================ */
/* ADMIN ACCESS                                                 */
/* ============================================================ */
const isAdmin = (req, res, next) => {
  // protect() must run before this middleware
  if (!req.user) {
    return res.status(401).json({
      success: false,
      code: 'NOT_AUTHENTICATED',
      message: 'Authentication required',
    })
  }

  if (req.user.role === 'admin') {
    return next()
  }

  return res.status(403).json({
    success: false,
    code: 'NOT_ADMIN',
    message: 'Admin access required',
  })
}

/* ============================================================ */
/* VERIFY RESOURCE OWNERSHIP                                    */
/* ============================================================ */
const verifyOwnership = (getOwnerId) => {
  return (req, res, next) => {
    try {
      // FIX: Explicit check that protect() ran before this
      // Returns 401 not 400 if req.user is missing
      if (!req.user) {
        return res.status(401).json({
          success: false,
          code: 'NOT_AUTHENTICATED',
          message: 'Authentication required before ownership check',
        })
      }

      const ownerId = getOwnerId(req)

      if (!ownerId) {
        return res.status(400).json({
          success: false,
          code: 'OWNER_ID_MISSING',
          message: 'Owner ID not provided',
        })
      }

      // Admin can access any resource
      // Owner can access their own resource
      if (
        req.user.role === 'admin' ||
        req.user._id.toString() === ownerId.toString()
      ) {
        return next()
      }

      return res.status(403).json({
        success: false,
        code: 'NOT_OWNER',
        message: 'Not authorized to access this resource',
      })
    } catch (error) {
      console.error('❌ verifyOwnership error:', error.message)
      return res.status(500).json({
        success: false,
        code: 'OWNERSHIP_CHECK_FAILED',
        message: 'Authorization check failed',
      })
    }
  }
}

module.exports = {
  protect,
  isOrganizer,
  isAdmin,
  verifyOwnership,
}