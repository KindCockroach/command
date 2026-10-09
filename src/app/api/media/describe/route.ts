import { NextRequest, NextResponse } from 'next/server'
import { getAllMediaMeta, getMediaMeta, setMediaMeta } from '@/lib/db'
import { fableText } from '@/lib/fable'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// MEDIA AUTO-DESCRIBE — gives a dropped file a memory so it's findable by meaning and
// matchable to a thought. Images go through cheap vision. Flags has_children so posts
// can exclude clips with her kids (hard rule). Video/audio describe = future (they
// already have "Write post from this video" / Transcribe).
//
// GET                              → { meta: { <key>: MediaMeta } }  (all descriptions)
// POST { key, url, type, name }    → describe ONE image, store, return it
// POST { describeAll, files:[...] }→ describe up to 12 un-described images

type Incoming = { key: string; url: string; type?: string; name?: string }

const INSTRUCTIONS = `You catalogue a creator's media so she can find it later and match it to her ideas. Look at the image and answer ONLY with JSON.`
const ASK = `Return ONLY JSON:
{"description":"one concrete sentence of what is literally in this image — subject, setting, action, mood, colors","tags":["5-8 lowercase searchable tags: objects, setting, mood, color, who"],"vibe":"2-3 word feeling","has_children":true if any child/baby/kid appears else false}
Be literal and specific so it is searchable later.`

async function describeImage(f: Incoming) {
  const raw = await fableText({ cheap: true, json: true, imageUrl: f.url, maxTokens: 400, instructions: INSTRUCTIONS, input: ASK })
  let p: { description?: string; tags?: string[]; vibe?: string; has_children?: boolean } = {}
  try { p = JSON.parse(raw.match(/\{[\s\S]*\}/)?.[0] ?? '{}') } catch { /* leave empty */ }
  if (!p.description && !(p.tags && p.tags.length)) return null
  return setMediaMeta(f.key, {
    description: (p.description ?? '').trim(),
    tags: Array.isArray(p.tags) ? p.tags.map(t => String(t).toLowerCase().trim()).filter(Boolean).slice(0, 8) : [],
    vibe: (p.vibe ?? '').trim() || undefined,
    has_children: !!p.has_children,
  })
}

export function GET() {
  return NextResponse.json({ meta: getAllMediaMeta() })
}

export async function POST(req: NextRequest) {
  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json({ error: 'OPENAI_API_KEY not set — add it in Railway so the describer can see images.' }, { status: 400 })
  }
  const body = await req.json().catch(() => ({}))

  // Bulk: describe un-described images the client sends (cap so cost stays in her hands).
  if (body.describeAll && Array.isArray(body.files)) {
    const have = getAllMediaMeta()
    const todo: Incoming[] = body.files
      .filter((f: Incoming) => f && f.url && f.type === 'image' && !have[f.key])
      .slice(0, 12)
    let made = 0
    for (const f of todo) {
      try { if (await describeImage(f)) made++ } catch { /* skip one, keep going */ }
    }
    const remaining = body.files.filter((f: Incoming) => f && f.type === 'image' && !getAllMediaMeta()[f.key]).length
    return NextResponse.json({ ok: true, described: made, remaining })
  }

  // Single file.
  const f = body as Incoming
  if (!f.key || !f.url) return NextResponse.json({ error: 'key and url required' }, { status: 400 })
  if (f.type && f.type !== 'image') {
    return NextResponse.json({ skipped: true, reason: 'Only images auto-describe for now — use "Write post from this video" / Transcribe for clips.' })
  }
  if (getMediaMeta(f.key)) return NextResponse.json({ ok: true, meta: getMediaMeta(f.key), cached: true })
  try {
    const meta = await describeImage(f)
    if (!meta) return NextResponse.json({ error: 'The describer came back empty — try again.' }, { status: 502 })
    return NextResponse.json({ ok: true, meta })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'describe failed' }, { status: 502 })
  }
}
