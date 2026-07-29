import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

// A compact, LLM-friendly digest of the R2 media library so the Commander can
// actually SEE what media exists (counts + the most recent files with URLs it can
// reference/attach). Best-effort: never throws — returns a status line instead.
export async function getMediaSummary(limit = 20): Promise<string> {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME ?? 'command-center-media'
  const publicUrl = process.env.R2_PUBLIC_URL ?? ''
  if (!accountId || !accessKeyId || !secretAccessKey) return 'MEDIA LIBRARY: not configured on this environment.'

  try {
    const client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    })
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 400 }))
    const files = (res.Contents ?? []).map(o => ({ key: o.Key ?? '', mod: o.LastModified?.toISOString() ?? '' }))
    if (!files.length) return 'MEDIA LIBRARY — you CAN see this: it is currently empty.'

    const counts = { video: 0, image: 0, audio: 0, other: 0 } as Record<string, number>
    for (const f of files) {
      const ext = f.key.split('.').pop()?.toLowerCase() ?? ''
      const t = ['mp4', 'mov', 'webm', 'avi'].includes(ext) ? 'video'
        : ['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext) ? 'audio'
        : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? 'image'
        : 'other'
      counts[t]++
    }
    const recent = files
      .sort((a, b) => b.mod.localeCompare(a.mod))
      .slice(0, limit)
      .map(f => `  • ${f.key.split('/').pop()}${publicUrl ? ` — ${publicUrl}/${f.key}` : ''}`)
      .join('\n')

    return `MEDIA LIBRARY — you CAN see this (${files.length} files: ${counts.video} video, ${counts.image} image, ${counts.audio} audio, ${counts.other} other). You can reference or attach any by URL. Most recent:\n${recent}`
  } catch {
    return 'MEDIA LIBRARY: temporarily unavailable (storage list failed).'
  }
}
