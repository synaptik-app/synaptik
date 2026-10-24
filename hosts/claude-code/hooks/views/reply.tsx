// The reply as Synaptik draws it while reviewing, or when it carries marks
// (D33): Claude Code's frame redrawn, each block beside its margin, the
// selected one on the selection background with the actions under it, and the
// comment lines. Plain data and one callback — no `$`.

import type { Elements } from 'claude-code'

import { BULLET, MARGIN, SELECTED_BACKGROUND, VERBS } from '../ui'

export type ReplyModel = {
  isFirstOfReply: boolean
  segments: readonly {
    text: string
    isBlock: boolean
    // Columns in from the reply's edge, as Claude Code draws a nested item.
    indent: number
    hasGapBefore: boolean
    // A block's mark, whether it is selected (and the navigator holds the
    // keyboard), and its comment line when one shows.
    glyph?: string
    isSelected?: boolean
    comment?: string
  }[]
  // The action the navigator's focus ring is on: drawn as the primary button.
  cursor: string
}

export function ReplyView(
  { Box, Text, Button, Markdown }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button' | 'Markdown'>,
  m: ReplyModel,
  onAction: (key: string) => unknown,
) {
  // Claude Code's reply frame, redrawn: the top margin, the 2-cell left margin,
  // and the ⏺ bullet on the reply's first line. A mark's glyph sits in that
  // margin, so marking moves nothing. Wrapping Claude Code's own drawing per
  // block was tried: next(e) returns an opaque handle ({ type: 'engine', ref }),
  // its spacing and margin baked in, so blocks drawn one by one gained gaps and
  // lost the margin.
  const margin = (glyph: string) => (
    <Box width={MARGIN} flexShrink={0}>
      <Text>{glyph}</Text>
    </Box>
  )
  return (
    <Box flexDirection="column" marginTop={1}>
      {m.segments.map((seg, n) => {
        const bullet = n === 0 && m.isFirstOfReply ? BULLET : ''
        if (!seg.isBlock) {
          return (
            <Box flexDirection="row" marginTop={seg.hasGapBefore ? 1 : 0}>
              {margin(bullet)}
              <Box flexGrow={1}>
                <Markdown text={seg.text} />
              </Box>
            </Box>
          )
        }
        return (
          <Box flexDirection="column" marginTop={seg.hasGapBefore ? 1 : 0}>
            <Box flexDirection="row">
              {margin(seg.glyph ?? bullet)}
              <Box
                flexGrow={1}
                paddingLeft={seg.indent}
                backgroundColor={seg.isSelected ? SELECTED_BACKGROUND : undefined}
              >
                <Markdown text={seg.text} />
              </Box>
            </Box>
            {seg.isSelected && (
              <Box flexDirection="row" paddingLeft={MARGIN + seg.indent}>
                <Text dimColor>└ </Text>
                {VERBS.map(v => (
                  <Button
                    key={v.key}
                    label={v.label}
                    variant={m.cursor === v.key ? 'primary' : undefined}
                    dimColor={m.cursor !== v.key}
                    onPress={() => onAction(v.key)}
                  />
                ))}
              </Box>
            )}
            {seg.comment !== undefined && (
              <Box paddingLeft={MARGIN + seg.indent + 2}>
                <Text dimColor>→ {seg.comment}</Text>
              </Box>
            )}
          </Box>
        )
      })}
    </Box>
  )
}
