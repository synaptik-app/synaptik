// Marking selected text (#91): the actions on the band's hint row. Manual only:
// the drag itself, and that nothing moves while it happens.

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import { band, fullscreen, selection, start, suggested } from './engine'

const F = 'fullscreen'
const TEXT = 'expire after 5 minutes'
// The hint's menu, by cells: its lead, then each item's width.
const ACCEPT = 4
const COMMENT = 28

type Band = Awaited<ReturnType<typeof band>>
const hintKey = async (b: Band) =>
  String((await b.findAll({ type: 'Client' })).find((c: FoundElement) => String(c.key).startsWith('band-hint'))?.key)
const hintProps = async (b: Band) =>
  (await b.findAll({ type: 'Client' })).find((c: FoundElement) => String(c.key).startsWith('band-hint'))?.props.props as {
    selection?: string
    comment?: { text: string }
  }

async function poll($: Parameters<typeof band>[0], text?: string) {
  if (text === undefined) delete selection.text
  else selection.text = text
  const b = await band($)
  await b.post({ kind: 'poll' }, { in: await hintKey(b) })
  return band($)
}

test('text selected in the last reply puts the actions on the hint row, live', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  expect((await hintProps(await poll($, TEXT))).selection).toBe(TEXT)
  expect((await hintProps(await poll($, 'expire after'))).selection).toBe('expire after')
})

test('nothing selected, or text from elsewhere, leaves the hint as it is', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  expect((await hintProps(await poll($, 'not in this reply'))).selection).toBeUndefined()
  await poll($, TEXT)
  expect((await hintProps(await poll($))).selection).toBeUndefined()
})

test('a click on accept stages it whole, and the same selection does not come back until it is cleared', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const b = await poll($, TEXT)
  await b.pointer({ type: 'down', x: ACCEPT, y: 0, button: 'left', in: await hintKey(b) })
  expect(suggested()).toContain(`✓ "${TEXT}"`)
  expect((await hintProps(await poll($, TEXT))).selection).toBeUndefined()
  await poll($)
  expect((await hintProps(await poll($, TEXT))).selection).toBe(TEXT)
})

test('a click on comment opens a field on the row; typed and staged, ctrl+u and an empty ⏎ cancel', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const b = await poll($, TEXT)
  const into = await hintKey(b)
  await b.pointer({ type: 'down', x: COMMENT, y: 0, button: 'left', in: into })
  for (const key of ['n', 'o']) await b.key({ key, in: into })
  expect((await hintProps(await band($))).comment?.text).toBe('no')
  await b.key({ key: 'return', in: into })
  expect(suggested()).toContain(`✎ "${TEXT}" → no`)
  expect((await hintProps(await band($))).comment).toBeUndefined()
})

test('a staged selection shows as a row under its block, and Backspace on that block removes it', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const b = await poll($, TEXT)
  await b.pointer({ type: 'down', x: ACCEPT, y: 0, button: 'left', in: await hintKey(b) })
  const reply = await fullscreen($, F)
  expect(await reply.find({ type: 'Text', text: `✓ "${TEXT}"` })).toBeDefined()
  await $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'verb-accept', origin: { kind: 'person' } })
  const ui = await fullscreen($, F)
  const clients = await ui.findAll({ type: 'Client' })
  const expire = clients.find((c: FoundElement) => (c.props.props as { index: number }).index === 3)
  const into = String(expire!.key)
  await ui.pointer({ type: 'down', x: 4, y: 0, button: 'left', in: into })
  await ui.key({ key: 'backspace', in: into })
  expect(suggested()).not.toContain(TEXT)
})
