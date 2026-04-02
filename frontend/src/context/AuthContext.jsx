import React, { createContext, useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "../utils/api";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();

  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);

  const [token, setToken] = useState(localStorage.getItem("token"));

  // 🔥 INIT (load cached user)
  useEffect(() => {
    if (token) {
      const cachedUser = localStorage.getItem("user");
      if (cachedUser) {
        setUser(JSON.parse(cachedUser));
        setIsAuthenticated(true);
      }
    }
    setLoading(false);
    setIsInitialized(true);
  }, []);

  // 🔥 LOGIN
  const login = async (token) => {
    localStorage.setItem("token", token);
    setToken(token);

    try {
      const res = await api.get("/auth/profile");
      setUser(res.data);
      localStorage.setItem("user", JSON.stringify(res.data));
      setIsAuthenticated(true);
    } catch (err) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  // 🔥 LOGOUT
  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login", { replace: true });
  };

  // 🔥 CRITICAL FIX (refresh user from backend)
  const checkAuth = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await api.get("/auth/profile");

      if (res.data) {
        setUser(res.data);
        localStorage.setItem("user", JSON.stringify(res.data));
        setIsAuthenticated(true);
      }
    } catch (err) {
      console.error("checkAuth failed:", err);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          fontSize: "16px",
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isInitialized,
        login,
        logout,
        checkAuth, // ✅ IMPORTANT
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);