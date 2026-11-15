// No session, no mock `$`: plain rows in, text out.

import { expect, test } from 'claude-code/testing'

import { grows, lastTurnText } from './turn'
import type { Row } from './turn'

const prompt = (text: string): Row => ({ role: 'user', text })
const reply = (text: string): Row => ({ role: 'assistant', text })
const toolResult: Row = { role: 'user', text: '', toolResults: [{}] }
const toolCall: Row = { role: 'assistant', text: '' }

test('joins the text before and after a tool call', async () => {
  const rows = [
    prompt('old question'),
    reply('old answer'),
    prompt('check it'),
    reply('Part one.'),
    toolCall,
    toolResult,
    reply('Part two.'),
  ]

  expect(lastTurnText(rows)).toBe('Part one.\n\nPart two.')
})

test('a plain reply is just its text', async () => {
  expect(lastTurnText([prompt('q'), reply('a')])).toBe('a')
})

test('skips a resume placeholder and rows recorded after the turn', async () => {
  const rows = [prompt('q'), reply('the answer'), reply('No response requested.'), prompt('/synaptik log')]

  expect(lastTurnText(rows)).toBe('the answer')
})

test('nothing to adopt before the first reply', async () => {
  expect(lastTurnText([prompt('q')])).toBe('')
  expect(lastTurnText([])).toBe('')
})

// A background run, as Claude Code 2.1.325 stores it (#213): each agent's
// completion is a user row with text, after Claude's answer to it.
const notification = (id: string): Row => ({ role: 'user', text: `<task-notification>\n<task-id>${id}</task-id>\n<status>completed</status>` })

test('a background agent’s completion is not a prompt: the whole run is one reply', async () => {
  const rows = [
    prompt('go'),
    toolCall,
    toolResult,
    reply('Started three agents.'),
    reply('Agent 1 is done.'),
    notification('a1'),
    reply('Agent 2 is done.'),
    notification('a2'),
    toolCall,
    toolResult,
    reply('Agent 3 is done, and SUMMARY.md is written.'),
  ]

  expect(lastTurnText(rows)).toBe('Started three agents.\n\nAgent 1 is done.\n\nAgent 2 is done.\n\nAgent 3 is done, and SUMMARY.md is written.')
})

test('a prompt typed during the run is still where the reply starts', async () => {
  const rows = [prompt('go'), reply('Started two agents.'), prompt('what happens now?'), reply('They keep running.'), notification('a1'), reply('Agent 1 is done.')]

  expect(lastTurnText(rows)).toBe('They keep running.\n\nAgent 1 is done.')
})

test('a reply grows when blocks are only added after it', async () => {
  expect(grows('First.\n\nSecond.', 'First.\n\nSecond.\n\nThird.')).toBe(true)
})

test('a reply does not grow when an earlier block changed, or nothing was added', async () => {
  expect(grows('First.\n\nSecond.', 'First.\n\nSecond, reworded.\n\nThird.')).toBe(false)
  expect(grows('First.\n\nSecond.', 'First.\n\nSecond.')).toBe(false)
  expect(grows('First.', 'Another reply.\n\nWith two blocks.')).toBe(false)
  expect(grows('', 'First.')).toBe(false)
})

test('a list that runs on across the join changes its last item, so it does not grow', async () => {
  expect(grows('- one\n- two', '- one\n- two\n  more of two\n\nAfter.')).toBe(false)
})

