import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../utils/api"

function Login() {
  const { login, isAuthenticated } = useAuth()

  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [passwordError, setPasswordError] = useState("")
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState("email")
  const [mode, setMode] = useState("login")
  const [showPassword, setShowPassword] = useState(false)

  const navigate = useNavigate()

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/", { replace: true })
    }
  }, [isAuthenticated, navigate])

  const validateEmail = (emailValue) => {
    if (!emailValue.trim()) {
      setError("Please enter your email")
      return false
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailValue)) {
      setError("Enter a valid email address")
      return false
    }
    return true
  }

  const handleEmailNext = () => {
    if (validateEmail(email)) {
      setError("")
      setPasswordError("") // ✅ clear old errors
      setStep("password")
    }
  }

  const handleSubmit = async () => {
    if (loading) return

    if (!password.trim()) {
      setPasswordError("Enter your password")
      return
    }

    setLoading(true) // ❌ DO NOT clear errors here

    try {
      const endpoint = mode === "register" ? "/auth/register" : "/auth/login"
      const payload =
        mode === "register"
          ? { name: name.trim(), email, password }
          : { email, password }

      const res = await api.post(endpoint, payload)

      if (!res.data.token) {
        setPasswordError("Auth failed")
        return
      }

      await login(res.data.token)
    } catch (err) {
      const message = err?.response?.data?.message || ""

      // ===== LOGIN MODE =====
      if (mode === "login") {
        setStep("password")

        if (err?.response?.status === 401) {
          setPasswordError("Incorrect password")
          return
        }

        if (err?.response?.status === 404) {
          setError("User not found")
          setStep("email")
          return
        }

        setPasswordError("Incorrect password")
        return
      }

      // ===== REGISTER MODE =====
      if (mode === "register") {
        setStep("password") // ✅ stay on password

        if (err?.response?.status === 400) {
          setPasswordError(
            message || "Password must be at least 8 characters and strong"
          )
          return
        }

        setPasswordError("Registration failed")
        return
      }
    } finally {
      setLoading(false)
    }
  }

  const toggleMode = () => {
    const newMode = mode === "login" ? "register" : "login"
    setMode(newMode)
    setEmail("")
    setPassword("")
    setName("")
    setStep("email")
    setError("")
    setPasswordError("")
  }

  return (
    <div className="w-full max-w-3xl md:max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-sm p-6 md:p-8">

      {/* EMAIL ERROR */}
      {error && step === "email" && (
        <div className="w-full bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-6 text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-10 items-start justify-between">

        {/* LEFT */}
        <div className="w-full md:w-1/2">
          <div className="flex items-center gap-2 mb-4">
            <span className="text-3xl">🎪</span>
          </div>

          <p className="text-[18px] text-gray-600 mt-8">
            {mode === "register"
              ? "Create new account"
              : "Sign in to manage your events."}
          </p>

          {step === "password" && (
            <div>
              <p className="text-sm text-gray-500 mt-4">Signed in as</p>
              <p className="text-lg font-medium text-gray-800">{email}</p>
              <button
                type="button"
                onClick={() => {
                  setStep("email")
                  setEmail("")
                }}
                className="text-sm text-blue-600 mt-3 hover:underline"
              >
                ← Change email
              </button>
            </div>
          )}
        </div>

        {/* RIGHT */}
        <div className="w-full md:w-1/2 max-w-md">

          {/* EMAIL STEP */}
          {step === "email" && (
            <div className="space-y-4">

              {mode === "register" && (
                <div className="space-y-1">
                  <label className="text-sm text-gray-600">Full name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    autoComplete="off"
                    className="w-full px-4 py-3.5 border border-gray-300 rounded-md text-gray-900"
                  />
                </div>
              )}

              <div className="space-y-1">
                <label className="text-sm text-gray-600">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="w-full px-4 py-3.5 border border-gray-300 rounded-md text-gray-900"
                />
              </div>

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleEmailNext}
                className="w-full bg-blue-600 text-white py-3 rounded-full"
              >
                Continue
              </motion.button>

              <p className="text-sm text-gray-500 mt-4">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <span onClick={toggleMode} className="text-blue-600 cursor-pointer">
                      Sign up
                    </span>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <span onClick={toggleMode} className="text-blue-600 cursor-pointer">
                      Sign in
                    </span>
                  </>
                )}
              </p>
            </div>
          )}

          {/* PASSWORD STEP */}
          {step === "password" && (
            <div className="space-y-4">

              <label className="text-sm text-gray-600">
                Enter your password
              </label>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setPasswordError("")
                  }}
                  autoComplete="new-password"
                  className={`w-full px-4 py-3.5 border rounded-md pr-16 text-gray-900 ${
                    passwordError ? "border-red-500" : "border-gray-300"
                  }`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-500"
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>

              {/* ✅ PASSWORD ERROR HERE */}
              {passwordError && (
                <p className="text-sm text-red-500">{passwordError}</p>
              )}

              <motion.button
                whileTap={{ scale: 0.98 }}
                onClick={handleSubmit}
                className="w-full bg-blue-600 text-white py-3 rounded-full"
              >
                {loading
                  ? mode === "register"
                    ? "Creating..."
                    : "Signing in..."
                  : mode === "register"
                  ? "Create account"
                  : "Sign in"}
              </motion.button>

            </div>
          )}
        </div>
      </div>

      {/* GOOGLE */}
      <div className="mt-8">
        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-[1px] bg-gray-200"></div>
          <span className="text-sm text-gray-400">or</span>
          <div className="flex-1 h-[1px] bg-gray-200"></div>
        </div>

        <a
          href="http://localhost:5000/api/auth/google"
          className="w-full block border border-gray-300 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-50 text-center"
        >
          Continue with Google
        </a>
      </div>

    </div>
  )
}

export default Login