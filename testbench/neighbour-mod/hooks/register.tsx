// Test bench companion for issue #12: a deliberately well-behaved mod that
// shares every surface Synaptik uses, so anything that breaks points at
// Synaptik. It always calls next(e) and never takes what is not its own.
//
//   band        a line of its own plus a button (n), composed with next(e)
//   pane        a small scrollable pane, "Neighbour"
//   reply       the reply as drawn beneath it, plus a dim footer line
//   suggestion  the pane's suggest button (or /neighbour suggest) proposes one
//
//   /neighbour          open the pane
//   /neighbour suggest  propose a suggestion
//   /neighbour greedy   toggle greedy mode: the band and the reply are drawn by
//                       the neighbour alone, without next(e) — what Synaptik
//                       looks like when a less polite mod sits above it

import type { Register } from 'claude-code'

const PANE = 'neighbour-pane'

// Greedy mode, toggled by /neighbour greedy. A module variable: a reload resets
// it to polite.
let isGreedy = false

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'neighbour',
      description: 'Test bench neighbour mod: open its pane, or `suggest`',
    })
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'neighbour' }, async ($, e) => {
    if (e.args.trim() === 'greedy') {
      isGreedy = !isGreedy
      $.ui.invalidate('ui.render')
      return { text: `neighbour greedy: ${isGreedy ? 'on — no next(e) for band and reply' : 'off'}` }
    }
    if (e.args.trim() === 'suggest') {
      const shown = await $.prompt.suggest({ text: 'neighbour: a suggestion of its own' })
      return { text: `neighbour suggest: ${JSON.stringify(shown)}` }
    }
    const opened = await $.ui.open({ id: PANE, title: 'Neighbour', rows: 6, columns: 24 })
    return { text: `neighbour pane: ${JSON.stringify(opened)}` }
  })

  // The band: its own line above whatever the chain beneath draws.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    if (isGreedy) return <Text dimColor>neighbour · band (greedy: nothing beneath is drawn)</Text>
    const beneath = await next(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text dimColor>neighbour · band </Text>
          <Button key="ping" hotkey="n" plain dimColor label="ping" onPress={() => $.ui.toast('neighbour: ping')} />
        </Box>
        {beneath}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // The reply, as drawn beneath this hook, with a footer: if the footer shows,
  // the neighbour sits above Synaptik in the chain and saw its drawing.
  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Markdown } = $.ui.resolve(e)
    if (isGreedy) {
      // Draws the reply itself and never calls next(e): no mod beneath it runs.
      return (
        <Box flexDirection="column">
          <Markdown text={e.props.text} />
          <Text dimColor>— neighbour drew this reply alone (greedy)</Text>
        </Box>
      )
    }
    const beneath = await next(e)
    return (
      <Box flexDirection="column">
        {beneath}
        <Text dimColor>— neighbour saw this reply</Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // A pane with more lines than it shows, so ↑/↓ scroll it and the person's
  // Pane bindings (←/→) can be seen to reach another mod's pane.
  on('ui.render', { component: 'Pane', requestId: PANE }, ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Button } = $.ui.resolve(e)
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Button key="one" label="one" onPress={() => $.ui.toast('neighbour: one')} />
          <Button key="two" label="two" onPress={() => $.ui.toast('neighbour: two')} />
          <Button
            key="suggest"
            label="suggest"
            onPress={async () => {
              // From a button, not a command: the prompt box is empty and no
              // command runs, so a refusal here is a real conflict.
              const shown = await $.prompt.suggest({ text: 'neighbour: a suggestion of its own' })
              $.ui.toast(`neighbour suggest: ${JSON.stringify(shown)}`)
            }}
          />
        </Box>
        {Array.from({ length: 20 }, (_, i) => (
          <Text dimColor>neighbour line {i + 1}</Text>
        ))}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
