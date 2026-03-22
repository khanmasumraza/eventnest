import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const AuthSuccess = () => {

  const navigate = useNavigate();
  const { login } = useAuth();
  const hasRun = useRef(false);

  useEffect(() => {

    // Prevent double run in React StrictMode
    if (hasRun.current) return;
    hasRun.current = true;

    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      navigate("/login", { replace: true });
      return;
    }

    const handleLogin = async () => {
      try {

        await login(token);

        navigate("/", { replace: true });

      } catch (err) {

        console.error("OAuth login failed:", err);
        navigate("/login", { replace: true });

      }
    };

    handleLogin();

  }, []); // eslint-disable-line

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "16px",
        color: "#666"
      }}
    >
      Authenticating...
    </div>
  );

};

export default AuthSuccess;