'use client'
import { useState, useEffect } from 'react'
import { ContentPiece } from '@/lib/db'
import { X, Trash2, CheckCircle, Send, Sparkles, Loader2, Copy, Volume2, Film, Eye, Heart, MessageCircle, Bookmark, Share2, MoreHorizontal } from 'lucide-react'
import FileUpload from '../FileUpload'

function parseMeta(notes: string) {
  const get = (key: string) => { const m = notes.match(new RegExp(`${key}:\\s*([^|]+)`)); return m ? m[1].trim() : '' }
  return {
    type: get('Type'),
    hashtags: get('Hashtags'),
    angle: get('Angle'),
    altText: get('Alt text'),
    bRoll: get('B-roll'),
    subject: get('Subject'),
    preview: get('Preview'),
    cta: get('CTA button'),
    board: get('Pinterest board'),
    ps: get('P\\.S\\.'),
    sound: get('Sound vibe'),
    account: get('Account'),
  }
}

function PlatformPreview({ form, onCopy }: { form: Partial<ContentPiece>; onCopy: (text: string) => void }) {
  const [copied, setCopied] = useState('')
  const platforms = (form.platforms ?? []) as string[]
  const meta = parseMeta(form.notes ?? '')
  const platform = meta.type?.replace('_post','').replace('_reel','') || platforms[0] || 'instagram'
  const body = form.description ?? ''
  const title = form.title ?? ''

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    setCopied(label)
    setTimeout(() => setCopied(''), 2000)
    onCopy(text)
  }

  const CopyBtn = ({ text, label }: { text: string; label: string }) => (
    <button onClick={() => copy(text, label)} style={{ fontSize: '10px', padding: '4px 10px', borderRadius: '6px', border: 'none', background: copied === label ? '#3daa7c' : 'rgba(255,255,255,0.15)', color: '#fff', cursor: 'pointer', fontWeight: 700, backdropFilter: 'blur(4px)', transition: 'background 0.2s' }}>
      {copied === label ? '✓ Copied' : `Copy ${label}`}
    </button>
  )

  // ── Instagram / Threads ──────────────────────────────────────────────
  // ── Threads ──────────────────────────────────────────────────────────
  if (platform === 'threads') {
    const posts = body.split(/\n{2,}/).filter(Boolean)
    return (
      <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e5e5', maxWidth: '540px', margin: '0 auto', width: '100%' }}>
        {/* Threads header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderBottom: '1px solid #efefef' }}>
          <svg viewBox="0 0 192 192" width="24" height="24" fill="none"><path d="M141.537 88.988a66.667 66.667 0 0 0-2.518-1.143c-1.482-27.307-16.403-42.94-41.457-43.1h-.34c-14.986 0-27.449 6.396-35.12 18.036l13.779 9.452c5.73-8.695 14.724-10.548 21.348-10.548h.229c8.249.053 14.474 2.452 18.503 7.129 2.932 3.405 4.893 8.11 5.864 14.05-7.314-1.243-15.224-1.626-23.68-1.141-23.82 1.371-39.134 15.264-38.105 34.568.522 9.792 5.4 18.216 13.735 23.719 7.047 4.652 16.124 6.927 25.557 6.412 12.458-.683 22.231-5.436 29.049-14.127 5.178-6.6 8.453-15.153 9.899-25.93 5.937 3.583 10.337 8.298 12.767 13.966 4.132 9.635 4.373 25.468-8.546 38.376-11.319 11.308-24.925 16.2-45.488 16.351-22.809-.169-40.06-7.484-51.275-21.742C35.236 139.966 29.808 120.682 29.605 96c.203-24.682 5.63-43.966 16.133-57.317C56.954 24.425 74.204 17.11 97.013 16.94c22.975.17 40.526 7.52 52.171 21.847 5.71 7.026 10.015 15.86 12.853 26.162l16.147-4.308c-3.44-12.68-8.853-23.606-16.219-32.668C147.036 10.208 125.202.195 97.07 0h-.113C68.882.195 47.292 10.24 32.777 29.813 19.966 47.42 13.306 72.08 13.044 96v.08c.262 23.92 6.922 48.574 19.733 66.187 14.515 19.57 36.105 29.613 64.268 29.813h.113c25.303-.178 43.818-6.832 58.755-21.75 19.681-19.663 19.07-44.324 12.605-59.467-4.724-11.02-13.738-19.948-26.981-26.875Zm-47.24 42.97c-10.463.589-21.327-4.099-21.904-14.092-.424-7.924 5.647-16.754 24.009-17.803 2.1-.121 4.166-.18 6.199-.18 6.0 0 11.582.552 16.63 1.597-1.893 23.56-14.584 29.903-24.934 30.478Z" fill="#000"/></svg>
          <MoreHorizontal size={20} color="#000" />
        </div>

        {/* Post(s) */}
        {posts.map((post, i) => (
          <div key={i} style={{ padding: '16px', borderBottom: i < posts.length - 1 ? '1px solid #efefef' : 'none', position: 'relative' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <div style={{ flexShrink: 0 }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #e8448a, #6b2d6e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>M</span>
                </div>
                {i < posts.length - 1 && (
                  <div style={{ width: '2px', background: '#e5e5e5', margin: '6px auto 0', height: '100%', minHeight: '24px' }} />
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 700, color: '#000' }}>aimomeducation</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: '#999' }}>now</span>
                    <CopyBtn text={post} label={posts.length > 1 ? `post ${i + 1}` : 'post'} />
                  </div>
                </div>
                <p style={{ fontSize: '15px', color: '#000', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{post}</p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '12px' }}>
                  <Heart size={18} color="#999" />
                  <MessageCircle size={18} color="#999" />
                  <Share2 size={18} color="#999" />
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Footer */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #efefef', display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <CopyBtn text={body} label="full thread" />
          {meta.angle && <span style={{ fontSize: '10px', color: '#999', alignSelf: 'center' }}>Angle: {meta.angle}</span>}
        </div>
      </div>
    )
  }

  if (platform === 'instagram' || meta.type === 'instagram_post') {
    const isReel = meta.type === 'instagram_reel'
    const hook = meta.type === 'instagram_reel' ? body.match(/Hook:\s*([^\n]+)/)?.[1] ?? '' : ''
    const script = meta.type === 'instagram_reel' ? body.match(/Script:\s*([\s\S]+?)(?:Caption:|$)/)?.[1]?.trim() ?? '' : ''
    const caption = meta.type === 'instagram_reel' ? (body.match(/Caption:\s*([\s\S]+)/)?.[1]?.trim() ?? body) : body
    const tags = meta.hashtags ? meta.hashtags.split(/\s+/).filter(t => t.startsWith('#')) : []

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {isReel && hook && (
          <div style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#f2a65a' }}>Hook (first 3 sec)</span>
              <CopyBtn text={hook} label="hook" />
            </div>
            <p style={{ fontSize: '20px', fontWeight: 800, color: '#fff', lineHeight: 1.3 }}>{hook}</p>
          </div>
        )}
        {isReel && script && (
          <div style={{ background: '#0f0f23', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#e8448a' }}>Script</span>
              <CopyBtn text={script} label="script" />
            </div>
            <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{script}</p>
          </div>
        )}
        {/* Instagram card */}
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #dbdbdb', maxWidth: '468px', margin: '0 auto', width: '100%' }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: 900, color: '#fff' }}>M</span>
              </div>
              <div>
                <p style={{ fontSize: '13px', fontWeight: 700, color: '#000', lineHeight: 1 }}>aimomeducation</p>
                {meta.account && <p style={{ fontSize: '10px', color: '#8e8e8e', lineHeight: 1, marginTop: '2px' }}>{meta.account}</p>}
              </div>
            </div>
            <MoreHorizontal size={20} color="#000" />
          </div>
          {/* Image placeholder */}
          <div style={{ background: 'linear-gradient(135deg, #e8448a15, #6b2d6e15)', aspectRatio: '1', display: 'flex', alignItems: 'center', justifyContent: 'center', borderTop: '1px solid #efefef', borderBottom: '1px solid #efefef' }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '28px', marginBottom: '8px' }}>🖼</p>
              {meta.altText && <p style={{ fontSize: '11px', color: '#8e8e8e', padding: '0 24px', lineHeight: 1.4 }}>{meta.altText}</p>}
            </div>
          </div>
          {/* Actions */}
          <div style={{ padding: '8px 16px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', gap: '14px' }}>
              <Heart size={24} color="#000" />
              <MessageCircle size={24} color="#000" />
              <Share2 size={24} color="#000" />
            </div>
            <Bookmark size={24} color="#000" />
          </div>
          {/* Caption */}
          <div style={{ padding: '4px 16px 12px' }}>
            <p style={{ fontSize: '14px', color: '#000', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
              <span style={{ fontWeight: 700 }}>aimomeducation </span>{caption}
            </p>
            {tags.length > 0 && (
              <p style={{ fontSize: '13px', color: '#00376b', marginTop: '6px', lineHeight: 1.6 }}>{tags.join(' ')}</p>
            )}
            {meta.angle && <p style={{ fontSize: '10px', color: '#8e8e8e', marginTop: '6px' }}>Angle: {meta.angle}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <CopyBtn text={caption} label="caption" />
          {tags.length > 0 && <CopyBtn text={tags.join(' ')} label="hashtags" />}
          {caption && tags.length > 0 && <CopyBtn text={`${caption}\n\n${tags.join(' ')}`} label="full post" />}
        </div>
      </div>
    )
  }

  // ── TikTok ──────────────────────────────────────────────────────────
  if (platform === 'tiktok') {
    const hook = body.match(/Hook:\s*([^\n]+)/)?.[1] ?? ''
    const script = body.match(/Script:\s*([\s\S]+?)(?:Caption:|$)/)?.[1]?.trim() ?? body
    const caption = body.match(/Caption:\s*([^\n]+)/)?.[1] ?? ''
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {hook && (
          <div style={{ background: 'linear-gradient(135deg, #010101 0%, #1a1a1a 100%)', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.08)', position: 'relative' }}>
            <div style={{ position: 'absolute', top: '12px', right: '12px' }}><CopyBtn text={hook} label="hook" /></div>
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#69C9D0', display: 'block', marginBottom: '10px' }}>Hook</span>
            <p style={{ fontSize: '22px', fontWeight: 900, color: '#fff', lineHeight: 1.3 }}>{hook}</p>
          </div>
        )}
        <div style={{ background: '#161823', borderRadius: '16px', padding: '20px', border: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#EE1D52' }}>Script</span>
            <CopyBtn text={script} label="script" />
          </div>
          <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.9)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{script}</p>
        </div>
        {caption && (
          <div style={{ background: '#0f0f14', borderRadius: '12px', padding: '14px 16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#69C9D0' }}>Caption</span>
              <CopyBtn text={caption} label="caption" />
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.8)', lineHeight: 1.5 }}>{caption}</p>
            {meta.sound && <p style={{ fontSize: '10px', color: '#EE1D52', marginTop: '8px' }}>🎵 Sound vibe: {meta.sound}</p>}
          </div>
        )}
      </div>
    )
  }

  // ── Email ────────────────────────────────────────────────────────────
  if (platform === 'email') {
    const subject = meta.subject || title
    const previewText = meta.preview
    const cta = meta.cta
    return (
      <div style={{ background: '#f4f4f5', borderRadius: '16px', padding: '16px' }}>
        {/* Email client chrome */}
        <div style={{ background: '#fff', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 2px 16px rgba(0,0,0,0.08)' }}>
          <div style={{ background: '#f9f9f9', padding: '12px 16px', borderBottom: '1px solid #e5e5e5' }}>
            <div style={{ display: 'flex', gap: '6px', marginBottom: '10px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ff5f57' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#febc2e' }} />
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#28c840' }} />
            </div>
            <p style={{ fontSize: '11px', color: '#8e8e8e', marginBottom: '2px' }}>From: Mandi Beck &lt;hi@aimomeducation.com&gt;</p>
            {previewText && <p style={{ fontSize: '10px', color: '#b0b0b0', fontStyle: 'italic' }}>{previewText}</p>}
          </div>
          <div style={{ padding: '20px 24px' }}>
            {subject && (
              <div style={{ marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid #efefef' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <h2 style={{ fontSize: '20px', fontWeight: 800, color: '#1a1a1a', lineHeight: 1.3, flex: 1, marginRight: '12px' }}>{subject}</h2>
                  <CopyBtn text={subject} label="subject" />
                </div>
              </div>
            )}
            <div style={{ fontSize: '15px', color: '#333', lineHeight: 1.8, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{body}</div>
            {cta && (
              <div style={{ marginTop: '24px', textAlign: 'center' }}>
                <span style={{ display: 'inline-block', background: '#e8448a', color: '#fff', padding: '12px 28px', borderRadius: '8px', fontSize: '14px', fontWeight: 700 }}>{cta}</span>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          {subject && <CopyBtn text={subject} label="subject line" />}
          <CopyBtn text={body} label="body" />
          {subject && <CopyBtn text={`Subject: ${subject}\n\n${body}`} label="full email" />}
        </div>
      </div>
    )
  }

  // ── YouTube ──────────────────────────────────────────────────────────
  if (platform === 'youtube') {
    const headline = body.match(/Headline:\s*([^\n]+)/)?.[1] ?? title
    const desc = body.match(/Description:\s*([\s\S]+?)(?:Tags:|Hook:|$)/)?.[1]?.trim() ?? body
    const hook = body.match(/Hook:\s*([\s\S]+)/)?.[1]?.trim() ?? ''
    const thumbnail = body.match(/Thumbnail.*?:\s*([^\n|]+)/)?.[1]?.trim() ?? ''
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
          <div style={{ background: '#1a1a2e', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
            <div style={{ position: 'absolute', bottom: '12px', right: '12px', background: '#000', color: '#fff', fontSize: '11px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>0:00</div>
            {thumbnail ? (
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', padding: '16px', textAlign: 'center', fontStyle: 'italic' }}>🎨 {thumbnail}</p>
            ) : (
              <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ width: 0, height: 0, borderTop: '14px solid transparent', borderBottom: '14px solid transparent', borderLeft: '22px solid rgba(255,255,255,0.8)', marginLeft: '4px' }} />
              </div>
            )}
          </div>
          <div style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#0f0f0f', lineHeight: 1.3, flex: 1 }}>{headline}</h3>
              <CopyBtn text={headline} label="title" />
            </div>
            <p style={{ fontSize: '11px', color: '#606060', marginBottom: '10px' }}>aimomeducation • 1.2K views • Just now</p>
            {desc && (
              <div style={{ fontSize: '13px', color: '#0f0f0f', lineHeight: 1.6, whiteSpace: 'pre-wrap', maxHeight: '120px', overflow: 'hidden', maskImage: 'linear-gradient(to bottom, black 70%, transparent)' }}>{desc}</div>
            )}
          </div>
        </div>
        {hook && (
          <div style={{ background: '#0f0f0f', borderRadius: '12px', padding: '16px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#FF0000' }}>Opening Hook (30 sec)</span>
              <CopyBtn text={hook} label="hook" />
            </div>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.85)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{hook}</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <CopyBtn text={headline} label="title" />
          {desc && <CopyBtn text={desc} label="description" />}
          {meta.hashtags && <CopyBtn text={meta.hashtags} label="tags" />}
        </div>
      </div>
    )
  }

  // ── Substack / Newsletter ────────────────────────────────────────────
  if (platform === 'substack' || platform === 'beehiiv') {
    const subject = meta.subject || title
    const previewText = meta.preview
    const ps = meta.ps
    const color = platform === 'substack' ? '#FF6719' : '#2563eb'
    return (
      <div style={{ background: '#fafaf8', borderRadius: '16px', padding: '16px' }}>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e5e5', overflow: 'hidden' }}>
          <div style={{ background: color, padding: '16px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontWeight: 800, color: '#fff', fontSize: '14px' }}>{platform === 'substack' ? 'Substack' : 'beehiiv'}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.7)' }}>AI Mom Newsletter</span>
          </div>
          <div style={{ padding: '24px 28px' }}>
            {subject && <h2 style={{ fontSize: '24px', fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2, marginBottom: '8px' }}>{subject}</h2>}
            {previewText && <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', marginBottom: '20px', paddingBottom: '20px', borderBottom: '1px solid #efefef' }}>{previewText}</p>}
            <div style={{ fontSize: '16px', color: '#333', lineHeight: 1.9, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>{body}</div>
            {ps && (
              <div style={{ marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #efefef' }}>
                <p style={{ fontSize: '14px', color: '#555', lineHeight: 1.6, fontStyle: 'italic', fontFamily: 'Georgia, serif' }}>P.S. {ps}</p>
              </div>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          {subject && <CopyBtn text={subject} label="subject" />}
          <CopyBtn text={body} label="body" />
          {ps && <CopyBtn text={ps} label="P.S." />}
        </div>
      </div>
    )
  }

  // ── Medium ──────────────────────────────────────────────────────────
  if (platform === 'medium') {
    const subtitle = body.match(/Subtitle:\s*([^\n]+)/i)?.[1] ?? ''
    const articleBody = body.match(/Body:\s*([\s\S]+?)(?:Tags:|$)/i)?.[1]?.trim() ?? body
    const tags = meta.hashtags || (body.match(/Tags:\s*([^\n]+)/i)?.[1] ?? '')
    return (
      <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', border: '1px solid #e5e5e5' }}>
        {/* Medium header bar */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 24px', borderBottom: '1px solid #e5e5e5' }}>
          <svg viewBox="0 0 195 195" width="28" height="28"><circle cx="97.5" cy="97.5" r="97.5" fill="#000"/><path d="M54 68l8-9h71l8 9v3H54v-3zm0 57v3h87v-3l-8-9H62l-8 9zm0-29v3h87v-3H54zm0 14v3h87v-3H54z" fill="#fff"/></svg>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '13px', color: '#6b6b6b' }}>Draft</span>
            <div style={{ background: '#1a8917', color: '#fff', fontSize: '12px', fontWeight: 700, padding: '6px 16px', borderRadius: '20px' }}>Publish</div>
          </div>
        </div>
        {/* Article */}
        <div style={{ padding: '40px 48px', maxWidth: '700px', margin: '0 auto' }}>
          {/* Byline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '28px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: 'linear-gradient(135deg, #e8448a, #6b2d6e)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '15px', fontWeight: 900, color: '#fff' }}>M</span>
            </div>
            <div>
              <p style={{ fontSize: '13px', fontWeight: 600, color: '#1a1a1a' }}>Mandi Beck</p>
              <p style={{ fontSize: '11px', color: '#6b6b6b' }}>Published in AI Mom Education · 6 min read</p>
            </div>
          </div>
          {/* Title */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: subtitle ? '10px' : '24px' }}>
            <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#1a1a1a', lineHeight: 1.2, fontFamily: 'Georgia, serif', flex: 1 }}>{title}</h1>
            <CopyBtn text={title} label="title" />
          </div>
          {subtitle && (
            <p style={{ fontSize: '20px', color: '#6b6b6b', lineHeight: 1.4, fontFamily: 'Georgia, serif', marginBottom: '24px', fontWeight: 400 }}>{subtitle}</p>
          )}
          {/* Divider */}
          <hr style={{ border: 'none', borderTop: '1px solid #e5e5e5', marginBottom: '28px' }} />
          {/* Body */}
          <div style={{ fontSize: '18px', color: '#292929', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: 'Georgia, serif' }}>
            {articleBody}
          </div>
          {/* Tags */}
          {tags && (
            <div style={{ marginTop: '32px', paddingTop: '24px', borderTop: '1px solid #e5e5e5', display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {tags.split(/[,\s]+/).filter(Boolean).map((tag: string) => (
                <span key={tag} style={{ fontSize: '13px', color: '#1a8917', background: '#f0faf0', padding: '4px 12px', borderRadius: '20px', fontWeight: 500 }}>{tag.replace(/^#/, '')}</span>
              ))}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', padding: '16px', borderTop: '1px solid #e5e5e5', flexWrap: 'wrap' }}>
          <CopyBtn text={title} label="title" />
          {subtitle && <CopyBtn text={subtitle} label="subtitle" />}
          <CopyBtn text={articleBody} label="article" />
          {tags && <CopyBtn text={tags} label="tags" />}
          <CopyBtn text={`# ${title}\n\n${subtitle ? `*${subtitle}*\n\n` : ''}${articleBody}`} label="full article" />
        </div>
      </div>
    )
  }

  // ── Pinterest ────────────────────────────────────────────────────────
  if (platform === 'pinterest') {
    const pinTitle = body.match(/Pin title:\s*([^\n]+)/i)?.[1] ?? title
    const desc = body.match(/Description:\s*([^\n|]+)/i)?.[1] ?? body
    const imgConcept = body.match(/Image concept:\s*([^\n]+)/i)?.[1] ?? ''
    return (
      <div style={{ maxWidth: '320px', margin: '0 auto' }}>
        <div style={{ background: '#fff', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.1)' }}>
          <div style={{ background: 'linear-gradient(180deg, #e8448a15 0%, #6b2d6e15 100%)', aspectRatio: '2/3', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
            <p style={{ fontSize: '11px', color: '#8e8e8e', textAlign: 'center', fontStyle: 'italic', lineHeight: 1.5 }}>📌 {imgConcept || 'Image here'}</p>
          </div>
          <div style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: '14px', fontWeight: 800, color: '#111', lineHeight: 1.3, marginBottom: '6px' }}>{pinTitle}</p>
            <p style={{ fontSize: '12px', color: '#555', lineHeight: 1.5 }}>{desc.slice(0, 150)}{desc.length > 150 ? '…' : ''}</p>
            {meta.board && <p style={{ fontSize: '10px', color: '#e60023', marginTop: '8px', fontWeight: 700 }}>📌 {meta.board}</p>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '12px', flexWrap: 'wrap' }}>
          <CopyBtn text={pinTitle} label="title" />
          <CopyBtn text={desc} label="description" />
        </div>
      </div>
    )
  }

  // ── Fallback / generic ───────────────────────────────────────────────
  return (
    <div style={{ background: 'var(--surface-raised)', borderRadius: '16px', padding: '24px', border: '1px solid var(--border)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: 800, color: 'var(--text)', lineHeight: 1.3, flex: 1, marginRight: '12px' }}>{title}</h3>
        <CopyBtn text={body} label="content" />
      </div>
      <p style={{ fontSize: '15px', color: 'var(--ink)', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>{body}</p>
      {meta.hashtags && <p style={{ fontSize: '13px', color: 'var(--hot-pink)', marginTop: '12px', lineHeight: 1.6 }}>{meta.hashtags}</p>}
    </div>
  )
}

const PLATFORMS = ['youtube', 'instagram', 'tiktok', 'facebook', 'linkedin', 'pinterest', 'beehiiv', 'substack', 'email']
const TYPES = ['video', 'podcast', 'post', 'image', 'workshop', 'other'] as const
const STATUSES = [
  { value: 'idea',        label: '🌱 Idea' },
  { value: 'in_progress', label: '⚡ In Progress' },
  { value: 'ready',       label: '✨ Ready to Publish' },
  { value: 'published',   label: '🚀 Published' },
  { value: 'archived',    label: '📦 Archived' },
] as const

interface Props {
  piece: ContentPiece | null
  onClose: () => void
  onSave: (updated: ContentPiece) => void
  onDelete: (id: number) => void
}

export default function EditModal({ piece, onClose, onSave, onDelete }: Props) {
  const [form, setForm] = useState<Partial<ContentPiece>>({})
  const [saving, setSaving] = useState(false)
  const [tagInput, setTagInput] = useState('')
  const [tab, setTab] = useState<'edit' | 'preview' | 'expand' | 'voice' | 'media'>('edit')
  const [expanding, setExpanding] = useState(false)
  const [expanded, setExpanded] = useState('')
  const [synthesizing, setSynthesizing] = useState(false)
  const [audioUrl, setAudioUrl] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { if (piece) { setForm({ ...piece }); setTagInput(''); setExpanded(''); setAudioUrl('') } }, [piece])
  if (!piece) return null

  const set = (k: keyof ContentPiece, v: unknown) => setForm(f => ({ ...f, [k]: v }))
  const togglePlatform = (p: string) => {
    const cur = (form.platforms ?? []) as string[]
    set('platforms', cur.includes(p) ? cur.filter(x => x !== p) : [...cur, p])
  }
  const addTag = () => {
    const t = tagInput.trim().toLowerCase().replace(/^#/, '')
    if (!t) return
    const cur = (form.tags ?? []) as string[]
    if (!cur.includes(t)) set('tags', [...cur, t])
    setTagInput('')
  }
  const handleSave = async () => {
    setSaving(true)
    const res = await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...form, id: piece.id }) })
    onSave(await res.json())
    setSaving(false)
  }
  const handleDelete = async () => {
    if (!confirm('Delete this content piece?')) return
    await fetch(`/api/content?id=${piece.id}`, { method: 'DELETE' })
    onDelete(piece.id)
  }
  const handleExpand = async () => {
    setExpanding(true)
    setExpanded('')
    const res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'expand', title: form.title, description: form.description, notes: form.notes, transcript: form.transcript }),
    })
    const data = await res.json()
    setExpanded(data.result ?? data.error ?? 'Something went wrong.')
    setExpanding(false)
  }
  const handleSynthesize = async () => {
    const text = form.transcript || form.notes || form.description || form.title || ''
    if (!text) return
    setSynthesizing(true)
    const res = await fetch('/api/elevenlabs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'synthesize', text: text.slice(0, 2500) }),
    })
    if (res.ok) {
      const blob = await res.blob()
      setAudioUrl(URL.createObjectURL(blob))
    }
    setSynthesizing(false)
  }
  const copyExpanded = () => {
    navigator.clipboard.writeText(expanded)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const fieldStyle = {
    background: 'var(--surface-raised)',
    borderColor: 'var(--border)',
    color: 'var(--ink)',
    borderRadius: '8px',
    border: '1px solid var(--border)',
    width: '100%',
    padding: '8px 12px',
    fontSize: '13px',
    transition: 'border-color 0.15s',
    outline: 'none',
  }

  const lbl = (t: string) => (
    <label style={{ display: 'block', fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '4px' }}>{t}</label>
  )

  const TAB_STYLE = (active: boolean) => ({
    fontSize: '12px',
    fontWeight: 600,
    padding: '6px 14px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    background: active ? 'var(--hot-pink)' : 'transparent',
    color: active ? '#fff' : 'var(--text-muted)',
    transition: 'all 0.15s',
  })

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
      <div style={{ position: 'absolute', inset: 0, background: 'rgba(28,31,59,0.5)', backdropFilter: 'blur(4px)' }} onClick={onClose} />
      <div style={{ position: 'relative', width: '100%', maxWidth: tab === 'preview' ? '860px' : '720px', maxHeight: '92vh', overflowY: 'auto', borderRadius: '20px', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border)', transition: 'max-width 0.25s ease' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px 14px', borderBottom: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button style={TAB_STYLE(tab === 'edit')} onClick={() => setTab('edit')}>Edit</button>
            <button style={TAB_STYLE(tab === 'preview')} onClick={() => setTab('preview')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Eye size={11} /> Preview</span>
            </button>
            <button style={TAB_STYLE(tab === 'expand')} onClick={() => setTab('expand')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Sparkles size={11} /> 1→30 Expand</span>
            </button>
            <button style={TAB_STYLE(tab === 'voice')} onClick={() => setTab('voice')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Volume2 size={11} /> Voice</span>
            </button>
            <button style={TAB_STYLE(tab === 'media')} onClick={() => setTab('media')}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Film size={11} /> Media</span>
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={handleDelete} style={{ fontSize: '11px', color: '#E05252', padding: '6px 10px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Trash2 size={11} /> Delete
            </button>
            <button onClick={onClose} style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'transparent', cursor: 'pointer', color: 'var(--text-muted)' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ── EDIT TAB ── */}
        {tab === 'edit' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>{lbl('Title')}<input value={form.title ?? ''} onChange={e => set('title', e.target.value)} style={fieldStyle} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
            <div>{lbl('Description')}<textarea value={form.description ?? ''} onChange={e => set('description', e.target.value)} rows={2} style={{ ...fieldStyle, resize: 'none' }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>{lbl('Type')}<select value={form.type ?? 'post'} onChange={e => set('type', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>{TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}</select></div>
              <div>{lbl('Status')}<select value={form.status ?? 'idea'} onChange={e => set('status', e.target.value)} style={{ ...fieldStyle, cursor: 'pointer' }}>{STATUSES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
            </div>
            <div>
              {lbl('Platforms')}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {PLATFORMS.map(p => {
                  const sel = ((form.platforms ?? []) as string[]).includes(p)
                  return <button key={p} onClick={() => togglePlatform(p)} style={{ fontSize: '11px', padding: '4px 12px', borderRadius: '20px', border: `1px solid ${sel ? 'var(--hot-pink)' : 'var(--border)'}`, background: sel ? 'var(--hot-pink)' : 'var(--surface)', color: sel ? '#fff' : 'var(--text-muted)', cursor: 'pointer', fontWeight: 600, transition: 'all 0.15s', textTransform: 'capitalize' }}>{p}</button>
                })}
              </div>
            </div>
            <div>
              {lbl('Tags')}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
                <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && addTag()} placeholder="Add tag + Enter" style={{ ...fieldStyle, flex: 1 }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
                <button onClick={addTag} style={{ fontSize: '11px', padding: '0 14px', borderRadius: '8px', border: 'none', background: 'var(--hot-pink-light)', color: 'var(--hot-pink)', fontWeight: 700, cursor: 'pointer' }}>Add</button>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {((form.tags ?? []) as string[]).map(t => (
                  <span key={t} style={{ fontSize: '10px', padding: '3px 8px', borderRadius: '20px', background: 'var(--idea-bg)', color: 'var(--idea-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                    #{t} <button onClick={() => set('tags', ((form.tags ?? []) as string[]).filter(x => x !== t))} style={{ border: 'none', background: 'transparent', cursor: 'pointer', color: 'inherit', padding: 0, lineHeight: 1 }}><X size={9} /></button>
                  </span>
                ))}
              </div>
            </div>
            <div>{lbl('Notes / Context')}<textarea value={form.notes ?? ''} onChange={e => set('notes', e.target.value)} rows={3} placeholder="Ideas, links, reminders, voice memo summary…" style={{ ...fieldStyle, resize: 'none' }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
            <div>{lbl('Transcript / Script — paste raw content here')}<textarea value={form.transcript ?? ''} onChange={e => set('transcript', e.target.value)} rows={6} placeholder="Raw transcript from Riverside, voice memo, or CapCut export…" style={{ ...fieldStyle, resize: 'vertical', fontFamily: 'monospace', fontSize: '12px' }} onFocus={e => (e.target.style.borderColor = 'var(--hot-pink)')} onBlur={e => (e.target.style.borderColor = 'var(--border)')} /></div>
          </div>
        )}

        {/* ── PREVIEW TAB ── */}
        {tab === 'preview' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '4px' }}>
              <Eye size={14} color="var(--hot-pink)" />
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)' }}>Platform Preview — {((form.platforms ?? []) as string[])[0] ?? 'post'}</span>
            </div>
            <PlatformPreview form={form} onCopy={() => {}} />
          </div>
        )}

        {/* ── EXPAND TAB ── */}
        {tab === 'expand' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--hot-pink-light)', border: '1px solid var(--hot-pink)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--hot-pink-dark)', marginBottom: '6px' }}>🎯 Content Developer GPT — 1 idea → 30 pieces</p>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Paste your transcript or notes in the Edit tab, then hit Expand. Your Content Developer GPT will generate hooks, captions, emails, pins, scripts, and more — in your voice.
              </p>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', fontWeight: 600 }}>Expanding: <span style={{ color: 'var(--ink)' }}>{form.title}</span></p>
              {(form.transcript || form.notes || form.description) && <p style={{ fontSize: '10px', color: 'var(--idea-color)', marginTop: '4px' }}>✓ Content detected — ready to expand</p>}
              {!(form.transcript || form.notes || form.description) && <p style={{ fontSize: '10px', color: '#E05252', marginTop: '4px' }}>⚠ Add notes or a transcript in the Edit tab first for best results</p>}
            </div>
            <button onClick={handleExpand} disabled={expanding} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: expanding ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', opacity: expanding ? 0.7 : 1 }}>
              {expanding ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Expanding with AI…</> : <><Sparkles size={16} /> Expand to 30 Pieces</>}
            </button>
            {expanded && (
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', gap: '6px' }}>
                  <button onClick={copyExpanded} style={{ fontSize: '11px', padding: '5px 10px', borderRadius: '7px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Copy size={11} /> {copied ? 'Copied!' : 'Copy all'}
                  </button>
                </div>
                <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: '12px', lineHeight: 1.7, padding: '16px', borderRadius: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)', color: 'var(--ink)', fontFamily: 'inherit', maxHeight: '420px', overflowY: 'auto' }}>{expanded}</pre>
              </div>
            )}
          </div>
        )}

        {/* ── VOICE TAB ── */}
        {tab === 'voice' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--progress-bg)', border: '1px solid var(--progress-color)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--progress-color)', marginBottom: '6px' }}>🎙 ElevenLabs Voice Synthesis</p>
              <p style={{ fontSize: '12px', color: 'var(--ink-muted)', lineHeight: 1.5 }}>
                Turn your transcript or script into Mandi's voice for podcast intros, voiceovers, or avatar audio. Uses your ElevenLabs voice clone.
              </p>
            </div>
            <div style={{ padding: '12px', borderRadius: '10px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Will synthesize: <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{((form.transcript || form.notes || form.description || form.title || '').slice(0, 120))}…</span></p>
            </div>
            <button onClick={handleSynthesize} disabled={synthesizing} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '14px', borderRadius: '12px', background: 'var(--progress-color)', color: '#fff', border: 'none', cursor: synthesizing ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '14px', opacity: synthesizing ? 0.7 : 1 }}>
              {synthesizing ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Synthesizing…</> : <><Volume2 size={16} /> Generate Audio</>}
            </button>
            {audioUrl && (
              <div style={{ padding: '16px', borderRadius: '12px', background: 'var(--surface-raised)', border: '1px solid var(--border)' }}>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '10px', fontWeight: 600 }}>🎵 Your audio is ready:</p>
                <audio controls src={audioUrl} style={{ width: '100%' }} />
                <a href={audioUrl} download="ai-mom-audio.mp3" style={{ display: 'block', marginTop: '10px', fontSize: '11px', color: 'var(--progress-color)', textDecoration: 'none', fontWeight: 600 }}>⬇ Download MP3</a>
              </div>
            )}
          </div>
        )}

        {/* ── MEDIA TAB ── */}
        {tab === 'media' && (
          <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '12px', background: 'rgba(232,68,138,0.06)', border: '1px solid rgba(232,68,138,0.2)' }}>
              <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--hot-pink)', marginBottom: '4px' }}>☁️ Cloudflare R2 Storage</p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', lineHeight: 1.5 }}>Files upload directly to R2 — bypassing this server entirely. Videos, images, and audio are stored in your Cloudflare account and served via CDN.</p>
            </div>

            {form.file_path && (
              <div style={{ padding: '12px 14px', borderRadius: '10px', background: 'rgba(61,170,124,0.08)', border: '1px solid rgba(61,170,124,0.25)' }}>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#3daa7c', marginBottom: '6px' }}>Current Media File</p>
                {(form.file_path.match(/\.(mp4|mov|webm)$/i)) ? (
                  <video src={form.file_path} controls style={{ width: '100%', borderRadius: '8px', maxHeight: '220px' }} />
                ) : (form.file_path.match(/\.(jpg|jpeg|png|gif|webp)$/i)) ? (
                  <img src={form.file_path} alt="media" style={{ width: '100%', borderRadius: '8px', maxHeight: '220px', objectFit: 'cover' }} />
                ) : (form.file_path.match(/\.(mp3|wav|m4a)$/i)) ? (
                  <audio src={form.file_path} controls style={{ width: '100%' }} />
                ) : (
                  <a href={form.file_path} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#3daa7c' }}>View file ↗</a>
                )}
              </div>
            )}

            {form.thumbnail_url && (
              <div>
                <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '6px' }}>Thumbnail</p>
                <img src={form.thumbnail_url} alt="thumbnail" style={{ width: '100%', maxHeight: '160px', objectFit: 'cover', borderRadius: '10px' }} />
              </div>
            )}

            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>Upload Main File (video / audio / image)</p>
              <FileUpload
                folder="content"
                label="Drop your video, audio, or image here"
                onUploaded={f => { set('file_path', f.publicUrl); set('type', f.type === 'audio' ? 'podcast' : f.type === 'video' ? 'video' : f.type === 'image' ? 'image' : form.type) }}
              />
            </div>

            <div>
              <p style={{ fontSize: '10px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '8px' }}>Upload Thumbnail</p>
              <FileUpload
                folder="thumbnails"
                accept="image/*"
                label="Drop a thumbnail image"
                compact
                onUploaded={f => set('thumbnail_url', f.publicUrl)}
              />
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderTop: '1px solid var(--border)' }}>
          {!['published', 'archived'].includes(form.status ?? '') && (
            <button onClick={async () => { set('status', 'published'); await new Promise(r => setTimeout(r, 50)); handleSave() }} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 14px', borderRadius: '10px', background: 'var(--ready-bg)', color: 'var(--ready-color)', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
              <Send size={12} /> Mark Published
            </button>
          )}
          <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
            <button onClick={onClose} style={{ fontSize: '12px', padding: '8px 16px', borderRadius: '10px', border: 'none', background: 'transparent', color: 'var(--text-muted)', cursor: 'pointer' }}>Cancel</button>
            <button onClick={handleSave} disabled={saving} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', padding: '8px 16px', borderRadius: '10px', background: 'var(--navy)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700, opacity: saving ? 0.6 : 1 }}>
              <CheckCircle size={12} /> {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
