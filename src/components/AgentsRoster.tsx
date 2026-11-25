'use client'
import { useEffect, useState } from 'react'
import { ChevronDown, MessageCircle } from 'lucide-react'
import { AGENTS } from '@/lib/agentRoster'
import { TalkToCapThread } from './TalkToCap'

// Phase 7 · the Agents tab: the 11 real agents (RISE_Agent_SOPs.md, Draft 2, plus the Phase 4
// chain: writers write, Ed checks, Cap reviews and schedules, Her presents, Mandi approves),
// each with the skills it owns in the skills store. The old characters (Hat, Str, Ops, Con,
// Fut, Zen, Tan, Sis, the old Anchor persona) are retired; their past chats stay under "Old chats".
type Skill = { id: string; owner: string; name: string; when: string; wired: boolean }

export default function AgentsRoster() {
  const [skills, setSkills] = useState<Skill[] | null>(null)
  const [chat, setChat] = useState<string | null>(null)            // whose chat is open
  const [rolled, setRolled] = useState<Record<string, boolean>>({}) // skills lists she rolled up / opened
  useEffect(() => { fetch('/api/skills').then(r => r.json()).then(d => setSkills(d?.skills ?? [])).catch(() => setSkills([])) }, [])
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
      {AGENTS.map(a => {
        const mine = (skills ?? []).filter(s => s.owner === a.key)
        return (
          <article key={a.key} className="rp-card" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
              <h3 style={{ margin: 0, fontSize: 'var(--fs-lg)' }}>{a.name}</h3>
              <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>{a.role}</span>
            </div>
            <p style={{ margin: 0, fontSize: 'var(--fs-md)', lineHeight: 1.55 }}>{a.does}</p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Answers to {a.answers}</p>
              <button type="button" className={`rp-pill ${chat === a.key ? 'rp-primary' : 'rp-secondary'}`} aria-expanded={chat === a.key}
                onClick={() => setChat(c => c === a.key ? null : a.key)} title={`Check in with ${a.name}: how they're doing, if they need anything`}>
                <MessageCircle size={14} /> Chat
              </button>
            </div>
            {chat === a.key && <TalkToCapThread id={`agent:${a.key}`} who={a.name}
              intro={`Say hi to ${a.name}. Ask how it’s going, what’s on their plate, or if they need anything from you.`}
              placeholder={`How’s it going, ${a.name}? Need anything?`} />}
            {(() => {
              if (skills === null) return <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Loading skills…</span>
              if (mine.length === 0) return <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>No skills written yet</span>
              const open = rolled[a.key] ?? mine.length <= 4
              return <>
                <button type="button" aria-expanded={open} onClick={() => setRolled(r => ({ ...r, [a.key]: !open }))}
                  style={{ all: 'unset', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 4, fontSize: 'var(--fs-sm)', fontWeight: 600, color: 'var(--text-muted)' }}>
                  <ChevronDown size={16} style={{ transform: open ? 'none' : 'rotate(-90deg)', transition: 'transform .2s' }} /> Skills · {mine.length}
                </button>
                {open && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {mine.map(s => <span key={s.id} title={s.when} style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: s.wired ? 'var(--done-bg)' : 'var(--surface-raised)', color: s.wired ? 'var(--done)' : 'var(--text-muted)' }}>{s.name}{s.wired ? '' : ' · not wired yet'}</span>)}
                </div>}
              </>
            })()}
          </article>
        )
      })}
    </div>
  )
}
