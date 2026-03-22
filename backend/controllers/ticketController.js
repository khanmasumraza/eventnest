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

    // Check if event exists
    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Check if event is published
    if (event.status !== 'published') {
      return res
        .status(400)
        .json({ message: 'Event is not available for registration' })
    }

    // Check capacity
    if (event.registered >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' })
    }

    // Check if user already has a ticket for this event
    const existingTicket = await Ticket.findOne({
      user: userId,
      event: eventId,
      status: { $in: ['paid', 'checked_in'] },
    })

    if (existingTicket) {
      return res
        .status(400)
        .json({ message: 'You already have a ticket for this event' })
    }

    // Create pending ticket
    const ticketId = generateTicketId()
    const ticket = new Ticket({
      ticketId,
      user: userId,
      event: eventId,
      status: 'pending',
    })

    await ticket.save()

    // Emit event
    emitToOrganizer(event.organiser.toString(), 'ticketPurchased', {
      ticketId,
      eventId,
      userId,
    })

    // Audit log
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

    // Validate required fields
    if (!paymentReference) {
      return res.status(400).json({ message: 'Payment reference is required' })
    }

    const ticket = await Ticket.findOne({ ticketId }).populate('event')
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' })
    }

    // Security: Verify ticket belongs to user
    if (ticket.user.toString() !== userId) {
      return res
        .status(403)
        .json({ message: 'Not authorized to submit payment for this ticket' })
    }

    if (ticket.status !== 'pending') {
      return res
        .status(400)
        .json({ message: 'Ticket is not in pending status' })
    }

    // Check for existing payment
    const existingPayment = await Payment.findOne({
      ticket: ticket._id,
      status: { $in: ['pending', 'verified'] },
    })

    if (existingPayment) {
      return res
        .status(400)
        .json({ message: 'Payment already submitted for this ticket' })
    }

    // Validate amount matches event price
    const expectedAmount = ticket.event.price
    if (!expectedAmount || expectedAmount <= 0) {
      return res.status(400).json({ message: 'Invalid event price' })
    }

    // Create payment record
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

    // Update ticket with payment reference
    ticket.paymentReference = paymentReference
    ticket.paymentScreenshot = screenshot || ''
    await ticket.save()

    // Emit to organizer
    emitToOrganizer(ticket.event.organiser.toString(), 'paymentSubmitted', {
      ticketId,
      paymentId: payment._id,
      eventId: ticket.event._id,
    })

    // Audit log
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

    // Generate QR code
    const qrCode = await generateQRCode(ticketId)
    if (!qrCode) {
      return res.status(500).json({ message: 'Error generating QR code' })
    }

    // Update ticket status
    ticket.status = 'paid'
    ticket.qrCode = qrCode
    await ticket.save()

    // Update event tickets sold
    await Event.findByIdAndUpdate(ticket.event._id, {
      $inc: { registered: 1 },
    })

    // Emit to user
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

// Get single ticket - SECURITY ENHANCED
const getTicket = async (req, res) => {
  try {
    console.log('📥 Incoming request params:', req.params)
    console.log('🎯 ticketId param:', req.params.ticketId)
    console.log('🔍 Searching ticketId:', req.params.ticketId)

    const ticket = await Ticket.findOne({
      ticketId: req.params.ticketId,
    })
      .populate('event')
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

// Verify QR ticket for check-in - SECURITY ENHANCED
const verifyTicket = async (req, res) => {
  try {
    const { ticketId } = req.params
    const userId = req.user.id

    const ticket = await Ticket.findOne({ ticketId }).populate('event')

    if (!ticket) {
      return res.status(404).json({
        valid: false,
        message: 'Ticket not found',
      })
    }

    // SECURITY: Check if user is event organizer or admin
    const isOrganizer = ticket.event.organiser.toString() === userId
    const isAdmin = req.user.role === 'admin'

    if (!isOrganizer && !isAdmin) {
      return res.status(403).json({
        valid: false,
        message: 'Not authorized to verify tickets',
      })
    }

    // SECURITY: Validate ticket exists
    if (!ticket) {
      return res.status(404).json({
        valid: false,
        message: 'Ticket not found',
      })
    }

    // SECURITY: Check if already checked in
    if (ticket.status === 'checked_in') {
      return res.status(400).json({
        valid: false,
        message: 'Ticket already checked in',
        checkedInAt: ticket.checkedInAt,
        attendee: ticket.user?.name || 'Unknown',
      })
    }

    // SECURITY: Check if paid
    if (ticket.status !== 'paid') {
      return res.status(400).json({
        valid: false,
        message: 'Ticket not paid',
        status: ticket.status,
      })
    }

    // SECURITY: Double-check status is not 'checked_in' (race condition prevention)
    if (ticket.status === 'checked_in') {
      return res.status(400).json({
        valid: false,
        message: 'Ticket already checked in',
      })
    }

    // Perform check-in
    ticket.status = 'checked_in'
    ticket.checkedInAt = new Date()
    await ticket.save()

    // Emit to organizer
    emitToOrganizer(ticket.event.organiser.toString(), 'checkinSuccess', {
      ticketId,
      eventId: ticket.event._id,
      checkedInAt: ticket.checkedInAt,
    })

    // Audit log
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

// Get attendees for an event (organizer only)
const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params
    const userId = req.user.id

    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Security: Only organizer can view attendees
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

module.exports = {
  createTicket,
  verifyPaymentAndActivateTicket,
  activateTicket,
  getMyTickets,
  getTicket,
  verifyTicket,
  getEventAttendees,
}
