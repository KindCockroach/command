import { NextResponse } from 'next/server'
import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3'

export const dynamic = 'force-dynamic'

export async function GET() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  const bucket = process.env.R2_BUCKET_NAME ?? 'command-center-media'
  const publicUrl = process.env.R2_PUBLIC_URL ?? ''

  if (!accountId || !accessKeyId || !secretAccessKey) {
    return NextResponse.json({ files: [], error: 'R2 not configured' })
  }

  const client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })

  // Page through the WHOLE bucket. ListObjectsV2 returns keys in ALPHABETICAL
  // order, not by date — so a single 200-key page stopped inside "post-media/" and
  // never reached "videos/" or "uploads/". Recent uploads existed but were invisible.
  // Gather everything, then sort by date so the newest always show.
  const contents: Array<{ Key?: string; Size?: number; LastModified?: Date }> = []
  let token: string | undefined
  do {
    const res = await client.send(new ListObjectsV2Command({ Bucket: bucket, MaxKeys: 1000, ContinuationToken: token }))
    contents.push(...(res.Contents ?? []))
    token = res.IsTruncated ? res.NextContinuationToken : undefined
  } while (token)

  const files = contents.map(obj => {
    const key = obj.Key ?? ''
    const ext = key.split('.').pop()?.toLowerCase() ?? ''
    const type = ['mp4', 'mov', 'webm', 'avi'].includes(ext) ? 'video'
      : ['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext) ? 'audio'
      : ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(ext) ? 'image'
      : 'other'

    return {
      key,
      name: key.split('/').pop() ?? key,
      folder: key.includes('/') ? key.split('/')[0] : 'root',
      type,
      ext,
      size: obj.Size ?? 0,
      lastModified: obj.LastModified?.toISOString() ?? '',
      url: `${publicUrl}/${key}`,
    }
  }).sort((a, b) => b.lastModified.localeCompare(a.lastModified))

  return NextResponse.json({ files, total: files.length })
}
