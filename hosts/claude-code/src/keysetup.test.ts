// No session, no mock `$`: a keybindings file and a setup in, a file out.

import { expect, test } from 'claude-code/testing'

import { applySetup, bindingName, changes, costs, currentSetup, refusal } from './keysetup'
import type { KeyFile } from './keys'

const chat = (bindings: Record<string, string | null>) => ({ context: 'Chat', bindings })
const pane = (bindings: Record<string, string | null>) => ({ context: 'Pane', bindings })

test('no file: Claude Code’s defaults', async () => {
  expect(currentSetup({})).toEqual({ entry: undefined, verbs: undefined })
})

test('the current setup is read from the file', async () => {
  const file: KeyFile = { bindings: [chat({ 'ctrl+s': 'abovePrompt:focus' }), pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' })] }
  expect(currentSetup(file)).toEqual({ entry: 'ctrl+s', verbs: { previous: 'left', next: 'right' } })
})

test('choosing keys adds them to the context’s block, keeping everything else', async () => {
  const before: KeyFile = { bindings: [chat({ 'ctrl+e': 'chat:externalEditor' })] }
  const after = applySetup(before, { entry: 'ctrl+s', verbs: { previous: 'left', next: 'right' } })
  expect(after.bindings).toEqual([
    chat({ 'ctrl+e': 'chat:externalEditor', 'ctrl+s': 'abovePrompt:focus' }),
    pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' }),
  ])
})

test('other top-level fields of the file are kept', async () => {
  const before = { $schema: 'https://example.com/schema.json', bindings: [] } as KeyFile
  expect(applySetup(before, { entry: 'ctrl+s' })).toMatchObject({ $schema: 'https://example.com/schema.json' })
})

test('choosing again replaces the earlier key, never adds a second', async () => {
  const before = applySetup({}, { entry: 'ctrl+s' })
  const after = applySetup(before, { entry: 'ctrl+g' })
  expect(after.bindings).toEqual([chat({ 'ctrl+g': 'abovePrompt:focus' })])
})

test('back to the defaults removes Synaptik’s entries, and a block left empty', async () => {
  const before: KeyFile = { bindings: [chat({ 'ctrl+s': 'abovePrompt:focus' }), pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' })] }
  expect(applySetup(before, {}).bindings).toEqual([])
})

test('the defaults also lift an unbinding of the default key', async () => {
  const before: KeyFile = { bindings: [chat({ 'ctrl+x tab': null, 'ctrl+e': 'chat:externalEditor' })] }
  expect(applySetup(before, {}).bindings).toEqual([chat({ 'ctrl+e': 'chat:externalEditor' })])
})

test('a block that was empty already is left alone', async () => {
  const before: KeyFile = { bindings: [pane({})] }
  expect(applySetup(before, {}).bindings).toEqual([pane({})])
})

test('the changes, as the menu lists them before writing', async () => {
  const before: KeyFile = { bindings: [chat({ 'ctrl+g': 'abovePrompt:focus' })] }
  const after = applySetup(before, { entry: 'ctrl+s' })
  expect(changes(before, after)).toEqual(['− Chat  ctrl+g → abovePrompt:focus', '+ Chat  ctrl+s → abovePrompt:focus'])
  expect(changes(after, after)).toEqual([])
})

test('what a choice gives up', async () => {
  expect(costs({ entry: 'ctrl+s' })).toEqual([{ line: 'ctrl+s will no longer stash your prompt' }])
  expect(costs({ verbs: { previous: 'left', next: 'right' } })).toEqual([
    { line: "← → will also move between buttons in other mods' panes" },
    { line: 'Tip: ← on an empty prompt opens agent view (/config → leftArrowOpensAgents)', isTip: true },
  ])
  expect(costs({ entry: 'ctrl+g' })).toEqual([])
})

test('a pressed key in keybindings syntax', async () => {
  expect(bindingName({ key: 's', ctrl: true })).toBe('ctrl+s')
  expect(bindingName({ key: 'tab', shift: true })).toBe('shift+tab')
  expect(bindingName({ key: 'return' })).toBe('enter')
  expect(bindingName({ key: 'n', meta: true })).toBe('meta+n')
})

test('keys that cannot be used, and why', async () => {
  expect(refusal('entry', 'g')).toMatch(/typing/)
  expect(refusal('entry', 'left')).toMatch(/typing and moving/)
  expect(refusal('entry', 'ctrl+g')).toBeUndefined()
  expect(refusal('verb', 'up')).toMatch(/moves between blocks/)
  expect(refusal('verb', 'a')).toMatch(/verb's own key/)
  expect(refusal('verb', 'h')).toBeUndefined()
  expect(refusal('entry', 'escape')).toMatch(/leaves/)
})
