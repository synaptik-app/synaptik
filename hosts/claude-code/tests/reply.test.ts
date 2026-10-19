// When Synaptik redraws a reply, and when it leaves it to Claude Code (#48,
// D33, D35): only while reviewing, or for a piece that carries marks.

import { expect, test } from 'claude-code/testing'

import { ENGINE_DRAWING, PLUGIN, pane, reply, start, toggle } from './engine'

const isOwn = async (drawn: Awaited<ReturnType<typeof reply>>) =>
  (await drawn.find({ type: 'Text', text: ENGINE_DRAWING })) !== undefined

test('an unmarked reply outside review is Claude Code’s own drawing', async ($, on) => {
  await start($, on, 'rendering')
  await pane($, 'dock', false)
  expect(await isOwn(await reply($, 'rendering'))).toBe(true)
})

test('while reviewing, Synaptik draws the reply', async ($, on) => {
  await start($, on, 'rendering')
  await pane($, 'dock')
  expect(await isOwn(await reply($, 'rendering'))).toBe(false)
})

test('after review, a marked reply keeps its glyphs (D35)', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await ui.unmount()
  await pane($, 'inline', false)
  const drawn = await reply($, 'rendering')
  expect(await isOwn(drawn)).toBe(false)
  expect(await drawn.find({ type: 'Text', text: '✓' })).toBeDefined()
})

test('in a reply split around tool calls, only the marked piece is redrawn', async ($, on) => {
  await start($, on, 'split')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' }) // the last block, in the last piece
  await ui.unmount()
  await pane($, 'inline', false)
  expect(await isOwn(await reply($, 'split', 0))).toBe(true)
  expect(await isOwn(await reply($, 'split', 2))).toBe(false)
})

test('a reply other than the adopted one is left alone', async ($, on) => {
  await start($, on, 'rendering')
  await pane($, 'dock')
  const other = await $.ui.mount({
    plugin: PLUGIN,
    surface: 'terminal',
    component: 'AssistantMessage',
    props: { text: 'An older reply, further up.', isFirstOfReply: true },
    viewport: { columns: 120, rows: 40 },
  })
  expect(await isOwn(other)).toBe(true)
})

test('with the mod switched off (/synaptik), even a marked reply is Claude Code’s', async ($, on) => {
  await start($, on, 'rendering')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await toggle($)
  expect(await isOwn(await reply($, 'rendering'))).toBe(true)
})
