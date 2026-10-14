// SPIKE — throwaway. Answers SPEC §15: does `claude plugin test` run a src/
// test with no session, and with no mock `$`?

import { expect, test } from 'claude-code/testing'

import { quote, segment } from './spike-blocks'

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
    'Use Redis for the session cache',
    'per-user key prefix',
    '5 minute TTL',
    'Add a rate limiter',
    'Run the migration before deploying.',
  ])
  expect(blocks.map(b => b.depth)).toEqual([0, 0, 1, 1, 0, 0])
})

test('keeps headings out of the blocks and fences whole', async () => {
  const segments = segment('## Plan\n\n```sh\nnpm test\n\nnpm run build\n```')

  expect(segments.map(s => s.isBlock)).toEqual([false, true])
  expect(segments[1]!.text).toContain('npm run build')
})
