import WinnersPanel from '@/components/WinnersPanel'

// Alias: the Winners view now lives inside the station as the "Winners" tab.
// This URL still works on its own (gated by middleware like every station page).
export default function WinnersPage() {
  return <WinnersPanel />
}
