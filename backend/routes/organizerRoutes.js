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

// Create event
router.post('/events', organizerController.createEvent)

module.exports = router
