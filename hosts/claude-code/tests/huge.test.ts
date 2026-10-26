// The huge fixture's checklist (testbench/fixtures/huge.md), as tests, and the
// cap on what Synaptik draws itself (MAX_DRAWN). Manual only: mod on and off
// looking the same, and the classic pane's layout.

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import { check, ENGINE_DRAWING, pane, reply, select, start, suggested } from './engine'

const F = 'huge'

test(check(F, 'With the navigator open, the reply draws whole'), async ($, on) => {
  await start($, on, F)
  await pane($, 'dock')
  const ui = await reply($, F)
  const texts = (await ui.findAll({ type: 'Markdown' })).map((m: FoundElement) => String(m.props.text ?? m.text))
  // Drawn in pieces of at most 10,000 characters, each fenced: Claude Code
  // before 2.1.304 refuses a longer Markdown element.
  const pieces = texts.filter((t: string) => t.startsWith('```ts'))
  expect(pieces.length).toBeGreaterThan(1)
  expect(pieces.every((p: string) => p.length <= 10_000)).toBe(true)
  expect(pieces[0]).toContain("resource/001'")
  expect(pieces[pieces.length - 1]).toContain("resource/120'")
  expect(texts.some((t: string) => t.startsWith('Paragraph 12 of the long tail'))).toBe(true)
})

test(check(F, 'The code block is one block'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^```ts/)
  await ui.press({ key: 'verb-accept' })
  expect(suggested()).toMatch(/^✓ "export const routes = \[/)
})

test('a reply piece over MAX_DRAWN characters is left to Claude Code', async ($, on) => {
  const text = Array.from({ length: 600 }, (_, i) => `${i}. ${'word '.repeat(39)}end.`).join('\n\n')
  expect(text.length).toBeGreaterThan(100_000)
  await start($, on, F, [
    { role: 'user', text: 'go', toolUses: [] },
    { role: 'assistant', text, toolUses: [] },
  ])
  await pane($, 'dock')
  const drawn = await $.ui.mount({
    plugin: 'synaptik',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
    viewport: { columns: 120, rows: 40 },
  })
  expect(await drawn.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
})
