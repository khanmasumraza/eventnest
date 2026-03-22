const mongoose = require('mongoose')

const paymentSchema = new mongoose.Schema({
  // References
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  ticket: { type: mongoose.Schema.Types.ObjectId, ref: 'Registration' },

  // Payment Details
  amount: { type: Number, required: true },
  currency: { type: String, default: 'INR' },

  // Payment Method
  method: { type: String, default: 'upi' },

  // Payment Status - updated for security
  status: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending',
    required: true,
  },

  // Security fields
  referenceId: {
    type: String,
    required: true,
  },
  screenshot: {
    type: String,
    default: '',
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  verifiedAt: {
    type: Date,
  },

  // Payment Gateway Details
  razorpayOrderId: { type: String },
  razorpayPaymentId: { type: String },
  razorpaySignature: { type: String },

  // Metadata
  notes: { type: String },

  // Webhook & Processing
  webhookEventId: { type: String, index: true },
  webhookProcessedAt: { type: Date },
  processedAt: { type: Date },

  // Timestamps
  createdAt: { type: Date, default: Date.now },
  completedAt: { type: Date },
  refundedAt: { type: Date },
})

// Index for faster queries
paymentSchema.index({ user: 1, event: 1 })
paymentSchema.index({ razorpayOrderId: 1 })
paymentSchema.index({ razorpayPaymentId: 1 })
paymentSchema.index({ ticket: 1 })
paymentSchema.index({ status: 1 })

// Mark as verified
paymentSchema.methods.markVerified = function (verifiedByUserId) {
  this.status = 'verified'
  this.verifiedBy = verifiedByUserId
  this.verifiedAt = new Date()
  this.completedAt = new Date()
  this.processedAt = new Date()
}

// Mark as rejected
paymentSchema.methods.markRejected = function () {
  this.status = 'rejected'
}

// Mark as refunded
paymentSchema.methods.markRefunded = function () {
  this.status = 'refunded'
  this.refundedAt = new Date()
}

// Webhook idempotency
paymentSchema.methods.markWebhookProcessed = function (eventId) {
  this.webhookEventId = eventId
  this.webhookProcessedAt = new Date()
  this.processedAt = new Date()
}

paymentSchema.index({ webhookEventId: 1 }, { unique: true, sparse: true })
paymentSchema.index({ processedAt: 1 })

module.exports = mongoose.model('Payment', paymentSchema)
