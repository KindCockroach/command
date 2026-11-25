import { NextRequest, NextResponse } from 'next/server'
import { getSkills, editSkill } from '@/lib/skills'

export const dynamic = 'force-dynamic'

// Phase 6 · Loop 10. GET → every skill (seeded from the SOPs, marked wired or not yet).
// PATCH {id, name?, when?, steps?, done?, never?} → Mandi's edit (hers from then on).
export async function GET() {
  return NextResponse.json({ skills: getSkills() })
}

export async function PATCH(req: NextRequest) {
  const b = await req.json().catch(() => ({}))
  if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 })
  const s = editSkill(String(b.id), {
    name: typeof b.name === 'string' ? b.name : undefined,
    when: typeof b.when === 'string' ? b.when : undefined,
    done: typeof b.done === 'string' ? b.done : undefined,
    steps: Array.isArray(b.steps) ? b.steps : undefined,
    never: Array.isArray(b.never) ? b.never : undefined,
  })
  if (!s) return NextResponse.json({ error: 'No such skill.' }, { status: 404 })
  return NextResponse.json({ skill: s })
}
