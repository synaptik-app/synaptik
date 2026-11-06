// Threads (SPEC §8): a side conversation about one block, each message one fork
// over the main conversation. A fork is single-shot, so every call carries the
// block and the thread so far, and its answer brings the thread's summary and a
// verdict with it (#156). Plain data in, prompts and summaries out.

import { partsOf, partSource } from './blocks'
import { lineReference } from './compile'
import { INCLUDED_ANYWAY, PART, SUMMARY_PROMPT, THREAD_PROMPT, THREAD_SO_FAR, WITH_NOTHING, WITH_SUMMARY, WITH_VERDICT } from './prompts'

export type ThreadMessage = { role: 'person' | 'agent'; text: string }

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

const transcript = (messages: readonly ThreadMessage[]) =>
  messages.map(m => `${m.role === 'person' ? 'Person' : 'You'}: ${m.text}`).join('\n\n')

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '')

// One message of the thread, as the fork is asked it (src/prompts.ts).
// What it asks after the answer follows the switch: once the person set it, no
// verdict, since none would change it; set off, no summary either, written when
// they switch it on.
export function threadPrompt(anchor: Anchor, thread: Thread, message: string): string {
  const so = thread.messages.length > 0 ? fill(THREAD_SO_FAR, { thread: transcript(thread.messages) }) : ''
  const after = !thread.isIncludeSet ? WITH_VERDICT : thread.included ? WITH_SUMMARY.replace('{{included}}', INCLUDED_ANYWAY) : WITH_NOTHING
  return fill(THREAD_PROMPT, { block: anchor.block, part: partOf(anchor), thread: so, message, after })
}

const partOf = (anchor: Anchor) => (anchor.part ? fill(PART, { reference: anchor.part.reference }) : '')

// The summary alone: when an answer came without one, or when the person
// switched a thread on, which then has to send something.
export function summaryPrompt(anchor: Anchor, thread: Thread): string {
  const prompt = fill(SUMMARY_PROMPT, { block: anchor.block, part: partOf(anchor), thread: transcript(thread.messages) })
  return thread.summary === '' || (thread.isIncludeSet && thread.included) ? `${prompt}\n\n${INCLUDED_ANYWAY}` : prompt
}

export type Answer = { text: string; summary?: string; verdict?: 'include' | 'exclude' }

const SUMMARY = /<summary>([\s\S]*?)<\/summary>/
const VERDICT = /<verdict>\s*(include|exclude)\s*<\/verdict>/

// An answer as the fork wrote it: what the person reads, and the summary, and
// the verdict when one was asked for, after it. Without a summary the answer is
// all text.
export function parseAnswer(raw: string): Answer {
  const summary = raw.match(SUMMARY)
  const verdict = raw.match(VERDICT)
  if (!summary) return { text: raw.trim() }
  const at = Math.min(summary.index!, verdict?.index ?? Infinity)
  return { text: raw.slice(0, at).trim(), summary: summary[1]!.trim(), ...(verdict ? { verdict: verdict[1] as 'include' | 'exclude' } : {}) }
}

// The thread with an answer added: its summary when it carried one, and the
// verdict as the switch's default unless the person set it.
export function withAnswer(thread: Thread, raw: string): Thread {
  const a = parseAnswer(raw)
  const messages = [...thread.messages, { role: 'agent' as const, text: a.text }]
  if (a.summary === undefined) return { ...thread, messages, pending: thread.pending - 1 }
  return {
    ...thread,
    messages,
    pending: thread.pending - 1,
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
