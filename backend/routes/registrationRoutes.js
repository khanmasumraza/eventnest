const express = require('express')
const router = express.Router()

const { protect } = require('../middleware/authMiddleware')
const Registration = require('../models/Registration')
const Event = require('../models/Event')
const User = require('../models/User')

// GET /api/registrations/my-tickets - Get all tickets for the current user
router.get('/my-tickets', protect, async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
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
        paymentStatus: reg.paymentStatus,
        createdAt: reg.createdAt,
      }
    })

    res.status(200).json(tickets)
  } catch (error) {
    console.error('Get my tickets error:', error)
    res
      .status(500)
      .json({ message: 'Error fetching tickets', error: error.message })
  }
})

// GET /api/registrations/:eventId/registration-status - Check registration status for an event
router.get('/:eventId/registration-status', protect, async (req, res) => {
  try {
    const registration = await Registration.findOne({
      event: req.params.eventId,
      user: req.user._id,
    })

    if (registration) {
      return res.status(200).json({
        registered: true,
        ticketId: registration.ticketId,
      })
    }

    res.status(200).json({
      registered: false,
      ticketId: null,
    })
  } catch (error) {
    console.error('Check registration error:', error)
    res
      .status(500)
      .json({ message: 'Error checking registration', error: error.message })
  }
})

// POST /api/registrations/upi - Create registration with UPI payment
router.post('/upi', protect, async (req, res) => {
  try {
    const { eventId, upiId, utrNumber, name, email, phone } = req.body

    // Find the event
    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({ message: 'Event not found' })
    }

    // Check if already registered
    const existingRegistration = await Registration.findOne({
      event: eventId,
      user: req.user._id,
    })

    if (existingRegistration) {
      return res.status(400).json({
        message: 'You have already registered for this event',
      })
    }

    // Check event capacity
    const registrationCount = await Registration.countDocuments({
      event: eventId,
    })
    if (event.capacity && registrationCount >= event.capacity) {
      return res.status(400).json({ message: 'Event is full' })
    }

    // Check if event is free or paid
    const isFreeEvent = !event.price || event.price === 0

    // Create registration with UPI payment details
    const registration = new Registration({
      event: eventId,
      user: req.user._id,
      amount: event.price || 0,
      paymentMethod: 'upi',
      upiId: upiId || '',
      utrNumber: utrNumber || '',
      attendeeInfo: {
        name: name || req.user.name,
        email: email || req.user.email,
        phone: phone || req.user.phone,
      },
      // For free events, mark as verified immediately
      // For paid events, status is pending until organizer verifies
      paymentStatus: isFreeEvent ? 'verified' : 'pending',
      status: isFreeEvent ? 'paid' : 'pending',
    })

    await registration.save()

    // Update event registered count
    event.registered = (event.registered || 0) + 1
    await event.save()

    res.status(201).json({
      success: true,
      message: isFreeEvent
        ? 'Registration successful! Your ticket is confirmed.'
        : 'Payment pending. Your ticket will be activated after organizer verifies your payment.',
      registration: {
        ticketId: registration.ticketId,
        paymentStatus: registration.paymentStatus,
        status: registration.status,
      },
    })
  } catch (error) {
    console.error('UPI registration error:', error)
    res.status(500).json({
      message: 'Error creating registration',
      error: error.message,
    })
  }
})

// PUT /api/registrations/:id/verify - Organizer verifies UPI payment
router.put('/:id/verify', protect, async (req, res) => {
  try {
    // Check if user is organizer
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        message: 'Only organizers can verify payments',
      })
    }

    const registration = await Registration.findById(req.params.id)
      .populate('event')
      .populate('user')

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    // Verify that the organizer owns this event
    if (registration.event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only verify payments for your own events',
      })
    }

    // Update payment status
    registration.paymentStatus = 'verified'
    registration.status = 'paid'
    await registration.save()

    res.status(200).json({
      success: true,
      message: 'Payment verified successfully',
      registration: {
        ticketId: registration.ticketId,
        paymentStatus: registration.paymentStatus,
        status: registration.status,
      },
    })
  } catch (error) {
    console.error('Verify payment error:', error)
    res.status(500).json({
      message: 'Error verifying payment',
      error: error.message,
    })
  }
})

// PUT /api/registrations/:id/reject - Organizer rejects UPI payment
router.put('/:id/reject', protect, async (req, res) => {
  try {
    // Check if user is organizer
    if (req.user.role !== 'organizer') {
      return res.status(403).json({
        message: 'Only organizers can reject payments',
      })
    }

    const registration = await Registration.findById(req.params.id).populate(
      'event',
    )

    if (!registration) {
      return res.status(404).json({ message: 'Registration not found' })
    }

    // Verify that the organizer owns this event
    if (registration.event.organizer.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: 'You can only reject payments for your own events',
      })
    }

    // Update payment status
    registration.paymentStatus = 'failed'
    registration.status = 'cancelled'
    await registration.save()

    // Decrease event registered count
    await Event.findByIdAndUpdate(registration.event._id, {
      $inc: { registered: -1 },
    })

    res.status(200).json({
      success: true,
      message: 'Payment rejected',
    })
  } catch (error) {
    console.error('Reject payment error:', error)
    res.status(500).json({
      message: 'Error rejecting payment',
      error: error.message,
    })
  }
})

module.exports = router
