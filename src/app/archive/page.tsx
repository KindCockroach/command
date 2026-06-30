export const dynamic = 'force-dynamic'

import { getAllContent } from '@/lib/db'
import ArchiveView from '@/components/ArchiveView'

export default function ArchivePage() {
  const content = getAllContent().filter(c => ['published', 'archived'].includes(c.status))
  return <ArchiveView content={content} />
}
