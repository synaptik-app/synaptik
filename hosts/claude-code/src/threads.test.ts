// No session, no mock `$`: a thread in, prompts and summaries out.

import { expect, test } from 'claude-code/testing'

import { hasThread, needsSummary, NEW_THREAD, summaries, summaryPrompt, threadPrompt } from './threads'
import type { Thread } from './threads'

const talked: Thread = {
  ...NEW_THREAD,
  messages: [
    { role: 'person', text: 'why not memcached?' },
    { role: 'agent', text: 'No persistence.' },
  ],
}

test('a thread message carries the block, the thread so far and the new message', () => {
  const prompt = threadPrompt('Use Redis', talked, 'and the TTL?')
  expect(prompt).toContain('"""\nUse Redis\n"""')
  expect(prompt).toContain('Person: why not memcached?\n\nYou: No persistence.')
  expect(prompt.endsWith('Their message:\nand the TTL?')).toBe(true)
})

test('the first message has no thread so far', () => {
  expect(threadPrompt('Use Redis', NEW_THREAD, 'why?')).not.toContain('The thread so far')
})

test('the summary prompt says what the summary is for, and carries the thread', () => {
  const prompt = summaryPrompt('Use Redis', talked)
  expect(prompt).toContain('goes into their next prompt to you')
  expect(prompt).toContain('Person: why not memcached?')
})

test('a summary is written when included and the thread grew since the last one', () => {
  expect(needsSummary(talked)).toBe(false)
  expect(needsSummary({ ...talked, included: true })).toBe(true)
  expect(needsSummary({ ...talked, included: true, summarizedAt: 2 })).toBe(false)
  expect(needsSummary({ ...talked, included: true, pending: 1 })).toBe(false)
})

test('only included threads with a summary are sent', () => {
  const threads = {
    '1': { ...talked, included: true, summary: ' Keep Redis. ' },
    '2': { ...talked, included: false, summary: 'Not this.' },
    '3': { ...talked, included: true },
  }
  expect(summaries(threads)).toEqual({ '1': 'Keep Redis.' })
})

test('a block has a thread once a message was sent', () => {
  expect(hasThread({ '1': talked, '2': NEW_THREAD }, 1)).toBe(true)
  expect(hasThread({ '1': talked, '2': NEW_THREAD }, 2)).toBe(false)
  expect(hasThread({}, 3)).toBe(false)
})
