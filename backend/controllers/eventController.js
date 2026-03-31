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
      price, // kept for backward compatibility (e.g. old listings)
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
      status: 'approved', // Auto-approve for now
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

    // Populate organiser info for response
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

    // Increment view count
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

// Register for event (without payment - for free events)
const registerForEvent = async (req, res) => {
  console.log('📥 BODY:', req.body)
  console.log('👤 USER:', req.user)
  console.log('🎯 EVENT ID:', req.params.id)
  try {
    console.log('🚀 REGISTER API HIT - START')
    console.log('👤 User ID:', req.user._id)
    console.log('📅 Event ID:', req.params.id)
    console.log('⚠️ BEFORE USING event variable')
    console.log('User:', req.user)
    console.log('Event ID param:', req.params.id)

    const { id } = req.params

    console.log('⚠️ BEFORE EVENT DECLARATION')
    console.log('🔍 BEFORE DB CALL')
    console.log('🔍 Finding event with ID:', req.params.id)

    // Check if event exists
    const event = await Event.findById(req.params.id)

    console.log('✅ EVENT FETCHED:', event)
    console.log('✅ AFTER DB CALL - event:', event)
    console.log('📦 Found event:', event)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      event: id,
      user: req.user._id,
    })
    if (existingRegistration) {
      return res.status(200).json({
        success: true,
        registration: existingRegistration,
      })
    }

    // Check capacity
    console.log('📍 USING EVENT:', event)
    console.log('📍 USING event HERE:', event)
    if (event.registered >= event.capacity) {
      return res.status(400).json({ message: 'Event is full', isFull: true })
    }

    // Generate unique ticket ID
    const ticketId = `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

    const qrData = JSON.stringify({
      ticketId,
      eventId: id,
      userId: req.user._id,
    })
    const qrCode = await QRCode.toDataURL(qrData)

    // Get user info
    console.log('🧠 Creating registration with:', {
      user: req.user?.id,
      event: event?._id,
    })

    const user = await User.findById(req.user._id)

    // Create registration
    console.log('🧠 ABOUT TO SAVE REGISTRATION')
    const registration = new Registration({
      event: id,
      user: req.user._id,
      ticketId,
      qrCode,
      status: 'paid',
      attendeeInfo: {
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        college: user?.college || '',
        batch: user?.batch || '',
      },
    })
    console.log('🧠 About to SAVE registration')
    try {
      await registration.save()
      console.log('✅ Registration SAVED')
    } catch (err) {
      console.error('❌ SAVE FAILED:', err.message)
      console.error(err)
      throw err // Re-throw to catch block
    }
    console.log('📊 Updating event count')

    // Update event registered count
    console.log('📊 Updating event count')
    try {
      event.registered += 1
      await event.save()
      console.log('✅ Event updated')
    } catch (err) {
      console.error('❌ EVENT UPDATE FAILED:', err.message)
      throw err // Re-throw to catch block
    }

    // Populate the registration
    const populatedRegistration = await Registration.findById(registration._id)
      .populate('user', 'name email profilePhoto')
      .populate('event')

    console.log('✅ REGISTER FUNCTION COMPLETED SUCCESSFULLY')
    console.log('🎫 New ticket ID:', registration.ticketId)
    console.log('👥 Event now has', event.registered, 'registrations')

    console.log('🚀 Sending success response')
    res.status(201).json({
      success: true,
      qrCode,
      ticketId,
      registration: populatedRegistration,
    })
  } catch (err) {
    console.error('❌ REGISTER ERROR:', err.message)
    console.error(err.stack)
    return res.status(500).json({
      message: 'Internal error',
      error: err.message,
    })
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

    // Update event registered count
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

    // Check if already on waitlist
    const existingWaitlist = await Waitlist.findOne({
      event: id,
      user: req.user._id,
    })
    if (existingWaitlist) {
      return res.status(400).json({ message: 'Already on waitlist' })
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      event: id,
      user: req.user._id,
    })
    if (existingRegistration) {
      return res
        .status(400)
        .json({ message: 'Already registered for this event' })
    }

    // Get position
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

    // Generate QR code
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

    // Find registration by ticketId
    const registration = await Registration.findOne({ ticketId })
      .populate('event')
      .populate('user', 'name email')

    if (!registration) {
      return res
        .status(404)
        .json({ success: false, message: 'Ticket not found' })
    }

    // Check if already checked in
    if (registration.status === 'checked-in') {
      return res.status(400).json({
        success: false,
        message: 'Ticket already used',
        checkedInAt: registration.checkedInAt,
      })
    }

    // Check if payment is completed
    if (registration.paymentStatus !== 'completed' && registration.amount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Payment not completed',
      })
    }

    // Mark as checked in
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

// Get user's tickets with proper format - ACCESS CONTROLLED
const getMyTickets = async (req, res) => {
  try {
    // Fetch registrations where user matches, populate event info
    const registrations = await Registration.find({
      user: req.user._id,
      paymentVerified: true, // NEW: Only verified payments
      paymentStatus: 'verified', // Verified payments only
    })
      .populate('event')
      .sort({ createdAt: -1 })

    // Format response according to requirements
    const tickets = registrations.map((reg) => {
      // Check if event is deleted (event field is null or event._id is missing)
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
        createdAt: reg.createdAt,
        paymentVerified: reg.paymentVerified, // NEW: Expose for frontend
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

// Get trending events (sorted by registrations)
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

// Get nearby events based on coordinates
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
      // Remove from favorites
      user.favorites.splice(favoriteIndex, 1)
      await user.save()
      res.status(200).json({ success: true, isFavorite: false })
    } else {
      // Add to favorites
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
    const { reminderTime } = req.body // '1day', '3hours', '30min'

    const validReminders = ['1day', '3hours', '30min']
    if (!validReminders.includes(reminderTime)) {
      return res.status(400).json({ message: 'Invalid reminder time' })
    }

    const event = await Event.findById(id)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Store reminder in user model
    const user = await User.findById(req.user._id)
    if (!user.reminders) user.reminders = []

    // Remove existing reminder for this event
    user.reminders = user.reminders.filter((r) => r.event?.toString() !== id)

    // Add new reminder
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

// Get event updates (organizer announcements)
const getEventUpdates = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)

    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Return organizer updates (stored in event or separate collection)
    // For now, return any updates field from event
    const updates = event.updates || []

    res.status(200).json(updates)
  } catch (error) {
    console.error('Get event updates error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching event updates', error: error.message })
  }
}

// Get recommended events (based on user preferences, category, city)
const getRecommendedEvents = async (req, res) => {
  try {
    const user = await User.findById(req.user._id)
    const { category, city } = req.query

    // Get user's registered events to exclude
    const registrations = await Registration.find({ user: req.user._id })
    const registeredEventIds = registrations.map((r) => r.event)

    // Build query
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
}
