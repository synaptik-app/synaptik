// The band above the prompt (SPEC §7): Synaptik's lines under whatever lies
// beneath (other mods', Claude Code's own) — a header, what is staged, and what
// the keys do now. Plain data and one callback — no `$`.

import type { Elements, RenderElement } from 'claude-code'

// The header, and the lead of each line under it: as Claude Code nests its own
// output, so with several mods in the band it is clear which lines are ours.
const TAGLINE = 'respond to the reply in place'
const NEST = '⎿  '

export type BandModel = {
  // What the chain beneath drew, or null while reviewing (Synaptik's band then
  // stands alone as the key legend).
  beneath: RenderElement | null | undefined
  columns: number
  // "2 accepted · 1 rejected", empty when nothing is staged; and what ⏎ does
  // with it given the prompt box: drops it (other text there), sends it (the
  // box holds exactly the suggestion), or nothing to say.
  staged: string
  stagedAs: 'dropped' | 'taken' | 'plain'
  // The last line, just above the prompt: what the keys do right now.
  action: string
  isNavigatorShown: boolean
  entryKey: string
}

export function BandView(
  { Box, Text, Button }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>,
  m: BandModel,
  onOpen: () => unknown,
) {
  // The tree beneath may hold Claude Code's own drawing (an engine node), and an
  // engine node under a Box with `width` is refused — the whole band then falls
  // back to Claude Code's own. So `width` sits only on Synaptik's lines.
  return (
    <Box flexDirection="column">
      {m.beneath}
      <Box flexDirection="column" width={m.columns}>
        <Text wrap="truncate">
          Synaptik<Text dimColor> · {TAGLINE}</Text>
        </Text>
        {m.staged &&
          (m.stagedAs === 'dropped' ? (
            <Text color="yellow" wrap="truncate">
              {NEST}
              {m.staged} staged · ⏎ sends only what you typed and drops them
            </Text>
          ) : m.stagedAs === 'taken' ? (
            <Text wrap="truncate">
              {NEST}
              {m.staged} · ⏎ sends your feedback
            </Text>
          ) : (
            <Text wrap="truncate">
              {NEST}
              {m.staged}
            </Text>
          ))}
        {m.isNavigatorShown ? (
          <Text dimColor wrap="truncate">
            {NEST}
            {m.action}
          </Text>
        ) : (
          // Edge case, design deferred: the navigator is not on screen, so the
          // band offers the press that opens it.
          <Box flexDirection="row">
            <Text dimColor>
              {NEST}
              {m.entryKey}, then{' '}
            </Text>
            <Button key="open-pane" plain autoFocus label="⏎ to respond in place" onPress={onOpen} />
          </Box>
        )}
      </Box>
    </Box>
  )
}
