const mongoose = require('mongoose');

const paymentAuditSchema = new mongoose.Schema({
  // Core identifiers
  paymentId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Payment', 
    required: true, 
    index: true 
  },

  eventId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Event', 
    required: true 
  },

  userId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  
  // Webhook details
  webhookEventId: { 
    type: String, 
    required: true, 
    unique: true   // ✅ keep ONLY this (remove index:true)
  },

  webhookEventType: { 
    type: String, 
    required: true 
  },

  webhookSignatureVerified: { 
    type: Boolean, 
    default: false 
  },
  
  // Action taken
  action: { 
    type: String, 
    required: true 
  }, // 'ticket_created', 'status_updated', 'duplicate_ignored'

  status: { 
    type: String 
  }, // pending, verified, failed
  
  // Metadata
  ipAddress: String,
  userAgent: String,

  razorpayPayload: { 
    type: Object 
  },

  // Error info
  error: { 
    type: String 
  }

}, {
  timestamps: true
});

// ✅ Other indexes (safe)
paymentAuditSchema.index({ paymentId: 1, timestamp: -1 });
paymentAuditSchema.index({ eventId: 1, status: 1 });

// ❌ REMOVED duplicate webhookEventId index

module.exports = mongoose.model('PaymentAudit', paymentAuditSchema);