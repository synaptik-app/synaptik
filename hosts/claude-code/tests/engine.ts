// The engine beneath Synaptik, for UI tests with Claude Code's test kit.
//
// In a test nothing sits beneath the plugin: the test's own `on` hooks stand for
// the engine and must answer every engine call the mod makes — events with
// their result, plain calls with { value }. The test's `$` has no state noun,
// so tests drive the mod as a session does and assert on what is drawn.

import type { On } from 'claude-code'

import { FIXTURES } from './fixtures.generated'

export const PLUGIN = 'synaptik'
export const PANE = 'synaptik-map'

// The test's `$`. Its calls are typed per event; these helpers pass plain
// objects shaped as the events expect, so they take it loosely.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dollar = any

// A transcript row as `$.session.messages()` answers it.
type Row = { role: 'user' | 'assistant'; text: string; toolUses: unknown[]; toolResults?: unknown[] }

// A fixture as the transcript a real run leaves: the prompt, then each piece
// of the reply, with a tool call and its result where a `<<sleep N>>` stood.
export function transcriptOf(name: string): Row[] {
  const fixture = FIXTURES[name]
  if (!fixture) throw new Error(`no fixture "${name}"`)
  const rows: Row[] = [{ role: 'user', text: `run ${name}`, toolUses: [] }]
  fixture.pieces.forEach((piece, i) => {
    if (i > 0) {
      rows.push({ role: 'assistant', text: '', toolUses: [{ tool: 'Bash', input: { command: 'sleep 1' } }] })
      rows.push({ role: 'user', text: '', toolUses: [], toolResults: [{ text: '' }] })
    }
    rows.push({ role: 'assistant', text: piece, toolUses: [] })
  })
  return rows
}

// The checklist line a test stands for, found by how it starts — so a test
// name is the fixture's own sentence, and a reworded fixture fails loudly.
export function check(name: string, startsWith: string): string {
  const line = FIXTURES[name]?.checks.find(c => c.startsWith(startsWith))
  if (!line) throw new Error(`fixture "${name}" has no check starting "${startsWith}"`)
  return `${name} › ${line}`
}

// Answers every engine call Synaptik makes, with `rows` as the transcript.
export function engine(on: On, rows: Row[]) {
  const event = (name: string, fn: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => fn(e)) as never)
  const call = (name: string, value: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => ({ value: value(e) })) as never)

  call('session.messages', () => rows)
  call('command.register', (e: { name: string }) => ({ command: e.name }))
  call('ui.open', () => ({ isPlaced: true }))
  call('ui.invalidate', () => undefined)
  call('prompt.read', () => ({ text: '', cursor: 0 }))
  event('session.start', (e: { cwd: string }) => ({ cwd: e.cwd }))
  event('ui.scroll', () => ({}))
  event('ui.focus', () => ({}))
  event('prompt.suggest', () => ({ isShown: true }))
  // Claude Code's own drawing, when a hook passes a component through: a
  // marker, so a test can tell "Synaptik drew it" from "passed it on".
  event('ui.render', () => ({ type: 'Text', props: {}, children: [ENGINE_DRAWING] }))
}

// The text of Claude Code's own drawing in a test (see `engine`).
export const ENGINE_DRAWING = '<claude code drew this>'

// Loads a fixture as the session's transcript and starts the session, so
// Synaptik adopts its reply through its real code path.
export async function start($: Dollar, on: On, name: string) {
  engine(on, transcriptOf(name))
  await $.session.start({ cwd: '/tmp/synaptik-test', surface: 'terminal', isInteractive: true })
}

// Mounts the navigator: docked (fullscreen) or inline (classic).
export function pane($: Dollar, placement: 'dock' | 'inline', isFocused = true, rows = 20) {
  return $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'Pane',
    requestId: PANE,
    props: {
      title: 'Synaptik',
      isFocused,
      bodyColumns: placement === 'dock' ? 30 : 120,
      placement,
      scroll: { offset: 1, bodyRows: rows },
      view: {},
    },
  })
}

// Mounts one piece of a fixture's reply, as the transcript draws it.
export function reply($: Dollar, name: string, piece = 0) {
  return $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: FIXTURES[name]!.pieces[piece]!, isFirstOfReply: piece === 0 },
    viewport: { columns: 120, rows: 40 },
  })
}

// A person's ↑ (by = -1) or ↓ (by = 1) in the navigator.
export function arrow($: Dollar, by: 1 | -1) {
  return $.ui.scroll({
    component: 'Pane',
    requestId: PANE,
    offset: 1 + by,
    by,
    bodyRows: 20,
    contentRows: 22,
    origin: { kind: 'person' },
  })
}

// "Block N of M" as the navigator draws it.
export async function position(ui: Dollar) {
  const found = await ui.find({ type: 'Text', text: /Block \d+ of \d+/ })
  const m = found?.text.match(/Block (\d+) of (\d+)/)
  if (!m) throw new Error('no "Block N of M" drawn')
  return { at: Number(m[1]), of: Number(m[2]) }
}
