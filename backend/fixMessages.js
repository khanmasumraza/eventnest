const mongoose = require('mongoose')
const Message = require('./models/Message')
const User = require('./models/User')

mongoose.connect(process.env.MONGO_URI)

async function fixMessages() {
  try {
    const messages = await Message.find({
      $or: [{ senderName: 'User' }, { receiverName: 'User' }],
    })

    console.log(`Found ${messages.length} messages to fix`)

    for (const msg of messages) {
      try {
        const sender = await User.findById(msg.senderId).select('name email')
        const receiver = await User.findById(msg.receiverId).select(
          'name email',
        )

        const newSenderName =
          sender?.name || sender?.email?.split('@')[0] || 'User'

        const newReceiverName =
          receiver?.name || receiver?.email?.split('@')[0] || 'User'

        await Message.updateOne(
          { _id: msg._id },
          {
            $set: {
              senderName: newSenderName,
              receiverName: newReceiverName,
            },
          },
        )
      } catch (innerErr) {
        console.log('Skipping message:', msg._id)
      }
    }

    console.log('✅ All old messages updated successfully')
    process.exit(0)
  } catch (err) {
    console.error('❌ Error fixing messages:', err)
    process.exit(1)
  }
}

fixMessages()
