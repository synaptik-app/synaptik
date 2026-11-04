// Threads (SPEC §8): a side conversation about one block, each message one fork
// over the main conversation. A fork is single-shot, so every call carries the
// block and the thread so far, and its answer brings the thread's summary and a
// verdict with it (#156). Plain data in, prompts and summaries out.

import { INCLUDED_ANYWAY, SUMMARY_PROMPT, THREAD_PROMPT, THREAD_SO_FAR } from './prompts'

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

const transcript = (messages: readonly ThreadMessage[]) =>
  messages.map(m => `${m.role === 'person' ? 'Person' : 'You'}: ${m.text}`).join('\n\n')

const fill = (template: string, values: Record<string, string>) =>
  template.replace(/\{\{(\w+)\}\}/g, (_, name: string) => values[name] ?? '')

// One message of the thread, as the fork is asked it (src/prompts.ts).
export function threadPrompt(anchor: string, thread: Thread, message: string): string {
  const so = thread.messages.length > 0 ? fill(THREAD_SO_FAR, { thread: transcript(thread.messages) }) : ''
  return fill(THREAD_PROMPT, { block: anchor, thread: so, message })
}

// The summary alone: when an answer came without one, or when the person
// included a thread whose summary was empty.
export function summaryPrompt(anchor: string, thread: Thread): string {
  const prompt = fill(SUMMARY_PROMPT, { block: anchor, thread: transcript(thread.messages) })
  return thread.summary === '' ? `${prompt}\n\n${INCLUDED_ANYWAY}` : prompt
}

export type Answer = { text: string; summary?: string; verdict?: 'include' | 'exclude' }

const SUMMARY = /<summary>([\s\S]*?)<\/summary>/
const VERDICT = /<verdict>\s*(include|exclude)\s*<\/verdict>/

// An answer as the fork wrote it: what the person reads, and the summary and
// verdict after it. Without both parts the answer is all text, no summary.
export function parseAnswer(raw: string): Answer {
  const summary = raw.match(SUMMARY)
  const verdict = raw.match(VERDICT)
  if (!summary || !verdict) return { text: raw.trim() }
  const at = Math.min(summary.index!, verdict.index!)
  return { text: raw.slice(0, at).trim(), summary: summary[1]!.trim(), verdict: verdict[1] as 'include' | 'exclude' }
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
    included: thread.isIncludeSet ? thread.included : a.verdict === 'include',
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

// A block has a thread once a message was sent in it.
export function hasThread(threads: Readonly<Record<string, Thread>>, key: number | string): boolean {
  return (threads[String(key)]?.messages.length ?? 0) > 0
}
