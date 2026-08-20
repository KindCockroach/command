'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, Film, Image, Mic, FileText, CheckCheck, X, Loader2 } from 'lucide-react'

type UploadedFile = {
  name: string
  publicUrl: string
  key: string
  type: 'video' | 'image' | 'audio' | 'other'
  size: number
}

function fileCategory(mime: string): UploadedFile['type'] {
  if (mime.startsWith('video/')) return 'video'
  if (mime.startsWith('image/')) return 'image'
  if (mime.startsWith('audio/')) return 'audio'
  return 'other'
}

const TYPE_ICON = {
  video: <Film size={16} />,
  image: <Image size={16} />,
  audio: <Mic size={16} />,
  other: <FileText size={16} />,
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface Props {
  folder?: string
  onUploaded?: (file: UploadedFile) => void
  accept?: string
  label?: string
  compact?: boolean
}

export default function FileUpload({ folder = 'uploads', onUploaded, accept, label = 'Drop a file or click to browse', compact = false }: Props) {
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(async (file: File) => {
    setError(''); setUploading(true); setProgress(0); setUploaded(null)

    // Send bytes with an upload-progress bar. Used for both the server multipart
    // POST and the direct-to-R2 PUT.
    const send = (method: string, url: string, body: XMLHttpRequestBodyInit, headers?: Record<string, string>) =>
      new Promise<XMLHttpRequest>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open(method, url)
        if (headers) for (const [k, v] of Object.entries(headers)) xhr.setRequestHeader(k, v)
        xhr.upload.onprogress = e => { if (e.lengthComputable) setProgress(Math.round(e.loaded / e.total * 100)) }
        xhr.onload = () => xhr.status < 300 ? resolve(xhr) : reject(new Error(`HTTP ${xhr.status}`))
        xhr.onerror = () => reject(new Error('Network error during upload'))
        xhr.send(body)
      })

    // Server path: multipart to our API, which relays to R2. No browser CORS
    // involved — works even when the R2 bucket has no CORS rule. (Don't set
    // Content-Type; the browser adds the multipart boundary.)
    const viaServer = async () => {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('folder', folder)
      const xhr = await send('POST', '/api/upload', fd)
      return JSON.parse(xhr.responseText) as { publicUrl: string; key: string }
    }

    // Direct path: presigned URL, then browser PUTs straight to R2. Needed for
    // big files (server would buffer + OOM), but requires the bucket to allow
    // cross-origin PUT from this site.
    const viaDirect = async () => {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ filename: file.name, contentType: file.type, folder }),
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Failed to get upload URL')
      const { uploadUrl, publicUrl, key } = await res.json()
      await send('PUT', uploadUrl, file, { 'Content-Type': file.type })
      return { publicUrl, key }
    }

    const SERVER_LIMIT = 60 * 1024 * 1024 // ≤60MB goes through our server (no R2 CORS needed); above that, straight to R2
    try {
      let out: { publicUrl: string; key: string }
      if (file.size <= SERVER_LIMIT) {
        // Small/medium files: server relay avoids R2's browser-CORS requirement.
        // Fall back to the direct path only if the server rejects it.
        try { out = await viaServer() }
        catch { setProgress(0); out = await viaDirect() }
      } else {
        // Big files must stream straight to R2 to avoid OOMing the server.
        try { out = await viaDirect() }
        catch (e) {
          const origin = typeof location !== 'undefined' ? location.origin : 'this site'
          throw new Error(`${e instanceof Error ? e.message : 'Upload failed'} — files over 60MB upload directly to Cloudflare R2, which needs a bucket CORS rule allowing PUT from ${origin}.`)
        }
      }
      const result: UploadedFile = { name: file.name, publicUrl: out.publicUrl, key: out.key, type: fileCategory(file.type), size: file.size }
      setUploaded(result)
      onUploaded?.(result)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }, [folder, onUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) upload(file)
  }, [upload])

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) upload(file)
  }

  if (uploaded) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: compact ? '8px 12px' : '14px 16px', background: 'rgba(61,170,124,0.08)', border: '1px solid rgba(61,170,124,0.3)', borderRadius: '12px' }}>
      <div style={{ color: '#3daa7c' }}>{TYPE_ICON[uploaded.type]}</div>
      <div style={{ flex: 1 }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{uploaded.name}</p>
        <p style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{formatBytes(uploaded.size)} · stored in R2</p>
      </div>
      <CheckCheck size={16} color="#3daa7c" />
      <button onClick={() => setUploaded(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: '2px' }}><X size={14} /></button>
    </div>
  )

  return (
    <div>
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => { e.preventDefault(); setDragging(true) }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        style={{
          border: `2px dashed ${dragging ? 'var(--hot-pink)' : 'var(--border)'}`,
          borderRadius: '14px',
          padding: compact ? '16px' : '32px 20px',
          textAlign: 'center',
          cursor: uploading ? 'not-allowed' : 'pointer',
          background: dragging ? 'rgba(232,68,138,0.04)' : 'var(--surface)',
          transition: 'all 0.15s',
        }}
      >
        {uploading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
            <Loader2 size={24} color="var(--hot-pink)" style={{ animation: 'spin 1s linear infinite' }} />
            <div style={{ width: '100%', maxWidth: '200px', height: '4px', background: 'var(--border)', borderRadius: '2px', overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--hot-pink)', borderRadius: '2px', transition: 'width 0.2s' }} />
            </div>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Uploading to Cloudflare R2... {progress}%</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Upload size={compact ? 18 : 24} color={dragging ? 'var(--hot-pink)' : 'var(--text-muted)'} />
            <p style={{ fontSize: compact ? '12px' : '13px', color: dragging ? 'var(--hot-pink)' : 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
            {!compact && <p style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>Video, audio, image — up to 2GB</p>}
          </div>
        )}
      </div>

      {error && <p style={{ fontSize: '12px', color: '#e05', marginTop: '6px' }}>⚠ {error}</p>}

      <input ref={inputRef} type="file" accept={accept} onChange={onFileChange} style={{ display: 'none' }} />

      <style>{`@keyframes spin { from { transform: rotate(0deg) } to { transform: rotate(360deg) } }`}</style>
    </div>
  )
}
