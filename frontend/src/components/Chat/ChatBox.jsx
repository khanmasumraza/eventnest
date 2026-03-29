import React, { useState, useEffect, useRef } from "react"
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useSocket } from "../../context/SocketContext"
import { useAuth } from "../../context/AuthContext"
import MessageBubble from "./MessageBubble"
import api from "../../utils/api"

const ChatBox = ({ eventId, receiverId, receiverName }) => {
  const outletContext = useOutletContext() || {}
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetchedName, setFetchedName] = useState(null)
  const [isOnline, setIsOnline] = useState(false)
  const { socket, connected, joinChat } = useSocket()
  const { user } = useAuth()
  const currentUserId = user?._id?.toString()
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const initialScrollDone = useRef(false)

  // ✅ FETCH RECEIVER NAME DIRECTLY — no dependency on ChatInbox
  useEffect(() => {
    if (!receiverId) return
    setFetchedName(null)
    const token = localStorage.getItem("token")
    fetch(`http://localhost:5000/api/auth/users/${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        // ✅ data.name directly — no data.user wrapper
        const name = data?.name || data?.email?.split("@")[0] || null
        if (name) {
          console.log("✅ ChatBox fetched name:", name)
          setFetchedName(name)
        }
      })
      .catch(console.error)
  }, [receiverId])

  // ✅ displayName — fetchedName has highest priority
  const displayName =
    fetchedName ||
    receiverName ||
    outletContext.receiverName ||
    messages
      .slice()
      .reverse()
      .find(
        (m) =>
          m?.senderId &&
          m.senderId.toString() !== currentUserId &&
          m?.senderName &&
          m.senderName !== "User"
      )?.senderName ||
    "User"

  const isValidId = (id) => /^[0-9a-fA-F]{24}$/.test(id)
  const valid = isValidId(eventId) && isValidId(receiverId) && isValidId(currentUserId)

  // RESET
  useEffect(() => {
    setMessages([])
    setIsTyping(false)
    setIsOnline(false)
    initialScrollDone.current = false
  }, [eventId, receiverId])

  // LOAD MESSAGES
  useEffect(() => {
    if (!valid) return
    let isActive = true
    setLoading(true)
    const loadMessages = async () => {
      try {
        const res = await api.get(`/chat/${eventId}/${receiverId}/messages`)
        if (!isActive) return
        setMessages(res.data.messages || [])
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }
    loadMessages()
    return () => { isActive = false }
  }, [eventId, receiverId, valid])

  // JOIN ROOM
  useEffect(() => {
    if (!connected || !valid) return
    joinChat({ eventId, userId: receiverId })
  }, [connected, eventId, receiverId, valid, joinChat])

  const getSenderId = (senderId) => {
    if (!senderId) return ''
    if (typeof senderId === 'object' && senderId._id) return senderId._id.toString()
    return senderId.toString()
  }

  const belongsToChat = (msg) => {
    const sId = getSenderId(msg.senderId)
    const rId = msg.receiverId?.toString()
    const eId = msg.eventId?.toString()
    const recv = receiverId?.toString()
    const evnt = eventId?.toString()
    if (eId && eId !== evnt) return false
    return (sId === currentUserId && rId === recv) || (sId === recv && rId === currentUserId)
  }

  // SOCKET — messages + typing + ✅ messageUpdated for real-time tick fix
  useEffect(() => {
    if (!socket || !valid) return

    const handleNewMessage = (msg) => {
      if (!belongsToChat(msg)) return
      setMessages((prev) => {
        if (prev.find((m) => m._id?.toString() === msg._id?.toString())) return prev
        return [...prev, msg]
      })
    }

    // ✅ FIX 1 — messageUpdated listener was missing entirely
    // Backend emits this when receiver marks messages as seen
    // This makes sender's single gray tick → double blue tick in real-time
    const handleMessageUpdated = (updated) => {
      if (!updated?._id) return
      setMessages((prev) =>
        prev.map((m) =>
          m._id?.toString() === updated._id?.toString()
            ? { ...m, status: updated.status, seenBy: updated.seenBy }
            : m
        )
      )
    }

    const handleTyping = (data) => {
      const dSender = data.senderId?.toString?.() || data.userId?.toString()
      if (dSender === receiverId?.toString() && (data.eventId === eventId || !data.eventId)) setIsTyping(true)
    }
    const handleStopTyping = (data) => {
      const dSender = data.senderId?.toString?.() || data.userId?.toString()
      if (dSender === receiverId?.toString() && (data.eventId === eventId || !data.eventId)) setIsTyping(false)
    }

    socket.off("newMessage")
    socket.on("newMessage", handleNewMessage)
    socket.off("messageUpdated")                          // ✅ added
    socket.on("messageUpdated", handleMessageUpdated)     // ✅ added
    socket.off("typing")
    socket.on("typing", handleTyping)
    socket.off("stopTyping")
    socket.on("stopTyping", handleStopTyping)
    socket.off("userTyping")
    socket.on("userTyping", handleTyping)

    return () => {
      socket.off("newMessage", handleNewMessage)
      socket.off("messageUpdated", handleMessageUpdated)  // ✅ added
      socket.off("typing", handleTyping)
      socket.off("stopTyping", handleStopTyping)
      socket.off("userTyping", handleTyping)
    }
  }, [socket, eventId, receiverId, valid, currentUserId])

  // ✅ FIX 2 — emit markSeen when receiver opens the chat
  // This triggers backend to update status → 'seen' and emit messageUpdated to sender
  useEffect(() => {
    if (!socket || !valid) return
    socket.emit("markSeen", { eventId, userId: currentUserId })
  }, [socket, eventId, receiverId, valid, currentUserId])

  // ✅ Online/offline status
  useEffect(() => {
    if (!socket || !receiverId) return

    const handleOnline = (data) => {
      if (data.userId?.toString() === receiverId?.toString()) setIsOnline(true)
    }
    const handleOffline = (data) => {
      if (data.userId?.toString() === receiverId?.toString()) setIsOnline(false)
    }

    socket.on('userOnline', handleOnline)
    socket.on('userOffline', handleOffline)

    return () => {
      socket.off('userOnline', handleOnline)
      socket.off('userOffline', handleOffline)
    }
  }, [socket, receiverId])

  // SEND TEXT
  const handleSend = () => {
    if (!newMessage.trim() || !valid) return
    const text = newMessage.trim()
    setNewMessage("")

    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      _id: tempId,
      eventId,
      senderId: currentUserId,
      receiverId,
      message: text,
      createdAt: new Date().toISOString(),
      status: 'sent',
    }
    setMessages((prev) => [...prev, optimisticMsg])

    socket.emit("sendMessage", {
      eventId,
      senderId: currentUserId,
      receiverId,
      message: text,
    }, (ack) => {
      if (!ack?.success) {
        setMessages((prev) => prev.filter((m) => m._id !== tempId))
        alert("Send failed")
        return
      }
      if (ack?.message) {
        setMessages((prev) =>
          prev.map((m) => m._id === tempId ? ack.message : m)
        )
      }
    })

    socket.emit("stopTyping", { eventId, senderId: currentUserId, receiverId })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    if (!socket || !valid) return
    socket.emit("typing", { eventId, senderId: currentUserId, receiverId })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { eventId, senderId: currentUserId, receiverId })
    }, 1500)
  }

  // FILE SEND
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file || !valid || !socket) return
    setUploading(true)

    const tempId = `temp-file-${Date.now()}`
    const isImage = file.type.startsWith("image/")
    const localUrl = URL.createObjectURL(file)

    const optimisticMsg = {
      _id: tempId,
      eventId,
      senderId: currentUserId,
      receiverId,
      message: "",
      fileUrl: localUrl,
      fileName: file.name,
      fileType: file.type,
      type: isImage ? "image" : "file",
      createdAt: new Date().toISOString(),
      status: 'sent',
    }
    setMessages((prev) => [...prev, optimisticMsg])

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("eventId", eventId)
      formData.append("receiverId", receiverId)

      const res = await api.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })

      if (res.data?.success && res.data?.fileUrl) {
        const filePayload = {
          eventId,
          senderId: currentUserId,
          receiverId,
          fileUrl: res.data.fileUrl,
          fileName: res.data.fileName || file.name,
          fileType: file.type,
          type: isImage ? "image" : "file",
        }

        socket.emit("sendMessage", filePayload, (ack) => {
          if (ack?.success) {
            setMessages((prev) =>
              prev.map((m) => m._id === tempId
                ? (ack?.message || { ...m, fileUrl: res.data.fileUrl })
                : m
              )
            )
          } else {
            setMessages((prev) =>
              prev.map((m) => m._id === tempId
                ? { ...m, fileUrl: res.data.fileUrl, status: 'sent' }
                : m
              )
            )
          }
        })
      } else {
        setMessages((prev) => prev.filter((m) => m._id !== tempId))
        alert("File upload failed. Please try again.")
      }
    } catch (err) {
      console.error("Upload failed", err)
      setMessages((prev) => prev.filter((m) => m._id !== tempId))
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  const scrollContainerRef = useRef(null)
  const lastMessageIdRef = useRef(null)

  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    if (!loading && !initialScrollDone.current) {
      container.scrollTop = container.scrollHeight
      initialScrollDone.current = true
      lastMessageIdRef.current = messages[messages.length - 1]?._id
      return
    }

    if (!initialScrollDone.current) return

    const lastMsg = messages[messages.length - 1]
    if (!lastMsg) return

    if (lastMsg._id === lastMessageIdRef.current) return
    lastMessageIdRef.current = lastMsg._id

    const isOwnMessage = getSenderId(lastMsg.senderId) === currentUserId
    if (isOwnMessage) {
      container.scrollTop = container.scrollHeight
    } else {
      container.scrollTop = container.scrollHeight
    }
  }, [messages, isTyping, loading])

  const getDateLabel = (dateStr) => {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date()
    yesterday.setDate(today.getDate() - 1)
    if (date.toDateString() === today.toDateString()) return "Today"
    if (date.toDateString() === yesterday.toDateString()) return "Yesterday"
    return date.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const renderMessages = () => {
    const items = []
    let lastDate = null
    let lastSenderId = null

    messages.forEach((msg, i) => {
      const msgDate = getDateLabel(msg.createdAt)
      const isOwn = getSenderId(msg.senderId) === currentUserId
      const nextMsg = messages[i + 1]
      const isSameSenderNext = nextMsg && getSenderId(nextMsg.senderId) === getSenderId(msg.senderId)

      if (msgDate !== lastDate) {
        items.push(
          <div key={`date-${i}`} className="flex justify-center my-4">
            <span className="bg-slate-700/70 text-gray-400 text-xs px-4 py-1 rounded-full">
              {msgDate}
            </span>
          </div>
        )
        lastDate = msgDate
      }

      const showAvatar = !isSameSenderNext
      const showName = getSenderId(lastSenderId) !== getSenderId(msg.senderId)

      items.push(
        <MessageBubble
          key={`${eventId}-${msg._id}`}
          message={msg}
          isOwn={isOwn}
          showAvatar={showAvatar}
          showName={showName}
        />
      )

      lastSenderId = msg.senderId
    })

    return items
  }

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden">

      {/* HEADER */}
      <div className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-slate-700/60 bg-slate-800">

        {/* Back button — mobile only */}
        <button
          onClick={() => navigate("/chat")}
          className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-700 transition-colors"
          aria-label="Back to chats"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Avatar + name */}
        <div className="relative flex-shrink-0">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-indigo-500 flex items-center justify-center text-white font-bold text-sm">
            {displayName?.[0]?.toUpperCase() || ''}
          </div>
          <span
            className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-slate-800 transition-colors duration-300 ${
              isOnline ? 'bg-green-400' : 'bg-gray-500'
            }`}
          />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-white text-sm font-semibold leading-tight truncate">
            {displayName}
          </p>
          <p className={`text-xs transition-colors duration-300 ${isOnline ? 'text-green-400' : 'text-gray-500'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </p>
        </div>
      </div>

      {/* MESSAGES */}
      <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-0.5">
        {loading ? (
          <div className="space-y-4 pt-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} gap-2`}>
                {i % 2 !== 0 && <div className="w-7 h-7 rounded-full bg-slate-700 animate-pulse" />}
                <div className="h-10 w-44 bg-slate-700 rounded-2xl animate-pulse" />
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-gray-500 gap-2 py-20">
            <div className="text-5xl">💬</div>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          renderMessages()
        )}

        {/* TYPING INDICATOR */}
        {isTyping && (
          <div className="flex items-end gap-2 mt-2">
            <div className="w-7 h-7 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs">
              {displayName?.[0]?.toUpperCase() || 'U'}
            </div>
            <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-bl-sm">
              <div className="flex gap-1 items-center h-4">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="px-3 sm:px-4 py-3 border-t border-slate-700/60 bg-slate-800">
        <div className="flex items-center gap-2 bg-slate-700/50 rounded-2xl px-3 py-2">

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-600/60 transition disabled:opacity-40"
            title="Send file"
          >
            {uploading ? (
              <svg className="w-4 h-4 text-indigo-400 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400 hover:text-gray-200 transition" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          <input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none py-1"
            placeholder="Type a message..."
          />

          <button
            onClick={handleSend}
            disabled={!newMessage.trim() && !uploading}
            className="flex-shrink-0 w-8 h-8 rounded-xl bg-indigo-500 hover:bg-indigo-600 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center transition"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default ChatBox