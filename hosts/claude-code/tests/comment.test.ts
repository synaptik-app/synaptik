// The comment flow (#48): c opens a field in the navigator, ⏎ stages what was
// typed, an empty line cancels, and focus goes back to ✎ comment.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { focus, focusMoves, log, pane, reply, start, suggested } from './engine'

const F = 'rendering'
// The plugin's type config has no timers; the test runtime does.
declare const setTimeout: (run: () => void, ms: number) => unknown

// Lets work a hook started without awaiting it run to the end.
const settled = () => new Promise<void>(resolve => setTimeout(() => resolve(), 0))

// The comment field's key: a fresh one each time it opens, first `comment-1`.
const FIELD = 'comment-1'

// Opens the field on the selected block (the last one, on adoption).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function open($: any, on: On, rows = 20) {
  await start($, on, F)
  const ui = await pane($, 'dock', true, rows)
  await ui.press({ key: 'verb-comment' })
  return ui
}

test('c opens the comment field, and focus moves into it', async ($, on) => {
  const ui = await open($, on)
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeDefined()
  expect(await log($)).toContain('focus comment-input')
})

test('what is typed shows under the block in the reply as it is typed', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague', kind: 'change' })
  const drawn = await reply($, F)
  expect(await drawn.find({ type: 'Text', text: /→ too vague/ })).toBeDefined()
})

test('⏎ stages the comment: counted, shown in the reply, in the suggestion', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague', kind: 'change' })
  await ui.input({ key: FIELD, text: 'too vague' })
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Your notes · ✎1/ })).toBeDefined()
  expect(suggested()).toMatch(/^✎ ".+" → too vague$/)
  const drawn = await reply($, F)
  expect(await drawn.find({ type: 'Text', text: '✎' })).toBeDefined()
})

test('⏎ returns focus to ✎ comment', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague' })
  expect(await log($)).toContain('leave comment → verb-comment')
})

test('⏎ on an empty line cancels: nothing staged, the field closes', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: '' })
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
})

test('backspace on an empty line cancels, and focus returns to ✎ comment', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: '', kind: 'change' })
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
  expect(await log($)).toContain('leave comment → verb-comment')
})

test('deleting what was typed does not cancel; only an already empty line does', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'x', kind: 'change' })
  await ui.input({ key: FIELD, text: '', kind: 'change' })
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeDefined()
})

test('a move off the field onto another element lands on ✎ comment (#17)', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague', kind: 'change' })
  await focus($, 'pane-anchor')
  expect(focusMoves.at(-1)).toEqual({ element: 'verb-comment' })
  // Leaving the field finished the comment, as ⏎ would.
  expect(await ui.find({ type: 'Text', text: /Your notes · ✎1/ })).toBeDefined()
})

test('a move off the field to the pane’s own stop finishes the comment and sends focus to ✎ (#60)', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague', kind: 'change' })
  await focus($, undefined)
  // Claude Code refuses a redirect of a move to its own stop: it goes on as it is.
  expect(focusMoves.at(-1)).toEqual({ element: undefined })
  await settled()
  expect(await log($)).toContain('leave comment → verb-comment')
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Your notes · ✎1/ })).toBeDefined()
})

test('the same move with nothing typed drops the comment', async ($, on) => {
  const ui = await open($, on)
  await focus($, undefined)
  await settled()
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
})

test('leaving the field empty drops the comment', async ($, on) => {
  const ui = await open($, on)
  await focus($, 'verb-accept')
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
})

test('reopening a comment starts from what was staged, in a fresh field', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague' })
  await ui.press({ key: 'verb-comment' })
  const field = await ui.find({ type: 'Input', key: 'comment-2' })
  expect(field?.props.value).toBe('too vague')
})
