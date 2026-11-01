import { expect, test } from 'claude-code/testing'

import { tableLayout, wrap } from './table'

const TABLE = '| A | B |\n|---|---|\n| x | one two three four |\n| y | z |'

test('a table with room: border, header and rule, then a row and a rule each', () => {
  expect(tableLayout(TABLE, 80)).toEqual({ spans: [{ top: 3, height: 1 }, { top: 5, height: 1 }], end: 7 })
})

test('a row is as tall as its tallest wrapped cell, and the next starts past its rule', () => {
  expect(tableLayout(TABLE, 21)).toEqual({ spans: [{ top: 3, height: 3 }, { top: 7, height: 1 }], end: 9 })
})

test('a wrapped header pushes every row down', () => {
  const table = '| A | one two three four |\n|---|---|\n| x | y |'
  expect(tableLayout(table, 21).spans).toEqual([{ top: 5, height: 1 }])
})

test('with no room for the grid it is a list: each row its cells, a rule between', () => {
  expect(tableLayout(TABLE, 12)).toEqual({ spans: [{ top: 0, height: 4 }, { top: 5, height: 2 }], end: 7 })
})

test('inline marks take no room', () => {
  const marked = '| A |\n|---|\n| **bold** `code` [link](https://example.com/long) |\n| y |'
  const bare = '| A |\n|---|\n| bold code link |\n| y |'
  expect(tableLayout(marked, 18)).toEqual(tableLayout(bare, 18))
})

test('an escaped pipe stays in its cell', () => {
  expect(tableLayout('| A | B |\n|---|---|\n| x \\| y | z |', 80).spans).toEqual([{ top: 3, height: 1 }])
})

test('past 200 rows Claude Code draws a note, and no more rows', () => {
  const rows = Array.from({ length: 201 }, (_, n) => `| ${n} |`).join('\n')
  const { spans, end } = tableLayout(`| A |\n|---|\n${rows}`, 80)
  expect(spans.length).toBe(200)
  expect(end).toBe(3 + 200 * 2 + 1)
})

test('wrap keeps spaces where a line breaks, and cuts a long word only when hard', () => {
  expect(wrap('one two three four', 7)).toEqual(['one two', ' three ', 'four'])
  expect(wrap('abcdefgh', 3)).toEqual(['abcdefgh'])
  expect(wrap('abcdefgh', 3, true)).toEqual(['abc', 'def', 'gh'])
})
