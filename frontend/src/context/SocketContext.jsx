import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react"
import io from "socket.io-client"
import { useAuth } from "./AuthContext"

const SocketContext = createContext()

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider")
  }
  return context
}

export const SocketProvider = ({ children }) => {
  console.log("🧠 SocketProvider render")

  const [socket, setSocket] = useState(null)
  const [connected, setConnected] = useState(false)
  const socketRef = useRef(null)

  const { user } = useAuth() || {}

  useEffect(() => {
    console.log("⚡ useEffect RUN")

    return () => {
      console.log("🧹 useEffect CLEANUP")
    }
  }, [])


  useEffect(() => {
    console.log("⚡ Socket init", Date.now())

    const token = localStorage.getItem("token")


    if (!token) {
      console.log("❌ No token, skipping socket")
      return
    }

    // ✅ SINGLETON FIX (CRITICAL)
    if (socketRef.current) {
      console.log("🔄 Using existing socket")
      setSocket(socketRef.current)
      setConnected(socketRef.current.connected)
      return
    }

    const newSocket = io("http://localhost:5000", {
      auth: { token },
      transports: ["websocket"],
    })

    // ✅ SAFE LISTENERS (NO DUPLICATES)
    newSocket.off("connect")
    newSocket.on("connect", () => {
      console.log("✅ Connected:", newSocket.id)
      setConnected(true)
    })

    newSocket.off("disconnect")
    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected")
      setConnected(false)
    })

    newSocket.off("connect_error")
    newSocket.on("connect_error", (err) => {
      console.error("🚨 Socket error:", err.message)
    })

    socketRef.current = newSocket
    setSocket(newSocket)

    // ❌ DO NOT DISCONNECT ON CLEANUP (prevents flicker / double init)
    return () => {
      console.log("🧹 Cleaning socket", Date.now())
    }
  }, [user?._id]) // ✅ correct dependency


  // ✅ METHODS (unchanged logic)
  const joinChat = ({ eventId, userId }) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("joinChat", { eventId, userId })
      return true
    }
    return false
  }

  const leaveRoom = (eventId) => {
    if (socketRef.current) {
      socketRef.current.emit("leaveEventRoom", eventId)
    }
  }

  const sendMessage = (eventId, receiverId, message, callback) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit(
        "sendMessage",
        { eventId, receiverId, message },
        callback
      )
      return true
    }

    callback?.({ success: false })
    return false
  }

  const markSeen = (eventId, userId) => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit("markSeen", { eventId, userId })
      return true
    }
    return false
  }

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        joinChat,
        leaveRoom,
        sendMessage,
        markSeen,
        user,
      }}
    >
      {children}
    </SocketContext.Provider>
  )
}