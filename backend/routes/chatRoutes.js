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

// ✅ File upload — NEW
router.post('/upload', protect, uploadFile)

// ✅ Organizer conversations (inbox)
router.get(
  '/organizer/conversations',
  protect,
  organizerController.getOrganizerConversations,
)

// ✅ 1:1 chat routes — UNTOUCHED
router.get('/:eventId/:userId/messages', protect, getChatMessages)
router.post('/:eventId/:userId/messages', protect, sendChatMessage)

module.exports = router