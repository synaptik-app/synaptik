// The tray compiled into the prompt (SPEC §9): each marked block quoted, nested
// under its parent, in reading order.

import { codeOf, lineKey, quote } from './blocks'
import { cells } from './review'
import { lineMarks } from './tray'

export type Mark = 'accept' | 'reject' | 'comment'

export const GLYPH: Record<Mark, string> = { accept: '✓', reject: '✗', comment: '✎' }

// A code block's margin when only lines inside it are marked. Drawn, never sent.
export const PARTLY = '✸'

// A block as the segmenter gives it: its parent is its enclosing list item's
// index, or -1.
export type Block = { text: string; depth: number; parent: number }

// How much of a code line a mark quotes.
const LINE_QUOTE = 60

// A code line in the prompt: its number from 1, counted from the block's first
// line of code, and the line, trimmed. A blank line has only its number.
function lineReference(line: number, text: string): string {
  const trimmed = text.trim()
  if (trimmed === '') return `line ${line + 1} (blank)`
  const chars = [...trimmed]
  return `line ${line + 1}: "${chars.length <= LINE_QUOTE ? trimmed : chars.slice(0, LINE_QUOTE).join('') + '...'}"`
}

// One line per staged block, in document order, nested under its parent. An unmarked
// block whose descendant is staged is sent too, as a plain quote with no glyph,
// so a marked child arrives under the parent it belongs to. Marked code lines nest
// under their block the same way. A comment with no text is never sent.
export function compile(
  blocks: readonly Block[],
  marks: Readonly<Record<string, Mark>>,
  comments: Readonly<Record<string, string>>,
): string {
  const isStaged = (i: number | string) => {
    const mark = marks[i]
    return mark !== undefined && (mark !== 'comment' || (comments[i]?.trim() ?? '') !== '')
  }
  const stagedLines = (i: number) =>
    Object.keys(lineMarks(marks, i))
      .map(Number)
      .filter(line => isStaged(lineKey(i, line)))
      .sort((a, b) => a - b)
  const context = new Set<number>()
  blocks.forEach((_, i) => {
    const hasLines = stagedLines(i).length > 0
    if (hasLines) context.add(i)
    if (!isStaged(i) && !hasLines) return
    for (let p = blocks[i]!.parent; p >= 0; p = blocks[p]!.parent) context.add(p)
  })
  // A comment of several lines: the rest lined up under its first character, so
  // every line stays with its block in the nesting.
  const entry = (head: string, key: number | string) => {
    if (marks[key] !== 'comment') return [head]
    const [first, ...rest] = comments[key]!.trim().split('\n')
    const lead = `${head} → `
    const pad = ' '.repeat(cells(lead))
    return [`${lead}${first}`, ...rest.map(line => (line.trim() ? `${pad}${line.trimEnd()}` : ''))]
  }

  return blocks
    .flatMap((block, i) => {
      const indent = '    '.repeat(block.depth)
      const lines = stagedLines(i)
      const code = lines.length > 0 ? codeOf(block.text) : undefined
      const nested = lines.flatMap(line => {
        const key = lineKey(i, line)
        return entry(`${indent}    ${GLYPH[marks[key]!]} ${lineReference(line, code?.lines[line] ?? '')}`, key)
      })
      if (isStaged(i)) return [...entry(`${indent}${GLYPH[marks[i]!]} "${quote(block.text)}"`, i), ...nested]
      if (!context.has(i)) return []
      return [`${indent}"${quote(block.text)}"${code ? ' (code block)' : ''}`, ...nested]
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
