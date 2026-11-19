'use client'
import { useState, useRef, useCallback } from 'react'
import { Upload, Film, Image, Mic, FileText, CheckCheck, X } from 'lucide-react'
import { uploadBig, formatBytes, type UploadProgress } from '@/lib/uploadBig'
import UploadBar from './UploadBar'

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
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [current, setCurrent] = useState('')
  const [uploaded, setUploaded] = useState<UploadedFile | null>(null)
  const [error, setError] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const upload = useCallback(async (file: File) => {
    setError(''); setUploading(true); setProgress(null); setUploaded(null); setCurrent(file.name)
    // The one upload path (lib/uploadBig): relay for small files, resumable chunks for big
    // ones, automatic part retries, and no bucket CORS needed at any size.
    try {
      const { publicUrl } = await uploadBig(file, folder, p => setProgress(p))
      const key = publicUrl.split('/').slice(-2).join('/')
      const result: UploadedFile = { name: file.name, publicUrl, key, type: fileCategory(file.type), size: file.size }
      setUploaded(result)
      onUploaded?.(result)
    } catch (e) {
      setError(`Upload incomplete: ${e instanceof Error ? e.message : 'it stopped'}. Nothing was saved. Drop the file again to retry.`)
    } finally {
      setUploading(false)
    }
  }, [folder, onUploaded])

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) { upload(file); return }
    // Empty drop = almost always a drag straight from the Apple Photos app, which
    // hands the browser a "file promise" instead of a real file. Tell her what to do.
    setError('That looks like it came straight from the Photos app — Apple won’t release the file to a browser on a drag. Drag it to your Desktop first, then drop it here (or click to browse).')
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
          <div onClick={e => e.stopPropagation()} style={{ textAlign: 'left' }}><UploadBar name={current} progress={progress} /></div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <Upload size={compact ? 18 : 24} color={dragging ? 'var(--hot-pink)' : 'var(--text-muted)'} />
            <p style={{ fontSize: compact ? '12px' : '13px', color: dragging ? 'var(--hot-pink)' : 'var(--text-muted)', fontWeight: 500 }}>{label}</p>
            {!compact && <p style={{ fontSize: '11px', color: 'var(--text-muted)', opacity: 0.6 }}>Video, audio, image, any size</p>}
          </div>
        )}
      </div>

      {error && <p style={{ fontSize: '12px', color: '#e05', marginTop: '6px' }}>⚠ {error}</p>}

      <input ref={inputRef} type="file" accept={accept} onChange={onFileChange} style={{ display: 'none' }} />

    </div>
  )
}
