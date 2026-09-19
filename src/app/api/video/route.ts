import { NextRequest, NextResponse } from 'next/server'
import { updateContent, getBrandAccount } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

// DROP A FINISHED VIDEO → A READY POST. We don't "watch" the video — the message
// lives in the audio. So: transcribe it (ffmpeg pulls the audio, Whisper reads it),
// hand the transcript to the River (auto-routes to the account it fits, writes the
// on-screen hook + caption in that account's voice), then attach the REAL video to
// the card. Comes back ready to approve. The on-screen text is written for Mandi to
// burn in via CapCut (RISE can't paint text onto the video itself).
export async function POST(req: NextRequest) {
  const { videoUrl, accountId } = await req.json().catch(() => ({}))
  if (!videoUrl) return NextResponse.json({ error: 'videoUrl required' }, { status: 400 })
  // Loopback — Railway's edge refuses a container looping through its own public host.
  const base = `http://127.0.0.1:${process.env.PORT || 3000}`

  // 1) Transcribe the video's audio.
  let transcript = ''
  try {
    const tRes = await fetch(`${base}/api/transcribe`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ audioUrl: videoUrl }),
    })
    const tData = await tRes.json().catch(() => ({}))
    transcript = (tData.transcript ?? '').trim()
  } catch { /* handled below */ }
  if (!transcript) return NextResponse.json({ error: "Couldn't hear the words in that video — is there spoken audio? (Silent clips can't be auto-written yet.)" }, { status: 502 })

  // 2) River: route to the best account + write the on-screen hook + caption from
  //    her actual words. (No media passed here — River writes from the transcript;
  //    we attach the real video in step 3.)
  const input = `This is the TRANSCRIPT of a short VIDEO Mandi filmed (her real footage, her voice). Write the post that ships with it: an on-screen HOOK (a bold overlay line for the video — a statement, never a question) plus the caption, in the right account's voice. Do NOT describe the video; write from what she SAYS.\n\nTRANSCRIPT:\n${transcript.slice(0, 12000)}`
  let piece: { id: number; account_id?: string | null } | null = null
  let account: { handle?: string } | null = null
  try {
    const rRes = await fetch(`${base}/api/river`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input, source: 'video-drop', ...(accountId ? { accountId } : {}) }),
    })
    const rData = await rRes.json().catch(() => ({}))
    if (rData.kind !== 'content' || !rData.piece) {
      return NextResponse.json({ error: rData.error || 'The River couldn’t place this video.', kind: rData.kind }, { status: 502 })
    }
    piece = rData.piece
    account = rData.account ?? null
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'compose failed' }, { status: 502 })
  }

  // 3) Attach the REAL video as the post's media + mark it a video post (no image prompt).
  const acct = piece!.account_id ? getBrandAccount(piece!.account_id) : null
  const updated = updateContent(piece!.id, {
    type: 'video',
    media_url: videoUrl,
    media_urls: [videoUrl],
    image_prompt: '',
    transcript,
  })

  return NextResponse.json({
    piece: updated ?? piece,
    account: account ?? (acct ? { handle: acct.handle } : null),
    transcriptWords: transcript.split(/\s+/).length,
  })
}
