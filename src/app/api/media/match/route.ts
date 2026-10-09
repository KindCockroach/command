import { NextRequest, NextResponse } from 'next/server'
import { getAllMediaMeta } from '@/lib/db'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// THOUGHT → MEDIA MATCH. Dump a thought/rant → RISE surfaces the described clips that
// fit it, by MEANING and MOOD (not just keywords). Reads the media memory we built;
// hard rule: never surfaces media flagged with her children. Returns keys + a one-line
// reason each; the client joins keys back to the files it already has (url/thumbnail).
export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set — add it in Railway.' }, { status: 400 })
  }
  const { thought } = await req.json().catch(() => ({}))
  if (!thought || !String(thought).trim()) {
    return NextResponse.json({ error: 'Give me a thought to match.' }, { status: 400 })
  }

  const all = getAllMediaMeta()
  const described = Object.values(all).filter(m => !m.has_children && (m.description || (m.tags ?? []).length))
  if (!described.length) {
    return NextResponse.json({ matches: [], note: 'No described media yet — describe some images in the Media tab first.' })
  }

  const list = described.slice(0, 80)
    .map(m => `${m.key} — ${(m.description || '').slice(0, 120)} [${(m.tags ?? []).join(', ')}]`)
    .join('\n')

  const instructions = `You help a creator find which of HER media fit a thought she wants to post. Match by MEANING and MOOD, not just shared words. Only choose media that genuinely fit — fewer is better than forced. Answer ONLY with JSON.`
  const input = `HER THOUGHT:\n${String(thought).trim()}\n\nHER MEDIA (key — description [tags]):\n${list}\n\nReturn ONLY JSON: {"matches":[{"key":"<exact key>","reason":"one short line on why this clip fits the thought"}]} — up to 5, best first. If nothing truly fits, return {"matches":[]}.`

  try {
    const raw = await fableText({ cheap: true, json: true, maxTokens: 700, instructions, input })
    let p: { matches?: Array<{ key?: string; reason?: string }> } = {}
    try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* empty */ }
    const valid = new Set(described.map(m => m.key))
    const matches = (Array.isArray(p.matches) ? p.matches : [])
      .filter(m => m && m.key && valid.has(m.key))
      .slice(0, 5)
      .map(m => ({ key: m.key as string, reason: (m.reason ?? '').trim() }))
    return NextResponse.json({ matches })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'match failed' }, { status: 502 })
  }
}
