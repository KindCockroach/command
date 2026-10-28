import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

// RECENT SIGNUPS from GHL (cookbook opt-ins, WFH assessment, email list, etc.) for the
// morning Brief. Reuses the same Private Integration token + location that RISE uses to
// publish. Needs the token's `contacts.readonly` scope; if it's missing, we say so
// cleanly instead of breaking the Brief.
const GHL_BASE = 'https://services.leadconnectorhq.com'

type GhlContact = {
  id?: string; contactName?: string; firstName?: string; lastName?: string
  email?: string; phone?: string; tags?: string[]; dateAdded?: string; source?: string
}

export async function GET() {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) {
    return NextResponse.json({ signups: [], configured: false, note: 'GHL not connected (set GHL_API_KEY + GHL_LOCATION_ID).' })
  }
  try {
    const res = await fetch(`${GHL_BASE}/contacts/?locationId=${locationId}&limit=25`, {
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', Accept: 'application/json' },
    })
    if (!res.ok) {
      const msg = res.status === 401 || res.status === 403
        ? 'GHL token needs the contacts.readonly scope — re-issue the Private Integration token with Contacts read access.'
        : `GHL error ${res.status}`
      return NextResponse.json({ signups: [], configured: true, error: msg })
    }
    const data = await res.json() as { contacts?: GhlContact[] }
    const since = Date.now() - 7 * 86400000
    const signups = (data.contacts ?? [])
      .map(c => ({
        name: (c.contactName || `${c.firstName ?? ''} ${c.lastName ?? ''}`.trim() || c.email || 'New contact'),
        email: c.email ?? '',
        tags: Array.isArray(c.tags) ? c.tags : [],
        source: c.source ?? '',
        dateAdded: c.dateAdded ?? '',
      }))
      .filter(c => c.dateAdded && new Date(c.dateAdded).getTime() >= since)
      .sort((a, b) => (b.dateAdded).localeCompare(a.dateAdded))
      .slice(0, 8)
    return NextResponse.json({ signups, configured: true })
  } catch (e) {
    return NextResponse.json({ signups: [], configured: true, error: e instanceof Error ? e.message : 'fetch failed' })
  }
}
