const express = require('express')
const router = express.Router()
const User = require('../models/User')
const uploadQR = require('../middleware/uploadQR')
const { protect } = require('../middleware/authMiddleware')

// Regex for UPI ID validation
const upiIdRegex = /^[a-zA-Z0-9.-_]{2,256}@[a-zA-Z]{2,64}$/

// @route   POST /api/organizer/payment-setup
// @desc    Set up organizer payment (UPI ID and QR code)
// @access  Private (organizer only)
router.post(
  '/payment-setup',
  protect,
  uploadQR.single('qrCode'),
  async (req, res) => {
    try {
      const user = req.user

      // Check if user is organizer
      if (user.role !== 'organizer') {
        return res.status(403).json({
          message: 'Only organizers can set up payment details',
        })
      }

      const { upiId } = req.body

      // Validate UPI ID format if provided
      if (upiId && !upiIdRegex.test(upiId)) {
        return res.status(400).json({
          message: 'Invalid UPI ID format. Example: yourname@upi',
        })
      }

      // Get the user from database to update
      const dbUser = await User.findById(user._id)
      if (!dbUser) {
        return res.status(404).json({ message: 'User not found' })
      }

      // Update payment details
      if (upiId) {
        dbUser.organizerPayment = dbUser.organizerPayment || {}
        dbUser.organizerPayment.upiId = upiId
      }

      // If QR code was uploaded, save its path
      if (req.file) {
        dbUser.organizerPayment = dbUser.organizerPayment || {}
        dbUser.organizerPayment.qrCode = `/uploads/paymentQR/${req.file.filename}`
      }

      await dbUser.save()

      res.status(200).json({
        success: true,
        message: 'Payment setup updated successfully',
        organizerPayment: dbUser.organizerPayment,
      })
    } catch (error) {
      console.error('Payment setup error:', error)
      res.status(500).json({
        message: 'Error setting up payment. Please try again.',
      })
    }
  },
)

// @route   GET /api/organizer/payment-setup
// @desc    Get organizer payment details
// @access  Private (organizer only)
router.get('/payment-setup', protect, async (req, res) => {
  try {
    const user = req.user

    // Check if user is organizer
    if (user.role !== 'organizer') {
      return res.status(403).json({
        message: 'Only organizers can access payment details',
      })
    }

    const dbUser = await User.findById(user._id)
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json({
      organizerPayment: dbUser.organizerPayment || { upiId: '', qrCode: '' },
    })
  } catch (error) {
    console.error('Get payment setup error:', error)
    res.status(500).json({
      message: 'Error fetching payment details',
    })
  }
})

// @route   GET /api/organizer/:id/payment-info
// @desc    Get public payment info for an organizer (for checkout)
// @access  Public
router.get('/:id/payment-info', async (req, res) => {
  try {
    const organizer = await User.findById(req.params.id)

    if (!organizer) {
      return res.status(404).json({ message: 'Organizer not found' })
    }

    // Only return payment info for organizers
    if (organizer.role !== 'organizer') {
      return res.status(404).json({ message: 'Organizer not found' })
    }

    // Return public payment info (only upiId and qrCode)
    res.status(200).json({
      organizerPayment: {
        upiId: organizer.organizerPayment?.upiId || '',
        qrCode: organizer.organizerPayment?.qrCode || '',
      },
      organizerName: organizer.organizerName || organizer.name,
    })
  } catch (error) {
    console.error('Get payment info error:', error)
    res.status(500).json({
      message: 'Error fetching payment info',
    })
  }
})

module.exports = router
