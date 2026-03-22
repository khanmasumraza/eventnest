const QRCode = require('qrcode')

/**
 * Generate QR code for ticket containing ticket data
 * @param {Object} data - {ticketId, eventId, userId}
 * @param {Object} options - QR options
 * @returns {Promise<string>} base64 QR image
 */
const generateTicketQR = async (data, options = {}) => {
  const defaultOptions = {
    width: 300,
    margin: 2,
    color: {
      dark: '#000000',
      light: '#FFFFFF',
    },
    ...options,
  }

  try {
    const qrData = JSON.stringify(data)
    const qrCode = await QRCode.toDataURL(qrData, defaultOptions)
    return qrCode
  } catch (error) {
    console.error('QR generation failed:', error)
    throw new Error('Failed to generate QR code')
  }
}

/**
 * Generate share QR for event page
 * @param {string} shareUrl
 * @param {Object} options
 * @returns {Promise<string>}
 */
const generateShareQR = async (shareUrl, options = {}) => {
  const defaultOptions = {
    width: 220,
    margin: 1,
    ...options,
  }

  return QRCode.toDataURL(shareUrl, defaultOptions)
}

module.exports = {
  generateTicketQR,
  generateShareQR,
}
