import { NextRequest, NextResponse } from 'next/server'
import { readDb, writeDb, backupDb } from '@/lib/db'
import { ensureRoster, tagCharacters, mintCharacter } from '@/lib/characters'

// The character roster for Content Day. GET also tags any existing card that has a script but no
// characters yet (once, after a backup), so the rail is right from the first open.
export async function GET() {
  let db = readDb()
  const untagged = db.content.filter(c => (c.script ?? '').trim() && !(c.characters ?? []).length && !['published', 'archived'].includes(c.status))
  let backup: string | null = null
  if (untagged.length) {
    if (!db.characters_backfilled_at) { backup = backupDb('characters_backfill'); db = readDb() }
    let n = 0
    for (const c of db.content) if ((c.script ?? '').trim() && !(c.characters ?? []).length && !['published', 'archived'].includes(c.status) && tagCharacters(db, c)) n++
    db.characters_backfilled_at ??= new Date().toISOString()
    ensureRoster(db)
    writeDb(db)
    if (n) console.log(`[characters] tagged ${n} card(s)${backup ? `; backup at ${backup}` : ''}`)
  } else if (!db.characters?.length) { ensureRoster(db); writeDb(db) }
  return NextResponse.json({ characters: db.characters ?? [] })
}

// Mint a character by hand: { name }.
export async function POST(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  const name = String(b.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name the character first.' }, { status: 400 })
  const db = readDb()
  const c = mintCharacter(db, name, 'mandi')
  if (!c) return NextResponse.json({ error: 'That reads like a stage direction, not a character.' }, { status: 400 })
  writeDb(db)
  return NextResponse.json({ character: c, characters: db.characters })
}
