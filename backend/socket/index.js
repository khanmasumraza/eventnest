const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io

/* ============================================================ */
/* INITIALIZE SOCKET */
/* ============================================================ */

const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    maxHttpBufferSize: 1e6,
  })

  /* ============================================================ */
  /* SOCKET AUTHENTICATION */
  /* ============================================================ */

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake?.auth?.token

      if (!token) {
        return next()
      }

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'fallback_secret_change_in_production',
      )

      socket.user = decoded

      next()
    } catch (error) {
      console.log('Socket auth failed')
      next()
    }
  })

  /* ============================================================ */
  /* CONNECTION HANDLER */
  /* ============================================================ */

  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id)

    /* ---------------------------------------------------------- */
    /* JOIN EVENT ROOM */
    /* ---------------------------------------------------------- */

    socket.on('joinEventRoom', (eventId) => {
      if (!eventId) return

      socket.join(eventId)

      console.log(`Socket ${socket.id} joined event room: ${eventId}`)
    })

    /* ---------------------------------------------------------- */
    /* LEAVE EVENT ROOM */
    /* ---------------------------------------------------------- */

    socket.on('leaveEventRoom', (eventId) => {
      if (!eventId) return

      socket.leave(eventId)

      console.log(`Socket ${socket.id} left event room: ${eventId}`)
    })

    /* ---------------------------------------------------------- */
    /* ORGANIZER DASHBOARD ROOM */
    /* ---------------------------------------------------------- */

    socket.on('joinOrganizer', (organizerId) => {
      if (!organizerId) return

      const room = `organizer:${organizerId}`

      socket.join(room)

      console.log(`Socket ${socket.id} joined ${room}`)
    })

    /* ---------------------------------------------------------- */
    /* EVENT CHAT MESSAGE */
    /* ---------------------------------------------------------- */

    socket.on('sendMessage', async (data) => {
      try {
        const { eventId, message, senderName } = data || {}

        if (!eventId || !message) return

        const cleanMessage = String(message).slice(0, 500)

        io.to(eventId).emit('newMessage', {
          eventId,
          senderName: senderName || 'Guest',
          message: cleanMessage,
          createdAt: new Date(),
        })
      } catch (error) {
        console.error('Socket message error:', error)
      }
    })

    /* ---------------------------------------------------------- */
    /* DISCONNECT */
    /* ---------------------------------------------------------- */

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} | ${reason}`)
    })
  })

  return io
}

/* ============================================================ */
/* GENERIC EMITTERS */
/* ============================================================ */

const emitToEvent = (eventId, event, data) => {
  if (!io || !eventId) return
  io.to(eventId).emit(event, data)
}

const emitToOrganizer = (organizerId, event, data) => {
  if (!io || !organizerId) return
  io.to(`organizer:${organizerId}`).emit(event, data)
}

const emitToAll = (event, data) => {
  if (!io) return
  io.emit(event, data)
}

/* ============================================================ */
/* CONTROLLER EVENTS */
/* ============================================================ */

const emitTicketPurchased = (eventId, data) => {
  if (!io) return
  io.to(eventId).emit('ticketPurchased', data)
}

const emitPaymentSubmitted = (eventId, data) => {
  if (!io) return
  io.to(eventId).emit('paymentSubmitted', data)
}

const emitPaymentApproved = (eventId, data) => {
  if (!io) return
  io.to(eventId).emit('paymentApproved', data)
}

const emitTicketSold = (organizerId, data) => {
  if (!io || !organizerId) return
  io.to(`organizer:${organizerId}`).emit('ticketSold', data)
}

const emitCheckinSuccess = (eventId, data) => {
  if (!io) return
  io.to(eventId).emit('checkinSuccess', data)
}

const emitNewMessage = (eventId, data) => {
  if (!io) return
  io.to(eventId).emit('newMessage', data)
}

/* ============================================================ */
/* GET IO INSTANCE */
/* ============================================================ */

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!')
  }
  return io
}

module.exports = {
  initializeSocket,
  emitToEvent,
  emitToOrganizer,
  emitToAll,
  emitTicketPurchased,
  emitPaymentSubmitted,
  emitPaymentApproved,
  emitCheckinSuccess,
  emitNewMessage,
  getIO,
}
