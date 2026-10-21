// How much room things take, estimated: the mod can't measure how Claude Code
// wraps Markdown, so rows are counted from text. Plain numbers and strings.

import { segment } from './blocks'

// `text` cut to `n` characters, `...` (three plain dots) when cut.
export const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n)}...` : text)

// Rows a block takes when Claude Code draws it `width` wide: a table as drawn (a
// border line around and between its rows), a code block without its fence
// lines, prose wrapped by length.
export function drawnRows(text: string, width: number): number {
  const lines = text.split('\n')
  if (lines.every(l => l.trim().startsWith('|'))) {
    const rows = lines.filter(l => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).length
    return 2 * rows + 1
  }
  const body = /^\s*(```|~~~)/.test(lines[0] ?? '') ? lines.slice(1, -1) : lines
  return body.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / width)), 0)
}

// The classic navigator's smallest height.
export const CLASSIC_MIN_ROWS = 7

// Rows the classic (inline) navigator asks for: the tallest block's estimated
// lines plus its six fixed rows (header, previous, menu, comment, next,
// footer), between a floor and a third of the screen. Decided once per reply,
// so the pane does not change height while navigating (each change would shift
// the screen, and the classic renderer redraws by erasing what it printed).
// The dock ignores it.
export function classicRows(text: string, screen: { columns: number; rows: number }): number {
  const width = Math.max(20, screen.columns - 8)
  const tallest = Math.max(
    1,
    ...segment(text)
      .filter(b => b.isBlock)
      .map(b => drawnRows(b.text, width)),
  )
  return Math.max(CLASSIC_MIN_ROWS, Math.min(tallest + 6, Math.floor(screen.rows / 3)))
}

// Rows per block in the minimap, proportional to each block's length and at
// least one, scaled into `rows`. Happy path: assumes blocks <= rows.
export function minimap(lengths: readonly number[], rows: number): number[] {
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  const spare = Math.max(0, rows - lengths.length)
  const shares = lengths.map(len => (len / total) * spare)
  const heights = shares.map(share => 1 + Math.floor(share))
  // Hand the rows lost to rounding down to the largest remainders, so the
  // column fills `rows` exactly instead of leaving space at the bottom.
  let left = rows - heights.reduce((a, b) => a + b, 0)
  const byRemainder = shares
    .map((share, i) => [share - Math.floor(share), i] as const)
    .sort((a, b) => b[0] - a[0])
  for (const [, i] of byRemainder) {
    if (left <= 0) break
    heights[i]! += 1
    left -= 1
  }
  return heights
}
