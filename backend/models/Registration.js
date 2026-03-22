const mongoose = require('mongoose')
const crypto = require('crypto')

const attendeeInfoSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      maxlength: 150,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    college: {
      type: String,
      trim: true,
      maxlength: 200,
    },
    batch: {
      type: String,
      trim: true,
      maxlength: 50,
    },
  },
  { _id: false },
)

const registrationSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------- */
    /* RELATIONS */
    /* ---------------------------------------------------------- */

    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Event',
      required: true,
      index: true,
    },

    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },

    paymentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Payment',
    },

    /* ---------------------------------------------------------- */
    /* TICKET DATA */
    /* ---------------------------------------------------------- */

    ticketId: {
      type: String,
      unique: true,
      index: true,
    },

    qrCode: {
      type: String,
    },

    attendeeInfo: attendeeInfoSchema,

    /* ---------------------------------------------------------- */
    /* PAYMENT */
    /* ---------------------------------------------------------- */

    amount: {
      type: Number,
      default: 0,
      min: 0,
    },

    paymentStatus: {
      type: String,
      enum: ['pending', 'verified', 'failed', 'refunded'],
      default: 'pending',
      index: true,
    },
    webhookProcessedAt: {
      type: Date,
    },

    paymentMethod: {
      type: String,
      trim: true,
    },

    /* UPI */

    upiId: {
      type: String,
      trim: true,
    },

    utrNumber: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },

    upiPaymentScreenshot: {
      type: String,
      trim: true,
    },

    /* Razorpay */

    razorpayOrderId: {
      type: String,
      trim: true,
    },

    razorpayPaymentId: {
      type: String,
      trim: true,
    },

    /* ---------------------------------------------------------- */
    /* TICKET STATUS */
    /* ---------------------------------------------------------- */

    status: {
      type: String,
      enum: ['pending', 'paid', 'checked_in', 'cancelled'],
      default: 'pending',
      index: true,
    },

    checkedInAt: Date,

    /* ---------------------------------------------------------- */
    /* RAZORPAY VERIFICATION */
    /* ---------------------------------------------------------- */
    paymentVerified: {
      type: Boolean,
      default: false,
    },

    /* ---------------------------------------------------------- */
    /* SECURITY */
    /* ---------------------------------------------------------- */

    digitalSignature: {
      type: String,
    },

    ticketSecret: {
      type: String,
    },
  },
  {
    timestamps: true,
  },
)

/* ---------------------------------------------------------- */
/* PREVENT DUPLICATE REGISTRATION */
/* ---------------------------------------------------------- */

registrationSchema.index({ event: 1, user: 1 }, { unique: true })

/* Faster attendee queries */
registrationSchema.index({ event: 1, status: 1 })

/* ---------------------------------------------------------- */
/* PRE SAVE HOOK */
/* ---------------------------------------------------------- */

registrationSchema.pre('save', async function () {
  /* Generate ticketId */
  if (!this.ticketId) {
    const random = crypto.randomBytes(4).toString('hex').toUpperCase()
    const timestamp = Date.now().toString(36).toUpperCase()

    this.ticketId = `EVT-${timestamp}-${random}`
  }

  /* Generate ticket security */
  if (!this.ticketSecret) {
    this.ticketSecret = crypto.randomBytes(16).toString('hex')

    const secret = process.env.TICKET_SECRET || 'eventnest-secret-key'
    const signatureData = `${this.ticketId}-${this.event}-${this.user}`

    this.digitalSignature = crypto
      .createHmac('sha256', secret)
      .update(signatureData)
      .digest('hex')
  }

  /* AUTO-SYNC paymentStatus from linked Payment (webhook trigger safety) */
  if (this.paymentId) {
    try {
      const Payment = mongoose.model('Payment')
      const payment = await Payment.findById(this.paymentId)
      if (payment) {
        if (payment.status === 'verified') {
          this.paymentStatus = 'verified'
          this.paymentVerified = true
          this.status = 'paid'
        } else if (payment.status === 'rejected') {
          this.paymentStatus = 'failed'
          this.status = 'cancelled'
        }
      }
    } catch (err) {
      console.error('Payment sync error:', err)
    }
  }
})

module.exports = mongoose.model('Registration', registrationSchema)
