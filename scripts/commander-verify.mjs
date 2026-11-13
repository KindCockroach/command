// COMMANDER VERIFY — proves the Commander's tool loop does what it says, without
// touching real data and without an Anthropic key.
//
//   node scripts/commander-verify.mjs
//
// How: copies data/db.json to a temp folder and points DB_PATH at the copy, then
// runs the REAL loop (commanderAgent in src/lib/fable.ts) and the REAL tools
// (src/lib/commanderTools.ts) with a STUBBED model — a scripted stand-in that asks
// for tools the way the live model would. So this checks the plumbing (tools run,
// results reach the model, receipts are truthful, data is stored). It does NOT
// check how the live model behaves — that needs a real key and was not tested.
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import crypto from 'node:crypto'
import { registerHooks } from 'node:module'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { createRequire } from 'node:module'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const require = createRequire(import.meta.url)
const ts = require('typescript')

// ── never the real database ──────────────────────────────────────────────────
const realDb = path.join(root, 'data', 'db.json')
const sha = f => crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex')
const realBefore = sha(realDb)
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'commander-verify-'))
const tmpDb = path.join(tmpDir, 'db.json')
fs.copyFileSync(realDb, tmpDb)
process.env.DB_PATH = tmpDb
delete process.env.ANTHROPIC_API_KEY   // the stub is the only model this script may use
delete process.env.OPENAI_API_KEY

// ── load the app's TypeScript directly (no build, no new dependencies) ───────
const tryFile = base => [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts')].find(f => fs.existsSync(f) && fs.statSync(f).isFile())
registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = null
    if (specifier.startsWith('@/')) target = tryFile(path.join(root, 'src', specifier.slice(2)))
    else if (specifier.startsWith('.') && context.parentURL?.startsWith('file:') && /\.tsx?$/.test(fileURLToPath(context.parentURL))) {
      target = tryFile(path.resolve(path.dirname(fileURLToPath(context.parentURL)), specifier))
    }
    return target ? { url: pathToFileURL(target).href, shortCircuit: true } : nextResolve(specifier, context)
  },
  load(url, context, nextLoad) {
    if (url.startsWith('file:') && /\.tsx?$/.test(url) && !url.includes('/node_modules/')) {
      const source = fs.readFileSync(fileURLToPath(url), 'utf8')
      const out = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
      return { format: 'module', source: out.outputText, shortCircuit: true }
    }
    return nextLoad(url, context)
  },
})

const { commanderAgent } = await import(pathToFileURL(path.join(root, 'src/lib/fable.ts')).href)
const { runCommanderTool, commanderToolDefinitions, COMMANDER_TOOLS } = await import(pathToFileURL(path.join(root, 'src/lib/commanderTools.ts')).href)

// ── helpers ──────────────────────────────────────────────────────────────────
const db = () => JSON.parse(fs.readFileSync(tmpDb, 'utf8'))
const ctx = {
  baseUrl: 'http://127.0.0.1:0',
  fetchImpl: async () => { throw new Error('network is disabled in commander-verify') },
}
const toolUse = (name, input, id = `tu_${crypto.randomUUID().slice(0, 8)}`) => ({ type: 'tool_use', id, name, input })
// A stubbed model: plays the given turns in order. Each turn is a function of the
// messages so far, so it can read tool results exactly as the live model would.
function stub(turns) {
  const seen = []
  let n = 0
  const callModel = async req => {
    seen.push(JSON.parse(JSON.stringify(req.messages)))
    const t = turns[Math.min(n++, turns.length - 1)]
    return t(req.messages)
  }
  return { callModel, seen, calls: () => n }
}
const lastToolResults = messages => {
  const last = messages[messages.length - 1]
  return Array.isArray(last?.content) ? last.content.filter(b => b.type === 'tool_result') : []
}
const say = text => ({ content: [{ type: 'text', text }], stop_reason: 'end_turn' })
const run = (s, userText) => commanderAgent({
  system: 'verify', messages: [{ role: 'user', content: userText }], tools: commanderToolDefinitions(),
  runTool: (name, input) => runCommanderTool(name, input, ctx), callModel: s.callModel,
})

const results = []
async function check(name, fn) {
  try {
    const problems = (await fn()) ?? []
    results.push({ name, pass: problems.length === 0, problems })
  } catch (e) {
    results.push({ name, pass: false, problems: [`threw: ${e?.stack ?? e}`] })
  }
}
const expect = (problems, cond, msg) => { if (!cond) problems.push(msg) }

// ── the checks ───────────────────────────────────────────────────────────────
const SCRIPT = `HOOK: You are not behind. You are overriding yourself.

Line two — "the part nobody says out loud".
Then the turn: breathe in for four, out for six.

CTA: comment RESET and I'll send it.`
let cardId = null

await check('1. A script sent to Cards is saved on the card, in full', async () => {
  const p = []
  const s = stub([
    () => ({ content: [{ type: 'text', text: 'Saving that now.' }, toolUse('create_card', { title: 'Verify — override script', script: SCRIPT })], stop_reason: 'tool_use' }),
    m => { const r = JSON.parse(lastToolResults(m)[0].content); return say(`Saved as card ${r.data.id}: "${r.data.title}".`) },
  ])
  const out = await run(s, 'write a script and send it to Cards')
  const receipt = out.receipts[0]
  expect(p, out.receipts.length === 1 && receipt?.ok === true && receipt.tool === 'create_card', `expected one ✓ create_card receipt, got ${JSON.stringify(out.receipts)}`)
  const stored = db().content.find(c => c.title === 'Verify — override script')
  expect(p, !!stored, 'the card is not in the database')
  expect(p, stored?.script === SCRIPT, 'the stored script is not exactly the script that was sent')
  cardId = stored?.id ?? null
  expect(p, out.reply.includes(String(cardId)), 'the reply does not quote the returned card id')
  const toModel = lastToolResults(s.seen[1])[0]
  expect(p, toModel && !toModel.is_error && JSON.parse(toModel.content).data.script === SCRIPT, 'the model was not shown the saved card (with its script) as the tool result')
  return p
})

await check('2. Editing that card changes what is stored', async () => {
  const p = []
  if (!cardId) return ['skipped — check 1 did not create a card']
  const NEW = SCRIPT.replace('You are not behind.', 'You were never behind.') + '\n\n(v2)'
  const s = stub([
    () => ({ content: [toolUse('update_card', { id: cardId, script: NEW, title: 'Verify — override script v2' })], stop_reason: 'tool_use' }),
    m => say(`Updated: ${JSON.parse(lastToolResults(m)[0].content).summary}`),
  ])
  const out = await run(s, 'edit that card')
  expect(p, out.receipts.length === 1 && out.receipts[0].ok, `expected one ✓ update_card receipt, got ${JSON.stringify(out.receipts)}`)
  const stored = db().content.find(c => c.id === cardId)
  expect(p, stored?.script === NEW, 'the stored script did not change to the edited text')
  expect(p, stored?.title === 'Verify — override script v2', 'the stored title did not change')
  expect(p, db().content.filter(c => c.title.startsWith('Verify — override script')).length === 1, 'the edit made a second card instead of changing the first')
  return p
})

await check('3. A failed tool reaches the model as an error and is reported, not claimed as success', async () => {
  const p = []
  const before = fs.readFileSync(tmpDb, 'utf8')
  const s = stub([
    () => ({ content: [toolUse('update_card', { id: 99999999, script: 'new words' })], stop_reason: 'tool_use' }),
    m => { const r = lastToolResults(m)[0]; return say(r.is_error ? `That did not work: ${JSON.parse(r.content).error}` : 'Done — updated.') },
  ])
  const out = await run(s, 'update card 99999999')
  const toModel = lastToolResults(s.seen[1])[0]
  expect(p, toModel?.is_error === true, 'the tool result sent back to the model was not marked is_error')
  expect(p, /no card with id 99999999/.test(toModel?.content ?? ''), 'the model was not given the plain failure reason')
  expect(p, out.receipts.length === 1 && out.receipts[0].ok === false, `expected one ✗ receipt, got ${JSON.stringify(out.receipts)}`)
  expect(p, !out.receipts.some(r => r.ok), 'a success receipt was produced for a failed call')
  expect(p, /did not work/.test(out.reply), 'the failure did not make it into the reply')
  expect(p, fs.readFileSync(tmpDb, 'utf8') === before, 'the database changed even though the tool failed')
  // Also: a handler that THROWS must come back as an error, not vanish.
  const s2 = stub([() => ({ content: [toolUse('create_card', { title: 'x', script: 'real words' })], stop_reason: 'tool_use' }), m => say(lastToolResults(m)[0].is_error ? 'failed' : 'ok')])
  const out2 = await commanderAgent({ system: 'verify', messages: [{ role: 'user', content: 'x' }], tools: [], callModel: s2.callModel, runTool: async () => { throw new Error('disk on fire') } })
  expect(p, out2.receipts[0]?.ok === false && /disk on fire/.test(out2.receipts[0].summary) && out2.reply === 'failed', 'a tool that threw was not reported as a failure')
  return p
})

await check('4. A request a tool covers actually runs the tool', async () => {
  const p = []
  const s = stub([
    () => ({ content: [
      toolUse('create_note', { title: 'Verify note', body: 'Store this exactly.' }),
      toolUse('create_task', { title: 'Verify task', priority: 'high', due_date: '2026-12-01' }),
    ], stop_reason: 'tool_use' }),
    m => say(lastToolResults(m).map(r => JSON.parse(r.content).summary).join(' / ')),
  ])
  const out = await run(s, 'store this and remind me')
  expect(p, out.receipts.length === 2 && out.receipts.every(r => r.ok), `expected two ✓ receipts, got ${JSON.stringify(out.receipts)}`)
  const d = db()
  expect(p, (d.notes ?? []).some(n => n.title === 'Verify note' && n.body === 'Store this exactly.'), 'the note is not in the database')
  expect(p, (d.tasks ?? []).some(t => t.title === 'Verify task' && t.priority === 'high' && t.due_date === '2026-12-01'), 'the task is not in the database')
  const lastUser = s.seen[1][s.seen[1].length - 1]
  expect(p, lastUser.role === 'user' && lastToolResults(s.seen[1]).length === 2, 'both tool results were not sent back in ONE user message')
  expect(p, s.calls() === 2, `expected the loop to stop after 2 model calls, it made ${s.calls()}`)
  return p
})

await check('5. A request no tool covers produces no fake receipt', async () => {
  const p = []
  const before = fs.readFileSync(tmpDb, 'utf8')
  const s = stub([() => say("I don't have a tool that sends text messages — that capability is missing and would need to be built.")])
  const out = await run(s, 'text my sister that I am running late')
  expect(p, out.receipts.length === 0, `expected no receipts, got ${JSON.stringify(out.receipts)}`)
  expect(p, /capability is missing/.test(out.reply), 'the reply was altered')
  expect(p, fs.readFileSync(tmpDb, 'utf8') === before, 'the database changed with no tool call')
  // An empty model reply must not turn into "Done."
  const empty = await run(stub([() => ({ content: [], stop_reason: 'end_turn' })]), 'hi')
  expect(p, empty.receipts.length === 0 && /empty reply/.test(empty.reply) && !/^done\.?$/i.test(empty.reply), 'an empty model reply was not surfaced as a visible warning')
  return p
})

// ── extra guards (same loop, same tools) ─────────────────────────────────────
await check('6. Placeholder / empty content is rejected, and nothing is saved', async () => {
  const p = []
  const before = db().content.length
  for (const input of [{ title: 'Verify placeholder', script: '[script here]' }, { title: 'Verify placeholder', script: '   ' }, { title: 'Verify placeholder' }, { title: 'TBD', script: 'real words' }]) {
    const r = await runCommanderTool('create_card', input, ctx)
    expect(p, r.ok === false, `create_card accepted ${JSON.stringify(input)}`)
  }
  if (cardId) expect(p, (await runCommanderTool('update_card', { id: cardId, script: '...' }, ctx)).ok === false, 'update_card accepted a placeholder script')
  expect(p, db().content.length === before, 'a rejected card was saved anyway')
  return p
})

await check('7. update_account rejects an unknown id; create_audience will not overwrite', async () => {
  const p = []
  const accountsBefore = (db().brand_accounts ?? []).length
  const r = await runCommanderTool('update_account', { id: 'verify-no-such-account', topic: 'x' }, ctx)
  expect(p, r.ok === false, 'update_account accepted an unknown id')
  expect(p, (db().brand_accounts ?? []).length === accountsBefore, 'update_account created a bogus account')
  const a1 = await runCommanderTool('create_audience', { name: 'Verify Vera', snapshot: 'first' }, ctx)
  const a2 = await runCommanderTool('create_audience', { name: 'Verify Vera', snapshot: 'second' }, ctx)
  expect(p, a1.ok === true && a2.ok === false, 'create_audience did not refuse a duplicate')
  expect(p, (db().audiences ?? []).find(a => a.id === 'verify-vera')?.snapshot === 'first', 'the existing audience was overwritten')
  return p
})

await check('8. Step cap, cut-off replies and mid-run errors are shown, with receipts kept', async () => {
  const p = []
  const loop = stub([() => ({ content: [toolUse('list_cards', { limit: 1 })], stop_reason: 'tool_use' })])
  const capped = await run(loop, 'loop forever')
  expect(p, loop.calls() === 8 && /stopped after 8 rounds/.test(capped.reply) && capped.receipts.length === 8, `step cap not enforced/visible (calls ${loop.calls()})`)
  const cut = await run(stub([() => ({ content: [{ type: 'text', text: 'Here is the start' }, toolUse('create_note', { title: 'Verify cut-off', body: 'should not save' })], stop_reason: 'max_tokens' })]), 'long one')
  expect(p, /cut off/.test(cut.reply) && cut.receipts.length === 0, 'a max_tokens cut-off was not surfaced')
  expect(p, !(db().notes ?? []).some(n => n.title === 'Verify cut-off'), 'a tool from a cut-off reply ran anyway')
  let n = 0
  const broke = await commanderAgent({
    system: 'verify', messages: [{ role: 'user', content: 'x' }], tools: [], runTool: (name, input) => runCommanderTool(name, input, ctx),
    callModel: async () => { if (n++ === 0) return { content: [toolUse('create_note', { title: 'Verify before error', body: 'saved before the stream broke' })], stop_reason: 'tool_use' }; throw new Error('Commander stream error: overloaded') },
  })
  expect(p, broke.receipts.length === 1 && broke.receipts[0].ok && /overloaded/.test(broke.reply), 'an error after a tool ran lost the receipt or hid the error')
  let threw = false
  try { await commanderAgent({ system: 'v', messages: [{ role: 'user', content: 'x' }], tools: [], runTool: async () => ({ ok: true, summary: '' }), callModel: async () => { throw new Error('boom') } }) } catch { threw = true }
  expect(p, threw, 'an error on the very first model call was swallowed')
  return p
})

await check('9. Thinking blocks go back to the model unchanged; delete works and names what it deleted', async () => {
  const p = []
  const thinking = { type: 'thinking', thinking: '', signature: 'sig-abc123' }
  const s = stub([
    () => ({ content: [thinking, toolUse('delete_card', { id: cardId })], stop_reason: 'tool_use' }),
    m => say(JSON.parse(lastToolResults(m)[0].content).summary),
  ])
  const out = await run(s, 'delete that card')
  const echoed = s.seen[1][1]
  expect(p, echoed.role === 'assistant' && JSON.stringify(echoed.content[0]) === JSON.stringify(thinking), 'the thinking block was changed or dropped when passed back')
  expect(p, out.receipts[0]?.ok && /Verify — override script v2/.test(out.reply), 'delete did not report the title it deleted')
  expect(p, !db().content.some(c => c.id === cardId), 'the card is still in the database')
  return p
})

// ── report ───────────────────────────────────────────────────────────────────
const realAfter = sha(realDb)
results.push({ name: 'Real data/db.json was not touched', pass: realBefore === realAfter, problems: realBefore === realAfter ? [] : ['data/db.json changed during the run!'] })
fs.rmSync(tmpDir, { recursive: true, force: true })

console.log(`\nCommander verify — ${COMMANDER_TOOLS.length} tools in the registry, stubbed model, temp database\n`)
for (const r of results) {
  console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.name}`)
  for (const msg of r.problems) console.log(`      - ${msg}`)
}
const failed = results.filter(r => !r.pass).length
console.log(`\n${results.length - failed} passed, ${failed} failed.`)
console.log('Note: the model was a scripted stand-in. Live-model behaviour (whether Claude picks the right tool and words its reply honestly) was NOT tested here.')
process.exit(failed ? 1 : 0)
