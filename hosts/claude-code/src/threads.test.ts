// No session, no mock `$`: a thread in, prompts and summaries out.

import { expect, test } from 'claude-code/testing'

import { anchorOf, clearedThreads, hasThread, needsSummary, NEW_THREAD, parseAnswer, summaries, summaryPrompt, threadPrompt, withAnswer } from './threads'
import type { Thread } from './threads'

const talked: Thread = {
  ...NEW_THREAD,
  messages: [
    { role: 'person', text: 'why not memcached?' },
    { role: 'agent', text: 'No persistence.' },
  ],
}

test('a thread message carries the block, the thread so far and the new message', () => {
  const prompt = threadPrompt({ block: 'Use Redis' }, talked, 'and the TTL?')
  expect(prompt).toContain('"""\nUse Redis\n"""')
  expect(prompt).toContain('Person: why not memcached?\n\nYou: No persistence.')
  expect(prompt).toContain('Their message:\nand the TTL?')
  // It asks for the summary and the verdict after the answer.
  expect(prompt).toContain('<verdict>include</verdict> or <verdict>exclude</verdict>')
  expect(prompt).toContain('Actions: what to do')
})

test('the first message has no thread so far', () => {
  expect(threadPrompt({ block: 'Use Redis' }, NEW_THREAD, 'why?')).not.toContain('The thread so far')
})

test('the summary prompt says what the summary is for, and carries the thread', () => {
  const prompt = summaryPrompt({ block: 'Use Redis' }, talked)
  expect(prompt).toContain("for the person's next prompt to you")
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

const RAW = 'Use a TTL.\n\n<summary>\nAdd a 5-minute TTL.\n</summary>\n<verdict>include</verdict>'

test('an answer splits into what the person reads, the summary and the verdict', () => {
  expect(parseAnswer(RAW)).toEqual({ text: 'Use a TTL.', summary: 'Add a 5-minute TTL.', verdict: 'include' })
})

test('without a summary the answer is all text; a summary needs no verdict', () => {
  expect(parseAnswer('Just text.')).toEqual({ text: 'Just text.' })
  expect(parseAnswer('Text.\n<summary>x</summary>')).toEqual({ text: 'Text.', summary: 'x' })
})

test('what a message asks after the answer follows the switch', () => {
  const ask = (t: Thread) => threadPrompt({ block: 'Use Redis' }, t, 'and?')
  // Untouched: the summary and a verdict.
  expect(ask(talked)).toContain('<verdict>include</verdict> or <verdict>exclude</verdict>')
  // Switched on by the person: the summary, something to send, no verdict.
  const on = ask({ ...talked, included: true, isIncludeSet: true })
  expect(on).toContain('<summary>')
  expect(on).toContain('chose to include this thread')
  expect(on).not.toContain('<verdict>')
  // Switched off by them: the answer alone.
  const off = ask({ ...talked, included: false, isIncludeSet: true })
  expect(off).not.toContain('<summary>')
  expect(off).not.toContain('<verdict>')
  expect(off.trimEnd().endsWith('and?')).toBe(true)
})

test('an answer with a summary and no verdict leaves the switch as it is', () => {
  const set = { ...talked, included: true, isIncludeSet: true, pending: 1 }
  expect(withAnswer(set, 'Sure.\n<summary>\nContext: Redis only.\n</summary>')).toMatchObject({ included: true, summary: 'Context: Redis only.' })
  expect(withAnswer({ ...talked, pending: 1 }, 'Sure.\n<summary>\nKeep it.\n</summary>').included).toBe(false)
})

test('a summary written for a thread the person switched on sends something', () => {
  expect(summaryPrompt({ block: 'Use Redis' }, { ...talked, included: true, isIncludeSet: true, summary: 'Keep it.' })).toContain('chose to include this thread')
})

test('an empty summary with exclude is a thread with nothing to send', () => {
  expect(parseAnswer('It caches.\n<summary>\n</summary>\n<verdict>exclude</verdict>')).toEqual({ text: 'It caches.', summary: '', verdict: 'exclude' })
})

test("the answer's verdict sets the switch, until the person sets it", () => {
  const waiting = { ...talked, pending: 1, messages: [...talked.messages, { role: 'person' as const, text: 'TTL?' }] }
  const answered = withAnswer(waiting, RAW)
  expect(answered).toMatchObject({ included: true, summary: 'Add a 5-minute TTL.', summarizedAt: 4, pending: 0 })
  expect(needsSummary(answered)).toBe(false)
  expect(withAnswer({ ...waiting, included: false, isIncludeSet: true }, RAW).included).toBe(false)
})

test('an answer without its summary leaves the last one, to be rewritten on close', () => {
  const summarised = { ...talked, included: true, summary: 'Keep Redis.', summarizedAt: 2, pending: 1 }
  const answered = withAnswer({ ...summarised, messages: [...summarised.messages, { role: 'person' as const, text: 'and?' }] }, 'Plain.')
  expect(answered.summary).toBe('Keep Redis.')
  expect(needsSummary(answered)).toBe(true)
})

test('an empty summary, included by the person, is written anyway', () => {
  const empty = { ...talked, summary: '', summarizedAt: 2 }
  expect(needsSummary(empty)).toBe(false)
  expect(needsSummary({ ...empty, included: true })).toBe(true)
  expect(summaryPrompt({ block: 'Use Redis' }, { ...empty, included: true })).toContain('chose to include this thread')
  expect(summaryPrompt({ block: 'Use Redis' }, talked)).not.toContain('chose to include this thread')
})

const CODE = '```ts\nconst a = 1\nconst b = 2\n```'
const TABLE = '| Option | Latency |\n|---|---|\n| Redis | low |\n| Postgres | medium |'

test('a block key anchors on the block; a line key on that line, in its fences', () => {
  expect(anchorOf(CODE, '3')).toEqual({ block: CODE })
  expect(anchorOf(CODE, '3.1')).toEqual({
    block: CODE,
    part: { source: '```ts\nconst b = 2\n```', text: 'const b = 2', reference: 'line 2: "const b = 2"' },
  })
  expect(anchorOf(CODE, '3.2')).toBeUndefined()
  expect(anchorOf('Plain text.', '3.0')).toBeUndefined()
})

test('a table row anchors under its table\'s header', () => {
  expect(anchorOf(TABLE, '0.1')?.part).toEqual({
    source: '| Option | Latency |\n|---|---|\n| Postgres | medium |',
    text: 'Postgres · medium',
    reference: 'row 2: "Postgres · medium"',
  })
})

test('a thread on a line tells the fork which line, with the whole block', () => {
  const prompt = threadPrompt(anchorOf(CODE, '3.1')!, NEW_THREAD, 'why?')
  expect(prompt).toContain('const a = 1\nconst b = 2')
  expect(prompt).toContain('The thread is about line 2: "const b = 2" of this block')
  expect(summaryPrompt(anchorOf(CODE, '3.1')!, talked)).toContain('The thread is about line 2')
  expect(threadPrompt({ block: CODE }, NEW_THREAD, 'why?')).not.toContain('The thread is about')
})

test("a clear takes out a line's own thread, or a block's, or else its lines'", () => {
  const on = { ...talked, included: true }
  const threads = { '3': on, '3.1': on, '3.2': on, '3.4': talked, '4.1': on }
  expect(clearedThreads(threads, false, '3.1')).toEqual(['3.1'])
  // The block's own included thread is its own: its lines stay.
  expect(clearedThreads(threads, false, 3)).toEqual(['3'])
  // So is its mark: nothing of its own to take out, its lines stay.
  expect(clearedThreads({ '3.1': on }, true, 3)).toEqual([])
  // Nothing of its own: every included thread on its lines.
  expect(clearedThreads({ '3.1': on, '3.2': on, '3.4': talked, '4.1': on }, false, 3)).toEqual(['3.1', '3.2'])
})
