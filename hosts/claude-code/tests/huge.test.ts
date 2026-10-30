// A reply too long for one Markdown element, and the cap on what Synaptik draws
// itself (MAX_DRAWN). No manual fixture: nothing here needs a person's eye.

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import { ENGINE_DRAWING, pane, select, start, suggested } from './engine'

const pad = (n: number) => String(n).padStart(3, '0')
const routes = Array.from(
  { length: 120 },
  (_, i) => `  { path: '/api/v1/resource/${pad(i + 1)}', method: 'GET', handler: 'handleResource${pad(i + 1)}', auth: true, cache: 60 },`,
)
const CODE = ['```ts', 'export const routes = [', ...routes, ']', '```'].join('\n')
const TAIL = Array.from({ length: 12 }, (_, i) => `Paragraph ${i + 1} of the long tail.`)
const HUGE = ['The route table:', CODE, ...TAIL].join('\n\n')
const ROWS = [
  { role: 'user' as const, text: 'go', toolUses: [] },
  { role: 'assistant' as const, text: HUGE, toolUses: [] },
]

test('with the navigator open, a reply with a block over 10,000 characters draws whole', async ($, on) => {
  await start($, on, 'huge', ROWS)
  await pane($, 'dock')
  const ui = await $.ui.mount({
    plugin: 'synaptik',
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: HUGE, isFirstOfReply: true },
    viewport: { columns: 120, rows: 40 },
  })
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

test('a code block over 10,000 characters is one block', async ($, on) => {
  await start($, on, 'huge', ROWS)
  const ui = await pane($, 'inline')
  await select($, ui, /^```ts/)
  await ui.press({ key: 'verb-accept' })
  expect(suggested()).toMatch(/^✓ "export const routes = \[/)
})

test('a reply piece over MAX_DRAWN characters is left to Claude Code', async ($, on) => {
  const text = Array.from({ length: 600 }, (_, i) => `${i}. ${'word '.repeat(39)}end.`).join('\n\n')
  expect(text.length).toBeGreaterThan(100_000)
  await start($, on, 'huge', [
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
