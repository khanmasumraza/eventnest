// Payout Controller
const User = require('../models/User')
const PaymentAudit = require('../models/PaymentAudit')

// Process withdrawal request
const processWithdraw = async (req, res) => {
  try {
    const { amount, accountNumber, ifsc, accountHolderName } = req.body
    const organizerId = req.user.id

    // Validation
    if (!amount || amount <= 0 || amount > 100000) {
      return res.status(400).json({
        success: false,
        message: 'Invalid amount (max ₹1,00,000)',
      })
    }

    if (!accountNumber || !ifsc || !accountHolderName) {
      return res.status(400).json({
        success: false,
        message: 'Bank details required',
      })
    }

    const organizer = await User.findById(organizerId)
    if (organizer.role !== 'organizer') {
      return res.status(403).json({
        success: false,
        message: 'Only organizers can withdraw',
      })
    }

    if (organizer.balance < amount) {
      return res.status(400).json({
        success: false,
        message: `Insufficient balance. Available: ₹${organizer.balance.toFixed(2)}`,
      })
    }

    // Deduct balance (transaction-like)
    organizer.balance -= amount
    organizer.withdrawalRequests = organizer.withdrawalRequests || []
    organizer.withdrawalRequests.push({
      amount,
      accountNumber,
      ifsc,
      accountHolderName,
      status: 'pending',
      requestedAt: new Date(),
    })
    await organizer.save()

    // Audit log
    await PaymentAudit.create({
      userId: organizerId,
      action: 'WITHDRAWAL_REQUEST',
      status: 'pending',
      data: { amount, accountNumber: accountNumber.slice(-4), ifsc },
    })

    res.json({
      success: true,
      message:
        'Withdrawal request submitted. Processed within 2-3 business days.',
      newBalance: organizer.balance.toFixed(2),
      requestId:
        organizer.withdrawalRequests[organizer.withdrawalRequests.length - 1]
          ._id,
    })
  } catch (error) {
    console.error('Withdrawal error:', error)
    res.status(500).json({
      success: false,
      message: 'Withdrawal request failed',
    })
  }
}

// Get withdrawal history
const getWithdrawalHistory = async (req, res) => {
  try {
    const organizerId = req.user.id
    const organizer =
      await User.findById(organizerId).select('withdrawalRequests')

    res.json({
      success: true,
      withdrawals: organizer.withdrawalRequests || [],
    })
  } catch (error) {
    console.error('Get withdrawals error:', error)
    res.status(500).json({
      success: false,
      message: 'Failed to fetch history',
    })
  }
}

module.exports = {
  processWithdraw,
  getWithdrawalHistory,
}
