// SPIKE — throwaway. A naive splitter, good enough to draw a gutter against.
// Not the real segmenter (SPEC §3); that is phase 1's blocks.ts.

export type Segment = {
  text: string
  isBlock: boolean
  depth: number
  hasGapBefore: boolean
}

const LIST_ITEM = /^(\s*)([-*+]|\d+[.)])\s+/
const FENCE = /^\s*(```|~~~)/
const HEADING = /^\s{0,3}#{1,6}\s/

export function segment(text: string): Segment[] {
  const out: Segment[] = []
  const lines = text.split('\n')
  let current: Segment | null = null
  let hasGap = false
  let fence: string | null = null

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
      current = { text: line, isBlock: true, depth: 0, hasGapBefore: hasGap }
      hasGap = false
      continue
    }

    if (line.trim() === '') {
      flush()
      hasGap = out.length > 0
      continue
    }

    if (HEADING.test(line)) {
      flush()
      out.push({ text: line.trim(), isBlock: false, depth: 0, hasGapBefore: hasGap })
      hasGap = false
      continue
    }

    const item = line.match(LIST_ITEM)
    if (item) {
      flush()
      const depth = Math.floor(item[1]!.length / 2)
      current = { text: line.trimStart(), isBlock: true, depth, hasGapBefore: hasGap }
      hasGap = false
      continue
    }

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

export function quote(text: string, words = 7): string {
  const plain = text
    .replace(LIST_ITEM, '')
    .replace(/[`*_>#]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  const parts = plain.split(' ')
  return parts.length <= words ? plain : parts.slice(0, words).join(' ') + '…'
}
