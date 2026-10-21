// No session, no mock `$`: text and sizes in, rows out.

import { expect, test } from 'claude-code/testing'

import { classicRows, clip, CLASSIC_MIN_ROWS, drawnRows, minimap } from './layout'

test('clip: cut with three plain dots, or left whole', async () => {
  expect(clip('Use Redis for the session cache', 9)).toBe('Use Redis...')
  expect(clip('short', 9)).toBe('short')
})

test('drawnRows: prose wraps by length', async () => {
  expect(drawnRows('x'.repeat(25), 10)).toBe(3)
  expect(drawnRows('one\ntwo', 10)).toBe(2)
  expect(drawnRows('', 10)).toBe(1)
})

test('drawnRows: a table as drawn, a border around and between its rows', async () => {
  expect(drawnRows('| a | b |\n|---|---|\n| 1 | 2 |\n| 3 | 4 |', 80)).toBe(7)
})

test('drawnRows: a code block without its fences', async () => {
  expect(drawnRows('```ts\nconst a = 1\nconst b = 2\n```', 80)).toBe(2)
})

test('classicRows: the tallest block plus six, between a floor and a third of the screen', async () => {
  const screen = { columns: 120, rows: 60 }
  expect(classicRows('Short.\n\nAlso short.', screen)).toBe(CLASSIC_MIN_ROWS)
  expect(classicRows('```\n' + 'line\n'.repeat(8) + '```', screen)).toBe(8 + 6)
  expect(classicRows('```\n' + 'line\n'.repeat(40) + '```', screen)).toBe(20)
})

test('minimap: heights fill the rows exactly, at least one each, by length', async () => {
  const heights = minimap([10, 30, 60], 10)
  expect(heights.reduce((a, b) => a + b, 0)).toBe(10)
  expect(heights.every(h => h >= 1)).toBe(true)
  expect(heights[2]!).toBeGreaterThan(heights[0]!)
  expect(minimap([5, 5], 2)).toEqual([1, 1])
})
