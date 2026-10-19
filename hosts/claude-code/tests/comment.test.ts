// The comment flow (#48): c opens a field in the navigator, ⏎ stages what was
// typed, an empty line cancels, and focus goes back to ✎ comment.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { focus, focusMoves, log, pane, reply, start, suggested } from './engine'

const F = 'rendering'
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

// The other half of #17 does not hold: Claude Code refuses a redirect of a move
// that named no element ("one of the engine's stops"), so the hook's .catch
// passes the move on unchanged. Recorded as it is, for the refactor to keep.
test('a move off the field to the pane’s own stop is passed on unchanged', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague', kind: 'change' })
  await focus($, undefined)
  expect(focusMoves.at(-1)).toEqual({ element: undefined })
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeDefined()
})

test('leaving the field empty drops the comment', async ($, on) => {
  const ui = await open($, on)
  await focus($, 'verb-accept')
  expect(await ui.find({ type: 'Input', key: FIELD })).toBeUndefined()
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
})

test('a long comment gets more rows in the navigator (#18)', async ($, on) => {
  const bars = async (ui: Awaited<ReturnType<typeof pane>>) =>
    (await ui.findAll({ type: 'Text', text: /^[│┃█]/ })).length
  const ui = await open($, on, 40)
  await ui.input({ key: FIELD, text: 'short', kind: 'change' })
  const short = await bars(ui)
  await ui.input({ key: FIELD, text: 'a much longer comment '.repeat(8), kind: 'change' })
  expect(await bars(ui)).toBeLessThan(short)
})

test('reopening a comment starts from what was staged, in a fresh field', async ($, on) => {
  const ui = await open($, on)
  await ui.input({ key: FIELD, text: 'too vague' })
  await ui.press({ key: 'verb-comment' })
  const field = await ui.find({ type: 'Input', key: 'comment-2' })
  expect(field?.props.value).toBe('too vague')
})
