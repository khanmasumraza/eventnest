const express = require('express')
const router = express.Router()
const { protect, isOrganizer } = require('../middleware/authMiddleware')
const organizerController = require('../controllers/organizerController')

// All routes require authentication and organizer role
router.use(protect)
router.use(isOrganizer)

// Dashboard
router.get('/dashboard', organizerController.getDashboardStats)

// Events
router.get('/events', organizerController.getOrganizerEvents)
router.patch('/events/:eventId/status', organizerController.updateEventStatus)

// Attendees
router.get('/event/:eventId/attendees', organizerController.getEventAttendees)

// Messages
router.get('/event/:eventId/messages', organizerController.getEventMessages)
router.post('/event/:eventId/messages', organizerController.sendMessage)

// Create event
router.post('/events', organizerController.createEvent)

// All routes require authentication and organizer role
router.use(protect)
router.use(isOrganizer)

// Dashboard
router.get('/dashboard', organizerController.getDashboardStats)

// Events
router.get('/events', organizerController.getOrganizerEvents)
router.patch('/events/:eventId/status', organizerController.updateEventStatus)

// Attendees
router.get('/event/:eventId/attendees', organizerController.getEventAttendees)

// Messages
router.get('/event/:eventId/messages', organizerController.getEventMessages)
router.post('/event/:eventId/messages', organizerController.sendMessage)

module.exports = router
