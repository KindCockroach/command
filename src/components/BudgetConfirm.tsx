'use client'

// Phase 8 · A0: when something Mandi started would push RISE over its monthly AI cap (or over the
// per-job ceiling), the server answers with a "💸 RISE budget: … Go?" error instead of running it.
// This wraps the station's fetch once: it asks her, and on yes re-sends the same request with the
// OK header so the server lets that one call through. Background jobs never reach here.
import { useEffect } from 'react'

const TAG = '💸 RISE budget:'
const OK_HEADER = 'x-rise-budget-ok'

export default function BudgetConfirm() {
  useEffect(() => {
    const w = window as Window & { __riseBudgetWrapped?: boolean }
    if (w.__riseBudgetWrapped) return
    w.__riseBudgetWrapped = true
    const orig = window.fetch.bind(window)
    window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
      const res = await orig(input, init)
      if (res.status < 400) return res
      try {
        if (!(res.headers.get('content-type') || '').includes('json')) return res
        const j = await res.clone().json()
        const msg: string = typeof j?.error === 'string' ? j.error : typeof j?.message === 'string' ? j.message : ''
        if (!msg.startsWith(TAG) || !msg.trim().endsWith('Go?')) return res
        if (!window.confirm(msg.slice(TAG.length).trim())) return res
        const headers = new Headers(init?.headers ?? (input instanceof Request ? input.headers : undefined))
        headers.set(OK_HEADER, '1')
        return orig(input, { ...init, headers })
      } catch {
        return res
      }
    }
  }, [])
  return null
}
