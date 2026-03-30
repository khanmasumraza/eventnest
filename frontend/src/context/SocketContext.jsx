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

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error("useSocket must be used within SocketProvider");
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  console.log("🧠 SocketProvider render");

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

    // ✅ Prevent duplicate socket
    if (socketRef.current) {
      console.log("🔄 Using existing socket");
      return;
    }

    const SOCKET_URL = process.env.REACT_APP_API_URL;

    const newSocket = io(SOCKET_URL, {
      auth: { token },
      transports: ["websocket"],
      withCredentials: true,
    });

    // ✅ Prevent duplicate listeners
    newSocket.off("connect");
    newSocket.off("disconnect");
    newSocket.off("connect_error");

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

    socketRef.current = newSocket;

    return () => {
      console.log("🧹 Cleaning socket");

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []); // ✅ run only once

  // ✅ METHODS (unchanged logic)
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
        socket: socketRef.current, // ✅ always latest
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