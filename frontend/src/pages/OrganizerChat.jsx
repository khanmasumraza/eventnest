import React from "react"
import { useParams } from "react-router-dom"
import ChatBox from "../components/Chat/ChatBox"

function OrganizerChat() {
  const { eventId, userId } = useParams()

  console.log("🧑‍💼 Organizer 1:1 Chat loaded")
  console.log("Event ID:", eventId)
  console.log("User ID:", userId)

  if (!eventId?.match(/^[0-9a-fA-F]{24}$/) || !userId?.match(/^[0-9a-fA-F]{24}$/)) {
    console.error("Invalid navigation IDs", eventId, userId);
    return <div className="text-white p-8 text-center">Invalid chat IDs</div>
  }
  console.log("CHAT NAV:", { eventId: eventId, userId: userId });

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
          Chat with Attendee #{userId.slice(-4)}
        </h2>
        <ChatBox eventId={eventId} userId={userId} />
      </div>
    </div>
  )
}

export default OrganizerChat
