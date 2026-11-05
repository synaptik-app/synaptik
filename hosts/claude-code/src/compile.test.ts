// No session, no mock `$`: the nesting fixture's cases, as plain data.

import { expect, test } from 'claude-code/testing'

import { segment } from './blocks'
import { compile, oneLine, preview } from './compile'

const NESTING = `1. Top level, numbered
   - Second level, bullet
     - Third level, bullet
   - Second level again
2. Top level, numbered, with a second paragraph

   This paragraph belongs to item 2 and should stay part of the same block.
3. Top level, numbered
   1. Second level, numbered
   2. Second level, numbered`

const blocks = segment(NESTING).filter(s => s.isBlock)

const CODE = segment('Before.\n\n```ts\nconst a = 1\n\n  const b = 2\nconst long = "' + 'x'.repeat(70) + '"\n```').filter(s => s.isBlock)

test('a marked code line nests under its block, as a plain quote for context', async () => {
  expect(compile(CODE, { '1.2': 'reject', '1.0': 'accept' }, {})).toBe(
    ['"const a = 1 const b =..." (code block)', '    ✓ line 1: "const a = 1"', '    ✗ line 3: "const b = 2"'].join('\n'),
  )
})

test('a code line and its block can both be marked', async () => {
  expect(compile(CODE, { 1: 'accept', '1.0': 'reject' }, {})).toBe(['✓ "const a = 1 const b =..."', '    ✗ line 1: "const a = 1"'].join('\n'))
})

test('a blank code line is its number, a long one is trimmed', async () => {
  expect(compile(CODE, { '1.1': 'accept' }, {})).toContain('    ✓ line 2 (blank)')
  expect(compile(CODE, { '1.3': 'accept' }, {})).toContain(`    ✓ line 4: "${('const long = "' + 'x'.repeat(70)).slice(0, 60)}..."`)
})

test('a comment on a code line lines up under it; an empty one is not sent', async () => {
  const lead = '    ✎ line 1: "const a = 1" → '
  expect(compile(CODE, { '1.0': 'comment' }, { '1.0': 'one\ntwo' })).toContain(`${lead}one\n${' '.repeat(lead.length)}two`)
  expect(compile(CODE, { '1.0': 'comment' }, {})).toBe('')
})

test('line 10 of a block is not line 1', async () => {
  const long = segment('```\n' + Array.from({ length: 12 }, (_, i) => `l${i}`).join('\n') + '\n```').filter(s => s.isBlock)
  expect(compile(long, { '0.10': 'accept' }, {})).toContain('✓ line 11: "l10"')
  expect(compile(long, { '0.10': 'accept' }, {})).not.toContain('line 2')
})

test('a marked table row nests under the table, with its cells', async () => {
  const table = segment('| A | B |\n|---|---|\n| one | two |\n| three | |').filter(s => s.isBlock)
  expect(compile(table, { '0.1': 'reject' }, {})).toBe(['"table: A · B"', '    ✗ row 2: "three ·"'].join('\n'))
})

test('a table row with no text compiles as blank, with one column or several', async () => {
  const wide = segment('| A | B |\n|---|---|\n| | |').filter(s => s.isBlock)
  expect(compile(wide, { '0.0': 'reject' }, {})).toContain('✗ row 1 (blank)')
  const narrow = segment('| A |\n|---|\n| |').filter(s => s.isBlock)
  expect(compile(narrow, { '0.0': 'reject' }, {})).toContain('✗ row 1 (blank)')
})

test("an included thread's summary nests under the block's quote, after the 💬", async () => {
  const blocks = segment('Use Redis for the session cache.\n\nAnother block.').filter(s => s.isBlock)
  expect(compile(blocks, {}, {}, { '0': 'Keep Redis.\n\nDrop the fallback.' })).toBe(
    ['💬 "Use Redis for the session cache."', '    Keep Redis.', '    Drop the fallback.'].join('\n'),
  )
})

test('with a mark, the summary comes under the mark, led by its 💬', async () => {
  const blocks = segment('Use Redis.').filter(s => s.isBlock)
  expect(compile(blocks, { '0': 'reject' }, {}, { '0': 'Use memcached.\nAdd a TTL.' })).toBe(
    ['✗ "Use Redis."', '    💬 Use memcached.', '       Add a TTL.'].join('\n'),
  )
})

test('a summary on a nested item brings its parent as context', async () => {
  const blocks = segment('1. Parent\n   - child').filter(s => s.isBlock)
  expect(compile(blocks, {}, {}, { '1': 'Drop it.' })).toBe(['"1. Parent"', '    💬 "child"', '        Drop it.'].join('\n'))
})

test("a line's summary nests under it, its block quoted as context", async () => {
  const blocks = segment('```ts\nconst a = 1\nconst b = 2\n```').filter(s => s.isBlock)
  expect(compile(blocks, {}, {}, { '0.1': 'Rename b.' })).toBe(
    ['"const a = 1 const b =..." (code block)', '    💬 line 2: "const b = 2"', '        Rename b.'].join('\n'),
  )
  expect(compile(blocks, { '0.1': 'reject' }, {}, { '0.1': 'Rename b.' })).toContain('    ✗ line 2: "const b = 2"\n        💬 Rename b.')
})

test('a preview keeps three lines and counts the rest', async () => {
  expect(preview('a\nb\nc')).toBe('a\nb\nc')
  expect(preview('a\nb\nc\nd')).toBe('a\nb\nc\n… (+1 line)')
  expect(preview('a\nb\nc\nd\ne')).toBe('a\nb\nc\n… (+2 lines)')
})

test('a list item with a second paragraph is one block', async () => {
  // 1, its two bullets and nested bullet, 2 with its paragraph, 3, 3.1, 3.2
  expect(blocks.length).toBe(8)
  expect(blocks[4]!.text).toContain('2. Top level, numbered, with a second paragraph')
  // indented under the item, so Markdown keeps it inside the list item
  expect(blocks[4]!.text).toContain('\n\n   This paragraph belongs to item 2')
})

test('numbered quotes keep their number, so alike items stay apart', async () => {
  const text = compile(blocks, { 5: 'accept', 6: 'reject' }, {})
  expect(text).toBe(
    ['✓ "3. Top level, numbered"', '    ✗ "1. Second level, numbered"'].join('\n'),
  )
})

test('an unmarked parent is sent as context for its marked child', async () => {
  const text = compile(blocks, { 3: 'comment' }, { 3: 'drop this' })
  expect(text).toBe(['"1. Top level, numbered"', '    ✎ "Second level again" → drop this'].join('\n'))
})

test('a comment with no text is not sent, and brings no context', async () => {
  expect(compile(blocks, { 3: 'comment' }, { 3: '  ' })).toBe('')
})

test('nests by parent, however deep the source indents', async () => {
  const deep = segment('- a\n    - b\n        - c\n- d').filter(s => s.isBlock)
  expect(compile(deep, { 2: 'reject', 3: 'accept' }, {})).toBe(
    ['"a"', '    "b"', '        ✗ "c"', '✓ "d"'].join('\n'),
  )
})

test('a comment of several lines: the rest lined up under its first character', async () => {
  const text = compile(blocks, { 3: 'comment' }, { 3: 'too short\nalso per user\n\nnot global  ' })
  const pad = ' '.repeat('    ✎ "Second level again" → '.length)
  expect(text).toBe(
    ['"1. Top level, numbered"', '    ✎ "Second level again" → too short', `${pad}also per user`, '', `${pad}not global`].join('\n'),
  )
})

test('oneLine: the first line, and how many more', async () => {
  expect(oneLine('just one')).toBe('just one')
  expect(oneLine('first\nsecond')).toBe('first (+1 line)')
  expect(oneLine('  first\nsecond\nthird \n')).toBe('first (+2 lines)')
})
