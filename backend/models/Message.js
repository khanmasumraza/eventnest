const mongoose = require('mongoose')

const messageSchema = new mongoose.Schema({
  eventId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Event',
    required: true,
    index: true,
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  senderName: {
    type: String,
    required: true,
  },
  receiverName: { type: String, default: 'User' },

  // ✅ message is now optional — can be empty when file is sent
  message: {
    type: String,
    default: '',
    maxlength: 1000,
  },

  // ✅ FILE FIELDS — NEW
  fileUrl: { type: String, default: null },
  fileName: { type: String, default: null },
  fileType: { type: String, default: null },
  type: {
    type: String,
    enum: ['text', 'image', 'file'],
    default: 'text',
  },

  status: {
    type: String,
    enum: ['sent', 'delivered', 'seen'],
    default: 'sent',
  },
  seenBy: [
    {
      userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
      seenAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
})

// Indexes — untouched
messageSchema.index({ eventId: 1, createdAt: -1 })
messageSchema.index({ eventId: 1, senderId: 1, receiverId: 1 })
messageSchema.index({ eventId: 1, status: 1 })

module.exports = mongoose.model('Message', messageSchema)