'use client'
import { useState, useEffect } from 'react'
import { Globe, Sparkles, Loader2, Copy, CheckCheck, ChevronDown } from 'lucide-react'

type Board = { country: string; website: string; email: string }
type PitchResult = {
  subject_line: string
  email_body: string
  key_talking_points: string[]
  suggested_deliverables: string[]
  best_seasons_to_visit: string
  family_friendly_angle: string
  country: string
  email: string
  website: string
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: '11px', color: copied ? '#3daa7c' : 'var(--text-muted)', fontFamily: 'inherit' }}>
      {copied ? <CheckCheck size={11} /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

export default function PitchStudio() {
  const [boards, setBoards] = useState<Board[]>([])
  const [search, setSearch] = useState('')
  const [selected, setSelected] = useState<Board | null>(null)
  const [angle, setAngle] = useState('family travel with educational homeschool angle')
  const [familyDetails, setFamilyDetails] = useState('')
  const [generating, setGenerating] = useState(false)
  const [result, setResult] = useState<PitchResult | null>(null)
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    fetch('/tourism_boards.json').then(r => r.json()).then(setBoards).catch(() => {})
  }, [])

  const filtered = boards.filter(b => b.country.toLowerCase().includes(search.toLowerCase())).slice(0, 8)

  const generate = async () => {
    if (!selected) return
    setGenerating(true)
    setResult(null)
    try {
      const res = await fetch('/api/pitch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ country: selected.country, website: selected.website, email: selected.email, angle, familyDetails }),
      })
      setResult(await res.json())
    } catch {
      // ignore
    } finally {
      setGenerating(false)
    }
  }

  const ANGLES = [
    'family travel with educational homeschool angle',
    'AI Mom documenting how AI tools made trip planning effortless',
    'mom of 4 under 5 — real, raw, hilarious family travel',
    'inner child healing + travel as personal growth',
    'world schooling — education through cultural immersion',
    'solo press trip — Mandi as solo creator/journalist',
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid #3DAA7C', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Globe size={15} color="#3DAA7C" />
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Travel Pitch Studio</span>
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', background: 'var(--bg)', padding: '2px 8px', borderRadius: '20px', border: '1px solid var(--border)' }}>194 tourism boards</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Pick a destination → get a ready-to-send pitch email tailored to that tourism board. Covers your deliverables, family angle, and the ask.
        </p>

        {/* Destination search */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ position: 'relative' }}>
            <input
              value={search}
              onChange={e => { setSearch(e.target.value); setShowDropdown(true) }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search destination (Costa Rica, Japan, Iceland...)"
              style={inputSt}
            />
            {showDropdown && filtered.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginTop: '2px', overflow: 'hidden' }}>
                {filtered.map(b => (
                  <div key={b.country} onClick={() => { setSelected(b); setSearch(b.country); setShowDropdown(false) }}
                    style={{ padding: '10px 14px', cursor: 'pointer', fontSize: '13px', color: 'var(--text)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <span>{b.country}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{b.email?.split('\n')[0]?.substring(0, 40)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Angle selector */}
          <div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '6px', fontWeight: 600 }}>Pitch angle</p>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {ANGLES.map(a => (
                <button key={a} onClick={() => setAngle(a)}
                  style={{ padding: '5px 10px', borderRadius: '20px', border: `2px solid ${angle === a ? '#3DAA7C' : 'var(--border)'}`, background: angle === a ? 'rgba(61,170,124,0.1)' : 'var(--bg)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: angle === a ? '#3DAA7C' : 'var(--text-muted)', fontFamily: 'inherit' }}>
                  {a.split(' ').slice(0, 4).join(' ')}...
                </button>
              ))}
            </div>
          </div>

          {/* Custom details */}
          <textarea value={familyDetails} onChange={e => setFamilyDetails(e.target.value)} rows={2}
            placeholder="Any specific details to include? (dates, specific experiences you want, previous trips, follower count...)"
            style={{ ...inputSt, resize: 'vertical' }} />

          <button onClick={generate} disabled={generating || !selected}
            style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: (!selected || generating) ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '13px', background: (!selected || generating) ? 'var(--border)' : '#3DAA7C', color: '#fff', alignSelf: 'flex-start', fontFamily: 'inherit' }}>
            {generating ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Writing your pitch...</> : <><Sparkles size={14} /> Generate Pitch for {selected?.country ?? 'destination'}</>}
          </button>
        </div>
      </div>

      {/* Result */}
      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Contact info */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3DAA7C' }}>Send To</p>
            </div>
            <p style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 700 }}>{result.country} Tourism Board</p>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px' }}>{result.email}</p>
            <a href={result.website} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px', color: 'var(--purple)' }}>{result.website}</a>
          </div>

          {/* Subject line */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Subject Line</p>
              <CopyBtn text={result.subject_line} />
            </div>
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{result.subject_line}</p>
          </div>

          {/* Email body */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)' }}>Email Body</p>
              <CopyBtn text={result.email_body} />
            </div>
            <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap', maxHeight: '400px', overflowY: 'auto', background: 'var(--bg)', padding: '14px', borderRadius: '8px', border: '1px solid var(--border)' }}>
              {result.email_body}
            </div>
          </div>

          {/* Talking points + deliverables */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Key Talking Points</p>
              {result.key_talking_points?.map((p, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: '#3DAA7C', fontWeight: 800, fontSize: '12px' }}>·</span>
                  <span style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>{p}</span>
                </div>
              ))}
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '14px' }}>
              <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '10px' }}>Deliverables Offered</p>
              {result.suggested_deliverables?.map((d, i) => (
                <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ color: 'var(--purple)', fontWeight: 800, fontSize: '12px' }}>✓</span>
                  <span style={{ fontSize: '12px', color: 'var(--text)', lineHeight: 1.4 }}>{d}</span>
                </div>
              ))}
            </div>
          </div>

          {result.best_seasons_to_visit && (
            <div style={{ background: 'rgba(61,170,124,0.07)', borderRadius: '10px', padding: '12px 14px', fontSize: '12px', color: 'var(--text)' }}>
              <strong>Best seasons to pitch: </strong>{result.best_seasons_to_visit}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}

const inputSt: React.CSSProperties = { padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' }
