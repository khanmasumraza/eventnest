const express = require('express')
const router = express.Router()
const { protect } = require('../middleware/authMiddleware')
const {
  getChatMessages,
  sendChatMessage,
  getConversations,
  uploadFile,
} = require('../controllers/chatController')
const organizerController = require('../controllers/organizerController')

// ✅ User conversations
router.get('/conversations', protect, getConversations)

// ✅ File upload
router.post('/upload', protect, uploadFile)

// ✅ Organizer conversations (inbox)
router.get(
  '/organizer/conversations',
  protect,
  organizerController.getOrganizerConversations,
)

// ✅ FIXED: messages route now uses :userId only — no :eventId
router.get('/:userId/messages', protect, getChatMessages)

// ✅ Send message still uses :eventId/:userId — socket needs eventId for room auth
router.post('/:eventId/:userId/messages', protect, sendChatMessage)

module.exports = router