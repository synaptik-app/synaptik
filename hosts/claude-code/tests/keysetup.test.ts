// The key setup, `/synaptik config` (D38): a mode of the navigator pane that
// edits ~/.claude/keybindings.json, and writes only on Save. ↑/↓ move between
// its rows (Open Synaptik, Move between actions, Save, Cancel); ⏎ on a setting
// opens its options, ↑/↓ choose, ⏎ takes one and goes back to the rows.
//
// Its redraws go through $.ui.invalidate, which the test engine answers without
// drawing again, so each step draws the pane again (`menu`).

import { expect, test } from 'claude-code/testing'

import { arrow, band, failing, keybindings, log, pane, position, press, start, synaptik, written } from './engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

const DEFAULTS = { bindings: [] }

// The navigator pane as drawn now — the one drawing of it, the last unmounted
// first. Holding the keyboard, unless `isFocused` is false (Esc, or a click
// that gave the capture line the keyboard).
let drawn: Dollar
async function menu($: Dollar, placement: 'dock' | 'inline' = 'dock', isFocused = true) {
  if (drawn) await drawn.unmount().catch(() => undefined)
  drawn = await pane($, placement, isFocused, 30)
  return drawn
}

// Each test starts with no drawing of its own.
async function begin($: Dollar, on: Dollar, file: unknown = DEFAULTS, env?: Record<string, string>) {
  drawn = undefined
  keybindings(on, file, env)
  await start($, on, 'rendering')
  await synaptik($, 'config')
}

async function lines($: Dollar, placement: 'dock' | 'inline' = 'dock'): Promise<string[]> {
  return (await (await menu($, placement)).findAll({ type: 'Text' })).map((t: { text: unknown }) => String(t.text))
}

const enter = async ($: Dollar) => (await menu($)).press({ key: 'key-enter' })
const down = (n = 1) => async ($: Dollar) => {
  for (let i = 0; i < n; i += 1) await arrow($, 1)
}

const savedFile = () => JSON.parse(written.at(-1)!.text) as { bindings: { context: string; bindings: Record<string, string> }[] }

test('/synaptik config opens the setup in the navigator: its rows, the cursor on the first', async ($, on) => {
  await begin($, on)
  const shown = await lines($)
  expect(shown).toContain('Synaptik keys')
  expect(shown).toContain('▸ Open Synaptik · ctrl+x tab')
  expect(shown).toContain('  Move between actions · tab / ⇧tab')
  expect(shown).toContain('  Save')
  expect(shown).toContain('  Cancel')
  expect(shown).toContain('No changes to ~/.claude/keybindings.json')
})

test('the setup starts from what the file binds', async ($, on) => {
  await begin($, on, {
    bindings: [
      { context: 'Chat', bindings: { 'ctrl+s': 'abovePrompt:focus' } },
      { context: 'Pane', bindings: { left: 'abovePrompt:previous', right: 'abovePrompt:next' } },
    ],
  })
  const shown = await lines($)
  expect(shown).toContain('▸ Open Synaptik · ctrl+s')
  expect(shown).toContain('  Move between actions · ← / →')
})

test('↑/↓ move the cursor between the rows, and stop at the ends', async ($, on) => {
  await begin($, on)
  await down(2)($)
  expect(await lines($)).toContain('▸ Save')
  await down(5)($)
  expect(await lines($)).toContain('▸ Cancel')
  for (let i = 0; i < 6; i += 1) await arrow($, -1)
  expect(await lines($)).toContain('▸ Open Synaptik · ctrl+x tab')
})

test('⏎ on a setting opens its options, the cursor on the current one', async ($, on) => {
  await begin($, on)
  await enter($)
  const shown = await lines($)
  expect(shown).toContain('↑↓ choose · ⏎ select')
  expect(shown).toContain('  ‹ back')
  expect(shown).toContain('▸ ctrl+x tab (default)  (now)')
  expect(shown).toContain('  ctrl+s')
  expect(shown).toContain('  custom…')
})

test('⏎ on an option takes it and returns to the rows, listing the change and its cost', async ($, on) => {
  await begin($, on)
  await enter($)
  await down()($)
  await enter($)
  const shown = await lines($)
  expect(shown).toContain('▸ Open Synaptik · ctrl+s')
  expect(shown).toContain('  + Chat  ctrl+s → abovePrompt:focus')
  expect(shown).toContain('  ctrl+s will no longer stash your prompt')
  expect(written).toEqual([])
})

test('‹ back returns to the rows with nothing changed', async ($, on) => {
  await begin($, on)
  await enter($)
  await arrow($, -1) // ‹ back, above the current option
  await enter($)
  const shown = await lines($)
  expect(shown).toContain('▸ Open Synaptik · ctrl+x tab')
  expect(shown).toContain('No changes to ~/.claude/keybindings.json')
})

test('Save writes the choice, keeps the file’s other bindings, and closes the setup', async ($, on) => {
  await begin($, on, { bindings: [{ context: 'Chat', bindings: { 'ctrl+e': 'chat:externalEditor' } }] })
  await enter($) // Open Synaptik
  await down()($)
  await enter($) // ctrl+s
  await down()($)
  await enter($) // Move between actions
  await down()($)
  await enter($) // ← / →
  await down()($)
  await enter($) // Save
  expect(written.map(w => w.path)).toEqual(['/home/test/.claude/keybindings.json'])
  expect(savedFile().bindings).toEqual([
    { context: 'Chat', bindings: { 'ctrl+e': 'chat:externalEditor', 'ctrl+s': 'abovePrompt:focus' } },
    { context: 'Pane', bindings: { left: 'abovePrompt:previous', right: 'abovePrompt:next' } },
  ])
  expect(await lines($)).not.toContain('Synaptik keys')
})

test('Save with nothing changed writes nothing', async ($, on) => {
  await begin($, on)
  await down(2)($)
  await enter($)
  expect(written).toEqual([])
})

test('Cancel writes nothing and returns to the navigator', async ($, on) => {
  await begin($, on)
  await enter($)
  await down()($)
  await enter($) // ctrl+s, unsaved
  await down(3)($)
  await enter($) // Cancel
  expect(written).toEqual([])
  expect(await (await menu($)).find({ type: 'Text', text: /Block \d+ of \d+/ })).toBeDefined()
})

test('Esc — the pane giving the keyboard back — closes the setup unsaved', async ($, on) => {
  await begin($, on)
  await enter($)
  await down()($)
  await enter($)
  await menu($, 'dock', false)
  expect(await lines($)).not.toContain('Synaptik keys')
  expect(written).toEqual([])
})

test('custom: the key pressed in the capture line becomes the setting, and the cursor goes to Save', async ($, on) => {
  await begin($, on)
  await enter($)
  await down(2)($) // custom…
  await enter($)
  expect(await (await menu($)).find({ type: 'Client', key: 'key-capture' })).toBeDefined()
  await menu($, 'dock', false) // the click: the capture line holds the keyboard
  await press(await menu($, 'dock', false), 'g', { ctrl: true })
  const shown = await lines($)
  expect(shown).toContain('  Open Synaptik · ctrl+g')
  expect(shown).toContain('▸ Save')
  expect(shown).toContain('  + Chat  ctrl+g → abovePrompt:focus')
  expect(await (await menu($)).find({ type: 'Client', key: 'key-capture' })).toBeUndefined()
  expect(await log($)).toContain('key menu: keyboard back to the menu')
})

test('custom: Esc in the capture line cancels the capture; a second Esc discards the setup', async ($, on) => {
  await begin($, on)
  await enter($)
  await down(2)($)
  await enter($)
  await menu($, 'dock', false) // the click
  expect((await lines($)).includes('Synaptik keys')).toBe(true) // Esc in the capture line: back with the menu
  expect(await (await menu($)).find({ type: 'Client', key: 'key-capture' })).toBeUndefined()
  await menu($, 'dock', false) // Esc in the menu
  expect(await lines($)).not.toContain('Synaptik keys')
  expect(written).toEqual([])
})

test('custom: a key that would break typing is refused, and the line keeps waiting', async ($, on) => {
  await begin($, on)
  await enter($)
  await down(2)($)
  await enter($)
  await press(await menu($), 'g')
  expect((await lines($)).some(l => /g can't be used: .*typing/.test(l))).toBe(true)
  expect(await (await menu($)).find({ type: 'Client', key: 'key-capture' })).toBeDefined()
})

test('custom actions: two presses, previous then next', async ($, on) => {
  await begin($, on)
  await down()($)
  await enter($)
  await down(2)($) // custom…
  await enter($)
  await press(await menu($), 'h')
  expect((await lines($)).some(l => /previous: h · now press the key for next/.test(l))).toBe(true)
  await press(await menu($), 'h')
  expect((await lines($)).some(l => /two different keys/.test(l))).toBe(true)
  await press(await menu($), 'l')
  const shown = await lines($)
  expect(shown).toContain('  Move between actions · h / l')
  expect(shown).toContain('  + Pane  h → abovePrompt:previous')
  expect(shown).toContain('  + Pane  l → abovePrompt:next')
})

test('classic: the presets only, since capturing needs a click', async ($, on) => {
  await begin($, on)
  await (await menu($, 'inline')).press({ key: 'key-enter' })
  const shown = await lines($, 'inline')
  expect(shown).toContain('  ctrl+s')
  expect(shown).not.toContain('  custom…')
})

test('a keybindings file that is not JSON is never written', async ($, on) => {
  drawn = undefined
  keybindings(on, '{ "bindings": [ oops')
  await start($, on, 'rendering')
  expect((await synaptik($, 'config'))?.text).toMatch(/isn't JSON/)
  expect(await lines($)).not.toContain('Synaptik keys')
})

test('while the setup is open, ↑/↓ move nothing in the reply, and the action keys are gone', async ($, on) => {
  drawn = undefined
  keybindings(on, DEFAULTS)
  await start($, on, 'rendering')
  const before = await position(await menu($))
  await synaptik($, 'config')
  expect(await (await menu($)).find({ type: 'Button', key: 'verb-accept' })).toBeUndefined()
  await arrow($, -1)
  await down(3)($)
  await enter($) // Cancel
  expect(await position(await menu($))).toEqual(before)
})

test('the setup names its keys at the top, and the band says what is going on', async ($, on) => {
  await begin($, on)
  expect(await lines($)).toContain('↑↓ move · ⏎ change · esc: discard changes')
  expect(await (await band($)).find({ type: 'Text', text: /customizing Synaptik/ })).toBeDefined()
})

// Where the file is (#74): Claude Code's config folder, from CLAUDE_CONFIG_DIR,
// else HOME, else USERPROFILE (Windows without HOME).

// Open Synaptik → ctrl+s → Save.
async function saveCtrlS($: Dollar) {
  await enter($)
  await down()($)
  await enter($)
  await down(2)($)
  await enter($)
}

test('Windows without HOME: the file is under USERPROFILE, and the menu shows it as ~', async ($, on) => {
  await begin($, on, DEFAULTS, { USERPROFILE: 'C:\\Users\\ada' })
  await enter($)
  await down()($)
  await enter($)
  expect(await lines($)).toContain('Save changes ~\\.claude\\keybindings.json:')
  await down(2)($)
  await enter($)
  // Off Windows the kit reads a `C:\…` path as relative and prefixes the working
  // folder; on Windows it is absolute. The path the mod built is the tail.
  expect(written.map(w => w.path.endsWith('C:\\Users\\ada\\.claude\\keybindings.json'))).toEqual([true])
})

test('CLAUDE_CONFIG_DIR: the file is in that folder', async ($, on) => {
  await begin($, on, DEFAULTS, { CLAUDE_CONFIG_DIR: '/opt/claude', HOME: '/home/test' })
  await saveCtrlS($)
  expect(written.map(w => w.path)).toEqual(['/opt/claude/keybindings.json'])
})

test('no folder at all: /synaptik config says so and opens nothing', async ($, on) => {
  drawn = undefined
  keybindings(on, DEFAULTS, {})
  await start($, on, 'rendering')
  expect((await synaptik($, 'config'))?.text).toMatch(/can't find Claude Code's config folder/)
  expect(await lines($)).not.toContain('Synaptik keys')
  expect(written).toEqual([])
})

test('a failed write keeps the menu and the choice, and says why', async ($, on) => {
  await begin($, on)
  failing.write = 'EACCES: permission denied'
  await saveCtrlS($)
  const shown = await lines($)
  expect(shown).toContain('Synaptik keys')
  // The reason is the file system's in a session; the kit skips a test hook that
  // throws, so here it reads as the call having no answer.
  expect(shown.some(l => /^couldn't write ~\/\.claude\/keybindings\.json: /.test(l))).toBe(true)
  expect(shown).toContain('  Open Synaptik · ctrl+s')
  failing.write = ''
  await enter($) // the cursor is still on Save: try again
  expect(written.map(w => w.path)).toEqual(['/home/test/.claude/keybindings.json'])
})
