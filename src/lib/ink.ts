// Account and status colors are chosen for swatches, not for reading. ink() keeps the color's hue
// but blends it toward the page's text color (darker by Day, lighter by Night), so text in that
// color passes AA contrast (4.5:1) in both themes. Use it for TEXT only; backgrounds keep the raw color.
export const ink = (c?: string | null) => (c ? `color-mix(in oklab, ${c} 45%, var(--ink, #14122B))` : 'var(--text)')
