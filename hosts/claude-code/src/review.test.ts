// No session, no mock `$`: the fullscreen review's steps as plain data (D41).

import { expect, test } from 'claude-code/testing'

import { cells, click, closed, current, itemAt, letGo, lineMove, paste, press, queue, receive, START } from './review'
import type { Key, Review, Scope } from './review'

const SCOPE: Scope = { first: 0, last: 4, comments: {} }
const active: Review = { ...START, selected: 2, isActive: true }

// The keys in order, each step taken on the review the last one left.
function keys(review: Review, list: (string | Key)[], scope = SCOPE) {
  let r = review
  const actions = []
  for (const k of list) {
    const s = press(r, typeof k === 'string' ? { key: k } : k, scope)
    if (!s) continue
    r = s.review
    actions.push(...s.actions)
  }
  return { review: r, actions }
}

test('↑/↓ move between blocks, within the reply', async () => {
  expect(keys(active, ['up']).review.selected).toBe(1)
  expect(keys(active, ['down', 'down', 'down', 'down']).review.selected).toBe(4)
  expect(keys(active, ['up', 'up', 'up']).review.selected).toBe(0)
})

test('Home/End and PgUp/PgDn jump to the first and last block', async () => {
  expect(keys(active, ['end']).review.selected).toBe(4)
  expect(keys(active, ['home']).review.selected).toBe(0)
  expect(keys(active, ['pagedown']).review.selected).toBe(4)
})

test('←/→ walk the menu around, ⏎ applies the item under the cursor', async () => {
  expect(keys(active, ['left']).review.verb).toBe(3)
  const { review, actions } = keys(active, ['right', 'return'])
  expect(review.verb).toBe(1)
  expect(actions).toEqual([{ kind: 'mark', verb: 'reject', index: 2 }])
})

test('q ends the review; in a comment it types a q', async () => {
  expect(keys(active, ['q']).actions).toEqual([{ kind: 'end' }])
  expect(keys(active, ['c', 'q']).review.editing?.text).toBe('q')
})

test('a / x / d act directly; c opens the comment field', async () => {
  expect(keys(active, ['a']).actions).toEqual([{ kind: 'mark', verb: 'accept', index: 2 }])
  expect(keys(active, ['x']).actions).toEqual([{ kind: 'mark', verb: 'reject', index: 2 }])
  expect(keys(active, ['d']).actions).toEqual([{ kind: 'discuss', index: 2 }])
  expect(keys(active, ['c']).review.editing).toEqual({ index: 2, text: '', cursor: 0 })
})

test('a comment is typed in place: characters, space, the cursor keys, backspace, delete', async () => {
  const { review } = keys(active, ['c', 't', 'o', 'o', 'space', 'v', 'a', 'g', 'u', 'e', 'home', 'delete', 'end', 'backspace', 'left'])
  expect(review.editing).toEqual({ index: 2, text: 'oo vagu', cursor: 6 })
})

test('⏎ stages the comment; reopening it starts from what was staged', async () => {
  const { review, actions } = keys(active, ['c', 'h', 'i', 'return'])
  expect(review.editing).toBeUndefined()
  expect('editing' in review).toBe(false) // no missing value: a Client's props refuse one
  expect(actions).toEqual([{ kind: 'comment', index: 2, text: 'hi' }])
  const again = keys(review, ['c'], { ...SCOPE, comments: { '2': 'hi' } }).review
  expect(again.editing).toEqual({ index: 2, text: 'hi', cursor: 2 })
})

test('a new line: backslash then ⏎, Shift+⏎, Alt+⏎ or ctrl+j — plain ⏎ stages', async () => {
  expect(keys(active, ['c', 'a', '\\', 'return', 'b']).review.editing?.text).toBe('a\nb')
  expect(keys(active, ['c', 'a', { key: 'return', shift: true }, 'b']).review.editing?.text).toBe('a\nb')
  expect(keys(active, ['c', 'a', { key: 'return', meta: true }, 'b']).review.editing?.text).toBe('a\nb')
  expect(keys(active, ['c', 'a', { key: 'j', ctrl: true }, 'b']).review.editing?.text).toBe('a\nb')
})

test('↑/↓ in a one-line comment do nothing: it stays open, unstaged', async () => {
  const { review, actions } = keys(active, ['c', 'o', 'k', 'down', 'up'])
  expect(review.selected).toBe(2)
  expect(review.editing).toEqual({ index: 2, text: 'ok', cursor: 2 })
  expect(actions).toEqual([])
})
test('backspace on an empty comment cancels it', async () => {
  expect(keys(active, ['c', 'x', 'backspace', 'backspace']).actions).toEqual([{ kind: 'cancel', index: 2 }])
})

test('a paste handed over as one burst of text goes in whole; named keys never type', async () => {
  expect(keys(active, ['c', 'pasted words', 'escape', 'tab']).review.editing?.text).toBe('pasted words')
})

test('a click selects that block and stages a comment open elsewhere', async () => {
  const typing = keys(active, ['c', 'h', 'i']).review
  const s = click(typing, 4, SCOPE)
  expect(s.review.selected).toBe(4)
  expect(s.review.isActive).toBe(true)
  expect(s.actions).toEqual([{ kind: 'comment', index: 2, text: 'hi' }])
})

test('every step counts up, and keeps the epoch', async () => {
  const s = press({ ...active, seq: 7, epoch: 3 }, { key: 'down' }, SCOPE)!
  expect([s.review.seq, s.review.epoch]).toEqual([8, 3])
})

test('the hooks apply each action once, however often a post repeats it', async () => {
  const held = { review: active, acked: 0 }
  const a1 = { kind: 'mark' as const, verb: 'accept' as const, index: 1, id: 1 }
  const a2 = { kind: 'mark' as const, verb: 'reject' as const, index: 2, id: 2 }
  const first = receive(held, { ...active, seq: 1 }, [a1])
  expect(first.apply).toEqual([a1])
  const second = receive(first.held, { ...active, seq: 2 }, [a1, a2])
  expect(second.apply).toEqual([a2])
  expect(second.held.acked).toBe(2)
})

test('a post from before the hooks let go still counts: it starts the review again', async () => {
  const held = { review: letGo({ ...active, seq: 5 }), acked: 0 }
  const { held: next } = receive(held, { ...active, seq: 6, epoch: 0 }, [])
  expect(next.review.isActive).toBe(true)
  expect(next.review.epoch).toBe(held.review.epoch)
  expect(next.review.seq).toBeGreaterThan(held.review.seq)
})

test('within an epoch, an older post does not replace a newer review', async () => {
  const held = { review: { ...active, seq: 9, selected: 4 }, acked: 0 }
  expect(receive(held, { ...active, seq: 3, selected: 1 }, []).held.review.selected).toBe(4)
})

test('letting go closes the comment from view and moves to a new epoch', async () => {
  const open = keys(active, ['c', 'h']).review
  const gone = letGo(open)
  expect([gone.isActive, gone.epoch, 'editing' in gone]).toEqual([false, open.epoch + 1, false])
})

test('a paste goes into an open comment at its cursor; nothing open, nothing taken', async () => {
  const open = keys(active, ['c', 'a', 'b', 'left']).review
  expect(paste(open, 'XY')?.editing).toEqual({ index: 2, text: 'aXYb', cursor: 3 })
  expect(paste(active, 'XY')).toBeUndefined()
  expect(paste(letGo(open), 'XY')).toBeUndefined()
})

test('a block draws its own newer review until the hooks echo it, or change epoch', async () => {
  const held = { ...active, seq: 2 }
  const mine = { ...active, seq: 3, selected: 4 }
  expect(current({ pending: mine, queued: [], nextId: 1 }, held).selected).toBe(4)
  expect(current({ pending: mine, queued: [], nextId: 1 }, { ...held, seq: 3 }).selected).toBe(2)
  expect(current({ pending: mine, queued: [], nextId: 1 }, { ...held, epoch: 1 }).selected).toBe(2)
})

test('a block posts every action not yet confirmed, numbered once', async () => {
  const one = queue(undefined, 0, { review: active, actions: [{ kind: 'mark', verb: 'accept', index: 1 }] })
  const two = queue(one.local, 0, { review: active, actions: [{ kind: 'mark', verb: 'reject', index: 2 }] })
  expect(two.post.actions.map(a => a.id)).toEqual([1, 2])
  const confirmed = queue(two.local, 1, { review: active, actions: [] })
  expect(confirmed.post.actions.map(a => a.id)).toEqual([2])
})

test('closed() leaves the key out instead of setting it undefined', async () => {
  expect(Object.keys(closed({ ...active, editing: { index: 1, text: '', cursor: 0 } }))).not.toContain('editing')
})

test('the menu, clicked: each item by its cells, 💬 taking two', async () => {
  const items = ['[ ✓ accept ]', '[ ✗ reject ]', '[ ✎ comment ]', '[ 💬 discuss ]']
  expect(cells('[ 💬 discuss ]')).toBe(14)
  expect(itemAt(0, items)).toBe(0)
  expect(itemAt(11, items)).toBe(0)
  expect(itemAt(12, items)).toBe(1)
  expect(itemAt(24, items)).toBe(2)
  expect(itemAt(37, items)).toBe(3)
  expect(itemAt(50, items)).toBe(3)
  expect(itemAt(51, items)).toBe(-1)
  expect(itemAt(-1, items)).toBe(-1)
})

test('↑/↓ in a comment of several lines move between its lines, keeping the column', async () => {
  const { review } = keys(active, ['c', 'a', 'b', 'c', '\\', 'return', 'd', 'up'])
  expect(review.editing).toEqual({ index: 2, text: 'abc\nd', cursor: 1 })
  // ↓ to the last line, then ↓ again: nothing — still open, unstaged.
  const down = keys(review, ['down', 'down'])
  expect(down.actions).toEqual([])
  expect(down.review.editing).toEqual({ index: 2, text: 'abc\nd', cursor: 5 })
})
test('lineMove: to the same column, or the end of a shorter line', async () => {
  expect(lineMove('abcd\nef', 3, 1)).toBe(7)
  expect(lineMove('abcd\nef', 6, -1)).toBe(1)
  expect(lineMove('abcd\nef', 2, -1)).toBeUndefined()
  expect(lineMove('abcd\nef', 6, 1)).toBeUndefined()
})
