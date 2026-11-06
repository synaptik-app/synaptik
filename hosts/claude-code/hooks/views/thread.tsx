// A thread's pane (SPEC §8): the block it is about, the exchange, a field, and
// the switch that includes its summary in the review. Plain data and callbacks —
// no `$`.

import type { Elements } from 'claude-code'

import { drawnRows } from '../../src/layout'
import { cells } from '../../src/review'
import type { Thread } from '../../src/threads'

export type ThreadModel = {
  id: string
  // What the thread is about: a block, its first rows drawn, or a code line or
  // table row, drawn whole.
  anchor: string
  isPart: boolean
  columns: number
  isSummarizing: boolean
  thread: Thread
}

export type ThreadActions = {
  send: (text: string) => unknown
  toggleInclude: () => unknown
}

const ANCHOR_ROWS = 3
// The field's height, fixed: Claude Code draws it that tall, empty or not, and
// scrolls a longer text within. Grown to fit what was typed, it had to predict
// how Claude Code wraps beside its key hint, and a row counted short hid the text.
const FIELD_ROWS = 6
// Columns the block, the answers and the summary are inset from each side, so
// they read apart from the person's messages and the field.
const INSET = 2
// Before the summary's first line, the rest lined up after it.
const SUMMARY_HOOK = '⎿  '

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
  // The summary's state, beside the switch, only when it has one.
  // Off, there is nothing to say: the summary isn't shown, or written.
  const note = m.isSummarizing
    ? 'writing…'
    : !t.included
      ? undefined
      : t.pending > 0 && t.summary
        ? 'updated with the answer'
        : isStale
          ? 'rewritten when you close this'
        : t.included && t.summary === undefined
          ? 'summarised when you close this'
          : t.included && t.summary === ''
            ? 'nothing to send from this thread'
            : undefined
  const rule = <Text dimColor wrap="truncate">{'─'.repeat(Math.max(1, m.columns))}</Text>
  return (
    // A blank row first: docked panes sit under a row of tabs, and the block
    // would otherwise start right under them.
    <Box flexDirection="column" marginTop={1}>
      {/* The whole block drawn as the reply draws it, its first rows shown: a cut
          block would lose its fence and its colours. */}
      <Box
        height={Math.min(m.isPart ? Infinity : ANCHOR_ROWS, drawnRows(m.anchor, Math.max(1, m.columns - 2 * INSET)))}
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
      {/* The field as Claude Code draws its own prompt: a rule above and below,
          and ❯ before it. */}
      {rule}
      <Box flexDirection="row">
        <Text dimColor>{'❯ '}</Text>
        <Box flexGrow={1}>
          <Input
            key={threadFieldKey(m.id, t.inputSeq)}
            placeholder="ask about this block"
            submitLabel="send"
            rows={FIELD_ROWS}
            autoFocus
            onSubmit={value => void actions.send(value)}
          />
        </Box>
      </Box>
      {rule}
      <Box flexDirection="row">
        <Button key={threadSwitchKey(m.id)} onPress={() => void actions.toggleInclude()}>
          {t.included ? '✓ include in review' : '○ include in review'}
        </Button>
        {note ? <Text dimColor>{` · ${note}`}</Text> : null}
      </Box>
      {/* The summary as the review sends it, under the switch, while the switch
          is on: off, nothing goes. Its sections' labels say what each line is. */}
      {t.included && t.summary ? (
        <Box flexDirection="row" paddingX={INSET}>
          {/* Hung from the switch, as Claude Code hangs a tool's result from its call. */}
          <Box width={cells(SUMMARY_HOOK)} flexShrink={0}>
            <Text dimColor>{SUMMARY_HOOK}</Text>
          </Box>
          <Box flexGrow={1}>
            <Text dimColor>{t.summary}</Text>
          </Box>
        </Box>
      ) : null}
    </Box>
  )
}
