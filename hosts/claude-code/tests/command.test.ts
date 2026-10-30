// The `/synaptik` command (D39): a bare `/synaptik` opens the navigator; `help`,
// `on` / `off` for the session, `log`.

import { expect, test } from 'claude-code/testing'

import { band, ENGINE_DRAWING, opened, pane, reply, start, synaptik } from './engine'
import type { Row } from './engine'

const text = async (result: Promise<{ text?: string } | undefined>) => String((await result)?.text ?? '')

test('a bare /synaptik opens the navigator and hands it the keyboard', async ($, on) => {
  await start($, on, 'classic')
  const before = opened.length
  expect(await text(synaptik($, ''))).toBe('')
  expect(opened.slice(before)).toEqual([{ focus: true }])
})

test('opening on its own, as a new reply does, does not take the keyboard', async ($, on) => {
  await start($, on, 'classic')
  expect(opened).toEqual([{ focus: false }])
})

test('/synaptik with no reply yet says so, and opens nothing', async ($, on) => {
  const prompt: Row[] = [{ role: 'user', text: 'hello', toolUses: [] }]
  await start($, on, 'classic', prompt)
  expect(await text(synaptik($, ''))).toMatch(/^nothing to respond to yet/)
  expect(opened).toEqual([])
})

test('/synaptik help lists every command, without repeating the name Claude Code shows', async ($, on) => {
  await start($, on, 'classic')
  const help = await text(synaptik($, 'help'))
  expect(help).not.toMatch(/^Synaptik/)
  for (const command of ['/synaptik ', '/synaptik on', '/synaptik off', '/synaptik log', '/synaptik help']) {
    expect(help).toContain(command)
  }
})

test('/synaptik off hands the reply and the band back to Claude Code', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  expect(await text(synaptik($, 'off'))).toMatch(/^off for this session.*\/plugin/)
  expect(await (await reply($, 'classic')).find({ type: 'Text', text: ENGINE_DRAWING })).toBeDefined()
  const drawn = await band($)
  expect(await drawn.find({ type: 'Text', text: /Synaptik/ })).toBeUndefined()
})

test('/synaptik on brings it back, with the tray kept', async ($, on) => {
  await start($, on, 'classic')
  const ui = await pane($, 'inline')
  await ui.press({ key: 'verb-accept' })
  await synaptik($, 'off')
  expect(await text(synaptik($, 'on'))).toBe('on')
  const drawn = await reply($, 'classic')
  expect(await drawn.find({ type: 'Text', text: '✓' })).toBeDefined()
})

test('on when on, and off when off, say so', async ($, on) => {
  await start($, on, 'classic')
  expect(await text(synaptik($, 'on'))).toBe('already on')
  await synaptik($, 'off')
  expect(await text(synaptik($, 'off'))).toBe('already off for this session')
})

test('a bare /synaptik while off points to /synaptik on', async ($, on) => {
  await start($, on, 'classic')
  await synaptik($, 'off')
  expect(await text(synaptik($, ''))).toMatch(/\/synaptik on/)
})

test('/synaptik log shows what was observed', async ($, on) => {
  await start($, on, 'classic')
  expect(await text(synaptik($, 'log'))).toMatch(/adopt \d+ messages/)
})

test('an unknown subcommand answers with the help', async ($, on) => {
  await start($, on, 'classic')
  const answer = await text(synaptik($, 'frobnicate'))
  expect(answer).toMatch(/^unknown: \/synaptik frobnicate/)
  expect(answer).toContain('/synaptik help')
})

