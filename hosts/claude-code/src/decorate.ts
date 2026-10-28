// The feedback in the prompt box, once taken (Tab) and edited: its mark glyphs
// coloured, as prompt decorations — Claude Code paints them; the draft is not
// changed. Plain data: the box's text in, the runs to paint out.
//
// Only from the first keystroke: taking the suggestion is a `prompt.change`,
// which cannot carry decorations, and Synaptik never writes the box to add them.

export type Paint = { start: number; end: number; color: 'success' | 'error' | 'suggestion'; bold: true }

const COLOR = { '✓': 'success', '✗': 'error', '✎': 'suggestion' } as const

// The glyph leading each line, indented ones too: ✓ green, ✗ red, ✎ in the
// suggestion colour. A line led by anything else is left alone, so a prompt the
// person wrote is never painted.
export function decorate(text: string): Paint[] {
  const paints: Paint[] = []
  let at = 0
  for (const line of text.split('\n')) {
    const lead = line.length - line.trimStart().length
    const glyph = line[lead]
    if (glyph === '✓' || glyph === '✗' || glyph === '✎') {
      paints.push({ start: at + lead, end: at + lead + 1, color: COLOR[glyph], bold: true })
    }
    at += line.length + 1
  }
  return paints
}
