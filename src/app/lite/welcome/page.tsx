import { redirect } from 'next/navigation'

// The live FastPayDirect checkout currently redirects buyers here. Forward them
// to the new audience-specific delivery page (Annie / "Seen") so nothing breaks
// until the GHL checkout redirect is updated.
export default function LiteWelcomeRedirect() {
  redirect('/seen/welcome')
}
