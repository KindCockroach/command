import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getAllAvatars, getBrandAccount } from '@/lib/db'
import { putObject, getPublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BASE = 'https://api.heygen.com'

// The missing loop: start an avatar video for a post, then poll until HeyGen
// finishes — and pull the MP4 back INTO the post card as its media.
// POST { contentId, action: 'start' | 'check' }
export async function POST(req: NextRequest) {
  const { contentId, action } = await req.json()
  const key = process.env.HEYGEN_API_KEY
  if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY not set' }, { status: 503 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  if (action === 'start') {
    // Resolve the avatar via the trinity: account.avatar_id → avatar record
    const account = piece.account_id ? getBrandAccount(piece.account_id) : null
    const avatar = getAllAvatars().find(a => a.id === (account?.avatar_id ?? '')) ?? getAllAvatars().find(a => a.id === 'sage')
    if (!avatar?.heygen_photo_id) {
      return NextResponse.json({ error: `No avatar with a HeyGen photo linked to ${account?.handle ?? 'this account'} — set one in the account editor (🎭) and the avatar's photo ID in Avatars.` }, { status: 400 })
    }

    // Script: prefer an explicit Script section, else on-screen beats, else the caption
    const scriptMatch = (piece.description ?? '').match(/Script:\s*([\s\S]*?)(?=\n\n[A-Z][a-z]+:|$)/)
    const script = (piece.script || scriptMatch?.[1] || piece.onscreen_text || piece.description || '').trim().slice(0, 1200)
    if (!script) return NextResponse.json({ error: 'No script text on this post' }, { status: 400 })

    const voiceId = avatar.heygen_voice_id || avatar.elevenlabs_voice_id || process.env.HEYGEN_VOICE_DEFAULT
    const res = await fetch(`${BASE}/v2/video/generate`, {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [{
          character: { type: 'talking_photo', talking_photo_id: avatar.heygen_photo_id },
          voice: { type: 'text', input_text: script, ...(voiceId ? { voice_id: voiceId } : {}) },
          background: { type: 'color', value: '#FBFAF7' },
        }],
        dimension: { width: 1080, height: 1920 },
        caption: true,
        title: `${avatar.name} — ${piece.title.slice(0, 40)}`,
      }),
    })
    const data = await res.json()
    const videoId = data?.data?.video_id
    if (!videoId) return NextResponse.json({ error: data?.error?.message ?? 'HeyGen rejected the render', raw: data }, { status: 502 })
    updateContent(piece.id, { heygen_video_id: videoId })
    return NextResponse.json({ started: true, videoId, avatar: avatar.name })
  }

  if (action === 'check') {
    const videoId = piece.heygen_video_id
    if (!videoId) return NextResponse.json({ error: 'No render in progress for this post' }, { status: 400 })
    const res = await fetch(`${BASE}/v1/video_status.get?video_id=${videoId}`, { headers: { 'X-Api-Key': key } })
    const data = await res.json()
    const status = data?.data?.status
    if (status === 'completed' && data?.data?.video_url) {
      // Pull the MP4 out of HeyGen and onto OUR storage, then attach to the card
      try {
        const vid = await fetch(data.data.video_url)
        const bytes = Buffer.from(await vid.arrayBuffer())
        const r2key = `post-media/${randomUUID()}.mp4`
        const ok = await putObject(r2key, bytes, 'video/mp4')
        if (!ok) throw new Error('storage failed')
        const publicUrl = getPublicUrl(r2key)
        const urls = [...(piece.media_urls ?? []).filter(u => u !== publicUrl), publicUrl]
        updateContent(piece.id, { media_url: publicUrl, media_urls: urls, heygen_video_url: publicUrl })
        return NextResponse.json({ status: 'attached', videoUrl: publicUrl })
      } catch {
        // Attachment failed — still surface HeyGen's URL so nothing is lost
        updateContent(piece.id, { heygen_video_url: data.data.video_url })
        return NextResponse.json({ status: 'completed_external', videoUrl: data.data.video_url, note: 'Saved HeyGen link; storage copy failed' })
      }
    }
    if (status === 'failed') return NextResponse.json({ status: 'failed', error: data?.data?.error?.message ?? 'render failed' })
    return NextResponse.json({ status: status ?? 'processing' })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
