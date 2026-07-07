'use client'
import { useState } from 'react'
import { BookOpen, Sparkles, Loader2, Copy, CheckCheck, ChevronDown, ChevronUp } from 'lucide-react'

type StoryResult = {
  summary: string
  core_bullets: string[]
  clarifying_reflection: string
  why_meaningful_to_mandi: string
  why_meaningful_to_others: string
  funny_angle: string
  final_summary: string
  standup_bit: string
  medium_article: { title: string; subtitle: string; body: string }
  instagram_caption_1: string
  instagram_caption_2: string
  tiktok_hook: string
  carousel_slides: string[]
  substack_subject: string
  threads_post: string
  reflection_questions: string[]
  account_tags: string[]
}

function CopyBtn({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }}
      style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '4px 10px', borderRadius: '6px', border: '1px solid var(--border)', background: 'var(--bg)', cursor: 'pointer', fontSize: '11px', color: copied ? '#3daa7c' : 'var(--text-muted)', fontFamily: 'inherit', flexShrink: 0 }}>
      {copied ? <CheckCheck size={11} /> : <Copy size={11} />} {copied ? 'Copied!' : 'Copy'}
    </button>
  )
}

function Section({ label, children, copyText }: { label: string; children: React.ReactNode; copyText?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: '10px', overflow: 'hidden' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 14px', cursor: 'pointer', background: 'var(--bg)' }} onClick={() => setOpen(v => !v)}>
        <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>{label}</span>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          {copyText && open && <CopyBtn text={copyText} />}
          {open ? <ChevronUp size={13} color="var(--text-muted)" /> : <ChevronDown size={13} color="var(--text-muted)" />}
        </div>
      </div>
      {open && <div style={{ padding: '14px', borderTop: '1px solid var(--border)', background: 'var(--surface)', fontSize: '13px', color: 'var(--text)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{children}</div>}
    </div>
  )
}

const PRESET_STORIES = [
  { title: 'HER Joy', text: 'HER Joy was a meaningful exhibit at the balloon museum because my middle name is joy, my 4 living babies were there with me in awe of the disco ball balloon. What I believe it represented was how her joy can be inflated and deflated. The ball so slowly would expand to the top and then slowly deflate all the way down to the bottom all the while the audio repeats, "Her Joy" over and over and over. I spent a decade in sorrow after the loss of my first baby. Inflated joy looks like my children following behind me like little ducklings. Not everyone shines to be seen—some shine to help others find their way. Joy is your birthright.' },
  { title: 'Electric Beck', text: 'Electric Forest - magical moments. Connecting to the version of me that I\'ve aimed to become for 10 years of coaching, therapy, and alternative medicine retreats often pregnant and sober. Practicing inviting my induced state into sobriety. EF was definitely an induced state that embodied my commitment to "the bit", acting out the thoughts in my head via theatrical voices, movements. I\'ve become the woman I\'ve been working toward — and she\'s fun. I\'m not just healing anymore; I\'m living inside the healed version of me.' },
  { title: 'Wayne: You Did It', text: 'Talking to Averie about what I need to say to my inner child after an adult friend "breaks up" with me. After a long conversation, this was my last point to make. When I was done, Wayne said, "Yay, you did it!" I echoed him and he came back with, "Don\'t cheer for me mom. You did it! You are the one." I told him, "I love you." I worried I would be too open for my children. He gave me a big smile. He saw me. He didn\'t just console me—he witnessed me in a way my old friend couldn\'t. My biggest fear — being "too much" — was met not with rejection but reverence.' },
  { title: 'Flow First', text: 'The only thing for me to do in my freetime is write. I daydream about making art, riding horses, or making viral videos — but in the in between moments, the down time when kids are sleeping, the weekends when I have an hour or 2, my only job is to write. Flow First matters because I\'m often paralyzed by "I should be doing x,y,z" — too many things at once and nothing gets done. Currently I want to write a book, go viral online, sell my art, be a full time mom. This PP process is how we separate free writing from content writing. I can free write in one place, process it, then translate to content.' },
]

export default function StoryProcessor() {
  const [freeWrite, setFreeWrite] = useState('')
  const [title, setTitle] = useState('')
  const [processing, setProcessing] = useState(false)
  const [result, setResult] = useState<StoryResult | null>(null)
  const [riverStatus, setRiverStatus] = useState<'idle' | 'sending' | 'done'>('idle')
  const [riverMsg, setRiverMsg] = useState('')

  const sendToRiver = async () => {
    if (!result) return
    setRiverStatus('sending')
    try {
      const input = `STORY: ${title || 'Untitled'}\n\nFREE WRITE:\n${freeWrite}\n\nPROCESSED TRUTH: ${result.final_summary}\n\nBEST CAPTION DRAFT:\n${result.instagram_caption_2 || result.instagram_caption_1}\n\nTIKTOK HOOK: ${result.tiktok_hook}`
      const res = await fetch('/api/river', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input, source: 'story' }),
      })
      const d = await res.json()
      if (d.complete && d.account) {
        setRiverMsg(`✓ Complete post filed under ${d.account.emoji} ${d.account.handle} — flip its card in Accounts to approve.`)
      } else if (d.account) {
        setRiverMsg(`Filed under ${d.account.handle} — it needs: ${(d.open_questions ?? []).join(' · ') || (d.needs ?? []).join(', ')}`)
      } else {
        setRiverMsg(d.error ? `River error: ${d.error}` : 'Filed to the pipeline.')
      }
      setRiverStatus('done')
    } catch {
      setRiverMsg('River connection failed — story is still processed above.')
      setRiverStatus('done')
    }
  }

  const process = async () => {
    if (!freeWrite.trim()) return
    setProcessing(true)
    setResult(null)
    // Save the raw free write to Notes — your exact words, stored (storage, not the river)
    fetch('/api/notes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: `✍️ ${(title || freeWrite).slice(0, 50)}`, body: freeWrite, category: 'idea', tags: ['story', 'free-write'] }),
    }).catch(() => {})
    try {
      const res = await fetch('/api/story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ freeWrite, title }),
      })
      setResult(await res.json())
    } catch {
      // ignore
    } finally {
      setProcessing(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderTop: '3px solid var(--hot-pink)', borderRadius: '16px', padding: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
          <BookOpen size={15} color="var(--hot-pink)" />
          <span style={{ fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text-muted)' }}>Story Processor</span>
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px', lineHeight: 1.5 }}>
          Paste a free write or personal story → get summary, captions, carousel, stand-up bit, Medium article, TikTok hook, Substack subject, and more. The pipeline you built in the spreadsheet, now automated.
        </p>

        {/* Preset stories from the spreadsheet */}
        <div style={{ marginBottom: '12px' }}>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '6px' }}>Load one of your existing stories:</p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {PRESET_STORIES.map(s => (
              <button key={s.title} onClick={() => { setTitle(s.title); setFreeWrite(s.text) }}
                style={{ padding: '5px 10px', borderRadius: '20px', border: '2px solid var(--border)', background: 'var(--bg)', fontSize: '11px', fontWeight: 600, cursor: 'pointer', color: 'var(--text-muted)', fontFamily: 'inherit' }}>
                {s.title}
              </button>
            ))}
          </div>
        </div>

        <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Story title (optional)"
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const, marginBottom: '10px' }} />

        <textarea value={freeWrite} onChange={e => setFreeWrite(e.target.value)} rows={6}
          placeholder="Paste your free write, journal entry, or personal story here..."
          style={{ padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border)', fontSize: '13px', fontFamily: 'inherit', background: 'var(--bg)', color: 'var(--text)', outline: 'none', width: '100%', boxSizing: 'border-box' as const, resize: 'vertical', marginBottom: '12px' }} />

        <button onClick={process} disabled={processing || !freeWrite.trim()}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 20px', borderRadius: '10px', border: 'none', cursor: (!freeWrite.trim() || processing) ? 'not-allowed' : 'pointer', fontWeight: 800, fontSize: '13px', background: (!freeWrite.trim() || processing) ? 'var(--border)' : 'var(--hot-pink)', color: '#fff', fontFamily: 'inherit' }}>
          {processing ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing your story...</> : <><Sparkles size={14} /> Process This Story</>}
        </button>
      </div>

      {result && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {/* Send to river */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '4px solid var(--purple)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
            <div>
              <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--purple)' }}>🌊 Send through the River</p>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>{riverMsg || 'Sorts this story to the best account and composes the final post-card, ready for your approval.'}</p>
            </div>
            <button onClick={sendToRiver} disabled={riverStatus === 'sending'}
              style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '9px 16px', borderRadius: '10px', border: 'none', background: riverStatus === 'done' ? '#3daa7c' : 'var(--purple)', color: '#fff', fontWeight: 700, fontSize: '12px', cursor: 'pointer', flexShrink: 0 }}>
              {riverStatus === 'sending' ? <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Sorting…</> : riverStatus === 'done' ? <><CheckCheck size={13} /> Filed</> : <><Sparkles size={13} /> Compose & File</>}
            </button>
          </div>
          {/* Summary + bullets always visible */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Summary</p>
            <p style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, marginBottom: '12px' }}>{result.summary}</p>
            <p style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', color: 'var(--text-muted)', marginBottom: '8px' }}>Core Insights</p>
            {result.core_bullets?.map((b, i) => <div key={i} style={{ display: 'flex', gap: '8px', marginBottom: '4px' }}><span style={{ color: 'var(--hot-pink)', fontWeight: 800 }}>·</span><span style={{ fontSize: '12px', color: 'var(--text)' }}>{b}</span></div>)}
            <div style={{ marginTop: '12px', padding: '10px 12px', background: 'rgba(107,45,110,0.07)', borderRadius: '8px', borderLeft: '3px solid var(--purple)' }}>
              <p style={{ fontSize: '12px', fontWeight: 800, color: 'var(--purple)', marginBottom: '4px' }}>The Truth</p>
              <p style={{ fontSize: '13px', color: 'var(--text)', fontStyle: 'italic' }}>"{result.final_summary}"</p>
            </div>
            {result.account_tags?.length > 0 && (
              <div style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {result.account_tags.map((t, i) => <span key={i} style={{ fontSize: '10px', fontWeight: 700, padding: '3px 8px', borderRadius: '20px', background: 'var(--bg)', border: '1px solid var(--border)', color: 'var(--text-muted)' }}>@{t}</span>)}
              </div>
            )}
          </div>

          <Section label="📸 Instagram Caption 1 (short)" copyText={result.instagram_caption_1}>{result.instagram_caption_1}</Section>
          <Section label="📸 Instagram Caption 2 (story format)" copyText={result.instagram_caption_2}>{result.instagram_caption_2}</Section>
          <Section label="🎵 TikTok Hook" copyText={result.tiktok_hook}><strong style={{ color: 'var(--hot-pink)', fontSize: '16px' }}>"{result.tiktok_hook}"</strong></Section>
          <Section label="🧵 Threads Post" copyText={result.threads_post}>{result.threads_post}</Section>
          <Section label="📬 Substack Subject Line" copyText={result.substack_subject}><strong>{result.substack_subject}</strong></Section>
          <Section label="🎠 Carousel Slides" copyText={result.carousel_slides?.join('\n\n')}>
            {result.carousel_slides?.map((s, i) => <div key={i} style={{ padding: '8px 12px', background: 'var(--bg)', borderRadius: '6px', marginBottom: '6px', border: '1px solid var(--border)' }}><span style={{ fontSize: '10px', fontWeight: 800, color: 'var(--text-muted)' }}>Slide {i+1}</span><br />{s}</div>)}
          </Section>
          <Section label="🎤 Stand-Up Bit" copyText={result.standup_bit}>{result.standup_bit}</Section>
          <Section label="✍️ Medium Article" copyText={`${result.medium_article?.title}\n\n${result.medium_article?.subtitle}\n\n${result.medium_article?.body}`}>
            <p style={{ fontWeight: 800, fontSize: '16px', marginBottom: '4px' }}>{result.medium_article?.title}</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '14px', fontStyle: 'italic' }}>{result.medium_article?.subtitle}</p>
            <div style={{ whiteSpace: 'pre-wrap', fontSize: '13px', lineHeight: 1.7 }}>{result.medium_article?.body}</div>
          </Section>
          <Section label="💭 Reflection Questions">{result.reflection_questions?.map((q, i) => <div key={i} style={{ marginBottom: '8px', color: 'var(--text)' }}>{i+1}. {q}</div>)}</Section>
          <Section label="😂 Where It's Funny" copyText={result.funny_angle}>{result.funny_angle}</Section>
          <Section label="🧠 Why It Matters to Others" copyText={result.why_meaningful_to_others}>{result.why_meaningful_to_others}</Section>
        </div>
      )}
      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
