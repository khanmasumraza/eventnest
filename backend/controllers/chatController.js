const Message = require('../models/Message')
const Registration = require('../models/Registration')
const Event = require('../models/Event')
const User = require('../models/User')
const { emitToEvent } = require('../socket')
const mongoose = require('mongoose')
const cloudinary = require('cloudinary').v2
const multer = require('multer')
const { CloudinaryStorage } = require('multer-storage-cloudinary')

// ✅ CLOUDINARY CONFIG
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// ✅ MULTER + CLOUDINARY STORAGE
const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => {
    const isImage = file.mimetype.startsWith('image/')
    const isVideo = file.mimetype.startsWith('video/')
    let resourceType = 'raw'
    if (isImage) resourceType = 'image'
    if (isVideo) resourceType = 'video'

    return {
      folder: 'eventnest/chat',
      resource_type: resourceType,
      public_id: `${Date.now()}-${file.originalname.replace(/\s+/g, '_').replace(/[^\w.-]/g, '')}`,
      type: 'upload',
    }
  },
})

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
}).single('file')

// ✅ UPLOAD FILE
const uploadFile = (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      console.error('❌ Upload error:', err)
      return res.status(500).json({ success: false, message: err.message })
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file provided' })
    }

    // For raw files (PDF, docs) — generate a proper download URL
    const isRaw = !req.file.mimetype.startsWith('image/') && !req.file.mimetype.startsWith('video/')
    let fileUrl = req.file.path

    // For raw files — generate signed URL valid for 1 hour
    if (isRaw) {
      const publicId = req.file.filename || req.file.public_id
      fileUrl = cloudinary.url(publicId, {
        resource_type: 'raw',
        type: 'upload',
        sign_url: true,
        expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
      })
    }

    return res.json({
      success: true,
      fileUrl,
      fileName: req.file.originalname,
      fileType: req.file.mimetype,
    })
  })
}

// ✅ GET MESSAGES — UNTOUCHED
const getChatMessages = async (req, res) => {
  try {
    const { eventId, userId } = req.params
    const currentUserId = req.user._id

    if (
      !mongoose.Types.ObjectId.isValid(eventId) ||
      !mongoose.Types.ObjectId.isValid(userId)
    ) {
      return res.status(400).json({ success: false, message: 'Invalid IDs' })
    }

    const match = {
      eventId: new mongoose.Types.ObjectId(eventId),
      $or: [
        {
          senderId: currentUserId,
          receiverId: new mongoose.Types.ObjectId(userId),
        },
        {
          senderId: new mongoose.Types.ObjectId(userId),
          receiverId: currentUserId,
        },
      ],
    }

    const hasTicket = await Registration.exists({
      event: eventId,
      user: currentUserId,
      status: 'paid',
    })

    const isOrganizer = await Event.exists({
      _id: eventId,
      organiser: currentUserId,
    })

    if (!hasTicket && !isOrganizer) {
      return res.status(403).json({ success: false, message: 'Access denied' })
    }

    const messages = await Message.find(match)
      .populate('senderId', 'name email')
      .sort({ createdAt: 1 })
      .lean()

    res.json({
      success: true,
      messages,
    })
  } catch (error) {
    console.error('🔥 CHAT ERROR:', error)
    res.status(500).json({ success: false, message: 'Server error' })
  }
}

// ✅ SEND MESSAGE — UNTOUCHED
const sendChatMessage = async (req, res) => {
  try {
    const { message } = req.body
    const { eventId, userId: receiverId } = req.params
    const senderId = req.user._id

    if (!message?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Message required' })
    }

    const newMessage = await Message.create({
      eventId,
      senderId,
      receiverId,
      message: message.trim(),
      status: 'delivered',
    })

    emitToEvent(eventId, 'newMessage', newMessage)

    res.json({ success: true, message: newMessage })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false })
  }
}

// ✅ CONVERSATIONS — UNTOUCHED
const getConversations = async (req, res) => {
  try {
    const myId = new mongoose.Types.ObjectId(req.user.id)

    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: myId }, { receiverId: myId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            userId: {
              $cond: [{ $eq: ['$senderId', myId] }, '$receiverId', '$senderId'],
            },
          },
          lastMessage: { $first: '$message' },
          fileName: { $first: '$fileName' },
          updatedAt: { $first: '$createdAt' },
          userName: {
            $first: {
              $cond: [
                { $eq: ['$senderId', myId] },
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$receiverName', null] },
                        { $ne: ['$receiverName', 'User'] },
                      ],
                    },
                    '$receiverName',
                    '$senderName',
                  ],
                },
                {
                  $cond: [
                    {
                      $and: [
                        { $ne: ['$senderName', null] },
                        { $ne: ['$senderName', 'User'] },
                      ],
                    },
                    '$senderName',
                    '$receiverName',
                  ],
                },
              ],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          eventId: '$_id.eventId',
          userId: '$_id.userId',
          userName: 1,
          lastMessage: {
            $cond: [
              { $gt: ['$lastMessage', ''] },
              '$lastMessage',
              { $concat: ['📎 ', { $ifNull: ['$fileName', 'File'] }] },
            ],
          },
          updatedAt: 1,
        },
      },
      { $sort: { updatedAt: -1 } },
    ])

    const fixedConversations = await Promise.all(
      conversations.map(async (conv) => {
        if (!conv.userName || conv.userName === 'User') {
          const user = await User.findById(conv.userId)
            .select('name email')
            .lean()

          const resolvedName =
            user?.name || user?.email?.split('@')[0] || 'User'

          return { ...conv, userName: resolvedName }
        }
        return conv
      }),
    )

    return res.json({ success: true, conversations: fixedConversations })
  } catch (err) {
    console.error(err)
    res.status(500).json({ success: false })
  }
}

module.exports = {
  getChatMessages,
  sendChatMessage,
  getConversations,
  uploadFile,
}