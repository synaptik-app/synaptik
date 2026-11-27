// A thread's pane (SPEC §8): the block it is about, the exchange, a field, and
// the switch that includes its summary in the review. Plain data and callbacks —
// no `$`.

import type { Elements } from 'claude-code'

import { drawnRows } from '../../src/layout'
import { forPane, rowRecord } from '../../src/pane'
import { cells } from '../../src/review'
import { reportState } from '../../src/threads'
import { reportLine, STOP_LABEL } from '../../src/waiting'
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
  // The waiting lines, drawn as given: the answer on its way, the agent at work.
  thinking?: string
  agentWorking?: string
}

export type ThreadActions = {
  send: (text: string) => unknown
  toggleInclude: () => unknown
  cancel: () => unknown
  // What the field holds, as typed.
  input: (text: string) => unknown
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
// ◼ cancel, beside the waiting line: a click, or ↑ from the field and ⏎. Ctrl+C
// can't press it: Claude Code keeps that key, and Ctrl+D, for itself (#240).
export const threadStopKey = (id: string) => `${id}-stop`

export function ThreadView(
  { Box, Text, Button, Input, Markdown }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button' | 'Input' | 'Markdown'>,
  m: ThreadModel,
  actions: ThreadActions,
) {
  const t = m.thread
  // While messages wait, the empty field says how to get them back (#245).
  const queuedCount = t.messages.filter(message => message.queued).length
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
  // Laid out for the pane, not the terminal, whose width Markdown goes by (#233).
  const width = Math.max(1, m.columns - 2 * INSET)
  const anchor = m.isPart ? rowRecord(m.anchor) : forPane(m.anchor, width)
  const rule = <Text dimColor wrap="truncate">{'─'.repeat(Math.max(1, m.columns))}</Text>
  return (
    // A blank row first: docked panes sit under a row of tabs, and the block
    // would otherwise start right under them.
    <Box flexDirection="column" marginTop={1}>
      {/* The whole block drawn as the reply draws it, its first rows shown: a cut
          block would lose its fence and its colours. */}
      <Box
        height={Math.min(m.isPart ? Infinity : ANCHOR_ROWS, drawnRows(anchor, width))}
        overflow="hidden"
        flexShrink={0}
        paddingX={INSET}
      >
        <Markdown text={anchor} dimColor />
      </Box>
      {/* A rule under the block once the thread has begun, so it doesn't read as
          part of the block. Before that, the field's own rule follows. */}
      {t.messages.length > 0 ? <Box marginTop={1} marginBottom={1}>{rule}</Box> : <Box marginBottom={1} />}
      {t.messages.map((message, n) =>
        message.role === 'person' ? (
          <Box key={`m${n}`} marginBottom={1}>
            <Text color="suggestion">
              {`› ${message.text}`}
              {message.queued ? <Text dimColor> · queued</Text> : null}
            </Text>
          </Box>
        ) : message.role === 'sent' ? (
          // One line: the answer above it says what it asked. The thread keeps
          // the words, for its own reading; the agent's view has them too.
          <Box key={`m${n}`} marginBottom={1} paddingX={INSET}>
            <Text dimColor>▶ Sent to agent</Text>
          </Box>
        ) : message.role === 'status' ? (
          // Synaptik's own line about the agent: a failure in Claude Code's warning
          // colour, as its own warnings are; anything else dim.
          <Box key={`m${n}`} marginBottom={1} paddingX={INSET}>
            {message.text.startsWith('✗') ? <Text color="warning">{message.text}</Text> : <Text dimColor>{message.text}</Text>}
          </Box>
        ) : message.role === 'direct' ? (
          // What the person wrote to the agent in its own view.
          <Box key={`m${n}`} marginBottom={1}>
            <Text color="suggestion">{`› to agent: ${message.text}`}</Text>
          </Box>
        ) : message.role === 'report' ? (
          // One line: the thread's answer under it says what the agent did. The
          // thread keeps the report whole, for its own reading; the agent's
          // view has what it wrote.
          <Box key={`m${n}`} marginBottom={1} paddingX={INSET}>
            <Text dimColor>{reportLine(reportState(message.text), message.ms)}</Text>
          </Box>
        ) : (
          <Box key={`m${n}`} marginBottom={1} paddingX={INSET}>
            <Markdown text={forPane(message.text, width)} />
          </Box>
        ),
      )}
      {m.agentWorking ? (
        <Box paddingX={INSET} marginBottom={1}>
          <Text dimColor wrap="truncate-end">{m.agentWorking}</Text>
        </Box>
      ) : null}
      {m.thinking ? (
        <Box paddingX={INSET} marginBottom={1} flexDirection="row">
          <Text dimColor>{`${m.thinking}  `}</Text>
          <Button key={threadStopKey(m.id)} dimColor onPress={() => void actions.cancel()}>
            {STOP_LABEL}
          </Button>
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
            value={t.draft}
            placeholder={queuedCount > 0 ? `↑ to edit the queued message${queuedCount > 1 ? 's' : ''}` : 'ask about this block'}
            submitLabel="send"
            rows={FIELD_ROWS}
            autoFocus
            onInput={value => void actions.input(value)}
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
