// The band above the prompt (SPEC §7): Synaptik's lines under whatever lies
// beneath (other mods', Claude Code's own) — a header, what is staged, and what
// the keys do now. Plain data and one callback — no `$`.

import type { Elements, RenderElement } from 'claude-code'

import { END_REVIEW, generational, NEXT_BLOCK, PREVIOUS_BLOCK, VERBS } from '../ui'

// The lead of each line under the header: as Claude Code nests its own output,
// so with several mods in the band it is clear which lines are ours.
const NEST = '⎿  '

export type BandModel = {
  // What the chain beneath drew, or null while reviewing (Synaptik's band then
  // stands alone as the key legend).
  beneath: RenderElement | null | undefined
  columns: number
  // What is staged, as the margins mark it ("✓2 ✗1 ✎1"), empty when nothing
  // is; and, outside a review, what the prompt box will do with it: take the
  // suggestion (Tab), send it (the box holds exactly it), or send what the person
  // typed instead (a warning). During a review ⏎ applies an action, so no note.
  staged: string
  stagedAs: 'reviewing' | 'suggested' | 'taken' | 'typed' | 'plain'
  // The last line, just above the prompt: what the keys do right now — or, in
  // fullscreen outside a review, the hooks' rotating hint (a Client) instead.
  action: string
  actionElement?: RenderElement
  isNavigatorShown: boolean
  entryKey: string
}

export function BandView(
  { Box, Text, Button }: Pick<Elements['terminal'], 'Box' | 'Text' | 'Button'>,
  m: BandModel,
  onOpen: () => unknown,
) {
  // The tree beneath may hold Claude Code's own drawing (an engine node), and an
  // engine node under a Box with `width` is refused — the whole band then falls
  // back to Claude Code's own. So `width` sits only on Synaptik's lines.
  return (
    <Box flexDirection="column">
      {m.beneath}
      <Box flexDirection="column" width={m.columns}>
        <Text wrap="truncate">Synaptik</Text>
        {m.staged &&
          (m.stagedAs === 'typed' ? (
            <Text color="yellow" wrap="truncate">
              {NEST}
              {m.staged} · ⏎ sends what you typed
            </Text>
          ) : (
            <Text wrap="truncate">
              {NEST}
              {m.staged}
              {m.stagedAs === 'taken' ? (
                <Text dimColor> · ⏎ sends your feedback</Text>
              ) : m.stagedAs === 'suggested' ? (
                <Text dimColor> · tab, then ⏎ to send</Text>
              ) : (
                ''
              )}
            </Text>
          ))}
        {m.actionElement ? (
          m.actionElement
        ) : m.isNavigatorShown ? (
          <Text dimColor wrap="truncate">
            {NEST}
            {m.action}
          </Text>
        ) : (
          // Edge case, design deferred: the navigator is not on screen, so the
          // band offers the press that opens it.
          <Box flexDirection="row">
            <Text dimColor>
              {NEST}
              {m.entryKey}, then{' '}
            </Text>
            <Button key="open-pane" plain autoFocus label="⏎ to review the reply" onPress={onOpen} />
          </Box>
        )}
      </Box>
    </Box>
  )
}

// Fullscreen's keyboard path (D41): the entry key focuses the band, whose ring
// stops on the actions — hidden, since the menu under the selected block in
// the reply shows them — with j / k to move between blocks (↑/↓ scroll the band).
// While a comment is open from here, its field shows in the band.
export type BandKeysModel = {
  // The controls' generation (ui.ts, generational).
  generation: number
  // The comment being typed from the band: its field's key and text.
  comment?: { key: string; text: string }
}

export type BandKeysActions = {
  move: (by: 1 | -1) => unknown
  end: () => unknown
  verb: (n: number) => unknown
  type: (text: string) => unknown
  submit: (text: string) => unknown
}

export function BandKeysView(
  { Box, Button, Input }: Pick<Elements['terminal'], 'Box' | 'Button' | 'Input'>,
  band: RenderElement,
  m: BandKeysModel,
  actions: BandKeysActions,
) {
  return (
    <Box flexDirection="column">
      {band}
      {m.comment && (
        // Hidden: it takes the typing, and the comment shows in place, under its
        // block in the reply.
        <Box display="none">
          <Input
          key={m.comment.key}
          placeholder="comment"
          submitLabel="ok"
          value={m.comment.text}
          onInput={value => actions.type(value)}
          onSubmit={value => actions.submit(value)}
          />
        </Box>
      )}
      <Box display="none">
        {VERBS.map((v, n) => (
          <Button
            key={generational(v.key, m.generation)}
            plain
            hotkey={v.hotkey}
            autoFocus={n === 0 ? true : undefined}
            label={v.glyph}
            onPress={() => actions.verb(n)}
          />
        ))}
        <Button key={generational(NEXT_BLOCK, m.generation)} plain hotkey="j" label="next block" onPress={() => actions.move(1)} />
        <Button key={generational(PREVIOUS_BLOCK, m.generation)} plain hotkey="k" label="previous block" onPress={() => actions.move(-1)} />
        <Button key={generational(END_REVIEW, m.generation)} plain hotkey="q" label="end review" onPress={() => actions.end()} />
      </Box>
    </Box>
  )
}
