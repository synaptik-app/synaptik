// No session, no mock `$`.

import { expect, test } from 'claude-code/testing'

import { blockCounter } from './counter'

test('the selected block, counted from one', async () => {
  expect(blockCounter(2, 12)).toBe('Block 3 of 12')
})

test('no blocks: nothing, never "Block 1 of 0"', async () => {
  expect(blockCounter(0, 0)).toBe('')
})

test('a selection past the end reads as the last block', async () => {
  expect(blockCounter(5, 3)).toBe('Block 3 of 3')
})
