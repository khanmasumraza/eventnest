import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../utils/api"

const categories = [
  { id: "Music", label: "Music" },
  { id: "Tech", label: "Tech" },
  { id: "Startup", label: "Startup" },
  { id: "Community", label: "Community" },
  { id: "Education", label: "Education" },
  { id: "Sports", label: "Sports" },
]

function OrganizerStart() {
  const navigate = useNavigate()

  // ✅ FIX 1: Only destructure what actually exists in AuthContext
  const { user, login } = useAuth()

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const [formData, setFormData] = useState({
    organizerName: user?.name || "",
    organizationName: "",
    category: "",
    agreedToGuidelines: false,
  })

  useEffect(() => {
    if (user?.role === "organizer") {
      navigate("/organiser/dashboard", { replace: true })
    }
  }, [user, navigate])

  if (user?.role === "organizer") {
    return null
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")

    if (!formData.organizerName.trim()) {
      setError("Organizer name is required")
      return
    }
    if (!formData.category) {
      setError("Please select a primary event category")
      return
    }
    if (!formData.agreedToGuidelines) {
      setError("You must agree to the organizer guidelines")
      return
    }

    setLoading(true)

    try {
      // ✅ FIX 2: Use api instance — interceptor adds token automatically
await api.put("/auth/become-organizer", {
        organizerName: formData.organizerName,
        organizationName: formData.organizationName,
        category: formData.category,
      })

      console.log("✅ Organizer activated")

      // ✅ FIX 3: Get fresh token from backend after role upgrade
      // The old token still has role: 'user' — we need a new one
      // Fetch profile first to confirm role updated
const profileRes = await api.get("/auth/profile")
      console.log("👤 Updated profile role:", profileRes.data.role)

      // Get current token and re-login to refresh AuthContext state
      // This forces fetchProfile to run again with the same token
      // but AuthContext will now see role: 'organizer' from backend
      const currentToken = localStorage.getItem("token")
      await login(currentToken)

      // navigate handled by useEffect when user.role becomes 'organizer'

    } catch (err) {
      console.error("Activation error:", err.response || err)

      if (err.response?.data?.message?.toLowerCase().includes("already")) {
        // Already organizer — just refresh and redirect
        const currentToken = localStorage.getItem("token")
        await login(currentToken)
        navigate("/organiser/dashboard", { replace: true })
        return
      }

      setError(
        err.response?.data?.message || "Failed to activate organizer account"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] flex items-center justify-center p-6">
      <div className="w-full max-w-[520px]">
        <div className="bg-[#121826] border border-[#1F2937] rounded-xl p-8">

          <div className="text-center mb-8">
            <h1 className="text-[24px] font-semibold text-[#E5E7EB] mb-2">
              Start hosting events on EventNest
            </h1>
            <p className="text-[14px] text-[#9CA3AF]">
              Create events, manage attendees, and track ticket sales.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">

            <input
              type="text"
              name="organizerName"
              value={formData.organizerName}
              onChange={handleChange}
              placeholder="Organizer name"
              className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />

            <input
              type="text"
              name="organizationName"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Organization name (optional)"
              className="w-full bg-[#0B0F19] border border-[#1F2937] rounded-lg px-4 py-2.5 text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#6366F1]"
            />

            <div className="grid grid-cols-3 gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({ ...prev, category: cat.id }))
                  }
                  className={`px-3 py-2 rounded-lg text-[14px] transition-all ${
                    formData.category === cat.id
                      ? "bg-[#6366F1] text-white"
                      : "bg-[#0B0F19] border border-[#1F2937] text-[#9CA3AF] hover:border-[#6366F1]"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="agreedToGuidelines"
                name="agreedToGuidelines"
                checked={formData.agreedToGuidelines}
                onChange={handleChange}
                className="w-4 h-4 rounded border-[#1F2937] bg-[#0B0F19] text-[#6366F1] focus:ring-[#6366F1]"
              />
              <label
                htmlFor="agreedToGuidelines"
                className="text-[14px] text-[#9CA3AF] cursor-pointer"
              >
                I agree to the organizer guidelines
              </label>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !formData.agreedToGuidelines}
              className="w-full h-10 bg-[#6366F1] text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed font-medium hover:brightness-110 transition-all"
            >
              {loading ? "Activating..." : "Activate Organizer"}
            </button>

          </form>

          <div className="mt-6 text-center">
            <button
              onClick={() => navigate("/dashboard")}
              className="text-[#9CA3AF] hover:text-white transition-colors text-sm"
            >
              Cancel
            </button>
          </div>

        </div>
      </div>
    </div>
  )
}

export default OrganizerStart