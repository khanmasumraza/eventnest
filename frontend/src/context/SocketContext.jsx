import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import io from "socket.io-client";
import { useAuth } from "./AuthContext";

const SocketContext = createContext();

// 🔹 Hook
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

// 🔹 Provider
export const SocketProvider = ({ children }) => {
  console.log("🧠 SocketProvider render");

  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  const socketRef = useRef(null);
  const { user } = useAuth() || {};

  useEffect(() => {
    console.log("⚡ Socket init", Date.now());

    const token = localStorage.getItem("token");

    if (!token) {
      console.log("❌ No token, skipping socket");
      return;
    }

    // 🔹 prevent duplicate connection
    if (socketRef.current) {
      console.log("🔄 Using existing socket");
      return;
    }

    // 🔥 FINAL SOCKET URL LOGIC (LOCAL + PROD SAFE)
    const SOCKET_URL =
      process.env.REACT_APP_SOCKET_URL ||
      (process.env.REACT_APP_API_URL
        ? process.env.REACT_APP_API_URL.replace("/api", "")
        : "http://localhost:5000");

    console.log("🌐 SOCKET URL:", SOCKET_URL);

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket", "polling"],
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });

    // 🔹 EVENTS
    newSocket.on("connect", () => {
      console.log("✅ Connected:", newSocket.id);
      setConnected(true);
    });

    newSocket.on("disconnect", () => {
      console.log("❌ Disconnected");
      setConnected(false);
    });

    newSocket.on("connect_error", (err) => {
      console.error("🚨 Socket error:", err.message);
    });

    // 🔹 store socket
    socketRef.current = newSocket;
    setSocket(newSocket);

    // 🔹 cleanup
    return () => {
      console.log("🧹 Cleaning socket");

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // 🔹 METHODS

  const joinChat = ({ eventId, userId }) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("joinChat", { eventId, userId });
      return true;
    }
    return false;
  };

  const leaveRoom = (eventId) => {
    if (socketRef.current) {
      socketRef.current.emit("leaveEventRoom", eventId);
    }
  };

  const sendMessage = (eventId, receiverId, message, callback) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit(
        "sendMessage",
        { eventId, receiverId, message },
        callback
      );
      return true;
    }

    console.warn("⚠️ Socket not connected");
    callback?.({ success: false });
    return false;
  };

  const markSeen = (eventId, userId) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit("markSeen", { eventId, userId });
      return true;
    }
    return false;
  };

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
  );
};