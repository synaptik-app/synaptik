// The neighbour fixture's checklist (testbench/fixtures/neighbour.md), as tests,
// with the test bench's neighbour mod loaded beside Synaptik.
// Manual only: the entry key's stops and the ring,
// and anything that depends on which mod loads first (the reply's footer,
// greedy mode) — the test kit decides that order, not the test.

import { expect, test } from 'claude-code/testing'

// A generated copy of testbench/neighbour-mod (scripts/fixtures.mjs): a test may
// import only files inside the plugin's folder.
import { register as neighbour } from './neighbour.generated'
import { check, ENGINE_DRAWING, fullscreen, pane, PLUGIN, start } from './engine'

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

test(check(F, "The band shows the neighbour's line as well as Synaptik's"), WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  await pane($, 'dock', false)
  const ui = await band($)
  expect(await ui.find({ type: 'Text', text: /neighbour · band/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Synaptik/ })).toBeDefined()
})

test("classic: while reviewing in the navigator, Synaptik's band stands alone; the neighbour's line returns on Esc", WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  const focused = await pane($, 'dock', true)
  const reviewing = await band($)
  expect(await reviewing.find({ type: 'Text', text: /neighbour · band/ })).toBeUndefined()
  expect(await reviewing.find({ type: 'Text', text: /Block \d+ of \d+ · ↑↓ blocks/ })).toBeDefined()
  await reviewing.unmount()
  await focused.unmount()

  await pane($, 'dock', false) // Esc
  const after = await band($)
  expect(await after.find({ type: 'Text', text: /neighbour · band/ })).toBeDefined()
  expect(await after.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
})

test(check(F, 'Pressing n in the band pings the neighbour'), WITH_NEIGHBOUR, async ($, on) => {
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

// The band's ring, as the arrows or a click move it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ring = ($: any, plugin: string, element: string) =>
  $.ui.focus({ component: 'AbovePrompt', requestId: 'band', plugin, element, origin: { kind: 'person' } })

test(check(F, "←/→ walk only Synaptik's actions"), WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await ring($, PLUGIN, 'verb-accept')
  const refused = await ring($, 'neighbour', 'ping')
  expect(refused.deny).toBe('synaptik: reviewing')
  // Still reviewing: the actions take the ring.
  expect((await ring($, PLUGIN, 'verb-reject')).deny).toBeUndefined()
})

test("outside a review the neighbour's button is a stop like any other", WITH_NEIGHBOUR, async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  expect((await ring($, 'neighbour', 'ping')).deny).toBeUndefined()
})
