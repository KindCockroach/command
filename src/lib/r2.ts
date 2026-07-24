import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { randomUUID } from 'crypto'

// Turn a real filename/title into a clean slug (drops extension + junk).
export function slugify(s: string): string {
  return (s || '')
    .replace(/\.[^.]+$/, '')          // drop extension
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')      // non-alphanumeric → hyphen
    .replace(/^-+|-+$/g, '')          // trim leading/trailing hyphens
    .slice(0, 60) || 'file'
}

// Standard media key: folder/human-readable-name-<6char>.ext — keeps the given
// name (e.g. Riverside's filename or a post title) instead of a bare UUID.
export function mediaKey(folder: string, name: string, ext: string): string {
  const cleanExt = (ext || 'bin').toLowerCase().replace(/[^a-z0-9]/g, '') || 'bin'
  return `${folder}/${slugify(name)}-${randomUUID().slice(0, 6)}.${cleanExt}`
}

function r2Client() {
  const accountId = process.env.R2_ACCOUNT_ID
  const accessKeyId = process.env.R2_ACCESS_KEY_ID
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY
  if (!accountId || !accessKeyId || !secretAccessKey) return null
  return new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  })
}

const BUCKET = process.env.R2_BUCKET_NAME ?? 'command-center-media'

/** Generate a presigned URL so the browser can upload directly to R2 */
export async function getUploadUrl(key: string, contentType: string): Promise<string | null> {
  const client = r2Client()
  if (!client) return null
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType })
  return getSignedUrl(client, cmd, { expiresIn: 300 })
}

/** Upload bytes to R2 from the server (no browser CORS involved) */
export async function putObject(key: string, body: Uint8Array | Buffer, contentType: string): Promise<boolean> {
  const client = r2Client()
  if (!client) return false
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body: body, ContentType: contentType }))
  return true
}

/** Public URL for a stored object (requires R2 public bucket or custom domain) */
export function getPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL ?? ''
  return base ? `${base}/${key}` : `/api/media/${key}`
}

/** Delete an object from R2 */
export async function deleteObject(key: string): Promise<void> {
  const client = r2Client()
  if (!client) return
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }))
}

export function isR2Configured(): boolean {
  return !!(process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY)
}
