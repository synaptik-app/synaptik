// Home and End in the navigator jump to the first and last block (#63).

import { expect, test } from 'claude-code/testing'

import { arrow, jump, pane, position, start } from './engine'

for (const placement of ['dock', 'inline'] as const) {
  test(`${placement}: Home selects the first block`, async ($, on) => {
    await start($, on, 'long')
    const ui = await pane($, placement)
    await jump($, 'home')
    expect((await position(ui)).at).toBe(1)
  })

  test(`${placement}: End selects the last block`, async ($, on) => {
    await start($, on, 'long')
    const ui = await pane($, placement)
    // Adoption starts on the last block: move off it with ↑ first.
    for (let i = 0; i < 3; i += 1) await arrow($, -1)
    const { of } = await position(ui)
    expect((await position(ui)).at).toBeLessThan(of)
    await jump($, 'end')
    expect((await position(ui)).at).toBe(of)
  })
}

test('Home on the first block, and End on the last, stay put', async ($, on) => {
  await start($, on, 'long')
  const ui = await pane($, 'dock')
  await jump($, 'end')
  const { of } = await position(ui)
  expect((await position(ui)).at).toBe(of)
  await jump($, 'home')
  await jump($, 'home')
  expect((await position(ui)).at).toBe(1)
})

test('↑ and ↓ still move one block after a jump', async ($, on) => {
  await start($, on, 'long')
  const ui = await pane($, 'dock')
  await jump($, 'home')
  await arrow($, 1)
  expect((await position(ui)).at).toBe(2)
})
