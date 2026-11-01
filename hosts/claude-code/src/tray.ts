// The tray (SPEC §5): what the person staged on the adopted reply, a mark and a
// comment's text per part: a block's index, or a code line's key (blocks.ts). Every change goes through these functions;
// the hooks keep the result in $.state.

import type { Mark } from './compile'

export type Part = number | string

export type Tray = {
  marks: Readonly<Record<string, Mark>>
  // A comment's text: kept when its mark is cleared or overwritten, so opening
  // the comment again starts from it.
  comments: Readonly<Record<string, string>>
}

export const EMPTY: Tray = { marks: {}, comments: {} }

function withMark(tray: Tray, i: Part, mark: Mark | undefined): Tray {
  const marks = { ...tray.marks }
  if (mark) marks[i] = mark
  else delete marks[i]
  return { ...tray, marks }
}

// A new mark overwrites the block's mark; the same one again unmarks it.
export function toggle(tray: Tray, i: Part, mark: Mark): Tray {
  return withMark(tray, i, tray.marks[i] === mark ? undefined : mark)
}

// The comment as it is typed: its text only, staged by finishComment.
export function draftComment(tray: Tray, i: Part, text: string): Tray {
  return { ...tray, comments: { ...tray.comments, [i]: text } }
}

// Leaving the comment field: with text, the comment is staged; empty, it is
// dropped, along with a ✎ the block had.
export function finishComment(tray: Tray, i: Part): Tray {
  if ((tray.comments[i] ?? '').trim() === '') return dropComment(tray, i)
  return withMark(tray, i, 'comment')
}

// Cancelling the comment: its text goes, and its ✎ if the block had one.
export function dropComment(tray: Tray, i: Part): Tray {
  const comments = { ...tray.comments }
  delete comments[i]
  return withMark({ ...tray, comments }, i, tray.marks[i] === 'comment' ? undefined : tray.marks[i])
}

// Clearing a block unstages it, never destroys: the mark goes, a comment's text
// stays for when it is commented again.
export function clear(tray: Tray, i: Part): Tray {
  return withMark(tray, i, undefined)
}

// The marks on a code block's lines, by line.
export function lineMarks(marks: Readonly<Record<string, Mark>>, block: number): Record<string, Mark> {
  const prefix = `${block}.`
  return Object.fromEntries(
    Object.entries(marks)
      .filter(([key]) => key.startsWith(prefix))
      .map(([key, mark]) => [key.slice(prefix.length), mark]),
  )
}

// Backspace on a block: its own mark first; with none, the marks on its lines.
// Unstages, as clear does: comments' texts stay.
export function clearBlock(tray: Tray, block: number): Tray {
  if (tray.marks[block]) return clear(tray, block)
  const prefix = `${block}.`
  return { ...tray, marks: Object.fromEntries(Object.entries(tray.marks).filter(([key]) => !key.startsWith(prefix))) }
}

