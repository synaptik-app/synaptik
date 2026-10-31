// The tray compiled into the prompt (SPEC §9): each marked block quoted, nested
// under its parent, in reading order.

import { quote } from './blocks'
import { cells } from './review'

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
        const head = `${indent}${GLYPH[mark]} "${quote(block.text)}"`
        if (mark !== 'comment') return [head]
        // A comment of several lines: the rest lined up under its first
        // character, so every line stays with its block in the nesting.
        const [first, ...rest] = comments[i]!.trim().split('\n')
        const lead = `${head} → `
        const pad = ' '.repeat(cells(lead))
        return [`${lead}${first}`, ...rest.map(line => (line.trim() ? `${pad}${line.trimEnd()}` : ''))]
      }
      return context.has(i) ? [`${indent}"${quote(block.text)}"`] : []
    })
    .join('\n')
}

// The compiled prompt in a few lines, and how many more there are: what the
// suggestion shows during a review. Short enough already, it comes back as is.
export function preview(text: string, keep = 3): string {
  const lines = text.split('\n')
  const rest = lines.length - keep
  return rest <= 0 ? text : [...lines.slice(0, keep), `… (+${rest} line${rest === 1 ? '' : 's'})`].join('\n')
}

// A comment in one row, where only one fits (under a block, in classic's
// viewer): its first line, and how many more there are.
export function oneLine(comment: string): string {
  const [first = '', ...rest] = comment.trim().split('\n')
  return rest.length === 0 ? first : `${first} (+${rest.length} line${rest.length === 1 ? '' : 's'})`
}
