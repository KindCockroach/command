'use client'
import { useState, useCallback } from 'react'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable'
import { ContentPiece } from '@/lib/db'
import ContentCard from './ContentCard'
import EditModal from './EditModal'
import AddModal from './AddModal'
import { Plus, Lightbulb, Loader2, CheckCircle2 } from 'lucide-react'

const LANES = [
  { status: 'idea',        label: 'Ideas',              color: '#F2A65A', bg: '#FEF5EA', icon: <Lightbulb size={13} />,    dot: '🌱' },
  { status: 'in_progress', label: 'In Progress',        color: '#5A4FCF', bg: '#EDEAFC', icon: <Loader2 size={13} />,      dot: '⚡' },
  { status: 'ready',       label: 'Ready to Publish',   color: '#3DAA7C', bg: '#E8F7F1', icon: <CheckCircle2 size={13} />, dot: '✨' },
] as const

interface Props { initialContent: ContentPiece[] }

export default function KanbanBoard({ initialContent }: Props) {
  const [content, setContent] = useState(initialContent)
  const [editing, setEditing] = useState<ContentPiece | null>(null)
  const [addingStatus, setAddingStatus] = useState<string | null>(null)
  const [activeId, setActiveId] = useState<number | null>(null)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))
  const byStatus = (s: string) => content.filter(c => c.status === s)

  const handleDragEnd = useCallback(async (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over || active.id === over.id) return
    const activePiece = content.find(c => c.id === active.id)
    if (!activePiece) return
    const laneStatuses = LANES.map(l => l.status) as string[]
    const targetLane = laneStatuses.find(s => s === over.id)
    if (targetLane && targetLane !== activePiece.status) {
      setContent(prev => prev.map(c => c.id === activePiece.id ? { ...c, status: targetLane as ContentPiece['status'] } : c))
      await fetch('/api/content', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: activePiece.id, status: targetLane }) })
    } else {
      const overPiece = content.find(c => c.id === over.id)
      if (!overPiece || overPiece.status !== activePiece.status) return
      const lane = content.filter(c => c.status === activePiece.status)
      const reordered = arrayMove(lane, lane.findIndex(c => c.id === activePiece.id), lane.findIndex(c => c.id === overPiece.id))
      setContent(prev => [...prev.filter(c => c.status !== activePiece.status), ...reordered])
    }
  }, [content])

  const handleSave = (updated: ContentPiece) => {
    setContent(prev => prev.map(c => c.id === updated.id ? updated : c))
    setEditing(null)
  }
  const handleDelete = (id: number) => { setContent(prev => prev.filter(c => c.id !== id)); setEditing(null) }
  const handleAdd = (piece: ContentPiece) => { setContent(prev => [piece, ...prev]); setAddingStatus(null) }

  const activePiece = activeId ? content.find(c => c.id === activeId) : null

  return (
    <>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={e => setActiveId(e.active.id as number)} onDragEnd={handleDragEnd}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {LANES.map(lane => {
            const items = byStatus(lane.status)
            return (
              <div key={lane.status} className="flex flex-col rounded-xl border overflow-hidden" style={{ minHeight: 380, background: 'var(--surface-raised)', borderColor: 'var(--border)' }}>
                {/* Lane header */}
                <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
                  <div className="flex items-center gap-2">
                    <span style={{ color: lane.color }}>{lane.icon}</span>
                    <span className="text-[12px] font-bold" style={{ color: 'var(--cosmic-midnight)' }}>{lane.label}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: lane.bg, color: lane.color }}>
                      {items.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setAddingStatus(lane.status)}
                    className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg font-medium transition-all"
                    style={{ color: 'var(--text-muted)' }}
                    onMouseEnter={e => { (e.currentTarget).style.background = 'var(--nebula-light)'; (e.currentTarget).style.color = 'var(--electric-nebula)' }}
                    onMouseLeave={e => { (e.currentTarget).style.background = 'transparent'; (e.currentTarget).style.color = 'var(--text-muted)' }}
                  >
                    <Plus size={12} /> Add
                  </button>
                </div>

                {/* Cards */}
                <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                  <div className="flex-1 p-3 space-y-2.5 overflow-y-auto">
                    {items.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed text-center" style={{ borderColor: 'var(--border)' }}>
                        <span className="text-lg mb-1">{lane.dot}</span>
                        <p className="text-[11px]" style={{ color: 'var(--text-subtle)' }}>Drop content here</p>
                      </div>
                    )}
                    {items.map(piece => <ContentCard key={piece.id} piece={piece} onEdit={setEditing} />)}
                  </div>
                </SortableContext>
              </div>
            )
          })}
        </div>
        <DragOverlay>
          {activePiece && <ContentCard piece={activePiece} onEdit={() => {}} />}
        </DragOverlay>
      </DndContext>

      {editing && <EditModal piece={editing} onClose={() => setEditing(null)} onSave={handleSave} onDelete={handleDelete} />}
      {addingStatus && <AddModal defaultStatus={addingStatus} onClose={() => setAddingStatus(null)} onAdd={handleAdd} />}
    </>
  )
}
