// The nesting fixture (testbench/fixtures/nesting.md), as tests.
// By hand: the segmenter's edge cases, which src/blocks.spec.test.ts covers too.

import { expect, test } from 'claude-code/testing'

import { check, pane, select, start, suggested, walk } from './engine'

const F = 'nesting'

test(check(F, 'each list item is its own block'), async ($, on) => {
  await start($, on, F)
  const blocks = await walk($, await pane($, 'inline'))
  for (const item of ['Second level, bullet', 'Third level, bullet', 'Second level again', 'Numbered under a bullet']) {
    expect(blocks.some(t => t.includes(item) && t.split('\n').length <= 3)).toBe(true)
  }
})

test(check(F, 'item 2 and its second paragraph are one block'), async ($, on) => {
  await start($, on, F)
  const blocks = await walk($, await pane($, 'inline'))
  const item2 = blocks.find(t => t.includes('with a second paragraph'))
  expect(item2).toContain('This paragraph belongs to item 2')
})

test('numbered lists under bullets keep their numbers', async ($, on) => {
  await start($, on, F)
  const blocks = await walk($, await pane($, 'inline'))
  expect(blocks.some(t => t.startsWith('1. Numbered under a bullet'))).toBe(true)
  expect(blocks.some(t => t.startsWith('2. Numbered under a bullet'))).toBe(true)
})

test(check(F, 'in the suggestion, "1. Top level, numbered"'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^- Third level, bullet/)
  await ui.press({ key: 'verb-accept' })
  expect(suggested()).toMatch(/\n {8}✓ "Third level, bullet"/)
})

test('an unmarked parent of a marked item is sent as a plain quote', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^- Third level, bullet/)
  await ui.press({ key: 'verb-accept' })
  const lines = suggested().split('\n')
  expect(lines[0]).toBe('"1. Top level, numbered"')
  expect(lines[1]).toBe('    "Second level, bullet"')
})

test(check(F, 'both in the suggestion with their numbers'), async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await select($, ui, /^2\. Second level, numbered/)
  await ui.press({ key: 'verb-reject' })
  await select($, ui, /^1\. Second level, numbered/)
  await ui.press({ key: 'verb-accept' })
  expect(suggested()).toContain('✓ "1. Second level, numbered"')
  expect(suggested()).toContain('✗ "2. Second level, numbered"')
})

test(check(F, '✓ "1. Top level, numbered", with ✗'), async ($, on) => {
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
