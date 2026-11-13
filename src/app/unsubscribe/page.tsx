import type { Metadata } from 'next'
import { isUnsubscribed } from '@/lib/db'
import { verifyUnsubscribe } from '@/lib/unsubscribe'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Email preferences', robots: { index: false, follow: false } }

// PUBLIC — where the "Unsubscribe" link in every campaign email lands. Opening the
// page changes nothing; she confirms with a button (so mail scanners can't opt her
// out by pre-opening the link). After confirming she can undo it right here.
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ e?: string; t?: string; done?: string }> }) {
  const { e, t } = await searchParams
  const email = verifyUnsubscribe(e, t)
  const out = email ? isUnsubscribed(email) : false
  const action = email ? `/api/unsubscribe?e=${encodeURIComponent(e!)}&t=${encodeURIComponent(t!)}` : ''

  const wrap: React.CSSProperties = { minHeight: '100vh', margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F7F1EC', padding: '24px', fontFamily: "Georgia,'Times New Roman',serif", color: '#3B2A3A' }
  const card: React.CSSProperties = { background: '#fff', borderRadius: '14px', padding: '36px 32px', maxWidth: '440px', width: '100%', textAlign: 'center', borderTop: '4px solid #E0A458' }
  const h1: React.CSSProperties = { fontSize: '24px', fontWeight: 400, margin: '0 0 12px' }
  const p: React.CSSProperties = { fontSize: '16px', lineHeight: 1.6, margin: '0 0 20px' }
  const btn: React.CSSProperties = { background: '#C94E86', color: '#fff', border: 'none', borderRadius: '999px', padding: '13px 28px', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: '-apple-system,Segoe UI,Roboto,Arial,sans-serif' }
  const quiet: React.CSSProperties = { background: 'none', border: 'none', color: '#8C7B80', textDecoration: 'underline', fontSize: '13px', cursor: 'pointer', fontFamily: '-apple-system,Segoe UI,Roboto,Arial,sans-serif' }

  return (
    <main style={wrap}>
      <div style={card}>
        {!email ? (
          <>
            <h1 style={h1}>This link isn&rsquo;t valid</h1>
            <p style={p}>Use the unsubscribe link at the bottom of the most recent email, or reply to that email and you&rsquo;ll be removed by hand.</p>
          </>
        ) : out ? (
          <>
            <h1 style={h1}>You&rsquo;re unsubscribed</h1>
            <p style={p}><strong>{email}</strong> won&rsquo;t get any more emails from Mandi Beck or Joyful Media.</p>
            <form method="POST" action={action}>
              <input type="hidden" name="from" value="page" />
              <input type="hidden" name="action" value="resubscribe" />
              <button type="submit" style={quiet}>Unsubscribed by mistake? Resubscribe</button>
            </form>
          </>
        ) : (
          <>
            <h1 style={h1}>Unsubscribe?</h1>
            <p style={p}>Stop all emails from Mandi Beck and Joyful Media to <strong>{email}</strong>.</p>
            <form method="POST" action={action}>
              <input type="hidden" name="from" value="page" />
              <input type="hidden" name="action" value="unsubscribe" />
              <button type="submit" style={btn}>Yes, unsubscribe me</button>
            </form>
          </>
        )}
      </div>
    </main>
  )
}
