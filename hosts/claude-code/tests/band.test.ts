// The band's key legend in the navigator (#58): it names the keys the person's
// ~/.claude/keybindings.json binds, Claude Code's defaults when it binds none.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

import { pane, PLUGIN, start } from './engine'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

// Each file gets its own mtime, so the band reads it afresh.
let mtime = 0

// A keybindings file the band can read; without one, its read fails.
function keybindings(on: On, file: unknown) {
  const call = (name: string, value: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => ({ value: value(e) })) as never)
  const text = JSON.stringify(file)
  const mtimeMs = (mtime += 1)
  call('env.get', (e: { name: string }) => (e.name === 'HOME' ? '/home/test' : undefined))
  call('fs.stat', () => ({ kind: 'file', size: text.length, mtimeMs }))
  call('fs.read', () => text)
}

function band($: Dollar) {
  return $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 100, scroll: { offset: 0, bodyRows: 8 }, view: {} },
  })
}

async function legend($: Dollar) {
  await pane($, 'dock') // the navigator holds the keyboard
  const found = await (await band($)).find({ type: 'Text', text: /choose/ })
  return String(found?.text ?? '')
}

test('no keybindings file: the band names tab/⇧tab, Claude Code’s default', async ($, on) => {
  await start($, on, 'rendering')
  expect(await legend($)).toContain('· tab/⇧tab choose ·')
})

test('the recommended Pane bindings: the band names ←→', async ($, on) => {
  keybindings(on, { bindings: [{ context: 'Pane', bindings: { left: 'abovePrompt:previous', right: 'abovePrompt:next' } }] })
  await start($, on, 'rendering')
  expect(await legend($)).toContain('· ←→ choose ·')
})

test('other keys: the band names them as bound', async ($, on) => {
  keybindings(on, { bindings: [{ context: 'Pane', bindings: { h: 'abovePrompt:previous', l: 'abovePrompt:next' } }] })
  await start($, on, 'rendering')
  expect(await legend($)).toContain('· h/l choose ·')
})

test('outside the navigator: the entry key is the person’s own binding', async ($, on) => {
  keybindings(on, { bindings: [{ context: 'Chat', bindings: { 'ctrl+s': 'abovePrompt:focus' } }] })
  await start($, on, 'rendering')
  const found = await (await band($)).find({ type: 'Text', text: /to respond in place/ })
  expect(String(found?.text ?? '')).toContain('ctrl+s')
})
