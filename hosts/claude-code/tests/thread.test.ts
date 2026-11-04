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
  // No summary yet: it is written when the pane closes, so nothing is sent.
  expect(suggested()).not.toContain('💬')
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

test('a \\ then ⏎ in the field is a line break, not a send', async ($, on) => {
  await openThread($, on)
  await send($, 'first line\\')
  expect(forks).toHaveLength(0)
  const field = await inPane($, async pane => (await pane.find({ type: 'Input' }))!)
  expect(field.props.value).toBe('first line\n')
  expect(field.props.rows).toBeGreaterThan(1)
  await send($, 'first line\nsecond')
  expect(forks[0]).toContain('Their message:\nfirst line\nsecond')
})
