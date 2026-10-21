// No session, no mock `$`: environment variables in, a path out.

import { expect, test } from 'claude-code/testing'

import { keybindingsPath, shownPath } from './configpath'

test('HOME: ~/.claude/keybindings.json', async () => {
  expect(keybindingsPath({ HOME: '/Users/ada' })).toBe('/Users/ada/.claude/keybindings.json')
})

test('Windows without HOME: USERPROFILE, with its own separator', async () => {
  expect(keybindingsPath({ USERPROFILE: 'C:\\Users\\ada' })).toBe('C:\\Users\\ada\\.claude\\keybindings.json')
})

test('HOME wins over USERPROFILE (Git Bash sets both)', async () => {
  expect(keybindingsPath({ HOME: '/c/Users/ada', USERPROFILE: 'C:\\Users\\ada' })).toBe('/c/Users/ada/.claude/keybindings.json')
})

test('CLAUDE_CONFIG_DIR wins over both, and holds the file directly', async () => {
  expect(keybindingsPath({ CLAUDE_CONFIG_DIR: '/opt/claude/', HOME: '/Users/ada' })).toBe('/opt/claude/keybindings.json')
  expect(keybindingsPath({ CLAUDE_CONFIG_DIR: 'D:\\claude', USERPROFILE: 'C:\\Users\\ada' })).toBe('D:\\claude\\keybindings.json')
})

test('nothing set, or only blanks: no path at all, never "undefined/…"', async () => {
  expect(keybindingsPath({})).toBeUndefined()
  expect(keybindingsPath({ HOME: '  ', CLAUDE_CONFIG_DIR: '' })).toBeUndefined()
})

test('shown with the home folder as ~', async () => {
  expect(shownPath('/Users/ada/.claude/keybindings.json', { HOME: '/Users/ada' })).toBe('~/.claude/keybindings.json')
  expect(shownPath('C:\\Users\\ada\\.claude\\keybindings.json', { USERPROFILE: 'C:\\Users\\ada' })).toBe('~\\.claude\\keybindings.json')
  expect(shownPath('/opt/claude/keybindings.json', { HOME: '/Users/ada' })).toBe('/opt/claude/keybindings.json')
  expect(shownPath('/Users/adam/.claude/keybindings.json', { HOME: '/Users/ada' })).toBe('/Users/adam/.claude/keybindings.json')
})
