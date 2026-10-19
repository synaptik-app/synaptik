// No session, no mock `$`: a keybindings file in, the band's key labels out.

import { expect, test } from 'claude-code/testing'

import { boundKey, DEFAULT_KEYS, keyLabel, keysFrom, parseKeyFile } from './keys'
import type { KeyFile } from './keys'

const pane = (bindings: Record<string, string | null>) => ({ context: 'Pane', bindings })
const chat = (bindings: Record<string, string | null>) => ({ context: 'Chat', bindings })
const arrows = pane({ left: 'abovePrompt:previous', right: 'abovePrompt:next' })

test('no bindings: Claude Code’s defaults, tab/⇧tab to choose', async () => {
  expect(keysFrom({})).toEqual(DEFAULT_KEYS)
  expect(keysFrom({}).choose).toBe('tab/⇧tab')
})

test('the recommended bindings: ← and → choose, ctrl+s enters', async () => {
  const file: KeyFile = { bindings: [chat({ 'ctrl+s': 'abovePrompt:focus' }), arrows] }
  expect(keysFrom(file)).toEqual({ entry: 'ctrl+s', choose: '←→' })
})

test('other keys are named as bound, previous first', async () => {
  const file: KeyFile = { bindings: [pane({ h: 'abovePrompt:previous', l: 'abovePrompt:next' })] }
  expect(keysFrom(file).choose).toBe('h/l')
})

test('only one direction bound: the other keeps its default', async () => {
  const file: KeyFile = { bindings: [pane({ right: 'abovePrompt:next' })] }
  expect(keysFrom(file).choose).toBe('⇧tab/→')
})

test('bindings in other contexts do not count', async () => {
  const file: KeyFile = {
    bindings: [{ context: 'AbovePrompt', bindings: { left: 'abovePrompt:previous', right: 'abovePrompt:next' } }],
  }
  expect(keysFrom(file).choose).toBe('tab/⇧tab')
})

test('a later block replaces an earlier one, and null unbinds', async () => {
  const unbound: KeyFile = { bindings: [arrows, pane({ left: null, right: null })] }
  expect(keysFrom(unbound).choose).toBe('tab/⇧tab')

  const rebound: KeyFile = { bindings: [arrows, pane({ left: 'chat:submit', h: 'abovePrompt:previous' })] }
  expect(boundKey(rebound, 'Pane', 'abovePrompt:previous')).toBe('h')
})

test('of several keys for one action, the last one counts', async () => {
  const file: KeyFile = { bindings: [chat({ 'ctrl+s': 'abovePrompt:focus', 'ctrl+g': 'abovePrompt:focus' })] }
  expect(keysFrom(file).entry).toBe('ctrl+g')
})

test('labels: arrows and shift as glyphs, chords as written', async () => {
  expect(keyLabel('left')).toBe('←')
  expect(keyLabel('shift+tab')).toBe('⇧tab')
  expect(keyLabel('ctrl+shift+right')).toBe('ctrl+⇧→')
  expect(keyLabel('ctrl+x tab')).toBe('ctrl+x tab')
})

test('a file that is not JSON, or has no bindings, binds nothing', async () => {
  expect(parseKeyFile('{ not json')).toEqual({})
  expect(parseKeyFile('[]')).toEqual({})
  expect(parseKeyFile('null')).toEqual({})
  const file = parseKeyFile('{"bindings": [{"context": "Pane", "bindings": {"h": "abovePrompt:previous"}}]}')
  expect(file.bindings?.length).toBe(1)
})
