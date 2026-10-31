// No session, no mock `$`: where a text selection belongs in the reply (#91).

import { expect, test } from 'claude-code/testing'

import { endingBlock, loose } from './selection'

const BLOCKS = ['A **bold** word', '- `SESSION_CACHE` in config', '| Option | Latency |\n|---|---|\n| Redis | low |']

test('the block holding the last selected line, whatever Markdown only the source has', async () => {
  expect(endingBlock('A bold word', BLOCKS)).toBe(0)
  expect(endingBlock('A bold\nSESSION_CACHE in', BLOCKS)).toBe(1)
})

test('a table comes as drawn: box characters, and a last line of only borders is skipped', async () => {
  expect(endingBlock('Option │ Latency │\n  ├────┼────┤\n  │ Redis  │ low', BLOCKS)).toBe(2)
  expect(endingBlock('Redis │ low │\n└────┴────┘', BLOCKS)).toBe(2)
})

test('text not in these blocks, or nothing to look for, is -1', async () => {
  expect(endingBlock('from an older reply', BLOCKS)).toBe(-1)
  expect(endingBlock('  \n ──', BLOCKS)).toBe(-1)
})

test('readings that differ only in whitespace are one selection', async () => {
  expect(loose('  a\n    b ')).toBe(loose('a\n  b'))
})
