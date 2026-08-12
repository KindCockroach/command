import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getAllAvatars, getBrandAccount } from '@/lib/db'
import { putObject, getPublicUrl, mediaKey } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BASE = 'https://api.heygen.com'

// HeyGen sometimes returns an empty body or an HTML error page (rate limit,
// outage, bad key). Reading .json() on that throws and crashes the route with an
// empty response — which the client then chokes on ("Unexpected end of JSON
// input"). Parse defensively and surface a real error instead.
async function safeJson(res: Response): Promise<{ ok: boolean; data: unknown; text: string }> {
  const text = await res.text().catch(() => '')
  try { return { ok: true, data: JSON.parse(text), text } } catch { return { ok: false, data: null, text } }
}

// The missing loop: start an avatar video for a post, then poll until HeyGen
// finishes — and pull the MP4 back INTO the post card as its media.
// POST { contentId, action: 'start' | 'check' }
export async function POST(req: NextRequest) {
  const { contentId, action, audioUrl } = await req.json()
  const key = process.env.HEYGEN_API_KEY
  if (!key) return NextResponse.json({ error: 'HEYGEN_API_KEY not set' }, { status: 503 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  try {
  if (action === 'start') {
    // Resolve the avatar via the trinity: account.avatar_id → avatar record
    const account = piece.account_id ? getBrandAccount(piece.account_id) : null
    const avatar = getAllAvatars().find(a => a.id === (account?.avatar_id ?? '')) ?? getAllAvatars().find(a => a.id === 'mandi')
    const photoId = avatar?.heygen_photo_id || process.env.HEYGEN_PHOTO_DEFAULT
    if (!photoId) {
      return NextResponse.json({ error: `No HeyGen talking photo for ${account?.handle ?? 'this account'} — wire AI Mom Mandi (Avatars) or set one in the account editor (🎭).` }, { status: 400 })
    }

    // Audio-driven: if she dropped her REAL voice recording (passed as audioUrl, or an
    // audio file on the card), lip-sync Mandi's photo to her exact audio — no TTS.
    // Otherwise fall back to text-to-speech from the script.
    const cardAudio = piece.file_path && /\.(mp3|wav|m4a|aac|ogg)(\?|$)/i.test(piece.file_path) ? piece.file_path : ''
    const audio = (audioUrl || cardAudio || '').trim()

    const scriptMatch = (piece.description ?? '').match(/Script:\s*([\s\S]*?)(?=\n\n[A-Z][a-z]+:|$)/)
    const script = (piece.script || scriptMatch?.[1] || piece.onscreen_text || piece.description || '').trim().slice(0, 1200)

    // AUDIO-ONLY accounts (the podcast) must lip-sync to HER real voice — never a
    // synthetic HeyGen TTS voice. If there's no audio attached, stop and say so.
    const audioOnly = account?.id === 'aimompodcast' || /podcast|your voice|real voice/i.test(account?.content_format ?? '')
    if (audioOnly && !audio) {
      return NextResponse.json({ error: `${account?.handle ?? 'This account'} uses YOUR real voice — attach your podcast audio clip first (drop it in Media → 🎬 Captioned Reel, or attach the audio to this card). No synthetic voice here.` }, { status: 400 })
    }
    if (!audio && !script) return NextResponse.json({ error: 'Drop your voice recording (or add a script) before rendering.' }, { status: 400 })

    // ONLY a HeyGen voice id is valid here — an ElevenLabs id makes HeyGen throw
    // "Voice not found". If we have no HeyGen voice, omit it and let HeyGen use its
    // default TTS voice. (For HER real voice, drop a voice clip → audio-driven render.)
    const voiceId = avatar?.heygen_voice_id || process.env.HEYGEN_VOICE_DEFAULT
    const voice = audio
      ? { type: 'audio', audio_url: audio }
      : { type: 'text', input_text: script, ...(voiceId ? { voice_id: voiceId } : {}) }
    const res = await fetch(`${BASE}/v2/video/generate`, {
      method: 'POST',
      headers: { 'X-Api-Key': key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        video_inputs: [{
          character: { type: 'talking_photo', talking_photo_id: photoId },
          voice,
          background: { type: 'color', value: '#FBFAF7' },
        }],
        dimension: { width: 1080, height: 1920 },
        caption: true,
        title: `${avatar?.name ?? 'AI Mom Mandi'} — ${piece.title.slice(0, 40)}`,
      }),
    })
    const { ok, data: raw, text } = await safeJson(res)
    if (!ok) return NextResponse.json({ error: `Couldn't reach HeyGen (status ${res.status}). Check the API key and credits, then retry.`, detail: text.slice(0, 200) }, { status: 502 })
    const data = raw as { data?: { video_id?: string }; error?: { message?: string } }
    const videoId = data?.data?.video_id
    if (!videoId) return NextResponse.json({ error: data?.error?.message ?? 'HeyGen rejected the render', raw: data }, { status: 502 })
    updateContent(piece.id, { heygen_video_id: videoId })
    return NextResponse.json({ started: true, videoId, avatar: avatar?.name ?? 'AI Mom Mandi', voiceMode: audio ? 'your audio' : 'tts' })
  }

  if (action === 'check') {
    const videoId = piece.heygen_video_id
    if (!videoId) return NextResponse.json({ error: 'No render in progress for this post' }, { status: 400 })
    const res = await fetch(`${BASE}/v1/video_status.get?video_id=${videoId}`, { headers: { 'X-Api-Key': key } })
    const { ok, data: raw } = await safeJson(res)
    if (!ok) return NextResponse.json({ status: 'processing', note: `HeyGen status check returned no JSON (status ${res.status}); will retry.` })
    const data = raw as { data?: { status?: string; video_url?: string; error?: { message?: string } } }
    const status = data?.data?.status
    if (status === 'completed' && data?.data?.video_url) {
      // Pull the MP4 out of HeyGen and onto OUR storage, then attach to the card
      try {
        const vid = await fetch(data.data.video_url)
        const bytes = Buffer.from(await vid.arrayBuffer())
        const r2key = mediaKey('post-media', `${piece.title || 'video'}-heygen`, 'mp4')
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
  } catch (e) {
    // Never crash with an empty body — always hand the client real JSON to show.
    return NextResponse.json({ error: `HeyGen connection error: ${e instanceof Error ? e.message : 'unknown'}. Tap to retry.` }, { status: 502 })
  }
}
