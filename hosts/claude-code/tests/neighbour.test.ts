// The neighbour fixture's checklist (testbench/fixtures/neighbour.md), as tests,
// with the test bench's neighbour mod loaded beside Synaptik.
// Manual only: the entry key's stops and the ring,
// and anything that depends on which mod loads first (the reply's footer,
// greedy mode) — the test kit decides that order, not the test.

import { expect, test } from 'claude-code/testing'

// A generated copy of testbench/neighbour-mod (scripts/fixtures.mjs): a test may
// import only files inside the plugin's folder.
import { register as neighbour } from './neighbour.generated'
import { ENGINE_DRAWING, fullscreen, pane, PLUGIN, start } from './engine'

const F = 'neighbour'
const WITH_NEIGHBOUR = { plugins: [{ name: 'neighbour', register: neighbour }] }

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function band($: any) {
  return $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AbovePrompt',
    props: {
      hasSurvey: false,
      isWorking: false,
      maxRows: 20,
      bodyColumns: 120,
      scroll: { offset: 0, bodyRows: 20 },
      view: {},
    },
  })
}

test("The band shows the neighbour's line as well as Synaptik's", WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  await pane($, 'dock', false)
  const ui = await band($)
  expect(await ui.find({ type: 'Text', text: /neighbour · band/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Synaptik/ })).toBeDefined()
})

test("classic: while reviewing in the navigator, the neighbour's line stays in the band (#171)", WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  const focused = await pane($, 'dock', true)
  const reviewing = await band($)
  expect(await reviewing.find({ type: 'Text', text: /neighbour · band/ })).toBeDefined()
  expect(await reviewing.find({ type: 'Text', text: /Block \d+ of \d+ · ↑↓ blocks/ })).toBeDefined()
  await reviewing.unmount()
  await focused.unmount()
})

test("fullscreen: during a review from the band, the neighbour's button is still in it (#171)", WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  // ctrl+x tab: the band's ring on Synaptik's first action, and the review starts.
  await $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'verb-accept', origin: { kind: 'person' } })
  const ui = await band($)
  // The legend is the band's hint Client: the review is on.
  expect(JSON.stringify(await ui.drawn())).toMatch(/Block \d+ of \d+ · j\/k blocks/)
  expect(await ui.find({ type: 'Text', text: /neighbour · band/ })).toBeDefined()
  expect(await ui.find({ type: 'Button', key: 'ping' })).toBeDefined()
})

test('Pressing n in the band pings the neighbour', WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  const nav = await pane($, 'inline', true)
  await nav.press({ key: 'verb-accept' })
  expect(await nav.find({ type: 'Text', text: /Your notes · ✓1/ })).toBeDefined()
  await nav.unmount()

  await pane($, 'dock', false)
  const ui = await band($)
  // The neighbour's own button, still in the band beside Synaptik's lines.
  expect(await ui.find({ type: 'Button', key: 'ping' })).toBeDefined()
})

test("Synaptik's band controls carry their hotkeys only while its review holds the band (#171)", WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const before = await band($)
  // Not held: a key another mod's button also uses (the neighbour's clash, `a`) is that mod's.
  const accept = async (ui: Awaited<ReturnType<typeof band>>) =>
    (await ui.findAll({ type: 'Button' })).find((b: { key?: unknown }) => String(b.key).startsWith('verb-accept'))?.props.hotkey
  expect(await accept(before)).toBeUndefined()
  expect((await before.find({ type: 'Button', key: 'clash' }))?.props.hotkey).toBe('a')
  await before.unmount()
  await $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'verb-accept', origin: { kind: 'person' } })
  const held = await band($)
  expect(await accept(held)).toBe('a')
})
