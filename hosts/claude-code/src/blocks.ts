// A reply split into blocks (SPEC §3): paragraphs, list items flat with their
// parent, fenced code, tables, quotes; headings and rules kept as segments that
// are not blocks.

export type Segment = {
  text: string
  isBlock: boolean
  // Nesting level: 0 at the top, 1 under a list item, and so on.
  depth: number
  // The enclosing list item's index among the blocks, or -1.
  parent: number
  // Columns the block is drawn in from the reply's edge, as Claude Code draws a
  // nested item: the parent's indent plus its marker's width and a space — 3
  // under "1.", 2 under "-".
  indent: number
  hasGapBefore: boolean
}

const LIST_ITEM = /^(\s*)([-*+]|\d{1,9}[.)])(\s+)/
const FENCE = /^(\s*)(`{3,}|~{3,})/
const HEADING = /^\s{0,3}#{1,6}(\s|$)/
// A horizontal rule: drawn, but no block — nothing to mark (SPEC §3).
const RULE = /^\s{0,3}([-*_])(\s*\1){2,}\s*$/
// The underline of a setext heading, under a paragraph line.
const SETEXT = /^\s{0,3}(=+|-+)\s*$/
const QUOTE = /^\s*>/

type Kind = 'paragraph' | 'item' | 'quote' | 'code'

// A list item still open: later lines indented past its marker belong to it.
type Item = { segment: Segment; block: number; markerColumn: number; childIndent: number }

export function segment(text: string): Segment[] {
  const out: Segment[] = []
  let blockCount = 0
  // The block being written, which a following line without a blank before it
  // may continue.
  let current: { segment: Segment; kind: Kind } | null = null
  let hasGap = false
  // An open fence: its character run, and how many columns its lines drop.
  let fence: { run: string; drop: number; isInItem: boolean } | null = null
  const items: Item[] = []

  const open = (text: string, kind: Kind, parent: Item | undefined) => {
    const segment: Segment = {
      text,
      isBlock: true,
      depth: parent ? items.indexOf(parent) + 1 : 0,
      parent: parent ? parent.block : -1,
      indent: parent ? parent.childIndent : 0,
      hasGapBefore: hasGap && out.length > 0,
    }
    out.push(segment)
    blockCount += 1
    current = { segment, kind }
    return segment
  }
  const notBlock = (text: string) => {
    out.push({ text, isBlock: false, depth: 0, parent: -1, indent: 0, hasGapBefore: hasGap && out.length > 0 })
    current = null
  }
  const openFence = (run: string, drop: number, isInItem: boolean) => {
    fence = { run, drop, isInItem }
  }

  for (const raw of text.split('\n')) {
    const line = raw.replace(/^\t+/, tabs => '    '.repeat(tabs.length))
    const column = line.length - line.trimStart().length

    if (fence) {
      const open: { run: string; drop: number; isInItem: boolean } = fence
      current!.segment.text += '\n' + line.slice(Math.min(open.drop, column))
      const close = line.trim().match(/^(`{3,}|~{3,})$/)
      if (close && close[1]![0] === open.run[0] && close[1]!.length >= open.run.length) {
        fence = null
        if (!open.isInItem) current = null
      }
      continue
    }

    if (line.trim() === '') {
      current = null
      hasGap = out.length > 0
      continue
    }

    const kind = current?.kind
    const isFence = FENCE.test(line)
    const isItem = !RULE.test(line) && LIST_ITEM.test(line)

    // A setext heading: the paragraph above it was a heading all along.
    if (kind === 'paragraph' && !hasGap && SETEXT.test(line)) {
      const heading = current!.segment
      heading.isBlock = false
      heading.text = heading.text.trim() + '\n' + line.trim()
      heading.depth = 0
      heading.parent = -1
      heading.indent = 0
      blockCount -= 1
      current = null
      continue
    }

    if (HEADING.test(line) || RULE.test(line)) {
      notBlock(line.trim())
      items.length = 0
      hasGap = false
      continue
    }

    // A line that continues the block above it, with no blank line between.
    if (current && !hasGap && !isFence && !isItem) {
      const isQuote = QUOTE.test(line)
      if (kind === 'quote' || (!isQuote && kind !== 'code')) {
        current.segment.text += '\n' + (kind === 'quote' ? line.trimStart() : line.trim())
        continue
      }
    }

    // Close the list items this line is not indented past.
    while (items.length > 0 && column <= items[items.length - 1]!.markerColumn) items.pop()
    const parent = items[items.length - 1]

    const item = line.match(LIST_ITEM)
    if (item) {
      const segment = open(line.trimStart(), 'item', parent)
      items.push({
        segment,
        block: blockCount - 1,
        markerColumn: column,
        childIndent: segment.indent + item[2]!.length + 1,
      })
      hasGap = false
      continue
    }

    const fenceRun = line.match(FENCE)?.[2]
    const lineKind: Kind = fenceRun ? 'code' : QUOTE.test(line) ? 'quote' : 'paragraph'

    // Indented under an open list item: its own content, when nothing came
    // between (SPEC §3: a list item spanning paragraphs is one block), else a
    // block of its own under it.
    if (parent) {
      const isLast = out[out.length - 1] === parent.segment
      if (isLast) {
        // Keep the indent relative to the item (whose own line is trimmed), so
        // the content stays inside the list item when drawn as Markdown.
        parent.segment.text += (hasGap ? '\n\n' : '\n') + line.slice(parent.markerColumn)
        current = { segment: parent.segment, kind: 'item' }
        if (fenceRun) openFence(fenceRun, parent.markerColumn, true)
        hasGap = false
        continue
      }
      open(line.trimStart(), lineKind, parent)
      if (fenceRun) openFence(fenceRun, column, false)
      hasGap = false
      continue
    }

    open(line.trimStart(), lineKind, undefined)
    if (fenceRun) openFence(fenceRun, column, false)
    hasGap = false
  }

  return out
}

// The opening words of a block, for the compiled prompt and the navigator. A
// numbered item keeps its number ("3. Top level"), so items that open alike
// stay apart; a bullet's marker is dropped.
export function quote(text: string, words = 7): string {
  const lines = text.trim().split('\n')
  // A table quotes its header cells: "table: Option · Latency · Cost".
  if (lines.length > 1 && TABLE_DELIMITER.test(lines[1]!)) {
    const cells = lines[0]!.split('|').map(c => c.trim()).filter(Boolean)
    return `table: ${cells.join(' · ')}`
  }
  const marker = text.match(LIST_ITEM)?.[2] ?? ''
  const number = /\d/.test(marker) ? `${marker} ` : ''
  // A code block quotes its code, not its fence and language tag.
  const unfenced = text.replace(/^\s*(```|~~~)[^\n]*\n?/, '').replace(/\n?\s*(```|~~~)\s*$/, '')
  const plain = unfenced
    .replace(LIST_ITEM, '')
    .replace(/^\s*(>\s?)+/gm, '')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/`+/g, '')
    .replace(/(\*\*|__)(.+?)\1/g, '$2')
    // Emphasis, but not an underscore inside a word (SESSION_CACHE).
    .replace(/(^|[^\w*])[*_](?=\S)(.+?)(?<=\S)[*_](?![\w*])/g, '$1$2')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = plain.split(' ')
  return number + (parts.length <= words ? plain : parts.slice(0, words).join(' ') + '...')
}

// A table's second row: dashes between pipes, the outer pipes optional.
const TABLE_DELIMITER = /^\s*\|?\s*:?-+:?\s*(\|\s*:?-+:?\s*)+\|?\s*$|^\s*\|\s*:?-+:?\s*\|\s*$/
