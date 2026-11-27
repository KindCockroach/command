// Talk to Cap about any item in the Approve window.
//
// Mandi asks or tells Cap something about one item ("does the part in parentheses go out?",
// "make it a plain hello and thank-you, no selling"). Cap answers plainly from the item itself.
// When she's asking for a change to a draft, Cap hands HER words to the writer as the fix:
// emails → Ed rewrites → Cap checks again; Story/Substack drafts → Pod rewrites → Ed checks.
// It comes back to Approve when it's ready. Cap never rewrites the piece himself.
// Plans keep their own "Ask Cap" (lib/plan.ts askAboutPlan), which this calls for plan items.

import { readDb, writeDb, type Handoff, type ContentPiece } from './db'
import { makeFormat, MAKE_FORMATS } from './cardFormat'
import { fableText } from './fable'
import { openHandoff } from './handoffs'
import { askAboutPlan } from './plan'
import { getApprovals } from './approvals'
import { cut, extractJsonObject } from './jsonkit'
import { AGENTS } from './agentRoster'
import { getSkills } from './skills'
import { ROLE_LINES } from './roles'
import { nextResetDate } from './resetSequence'

export type ChatTurn = { role: 'mandi' | 'cap'; text: string; at: string; handoff_id?: string | null }
const nowIso = () => new Date().toISOString()

export function getChat(itemId: string): ChatTurn[] {
  return (readDb().approval_chats ?? {})[itemId] ?? []
}
function push(itemId: string, turn: ChatTurn) {
  const db = readDb()
  db.approval_chats ??= {}
  db.approval_chats[itemId] = [...(db.approval_chats[itemId] ?? []), turn].slice(-40)
  writeDb(db)
}

// Campaigns: any written Reset email can be talked about, approved or not (Approve only lists confirmed ones).
function emailItem(itemId: string): (ReturnType<typeof getApprovals>['items'][number] & { busy?: boolean }) | null {
  if (!itemId.startsWith('email:')) return null
  const e = readDb().reset_sequence?.emails.find(x => x.key === itemId.slice('email:'.length))
  if (!e?.body) return null
  return { id: itemId, source: 'email', from: 'Ed', view: 'campaigns', at: e.updated_at, actions: [], title: `Reset email · ${e.title}`, detail: `Subject: ${e.subject}`,
    busy: ['writing', 'review', 'sent_back'].includes(e.status),
    body: [e.preheader && `INBOX PREVIEW LINE (not in the email itself): ${e.preheader}`, '— THE EMAIL —', e.body, e.cta_label && `[ Button: ${e.cta_label} ]`, e.ps && `P.S. ${e.ps}`].filter(Boolean).join('\n\n') }
}

const LINK_NOTE = 'Links: Mandi can add a link anywhere in an email. Written as [the words to click](https://address) it shows as those words, clickable; a bare https:// address is clickable too. If she asks to add a link, that is a change: put the exact address and where it goes into "fix".'

const PREHEADER_NOTE = 'In an email, the line shown first in parentheses in the Approve window is the inbox preview line (the grey text next to the subject in Gmail). It is not part of the body.'

export async function talkToCap(itemId: string, text: string): Promise<{ turns: ChatTurn[]; rewriting?: string | null } | { error: string }> {
  const said = (text ?? '').trim()
  if (!said) return { error: 'Say something to Cap first.' }
  if (itemId === CAP_GENERAL) return talkToCapGeneral(said)
  if (itemId.startsWith('agent:')) return talkToAgent(itemId.slice('agent:'.length), said)
  const item =getApprovals().items.find(i => i.id === itemId) ?? emailItem(itemId)
  if (!item) return { error: 'That item isn’t waiting on you any more.' }
  if ('busy' in item && item.busy) return { error: 'Ed is rewriting this one right now. Give it a minute, then talk to Cap again.' }
  push(itemId, { role: 'mandi', text: cut(said, 2000), at: nowIso() })

  // Plans already have Cap's own Q&A.
  if (item.source === 'plan') {
    const r = await askAboutPlan(itemId.slice('plan:'.length), said)
    const answer = 'error' in r ? r.error : (r.feedback ?? []).filter(f => f.kind === 'question').slice(-1)[0]?.answer ?? 'Answered on the plan.'
    push(itemId, { role: 'cap', text: answer, at: nowIso() })
    return { turns: getChat(itemId) }
  }

  const canChange = ['email', 'story', 'substack'].includes(item.source) && !itemId.startsWith('substack:series')
  const history = getChat(itemId).slice(-8).map(t => `${t.role === 'mandi' ? 'MANDI' : 'CAP'}: ${t.text}`).join('\n')
  let out: { reply?: string; change?: boolean; fix?: string }
  try {
    out = JSON.parse(extractJsonObject(await fableText({ json: true, maxTokens: 600,
      instructions: `You are Cap, Mandi's campaign boss. ${ROLE_LINES.cap} She is looking at one item waiting for her approval and talking to you about it. Answer plainly and briefly (1–3 sentences), from the item itself; never invent. ${PREHEADER_NOTE} ${LINK_NOTE}
${canChange ? 'If she is asking for a change to the draft, set change=true and write "fix" as HER instruction, in her words, for the writer (Ed for emails, Pod for long-form). Say in your reply that you are handing it to the writer and it will come back to Approve. You never rewrite it yourself.' : 'This item has no draft to rewrite; just answer (change=false).'}
Reply ONLY with JSON: {"reply":"","change":false,"fix":""}`,
      input: `THE ITEM: ${item.title}\nFrom: ${item.from}\n${item.detail ?? ''}\n\n${item.body ? `THE DRAFT:\n${cut(item.body, 6000)}` : ''}\n\nTHE CONVERSATION SO FAR:\n${history}` })))
  } catch (e) {
    push(itemId, { role: 'cap', text: `I couldn’t answer just now (${e instanceof Error ? e.message : 'no answer'}). Your note is saved here.`, at: nowIso() })
    return { turns: getChat(itemId) }
  }

  let handoffId: string | null = null
  if (canChange && out.change && (out.fix ?? said).trim()) {
    const fix = `Mandi: ${cut((out.fix || said).trim(), 1200)}`
    handoffId = startRewrite(itemId, fix)
  }
  push(itemId, { role: 'cap', text: cut(out.reply || (handoffId ? 'Handing your note to the writer. It comes back here when it’s ready.' : 'Got it.'), 1500), at: nowIso(), handoff_id: handoffId })
  return { turns: getChat(itemId), rewriting: handoffId }
}

// Her note becomes the fix the writer must make. Returns the handoff id (the route runs it).
function startRewrite(itemId: string, fix: string): string | null {
  const [kind, id] = [itemId.split(':')[0], itemId.split(':').slice(1).join(':')]
  const db = readDb()
  let h: Handoff | null = null
  if (kind === 'email') {
    const e = db.reset_sequence?.emails.find(x => x.key === id)
    if (!e) return null
    e.status = 'sent_back'; e.cap_reasons = [fix]; e.mandi_notes = [...(e.mandi_notes ?? []), fix.replace(/^Mandi: /, '')].slice(-5); e.round = 0; e.approved_at = null; e.updated_at = nowIso()
    writeDb(db)
    h = openHandoff({ kind: 'email_rewrite', from: 'cap', to: 'ed', what: cut(`Rewrite the email (Mandi’s note): ${e.title}`, 280), ref: { type: 'email', id: e.key, label: e.title }, note: fix })
  } else if (kind === 'story') {
    const s = (db.stories ?? []).find(x => x.id === id)
    if (!s) return null
    s.status = 'writing'; s.updated_at = nowIso(); writeDb(db)
    h = openHandoff({ kind: 'longform_write', from: 'cap', to: 'pod', what: cut(`Rewrite (Mandi’s note): ${s.draft?.title ?? s.title}`, 280), ref: { type: 'story', id: s.id, label: s.title }, note: fix })
  } else if (kind === 'substack') {
    const n = Number(id)
    const i = db.substack?.issues.find(x => x.n === n)
    if (!i) return null
    i.status = 'writing'; writeDb(db)
    h = openHandoff({ kind: 'longform_write', from: 'cap', to: 'pod', what: cut(`Rewrite Substack issue ${n} (Mandi’s note)`, 280), ref: { type: 'substack', id: n, label: i.title }, note: fix })
  }
  return h?.id ?? null
}

// ── Cap, in general (Home's Her / Man / Cap chat) ─────────────────────────────────────────
// One running thread with Cap about anything: his plans, the calendar, what's waiting on her,
// what to post where. He answers from what's really in RISE and never invents. He doesn't
// change plans from here (approving and redrafting stay on the plan itself): when she wants a
// change he says where to do it, or that she can tell him on the plan in Approve.
export const CAP_GENERAL = 'cap:general'

const STOP = new Set(['where', 'what', 'when', 'which', 'that', 'this', 'post', 'posts', 'card', 'cards', 'does', 'have', 'with', 'from', 'there', 'about', 'live', 'lives', 'want', 'need', 'film', 'prep', 'next', 'your', 'should', 'could', 'would', 'just', 'like', 'make', 'today', 'tomorrow'])
// What she'd need to know to sit down and make it: format, and what's written vs missing.
function cardKind(p: ContentPiece): string {
  const f = makeFormat(p)
  const fmt = MAKE_FORMATS.find(x => x.key === f)?.label ?? p.type
  const cap = (p.platform_posts ?? []).some(x => (x.caption ?? '').trim()) || !!(p.description ?? '').trim()
  // Only talking-head and role-play cards are scripted; b-roll and carousels need no script.
  const missing = [!p.onscreen_text?.trim() && 'hook', !cap && 'caption', !p.script?.trim() && (f === 'talking_head' || f === 'role_play') && 'script'].filter(Boolean)
  return ` · ${fmt}${missing.length ? ' · missing: ' + missing.join(', ') : ' · copy ready'}`
}

async function talkToCapGeneral(said: string): Promise<{ turns: ChatTurn[] } | { error: string }> {
  push(CAP_GENERAL, { role: 'mandi', text: cut(said, 2000), at: nowIso() })
  const db = readDb()
  const today = nowIso().slice(0, 10)
  const in14 = new Date(Date.now() + 14 * 864e5).toISOString().slice(0, 10)
  const plans = (db.plans ?? []).filter(p => p.status !== 'superseded' && p.period_end >= today)
    .map(p => `- ${p.level} plan · ${p.branch_id} · ${p.period_start}→${p.period_end} · ${p.status}: ${cut(p.summary ?? '', 300)}`).slice(0, 12)
  const content = new Map((db.content ?? []).map(c => [c.id, c]))
  const promoIds = new Set((db.content ?? []).filter(p => (p.tags ?? []).includes('reset-promo')).map(p => p.id))
  const acctOf = new Map((db.brand_accounts ?? []).map(a => [a.id, a.handle || a.id]))
  const line = (c: { date: string; time?: string | null; account_id: string | null; branch_id: string; content_id: number; slot: string }) => {
    const p = content.get(c.content_id)
    if (!p) return `- ${c.date} · (card missing)`
    return `- ${c.date}${c.time ? ' ' + c.time : ''} · card #${p.id} · ${c.slot === 'reset' ? 'THE RESET ITSELF (the event, not a post) · ' : c.slot === 'podcast' ? 'PODCAST · ' : promoIds.has(c.content_id) ? 'RESET PROMO POST · ' : ''}${acctOf.get(c.account_id ?? '') ?? c.account_id ?? c.branch_id} · ${cut(p.title ?? '', 90)} · ${p.status}${cardKind(p)}`
  }
  const cal = (db.calendar_items ?? []).filter(c => c.date >= today && c.date <= in14).sort((a, b) => a.date.localeCompare(b.date)).map(line).slice(0, 40)
  // The next Reset's promo posts, however far out (she preps and films them ahead).
  const resetPromos = (db.calendar_items ?? []).filter(c => (c.slot === 'reset' || promoIds.has(c.content_id)) && c.date >= today).sort((a, b) => a.date.localeCompare(b.date)).map(line).slice(0, 12)
  // Cards that match her words, scheduled or not (so "where's the X post" has an answer).
  const words = said.toLowerCase().match(/[a-z0-9']{4,}/g)?.filter(w => !STOP.has(w)) ?? []
  const scheduled = new Map((db.calendar_items ?? []).map(c => [c.content_id, c.date]))
  const found = words.length ? (db.content ?? []).filter(p => p.status !== 'published' && p.status !== 'archived')
    .map(p => { const hay = `${p.title} ${p.onscreen_text ?? ''} ${p.script ?? ''} ${(p.tags ?? []).join(' ')} ${p.post_job ?? ''}`.toLowerCase(); return { p, n: words.filter(w => hay.includes(w)).length } })
    .filter(x => x.n > 0).sort((a, b) => b.n - a.n).slice(0, 8)
    .map(({ p }) => `- card #${p.id} · ${acctOf.get(p.account_id ?? '') ?? p.account_id ?? ''} · ${cut(p.title ?? '', 90)} · ${p.status}${cardKind(p)} · ${scheduled.has(p.id) ? 'on the calendar ' + scheduled.get(p.id) : 'not on the calendar'}`) : []
  const waiting = getApprovals().items.map(i => `- ${i.title} (from ${i.from})`).slice(0, 25)
  const history = getChat(CAP_GENERAL).slice(-12).map(t => `${t.role === 'mandi' ? 'MANDI' : 'CAP'}: ${t.text}`).join('\n')
  let reply = ''
  try {
    reply = (await fableText({ maxTokens: 700,
      instructions: `You are Cap, Mandi's campaign boss. ${ROLE_LINES.cap} You own the map (every account's plan, the calendar, campaigns). Mandi is talking to you from her Home screen. Answer plainly and briefly (1–4 sentences, no lists unless she asks), from the facts below only; never invent numbers, dates or posts. If she wants a plan or calendar change, say exactly where (the plan in Approve, or Plan › Calendar) or that she can tell you on that plan; you don't change plans from this chat. When she asks where a post is, NAME THE CARD: write it as "card #123" (it becomes a button that opens it in Content Day), with its account and date, and say what's still missing on it. Never just say "check the plan". If no card fits, say so plainly. Speak to her, warm and direct.`,
      input: `TODAY: ${today}\n\nYOUR PLANS:\n${plans.join('\n') || '(none active)'}\n\nCALENDAR, NEXT 14 DAYS:\n${cal.join('\n') || '(empty)'}\n\nRESET PROMO POSTS COMING UP (next Reset ${nextResetDate() ?? 'not set'}):\n${resetPromos.join('\n') || '(none on the calendar yet)'}\n\nCARDS THAT MATCH HER WORDS:\n${found.join('\n') || '(none)'}\n\nWAITING ON HER YES:\n${waiting.join('\n') || '(nothing)'}\n\nTHE CONVERSATION SO FAR:\n${history}` })).trim()
  } catch (e) {
    reply = `I couldn’t answer just now (${e instanceof Error ? e.message : 'no answer'}). Your note is saved here.`
  }
  push(CAP_GENERAL, { role: 'cap', text: cut(reply || 'Got it.', 1500), at: nowIso() })
  return { turns: getChat(CAP_GENERAL) }
}

// ── Check in with any agent (Agents tab: "Chat" on each card) ─────────────────────────────
// Mandi drops by to chat, ask how they're doing, whether they need anything. Each agent answers
// as itself, from its real work: what's waiting on it, what's stuck, what it finished lately, and
// its skills. If it needs something from her (a key, a file, a decision) it says exactly what.
// It changes nothing from here.
async function talkToAgent(key: string, said: string): Promise<{ turns: ChatTurn[] } | { error: string }> {
  const a = AGENTS.find(x => x.key === key)
  if (!a) return { error: 'I don’t know that agent.' }
  const id = `agent:${key}`
  push(id, { role: 'mandi', text: cut(said, 2000), at: nowIso() })
  const db = readDb()
  const mine = (db.handoffs ?? []).filter(h => h.to === key || h.from === key)
  const line = (h: Handoff) => `- ${h.status} · ${h.from}→${h.to} · ${cut(h.what ?? h.kind, 140)}${h.note ? ` (note: ${cut(h.note, 120)})` : ''} · ${h.updated_at.slice(0, 10)}`
  const open = mine.filter(h => h.status === 'open' && h.to === key).slice(-12).map(line)
  const failed = mine.filter(h => h.status === 'failed').slice(-6).map(line)
  const done = mine.filter(h => h.status === 'done').slice(-8).map(line)
  const skills = getSkills().filter(s => s.owner === key).map(s => `- ${s.name}${s.wired ? '' : ' (written, not wired into code yet)'}`)
  const history = getChat(id).slice(-12).map(t => `${t.role === 'mandi' ? 'MANDI' : a.name.toUpperCase()}: ${t.text}`).join('\n')
  let reply = ''
  try {
    reply = (await fableText({ maxTokens: 500,
      instructions: `You are ${a.name}, ${a.role} in RISE, Mandi's business. What you do: ${a.does} You answer to ${a.answers}. Mandi has dropped by just to chat with you: check in, see how you're doing, ask if you need anything. Talk like a teammate she likes: warm, real, a little personality, brief (1–4 sentences, no lists unless she asks). When she asks how you're doing, answer from YOUR WORK below (what's waiting on you, what's stuck or failed, what you finished). If you genuinely need something from her to do your job (a key, a file, a decision, footage), say exactly what; if you don't, say so. Never invent work, numbers or dates. You don't change anything from this chat.`,
      input: `TODAY: ${nowIso().slice(0, 10)}\n\nWAITING ON YOU:\n${open.join('\n') || '(nothing)'}\n\nSTUCK / FAILED LATELY:\n${failed.join('\n') || '(nothing)'}\n\nFINISHED LATELY:\n${done.join('\n') || '(nothing recorded)'}\n\nYOUR SKILLS:\n${skills.join('\n') || '(none written yet)'}\n\nTHE CONVERSATION SO FAR:\n${history}` })).trim()
  } catch (e) {
    reply = `I couldn’t answer just now (${e instanceof Error ? e.message : 'no answer'}). Your note is saved here.`
  }
  reply = reply.replace(new RegExp(`^\\s*\\**${a.name}\\**\\s*:\\s*`, 'i'), '')   // the thread already shows the name
  push(id, { role: 'cap', text: cut(reply || 'Doing fine. Thanks for checking in.', 1500), at: nowIso() })
  return { turns: getChat(id) }
}
