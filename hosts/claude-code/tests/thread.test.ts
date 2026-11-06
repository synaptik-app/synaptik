// Threads (SPEC §8, D45): d opens a block's pane, each message is a fork, and the
// switch includes the thread. The test kit can't raise a pane's close, so writing
// the summary is covered by src/threads.test.ts (needsSummary) and by hand.

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import { closed, forkAnswer, forks, fullscreen, log, opened, placement, start, suggested, synaptik, threadPane } from './engine'

const F = 'fullscreen'
const CACHE = 1
const PANE = `synaptik-thread-${CACHE}`

type Dollar = Parameters<typeof start>[0]
type Mounted = Awaited<ReturnType<typeof fullscreen>>

// A click on block `index`, then keys, in that block's Client.
async function clickAndPress(ui: Mounted, index: number, keys: string[]) {
  const clients = await ui.findAll({ type: 'Client' })
  const into = String(clients.find((c: FoundElement) => (c.props.props as { index: number }).index === index)!.key)
  await ui.pointer({ type: 'down', x: 4, y: 0, button: 'left', in: into })
  for (const key of keys) await ui.key({ key, in: into })
}

// As the fullscreen tests start a review: the band's ring on the first action.
const review = ($: Dollar) =>
  $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'verb-accept', origin: { kind: 'person' } })

async function openThread($: Dollar, on: Parameters<typeof start>[1]) {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  await clickAndPress(await fullscreen($, F), CACHE, ['d'])
}

// The thread's pane, mounted for one look or action, then unmounted: a pane is
// mounted once at a time.
async function inPane<T>($: Dollar, act: (pane: Awaited<ReturnType<typeof threadPane>>) => Promise<T>): Promise<T> {
  const pane = await threadPane($, CACHE)
  try {
    return await act(pane)
  } finally {
    await pane.unmount()
  }
}

const send = ($: Dollar, text: string) =>
  inPane($, async pane => pane.input({ key: String((await pane.find({ type: 'Input' }))!.key), text }))

const include = ($: Dollar) => inPane($, pane => pane.press({ key: `${PANE}-include` }))

test('d on a block opens its thread pane, with the keyboard', async ($, on) => {
  await openThread($, on)
  expect(opened.at(-1)).toEqual({ focus: true })
  expect(await log($)).toContain(`thread ${CACHE} open {"isPlaced":true}`)
})

test('too narrow to place it, the thread is closed again rather than left waiting', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  placement.isPlaced = false
  await clickAndPress(await fullscreen($, F), CACHE, ['d'])
  expect(closed).toContain(PANE)
})

test('a message is a fork that carries the block, and its answer shows in the pane', async ($, on) => {
  await openThread($, on)
  await send($, 'why Redis?')
  expect(forks).toHaveLength(1)
  expect(forks[0]).toContain('Cache sessions in Redis')
  expect(forks[0]).toContain('Their message:\nwhy Redis?')
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Markdown', text: 'An answer.' })))).toBe(true)
  await send($, 'and the TTL?')
  expect(forks[1]).toContain('Person: why Redis?\n\nYou: An answer.')
})

test('the switch includes the thread, and shows it', async ($, on) => {
  await openThread($, on)
  await send($, 'why Redis?')
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Button', text: '○ include in review' })))).toBe(true)
  await include($)
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Button', text: '✓ include in review' })))).toBe(true)
  // The answer came with no summary: switched on, it is written at once.
  expect(forks).toHaveLength(2)
  expect(forks[1]).toContain('chose to include this thread')
  expect(suggested()).toContain('💬 "1. Cache sessions in Redis"')
})

test('a block with a thread shows 💬 in the margin, in a review and outside one', async ($, on) => {
  await openThread($, on)
  await send($, 'why Redis?')
  // The thread took the keyboard, so the review let go: the reply is drawn plain.
  const plain = await fullscreen($, F)
  expect(await plain.find({ type: 'Text', text: '💬' })).toBeDefined()
  await plain.unmount()
  await review($)
  const ui = await fullscreen($, F)
  const clients = await ui.findAll({ type: 'Client' })
  const cache = clients.find((c: FoundElement) => (c.props.props as { index: number }).index === CACHE)!
  expect((cache.props.props as { glyph?: string }).glyph).toBe('💬')
})

test('Backspace on the block takes its thread out of the review, and keeps it', async ($, on) => {
  await openThread($, on)
  await send($, 'why Redis?')
  await include($)
  await review($)
  await clickAndPress(await fullscreen($, F), CACHE, ['backspace'])
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Button', text: '○ include in review' })))).toBe(true)
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Text', text: '› why Redis?' })))).toBe(true)
})

test("an answer's summary and include verdict reach the review at once", async ($, on) => {
  await openThread($, on)
  forkAnswer.text = 'Use a TTL.\n\n<summary>\nAdd a 5-minute TTL.\n</summary>\n<verdict>include</verdict>'
  await send($, 'and the TTL?')
  expect(suggested()).toBe(['💬 "1. Cache sessions in Redis"', '    Add a 5-minute TTL.'].join('\n'))
  // The person reads the answer without the summary's tags.
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Markdown', text: 'Use a TTL.' })))).toBe(true)
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Button', text: '✓ include in review' })))).toBe(true)
})

test('an exclude verdict sends nothing, and the switch set by hand stays as set', async ($, on) => {
  await openThread($, on)
  forkAnswer.text = 'It caches.\n<summary>\n</summary>\n<verdict>exclude</verdict>'
  await send($, 'what does it do?')
  expect(suggested()).not.toContain('💬')
  await include($)
  forkAnswer.text = 'Fine.\n<summary>\nKeep it.\n</summary>\n<verdict>exclude</verdict>'
  await send($, 'keep it then')
  expect(suggested()).toContain('    Keep it.')
})

test('switched on by hand, later answers keep it on and bring a summary, with no verdict asked', async ($, on) => {
  await openThread($, on)
  forkAnswer.text = 'It caches.\n<summary>\n</summary>\n<verdict>exclude</verdict>'
  await send($, 'what does it do?')
  forkAnswer.text = 'Context: Redis holds the sessions.'
  await include($)
  expect(suggested()).toContain('    Context: Redis holds the sessions.')
  forkAnswer.text = 'A minute.\n<summary>\nContext: Redis holds the sessions, for a minute each.\n</summary>'
  await send($, 'for how long?')
  expect(forks.at(-1)).not.toContain('<verdict>')
  expect(forks.at(-1)).toContain('chose to include this thread')
  expect(suggested()).toContain('    Context: Redis holds the sessions, for a minute each.')
  expect(await inPane($, async pane => Boolean(await pane.find({ type: 'Button', text: '✓ include in review' })))).toBe(true)
})

test('switched off by hand, a message asks for the answer alone', async ($, on) => {
  await openThread($, on)
  forkAnswer.text = 'Use a TTL.\n<summary>\nAdd a TTL.\n</summary>\n<verdict>include</verdict>'
  await send($, 'and the TTL?')
  await include($)
  await send($, 'thanks')
  expect(forks.at(-1)).not.toContain('<summary>')
  expect(suggested()).not.toContain('💬')
})

test('/synaptik off closes the open threads', async ($, on) => {
  await openThread($, on)
  await synaptik($, 'off')
  expect(closed).toContain(PANE)
})

test('switching on a thread with nothing to send writes its summary at once', async ($, on) => {
  await openThread($, on)
  forkAnswer.text = 'It caches.\n<summary>\n</summary>\n<verdict>exclude</verdict>'
  await send($, 'what does it do?')
  forkAnswer.text = 'Keep in mind that it caches per user.'
  await include($)
  expect(forks.at(-1)).toContain('chose to include this thread')
  expect(suggested()).toContain('    Keep in mind that it caches per user.')
})

test('the field is a fixed height, whatever is typed', async ($, on) => {
  await openThread($, on)
  const rows = async () => inPane($, async pane => (await pane.find({ type: 'Input' }))!.props.rows)
  expect(await rows()).toBe(6)
  await send($, 'a message long enough to wrap onto a second row, and then onto a third one as well')
  expect(await rows()).toBe(6)
})

// --- A thread on a code line or table row (fixtures/code.md) -----------------

const TS = 1
const LINE = `${TS}.1`

test('d on a code line opens its own thread, about that line of the block', async ($, on) => {
  await start($, on, 'code')
  await fullscreen($, 'code')
  await review($)
  await clickAndPress(await fullscreen($, 'code'), TS, ['s', 'down', 'd'])
  expect(await log($)).toContain(`thread ${LINE} open {"isPlaced":true}`)
  forkAnswer.text = 'It wraps.\n\n<summary>\nShorten line 2.\n</summary>\n<verdict>include</verdict>'
  const pane = await threadPane($, LINE)
  try {
    // The pane shows the line alone, in its block's fences.
    expect(await pane.find({ type: 'Markdown', text: /^```ts\n.*step onto this line, and the next\..*\n```$/ })).toBeDefined()
    await pane.input({ key: String((await pane.find({ type: 'Input' }))!.key), text: 'too long?' })
  } finally {
    await pane.unmount()
  }
  // The fork reads the whole block and which line.
  expect(forks[0]).toContain('The thread is about line 2: "step onto this line, and the next."')
  expect(suggested()).toContain('    💬 line 2: "step onto this line, and the next."\n        Shorten line 2.')
  // The line's margin has the 💬; the block's has none of its own.
  await review($)
  const ui = await fullscreen($, 'code')
  const clients = await ui.findAll({ type: 'Client' })
  const ts = clients.find((c: FoundElement) => (c.props.props as { index: number }).index === TS)!.props.props as {
    glyph?: string
    lineGlyphs: Record<string, string>
  }
  expect(ts.glyph).toBeUndefined()
  expect(ts.lineGlyphs).toEqual({ '1': '💬' })
})

test('clearing a code block takes its included line threads out of the review', async ($, on) => {
  await start($, on, 'code')
  await fullscreen($, 'code')
  await review($)
  await clickAndPress(await fullscreen($, 'code'), TS, ['s', 'down', 'd'])
  forkAnswer.text = 'It wraps.\n\n<summary>\nShorten line 2.\n</summary>\n<verdict>include</verdict>'
  const pane = await threadPane($, LINE)
  try {
    await pane.input({ key: String((await pane.find({ type: 'Input' }))!.key), text: 'too long?' })
  } finally {
    await pane.unmount()
  }
  expect(suggested()).toContain('💬 line 2')
  await review($)
  await clickAndPress(await fullscreen($, 'code'), TS, ['backspace'])
  expect(suggested()).not.toContain('💬')
})
