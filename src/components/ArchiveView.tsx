'use client'
import { useState } from 'react'
import { ContentPiece } from '@/lib/db'
import Link from 'next/link'
import { LayoutGrid, Archive, Video, Mic, FileText, Image, Layers, Sparkles, Search } from 'lucide-react'

const TYPE_ICON: Record<string, React.ReactNode> = {
  video: <Video size={13} />,
  podcast: <Mic size={13} />,
  post: <FileText size={13} />,
  image: <Image size={13} />,
  workshop: <Layers size={13} />,
  other: <Sparkles size={13} />,
}

const PLATFORM_COLORS: Record<string, string> = {
  youtube: '#FF0000',
  instagram: '#E1306C',
  tiktok: '#010101',
  facebook: '#1877F2',
  linkedin: '#0A66C2',
  pinterest: '#E60023',
  beehiiv: '#FF6B35',
  email: '#6B7280',
  substack: '#FF6719',
}

interface Props { content: ContentPiece[] }

export default function ArchiveView({ content: initial }: Props) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')

  const filtered = initial.filter(c => {
    const matchSearch = !search || c.title.toLowerCase().includes(search.toLowerCase()) || c.description.toLowerCase().includes(search.toLowerCase())
    const matchFilter = filter === 'all' || c.type === filter || c.status === filter
    return matchSearch && matchFilter
  })

  const types = [...new Set(initial.map(c => c.type))]

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur border-b border-[#E8E5E0]">
        <div className="max-w-7xl mx-auto px-5 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#7C3AED] flex items-center justify-center">
              <LayoutGrid size={14} className="text-white" />
            </div>
            <span className="text-[15px] font-bold text-[#1C1917] tracking-tight">Command Center</span>
          </div>
          <nav className="flex items-center gap-1">
            <Link href="/" className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg text-[#78716C] hover:bg-[#F4F2EF] font-medium transition-colors">
              <LayoutGrid size={13} /> Board
            </Link>
            <button className="flex items-center gap-1.5 text-[13px] px-3 py-1.5 rounded-lg bg-[#EDE9FE] text-[#7C3AED] font-medium">
              <Archive size={13} /> Archive
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto w-full px-5 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h1 className="text-[20px] font-bold text-[#1C1917]">Published Archive</h1>
          <span className="text-[13px] text-[#78716C]">{filtered.length} pieces</span>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#A8A29E]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search archive…"
              className="pl-8 pr-3 py-2 rounded-lg border border-[#E8E5E0] text-[13px] focus:outline-none focus:border-[#7C3AED] w-56"
            />
          </div>
          <button onClick={() => setFilter('all')} className={`text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${filter === 'all' ? 'bg-[#7C3AED] text-white' : 'bg-white border border-[#E8E5E0] text-[#78716C] hover:border-[#7C3AED]'}`}>
            All
          </button>
          {types.map(t => (
            <button key={t} onClick={() => setFilter(t)} className={`flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg font-medium transition-all ${filter === t ? 'bg-[#7C3AED] text-white' : 'bg-white border border-[#E8E5E0] text-[#78716C] hover:border-[#7C3AED]'}`}>
              {TYPE_ICON[t]} {t}
            </button>
          ))}
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <Archive size={32} className="text-[#A8A29E] mb-3" />
            <p className="text-[15px] font-semibold text-[#78716C]">No published content yet</p>
            <p className="text-[13px] text-[#A8A29E] mt-1">Mark content as Published from the board to see it here</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(piece => (
              <div key={piece.id} className="bg-white rounded-xl border border-[#E8E5E0] p-4 hover:border-[#7C3AED] hover:shadow-md transition-all">
                <div className="flex items-center gap-2 mb-2">
                  <span className="flex items-center gap-1 text-[#78716C] text-[11px] uppercase tracking-wide font-medium">
                    {TYPE_ICON[piece.type]} {piece.type}
                  </span>
                  <span className={`ml-auto text-[10px] px-2 py-0.5 rounded-full font-medium ${piece.status === 'published' ? 'bg-[#F9FAFB] text-[#6B7280]' : 'bg-[#F4F2EF] text-[#A8A29E]'}`}>
                    {piece.status}
                  </span>
                </div>
                <p className="text-[14px] font-semibold text-[#1C1917] leading-snug mb-1">{piece.title}</p>
                {piece.description && <p className="text-[12px] text-[#78716C] line-clamp-2 mb-2">{piece.description}</p>}

                {/* Placeholder stats */}
                <div className="grid grid-cols-3 gap-2 my-3 py-3 border-y border-[#F4F2EF]">
                  {[['Views', '—'], ['Likes', '—'], ['Shares', '—']].map(([label, val]) => (
                    <div key={label} className="text-center">
                      <p className="text-[14px] font-bold text-[#1C1917]">{val}</p>
                      <p className="text-[10px] text-[#A8A29E]">{label}</p>
                    </div>
                  ))}
                </div>

                {piece.platforms.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {piece.platforms.map(p => (
                      <span key={p} className="text-[10px] px-1.5 py-0.5 rounded-full font-medium text-white" style={{ backgroundColor: PLATFORM_COLORS[p] || '#78716C' }}>
                        {p}
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-[10px] text-[#A8A29E] mt-2">
                  {piece.published_at
                    ? `Published ${new Date(piece.published_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`
                    : `Archived ${new Date(piece.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
