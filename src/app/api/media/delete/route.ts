import { NextRequest, NextResponse } from 'next/server'
import { deleteObject, getPublicUrl, isR2Configured } from '@/lib/r2'
import { getAllContent, updateContent } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

// Delete a Media file from R2 and unlink it from any post that referenced it, so
// no card is left pointing at a dead URL. POST { key } → { ok, unlinked }.
export async function POST(req: NextRequest) {
  if (!isR2Configured()) return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
  const { key } = await req.json()
  if (!key) return NextResponse.json({ error: 'key required' }, { status: 400 })

  const url = getPublicUrl(key)

  let unlinked = 0
  for (const c of getAllContent()) {
    const hitsMain = c.media_url === url
    const hitsList = (c.media_urls ?? []).includes(url)
    const hitsHf = c.higgsfield_url === url
    const hitsHg = c.heygen_video_url === url
    if (hitsMain || hitsList || hitsHf || hitsHg) {
      updateContent(c.id, {
        ...(hitsMain ? { media_url: '' } : {}),
        ...(hitsList ? { media_urls: (c.media_urls ?? []).filter(u => u !== url) } : {}),
        ...(hitsHf ? { higgsfield_url: '' } : {}),
        ...(hitsHg ? { heygen_video_url: '' } : {}),
      })
      unlinked++
    }
  }

  try {
    await deleteObject(key)
  } catch (e) {
    return NextResponse.json({ error: `Delete failed: ${e instanceof Error ? e.message : 'error'}` }, { status: 502 })
  }

  return NextResponse.json({ ok: true, unlinked })
}
