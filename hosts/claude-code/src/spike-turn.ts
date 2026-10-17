// SPIKE — throwaway. Which transcript rows make up the last reply.

export type Row = {
  role: 'user' | 'assistant'
  text: string
  toolResults?: readonly unknown[]
}

// Assistant rows the engine writes itself, never the model: a resumed session
// ends with one. Rows carry no flag for them, so they are matched by text.
const SYNTHETIC = new Set(['No response requested.'])

// A user row the person wrote, as opposed to a tool's result, which is stored
// as a user row too.
const isPrompt = (row: Row) =>
  row.role === 'user' && row.text.trim() !== '' && !row.toolResults?.length

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
