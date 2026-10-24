// No session, no mock `$`: the nesting fixture's cases, as plain data.

import { expect, test } from 'claude-code/testing'

import { segment } from './blocks'
import { compile } from './compile'

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
