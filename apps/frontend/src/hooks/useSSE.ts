import { useEffect, useRef } from 'react'
import { useAuthStore } from '../store/authStore'

declare const __API_URL__: string | undefined

const SSE_BASE = (typeof __API_URL__ !== 'undefined' ? __API_URL__ : undefined) ?? 'http://localhost:4000'

export interface SSEHandlers {
  onStockIn?: (payload: unknown) => void
  onStockOut?: (payload: unknown) => void
  onLowStock?: (payload: unknown) => void
  onNotification?: (payload: unknown) => void
}

export function useSSE(handlers: SSEHandlers) {
  const accessToken = useAuthStore((s) => s.accessToken)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!accessToken) return

    const url = `${SSE_BASE}/events?token=${encodeURIComponent(accessToken)}`
    const es = new EventSource(url)

    es.addEventListener('stock_in', (e) => {
      try { handlersRef.current.onStockIn?.(JSON.parse(e.data)) } catch (_e) { /* ignore parse errors */ }
    })
    es.addEventListener('stock_out', (e) => {
      try { handlersRef.current.onStockOut?.(JSON.parse(e.data)) } catch (_e) { /* ignore parse errors */ }
    })
    es.addEventListener('low_stock', (e) => {
      try { handlersRef.current.onLowStock?.(JSON.parse(e.data)) } catch (_e) { /* ignore parse errors */ }
    })
    es.addEventListener('notification', (e) => {
      try { handlersRef.current.onNotification?.(JSON.parse(e.data)) } catch (_e) { /* ignore parse errors */ }
    })

    return () => es.close()
  }, [accessToken])
}
