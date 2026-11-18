import { NextResponse } from 'next/server'
import { getBranches, readDb, branchOfAccount, branchOfProduct, branchOfLabel, getProducts } from '@/lib/db'

export const dynamic = 'force-dynamic'

// The two branches, with what hangs off each: accounts, products, goals, and email-list sizes.
export async function GET() {
  const db = readDb()
  const accounts = (db.brand_accounts ?? []).map(a => ({ id: a.id, handle: a.handle, status: a.status, branch_id: branchOfAccount(a) }))
  const byAcct = new Map(accounts.map(a => [a.id, a.branch_id]))
  const lists: Record<string, number> = { joyful_media: 0, wfh: 0 }
  for (const c of db.contacts ?? []) {
    const bs = new Set(c.labels.map(branchOfLabel).filter(Boolean) as string[])
    for (const b of bs) lists[b]++
  }
  return NextResponse.json({
    branches: getBranches().map(b => ({
      ...b,
      accounts: accounts.filter(a => a.branch_id === b.id),
      products: getProducts().filter(p => branchOfProduct(p) === b.id).map(p => ({ id: p.id, name: p.name, status: p.status })),
      goals: (db.goals ?? []).filter(g => g.active && (g.branch_id ?? (g.account_id ? byAcct.get(g.account_id) : null)) === b.id).length,
      email_list_size: lists[b.id],
    })),
    unplaced_accounts: accounts.filter(a => !a.branch_id && a.status === 'active'),
  })
}
