import { NextRequest, NextResponse } from 'next/server'
import { putObject, getPublicUrl, isR2Configured, mediaKey } from '@/lib/r2'
import { spawn } from 'child_process'
import { mkdtemp, writeFile, rm, stat, readFile } from 'fs/promises'
import { tmpdir } from 'os'
import path from 'path'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

const TARGET = 100 * 1024 * 1024 // HeyGen upload ceiling

function run(cmd: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args)
    let err = ''
    p.stderr.on('data', d => { err += String(d) })
    p.on('error', reject)
    p.on('close', code => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}: ${err.slice(-300)}`))))
  })
}
async function hasFfmpeg(): Promise<boolean> {
  try { await run('ffmpeg', ['-version']); return true } catch { return false }
}

// Compress a Media audio file to a HeyGen-ready mono MP3 (128k, ~1MB/min) and
// save it back to Media. If a very long episode still tops 100MB, step the
// bitrate down until it fits. POST { url } → { url, name, size, bitrate }.
export async function POST(req: NextRequest) {
  if (!isR2Configured()) return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
  const { url } = await req.json().catch(() => ({}))
  if (!url) return NextResponse.json({ error: 'url required' }, { status: 400 })
  if (!(await hasFfmpeg())) return NextResponse.json({ error: 'Compression tool is unavailable on the server right now.' }, { status: 503 })

  const resp = await fetch(url).catch(() => null)
  if (!resp || !resp.ok) return NextResponse.json({ error: `Could not fetch that file (${resp?.status ?? 'no response'})` }, { status: 502 })
  const bytes = Buffer.from(await resp.arrayBuffer())
  const origName = url.split('/').pop() || 'audio'

  const dir = await mkdtemp(path.join(tmpdir(), 'rise-compress-'))
  try {
    const inExt = (origName.split('.').pop() ?? 'wav').toLowerCase()
    const inPath = path.join(dir, `in.${inExt}`)
    await writeFile(inPath, bytes)

    // 128k mono is voice-grade and ~1MB/min. Fall back to lower bitrates only if
    // a marathon episode is still over the 100MB ceiling.
    let outPath = ''
    let usedBitrate = 0
    for (const bitrate of [128, 96, 64]) {
      const p = path.join(dir, `out-${bitrate}.mp3`)
      await run('ffmpeg', ['-y', '-i', inPath, '-vn', '-ac', '1', '-c:a', 'libmp3lame', '-b:a', `${bitrate}k`, p])
      const size = (await stat(p)).size
      outPath = p; usedBitrate = bitrate
      if (size <= TARGET) break
    }

    const base = origName.replace(/\.[^.]+$/, '') || 'episode'
    const key = mediaKey('audio', `${base}-heygen`, 'mp3')
    const outBytes = await readFile(outPath)
    if (!(await putObject(key, outBytes, 'audio/mpeg'))) {
      return NextResponse.json({ error: 'Compressed the file but could not save it to Media.' }, { status: 502 })
    }
    return NextResponse.json({
      url: getPublicUrl(key),
      name: key.split('/').pop(),
      size: outBytes.length,
      bitrate: usedBitrate,
      underLimit: outBytes.length <= TARGET,
    })
  } catch (e) {
    return NextResponse.json({ error: `Compression failed: ${e instanceof Error ? e.message : 'unknown'}` }, { status: 502 })
  } finally {
    await rm(dir, { recursive: true, force: true }).catch(() => {})
  }
}
