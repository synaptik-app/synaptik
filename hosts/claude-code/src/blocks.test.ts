// No session, no mock `$`: a reply's text in, its blocks out.

import { expect, test } from 'claude-code/testing'

import { chunk, partCounts, quote, segment, tableCells, tableRows } from './blocks'

const REPLY = `Here's what I'd suggest:

1. Use Redis for the session cache
   - per-user key prefix
   - 5 minute TTL
2. Add a rate limiter

Run the migration before deploying.`

test('splits the SPEC §3 example into six blocks', async () => {
  const blocks = segment(REPLY).filter(s => s.isBlock)

  expect(blocks.map(b => quote(b.text))).toEqual([
    "Here's what I'd suggest:",
    '1. Use Redis for the session cache',
    'per-user key prefix',
    '5 minute TTL',
    '2. Add a rate limiter',
    'Run the migration before deploying.',
  ])
  expect(blocks.map(b => b.depth)).toEqual([0, 0, 1, 1, 0, 0])
})

test('keeps headings out of the blocks and fences whole', async () => {
  const segments = segment('## Plan\n\n```sh\nnpm test\n\nnpm run build\n```')

  expect(segments.map(s => s.isBlock)).toEqual([false, true])
  expect(segments[1]!.text).toContain('npm run build')
})

test('chunk: a block under the limit is one piece', async () => {
  expect(chunk('short')).toEqual(['short'])
})

test('chunk: a long code block splits at lines, each piece fenced again', async () => {
  const code = '```ts\n' + Array.from({ length: 300 }, (_, i) => `line ${i} `.padEnd(60, '.')).join('\n') + '\n```'
  const pieces = chunk(code)
  expect(pieces.length).toBeGreaterThan(1)
  for (const p of pieces) {
    expect(p.length).toBeLessThanOrEqual(10_000)
    expect(p.startsWith('```ts\n')).toBe(true)
    expect(p.endsWith('\n```')).toBe(true)
  }
  const inner = pieces.map(p => p.slice('```ts\n'.length, -'\n```'.length)).join('\n')
  expect(inner).toBe(code.slice('```ts\n'.length, -'\n```'.length))
})

test('chunk: prose splits at lines, and a single line longer than a piece is cut', async () => {
  const text = 'a'.repeat(25_000) + '\nlast line'
  const pieces = chunk(text)
  expect(pieces.every(p => p.length <= 10_000)).toBe(true)
  expect(pieces.join('\n').replace(/\n/g, '')).toBe(text.replace(/\n/g, ''))
})

test('a table row\'s cells, an escaped pipe staying in its cell', () => {
  expect(tableCells('| a | b \\| c |')).toEqual(['a', 'b \\| c'])
  expect(tableCells('a | b')).toEqual(['a', 'b'])
})

test('a table\'s data rows, its cells joined; any other block has none', () => {
  expect(tableRows('| A | B |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |')).toEqual(['1 · 2', '3 · 4'])
  expect(tableRows('just a paragraph')).toBeUndefined()
})

test('a table steps through the 200 rows Claude Code draws', () => {
  const rows = Array.from({ length: 201 }, (_, n) => `| ${n} |`).join('\n')
  const steps = tableRows(`| A |\n|---|\n${rows}`)!
  expect(steps.length).toBe(200)
  expect(steps.at(-1)).toBe('199')
})

test('partCounts has each steppable block by its index, and a table with no rows has none', () => {
  const reply = 'Text.\n\n| A |\n|---|\n| 1 |\n| 2 |\n\n```js\na\nb\nc\n```\n\n| A |\n|---|'
  expect(partCounts(reply)).toEqual({ '1': 2, '2': 3 })
})
