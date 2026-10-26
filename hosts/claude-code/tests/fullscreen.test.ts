// The fullscreen fixture's checklist (testbench/fixtures/fullscreen.md), as
// tests: the review in the reply itself (D41). Each block is a Client; a test
// clicks one and presses keys in it, as the person does. Manual only: how the
// terminal draws it, and Esc, which raises nothing a mod can see (#23).

import { expect, test } from 'claude-code/testing'
import type { FoundElement } from 'claude-code/testing'

import {
  band,
  check,
  closed,
  ENGINE_DRAWING,
  focusMoves,
  fullscreen,
  log,
  opened,
  pane,
  promptBox,
  start,
  suggested,
  suggestions,
  synaptik,
  typeInPrompt,
} from './engine'

const F = 'fullscreen'

// The plugin's type config has no timers; the test runtime does.
declare const setTimeout: (run: () => void, ms: number) => unknown
// Lets work a hook started without awaiting it run to the end.
const settled = () => new Promise<void>(resolve => setTimeout(() => resolve(), 0))

// The fixture's blocks, by index (headings are not blocks).
const LEAD = 0
const CACHE = 1
const KEY_BY_USER = 2
const EXPIRE = 3
const RATE_LIMIT = 4
const CODE = 5
const TABLE = 6

type Mounted = Awaited<ReturnType<typeof fullscreen>>

// The Client drawing block `index`, by its props: its key names the reply too.
async function block(ui: Mounted, index: number): Promise<string> {
  const clients = await ui.findAll({ type: 'Client' })
  const found = clients.find((c: FoundElement) => (c.props.props as { index: number }).index === index)
  if (!found) throw new Error(`no Client for block ${index}`)
  return String(found.key)
}

// A click on block `index`, then keys, all in that block: it keeps the
// keyboard for the whole review.
async function clickAndPress(ui: Mounted, index: number, keys: (string | { key: string; shift?: boolean; ctrl?: boolean })[] = []) {
  const into = await block(ui, index)
  await ui.pointer({ type: 'down', x: 4, y: 0, button: 'left', in: into })
  for (const k of keys) await ui.key({ ...(typeof k === 'string' ? { key: k } : k), in: into })
  return into
}

// Every value in a Client's props, deep: none may be undefined, or Claude Code
// refuses the tree and draws its own reply instead.
function hasMissing(value: unknown): boolean {
  if (value === undefined) return true
  if (Array.isArray(value)) return value.some(hasMissing)
  if (value && typeof value === 'object') return Object.values(value).some(hasMissing)
  return false
}

test(check(F, 'No navigator pane opens in fullscreen'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  // A pane opened at session start, before the mod knew, closes on its first
  // drawing; none opens after.
  const before = opened.length
  const p = await pane($, 'dock')
  await p.unmount()
  expect(closed).toContain('synaptik-map')
  const b = await band($)
  expect(await b.find({ type: 'Text', text: /click the reply to respond in place · ctrl\+x tab for keys/ })).toBeDefined()
  expect(opened.length).toBe(before)
})

test(check(F, 'A click on any block selects that block'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  const clients = await ui.findAll({ type: 'Client' })
  // One Client per block; headings are drawn as plain Markdown.
  expect(clients.length).toBeGreaterThan(TABLE)
  expect((clients[0]!.props.props as { text: string }).text).not.toMatch(/^#/)
  for (const index of [CODE, TABLE, KEY_BY_USER]) {
    await clickAndPress(ui, index, ['a'])
  }
  expect(suggested()).toContain('✓ "npm run migrate"')
  expect(suggested()).toContain('✓ "table: Option · Latency"')
  expect(suggested()).toContain('✓ "key each entry by user"')
})

test(check(F, 'After a click, ↑/↓ and Home/End move between blocks'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, RATE_LIMIT, ['up', 'up', 'x'])
  expect(suggested()).toContain('✗ "key each entry by user"')
  await clickAndPress(ui, RATE_LIMIT, ['home', 'a'])
  expect(suggested()).toContain('✓ "Reviewing in the reply itself: a click,')
  const b = await band($)
  expect(await b.find({ type: 'Text', text: /Block 1 of \d+ · ↑↓ blocks/ })).toBeDefined()
})

test(check(F, '←/→ walk the menu under the selected block'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  // From accept: → reject, → comment, ← reject; ⏎ applies reject.
  await clickAndPress(ui, CACHE, ['right', 'right', 'left', 'return'])
  expect(suggested()).toBe('✗ "1. Cache sessions in Redis"')
})

test(check(F, 'a / x / c / d act directly on the selected block'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['a', 'down', 'x', 'down', 'd'])
  expect(suggested()).toBe(['✓ "1. Cache sessions in Redis"', '    ✗ "key each entry by user"'].join('\n'))
  expect(await log($)).not.toContain('discuss failed')
})

test(check(F, 'c opens a comment under the block, dim, with a cursor'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, EXPIRE, ['c', 't', 'o', 'o', 'space', 'l', 'o', 'n', 'g', 'home', 'delete', 'end', 'backspace', 'return'])
  expect(suggested()).toBe(['"1. Cache sessions in Redis"', '    ✎ "expire after 5 minutes" → oo lon'].join('\n'))
})

test(check(F, 'In a comment, backslash then ⏎ starts a new line'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, RATE_LIMIT, ['c', 'a', '\\', 'return', 'b', 'down'])
  expect(suggested()).toContain('✎ "2. Rate-limit the login endpoint" → a\nb')
  // ↓ staged it and moved on; Backspace on an empty comment cancels it.
  await clickAndPress(ui, RATE_LIMIT, ['c', 'backspace', 'backspace', 'backspace', 'backspace'])
  expect(suggested()).not.toContain('Rate-limit')
})

test(check(F, 'A paste while a comment is open goes into the comment'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  const into = await clickAndPress(ui, CACHE, ['c', 'a'])
  await typeInPrompt($, 'pasted', null)
  expect(promptBox.text).toBe('')
  // The block draws the hooks' review again: the paste is in its comment.
  const again = await fullscreen($, F)
  await again.key({ key: 'return', in: into })
  expect(suggested()).toBe('✎ "1. Cache sessions in Redis" → apasted')
})

test(check(F, 'c on a commented block reopens its text'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['c', 'h', 'i', 'return', 'c', '!', 'return'])
  expect(suggested()).toBe('✎ "1. Cache sessions in Redis" → hi!')
})

test(check(F, 'Typing in the prompt takes the selection and the menu off the reply'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['c', 'h'])
  await typeInPrompt($, 'x')
  const after = await fullscreen($, F)
  const clients = await after.findAll({ type: 'Client' })
  // Still drawn as Clients — a missing value in the props would have made Claude
  // Code refuse the tree and draw its own reply, with nothing to click.
  expect(clients.length).toBeGreaterThan(0)
  expect(await after.find({ type: 'Text', text: ENGINE_DRAWING })).toBeUndefined()
  for (const c of clients) expect(hasMissing(c.props.props)).toBe(false)
  const review = (clients[0]!.props.props as { review: { isActive: boolean } }).review
  expect(review.isActive).toBe(false)
  // A click brings them back.
  await clickAndPress(after, RATE_LIMIT, ['x'])
  expect(suggested()).toContain('✗ "2. Rate-limit the login endpoint"')
})

test(check(F, 'The suggestion in the prompt box follows every mark'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['a'])
  expect(suggested()).toBe('✓ "1. Cache sessions in Redis"')
  await typeInPrompt($, 'x')
  const before = suggestions.length
  // A clear: raised as Claude Code raises it (the test's `$` lists no such call).
  await ($ as unknown as { prompt: { change: (e: object) => Promise<unknown> } }).prompt.change({ origin: { kind: 'clear' }, text: '', cursor: 0 })
  await settled()
  expect(suggestions.length).toBe(before + 1)
  expect(suggested()).toBe('✓ "1. Cache sessions in Redis"')
})

test(check(F, 'Keyboard only: ctrl+x tab focuses the band'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const b = await band($)
  // Review starts on the last block; k k moves up two, j back one.
  await b.press({ key: 'block-previous' })
  await b.press({ key: 'block-previous' })
  await b.press({ key: 'block-next' })
  await b.press({ key: 'verb-reject' })
  expect(suggested()).toMatch(/^✗ "/)
  const legend = await band($)
  expect(await legend.find({ type: 'Text', text: /j\/k blocks · ←→ actions/ })).toBeDefined()
})

test('the band ring never stops on j / k: they are hotkeys', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const result = await $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: 'block-next', origin: { kind: 'person' } })
  expect(JSON.stringify(result)).toContain('deny')
  expect(focusMoves).toEqual([])
})

test('a new reply starts fresh Clients: nothing a block kept carries over', async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  const first = await block(ui, LEAD)
  await $.turn.start({ text: 'again', turnId: 'turn-2' })
  await $.turn.complete({ turnId: 'turn-2', answer: 'A new reply.', durationMs: 1, isAborted: false, reason: 'answer' })
  expect(first).toMatch(/^block-\d+-0$/)
})

test('/synaptik in fullscreen says how to start: there is no navigator to open', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const before = opened.length
  const answer = await synaptik($, '')
  expect(JSON.stringify(answer)).toContain('click the reply to respond in place')
  expect(opened.length).toBe(before)
})
