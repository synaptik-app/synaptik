// The rendering fixture's checklist (testbench/fixtures/rendering.md), as tests.
// Each test is named after its checklist line; items only a person can judge
// stay manual: "Mod on and off look the same apart from marks and the selection".

import { expect, test } from 'claude-code/testing'

import { arrow, check, ENGINE_DRAWING, pane, position, reply, start } from './engine'

const F = 'rendering'

// The texts of every Markdown element drawn, in document order.
async function markdowns(ui: { findAll: (q: unknown) => Promise<{ text: string; props: Record<string, unknown> }[]> }) {
  return (await ui.findAll({ type: 'Markdown' })).map(m => String(m.props.text ?? m.text))
}

test(check(F, 'Numbered list keeps its numbers'), async ($, on) => {
  await start($, on, F)
  await pane($, 'dock') // the navigator holds the keyboard: Synaptik draws the reply
  const ui = await reply($, F)
  const texts = await markdowns(ui)
  expect(texts.some(t => t.startsWith('1. Numbered item one'))).toBe(true)
  expect(texts.some(t => t.startsWith('2. Numbered item two'))).toBe(true)
  expect(texts.some(t => t.startsWith('3. Numbered item three'))).toBe(true)
})

test(check(F, 'Nested bullets sit under their parent'), async ($, on) => {
  await start($, on, F)
  await pane($, 'dock')
  const ui = await reply($, F)
  const boxes = await ui.findAll({ type: 'Box' })
  const nested = boxes.find(
    b => JSON.stringify(b.children).includes('Nested bullet under it') && Number(b.props.paddingLeft ?? 0) > 0,
  )
  expect(nested).toBeDefined()
})

test(check(F, 'The table draws as a table'), async ($, on) => {
  await start($, on, F)
  await pane($, 'dock')
  const ui = await reply($, F)
  const table = (await markdowns(ui)).find(t => t.includes('| Option'))
  expect(table).toBeDefined()
  expect(table).toContain('| Redis')
  expect(table).toContain('| Postgres')
})

test(check(F, 'The code block keeps its styling'), async ($, on) => {
  await start($, on, F)
  await pane($, 'dock')
  const ui = await reply($, F)
  const code = (await markdowns(ui)).find(t => t.includes('function greet'))
  expect(code?.startsWith('```ts')).toBe(true)
})

test(check(F, 'The heading is skipped by'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  const { of } = await position(ui)
  // Walk from the last block to the first; the selected block is the one
  // Markdown the classic navigator draws.
  const seen: string[] = []
  for (let i = 0; i < of; i += 1) {
    const [selected] = await markdowns(ui)
    seen.push(selected ?? '')
    await arrow($, -1)
  }
  expect(seen.some(t => t.trimStart().startsWith('#'))).toBe(false)
  expect(new Set(seen).size).toBe(of)
})

test(check(F, 'The selected block shows the selection background'), async ($, on) => {
  await start($, on, F)
  const focused = await pane($, 'dock', true)
  const drawn = await reply($, F)
  const withBackground = (await drawn.findAll({ type: 'Box' })).filter(b => b.props.backgroundColor === 'selectionBg')
  expect(withBackground.length).toBe(1)
  await drawn.unmount()
  await focused.unmount()

  await pane($, 'dock', false) // Esc: the navigator lets go of the keyboard
  const plain = await reply($, F)
  const after = (await plain.findAll({ type: 'Box' })).filter(b => b.props.backgroundColor === 'selectionBg')
  expect(after.length).toBe(0)
  // Nothing marked and not reviewing: passed through to Claude Code (D33).
  expect(await plain.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
})

test(check(F, 'Marking a block puts its glyph before it'), async ($, on) => {
  await start($, on, F)
  const nav = await pane($, 'inline')
  const before = await reply($, F)
  const blocksBefore = (await markdowns(before)).length
  await before.unmount()

  await nav.press({ key: 'verb-accept' })
  const after = await reply($, F)
  expect(await after.find({ type: 'Text', text: '✓' })).toBeDefined()
  expect((await markdowns(after)).length).toBe(blocksBefore)
})

test(check(F, 'Classic renderer: selecting the table'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline', true, 30)
  const { of } = await position(ui)
  for (let i = 0; i < of; i += 1) {
    const [selected] = await markdowns(ui)
    if (selected?.includes('| Option')) {
      expect(selected).toContain('| Postgres')
      await arrow($, 1)
      expect(await ui.find({ type: 'Text', text: /↑ table: Option · Latency · Cost/ })).toBeDefined()
      return
    }
    await arrow($, -1)
  }
  throw new Error('never reached the table')
})
