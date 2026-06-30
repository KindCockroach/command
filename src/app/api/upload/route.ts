import { NextRequest, NextResponse } from 'next/server'
import { getUploadUrl, getPublicUrl, isR2Configured } from '@/lib/r2'
import { randomUUID } from 'crypto'

export const dynamic = 'force-dynamic'

// Returns a presigned R2 upload URL + the final public URL for the file
export async function POST(req: NextRequest) {
  if (!isR2Configured()) {
    return NextResponse.json({ error: 'R2 not configured yet' }, { status: 503 })
  }

  const { filename, contentType, folder = 'uploads' } = await req.json()
  if (!filename || !contentType) {
    return NextResponse.json({ error: 'filename and contentType required' }, { status: 400 })
  }

  const ext = filename.split('.').pop() ?? 'bin'
  const key = `${folder}/${randomUUID()}.${ext}`

  const uploadUrl = await getUploadUrl(key, contentType)
  if (!uploadUrl) return NextResponse.json({ error: 'Failed to generate upload URL' }, { status: 500 })

  return NextResponse.json({
    uploadUrl,           // PUT to this URL directly from browser
    publicUrl: getPublicUrl(key),  // the permanent URL once uploaded
    key,
  })
}
