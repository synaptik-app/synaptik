// The key setup's drawing (D38): its rows or one setting's options, then what
// Save would change and what that gives up. Plain data and one callback in —
// no `$` (register.tsx builds the model and owns the actions).

import type { Elements } from 'claude-code'

import { ACCENT, PANE_ANCHOR } from '../ui'

export type KeyMenuModel = {
  view: 'rows' | 'options'
  rows: readonly { text: string; isAt: boolean; hasGapAfter?: boolean }[]
  // The setting whose options are open, and those options.
  editing: string
  options: readonly { text: string; isAt: boolean; isNow: boolean }[]
  note?: string
  changed: readonly string[]
  costs: readonly { line: string; isTip?: true }[]
  // The file, as the menu shows it (`~/.claude/keybindings.json`).
  shown: string
  bodyRows: number
}

export function KeyMenuView(
  { Box, Text, Button }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>,
  m: KeyMenuModel,
  onEnter: () => void,
) {
  // As the navigator's map: the tree one row taller than the window each way,
  // pinned at offset 1, so ↑/↓ always raise ui.scroll (the scroll trick).
  const rows = Math.max(6, m.bodyRows)
  const tone = (isAt: boolean) => ({ color: isAt ? ACCENT : undefined })
  return (
    <Box flexDirection="column" height={rows + 2} overflow="hidden">
      <Text> </Text>
      <Box flexDirection="column" height={rows} overflow="hidden" paddingLeft={1}>
        <Box flexDirection="row">
          <Button key={PANE_ANCHOR} plain dimColor label="" onPress={() => undefined} />
          <Text bold>Synaptik keys</Text>
          <Text dimColor> · default renderer</Text>
        </Box>
        <Text dimColor>{m.view === 'rows' ? '↑↓ move · ⏎ change · esc: discard changes' : '↑↓ choose · ⏎ select'}</Text>
        <Text> </Text>
        {m.view === 'rows'
          ? m.rows.map(row => (
              <Box flexDirection="column">
                <Text {...tone(row.isAt)} wrap="truncate">
                  {`${row.isAt ? '▸' : ' '} ${row.text}`}
                </Text>
                {row.hasGapAfter && <Text> </Text>}
              </Box>
            ))
          : [
              <Text dimColor>{m.editing}</Text>,
              ...m.options.map(option => (
                <Text {...tone(option.isAt)} wrap="truncate">
                  {`${option.isAt ? '▸' : ' '} ${option.text}${option.isNow ? '  (now)' : ''}`}
                </Text>
              )),
            ]}
        {m.note && <Text color="yellow">{m.note}</Text>}
        <Text> </Text>
        {m.changed.length === 0 ? (
          <Text dimColor wrap="truncate">{`No changes to ${m.shown}`}</Text>
        ) : (
          <Box flexDirection="column">
            <Text dimColor wrap="truncate">{`Save changes ${m.shown}:`}</Text>
            {m.changed.map(line => (
              <Text>{`  ${line}`}</Text>
            ))}
            {m.costs.map(note =>
              note.isTip ? <Text dimColor>{`  ${note.line}`}</Text> : <Text color="yellow">{`  ${note.line}`}</Text>,
            )}
          </Box>
        )}
        {/* ⏎ lands here; ↑/↓ arrive as scrolls. Hidden: the ▸ row shows where. */}
        <Box display="none">
          <Button key="key-enter" plain autoFocus label="⏎" onPress={onEnter} />
        </Box>
      </Box>
      <Text> </Text>
    </Box>
  )
}
