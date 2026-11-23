// No session, no mock `$`: the pane's waiting line.

import { expect, test } from 'claude-code/testing'

import { agentLine, elapsed, reportLine, spinnerFrame, thinkingLine, tokensText, toolStep } from './waiting'

test("a report says how the agent's run ended, and how long it took", () => {
  expect(reportLine('done', 15_200)).toBe('⏺ Agent finished · 15s')
  expect(reportLine('needs-you', 42_000)).toBe('○ Agent waiting for you · 42s')
  expect(reportLine('working', undefined)).toBe('⏺ Agent reported')
})

test('the spinner turns a frame every 100 ms, and comes round', () => {
  expect(spinnerFrame(0)).toBe('⠋')
  expect(spinnerFrame(150)).toBe('⠙')
  expect(spinnerFrame(1000)).toBe('⠋')
})

test('elapsed time reads as Claude Code says it', () => {
  expect(elapsed(4200)).toBe('4s')
  expect(elapsed(72_000)).toBe('1m 12s')
  expect(elapsed(3_780_000)).toBe('1h 3m')
  expect(elapsed(-5)).toBe('0s')
})

test('a thread waiting for its answer: the spinner, Thinking…, and how long', () => {
  expect(thinkingLine(4000, 0)).toBe('⠋ Thinking… · 4s')
  expect(thinkingLine(4000, undefined)).toBe('⠋ Thinking…')
})

test("an agent at work says what it is doing, how long, and its tokens", () => {
  const agent = { label: 'Counting the fixture files\nand more', description: 'Synaptik · The fixtures…', startTime: 0, tokenCount: 3400 }
  expect(agentLine(72_000, agent)).toBe('⠋ Counting the fixture files · 1m 12s · 3.4k tokens')
  // No progress yet: its label is its description.
  expect(agentLine(5000, { ...agent, label: agent.description, tokenCount: 0 })).toBe('⠋ agent working · 5s')
  expect(agentLine(0, undefined)).toBe('⠋ agent working')
  // No summary yet, but a tool call: that is what it is doing.
  expect(agentLine(5000, { ...agent, label: agent.description, tokenCount: 0, step: 'Count lines in every fixture file' })).toBe('⠋ Count lines in every fixture file · 5s')
  // A summary, once there is one, comes first.
  expect(agentLine(5000, { ...agent, tokenCount: 0, step: 'Bash: ls' })).toBe('⠋ Counting the fixture files · 5s')
})

test("a tool call reads as its description, else the tool and its main argument", () => {
  expect(toolStep('Bash', { command: 'wc -l fixtures/*.md', description: 'Count lines in every fixture file' })).toBe('Count lines in every fixture file')
  expect(toolStep('Bash', { command: 'wc -l fixtures/*.md\necho done' })).toBe('Bash: wc -l fixtures/*.md')
  expect(toolStep('Read', { file_path: 'fixtures/code.md' })).toBe('Read: fixtures/code.md')
  expect(toolStep('TodoWrite', { todos: [] })).toBe('TodoWrite')
  expect(tokensText(850)).toBe('850 tokens')
})
