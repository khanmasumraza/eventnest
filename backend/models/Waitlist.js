const mongoose = require('mongoose')

const waitlistSchema = new mongoose.Schema({
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  position: { type: Number, required: true },
  status: {
    type: String,
    default: 'waiting',
    enum: ['waiting', 'notified', 'expired'],
  },
  createdAt: { type: Date, default: Date.now },
})

// Prevent duplicate entries
waitlistSchema.index({ event: 1, user: 1 }, { unique: true })

module.exports = mongoose.model('Waitlist', waitlistSchema)
