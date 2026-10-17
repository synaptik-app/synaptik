// SPIKE — throwaway. The tray compiled into the prompt (SPEC §9).

import { quote } from './spike-blocks'

export type Mark = 'accept' | 'reject' | 'comment'

export const GLYPH: Record<Mark, string> = { accept: '✓', reject: '✗', comment: '✎' }

export type Block = { text: string; depth: number }

// The nearest earlier block at a shallower depth, or -1.
function parentOf(blocks: readonly Block[], i: number): number {
  for (let j = i - 1; j >= 0; j -= 1) {
    if (blocks[j]!.depth < blocks[i]!.depth) return j
  }
  return -1
}

// One line per staged block, in document order, nested by depth. An unmarked
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
    for (let p = parentOf(blocks, i); p >= 0; p = parentOf(blocks, p)) context.add(p)
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
