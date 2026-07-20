import { NextRequest, NextResponse } from 'next/server'
import { getAllContent, updateContent } from '@/lib/db'
import { putObject, getPublicUrl } from '@/lib/r2'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const BASE = 'https://platform.higgsfield.ai'

// Send a post's image_prompt to Higgsfield's Supercomputer (Soul text-to-image),
// then poll until the cinematic frame renders and pull it back onto the post card
// as a new gallery image — the same start/check loop as HeyGen.
// POST { contentId, action: 'start' | 'check', ratio?: 'square' | 'portrait' }
export async function POST(req: NextRequest) {
  const { contentId, action, ratio } = await req.json()
  const keyId = process.env.HIGGSFIELD_API_KEY_ID
  const secret = process.env.HIGGSFIELD_API_KEY_SECRET
  if (!keyId || !secret) {
    return NextResponse.json({ error: 'HIGGSFIELD_API_KEY_ID / HIGGSFIELD_API_KEY_SECRET not set in Railway' }, { status: 503 })
  }
  const authHeaders = { 'Authorization': `Key ${keyId}:${secret}`, 'Content-Type': 'application/json' }

  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  if (action === 'start') {
    const prompt = (piece.image_prompt ?? '').trim()
    if (!prompt) return NextResponse.json({ error: 'No image prompt on this post to send to Supercomputer' }, { status: 400 })

    const size = ratio === 'square' ? 'square_1536x1536' : 'portrait_1536x2048'
    const res = await fetch(`${BASE}/v1/text2image/soul`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        prompt: `${prompt}\n\nStyle: cinematic, photorealistic, warm natural light, editorial-quality, shallow depth of field.`,
        width_and_height: size,
        quality: 'hd',
        batch_size: 'single',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      return NextResponse.json({ error: data?.error?.message ?? data?.message ?? `Supercomputer rejected the request (${res.status})`, raw: data }, { status: 502 })
    }
    const requestId = data?.request_id ?? data?.id
    if (!requestId) return NextResponse.json({ error: 'Supercomputer did not return a request id', raw: data }, { status: 502 })
    updateContent(piece.id, { higgsfield_request_id: String(requestId) })
    return NextResponse.json({ started: true, requestId })
  }

  if (action === 'check') {
    const requestId = piece.higgsfield_request_id
    if (!requestId) return NextResponse.json({ error: 'No Supercomputer render in progress for this post' }, { status: 400 })

    const res = await fetch(`${BASE}/requests/${requestId}/status`, { headers: authHeaders })
    const data = await res.json().catch(() => ({}))
    const status = String(data?.status ?? '').toLowerCase()

    // Dig the result URL out of the likely shapes Higgsfield returns
    const imgUrl: string | undefined =
      data?.images?.[0]?.url ??
      data?.results?.[0]?.url ??
      data?.jobs?.[0]?.results?.raw?.url ??
      data?.jobs?.[0]?.results?.min?.url ??
      data?.result?.url

    if ((status === 'completed' || status === 'succeeded' || status === 'success') && imgUrl) {
      // Pull the frame out of Higgsfield and onto OUR storage, then attach to the card
      try {
        const img = await fetch(imgUrl)
        const bytes = Buffer.from(await img.arrayBuffer())
        const r2key = `post-media/${randomUUID()}.jpg`
        const ok = await putObject(r2key, bytes, 'image/jpeg')
        if (!ok) throw new Error('storage failed')
        const publicUrl = getPublicUrl(r2key)
        const urls = [...(piece.media_urls ?? []).filter(u => u !== publicUrl), publicUrl]
        updateContent(piece.id, { media_url: piece.media_url || publicUrl, media_urls: urls, higgsfield_url: publicUrl })
        return NextResponse.json({ status: 'attached', url: publicUrl })
      } catch {
        updateContent(piece.id, { higgsfield_url: imgUrl })
        return NextResponse.json({ status: 'completed_external', url: imgUrl, note: 'Saved Higgsfield link; storage copy failed' })
      }
    }
    if (status === 'failed' || status === 'nsfw' || status === 'canceled') {
      return NextResponse.json({ status: 'failed', error: data?.error?.message ?? `render ${status}` })
    }
    return NextResponse.json({ status: status || 'processing' })
  }

  return NextResponse.json({ error: 'unknown action' }, { status: 400 })
}
