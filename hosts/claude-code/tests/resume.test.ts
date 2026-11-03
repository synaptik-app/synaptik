// `/resume` and `/clear` inside a running session (#147): the conversation ends
// and the process goes on under another id, with no session.start. Synaptik
// adopts the new transcript's reply once the id has changed.

import { expect, mock, test } from 'claude-code/testing'

import { log, session, start, synaptik, transcriptOf } from './engine'

const F = 'fullscreen'

const end = ($: Parameters<typeof start>[0], reason: 'resume' | 'clear') =>
  $.session.end({ reason, sessionId: 'session-1', resume: { id: 'session-1' } } as never)

test('/resume from another session adopts the resumed reply', async ($, on) => {
  const clock = mock.clock(on)
  const rows = await start($, on, 'split')
  rows.splice(0, rows.length, ...transcriptOf(F))
  session.id = 'session-2'
  await end($, 'resume')
  await clock.advance(300)
  expect(await log($)).toMatch(/readopt after the session ended: [1-9]\d* chars/)
  expect((await synaptik($, '')).text ?? '').not.toContain('nothing to respond to yet')
})

test('/clear leaves nothing to review', async ($, on) => {
  const clock = mock.clock(on)
  const rows = await start($, on, F)
  rows.splice(0, rows.length)
  session.id = 'session-2'
  await end($, 'clear')
  await clock.advance(300)
  expect((await synaptik($, '')).text).toContain('nothing to respond to yet')
})

test('until the id changes, nothing is adopted again', async ($, on) => {
  const clock = mock.clock(on)
  await start($, on, F)
  await end($, 'resume')
  await clock.advance(1000)
  expect(await log($)).not.toContain('readopt after the session ended')
})
