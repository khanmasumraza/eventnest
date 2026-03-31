import { useParams, useOutletContext } from "react-router-dom"
import ChatBox from "../components/Chat/ChatBox"

const ChatBoxWrapper = () => {
  const { userId } = useParams()
  // ✅ eventId comes from ChatInbox outlet context (most recent event for socket room)
  const { receiverName, eventId } = useOutletContext() || {}

  console.log("📦 ChatBoxWrapper:", { userId, eventId, receiverName })

  if (!userId) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        Select a chat
      </div>
    )
  }

  return (
    <ChatBox
      key={userId}
      eventId={eventId}
      receiverId={userId}
      receiverName={receiverName}
    />
  )
}

export default ChatBoxWrapper