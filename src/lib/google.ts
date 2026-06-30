// Google Workspace API helpers — Drive, Gmail, Docs, Calendar

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  const data = await res.json()
  return data.access_token
}

// ── DRIVE ──────────────────────────────────────────────────────────────────

export async function createDriveFolder(name: string, accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder' }),
  })
  const data = await res.json()
  return data.id
}

export async function uploadToDrive(fileName: string, content: string, folderId: string, accessToken: string): Promise<string> {
  const metadata = { name: fileName, parents: [folderId] }
  const form = new FormData()
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
  form.append('file', new Blob([content], { type: 'text/plain' }))
  const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}` },
    body: form,
  })
  const data = await res.json()
  return data.id
}

// ── DOCS ───────────────────────────────────────────────────────────────────

export async function createGoogleDoc(title: string, content: string, accessToken: string): Promise<{ id: string; url: string }> {
  // Create the doc
  const createRes = await fetch('https://docs.googleapis.com/v1/documents', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  })
  const doc = await createRes.json()
  const docId = doc.documentId

  // Insert content
  await fetch(`https://docs.googleapis.com/v1/documents/${docId}:batchUpdate`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      requests: [{ insertText: { location: { index: 1 }, text: content } }],
    }),
  })

  return { id: docId, url: `https://docs.google.com/document/d/${docId}/edit` }
}

// ── GMAIL ──────────────────────────────────────────────────────────────────

export async function sendGmail(to: string, subject: string, body: string, accessToken: string): Promise<void> {
  const email = [
    `To: ${to}`,
    `From: hi@aimomeducation.com`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    '',
    body,
  ].join('\n')

  const encoded = Buffer.from(email).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

  await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ raw: encoded }),
  })
}

// ── CALENDAR ───────────────────────────────────────────────────────────────

export async function createCalendarEvent(title: string, description: string, dateTime: string, accessToken: string): Promise<string> {
  const start = new Date(dateTime)
  const end = new Date(start.getTime() + 60 * 60 * 1000) // 1 hour default

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      summary: title,
      description,
      start: { dateTime: start.toISOString() },
      end: { dateTime: end.toISOString() },
    }),
  })
  const data = await res.json()
  return data.htmlLink
}

export { refreshAccessToken }
