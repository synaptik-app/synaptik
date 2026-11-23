// The pane's waiting line (#234): a thread's answer on its way, or its agent at
// work. A thread's fork resolves once, with no text or thinking along the way,
// so its line is a spinner and the time; an agent says what it is doing.

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
const ENDED: Record<'working' | 'needs-you' | 'done', { glyph: string; words: string }> = {
  done: { glyph: '⏺', words: 'Agent finished' },
  'needs-you': { glyph: '○', words: 'Agent waiting for you' },
  // A report Synaptik can't read the status of.
  working: { glyph: '⏺', words: 'Agent reported' },
}

export function reportLine(state: 'working' | 'needs-you' | 'done', ms: number | undefined): string {
  const { glyph, words } = ENDED[state]
  return `${glyph} ${words}${ms === undefined ? '' : ` · ${elapsed(ms)}`}`
}

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
