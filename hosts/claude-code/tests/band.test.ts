// The band above the prompt (#48, #58, SPEC §7): what is staged, what ⏎ will do
// with the box, the key legend, and its place among other mods' lines.

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import { arrow, band, ENGINE_DRAWING, pane, placement, position, promptBox, start, suggested } from './engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

async function legend($: Dollar) {
  await pane($, 'dock') // the navigator holds the keyboard
  const found = await (await band($)).find({ type: 'Text', text: /actions/ })
  return String(found?.text ?? '')
}

test('the band names Claude Code\'s keys: ctrl+x tab outside a review, tab/⇧tab in one', async ($, on) => {
  await start($, on, 'classic')
  expect(String((await (await band($)).find({ type: 'Text', text: /to review the reply/ }))?.text ?? '')).toContain('ctrl+x tab')
  expect(await legend($)).toContain('· tab/⇧tab actions ·')
})

test('the band counts what is staged as the margins mark it; during a review, nothing about the prompt', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await arrow($, -1)
  await ui.press({ key: 'verb-reject' })
  const drawn = await band($)
  expect((await drawn.find({ type: 'Text', text: /✓1 ✗1/ }))?.text).toBe('⎿  ✓1 ✗1')
})

test('nothing staged: no summary line', async ($, on) => {
  await start($, on, 'classic')
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: /[✓✗✎]\d/ })).toBeUndefined()
})

test('other text in the prompt box: a yellow note that ⏎ sends what was typed', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  await pane($, 'inline', false) // Esc: the navigator lets go of the keyboard
  promptBox.text = 'something else entirely'
  const found = await (await band($)).find({ type: 'Text', text: /⏎ sends what you typed/ })
  expect(found?.text).toBe('⎿  ✓1 · ⏎ sends what you typed')
  expect(found?.props.color).toBe('yellow')
})

test('the box holding exactly the taken suggestion: ⏎ sends your feedback', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  await pane($, 'inline', false)
  promptBox.text = suggested()
  expect(await (await band($)).find({ type: 'Text', text: /✓1 · ⏎ sends your feedback/ })).toBeDefined()
})

test('the suggestion showing in an empty box: tab, then ⏎ to send; the action line offers to continue', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  await pane($, 'inline', false)
  const b = await band($)
  expect(await b.find({ type: 'Text', text: /✓1 · tab, then ⏎ to send/ })).toBeDefined()
  expect(await b.find({ type: 'Text', text: /ctrl\+x tab to continue reviewing/ })).toBeDefined()
})

test('the legend while reviewing names the position and every key', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'dock')
  const { at, of } = await position(ui)
  const found = await (await band($)).find({ type: 'Text', text: /actions/ })
  expect(found?.text).toBe(`⎿  Block ${at} of ${of} · ↑↓ blocks · tab/⇧tab actions · ⏎ apply · esc done`)
})

test('outside review the band adds its lines under what lies beneath', async ($, on) => {
  await start($, on, 'classic')
  const drawn = await band($)
  const texts = (await drawn.findAll({ type: 'Text' })).map((t: { text: unknown }) => String(t.text))
  expect(texts[0]).toBe(ENGINE_DRAWING)
  expect(texts.some((t: string) => t.startsWith('Synaptik'))).toBe(true)
})

test('while reviewing Synaptik’s band stands alone', async ($, on) => {
  await start($, on, 'classic')
  await pane($, 'dock')
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: ENGINE_DRAWING })).toBeUndefined()
})

test('the navigator not on screen: the band offers the press that opens it', async ($, on) => {
  await start($, on, 'classic')
  // A narrow terminal from here on: the unasked open on the next adoption waits.
  placement.isPlaced = false
  await $.session.start({ cwd: '/tmp/synaptik-test', surface: 'terminal', isInteractive: true })
  const drawn = await band($)
  expect(await drawn.find({ type: 'Button', key: 'open-pane' })).toBeDefined()
  placement.isPlaced = true
  await drawn.press({ key: 'open-pane' })
  const again = await band($)
  expect(await again.find({ type: 'Button', key: 'open-pane' })).toBeUndefined()
})

test('classic: q is done too, unadvertised — the pane draws its actions anew', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  const before = await ui.findAll({ type: 'Button' })
  expect(before.some((b: FoundElement) => b.key === 'verb-accept')).toBe(true)
  await ui.press({ key: 'review-end' })
  await ui.unmount()
  const after = await pane($, 'inline')
  const keys = (await after.findAll({ type: 'Button' })).map((b: FoundElement) => String(b.key))
  // The action that held the keyboard is gone: the same actions, under new keys.
  expect(keys).not.toContain('verb-accept')
  expect(keys.some((k: string) => k.startsWith('verb-accept@'))).toBe(true)
  // Not advertised: the legend still says esc.
  expect(await (await band($)).find({ type: 'Text', text: /q done/ })).toBeUndefined()
})
