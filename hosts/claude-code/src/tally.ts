// What is staged, counted: the band's summary and the navigator's heading.
// The tray's marks and comments in, text out.

import { GLYPH } from './compile'
import type { Mark } from './compile'

type Marks = Readonly<Record<number, Mark>>
type Comments = Readonly<Record<number, string>>

// Comments that count: a block marked to comment, with text.
export function commentCount(marks: Marks, comments: Comments): number {
  return Object.entries(marks).filter(([i, m]) => m === 'comment' && comments[Number(i)]?.trim()).length
}

// The band: "2 accepted · 1 rejected · 1 comment", zero counts left out.
export function summary(marks: Marks, comments: Comments): string {
  const marked = Object.values(marks)
  const count = (m: Mark) => marked.filter(x => x === m).length
  const notes = commentCount(marks, comments)
  return [
    count('accept') && `${count('accept')} accepted`,
    count('reject') && `${count('reject')} rejected`,
    notes && `${notes} comment${notes === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// The navigator's heading: "✓2 ✗1 ✎1", zero counts left out.
export function glyphCounts(marks: Marks, selections: readonly { mark: Mark }[] = []): string {
  const marked = [...Object.values(marks), ...selections.map(s => s.mark)]
  return (['accept', 'reject', 'comment'] as const)
    .map(m => [m, marked.filter(x => x === m).length] as const)
    .filter(([, n]) => n > 0)
    .map(([m, n]) => `${GLYPH[m]}${n}`)
    .join(' ')
}
