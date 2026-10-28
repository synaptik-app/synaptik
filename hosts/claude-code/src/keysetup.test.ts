// No session, no mock `$`: a keybindings file and a setup in, a file out.

import { expect, test } from 'claude-code/testing'

import { applySetup, changes, costs, currentSetup } from './keysetup'
import type { KeyFile } from './keys'

const chat = (bindings: Record<string, string | null>) => ({ context: 'Chat', bindings })
const pane = (bindings: Record<string, string | null>) => ({ context: 'Pane', bindings })
const ARROWS = { previous: 'left', next: 'right' }

test('no file: Claude Code’s defaults', async () => {
  expect(currentSetup({})).toEqual({})
})

test('the current setup is read from the file', async () => {
  const file: KeyFile = { bindings: [pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' })] }
  expect(currentSetup(file)).toEqual({ verbs: ARROWS })
})

test('choosing keys adds them to the Pane block, keeping everything else', async () => {
  const before: KeyFile = { bindings: [chat({ 'ctrl+e': 'chat:externalEditor' })] }
  expect(applySetup(before, { verbs: ARROWS }).bindings).toEqual([
    chat({ 'ctrl+e': 'chat:externalEditor' }),
    pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' }),
  ])
})

test('the key that opens Synaptik is never touched — a ctrl+s the person bound stays (#113)', async () => {
  const before: KeyFile = { bindings: [chat({ 'ctrl+s': 'abovePrompt:focus' })] }
  expect(currentSetup(before)).toEqual({})
  expect(applySetup(before, { verbs: ARROWS }).bindings?.[0]).toEqual(chat({ 'ctrl+s': 'abovePrompt:focus' }))
  expect(applySetup(before, {}).bindings).toEqual([chat({ 'ctrl+s': 'abovePrompt:focus' })])
})

test('other top-level fields of the file are kept', async () => {
  const before = { $schema: 'https://example.com/schema.json', bindings: [] } as KeyFile
  expect(applySetup(before, { verbs: ARROWS })).toMatchObject({ $schema: 'https://example.com/schema.json' })
})

test('choosing again replaces the earlier keys, never adds second ones', async () => {
  const before = applySetup({}, { verbs: ARROWS })
  expect(applySetup(before, { verbs: { previous: 'h', next: 'l' } }).bindings).toEqual([
    pane({ h: 'abovePrompt:previous', l: 'abovePrompt:next' }),
  ])
})

test('back to the defaults removes Synaptik’s entries, and a block left empty', async () => {
  const before: KeyFile = { bindings: [pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' })] }
  expect(applySetup(before, {}).bindings).toEqual([])
})

test('the defaults also lift an unbinding of a default key', async () => {
  const before: KeyFile = { bindings: [pane({ tab: null, 'ctrl+x x': 'pane:close' })] }
  expect(applySetup(before, {}).bindings).toEqual([pane({ 'ctrl+x x': 'pane:close' })])
})

test('a block that was empty already is left alone', async () => {
  const before: KeyFile = { bindings: [pane({})] }
  expect(applySetup(before, {}).bindings).toEqual([pane({})])
})

test('the changes, as the menu lists them before writing', async () => {
  const before: KeyFile = { bindings: [pane({ h: 'abovePrompt:previous', l: 'abovePrompt:next' })] }
  const after = applySetup(before, { verbs: ARROWS })
  expect(changes(before, after)).toEqual([
    '− Pane  h → abovePrompt:previous',
    '− Pane  l → abovePrompt:next',
    '+ Pane  left → abovePrompt:previous',
    '+ Pane  right → abovePrompt:next',
  ])
  expect(changes(after, after)).toEqual([])
})

test('what a choice gives up', async () => {
  expect(costs({ verbs: ARROWS })).toEqual([
    { line: "← → will also move between buttons in other mods' panes" },
    { line: 'Tip: ← on an empty prompt opens agent view (/config → leftArrowOpensAgents)', isTip: true },
  ])
  expect(costs({})).toEqual([])
})
