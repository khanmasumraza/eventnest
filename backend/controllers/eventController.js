const Event = require('../models/Event')
const Registration = require('../models/Registration')
const Waitlist = require('../models/Waitlist')
const User = require('../models/User')
const QRCode = require('qrcode')
const { v4: uuidv4 } = require('uuid')

// Create a new event
const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      venue,
      city,
      category,
      capacity,
      price,
      imageUrl,
      bannerUrl,
      organizerDetails,
      requiredFields,
      schedule,
      latitude,
      longitude,
      paymentType,
      organizerUpiId,
      organizerName,
      ticketPrice,
      paymentInstructions,
    } = req.body

    // Validation
    if (!title || title.length < 5) {
      return res
        .status(400)
        .json({ message: 'Title must be at least 5 characters long' })
    }
    if (!description || description.length < 20) {
      return res
        .status(400)
        .json({ message: 'Description must be at least 20 characters long' })
    }
    if (!date || new Date(date) <= new Date()) {
      return res
        .status(400)
        .json({ message: 'Event date must be in the future' })
    }
    if (!venue) {
      return res.status(400).json({ message: 'Venue is required' })
    }
    if (!city) {
      return res.status(400).json({ message: 'City is required' })
    }
    if (
      !category ||
      ![
        'Hackathon',
        'Fest',
        'Workshop',
        'Conference',
        'Cultural',
        'Sports',
        'Meetup',
        'Other',
      ].includes(category)
    ) {
      return res.status(400).json({ message: 'Invalid category' })
    }
    if (!capacity || capacity < 1 || capacity > 10000) {
      return res
        .status(400)
        .json({ message: 'Capacity must be between 1 and 10,000' })
    }
    if (price < 0) {
      return res.status(400).json({ message: 'Price must be 0 or greater' })
    }

    // Normalize payment configuration
    const resolvedPaymentType =
      paymentType ||
      (Number(price) > 0 || Number(ticketPrice) > 0 ? 'upi' : 'free')

    const resolvedTicketPrice =
      typeof ticketPrice !== 'undefined' && ticketPrice !== null
        ? Number(ticketPrice)
        : Number(price) || 0

    if (resolvedPaymentType === 'upi') {
      if (!organizerUpiId || !organizerName) {
        return res.status(400).json({
          message:
            'Organizer UPI ID and name are required for paid (UPI) events',
        })
      }
      if (resolvedTicketPrice <= 0) {
        return res.status(400).json({
          message: 'Ticket price must be greater than 0 for UPI payments',
        })
      }
    }

    // Validate requiredFields
    const validFields = ['name', 'email', 'phone', 'college', 'batch']
    const fields = requiredFields || ['name', 'email']
    const invalidFields = fields.filter((f) => !validFields.includes(f))
    if (invalidFields.length > 0) {
      return res
        .status(400)
        .json({ message: `Invalid fields: ${invalidFields.join(', ')}` })
    }

    // Get organizer details from user
    const organizer = await User.findById(req.user._id)

    const event = new Event({
      title,
      description,
      date,
      time: time || '10:00 AM',
      venue,
      city,
      category,
      capacity,
      price,
      paymentType: resolvedPaymentType,
      organizerUpiId: organizerUpiId || undefined,
      organizerName: organizerName || organizer?.name || undefined,
      ticketPrice: resolvedTicketPrice,
      paymentInstructions:
        paymentInstructions ||
        'Complete the UPI payment using the organizer details and then submit your transaction ID.',
      organizerQrImage: req.files?.organizerQrImage?.[0]
        ? `/uploads/paymentQR/${req.files.organizerQrImage[0].filename}`
        : undefined,
      imageUrl: req.files?.coverImage?.[0]
        ? `/uploads/paymentQR/${req.files.coverImage[0].filename}`
        : imageUrl || bannerUrl,
      bannerUrl: req.files?.coverImage?.[0]
        ? `/uploads/paymentQR/${req.files.coverImage[0].filename}`
        : bannerUrl || imageUrl,
      organiser: req.user._id,
      status: 'approved',
      registered: 0,
      registeredCount: 0,
      organizerDetails: {
        name: organizerDetails?.name || organizer.name,
        contact: organizerDetails?.contact || organizer.email,
        description: organizerDetails?.description || '',
      },
      requiredFields: fields,
      schedule: schedule || [],
      location:
        latitude && longitude
          ? {
              type: 'Point',
              coordinates: [Number(longitude), Number(latitude)],
            }
          : undefined,
    })

    console.log('[EventNest] Created event payment config:', {
      id: event._id?.toString(),
      paymentType: event.paymentType,
      organizerUpiId: event.organizerUpiId,
      ticketPrice: event.ticketPrice,
    })

    await event.save()

    const populatedEvent = await Event.findById(event._id).populate(
      'organiser',
      'name email profilePhoto',
    )

    res.status(201).json(populatedEvent)
  } catch (error) {
    console.error('Create event error:', error)
    res
      .status(500)
      .json({ message: 'Error creating event', error: error.message })
  }
}

// Get all approved events
const getAllEvents = async (req, res) => {
  try {
    const { category, city, search, page = 1, limit = 20 } = req.query

    let query = { status: 'approved' }

    if (category && category !== 'All') {
      query.category = category
    }

    if (city && city !== 'All') {
      query.city = city
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ]
    }

    const events = await Event.find(query)
      .populate('organiser', 'name profilePhoto')
      .sort({ date: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)

    const count = await Event.countDocuments(query)

    res.status(200).json({
      events,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalEvents: count,
    })
  } catch (error) {
    console.error('Get events error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching events', error: error.message })
  }
}

// Get event by ID
const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      'organiser',
      'name email profilePhoto bio',
    )

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    event.views += 1
    await event.save()

    res.status(200).json(event)
  } catch (error) {
    console.error('Get event error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching event', error: error.message })
  }
}

// Get event by ID (public - no view increment)
const getEventByIdPublic = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).populate(
      'organiser',
      'name email profilePhoto bio organizerPayment',
    )

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    res.status(200).json(event)
  } catch (error) {
    console.error('Get event error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching event', error: error.message })
  }
}

// Get event attendees
const getEventAttendees = async (req, res) => {
  try {
    const attendees = await Registration.find({ event: req.params.id })
      .populate('user', 'name email profilePhoto phone college batch')
      .sort({ createdAt: -1 })

    res.status(200).json(attendees)
  } catch (error) {
    console.error('Get attendees error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching attendees', error: error.message })
  }
}

// Check registration status
const checkRegistrationStatus = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      event: req.params.id,
      user: req.user._id,
    })

    if (registration) {
      return res.status(200).json({
        isRegistered: true,
        ticket: registration,
      })
    }

    res.status(200).json({ isRegistered: false, ticket: null })
  } catch (error) {
    console.error('Check registration error:', error)
    res
      .status(500)
      .json({ message: 'Error checking registration', error: error.message })
  }
}

// Get user ticket
const getMyTicket = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      event: req.params.id,
      user: req.user._id,
    }).populate('event')

    if (!registration) {
      return res.status(404).json({ message: 'No ticket found' })
    }

    res.status(200).json(registration)
  } catch (error) {
    console.error('Get ticket error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching ticket', error: error.message })
  }
}

// ─────────────────────────────────────────────────────────────
// Register for FREE event  ← UPDATED
// ─────────────────────────────────────────────────────────────
const registerForEvent = async (req, res) => {
  try {
    const { id } = req.params
    console.log('🚀 registerForEvent | user:', req.user._id, '| event:', id)

    // 1. Event exists?
    const event = await Event.findById(id)
    if (!event) {
      console.warn('❌ Event not found:', id)
      return res.status(404).json({ message: 'Event not found' })
    }

    // 2. Already registered? Return existing ticket (idempotent — safe for double-click)
    const existingRegistration = await Registration.findOne({
      event: id,
      user: req.user._id,
    })
    if (existingRegistration) {
      console.log(
        'ℹ️ Already registered, returning existing ticket:',
        existingRegistration.ticketId,
      )
      const populated = await Registration.findById(existingRegistration._id)
        .populate('user', 'name email profilePhoto')
        .populate('event')
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        ticketId: populated.ticketId,
        qrCode: populated.qrCode,
        registration: populated,
      })
    }

    // 3. Capacity check
    if (event.registered >= event.capacity) {
      console.warn('❌ Event full:', id)
      return res.status(400).json({ message: 'Event is full', isFull: true })
    }

    // 4. Get user
    const user = await User.findById(req.user._id)
    if (!user) {
      console.error('❌ User not found:', req.user._id)
      return res.status(404).json({ message: 'User not found' })
    }

    // 5. Generate QR
    const qrData = JSON.stringify({ eventId: id, userId: req.user._id })
    const qrCode = await QRCode.toDataURL(qrData)

    // 6. Create registration with free-event flags
    //    - paymentStatus: 'free'  → valid enum value in your schema
    //    - paymentVerified: true  → so getMyTickets query finds it
    //    - ticketId is auto-generated by the pre-save hook in Registration.js
    const registration = new Registration({
      event: id,
      user: req.user._id,
      qrCode,
      amount: 0,
      paymentStatus: 'free',
      paymentVerified: true,
      status: 'paid',
      attendeeInfo: {
        name: user.name || '',
        email: user.email || '',
        phone: user.phone || '',
        college: user.college || '',
        batch: user.batch || '',
      },
    })

    try {
      await registration.save()
      console.log('✅ Registration saved | ticketId:', registration.ticketId)
    } catch (saveErr) {
      // Duplicate key = race condition / double-click reached DB simultaneously
      // Fetch and return the already-created record instead of throwing 500
      if (saveErr.code === 11000) {
        console.warn(
          '⚠️ Duplicate key on save — fetching existing registration',
        )
        const existing = await Registration.findOne({
          event: id,
          user: req.user._id,
        })
          .populate('user', 'name email profilePhoto')
          .populate('event')
        return res.status(200).json({
          success: true,
          alreadyRegistered: true,
          ticketId: existing.ticketId,
          qrCode: existing.qrCode,
          registration: existing,
        })
      }
      // Any other save error — log fully and return 500
      console.error('❌ SAVE FAILED:', saveErr.message)
      console.error(saveErr)
      throw saveErr
    }

    // 7. Update event registered count
    //    Don't throw if this fails — registration is already saved, user should get their ticket
    try {
      event.registered += 1
      await event.save()
      console.log('✅ Event count updated to:', event.registered)
    } catch (eventSaveErr) {
      console.error('❌ EVENT COUNT UPDATE FAILED:', eventSaveErr.message)
    }

    // 8. Populate and respond
    const populated = await Registration.findById(registration._id)
      .populate('user', 'name email profilePhoto')
      .populate('event')

    console.log('🎫 Registration complete | ticketId:', registration.ticketId)
    return res.status(201).json({
      success: true,
      ticketId: registration.ticketId,
      qrCode,
      registration: populated,
    })
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err.message)
    console.error(err.stack)
    return res.status(500).json({ message: 'Internal error', error: err.message })
  }
}

// Cancel registration
const cancelRegistration = async (req, res) => {
  try {
    const { id } = req.params

    const registration = await Registration.findOne({
      event: id,
      user: req.user._id,
    })

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    await Registration.findByIdAndDelete(registration._id)

    const event = await Event.findById(id)
    if (event && event.registered > 0) {
      event.registered -= 1
      await event.save()
    }

    res.status(200).json({ success: true, message: 'Registration cancelled' })
  } catch (error) {
    console.error('Cancel registration error:', error)
    res
      .status(500)
      .json({ message: 'Error cancelling registration', error: error.message })
  }
}

// Join waitlist
const joinWaitlist = async (req, res) => {
  try {
    const { id } = req.params

    const event = await Event.findById(id)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const existingWaitlist = await Waitlist.findOne({
      event: id,
      user: req.user._id,
    })
    if (existingWaitlist) {
      return res.status(400).json({ message: 'Already on waitlist' })
    }

    const existingRegistration = await Registration.findOne({
      event: id,
      user: req.user._id,
    })
    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: 'Already registered for this event' })
    }

    const waitlistCount = await Waitlist.countDocuments({ event: id })
    const position = waitlistCount + 1

    const waitlistEntry = new Waitlist({
      event: id,
      user: req.user._id,
      position,
    })
    await waitlistEntry.save()

    res.status(201).json({ success: true, position })
  } catch (error) {
    console.error('Join waitlist error:', error)
    res
      .status(500)
      .json({ message: 'Error joining waitlist', error: error.message })
  }
}

// Leave waitlist
const leaveWaitlist = async (req, res) => {
  try {
    const { id } = req.params

    const waitlistEntry = await Waitlist.findOne({
      event: id,
      user: req.user._id,
    })

    if (!waitlistEntry) {
      return res.status(404).json({ message: 'Not on waitlist' })
    }

    await Waitlist.findByIdAndDelete(waitlistEntry._id)

    res.status(200).json({ success: true, message: 'Removed from waitlist' })
  } catch (error) {
    console.error('Leave waitlist error:', error)
    res
      .status(500)
      .json({ message: 'Error leaving waitlist', error: error.message })
  }
}

// Get waitlist status
const getWaitlistStatus = async (req, res) => {
  try {
    const { id } = req.params

    const waitlistEntry = await Waitlist.findOne({
      event: id,
      user: req.user._id,
    })

    if (waitlistEntry) {
      const totalWaitlist = await Waitlist.countDocuments({ event: id })
      return res.status(200).json({
        isOnWaitlist: true,
        position: waitlistEntry.position,
        totalWaitlist,
      })
    }

    res.status(200).json({ isOnWaitlist: false })
  } catch (error) {
    console.error('Get waitlist status error:', error)
    res
      .status(500)
      .json({ message: 'Error checking waitlist status', error: error.message })
  }
}

// Get organizer's events
const getMyEvents = async (req, res) => {
  try {
    const events = await Event.find({ organiser: req.user._id }).sort({
      createdAt: -1,
    })

    res.status(200).json(events)
  } catch (error) {
    console.error('Get my events error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching your events', error: error.message })
  }
}

// Get pending events (for admin)
const getPendingEvents = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const events = await Event.find({ status: 'pending' })
      .populate('organiser', 'name email')
      .sort({ createdAt: -1 })

    res.status(200).json(events)
  } catch (error) {
    console.error('Get pending events error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching pending events', error: error.message })
  }
}

// Approve event
const approveEvent = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'approved' },
      { new: true },
    )
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(event)
  } catch (error) {
    console.error('Approve event error:', error)
    res
      .status(500)
      .json({ message: 'Error approving event', error: error.message })
  }
}

// Reject event
const rejectEvent = async (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ message: 'Access denied' })
  }

  try {
    const event = await Event.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true },
    )
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }
    res.status(200).json(event)
  } catch (error) {
    console.error('Reject event error:', error)
    res
      .status(500)
      .json({ message: 'Error rejecting event', error: error.message })
  }
}

// Get event share data
const getEventShare = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id).select(
      'title description image date venue city',
    )

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const shareUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/event/${event._id}`
    const qrCode = await QRCode.toDataURL(shareUrl)

    res.status(200).json({
      url: shareUrl,
      qrCode,
      title: event.title,
      description: event.description,
      image: event.image,
    })
  } catch (error) {
    console.error('Get share error:', error)
    res
      .status(500)
      .json({ message: 'Error generating share data', error: error.message })
  }
}

// Get user's registrations
const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate('event')
      .sort({ createdAt: -1 })

    res.status(200).json(registrations)
  } catch (error) {
    console.error('Get my registrations error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching registrations', error: error.message })
  }
}

// Check-in ticket
const checkInTicket = async (req, res) => {
  try {
    const { ticketId } = req.body

    const registration = await Registration.findOne({ ticketId })
      .populate('event')
      .populate('user', 'name email')

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: 'Ticket not found' })
    }

    if (registration.status === 'checked-in') {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used',
        checkedInAt: registration.checkedInAt,
      })
    }

    // Fixed: use 'verified' (not 'completed') to match schema enum
    if (registration.paymentStatus !== 'verified' && registration.paymentStatus !== 'free' && registration.amount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
      })
    }

    registration.status = 'checked-in'
    registration.checkedInAt = new Date()
    await registration.save()

    res.status(200).json({
      success: true,
      message: 'Check-in successful',
      attendee: {
        name: registration.attendeeInfo?.name || registration.user?.name,
        email: registration.attendeeInfo?.email || registration.user?.email,
        event: registration.event?.title,
        ticketId: registration.ticketId,
      },
    })
  } catch (error) {
    console.error('Check-in error:', error)
    res.status(500).json({
      success: false,
      message: 'Error checking in',
      error: error.message,
    })
  }
}

// ─────────────────────────────────────────────────────────────
// Get user's tickets  ← UPDATED
// Now returns both free tickets and paid+verified tickets
// ─────────────────────────────────────────────────────────────
const getMyTickets = async (req, res) => {
  try {
    const registrations = await Registration.find({
      user: req.user._id,
      $or: [
        { paymentStatus: 'verified' },  // paid events verified by organizer
        { paymentStatus: 'free' },       // free events
      ],
    })
      .populate('event')
      .sort({ createdAt: -1 })

    const tickets = registrations.map((reg) => {
      const isEventDeleted = !reg.event || !reg.event._id

      return {
        ticketId: reg.ticketId,
        event: isEventDeleted
          ? null
          : {
              _id: reg.event._id,
              title: reg.event.title,
              date: reg.event.date,
              time: reg.event.time,
              city: reg.event.city,
              venue: reg.event.venue,
              image: reg.event.image || reg.event.bannerUrl,
              capacity: reg.event.capacity,
              registered: reg.event.registered,
            },
        eventDeleted: isEventDeleted,
        amount: reg.amount,
        status: reg.status,
        paymentStatus: reg.paymentStatus,
        createdAt: reg.createdAt,
        paymentVerified: reg.paymentVerified,
        qrCode: reg.qrCode,
      }
    })

    res.status(200).json(tickets)
  } catch (error) {
    console.error('Get my tickets error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching tickets', error: error.message })
  }
}

// Get trending events
const getTrendingEvents = async (req, res) => {
  try {
    const events = await Event.find({
      status: 'approved',
      date: { $gte: new Date() },
    })
      .populate('organiser', 'name profilePhoto')
      .sort({ registered: -1 })
      .limit(10)

    res.status(200).json(events)
  } catch (error) {
    console.error('Get trending events error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching trending events', error: error.message })
  }
}

// Get nearby events
const getNearbyEvents = async (req, res) => {
  try {
    const { lat, lng, radius = 50000 } = req.query

    if (!lat || !lng) {
      return res.status(400).json({
        message: 'Latitude and longitude are required',
      })
    }

    const latitude = parseFloat(lat)
    const longitude = parseFloat(lng)

    const events = await Event.find({
      status: 'approved',
      date: { $gte: new Date() },
      location: {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [longitude, latitude],
          },
          $maxDistance: Number(radius),
        },
      },
    })
      .populate('organiser', 'name profilePhoto')
      .limit(20)

    res.status(200).json(events)
  } catch (error) {
    console.error('Get nearby events error:', error)
    res.status(500).json({
      message: 'Error fetching nearby events',
      error: error.message,
    })
  }
}

// Toggle favorite event
const toggleFavorite = async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user._id

    const user = await User.findById(userId)

    const favoriteIndex = user.favorites?.indexOf(id) ?? -1

    if (favoriteIndex > -1) {
      user.favorites.splice(favoriteIndex, 1)
      await user.save()
      res.status(200).json({ success: true, isFavorite: false })
    } else {
      if (!user.favorites) user.favorites = []
      user.favorites.push(id)
      await user.save()
      res.status(200).json({ success: true, isFavorite: true })
    }
  } catch (error) {
    console.error('Toggle favorite error:', error)
    res
      .status(500)
      .json({ message: 'Error toggling favorite', error: error.message })
  }
}

// Get user's favorite events
const getFavoriteEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)

    if (!user.favorites || user.favorites.length === 0) {
      return res.status(200).json([])
    }

    const events = await Event.find({
      _id: { $in: user.favorites },
      status: 'approved',
    }).populate('organiser', 'name profilePhoto')

    res.status(200).json(events)
  } catch (error) {
    console.error('Get favorite events error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching favorite events', error: error.message })
  }
}

// Set event reminder
const setReminder = async (req, res) => {
  try {
    const { id } = req.params
    const { reminderTime } = req.body

    const validReminders = ['1day', '3hours', '30min']
    if (!validReminders.includes(reminderTime)) {
      return res.status(400).json({ message: 'Invalid reminder time' })
    }

    const event = await Event.findById(id)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const user = await User.findById(req.user._id)
    if (!user.reminders) user.reminders = []

    user.reminders = user.reminders.filter((r) => r.event?.toString() !== id)
    user.reminders.push({
      event: id,
      reminderTime,
      createdAt: new Date(),
    })
    await user.save()

    res.status(200).json({ success: true, reminderTime })
  } catch (error) {
    console.error('Set reminder error:', error)
    res
      .status(500)
      .json({ message: 'Error setting reminder', error: error.message })
  }
}

// Get user's reminders
const getMyReminders = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate({
      path: 'reminders.event',
      match: { status: 'approved' },
    })

    const validReminders = user.reminders.filter((r) => r.event !== null)
    res.status(200).json(validReminders)
  } catch (error) {
    console.error('Get reminders error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching reminders', error: error.message })
  }
}

// Get event updates
const getEventUpdates = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    const updates = event.updates || []
    res.status(200).json(updates)
  } catch (error) {
    console.error('Get event updates error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching event updates', error: error.message })
  }
}

// Get recommended events
const getRecommendedEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const { category, city } = req.query

    const registrations = await Registration.find({ user: req.user._id })
    const registeredEventIds = registrations.map((r) => r.event)

    let query = {
      status: 'approved',
      date: { $gte: new Date() },
      _id: { $nin: registeredEventIds },
    }

    if (category) query.category = category
    if (city) query.city = city

    const events = await Event.find(query)
      .populate('organiser', 'name profilePhoto')
      .sort({ date: 1, registered: -1 })
      .limit(10)

    res.status(200).json(events)
  } catch (error) {
    console.error('Get recommended events error:', error)
    res.status(500).json({
      message: 'Error fetching recommended events',
      error: error.message,
    })
  }
}

// Update event
const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found' })

    if (event.organiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const updatedEvent = await Event.findByIdAndUpdate(
      req.params.id,
      { ...req.body },
      { new: true },
    )

    res.status(200).json(updatedEvent)
  } catch (error) {
    console.error('Update event error:', error)
    res
      .status(500)
      .json({ message: 'Error updating event', error: error.message })
  }
}

// Delete event
const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
    if (!event) return res.status(404).json({ message: 'Event not found' })

    if (event.organiser.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    await Event.findByIdAndDelete(req.params.id)

    res.status(200).json({ success: true, message: 'Event deleted' })
  } catch (error) {
    console.error('Delete event error:', error)
    res
      .status(500)
      .json({ message: 'Error deleting event', error: error.message })
  }
}

module.exports = {
  createEvent,
  getAllEvents,
  getEventById,
  getEventByIdPublic,
  getEventAttendees,
  checkRegistrationStatus,
  getMyTicket,
  registerForEvent,
  cancelRegistration,
  joinWaitlist,
  leaveWaitlist,
  getWaitlistStatus,
  getMyEvents,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  getEventShare,
  getMyRegistrations,
  checkInTicket,
  getMyTickets,
  getTrendingEvents,
  getNearbyEvents,
  toggleFavorite,
  getFavoriteEvents,
  setReminder,
  getMyReminders,
  getEventUpdates,
  getRecommendedEvents,
  updateEvent,
  deleteEvent,
}