// WFH server helpers — the personalized RISE recommendation (Claude, with a rules
// fallback so a lead never gets nothing) and GoHighLevel notices + emails.
import { fableText } from './fable'
import { parseKit } from './jsonkit'
import { logActivity } from './db'
import { QUESTIONS, RISE_FEATURES, type Answers, type Assessment, type RiseRecommendation } from './wfh'

const GHL_BASE = 'https://services.leadconnectorhq.com'
export const NOTIFY_EMAIL = process.env.WFH_NOTIFY_EMAIL || 'hi@aimomeducation.com'

// Readable "Question: answer" lines for the prompt and for Mandi's email.
export function answerLines(a: Answers): string[] {
  return QUESTIONS.map(q => {
    const v = a[q.id]
    const vals = (Array.isArray(v) ? v : v ? [v] : []).map(x => q.options.find(o => o.value === x)?.label ?? x)
    return `${q.q} ${vals.length ? vals.join('; ') : '—'}`
  })
}

// Which features answer which needs — the fallback when Claude is unavailable.
const FALLBACK: Record<string, string[]> = {
  email: ['Commander', 'Assistants & Workflows'], scheduling: ['Booking & Client Scheduler'], content: ['Content Engine', 'Sorting Hat'],
  writing: ['Content Engine', 'Brand Voice & Accounts'], followups: ['Assistants & Workflows', 'Activity Feed'],
  customers: ['Assistants & Workflows'], money: ['Assistants & Workflows'], research: ['Research Desk'],
  data: ['Assistants & Workflows', 'Activity Feed'], home: ['Daily Command', 'Tasks & Projects'],
}
function fallbackRecommendation(name: string, result: Assessment): RiseRecommendation {
  const picked: string[] = []
  for (const o of result.top) for (const f of FALLBACK[o.key] ?? []) if (!picked.includes(f)) picked.push(f)
  for (const f of ['Commander', 'Daily Command']) if (picked.length < 3 && !picked.includes(f)) picked.push(f)
  return {
    headline: `How RISE can work for you, ${name.split(' ')[0]}`,
    intro: `Based on your answers, here’s where RISE would take the most off your plate first.`,
    features: picked.slice(0, 4).map(n => {
      const f = RISE_FEATURES.find(x => x.name === n)!
      return { name: n, why: f.does, first_step: 'We set this up together on our call.' }
    }),
    closing: 'Let’s walk through it together and set up your first win.',
  }
}

export async function recommendRise(c: { name: string; business?: string; website?: string }, answers: Answers, result: Assessment): Promise<{ rec: RiseRecommendation; by: 'claude' | 'rules' }> {
  const catalog = RISE_FEATURES.map(f => `- ${f.name}: ${f.does}`).join('\n')
  const instructions = `You are writing a personalized recommendation from Mandi Beck (the AI Mom, founder of WFH — Works For Her) to a woman or business owner who just filled out her AI integration questionnaire. Recommend ONLY features of RISE, Mandi's AI command center, chosen from the catalog below by their EXACT name. Pick the 3 to 5 that would help THIS person most, most valuable first.

For each feature: "why" = 1–2 sentences tying it to her specific answers (her time sinks, her bottleneck, her tools, her business) — concrete, not generic. "first_step" = one short sentence: the first thing they'd set up together.

Voice: warm, direct, confident, plain words. Talk to her as "you". No hype, no jargon, no exclamation-point pileups, never promise income. Do not mention prices.

RISE CATALOG:
${catalog}

Return ONLY JSON: {"headline": "...", "intro": "1–2 sentences reflecting back what she told you", "features": [{"name": "exact catalog name", "why": "...", "first_step": "..."}], "closing": "one sentence inviting her to book a call"}`
  const input = `NAME: ${c.name}\nBUSINESS: ${c.business || '—'}\nWEBSITE: ${c.website || '—'}\n\nANSWERS:\n${answerLines(answers).join('\n')}\n\nRULES-BASED READ: score ${result.score} (${result.level}); top opportunities: ${result.top.map(o => o.title).join(', ')}; ~${result.hours_per_month} hrs/month recoverable.`
  try {
    const raw = await fableText({ instructions, input, maxTokens: 2500, json: true, useClaude: true })
      .catch(() => fableText({ instructions, input, maxTokens: 2500, json: true }))
    const kit = await parseKit(raw)
    const names = new Set(RISE_FEATURES.map(f => f.name))
    const features = (Array.isArray(kit?.features) ? kit!.features : [])
      .filter((f: { name?: unknown; why?: unknown }) => typeof f?.name === 'string' && names.has(f.name) && typeof f?.why === 'string')
      .slice(0, 5)
      .map((f: { name: string; why: string; first_step?: unknown }) => ({ name: f.name, why: f.why, first_step: typeof f.first_step === 'string' ? f.first_step : '' }))
    if (features.length >= 2 && typeof kit?.headline === 'string') {
      return { by: 'claude', rec: { headline: kit.headline, intro: String(kit.intro ?? ''), features, closing: String(kit.closing ?? '') } }
    }
  } catch (e) {
    logActivity({ type: 'note', title: '⚠ WFH recommendation fell back to rules', detail: e instanceof Error ? e.message.slice(0, 200) : 'error', icon: '⚠️', source: 'wfh' })
  }
  return { by: 'rules', rec: fallbackRecommendation(c.name, result) }
}

// Upsert a GHL contact (with an optional tag); returns its id.
export async function ghlContact(c: { name: string; email: string; phone?: string; tag?: string; source: string }): Promise<string | null> {
  const token = process.env.GHL_API_KEY
  const locationId = process.env.GHL_LOCATION_ID
  if (!token || !locationId) return null
  const [firstName, ...rest] = c.name.trim().split(/\s+/)
  try {
    const res = await fetch(`${GHL_BASE}/contacts/upsert`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Version: '2021-07-28', 'Content-Type': 'application/json' },
      body: JSON.stringify({ locationId, email: c.email, firstName, lastName: rest.join(' '), ...(c.phone ? { phone: c.phone } : {}), ...(c.tag ? { tags: [c.tag] } : {}), source: c.source }),
      signal: AbortSignal.timeout(10000),
    })
    if (!res.ok) { logActivity({ type: 'note', title: `⚠ GHL contact failed (${res.status})`, detail: (await res.text()).slice(0, 200), icon: '⚠️', source: 'wfh' }); return null }
    return (await res.json())?.contact?.id ?? null
  } catch (e) {
    logActivity({ type: 'note', title: '⚠ GHL contact failed', detail: e instanceof Error ? e.message : 'network error', icon: '⚠️', source: 'wfh' })
    return null
  }
}

// Send an HTML email through GHL to a contact (upserting it first). Best effort.
export async function ghlEmail(to: { name: string; email: string }, subject: string, html: string, source: string): Promise<boolean> {
  const token = process.env.GHL_API_KEY
  const contactId = await ghlContact({ ...to, source })
  if (!token || !contactId) return false
  try {
    const res = await fetch(`${GHL_BASE}/conversations/messages`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, Version: '2021-04-15', 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'Email', contactId, subject, html }),
      signal: AbortSignal.timeout(15000),
    })
    if (!res.ok) { logActivity({ type: 'note', title: `⚠ WFH email failed (${res.status})`, detail: `${subject} → ${to.email}: ${(await res.text()).slice(0, 160)}`, icon: '⚠️', source: 'wfh' }); return false }
    return true
  } catch (e) {
    logActivity({ type: 'note', title: '⚠ WFH email failed', detail: e instanceof Error ? e.message : 'network error', icon: '⚠️', source: 'wfh' })
    return false
  }
}

export const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const wrap = (inner: string) => `<div style="font-family:Arial,sans-serif;font-size:15px;line-height:1.6;color:#171C3A;max-width:620px">${inner}</div>`

export function recommendationHtml(rec: RiseRecommendation, bookUrl: string): string {
  return `<h2 style="font-family:Georgia,serif;margin:0 0 10px">${esc(rec.headline)}</h2>
<p>${esc(rec.intro)}</p>
${rec.features.map((f, i) => `<div style="border:1px solid #e7e0d3;border-radius:12px;padding:14px 16px;margin:12px 0">
<p style="margin:0 0 4px;font-weight:bold">${i + 1}. ${esc(f.name)}</p><p style="margin:0 0 6px">${esc(f.why)}</p>${f.first_step ? `<p style="margin:0;color:#C2693F"><b>First step:</b> ${esc(f.first_step)}</p>` : ''}</div>`).join('')}
<p>${esc(rec.closing)}</p>
<p><a href="${bookUrl}" style="display:inline-block;background:#5A4FCF;color:#fff;padding:12px 22px;border-radius:999px;text-decoration:none;font-weight:bold">Book a call with me</a></p>`
}

export function clientEmailHtml(name: string, rec: RiseRecommendation, bookUrl: string): string {
  return wrap(`<p>Hi ${esc(name.split(' ')[0])},</p><p>Thank you for taking the questionnaire. Here’s your personalized recommendation.</p>${recommendationHtml(rec, bookUrl)}<p>Mandi Beck<br>WFH · Works For Her · aiworksforher.com</p>`)
}

export function mandiLeadHtml(lead: { name: string; email: string; business?: string; website?: string }, answers: Answers, result: Assessment, rec: RiseRecommendation, by: string, bookUrl: string): string {
  return wrap(`<h2 style="font-family:Georgia,serif;margin:0 0 6px">New AI questionnaire: ${esc(lead.name)}</h2>
<p><b>Email:</b> ${esc(lead.email)}<br><b>Business:</b> ${esc(lead.business || '—')}<br><b>Website:</b> ${esc(lead.website || '—')}</p>
<p><b>Score:</b> ${result.score} (${esc(result.level)}) · ~${result.hours_per_month} hrs/month · suggested next step: ${esc(result.next_step)}</p>
<h3>Their answers</h3><ul>${answerLines(answers).map(l => `<li>${esc(l)}</li>`).join('')}</ul>
<h3>The recommendation they were shown and emailed (${by === 'claude' ? 'written by Claude' : 'rules fallback'})</h3>
<div style="background:#FBF7F1;border-radius:12px;padding:14px 16px">${recommendationHtml(rec, bookUrl)}</div>`)
}
