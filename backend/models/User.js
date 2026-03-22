const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const reminderSchema = new mongoose.Schema(
  {
    event: { type: mongoose.Schema.Types.ObjectId, ref: 'Event' },

    reminderTime: {
      type: String,
      enum: ['1day', '3hours', '30min'],
    },

    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

const userSchema = new mongoose.Schema(
  {
    /* ---------------------------------------------------------- */
    /* BASIC INFO */
    /* ---------------------------------------------------------- */

    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address'],
      index: true,
    },

    password: {
      type: String,
      minlength: 6,
    },

    /* ---------------------------------------------------------- */
    /* GOOGLE OAUTH */
    /* ---------------------------------------------------------- */

    googleId: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },

    avatar: {
      type: String,
      default: '',
      trim: true,
    },

    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local',
    },

    /* ---------------------------------------------------------- */
    /* ROLE */
    /* ---------------------------------------------------------- */

    role: {
      type: String,
      enum: ['user', 'organizer', 'admin'],
      default: 'user',
    },

    /* ---------------------------------------------------------- */
    /* ORGANIZER DETAILS */
    /* ---------------------------------------------------------- */

    organizerName: {
      type: String,
      trim: true,
      maxlength: 150,
      default: '',
    },

    organizationName: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    category: {
      type: String,
      trim: true,
      default: '',
    },

    /* ---------------------------------------------------------- */
    /* ORGANIZER PAYMENT */
    /* ---------------------------------------------------------- */

    organizerPayment: {
      upiId: {
        type: String,
        trim: true,
        default: '',
      },

      qrCode: {
        type: String,
        trim: true,
        default: '',
      },
    },

    /* ---------------------------------------------------------- */
    /* PROFILE */
    /* ---------------------------------------------------------- */

    phone: {
      type: String,
      trim: true,
      maxlength: 20,
      default: '',
    },

    college: {
      type: String,
      trim: true,
      maxlength: 200,
      default: '',
    },

    batch: {
      type: String,
      trim: true,
      maxlength: 50,
      default: '',
    },

    profilePhoto: {
      type: String,
      trim: true,
      default: '',
    },

    bio: {
      type: String,
      trim: true,
      maxlength: 500,
      default: '',
    },

    /* ---------------------------------------------------------- */
    /* SOCIAL */
    /* ---------------------------------------------------------- */

    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    /* ---------------------------------------------------------- */
    /* FAVORITES */
    /* ---------------------------------------------------------- */

    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Event',
        index: true,
      },
    ],

    /* ---------------------------------------------------------- */
    /* REMINDERS */
    /* ---------------------------------------------------------- */

    reminders: [reminderSchema],

    /* ---------------------------------------------------------- */
    /* WALLET */
    /* ---------------------------------------------------------- */

    balance: {
      type: Number,
      default: 0,
      min: 0,
    },

    /* ---------------------------------------------------------- */
    /* ACCOUNT */
    /* ---------------------------------------------------------- */

    isVerified: {
      type: Boolean,
      default: false,
    },

    lastLogin: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
)

/* ============================================================ */
/* HASH PASSWORD BEFORE SAVE */
/* ============================================================ */

userSchema.pre('save', async function () {
  if (!this.isModified('password') || !this.password) return

  const salt = await bcrypt.genSalt(10)
  this.password = await bcrypt.hash(this.password, salt)
})

/* ============================================================ */
/* PASSWORD COMPARISON */
/* ============================================================ */

userSchema.methods.comparePassword = async function (enteredPassword) {
  if (!this.password) return false
  return bcrypt.compare(enteredPassword, this.password)
}

/* ============================================================ */
/* GENERATE JWT */
/* ============================================================ */

userSchema.methods.generateToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
    },
    process.env.JWT_SECRET || 'fallback_secret_change_in_production',
    { expiresIn: '7d' },
  )
}

/* ============================================================ */
/* REMOVE PASSWORD FROM JSON */
/* ============================================================ */

userSchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.password
  return obj
}

/* ============================================================ */
/* INDEXES */
/* ============================================================ */

userSchema.index({ role: 1 })
userSchema.index({ createdAt: -1 })

module.exports = mongoose.model('User', userSchema)
