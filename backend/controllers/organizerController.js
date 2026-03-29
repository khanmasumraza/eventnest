const Event = require('../models/Event')
const Ticket = require('../models/Registration')
const Payment = require('../models/Payment')
const User = require('../models/User')
const Message = require('../models/Message')

// Get organizer dashboard statistics
const getDashboardStats = async (req, res) => {
  try {
    const organizerId = req.user.id

    // Get all events by organizer
    const events = await Event.find({ organiser: organizerId })
    const eventIds = events.map((e) => e._id)

    // Total events
    const totalEvents = events.length

    // Published events
    const publishedEvents = events.filter(
      (e) => e.status === 'published',
    ).length

    // Upcoming events
    const upcomingEvents = events.filter(
      (e) => e.status === 'published' && new Date(e.date) > new Date(),
    ).length

    // Total tickets sold
    const ticketsSold = await Ticket.countDocuments({
      event: { $in: eventIds },
      status: { $in: ['paid', 'checked_in'] },
    })

    // Total revenue
    const payments = await Payment.aggregate([
      {
        $match: {
          event: { $in: eventIds },
          status: 'verified',
        },
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
        },
      },
    ])
    const revenue = payments[0]?.total || 0

    // Pending payments
    const pendingPayments = await Payment.countDocuments({
      event: { $in: eventIds },
      status: 'pending',
    })

    // Checked in count
    const checkedIn = await Ticket.countDocuments({
      event: { $in: eventIds },
      status: 'checked_in',
    })

    res.status(200).json({
      success: true,
      data: {
        totalEvents,
        publishedEvents,
        upcomingEvents,
        ticketsSold,
        revenue,
        pendingPayments,
        checkedIn,
      },
    })
  } catch (error) {
    console.error('Get dashboard stats error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching dashboard statistics',
    })
  }
}

// Create event
const createEvent = async (req, res) => {
  try {
    const organizerId = req.user.id
    const eventData = req.body

    // Basic validation
    if (
      !eventData.title ||
      !eventData.description ||
      !eventData.capacity ||
      !eventData.date
    ) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: title, description, capacity, date',
      })
    }

    // Create event
    const newEvent = new Event({
      ...eventData,
      organiser: organizerId,
      status: 'pending', // Organizer created → pending admin approval
    })

    await newEvent.save()

    res.status(201).json({
      success: true,
      message: 'Event created successfully',
      data: {
        event: newEvent,
      },
    })
  } catch (error) {
    console.error('Create event error:', error)
    res.status(500).json({
      success: false,
      message: 'Error creating event',
      error: error.message,
    })
  }
}

// Get attendees for an event
const getEventAttendees = async (req, res) => {
  try {
    const { eventId } = req.params
    const { page = 1, limit = 20, search = '' } = req.query
    const organizerId = req.user.id

    // Verify event belongs to organizer
    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      })
    }

    if (event.organiser.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    // Build search query
    const searchQuery = search
      ? {
          $or: [
            { 'user.name': { $regex: search, $options: 'i' } },
            { 'user.email': { $regex: search, $options: 'i' } },
          ],
        }
      : {}

    // Get attendees with pagination
    const attendees = await Ticket.find({ event: eventId })
      .populate('user', 'name email phone')
      .populate({
        path: 'payment',
        select: 'amount status method referenceId createdAt',
      })
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await Ticket.countDocuments({ event: eventId })

    // Transform data
    const formattedAttendees = attendees.map((ticket) => ({
      ticketId: ticket.ticketId,
      name: ticket.user?.name || 'Unknown',
      email: ticket.user?.email || 'Unknown',
      phone: ticket.user?.phone || '',
      ticketType: ticket.ticketType || 'General',
      paymentStatus:
        ticket.status === 'paid' || ticket.status === 'checked_in'
          ? 'Paid'
          : 'Pending',
      checkinStatus:
        ticket.status === 'checked_in' ? 'Checked In' : 'Not Checked In',
      paymentAmount: ticket.payment?.amount || 0,
      paymentMethod: ticket.payment?.method || 'upi',
      registeredAt: ticket.createdAt,
    }))

    res.status(200).json({
      success: true,
      data: {
        attendees: formattedAttendees,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Get attendees error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching attendees',
    })
  }
}

// Get event messages
const getEventMessages = async (req, res) => {
  try {
    const { eventId } = req.params
    const { page = 1, limit = 50 } = req.query

    const messages = await Message.find({ event: eventId })
      .populate('senderId', 'name profileImage')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await Message.countDocuments({ event: eventId })

    res.status(200).json({
      success: true,
      data: {
        messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Get messages error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching messages',
    })
  }
}

// Send message (organizer can broadcast)
const sendMessage = async (req, res) => {
  try {
    const { eventId } = req.params
    const { message } = req.body
    const organizerId = req.user.id

    // Verify event belongs to organizer
    const event = await Event.findById(eventId)
    if (!event || event.organiser.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    const newMessage = new Message({
      event: eventId,
      senderId: organizerId,
      senderName: 'Organizer',
      message,
    })

    await newMessage.save()

    // Emit to event room
    const { emitToEvent } = require('../socket')
    emitToEvent(eventId, 'receiveMessage', {
      _id: newMessage._id,
      senderName: 'Organizer',
      message,
      createdAt: newMessage.createdAt,
    })

    res.status(201).json({
      success: true,
      data: newMessage,
    })
  } catch (error) {
    console.error('Send message error:', error)
    res.status(500).json({
      success: false,
      message: 'Error sending message',
    })
  }
}

// Get organizer events with stats
const getOrganizerEvents = async (req, res) => {
  try {
    const organizerId = req.user.id
    const { status, page = 1, limit = 10 } = req.query

    const query = { organiser: organizerId }
    if (status) {
      query.status = status
    }

    const events = await Event.find(query)
      .populate('organiser', 'name')
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit))

    const total = await Event.countDocuments(query)

    // Get ticket stats for each event
    const eventsWithStats = await Promise.all(
      events.map(async (event) => {
        const ticketsSold = await Ticket.countDocuments({
          event: event._id,
          status: { $in: ['paid', 'checked_in'] },
        })

        const revenue = await Payment.aggregate([
          {
            $match: {
              event: event._id,
              status: 'verified',
            },
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
            },
          },
        ])

        return {
          ...event.toObject(),
          ticketsSold,
          revenue: revenue[0]?.total || 0,
          seatsLeft: event.capacity - event.registered,
        }
      }),
    )

    res.status(200).json({
      success: true,
      data: {
        events: eventsWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit)),
        },
      },
    })
  } catch (error) {
    console.error('Get organizer events error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching events',
    })
  }
}

// Update event status (publish/unpublish)
const updateEventStatus = async (req, res) => {
  try {
    const { eventId } = req.params
    const { status } = req.body
    const organizerId = req.user.id

    const event = await Event.findById(eventId)
    if (!event) {
      return res.status(404).json({
        success: false,
        message: 'Event not found',
      })
    }

    if (event.organiser.toString() !== organizerId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      })
    }

    event.status = status
    await event.save()

    res.status(200).json({
      success: true,
      data: {
        event,
      },
    })
  } catch (error) {
    console.error('Update event status error:', error)
    res.status(500).json({
      success: false,
      message: 'Error updating event status',
    })
  }
}

// Get organizer conversations list (for inbox)
const getOrganizerConversations = async (req, res) => {
  try {
    const organizerId = req.user.id
    const { page = 1, limit = 20 } = req.query

    // Get all conversations where organizer is participant
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: organizerId }, { receiverId: organizerId }],
        },
      },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            userId: {
              $cond: {
                if: { $eq: ['$senderId', organizerId] },
                then: '$receiverId',
                else: '$senderId',
              },
            },
          },
          lastMessage: { $last: '$message' },
          lastMessageTime: { $last: '$createdAt' },
          userName: {
            $last: {
              $cond: {
                if: { $eq: ['$senderId', organizerId] },
                then: '$senderName',
                else: { $literal: 'Attendee' },
              },
            },
          },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', organizerId] },
                    { $ne: ['$status', 'seen'] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { lastMessageTime: -1 } },
      { $skip: (parseInt(page) - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
      {
        $lookup: {
          from: 'events',
          localField: '_id.eventId',
          foreignField: '_id',
          as: 'event',
        },
      },
      { $unwind: { path: '$event', preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          eventId: '$_id.eventId',
          userId: '$_id.userId',
          userName: 1,
          eventTitle: '$event.title',
          lastMessage: 1,
          lastMessageTime: 1,
          unreadCount: 1,
        },
      },
    ])

    const total = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: organizerId }, { receiverId: organizerId }],
        },
      },
      {
        $group: {
          _id: {
            eventId: '$eventId',
            userId: {
              $cond: {
                if: { $eq: ['$senderId', organizerId] },
                then: '$receiverId',
                else: '$senderId',
              },
            },
          },
        },
      },
      { $count: 'total' },
    ])

    res.json({
      success: true,
      conversations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: total[0]?.total || 0,
        pages: Math.ceil((total[0]?.total || 0) / parseInt(limit)),
      },
    })
  } catch (error) {
    console.error('Get conversations error:', error)
    res.status(500).json({
      success: false,
      message: 'Error fetching conversations',
    })
  }
}

module.exports = {
  getDashboardStats,
  createEvent,
  getEventAttendees,
  getEventMessages,
  sendMessage,
  getOrganizerEvents,
  updateEventStatus,
  getOrganizerConversations,
}
