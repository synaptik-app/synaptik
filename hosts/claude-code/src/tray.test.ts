// No session, no mock `$`: SPEC §5's rules, as plain data.

import { expect, test } from 'claude-code/testing'

import { addSelection, clear, draftComment, dropComment, EMPTY, finishComment, toggle } from './tray'

test('§5 a new mark on a marked block overwrites it', async () => {
  const tray = toggle(toggle(EMPTY, 2, 'accept'), 2, 'reject')
  expect(tray.marks).toEqual({ 2: 'reject' })
})

test('§5 the same verb twice unmarks', async () => {
  expect(toggle(toggle(EMPTY, 2, 'accept'), 2, 'accept').marks).toEqual({})
})

test('§5 clearing a block removes its mark and keeps the others', async () => {
  const tray = toggle(toggle(EMPTY, 1, 'accept'), 2, 'reject')
  expect(clear(tray, 2).marks).toEqual({ 1: 'accept' })
})

test('§5 clearing unstages, never destroys: a cleared comment keeps its text', async () => {
  const tray = clear(finishComment(draftComment(EMPTY, 3, 'too vague'), 3), 3)
  expect(tray.marks).toEqual({})
  expect(tray.comments).toEqual({ 3: 'too vague' })
})

test('§5 overwriting a comment with another verb keeps its text', async () => {
  const tray = toggle(finishComment(draftComment(EMPTY, 3, 'too vague'), 3), 3, 'accept')
  expect(tray.marks).toEqual({ 3: 'accept' })
  expect(tray.comments).toEqual({ 3: 'too vague' })
})

test('a comment being typed is not staged until it is finished', async () => {
  const typing = draftComment(EMPTY, 3, 'too')
  expect(typing.marks).toEqual({})
  expect(finishComment(typing, 3).marks).toEqual({ 3: 'comment' })
})

test('finishing an empty comment drops it, and the ✎ the block had', async () => {
  const staged = finishComment(draftComment(EMPTY, 3, 'too vague'), 3)
  const emptied = finishComment(draftComment(staged, 3, '  '), 3)
  expect(emptied).toEqual(EMPTY)
})

test('cancelling a comment leaves another mark on the block alone', async () => {
  const tray = dropComment(draftComment(toggle(EMPTY, 3, 'accept'), 3, 'x'), 3)
  expect(tray).toEqual({ marks: { 3: 'accept' }, comments: {}, selections: [] })
})

test('no function changes the tray it is given', async () => {
  const tray = toggle(EMPTY, 1, 'accept')
  toggle(tray, 1, 'accept')
  clear(tray, 1)
  dropComment(tray, 1)
  expect(tray.marks).toEqual({ 1: 'accept' })
  expect(EMPTY).toEqual({ marks: {}, comments: {}, selections: [] })
})

test('clearing a block takes its selections with it, and leaves other blocks\' alone', async () => {
  const mine = { text: 'a', block: 1, mark: 'accept' as const }
  const other = { text: 'b', block: 2, mark: 'reject' as const }
  const tray = addSelection(addSelection(addSelection(EMPTY, mine), mine), other)
  expect(clear(tray, 1).selections).toEqual([other])
})
