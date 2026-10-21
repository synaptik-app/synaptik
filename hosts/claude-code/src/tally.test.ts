// No session, no mock `$`: marks and comments in, counts out.

import { expect, test } from 'claude-code/testing'

import { commentCount, glyphCounts, summary } from './tally'

test('summary: each kind counted, zero counts left out', async () => {
  expect(summary({ 0: 'accept', 2: 'accept', 3: 'reject' }, {})).toBe('2 accepted · 1 rejected')
  expect(summary({}, {})).toBe('')
})

test('summary: a comment counts only with text', async () => {
  expect(summary({ 1: 'comment', 4: 'comment' }, { 1: 'too vague', 4: '  ' })).toBe('1 comment')
  expect(summary({ 1: 'comment', 4: 'comment' }, { 1: 'a', 4: 'b' })).toBe('2 comments')
})

test('glyphCounts: the heading, in accept, reject, comment order', async () => {
  expect(glyphCounts({ 3: 'comment', 0: 'reject', 1: 'accept', 2: 'accept' })).toBe('✓2 ✗1 ✎1')
  expect(glyphCounts({})).toBe('')
})

test('commentCount: marked to comment, with text', async () => {
  expect(commentCount({ 1: 'comment', 2: 'accept' }, { 1: 'x', 2: 'stray' })).toBe(1)
})
