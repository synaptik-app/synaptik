// A thread's pane (SPEC §8): the block it is about, the exchange, a field, and
// the switch that includes its summary in the review. Plain data and callbacks —
// no `$`.

import type { Elements } from 'claude-code'

import { drawnRows } from '../../src/layout'
import type { Thread } from '../../src/threads'

export type ThreadModel = {
  id: string
  // The block: what the thread is about. Its first rows are drawn.
  anchor: string
  columns: number
  thread: Thread
}

export type ThreadActions = {
  send: (text: string) => unknown
  toggleInclude: () => unknown
}

const ANCHOR_ROWS = 3
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
      {t.included && t.summary ? (
        <Box flexDirection="column" marginBottom={1}>
          <Box justifyContent="center">
            <Text dimColor>{isStale ? 'summary for review, rewritten when you close this' : 'summary for review'}</Text>
          </Box>
          <Box paddingX={INSET}>
            <Text dimColor>{t.summary}</Text>
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
            placeholder="ask about this block"
            rows={2}
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
        <Text dimColor>{t.included && !t.summary ? ' · summarised when you close this · esc close' : ' · esc close'}</Text>
      </Box>
    </Box>
  )
}
