// Threads (SPEC §8): a side conversation about one block, each message one fork
// over the main conversation. A fork is single-shot, so every call carries the
// block and the thread so far. Plain data in, prompts and summaries out.

export type ThreadMessage = { role: 'person' | 'agent'; text: string }

export type Thread = {
  messages: ThreadMessage[]
  // Messages still waiting for their answer.
  pending: number
  // Whether its summary goes into the review (SPEC §8, *Include / exclude*).
  included: boolean
  summary?: string
  // How many messages the summary was written over: fewer than now, and it is
  // written again when the pane closes.
  summarizedAt: number
  // Each send draws a fresh field: one drawn again under the same key keeps what
  // was typed.
  inputSeq: number
}

export const NEW_THREAD: Thread = { messages: [], pending: 0, included: false, summarizedAt: 0, inputSeq: 0 }

const transcript = (messages: readonly ThreadMessage[]) =>
  messages.map(m => `${m.role === 'person' ? 'Person' : 'You'}: ${m.text}`).join('\n\n')

const block = (anchor: string) => `The block:\n"""\n${anchor}\n"""`

// One message of the thread, as the fork is asked it.
export function threadPrompt(anchor: string, thread: Thread, message: string): string {
  return [
    'The person is reviewing your last reply and opened a side thread about one block of it. ' +
      'This thread is private: nothing here reaches the main conversation unless they choose to include a summary of it later. ' +
      'Answer their latest message, about that block, briefly. Do not act on it: no tools, no changes, just the discussion.',
    block(anchor),
    ...(thread.messages.length > 0 ? [`The thread so far:\n\n${transcript(thread.messages)}`] : []),
    `Their message:\n${message}`,
  ].join('\n\n')
}

// The summary that goes into the review: written for that use, as the person's
// instruction to the agent. The model writes it; the person reads and edits it in
// the prompt box before sending (D3).
export function summaryPrompt(anchor: string, thread: Thread): string {
  return [
    'The person reviewed your last reply and discussed one block of it in a private side thread. ' +
      'They chose to include it in their review. What you write now goes into their next prompt to you, ' +
      'under a quote of that block, next to their other marks (accept, reject, comment). They can edit it before sending.',
    'Write it as their instruction to you: what was decided, and what you should do about it. ' +
      'Actionable items first, one per line, starting with a verb. Add an open question only if the thread left one. ' +
      'No recap of the discussion, no mention that a thread happened, no preamble, no Markdown. At most 5 short lines.',
    block(anchor),
    `The thread:\n\n${transcript(thread.messages)}`,
  ].join('\n\n')
}

// Whether closing the pane should write the summary: included, with an answered
// message the last summary didn't see.
export function needsSummary(thread: Thread): boolean {
  return thread.included && thread.pending === 0 && thread.messages.length > thread.summarizedAt
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
