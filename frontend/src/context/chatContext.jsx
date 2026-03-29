import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { useSocket } from "./SocketContext"
import { useAuth } from "./AuthContext"

const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  // { "eventId-userId": count }
  const [unreadMap, setUnreadMap] = useState({})
  const { socket } = useSocket()
  const { user } = useAuth()

  // ✅ GLOBAL socket listener — works on ANY page, not just /chat
  // Navbar badge will increment even when user is on Explore/Dashboard/etc.
  useEffect(() => {
    if (!socket || !user?._id) return

    const myId = user._id?.toString()

    const handleNewMessage = (msg) => {
      const sId = msg.senderId?.toString()
      const rId = msg.receiverId?.toString()
      const mEventId = msg.eventId?.toString()

      // Only count messages received by me, not sent by me
      if (rId !== myId) return
      if (!mEventId || !sId) return

      const otherUserId = sId

      // Don't increment if this exact chat is currently open
      const currentPath = window.location.pathname
      const isActiveChatOpen = currentPath === `/chat/${mEventId}/${otherUserId}`

      if (!isActiveChatOpen) {
        const key = `${mEventId}-${otherUserId}`
        setUnreadMap((prev) => ({ ...prev, [key]: (prev[key] || 0) + 1 }))
      }
    }

    socket.on("newMessage", handleNewMessage)
    return () => socket.off("newMessage", handleNewMessage)
  }, [socket, user])

  // Called when user opens a conversation
  const clearUnread = useCallback((eventId, userId) => {
    const key = `${eventId}-${userId}`
    setUnreadMap((prev) => {
      if (!prev[key]) return prev
      const next = { ...prev }
      delete next[key]
      return next
    })
  }, [])

  // Kept for backward compat — ChatInbox still calls this but global handler is source of truth now
  const incrementUnread = useCallback((eventId, userId) => {
    // no-op — global socket handler above manages incrementing
  }, [])

  // Total unread across all conversations — for navbar badge
  const totalUnread = Object.values(unreadMap).reduce((sum, n) => sum + n, 0)

  return (
    <ChatContext.Provider value={{ unreadMap, incrementUnread, clearUnread, totalUnread }}>
      {children}
    </ChatContext.Provider>
  )
}

export const useChatContext = () => {
  const ctx = useContext(ChatContext)
  if (!ctx) throw new Error("useChatContext must be used within ChatProvider")
  return ctx
}