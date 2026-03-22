const express = require('express')
const router = express.Router()
const multer = require('multer')
const path = require('path')
const { v4: uuidv4 } = require('uuid')
const passport = require('passport')
const jwt = require('jsonwebtoken')

const {
  register,
  login,
  getProfile,
  updateProfile,
  uploadProfilePhoto,
  changePassword,
  getUserById,
  becomeOrganizer,
} = require('../controllers/authController')

const { protect } = require('../middleware/authMiddleware')

/* ========================================================= */
/* TOKEN GENERATOR                                           */
/* ========================================================= */
const generateToken = (user) => {
  const secret = process.env.JWT_SECRET

  // Hard fail if secret is missing — never use a fallback in auth
  // A missing secret means .env is not loaded correctly
  if (!secret) {
    console.error('❌ FATAL: JWT_SECRET is not defined in environment')
    throw new Error('JWT_SECRET is not configured')
  }

  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    secret,
    { expiresIn: '7d' },
  )
}

/* ========================================================= */
/* MULTER CONFIG                                             */
/* ========================================================= */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // FIX: Use absolute path — relative paths break depending on
    // where node process is launched from
    cb(null, path.join(__dirname, '../uploads/'))
  },
  filename: function (req, file, cb) {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`
    cb(null, uniqueName)
  },
})

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|webp/
  const extname = allowedTypes.test(
    path.extname(file.originalname).toLowerCase(),
  )
  const mimetype = allowedTypes.test(file.mimetype)

  if (extname && mimetype) {
    cb(null, true)
  } else {
    cb(new Error('Only image files are allowed'), false)
  }
}

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter,
})

/* ========================================================= */
/* PUBLIC AUTH ROUTES                                        */
/* ========================================================= */
router.post('/register', register)
router.post('/login', login)
router.get('/users/:id', getUserById)

/* ========================================================= */
/* GOOGLE OAUTH                                              */
/* ========================================================= */
router.get(
  '/google',
  (req, res, next) => {
    console.log('🌐 GOOGLE AUTH START')
    next()
  },
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    session: false,
  }),
)

router.get(
  '/google/callback',
  passport.authenticate('google', {
    session: false,
    failureRedirect: 'http://localhost:3000/login?error=google_auth_failed',
  }),
  (req, res) => {
    try {
      console.log('✅ Google callback triggered')

      if (!req.user) {
        console.log('❌ No user returned from Google')
        return res.redirect('http://localhost:3000/login?error=no_user')
      }

      console.log('👤 Google user:', req.user.email)

      const token = generateToken(req.user)
      console.log('🔑 JWT generated for:', req.user.email)

      // Redirect to frontend AuthSuccess page with token
      // NOTE: Token in URL is acceptable for OAuth redirect flow on localhost
      // For production consider using httpOnly cookie instead:
      //   res.cookie('token', token, { httpOnly: true, secure: true })
      //   return res.redirect('http://localhost:3000/auth/success')
      return res.redirect(
        `http://localhost:3000/auth/success?token=${token}`,
      )
    } catch (error) {
      console.error('❌ Google callback error:', error.message)
      return res.redirect(
        `http://localhost:3000/login?error=token_generation_failed`,
      )
    }
  },
)

/* ========================================================= */
/* PROTECTED ROUTES                                          */
/* ========================================================= */
router.get('/profile', protect, getProfile)
router.put('/profile', protect, updateProfile)

router.post(
  '/upload-photo',
  protect,
  upload.single('profilePhoto'),
  uploadProfilePhoto,
)

router.put('/change-password', protect, changePassword)
router.put('/become-organizer', protect, becomeOrganizer)

module.exports = router