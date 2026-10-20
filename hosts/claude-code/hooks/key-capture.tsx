// The key setup's capture line (D38): while a click has given it the focus, it
// hands each key pressed to the hooks module, which decides what it means.
// Escape returns the focus, so it is never captured.

import type { ClientModule } from 'claude-code'

type Props = { prompt: string }

const KeyCapture: ClientModule<Props, { isListening: true }> = (props, surface) => {
  if (!surface.state) {
    surface.onKey(k => surface.post({ key: k.key, ctrl: k.ctrl ?? false, shift: k.shift ?? false, meta: k.meta ?? false }))
    surface.setState({ isListening: true })
  }
  const { Text } = surface.elements
  return Text({ children: props.prompt })
}

export default KeyCapture
