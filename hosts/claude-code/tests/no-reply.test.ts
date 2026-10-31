// A new session with no reply yet (#73): an empty navigator never says "Block 1 of 0".

import { expect, test } from 'claude-code/testing'

import { pane, start } from './engine'
import type { Row } from './engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

const NO_REPLY: Row[] = [{ role: 'user', text: 'hello', toolUses: [] }]

async function texts(ui: Dollar): Promise<string[]> {
  return (await ui.findAll({ type: 'Text' })).map((t: { text: unknown }) => String(t.text))
}

test('the navigator with no reply: one line, no counter, no keys', async ($, on) => {
  await start($, on, 'classic', NO_REPLY)
  const ui = await pane($, 'dock')
  const shown = await texts(ui)
  expect(shown).toContain('Nothing to respond to yet — Synaptik opens on the next reply.')
  expect(shown.some(t => /of 0/.test(t))).toBe(false)
  expect(await ui.findAll({ type: 'Button' })).toEqual([])
})
