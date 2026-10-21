// A new session with no reply yet (#73): `/synaptik config` works, and when it
// closes the pane closes too; an empty navigator never says "Block 1 of 0".

import { expect, test } from 'claude-code/testing'

import { arrow, closed, keybindings, pane, start, synaptik } from './engine'
import type { Row } from './engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

const NO_REPLY: Row[] = [{ role: 'user', text: 'hello', toolUses: [] }]

async function texts(ui: Dollar): Promise<string[]> {
  return (await ui.findAll({ type: 'Text' })).map((t: { text: unknown }) => String(t.text))
}

test('the navigator with no reply: one line, no counter, no keys', async ($, on) => {
  await start($, on, 'rendering', NO_REPLY)
  const ui = await pane($, 'dock')
  const shown = await texts(ui)
  expect(shown).toContain('Nothing to respond to yet — Synaptik opens on the next reply.')
  expect(shown.some(t => /of 0/.test(t))).toBe(false)
  expect(await ui.findAll({ type: 'Button' })).toEqual([])
})

test('/synaptik config with no reply: Cancel closes the pane, giving the prompt the keyboard', async ($, on) => {
  keybindings(on, { bindings: [] })
  await start($, on, 'rendering', NO_REPLY)
  expect((await synaptik($, 'config'))?.text).toBeUndefined()
  const ui = await pane($, 'dock', true, 30)
  expect(await texts(ui)).toContain('Synaptik keys')
  for (let i = 0; i < 3; i += 1) await arrow($, 1) // Cancel
  await ui.press({ key: 'key-enter' })
  expect(closed).toEqual(['synaptik-map'])
})

test('/synaptik config with no reply: Save closes the pane too', async ($, on) => {
  keybindings(on, { bindings: [] })
  await start($, on, 'rendering', NO_REPLY)
  await synaptik($, 'config')
  const ui = await pane($, 'dock', true, 30)
  for (let i = 0; i < 2; i += 1) await arrow($, 1) // Save
  await ui.press({ key: 'key-enter' })
  expect(closed).toEqual(['synaptik-map'])
})

test('with a reply, closing the setup keeps the navigator open', async ($, on) => {
  keybindings(on, { bindings: [] })
  await start($, on, 'rendering')
  await synaptik($, 'config')
  const ui = await pane($, 'dock', true, 30)
  for (let i = 0; i < 3; i += 1) await arrow($, 1) // Cancel
  await ui.press({ key: 'key-enter' })
  expect(closed).toEqual([])
})
