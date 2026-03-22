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

console.log('Server booting...')
dotenv.config()

console.log('ENV GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID)
console.log(
  'ENV GOOGLE_CLIENT_SECRET:',
  process.env.GOOGLE_CLIENT_SECRET ? 'Loaded' : 'Missing',
)
console.log('ENV MONGO_URI:', process.env.MONGO_URI ? 'Loaded' : 'Missing')

/* ================= APP INIT ================= */
const app = express()
const server = http.createServer(app)
const PORT = process.env.PORT || 5000

/* ================= CORS CONFIG ================= */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      // Add production URL here when deploying:
      // 'https://yourdomain.com'
    ]

    // Allow requests with no origin (Postman, mobile apps, server-to-server)
    if (!origin) return callback(null, true)

    if (allowedOrigins.includes(origin)) {
      callback(null, true)
    } else {
      console.error(`CORS blocked request from origin: ${origin}`)
      callback(new Error(`CORS policy: origin ${origin} not allowed`))
    }
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
// Apply CORS to ALL routes including OPTIONS preflight
// Using a middleware function instead of app.options()
// avoids path-to-regexp wildcard syntax issues entirely
app.use(cors(corsOptions))

// Explicitly handle preflight for all routes via middleware
// This is equivalent to app.options('*') but works with ALL
// versions of path-to-regexp including v8+
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    res.sendStatus(204)
    return
  }
  next()
})

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))
app.use(cookieParser())

/* ================= REQUEST LOGGER ================= */
app.use((req, res, next) => {
  req.requestId = uuidv4()
  console.log(`\n🚀 [${req.requestId}] REQUEST`)
  console.log(`METHOD: ${req.method}`)
  console.log(`URL: ${req.originalUrl}`)
  console.log(`ORIGIN: ${req.headers.origin || 'none'}`)
  console.log(`IP: ${req.ip}`)
  res.on('finish', () => {
    console.log(`✅ [${req.requestId}] RESPONSE ${res.statusCode}`)
  })
  next()
})

/* ================= PASSPORT ================= */
require('./config/passport')(passport)
app.use(passport.initialize())
console.log('Passport initialized')

/* ================= SOCKET ================= */
const { initializeSocket } = require('./socket')
initializeSocket(server)

/* ================= STATIC ================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* ================= ROUTES ================= */
const authRoutes = require('./routes/authRoutes')
const eventRoutes = require('./routes/eventRoutes')
const paymentRoutes = require('./routes/paymentRoutes')
const registrationRoutes = require('./routes/registrationRoutes')
const paymentSetupRoutes = require('./routes/paymentSetupRoutes')
const organizerRoutes = require('./routes/organizerRoutes')
const ticketRoutes = require('./routes/ticketRoutes')

app.get('/', (req, res) => {
  res.send('Welcome to EventNest API')
})

app.use('/api/auth', authRoutes)
app.use('/api/events', eventRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/payouts', require('./routes/payoutRoutes'))
app.use('/api/registrations', registrationRoutes)
app.use('/api/organizer', organizerRoutes)
app.use('/api/organizer/payment-setup', paymentSetupRoutes)
app.use('/api/tickets', ticketRoutes)

console.log('Routes registered')

/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: `API route not found: ${req.method} ${req.originalUrl}`,
  })
})

/* ================= ERROR HANDLER ================= */
app.use((err, req, res, next) => {
  console.error(`\n❌ GLOBAL ERROR [${req.requestId || 'unknown'}]:`, err)

  if (err.message?.includes('CORS policy')) {
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
mongoose
  .connect(process.env.MONGO_URI, { autoIndex: true })
  .then(() => {
    console.log('MongoDB connected successfully')
    server.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

/* ================= GRACEFUL SHUTDOWN ================= */
process.on('SIGINT', async () => {
  console.log('\nShutting down server gracefully...')
  server.close(() => {
    console.log('HTTP server closed')
  })
  await mongoose.connection.close()
  console.log('MongoDB connection closed')
  process.exit(0)
})
