const crypto = require('crypto')
const PaymentAudit = require('../models/PaymentAudit')
const logger = require('../utils/logger')

const verifyRazorpayWebhook = async (req, res, next) => {
  try {
    const signature = req.headers['x-razorpay-signature']
    const payload = JSON.stringify(req.body)
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET

    if (!webhookSecret) {
      return res.status(500).json({ error: 'Webhook secret not configured' })
    }

    if (!signature) {
      logger.paymentLogger.error('WEBHOOK_NO_SIGNATURE', { ip: req.ip })
      return res.status(401).json({ error: 'Missing signature' })
    }

    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex')

    if (
      !crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature),
      )
    ) {
      logger.paymentLogger.error('WEBHOOK_INVALID_SIGNATURE', { ip: req.ip })
      return res.status(401).json({ error: 'Invalid signature' })
    }

    // Idempotency check (prevents duplicate processing)
    const eventId = req.body.event?.id || req.body.id
    if (eventId) {
      const existingAudit = await PaymentAudit.findOne({
        webhookEventId: eventId,
      })
      if (existingAudit) {
        logger.paymentLogger.info('WEBHOOK_DUPLICATE', { eventId, ip: req.ip })
        return res.status(200).json({ message: 'Duplicate webhook ignored' })
      }
    }

    logger.paymentLogger.info('WEBHOOK_VERIFIED', {
      eventId,
      eventType: req.body.event?.type,
    })
    next()
  } catch (error) {
    logger.paymentLogger.error('WEBHOOK_VERIFY_ERROR', {
      error: error.message,
      ip: req.ip,
    })
    res.status(400).json({ error: 'Webhook verification failed' })
  }
}

module.exports = { verifyRazorpayWebhook }
