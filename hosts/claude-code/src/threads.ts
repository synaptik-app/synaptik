// Threads (SPEC §8): a side conversation about one block, each message one fork
// over the main conversation. A fork is single-shot, so every call carries the
// block and the thread so far, and its answer brings the thread's summary and a
// verdict with it (#156). Plain data in, prompts and summaries out.

import { partsOf, partSource } from './blocks'
import { lineReference } from './compile'
import {
  AGENT_PROMPT,
  AGENT_STARTED,
  INCLUDED_ANYWAY,
  NO_SUMMARY_TASKS,
  NOTICE,
  PART,
  REPORT_PROMPT,
  SUBAGENT_GUIDANCE,
  SUMMARY_PROMPT,
  START_ASKED,
  START_AUTO,
  SWITCH_OFF,
  SWITCH_ON,
  THREAD_PROMPT,
  THREAD_SO_FAR,
  TOOLS_AGENT,
  TOOLS_OFFER,
  WITH_NEXT,
  WITH_NOTHING,
  WITH_SUMMARY,
  WITH_SWITCH_SENTENCE,
  WITH_TO_AGENT,
  WITH_VERDICT,
} from './prompts'

// Who said it: the person, the thread's own answers ('agent'), and, once the
// thread has an agent with tools (D51), its reports, what the thread sent it,
// and what the person wrote to it in its own view ('direct').
// A report keeps how long the agent's run took (`ms`), when Claude Code said. A
// status is Synaptik's own line in the thread: its agent couldn't start, or a
// run ended without a report (#239), or an answer was cancelled (#240).
// A person's message sent while the answer to their last one was pending waits,
// `queued`, until it lands (#245).
export type ThreadMessage = { role: 'person' | 'agent' | 'report' | 'sent' | 'direct' | 'status'; text: string; ms?: number; queued?: true }

// A thread's agent with tools (D51): its id in `$.agent.list()`, and where its
// tasks stand, by its last report (`working` until the first, and while it runs),
// or `stopped` when a run ended without one: interrupted, or failed.
export type AgentState = 'working' | 'needs-you' | 'done' | 'stopped'
export type ThreadAgent = { id: string; state: AgentState }

export type Thread = {
  messages: ThreadMessage[]
  // Messages still waiting for their answer.
  pending: number
  // Whether its summary goes into the review (SPEC §8, *Include / exclude*):
  // the last answer's verdict until the person sets the switch.
  included: boolean
  // Whether the person set the switch: a verdict then leaves it alone.
  isIncludeSet: boolean
  summary?: string
  // How many messages the summary was written over: fewer than now (an answer
  // came without one), and it is written when the pane closes.
  summarizedAt: number
  // Each send draws a fresh field: one drawn again under the same key keeps what
  // was typed.
  inputSeq: number
  // Its agent, once the person asked for one.
  agent?: ThreadAgent
  // What the field starts with when next drawn: a cancelled question, back for
  // editing (#240).
  draft?: string
  // The answer proposed an agent, and the person is asked whether to start it:
  // the session wasn't in auto mode (#225).
  isAgentAsked?: boolean
}

export const NEW_THREAD: Thread = { messages: [], pending: 0, included: false, isIncludeSet: false, summarizedAt: 0, inputSeq: 0 }

// What a thread is about, by its key: a block ("3"), or a code line or table row
// in one ("3.5"). The fork reads the whole block and which part; the pane shows
// the part alone, as Markdown that draws on its own.
export type Anchor = { block: string; part?: { source: string; text: string; reference: string } }

export function anchorOf(block: string, key: string): Anchor | undefined {
  const [, line] = key.split('.')
  if (line === undefined) return { block }
  const n = Number(line)
  const parts = partsOf(block)
  const source = partSource(block, n)
  const text = parts?.lines[n]
  if (!parts || source === undefined || text === undefined) return undefined
  return { block, part: { source, text, reference: lineReference(parts.kind, n, text) } }
}

const SPEAKER: Record<ThreadMessage['role'], string> = {
  person: 'Person',
  agent: 'You',
  report: 'Your agent reported',
  sent: 'You, to your agent',
  direct: 'Person, to your agent in its own view',
  status: 'Synaptik',
}

const transcript = (messages: readonly ThreadMessage[]) => messages.map(m => `${SPEAKER[m.role]}: ${m.text}`).join('\n\n')

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '')

// One message of the thread, as the fork is asked it (src/prompts.ts).
// What it asks after the answer follows the switch: once the person set it, no
// verdict, since none would change it; set off, no summary either, written when
// they switch it on.
// After the summary's part, whatever the switch: an agent for its tasks, offered
// or started on the person's word (none yet), or what to send the one it has (D51).
export function threadPrompt(anchor: Anchor, thread: Thread, message: string, isAuto = false): string {
  const so = thread.messages.length > 0 ? fill(THREAD_SO_FAR, { thread: transcript(thread.messages) }) : ''
  const sentence = thread.isIncludeSet ? '' : WITH_SWITCH_SENTENCE.replace('{{switch}}', thread.included ? SWITCH_ON : SWITCH_OFF)
  // The sentence before the summary's instructions: it belongs to the answer,
  // ahead of the tags.
  const after = sentence + summaryAfter(thread) + (thread.agent ? WITH_TO_AGENT : WITH_NEXT)
  const tools = thread.agent ? TOOLS_AGENT : TOOLS_OFFER.replace('{{start}}', isAuto ? START_AUTO : START_ASKED)
  return fill(THREAD_PROMPT, { block: anchor.block, part: partOf(anchor), thread: so, message, after, tools })
}

// What follows the answer about the summary, by the switch, with the agent's
// section once there is one.
// Untouched, the verdict sets the switch; an answer to the person's message
// also says when it changed it (threadPrompt), so they know what it did.
function summaryAfter(thread: Thread): string {
  const after = !thread.isIncludeSet ? WITH_VERDICT : thread.included ? WITH_SUMMARY.replace('{{included}}', INCLUDED_ANYWAY) : WITH_NOTHING
  return after && thread.agent ? `${after}\n\n${SUBAGENT_GUIDANCE}` : after
}

// The thread's own answer to its agent's report: no message of the person's, and
// nothing for the agent, so a report never starts another of its turns (D51).
export function reportPrompt(anchor: Anchor, thread: Thread, report: string): string {
  const so = thread.messages.length > 0 ? fill(THREAD_SO_FAR, { thread: transcript(thread.messages) }) : ''
  return fill(REPORT_PROMPT, { block: anchor.block, part: partOf(anchor), thread: so, report, after: summaryAfter(thread) })
}

// What the agent is started with: the block, the thread and its summary whole,
// as its tasks; with no summary, the thread itself says what to do.
export function agentPrompt(anchor: Anchor, thread: Thread): string {
  const tasks = thread.summary?.trim() || NO_SUMMARY_TASKS
  return fill(AGENT_PROMPT, { block: anchor.block, part: partOf(anchor), thread: transcript(thread.messages), tasks })
}

const partOf = (anchor: Anchor) => (anchor.part ? fill(PART, { reference: anchor.part.reference }) : '')

// The summary alone: when an answer came without one, or when the person
// switched a thread on, which then has to send something.
export function summaryPrompt(anchor: Anchor, thread: Thread, isAgentStarting = false): string {
  const prompt = fill(SUMMARY_PROMPT, { block: anchor.block, part: partOf(anchor), thread: transcript(thread.messages) })
  const parts = [prompt]
  if (thread.summary === '' || (thread.isIncludeSet && thread.included)) parts.push(INCLUDED_ANYWAY)
  if (thread.agent) parts.push(SUBAGENT_GUIDANCE)
  if (isAgentStarting) parts.push(AGENT_STARTED)
  return parts.join('\n\n')
}

export type Answer = { text: string; summary?: string; verdict?: 'include' | 'exclude'; startsAgent: boolean; toAgent?: string }

const SUMMARY = /<summary>([\s\S]*?)<\/summary>/
const VERDICT = /<verdict>\s*(include|exclude)\s*<\/verdict>/
const NEXT = /<next>\s*agent\s*<\/next>/
const TO_AGENT = /<to-agent>([\s\S]*?)<\/to-agent>/

// An answer as the fork wrote it: what the person reads, and after it, each when
// asked for, the summary, the verdict, whether the person asked for an agent on
// its tasks, and what to send the agent. The person reads none of the tags, and
// all of the prose: a sentence the fork wrote after them still reads.
export function parseAnswer(raw: string): Answer {
  const summary = raw.match(SUMMARY)
  const verdict = raw.match(VERDICT)
  const next = raw.match(NEXT)
  const toAgent = raw.match(TO_AGENT)
  let text = raw
  for (const m of [summary, verdict, next, toAgent]) if (m) text = text.replace(m[0], '\n\n')
  return {
    text: text.replace(/\n{3,}/g, '\n\n').trim(),
    ...(summary ? { summary: summary[1]!.trim() } : {}),
    ...(summary && verdict ? { verdict: verdict[1] as 'include' | 'exclude' } : {}),
    startsAgent: next !== null,
    ...(toAgent?.[1]?.trim() ? { toAgent: toAgent[1].trim() } : {}),
  }
}

// The thread with an answer added: its summary when it carried one, and the
// verdict as the switch's default unless the person set it. What it sends its
// agent joins the thread too, as the person sees it go; an answer to a report
// sends nothing, even if the fork wrote something (D51).
export function withAnswer(thread: Thread, raw: string, isReport = false): Thread {
  const a = parseAnswer(raw)
  const sent = a.toAgent && thread.agent && !isReport ? [{ role: 'sent' as const, text: a.toAgent }] : []
  const messages = [...thread.messages, { role: 'agent' as const, text: a.text }, ...sent]
  const base = { ...thread, messages, pending: thread.pending - 1 }
  if (a.summary === undefined) return base
  return {
    ...base,
    summary: a.summary,
    summarizedAt: messages.length,
    included: thread.isIncludeSet || a.verdict === undefined ? thread.included : a.verdict === 'include',
  }
}

// Whether the summary should be written: included, and the last answer came
// without one, or its summary is empty (the person included it anyway).
export function needsSummary(thread: Thread): boolean {
  if (!thread.included || thread.pending > 0) return false
  return thread.messages.length > thread.summarizedAt || thread.summary === ''
}

// What the review sends, by block: each included thread's summary.
export function summaries(threads: Readonly<Record<string, Thread>>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, t] of Object.entries(threads)) if (t.included && t.summary?.trim()) out[key] = t.summary.trim()
  return out
}

// The included threads a clear takes out of the review, as the tray's clear
// takes marks (src/tray.ts, clearBlock): a line's own; on a block, its own if
// it has a mark or an included thread, else every one on its lines.
export function clearedThreads(threads: Readonly<Record<string, Thread>>, hasMark: boolean, index: number | string): string[] {
  const included = (key: string) => threads[key]?.included === true
  if (typeof index === 'string' || hasMark || included(String(index))) return included(String(index)) ? [String(index)] : []
  return Object.keys(threads).filter(key => key.startsWith(`${index}.`) && included(key))
}

// A block has a thread once a message was sent in it.
export function hasThread(threads: Readonly<Record<string, Thread>>, key: number | string): boolean {
  return (threads[String(key)]?.messages.length ?? 0) > 0
}

// --- A thread's agent (D51) --------------------------------------------------

// The report the agent ends each reply with, and where its tasks stand.
const REPORT = /<report\s+status="([\w-]+)"\s*>([\s\S]*?)<\/report>/

// Where its tasks stand, by its answer: `working` when the answer carries no
// report Synaptik can read, as if it were still under way.
export function reportState(answer: string): AgentState {
  const status = answer.match(REPORT)?.[1]
  return status === 'needs-you' ? 'needs-you' : status === 'done' ? 'done' : 'working'
}

// A report opening a line: closed, cut alone; open, still streaming, to the end
// of the text. A `<report` mentioned inside a line is text, not a report.
const REPORT_CUT = /(^|\n)\n*<report\s+status="[\s\S]*?(<\/report>\n*|$)/
const OPENING = '<report status="'

// Where the opening tag's first letters start, alone on the text's last line
// before they read as a report; -1 when they don't.
function arriving(text: string): number {
  const at = text.lastIndexOf('\n') + 1
  const line = text.slice(at)
  return line.length > 0 && OPENING.startsWith(line) ? at : -1
}

// An agent's reply as its view draws it: without the report, which is the
// thread's. Undefined when there is none to cut.
export function withoutReport(text: string): string | undefined {
  const cut = text.replace(REPORT_CUT, '\n\n')
  const at = arriving(cut)
  if (cut === text && at < 0) return undefined
  return (at < 0 ? cut : cut.slice(0, at)).trim()
}

// The status a reply's report carries, so far: none while the tag is arriving.
export function reportStatus(text: string): AgentState | undefined {
  const status = text.match(/<report\s+status="([\w-]+)"/)?.[1]
  return status === 'needs-you' || status === 'done' ? status : undefined
}

// The agent's state in words, as the pane, the agent list and the cut line say it.
export const AGENT_WORDS: Record<AgentState, string> = { working: 'working', 'needs-you': 'waiting for you', done: 'done', stopped: 'stopped' }

// Which of `ids` a notice of Claude Code's is about: a `<task-notification>`
// with its task id. Undefined for any other text.
export function noticeAbout(text: string, ids: ReadonlySet<string>): string | undefined {
  if (!text.includes('<task-notification>')) return undefined
  const id = text.match(/<task-id>([^<]+)<\/task-id>/)?.[1]?.trim()
  return id && ids.has(id) ? id : undefined
}

// That notice as the main conversation keeps it: the wrapper and the task id,
// no result.
export const rewordedNotice = (id: string) => fill(NOTICE, { id })

// What the person typed in an agent's view, as its conversation stores it:
// typed while it ran, Claude Code wraps it ("The user sent a new message while
// you were working: … This is how Claude Code surfaces …"), and the words alone
// are taken out. Kept whole when the wrapping isn't recognised.
const MID_TURN = /^The user sent a new message while you were working:\n([\s\S]*?)\n\nThis is how Claude Code surfaces[\s\S]*$/

export function typedInView(text: string): string {
  return (text.match(MID_TURN)?.[1] ?? text).trim()
}


// A marked part's thread stays out of the review unless the person switched it
// on themselves: a verdict, or an agent starting, only sets the switch's
// default, and never overrides a mark (#238).
export function markFirst(thread: Thread, isMarked: boolean): Thread {
  return isMarked && thread.included && !thread.isIncludeSet ? { ...thread, included: false } : thread
}

// --- The queue (#245): the person's messages sent while the answer to their
// last one was pending. They go out together, once it lands.

// What is queued, in order.
export function queuedOf(thread: Thread): string[] {
  return thread.messages.filter(m => m.queued).map(m => m.text)
}

// The thread without its queued messages: what the next answer is asked over,
// and what pulling them back into the field leaves.
export function withoutQueued(thread: Thread): Thread {
  return { ...thread, messages: thread.messages.filter(m => !m.queued) }
}

// The queue sent: its messages are the thread's like any other.
export function sendQueued(thread: Thread): Thread {
  return { ...thread, messages: thread.messages.map(m => (m.queued ? { role: m.role, text: m.text } : m)) }
}

// An answer landing while messages wait: it goes before them, as it answers
// what came first.
export function answerBeforeQueued(thread: Thread, raw: string, isReport = false): Thread {
  const queued = thread.messages.filter(m => m.queued)
  const answered = withAnswer(withoutQueued(thread), raw, isReport)
  return { ...answered, messages: [...answered.messages, ...queued] }
}
