// The tray compiled into the prompt (SPEC §9): each marked block quoted, nested
// under its parent, in reading order.

import { lineKey, partsOf, quote } from './blocks'
import { cells } from './review'
import { lineMarks } from './tray'

export type Mark = 'accept' | 'reject' | 'comment'

export const GLYPH: Record<Mark, string> = { accept: '✓', reject: '✗', comment: '✎' }

// A code block's margin when only lines inside it are marked. Drawn, never sent.
export const PARTLY = '✸'

// A block with a thread: its margin, and its summary's lead in the prompt.
export const THREAD_GLYPH = '💬'

// A block as the segmenter gives it: its parent is its enclosing list item's
// index, or -1.
export type Block = { text: string; depth: number; parent: number }

// How much of a code line a mark quotes.
const LINE_QUOTE = 60

// A code line or table row in the prompt: its number from 1, counted from the
// block's first line of code or data row, and the text, trimmed. A blank line has
// only its number.
export function lineReference(kind: 'code' | 'table', line: number, text: string): string {
  const trimmed = text.trim()
  // A row's cells are joined with " · " (src/blocks.ts), so an empty one leaves only
  // its separators; a trailing empty cell leaves one, the quote not being a literal copy.
  if (kind === 'table' && /^[·\s]*$/.test(trimmed)) return `row ${line + 1} (blank)`
  if (kind === 'table') return `row ${line + 1}: "${trimmedQuote(trimmed)}"`
  if (trimmed === '') return `line ${line + 1} (blank)`
  return `line ${line + 1}: "${trimmedQuote(trimmed)}"`
}

function trimmedQuote(text: string): string {
  const chars = [...text]
  return chars.length <= LINE_QUOTE ? text : chars.slice(0, LINE_QUOTE).join('') + '...'
}

// One line per staged block, in document order, nested under its parent. An unmarked
// block whose descendant is staged is sent too, as a plain quote with no glyph,
// so a marked child arrives under the parent it belongs to. Marked code lines nest
// under their block the same way. A comment with no text is never sent. An
// included thread's summary (src/threads.ts) nests under its block's or line's
// quote, after the 💬, or under its mark when it has one.
export function compile(
  blocks: readonly Block[],
  marks: Readonly<Record<string, Mark>>,
  comments: Readonly<Record<string, string>>,
  summaries: Readonly<Record<string, string>> = {},
): string {
  const isMarked = (i: number | string) => {
    const mark = marks[i]
    return mark !== undefined && (mark !== 'comment' || (comments[i]?.trim() ?? '') !== '')
  }
  const isStaged = (i: number | string) => isMarked(i) || summaries[i] !== undefined
  // A block's staged lines: marked, or with an included thread of their own.
  const stagedLines = (i: number) =>
    [...new Set([...Object.keys(lineMarks(marks, i)), ...Object.keys(lineMarks(summaries, i))])]
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

  // A block or line as staged: its mark, then its thread's summary under it, led
  // by the 💬 and the rest lined up after it; with no mark, the 💬 leads the quote.
  const staged = (key: number | string, indent: string, reference: string) => {
    const summary = summaries[key]?.split('\n').map(line => line.trim()).filter(Boolean) ?? []
    if (isMarked(key)) {
      const pad = ' '.repeat(cells(`${THREAD_GLYPH} `))
      const thread = summary.map((line, n) => `${indent}    ${n === 0 ? `${THREAD_GLYPH} ` : pad}${line}`)
      return [...entry(`${indent}${GLYPH[marks[key]!]} ${reference}`, key), ...thread]
    }
    if (summary.length > 0) return [`${indent}${THREAD_GLYPH} ${reference}`, ...summary.map(line => `${indent}    ${line}`)]
    return []
  }

  return blocks
    .flatMap((block, i) => {
      const indent = '    '.repeat(block.depth)
      const lines = stagedLines(i)
      const parts = lines.length > 0 ? partsOf(block.text) : undefined
      const nested = lines.flatMap(line =>
        staged(lineKey(i, line), `${indent}    `, lineReference(parts?.kind ?? 'code', line, parts?.lines[line] ?? '')),
      )
      const own = staged(i, indent, `"${quote(block.text)}"`)
      if (own.length > 0) return [...own, ...nested]
      if (!context.has(i)) return []
      return [`${indent}"${quote(block.text)}"${parts?.kind === 'code' ? ' (code block)' : ''}`, ...nested]
    })
    .join('\n')
}

// The compiled prompt in a few lines, and how many more there are: what the
// suggestion showed during a review. Unused while the suggestion stays whole
// (no `prompt.change` to repair a short one taken); kept for #178. Short enough
// already, it comes back as is.
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
