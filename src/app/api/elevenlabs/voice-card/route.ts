import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent, getBrandAccount, getAllAvatars } from '@/lib/db'
import { putObject, getPublicUrl, mediaKey } from '@/lib/r2'
import { logCost } from '@/lib/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

const BASE = 'https://api.elevenlabs.io/v1'

// Voice a post in Mandi's ElevenLabs clone → store the mp3 in R2 → attach it to
// the card as audio_url. Pairs with the HeyGen visual or drops into CapCut.
// Built to burn down ElevenLabs credits into a usable audio library.
export async function POST(req: NextRequest) {
  const key = process.env.ELEVENLABS_API_KEY
  if (!key) return NextResponse.json({ error: 'ElevenLabs key not configured' }, { status: 503 })

  const { contentId, text } = await req.json()
  if (!contentId) return NextResponse.json({ error: 'contentId required' }, { status: 400 })

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  // Use the voice set on THIS post's account avatar (so changing the avatar's
  // ElevenLabs voice updates every Re-voice), falling back to the env default.
  const account = piece.account_id ? getBrandAccount(piece.account_id) : null
  const avatar = (account?.avatar_id ? getAllAvatars().find(a => a.id === account.avatar_id) : null) ?? getAllAvatars().find(a => a.id === 'mandi')
  const voiceId = avatar?.elevenlabs_voice_id || process.env.ELEVENLABS_VOICE_ID
  if (!voiceId) return NextResponse.json({ error: 'No ElevenLabs voice set on the avatar or in env' }, { status: 503 })

  // What she'd actually SAY: prefer a spoken script, else the caption body (no
  // hashtags), else the hook. Cap length so one clip can't blow the credit budget.
  const raw = (text || piece.script || (piece.description ?? '').split(/\n\n#|\n#/)[0] || piece.onscreen_text || '').trim()
  const speak = raw.replace(/#[^\s#]+/g, '').replace(/\s+/g, ' ').trim().slice(0, 2500)
  if (!speak) return NextResponse.json({ error: 'Nothing to voice on this card' }, { status: 400 })

  const res = await fetch(`${BASE}/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: { 'xi-api-key': key, 'Content-Type': 'application/json', Accept: 'audio/mpeg' },
    body: JSON.stringify({ text: speak, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } }),
  })
  if (!res.ok) {
    const t = await res.text()
    return NextResponse.json({ error: `ElevenLabs rejected it: ${t.slice(0, 140)}` }, { status: 502 })
  }
  const bytes = Buffer.from(await res.arrayBuffer())
  const k = mediaKey('post-media', `${piece.title || 'voice'}-mandi`, 'mp3')
  const ok = await putObject(k, bytes, 'audio/mpeg')
  if (!ok) return NextResponse.json({ error: 'Storing the audio failed' }, { status: 500 })

  const audio_url = getPublicUrl(k)
  updateContent(piece.id, { audio_url })
  logCost('elevenlabs-voice', 'voice', 0) // subscription credits; tracked for call count
  return NextResponse.json({ audio_url, chars: speak.length })
}
