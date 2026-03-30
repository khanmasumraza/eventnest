import React, { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../context/AuthContext"
import api from "../utils/api"

const categories = [
  { id: "Music", label: "Music", icon: "🎵" },
  { id: "Tech", label: "Tech", icon: "💻" },
  { id: "Startup", label: "Startup", icon: "🚀" },
  { id: "Community", label: "Community", icon: "🤝" },
  { id: "Education", label: "Education", icon: "📚" },
  { id: "Sports", label: "Sports", icon: "⚽" },
  { id: "Cultural", label: "Cultural", icon: "🎭" },
  { id: "Food", label: "Food", icon: "🍕" },
]

const benefits = [
  { icon: "🎟️", title: "Sell tickets online", desc: "Free & paid events supported" },
  { icon: "📊", title: "Analytics dashboard", desc: "Track sales and attendees" },
  { icon: "💸", title: "Fast payouts", desc: "UPI payments, settled quickly" },
]

function OrganizerStart() {
  const navigate = useNavigate()
  const { user, login } = useAuth()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [step, setStep] = useState(1)

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

  if (user?.role === "organizer") return null

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError("")
    if (!formData.organizerName.trim()) { setError("Organizer name is required"); return }
    if (!formData.category) { setError("Please select a category"); return }
    if (!formData.agreedToGuidelines) { setError("You must agree to the guidelines"); return }
    setLoading(true)
    try {
      await api.put("/auth/become-organizer", {
        organizerName: formData.organizerName,
        organizationName: formData.organizationName,
        category: formData.category,
      })
      const profileRes = await api.get("/auth/profile")
      console.log("👤 Updated profile role:", profileRes.data.role)
      const currentToken = localStorage.getItem("token")
      await login(currentToken)
    } catch (err) {
      console.error("Activation error:", err.response || err)
      if (err.response?.data?.message?.toLowerCase().includes("already")) {
        const currentToken = localStorage.getItem("token")
        await login(currentToken)
        navigate("/organiser/dashboard", { replace: true })
        return
      }
      setError(err.response?.data?.message || "Failed to activate organizer account")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: "100vh",
      background: "#080c14",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "16px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      <div style={{ width: "100%", maxWidth: "480px" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: "8px",
            background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
            borderRadius: "12px", padding: "8px 16px",
          }}>
            <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: "#6366f1" }} />
            <span style={{ color: "#6366f1", fontWeight: 600, fontSize: "15px" }}>EventNest</span>
          </div>
        </div>

        {/* Card */}
        <div style={{
          background: "#0d1220",
          border: "1px solid rgba(255,255,255,0.06)",
          borderRadius: "20px",
          overflow: "hidden",
        }}>

          {/* Benefits strip */}
          <div style={{
            background: "rgba(99,102,241,0.06)",
            borderBottom: "1px solid rgba(99,102,241,0.1)",
            padding: "20px 24px",
          }}>
            <p style={{ color: "#9ca3af", fontSize: "12px", marginBottom: "12px", textTransform: "uppercase", letterSpacing: "0.06em" }}>
              What you get
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {benefits.map((b, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    width: "32px", height: "32px", borderRadius: "8px",
                    background: "rgba(99,102,241,0.15)", display: "flex",
                    alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0,
                  }}>{b.icon}</div>
                  <div>
                    <div style={{ color: "#e5e7eb", fontSize: "13px", fontWeight: 500 }}>{b.title}</div>
                    <div style={{ color: "#6b7280", fontSize: "12px" }}>{b.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Form */}
          <div style={{ padding: "24px" }}>
            <h1 style={{ color: "#e5e7eb", fontSize: "20px", fontWeight: 600, marginBottom: "4px" }}>
              Set up your organizer profile
            </h1>
            <p style={{ color: "#6b7280", fontSize: "13px", marginBottom: "24px" }}>
              Takes 2 minutes · Free to start
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>

              {/* Organizer name */}
              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", fontWeight: 500, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Organizer name *
                </label>
                <input
                  type="text"
                  name="organizerName"
                  value={formData.organizerName}
                  onChange={handleChange}
                  placeholder="Your name or brand"
                  style={{
                    width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", padding: "11px 14px", color: "#e5e7eb", fontSize: "14px",
                    outline: "none", boxSizing: "border-box", transition: "border-color 0.15s",
                  }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>

              {/* Org name */}
              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", fontWeight: 500, marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Organization name <span style={{ color: "#4b5563", fontWeight: 400, textTransform: "none" }}>(optional)</span>
                </label>
                <input
                  type="text"
                  name="organizationName"
                  value={formData.organizationName}
                  onChange={handleChange}
                  placeholder="Company or club name"
                  style={{
                    width: "100%", background: "#080c14", border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "10px", padding: "11px 14px", color: "#e5e7eb", fontSize: "14px",
                    outline: "none", boxSizing: "border-box",
                  }}
                  onFocus={e => e.target.style.borderColor = "#6366f1"}
                  onBlur={e => e.target.style.borderColor = "rgba(255,255,255,0.08)"}
                />
              </div>

              {/* Category */}
              <div>
                <label style={{ display: "block", color: "#9ca3af", fontSize: "12px", fontWeight: 500, marginBottom: "8px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                  Primary event category *
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "6px" }}>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      style={{
                        padding: "10px 6px",
                        borderRadius: "10px",
                        border: formData.category === cat.id ? "1.5px solid #6366f1" : "1px solid rgba(255,255,255,0.07)",
                        background: formData.category === cat.id ? "rgba(99,102,241,0.15)" : "#080c14",
                        color: formData.category === cat.id ? "#818cf8" : "#6b7280",
                        fontSize: "11px",
                        fontWeight: formData.category === cat.id ? 600 : 400,
                        cursor: "pointer",
                        display: "flex", flexDirection: "column", alignItems: "center", gap: "4px",
                        transition: "all 0.15s",
                      }}
                    >
                      <span style={{ fontSize: "16px" }}>{cat.icon}</span>
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Guidelines checkbox */}
              <label style={{ display: "flex", alignItems: "center", gap: "10px", cursor: "pointer" }}>
                <div
                  onClick={() => setFormData(prev => ({ ...prev, agreedToGuidelines: !prev.agreedToGuidelines }))}
                  style={{
                    width: "18px", height: "18px", borderRadius: "5px", flexShrink: 0,
                    border: formData.agreedToGuidelines ? "none" : "1.5px solid rgba(255,255,255,0.15)",
                    background: formData.agreedToGuidelines ? "#6366f1" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
                  }}
                >
                  {formData.agreedToGuidelines && <span style={{ color: "white", fontSize: "11px", lineHeight: 1 }}>✓</span>}
                </div>
                <span style={{ color: "#9ca3af", fontSize: "13px", lineHeight: 1.5 }}>
                  I agree to the EventNest organizer guidelines
                </span>
              </label>

              {error && (
                <div style={{ padding: "10px 14px", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px" }}>
                  <p style={{ color: "#f87171", fontSize: "13px", margin: 0 }}>{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !formData.agreedToGuidelines}
                style={{
                  width: "100%", height: "44px", borderRadius: "10px",
                  background: loading || !formData.agreedToGuidelines ? "#1f2937" : "#6366f1",
                  color: loading || !formData.agreedToGuidelines ? "#4b5563" : "white",
                  border: "none", fontWeight: 600, fontSize: "14px", cursor: loading || !formData.agreedToGuidelines ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                }}
              >
                {loading ? "Activating…" : "Activate organizer account →"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                style={{ background: "none", border: "none", color: "#4b5563", fontSize: "13px", cursor: "pointer", textAlign: "center" }}
              >
                Maybe later
              </button>

            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OrganizerStart