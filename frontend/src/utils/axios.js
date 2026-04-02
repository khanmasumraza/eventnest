import axios from 'axios'

console.log('🔍 BASE URL:', process.env.REACT_APP_API_URL) // ADD THIS

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: true,
})

export default api