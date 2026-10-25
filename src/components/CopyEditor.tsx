'use client'
import { useEffect, useRef, useState } from 'react'

// SITE COPY EDITOR — drop <CopyEditor /> on a public page. Everyone gets Mandi's saved
// text edits applied; only Mandi (owner cookie, set once per device by opening any page
// with ?edit=HER-KEY) sees the ✏️ button. Tap it, tap any text, type, tap away → saved.
// Edits are stored per page as { original text → new text } via /api/copy, and re-applied
// whenever React re-renders, so they also hold on the interactive pages.

const SKIP = new Set(['STYLE', 'SCRIPT', 'NOSCRIPT', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION'])

export default function CopyEditor() {
  const [owner, setOwner] = useState(false)
  const [on, setOn] = useState(false)
  const [toast, setToast] = useState('')
  const copy = useRef<Record<string, string>>({})
  const orig = useRef(new WeakMap<Text, string>())
  const page = useRef('')

  const say = (t: string) => { setToast(t); setTimeout(() => setToast(''), 1800) }

  // Swap any text node whose (original) text has a saved edit.
  const applyTo = (root: Node) => {
    const map = copy.current
    if (!Object.keys(map).length) return
    const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
    for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
      const p = n.parentElement
      if (!p || SKIP.has(p.tagName) || p.closest('[data-copy-editor]') || p.isContentEditable) continue
      const v = n.nodeValue ?? ''
      if (Object.prototype.hasOwnProperty.call(map, v) && map[v] !== v) {
        orig.current.set(n, orig.current.get(n) ?? v)
        n.nodeValue = map[v]
      }
    }
  }

  useEffect(() => {
    page.current = window.location.pathname
    const url = new URL(window.location.href)
    const key = url.searchParams.get('edit')
    const login = key
      ? fetch('/api/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ login: key }) })
          .then(r => { if (!r.ok) say('That edit key didn’t work') })
          .catch(() => {})
          .finally(() => { url.searchParams.delete('edit'); window.history.replaceState(null, '', url.pathname + url.search + url.hash) })
      : Promise.resolve()

    let obs: MutationObserver | null = null
    login.then(() => fetch(`/api/copy?page=${encodeURIComponent(page.current)}`)).then(r => r.json()).then(d => {
      copy.current = d.copy || {}
      setOwner(!!d.owner)
      applyTo(document.body)
      obs = new MutationObserver(muts => {
        for (const m of muts) {
          if (m.type === 'characterData') applyTo(m.target.parentNode ?? m.target)
          else m.addedNodes.forEach(n => applyTo(n))
        }
      })
      obs.observe(document.body, { subtree: true, childList: true, characterData: true })
    }).catch(() => {})
    return () => obs?.disconnect()
  }, [])

  // Edit mode: tapping text makes that element editable; links don't navigate.
  useEffect(() => {
    if (!on) return
    document.body.classList.add('ce-on')
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t || t.closest('[data-copy-editor]') || SKIP.has(t.tagName)) return
      e.preventDefault(); e.stopPropagation()
      if (t.isContentEditable) return
      const texts: [Text, string][] = []
      const walk = document.createTreeWalker(t, NodeFilter.SHOW_TEXT)
      for (let n = walk.nextNode() as Text | null; n; n = walk.nextNode() as Text | null) {
        if ((n.nodeValue ?? '').trim()) { texts.push([n, n.nodeValue ?? '']); if (!orig.current.has(n)) orig.current.set(n, n.nodeValue ?? '') }
      }
      if (!texts.length) return
      t.contentEditable = 'true'
      t.focus()
      const finish = async () => {
        t.contentEditable = 'false'
        t.removeEventListener('blur', finish)
        t.removeEventListener('keydown', onKey)
        for (const [n, before] of texts) {
          const now = n.nodeValue ?? ''
          if (!n.isConnected || now === before) continue
          const from = orig.current.get(n) ?? before
          const r = await fetch('/api/copy', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ page: page.current, from, to: now }) }).catch(() => null)
          if (r?.ok) { copy.current = { ...copy.current, [from]: now }; say('Saved ✓') } else say('Couldn’t save — try again')
        }
      }
      const onKey = (k: KeyboardEvent) => { if (k.key === 'Enter') { k.preventDefault(); t.blur() } if (k.key === 'Escape') t.blur() }
      t.addEventListener('blur', finish)
      t.addEventListener('keydown', onKey)
    }
    document.addEventListener('click', onClick, true)
    return () => { document.removeEventListener('click', onClick, true); document.body.classList.remove('ce-on') }
  }, [on])

  const undoAll = async () => {
    if (!confirm('Undo every text edit on this page?')) return
    await fetch(`/api/copy?page=${encodeURIComponent(page.current)}`, { method: 'DELETE' })
    window.location.reload()
  }

  if (!owner) return null
  return (
    <div data-copy-editor="" style={{ position: 'fixed', right: 16, bottom: 16, zIndex: 9999, display: 'flex', gap: 8, alignItems: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <style>{`.ce-on main :is(h1,h2,h3,h4,p,li,a,span,strong,em,button,label):hover{outline:2px dashed #F2A65A;outline-offset:2px;cursor:text}
.ce-on [contenteditable="true"]{outline:2px solid #5A4FCF!important;background:rgba(90,79,207,0.06)}`}</style>
      {toast && <span style={{ background: '#171C3A', color: '#fff', padding: '8px 12px', borderRadius: 999, fontSize: 13 }}>{toast}</span>}
      {on && <button onClick={undoAll} style={btn('#fff', '#5A4FCF')}>Undo all on page</button>}
      <button onClick={() => setOn(v => !v)} style={btn(on ? '#C2693F' : '#5A4FCF', '#fff')}>{on ? 'Done editing' : '✏️ Edit copy'}</button>
    </div>
  )
}

const btn = (bg: string, fg: string): React.CSSProperties => ({
  background: bg, color: fg, border: '1.5px solid #5A4FCF', borderRadius: 999, padding: '10px 16px',
  fontWeight: 800, fontSize: 14, cursor: 'pointer', boxShadow: '0 8px 24px rgba(23,28,58,0.25)',
})
