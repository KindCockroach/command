import { NextRequest, NextResponse } from 'next/server'
import { createDriveFolder, uploadToDrive, createGoogleDoc } from '@/lib/google'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const accessToken = req.cookies.get('google_access_token')?.value
  if (!accessToken) return NextResponse.json({ error: 'Not connected to Google. Visit /api/google/auth first.' }, { status: 401 })

  const { action, folderName, fileName, content, title } = await req.json()

  try {
    if (action === 'create_folder') {
      const id = await createDriveFolder(folderName, accessToken)
      return NextResponse.json({ id, url: `https://drive.google.com/drive/folders/${id}` })
    }

    if (action === 'upload_file') {
      const id = await uploadToDrive(fileName, content, '', accessToken)
      return NextResponse.json({ id })
    }

    if (action === 'create_doc') {
      const result = await createGoogleDoc(title, content, accessToken)
      return NextResponse.json(result)
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Drive error' }, { status: 500 })
  }
}
