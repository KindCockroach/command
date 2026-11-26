'use client'
import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, type TextareaHTMLAttributes } from 'react'

// A chat text box that wraps at the edge and grows taller as you type (up to maxHeight, then it
// scrolls), so you never lose sight of what you wrote on the left. Enter sends when onEnter is set;
// Shift+Enter adds a new line. Shrinks back after sending. The corner grip lets her drag it bigger;
// it then stays that size until the box is emptied (sent).
type Props = Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onKeyDown'> & {
  value: string
  onEnter?: () => void
  maxHeight?: number
  onKeyDown?: TextareaHTMLAttributes<HTMLTextAreaElement>['onKeyDown']
}

const GrowBox = forwardRef<HTMLTextAreaElement, Props>(function GrowBox({ value, onEnter, maxHeight = 220, onKeyDown, style, rows = 1, ...rest }, fwd) {
  const ref = useRef<HTMLTextAreaElement>(null)
  useImperativeHandle(fwd, () => ref.current as HTMLTextAreaElement)
  const manual = useRef(0)   // height she dragged it to with the corner (0 = not dragged)
  const fitH = useRef('')     // the height fit() last set; any other inline height came from her drag
  const fit = useCallback(() => {
    const el = ref.current; if (!el) return
    el.style.height = 'auto'
    const need = el.scrollHeight + 2
    const h = Math.max(Math.min(need, maxHeight), manual.current)
    el.style.height = fitH.current = `${h}px`
    el.style.overflowY = need > h ? 'auto' : 'hidden'
  }, [maxHeight])
  useEffect(() => { if (!value) manual.current = 0; fit() }, [value, fit])
  useEffect(() => {
    const el = ref.current; if (!el || typeof ResizeObserver === 'undefined') return
    let w = el.clientWidth, h = el.offsetHeight
    const ro = new ResizeObserver(() => {
      if (el.clientWidth !== w) { w = el.clientWidth; h = el.offsetHeight; fit(); return }
      if (el.offsetHeight !== h) {
        h = el.offsetHeight
        if (el.style.height && el.style.height !== fitH.current) {
          manual.current = parseFloat(el.style.height) || 0
          el.style.overflowY = el.scrollHeight + 2 > el.clientHeight ? 'auto' : 'hidden'
        }
      }
    })
    ro.observe(el); return () => ro.disconnect()
  }, [fit])
  return (
    <textarea
      ref={ref}
      rows={rows}
      value={value}
      onKeyDown={e => {
        onKeyDown?.(e)
        if (e.defaultPrevented || !onEnter) return
        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); onEnter() }
      }}
      style={{ minHeight: 34, overflowY: 'hidden', whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', lineHeight: 1.45, ...style, resize: 'vertical' }}
      {...rest}
    />
  )
})

export default GrowBox
