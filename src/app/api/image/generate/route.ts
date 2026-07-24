import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { getAllContent, updateContent } from '@/lib/db'
import { putObject, getPublicUrl, mediaKey } from '@/lib/r2'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Generate the post's actual image from its image_prompt and attach it.
export async function POST(req: NextRequest) {
  const { contentId, prompt } = await req.json()
  const piece = getAllContent().find(c => c.id === Number(contentId))
  if (!piece) return NextResponse.json({ error: 'content not found' }, { status: 404 })

  const imagePrompt = (prompt ?? piece.image_prompt ?? '').trim()
  if (!imagePrompt) return NextResponse.json({ error: 'No image prompt on this post' }, { status: 400 })

  const generate = async (model: string) => client.images.generate({
    model,
    prompt: `${imagePrompt}\n\nStyle: warm, human, editorial-quality social media visual. Square 1:1 composition, centered so nothing important is near the edges. No text unless the prompt demands it.`,
    n: 1,
    size: '1024x1024',
    ...(model === 'gpt-image-1'
      ? { quality: 'medium', output_format: 'jpeg', output_compression: 80 }
      : { response_format: 'b64_json' as const }),
  } as never) as Promise<{ data?: Array<{ b64_json?: string; url?: string }> }>

  try {
    let result
    try { result = await generate('gpt-image-1') }
    catch { result = await generate('dall-e-3') }

    const item = result.data?.[0]
    let bytes: Buffer | null = null
    if (item?.b64_json) bytes = Buffer.from(item.b64_json, 'base64')
    else if (item?.url) bytes = Buffer.from(await (await fetch(item.url)).arrayBuffer())
    if (!bytes) throw new Error('no image returned')

    const key = mediaKey('post-media', piece.title || 'image', 'jpg')
    const ok = await putObject(key, bytes, 'image/jpeg')
    if (!ok) throw new Error('storage failed')
    const publicUrl = getPublicUrl(key)
    const urls = [...(piece.media_urls ?? []), publicUrl]
    updateContent(piece.id, { media_url: piece.media_url || publicUrl, media_urls: urls })
    return NextResponse.json({ generated: true, url: publicUrl })
  } catch (e) {
    return NextResponse.json({ error: `Image generation failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  }
}
