// The pane's waiting line (#234): a thread's answer on its way, or its agent at
// work. A thread's fork resolves once, with no text or thinking along the way,
// so its line is a spinner and the time; an agent says what it is doing.

import type { AgentState } from './threads'

// Claude Code's own spinner frames, one every 100 ms.
const FRAMES = [...'⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏']

export const spinnerFrame = (ms: number) => FRAMES[Math.floor(ms / 100) % FRAMES.length]!

// How long, as Claude Code says it: `4s`, `1m 12s`, `1h 3m`.
export function elapsed(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000))
  if (s < 60) return `${s}s`
  if (s < 3600) return `${Math.floor(s / 60)}m ${s % 60}s`
  return `${Math.floor(s / 3600)}h ${Math.floor((s % 3600) / 60)}m`
}

// Tokens as a short count: `850 tokens`, `3.4k tokens`.
export const tokensText = (n: number) => (n < 1000 ? `${n} tokens` : `${(n / 1000).toFixed(1)}k tokens`)

// One of the agent's reports, in the pane: how its run ended, and how long it
// took, in the words Claude Code's agent list uses for it. ⏺ as Claude Code
// marks a reply; an open ○ when it waits for the person.
const ENDED: Record<AgentState, { glyph: string; words: string }> = {
  stopped: { glyph: '◼', words: 'Agent stopped' },
  done: { glyph: '⏺', words: 'Agent finished' },
  'needs-you': { glyph: '○', words: 'Agent waiting for you' },
  // A report Synaptik can't read the status of.
  working: { glyph: '⏺', words: 'Agent reported' },
}

export function reportLine(state: AgentState, ms: number | undefined): string {
  const { glyph, words } = ENDED[state]
  return `${glyph} ${words}${ms === undefined ? '' : ` · ${elapsed(ms)}`}`
}

// Why Claude Code refused to start the agent, in the person's words when the
// reason is a known one (#237); any other as Claude Code gave it.
const REFUSALS: [RegExp, string][] = [
  [/session was stopped and nobody has sent input since/i, "Claude Code won't start an agent until you send something in the main chat"],
]

export function refusalWords(deny: string): string {
  return REFUSALS.find(([pattern]) => pattern.test(deny))?.[1] ?? deny
}

// The agent didn't start, and why.
export const notStartedLine = (why: string) => `✗ Agent not started · ${why}`

// A run that ended without a report: interrupted, refused by the model, or cut
// by an API error (`turn.complete`'s reason).
export function endedLine(reason: 'aborted' | 'refusal' | 'error', explanation?: string | null): string {
  if (reason === 'aborted') return '◼ Agent stopped'
  const why = reason === 'refusal' ? explanation?.trim() || 'the model refused' : 'an API error ended its run'
  return `✗ Agent failed · ${why}`
}

// An answer the person stopped: the fork can't be, so its answer is thrown away
// when it lands (#240).
export const CANCELLED_LINE = '◼ Answer cancelled'
// The cancel button's label, beside the waiting line: cancel, not stop, since
// the fork runs on; only its answer is dropped.
export const STOP_LABEL = '◼ cancel'

// The question an agent's start waits on, outside auto mode, and the line the
// thread keeps when the person says not now (#225).
export const START_QUESTION = '▶ Start an agent on these tasks?'
export const NOT_NOW_LINE = '◼ Agent not started · tell the thread what to do next'

// A question no fork could answer: nothing to fork until a turn finishes in the
// main conversation, after a resume or before the first (#195). Its next prompt
// brings a new reply, which discards this thread (D24), so the line points at
// that reply, not at asking here again; #194 would keep the thread.
export const NOT_FORKED_LINE = '⏸ Waiting for the main chat · threads will work on the next reply'

// A thread waiting for its answer.
export function thinkingLine(now: number, since: number | undefined): string {
  return `${spinnerFrame(now)} Thinking…${since === undefined ? '' : ` · ${elapsed(now - since)}`}`
}

// A tool call as one line: its own description when it has one (`Count lines
// in every fixture file`), else the tool and its main argument (`Bash: wc -l`).
export function toolStep(tool: string, input: Readonly<Record<string, unknown>>): string {
  if (typeof input.description === 'string' && input.description.trim()) return input.description.trim()
  const main = ['command', 'file_path', 'path', 'pattern', 'url', 'query', 'prompt'].map(k => input[k]).find(v => typeof v === 'string') as string | undefined
  return main ? `${tool}: ${main.split('\n')[0]!.trim()}` : tool
}

export type AgentNow = { label: string; description: string; startTime: number; tokenCount: number; step?: string }

// A thread's agent at work: what it is doing, as Claude Code's agent list has
// it (its latest progress summary, its first line); before it has one, its
// latest tool call; else that it is working.
export function agentLine(now: number, agent: AgentNow | undefined): string {
  const summary = agent?.label.split('\n')[0]?.trim()
  const what = summary && summary !== agent?.description ? summary : agent?.step || 'agent working'
  const time = agent ? ` · ${elapsed(now - agent.startTime)}` : ''
  const tokens = agent && agent.tokenCount > 0 ? ` · ${tokensText(agent.tokenCount)}` : ''
  return `${spinnerFrame(now)} ${what}${time}${tokens}`
}

// Whether the session is in auto mode for sure (#225): the mode Claude Code
// last reported was `auto`, and the prompt's hint line hasn't changed since,
// as Shift+Tab changes it. Any doubt means the person is asked.
export function isAutoMode(modeRead: string | undefined, hintMarked: boolean | undefined, hintMarkedAtRead: boolean | undefined): boolean {
  return modeRead === 'auto' && hintMarked === hintMarkedAtRead
}
