'use client'
import { useState } from 'react'
import { MessageCircle, X } from 'lucide-react'
import HomeChat from './HomeChat'

// Phase 7 · the floating chat bubble, now Her / Man / Cap (the same chat as Home).
// The old bubble (StationChat, the retired Strategist and characters) is kept in code; its
// saved conversations stay in Notes.
export default function FloatingChat({ hidden }: { hidden?: boolean }) {
  const [open, setOpen] = useState(false)
  if (hidden && !open) return null
  return (
    <>
      {open && (
        <div role="dialog" aria-label="Chat with Her, Man or Cap" style={{ position: 'fixed', right: 16, bottom: 84, zIndex: 60, width: 'min(460px, calc(100vw - 32px))', maxHeight: 'calc(100vh - 120px)', overflowY: 'auto', background: 'var(--bg)', borderRadius: 20, padding: 14, boxShadow: '0 24px 60px rgba(20,16,47,0.35), 0 0 30px var(--purple-glow)' }}>
          <HomeChat />
        </div>
      )}
      <button type="button" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close chat' : 'Chat with Her, Man or Cap'} title="Her · Man · Cap"
        className="rp-pill rp-primary" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 61, width: 56, height: 56, padding: 0, borderRadius: 999 }}>
        {open ? <X size={22} /> : <MessageCircle size={22} />}
      </button>
    </>
  )
}
