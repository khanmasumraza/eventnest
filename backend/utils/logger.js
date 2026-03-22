const winston = require('winston')

// Winston logger for payments
const paymentLogger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    // File logger with rotation
    new winston.transports.File({
      filename: 'logs/payments.log',
      maxsize: 5242880,
      maxFiles: 5,
    }),
    // Error logger
    new winston.transports.File({
      filename: 'logs/payments.error.log',
      level: 'error',
    }),
    // Console for dev
    new winston.transports.Console({
      format: winston.format.simple(),
    }),
  ],
})

module.exports = {
  paymentLogger,
  logPaymentEvent(type, data, error = null) {
    const logData = { ...data, type, timestamp: new Date().toISOString() }
    if (error) logData.error = error.message || error

    paymentLogger.info('PAYMENT_EVENT', logData)
  },
  logWebhook(eventId, verified, action) {
    paymentLogger.info('WEBHOOK', { eventId, verified, action })
  },
}
