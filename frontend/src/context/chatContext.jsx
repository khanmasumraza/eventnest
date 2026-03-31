import React, { createContext, useContext, useState, useCallback, useEffect } from "react"
import { useSocket } from "./SocketContext"
import { useAuth } from "./AuthContext"

const ChatContext = createContext(null)

export const ChatProvider = ({ children }) => {
  // ✅ key is now just userId (not eventId-userId)
  const [unreadMap, setUnreadMap] = useState({})
  const { socket } = useSocket()
  const { user } = useAuth()

  // ✅ GLOBAL socket listener — works on ANY page
  useEffect(() => {
    if (!socket || !user?._id) return

    const myId = user._id?.toString()

    const handleNewMessage = (msg) => {
      const sId = msg.senderId?.toString()
      const rId = msg.receiverId?.toString()

      // Only count messages received by me
      if (rId !== myId) return
      if (!sId) return

      const otherUserId = sId

      // Don't increment if this chat is currently open
      const currentPath = window.location.pathname
      const isActiveChatOpen = currentPath === `/chat/${otherUserId}`

      if (!isActiveChatOpen) {
        setUnreadMap((prev) => ({ ...prev, [otherUserId]: (prev[otherUserId] || 0) + 1 }))
      }
    }

    socket.on("newMessage", handleNewMessage)
    return () => socket.off("newMessage", handleNewMessage)
  }, [socket, user])

  // ✅ clearUnread — just userId
  const clearUnread = useCallback((userId) => {
    setUnreadMap((prev) => {
      if (!prev[userId]) return prev
      const next = { ...prev }
      delete next[userId]
      return next
    })
  }, [])

  // Kept for backward compat
  const incrementUnread = useCallback((userId) => {
    // no-op — global handler manages this
  }, [])

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