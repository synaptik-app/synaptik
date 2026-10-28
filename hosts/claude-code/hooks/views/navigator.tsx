// The navigator pane's drawings, classic's only (fullscreen reviews in the reply,
// D41): nothing to review yet, or the selected block itself (#31). Plain data,
// the actions as callbacks, and the comment field ready-made — no `$`.

import type { Elements, RenderElement } from 'claude-code'

import { chunk } from '../../src/blocks'
import { oneLine } from '../../src/compile'
import { END_REVIEW, generational, PANE_ANCHOR, VERBS } from '../ui'

// What the navigator's buttons do; register.tsx owns them.
export type NavigatorActions = {
  up: () => unknown
  verb: (key: string) => unknown
  // q: done, as Esc is — not advertised, for those who use it in fullscreen.
  end: () => unknown
}

// No reply yet: one line, no counter, no keys (#73).
export function EmptyView(
  { Box, Text }: Pick<Elements['terminal'], 'Box' | 'Text'>,
  message = 'Nothing to respond to yet — Synaptik opens on the next reply.',
) {
  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Text> </Text>
      <Text dimColor wrap="truncate">
        {message}
      </Text>
    </Box>
  )
}

export type ClassicModel = {
  // The actions' generation: q draws them under new keys, so the one holding the
  // keyboard disappears (ui.ts, generational).
  generation: number
  rows: number
  heading: string
  // The nearest heading above the selected block.
  crumb: string
  barHeights: readonly number[]
  // The neighbours' opening words, and the selected block in full.
  previous?: string
  next?: string
  text: string
  glyph?: string
  blockRows: number
  // How far PgUp/PgDn have scrolled inside the block.
  blockOffset: number
  comment?: string
  counter: string
  canReadOn: boolean
}

// Classic: the selected block itself, with its neighbours, the actions as
// buttons, and its comment, beside a quiet left edge.
export function ClassicView(
  { Box, Text, Button, Markdown }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button' | 'Markdown'>,
  m: ClassicModel,
  actions: NavigatorActions,
  field: RenderElement | undefined,
) {
  return (
    <Box flexDirection="column" height={m.rows + 2} overflow="hidden">
      <Text> </Text>
      <Box flexDirection="column" height={m.rows} overflow="hidden">
        <Box flexDirection="row">
          <Button key={PANE_ANCHOR} plain dimColor label="▲" onPress={actions.up} />
          <Text dimColor wrap="truncate">
            {' '}
            {m.heading}
            {m.crumb ? `  § ${m.crumb}` : ''}
          </Text>
        </Box>
        {/* Between header and footer: the bars, no accent colour, beside the
            selected block, its neighbours, menu and comment. */}
        <Box flexDirection="row" height={m.rows - 2} overflow="hidden">
          <Box flexDirection="column" width={2} flexShrink={0} overflow="hidden">
            {m.barHeights.map(height =>
              // A block viewer, not a navigator: a quiet left edge.
              Array.from({ length: height }, () => <Text dimColor>│</Text>),
            )}
          </Box>
          <Box flexDirection="column" flexGrow={1}>
            <Box flexGrow={1} />
            <Text dimColor wrap="truncate">
              {m.previous ? `↑ ${m.previous}` : ' '}
            </Text>
            <Box flexDirection="row" height={m.blockRows} overflow="hidden">
              <Text>{m.glyph ?? ' '} </Text>
              <Box flexDirection="column" flexGrow={1} overflow="hidden">
                <Box flexDirection="column" marginTop={-m.blockOffset}>
                  {chunk(m.text).map(piece => (
                    <Markdown text={piece} />
                  ))}
                </Box>
              </Box>
            </Box>
            <Box flexDirection="row">
              {VERBS.map((v, n) => (
                <Button
                  key={generational(v.key, m.generation)}
                  label={v.label}
                  hotkey={v.hotkey}
                  autoFocus={n === 0 ? true : undefined}
                  onPress={() => actions.verb(v.key)}
                />
              ))}
              <Box display="none">
                <Button key={generational(END_REVIEW, m.generation)} plain hotkey="q" label="done" onPress={actions.end} />
              </Box>
            </Box>
            {field ?? (
              <Text dimColor wrap="truncate">
                {m.comment ? `→ ${oneLine(m.comment)}` : '→'}
              </Text>
            )}
            <Text dimColor wrap="truncate">
              {m.next ? `↓ ${m.next}` : ' '}
            </Text>
            <Box flexGrow={1} />
          </Box>
        </Box>
        <Text dimColor wrap="truncate">
          ▼ {m.counter}
          {m.canReadOn ? ' · PgUp/PgDn to read on' : ''}
        </Text>
      </Box>
      <Text> </Text>
    </Box>
  )
}
