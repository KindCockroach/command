// Phase 8 · B5: QUICK CAPTION (Mandi, Nov 27).
// Her media (a video is transcribed + a few frames) + ONE context box + five checkboxes:
// caption, hashtags, on-screen text, CTA, sound. RISE writes only what she ticked.
// Cap gives the outside view (which account, today's goal, the campaign week); Ed writes in that
// account's own voice (craftFor, per account). The CTA follows Cap's plan: the campaign week for the
// account's branch, and what Cap has on that account's calendar today/this week. Never the other branch.
// Sound = a song only when ticked, from the A8 music field ("trending" only with the scout's source + date).
// Always creates a normal card (status ready). "Post it" marks it published AND puts it on today's
// calendar for that account, so Cap counts it toward the week and assesses it with the winners.
import { readDb, writeDb, createContent, updateContent, branchOfAccount, type ContentPiece, type BranchId } from './db'
import { fableText } from './fable'
import { extractJsonObject, cut } from './jsonkit'
import { craftFor, NO_CROSS_PROMOTION } from './craft'
import { ROLE_LINES } from './roles'
import { campaignWeek } from './trendPick'
import { weekStart } from './capacity'
import { withHashtags } from './hashtags'

export type QuickWants = { caption: boolean; hashtags: boolean; onscreen: boolean; cta: boolean; sound: boolean }
export type QuickInput = { context: string; wants: QuickWants; mediaUrl?: string; mediaType?: string; frames?: string[]; transcript?: string; accountId?: string }
export type QuickResult = { card: ContentPiece; account: { id: string; handle: string; why: string }; cta_basis: string }

const todayCT = () => new Date(Date.now() - 6 * 3600000).toISOString().slice(0, 10)

/** What Cap has going for this account: the campaign week for its branch + today's and this week's planned posts. */
export function capPlanFor(accountId: string, today = todayCT()): string {
  const db = readDb()
  const acct = (db.brand_accounts ?? []).find(a => a.id === accountId)
  const branch = branchOfAccount(acct) as BranchId | null
  const ws = weekStart(today)
  const camp = campaignWeek(ws)
  const content = new Map(db.content.map(c => [c.id, c]))
  const items = (db.calendar_items ?? []).filter(i => i.account_id === accountId && i.date >= ws && i.date <= addDays(ws, 6))
  const line = (d: string) => items.filter(i => i.date === d).map(i => content.get(i.content_id)).filter(Boolean).map(c => `${cut(c!.title, 60)}${c!.post_job ? ` (job: ${c!.post_job})` : ''}`)
  const week = (db.plans ?? []).find(p => p.level === 'weekly' && p.status === 'approved' && p.weekly?.account_id === accountId && p.period_start <= today && p.period_end >= today)
  return [
    branch === 'wfh' ? camp.wfh : branch === 'joyful_media' ? camp.joyful_media : 'No branch on this account: point the CTA to following or saving.',
    `Today on Cap's calendar for this account: ${line(today).join('; ') || 'nothing planned'}.`,
    week?.weekly ? `This week's arc for the account: ${cut(week.weekly.arc, 300)} Campaign balance: ${cut(week.weekly.campaign_balance, 200)}` : '',
  ].filter(Boolean).join('\n')
}
const addDays = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10)

export async function quickCaption(inp: QuickInput): Promise<QuickResult | { error: string }> {
  const context = (inp.context ?? '').trim()
  const w = inp.wants
  if (!context && !inp.transcript?.trim() && !inp.mediaUrl) return { error: 'Add the media or a line of context first.' }
  if (!w.caption && !w.hashtags && !w.onscreen && !w.cta && !w.sound) return { error: 'Tick at least one thing you need.' }

  const db = readDb()
  const live = (db.brand_accounts ?? []).filter(a => a.status === 'active' && !a.mirrors_account_id)
  const fixed = inp.accountId ? live.find(a => a.id === inp.accountId) ?? (db.brand_accounts ?? []).find(a => a.id === inp.accountId) : null
  const isVideo = (inp.mediaType ?? '').startsWith('video')
  const isImage = (inp.mediaType ?? '').startsWith('image') && !!inp.mediaUrl
  const frames = Array.isArray(inp.frames) ? inp.frames.slice(0, 8) : []

  // Step 1 (Cap, only when she didn't choose): the one account this belongs on. Cheap, text only.
  let acct = fixed, why = fixed ? 'You chose it.' : ''
  if (!acct) {
    try {
      const raw = await fableText({ cheap: true, json: true, maxTokens: 200,
        instructions: `You are Cap. ${ROLE_LINES.cap}\nPick the ONE account this post belongs on. Reply ONLY with JSON: {"account_id":"","why":"one plain line"}`,
        input: `ACCOUNTS:\n${live.map(a => `- ${a.id} (${a.handle}): ${cut(a.topic ?? '', 140)}`).join('\n')}\n\nHER CONTEXT: ${cut(context, 800)}\n${inp.transcript ? `WHAT SHE SAYS IN THE VIDEO: ${cut(inp.transcript, 1200)}` : ''}` })
      const p = JSON.parse(extractJsonObject(raw)) as { account_id?: string; why?: string }
      acct = live.find(a => a.id === p.account_id) ?? null; why = (p.why ?? '').trim()
    } catch { /* falls through */ }
    if (!acct) return { error: 'Cap couldn’t tell which account this is for. Pick one and try again.' }
  }
  const plan = capPlanFor(acct.id)

  // Step 2 (Ed): only the ticked pieces, in this account's voice. Her words are kept.
  const fields = [
    w.onscreen && '"onscreen_text": the on-screen text (the hook that stops the scroll; a few short lines at most)',
    w.caption && '"caption": the caption, post-ready (no hashtags in it; no CTA line in it, the CTA is separate)',
    w.cta && '"cta": ONE direct call to action line that serves Cap\'s plan below',
    w.hashtags && '"hashtags": 5–10 relevant hashtags, space separated',
  ].filter(Boolean)
  let out: { onscreen_text?: string; caption?: string; cta?: string; hashtags?: string } = {}
  if (fields.length) {
    try {
      const raw = await fableText({ useClaude: true, json: true, maxTokens: 1500, imageUrls: [...(isImage ? [inp.mediaUrl!] : []), ...frames],
        instructions: `You are Ed. ${ROLE_LINES.ed}
Mandi made this herself (a one-off from her own brain). Write ONLY what she asked for. Keep her words where she gave them; don't invent a story she didn't tell.
${craftFor(acct.id)}

CAP'S PLAN (the CTA falls in line with this, even for a one-off):
${plan}
${NO_CROSS_PROMOTION}
Reply ONLY with JSON containing exactly these keys: {${fields.join(', ')}}`,
        input: `ACCOUNT: ${acct.handle} (${acct.platform})\nHER CONTEXT: ${context || '(none, read the media)'}\n${inp.transcript ? `\nWHAT SHE SAYS IN THE VIDEO (transcript):\n${cut(inp.transcript, 4000)}` : ''}${frames.length ? `\n\nThe ${frames.length} images are frames from her video, in order.` : ''}` })
      out = JSON.parse(extractJsonObject(raw))
    } catch (e) { return { error: `Ed couldn’t write it: ${e instanceof Error ? e.message : 'no answer'}. Try again.` } }
  }
  const caption = [(out.caption ?? '').trim(), (out.cta ?? '').trim()].filter(Boolean).join('\n\n')
  const hashtags = (out.hashtags ?? '').trim()
  const card = createContent({
    title: cut((out.onscreen_text || context || 'Quick caption').split('\n')[0], 70),
    description: hashtags ? withHashtags(caption, hashtags) : caption,
    status: 'ready',
    type: isVideo ? 'video' : isImage ? 'image' : 'post',
    platforms: [acct.platform].filter(Boolean),
    account_id: acct.id,
    onscreen_text: (out.onscreen_text ?? '').trim(),
    hashtags,
    transcript: inp.transcript ?? '',
    ...(inp.mediaUrl ? { media_url: inp.mediaUrl, media_urls: [inp.mediaUrl] } : {}),
    river_source: 'quick-caption',
    source_context: cut(context, 1200),
    notes: `Quick Caption. Asked for: ${Object.entries(w).filter(([, v]) => v).map(([k]) => k).join(', ')}.${out.cta ? ` CTA: ${out.cta.trim()}` : ''}\nCap's plan used: ${plan.replace(/\n/g, ' ')}`,
    tags: ['quick-caption', acct.id],
  })
  if (w.sound) await (await import('./music')).fillMusic(card.id, { force: true }).catch(() => null)
  const fresh = readDb().content.find(c => c.id === card.id) ?? card
  return { card: fresh, account: { id: acct.id, handle: acct.handle, why }, cta_basis: plan.split('\n')[0] }
}

/** "Post it": published now + on today's calendar for that account (counted by Cap, assessed with the winners). */
export function postIt(id: number): { card: ContentPiece; calendar_id: string } | { error: string } {
  const db = readDb()
  const c = db.content.find(x => x.id === id)
  if (!c) return { error: 'That card isn’t in RISE any more.' }
  if (!c.account_id) return { error: 'Pick the account first.' }
  const acct = (db.brand_accounts ?? []).find(a => a.id === c.account_id)
  const branch = branchOfAccount(acct) as BranchId | null
  const today = todayCT()
  db.calendar_items ??= []; db.next_calendar_id ??= 1
  let item = db.calendar_items.find(i => i.content_id === id && i.date === today)
  if (!item) {
    const plan = (db.plans ?? []).find(p => p.level === 'weekly' && p.status === 'approved' && p.weekly?.account_id === c.account_id && p.period_start <= today && p.period_end >= today)
    item = { id: `cal_${db.next_calendar_id++}`, date: today, branch_id: (branch ?? 'joyful_media') as BranchId, account_id: c.account_id, content_id: id, plan_id: plan?.id ?? null, slot: 'post', time: null, created_at: new Date().toISOString() } as NonNullable<typeof db.calendar_items>[number]
    db.calendar_items.push(item)
  }
  writeDb(db)
  const card = updateContent(id, { status: 'published', published_at: new Date().toISOString(), notes: `${c.notes ?? ''}\nPosted by Mandi ${today} (Quick Caption → today's calendar).`.trim() })!
  return { card, calendar_id: item.id }
}
