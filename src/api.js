import axios from 'axios'

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
})

export function apiError(error, fallback = 'Something went wrong. Please try again.') {
  return error.response?.data?.detail || fallback
}
