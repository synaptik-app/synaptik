// Synaptik draws only in the terminal renderer (D40): on every other surface —
// the Desktop app's Code tab, the mobile app, the VS Code panel — each render
// hook passes through, and Claude Code draws as usual.

import { expect, test } from 'claude-code/testing'

import { ENGINE_DRAWING, PLUGIN, start } from './engine'
import { FIXTURES } from './fixtures.generated'

const PANE = 'synaptik-map'

for (const surface of ['desktop', 'mobile', 'vscode'] as const) {
  test(`${surface}: the reply, the band and the navigator are Claude Code's own`, async ($, on) => {
    await start($, on, 'rendering')
    const reply = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'AssistantMessage',
      props: { text: FIXTURES.rendering!.pieces[0]!, isFirstOfReply: true },
    } as never)
    expect(await reply.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
    const band = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'AbovePrompt',
      props: { hasSurvey: false, isWorking: false, maxRows: 8, bodyColumns: 100, scroll: { offset: 0, bodyRows: 8 }, view: {} },
    } as never)
    expect(await band.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
    const pane = await $.ui.mount({
      plugin: PLUGIN,
      surface,
      component: 'Pane',
      requestId: PANE,
      props: { title: 'Synaptik', isFocused: true, bodyColumns: 40, placement: 'dock', scroll: { offset: 1, bodyRows: 20 }, view: {} },
    } as never)
    expect(await pane.find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
  })
}
