// The band's hint line in fullscreen (D41): it cycles through its messages on
// its own timer (no redraw of the band), and a click on it starts the review and
// hands it the keyboard, so ↑/↓ move between blocks. Its keys are posted to the
// hooks, which steer the review as the band's own keys do.

import type { ClientModule } from 'claude-code'

export type HintProps = {
  // The lines to cycle through, each shown for `everyMs`.
  messages: string[]
  everyMs: number
}

type State = { at: number }

const NEST = '⎿  '

const Hint: ClientModule<HintProps, State> = (props, surface) => {
  const { Text } = surface.elements
  if (surface.state === undefined) {
    surface.setState({ at: 0 })
    surface.every(props.everyMs, () => surface.setState({ at: (surface.state?.at ?? 0) + 1 }))
  }
  surface.onPointer(event => {
    if (event.type === 'down') surface.post({ kind: 'start' })
  })
  surface.onKey(key =>
    surface.post({ kind: 'key', key: key.key, ctrl: key.ctrl ?? false, shift: key.shift ?? false, meta: key.meta ?? false }),
  )
  const at = surface.state?.at ?? 0
  const line = props.messages[at % Math.max(1, props.messages.length)] ?? ''
  return Text({ dimColor: true, wrap: 'truncate', children: [NEST, line] })
}

export default Hint
