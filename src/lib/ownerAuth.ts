import type { NextRequest } from 'next/server'
import { getSiteEditKeyHash } from './db'

// Is this request from Mandi? True with her station cookie (when STATION_KEY is set) or
// her site-editor cookie (set by opening any page with ?edit=KEY). Used to protect
// routes that live on public paths but expose or act on private data.
export function isOwner(req: NextRequest): boolean {
  const station = process.env.STATION_KEY
  if (station && req.cookies.get('station_auth')?.value === station) return true
  const h = getSiteEditKeyHash()
  return !!h && req.cookies.get('site_editor')?.value === h
}
