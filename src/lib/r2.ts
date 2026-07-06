import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

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
