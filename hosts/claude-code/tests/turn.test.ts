// The turn lifecycle and resuming (#48, SPEC §2, §5): while a turn runs the
// navigator waits; when it completes the new reply is adopted and the tray
// starts fresh. A resumed session adopts the reply it already holds.

import { expect, test } from 'claude-code/testing'

import { band, ENGINE_DRAWING, pane, position, reply, start, transcriptOf, turn } from './engine'
import type { Row } from './engine'
import { FIXTURES } from './fixtures.generated'
import { segment } from '../src/blocks'

const F = 'rendering'
const ask = (text: string): Row => ({ role: 'user', text, toolUses: [] })
const answer = (text: string): Row => ({ role: 'assistant', text, toolUses: [] })
const NEW_REPLY = 'First new point.\n\nSecond new point.'

test('while a turn runs, verbs mark nothing', async ($, on) => {
  await start($, on, F)
  await $.turn.start({ text: 'next', turnId: 'turn-2' })
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await $.turn.complete({
    turnId: 'turn-2', answer: '', durationMs: 1, isAborted: false, reason: 'answer',
  })
  expect(await ui.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
})

test('while a turn runs, the reply and the band are Claude Code’s own', async ($, on) => {
  await start($, on, F)
  await pane($, 'dock') // even with the navigator holding the keyboard
  await $.turn.start({ text: 'next', turnId: 'turn-2' })
  const drawn = await reply($, F)
  expect(await drawn.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
})

test('a completed turn adopts the new reply: its blocks, from the last one', async ($, on) => {
  const rows = await start($, on, F)
  await turn($, rows, [ask('and then?'), answer(NEW_REPLY)])
  const ui = await pane($, 'inline')
  expect(await position(ui)).toEqual({ at: 2, of: 2 })
  expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('Second new point.')
})

test('a completed turn starts the tray fresh', async ($, on) => {
  const rows = await start($, on, F)
  const before = await pane($, 'inline')
  await before.press({ key: 'verb-accept' })
  expect(await before.find({ type: 'Text', text: /Your notes · ✓1/ })).toBeDefined()
  await before.unmount()
  await turn($, rows, [ask('and then?'), answer(NEW_REPLY)])
  const after = await pane($, 'inline')
  expect(await after.find({ type: 'Text', text: /Nothing marked yet/ })).toBeDefined()
})

test('an interrupted turn’s partial reply is adopted', async ($, on) => {
  const rows = await start($, on, F)
  await turn($, rows, [ask('and then?'), answer('Only this got written.')], 'aborted')
  const ui = await pane($, 'inline')
  expect(await position(ui)).toEqual({ at: 1, of: 1 })
  expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe('Only this got written.')
})

test('after the turn the band is Synaptik’s again', async ($, on) => {
  const rows = await start($, on, F)
  await turn($, rows, [ask('and then?'), answer(NEW_REPLY)])
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: /to respond in place/ })).toBeDefined()
})

test('resuming adopts the reply, skipping the “No response requested.” row Claude Code adds', async ($, on) => {
  // As a resumed session's transcript ends: the placeholder right after the
  // reply, then whatever was typed since (a command).
  const rows = [...transcriptOf(F), answer('No response requested.'), ask('/synaptik log')]
  await start($, on, F, rows)
  const ui = await pane($, 'inline')
  const blocks = segment(FIXTURES[F]!.pieces.join('\n\n')).filter(b => b.isBlock)
  expect(await position(ui)).toEqual({ at: blocks.length, of: blocks.length })
  expect((await ui.find({ type: 'Markdown' }))?.props.text).toBe(blocks.at(-1)!.text)
})

test('the same reply adopted again (a reload) keeps the tray', async ($, on) => {
  await start($, on, F)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await $.session.start({ cwd: '/tmp/synaptik-test', surface: 'terminal', isInteractive: true })
  expect(await ui.find({ type: 'Text', text: /Your notes · ✓1/ })).toBeDefined()
})

// Since Claude Code 2.1.300 the turn hooks also hear subagents' and teammates'
// turns (e.agentId); only the main loop's turn brings a new reply.
test('a subagent’s turn starting does not stop marking', async ($, on) => {
  await start($, on, F)
  await $.turn.start({ text: 'look this up', turnId: 'sub-turn', agentId: 'agent-1' } as never)
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  expect(await ui.find({ type: 'Text', text: /Your notes · ✓1/ })).toBeDefined()
})

test('a subagent’s turn completing does not adopt anything, nor end the main turn', async ($, on) => {
  const rows = await start($, on, F)
  await $.turn.start({ text: 'and then?', turnId: 'main-turn' })
  rows.push(ask('and then?'), answer(NEW_REPLY))
  await $.turn.complete({
    turnId: 'sub-turn', agentId: 'agent-1', answer: 'found it', durationMs: 1, isAborted: false, reason: 'answer',
  } as never)
  const ui = await pane($, 'inline')
  // Still the main turn's: waiting, nothing adopted yet.
  expect(await ui.find({ type: 'Text', text: /Waiting for the reply/ })).toBeDefined()
})
