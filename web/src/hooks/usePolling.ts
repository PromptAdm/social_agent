'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

interface UsePollingOptions<T> {
  /** Função que busca o dado atual (ex: () => projectService.getVideo(id)) */
  queryFn:       () => Promise<T>
  /** Retorna true quando o polling deve parar */
  stopCondition: (data: T) => boolean
  /** Intervalo em ms (padrão: 3000) */
  interval?:     number
  /** Roda imediatamente ao montar? (padrão: true) */
  immediate?:    boolean
}

interface UsePollingReturn<T> {
  data:       T | null
  isPolling:  boolean
  error:      string | null
  stop:       () => void
  restart:    () => void
}

export function usePolling<T>({
  queryFn,
  stopCondition,
  interval = 3000,
  immediate = true,
}: UsePollingOptions<T>): UsePollingReturn<T> {
  const [data,      setData]      = useState<T | null>(null)
  const [isPolling, setIsPolling] = useState(false)
  const [error,     setError]     = useState<string | null>(null)

  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const activeRef  = useRef(false)
  const queryRef   = useRef(queryFn)
  const stopRef    = useRef(stopCondition)

  queryRef.current = queryFn
  stopRef.current  = stopCondition

  const stop = useCallback(() => {
    activeRef.current = false
    setIsPolling(false)
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const tick = useCallback(async () => {
    if (!activeRef.current) return
    try {
      const result = await queryRef.current()
      setData(result)
      setError(null)
      if (stopRef.current(result)) {
        activeRef.current = false
        setIsPolling(false)
        return
      }
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { detail?: string } } })
        ?.response?.data?.detail ?? 'Erro ao verificar status.'
      setError(msg)
    }
    if (activeRef.current) {
      timerRef.current = setTimeout(tick, interval)
    }
  }, [interval])

  const restart = useCallback(() => {
    stop()
    activeRef.current = true
    setIsPolling(true)
    setError(null)
    if (immediate) {
      tick()
    } else {
      timerRef.current = setTimeout(tick, interval)
    }
  }, [stop, tick, immediate, interval])

  useEffect(() => {
  if (!immediate) return

  activeRef.current = true
  setIsPolling(true)

  tick()

  return () => {
    activeRef.current = false
    if (timerRef.current) clearTimeout(timerRef.current)
  }
}, [immediate])

  return { data, isPolling, error, stop, restart }
}
