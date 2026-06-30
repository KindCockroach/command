/**
 * Overnight Pipeline Engine
 *
 * Runs autonomously to move content from idea → script → video → publish queue.
 * Called by /api/pipeline/run on a schedule or manually from the CC dashboard.
 *
 * Each stage is idempotent — safe to re-run without duplicating work.
 */

import { getAllContent, updateContent, type ContentPiece } from './db'
import { generateScript, repurposeContent, type RepurposeOutput } from './ai'

// ── Stage definitions ──────────────────────────────────────────────────────────

export type PipelineStage =
  | 'idea'           // raw capture, AI-enriched
  | 'scripted'       // script written by Content Dev GPT
  | 'video_queued'   // sent to HeyGen, awaiting render
  | 'video_ready'    // HeyGen render complete, video URL available
  | 'repurposed'     // 30-piece plan generated
  | 'publish_queue'  // human-approved, ready for auto-post
  | 'published'      // posted to platforms
  | 'archived'

export type PipelineResult = {
  processed: number
  scripted: number
  videos_queued: number
  repurposed: number
  errors: string[]
  log: string[]
}

// ── HeyGen video generation ────────────────────────────────────────────────────

export async function generateHeyGenVideo(script: string, talkingPhotoId?: string): Promise<{ videoId: string } | null> {
  const photoId = talkingPhotoId ?? process.env.HEYGEN_PHOTO_DEFAULT
  if (!photoId || !process.env.HEYGEN_API_KEY) return null

  const voiceId = process.env.ELEVENLABS_VOICE_ID

  const body = {
    video_inputs: [{
      character: {
        type: 'talking_photo',
        talking_photo_id: photoId,
      },
      voice: voiceId
        ? { type: 'elevenlabs', voice_id: voiceId, elevenlabs_settings: { stability: 0.5, similarity_boost: 0.75 } }
        : { type: 'text', input_text: script, voice_id: 'en-US-JennyNeural' },
      background: { type: 'color', value: '#FBFAF7' },
    }],
    dimension: { width: 1080, height: 1920 },
    caption: true,
    script: { type: 'text', input: script },
  }

  const res = await fetch('https://api.heygen.com/v2/video/generate', {
    method: 'POST',
    headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY!, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

  const data = await res.json()
  const videoId = data?.data?.video_id
  return videoId ? { videoId } : null
}

export async function checkHeyGenStatus(videoId: string): Promise<{ status: string; url?: string }> {
  const res = await fetch(`https://api.heygen.com/v1/video_status.get?video_id=${videoId}`, {
    headers: { 'X-Api-Key': process.env.HEYGEN_API_KEY! },
  })
  const data = await res.json()
  return {
    status: data?.data?.status ?? 'unknown',
    url: data?.data?.video_url,
  }
}

// ── ElevenLabs voice synthesis ─────────────────────────────────────────────────

export async function synthesizeVoice(text: string): Promise<Buffer | null> {
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  if (!voiceId || !process.env.ELEVENLABS_API_KEY) return null

  const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
    method: 'POST',
    headers: {
      'xi-api-key': process.env.ELEVENLABS_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      model_id: 'eleven_multilingual_v2',
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  })

  if (!res.ok) return null
  return Buffer.from(await res.arrayBuffer())
}

// ── Main pipeline runner ───────────────────────────────────────────────────────

export async function runPipeline(options: {
  autoScript?: boolean       // write scripts for all 'idea' stage items
  autoVideo?: boolean        // queue HeyGen videos for scripted items
  autoRepurpose?: boolean    // generate 30-piece plans for scripted items
  maxItems?: number          // safety cap — default 5 per run
} = {}): Promise<PipelineResult> {
  const { autoScript = true, autoVideo = false, autoRepurpose = true, maxItems = 5 } = options

  const result: PipelineResult = { processed: 0, scripted: 0, videos_queued: 0, repurposed: 0, errors: [], log: [] }
  const log = (msg: string) => { result.log.push(`[${new Date().toLocaleTimeString()}] ${msg}`); console.log(msg) }

  const all = getAllContent()
  log(`Pipeline started. ${all.length} items in pipeline.`)

  // ── Stage 1: Write scripts for enriched ideas ──
  if (autoScript) {
    const ideas = all
      .filter(c => c.status === 'idea' && c.ai_enrichment && !c.script)
      .slice(0, maxItems)

    for (const item of ideas) {
      try {
        log(`Scripting: "${item.title}"`)
        const script = await generateScript(item.title, '60s')
        updateContent(item.id, { script, status: 'in_progress', pipeline_stage: 'scripted' })
        result.scripted++
        result.processed++
        log(`✓ Script written for "${item.title}"`)
      } catch (e) {
        const msg = `Script failed for "${item.title}": ${e instanceof Error ? e.message : e}`
        result.errors.push(msg)
        log(`✗ ${msg}`)
      }
    }
  }

  // ── Stage 2: Generate 30-piece repurpose plans ──
  if (autoRepurpose) {
    const scripted = getAllContent()
      .filter(c => c.pipeline_stage === 'scripted' && !c.repurpose_output)
      .slice(0, maxItems)

    for (const item of scripted) {
      try {
        log(`Repurposing: "${item.title}"`)
        const repurpose = await repurposeContent(
          item.title,
          item.description ?? '',
          item.notes ?? '',
          item.script ?? item.transcript ?? '',
          []
        )
        updateContent(item.id, { repurpose_output: repurpose, pipeline_stage: 'repurposed' })
        result.repurposed++
        result.processed++
        log(`✓ 30-piece plan for "${item.title}"`)
      } catch (e) {
        const msg = `Repurpose failed for "${item.title}": ${e instanceof Error ? e.message : e}`
        result.errors.push(msg)
        log(`✗ ${msg}`)
      }
    }
  }

  // ── Stage 3: Queue HeyGen videos (only if autoVideo enabled) ──
  if (autoVideo && process.env.HEYGEN_API_KEY) {
    const readyForVideo = getAllContent()
      .filter(c => c.pipeline_stage === 'repurposed' && !c.heygen_video_id)
      .slice(0, 3) // HeyGen is slow + costly — cap lower

    for (const item of readyForVideo) {
      try {
        const script = item.script ?? item.title
        const hook = item.ai_enrichment?.hook
        const videoScript = hook ? `${hook}\n\n${script}` : script

        log(`Queuing HeyGen video for "${item.title}"`)
        const video = await generateHeyGenVideo(videoScript)
        if (video) {
          updateContent(item.id, {
            heygen_video_id: video.videoId,
            pipeline_stage: 'video_queued',
            status: 'in_progress',
          })
          result.videos_queued++
          result.processed++
          log(`✓ HeyGen video queued: ${video.videoId}`)
        }
      } catch (e) {
        const msg = `HeyGen failed for "${item.title}": ${e instanceof Error ? e.message : e}`
        result.errors.push(msg)
        log(`✗ ${msg}`)
      }
    }
  }

  // ── Stage 4: Check pending HeyGen renders ──
  if (process.env.HEYGEN_API_KEY) {
    const pending = getAllContent().filter(c => c.pipeline_stage === 'video_queued' && c.heygen_video_id)
    for (const item of pending) {
      try {
        const status = await checkHeyGenStatus(item.heygen_video_id!)
        if (status.status === 'completed' && status.url) {
          updateContent(item.id, {
            heygen_video_url: status.url,
            pipeline_stage: 'video_ready',
            status: 'ready',
          })
          log(`✓ Video ready for "${item.title}": ${status.url}`)
        }
      } catch { /* silent — check again next run */ }
    }
  }

  log(`Pipeline complete. Processed: ${result.processed}, Errors: ${result.errors.length}`)
  return result
}
