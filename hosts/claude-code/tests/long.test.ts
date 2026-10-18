// The long fixture's checklist (testbench/fixtures/long.md), as tests.
// Manual only: the minimap's proportions and the transcript's scrolling
// (top/end reveals, the middle third) — they need a real screen.

import { expect, test } from 'claude-code/testing'

import { arrow, check, pane, position, select, start, suggested, walk } from './engine'

const F = 'long'

test(check(F, '↑/↓ reach every block'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  const { of } = await position(ui)
  for (let i = 0; i < of + 2; i += 1) await arrow($, -1)
  expect(await position(ui)).toEqual({ at: 1, of })
  for (let i = 0; i < of + 2; i += 1) await arrow($, 1)
  expect(await position(ui)).toEqual({ at: of, of })
})

test(check(F, 'Block N of M counts every block'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  const { of } = await position(ui)
  const blocks = await walk($, ui)
  expect(new Set(blocks).size).toBe(of)
  expect(blocks.some(t => t.trimStart().startsWith('#'))).toBe(false)
})

test(check(F, 'Review starts on the last block'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  const { at, of } = await position(ui)
  expect(at).toBe(of)
})

test(check(F, 'Marks spread across sections all reach the suggestion'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^8\. Remove the old columns/)
  await ui.press({ key: 'verb-accept' })
  await select($, ui, /^1\. Choose a cache for sessions/)
  await ui.press({ key: 'verb-reject' })
  const lines = suggested().split('\n')
  expect(lines[0]).toMatch(/^✗ "1\. Choose a cache/)
  expect(lines[1]).toMatch(/^✓ "8\. Remove the old columns/)
})

test(check(F, "The navigator's staged rows show the right opening words"), async ($, on) => {
  await start($, on, F)
  const nav = await pane($, 'inline')
  await select($, nav, /^2\. Start at five requests/)
  await nav.press({ key: 'verb-accept' })
  await nav.unmount()
  const dock = await pane($, 'dock', false)
  expect(await dock.find({ type: 'Text', text: /✓ 2\. Start at five/ })).toBeDefined()
})

test(check(F, 'Classic renderer: the pane shows the selected block in full'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^- Log every cache miss/)
  const selected = await ui.find({ type: 'Markdown' })
  expect(String(selected?.props.text)).toBe('- Log every cache miss for a day')
  expect(await ui.find({ type: 'Text', text: /^↑ / })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /^↓ / })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'verb-accept' })).toBeDefined()
})

test(check(F, 'Classic renderer: the tall paragraph'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline', true, 9) // a short pane: 3 rows of text
  await select($, ui, /^A much longer paragraph/)
  expect(await ui.find({ type: 'Text', text: /PgUp\/PgDn to read on/ })).toBeDefined()
  const before = await position(ui)
  // A page key reads on inside the block; it does not move to another.
  await $.ui.scroll({
    component: 'Pane',
    requestId: 'synaptik-map',
    offset: 10,
    by: 9,
    bodyRows: 9,
    contentRows: 11,
    origin: { kind: 'person' },
  })
  expect(await position(ui)).toEqual(before)
  await arrow($, -1)
  expect((await position(ui)).at).toBe(before.at - 1)
})
