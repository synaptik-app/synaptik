// The live suggestion (#48, SPEC §7): the compiled prompt is proposed in the
// prompt box after every change, and again when the navigator takes or leaves
// the keyboard, since the box shows only the last suggestion proposed.

import { expect, test } from 'claude-code/testing'

import { focus, pane, start, submitted, suggested, suggestions } from './engine'

const F = 'rendering'
const PLACEHOLDER = 'Give me a sec to read through this.'

// The plugin's type config has no timers; the test runtime does.
declare const setTimeout: (run: () => void, ms: number) => unknown

// Lets work a hook started without awaiting it run to the end.
const settled = () => new Promise<void>(resolve => setTimeout(() => resolve(), 0))

test('every mark and unmark proposes the suggestion again', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  expect(suggestions.length).toBe(1)
  expect(suggested()).toMatch(/^✓ "/)
  await ui.press({ key: 'verb-reject' })
  expect(suggestions.length).toBe(2)
  expect(suggested()).toMatch(/^✗ "/)
})

test('the suggestion leads with a space, so the cursor does not hide its first glyph', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  expect(suggestions.at(-1)).toMatch(/^ ✓ "/)
})

test('clearing the last mark proposes the placeholder, since a suggestion cannot be withdrawn', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.press({ key: 'verb-accept' }) // the same verb again unmarks
  expect(suggestions.at(-1)).toBe(` ${PLACEHOLDER}`)
})

test('nothing marked yet: no suggestion is proposed at all', async ($, on) => {
  await start($, on, F)
  await pane($, 'inline')
  await focus($, 'verb-accept', 'plugin')
  await settled()
  expect(suggestions).toEqual([])
})

test('the navigator taking the keyboard proposes it again (#32)', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  const before = suggestions.length
  // Another mod may have replaced ours in the box meanwhile.
  await focus($, 'verb-accept', 'plugin')
  await settled() // the hook proposes it without waiting
  expect(suggestions.length).toBe(before + 1)
  expect(suggested()).toMatch(/^✓ "/)
})

test('a person moving between verbs does not propose it again', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  const before = suggestions.length
  await focus($, 'verb-reject')
  expect(suggestions.length).toBe(before)
})

test('leaving the navigator proposes it again', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  const before = suggestions.length
  await ui.unmount()
  await pane($, 'inline', false) // Esc: drawn again without the keyboard
  expect(suggestions.length).toBe(before + 1)
})

test('nothing in the navigator sends: the person takes the suggestion and sends it (D30)', async ($, on) => {
  await start($, on, F)
  for (const placement of ['inline', 'dock'] as const) {
    const ui = await pane($, placement)
    await ui.press({ key: 'verb-accept' })
    const buttons = await ui.findAll({ type: 'Button' })
    expect(buttons.some(b => b.props.hotkey === 'a')).toBe(true) // the hidden verbs are found
    expect(buttons.some(b => b.props.hotkey === 's' || b.key === 'send')).toBe(false)
    await ui.unmount()
  }
  expect(suggested()).not.toBe('')
  expect(submitted).toEqual([])
})
