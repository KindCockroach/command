'use client'
import { useState } from 'react'
import { Zap, Loader2, Copy, CheckCheck } from 'lucide-react'

type Workflow = {
  id: string
  emoji: string
  title: string
  description: string
  color: string
  agent: string
  prompt: string
}

const WORKFLOWS: Workflow[] = [
  {
    id: 'idea_to_content',
    emoji: '💡',
    title: 'Idea → Content Plan',
    description: 'Turn a raw idea into a full content plan across platforms',
    color: '#e8448a',
    agent: 'content_director',
    prompt: 'I have an idea I want to turn into content. Help me develop a full content plan: what the angle is, which platforms it fits, what the hook is, what series it belongs in, and what the call to action should be. Ask me for the idea first.',
  },
  {
    id: 'content_to_email',
    emoji: '📧',
    title: 'Content → Email',
    description: 'Turn a post or piece into a compelling email for Substack',
    color: '#f2a65a',
    agent: 'content_director',
    prompt: 'Take a piece of content I have and turn it into a compelling Substack email. Keep my voice — bold, warm, plain English, like a best friend at the kitchen table. Lead with the scene, not the lesson. Ask me for the content.',
  },
  {
    id: 'idea_to_tasks',
    emoji: '✅',
    title: 'Project → Task Plan',
    description: 'Break a big project or idea into a clear weekly task plan',
    color: '#3daa7c',
    agent: 'operator',
    prompt: 'I have a project I need to break into a concrete action plan. Give me: the 3 phases, the key milestones, a weekly breakdown, and the single most important next action right now. Ask me for the project details.',
  },
  {
    id: 'spiral_to_clarity',
    emoji: '🌿',
    title: 'Spiral → Clarity',
    description: 'When you\'re overwhelmed — use this to get back above the line',
    color: '#7c3aed',
    agent: 'healing',
    prompt: 'I\'m feeling overwhelmed and I need help slowing down. Don\'t give me a task list. Help me get curious about what\'s happening, name what I\'m feeling, and find one thing that\'s actually true right now. Start by asking me what\'s going on.',
  },
  {
    id: 'voice_to_notes',
    emoji: '🎙️',
    title: 'Brain Dump → Organized Notes',
    description: 'Paste a messy brain dump and get clean organized notes back',
    color: '#0ea5e9',
    agent: 'operator',
    prompt: 'I\'m going to paste a brain dump — messy thoughts, random ideas, half-finished sentences. Organize it into: key ideas, action items, things to think about later, and questions I need to answer. Ask me to paste my brain dump.',
  },
  {
    id: 'offer_to_launch',
    emoji: '🚀',
    title: 'Offer Idea → Launch Plan',
    description: 'Turn an offer concept into a concrete launch strategy',
    color: '#e05',
    agent: 'client_offer',
    prompt: 'I have an offer idea I want to turn into a real launch. Help me with: who it\'s for, what the transformation is, what the price should be, what the delivery looks like, and what the first 5 days of a launch would look like. Ask me for the offer idea.',
  },
  {
    id: 'weekly_review',
    emoji: '📊',
    title: 'Weekly Review',
    description: 'Structured weekly review: what worked, what didn\'t, what\'s next',
    color: '#64748b',
    agent: 'strategist',
    prompt: 'Run me through a weekly review. Ask me: What were my top 3 wins this week? What didn\'t move? What got in my way? What do I want to prioritize next week? What do I need to let go of? Ask one question at a time.',
  },
  {
    id: 'decision_check',
    emoji: '🔍',
    title: 'Decision Check',
    description: '"Is this consistent with the woman I\'m becoming?"',
    color: '#f2a65a',
    agent: 'contrarian',
    prompt: 'I\'m about to make a decision and I want a reality check. Is this consistent with my priorities? Is this a Level 1 priority or am I chasing something shiny? What am I not seeing? Ask me what the decision is.',
  },
  {
    id: 'monthly_reset',
    emoji: '🌙',
    title: 'Monthly Reset',
    description: 'End-of-month reflection and next month intention setting',
    color: '#5a4fcf',
    agent: 'future_her',
    prompt: 'Walk me through a monthly reset. Speak from a place of calm and perspective. Ask me about the month that just ended, what I\'m most proud of, what I\'m ready to leave behind, and what I want the next month to feel like. Go slow. One question at a time.',
  },
  {
    id: 'viral_autopsy',
    emoji: '🔬',
    title: 'Viral Autopsy → Rebuild',
    description: 'Paste any viral post — get the strategy stripped and rebuilt in your voice',
    color: '#6B2D6E',
    agent: 'content_director',
    prompt: `You are a social media strategist performing a viral content autopsy. When I paste a viral post or describe one, you will:
1. STRIP THE FORMAT: Identify the hook type, emotional trigger, visual structure, and CTA mechanic — separate from the topic
2. NAME THE FORMULA: Give it a short name (e.g. "The Pain Mirror" or "The Dollar Proof")
3. REBUILD IT: Rewrite it 3 times — once as AI Mom (Mandi, warm mom energy), once as Gator (bold swamp creature AI advisor), once as Sage (minimalist productivity) — all pointing to aiworksforyou.co
4. GIVE THE SAVE TRIGGER: What should the CTA be to maximize saves and comments?

Ask me to paste or describe the viral post I want to autopsy.`,
  },
  {
    id: 'manychat_script',
    emoji: '💬',
    title: 'ManyChat Funnel Script',
    description: 'Generate a comment trigger + auto-DM sequence for any piece of content',
    color: '#0ea5e9',
    agent: 'content_director',
    prompt: `Generate a complete ManyChat comment-to-DM funnel for a piece of Instagram content. I need:

1. TRIGGER WORD: One specific keyword to use (not generic — tied to this content)
2. POST CAPTION ENDING: The exact sentence that invites the comment (e.g. "Comment TOOLKIT and I'll send it to your DMs")
3. AUTO-DM MESSAGE: The first DM they receive (warm, in Mandi's voice, with the link placeholder, under 150 words)
4. PUBLIC REPLY: What Mandi should comment publicly when someone triggers it (1 sentence, creates social proof loop)
5. FOLLOW-UP DM (optional): If they don't click within 24hrs, what's the follow-up message?

The offer destination is aiworksforyou.co. Ask me what the content piece is about and what I'm offering.`,
  },
  {
    id: 'carousel_save_machine',
    emoji: '📲',
    title: 'Save-Magnet Carousel',
    description: 'Generate a 10-slide carousel designed to get maximum saves — for any avatar',
    color: '#C9956A',
    agent: 'content_director',
    prompt: `Create a 10-slide Instagram carousel designed to get maximum SAVES. Structure:
- Slide 1: Hook (bold claim or list promise — e.g. "10 AI tools that replace a full-time assistant")
- Slides 2-9: One value point per slide. Short. Scannable. One idea only. Include the tool name, what it does, and where to find it.
- Slide 10: CTA — "SAVE this list. You'll want it later." + "Comment [KEYWORD] for the full breakdown in your DMs."

Rules:
- Every slide must be worth saving on its own
- Write in the voice I tell you (I'll choose: Mandi / Gator / Luna / Max / Sage)
- Keep each slide under 30 words
- The last slide must explicitly say SAVE THIS

Ask me: what's the topic, and which avatar voice should I use?`,
  },
  {
    id: 'week_of_content',
    emoji: '📅',
    title: '5 Posts This Week',
    description: 'Generate a full week of ready-to-post content for any avatar — hooks, body, CTA',
    color: '#3DAA7C',
    agent: 'content_director',
    prompt: `Generate 5 ready-to-post Instagram Reels scripts for this week. Each script needs:
- FORMAT: State the content format (screen record / B-roll + voiceover / talking head / carousel)
- HOOK: The exact opening 1-2 sentences (first 3 seconds — must stop the scroll)
- BODY: 3-4 sentences of value. Teach or prove the hook.
- CTA: Comment trigger word + what they'll receive in DMs
- SAVE PROMPT: One line that tells them to save this

Use the proven hook formulas:
1. "I did [specific thing] in [specific time] using AI"
2. "You shouldn't have to choose between [A] and [B]"
3. "Stop [doing X]. Do this instead."
4. "[Dollar amount / specific result] — here's exactly how"
5. "The [avatar audience] are using this AI tool. Here's what they know."

Ask me: which avatar, and what's the content theme or offer for this week?`,
  },
  {
    id: 'gator_character',
    emoji: '🐊',
    title: 'Gator Content',
    description: 'Generate bold, no-nonsense AI business content as the Gator character',
    color: '#2D6E3E',
    agent: 'content_director',
    prompt: `You are writing content for GATOR — an AI influencer character with a gator head, Southern energy, and zero tolerance for excuses.

GATOR'S RULES:
- Always opens with a challenge, a dare, or a business truth that stings a little
- Short sentences. Never more than 12 words in a row.
- Uses "swamp" references exactly once per piece of content (max)
- Calls out the specific mistake before showing the fix
- Never says "amazing" "incredible" or any hype words — just facts and results
- Always ends with a power move CTA: "Comment GATOR. I'll handle the rest."
- Personality contradiction: terrifying appearance, genuinely helpful content
- Speaks to business owners and entrepreneurs who know they're behind on AI

Generate Gator content about the topic I give you. Ask me for the topic.`,
  },
]

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1800) }}
      style={{ background: 'none', border: 'none', cursor: 'pointer', color: copied ? '#3daa7c' : 'var(--text-muted)', padding: '4px', display: 'flex', alignItems: 'center', gap: '3px', fontSize: '11px' }}>
      {copied ? <CheckCheck size={12} /> : <Copy size={12} />}
    </button>
  )
}

export default function WorkflowsPanel() {
  const [running, setRunning] = useState<string | null>(null)
  const [output, setOutput] = useState<{ id: string; text: string } | null>(null)
  const [riverStatus, setRiverStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [riverMsg, setRiverMsg] = useState('')

  const sendToRiver = async () => {
    if (!output) return
    setRiverStatus('sending')
    try {
      const wf = WORKFLOWS.find(w => w.id === output.id)
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input: `WORKFLOW OUTPUT (${wf?.title ?? output.id}):\n\n${output.text}`, source: 'workflows' }),
      })
      const d = await res.json()
      setRiverMsg(d.complete && d.account ? `✓ Filed under ${d.account.emoji} ${d.account.handle}`
        : d.account ? `Sorted to ${d.account.handle} — needs answers (see its card in Accounts)` : d.error ? 'River error' : 'Filed to pipeline')
      setRiverStatus('done')
    } catch {
      setRiverMsg('Connection failed')
      setRiverStatus('done')
    }
  }

  const run = async (workflow: Workflow) => {
    setRunning(workflow.id)
    setOutput(null)
    setRiverStatus('idle')
    setRiverMsg('')
    try {
      const res = await fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'chat', role: workflow.agent, message: workflow.prompt }),
      })
      const data = await res.json()
      setOutput({ id: workflow.id, text: data.result ?? data.error ?? '' })
    } finally {
      setRunning(null)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div>
        <h2 style={{ fontSize: '22px', fontWeight: 900, color: 'var(--text)', letterSpacing: '-0.03em' }}>Workflows</h2>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>Reusable prompts for your most important workflows. Click to activate.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
        {WORKFLOWS.map(wf => (
          <div key={wf.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: `3px solid ${wf.color}`, borderRadius: '14px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                <span style={{ fontSize: '20px' }}>{wf.emoji}</span>
                <span style={{ fontSize: '13px', fontWeight: 800, color: 'var(--text)' }}>{wf.title}</span>
              </div>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>{wf.description}</p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: 'auto' }}>
              <button onClick={() => run(wf)} disabled={running === wf.id}
                style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', padding: '8px', borderRadius: '9px', border: 'none', background: running === wf.id ? 'var(--border)' : wf.color, color: '#fff', fontWeight: 700, fontSize: '12px', cursor: running === wf.id ? 'not-allowed' : 'pointer', transition: 'opacity 0.15s' }}>
                {running === wf.id ? <><Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> Running...</> : <><Zap size={12} /> Activate</>}
              </button>
              <CopyBtn text={wf.prompt} />
            </div>
          </div>
        ))}
      </div>

      {output && (
        <div style={{ background: 'linear-gradient(135deg, var(--navy) 0%, var(--navy-mid) 100%)', borderRadius: '16px', padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--hot-pink)' }}>
              {WORKFLOWS.find(w => w.id === output.id)?.emoji} {WORKFLOWS.find(w => w.id === output.id)?.title}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button onClick={sendToRiver} disabled={riverStatus !== 'idle'}
                style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '5px 12px', borderRadius: '8px', border: 'none', background: riverStatus === 'done' ? '#3daa7c' : 'var(--hot-pink)', color: '#fff', fontWeight: 700, fontSize: '11px', cursor: riverStatus === 'idle' ? 'pointer' : 'default' }}>
                {riverStatus === 'sending' ? <><Loader2 size={11} style={{ animation: 'spin 1s linear infinite' }} /> Sorting…</> : riverStatus === 'done' ? <><CheckCheck size={11} /> Filed</> : '🌊 Send to River'}
              </button>
              <CopyBtn text={output.text} />
            </div>
          </div>
          {riverMsg && <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.6)', marginBottom: '8px' }}>{riverMsg}</p>}
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{output.text}</p>
        </div>
      )}

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
