const mongoose = require('mongoose')

const scheduleSchema = new mongoose.Schema(
  {
    time: {
      type: String,
      trim: true,
    },
    title: {
      type: String,
      trim: true,
      maxlength: 120,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false },
)

const eventSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------- */
    /* BASIC INFO */
    /* ---------------------------------------------------------- */

    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 200,
    },

    description: {
      type: String,
      required: true,
      trim: true,
      minlength: 20,
      maxlength: 2000,
    },

    category: {
      type: String,
      required: true,
      enum: [
        'Hackathon',
        'Fest',
        'Workshop',
        'Conference',
        'Cultural',
        'Sports',
        'Meetup',
        'Other',
      ],
      trim: true,
    },

    /* ---------------------------------------------------------- */
    /* EVENT DETAILS */
    /* ---------------------------------------------------------- */

    date: {
      type: Date,
      required: true,
      validate: {
        validator: function (v) {
          return v > new Date()
        },
        message: 'Event date must be in the future',
      },
    },

    time: {
      type: String,
      default: '10:00 AM',
      trim: true,
    },

    venue: {
      type: String,
      required: true,
      trim: true,
      maxlength: 300,
    },

    city: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    /* ---------------------------------------------------------- */
    /* GEO LOCATION (NEW - REQUIRED FOR NEARBY EVENTS)
    /* ---------------------------------------------------------- */

    location: {
      type: {
        type: String,
        enum: ['Point'],
      },
      coordinates: {
        type: [Number], // [longitude, latitude]
      },
    },

    /* ---------------------------------------------------------- */
    /* MEDIA */
    /* ---------------------------------------------------------- */

    imageUrl: {
      type: String,
      trim: true,
    },

    bannerUrl: {
      type: String,
      trim: true,
    },

    /* ---------------------------------------------------------- */
    /* CAPACITY & PRICING */
    /* ---------------------------------------------------------- */

    capacity: {
      type: Number,
      required: true,
      min: 1,
      max: 100000,
    },

    registered: {
      type: Number,
      default: 0,
      min: 0,
    },

    // New explicit registered count field for analytics/payment flows
    registeredCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    price: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Unified payment configuration
    paymentType: {
      type: String,
      enum: ['free', 'upi'],
      default: 'free',
    },

    organizerUpiId: {
      type: String,
      trim: true,
    },

    organizerName: {
      type: String,
      trim: true,
    },

    ticketPrice: {
      type: Number,
      min: 0,
      default: 1,
    },

    organizerQrImage: {
      type: String,
      trim: true,
    },

    paymentInstructions: {
      type: String,
      trim: true,
    },

    /* ---------------------------------------------------------- */
    /* ORGANIZER */
    /* ---------------------------------------------------------- */

    organiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    organizerDetails: {
      name: {
        type: String,
        trim: true,
        maxlength: 150,
      },
      contact: {
        type: String,
        trim: true,
      },
      description: {
        type: String,
        trim: true,
        maxlength: 500,
      },
    },

    /* ---------------------------------------------------------- */
    /* PAYMENT DETAILS */
    /* ---------------------------------------------------------- */

    paymentDetails: {
      upiId: {
        type: String,
        trim: true,
      },
      upiQrImage: {
        type: String,
        trim: true,
      },
      accountName: {
        type: String,
        trim: true,
      },
    },

    /* ---------------------------------------------------------- */
    /* ATTENDEE REQUIRED FIELDS */
    /* ---------------------------------------------------------- */

    requiredFields: {
      type: [String],
      enum: ['name', 'email', 'phone', 'college', 'batch'],
      default: ['name', 'email'],
    },

    /* ---------------------------------------------------------- */
    /* EVENT SCHEDULE */
    /* ---------------------------------------------------------- */

    schedule: [scheduleSchema],

    /* ---------------------------------------------------------- */
    /* STATUS */
    /* ---------------------------------------------------------- */

    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'published'],
      default: 'pending',
      index: true,
    },

    /* ---------------------------------------------------------- */
    /* EVENT SETTINGS */
    /* ---------------------------------------------------------- */

    isPublic: {
      type: Boolean,
      default: true,
    },

    allowWaitlist: {
      type: Boolean,
      default: true,
    },

    /* ---------------------------------------------------------- */
    /* ANALYTICS */
    /* ---------------------------------------------------------- */

    views: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  },
)

/* ---------------------------------------------------------- */
/* VIRTUAL FIELD */
/* ---------------------------------------------------------- */

eventSchema.virtual('seatsLeft').get(function () {
  return this.capacity - this.registered
})

/* ---------------------------------------------------------- */
/* SAFETY VALIDATION */
/* ---------------------------------------------------------- */

eventSchema.pre('save', async function () {
  // Keep registered and registeredCount in sync for backward compatibility
  if (this.isModified('registered') && !this.isModified('registeredCount')) {
    this.registeredCount = this.registered
  }
  if (this.isModified('registeredCount') && !this.isModified('registered')) {
    this.registered = this.registeredCount
  }

  // Capacity guard
  if (this.registered > this.capacity || this.registeredCount > this.capacity) {
    throw new Error('Registered attendees cannot exceed capacity')
  }

  // Payment-specific validation
  if (this.paymentType === 'upi') {
    if (!this.organizerUpiId || !this.organizerName) {
      throw new Error('Organizer UPI ID and name are required for UPI payments')
    }
    if (typeof this.ticketPrice !== 'number' || this.ticketPrice <= 0) {
      throw new Error('Ticket price must be greater than 0 for UPI payments')
    }
  }

  if (this.paymentType === 'free') {
    // Always normalize ticketPrice to 0 for free events
    this.ticketPrice = 0
  }
})

/* ---------------------------------------------------------- */
/* INCLUDE VIRTUALS */
/* ---------------------------------------------------------- */

eventSchema.set('toJSON', { virtuals: true })
eventSchema.set('toObject', { virtuals: true })

/* ---------------------------------------------------------- */
/* INDEXES */
/* ---------------------------------------------------------- */

/* Compound index for filtering and sorting in getAllEvents */
eventSchema.index({ status: 1, city: 1, category: 1, date: 1 })
eventSchema.index({ city: 1 })
eventSchema.index({ organiser: 1 })

/* GEO INDEX (REQUIRED FOR $near queries) */
eventSchema.index({ location: '2dsphere' })

/* TEXT SEARCH INDEX */
eventSchema.index({
  title: 'text',
  description: 'text',
})

module.exports = mongoose.model('Event', eventSchema)
