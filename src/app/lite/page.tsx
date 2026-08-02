import { redirect } from 'next/navigation'

// The $27 entry offer moved to audience-specific doors. /lite is kept as a
// permanent redirect to Annie's page so links already in the wild keep working.
export default function LiteRedirect() {
  redirect('/seen')
}
