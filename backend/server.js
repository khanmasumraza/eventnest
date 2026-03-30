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
    if (!origin) return callback(null, true)

    const frontendUrls = (process.env.FRONTEND_URL || '')
      .split(',')
      .map((url) => url.trim())
      .filter(Boolean)
    const allowedOrigins = ['http://localhost:3000', ...frontendUrls]

    if (allowedOrigins.includes(origin)) {
      return callback(null, true)
    }

    console.error('CORS blocked:', origin)
    return callback(new Error('Not allowed by CORS'))
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
app.use(cors(corsOptions))

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
  console.log('[REQUEST] ', req.method, req.originalUrl)
  console.log('ORIGIN:', req.headers.origin || 'none')
  console.log('IP:', req.ip)
  res.on('finish', () => {
    console.log('[RESPONSE] ', res.statusCode)
  })
  next()
})

/* ================= PASSPORT ================= */
require('./config/passport')(passport)
app.use(passport.initialize())
console.log('Passport initialized')

/* ================= STATIC ================= */
app.use('/uploads', express.static(path.join(__dirname, 'uploads')))

/* ================= SOCKET ================= */
const socketHandlers = require('./socket/index')
socketHandlers.initializeSocket(server)
console.log('Socket handlers initialized')

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
  res.send('Welcome to EventNest API')
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
  console.error('GLOBAL ERROR:', err)

  if (err.message?.includes('CORS')) {
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
      console.log('Server running on port', PORT)
    })
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
    process.exit(1)
  })

/* ================= GRACEFUL SHUTDOWN ================= */
process.on('SIGINT', async () => {
  console.log('Shutting down server gracefully...')
  server.close(() => {
    console.log('HTTP server closed')
  })
  await mongoose.connection.close()
  console.log('MongoDB connection closed')
  process.exit(0)
})
