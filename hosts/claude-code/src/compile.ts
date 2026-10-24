// The tray compiled into the prompt (SPEC §9): each marked block quoted, nested
// under its parent, in reading order.

import { quote } from './blocks'

export type Mark = 'accept' | 'reject' | 'comment'

export const GLYPH: Record<Mark, string> = { accept: '✓', reject: '✗', comment: '✎' }

// A block as the segmenter gives it: its parent is its enclosing list item's
// index, or -1.
export type Block = { text: string; depth: number; parent: number }

// One line per staged block, in document order, nested under its parent. An unmarked
// block whose descendant is staged is sent too, as a plain quote with no glyph,
// so a marked child arrives under the parent it belongs to. A comment with no
// text is never sent.
export function compile(
  blocks: readonly Block[],
  marks: Readonly<Record<number, Mark>>,
  comments: Readonly<Record<number, string>>,
): string {
  const isStaged = (i: number) => {
    const mark = marks[i]
    return mark !== undefined && (mark !== 'comment' || (comments[i]?.trim() ?? '') !== '')
  }
  const context = new Set<number>()
  blocks.forEach((_, i) => {
    if (!isStaged(i)) return
    for (let p = blocks[i]!.parent; p >= 0; p = blocks[p]!.parent) context.add(p)
  })

  return blocks
    .flatMap((block, i) => {
      const indent = '    '.repeat(block.depth)
      if (isStaged(i)) {
        const mark = marks[i]!
        const tail = mark === 'comment' ? ` → ${comments[i]!.trim()}` : ''
        return [`${indent}${GLYPH[mark]} "${quote(block.text)}"${tail}`]
      }
      return context.has(i) ? [`${indent}"${quote(block.text)}"`] : []
    })
    .join('\n')
}
