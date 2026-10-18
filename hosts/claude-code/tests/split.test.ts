// The split fixture's checklist (testbench/fixtures/split.md), as tests. Its
// reply comes in three pieces around two tool calls, as a real run leaves it.

import { expect, test } from 'claude-code/testing'

import { check, pane, position, select, start, suggested, walk } from './engine'

const F = 'split'

for (const [part, match] of [
  ['Part one', /^Part one, a paragraph/],
  ['Part two', /^Part two, a paragraph/],
  ['Part three', /^Part three, a paragraph/],
] as const) {
  test(check(F, `${part} can be selected and marked`), async ($, on) => {
    await start($, on, F)
    const ui = await pane($, 'inline')
    await select($, ui, match)
    await ui.press({ key: 'verb-accept' })
    expect(await ui.find({ type: 'Text', text: /Your notes · ✓1/ })).toBeDefined()
  })
}

test(check(F, 'Block N of M counts all three parts'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  const { of } = await position(ui)
  const blocks = await walk($, ui)
  expect(blocks.length).toBe(of)
  expect(blocks.some(t => t.startsWith('Part one'))).toBe(true)
  expect(blocks.some(t => t.startsWith('Part two'))).toBe(true)
  expect(blocks.some(t => t.startsWith('Part three'))).toBe(true)
})

test(check(F, 'Marks in different parts all reach the suggestion'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  // Marked last-to-first; the suggestion must still read first-to-last.
  await select($, ui, /^Part three, a paragraph/)
  await ui.press({ key: 'verb-accept' })
  await select($, ui, /^Part one, a paragraph/)
  await ui.press({ key: 'verb-reject' })
  const lines = suggested().split('\n')
  expect(lines[0]).toMatch(/^✗ "Part one/)
  expect(lines[1]).toMatch(/^✓ "Part three/)
})

test(check(F, 'Nothing can be marked while the tool calls run'), async ($, on) => {
  await start($, on, F)
  await $.turn.start({ text: 'run split', turnId: 'turn-2' })
  const ui = await pane($, 'inline')
  expect(await ui.find({ type: 'Text', text: /Waiting for the reply/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Block \d+ of \d+/ })).toBeUndefined()
})
