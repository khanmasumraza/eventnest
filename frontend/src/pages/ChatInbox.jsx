import React, { useState, useEffect, useMemo } from "react"
import { useNavigate, useParams, Outlet, useLocation } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import { useSocket } from "../context/SocketContext"
import { useChatContext } from "../context/chatContext"

const ChatInbox = () => {
  const [conversations, setConversations] = useState([])
  const { user } = useAuth()
  const { socket } = useSocket()
  const { unreadMap, incrementUnread, clearUnread } = useChatContext()
  const navigate = useNavigate()
  const location = useLocation()
  const stateEventId = location.state?.eventId || null
  // ✅ Only userId in URL now — no eventId
  const { userId } = useParams()

  // =========================
  // FETCH CONVERSATIONS
  // =========================
  useEffect(() => {
    const fetchConversations = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("http://localhost:5000/api/chat/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()

        if (data.success) {
          const myId = user?._id?.toString()

          const mapped = data.conversations
            .map((conv) => ({
              ...conv,
              eventId: conv.eventId?.toString(),
              userId: conv.userId?.toString(),
              createdAt: conv.updatedAt || conv.createdAt,
            }))
            .filter((conv) => conv.userId && conv.userId !== myId)

          // ✅ merge by userId only
          setConversations((prev) => {
            const map = new Map()
            mapped.forEach((c) => map.set(c.userId, c))
            prev.forEach((c) => {
              if (!map.has(c.userId)) map.set(c.userId, c)
            })
            return Array.from(map.values())
          })
        }
      } catch (err) {
        console.error("❌ Fetch conversations error:", err)
      }
    }

    fetchConversations()
  }, [user])

  // =========================
  // SOCKET REAL-TIME SYNC
  // =========================
  useEffect(() => {
    if (!socket || !user?._id) return

    const handleNewMessage = (msg) => {
      const myId = user._id?.toString()
      const sId = msg.senderId?.toString()
      const rId = msg.receiverId?.toString()
      const mEventId = msg.eventId?.toString()

      if (!mEventId || !sId) return
      if (sId !== myId && rId !== myId) return

      const iAmSender = sId === myId
      const otherUserId = iAmSender ? rId : sId
      const otherUserName = iAmSender
        ? (msg.receiverName || null)
        : (msg.senderName || null)

      setConversations((prev) => {
        // ✅ key is just userId
        const index = prev.findIndex((c) => c.userId === otherUserId)

        const updatedConv = {
          // keep eventId for socket room — but don't use in key
          eventId: mEventId,
          userId: otherUserId,
          userName: otherUserName,
          lastMessage: msg.message || (msg.fileName ? `📎 ${msg.fileName}` : "File"),
          createdAt: msg.createdAt,
        }

        let result

        if (index !== -1) {
          const updated = [...prev]
          updated[index] = {
            ...updated[index],
            ...updatedConv,
            userName:
              otherUserName && otherUserName !== "User"
                ? otherUserName
                : updated[index].userName,
          }
          result = updated.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        } else {
          result = [updatedConv, ...prev]
        }

        return result
      })

      // ✅ unread key is now just userId
      const isActiveChatMessage = userId === otherUserId
      if (!isActiveChatMessage && !iAmSender) {
        incrementUnread(otherUserId)
      }
    }

    socket.off("newMessage", handleNewMessage)
    socket.on("newMessage", handleNewMessage)

    return () => socket.off("newMessage", handleNewMessage)
  }, [socket, user, userId])

  // =========================
  // FETCH RECEIVER NAME (when opening a chat directly via URL)
  // =========================
  useEffect(() => {
    if (!userId || !user?._id) return

    const fetchReceiverName = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch(`http://localhost:5000/api/auth/users/${userId}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        const name = data?.name || data?.email?.split("@")[0] || "User"

        setConversations((prev) => {
          const exists = prev.find((c) => c.userId === userId)
          if (exists) {
            if (exists.userName && exists.userName !== "User") return prev
            return prev.map((c) =>
              c.userId === userId ? { ...c, userName: name } : c
            )
          }
          return [
            {
              userId,
              userName: name,
              lastMessage: "",
              createdAt: new Date().toISOString(),
              // ✅ inject stateEventId for brand new conversations
              eventId: stateEventId,
            },
            ...prev,
          ]
        })
      } catch (err) {
        console.error("❌ Fetch receiver name error:", err)
      }
    }

    const timer = setTimeout(fetchReceiverName, 100)
    return () => clearTimeout(timer)
  }, [userId, user])

  // =========================
  // UNIQUE CONVERSATIONS — by userId only
  // =========================
  const uniqueConversations = useMemo(() => {
    const map = new Map()

    conversations.forEach((conv) => {
      if (!map.has(conv.userId)) {
        map.set(conv.userId, conv)
      } else {
        const existing = map.get(conv.userId)
        if (new Date(conv.createdAt) > new Date(existing.createdAt)) {
          map.set(conv.userId, conv)
        }
      }
    })

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
    )
  }, [conversations])

  // =========================
  // NAVIGATION — /chat/:userId (no eventId)
  // =========================
  const handleOpenChat = (conv) => {
    clearUnread(conv.userId)
    navigate(`/chat/${conv.userId}`)
  }

  const getAvatarColor = (name) => {
    const colors = [
      "bg-pink-500", "bg-yellow-500", "bg-green-500",
      "bg-blue-500", "bg-orange-500", "bg-teal-500", "bg-purple-500",
    ]
    return colors[(name?.charCodeAt(0) || 0) % colors.length]
  }

  const getInitial = (name) => name?.[0]?.toUpperCase() || "?"

  const isChatOpen = !!userId

  // clear unread when navigating directly to a chat via URL
  useEffect(() => {
    if (userId) clearUnread(userId)
  }, [userId])

  // =========================
  // UI
  // =========================
  return (
    <div className="fixed inset-0 top-16 bg-slate-900 flex flex-col px-2 sm:px-4 pb-3 sm:pb-4 pt-3 sm:pt-4">
      <div className="flex-1 max-w-7xl w-full mx-auto flex gap-4 lg:gap-6 min-h-0">

        {/* SIDEBAR */}
        <div
          className={`
            flex-shrink-0 bg-slate-800 rounded-2xl sm:rounded-3xl flex flex-col
            ${isChatOpen ? "hidden lg:flex lg:w-96" : "flex w-full lg:w-96"}
          `}
        >
          <div className="p-4 sm:p-6 border-b border-slate-700/60">
            <h1 className="text-white font-semibold text-base sm:text-lg">💬 Chats</h1>
          </div>

          <div className="flex-1 overflow-y-auto p-2 sm:p-3 space-y-1">
            {uniqueConversations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2 py-16">
                <div className="text-4xl">💬</div>
                <p className="text-sm">No conversations yet</p>
              </div>
            ) : (
              uniqueConversations.map((conv) => {
                const isActive = conv.userId === userId
                // ✅ unread key is just userId
                const unreadCount = unreadMap[conv.userId] || 0

                return (
                  <div
                    key={conv.userId}
                    onClick={() => handleOpenChat(conv)}
                    className={`p-3 rounded-2xl cursor-pointer transition-colors duration-150 ${
                      isActive ? "bg-indigo-600" : "hover:bg-slate-700/80 active:bg-slate-700"
                    }`}
                  >
                    <div className="flex gap-3 items-center">
                      <div className="relative flex-shrink-0">
                        <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white font-bold text-sm ${getAvatarColor(conv.userName)}`}>
                          {getInitial(conv.userName)}
                        </div>
                        {unreadCount > 0 && !isActive && (
                          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-indigo-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 border-2 border-slate-800">
                            {unreadCount > 99 ? "99+" : unreadCount}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold leading-tight text-white">
                          {conv.userName || "User"}
                        </div>
                        <div className={`text-xs truncate mt-0.5 ${unreadCount > 0 && !isActive ? "text-indigo-300 font-medium" : "text-gray-400"}`}>
                          {conv.lastMessage || "No messages yet"}
                        </div>
                      </div>

                      {unreadCount > 0 && !isActive ? (
                        <span className="flex-shrink-0 min-w-[22px] h-[22px] bg-indigo-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1.5">
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </span>
                      ) : (
                        <svg className="w-4 h-4 text-gray-500 flex-shrink-0 lg:hidden" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      )}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div
          className={`
            bg-slate-800 rounded-2xl sm:rounded-3xl overflow-hidden
            ${isChatOpen ? "flex flex-1" : "hidden lg:flex lg:flex-1"}
          `}
        >
          {isChatOpen ? (
            <div className="w-full h-full">
              <Outlet
                context={{
                  receiverName:
                    uniqueConversations.find((c) => c.userId === userId)?.userName || null,
                  // ✅ eventId: existing conv se lo, warna stateEventId (Ticket.jsx se aaya) use karo
                  eventId:
                    uniqueConversations.find((c) => c.userId === userId)?.eventId
                    || stateEventId
                    || null,
                }}
              />
            </div>
          ) : (
            <div className="h-full w-full flex items-center justify-center text-gray-400">
              <div className="flex flex-col items-center gap-3">
                <div className="text-5xl">💬</div>
                <p className="text-sm">Select a chat to start messaging</p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  )
}

export default ChatInbox