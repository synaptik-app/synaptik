// The split fixture (testbench/fixtures/split.md), as tests. Its
// reply comes in two pieces around a tool call, as a real run leaves it.

import { expect, test } from 'claude-code/testing'

import { fullscreen, pane, position, select, start, suggested, walk } from './engine'

const F = 'split'

for (const [part, match] of [
  ['Part one', /^Part one, a paragraph/],
  ['Part two', /^Part two, a paragraph/],
] as const) {
  test(`${part} can be selected and marked`, async ($, on) => {
    await start($, on, F)
    const ui = await pane($, 'inline')
    await select($, ui, match)
    await ui.press({ key: 'verb-accept' })
    expect(await ui.find({ type: 'Text', text: /Your notes · ✓1/ })).toBeDefined()
  })
}

test('Block N of M counts both parts', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  const { of } = await position(ui)
  const blocks = await walk($, ui)
  expect(blocks.length).toBe(of)
  expect(blocks.some(t => t.startsWith('Part one'))).toBe(true)
  expect(blocks.some(t => t.startsWith('Part two'))).toBe(true)
})

test('Marks in different parts all reach the suggestion', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  // Marked last-to-first; the suggestion must still read first-to-last.
  await select($, ui, /^Part two, a paragraph/)
  await ui.press({ key: 'verb-accept' })
  await select($, ui, /^Part one, a paragraph/)
  await ui.press({ key: 'verb-reject' })
  const lines = suggested().split('\n')
  expect(lines[0]).toMatch(/^✗ "Part one/)
  expect(lines[1]).toMatch(/^✓ "Part two/)
})

test('Nothing can be marked while the tool call runs', async ($, on) => {
  await start($, on, F)
  await $.turn.start({ text: 'run split', turnId: 'turn-2' })
  const ui = await pane($, 'inline')
  expect(await ui.find({ type: 'Text', text: /Waiting for the reply/ })).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Block \d+ of \d+/ })).toBeUndefined()
})

test('After a click on a block, ↑/↓ and Home/End cross the tool call', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'verb-accept', origin: { kind: 'person' } })
  const ui = await fullscreen($, F)
  const clients = await ui.findAll({ type: 'Client' })
  const into = String(clients.at(-1)!.key)
  await ui.pointer({ type: 'down', x: 4, y: 0, button: 'left', in: into })
  await ui.key({ key: 'down', in: into })
  await ui.key({ key: 'a', in: into })
  expect(suggested()).toContain('✓ "Part two, a paragraph')
  await ui.key({ key: 'end', in: into })
  await ui.key({ key: 'x', in: into })
  expect(suggested()).toContain('✗ "When you\'re done: click the first')
  await ui.key({ key: 'home', in: into })
  await ui.key({ key: 'x', in: into })
  expect(suggested().split('\n')[0]).toMatch(/^✗ "A reply split around a real tool/)
})
