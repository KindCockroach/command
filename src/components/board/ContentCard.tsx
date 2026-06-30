'use client'
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { ContentPiece } from '@/lib/db'
import { GripVertical, Video, Mic, FileText, Image, Layers, Sparkles, Repeat2 } from 'lucide-react'

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Video size={12} />,
  podcast: <Mic size={12} />,
  post: <FileText size={12} />,
  image: <Image size={12} />,
  workshop: <Layers size={12} />,
  other: <Sparkles size={12} />,
}

const PLATFORM_STYLE: Record<string, { bg: string; color: string }> = {
  youtube:   { bg: '#FF0000', color: '#fff' },
  instagram: { bg: '#E1306C', color: '#fff' },
  tiktok:    { bg: '#171C3A', color: '#fff' },
  facebook:  { bg: '#1877F2', color: '#fff' },
  linkedin:  { bg: '#0A66C2', color: '#fff' },
  pinterest: { bg: '#E60023', color: '#fff' },
  beehiiv:   { bg: '#FF6B35', color: '#fff' },
  email:     { bg: '#5A4FCF', color: '#fff' },
  substack:  { bg: '#FF6719', color: '#fff' },
}

interface Props { piece: ContentPiece; onEdit: (p: ContentPiece) => void }

export default function ContentCard({ piece, onEdit }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: piece.id })

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : 1,
        background: 'var(--surface)',
        borderColor: 'var(--border)',
        boxShadow: 'var(--shadow-sm)',
        padding: '14px',
      }}
      onClick={() => onEdit(piece)}
      className="group relative rounded-xl border cursor-pointer transition-all duration-150"
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--electric-nebula)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.borderColor = 'var(--border)'
        ;(e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'
      }}
    >
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        onClick={e => e.stopPropagation()}
        className="absolute top-3 right-2.5 opacity-0 group-hover:opacity-30 cursor-grab active:cursor-grabbing"
        style={{ color: 'var(--text-muted)' }}
      >
        <GripVertical size={14} />
      </div>

      {/* Type pill */}
      <div className="flex items-center gap-1.5 mb-2.5">
        <span
          className="flex items-center gap-1 text-[10px] uppercase tracking-wide font-bold px-2 py-0.5 rounded-full"
          style={{ background: 'var(--nebula-light)', color: 'var(--electric-nebula)' }}
        >
          {TYPE_ICON[piece.type]} {piece.type}
        </span>
        {piece.transcript && (
          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'var(--aurora-light)', color: 'var(--aurora-pink)' }}>
            📝 transcript
          </span>
        )}
      </div>

      {/* Title */}
      <p className="text-[13px] font-semibold leading-snug pr-5 mb-1.5" style={{ color: 'var(--cosmic-midnight)' }}>
        {piece.title}
      </p>

      {/* Description */}
      {piece.description && (
        <p className="text-[11px] leading-relaxed mb-2.5 line-clamp-2" style={{ color: 'var(--text-muted)' }}>
          {piece.description}
        </p>
      )}

      {/* Platforms */}
      {piece.platforms.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1.5">
          {piece.platforms.map(p => {
            const s = PLATFORM_STYLE[p] ?? { bg: '#9B8FA6', color: '#fff' }
            return (
              <span key={p} className="text-[9px] px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wide" style={{ background: s.bg, color: s.color }}>
                {p}
              </span>
            )
          })}
        </div>
      )}

      {/* Tags */}
      {piece.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {piece.tags.map(t => (
            <span key={t} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{ background: 'var(--ember-light)', color: 'var(--solar-ember)' }}>
              #{t}
            </span>
          ))}
        </div>
      )}

      {/* Footer row */}
      <div className="flex items-center justify-between mt-1">
        <p className="text-[10px]" style={{ color: 'var(--text-subtle)' }}>
          {new Date(piece.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
        <span className="flex items-center gap-0.5 text-[10px] opacity-0 group-hover:opacity-60 transition-opacity" style={{ color: 'var(--aurora-pink)' }}>
          <Repeat2 size={10} /> 1→30
        </span>
      </div>
    </div>
  )
}
