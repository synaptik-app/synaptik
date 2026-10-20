// The mouse wheel over the navigator moves nothing (#62): blocks are moved by
// the keys, and the wheel is for scrolling the reply.

import { expect, test } from 'claude-code/testing'

import { arrow, pane, position, select, start, wheel } from './engine'

for (const placement of ['dock', 'inline'] as const) {
  test(`${placement}: a wheel tick over the navigator leaves the selection where it is`, async ($, on) => {
    await start($, on, 'long')
    const ui = await pane($, placement)
    const before = await position(ui)
    await wheel($, -1)
    expect(await position(ui)).toEqual(before)
  })
}

// A fast spin sums to more than a row, as a page key does — which reads on
// inside the selected block in the classic navigator. Paging redraws through
// $.ui.invalidate, which the test engine answers without drawing again, so the
// pane is drawn again here, as Claude Code would.
test('a fast spin over the classic navigator neither moves nor pages', async ($, on) => {
  await start($, on, 'rendering')
  let ui = await pane($, 'inline', true, 7)
  await select($, ui, /^```ts/) // taller than the pane: there is more to page to
  const redrawn = async () => {
    await ui.unmount()
    ui = await pane($, 'inline', true, 7)
    // Buttons get a fresh press handle on every draw; the rest must match.
    return JSON.stringify(await ui.drawn()).replace(/"handle":\d+/g, '')
  }
  const before = await redrawn()
  await wheel($, 5)
  expect(await redrawn()).toBe(before)
})

test('↑ still moves a block after the wheel was used', async ($, on) => {
  await start($, on, 'long')
  const ui = await pane($, 'dock')
  const { at } = await position(ui)
  await wheel($, -1)
  await arrow($, -1)
  expect((await position(ui)).at).toBe(at - 1)
})
