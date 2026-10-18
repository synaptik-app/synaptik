// SPIKE (#41): what Claude Code's test kit can do for Synaptik's UI. Each test
// answers one question; a failure is an answer too.
//
// A test cannot read or write the mod's $.state (the engine $ has no state
// noun), so it works as a session does: the test's own hooks stand for the
// engine and answer session.messages with a fixture transcript; raising
// session.start makes Synaptik adopt that reply through its real code path;
// assertions read what is drawn.

import { expect, test } from 'claude-code/testing'
import type { On } from 'claude-code'

const REPLY = `Here's what I'd suggest:

1. Use Redis for the session cache
2. Add a rate limiter`

const S = 'synaptik'
const PANE = 'synaptik-map'

// The test's hooks stand for the engine beneath the plugin: nothing else is
// there, so they answer every engine call Synaptik makes — the transcript a
// session would hold, the session's start, and the calls its hooks make.
function transcript(on: On, reply = REPLY) {
  // An event's hook answers with its result; a plain engine call's with { value }.
  const event = (name: string, fn: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => fn(e)) as never)
  const call = (name: string, value: (e: never) => unknown) =>
    on(name as never, ((_$: unknown, e: never) => ({ value: value(e) })) as never)

  call('session.messages', () => [
    { role: 'user', text: 'what would you suggest?', toolUses: [] },
    { role: 'assistant', text: reply, toolUses: [] },
  ])
  call('command.register', (e: { name: string }) => ({ command: e.name }))
  call('ui.open', () => ({ isPlaced: true }))
  call('ui.invalidate', () => undefined)
  call('prompt.read', () => ({ text: '', cursor: 0 }))
  event('session.start', (e: { cwd: string }) => ({ cwd: e.cwd }))
  event('ui.scroll', () => ({}))
  event('ui.focus', () => ({}))
  event('prompt.suggest', () => ({ isShown: true }))
}

const START = { cwd: '/tmp/synaptik-test', surface: 'terminal', isInteractive: true } as never

const paneProps = (placement: 'dock' | 'inline', isFocused = true) =>
  ({
    title: 'Synaptik',
    isFocused,
    bodyColumns: placement === 'dock' ? 30 : 100,
    placement,
    scroll: { offset: 1, bodyRows: placement === 'dock' ? 20 : 12 },
    view: {},
  }) as never

// Q1: does session.start adopt the fixture reply (the navigator counts its blocks)?
test('Q1 adopt a fixture reply through session.start', async ($, on) => {
  transcript(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: S, surface: 'terminal', component: 'Pane', requestId: PANE, props: paneProps('dock') })
  expect(await ui.find({ type: 'Text', text: /of 3/ } as never)).toBeDefined()
  await ui.unmount()
})

// Q2: does the docked navigator draw its heading and position rows?
test('Q2 the docked navigator', async ($, on) => {
  transcript(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: S, surface: 'terminal', component: 'Pane', requestId: PANE, props: paneProps('dock') })
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ } as never)).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /Block 3 of 3/ } as never)).toBeDefined()
  await ui.unmount()
})

// Q3: does the inline (classic) pane draw the block viewer, verbs as buttons?
test('Q3 the inline block viewer', async ($, on) => {
  transcript(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: S, surface: 'terminal', component: 'Pane', requestId: PANE, props: paneProps('inline') })
  expect(await ui.find({ type: 'Button', key: 'verb-accept' } as never)).toBeDefined()
  expect(await ui.find({ type: 'Text', text: /↑ 1\. Use Redis/ } as never)).toBeDefined()
  await ui.unmount()
})

// Q4: does pressing a verb mark the block (the heading counts it)?
test('Q4 press a verb', async ($, on) => {
  transcript(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: S, surface: 'terminal', component: 'Pane', requestId: PANE, props: paneProps('inline') })
  await ui.press({ key: 'verb-accept' } as never)
  expect(await ui.find({ type: 'Text', text: /Your notes · ✓1/ } as never)).toBeDefined()
  await ui.unmount()
})

// Q5: does a marked reply draw through Synaptik's hook, glyph in the margin?
test('Q5 the reply draws a marked block with its glyph', async ($, on) => {
  transcript(on)
  await $.session.start(START)
  const pane = await $.ui.mount({ plugin: S, surface: 'terminal', component: 'Pane', requestId: PANE, props: paneProps('inline') })
  await pane.press({ key: 'verb-accept' } as never)
  const reply = await $.ui.mount({
    plugin: S,
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: REPLY, isFirstOfReply: true } as never,
    viewport: { columns: 100, rows: 40 } as never,
  })
  expect(await reply.find({ type: 'Text', text: /✓/ } as never)).toBeDefined()
  await reply.unmount()
  await pane.unmount()
})

// Q6: can a test raise a person's ↑ (ui.scroll) and move the selection?
test('Q6 a person scroll moves the selection', async ($, on) => {
  transcript(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ plugin: S, surface: 'terminal', component: 'Pane', requestId: PANE, props: paneProps('dock') })
  await $.ui.scroll({
    component: 'Pane',
    requestId: PANE,
    offset: 0,
    by: -1,
    bodyRows: 20,
    contentRows: 22,
    origin: { kind: 'person' },
  } as never)
  expect(await ui.find({ type: 'Text', text: /Block 2 of 3/ } as never)).toBeDefined()
  await ui.unmount()
})
