import { useParams, useOutletContext } from "react-router-dom"
import ChatBox from "../components/Chat/ChatBox"

const ChatBoxWrapper = () => {
  const params = useParams()
  const eventId = params?.eventId
  const receiverId = params?.userId
  const { receiverName } = useOutletContext() || {}

  console.log("📦 ChatBoxWrapper:", { eventId, receiverId, receiverName })

  if (!eventId || !receiverId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Select a chat
      </div>
    )
  }

  return (
    <ChatBox
      key={`${eventId}-${receiverId}`}
      eventId={eventId}
      receiverId={receiverId}
      receiverName={receiverName}
    />
  )
}

export default ChatBoxWrapper