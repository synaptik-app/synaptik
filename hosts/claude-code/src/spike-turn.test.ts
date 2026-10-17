// SPIKE — throwaway. No session, no mock `$`: plain rows in, text out.

import { expect, test } from 'claude-code/testing'

import { lastTurnText } from './spike-turn'
import type { Row } from './spike-turn'

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
