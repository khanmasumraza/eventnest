const QRCode = require('qrcode')
const Ticket = require('../models/Registration')
const Event = require('../models/Event')
const Payment = require('../models/Payment')
const { emitToOrganizer, emitToEvent } = require('../socket')

// Audit log storage
const auditLogs = []

// Helper: Create audit log
const createAuditLog = (action, userId, eventId, data) => {
  const log = {
    action,
    userId,
    eventId,
    data,
    timestamp: new Date(),
  }
  auditLogs.push(log)
  console.log(`[AUDIT] ${action}:`, log)
}

// Generate unique ticket ID
const generateTicketId = () => {
  return `TKT-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

// Generate QR code as data URL
const generateQRCode = async (ticketId) => {
  try {
    const qrDataUrl = await QRCode.toDataURL(ticketId, {
      width: 300,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    })
    return qrDataUrl
  } catch (error) {
    console.error('QR Code generation error:', error)
    return null
  }
}

// Create pending ticket
const createTicket = async (req, res) => {
  try {
    const { eventId } = req.body
    const userId = req.user.id

    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    if (event.status !== 'published') {
      return res.status(400).json({ message: 'Event is not available for registration' })
    }

    if (event.registered >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' })
    }

    const existingTicket = await Ticket.findOne({
      user: userId,
      event: eventId,
      status: { $in: ['paid', 'checked_in'] },
    })

    if (existingTicket) {
      return res.status(400).json({ message: 'You already have a ticket for this event' })
    }

    const ticketId = generateTicketId()
    const ticket = new Ticket({
      ticketId,
      user: userId,
      event: eventId,
      status: 'pending',
    })

    await ticket.save()

    emitToOrganizer(event.organiser.toString(), 'ticketPurchased', {
      ticketId,
      eventId,
      userId,
    })

    createAuditLog('TICKET_CREATED', userId, eventId, { ticketId })

    res.status(201).json({
      success: true,
      ticket,
    })
  } catch (error) {
    console.error('Create ticket error:', error)
    res.status(500).json({ message: 'Error creating ticket' })
  }
}

// Verify and activate ticket after payment
const verifyPaymentAndActivateTicket = async (req, res) => {
  try {
    const { ticketId, paymentReference, screenshot } = req.body
    const userId = req.user.id

    if (!paymentReference) {
      return res.status(400).json({ message: 'Payment reference is required' })
    }

    const ticket = await Ticket.findOne({ ticketId }).populate('event')
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    if (ticket.user.toString() !== userId) {
      return res.status(403).json({ message: 'Not authorized to submit payment for this ticket' })
    }

    if (ticket.status !== 'pending') {
      return res.status(400).json({ message: 'Ticket is not in pending status' })
    }

    const existingPayment = await Payment.findOne({
      ticket: ticket._id,
      status: { $in: ['pending', 'verified'] },
    })

    if (existingPayment) {
      return res.status(400).json({ message: 'Payment already submitted for this ticket' })
    }

    const expectedAmount = ticket.event.price
    if (!expectedAmount || expectedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid event price' })
    }

    const payment = new Payment({
      event: ticket.event._id,
      user: ticket.user,
      ticket: ticket._id,
      amount: expectedAmount,
      method: 'upi',
      status: 'pending',
      referenceId: paymentReference,
      screenshot: screenshot || '',
    })

    await payment.save()

    ticket.paymentReference = paymentReference
    ticket.paymentScreenshot = screenshot || ''
    await ticket.save()

    emitToOrganizer(ticket.event.organiser.toString(), 'paymentSubmitted', {
      ticketId,
      paymentId: payment._id,
      eventId: ticket.event._id,
    })

    createAuditLog('PAYMENT_SUBMITTED', userId, ticket.event._id, {
      ticketId,
      paymentId: payment._id,
      amount: expectedAmount,
    })

    res.status(200).json({
      success: true,
      payment,
      message: 'Payment submitted for verification',
    })
  } catch (error) {
    console.error('Verify payment error:', error)
    res.status(500).json({ message: 'Error verifying payment' })
  }
}

// Generate QR code for paid ticket
const activateTicket = async (req, res) => {
  try {
    const { ticketId } = req.params

    const ticket = await Ticket.findOne({ ticketId }).populate('event')
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    if (ticket.status !== 'pending') {
      return res.status(400).json({ message: 'Ticket is not pending' })
    }

    const qrCode = await generateQRCode(ticketId)
    if (!qrCode) {
      return res.status(500).json({ message: 'Error generating QR code' })
    }

    ticket.status = 'paid'
    ticket.qrCode = qrCode
    await ticket.save()

    await Event.findByIdAndUpdate(ticket.event._id, {
      $inc: { registered: 1 },
    })

    emitToEvent(ticket.event._id.toString(), 'ticketActivated', {
      ticketId,
    })

    res.status(200).json({
      success: true,
      ticket,
    })
  } catch (error) {
    console.error('Activate ticket error:', error)
    res.status(500).json({ message: 'Error activating ticket' })
  }
}

// Get user tickets
const getMyTickets = async (req, res) => {
  try {
    const userId = req.user.id

    const tickets = await Ticket.find({ user: userId })
      .populate({
        path: 'event',
        populate: {
          path: 'organiser',
          select: 'name email',
        },
      })
      .sort({ createdAt: -1 })

    res.status(200).json(tickets)
  } catch (error) {
    console.error('Get tickets error:', error)
    res.status(500).json({ message: 'Error fetching tickets' })
  }
}

// Get single ticket
const getTicket = async (req, res) => {
  try {
    console.log('📥 Incoming request params:', req.params)
    console.log('🎯 ticketId param:', req.params.ticketId)

    const ticket = await Ticket.findOne({ ticketId: req.params.ticketId })
      .populate({
        path: 'event',
        populate: {
          path: 'organiser',
          select: '_id name email',
        },
      })
      .populate('user', 'name email')

    console.log('📦 Found ticket:', ticket)

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: 'Ticket not found',
      })
    }

    res.status(200).json({
      success: true,
      ticket,
      event: ticket.event,
    })
  } catch (error) {
    console.error('Get ticket error:', error)
    res.status(500).json({ message: 'Error fetching ticket' })
  }
}

// Verify QR ticket for check-in
const verifyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params
    const userId = req.user.id

    const ticket = await Ticket.findOne({ ticketId }).populate('event')

    if (!ticket) {
      return res.status(404).json({ valid: false, message: 'Ticket not found' })
    }

    const isOrganizer = ticket.event.organiser.toString() === userId
    const isAdmin = req.user.role === 'admin'

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({ valid: false, message: 'Not authorized to verify tickets' })
    }

    if (ticket.status === 'checked_in') {
      return res.status(400).json({
        valid: false,
        message: 'Ticket already checked in',
        checkedInAt: ticket.checkedInAt,
        attendee: ticket.user?.name || 'Unknown',
      })
    }

    if (ticket.status !== 'paid') {
      return res.status(400).json({
        valid: false,
        message: 'Ticket not paid',
        status: ticket.status,
      })
    }

    ticket.status = 'checked_in'
    ticket.checkedInAt = new Date()
    await ticket.save()

    emitToOrganizer(ticket.event.organiser.toString(), 'checkinSuccess', {
      ticketId,
      eventId: ticket.event._id,
      checkedInAt: ticket.checkedInAt,
    })

    createAuditLog('TICKET_CHECKED_IN', userId, ticket.event._id, {
      ticketId,
      checkedInAt: ticket.checkedInAt,
    })

    res.status(200).json({
      valid: true,
      message: 'Check-in successful',
      ticket: {
        ticketId: ticket.ticketId,
        eventTitle: ticket.event.title,
        userName: ticket.user?.name || 'Unknown',
        checkedInAt: ticket.checkedInAt,
      },
    })
  } catch (error) {
    console.error('Verify ticket error:', error)
    res.status(500).json({ message: 'Error verifying ticket' })
  }
}

// Get attendees for a specific event (organizer only)
const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params
    const userId = req.user.id

    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    if (event.organiser.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const attendees = await Ticket.find({
      event: eventId,
      status: { $in: ['paid', 'checked_in'] },
    })
      .populate('user', 'name email')
      .sort({ createdAt: -1 })

    res.status(200).json(attendees)
  } catch (error) {
    console.error('Get attendees error:', error)
    res.status(500).json({ message: 'Error fetching attendees' })
  }
}

// ✅ NEW — Get ALL tickets across all organizer's events (for Analytics)
const getOrganizerAllTickets = async (req, res) => {
  try {
    const userId = req.user.id

    // Find all events belonging to this organizer
    const organizerEvents = await Event.find({ organiser: userId }).select('_id')
    const eventIds = organizerEvents.map(e => e._id)

    if (eventIds.length === 0) {
      return res.status(200).json({
        success: true,
        tickets: [],
      })
    }

    // Fetch all paid/checked_in tickets for those events
    const tickets = await Ticket.find({
      event: { $in: eventIds },
      status: { $in: ['paid', 'checked_in'] },
    })
      .populate('user', 'name email')
      .populate('event', 'title date price')
      .sort({ createdAt: -1 })

    res.status(200).json({
      success: true,
      tickets,
    })
  } catch (error) {
    console.error('Get organizer all tickets error:', error)
    res.status(500).json({ message: 'Error fetching tickets' })
  }
}

module.exports = {
  createTicket,
  verifyPaymentAndActivateTicket,
  activateTicket,
  getMyTickets,
  getTicket,
  verifyTicket,
  getEventAttendees,
  getOrganizerAllTickets,  // ✅ new
}