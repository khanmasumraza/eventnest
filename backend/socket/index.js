const { Server } = require('socket.io')
const jwt = require('jsonwebtoken')

let io

// Online users tracker — userId → Set of socketIds (handles multi-tab/device)
const onlineUsers = new Map()

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

    // Track user online — add socketId to their Set
    if (socket.user?.id) {
      if (!onlineUsers.has(socket.user.id)) {
        onlineUsers.set(socket.user.id, new Set())
      }
      onlineUsers.get(socket.user.id).add(socket.id)
      io.emit('userOnline', { userId: socket.user.id })
    }

    /* ---------------------------------------------------------- */
    /* JOIN CHAT ROOM - 1:1 PRIVATE (MANDATORY) */
    /* ---------------------------------------------------------- */

    socket.on('joinChat', async ({ eventId, userId }) => {
      const authUser = socket.user

      if (!eventId || !userId) {
        socket.emit('joinError', 'eventId and userId required')
        return
      }

      if (!authUser) {
        socket.emit('joinError', 'Authentication required')
        return
      }

      try {
        const Registration = require('../models/Registration')
        const Event = require('../models/Event')

        const hasTicket = await Registration.exists({
          event: eventId,
          user: authUser.id,
          status: 'paid',
        })

        const isOrganizer = await Event.exists({
          _id: eventId,
          organiser: authUser.id,
        })

        if (!hasTicket && !isOrganizer) {
          socket.emit('joinError', 'Access denied - ticket required')
          console.log(
            `Socket ${socket.id} denied access to chat ${eventId}_${userId}`,
          )
          return
        }

        // Room naming convention:
        // roomId      = eventId_otherUserId  (the person you're chatting with)
        // mirrorRoomId = eventId_myOwnId     (your own room — so others can reach YOU)
        const roomId = `${eventId}_${userId}`
        socket.join(roomId)

        const mirrorRoomId = `${eventId}_${authUser.id}`
        if (mirrorRoomId !== roomId) {
          socket.join(mirrorRoomId)
          console.log(
            `Socket ${socket.id} also joined mirror room: ${mirrorRoomId}`,
          )
        }

        console.log(
          `Socket ${socket.id} (${authUser.id}) joined 1:1 room: ${roomId}`,
        )
        socket.emit('joinedChat', { eventId, userId, roomId, success: true })

        // Tell the joining user whether their chat partner is currently online
        if (onlineUsers.has(userId)) {
          socket.emit('userOnline', { userId })
        } else {
          socket.emit('userOffline', { userId })
        }
      } catch (error) {
        console.error('Join chat auth error:', error)
        socket.emit('joinError', 'Server error')
      }
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
    /* 1:1 PRIVATE MESSAGE                                        */
    /* ---------------------------------------------------------- */

    socket.on('sendMessage', async (data, callback) => {
      const sender = socket.user
      const {
        eventId,
        receiverId,
        message,
        fileUrl,
        fileName,
        fileType,
        type,
      } = data || {}

      const hasText =
        message && message.trim().length > 0 && message.length <= 1000
      const hasFile = !!fileUrl

      const User = require('../models/User')
      const receiverUser = await User.findById(receiverId)
        .select('name email')
        .lean()
      const resolvedReceiverName =
        receiverUser?.name || receiverUser?.email?.split('@')[0] || 'User'

      const senderUser = await User.findById(sender.id)
        .select('name email')
        .lean()
      const resolvedSenderName =
        senderUser?.name || senderUser?.email?.split('@')[0] || 'User'

      if (!sender || !eventId || !receiverId || (!hasText && !hasFile)) {
        socket.emit(
          'messageError',
          'Invalid data: eventId, receiverId, and message or fileUrl required',
        )
        callback?.({ success: false, error: 'Invalid data' })
        return
      }

      try {
        const Registration = require('../models/Registration')
        const Event = require('../models/Event')

        const hasTicket = await Registration.exists({
          event: eventId,
          user: sender.id,
          status: 'paid',
        })
        const isOrganizer = await Event.exists({
          _id: eventId,
          organiser: sender.id,
        })

        if (!hasTicket && !isOrganizer) {
          socket.emit('messageError', 'Access denied')
          callback?.({ success: false, error: 'Access denied' })
          return
        }

        const Message = require('../models/Message')

        const newMessage = await Message.create({
          eventId,
          senderId: sender.id,
          receiverId,
          senderName: resolvedSenderName,
          receiverName: resolvedReceiverName,
          message: hasText ? message.trim() : '',
          ...(hasFile && { fileUrl, fileName, fileType, type }),
          status: 'sent',
        })

        // Immediate ACK
        callback({
          success: true,
          messageId: newMessage._id,
          message: newMessage,
        })

        // Mark as delivered
        const updatedMessage = await Message.findByIdAndUpdate(
          newMessage._id,
          { status: 'delivered', updatedAt: new Date() },
          { new: true },
        ).lean()

        const messageData = {
          _id: updatedMessage._id,
          eventId,
          senderId: updatedMessage.senderId,
          receiverId: updatedMessage.receiverId,
          senderName: updatedMessage.senderName,
          receiverName: updatedMessage.receiverName,
          message: updatedMessage.message,
          fileUrl: updatedMessage.fileUrl,
          fileName: updatedMessage.fileName,
          fileType: updatedMessage.fileType,
          type: updatedMessage.type,
          status: updatedMessage.status,
          seenBy: updatedMessage.seenBy || [],
          createdAt: updatedMessage.createdAt,
          updatedAt: updatedMessage.updatedAt,
        }

        // Emit to BOTH rooms
        const receiverRoom = `${eventId}_${receiverId}`
        const senderRoom = `${eventId}_${sender.id}`

        io.to(receiverRoom).emit('newMessage', messageData)
        if (senderRoom !== receiverRoom) {
          io.to(senderRoom).emit('newMessage', messageData)
        }

        console.log(
          `✅ Message ${newMessage._id} sent→delivered sender:${sender.id}→receiver:${receiverId}`,
        )
      } catch (error) {
        console.error('Send 1:1 message error:', error)
        socket.emit('messageError', 'Failed to send message')
        callback?.({ success: false, error: 'Server error' })
      }
    })

    /* ---------------------------------------------------------- */
    /* TYPING INDICATOR */
    /* ---------------------------------------------------------- */

    socket.on('typing', ({ eventId, receiverId }) => {
      if (!eventId || !socket.user || !receiverId) return
      const receiverRoom = `${eventId}_${receiverId}`
      socket
        .to(receiverRoom)
        .emit('typing', { senderId: socket.user.id, eventId })
    })

    socket.on('stopTyping', ({ eventId, receiverId }) => {
      if (!eventId || !socket.user || !receiverId) return
      const receiverRoom = `${eventId}_${receiverId}`
      socket
        .to(receiverRoom)
        .emit('stopTyping', { senderId: socket.user.id, eventId })
    })

    /* ---------------------------------------------------------- */
    /* MESSAGE SEEN STATUS (single)                               */
    /* ---------------------------------------------------------- */

    socket.on('messageSeen', async ({ messageId, eventId }) => {
      if (!messageId || !eventId || !socket.user) return

      try {
        const Message = require('../models/Message')

        await Message.findByIdAndUpdate(messageId, {
          $addToSet: { seenBy: { userId: socket.user.id } },
          status: 'seen',
          $set: { updatedAt: new Date() },
        })

        const updatedMessage = await Message.findById(messageId).lean()
        const messageData = {
          _id: updatedMessage._id,
          status: updatedMessage.status,
          seenBy: updatedMessage.seenBy,
          updatedAt: updatedMessage.updatedAt,
        }

        // ✅ FIX: emit to sender's OWN mirror room — NOT the current user's room
        // sender joined ${eventId}_${sender.id} as mirror room when they opened chat
        const senderRoom = `${eventId}_${updatedMessage.senderId}`
        io.to(senderRoom).emit('messageUpdated', messageData)
      } catch (error) {
        console.error('Message seen update error:', error)
      }
    })

    /* ---------------------------------------------------------- */
    /* BULK MARK SEEN                                             */
    /* ✅ FIX: was querying wrong receiverId, now uses            */
    /*    socket.user.id (the person opening the chat)           */
    /*    and emits to senderRoom = eventId_msg.senderId         */
    /* ---------------------------------------------------------- */

    socket.on('markSeen', async ({ eventId, userId }) => {
      console.log('🟡 markSeen TRIGGERED:', {
        eventId,
        userId,
        socketUser: socket.user?.id,
      })

      if (!eventId || !socket.user) return

      // ✅ FIX: The receiver is always the currently connected user (socket.user.id)
      // userId param was causing confusion — ignore it, use socket.user.id
      const receiverId = socket.user.id

      try {
        const Message = require('../models/Message')

        // Mark all unread messages sent TO me in this event as seen
        const updatedMessages = await Message.updateMany(
          {
            eventId,
            receiverId,
            status: { $ne: 'seen' },
          },
          {
            $set: { status: 'seen', updatedAt: new Date() },
            $addToSet: { seenBy: { userId: receiverId, seenAt: new Date() } },
          },
        )

        console.log('🟡 updateMany DONE')

        if (updatedMessages.modifiedCount > 0) {
          console.log(
            `✅ Bulk markSeen: ${updatedMessages.modifiedCount} messages seen by ${receiverId} in ${eventId}`,
          )

          // Fetch the messages we just marked seen so we know who to notify
          // const recentUpdated = await Message.find({
          //   eventId,
          //   receiverId,
          //   status: 'seen',
          //   updatedAt: { $gte: new Date(Date.now() - 10 * 1000) }, // last 10 seconds
          // })

          const recentUpdated = await Message.find({
            eventId,
            receiverId,
            status: 'seen',
          })
            .sort({ updatedAt: -1 })
            .limit(50)
            .lean()

            .sort({ updatedAt: -1 })
            .limit(50)
            .lean()

          console.log('🟡 messages fetched for emit:', recentUpdated.length)

          recentUpdated.forEach((msg) => {
            const messageData = {
              _id: msg._id,
              status: msg.status,
              seenBy: msg.seenBy,
              updatedAt: msg.updatedAt,
            }

            // ✅ FIX: emit to the SENDER's mirror room — eventId_senderId
            // The sender joined this room when they opened chat
            const senderRoom = `${eventId}_${msg.senderId}`
            console.log(
              '🔴 EMITTING messageUpdated TO:',
              `${eventId}_${msg.senderId}`,
              msg._id,
            )
            io.to(senderRoom).emit('messageUpdated', messageData)
            console.log(
              `📤 messageUpdated → room: ${senderRoom} for msg: ${msg._id}`,
            )
          })
        }
      } catch (error) {
        console.error('Bulk markSeen error:', error)
      }
    })

    /* ---------------------------------------------------------- */
    /* SYSTEM WELCOME MESSAGE */
    /* ---------------------------------------------------------- */

    socket.on('chatWelcome', async (data) => {
      const { eventId, userId } = data || {}
      if (!eventId || !userId) return

      try {
        const Message = require('../models/Message')
        const systemMessage = await Message.create({
          eventId,
          senderId: null,
          senderName: 'EventNest',
          message:
            'You are registered for this event. You can now chat with the organizer.',
        })

        const messageData = {
          _id: systemMessage._id,
          eventId,
          senderId: null,
          senderName: 'EventNest',
          message: systemMessage.message,
          createdAt: systemMessage.createdAt,
          isSystem: true,
        }

        io.to(eventId).emit('newMessage', messageData)
        console.log(`System welcome sent to room: ${eventId}`)
      } catch (error) {
        console.error('Chat welcome error:', error)
      }
    })

    /* ---------------------------------------------------------- */
    /* DISCONNECT */
    /* ---------------------------------------------------------- */

    socket.on('disconnect', (reason) => {
      console.log(`Socket disconnected: ${socket.id} | ${reason}`)

      if (socket.user?.id) {
        const sockets = onlineUsers.get(socket.user.id)
        if (sockets) {
          sockets.delete(socket.id)
          if (sockets.size === 0) {
            onlineUsers.delete(socket.user.id)
            io.emit('userOffline', { userId: socket.user.id })
          }
        }
      }
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
