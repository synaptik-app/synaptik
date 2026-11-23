// No session, no mock `$`: a thread pane's Markdown, laid out for its width.

import { expect, test } from 'claude-code/testing'

import { forPane, rowRecord } from './pane'

const WIDE = [
  '| Where | What it shows |',
  '|---|---|',
  "| The thread pane | That thread's agent, its status, and `open` to switch to its view |",
  '| **The band** | Nothing |',
].join('\n')

test('a table whose grid fits the pane is left to Claude Code', () => {
  const small = '| A | B |\n|---|---|\n| one | two |'
  expect(forPane(small, 40)).toBe(small)
})

test("a table whose grid doesn't fit the pane becomes records, one field a line, a blank line between rows", () => {
  expect(forPane(`Before.\n\n${WIDE}\n\nAfter.`, 50)).toBe(
    [
      'Before.',
      '',
      '**Where:** The thread pane  ',
      "**What it shows:** That thread's agent, its status, and `open` to switch to its view",
      '',
      '**Where:** **The band**  ',
      '**What it shows:** Nothing',
      '',
      'After.',
    ].join('\n'),
  )
  // Wide enough for the whole grid, it stays one.
  expect(forPane(WIDE, 120)).toBe(WIDE)
})

test('a table inside a code fence is code, and stays as written', () => {
  const fenced = '```\n' + WIDE + '\n```'
  expect(forPane(fenced, 30)).toBe(fenced)
})

test('an escaped pipe stays in its cell; an empty header and an empty cell', () => {
  const table = '| | Note |\n|---|---|\n| a \\| b | |\n| c | long enough to not fit a narrow pane at all |'
  expect(forPane(table, 30)).toBe(['**Column 1:** a \\| b', '', '**Column 1:** c  ', '**Note:** long enough to not fit a narrow pane at all'].join('\n'))
})

test("a table in a list item keeps the item's indent", () => {
  const nested = '- Options:\n\n  | Option | Why it was picked over the others |\n  |---|---|\n  | Redis | durability across restarts and replicas |'
  expect(forPane(nested, 30)).toBe('- Options:\n\n  **Option:** Redis  \n  **Why it was picked over the others:** durability across restarts and replicas')
})

test("a thread's row is a record, whatever the width; a code line stays as it is", () => {
  expect(rowRecord('| Option | Latency |\n|---|---|\n| Redis | low |')).toBe('**Option:** Redis  \n**Latency:** low')
  expect(rowRecord('```ts\nconst b = 2\n```')).toBe('```ts\nconst b = 2\n```')
})

test('wide characters count two columns each', () => {
  const cjk = '| 名前 | 説明 |\n|---|---|\n| キャッシュ | セッションを再起動後も保持する |'
  // 1 + 2 * 3 + 10 + 30 = 47 columns as a grid.
  expect(forPane(cjk, 47)).toBe(cjk)
  expect(forPane(cjk, 46)).not.toBe(cjk)
})
