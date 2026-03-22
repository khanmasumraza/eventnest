const express = require('express')
const router = express.Router()
const uploadQR = require('../middleware/uploadQR')

const {
  createEvent,
  getAllEvents,
  getEventById,
  getEventByIdPublic,
  getEventAttendees,
  checkRegistrationStatus,
  getMyTicket,
  registerForEvent,
  cancelRegistration,
  getMyEvents,
  getPendingEvents,
  approveEvent,
  rejectEvent,
  joinWaitlist,
  leaveWaitlist,
  getWaitlistStatus,
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
} = require('../controllers/eventController')

const { protect } = require('../middleware/authMiddleware')

/* ---------------------------------------------------------- */
/* PUBLIC ROUTES */
/* ---------------------------------------------------------- */

router.get('/', getAllEvents)
router.get('/trending', getTrendingEvents)
router.get('/nearby', getNearbyEvents)

/* ---------------------------------------------------------- */
/* USER ROUTES (PROTECTED) */
/* ---------------------------------------------------------- */

router.get('/recommended', protect, getRecommendedEvents)
router.get('/favorites', protect, getFavoriteEvents)

router.get('/my-events', protect, getMyEvents)
router.get('/my-registrations', protect, getMyRegistrations)
router.get('/my-tickets', protect, getMyTickets)
router.get('/my-reminders', protect, getMyReminders)

/* ---------------------------------------------------------- */
/* ADMIN ROUTES */
/* ---------------------------------------------------------- */

router.get('/admin/events/pending', protect, getPendingEvents)
router.put('/admin/events/:id/approve', protect, approveEvent)
router.put('/admin/events/:id/reject', protect, rejectEvent)

/* ---------------------------------------------------------- */
/* EVENT CREATION */
/* ---------------------------------------------------------- */

router.post('/', protect, uploadQR.single('organizerQrImage'), createEvent)

/* ---------------------------------------------------------- */
/* CHECK-IN */
/* ---------------------------------------------------------- */

router.post('/checkin', protect, checkInTicket)

/* ---------------------------------------------------------- */
/* FAVORITES */
/* ---------------------------------------------------------- */

router.post('/:id/favorite', protect, toggleFavorite)

/* ---------------------------------------------------------- */
/* REMINDERS */
/* ---------------------------------------------------------- */

router.post('/:id/reminder', protect, setReminder)

/* ---------------------------------------------------------- */
/* WAITLIST */
/* ---------------------------------------------------------- */

router.post('/:id/waitlist', protect, joinWaitlist)
router.delete('/:id/waitlist', protect, leaveWaitlist)
router.get('/:id/waitlist-status', protect, getWaitlistStatus)

/* ---------------------------------------------------------- */
/* REGISTRATION */
/* ---------------------------------------------------------- */

router.post('/:id/register', protect, registerForEvent)
router.delete('/:id/register', protect, cancelRegistration)
router.get('/:id/registration-status', protect, checkRegistrationStatus)
router.get('/:id/ticket', protect, getMyTicket)

/* ---------------------------------------------------------- */
/* EVENT DETAILS */
/* ---------------------------------------------------------- */

router.get('/:id/attendees', getEventAttendees)
router.get('/:id/share', getEventShare)
router.get('/:id/updates', getEventUpdates)

/* ---------------------------------------------------------- */
/* EVENT BY ID (KEEP LAST) */
/* ---------------------------------------------------------- */

router.get('/:id', getEventByIdPublic)

module.exports = router