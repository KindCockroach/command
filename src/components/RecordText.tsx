'use client'
// Phase 8 · B3: agent replies and receipts that name a record get an Open button.
// "Note 310", "Note #310", "card #25", "Card 25" → a small inline button that opens it in RISE.
import { Fragment } from 'react'
import { openRecord, RECORD_LABEL, type RecordKind } from '@/lib/openRecord'

const RE = /\b(note|card)\s*#?\s*(\d{1,6})\b/gi

export function withRecordLinks(text: string | null | undefined): React.ReactNode {
  const t = text ?? ''
  if (!RE.test(t)) return t
  RE.lastIndex = 0
  const out: React.ReactNode[] = []
  let last = 0, m: RegExpExecArray | null, k = 0
  while ((m = RE.exec(t))) {
    if (m.index > last) out.push(<Fragment key={k++}>{t.slice(last, m.index)}</Fragment>)
    const kind = m[1].toLowerCase() as RecordKind, id = Number(m[2])
    out.push(
      <button key={k++} type="button" className="rec-link" onClick={e => { e.stopPropagation(); openRecord(kind, id) }} title={`Open ${RECORD_LABEL[kind]} ${id} in RISE`}>
        {m[0]} ↗
      </button>,
    )
    last = m.index + m[0].length
  }
  if (last < t.length) out.push(<Fragment key={k++}>{t.slice(last)}</Fragment>)
  return out
}

export default function RecordText({ text }: { text: string | null | undefined }) {
  return <>{withRecordLinks(text)}</>
}
