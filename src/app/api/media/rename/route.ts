import { NextRequest, NextResponse } from 'next/server'
import { copyObject, deleteObject, getPublicUrl, mediaKey, isR2Configured } from '@/lib/r2'
import { getAllContent, updateContent } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

// Rename a Media file: R2 keys are immutable, so copy → delete → repoint any post
// links. POST { key, newName } → { key, url }.
export async function POST(req: NextRequest) {
  if (!isR2Configured()) return NextResponse.json({ error: 'R2 not configured' }, { status: 503 })
  const { key, newName } = await req.json()
  if (!key || !newName?.trim()) return NextResponse.json({ error: 'key and newName required' }, { status: 400 })

  const folder = key.includes('/') ? key.split('/')[0] : 'uploads'
  const ext = key.split('.').pop() || 'bin'
  const destKey = mediaKey(folder, newName, ext)
  if (destKey === key) return NextResponse.json({ error: 'same name' }, { status: 400 })

  try {
    if (!(await copyObject(key, destKey))) throw new Error('copy failed')
  } catch (e) {
    return NextResponse.json({ error: `Rename failed: ${e instanceof Error ? e.message : 'copy error'}` }, { status: 502 })
  }

  const oldUrl = getPublicUrl(key)
  const newUrl = getPublicUrl(destKey)

  // Repoint any content pieces that referenced the old URL so links don't break.
  let repointed = 0
  for (const c of getAllContent()) {
    const hitsMain = c.media_url === oldUrl
    const hitsList = (c.media_urls ?? []).includes(oldUrl)
    const hitsHf = c.higgsfield_url === oldUrl
    const hitsHg = c.heygen_video_url === oldUrl
    if (hitsMain || hitsList || hitsHf || hitsHg) {
      updateContent(c.id, {
        ...(hitsMain ? { media_url: newUrl } : {}),
        ...(hitsList ? { media_urls: (c.media_urls ?? []).map(u => u === oldUrl ? newUrl : u) } : {}),
        ...(hitsHf ? { higgsfield_url: newUrl } : {}),
        ...(hitsHg ? { heygen_video_url: newUrl } : {}),
      })
      repointed++
    }
  }

  // Only delete the original AFTER the copy + repoints succeeded.
  await deleteObject(key).catch(() => {})

  return NextResponse.json({ key: destKey, url: newUrl, name: destKey.split('/').pop(), repointed })
}
