// Cora interviews Mandi for Medium (Joyful Media): lived experience, for people struggling with
// loss, depression and anxiety.
//
//   1. Prep (handoff interview_prep, mandi → cora): Cora reads every caption in the Well like a
//      journalist and keeps a notebook: where Mandi touches loss, depression, anxiety, and the
//      question a good interviewer would ask, with the captions that raised it. Gentle → deep.
//   2. The interview: ONE question at a time. Cora listens for the charge (a specific detail, a
//      turn, a contradiction, something said out loud for the first time), follows it (two
//      follow-ups at most), and marks it as a charged point in Mandi's own words. Mandi can skip
//      anything or mark it off limits. Cora never pushes, never plays therapist.
//   3. Shape (handoff interview_shape): the charged points → 3–5 Medium story shapes (the reader,
//      the take, headlines, an opening from her words, beats). Ed checks each. They wait in
//      Approve as Cora's pitches ("Write this one" → the Story desk). The transcript goes to Notes.
//
// Safety: if an answer says she is unsafe NOW (not a past dark season she's telling as story),
// Cora stops the interview and gives 988. Past experience is story material; present danger isn't.

import { readDb, writeDb, createNote, type Handoff, type StoryInterview, type InterviewNote, type InterviewTheme, type ChargedPoint, type StoryPitch } from './db'
import { openHandoff, startAttempt, completeHandoff, failHandoff } from './handoffs'
import { fableText } from './fable'
import { cut, extractJsonObject, asLines } from './jsonkit'
import { HEADLINE_RULES, BANNED_HEAD } from './storyDesk'

const nowIso = () => new Date().toISOString()
const rid = (p: string) => `${p}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
const THEMES: InterviewTheme[] = ['loss', 'depression', 'anxiety', 'other']
const theme = (x: unknown): InterviewTheme => (THEMES.includes(x as InterviewTheme) ? x : 'other') as InterviewTheme
const norm = (x: string) => x.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()

const CORA = `You are Cora, the journalist on Mandi's Story desk. You are interviewing her for Medium pieces (Joyful Media): her lived experience, written for a woman who is struggling with loss, depression or anxiety right now. You are a journalist, not a therapist: you never diagnose, never interpret her feelings for her, never promise healing, never use therapy-speak ("hold space", "that's so valid", "trauma response"). You are warm, curious and specific. You ask about what happened, what she saw, what she said, what she did next, what she believed then versus now. Never "how did that make you feel?". Never name a real person or a child in what YOU write; if she names someone, refer to them by role ("your mom", "your son").`

// Present-tense only; a past season told as story goes to Cora, who also flags unsafe_now.
const CRISIS = /\b(i (still )?(want|wanna) to die|i'?m (going to|gonna|thinking about) (kill|hurt)(ing)? myself|i don'?t want to (be here|live) (any ?more|now)|i'?m (feeling )?suicidal)\b/i
const QUESTION_RULES = `QUESTIONS like a great interviewer: ask for the scene, not the summary. What was in your hands, who was in the room (by role), what did you say out loud, what did you do the next morning, what did you tell people when they asked, what did you believe then that you don't now, what part have you never written. NEVER: "how did you navigate", "journey", "how did X impact / influence / shape you", "what steps", "how did you cope", "what helped you", "can you tell me about", "how did that make you feel", two questions in one.
GOOD: "When they told you there was no heartbeat and you asked everyone to leave, what did you do with your hands?" · "What did you say when people asked how the baby was?" BAD: "How did your loss shape your journey?"`
const BANNED_Q = /\b(navigat|journey|impact(ed)? (you|your)|influence[ds]? (you|your)|shape[ds]? (you|your)|what steps|how did you cope|what helped you|can you (tell|describe)|could you describe|make you feel)\b/i

const CRISIS_REPLY = 'I’m going to stop the interview here, because what you just said matters more than any story. If you’re thinking about hurting yourself or not being here, please call or text 988 (Suicide & Crisis Lifeline, US) right now, or 911 if you’re in danger. You don’t have to explain it well. The interview will be right here whenever you want it, and we never have to come back to this question.'

export function getInterviews(): StoryInterview[] { return (readDb().story_interviews ?? []).slice().reverse() }
export function getInterview(id: string) { return (readDb().story_interviews ?? []).find(i => i.id === id) ?? null }

function save(id: string, fn: (i: StoryInterview) => void): StoryInterview | null {
  const db = readDb()
  const i = (db.story_interviews ?? []).find(x => x.id === id)
  if (!i) return null
  fn(i); i.updated_at = nowIso(); writeDb(db)
  return i
}

// Start (or pick back up) an interview. Only one open interview at a time.
export function startInterview(): { interview: StoryInterview; handoff?: Handoff } {
  const open = (readDb().story_interviews ?? []).find(i => i.status === 'reading' || i.status === 'ready')
  if (open) return { interview: open }
  const now = nowIso()
  const iv: StoryInterview = { id: rid('iv'), status: 'reading', notebook: [], turns: [], charged: [], current_note_id: null, followups: {}, pitch_ids: [], created_at: now, updated_at: now }
  const h = openHandoff({ kind: 'interview_prep', from: 'mandi', to: 'cora', what: 'Read my captions like a journalist (loss, depression, anxiety) and interview me', ref: { type: 'interview', id: iv.id, label: 'Cora’s interview' } })
  iv.handoff_id = h.id
  const db = readDb(); db.story_interviews = [...(db.story_interviews ?? []), iv]; writeDb(db)
  return { interview: iv, handoff: h }
}

// How Cora asks a notebook question (with the caption that raised it, when there is one).
function askLine(n: InterviewNote): string {
  const q = n.quotes[0]
  return q ? `${q.date ? `On ${q.date}` : 'In one caption'} you wrote: “${cut(q.line, 220)}”\n${n.question}` : n.question
}
const nextOpen = (i: StoryInterview) => i.notebook.find(n => n.status === 'open')

export async function runInterviewPrep(h: Handoff) {
  startAttempt(h.id)
  const id = String(h.ref?.id ?? '')
  if (!getInterview(id)) return failHandoff(h.id, 'The interview this was for is gone.')
  const { readWell } = await import('./well')
  const well = readWell()
  if (well.length < 50) { save(id, i => { i.status = 'failed'; i.error = 'The Well isn’t loaded here.' }); return failHandoff(h.id, 'The Well isn’t loaded here, so Cora has no captions to read.') }
  const corpus = norm(well.map(l => l.cap).join(' \n '))
  const inWell = (line: string) => { const n = norm(line); return n.length >= 12 && corpus.includes(n.slice(0, Math.min(60, n.length))) }

  // Pass 1: the journalist's read, about 120 captions at a time.
  const raw: string[] = []
  for (let k = 0; k < well.length; k += 120) {
    const chunk = well.slice(k, k + 120)
    try {
      const out = JSON.parse(extractJsonObject(await fableText({ json: true, maxTokens: 1800,
        instructions: `${CORA}\nRead these captions of hers. Note every place she touches loss or grief, depression or a dark season, anxiety or fear, even in passing or under a joke. For each, write the question a good journalist would want to ask her (what she left out, what happened right before, the detail behind the line, what she'd say now). Quote HER exact words (short) with the date. Up to 6. Reply ONLY with JSON: {"notes":[{"theme":"loss|depression|anxiety|other","question":"","why":"what in the caption raised it","quote":"her exact words","date":""}]}`,
        input: chunk.map(l => `[${l.date}] ${cut(l.cap, 600)}`).join('\n\n') }))) as { notes?: { theme: string; question: string; why: string; quote: string; date: string }[] }
      for (const n of (out.notes ?? []).slice(0, 6)) if (n?.question && n.quote && inWell(n.quote)) raw.push(`[${theme(n.theme)}] (${cut(n.date ?? '', 30)}) “${cut(n.quote, 240)}” → Q: ${cut(n.question, 240)} (why: ${cut(n.why ?? '', 160)})`)
    } catch { /* one chunk failing doesn't stop the read */ }
  }
  if (raw.length < 4) { save(id, i => { i.status = 'failed'; i.error = `Cora only found ${raw.length} notes.` }); return failHandoff(h.id, `Cora only found ${raw.length} notes in the captions; retry.`) }

  // Pass 2: the notebook. Merge duplicates, order gentle → deep, balance the three themes.
  let book: { theme: string; question: string; why: string; quotes: { date: string; line: string }[] }[] = []
  try {
    const out = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 5000,
      instructions: `${CORA}\nThese are your notes from reading all ${well.length} of her captions. Build your interview notebook: 12 to 15 questions. Merge notes about the same moment (keep up to 3 of her quotes). Balance loss, depression and anxiety. Order them gentle → deep: start with concrete, easy-to-answer moments; the hardest go later. Each question is ONE short open question (under 30 words), concrete, about a moment, and could only be asked of her. Quotes must be copied exactly from the notes.
Only loss, depression or anxiety (use "other" only for something clearly tied to one of them, at most 2). Drop notes that are just upbeat updates.
${QUESTION_RULES}
Reply ONLY with JSON: {"notebook":[{"theme":"loss|depression|anxiety|other","question":"","why":"","quotes":[{"date":"","line":""}]}]}`,
      input: raw.join('\n') }))) as { notebook?: typeof book }
    book = Array.isArray(out.notebook) ? out.notebook : []
  } catch (e) { save(id, i => { i.status = 'failed'; i.error = 'Cora couldn’t build the notebook.' }); return failHandoff(h.id, `Cora couldn’t build the notebook: ${e instanceof Error ? e.message : 'no answer'}`) }

  const notebook: InterviewNote[] = book.slice(0, 15).filter(n => n?.question).map(n => ({
    id: rid('in'), theme: theme(n.theme), question: cut(String(n.question), 300), why: cut(String(n.why ?? ''), 240),
    quotes: (Array.isArray(n.quotes) ? n.quotes : []).filter(q => inWell(String(q?.line ?? ''))).slice(0, 3).map(q => ({ date: cut(String(q.date ?? ''), 40), line: cut(String(q.line), 300) })),
    status: 'open' as const }))
  if (notebook.length < 4) { save(id, i => { i.status = 'failed'; i.error = 'The notebook came back too thin.' }); return failHandoff(h.id, 'Cora’s notebook came back too thin; retry.') }
  // One pass to sharpen the questions that read like a form.
  const weak = notebook.filter(n => BANNED_Q.test(n.question))
  if (weak.length) {
    try {
      const fix = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 2000,
        instructions: `${CORA}\nRewrite each of these interview questions so it asks for the scene. Keep it about the same moment, built from her quote.\n${QUESTION_RULES}\nReply ONLY with JSON: {"questions":[{"id":"","question":""}]}`,
        input: weak.map(n => `id ${n.id} · her words: “${n.quotes[0]?.line ?? ''}” · question: ${n.question}`).join('\n') }))) as { questions?: { id: string; question: string }[] }
      for (const q of fix.questions ?? []) { const n = notebook.find(x => x.id === q.id); if (n && q.question && !BANNED_Q.test(q.question)) n.question = cut(String(q.question), 300) }
    } catch { /* keep them */ }
  }

  const first = notebook[0]; first.status = 'asked'
  const counts = THEMES.map(t => [t, notebook.filter(n => n.theme === t).length] as const).filter(([, c]) => c)
  save(id, i => {
    i.notebook = notebook; i.status = 'ready'; i.current_note_id = first.id
    i.turns.push({ role: 'cora', at: nowIso(), note_id: null, text: `I read all ${well.length} of your captions with a notebook open. I have ${notebook.length} questions (${counts.map(([t, c]) => `${c} on ${t}`).join(', ')}). I’ll ask one at a time and follow you where it gets charged. Say “skip” to pass, or mark any question off limits and I won’t bring it up again. Answer as long or as short as you want; talking it out loud is fine.` })
    i.turns.push({ role: 'cora', at: nowIso(), note_id: first.id, text: askLine(first) })
  })
  return completeHandoff(h.id, 'cora', `Read ${well.length} captions and filled a notebook of ${notebook.length} interview questions (${counts.map(([t, c]) => `${t} ${c}`).join(', ')}). The interview is open on the Story desk.`, [{ type: 'interview', id, label: 'Cora’s interview' }])
}

// Mandi answers (or skips). Cora marks the charge, then follows up or moves to the next question.
export async function answerInterview(id: string, text: string, opts: { skip?: boolean; offLimits?: boolean } = {}): Promise<{ interview: StoryInterview } | { error: string }> {
  const iv = getInterview(id)
  if (!iv) return { error: 'No such interview.' }
  if (iv.status !== 'ready') return { error: iv.status === 'reading' ? 'Cora is still reading your captions.' : 'This interview is closed.' }
  const cur = iv.notebook.find(n => n.id === iv.current_note_id) ?? null
  const said = (text ?? '').trim()

  if (opts.skip || opts.offLimits || /^(skip|pass|next)\.?$/i.test(said)) {
    const r = save(id, i => {
      const n = i.notebook.find(x => x.id === i.current_note_id)
      if (n) n.status = opts.offLimits ? 'off_limits' : 'skipped'
      if (said && !/^(skip|pass|next)\.?$/i.test(said)) i.turns.push({ role: 'mandi', text: cut(said, 4000), at: nowIso(), note_id: n?.id ?? null })
      const nx = nextOpen(i)
      i.current_note_id = nx?.id ?? null
      if (nx) nx.status = 'asked'
      i.turns.push({ role: 'cora', at: nowIso(), note_id: nx?.id ?? null, text: `${opts.offLimits ? 'Off limits. I won’t bring that one up again.' : 'Skipping it.'}${nx ? `\n\n${askLine(nx)}` : `\n\nThat’s the end of my notebook. When you’re ready, press “Shape the stories”.`}` })
    })
    return { interview: r! }
  }
  if (!said) return { error: 'Say something first (or skip).' }

  save(id, i => { i.turns.push({ role: 'mandi', text: cut(said, 6000), at: nowIso(), note_id: cur?.id ?? null }) })

  // Present danger stops the interview (past dark seasons don't).
  let crisis = CRISIS.test(said)

  const asked = cur ? (iv.followups[cur.id] ?? 0) : 0
  const recent = (getInterview(id)?.turns ?? []).slice(-10).map(t => `${t.role === 'cora' ? 'CORA' : 'MANDI'}: ${cut(t.text, 1200)}`).join('\n')
  let out: { ack?: string; charged?: { point: string; her_words: string; why: string; theme: string }[]; next?: string; followup?: string; unsafe_now?: boolean } = {}
  if (!crisis) {
    try {
      out = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 900,
        instructions: `${CORA}
She just answered. Do three things:
1. "charged": the charged points in THIS answer, if any. Charge = a specific sensory detail, a turn (before/after), a contradiction, a belief she held then vs now, something she seems to be saying out loud for the first time, a line a struggling woman would screenshot. For each: point (one plain line), her_words (copied EXACTLY from her answer, 4–40 words), why (why it's charged), theme. Zero is fine; don't inflate.
2. "next": "followup" if there's charge worth digging into and follow-ups so far on this question < 2 (so far: ${asked}); otherwise "move_on". "followup" is ONE short, concrete question that goes toward the charge (a scene, not "what do you think shifted") (the detail, the moment right before, what she did next, what she knows now). Never repeat a question.
3. "ack": one short, plain sentence that names the specific thing she said back to her (e.g. "The drink you weren't drinking."). Never grade or label it: no "powerful", "beautiful", "brave", "you really captured", no praise, no therapy-speak. Can be empty.
"unsafe_now": true ONLY if she says she may hurt herself or not want to live NOW (not a past season she is telling).
Reply ONLY with JSON: {"ack":"","charged":[{"point":"","her_words":"","why":"","theme":"loss|depression|anxiety|other"}],"next":"followup|move_on","followup":"","unsafe_now":false}`,
        input: `THE QUESTION: ${cur ? askLine(cur) : '(open conversation)'}\nWHY YOU ASKED: ${cur?.why ?? ''}\n\nTHE INTERVIEW SO FAR (latest last):\n${recent}` }))) as typeof out
    } catch { out = { ack: '', next: 'move_on' } }
    crisis = !!out.unsafe_now
  }

  const hersN = norm(said)
  const points: ChargedPoint[] = crisis ? [] : (Array.isArray(out.charged) ? out.charged : []).filter(c => c?.point && c.her_words && hersN.includes(norm(String(c.her_words)).slice(0, 50))).slice(0, 3)
    .map(c => ({ id: rid('cp'), note_id: cur?.id ?? null, theme: theme(c.theme), point: cut(String(c.point), 240), her_words: cut(String(c.her_words), 400), why: cut(String(c.why ?? ''), 240), at: nowIso() }))

  const r = save(id, i => {
    i.charged.push(...points)
    if (crisis) { i.turns.push({ role: 'cora', text: CRISIS_REPLY, at: nowIso(), note_id: cur?.id ?? null }); return }
    const n = i.notebook.find(x => x.id === i.current_note_id)
    const ack = cut((out.ack ?? '').trim(), 300)
    if (n && out.next === 'followup' && (out.followup ?? '').trim() && (i.followups[n.id] ?? 0) < 2) {
      i.followups[n.id] = (i.followups[n.id] ?? 0) + 1
      i.turns.push({ role: 'cora', text: `${ack ? ack + '\n\n' : ''}${cut(out.followup!.trim(), 300)}`, at: nowIso(), note_id: n.id, followup: true })
      return
    }
    if (n) n.status = 'answered'
    const nx = nextOpen(i)
    i.current_note_id = nx?.id ?? null
    if (nx) nx.status = 'asked'
    i.turns.push({ role: 'cora', at: nowIso(), note_id: nx?.id ?? null, text: `${ack ? ack + '\n\n' : ''}${nx ? askLine(nx) : 'That’s the end of my notebook. When you’re ready, press “Shape the stories” and I’ll turn the charged points into Medium pieces.'}` })
  })
  return { interview: r! }
}

export function openShape(id: string): { interview: StoryInterview; handoff: Handoff } | { error: string } {
  const iv = getInterview(id)
  if (!iv) return { error: 'No such interview.' }
  if (iv.status !== 'ready') return { error: 'This interview isn’t open.' }
  const answers = iv.turns.filter(t => t.role === 'mandi').length
  if (iv.charged.length < 2 && answers < 3) return { error: 'Answer a few more questions first; Cora needs at least two charged points to shape from.' }
  const h = openHandoff({ kind: 'interview_shape', from: 'mandi', to: 'cora', what: 'Shape Medium stories from my interview', ref: { type: 'interview', id, label: 'Cora’s interview' } })
  const r = save(id, i => { i.status = 'shaping'; i.handoff_id = h.id })
  return { interview: r!, handoff: h }
}

export async function runInterviewShape(h: Handoff) {
  startAttempt(h.id)
  const id = String(h.ref?.id ?? '')
  const iv = getInterview(id)
  if (!iv) return failHandoff(h.id, 'The interview is gone.')
  const offLimits = new Set(iv.notebook.filter(n => n.status === 'off_limits').map(n => n.id))
  const turns = iv.turns.filter(t => !(t.note_id && offLimits.has(t.note_id)))
  const herText = turns.filter(t => t.role === 'mandi').map(t => t.text).join('\n')
  const herN = norm(herText)
  const { readWell } = await import('./well')
  const corpus = norm(readWell().map(l => l.cap).join(' \n '))
  const said = (x: string) => { const n = norm(x); return n.length >= 10 && herN.includes(n.slice(0, Math.min(50, n.length))) }
  const wrote = (x: string) => { const n = norm(x); return n.length >= 12 && corpus.includes(n.slice(0, Math.min(60, n.length))) }

  const transcript = turns.map(t => `${t.role === 'cora' ? 'CORA' : 'MANDI'}: ${t.text}`).join('\n\n')
  const charged = iv.charged.filter(c => !(c.note_id && offLimits.has(c.note_id)))
  let out: { stories?: { title: string; reader: string; take: string; why_now: string; headlines: string[]; opening: string; beats: string[]; interview_lines: string[]; her_lines: { date: string; line: string }[]; holds_because: string }[] }
  try {
    out = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 6000,
      instructions: `${CORA}
The interview is done. Shape 3 to 5 Medium pieces from the CHARGED POINTS (one charged point, or two that belong together, per piece). Each piece is written to ONE reader: a specific woman struggling with loss, depression or anxiety right now (be concrete: where she is, what she's doing at 2am, what she's stopped telling people). The piece is Mandi's lived experience, not advice, not treatment, no promise that it gets better on a timeline.
For each: title (working name); reader (one sentence); take (one sentence: what the piece IS, the turn only Mandi has); why_now (one line); headlines (exactly 3); opening (the first line of the piece, built from her own interview words, can be a direct quote); beats (4–6 short beats: the moment → before → the turn → what she does now → what she'd hand the reader); interview_lines (2–4 things she SAID, copied exactly from the transcript); her_lines (0–3 caption quotes from the notebook, copied exactly, with dates); holds_because (one line).
Never name a real person or a child. Protect the people in her stories: if a line would hurt someone, keep the truth and leave out who.
${HEADLINE_RULES}
Reply ONLY with JSON: {"stories":[{"title":"","reader":"","take":"","why_now":"","headlines":["","",""],"opening":"","beats":[""],"interview_lines":[""],"her_lines":[{"date":"","line":""}],"holds_because":""}]}`,
      input: `CHARGED POINTS (her words):\n${charged.map(c => `- [${c.theme}] ${c.point} | “${c.her_words}” (why: ${c.why})`).join('\n') || '(none marked; find them in the transcript)'}\n\nNOTEBOOK CAPTION QUOTES:\n${iv.notebook.filter(n => !offLimits.has(n.id)).flatMap(n => n.quotes.map(q => `(${q.date}) “${q.line}”`)).join('\n')}\n\nTHE TRANSCRIPT:\n${cut(transcript, 30000)}` })))
  } catch (e) { save(id, i => { i.status = 'ready' }); return failHandoff(h.id, `Cora couldn’t shape the stories: ${e instanceof Error ? e.message : 'no answer'}`) }

  const { edCheck } = await import('./longform')
  const now = nowIso()
  const made: StoryPitch[] = []
  for (const s of (out.stories ?? []).slice(0, 5)) {
    const interview_lines = asLines(s.interview_lines, 4, 400).filter(said)
    if (!s?.take || !interview_lines.length) continue
    let headlines = asLines(s.headlines, 3, 160)
    if (headlines.length < 2) continue
    if (headlines.filter(x => BANNED_HEAD.test(x)).length >= 2) {
      try {
        const fix = JSON.parse(extractJsonObject(await fableText({ json: true, useClaude: true, maxTokens: 600, instructions: `You are Cora. Rewrite these headlines so a stranger who is struggling stops scrolling. Use a concrete detail from what she SAID.\n${HEADLINE_RULES}\nReply ONLY with JSON: {"headlines":["","",""]}`, input: `THE PIECE: ${s.take}\nWHAT SHE SAID:\n${interview_lines.map(l => `"${l}"`).join('\n')}\nTOO GENERIC:\n${headlines.join('\n')}` })))
        const better = asLines(fix.headlines, 3, 160)
        if (better.length >= 2) headlines = better
      } catch { /* keep the first set, flagged */ }
    }
    const her_lines = (Array.isArray(s.her_lines) ? s.her_lines : []).filter(l => wrote(String(l?.line ?? ''))).slice(0, 3).map(l => ({ date: cut(String(l.date ?? ''), 40), line: cut(String(l.line), 300) }))
    const risks: string[] = []
    const generic = headlines.filter(x => BANNED_HEAD.test(x))
    if (generic.length) risks.push(`${generic.length} headline${generic.length > 1 ? 's' : ''} lean generic (“${cut(generic[0], 60)}”)`)
    const v = await edCheck(`${headlines.join('\n')}\n${s.take}\n${s.opening ?? ''}\n${interview_lines.join('\n')}`, { branch: 'joyful_media', kind: 'medium', mandiText: [...interview_lines, ...her_lines.map(l => l.line)].join('\n'), round: 1 })
    risks.push(...v.reasons.filter(r => !/^Money or result numbers/.test(r)).slice(0, 3))
    made.push({ id: rid('sp'), title: cut(s.title || headlines[0], 120), take: cut(s.take, 400), why_now: cut(s.why_now ?? '', 300), branch: 'joyful_media', form: 'medium', headlines, her_lines, holds_because: cut(s.holds_because ?? '', 300), risks, status: 'proposed', handoff_id: h.id,
      interview_id: id, reader: cut(s.reader ?? '', 300), opening: cut(s.opening ?? '', 400), beats: asLines(s.beats, 6, 200), interview_lines, created_at: now, updated_at: now })
  }
  if (!made.length) { save(id, i => { i.status = 'ready' }); return failHandoff(h.id, 'Cora came back without stories built from your words. Retry, or answer a few more questions.') }

  const note = createNote({ title: cut(`Cora’s interview · ${new Date().toISOString().slice(0, 10)}`, 120), body: `Charged points:\n${charged.map(c => `- ${c.point}: “${c.her_words}”`).join('\n')}\n\n${transcript}`, category: 'reflection', source: 'rise', tags: ['interview', 'cora', 'story-material', 'medium'], pinned: false })
  const d = readDb()
  d.story_pitches = [...(d.story_pitches ?? []), ...made]
  const x = d.story_interviews!.find(i => i.id === id)!
  Object.assign(x, { status: 'shaped', pitch_ids: made.map(m => m.id), transcript_note_id: note.id, updated_at: nowIso() })
  x.turns.push({ role: 'cora', at: nowIso(), text: `I shaped ${made.length} Medium piece${made.length > 1 ? 's' : ''} from what you said. They’re in Approve: ${made.map(m => `“${m.headlines[0]}”`).join(' · ')}. The transcript is in Notes.` })
  writeDb(d)
  return completeHandoff(h.id, 'cora', `Shaped ${made.length} Medium pieces from ${charged.length} charged points: ${made.map(m => `“${m.headlines[0]}”`).join(' · ')}. They wait in Approve; transcript filed as Note #${note.id}.`, [{ type: 'interview', id, label: 'Cora’s interview' }, { type: 'note', id: note.id }])
}

// Close an interview without shaping (it stays readable).
export function closeInterview(id: string) { return save(id, i => { if (i.status === 'ready' || i.status === 'reading') i.status = 'shaped' }) }
