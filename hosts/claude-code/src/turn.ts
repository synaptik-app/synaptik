// Which transcript rows make up the last reply (SPEC §2): the whole last turn,
// tool calls and engine-written rows skipped.

import { segment } from './blocks'

export type Row = {
  role: 'user' | 'assistant'
  text: string
  toolResults?: readonly unknown[]
}

// Assistant rows the engine writes itself, never the model: a resumed session
// ends with one. Rows carry no flag for them, so they are matched by text.
const SYNTHETIC = new Set(['No response requested.'])

// A background agent's completion, which Claude Code stores as a user row
// with text, after Claude's answer to it (#213). Rows carry no origin, so it is
// matched by its opening tag.
const NOTIFICATION = '<task-notification>'

// A user row the person wrote, as opposed to a tool's result or a background
// agent's completion, which are stored as user rows too.
const isPrompt = (row: Row) =>
  row.role === 'user' && row.text.trim() !== '' && !row.toolResults?.length && !row.text.trimStart().startsWith(NOTIFICATION)

const isReplyText = (row: Row) =>
  row.role === 'assistant' && row.text.trim() !== '' && !SYNTHETIC.has(row.text.trim())

// The text of the last turn: every assistant row with text since the last
// prompt, joined in order. A reply that runs a tool mid-way is stored as
// several assistant rows; taking only the last one left the text before the
// tool call unmarkable. Rows after the turn that are not assistant text (a
// slash command's record, a synthetic row) are skipped.
export function lastTurnText(rows: readonly Row[]): string {
  let end = rows.length - 1
  while (end >= 0 && !isReplyText(rows[end]!)) end -= 1
  if (end < 0) return ''

  const pieces: string[] = []
  for (let i = end; i >= 0; i -= 1) {
    const row = rows[i]!
    if (isPrompt(row)) break
    if (isReplyText(row)) pieces.unshift(row.text.trim())
  }
  return pieces.join('\n\n')
}

// Whether `after` is `before` with blocks added at its end: every segment of
// `before` unchanged, in place, and more after them. A background agent's
// follow-up grows the reply this way, and keeps its review (#213). Compared by
// segment, not text, so a list running on across the join counts as a change.
export function grows(before: string, after: string): boolean {
  if (!before) return false
  const old = segment(before)
  const now = segment(after)
  if (now.length <= old.length) return false
  return old.every((s, i) => {
    const n = now[i]!
    return n.text === s.text && n.isBlock === s.isBlock && n.depth === s.depth && n.parent === s.parent && n.indent === s.indent
  })
}
