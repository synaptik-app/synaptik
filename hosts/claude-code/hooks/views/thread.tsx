// A thread's pane (SPEC §8): the block it is about, the exchange, a field, and
// the switch that includes its summary in the review. Plain data and callbacks —
// no `$`.

import type { Elements } from 'claude-code'

import { drawnRows } from '../../src/layout'
import { cells } from '../../src/review'
import type { Thread } from '../../src/threads'

export type ThreadModel = {
  id: string
  // The block: what the thread is about. Its first rows are drawn.
  anchor: string
  columns: number
  // What is typed in the field now, for its height, and what it reopens with
  // after a \ then ⏎ (a fresh key, so the field starts from it).
  draft: string
  seed?: string
  isSummarizing: boolean
  thread: Thread
}

export type ThreadActions = {
  send: (text: string) => unknown
  type: (text: string) => unknown
  toggleInclude: () => unknown
}

const ANCHOR_ROWS = 3
// The field grows with what is typed, wrapped lines too, up to this; past it, it
// scrolls. A row more for Claude Code's hint under the text.
const FIELD_MAX_ROWS = 8
// One row until the text has a line break: Claude Code then draws only "⏎ send"
// beside the field, where from two rows it adds a hint row under it. A line
// break comes from \ then ⏎, as in a comment (the hooks reopen the field).
const fieldRows = (draft: string, width: number) => (draft.includes('\n') ? tallRows(draft, width) : rowsFor(draft, width))
// A field of several rows: its text's rows as wrapped at `width`, and a row for
// Claude Code's hint under it.
// The rows a field needs for `text` at `width`. Claude Code draws its hint beside
// the first row: "⏎ save" while the field is one row, the longer "⏎ save ·
// shift+⏎ new line" from two rows on. A one-row field wraps its text but doesn't
// grow, so a line that wraps needs the rows itself.
const HINT_SHORT = 12
const HINT_LONG = cells('⏎ submit · shift+⏎ new line') + 2
const rowsFor = (text: string, width: number) => {
  const wrapped = (hint: number) => {
    const room = Math.max(1, width - hint)
    return text.split('\n').reduce((n, line) => n + Math.max(1, Math.ceil(cells(line) / room)), 0)
  }
  return wrapped(HINT_SHORT) <= 1 ? 1 : Math.min(FIELD_MAX_ROWS, wrapped(HINT_LONG))
}
const tallRows = (text: string, width: number) => Math.max(2, rowsFor(text, width))
// Columns the block, the answers and the summary are inset from each side, so
// they read apart from the person's messages and the field.
const INSET = 2

// The field's key, fresh after each send (a field drawn again under the same key
// keeps what was typed), and the switch's: the hooks move focus between them.
export const threadFieldKey = (id: string, seq: number) => `${id}-input-${seq}`
export const threadSwitchKey = (id: string) => `${id}-include`

export function ThreadView(
  { Box, Text, Button, Input, Markdown }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button' | 'Input' | 'Markdown'>,
  m: ThreadModel,
  actions: ThreadActions,
) {
  const t = m.thread
  const isStale = t.summary !== undefined && t.summarizedAt < t.messages.length
  const rule = <Text dimColor wrap="truncate">{'─'.repeat(Math.max(1, m.columns))}</Text>
  return (
    // A blank row first: docked panes sit under a row of tabs, and the block
    // would otherwise start right under them.
    <Box flexDirection="column" marginTop={1}>
      {/* The whole block drawn as the reply draws it, its first rows shown: a cut
          block would lose its fence and its colours. */}
      <Box
        height={Math.min(ANCHOR_ROWS, drawnRows(m.anchor, Math.max(1, m.columns - 2 * INSET)))}
        overflow="hidden"
        flexShrink={0}
        marginBottom={1}
        paddingX={INSET}
      >
        <Markdown text={m.anchor} dimColor />
      </Box>
      {t.messages.map((message, n) =>
        message.role === 'person' ? (
          <Box key={`m${n}`} marginBottom={1}>
            <Text color="suggestion">{`› ${message.text}`}</Text>
          </Box>
        ) : (
          <Box key={`m${n}`} marginBottom={1} paddingX={INSET}>
            <Markdown text={message.text} />
          </Box>
        ),
      )}
      {t.pending > 0 ? <Text dimColor>thinking…</Text> : null}
      {/* The summary as the review would send it, on screen while the person
          decides; the switch says whether it goes. */}
      {/* Hidden when there is nothing to send and the switch is off. */}
      {(t.summary !== undefined && (t.summary !== '' || t.included)) || m.isSummarizing ? (
        <Box flexDirection="column" marginBottom={1}>
          <Box paddingX={INSET}>
            <Text dimColor>
              {m.isSummarizing
                ? 'Summary: writing…'
                : t.pending > 0
                  ? 'Summary: updated with the answer'
                  : isStale
                    ? 'Summary: rewritten when you close this'
                    : 'Summary:'}
            </Text>
          </Box>
          <Box paddingX={INSET}>
            <Text dimColor>{t.summary || (m.isSummarizing ? '' : 'nothing to send from this thread')}</Text>
          </Box>
        </Box>
      ) : null}
      {/* The field as Claude Code draws its own prompt: a rule above and below,
          and ❯ before it. */}
      {rule}
      <Box flexDirection="row">
        <Text dimColor>{'❯ '}</Text>
        <Box flexGrow={1}>
          <Input
            key={threadFieldKey(m.id, t.inputSeq)}
            placeholder="ask about this block · \⏎ new line"
            submitLabel="send"
            {...(m.seed !== undefined ? { value: m.seed } : {})}
            rows={fieldRows(m.draft, m.columns - 2)}
            autoFocus
            onInput={value => void actions.type(value)}
            onSubmit={value => void actions.send(value)}
          />
        </Box>
      </Box>
      {rule}
      <Box flexDirection="row">
        <Button key={threadSwitchKey(m.id)} onPress={() => void actions.toggleInclude()}>
          {t.included ? '✓ include in review' : '○ include in review'}
        </Button>
        {t.included && t.summary === undefined ? <Text dimColor>{' · summarised when you close this'}</Text> : null}
      </Box>
    </Box>
  )
}
