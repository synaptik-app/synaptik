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
export type Row = { role: 'user' | 'assistant'; text: string; toolUses: unknown[]; toolResults?: unknown[] }

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

// Every suggestion Synaptik proposed in the prompt box, in order; the last one
// is what the box shows. Reset by `engine`.
export const suggestions: string[] = []

// The compiled prompt as last proposed, without the leading space that keeps
// its first glyph clear of the cursor.
export function suggested(): string {
  return (suggestions[suggestions.length - 1] ?? '').replace(/^ /, '')
}

// What the prompt box holds, as `$.prompt.read()` answers it; a test sets it to
// stand for what the person typed or took. Reset by `engine`.
export const promptBox = { text: '' }

// Every move of the focus ring that Synaptik's ui.focus hook passed on to the
// engine, as it passed it, in order. Reset by `engine`.
export const focusMoves: { element?: string }[] = []

// Whether Claude Code places the navigator when it is opened; a test clears it
// to stand for a terminal too narrow (an unasked open waits undrawn). Reset by
// `engine`.
export const placement = { isPlaced: true }

// Every $.ui.open of the navigator, and whether it asked for the keyboard.
// Reset by `engine`.
export const opened: { focus: boolean }[] = []

// Every file Synaptik wrote, in order, path and whole text. Reset by `engine`.
export const written: { path: string; text: string }[] = []

// Every prompt Synaptik submitted (`s` in the navigator). Reset by `engine`.
export const submitted: string[] = []

// Answers every engine call Synaptik makes, with `rows` as the transcript —
// read live, so a test can change it, as a turn does.
export function engine(on: On, rows: Row[]) {
  suggestions.length = 0
  focusMoves.length = 0
  submitted.length = 0
  promptBox.text = ''
  placement.isPlaced = true
  opened.length = 0
  written.length = 0
  const event = (name: string, fn: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => fn(e)) as never)
  const call = (name: string, value: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => ({ value: value(e) })) as never)

  call('session.messages', () => rows)
  call('command.register', (e: { name: string }) => ({ command: e.name }))
  call('ui.open', (e: { focus?: boolean }) => {
    opened.push({ focus: e.focus === true })
    return { isPlaced: placement.isPlaced }
  })
  call('ui.invalidate', () => undefined)
  call('ui.toast', () => undefined)
  event('ui.message', () => ({}))
  call('fs.write', (e: { path: string; text: string }) => {
    written.push({ path: e.path, text: e.text })
    return undefined
  })
  call('prompt.read', () => ({ text: promptBox.text, cursor: promptBox.text.length }))
  event('session.start', (e: { cwd: string }) => ({ cwd: e.cwd }))
  event('ui.scroll', () => ({}))
  // A move of the focus ring, raised by a test (`focus`): passed on by
  // Synaptik's ui.focus hook, recorded here. Synaptik's own $.ui.focus calls
  // cannot be answered by a test; it guards them, and logs where it sent focus
  // (`log`).
  event('ui.focus', (e: { element?: string }) => {
    focusMoves.push({ element: e.element })
    return {}
  })
  event('prompt.submit', (e: { text: string }) => {
    submitted.push(e.text)
    return { text: e.text }
  })
  event('prompt.suggest', (e: { text: string }) => {
    suggestions.push(e.text)
    return { isShown: true }
  })
  event('turn.start', (e: { turnId: string }) => ({ turnId: e.turnId }))
  event('turn.complete', (e: { answer: string }) => ({ text: e.answer }))
  // Claude Code's own drawing, when a hook passes a component through: a
  // marker, so a test can tell "Synaptik drew it" from "passed it on".
  event('ui.render', () => ({ type: 'Text', props: {}, children: [ENGINE_DRAWING] }))
}

// The text of Claude Code's own drawing in a test (see `engine`).
export const ENGINE_DRAWING = '<claude code drew this>'

// Loads a fixture as the session's transcript and starts the session, so
// Synaptik adopts its reply through its real code path. Returns the transcript,
// for a test to add a turn to.
export async function start($: Dollar, on: On, name: string, rows = transcriptOf(name)) {
  engine(on, rows)
  await $.session.start({ cwd: '/tmp/synaptik-test', surface: 'terminal', isInteractive: true })
  return rows
}

// A turn as Claude Code runs it: started, the new rows written, then complete.
export async function turn($: Dollar, rows: Row[], added: Row[], reason: 'answer' | 'aborted' = 'answer') {
  await $.turn.start({ text: String(added[0]?.text ?? ''), turnId: 'turn-test' })
  rows.push(...added)
  const answer = added.filter(r => r.role === 'assistant').map(r => r.text).join('\n\n')
  await $.turn.complete({
    turnId: 'turn-test',
    answer,
    durationMs: 1,
    isAborted: reason === 'aborted',
    reason,
  })
}

// The focus ring moving in the navigator: to `element` (a key), or to Claude
// Code's own stop on the pane when absent. By the person, or by the navigator's
// autoFocus as it takes the keyboard ('plugin').
export function focus($: Dollar, element: string | undefined, kind: 'person' | 'plugin' = 'person') {
  const origin = kind === 'person' ? { kind } : { kind, name: PLUGIN }
  return $.ui.focus({ component: 'Pane', requestId: PANE, element, origin })
}

// The band as Claude Code draws it above the prompt.
export function band($: Dollar) {
  return $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AbovePrompt',
    props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 100, scroll: { offset: 0, bodyRows: 8 }, view: {} },
  })
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

// A person's Home (to the top) or End (to the bottom) in the navigator: Claude
// Code scrolls by the whole tree for them.
export function jump($: Dollar, to: 'home' | 'end') {
  const by = to === 'home' ? -22 : 22
  return $.ui.scroll({
    component: 'Pane',
    requestId: PANE,
    offset: to === 'home' ? 0 : 2,
    by,
    bodyRows: 20,
    contentRows: 22,
    origin: { kind: 'person' },
  })
}

// A person's wheel or trackpad over the navigator: a tick is `by` ±1, a fast
// spin more. Unlike a key, it carries the cell the pointer was over.
export function wheel($: Dollar, by: number) {
  return $.ui.scroll({
    component: 'Pane',
    requestId: PANE,
    offset: 1 + by,
    by,
    bodyRows: 20,
    contentRows: 22,
    origin: { kind: 'person' },
    pointer: { column: 2, row: 5 },
  })
}

// "Block N of M" as the navigator draws it.
export async function position(ui: Dollar) {
  const found = await ui.find({ type: 'Text', text: /Block \d+ of \d+/ })
  const m = found?.text.match(/Block (\d+) of (\d+)/)
  if (!m) throw new Error('no "Block N of M" drawn')
  return { at: Number(m[1]), of: Number(m[2]) }
}

// Walks the navigator up from where it is until the selected block — the one
// Markdown the classic (inline) navigator draws — matches; throws if none does.
export async function select($: Dollar, ui: Dollar, match: RegExp) {
  const { of } = await position(ui)
  for (let i = 0; i <= of; i += 1) {
    const selected = await ui.find({ type: 'Markdown' })
    if (match.test(String(selected?.props.text ?? selected?.text ?? ''))) return
    await arrow($, -1)
  }
  throw new Error(`no block matches ${match}`)
}

// Every block's text, first to last, by walking the classic navigator from the
// last block up. Leaves the selection on the first block.
export async function walk($: Dollar, ui: Dollar): Promise<string[]> {
  const { of } = await position(ui)
  const seen: string[] = []
  for (let i = 0; i < of; i += 1) {
    const selected = await ui.find({ type: 'Markdown' })
    seen.unshift(String(selected?.props.text ?? selected?.text ?? ''))
    await arrow($, -1)
  }
  return seen
}

// `/synaptik <args>`, as the person types it; `''` for a bare `/synaptik`.
export function synaptik($: Dollar, args: string) {
  return $.command.run({ command: 'synaptik', args })
}

// What Synaptik observed (`/synaptik log`): where it sent focus, among others.
export async function log($: Dollar): Promise<string> {
  const result = await $.command.run({ command: 'synaptik', args: 'log' })
  return String(result?.text ?? '')
}

// Each keybindings file gets its own mtime, so the band reads it afresh.
let keyFileTime = 0

// ~/.claude/keybindings.json as the test stands it: `file` written as JSON, or a
// string as the raw text. Without it, reading the file fails, as when it is
// missing.
export function keybindings(on: On, file: unknown) {
  const call = (name: string, value: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => ({ value: value(e) })) as never)
  const text = typeof file === 'string' ? file : JSON.stringify(file)
  const mtimeMs = (keyFileTime += 1)
  call('env.get', (e: { name: string }) => (e.name === 'HOME' ? '/home/test' : undefined))
  call('fs.stat', () => ({ kind: 'file', size: text.length, mtimeMs }))
  call('fs.read', () => text)
}

// A key pressed in the key setup's capture line (key-capture.tsx), posted as
// the capture module posts it, from the navigator pane drawn as `ui`.
export function press(ui: Dollar, key: string, mods: { ctrl?: boolean; shift?: boolean; meta?: boolean } = {}) {
  return ui.post({ key, ctrl: false, shift: false, meta: false, ...mods }, { in: 'key-capture' })
}
