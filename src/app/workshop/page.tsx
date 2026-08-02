import { redirect } from 'next/navigation'

// "Workshop" is retired — we say Sessions now. This page is the old URL for the
// Cheat Code session, kept as a permanent redirect so any shared link still lands.
export default function WorkshopRedirect() {
  redirect('/cheatcode')
}
