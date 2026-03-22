import api from './api.js'
import axios from 'axios'

export const refreshAuth = async () => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return false

    const res = await api.get('/auth/profile', {
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
