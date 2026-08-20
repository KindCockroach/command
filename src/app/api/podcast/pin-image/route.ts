import { NextRequest, NextResponse } from 'next/server'
import OpenAI from 'openai'
import { putObject, getPublicUrl, mediaKey } from '@/lib/r2'
import { logCost } from '@/lib/usage'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// Generate a Pinterest pin image from a pin's image_prompt and store it to Media.
// Standalone (no content piece needed) — the Podcast Engine's pins aren't Content
// rows, so this returns the stored URL for the UI to show and download.
export async function POST(req: NextRequest) {
  const { prompt, title } = await req.json().catch(() => ({}))
  const imagePrompt = (prompt ?? '').trim()
  if (!imagePrompt) return NextResponse.json({ error: 'image prompt required' }, { status: 400 })

  // Pinterest pins are tall (2:3). gpt-image-1 supports 1024x1536; dall-e-3 uses
  // its nearest portrait size.
  const generate = async (model: string) => client.images.generate({
    model,
    prompt: `${imagePrompt}\n\nStyle: warm, human, editorial-quality Pinterest pin visual. Vertical 2:3 composition, subject centered with breathing room. No text baked in.`,
    n: 1,
    size: model === 'gpt-image-1' ? '1024x1536' : '1024x1792',
    ...(model === 'gpt-image-1'
      ? { quality: 'medium', output_format: 'jpeg', output_compression: 80 }
      : { response_format: 'b64_json' as const }),
  } as never) as Promise<{ data?: Array<{ b64_json?: string; url?: string }> }>

  try {
    let usedModel = 'gpt-image-1'
    let result
    try { result = await generate('gpt-image-1') }
    catch { usedModel = 'dall-e-3'; result = await generate('dall-e-3') }

    const item = result.data?.[0]
    let bytes: Buffer | null = null
    if (item?.b64_json) bytes = Buffer.from(item.b64_json, 'base64')
    else if (item?.url) bytes = Buffer.from(await (await fetch(item.url)).arrayBuffer())
    if (!bytes) throw new Error('no image returned')

    const key = mediaKey('pinterest-pins', title || 'pin', 'jpg')
    const ok = await putObject(key, bytes, 'image/jpeg')
    if (!ok) throw new Error('storage failed')
    const url = getPublicUrl(key)
    logCost(usedModel, 'image', 0.04)
    return NextResponse.json({ url })
  } catch (e) {
    return NextResponse.json({ error: `Pin image failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  }
}
