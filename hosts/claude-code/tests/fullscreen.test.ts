// The fullscreen fixture's checklist (testbench/fixtures/fullscreen.md), as
// tests: the review in the reply itself (D41). Each block is a Client; a test
// clicks one and presses keys in it, as the person does. Manual only: how the
// terminal draws it, and Esc, which raises nothing a mod can see (#23).

import { expect, mock, test } from 'claude-code/testing'
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

// ctrl+x tab: the band's ring lands on the first action, which starts a review.
// null: the ring leaves Synaptik's controls (Esc, the prompt).
function review($: Parameters<typeof start>[0], element: string | null = 'verb-accept') {
  return $.ui.focus({ component: 'AbovePrompt', requestId: 'band', element: element ?? undefined, origin: { kind: 'person' } })
}

// The key a band control is drawn under now: its base, and after a review has
// ended, its generation (`@<n>`).
async function bandKey(b: Awaited<ReturnType<typeof band>>, base: string, type = 'Button'): Promise<string> {
  const found = (await b.findAll({ type })).find((el: FoundElement) => String(el.key).split('@')[0] === base)
  if (!found) throw new Error(`no ${type} ${base} in the band`)
  return String(found.key)
}

// What the band's hint line shows: its messages, cycled by the hint Client.
async function hintLines(b: Awaited<ReturnType<typeof band>>): Promise<string[]> {
  const hint = (await b.findAll({ type: 'Client' })).find((el: FoundElement) => String(el.key).startsWith('band-hint'))
  return ((hint?.props.props as { messages?: string[] } | undefined)?.messages ?? [])
}

// Every value in a Client's props, deep: none may be undefined, or Claude Code
// refuses the tree and draws its own reply instead.
function hasMissing(value: unknown): boolean {
  if (value === undefined) return true
  if (Array.isArray(value)) return value.some(hasMissing)
  if (value && typeof value === 'object') return Object.values(value).some(hasMissing)
  return false
}

test('no navigator pane opens in fullscreen, and the band says how to start', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  // A pane opened at session start, before the mod knew, closes on its first
  // drawing; none opens after.
  const before = opened.length
  const p = await pane($, 'dock')
  await p.unmount()
  expect(closed).toContain('synaptik-map')
  const b = await band($)
  expect(await hintLines(b)).toEqual(['ctrl+x tab to review the reply', 'click here to review the reply'])
  expect(opened.length).toBe(before)
})

test(check(F, 'A click on any block selects that block'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
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
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, RATE_LIMIT, ['up', 'up', 'x'])
  expect(suggested()).toContain('✗ "key each entry by user"')
  await clickAndPress(ui, RATE_LIMIT, ['home', 'a'])
  expect(suggested()).toContain('✓ "Reviewing in the reply itself: ctrl+x tab,')
  const b = await band($)
  expect((await hintLines(b))[0]).toMatch(/^Block 1 of \d+ · ↑↓ blocks/)
})

test(check(F, '←/→ walk the menu under the selected block'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  // From accept: → reject, → comment, ← reject; ⏎ applies reject.
  await clickAndPress(ui, CACHE, ['right', 'right', 'left', 'return'])
  expect(suggested()).toBe('✗ "1. Cache sessions in Redis"')
})

test(check(F, 'a / x / c / d act directly on the selected block'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['a', 'down', 'x', 'down', 'd'])
  expect(suggested()).toBe(['✓ "1. Cache sessions in Redis"', '    ✗ "key each entry by user"'].join('\n'))
  expect(await log($)).not.toContain('discuss failed')
})

test(check(F, 'c opens a comment under the block, dim, with a cursor'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, EXPIRE, ['c', 't', 'o', 'o', 'space', 'l', 'o', 'n', 'g', 'home', 'delete', 'end', 'backspace', 'return'])
  expect(suggested()).toBe(['"1. Cache sessions in Redis"', '    ✎ "expire after 5 minutes" → oo lon'].join('\n'))
})

test(check(F, 'In a comment, backslash then ⏎ starts a new line'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, RATE_LIMIT, ['c', 'a', '\\', 'return', 'b', 'up', 'down', 'return'])
  const lead = '✎ "2. Rate-limit the login endpoint" → '
  expect(suggested()).toContain(`${lead}a\n${' '.repeat(lead.length)}b`)
  // ↓ staged it and moved on; Backspace on an empty comment cancels it.
  await clickAndPress(ui, RATE_LIMIT, ['c', 'backspace', 'backspace', 'backspace', 'backspace'])
  expect(suggested()).not.toContain('Rate-limit')
})

test(check(F, 'A paste while a comment is open goes into the comment'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
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
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['c', 'h', 'i', 'return', 'c', '!', 'return'])
  expect(suggested()).toBe('✎ "1. Cache sessions in Redis" → hi!')
})

test(check(F, 'Typing in the prompt ends the review'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await clickAndPress(ui, CACHE, ['c', 'h'])
  for (const c of await ui.findAll({ type: 'Client' })) expect(hasMissing(c.props.props)).toBe(false)
  await typeInPrompt($, 'x')
  // The reply is plain again: its text can be selected.
  const after = await fullscreen($, F)
  expect(await after.findAll({ type: 'Client' })).toEqual([])
  // ctrl+x tab starts a review again, and a click works.
  await review($)
  const again = await fullscreen($, F)
  await clickAndPress(again, RATE_LIMIT, ['x'])
  expect(suggested()).toContain('✗ "2. Rate-limit the login endpoint"')
})

test(check(F, 'The suggestion in the prompt box follows every mark'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
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

test(check(F, 'ctrl+x tab starts a review'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const b = await band($)
  // Review starts on the last block; k k moves up two, j back one.
  await b.press({ key: 'block-previous' })
  await b.press({ key: 'block-previous' })
  await b.press({ key: 'block-next' })
  await b.press({ key: 'verb-reject' })
  expect(suggested()).toMatch(/^✗ "/)
  const legend = await band($)
  expect((await hintLines(legend))[0]).toMatch(/^Block \d+ of \d+ · j\/k blocks · ←→ actions/)
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
  await fullscreen($, F)
  await review($)
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
  expect(JSON.stringify(answer)).toContain('to review the reply')
  expect(opened.length).toBe(before)
})

test(check(F, 'Outside a review the reply is plain'), async ($, on) => {
  await start($, on, F)
  const ui = await fullscreen($, F)
  expect(await ui.findAll({ type: 'Client' })).toEqual([])
  expect(await ui.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
})

test('the band\'s focus leaving its controls ends the review', async ($, on) => {
  const clock = mock.clock(on)
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  expect((await (await fullscreen($, F)).findAll({ type: 'Client' })).length).toBeGreaterThan(0)
  await review($, null) // the ring leaves Synaptik's controls
  await clock.advance(400)
  expect(await (await fullscreen($, F)).findAll({ type: 'Client' })).toEqual([])
})

test('the band losing the keyboard to a click in the reply keeps the review', async ($, on) => {
  const clock = mock.clock(on)
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  await review($, null)
  await clickAndPress(ui, CACHE, ['a'])
  await clock.advance(400)
  expect((await (await fullscreen($, F)).findAll({ type: 'Client' })).length).toBeGreaterThan(0)
  expect(suggested()).toBe('✓ "1. Cache sessions in Redis"')
})

test(check(F, 'A click on the band\'s hint starts the review'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const b = await band($)
  await b.pointer({ type: 'down', x: 2, y: 0, button: 'left', in: 'band-hint' })
  expect((await (await fullscreen($, F)).findAll({ type: 'Client' })).length).toBeGreaterThan(0)
  // Review starts on the last block; ↑ ↑ moves up two, x rejects it.
  await b.key({ key: 'up', in: 'band-hint' })
  await b.key({ key: 'up', in: 'band-hint' })
  await b.key({ key: 'x', in: 'band-hint' })
  expect(suggested()).toMatch(/^✗ "/)
  expect((await hintLines(await band($)))[0]).toMatch(/↑↓ blocks/)
})

test(check(F, 'q ends the review'), async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  // In the reply, after a click: a comment keeps its q; outside one, q ends it.
  await clickAndPress(ui, CACHE, ['c', 'q', 'return', 'q'])
  expect(suggested()).toBe('✎ "1. Cache sessions in Redis" → q')
  expect(await (await fullscreen($, F)).findAll({ type: 'Client' })).toEqual([])
  // From the band (ctrl+x tab).
  await review($)
  expect((await (await fullscreen($, F)).findAll({ type: 'Client' })).length).toBeGreaterThan(0)
  const withEnd = await band($)
  await withEnd.press({ key: await bandKey(withEnd, 'review-end') })
  expect(await (await fullscreen($, F)).findAll({ type: 'Client' })).toEqual([])
  // From the band's hint, clicked.
  const b = await band($)
  const hint = await bandKey(b, 'band-hint', 'Client')
  await b.pointer({ type: 'down', x: 2, y: 0, button: 'left', in: hint })
  await b.key({ key: 'q', in: hint })
  expect(await (await fullscreen($, F)).findAll({ type: 'Client' })).toEqual([])
  expect(await hintLines(await band($))).toEqual(['ctrl+x tab to continue reviewing', 'click here to continue reviewing'])
})

test('the staged line says nothing about the prompt during a review: ⏎ applies an action there', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  await clickAndPress(await fullscreen($, F), CACHE, ['a'])
  promptBox.text = suggested() // taken before, still in the box
  expect((await (await band($)).find({ type: 'Text', text: /✓1/ }))?.text).toBe('⎿  ✓1')
  await typeInPrompt($, '!') // the review ends: now the box's state shows
  expect(await (await band($)).find({ type: 'Text', text: /⏎ sends what you typed/ })).toBeDefined()
})

test('ending a review draws the band\'s controls anew, so the keyboard goes back to the prompt', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const before = await band($)
  const end = await bandKey(before, 'review-end')
  const hint = await bandKey(before, 'band-hint', 'Client')
  await before.press({ key: end })
  const after = await band($)
  // The controls that held the keyboard are gone: their keys are new.
  expect(await bandKey(after, 'review-end')).not.toBe(end)
  expect(await bandKey(after, 'band-hint', 'Client')).not.toBe(hint)
  expect(await after.find({ type: 'Button', key: end })).toBeUndefined()
})

test('a change in the prompt box redraws the band, so its note follows the box', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  await clickAndPress(await fullscreen($, F), CACHE, ['a', 'q'])
  expect((await (await band($)).find({ type: 'Text', text: /✓1/ }))?.text).toBe('⎿  ✓1 · tab, then ⏎ to send')
  promptBox.text = ''
  await typeInPrompt($, suggested())
  expect((await (await band($)).find({ type: 'Text', text: /✓1/ }))?.text).toBe('⎿  ✓1 · ⏎ sends your feedback')
  await typeInPrompt($, '!')
  expect((await (await band($)).find({ type: 'Text', text: /✓1/ }))?.text).toBe('⎿  ✓1 · ⏎ sends what you typed')
})

test('from the band\'s hint, a comment is typed in place like a clicked block\'s', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  const b = await band($)
  const hint = await bandKey(b, 'band-hint', 'Client')
  await b.pointer({ type: 'down', x: 2, y: 0, button: 'left', in: hint })
  // To "key each entry by user", → → to ✎ comment, ⏎ opens it; typed, a new line, staged.
  for (const key of ['home', 'down', 'down', 'right', 'right', 'return', 'n', 'o', 'space', 't', 't', 'l', '\\', 'return', 'k', 'return']) {
    await b.key({ key, in: hint })
  }
  const lead = '    ✎ "key each entry by user" → '
  expect(suggested()).toBe(['"1. Cache sessions in Redis"', `${lead}no ttl`, `${' '.repeat(lead.length)}k`].join('\n'))
  // While it is typed, it shows in place under its block, with its cursor.
  await b.key({ key: 'c', in: hint })
  const reply = await fullscreen($, F)
  const into = (await reply.findAll({ type: 'Client' })).find((c: FoundElement) => (c.props.props as { index: number }).index === KEY_BY_USER)
  expect((into?.props.props as { review: { editing?: { text: string } } }).review.editing?.text).toBe('no ttl\nk')
})

test('a click on an action applies it and keeps the keyboard in the reply', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  const into = await clickAndPress(ui, CACHE)
  // The block's region: its one row of text, then the menu.
  await ui.resize({ columns: 100, rows: 2, in: into })
  // "└ " at 2 cells in, then "[ ✓ accept ]" (12 cells): 17 is inside "[ ✗ reject ]".
  await ui.pointer({ type: 'down', x: 17, y: 1, button: 'left', in: into })
  expect(suggested()).toBe('✗ "1. Cache sessions in Redis"')
  // The menu is the block's own text — no Buttons: a Button would take the
  // keyboard when clicked.
  expect(await ui.find({ type: 'Text', text: /✗ reject/, in: into })).toBeDefined()
  expect(await ui.findAll({ type: 'Button', in: into })).toEqual([])
  // The same block still has the keyboard: ↓ moves, a accepts.
  await ui.key({ key: 'down', in: into })
  await ui.key({ key: 'a', in: into })
  expect(suggested()).toBe(['✗ "1. Cache sessions in Redis"', '    ✓ "key each entry by user"'].join('\n'))
})

test('the menu item under the mouse is drawn inverse, as a button under the mouse is', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  const into = await clickAndPress(ui, CACHE)
  await ui.resize({ columns: 100, rows: 2, in: into })
  const reject = async () => (await ui.findAll({ type: 'Text', in: into })).find((t: FoundElement) => String(t.text).includes('✗ reject'))
  await ui.pointer({ type: 'move', x: 17, y: 1, in: into })
  expect((await reject())?.props.inverse).toBe(true)
  await ui.pointer({ type: 'leave', x: 17, y: 1, in: into })
  expect((await reject())?.props.inverse).toBeUndefined()
  // Hovering marks nothing; the click does.
  expect(suggested()).toBe('')
  await ui.pointer({ type: 'down', x: 17, y: 1, button: 'left', in: into })
  expect(suggested()).toBe('✗ "1. Cache sessions in Redis"')
})

test('a staged comment of several lines shows as one row, so a click on the menu lands on the menu', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  const into = await clickAndPress(ui, CACHE, ['c', 'a', '\\', 'return', 'b', '\\', 'return', 'c', 'return'])
  expect(await ui.find({ type: 'Text', text: /→ a \(\+2 lines\)/, in: into })).toBeDefined()
  // The block's region: its text, the menu, then the comment's one row.
  await ui.resize({ columns: 100, rows: 3, in: into })
  await ui.pointer({ type: 'down', x: 17, y: 1, button: 'left', in: into })
  expect(suggested()).toBe('✗ "1. Cache sessions in Redis"')
})

test('a comment typed in place names its keys after the text, as the fields do', async ($, on) => {
  await start($, on, F)
  await fullscreen($, F)
  await review($)
  const ui = await fullscreen($, F)
  const into = await clickAndPress(ui, CACHE, ['c', 'h', 'i'])
  expect(await ui.find({ type: 'Text', text: /⏎ ok · \\⏎ new line/, in: into })).toBeDefined()
})
