import axios from 'axios'
import { tokens } from './tokens'
import { parseApiError } from './errors'

const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1'

export const apiClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // envia cookie httpOnly nas chamadas /api/auth/*
  headers: { 'Content-Type': 'application/json' },
  timeout: 10_000, // 10s — garante que nenhuma chamada trava infinito com backend fora
})

// ── Request: injeta Bearer token ──────────────────────────────────────────────
apiClient.interceptors.request.use((config) => {
  const token = tokens.get()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// ── Response: trata 401 → tenta refresh → repete ──────────────────────────────
let isRefreshing = false
let refreshQueue: Array<(token: string) => void> = []

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true

      if (isRefreshing) {
        // Encosta na fila enquanto o refresh já está em andamento
        return new Promise((resolve, reject) => {
          refreshQueue.push((newToken: string) => {
            original.headers.Authorization = `Bearer ${newToken}`
            resolve(apiClient(original))
          })
        })
      }

      isRefreshing = true
      try {
        // Chama o Route Handler do Next.js que usa o cookie httpOnly
        const res = await fetch('/api/auth/refresh', { method: 'POST' })
        if (!res.ok) throw new Error('refresh_failed')

        const { access_token } = await res.json()
        tokens.set(access_token)

        // Processa a fila de requests pendentes
        refreshQueue.forEach((cb) => cb(access_token))
        refreshQueue = []

        original.headers.Authorization = `Bearer ${access_token}`
        return apiClient(original)
      } catch {
        tokens.clear()
        refreshQueue = []
        // Redireciona para o login (client-side)
        if (typeof window !== 'undefined') window.location.href = '/login'
        return Promise.reject(parseApiError(error))
      } finally {
        isRefreshing = false
      }
    }

    return Promise.reject(parseApiError(error))
  }
)
