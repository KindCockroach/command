'use client'
import { useEffect, useState } from 'react'

// Phase 7 · the Agents tab: the 11 real agents (RISE_Agent_SOPs.md, Draft 2, plus the Phase 4
// chain: writers write, Ed checks, Cap reviews and schedules, Her presents, Mandi approves),
// each with the skills it owns in the skills store. The old characters (Hat, Str, Ops, Con,
// Fut, Zen, Tan, Sis, the old Anchor persona) are retired; their past chats stay under "Old chats".
type Skill = { id: string; owner: string; name: string; when: string; wired: boolean }
const AGENTS: { key: string; name: string; role: string; does: string; answers: string }[] = [
  { key: 'her', name: 'Her', role: 'Thought partner · the front door', answers: 'You', does: 'Picks up when you talk without naming anyone. Thinks with you, pushes back, saves your words to Notes and hands your decisions on with a receipt. Presents finished drafts for your yes.' },
  { key: 'commander', name: 'Man', role: 'Commander · decider and multiplier', answers: 'Her', does: 'Takes a note, however messy, and turns it into every piece it can be. Acts in RISE with real tools and shows a receipt for everything he does. Runs the health check and the morning report.' },
  { key: 'cap', name: 'Cap', role: 'Boss of every campaign · owns the map', answers: 'Man', does: 'Plans every account, fills the calendar, reviews every draft and decides if and when it runs. Owns the People lists and the email campaigns.' },
  { key: 'rex', name: 'Rex', role: 'Short-form writer', answers: 'Cap', does: 'Writes cards, captions, hooks and on-screen text from a brief.' },
  { key: 'pod', name: 'Pod', role: 'Long-form writer', answers: 'Cap', does: 'Writes podcast and teleprompter scripts, Medium and Substack pieces, and meditation scripts from an outline.' },
  { key: 'ed', name: 'Ed', role: 'The editor', answers: 'Her', does: 'Checks every draft against the brief, your voice and the guardrails. Writes the card basics (title and on-screen hook) and the campaign emails, and finishes your own writing.' },
  { key: 'cora', name: 'Cora', role: 'Journalist (was Anchor)', answers: 'Cap', does: 'Finds the stories in your captions, interviews you, decides the story and outlines it for Pod. Lives in Create › Story.' },
  { key: 'biz', name: 'Biz', role: 'Business development', answers: 'Man', does: 'Proposes new business and offers, and calls on Fin for the numbers.' },
  { key: 'fin', name: 'Fin', role: 'Money', answers: 'Biz', does: 'Return, cash flow, and whether a spend is worth it.' },
  { key: 'owl', name: 'Owl', role: 'Research', answers: 'Whoever asks', does: 'Live web search with sources. Lives in Library › Research.' },
  { key: 'ten', name: 'Ten', role: 'Trends', answers: 'Whoever asks', does: 'What is trending this week (sounds, formats) and the open angle on a story.' },
]

export default function AgentsRoster() {
  const [skills, setSkills] = useState<Skill[] | null>(null)
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
            <p style={{ margin: 0, fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Answers to {a.answers}</p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
              {skills === null ? <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>Loading skills…</span>
                : mine.length === 0 ? <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-muted)' }}>No skills written yet</span>
                : mine.map(s => <span key={s.id} title={s.when} style={{ fontSize: 'var(--fs-xs)', fontWeight: 600, padding: '4px 10px', borderRadius: 999, background: s.wired ? 'var(--done-bg)' : 'var(--surface-raised)', color: s.wired ? 'var(--done)' : 'var(--text-muted)' }}>{s.name}{s.wired ? '' : ' · not wired yet'}</span>)}
            </div>
          </article>
        )
      })}
    </div>
  )
}
