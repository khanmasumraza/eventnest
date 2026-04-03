const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const dotenv = require('dotenv')
const path = require('path')
const http = require('http')
const passport = require('passport')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const { v4: uuidv4 } = require('uuid')

console.log('═══════════════════════════════════════')
console.log('       SERVER BOOTING...               ')
console.log('═══════════════════════════════════════')

dotenv.config()

/* ================= ENV CHECK ================= */
const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET', 'FRONTEND_URL']
let envOk = true
requiredEnvVars.forEach((key) => {
  if (!process.env[key]) {
    console.error(`❌ MISSING ENV: ${key}`)
    envOk = false
  } else {
    console.log(`✅ ENV OK: ${key}`)
  }
})
console.log('ENV GOOGLE_CLIENT_ID :', process.env.GOOGLE_CLIENT_ID || '❌ MISSING')
console.log('ENV GOOGLE_CLIENT_SECRET :', process.env.GOOGLE_CLIENT_SECRET ? '✅ Loaded' : '❌ Missing')
console.log('ENV FRONTEND_URL :', process.env.FRONTEND_URL)
console.log('ENV PORT :', process.env.PORT || '5000 (default)')
if (!envOk) {
  console.error('⛔ Some ENV variables are missing. Server may not work correctly.')
}

/* ================= APP INIT ================= */
const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

/* ================= CORS CONFIG ================= */
const frontendUrls = (process.env.FRONTEND_URL || '')
  .split(',')
  .map((url) => url.trim())
  .filter(Boolean)

const allowedOrigins = ['http://localhost:3000', ...frontendUrls]
console.log('🌐 Allowed CORS Origins:', allowedOrigins)

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (mobile apps, curl, Postman, server-to-server)
    if (!origin) {
      console.log('🔓 CORS: No origin (Postman/server) — allowed')
      return callback(null, true)
    }

    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowed origin → ${origin}`)
      return callback(null, true)
    }

    console.error(`❌ CORS BLOCKED: origin "${origin}" not in allowed list`)
    console.error(`   └─ Allowed: ${allowedOrigins.join(', ')}`)
    return callback(new Error(`CORS: origin "${origin}" not allowed`))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  optionsSuccessStatus: 204,
  maxAge: 600,
}

/* ================= SECURITY ================= */
app.use(
  helmet({
    crossOriginResourcePolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  }),
)

/* ================= CORS MIDDLEWARE ================= */
// ✅ cors() handles OPTIONS preflight automatically — do NOT add manual OPTIONS handler
app.use(cors(corsOptions))

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* ================= REQUEST LOGGER ================= */
app.use((req, res, next) => {
  req.requestId = uuidv4()
  const start = Date.now()

  console.log('─────────────────────────────────────────')
  console.log(`📥 [${req.requestId}] ${req.method} ${req.originalUrl}`)
  console.log(`   ├─ Origin  : ${req.headers.origin || 'none'}`)
  console.log(`   ├─ IP      : ${req.ip}`)
  console.log(`   ├─ UA      : ${req.headers['user-agent']?.substring(0, 60) || 'none'}`)
  if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
    const safebody = { ...req.body }
    if (safebody.password) safebody.password = '***'
    if (safebody.newPassword) safebody.newPassword = '***'
    if (safebody.currentPassword) safebody.currentPassword = '***'
    console.log(`   └─ Body    :`, JSON.stringify(safebody))
  }

  res.on('finish', () => {
    const duration = Date.now() - start
    const emoji = res.statusCode >= 500 ? '💥' : res.statusCode >= 400 ? '⚠️' : '✅'
    console.log(`📤 [${req.requestId}] ${emoji} ${res.statusCode} — ${duration}ms`)
  })

  next()
})

/* ================= PASSPORT ================= */
require('./config/passport')(passport)
app.use(passport.initialize())
console.log('✅ Passport initialized')

/* ================= STATIC ================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* ================= SOCKET ================= */
const socketHandlers = require('./socket/index')
socketHandlers.initializeSocket(server)
console.log('✅ Socket handlers initialized')

/* ================= ROUTES ================= */
const authRoutes = require('./routes/authRoutes')
const eventRoutes = require('./routes/eventRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const registrationRoutes = require('./routes/registrationRoutes')
const paymentSetupRoutes = require('./routes/paymentSetupRoutes')
const organizerRoutes = require('./routes/organizerRoutes')
const ticketRoutes = require('./routes/ticketRoutes')
const chatRoutes = require('./routes/chatRoutes')
const payoutRoutes = require('./routes/payoutRoutes')

app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Welcome to EventNest API',
    time: new Date().toISOString(),
    env: process.env.NODE_ENV || 'development',
  })
})

/* ── Debug ping route ── */
app.get('/api/ping', (req, res) => {
  console.log('🏓 PING received')
  res.json({
    pong: true,
    origin: req.headers.origin || 'none',
    time: new Date().toISOString(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/payouts', payoutRoutes)
app.use('/api/registrations', registrationRoutes)
app.use('/api/organizer', organizerRoutes)
app.use('/api/organizer/payment-setup', paymentSetupRoutes)
app.use('/api/tickets', ticketRoutes)

console.log('✅ Routes registered')

/* ================= 404 ================= */
app.use((req, res) => {
  console.warn(`⚠️  404: ${req.method} ${req.originalUrl}`)
  res.status(404).json({
    success: false,
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
})

/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error('💥 GLOBAL ERROR:', err.message)
  console.error('   Stack:', err.stack)

  if (err.message?.includes('CORS')) {
    console.error('🚫 CORS rejection sent to client')
    return res.status(403).json({
      success: false,
      message: err.message,
    })
  }

  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error',
  })
})

/* ================= DATABASE + SERVER START ================= */
console.log('🔌 Connecting to MongoDB...')
mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('✅ MongoDB connected successfully')
    server.listen(PORT, () => {
      console.log('═══════════════════════════════════════')
      console.log(`🚀 Server running on port ${PORT}`)
      console.log(`🌍 http://localhost:${PORT}`)
      console.log(`🏓 Test CORS: http://localhost:${PORT}/api/ping`)
      console.log('═══════════════════════════════════════')
    })
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message)
    process.exit(1)
  })

/* ================= GRACEFUL SHUTDOWN ================= */
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down gracefully...')
  server.close(() => console.log('✅ HTTP server closed'))
  await mongoose.connection.close()
  console.log('✅ MongoDB connection closed')
  process.exit(0)
})

/* ================= UNHANDLED ERRORS ================= */
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 Unhandled Rejection at:', promise)
  console.error('   Reason:', reason)
})

process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err.message)
  console.error('   Stack:', err.stack)
  process.exit(1)
})