// Talk to Cap about any item in the Approve window.
//
// Mandi asks or tells Cap something about one item ("does the part in parentheses go out?",
// "make it a plain hello and thank-you, no selling"). Cap answers plainly from the item itself.
// When she's asking for a change to a draft, Cap hands HER words to the writer as the fix:
// emails → Ed rewrites → Cap checks again; Story/Substack drafts → Pod rewrites → Ed checks.
// It comes back to Approve when it's ready. Cap never rewrites the piece himself.
// Plans keep their own "Ask Cap" (lib/plan.ts askAboutPlan), which this calls for plan items.

import { readDb, writeDb, type Handoff } from './db'
import { fableText } from './fable'
import { openHandoff } from './handoffs'
import { askAboutPlan } from './plan'
import { getApprovals } from './approvals'
import { cut, extractJsonObject } from './jsonkit'

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
  const item = getApprovals().items.find(i => i.id === itemId) ?? emailItem(itemId)
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
      instructions: `You are Cap, Mandi's campaign boss. She is looking at one item waiting for her approval and talking to you about it. Answer plainly and briefly (1–3 sentences), from the item itself; never invent. ${PREHEADER_NOTE} ${LINK_NOTE}
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
