// The review in fullscreen (D41): which block is selected, which action the
// menu's cursor is on, and the comment being typed in place. The reply's blocks
// each run a Client that turns keys and clicks into steps here; the hooks keep
// the review and apply the actions to the tray. Plain data in and out — what a
// Client posts and receives must be JSON, with no missing values.

export type Verb = 'accept' | 'reject' | 'comment' | 'discuss'

// The menu under the selected block, in order: ←/→ walk it.
export const MENU: readonly Verb[] = ['accept', 'reject', 'comment', 'discuss']

export type Editing = { index: number; text: string; cursor: number }

export type Review = {
  selected: number
  // The menu item the cursor is on, an index into MENU.
  verb: number
  // The comment being typed; absent (never undefined) when none is open.
  editing?: Editing
  // Whether the reply or the band has the keyboard, as far as the mod knows.
  isActive: boolean
  // Ordering: `seq` grows with every step; `epoch` grows when the hooks change
  // the review on their own (letting go, a paste), so a block drops what it
  // had not yet sent.
  seq: number
  epoch: number
}

// What a step does to the tray, applied once by the hooks.
export type Action =
  | { kind: 'mark'; verb: 'accept' | 'reject'; index: number }
  | { kind: 'discuss'; index: number }
  | { kind: 'comment'; index: number; text: string }
  | { kind: 'cancel'; index: number }
  // q: the review ends (Esc would, but a mod never sees it — #23).
  | { kind: 'end' }

export type Key = { key: string; ctrl?: boolean; shift?: boolean; meta?: boolean }

// What a step needs to know beyond the review: the blocks it may select, and
// the staged comments (to reopen one where it was left).
export type Scope = { first: number; last: number; comments: Readonly<Record<string, string>> }

export type Step = { review: Review; actions: Action[] }

export const START: Review = { selected: 0, verb: 0, isActive: false, seq: 0, epoch: 0 }

// Keys named rather than typed: never inserted into a comment.
const NAMED = new Set(['up', 'down', 'left', 'right', 'return', 'tab', 'backspace', 'delete', 'pageup', 'pagedown', 'home', 'end', 'escape', 'insert'])

// The review with no comment open — the key left out, not set to undefined.
export function closed(review: Review): Review {
  const { editing: _, ...rest } = review
  return rest
}

function step(review: Review, next: Review, actions: Action[] = []): Step {
  return { review: { ...next, isActive: true, seq: review.seq + 1, epoch: review.epoch }, actions }
}

// Leaving a comment stages it with whatever was typed: the hooks drop an empty
// one, as the tray does (finishComment).
function finish(review: Review): Step {
  if (!review.editing) return { review, actions: [] }
  const { index, text } = review.editing
  return { review: closed(review), actions: [{ kind: 'comment', index, text }] }
}

function select(review: Review, to: number, scope: Scope): Step {
  const done = finish(review)
  const selected = Math.max(scope.first, Math.min(scope.last, to))
  return step(review, { ...done.review, selected }, done.actions)
}

// The menu item `verb` applied to the selected block. Comment opens the field
// on it, with the comment staged there before.
export function apply(review: Review, verb: number, scope: Scope): Step {
  const at = closed(review)
  const index = review.selected
  const which = MENU[verb] ?? 'accept'
  if (which === 'comment') {
    const text = scope.comments[String(index)] ?? ''
    return step(review, { ...at, verb, editing: { index, text, cursor: text.length } })
  }
  if (which === 'discuss') return step(review, { ...at, verb }, [{ kind: 'discuss', index }])
  return step(review, { ...at, verb }, [{ kind: 'mark', verb: which, index }])
}

// A key while a comment is open: the field's own editing. ↑/↓ leave it,
// staging what was typed; Backspace on an empty field cancels it.
function edit(review: Review, e: Editing, key: Key, scope: Scope): Step | undefined {
  const { text, cursor } = e
  const put = (t: string, c: number) => step(review, { ...review, editing: { ...e, text: t, cursor: c } })
  const newline = (t: string, c: number) => put(t.slice(0, c) + '\n' + t.slice(c), c + 1)
  // A new line: Shift+Enter or Alt+Enter where the terminal tells them apart,
  // ctrl+j, or a backslash before Enter, as Claude Code's own prompt takes.
  if (key.key === 'return' && (key.shift || key.meta)) return newline(text, cursor)
  if (key.key === 'j' && key.ctrl) return newline(text, cursor)
  if (key.key === 'return' && text[cursor - 1] === '\\') return newline(text.slice(0, cursor - 1) + text.slice(cursor), cursor - 1)
  if (key.key === 'return') {
    const done = finish(review)
    return step(review, done.review, done.actions)
  }
  if (key.key === 'backspace') {
    if (text === '') return step(review, closed(review), [{ kind: 'cancel', index: e.index }])
    return put(text.slice(0, Math.max(0, cursor - 1)) + text.slice(cursor), Math.max(0, cursor - 1))
  }
  if (key.key === 'delete') return put(text.slice(0, cursor) + text.slice(cursor + 1), cursor)
  if (key.key === 'left') return put(text, Math.max(0, cursor - 1))
  if (key.key === 'right') return put(text, Math.min(text.length, cursor + 1))
  if (key.key === 'home') return put(text, 0)
  if (key.key === 'end') return put(text, text.length)
  if (key.key === 'up') return select(review, review.selected - 1, scope)
  if (key.key === 'down') return select(review, review.selected + 1, scope)
  const typed = key.key === 'space' ? ' ' : key.key
  if (key.ctrl || key.meta || typed === '' || NAMED.has(typed)) return undefined
  // A character, or a burst of them (a paste the terminal hands over as keys).
  return put(text.slice(0, cursor) + typed + text.slice(cursor), cursor + typed.length)
}

// One key pressed while the reply has the keyboard; undefined when the key does
// nothing here.
export function press(review: Review, key: Key, scope: Scope): Step | undefined {
  if (review.editing) return edit(review, review.editing, key, scope)
  switch (key.key) {
    case 'up':
      return select(review, review.selected - 1, scope)
    case 'down':
      return select(review, review.selected + 1, scope)
    case 'home':
    case 'pageup':
      return select(review, scope.first, scope)
    case 'end':
    case 'pagedown':
      return select(review, scope.last, scope)
    case 'left':
      return step(review, { ...review, verb: (review.verb + MENU.length - 1) % MENU.length })
    case 'right':
    case 'tab':
      return step(review, { ...review, verb: (review.verb + 1) % MENU.length })
    case 'return':
      return apply(review, review.verb, scope)
    case 'a':
      return apply(review, 0, scope)
    case 'x':
      return apply(review, 1, scope)
    case 'c':
      return apply(review, 2, scope)
    case 'd':
      return apply(review, 3, scope)
    case 'q':
      return step(review, review, [{ kind: 'end' }])
  }
  return undefined
}

// A click on block `index`: it is selected, and a comment open elsewhere is
// staged first.
export function click(review: Review, index: number, scope: Scope): Step {
  return select(review, index, scope)
}

// --- The hooks' side --------------------------------------------------------

// What the hooks hold: the review, and the id of the last action applied.
export type Held = { review: Review; acked: number }

// An action as a block sends it: numbered, so a post that repeats one (a later
// post replaces an undelivered one, so every post carries all unconfirmed
// actions) applies it only once.
export type Numbered = Action & { id: number }

// A block's post received: the actions not yet applied, in order, and the
// review to hold next. A post is always the person's own key or click, so it
// counts even from before the hooks let go (an older epoch): it starts the
// review again. Within an epoch, only a newer one replaces what is held.
export function receive(held: Held, review: Review | undefined, actions: readonly Numbered[]): { held: Held; apply: Numbered[] } {
  const apply = actions.filter(a => a.id > held.acked).sort((x, y) => x.id - y.id)
  const acked = apply.reduce((max, a) => Math.max(max, a.id), held.acked)
  if (!review) return { held: { ...held, acked }, apply }
  const isNewer = review.epoch !== held.review.epoch || review.seq > held.review.seq || !held.review.isActive
  if (!isNewer) return { held: { ...held, acked }, apply }
  const next = { ...review, isActive: true, epoch: held.review.epoch, seq: Math.max(review.seq, held.review.seq + 1) }
  return { held: { review: next, acked }, apply }
}

// The person typed in the prompt, or the band took the keyboard elsewhere: the
// reply lets go, and an open comment is dropped from view (its text was never
// staged, so nothing is lost from the tray).
export function letGo(review: Review): Review {
  return { ...closed(review), isActive: false, epoch: review.epoch + 1 }
}

// A paste while a comment is open: Claude Code hands every paste to the prompt
// box, so it goes into the comment at its cursor instead.
export function paste(review: Review, text: string): Review | undefined {
  const e = review.editing
  if (!review.isActive || !e || text === '') return undefined
  const editing = { ...e, text: e.text.slice(0, e.cursor) + text + e.text.slice(e.cursor), cursor: e.cursor + text.length }
  return { ...review, editing, epoch: review.epoch + 1 }
}

// --- A block's side ---------------------------------------------------------

// What a block keeps between its draws: its own newer review (until the hooks
// echo it), the actions not yet confirmed, and the next action id.
export type Local = { pending?: Review; queued: Numbered[]; nextId: number }

// The review a block draws: its own newer one, until the hooks catch up or
// change epoch.
export function current(local: Local | undefined, held: Review): Review {
  const p = local?.pending
  return p && p.epoch === held.epoch && p.seq > held.seq ? p : held
}

// A step taken on a block: what it keeps, and what it posts.
export function queue(local: Local | undefined, acked: number, s: Step): { local: Local; post: { review: Review; actions: Numbered[] } } {
  let nextId = Math.max(local?.nextId ?? 1, acked + 1)
  const queued = [...(local?.queued ?? []).filter(a => a.id > acked), ...s.actions.map(a => ({ ...a, id: nextId++ }))]
  return { local: { pending: s.review, queued, nextId }, post: { review: s.review, actions: queued } }
}

// --- The menu, clicked -------------------------------------------------------

// Cells a string takes in the terminal: one per character, two for an emoji
// (💬) and other wide pictographs.
export function cells(text: string): number {
  let n = 0
  for (const ch of text) n += (ch.codePointAt(0) ?? 0) >= 0x1f000 ? 2 : 1
  return n
}

// Which menu item a click `x` cells into the menu row lands on, given each
// item's drawn text in order; -1 between or past them.
export function itemAt(x: number, items: readonly string[]): number {
  let at = 0
  for (const [n, item] of items.entries()) {
    const width = cells(item)
    if (x >= at && x < at + width) return n
    at += width
  }
  return -1
}
