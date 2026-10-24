// The tray (SPEC §5): what the person staged on the adopted reply, a mark and a
// comment's text per block index. Every change goes through these functions;
// the hooks keep the result in $.state.

import type { Mark } from './compile'

export type Tray = {
  marks: Readonly<Record<number, Mark>>
  // A comment's text: kept when its mark is cleared or overwritten, so opening
  // the comment again starts from it.
  comments: Readonly<Record<number, string>>
}

export const EMPTY: Tray = { marks: {}, comments: {} }

function withMark(tray: Tray, i: number, mark: Mark | undefined): Tray {
  const marks = { ...tray.marks }
  if (mark) marks[i] = mark
  else delete marks[i]
  return { ...tray, marks }
}

// A new mark overwrites the block's mark; the same one again unmarks it.
export function toggle(tray: Tray, i: number, mark: Mark): Tray {
  return withMark(tray, i, tray.marks[i] === mark ? undefined : mark)
}

// The comment as it is typed: its text only, staged by finishComment.
export function draftComment(tray: Tray, i: number, text: string): Tray {
  return { ...tray, comments: { ...tray.comments, [i]: text } }
}

// Leaving the comment field: with text, the comment is staged; empty, it is
// dropped, along with a ✎ the block had.
export function finishComment(tray: Tray, i: number): Tray {
  if ((tray.comments[i] ?? '').trim() === '') return dropComment(tray, i)
  return withMark(tray, i, 'comment')
}

// Cancelling the comment: its text goes, and its ✎ if the block had one.
export function dropComment(tray: Tray, i: number): Tray {
  const comments = { ...tray.comments }
  delete comments[i]
  return withMark({ ...tray, comments }, i, tray.marks[i] === 'comment' ? undefined : tray.marks[i])
}

// Clearing a block unstages it, never destroys: the mark goes, a comment's text
// stays for when it is commented again.
export function clear(tray: Tray, i: number): Tray {
  return withMark(tray, i, undefined)
}
