import axios from 'axios'

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// ✅ Attach token to every request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token')

    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }

    return config
  },
  (error) => Promise.reject(error),
)

// ✅ FIXED RESPONSE INTERCEPTOR
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''

    console.log('🔴 API ERROR:', status, url)

    // 🚨 CRITICAL FIX
    // Do NOT trigger logout for login API
    if (status === 401 && !url.includes('/auth/login')) {
      console.log('⚠️ Unauthorized → logging out')

      localStorage.removeItem('token')
      localStorage.removeItem('user')

      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

// ✅ Auth refresh (unchanged)
export const refreshAuth = async () => {
  try {
    const token = localStorage.getItem('token')

    if (!token) return false

    const res = await axios.get('http://localhost:5000/api/auth/profile', {
      headers: { Authorization: `Bearer ${token}` },
    })

    localStorage.setItem('user', JSON.stringify(res.data))

    return true
  } catch (error) {
    console.error('Auth refresh failed:', error)

    localStorage.removeItem('token')
    localStorage.removeItem('user')

    return false
  }
}

export default api
