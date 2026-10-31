// The tray compiled into the prompt (SPEC §9): each marked block quoted, nested
// under its parent, in reading order.

import { quote } from './blocks'
import { cells } from './review'

export type Mark = 'accept' | 'reject' | 'comment'

// A mark on selected text, owned by the block the selection ends in (#91). The
// text is sent whole and as selected; a block can hold several.
export type SelectionMark = { text: string; block: number; mark: Mark; comment?: string }

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
  selections: readonly SelectionMark[] = [],
): string {
  const isStaged = (i: number) => {
    const mark = marks[i]
    return mark !== undefined && (mark !== 'comment' || (comments[i]?.trim() ?? '') !== '')
  }
  const under = (i: number) => selections.filter(s => s.block === i)
  const context = new Set<number>()
  blocks.forEach((_, i) => {
    if (under(i).length > 0) context.add(i)
    if (!isStaged(i) && under(i).length === 0) return
    for (let p = blocks[i]!.parent; p >= 0; p = blocks[p]!.parent) context.add(p)
  })

  return blocks
    .flatMap((block, i) => {
      const indent = '    '.repeat(block.depth)
      const rows = under(i).flatMap(s => selectionLines(s, `${indent}    `))
      if (isStaged(i)) {
        const mark = marks[i]!
        const head = `${indent}${GLYPH[mark]} "${quote(block.text)}"`
        if (mark !== 'comment') return [head, ...rows]
        // A comment of several lines: the rest lined up under its first
        // character, so every line stays with its block in the nesting.
        const [first, ...rest] = comments[i]!.trim().split('\n')
        const lead = `${head} → `
        const pad = ' '.repeat(cells(lead))
        return [`${lead}${first}`, ...aligned(rest, pad), ...rows]
      }
      return context.has(i) ? [`${indent}"${quote(block.text)}"`, ...rows] : []
    })
    .join('\n')
}

const aligned = (lines: readonly string[], pad: string) => lines.map(line => (line.trim() ? `${pad}${line.trimEnd()}` : ''))

// A selection's lines: quoted whole, its lines and its comment's lined up.
function selectionLines(s: SelectionMark, indent: string): string[] {
  const lead = `${indent}${GLYPH[s.mark]} "`
  const [first = '', ...rest] = s.text.trim().split('\n')
  const quoted = [`${lead}${first}`, ...aligned(rest, ' '.repeat(cells(lead)))]
  quoted[quoted.length - 1] += '"'
  const comment = s.mark === 'comment' ? (s.comment ?? '').trim() : ''
  if (!comment) return quoted
  const [note = '', ...more] = comment.split('\n')
  quoted[quoted.length - 1] += ` → ${note}`
  return [...quoted, ...aligned(more, ' '.repeat(cells(lead)))]
}

// A staged selection, in the one row it gets under its block.
export function selectionRow(s: SelectionMark): string {
  const note = s.mark === 'comment' ? ` → ${oneLine(s.comment ?? '')}` : ''
  return `${GLYPH[s.mark]} "${oneLine(s.text)}"${note}`
}

// A comment in one row, where only one fits (under a block, in classic's
// viewer): its first line, and how many more there are.
export function oneLine(comment: string): string {
  const [first = '', ...rest] = comment.trim().split('\n')
  return rest.length === 0 ? first : `${first} (+${rest.length} line${rest.length === 1 ? '' : 's'})`
}
