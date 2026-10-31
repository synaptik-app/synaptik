// A text selection (#91): where it belongs in the reply. The text comes as the
// person sees it and the blocks as Markdown source, so the lookup drops what only
// one of them has. It only places the mark; what is sent is the text as selected.

const squeeze = (text: string) => text.replace(/[\s*_`#>|│┌┐└┘├┤┬┴┼─━▎=\-:]/g, '').toLowerCase()

// Two readings of a selection, as the same text.
export const loose = (text: string) => text.replace(/\s+/g, ' ').trim()

// The index of the block holding the selection's last line, or -1 when it is not
// in these blocks (an older reply, the prompt).
export function endingBlock(selected: string, blocks: readonly string[]): number {
  const last = selected.split('\n').map(squeeze).filter(Boolean).at(-1)
  if (!last) return -1
  return blocks.map(squeeze).findIndex(b => b.includes(last))
}
