// The navigator pane's drawings: nothing to review yet; the docked map of the
// blocks (fullscreen); the selected block itself (classic, #31). Plain data, the
// actions as callbacks, and the comment field ready-made — no `$`.

import type { Elements, RenderElement } from 'claude-code'

import { ACCENT, PANE_ANCHOR, VERBS } from '../ui'

// What the navigator's buttons do; register.tsx owns them.
export type NavigatorActions = {
  up: () => unknown
  verb: (key: string) => unknown
}

// No reply yet: one line, no counter, no keys (#73).
export function EmptyView({ Box, Text }: Pick<Elements['terminal'], 'Box' | 'Text'>) {
  return (
    <Box flexDirection="column" paddingLeft={1}>
      <Text> </Text>
      <Text dimColor wrap="truncate">
        Nothing to respond to yet — Synaptik opens on the next reply.
      </Text>
    </Box>
  )
}

export type ClassicModel = {
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
                  <Markdown text={m.text} />
                </Box>
              </Box>
            </Box>
            <Box flexDirection="row">
              {VERBS.map((v, n) => (
                <Button
                  key={v.key}
                  label={v.label}
                  hotkey={v.hotkey}
                  autoFocus={n === 0 ? true : undefined}
                  onPress={() => actions.verb(v.key)}
                />
              ))}
            </Box>
            {field ?? (
              <Text dimColor wrap="truncate">
                {m.comment ? `→ ${m.comment}` : '→'}
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

export type MapModel = {
  rows: number
  heading: string
  isWorking: boolean
  bars: readonly {
    isSelected: boolean
    glyph?: string
    // A staged block's opening words, and its comment.
    opening: string
    comment: string
    // Rows the block's bar takes.
    span: number
  }[]
  counter: string
}

// Fullscreen: one bar per block, its height by length; staged blocks carry
// their mark and opening words, a comment right under them.
export function MapView(
  { Box, Text, Button }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>,
  m: MapModel,
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
          </Text>
        </Box>
        {m.isWorking ? (
          <Text dimColor>...</Text>
        ) : (
          m.bars.map(b => {
            // Selected: a solid accent bar. Staged: a thick bar. The rest: thin
            // and dim. (Tracking which blocks the terminal shows was tried and
            // dropped: estimating rows from text was never steady enough.)
            const bar = b.isSelected ? '█' : b.glyph ? '┃' : '│'
            const tone = { color: b.isSelected ? ACCENT : undefined, dimColor: !b.isSelected && !b.glyph }
            // Each row is one Text of fixed length; pieces side by side broke
            // the layout. The comment sits right under the block's first row:
            // in its own second row, or one more row when it has none.
            return (
              <Box flexDirection="column">
                {Array.from({ length: Math.max(b.span, b.comment ? 2 : 1) }, (_, row) => (
                  <Text {...tone} wrap="truncate">
                    {b.glyph && row === 0
                      ? `${bar} ${b.glyph} ${b.opening}`
                      : b.comment && row === 1
                        ? `${bar}   → ${b.comment}`
                        : bar}
                  </Text>
                ))}
              </Box>
            )
          })
        )}
        <Text dimColor wrap="truncate">
          ▼ {m.counter}
        </Text>
        {/* Focus stops for ←→ and the hotkeys, hidden: the reply's menu under
            the selected block is where the cursor shows. Always drawn, so focus
            has somewhere to land when the comment field closes. */}
        <Box display="none">
          {VERBS.map((v, n) => (
            <Button
              key={v.key}
              plain
              hotkey={v.hotkey}
              autoFocus={n === 0 ? true : undefined}
              label={v.glyph}
              onPress={() => actions.verb(v.key)}
            />
          ))}
        </Box>
        {field && <Box>{field}</Box>}
      </Box>
      <Text> </Text>
    </Box>
  )
}
