// The nesting fixture's checklist (testbench/fixtures/nesting.md), as tests.
// Manual only: "Indentation of nested items matches the mod-off view".

import { expect, test } from 'claude-code/testing'

import { check, pane, select, start, suggested, walk } from './engine'

const F = 'nesting'

test(check(F, 'Each list item is its own block'), async ($, on) => {
  await start($, on, F)
  const blocks = await walk($, await pane($, 'inline'))
  for (const item of ['Second level, bullet', 'Third level, bullet', 'Second level again', 'Numbered under a bullet']) {
    expect(blocks.some(t => t.includes(item) && t.split('\n').length <= 3)).toBe(true)
  }
})

test(check(F, 'Item 2 and its second paragraph are one block'), async ($, on) => {
  await start($, on, F)
  const blocks = await walk($, await pane($, 'inline'))
  const item2 = blocks.find(t => t.includes('with a second paragraph'))
  expect(item2).toContain('This paragraph belongs to item 2')
})

test(check(F, 'Numbered lists under bullets keep their numbers'), async ($, on) => {
  await start($, on, F)
  const blocks = await walk($, await pane($, 'inline'))
  expect(blocks.some(t => t.startsWith('1. Numbered under a bullet'))).toBe(true)
  expect(blocks.some(t => t.startsWith('2. Numbered under a bullet'))).toBe(true)
})

test(check(F, 'Marking a nested item compiles indented under its parent'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /Third level, bullet/)
  await ui.press({ key: 'verb-accept' })
  expect(suggested()).toMatch(/\n {8}✓ "Third level, bullet"/)
})

test(check(F, 'An unmarked parent of a marked item is sent as a plain quote'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /Third level, bullet/)
  await ui.press({ key: 'verb-accept' })
  const lines = suggested().split('\n')
  expect(lines[0]).toBe('"1. Top level, numbered"')
  expect(lines[1]).toBe('    "Second level, bullet"')
})

test(check(F, 'Items that open alike can be told apart'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^2\. Second level, numbered/)
  await ui.press({ key: 'verb-reject' })
  await select($, ui, /^1\. Second level, numbered/)
  await ui.press({ key: 'verb-accept' })
  expect(suggested()).toContain('✓ "1. Second level, numbered"')
  expect(suggested()).toContain('✗ "2. Second level, numbered"')
})

test(check(F, 'Accepting a parent and rejecting a child reads correctly'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^- Second level, bullet/)
  await ui.press({ key: 'verb-reject' })
  await select($, ui, /^1\. Top level, numbered$/)
  await ui.press({ key: 'verb-accept' })
  const lines = suggested().split('\n')
  expect(lines[0]).toBe('✓ "1. Top level, numbered"')
  expect(lines[1]).toBe('    ✗ "Second level, bullet"')
})
