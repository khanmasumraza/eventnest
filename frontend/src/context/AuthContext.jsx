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

  useEffect(() => {
    const initAuth = async () => {
      const savedToken = localStorage.getItem("token");
      console.log("🔄 [INIT] Starting. Token exists:", !!savedToken);

      if (!savedToken) {
        console.log("🔄 [INIT] No token — done");
        setLoading(false);
        setIsInitialized(true);
        return;
      }

      try {
        console.log("🔄 [INIT] Fetching /auth/profile...");
        const res = await api.get("/auth/profile", {
          headers: { Authorization: `Bearer ${savedToken}` }
        });
        const freshUser = res.data;
        console.log("✅ [INIT] Got profile:", freshUser?.email, "| role:", freshUser?.role);

        setUser(freshUser);
        setIsAuthenticated(true);
        localStorage.setItem("user", JSON.stringify(freshUser));
      } catch (err) {
        console.error("❌ [INIT] Failed:", err.response?.status, err.message);
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
        setIsAuthenticated(false);
      } finally {
        setLoading(false);
        setIsInitialized(true);
        console.log("🔄 [INIT] Done");
      }
    };

    initAuth();
  }, []);

  const login = async (newToken) => {
    const loginId = Date.now()
    console.log(`\n🔐 [LOGIN-${loginId}] Called`)
    console.log(`   └─ token: ${newToken?.substring(0, 40)}`)

    localStorage.setItem("token", newToken);
    setToken(newToken);

    console.log(`🔐 [LOGIN-${loginId}] localStorage updated`)
    console.log(`   └─ verify: ${localStorage.getItem("token")?.substring(0, 40)}`)

    try {
      console.log(`🔐 [LOGIN-${loginId}] Fetching /auth/profile with explicit token header...`)

      const res = await api.get("/auth/profile", {
        headers: { Authorization: `Bearer ${newToken}` }
      });

      const freshUser = res.data;
      console.log(`✅ [LOGIN-${loginId}] Profile:`, freshUser?.email, "| role:", freshUser?.role)

      if (freshUser?.role !== "organizer") {
        console.warn(`⚠️ [LOGIN-${loginId}] Expected organizer but got: ${freshUser?.role}`)
        console.warn(`   └─ DB write may have failed or wrong token sent`)
      }

      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
      setIsAuthenticated(true);

      console.log(`✅ [LOGIN-${loginId}] setUser done. role = ${freshUser?.role}`)

    } catch (err) {
      console.error(`❌ [LOGIN-${loginId}] Failed:`, err.response?.status, err.message)
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setToken(null);
      setUser(null);
      setIsAuthenticated(false);
      throw err;
    }
  };

  const logout = () => {
    console.log("🚪 [LOGOUT]");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setToken(null);
    setUser(null);
    setIsAuthenticated(false);
    navigate("/login", { replace: true });
  };

  const checkAuth = async () => {
    try {
      const savedToken = localStorage.getItem("token");
      if (!savedToken) return;
      const res = await api.get("/auth/profile", {
        headers: { Authorization: `Bearer ${savedToken}` }
      });
      const freshUser = res.data;
      console.log("✅ [CHECK-AUTH] role:", freshUser?.role);
      setUser(freshUser);
      localStorage.setItem("user", JSON.stringify(freshUser));
    } catch (err) {
      console.error("❌ [CHECK-AUTH]:", err.message);
    }
  };

  if (loading) {
    return (
      <div style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#080c14",
        flexDirection: "column",
        gap: 16,
      }}>
        <div style={{
          width: 44, height: 44,
          border: "3px solid rgba(99,102,241,.15)",
          borderTop: "3px solid #6366f1",
          borderRadius: "50%",
          animation: "spin .8s linear infinite",
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <p style={{ color: "#4b5563", fontSize: 13, fontFamily: "sans-serif" }}>
          Loading…
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{
      user, isAuthenticated, isInitialized, token,
      login, logout, checkAuth,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);