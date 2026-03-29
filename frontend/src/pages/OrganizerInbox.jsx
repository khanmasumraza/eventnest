import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import api from '../utils/api'

function OrganizerInbox() {
  const [conversations, setConversations] = useState([])
  const [loading, setLoading] = useState(true)
  const { user } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    fetchConversations()
  }, [])

  const fetchConversations = async () => {
    try {
      setLoading(true)
      const response = await api.get('/chat/organizer/conversations')
      setConversations(response.data.conversations || [])
    } catch (error) {
      console.error('Fetch conversations error:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 p-6">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
          <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
          Chat Inbox
        </h1>

        {conversations.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <div className="text-4xl mb-4">💬</div>
            <p className="text-lg mb-2">No conversations yet</p>
            <p>Create an event and wait for attendee messages</p>
          </div>
        ) : (
          <div className="space-y-2">
            {conversations.map((conv) => (
              <div
                key={conv._id}
                className="group bg-slate-800 hover:bg-slate-700 p-4 rounded-2xl cursor-pointer transition-all border border-slate-700 hover:border-slate-600 hover:shadow-lg"
                onClick={() => {
                  const eventId = conv.eventId;
                  const userId = conv.userId;
                  if (!eventId?.match(/^[0-9a-fA-F]{24}$/) || !userId?.match(/^[0-9a-fA-F]{24}$/)) {
                    console.error("Invalid navigation IDs", eventId, userId);
                    return;
                  }
                  console.log("CHAT NAV:", { eventId, userId });
                  navigate(`/chat/${eventId}/${userId}`);
                }}
              >
                <div className="flex items-center justify-between mb-1">
                  <h3 className="font-semibold text-white truncate">{conv.userName}</h3>
                  <span className="text-xs text-gray-400">{conv.lastMessageTime}</span>
                </div>
                <p className="text-sm text-gray-300 truncate">{conv.lastMessage}</p>
                <div className="flex items-center gap-2 mt-1 opacity-75">
                  <div className="w-2 h-2 bg-green-400 rounded-full" />
                  {conv.unreadCount > 0 && (
                    <span className="text-xs bg-indigo-500 text-white px-2 py-1 rounded-full">
                      {conv.unreadCount}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default OrganizerInbox
