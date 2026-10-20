// The band above the prompt (#48, #58, SPEC §7): what is staged, what ⏎ will do
// with the box, the key legend, and its place among other mods' lines.

import { expect, test } from 'claude-code/testing'

import { arrow, band, ENGINE_DRAWING, keybindings, pane, placement, position, promptBox, start, suggested } from './engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

async function legend($: Dollar) {
  await pane($, 'dock') // the navigator holds the keyboard
  const found = await (await band($)).find({ type: 'Text', text: /choose/ })
  return String(found?.text ?? '')
}

test('no keybindings file: the band names tab/⇧tab, Claude Code’s default', async ($, on) => {
  await start($, on, 'rendering')
  expect(await legend($)).toContain('· tab/⇧tab choose ·')
})

test('the recommended Pane bindings: the band names ←→', async ($, on) => {
  keybindings(on, { bindings: [{ context: 'Pane', bindings: { left: 'abovePrompt:previous', right: 'abovePrompt:next' } }] })
  await start($, on, 'rendering')
  expect(await legend($)).toContain('· ←→ choose ·')
})

test('other keys: the band names them as bound', async ($, on) => {
  keybindings(on, { bindings: [{ context: 'Pane', bindings: { h: 'abovePrompt:previous', l: 'abovePrompt:next' } }] })
  await start($, on, 'rendering')
  expect(await legend($)).toContain('· h/l choose ·')
})

test('outside the navigator: the entry key is the person’s own binding', async ($, on) => {
  keybindings(on, { bindings: [{ context: 'Chat', bindings: { 'ctrl+s': 'abovePrompt:focus' } }] })
  await start($, on, 'rendering')
  const found = await (await band($)).find({ type: 'Text', text: /to respond in place/ })
  expect(String(found?.text ?? '')).toContain('ctrl+s')
})

test('the band sums up what is staged', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await arrow($, -1)
  await ui.press({ key: 'verb-reject' })
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: /1 accepted · 1 rejected$/ })).toBeDefined()
})

test('nothing staged: no summary line', async ($, on) => {
  await start($, on, 'rendering')
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: /accepted|rejected|comment/ })).toBeUndefined()
})

test('other text in the prompt box: a yellow warning that ⏎ drops the marks', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  promptBox.text = 'something else entirely'
  const found = await (await band($)).find({ type: 'Text', text: /⏎ sends only what you typed and drops them/ })
  expect(found?.text).toMatch(/^⎿ {2}1 accepted staged/)
  expect(found?.props.color).toBe('yellow')
})

test('the box holding exactly the taken suggestion: ⏎ sends your feedback', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  promptBox.text = suggested()
  expect(await (await band($)).find({ type: 'Text', text: /1 accepted · ⏎ sends your feedback/ })).toBeDefined()
})

test('the suggestion showing in an empty box: tab takes it', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  await pane($, 'inline', false)
  expect(await (await band($)).find({ type: 'Text', text: /tab to take it into the prompt · ctrl\+x tab to continue responding/ })).toBeDefined()
})

test('the legend while reviewing names the position and every key', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'dock')
  const { at, of } = await position(ui)
  const found = await (await band($)).find({ type: 'Text', text: /choose/ })
  expect(found?.text).toBe(`⎿  Block ${at} of ${of} · ↑↓ move · tab/⇧tab choose · ⏎ apply · esc done`)
})

test('outside review the band adds its lines under what lies beneath', async ($, on) => {
  await start($, on, 'rendering')
  const drawn = await band($)
  const texts = (await drawn.findAll({ type: 'Text' })).map((t: { text: unknown }) => String(t.text))
  expect(texts[0]).toBe(ENGINE_DRAWING)
  expect(texts.some((t: string) => t.startsWith('Synaptik'))).toBe(true)
})

test('while reviewing Synaptik’s band stands alone', async ($, on) => {
  await start($, on, 'rendering')
  await pane($, 'dock')
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: ENGINE_DRAWING })).toBeUndefined()
})

test('the navigator not on screen: the band offers the press that opens it', async ($, on) => {
  await start($, on, 'rendering')
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
