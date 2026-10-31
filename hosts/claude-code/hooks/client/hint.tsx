// The band's hint line in fullscreen (D41): it cycles through its messages on
// its own timer (no redraw of the band), and a click on it starts the review and
// hands it the keyboard, so ↑/↓ move between blocks. Its keys are posted to the
// hooks, which steer the review as the band's own keys do.

import type { ClientModule } from 'claude-code'

import { cells, itemAt } from '../../src/review'
import { COMMENT_KEYS } from '../ui'

export type HintProps = {
  // The lines to cycle through, each shown for `everyMs`.
  messages: string[]
  everyMs: number
  // How often to have the hooks read the selection (#91): no event says it changed.
  pollMs: number
  // Text is selected: the row shows the actions instead, and what they apply to.
  selection?: string
  // A selection's comment being typed here, after a click on ✎.
  comment?: { text: string; cursor: number }
}

type State = { at: number; hovered?: number }

const NEST = '⎿  '
const ITEMS = ['[ ✓ accept ]', '[ ✗ reject ]', '[ ✎ comment ]', '[ 💬 discuss ]']

const Hint: ClientModule<HintProps, State> = (props, surface) => {
  const { Box, Text } = surface.elements
  const at = surface.state?.at ?? 0
  if (surface.state === undefined) {
    surface.setState({ at: 0 })
    surface.every(props.everyMs, () => surface.setState({ ...surface.state, at: (surface.state?.at ?? 0) + 1 }))
    surface.every(props.pollMs, () => surface.post({ kind: 'poll' }))
  }
  const hit = (x: number) => (props.selection === undefined ? -1 : itemAt(x - cells(NEST), ITEMS))
  surface.onPointer(event => {
    if (event.type === 'move' || event.type === 'enter' || event.type === 'leave') {
      const n = event.type === 'leave' ? -1 : hit(event.x)
      const { hovered: _, ...rest } = surface.state ?? { at }
      return surface.setState(n >= 0 ? { ...rest, hovered: n } : rest)
    }
    if (event.type !== 'down' || props.comment) return
    if (props.selection === undefined) return surface.post({ kind: 'start' })
    const n = hit(event.x)
    if (n >= 0) surface.post({ kind: 'selection-action', verb: n })
  })
  surface.onKey(key =>
    surface.post({ kind: 'key', key: key.key, ctrl: key.ctrl ?? false, shift: key.shift ?? false, meta: key.meta ?? false }),
  )

  if (props.comment) {
    const { text, cursor } = props.comment
    const before = text.slice(0, cursor)
    const atLine = before.split('\n').length - 1
    const atColumn = before.length - before.lastIndexOf('\n') - 1
    const lines = text.split('\n')
    return Box({
      flexDirection: 'column',
      children: lines.map((line, n) =>
        Text({
          dimColor: true,
          children: [
            n === 0 ? `${NEST}→ ` : '     ',
            ...(n === atLine
              ? [line.slice(0, atColumn), Text({ inverse: true, children: [line[atColumn] ?? ' '] }), line.slice(atColumn + 1)]
              : [line]),
            ...(n === lines.length - 1 ? [`   ⏎ ${COMMENT_KEYS}${text === '' ? '' : ' · ctrl+u clear'}`] : []),
          ],
        }),
      ),
    })
  }
  if (props.selection !== undefined) {
    const hovered = surface.state?.hovered
    return Text({
      wrap: 'truncate',
      children: [
        Text({ dimColor: true, children: [NEST] }),
        ...ITEMS.map((item, n) => Text({ ...(n === hovered ? { inverse: true } : { dimColor: true }), children: [item] })),
        Text({ dimColor: true, children: [`  "${props.selection}"`] }),
      ],
    })
  }
  const line = props.messages[at % Math.max(1, props.messages.length)] ?? ''
  return Text({ dimColor: true, wrap: 'truncate', children: [NEST, line] })
}

export default Hint
