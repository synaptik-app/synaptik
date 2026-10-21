// A reply split into blocks (SPEC §3): paragraphs, list items with their depth,
// fenced code, tables, quotes; headings kept as segments that are not blocks.
// Naive for now — the rewrite from SPEC §3 is #50.

export type Segment = {
  text: string
  isBlock: boolean
  depth: number
  hasGapBefore: boolean
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+/
const FENCE = /^\s*(```|~~~)/
const HEADING = /^\s{0,3}#{1,6}\s/
// A horizontal rule: drawn, but no block — nothing to mark (SPEC §3).
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/

export function segment(text: string): Segment[] {
  const out: Segment[] = []
  const lines = text.split('\n')
  let current: Segment | null = null
  let hasGap = false
  let fence: string | null = null
  // Indent of the last list item's marker, while a list is open: a paragraph
  // indented past it after a blank line continues that item (SPEC §3: a list
  // item spanning several paragraphs is one block).
  let itemIndent: number | null = null

  const flush = () => {
    if (current) out.push(current)
    current = null
  }

  for (const line of lines) {
    if (fence) {
      current!.text += '\n' + line
      if (line.trim().startsWith(fence)) {
        fence = null
        flush()
      }
      continue
    }

    const fenceMatch = line.match(FENCE)
    if (fenceMatch) {
      flush()
      fence = fenceMatch[1]!
      itemIndent = null
      current = { text: line, isBlock: true, depth: 0, hasGapBefore: hasGap }
      hasGap = false
      continue
    }

    if (line.trim() === '') {
      flush()
      hasGap = out.length > 0
      continue
    }

    if (HEADING.test(line) || RULE.test(line)) {
      flush()
      out.push({ text: line.trim(), isBlock: false, depth: 0, hasGapBefore: hasGap })
      itemIndent = null
      hasGap = false
      continue
    }

    const item = line.match(LIST_ITEM)
    if (item) {
      flush()
      const depth = Math.floor(item[1]!.length / 2)
      itemIndent = item[1]!.length
      current = { text: line.trimStart(), isBlock: true, depth, hasGapBefore: hasGap }
      hasGap = false
      continue
    }

    const indent = line.length - line.trimStart().length
    const last = out[out.length - 1]
    if (!current && hasGap && itemIndent !== null && indent > itemIndent && last?.isBlock) {
      // Keep the indent relative to the item (whose own line is trimmed), so
      // the paragraph stays inside the list item when drawn as Markdown.
      current = out.pop()!
      current.text += '\n\n' + line.slice(itemIndent)
      hasGap = false
      continue
    }
    if (indent === 0) itemIndent = null

    if (current) {
      current.text += '\n' + line.trim()
    } else {
      current = { text: line, isBlock: true, depth: 0, hasGapBefore: hasGap }
      hasGap = false
    }
  }
  flush()

  return out
}

// The opening words of a block, for the compiled prompt and the navigator. A
// numbered item keeps its number ("3. Top level"), so items that open alike
// stay apart; a bullet's marker is dropped.
export function quote(text: string, words = 7): string {
  // A table quotes its header cells: "table: Option · Latency · Cost".
  const lines = text.trim().split('\n')
  if (lines.length > 1 && lines.every(l => l.trim().startsWith('|'))) {
    const cells = lines[0]!.split('|').map(c => c.trim()).filter(Boolean)
    return `table: ${cells.join(' · ')}`
  }
  const marker = text.match(LIST_ITEM)?.[2] ?? ''
  const number = /\d/.test(marker) ? `${marker} ` : ''
  // A code block quotes its code, not its fence and language tag.
  const unfenced = text.replace(/^\s*(```|~~~)[^\n]*\n?/, '').replace(/\n?\s*(```|~~~)\s*$/, '')
  const plain = unfenced
    .replace(LIST_ITEM, '')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = plain.split(' ')
  return number + (parts.length <= words ? plain : parts.slice(0, words).join(' ') + '...')
}
