import axios from 'axios'

console.log('🔍 BASE URL:', process.env.REACT_APP_API_URL)

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
  withCredentials: false,
})

export default api