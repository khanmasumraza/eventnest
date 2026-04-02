import api from './axios.js'

api.defaults.timeout = 10000
api.defaults.headers.common['Content-Type'] = 'application/json'

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

// ✅ Response interceptor with auto retry
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const status = error?.response?.status
    const url = error?.config?.url || ''
    console.log('🔴 API ERROR:', status, url)

    // 🔁 Auto retry once if Network Error (backend not ready)
    const config = error.config
    if (!status && !config._retry) {
      config._retry = true
      console.log('🔁 Retrying request after 2s...', url)
      await new Promise((resolve) => setTimeout(resolve, 2000))
      return api(config)
    }

    if (status === 401 && !url.includes('/auth/login')) {
      console.log('⚠️ Unauthorized → logging out')
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      window.location.href = '/login'
    }

    return Promise.reject(error)
  },
)

export const refreshAuth = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false
    const res = await api.get('/auth/profile')
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