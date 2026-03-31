import React, { useState, useEffect, useRef } from "react"
import { useOutletContext, useNavigate } from 'react-router-dom'
import { useSocket } from "../../context/SocketContext"
import { useAuth } from "../../context/AuthContext"
import MessageBubble from "./MessageBubble"
import api from "../../utils/api"

const ChatBox = ({ eventId: propEventId, receiverId, receiverName }) => {
  const outletContext = useOutletContext() || {}
  const navigate = useNavigate()
  const [messages, setMessages] = useState([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  const [isTyping, setIsTyping] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [fetchedName, setFetchedName] = useState(null)
  const [isOnline, setIsOnline] = useState(false)
  // ── eventId: prop → outlet context → fetched from API
  const [resolvedEventId, setResolvedEventId] = useState(propEventId || outletContext.eventId || null)

  const { socket, connected, joinChat } = useSocket()
  const { user } = useAuth()
  const currentUserId = user?._id?.toString()
  const messagesEndRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const fileInputRef = useRef(null)
  const initialScrollDone = useRef(false)
  const scrollContainerRef = useRef(null)
  const lastMessageIdRef = useRef(null)

  // ── Keep resolvedEventId in sync if outlet context eventually provides it
  useEffect(() => {
    const ctxEventId = outletContext.eventId
    if (!resolvedEventId && ctxEventId) {
      setResolvedEventId(ctxEventId)
    }
  }, [outletContext.eventId])

  // ── FETCH RECEIVER NAME
  useEffect(() => {
    if (!receiverId) return
    setFetchedName(null)
    const token = localStorage.getItem("token")
    fetch(`http://localhost:5000/api/auth/users/${receiverId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => r.json())
      .then((data) => {
        const name = data?.name || data?.email?.split("@")[0] || null
        if (name) setFetchedName(name)
      })
      .catch(console.error)
  }, [receiverId])

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
  const validReceiver = isValidId(receiverId) && isValidId(currentUserId)

  // ── RESET on chat change
  useEffect(() => {
    setMessages([])
    setIsTyping(false)
    setIsOnline(false)
    initialScrollDone.current = false
    // Sync eventId from prop or context on switch
    setResolvedEventId(propEventId || outletContext.eventId || null)
  }, [receiverId])

  // ── LOAD MESSAGES — no eventId needed
  useEffect(() => {
    if (!validReceiver) return
    let isActive = true
    setLoading(true)
    const loadMessages = async () => {
      try {
        const res = await api.get(`/chat/${receiverId}/messages`)
        if (!isActive) return
        const msgs = res.data.messages || []
        setMessages(msgs)

        // ── If we still don't have an eventId, grab it from message history
        if (!resolvedEventId && msgs.length > 0) {
          const eid = msgs[msgs.length - 1]?.eventId?.toString()
          if (eid) setResolvedEventId(eid)
        }
      } catch (err) {
        console.error(err)
      } finally {
        if (isActive) setLoading(false)
      }
    }
    loadMessages()
    return () => { isActive = false }
  }, [receiverId, validReceiver])

  // ── If STILL no eventId after messages load, fetch from conversations API
  useEffect(() => {
    if (resolvedEventId || !validReceiver) return
    const fetchEventId = async () => {
      try {
        const token = localStorage.getItem("token")
        const res = await fetch("http://localhost:5000/api/chat/conversations", {
          headers: { Authorization: `Bearer ${token}` },
        })
        const data = await res.json()
        if (data.success && data.conversations?.length > 0) {
          const match = data.conversations.find(
            (c) => c.userId?.toString() === receiverId
          )
          if (match?.eventId) {
            setResolvedEventId(match.eventId.toString())
          }
        }
      } catch (err) {
        console.error("eventId fetch fallback failed:", err)
      }
    }
    fetchEventId()
  }, [resolvedEventId, receiverId, validReceiver])

  // ── JOIN SOCKET ROOM — only when eventId is available
  useEffect(() => {
    if (!connected || !validReceiver || !resolvedEventId) return
    joinChat({ eventId: resolvedEventId, userId: receiverId })
  }, [connected, resolvedEventId, receiverId, validReceiver, joinChat])

  const getSenderId = (senderId) => {
    if (!senderId) return ''
    if (typeof senderId === 'object' && senderId._id) return senderId._id.toString()
    return senderId.toString()
  }

  const belongsToChat = (msg) => {
    const sId = getSenderId(msg.senderId)
    const rId = msg.receiverId?.toString()
    const recv = receiverId?.toString()
    return (sId === currentUserId && rId === recv) || (sId === recv && rId === currentUserId)
  }

  // ── SOCKET listeners
  useEffect(() => {
    if (!socket || !validReceiver) return
    const handleNewMessage = (msg) => {
      if (!belongsToChat(msg)) return
      // If we got a message and still don't have eventId, grab it
      if (!resolvedEventId && msg.eventId) {
        setResolvedEventId(msg.eventId.toString())
      }
      setMessages((prev) => {
        if (prev.find((m) => m._id?.toString() === msg._id?.toString())) return prev
        return [...prev, msg]
      })
    }
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
      if (dSender === receiverId?.toString()) setIsTyping(true)
    }
    const handleStopTyping = (data) => {
      const dSender = data.senderId?.toString?.() || data.userId?.toString()
      if (dSender === receiverId?.toString()) setIsTyping(false)
    }
    socket.off("newMessage")
    socket.on("newMessage", handleNewMessage)
    socket.off("messageUpdated")
    socket.on("messageUpdated", handleMessageUpdated)
    socket.off("typing")
    socket.on("typing", handleTyping)
    socket.off("stopTyping")
    socket.on("stopTyping", handleStopTyping)
    socket.off("userTyping")
    socket.on("userTyping", handleTyping)
    return () => {
      socket.off("newMessage", handleNewMessage)
      socket.off("messageUpdated", handleMessageUpdated)
      socket.off("typing", handleTyping)
      socket.off("stopTyping", handleStopTyping)
      socket.off("userTyping", handleTyping)
    }
  }, [socket, resolvedEventId, receiverId, validReceiver, currentUserId])

  // ── markSeen
  useEffect(() => {
    if (!socket || !validReceiver || !resolvedEventId) return
    socket.emit("markSeen", { eventId: resolvedEventId, userId: currentUserId })
  }, [socket, resolvedEventId, receiverId, validReceiver, currentUserId])

  // ── Online/offline
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

  // ── SEND TEXT
  const handleSend = () => {
    if (!newMessage.trim() || !validReceiver || !resolvedEventId) return
    const text = newMessage.trim()
    setNewMessage("")
    const tempId = `temp-${Date.now()}`
    const optimisticMsg = {
      _id: tempId,
      eventId: resolvedEventId,
      senderId: currentUserId,
      receiverId,
      message: text,
      createdAt: new Date().toISOString(),
      status: 'sent',
    }
    setMessages((prev) => [...prev, optimisticMsg])
    socket.emit("sendMessage", {
      eventId: resolvedEventId,
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
        setMessages((prev) => prev.map((m) => m._id === tempId ? ack.message : m))
      }
    })
    socket.emit("stopTyping", { eventId: resolvedEventId, senderId: currentUserId, receiverId })
  }

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleInputChange = (e) => {
    setNewMessage(e.target.value)
    if (!socket || !validReceiver || !resolvedEventId) return
    socket.emit("typing", { eventId: resolvedEventId, senderId: currentUserId, receiverId })
    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stopTyping", { eventId: resolvedEventId, senderId: currentUserId, receiverId })
    }, 1500)
  }

  // ── FILE SEND
  const handleFileChange = async (e) => {
    const file = e.target.files[0]
    if (!file || !validReceiver || !socket || !resolvedEventId) return
    setUploading(true)
    const tempId = `temp-file-${Date.now()}`
    const isImage = file.type.startsWith("image/")
    const localUrl = URL.createObjectURL(file)
    const optimisticMsg = {
      _id: tempId,
      eventId: resolvedEventId,
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
      formData.append("eventId", resolvedEventId)
      formData.append("receiverId", receiverId)
      const res = await api.post("/chat/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      })
      if (res.data?.success && res.data?.fileUrl) {
        const filePayload = {
          eventId: resolvedEventId,
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

  // ── SCROLL
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
    container.scrollTop = container.scrollHeight
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
      items.push(
        <MessageBubble
          key={`${msg._id}`}
          message={msg}
          isOwn={isOwn}
          showAvatar={!isSameSenderNext}
          showName={getSenderId(lastSenderId) !== getSenderId(msg.senderId)}
        />
      )
      lastSenderId = msg.senderId
    })
    return items
  }

  // ── Send button disabled state — if no eventId yet, show hint
  const canSend = !!resolvedEventId && !!newMessage.trim() && !uploading

  return (
    <div className="h-full flex flex-col bg-slate-900 rounded-xl overflow-hidden">
      {/* HEADER */}
      <div className="flex items-center gap-3 px-3 sm:px-5 py-3 sm:py-3.5 border-b border-slate-700/60 bg-slate-800">
        <button
          onClick={() => navigate("/chat")}
          className="lg:hidden flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-xl hover:bg-slate-700 transition-colors"
          aria-label="Back to chats"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
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
          <p className="text-white text-sm font-semibold leading-tight truncate">{displayName}</p>
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
        {/* If eventId still resolving, show subtle hint */}
        {!resolvedEventId && !loading && (
          <p className="text-xs text-gray-500 text-center mb-2">
            Setting up chat session…
          </p>
        )}
        <div className="flex items-center gap-2 bg-slate-700/50 rounded-2xl px-3 py-2">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !resolvedEventId}
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
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <input
            value={newMessage}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            disabled={!resolvedEventId && !loading}
            className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm focus:outline-none py-1 disabled:opacity-50"
            placeholder={resolvedEventId ? "Type a message..." : "Setting up chat…"}
          />
          <button
            onClick={handleSend}
            disabled={!canSend}
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