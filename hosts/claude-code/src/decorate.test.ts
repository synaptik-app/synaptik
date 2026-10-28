// No session, no mock `$`: the glyph colours for feedback in the prompt box.

import { expect, test } from 'claude-code/testing'

import { decorate } from './decorate'

const FEEDBACK = ['"1. Cache sessions"', '    ✗ "expire after 5 minutes"', '✓ "2. Rate-limit"', '✎ "3. Index" → per account'].join('\n')

test('the glyph leading each line is coloured, indented ones too', async () => {
  expect(decorate(FEEDBACK).map(p => [FEEDBACK.slice(p.start, p.end), p.color])).toEqual([
    ['✗', 'error'],
    ['✓', 'success'],
    ['✎', 'suggestion'],
  ])
})

test('offsets follow edits: a line added before shifts every run', async () => {
  const edited = 'please:\n' + FEEDBACK
  expect(decorate(edited).map(p => edited.slice(p.start, p.end))).toEqual(['✗', '✓', '✎'])
})

test('a glyph inside a line, or a prompt without feedback, is left alone', async () => {
  expect(decorate('fix the tests ✓ thanks')).toEqual([])
  expect(decorate('')).toEqual([])
})
