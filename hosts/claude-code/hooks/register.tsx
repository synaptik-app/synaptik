// Synaptik's hooks: the only file that touches `$` (CLAUDE.md). The logic is in
// src/; this draws it and wires it to Claude Code. What it draws (SPEC):
//   reply      the selected block on the selection background, its mark in
//              the margin, the actions under it (§6)
//   navigator  a pane: a map of the blocks docked in fullscreen, the selected
//              block itself in classic; ↑/↓ blocks, Tab or ←/→ actions (§10)
//   band       above the prompt: what is staged, and the keys (§7)
//   /synaptik  open the navigator; help, on/off, config, log (§10, D39)

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { Mark } from '../types'
import { lineKey, partCounts, partsOf, quote, segment } from '../src/blocks'
import { grows, lastTurn, lastTurnText } from '../src/turn'
import { compile as compileTray, GLYPH, PARTLY, preview, THREAD_GLYPH } from '../src/compile'
import { clear as clearMark, clearBlock, draftComment, dropComment, EMPTY, finishComment as finishTrayComment, lineMarks, newlyMarked, toggle as toggleMark } from '../src/tray'
import type { Part, Tray } from '../src/tray'
import { apply as applyMenu, closed, letGo, paste, press, receive, START } from '../src/review'
import type { Action, Held, Key, Numbered, Review } from '../src/review'
import { blockCounter } from '../src/counter'
import { classicRows, clip, drawnRows, minimap } from '../src/layout'
import { glyphCounts } from '../src/tally'
import { decorate } from '../src/decorate'
import { agentLine, CANCELLED_LINE, endedLine, isAutoMode, NOT_FORKED_LINE, NOT_NOW_LINE, notStartedLine, refusalWords, thinkingLine, toolStep } from '../src/waiting'
import type { AgentNow } from '../src/waiting'
import {
  AGENT_WORDS,
  agentPrompt,
  anchorOf,
  clearedThreads,
  hasThread,
  markFirst,
  needsSummary,
  NEW_THREAD,
  noticeAbout,
  parseAnswer,
  reportPrompt,
  reportState,
  reportStatus,
  rewordedNotice,
  summaries,
  summaryPrompt,
  threadPrompt,
  answerBeforeQueued,
  queuedOf,
  sendQueued,
  typedInView,
  unforked,
  withoutQueued,
  withAnswer,
  withoutReport,
} from '../src/threads'
import type { AgentState, Anchor, Thread } from '../src/threads'
import {
  BAND_COMMENT_PREFIX,
  BULLET,
  COMMENT_HINT,
  COMMENT_PREFIX,
  commentKey,
  MARGIN,
  MAX_DRAWN,
  baseKey,
  END_REVIEW,
  STEP_INTO,
  generational,
  NEXT_BLOCK,
  PANE,
  PANE_ANCHOR,
  PANE_COLUMNS,
  PREVIOUS_BLOCK,
  VERBS,
} from './ui'
import { ClassicView, EmptyView } from './views/navigator'
import type { NavigatorActions } from './views/navigator'
import { ReplyView } from './views/reply'
import { BandKeysView, BandView } from './views/band'
import { threadAgentSkipKey, threadAgentStartKey, threadFieldKey, threadStopKey, threadSwitchKey, ThreadView } from './views/thread'

const isOn = atom({ plugin: 'synaptik', key: 'isOn' } as const, true)
const isWorking = atom({ plugin: 'synaptik', key: 'isWorking' } as const, false)
const lastText = atom({ plugin: 'synaptik', key: 'lastText' } as const, '')
const selected = atom({ plugin: 'synaptik', key: 'selected' } as const, 0)
const marks = atom({ plugin: 'synaptik', key: 'marks' } as const, {})
const comments = atom({ plugin: 'synaptik', key: 'comments' } as const, {})
const isCommenting = atom({ plugin: 'synaptik', key: 'isCommenting' } as const, false)
const focusedVerb = atom({ plugin: 'synaptik', key: 'focusedVerb' } as const, '')
const isPaneShown = atom({ plugin: 'synaptik', key: 'isPaneShown' } as const, false)
// What the comment field is drawn with when it opens. The field is never redrawn
// from the live comment: a redraw replaces what the person typed (InputProps).
const commentSeed = atom({ plugin: 'synaptik', key: 'commentSeed' } as const, '')
const commentSeq = atom({ plugin: 'synaptik', key: 'commentSeq' } as const, 0)
// Threads by block index (src/threads.ts), discarded with the tray.
const threads = atom({ plugin: 'synaptik', key: 'threads' } as const, {} as Record<string, Thread>)

// Synaptik draws only in the terminal renderer (D40): every render hook passes
// any other surface (the Desktop app, the mobile app, VS Code) to next(e).

// What happened, for `/synaptik log` and bug reports: events and failures —
// adopting, suggesting, scrolling and focus moves, comments —
// not every redraw or keystroke, which would push them out of its 60 lines.
// Module variable, not $.state: a render hook may not write state. Lost on reload.
const observed: string[] = []
function observe(line: string) {
  observed.push(line)
  observed.splice(0, Math.max(0, observed.length - 60))
}

// The transcript row of the reply being marked, for revealing it when a block
// key cannot be scrolled to. Set while drawing; lost on reload.
let replyRequestId = ''

// The turn-duration row Claude Code draws after a turn (`✻ Cogitated for 19s`),
// the newest one seen. Scrolling it to the window's bottom brings the end of the
// reply above it into view — the reply itself, taller than the window, can only
// be scrolled to its top. Lost on reload.
let turnRowId = ''
const turnRowsSeen = new Set<string>()

// Whether the navigator holds the keyboard. Esc raises no ui.focus event, so
// the only reliable source is the navigator's own drawing (Pane isFocused);
// a drawing may not write state, so it lands here and asks for a redraw.
let isNavigatorFocused = false

// The classic navigator (#31): the terminal's size, as last seen by a drawing;
// how far the selected block is scrolled inside it (PgUp/PgDn); and how many
// rows its text area had at the last draw.
let screen = { columns: 120, rows: 40 }
let blockOffset = 0
let blockTextRows = 1

// Whether the compiled prompt is the prompt box's dim suggestion right now
// (Tab takes it). Set from prompt.suggest's answer; the band words itself by it.
let isSuggested = false

// The shortened suggestion last proposed, if it differs from the full text:
// taking it brings the full text instead (prompt.change).
let shortProposed: string | undefined

// Fullscreen reviews in the reply itself (D41): each block a Client
// (client/block.tsx), no navigator pane. Learned from the first drawing's
// viewport, since a session starts before anything is drawn.
let isFullscreen = false
// The review the blocks share, and the last action applied (src/review.ts).
let held: Held = { review: START, acked: 0 }
// Who has the keyboard in fullscreen, as far as the hooks can tell: the reply (a
// block posted), the band (its ring moved onto Synaptik's controls), the band's
// hint (clicked, it takes the raw keys), or neither (the person typed in the
// prompt). Esc raises nothing, so it is never seen.
let holder: 'reply' | 'band' | 'hint' | undefined
// Each adopted reply gets fresh Client instances, so nothing a block kept carries
// over to the next reply's block in the same place.
let replyGeneration = 0
// A Client that failed (ui.fault): the band's hint, or a block. Left out until
// the next reply, so the band and the reply fall back to plain drawing (#189).
let isHintFaulted = false
let isBlockFaulted = false
// The band's request id (for focus moves into it) and its comment field's key.
let bandRequestId = ''
// The most rows classic's comment field grows to (#16); past it, it scrolls.
const FIELD_MAX_ROWS = 3

// The band's controls' generation: each end of a review draws them anew, which
// hands the keyboard back to the prompt (ui.ts, generational).
let bandGeneration = 0
// The same for classic's pane: q redraws its actions (views/navigator.tsx).
let paneGeneration = 0
let bandCommentSeq = 0
// Whether the navigator pane has been closed for fullscreen: closed once, from
// a drawing, where its close hook may not write $.state.
let isPaneClosedForFullscreen = false
// The band's focus leaving Synaptik's controls ends a review after this long,
// unless a block took the keyboard meanwhile; each leave is counted, so a later
// one supersedes an earlier wait.
const REVIEW_GRACE_MS = 300
// A review ended from the band leaves its ring on Synaptik's controls, whatever
// their keys: Claude Code keeps a ring in its place (#203). So the band draws
// none of them for this long, and the ring, with nothing of ours to stay on,
// goes back to the prompt.
const LET_GO_MS = 300
let isBandLettingGo = false
// How long the band's hint shows each of its lines.
const HINT_EVERY_MS = 3000
// Claude Code's key for the band and panes, named in the band.
const ENTRY_CHORD = 'ctrl+x tab'
let bandLeaves = 0
const PLACEHOLDER = 'Give me a sec to read through this.'

// `/synaptik help` (D39). Claude Code leads a command's output with its name
// (`synaptik:`), so no line here repeats it.
const HELP = [
  "turns the agent's reply into something you mark up in place — accept, reject,",
  'comment — and sends your marks back as one prompt.',
  '',
  '  /synaptik          open the navigator',
  '  /synaptik on       turn Synaptik on for this session',
  '  /synaptik off      turn it off for this session (/plugin disables it for good)',
  '  /synaptik log      what Synaptik observed, for bug reports',
  '  /synaptik help     this list',
].join('\n')

// The band's ring moving onto `element` of `plugin`'s (absent: off the band's
// elements). Another mod's element counts as leaving Synaptik's controls.
// Returns why the move is refused, if it is.
function bandFocus($: EngineInterface, plugin: string | undefined, element: string | undefined, by: string): string | undefined {
  const isOurs = plugin === undefined || plugin === 'synaptik'
  const key = isOurs ? baseKey(element ?? '') : ''
  observe(`band focus → ${isOurs ? key || '(off)' : `${plugin} ${element ?? ''}`} by ${by}`)
  if (key === NEXT_BLOCK || key === PREVIOUS_BLOCK || key === STEP_INTO || key === END_REVIEW) return 'synaptik: not a stop'
  const verb = VERBS.findIndex(v => v.key === key)
  if (verb >= 0 || key.startsWith(BAND_COMMENT_PREFIX)) {
    const isEntering = !holder
    holder = 'band'
    const r = held.review
    held = { ...held, review: { ...r, isActive: true, ...(verb >= 0 ? { verb } : {}), seq: r.seq + 1 } }
    if (isEntering) void suggestTray($)
  } else if (holder === 'reply') {
    // The ring moved within the band while the reply had the keys.
    releaseReview($)
  } else if (holder === 'band') {
    const asOf = bandLeaves += 1
    void $.clock.sleep(REVIEW_GRACE_MS).then(() => {
      if (holder === 'band' && bandLeaves === asOf) releaseReview($)
    })
  }
  $.ui.invalidate('ui.render')
  return undefined
}

// The compiled prompt is proposed in the empty prompt box after every change,
// as Claude Code proposes its own: → or Tab takes it, the box is where it is
// edited and sent, ctrl+c clears it (SPEC §7, *Sending*).
async function suggestTray($: EngineInterface) {
  // Off, Synaptik proposes nothing, not even a thread's late summary.
  if (!(await read($, isOn))) return
  try {
    const text = await compile($)
    if (!text) {
      // Nothing staged. There is no call to withdraw a suggestion, a blank one
      // cannot show, and emptying the box does not dismiss it — so replace ours
      // with something harmless to send, which guesses nothing about intent.
      if (isSuggested) {
        const shown = await $.prompt.suggest({ text: PLACEHOLDER })
        observe(`suggest placeholder: ${JSON.stringify(shown)}`)
      }
      isSuggested = false
      shortProposed = undefined
      $.ui.invalidate('ui.render')
      return
    }
    // Proposed as compiled. The box draws its cursor over the first cell, so the
    // first glyph hides under it until taken — a leading space to avoid that
    // looked worse (D30, revised 2026-10-28).
    // A few lines, so the box doesn't grow with every mark; taken, it is the
    // whole review (prompt.change). In a review or out of one: a suggestion shows
    // only while the box is empty, so the short one is never seen beside a draft.
    const proposed = preview(text)
    const shown = await $.prompt.suggest({ text: proposed })
    isSuggested = shown.isShown
    if (shown.isShown) shortProposed = proposed === text ? undefined : proposed
    observe(`suggest ${proposed.split('\n').length} of ${text.split('\n').length} lines: ${JSON.stringify(shown)}`)
    $.ui.invalidate('ui.render')
  } catch (err) {
    observe(`suggest failed: ${String(err)}`)
  }
}


// Set by session.start in a non-interactive session (claude -p, the SDK).
let isHeadless = false

// How many of the newest rows to read for the last turn, in turn: most turns
// fit the first; a long run of tool calls needs more. 4096 is what a read
// naming no number gets.
const TURN_READS = [64, 512, 4096]

// The last turn's text, from as few of the newest rows as hold it whole.
async function readLastTurn($: EngineInterface): Promise<{ text: string; rows: number }> {
  for (const last of TURN_READS) {
    const read = await $.session.messages({ last })
    // A ranged read can be refused (SessionMessagesDeny): the plain read then.
    const rows = Array.isArray(read) ? read : await $.session.messages()
    const turn = lastTurn(rows)
    if (turn.isBounded || rows.length < last || last === TURN_READS[TURN_READS.length - 1]) {
      return { text: turn.text, rows: rows.length }
    }
  }
  return { text: '', rows: 0 }
}

// Reads the last assistant reply from the transcript. A different reply than
// the one marked so far starts a fresh tray; the same one (a reload) keeps it.
async function adoptLastReply($: EngineInterface) {
  // `claude -p` and the SDK have no one to review: nothing is adopted, so the
  // hooks find no reply and fall through as with Synaptik off.
  if (isHeadless) return
  // The whole last turn, not its last message: text before a tool call is a
  // separate message and was left unmarkable.
  const { text, rows } = await readLastTurn($)
  observe(`adopt ${rows} messages, picked ${text.length} chars`)
  const before = await read($, lastText)
  // Blocks added at the end, as a background agent's follow-up adds them: the
  // review stays, marks and all, and the new blocks join it (#213).
  if (text !== before && grows(before, text)) {
    observe(`adopt: the reply grew, the review is kept`)
    await update($, lastText, () => text)
    // Proposed again: the turn may have staged an open comment, and its start
    // forgot the suggestion that was showing.
    await suggestTray($)
  } else if (text !== before) {
    await update($, lastText, () => text)
    // Start on the last block: a long reply leaves the terminal at its end, so
    // that is the block already on screen. Review runs upwards from there.
    const count = segment(text).filter(s => s.isBlock).length
    await update($, selected, () => Math.max(0, count - 1))
    await writeTray($, () => EMPTY)
    for (const key of Object.keys(await read($, threads))) void $.ui.close({ id: threadPane(key) }).catch(() => undefined)
    await update($, threads, () => ({}))
    threadFocus.clear()
    await update($, isCommenting, () => false)
    held = { review: { ...START, selected: Math.max(0, count - 1), epoch: held.review.epoch + 1 }, acked: held.acked }
    holder = undefined
    replyGeneration += 1
    isHintFaulted = false
    isBlockFaulted = false
  }
  if (text) await openPane($)
}

// `/resume` and `/clear` end the conversation, and the process goes on under
// another session id with no session.start for it (SessionEndInput). So once the
// id has changed, the new transcript's reply is adopted, or a cleared one's none.
const READOPT_EVERY_MS = 250
const READOPT_TRIES = 20
async function readoptAfter($: EngineInterface, ended: string) {
  for (let n = 0; n < READOPT_TRIES; n += 1) {
    try {
      await $.clock.sleep(READOPT_EVERY_MS)
      if ((await $.session.id()) === ended) continue
      await adoptLastReply($)
      observe(`readopt after the session ended: ${(await read($, lastText)).length} chars`)
      // The box may still offer the review of the reply that is gone: offer the
      // new tray's instead (nothing staged: the placeholder).
      if (isSuggested) await suggestTray($)
      $.ui.invalidate('ui.render')
      return
    } catch (err) {
      observe(`readopt: ${String(err)}`)
      return
    }
  }
  observe('readopt: the session id never changed')
}

// Opened unasked (a new reply, a reload) the pane waits undrawn below 144
// columns; opened from the person's press it is placed at any width. When it
// waits or is closed, the band offers that press.
async function openPane($: EngineInterface, focus = false) {
  // Fullscreen has no navigator (D41).
  if (isFullscreen) return
  isPaneClosedForFullscreen = false
  const rows = classicRows(await read($, lastText), screen)
  const opened = await $.ui.open({
    id: PANE,
    title: 'Synaptik',
    columns: PANE_COLUMNS,
    rows,
    ...(focus ? { focus: true as const } : {}),
  })
  await update($, isPaneShown, () => opened.isPlaced)
  // Pinning can fail (the pane not drawn yet); it must not abort the caller —
  // session.start adopts the reply around this call.
  const pinned = await $.ui
    .scroll({ in: PANE, to: { key: PANE_ANCHOR }, block: 'start' })
    .catch((err: unknown) => ({ deny: String(err) }))
  observe(
    `pane open ${JSON.stringify(opened)} · asked rows=${rows} (screen ${screen.columns}×${screen.rows}) · pin ${JSON.stringify(pinned)}`,
  )
}

// Moves the selection and brings the block into view in the transcript. The
// transcript only scrolls while answering the person's own input.
async function moveSelection($: EngineInterface, by: number) {
  // While a turn runs the reply on screen is not the one adopted (SPEC §2).
  if (await read($, isWorking)) return
  await finishComment($)
  const count = segment(await read($, lastText)).filter(s => s.isBlock).length
  const before = await read($, selected)
  blockOffset = 0
  await update($, selected, s => Math.max(0, Math.min(count - 1, s + by)))
  await reveal($, before, await read($, selected), count)
}

// The tray (src/tray.ts) as $.state holds it: two atoms, marks and comments.
async function readTray($: EngineInterface): Promise<Tray> {
  return { marks: await read($, marks), comments: (await read($, comments)) as Record<number, string> }
}

async function writeTray($: EngineInterface, change: (tray: Tray) => Tray) {
  const before = await readTray($)
  const changed = change(before)
  await update($, marks, () => ({ ...changed.marks }))
  await update($, comments, () => ({ ...changed.comments }))
  // A part just marked takes its thread out of the review: the last thing the
  // person did on it wins (#238). The thread is kept, and d reopens it.
  const all = await read($, threads)
  for (const key of newlyMarked(before.marks, changed.marks)) {
    if (all[key]?.included) await changeThread($, key, t => ({ ...t, included: false, isIncludeSet: true }))
  }
}

async function toggle($: EngineInterface, i: Part, mark: Mark) {
  await writeTray($, tray => toggleMark(tray, i, mark))
  await suggestTray($)
}

async function runVerb($: EngineInterface, verb: string) {
  if (await read($, isWorking)) return
  const i = await read($, selected)
  if (verb === 'verb-accept') return toggle($, i, 'accept')
  if (verb === 'verb-reject') return toggle($, i, 'reject')
  if (verb === 'verb-discuss') return $.ui.toast('discuss: phase 2')
  const existing = (await read($, comments))[i] ?? ''
  await update($, commentSeed, () => existing)
  await update($, commentSeq, n => n + 1)
  await update($, isCommenting, () => true)
  // A focus move that fails costs only the focus, never the comment around it.
  const moved = await $.ui
    .focus({ requestId: PANE, key: commentKey(await read($, commentSeq)) })
    .catch((err: unknown) => ({ deny: String(err) }))
  observe(`focus comment-input: ${JSON.stringify(moved)}`)
}

// Drops the block's comment and its mark and returns to the menu.
async function cancelComment($: EngineInterface, i: number, refocus = true) {
  await writeTray($, tray => dropComment(tray, i))
  if (refocus) return leaveComment($)
  await update($, isCommenting, () => false)
  await suggestTray($)
}

// Hands focus from the comment field back to ✎ in the menu before the field
// goes, so the ring keeps a stop and ←→ keep working.
async function leaveComment($: EngineInterface) {
  const moved = await $.ui
    .focus({ requestId: PANE, key: 'verb-comment' })
    .catch((err: unknown) => ({ deny: String(err) }))
  observe(`leave comment → verb-comment: ${JSON.stringify(moved)}`)
  await finishComment($)
}

// Leaving an open comment line finishes it: empty, it is dropped; with text,
// it is staged as if ⏎ had been pressed.
async function finishComment($: EngineInterface) {
  if (!(await read($, isCommenting))) return
  const i = await read($, selected)
  const text = (await read($, comments))[i] ?? ''
  observe(`finish comment on ${i}: ${JSON.stringify(text)}`)
  await writeTray($, tray => finishTrayComment(tray, i))
  await update($, isCommenting, () => false)
  await suggestTray($)
}

// A main-loop turn draws the reply and the band as Claude Code's own while it
// runs: the review's elements go, and the keyboard with them. So the review ends
// when the turn starts, as typing in the prompt ends it. An open comment is kept
// as a draft, neither staged nor dropped: the turn may be a background agent's,
// not the person's doing, and they never pressed ⏎. `c` on its block reopens
// the text (#213). Nothing is proposed: the turn's start forgets the suggestion
// that is showing, and the adoption after the turn proposes the review again.
async function letGoForTurn($: EngineInterface) {
  const open = held.review.editing
  if (open) await writeTray($, tray => draftComment(tray, open.index, open.text))
  // A field in the band or the pane drafts its text as it is typed.
  await update($, isCommenting, () => false)
  releaseReview($)
}

// The compiled prompt: src/compile.ts, over the adopted reply's blocks.
async function compile($: EngineInterface): Promise<string> {
  const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
  const tray = await readTray($)
  return compileTray(blocks, tray.marks, tray.comments, summaries(await read($, threads)))
}

// Brings the selected block into view, as far as the transcript allows.
async function reveal($: EngineInterface, before: number, now: number, count: number) {
  // The transcript can be scrolled to a whole row only, never to a block in a
  // reply, and a reply taller than the window always lands on its top. So:
  // entering the first third of the blocks brings the reply's top into view;
  // entering the last third brings the row after it (the turn's duration) to the
  // window's bottom, which shows the reply's end. The middle is the person's to
  // scroll (the wheel, PgUp/PgDn).
  const topThird = Math.ceil(count / 3)
  const bottomThird = count - Math.ceil(count / 3)
  // Best effort: a scroll that fails costs only the view, never the move.
  const failed = (err: unknown) => ({ deny: String(err) })
  if (replyRequestId && now < topThird && before >= topThird) {
    const shown = await $.ui.scroll({ to: { requestId: replyRequestId }, block: 'start' }).catch(failed)
    observe(`reveal reply top: ${JSON.stringify(shown)}`)
  }
  if (now >= bottomThird && before < bottomThird) {
    if (!turnRowId) return observe('reveal reply end: no turn row seen')
    const shown = await $.ui.scroll({ to: { requestId: turnRowId }, block: 'end' }).catch(failed)
    observe(`reveal reply end via ${turnRowId.slice(0, 12)}: ${JSON.stringify(shown)}`)
  }
}

// --- Fullscreen: the review in the reply (D41) -----------------------------

// Closes the navigator pane once, from a drawing: fullscreen has none. Not
// awaited — a drawing cannot wait on a close.
function closePaneForFullscreen($: EngineInterface) {
  if (isPaneClosedForFullscreen) return
  isPaneClosedForFullscreen = true
  void $.ui.close({ id: PANE }).catch(() => undefined)
}

// The review as the blocks draw it: plain data, with the selection the hooks
// hold, active only while the reply or the band has the keyboard.
async function shownReview($: EngineInterface): Promise<Review> {
  return { ...held.review, selected: await read($, selected), isActive: held.review.isActive && holder !== undefined }
}

async function blockCount($: EngineInterface): Promise<number> {
  return segment(await read($, lastText)).filter(s => s.isBlock).length
}

// One action from the review, applied to the tray.
async function applyAction($: EngineInterface, a: Action) {
  if (a.kind === 'end') return releaseReview($)
  if (a.kind === 'mark') return toggle($, a.index, a.verb)
  if (a.kind === 'discuss') return openThread($, a.index)
  if (a.kind === 'comment') {
    const { index, text } = a
    await writeTray($, tray => finishTrayComment(draftComment(tray, index, text), index))
  } else if (a.kind === 'unmark') {
    const { index } = a
    const all = await read($, threads)
    const cleared = clearedThreads(all, (await read($, marks))[index] !== undefined, index)
    const hasOwnThread = cleared.includes(String(index))
    await writeTray($, tray => (typeof index === 'number' ? clearBlock(tray, index, hasOwnThread) : clearMark(tray, index)))
    // The threads stay, out of the review (SPEC §5: clearing never destroys).
    if (cleared.length > 0) {
      await update($, threads, now => ({ ...now, ...Object.fromEntries(cleared.map(key => [key, { ...now[key]!, included: false, isIncludeSet: true }])) }))
    }
  } else {
    const { index } = a
    await writeTray($, tray => dropComment(tray, index))
  }
  await suggestTray($)
}

// The person typed in the prompt: the reply lets go of its selection and menu.
function releaseReview($: EngineInterface) {
  if (!holder) return
  if (holder === 'band') {
    isBandLettingGo = true
    // A sleep that fails ends the pause at once: the controls are back, as before #203.
    void $.clock.sleep(LET_GO_MS).catch(() => undefined).then(() => {
      isBandLettingGo = false
      $.ui.invalidate('ui.render')
    })
  }
  holder = undefined
  bandGeneration += 1
  held = { ...held, review: letGo(held.review) }
  $.ui.invalidate('ui.render')
}

// The keyboard path through the band: j / k between blocks, or between lines
// inside a code block.
async function bandMove($: EngineInterface, by: 1 | -1 | 0) {
  if (by !== 0 && held.review.line !== undefined) return steer($, { key: by > 0 ? 'down' : 'up' }, 'band')
  const count = await blockCount($)
  const before = await read($, selected)
  await update($, selected, s => Math.max(0, Math.min(count - 1, s + by)))
  await reveal($, before, await read($, selected), count)
  holder = 'band'
  const review = closed(held.review)
  held = { ...held, review: { ...review, selected: await read($, selected), isActive: true, seq: review.seq + 1 } }
  $.ui.invalidate('ui.render')
}

// A key from the band's hint: a Client the person clicked,
// which gets the raw keys. They go through the same steps as a clicked block's
// (src/review.ts): ↑/↓ between blocks, ←/→ and ⏎ through the actions,
// a / x / c / d, q, and a comment typed in place under its block.
async function steer($: EngineInterface, key: Key, by: 'hint' | 'band' = 'hint') {
  const count = await blockCount($)
  const scope = { first: 0, last: count - 1, comments: (await read($, comments)) as Record<string, string>, partCounts: partCounts(await read($, lastText)) }
  const before = await read($, selected)
  const s = press({ ...held.review, selected: before, isActive: true }, key, scope)
  if (!s) return
  holder = by
  held = { ...held, review: s.review }
  await update($, selected, () => s.review.selected)
  for (const a of s.actions) await applyAction($, a)
  await reveal($, before, s.review.selected, count)
  $.ui.invalidate('ui.render')
}

// An action from the band: a / x / c / d, or ⏎ on the action under its cursor.
// A comment opens a field in the band.
async function bandVerb($: EngineInterface, n: number) {
  const scope = { first: 0, last: (await blockCount($)) - 1, comments: (await read($, comments)) as Record<string, string> }
  const s = applyMenu({ ...held.review, selected: await read($, selected) }, n, scope)
  holder = 'band'
  // A comment opened from the band is typed in its field, which draws its own
  // cursor: none in place.
  const editing = s.review.editing ? { editing: { ...s.review.editing, cursor: -1 } } : {}
  held = { ...held, review: { ...s.review, ...editing } }
  for (const a of s.actions) await applyAction($, a)
  $.ui.invalidate('ui.render')
  if (!s.review.editing) return
  bandCommentSeq += 1
  const moved = await $.ui
    .focus({ requestId: bandRequestId, key: `${BAND_COMMENT_PREFIX}${bandCommentSeq}` })
    .catch((err: unknown) => ({ deny: String(err) }))
  observe(`band comment field: ${JSON.stringify(moved)}`)
}

async function bandComment($: EngineInterface, text: string, isDone: boolean) {
  const open = held.review.editing
  if (!open) return
  if (!isDone) {
    // Typed in the band's field, which shows its own cursor: none in place.
    held = { ...held, review: { ...held.review, editing: { ...open, text, cursor: -1 } } }
    return $.ui.invalidate('ui.render')
  }
  held = { ...held, review: { ...closed(held.review), seq: held.review.seq + 1 } }
  await applyAction($, { kind: 'comment', index: open.index, text })
  await $.ui.focus({ requestId: bandRequestId, key: generational(VERBS[2]!.key, bandGeneration) }).catch(() => undefined)
  $.ui.invalidate('ui.render')
}

// --- Threads (SPEC §8, D45): one pane per block, each message a fork.

const THREAD_PREFIX = 'synaptik-thread-'
// A pane id takes no dot, so a line's key ("3.5") is spelled with _ in it.
const threadPane = (key: string) => `${THREAD_PREFIX}${key.replace('.', '_')}`
const threadKeyOf = (id: string) => id.slice(THREAD_PREFIX.length).replace('_', '.')
// Which element of each thread's pane holds the keyboard, as its focus moves say.
const threadFocus = new Map<string, string | undefined>()
// The thread panes open now: an answer landing in a closed one writes its summary.
const openThreads = new Set<string>()
// Threads whose summary is being written, which the band names.
const summarizing = new Set<string>()

// Synaptik's own agents (D51), by id: the thread that started each, and its
// words in the agent list. Kept past a new reply, which discards the thread
// but not the agent: its notices stay out of the main conversation all the
// same. A reload keeps the threads, so their agents are claimed again from them.
const ownAgents = new Map<string, { key: string; reply: string; label: string }>()
// Threads whose agent is being started: a second answer asking for one, while
// the summary is written or spawn runs, starts no second agent.
const startingAgents = new Set<string>()
// The agent whose transcript is on screen, as the band last said; none for
// the main conversation's.
let viewedAgent: string | undefined

// A block's margin glyph for its thread: ❝ while it is in the review, an agent
// or not (D51). An excluded thread shows nothing, as a cleared comment shows no
// ✎; d still reopens it (#238).
function threadGlyph(all: Readonly<Record<string, Thread>>, key: number | string): string | undefined {
  return hasThread(all, key) && all[String(key)]?.included ? THREAD_GLYPH : undefined
}

// The margin of a block's lines: a line's mark, or ❝ where it has a thread.
function lineGlyphs(marked: Readonly<Record<string, Mark>>, all: Readonly<Record<string, Thread>>, block: number): Record<string, string> {
  const glyphs: Record<string, string> = {}
  for (const line of Object.keys(lineMarks(all, block))) {
    const glyph = threadGlyph(all, lineKey(block, Number(line)))
    if (glyph) glyphs[line] = glyph
  }
  for (const [line, mark] of Object.entries(lineMarks(marked, block))) glyphs[line] = GLYPH[mark]
  return glyphs
}

// What a thread is about: its block, or a code line or table row in it.
async function threadAnchor($: EngineInterface, key: string): Promise<Anchor | undefined> {
  const block = segment(await read($, lastText)).filter(s => s.isBlock)[Number(key.split('.')[0])]?.text
  return block === undefined ? undefined : anchorOf(block, key)
}

async function changeThread($: EngineInterface, key: string, change: (t: Thread) => Thread) {
  const isMarked = (await read($, marks))[key] !== undefined
  await update($, threads, all => ({ ...all, [key]: markFirst(change(all[key] ?? NEW_THREAD), isMarked) }))
  const t = (await read($, threads))[key]
  if (t && t.pending > 0) {
    if (!pendingSince.has(key)) pendingSince.set(key, Date.now())
  } else pendingSince.delete(key)
  if (t && (t.pending > 0 || t.agent?.state === 'working')) startWaiting($)
  $.ui.invalidate('ui.render')
  void toThreadEnd($, key)
}

// --- The pane's waiting line (#234): a spinner while a thread waits for its
// answer, or while its agent works, with what the agent is doing.

// When each thread's answer was asked for, by thread.
const pendingSince = new Map<string, number>()
// Each working agent as Claude Code's agent list last had it: what it is doing,
// since when, its tokens.
const agentsNow = new Map<string, AgentNow>()
// When each agent's current run began: its spawn, or its resume. Claude Code's
// `startTime` is when the agent first started, which a resumed run isn't.
const runSince = new Map<string, number>()
let waitingTimer: { cancel: () => void } | undefined
// An answer still pending after this long stops keeping the timer going: one
// that never resolves would otherwise redraw everything for the session (D33).
const WAITING_GIVES_UP_MS = 10 * 60_000
let agentsReadAt = 0
const WAITING_TICK_MS = 200
const AGENTS_READ_MS = 1000

// One timer for every pane: it redraws while anything waits, and stops when
// nothing does, so an idle session redraws nothing.
function startWaiting($: EngineInterface) {
  if (waitingTimer) return
  try {
    waitingTimer = $.clock.every(WAITING_TICK_MS, () => void tickWaiting($).catch(err => observe(`waiting tick failed: ${String(err)}`)))
  } catch (err) {
    observe(`waiting timer not started: ${String(err)}`)
  }
}

// An agent's latest tool call, from the newest rows of its transcript.
async function latestStep($: EngineInterface, id: string): Promise<string | undefined> {
  const rows = await $.session.messages({ agentId: id, last: 8 }).catch(() => undefined)
  if (!Array.isArray(rows)) return undefined
  const call = rows.flatMap(r => r.toolUses).at(-1)
  return call ? toolStep(call.tool, call.input) : undefined
}

async function tickWaiting($: EngineInterface) {
  const entries = Object.entries(await read($, threads))
  const now = Date.now()
  const working = entries.filter(([, t]) => t.agent?.state === 'working')
  // The agents Claude Code lists as running, read again about once a second:
  // one that stopped, or is gone, drops out with its old step.
  if (working.length > 0 && now - agentsReadAt >= AGENTS_READ_MS) {
    agentsReadAt = now
    const running = (await $.agent.list()).filter(a => ownAgents.has(a.id) && a.taskStatus === 'running')
    agentsNow.clear()
    for (const a of running) {
      agentsNow.set(a.id, { label: a.label, description: a.description, startTime: runSince.get(a.id) ?? a.startTime, tokenCount: a.tokenCount, step: await latestStep($, a.id) })
    }
  }
  // Only a real wait keeps the timer: an answer pending for less than its
  // limit, or an agent Claude Code lists as running.
  const isWaiting =
    entries.some(([key, t]) => t.pending > 0 && now - (pendingSince.get(key) ?? now) < WAITING_GIVES_UP_MS) ||
    working.some(([, t]) => agentsNow.has(t.agent!.id) || now - (runSince.get(t.agent!.id) ?? 0) < AGENTS_READ_MS * 2)
  if (!isWaiting) {
    waitingTimer?.cancel()
    waitingTimer = undefined
    return
  }
  $.ui.invalidate('ui.render')
}

// The pane's window to its end: a pane keeps its offset as the thread grows, so
// the newest answer and the field would fall below it. Scrolled once the change
// is drawn: right after it, the window still measures the old tree.
const THREAD_REDRAW_MS = 80
// The person's answer to "Start an agent on these tasks?": start it, or not now,
// which the thread keeps as a line; nothing more happens until they write.
async function answerAgentAsk($: EngineInterface, key: string, isStart: boolean) {
  const t = (await read($, threads))[key]
  if (!t?.isAgentAsked) return
  observe(`thread ${key} agent asked: ${isStart ? 'start' : 'not now'}`)
  await changeThread($, key, now => ({
    ...now,
    isAgentAsked: false,
    messages: isStart ? now.messages : [...now.messages, { role: 'status', text: NOT_NOW_LINE }],
  }))
  if (isStart) await startAgent($, key)
  void focusField($, key)
}

// --- Cancelling a thread's answer (#240). A fork can't be stopped, so the
// answers asked for before a cancel are thrown away when they land; the request
// still runs, and is billed.

// How many times each thread's answers were cancelled: an answer asked for
// before the latest is thrown away.
const cancels = new Map<string, number>()

const isCancelled = (key: string, asked: number) => (cancels.get(key) ?? 0) !== asked

// ◼ cancel: the pending answers are cancelled, the thread says so, and the
// person's last question is back in the field to edit.
async function cancelAnswers($: EngineInterface, key: string) {
  const t = (await read($, threads))[key]
  if (!t || t.pending === 0) return
  cancels.set(key, (cancels.get(key) ?? 0) + 1)
  asking.delete(key)
  observe(`thread ${key}: ${t.pending} answer(s) cancelled`)
  // The queued messages come back, a line each, out of the queue; with none,
  // the last question. Nothing when the answer cancelled was to an agent's
  // report.
  // What the field holds already stays: a click on ◼ cancel can bring the queue
  // back into it first (the ui.focus hook).
  // The queued lines come first, then what was being typed, a line each: nothing
  // the person wrote is lost.
  const held = fieldText.get(key)
  const queued = queuedOf(t)
  const last = withoutQueued(t).messages.at(-1)
  const draft = queued.length > 0 ? [...queued, ...(held ? [held] : [])].join('\n') : held || (last?.role === 'person' ? last.text : undefined)
  if (draft) fieldText.set(key, draft)
  await changeThread($, key, now => ({
    ...withoutQueued(now),
    pending: 0,
    messages: [...withoutQueued(now).messages, { role: 'status', text: CANCELLED_LINE }],
    inputSeq: now.inputSeq + 1,
    draft,
  }))
  void focusField($, key)
}

// The field, drawn again under a new key on each send, takes the keyboard back:
// autoFocus applies only when the pane itself takes it, so the person could not
// type again, or press Ctrl+C, until they clicked (#240).
async function focusField($: EngineInterface, key: string) {
  try {
    await $.clock.sleep(THREAD_REDRAW_MS)
    const pane = threadPane(key)
    const field = threadFieldKey(pane, (await read($, threads))[key]?.inputSeq ?? 0)
    const moved = await $.ui.focus({ requestId: pane, key: field })
    if (!('deny' in moved && moved.deny)) threadFocus.set(pane, field)
    observe(`thread ${key} field focused: ${JSON.stringify(moved)}`)
  } catch (err) {
    observe(`thread ${key} field not focused: ${String(err)}`)
  }
}

async function toThreadEnd($: EngineInterface, key: string) {
  try {
    await $.clock.sleep(THREAD_REDRAW_MS)
    const scrolled = await $.ui.scroll({ in: threadPane(key), to: 'end' })
    observe(`thread ${key} to its end: ${JSON.stringify(scrolled)}`)
  } catch (err) {
    observe(`thread ${key} to its end: ${String(err)}`)
  }
}

// d or ❝ discuss on a block: its pane, with the keyboard in the field. The
// review lets go, since the keyboard can't come back to it (D45).
async function openThread($: EngineInterface, index: number | string) {
  const key = String(index)
  const anchor = await threadAnchor($, key)
  if (anchor === undefined) return
  // Its pane already open behind another tab: opening an open id only retitles it,
  // and raising it needs the prompt to hold the keys, which the reply does now.
  // Closed and opened again, it comes up as a new pane does, as the last tab.
  if (openThreads.has(key)) await $.ui.close({ id: threadPane(key) }).catch(() => undefined)
  let opened
  try {
    opened = await $.ui.open({ id: threadPane(key), title: `${THREAD_GLYPH} ${quote(anchor.part?.text ?? anchor.block, 6)}`, focus: true, closeOnEscape: true })
  } catch (err) {
    observe(`thread ${key} open failed: ${String(err)}`)
    return $.ui.toast("couldn't open the thread")
  }
  observe(`thread ${key} open ${JSON.stringify(opened)}`)
  // Open but undrawn. From the reply the open isn't the person's own (a Client's
  // post), so a narrow terminal leaves it waiting; a press on the band's d counts
  // as theirs (#146). Closed again, so it doesn't appear later on its own when the
  // terminal widens.
  if (!opened.isPlaced) {
    await $.ui.close({ id: threadPane(key) }).catch(() => undefined)
    return $.ui.toast(`too narrow to open from the reply: ${ENTRY_CHORD}, then d on the band`)
  }
  openThreads.add(key)
  releaseReview($)
  void toThreadEnd($, key)
}

// Threads whose answer to the person's message is being written: a message
// sent meanwhile waits in the queue (#245). An answer to an agent's report
// isn't counted: the person's messages and the agent's aren't ordered.
const asking = new Set<string>()
// What each thread's field holds as the person types, so ↑ pulls the queue back
// only into an empty one.
const fieldText = new Map<string, string>()

// --- The session's permission mode (#225), for whether the thread's agent
// starts at once (auto mode) or once the person confirms it. Claude Code tells
// it to the settings hooks of each prompt and each turn's end (read here,
// passed on unchanged); no event tells of Shift+Tab, but the prompt's hint line
// is drawn again when the mode changes, and a change seen there since the last
// reading leaves it unknown until the next.
let modeRead: string | undefined
// Whether the hint line named a mode other than the default's (its
// "shift+tab to cycle"), now and at the last reading.
let hintMarked: boolean | undefined
let hintMarkedAtRead: boolean | undefined

function readMode(mode: string | undefined) {
  if (!mode) return
  modeRead = mode
  hintMarkedAtRead = hintMarked
}

// In auto mode for sure: the last reading said so, and Shift+Tab hasn't changed
// it since. Any doubt means asking.
const isAutoNow = () => isAutoMode(modeRead, hintMarked, hintMarkedAtRead)

async function sendInThread($: EngineInterface, key: string, text: string) {
  if (!text.trim()) return
  fieldText.delete(key)
  // The answer to their last message is on its way: this one waits for it.
  // Checked and claimed before any await, so two sends can't both go out.
  // A question waiting on the agent's start goes in the same change: the person
  // wrote instead, which counts as not now (#225).
  if (asking.has(key)) {
    await changeThread($, key, t => ({ ...t, messages: [...t.messages, { role: 'person', text, queued: true }], inputSeq: t.inputSeq + 1, draft: undefined, isAgentAsked: false }))
    void focusField($, key)
    return
  }
  asking.add(key)
  const prior = (await read($, threads))[key] ?? NEW_THREAD
  await changeThread($, key, t => ({ ...t, messages: [...t.messages, { role: 'person', text }], pending: t.pending + 1, inputSeq: t.inputSeq + 1, draft: undefined, isAgentAsked: false }))
  void focusField($, key)
  await askThread($, key, prior, text)
}

// The queue back into the field, a line each, out of the queue, to edit and send
// as one text (#245).
async function queueBackToField($: EngineInterface, key: string) {
  const t = (await read($, threads))[key]
  const queued = t ? queuedOf(t) : []
  if (queued.length === 0) return
  const draft = queued.join('\n')
  fieldText.set(key, draft)
  observe(`thread ${key}: ${queued.length} queued message(s) back in the field`)
  await changeThread($, key, now => ({ ...withoutQueued(now), inputSeq: now.inputSeq + 1, draft }))
  void focusField($, key)
}

// One answer to the person: the fork, asked over the thread as it was before
// their message (`prior`). Once it lands, everything queued meanwhile goes out
// together, as one message a line each, asked over the thread with this answer.
async function askThread($: EngineInterface, key: string, prior: Thread, text: string) {
  const anchor = await threadAnchor($, key)
  if (anchor === undefined) return void asking.delete(key)
  asking.add(key)
  // The mode as the question is asked: the answer's words and what follows them
  // both go by it, so a change meanwhile can't split them.
  const isAuto = isAutoNow()
  const prompt = threadPrompt(anchor, prior, text, isAuto)
  const asked = cancels.get(key) ?? 0
  const reply = await read($, lastText)
  let batch: { prior: Thread; text: string } | undefined
  // Nothing to fork yet: no turn has finished since the session started or
  // resumed. The question goes back to the field, the thread says why (#195).
  let isUnforked = false
  // Whatever happens, the message stops waiting: a thread stuck waiting would
  // never be summarised.
  let answer = '(no answer: something went wrong, send it again)'
  try {
    const r = await forkThread($, prompt)
    observe(`thread ${key} fork: ${r.isAnswered ? `${r.usage.input_tokens} in, ${r.usage.cache_read_input_tokens} cached, ${r.usage.output_tokens} out` : r.reason}`)
    answer = r.isAnswered ? r.text : `(${noAnswer(r.reason)})`
    isUnforked = !r.isAnswered && r.reason === 'nothing-to-fork'
  } finally {
    if (isUnforked && !isCancelled(key, asked)) {
      asking.delete(key)
      if ((await read($, lastText)) === reply) {
        // What was typed meanwhile stays, after the question: nothing the
        // person wrote is lost.
        const held = fieldText.get(key)
        let draft = ''
        await changeThread($, key, t => {
          const back = unforked(t, prior.messages.length, NOT_FORKED_LINE)
          draft = [back.draft, held].filter(Boolean).join('\n')
          return { ...back.thread, draft }
        })
        if (draft) fieldText.set(key, draft)
        void focusField($, key)
      }
      return
    }
    // A new reply meanwhile discarded the thread: the answer has nowhere to go.
    // Cancelled while it was written, it is thrown away (#240), and the cancel
    // already ended the wait. Landing, it goes before what is queued.
    // With messages queued, they are sent, and pending, in the same change as
    // the answer: nothing in between sees a thread with no answer on its way.
    if (!isCancelled(key, asked)) {
      if ((await read($, lastText)) === reply) {
        await changeThread($, key, t => {
          const answered = answerBeforeQueued(t, answer)
          const queued = queuedOf(answered)
          if (queued.length === 0) return answered
          batch = { prior: withoutQueued(answered), text: queued.join('\n') }
          return { ...sendQueued(answered), pending: answered.pending + 1 }
        })
      }
      if (!batch) asking.delete(key)
    }
  }
  if ((await read($, lastText)) !== reply || isCancelled(key, asked)) return
  if (batch) {
    const next: { prior: Thread; text: string } = batch
    observe(`thread ${key}: ${next.text.split('\n').length} queued message(s) sent`)
    void askThread($, key, next.prior, next.text).catch(err => observe(`thread ${key} queue failed: ${String(err)}`))
  }
  // What it carries for the agent goes at once, and an agent the person asked
  // for starts: they chose either when they sent the message it answers (D51).
  const { toAgent, startsAgent } = parseAnswer(answer)
  const agent = (await read($, threads))[key]?.agent
  if (toAgent && agent) await sendToAgent($, agent.id, toAgent)
  // Proposed: started at once in auto mode, else asked of the person (#225).
  if (startsAgent && !agent) {
    observe(`thread ${key} agent proposed, ${isAuto ? 'auto mode: started' : `mode ${modeRead ?? 'unknown'}: asked`}`)
    if (isAuto) await startAgent($, key).catch(err => observe(`thread ${key} agent failed: ${String(err)}`))
    else await changeThread($, key, t => ({ ...t, isAgentAsked: true }))
  }
  // The answer brought the summary and the switch's default: the review follows.
  await suggestTray($)
  // Included and the answer came without a summary: closed while it waited (the
  // close couldn't write it), or switched on while it waited (the message, sent
  // while off, asked for none). Written now, or it would wait for the close.
  await summarize($, key).catch(err => observe(`thread ${key} summary failed: ${String(err)}`))
}

// On close: the summary that goes into the review, if the thread changed since.
async function summarize($: EngineInterface, key: string) {
  const t = (await read($, threads))[key]
  const anchor = await threadAnchor($, key)
  if (!t || anchor === undefined || !needsSummary(t)) return
  const at = t.messages.length
  const reply = await read($, lastText)
  // The band says so while it is written: the suggestion lacks it until then.
  summarizing.add(key)
  $.ui.invalidate('ui.render')
  const r = await forkThread($, summaryPrompt(anchor, t)).finally(() => {
    summarizing.delete(key)
    $.ui.invalidate('ui.render')
  })
  if ((await read($, lastText)) !== reply) return
  observe(`thread ${key} summary: ${r.isAnswered ? `${r.text.split('\n').length} lines` : r.reason}`)
  if (!r.isAnswered) return $.ui.toast("couldn't summarise the thread: open it and close it again to retry")
  // An answer meanwhile may have brought a fresher summary: it stays.
  await changeThread($, key, now => (now.summarizedAt > at ? now : { ...now, summary: r.text.trim(), summarizedAt: at }))
  await suggestTray($)
}

// One fork; a call that throws (an older Claude Code, a refusal) is an answer
// that didn't come, never a thread left waiting.
async function forkThread($: EngineInterface, prompt: string) {
  try {
    return await $.model.fork({ prompt })
  } catch (err) {
    return { isAnswered: false as const, reason: `failed: ${String(err)}` }
  }
}

// Why a fork gave no answer, in the person's words.
function noAnswer(reason: string): string {
  if (reason === 'nothing-to-fork') return 'no answer: send a prompt in the main chat first, then try again'
  if (reason === 'api-error') return 'no answer: the request failed, send it again'
  return `no answer: ${reason}`
}

async function toggleInclude($: EngineInterface, key: string) {
  // Switched on, the thread is what the review sends for this part: its mark
  // goes, a comment's text kept for c, as Backspace keeps it (#238).
  if (!(await read($, threads))[key]?.included) await writeTray($, tray => clearMark(tray, key))
  await changeThread($, key, t => ({ ...t, included: !t.included, isIncludeSet: true }))
  await suggestTray($)
  // Switched on, it has to send something: a summary that is empty, or older than
  // the thread (answered while off, with none), is written now, not on close.
  const t = (await read($, threads))[key]
  if (t?.included && needsSummary(t)) await summarize($, key)
}

// --- A thread's agent (D51): its tasks, run by a fork subagent with tools.

// The person asked for an agent, and the answer started it: the summary as it
// stands is its tasks, or the thread itself without one; the switch turns on
// unless the person set it; then the summary is rewritten with the tasks under
// Still on.
async function startAgent($: EngineInterface, key: string) {
  if (startingAgents.has(key)) return
  startingAgents.add(key)
  try {
    await spawnFor($, key)
  } finally {
    startingAgents.delete(key)
  }
}

async function spawnFor($: EngineInterface, key: string) {
  const anchor = await threadAnchor($, key)
  const reply = await read($, lastText)
  const before = (await read($, threads))[key]
  if (anchor === undefined || !before || before.agent || before.pending > 0) return
  // It starts at once, on the person's word: with the summary as it stands as
  // its tasks, or the thread itself when there is none. Whether it should run is
  // the thread's agent's call, made in its answer; Synaptik doesn't second-guess
  // it (P2).
  const thread = before
  const label = agentLabel(anchor)
  let id: string | undefined
  try {
    const spawned = await $.agent.spawn({ prompt: agentPrompt(anchor, thread), description: label, subagentType: 'fork' })
    observe(`thread ${key} agent: ${JSON.stringify(spawned)}`)
    if (spawned.deny) return noteAgent($, key, notStartedLine(refusalWords(spawned.deny)))
    // The id is core's to give, and may be missing: then it is the newest agent
    // listed under this description that isn't one of Synaptik's already.
    id =
      spawned.agentId ??
      (await $.agent.list())
        .filter(a => a.description === label && !ownAgents.has(a.id))
        .sort((x, y) => y.startTime - x.startTime)[0]?.id
    if (!id) return noteAgent($, key, notStartedLine("Claude Code didn't report it"))
  } catch (err) {
    observe(`thread ${key} agent failed: ${String(err)}`)
    return noteAgent($, key, notStartedLine(String(err)))
  }
  ownAgents.set(id, { key, reply, label })
  runSince.set(id, Date.now())
  if ((await read($, lastText)) !== reply) return
  await changeThread($, key, t => ({ ...t, agent: { id: id!, state: 'working' }, included: t.isIncludeSet ? t.included : true }))
  await suggestTray($)
  void catchUp($, id)
  void rewriteForAgent($, key, true).catch(err => observe(`thread ${key} summary failed: ${String(err)}`))
}

// A line about the agent, in its thread's history: it couldn't start, or a run
// ended without a report (#239). A toast too when the thread's pane is closed,
// so it isn't missed. A start that didn't happen changes nothing the summary
// says, so a summary that was current stays so; a run that ended without a
// report leaves its tasks undone, and the summary is due a rewrite.
async function noteAgent($: EngineInterface, key: string, line: string, isSummaryKept = true) {
  observe(`thread ${key} agent: ${line}`)
  await changeThread($, key, t => {
    const isCurrent = t.summarizedAt >= t.messages.length
    const messages = [...t.messages, { role: 'status' as const, text: line }]
    return { ...t, messages, summarizedAt: isSummaryKept && isCurrent ? messages.length : t.summarizedAt }
  })
  if (!openThreads.has(key)) $.ui.toast(line)
}

const agentLabel = (anchor: Anchor) => `Synaptik · ${quote(anchor.part?.text ?? anchor.block, 6)}`

// After a reload: the threads' agents are Synaptik's again, so their reports
// reach the thread and their notices stay out of the main conversation.
async function reclaimAgents($: EngineInterface) {
  const reply = await read($, lastText)
  for (const [key, t] of Object.entries(await read($, threads))) {
    const anchor = t.agent && !ownAgents.has(t.agent.id) ? await threadAnchor($, key) : undefined
    if (t.agent && anchor) ownAgents.set(t.agent.id, { key, reply, label: agentLabel(anchor) })
  }
}

// The agent's first turn can end before spawn returns its id, so its
// turn.complete went by unclaimed: a finished one is read from its transcript.
async function catchUp($: EngineInterface, id: string) {
  try {
    const info = (await $.agent.list()).find(a => a.id === id)
    if (info?.taskStatus !== 'completed') return
    const rows = await $.session.messages({ agentId: id })
    if (!Array.isArray(rows)) return
    const key = ownAgents.get(id)?.key
    const t = key === undefined ? undefined : (await read($, threads))[key]
    if (t?.agent?.id !== id || t.messages.some(m => m.role === 'report')) return
    observe(`agent ${id} finished before its id came: caught up`)
    await onAgentTurn($, id, lastTurnText(rows as Parameters<typeof lastTurnText>[0]))
  } catch (err) {
    observe(`agent ${id} catch-up failed: ${String(err)}`)
  }
}

// The summary rewritten for the agent, with the tasks under Still on when it
// starts; one fork.
async function rewriteForAgent($: EngineInterface, key: string, isStarting: boolean) {
  const t = (await read($, threads))[key]
  const anchor = await threadAnchor($, key)
  if (!t || anchor === undefined) return
  const at = t.messages.length
  const reply = await read($, lastText)
  summarizing.add(key)
  $.ui.invalidate('ui.render')
  const r = await forkThread($, summaryPrompt(anchor, t, isStarting)).finally(() => {
    summarizing.delete(key)
    $.ui.invalidate('ui.render')
  })
  if ((await read($, lastText)) !== reply || !r.isAnswered) return
  await changeThread($, key, now => (now.summarizedAt > at ? now : { ...now, summary: r.text.trim(), summarizedAt: at }))
  await suggestTray($)
}

// One of the agent's turns ended: its answer joins the thread whole, the state
// follows its report, and the thread answers it on its own, with the summary
// rewritten. That answer sends the agent nothing (D51).
async function onAgentTurn($: EngineInterface, id: string, answer: string, ms?: number) {
  const own = ownAgents.get(id)
  if (!own || (await read($, lastText)) !== own.reply) return
  const key = own.key
  const anchor = await threadAnchor($, key)
  if (anchor === undefined || (await read($, threads))[key]?.agent?.id !== id) return
  // Its run is over: its line, step and time go with it.
  agentsNow.delete(id)
  const state = reportState(answer)
  observe(`agent ${id} reported: ${state}`)
  await changeThread($, key, t => ({
    ...t,
    agent: { id, state },
    messages: [...t.messages, { role: 'report', text: answer.trim(), ...(ms === undefined ? {} : { ms }) }],
    pending: t.pending + 1,
  }))
  const thread = (await read($, threads))[key]!
  const asked = cancels.get(key) ?? 0
  let reply = '(no answer to the report: something went wrong)'
  try {
    const r = await forkThread($, reportPrompt(anchor, thread, answer.trim()))
    observe(`thread ${key} report answer: ${r.isAnswered ? `${r.usage.output_tokens} out` : r.reason}`)
    reply = r.isAnswered ? r.text : `(${noAnswer(r.reason)})`
  } finally {
    if ((await read($, lastText)) === own.reply && !isCancelled(key, asked)) await changeThread($, key, t => withAnswer(t, reply, true))
  }
  if ((await read($, lastText)) === own.reply && !isCancelled(key, asked)) await suggestTray($)
}

// A run that ended without a report: interrupted or failed. The thread says so,
// and has nothing to answer: there is no report.
async function onAgentEnded($: EngineInterface, id: string, line: string) {
  const own = ownAgents.get(id)
  if (!own || (await read($, lastText)) !== own.reply) return
  if ((await read($, threads))[own.key]?.agent?.id !== id) return
  agentsNow.delete(id)
  await changeThread($, own.key, t => ({ ...t, agent: { id, state: 'stopped' as AgentState } }))
  await noteAgent($, own.key, line, false)
}

// What the thread sends its agent: Claude Code hands it over at the agent's next
// tool call, or resumes it if it finished.
async function sendToAgent($: EngineInterface, id: string, text: string) {
  try {
    const sent = await $.session.send({ to: { agentId: id }, text })
    observe(`agent ${id} sent: ${JSON.stringify(sent)}`)
    if (!sent.isDelivered) $.ui.toast(`couldn't reach the agent: ${sent.reason}`)
  } catch (err) {
    observe(`agent ${id} send failed: ${String(err)}`)
    $.ui.toast("couldn't reach the agent")
  }
}

// What the person typed in one of Synaptik's agents' views joins its thread, so
// the thread's agent knows what was settled there.
async function onTypedToAgent($: EngineInterface, id: string, text: string) {
  const own = ownAgents.get(id)
  if (!own || !text || (await read($, lastText)) !== own.reply) return
  if ((await read($, threads))[own.key]?.agent?.id !== id) return
  observe(`agent ${id}: the person wrote to it in its view`)
  await changeThread($, own.key, t => ({ ...t, messages: [...t.messages, { role: 'direct', text }] }))
}

// A turn of one of Synaptik's agents started again: resumed by a send, or by the
// person in its view.
async function onAgentStart($: EngineInterface, id: string) {
  const own = ownAgents.get(id)
  if (!own || (await read($, lastText)) !== own.reply) return
  const t = (await read($, threads))[own.key]
  if (t?.agent?.id !== id || t.agent.state === 'working') return
  // A new run: timed from now, with nothing of the last one's.
  runSince.set(id, Date.now())
  agentsNow.delete(id)
  await changeThread($, own.key, now => ({ ...now, agent: { id, state: 'working' as AgentState } }))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    isHeadless = !e.isInteractive
    if (isHeadless) return next(e)
    await $.command.register({
      name: 'synaptik',
      description: "Review the agent's reply in place · help for more",
      argumentHint: '[help|on|off|log]',
      // So `off` works while a turn runs, when a drawing gone wrong hurts most.
      immediate: true,
    })
    // A resumed session (and every reload of this mod) already has a reply.
    await adoptLastReply($)
    await reclaimAgents($)
    return next(e)
  }).catch(($, e, next) => next(e))

  // The permission mode, read from Claude Code's settings hooks of the main loop
  // and passed on as they came (#225): nothing is blocked or changed.
  on('classic.UserPromptSubmit', async ($, e, next) => {
    if (!e.agent_id) readMode(e.permission_mode)
    return next(e)
  }).catch(($, e, next) => next(e))
  on('classic.Stop', async ($, e, next) => {
    if (!e.agent_id) readMode(e.permission_mode)
    return next(e)
  }).catch(($, e, next) => next(e))
  // Shift+Tab: the hint line is drawn again, naming a mode or not.
  on('ui.render', { component: 'PromptHint' }, async ($, e, next) => {
    hintMarked = e.props.hint.includes('shift+tab to cycle')
    return next(e)
  }).catch(($, e, next) => next(e))

  on('session.end', async ($, e, next) => {
    const result = await next(e)
    if (!isHeadless && (e.reason === 'resume' || e.reason === 'clear')) void readoptAfter($, e.sessionId)
    return result
  }).catch(($, e, next) => next(e))

  // `/synaptik` and its subcommands (D39, SPEC §10).
  on('command.run', { command: 'synaptik' }, async ($, e) => {
    const args = (e.args ?? '').trim()
    if (args === '') {
      if (!(await read($, isOn))) return { text: 'off for this session · /synaptik on turns it back on' }
      if (!(await read($, lastText))) return { text: 'nothing to respond to yet — the navigator opens on the next reply' }
      // Fullscreen has no navigator (D41): the review starts in the reply.
      if (isFullscreen) return { text: 'ctrl+x tab, or a click on the band\'s hint, to review the reply' }
      await openPane($, true)
      return {}
    }
    if (args === 'help') return { text: HELP }
    if (args === 'on' || args === 'off') {
      const wanted = args === 'on'
      const was = await read($, isOn)
      await update($, isOn, () => wanted)
      // Off, threads close too; they are kept, and on brings them back with d.
      if (!wanted) for (const key of [...openThreads]) await $.ui.close({ id: threadPane(key) }).catch(() => undefined)
      // Redraw at once: the reply, band and navigator read it.
      $.ui.invalidate('ui.render')
      const now = wanted ? 'on' : 'off for this session'
      if (was === wanted) return { text: `already ${now}` }
      return { text: wanted ? 'on' : 'off for this session · /synaptik on turns it back on, /plugin disables it for good' }
    }
    if (args === 'log') return { text: observed.join('\n') || '(nothing observed yet)' }
    return { text: `unknown: /synaptik ${args}\n\n${HELP}` }
  }).catch(($, e, next) => next(e))

  // While a turn runs, a new reply is on its way and will replace the tray
  // (SPEC §5), so marking is off: the reply and the band draw as vanilla.
  // Since Claude Code 2.1.300 these also hear subagents' and teammates' turns,
  // told apart by `e.agentId`: only the main loop's turn brings a new reply, so
  // only it switches marking off and on.
  on('turn.start', async ($, e, next) => {
    if (e.agentId) {
      if (ownAgents.has(e.agentId)) await onAgentStart($, e.agentId).catch(err => observe(`agent start failed: ${String(err)}`))
      return next(e)
    }
    await letGoForTurn($)
    isSuggested = false
    shortProposed = undefined
    await update($, isWorking, () => true)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    // One of Synaptik's agents ended a turn: its answer goes to its thread (D51).
    if (e.agentId) {
      const id = e.agentId
      if (ownAgents.has(id)) {
        const ended = e.reason === 'answer' ? undefined : endedLine(e.reason, e.reason === 'refusal' ? e.refusal.explanation : null)
        await (ended ? onAgentEnded($, id, ended) : onAgentTurn($, id, e.answer, e.durationMs)).catch(err => observe(`agent ${id} report failed: ${String(err)}`))
      }
      return next(e)
    }
    await adoptLastReply($)
    await update($, isWorking, () => false)
    return next(e)
  }).catch(($, e, next) => next(e))

  // --- Claude Code's notices about Synaptik's own agents (D51) ---------------
  // Each time one stops after a resume, Claude Code adds a notice to the main
  // conversation, its whole answer in it, and submits it, which would start a
  // main turn. For these notices only, the row is reworded without the answer
  // and the prompt dropped: what the agent did reaches the main conversation in
  // the thread's summary, which the person sends (P1). Synaptik on or off: the
  // agent is its own either way. Every other row and prompt passes untouched.
  on('session.append', async ($, e, next) => {
    if (ownAgents.size === 0) return next(e)
    // In one of them: what the person typed in its view, also kept in its thread.
    if (e.agentId) {
      const result = await next(e)
      const isTyped = e.message.role === 'user' && (e.origin?.kind === 'composer' || e.origin?.kind === 'bridge')
      if (isTyped && ownAgents.has(e.agentId)) {
        const text = e.message.content.map(b => (b.type === 'text' && typeof b.text === 'string' ? b.text : '')).join('\n')
        void onTypedToAgent($, e.agentId, typedInView(text)).catch(err => observe(`agent ${e.agentId} typed failed: ${String(err)}`))
      }
      return result
    }
    const content = e.message.content
    const ids = new Set(ownAgents.keys())
    const isOurs = (b: (typeof content)[number]) => b.type === 'text' && typeof b.text === 'string' && noticeAbout(b.text, ids) !== undefined
    if (!content.some(isOurs)) return next(e)
    const reworded = content.map(b => {
      const id = b.type === 'text' && typeof b.text === 'string' ? noticeAbout(b.text, ids) : undefined
      return id ? { ...b, text: rewordedNotice(id) } : b
    })
    observe('notice about an agent: reworded')
    return next({ ...e, message: { ...e.message, content: reworded } })
  }).catch(($, e, next) => next(e))

  on('prompt.submit', async ($, e, next) => {
    if (e.origin?.kind !== 'task-notification' || ownAgents.size === 0) return next(e)
    const id = noticeAbout(e.text, new Set(ownAgents.keys()))
    if (!id) return next(e)
    observe(`notice about agent ${id}: dropped`)
    return { drop: 'Synaptik agent notice' }
  }).catch(($, e, next) => next(e))

  // Its row in Claude Code's agent list: relabelled with its block and state.
  // When the row hides is Claude Code's.
  on('ui.render', { component: 'AgentRow' }, async ($, e, next) => {
    const own = ownAgents.get(e.props.id)
    if (!own) return next(e)
    const t = (await read($, lastText)) === own.reply ? (await read($, threads))[own.key] : undefined
    const state = t?.agent?.id === e.props.id ? t.agent.state : undefined
    return next({ ...e, props: { ...e.props, label: state ? `${own.label} · ${AGENT_WORDS[state]}` : own.label } })
  }).catch(($, e, next) => next(e))

  // The row after a turn, remembered so the reply's end can be scrolled into
  // view. Drawn by Claude Code unchanged.
  // Every turn row on screen is redrawn, older ones too: the newest is the one
  // first seen last, not the one drawn last.
  on('ui.render', { component: 'TurnDuration' }, ($, e, next) => {
    if (!turnRowsSeen.has(e.requestId)) {
      turnRowsSeen.add(e.requestId)
      turnRowId = e.requestId
      observe(`turn row ${e.requestId.slice(0, 12)}`)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // The band's hint, clicked: the review starts, and its keys steer it.
  on('ui.message', { component: 'AbovePrompt' }, async ($, e, next) => {
    const d = (e.data ?? {}) as { kind?: string; key?: string; ctrl?: boolean; shift?: boolean; meta?: boolean }
    if (d.kind === 'start') {
      await bandMove($, 0)
      holder = 'hint'
      void suggestTray($)
      $.ui.invalidate('ui.render')
    }
    if (d.kind === 'key' && d.key) await steer($, { key: d.key, ctrl: d.ctrl, shift: d.shift, meta: d.meta })
    return next(e)
  }).catch(($, e, next) => next(e))


  // A Client failed: leave it out from now on, so the band draws its hint as
  // plain text (ctrl+x tab still starts a review) and the reply is drawn without
  // block Clients. Tried again on the next reply.
  on('ui.fault', async ($, e, next) => {
    observe(`fault: ${e.module} ${e.element} (${e.phase}): ${e.reason}`)
    if (e.module.endsWith('hint.tsx')) isHintFaulted = true
    if (e.module.endsWith('block.tsx')) {
      isBlockFaulted = true
      releaseReview($)
    }
    return next(e)
  }).catch(($, e, next) => next(e))


  // --- The reply: the selected block's marker and in-place menu -------------

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    // One of Synaptik's agents in view: its replies draw without their report,
    // which is the thread's; the transcript keeps it whole (D51). Its other
    // rows draw as they would anywhere.
    const cut = viewedAgent && ownAgents.has(viewedAgent) && (await read($, isOn)) ? withoutReport(e.props.text) : undefined
    if (cut !== undefined) {
      const status = reportStatus(e.props.text)
      const drawn = await next({ ...e, props: { ...e.props, text: cut } })
      const { Box, Text } = $.ui.resolve(e)
      return (
        <Box flexDirection="column">
          {drawn}
          <Text dimColor>{`  ⎿ reported to the thread${status ? ` · ${AGENT_WORDS[status]}` : ''}`}</Text>
        </Box>
      )
    }
    if (!(await read($, isOn)) || (await read($, isWorking))) return next(e)

    const text = e.props.text
    const target = await read($, lastText)
    if (text.trim() === '' || !target.includes(text.trim())) return next(e)
    if (text.length > MAX_DRAWN) return next(e)

    replyRequestId = e.requestId
    if (e.viewport) screen = { columns: e.viewport.columns, rows: e.viewport.rows }
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const segments = segment(text)
    // Where this piece's blocks start in the whole reply, so numbering runs
    // across the pieces of a reply split around tool calls.
    const offset = segment(target.slice(0, target.indexOf(text.trim()))).filter(s => s.isBlock).length
    const sel = await read($, selected)
    const marked = await read($, marks)
    const threadsNow = await read($, threads)
    const commented = (await read($, comments)) as Record<number, string>
    const isTyping = await read($, isCommenting)
    const cursor = isNavigatorFocused ? await read($, focusedVerb) : ''

    // Draw only when there is something to show: while reviewing, or when a
    // block in this piece is marked or being commented. Otherwise pass the reply
    // through, so Claude Code and the mods beneath draw it as usual. Redrawing
    // takes the reply from every mod beneath (one mod redraws a reply), and
    // draws the transcript's text — bypassing any mod beneath that changes it
    // (D33).
    const pieceBlocks = segments.filter(s => s.isBlock).length

    // Fullscreen (D41): during a review every block is a Client, so a click on
    // one selects it and hands the reply the keyboard; each draws its block, its
    // mark, and, once selected, the menu and the comment typed in place. Outside a
    // review the reply is drawn as below — plain, so its text can be selected
    // (a Client holds the pointer, and the transcript selects nothing in it).
    if (e.viewport?.isFullscreen) {
      isFullscreen = true
      if (await read($, isPaneShown)) closePaneForFullscreen($)
    }
    if (e.viewport?.isFullscreen && holder && !isBlockFaulted) {
      const review = await shownReview($)
      const staged = commented as Record<string, string>
      // A move crosses the reply's pieces: the bounds are the whole reply's.
      const count = await blockCount($)
      const stepCounts = partCounts(target)
      let n = offset - 1
      return (
        <Box flexDirection="column" marginTop={1}>
          {segments.map((seg, k) => {
            const bullet = k === 0 && e.props.isFirstOfReply ? BULLET : undefined
            if (!seg.isBlock) {
              return (
                <Box flexDirection="row" marginTop={seg.hasGapBefore ? 1 : 0}>
                  <Box width={MARGIN} flexShrink={0}>
                    <Text>{bullet ?? ''}</Text>
                  </Box>
                  <Box flexGrow={1}>
                    <Markdown text={seg.text} />
                  </Box>
                </Box>
              )
            }
            n += 1
            const mark = marked[n]
            return (
              <Box flexDirection="column" marginTop={seg.hasGapBefore ? 1 : 0}>
                {h('Client', {
                  key: `block-${replyGeneration}-${n}`,
                  module: './client/block.tsx',
                  props: {
                    index: n,
                    text: seg.text,
                    indent: seg.indent,
                    ...(mark ? { glyph: GLYPH[mark] } : threadGlyph(threadsNow, n) ? { glyph: threadGlyph(threadsNow, n)! } : {}),
                    ...(bullet ? { bullet } : {}),
                    first: 0,
                    last: count - 1,
                    review,
                    acked: held.acked,
                    comments: staged,
                    partCounts: stepCounts,
                    lineGlyphs: lineGlyphs(marked, threadsNow, n),
                    lineMarks: lineMarks(marked, n),
                  },
                })}
              </Box>
            )
          })}
        </Box>
      )
    }

    const isMarkedHere = [...Object.keys(marked), ...Object.keys(threadsNow).filter(k => threadGlyph(threadsNow, k))].some(
      k => Number(k) >= offset && Number(k) < offset + pieceBlocks,
    )
    const isTypingHere = isTyping && sel >= offset && sel < offset + pieceBlocks
    if (!isNavigatorFocused && !isMarkedHere && !isTypingHere) return next(e)

    // The mod draws the reply itself (views/reply.tsx); each block's action
    // buttons run here.
    let index = offset - 1
    return ReplyView(
      { Box, Text, Button, Markdown },
      {
        isFirstOfReply: e.props.isFirstOfReply,
        segments: segments.map(seg => {
          if (!seg.isBlock) return { text: seg.text, isBlock: false, indent: seg.indent, hasGapBefore: seg.hasGapBefore }
          index += 1
          const i = index
          const isSelected = i === sel
          const mark = marked[i]
          return {
            text: seg.text,
            isBlock: true,
            indent: seg.indent,
            hasGapBefore: seg.hasGapBefore,
            glyph: mark
              ? GLYPH[mark]
              : (threadGlyph(threadsNow, i) ?? (Object.keys(lineGlyphs(marked, threadsNow, i)).length > 0 ? PARTLY : undefined)),
            // Background and menu only while the navigator holds the keyboard:
            // after Esc the reply reads as a plain reply again.
            isSelected: isSelected && isNavigatorFocused,
            // The comment line: live while it is typed, else once staged.
            comment: (isSelected && isTyping) || (commented[i] && mark === 'comment') ? (commented[i] ?? '') : undefined,
          }
        }),
        cursor,
      },
      key => runVerb($, key),
    )
  }).catch(($, e, next) => next(e))

  // --- Fullscreen: what the reply's blocks post, and who has the keyboard -----

  // A block's post: the review, and every action not yet confirmed. Each action
  // is applied once (src/review.ts, receive).
  on('ui.message', { component: 'AssistantMessage' }, async ($, e, next) => {
    const data = (e.data ?? {}) as { review?: Review; actions?: Numbered[] }
    const r = data.review
    observe(
      `block ${e.element}: holder=${holder ?? '-'} seq=${r?.seq}/${held.review.seq} epoch=${r?.epoch}/${held.review.epoch} ` +
        `sel=${r?.selected} editing=${r?.editing ? JSON.stringify(r.editing.text.slice(-12)) : '-'} ` +
        `actions=${JSON.stringify((data.actions ?? []).filter(a => a.id > held.acked).map(a => a.kind))}`,
    )
    const got = receive(held, data.review, data.actions ?? [])
    held = got.held
    const isEnd = got.apply.some(a => a.kind === 'end')
    if (data.review && !isEnd) {
      const isEntering = !holder
      holder = 'reply'
      if (isEntering) void suggestTray($)
    }
    for (const a of got.apply) await applyAction($, a)
    if (data.review && !isEnd) {
      const before = await read($, selected)
      await update($, selected, () => got.held.review.selected)
      await reveal($, before, got.held.review.selected, await blockCount($))
    }
    $.ui.invalidate('ui.render')
    return next(e)
  }).catch(($, e, next) => next(e))

  // The band's ring: in fullscreen it stops on Synaptik's actions only (j / k are
  // hotkeys, not stops). Landing on one starts the review (ctrl+x tab); leaving
  // them ends it — unless a block takes the keyboard (a click into the reply),
  // which its own post reports right after. `'*'`: a hook naming no plugin hears
  // only Synaptik's own elements, and the ring moving onto another mod's button
  // ends the review too.
  on('ui.focus', { component: 'AbovePrompt', plugin: '*' }, async ($, e, next) => {
    if (!isFullscreen) return next(e)
    const deny = bandFocus($, e.plugin, e.element, e.origin.kind)
    return deny ? { deny } : next(e)
  }).catch(($, e, next) => next(e))

  // An edit in the prompt box. A paste while a comment is open in the reply goes
  // into the comment instead: Claude Code hands every paste to the box. Any other
  // edit means the person is typing there, so the reply lets go.
  on('prompt.edit', async ($, e, next) => {
    const pasted = (holder === 'reply' || holder === 'hint') && !e.key ? paste(held.review, e.inputText) : undefined
    if (!e.key && e.inputText.length > 1) {
      observe(`paste of ${e.inputText.length} chars: holder=${holder ?? '-'} comment open=${held.review.editing ? 'yes' : 'no'} → ${pasted ? 'into the comment' : 'the prompt box'}`)
    }
    if (pasted) {
      held = { ...held, review: pasted }
      $.ui.invalidate('ui.render')
      return next({ ...e, inputText: '' })
    }
    releaseReview($)
    // A suggestion cannot show while the box holds text: when it is empty again,
    // propose the feedback again. The band's staged line names what ⏎ will do
    // with the box, so it is drawn again on every change.
    const box = await next(e)
    if (box.text === '') void suggestTray($)
    $.ui.invalidate('ui.render')
    // The feedback's glyphs coloured in the box (src/decorate.ts), from the first
    // keystroke: taking the suggestion is a prompt.change, which carries none.
    const paints = decorate(box.text)
    return paints.length > 0 ? { ...box, decorations: [...(box.decorations ?? []), ...paints] } : box
  }).catch(($, e, next) => next(e))

  // The same after a clear, an undo or a recalled history entry.
  on('prompt.change', async ($, e, next) => {
    const box = await next(e)
    // The shortened suggestion taken, most likely after an Esc we couldn't see:
    // the review is over, and the box gets the full text. Not awaited: the fill
    // raises this event again, one at a time.
    if (shortProposed && box.text === shortProposed) {
      shortProposed = undefined
      releaseReview($)
      const full = await compile($)
      if (full) {
        void $.prompt.fill({ text: full }).catch(err => {
          observe(`fill failed: ${String(err)}`)
          $.ui.toast('Synaptik: the box holds only part of your review. Clear it, then take the suggestion again')
        })
      }
    }
    if (box.text === '') void suggestTray($)
    $.ui.invalidate('ui.render')
    return box
  }).catch(($, e, next) => next(e))

  // --- Threads: a pane per block (SPEC §8) ------------------------------------

  // Esc closes a thread: its summary is written then, and the keyboard goes to
  // the prompt, so the review lets go.
  on('ui.close', async ($, e, next) => {
    if (!e.id.startsWith(THREAD_PREFIX)) return next(e)
    const key = threadKeyOf(e.id)
    observe(`thread ${key} closed by ${e.origin.kind}`)
    openThreads.delete(key)
    // Synaptik's own close comes with a new reply, whose review isn't the thread's
    // to end; its threads are gone, so there is nothing to summarise.
    if (e.origin.kind === 'plugin') return next(e)
    void summarize($, key).catch(err => observe(`thread ${key} summary failed: ${String(err)}`))
    releaseReview($)
    return next(e)
  }).catch(($, e, next) => next(e))

  // A click into a thread's pane takes the keyboard from the review as well.
  on('ui.focus', { component: 'Pane' }, async ($, e, next) => {
    if (!e.requestId.startsWith(THREAD_PREFIX)) return next(e)
    releaseReview($)
    // ↑ in an empty field moves the focus to ◼ cancel above it: with messages
    // queued, the move is refused and they come back into the field (#245). The
    // field moves the focus itself, so this is where ↑ is seen while the thread
    // fits; a click on ◼ cancel lands here too, and its cancel then keeps them.
    const key = threadKeyOf(e.requestId)
    const t = (await read($, threads))[key]
    const field = t ? threadFieldKey(e.requestId, t.inputSeq) : undefined
    const isFromField = (threadFocus.get(e.requestId) ?? field) === field
    if (t && e.origin.kind === 'person' && e.element === threadStopKey(e.requestId) && isFromField && !fieldText.get(key) && queuedOf(t).length > 0) {
      await queueBackToField($, key)
      return { deny: 'the queued messages are back in the field' }
    }
    const result = await next(e)
    if (!result.deny) threadFocus.set(e.requestId, e.element)
    return result
  }).catch(($, e, next) => next(e))

  // ↑/↓ move between the field and the switch, as they do while the thread fits.
  // A thread taller than the pane would scroll on them instead and strand the
  // keyboard; the wheel and the page keys still scroll it.
  on('ui.scroll', { component: 'Pane' }, async ($, e, next) => {
    if (!e.requestId.startsWith(THREAD_PREFIX) || e.origin.kind !== 'person' || e.pointer || Math.abs(e.by) !== 1) return next(e)
    const key = threadKeyOf(e.requestId)
    const t = (await read($, threads))[key] ?? NEW_THREAD
    // The pane's stops, top to bottom: ◼ cancel while an answer is pending, the
    // field, then the switch under it.
    const field = threadFieldKey(e.requestId, t.inputSeq)
    const stops = [
      ...(t.pending > 0 ? [threadStopKey(e.requestId)] : []),
      ...(t.isAgentAsked ? [threadAgentStartKey(e.requestId), threadAgentSkipKey(e.requestId)] : []),
      field,
      threadSwitchKey(e.requestId),
    ]
    // Where the focus is: the field until something else took it, as the field
    // takes it by itself (autoFocus).
    const focused = threadFocus.get(e.requestId) ?? field
    // ↑ in an empty field takes the queue back into it, a line each, to edit and
    // send as one text, as Claude Code's own prompt does (#245).
    const isInField = focused === field
    if (e.by < 0 && isInField && !fieldText.get(key) && queuedOf(t).length > 0) {
      await queueBackToField($, key)
      return next({ ...e, offset: e.offset - e.by })
    }
    const at = Math.max(0, stops.indexOf(focused))
    const to = stops[at + Math.sign(e.by)]
    if (to) {
      const moved = await $.ui.focus({ requestId: e.requestId, key: to }).catch((err: unknown) => ({ deny: String(err) }))
      observe(`thread ${key} ${e.by > 0 ? '↓' : '↑'} → ${to}: ${JSON.stringify(moved)}`)
    }
    return next({ ...e, offset: e.offset - e.by })
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane' }, async ($, e, next) => {
    if (e.surface !== 'terminal' || !e.requestId.startsWith(THREAD_PREFIX)) return next(e)
    const key = threadKeyOf(e.requestId)
    const anchor = await threadAnchor($, key)
    if (anchor === undefined) return next(e)
    const { Box, Text, Button, Input, Markdown } = $.ui.resolve(e)
    const thread = (await read($, threads))[key] ?? NEW_THREAD
    return ThreadView(
      { Box, Text, Button, Input, Markdown },
      {
        id: e.requestId,
        anchor: anchor.part?.source ?? anchor.block,
        isPart: anchor.part !== undefined,
        columns: e.props.bodyColumns,
        isSummarizing: summarizing.has(key),
        thinking: thread.pending > 0 ? thinkingLine(Date.now(), pendingSince.get(key)) : undefined,
        agentWorking: thread.agent?.state === 'working' ? agentLine(Date.now(), agentsNow.get(thread.agent.id)) : undefined,
        thread,
      },
      {
        send: text => sendInThread($, key, text).catch(err => observe(`thread ${key} send failed: ${String(err)}`)),
        toggleInclude: () => toggleInclude($, key).catch(err => observe(`thread ${key} include failed: ${String(err)}`)),
        cancel: () => cancelAnswers($, key).catch(err => observe(`thread ${key} cancel failed: ${String(err)}`)),
        input: text => void fieldText.set(key, text),
        agentStart: () => answerAgentAsk($, key, true).catch(err => observe(`thread ${key} agent failed: ${String(err)}`)),
        agentSkip: () => answerAgentAsk($, key, false).catch(err => observe(`thread ${key} agent skip failed: ${String(err)}`)),
      },
    )
  }).catch(($, e, next) => next(e))

  // --- The pane: classic's block viewer, ↑↓ via scroll, ←→ via the focus ring --

  on('ui.close', { id: PANE }, async ($, e, next) => {
    observe(`pane closed by ${e.origin.kind}`)
    // Closed for fullscreen, from a drawing: nothing to finish, and no $.state
    // writes there. isPaneShown is not read in fullscreen.
    if (isPaneClosedForFullscreen && e.origin.kind === 'plugin') {
      isNavigatorFocused = false
      return next(e)
    }
    await finishComment($)
    await update($, isPaneShown, () => false)
    isNavigatorFocused = false
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    observe(
      `scroll by=${e.by} offset=${e.offset} rows=${e.contentRows}/${e.bodyRows} ${e.origin.kind}${e.pointer ? ' wheel' : ''}`,
    )
    if (e.origin.kind !== 'person' || e.by === 0) return next(e)
    // The wheel or a trackpad over the pane (only they carry a pointer) moves
    // nothing: blocks are the keys' to move, and a wheel is reached for to
    // scroll the reply (#62). The window stays pinned, so ↑/↓ keep working.
    if (e.pointer) return next({ ...e, offset: 1 })
    // Home and End scroll by the whole tree (contentRows), a page key by the
    // window (bodyRows), an arrow by a row: Home/End jump to the first or last
    // block (#63). On a MacBook keyboard, Fn+← and Fn+→ send them.
    if (Math.abs(e.by) >= e.contentRows) {
      await moveSelection($, e.by < 0 ? -Infinity : Infinity)
      return next({ ...e, offset: 1 })
    }
    // A page key scrolls by more than a row: read further into the selected
    // block instead of moving to another (classic, #31).
    if (Math.abs(e.by) > 1) {
      blockOffset = Math.max(0, blockOffset + Math.sign(e.by) * Math.max(1, blockTextRows - 1))
      $.ui.invalidate('ui.render')
      return next({ ...e, offset: 1 })
    }
    await moveSelection($, e.by < 0 ? -1 : 1)
    return next({ ...e, offset: 1 })
  }).catch(($, e, next) => next(e))

  // The ring stops on the verbs and the comment field only, so ←→ walk them.
  // Inside the comment field ↑/↓ walk the ring too (AbovePromptInput binds
  // them), so a move off the open field onto anything that is not a verb is
  // sent to ✎ instead of refused: refusing left the ring stranded off the verbs.
  // Another element is redirected in the move itself. Claude Code's own stop on
  // the pane (no element) cannot be: the engine refuses a redirect of a move
  // that named none (#60). That move goes on as it is; the comment is finished
  // and focus sent to ✎ after it.
  on('ui.focus', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    observe(`pane focus → ${e.element ?? '(none)'} by ${e.origin.kind}`)
    const isField = e.element?.startsWith(COMMENT_PREFIX) ?? false
    const isVerb = e.element?.startsWith('verb-') ?? false
    const wasField = (await read($, isCommenting)) && !isField
    const isEngineStop = e.element === undefined
    const target = !isField && !isVerb && wasField && !isEngineStop ? 'verb-comment' : e.element
    const isStop = target === undefined || target.startsWith('verb-') || isField
    if (!isStop) return { deny: 'synaptik: not a stop' }
    const result = await next(target === e.element ? e : { ...e, element: target })
    // Finish the comment only once the ring has left the field: removing the
    // field while it still holds the ring loses the move, and ←→ with it.
    if (!result.deny && !isField) {
      // Not awaited: a focus move from inside this hook would wait on the move
      // it is part of.
      if (wasField && isEngineStop) void leaveComment($)
      else await finishComment($)
    }
    if (!result.deny) {
      await update($, focusedVerb, () => target ?? '')
    }
    // The navigator taking the keyboard — by the entry key, its tab or a click —
    // raises this with origin 'plugin' (its autoFocus). Re-propose then: the
    // prompt box keeps the last suggestion proposed, and another mod may have
    // replaced ours meanwhile (issue #12).
    if (!result.deny && e.origin.kind === 'plugin' && target === VERBS[0].key) {
      isNavigatorFocused = true
      void suggestTray($)
    }
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface !== 'terminal') return next(e)
    // Fullscreen has no navigator (D41). A pane opened before the mod knew it was
    // fullscreen (at session start) closes on its first drawing.
    if (e.viewport?.isFullscreen) {
      isFullscreen = true
      closePaneForFullscreen($)
      return next(e)
    }
    const { Box, Text, Button, Input, Markdown } = $.ui.resolve(e)

    const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
    const sel = await read($, selected)
    const marked = await read($, marks)
    const seed = await read($, commentSeed)
    const seq = await read($, commentSeq)
    const commented = (await read($, comments)) as Record<number, string>
    const isTyping = await read($, isCommenting)
    const working = await read($, isWorking)

    // No reply yet (a new session; the first reply not finished): one line, no
    // counter and no keys — never "Block 1 of 0" (#73). A turn under way still
    // draws "Waiting for the reply" below.
    if (blocks.length === 0 && !working) {
      isNavigatorFocused = false
      return EmptyView({ Box, Text })
    }

    if (e.props.isFocused !== isNavigatorFocused) {
      isNavigatorFocused = e.props.isFocused
      // Re-propose on leaving. Entering is handled by ui.focus: a pane hidden
      // behind another mod's tab is not redrawn, so this flag can miss a
      // round trip through another pane.
      if (!isNavigatorFocused) void suggestTray($)
      $.ui.invalidate('ui.render')
    }
    const rows = Math.max(6, e.props.scroll.bodyRows)
    const counts = glyphCounts(marked)
    const heading = working
      ? 'Waiting for the reply...'
      : counts
        ? `Your notes · ${counts}`
        : 'Nothing marked yet'
    // The navigator's actions, for the views (views/navigator.tsx).
    const actions: NavigatorActions = {
      up: () => moveSelection($, -1),
      verb: key => runVerb($, key),
      end: async () => {
        // q, as Esc: the keyboard leaves the pane. A mod cannot move it, so the
        // actions are drawn anew and the one holding it disappears.
        await finishComment($)
        paneGeneration += 1
        observe(`pane q: actions redrawn as generation ${paneGeneration}`)
        $.ui.invalidate('ui.render')
      },
    }
    // The comment field — visible: only the field knows where its cursor is (its
    // events carry the text, never the cursor, and ←/→ raise none).
    // Several lines (#16): ⏎ stages, Shift+⏎ or a backslash before ⏎ starts a
    // new line. It grows with its lines up to FIELD_MAX_ROWS, then scrolls with
    // its cursor; the block above gives up the rows.
    // At least two rows: a one-row Input is Claude Code's single-line field, where
    // ⏎ always submits.
    const fieldRows = isTyping ? Math.max(2, Math.min(FIELD_MAX_ROWS, (commented[sel] ?? seed).split('\n').length)) : 1
    const field = (
      <Input
        key={commentKey(seq)}
        placeholder="comment"
        submitLabel={COMMENT_HINT}
        rows={fieldRows}
        value={seed}
        onInput={async value => {
          const before = (await read($, comments))[sel] ?? ''
          // Backspace on an already empty line, if the surface reports it.
          if (value === '' && before === '') return cancelComment($, sel)
          await writeTray($, tray => draftComment(tray, sel, value))
        }}
        onSubmit={async value => {
          await writeTray($, tray => draftComment(tray, sel, value))
          // Moving focus off the field finishes the comment (ui.focus):
          // staged with text, dropped when empty.
          await leaveComment($)
        }}
      />
    )

    // Classic (#31): the pane sits above the prompt — the one surface that
    // stays current there; fullscreen has none (D41). Show the selected
    // block itself, in full, with its neighbours, menu and comment.
    if (!working) {
      const all = segment(await read($, lastText))
      let crumb = ''
      let k = -1
      for (const seg of all) {
        if (!seg.isBlock) crumb = seg.text.replace(/^#+\s*/, '')
        else if (++k === sel) break
      }
      const width = Math.max(10, e.props.bodyColumns - 2)
      const textRows = Math.max(1, rows - 6 - (fieldRows - 1))
      blockTextRows = textRows
      const current = blocks[sel]
      const estimated = drawnRows(current?.text ?? '', width)
      blockOffset = Math.min(blockOffset, Math.max(0, estimated - textRows))
      const prev = blocks[sel - 1]
      const nextBlock = blocks[sel + 1]
      const mark = marked[sel]
      return ClassicView(
        { Box, Text, Button, Markdown },
        {
          rows,
          heading,
          crumb,
          barHeights: minimap(blocks.map(b => b.text.length), Math.max(blocks.length, rows - 2)),
          // One truncated line each; clipped, as only its start shows.
          previous: prev ? clip(quote(prev.text, 10_000), 500) : undefined,
          next: nextBlock ? clip(quote(nextBlock.text, 10_000), 500) : undefined,
          text: current?.text ?? '',
          glyph: mark ? GLYPH[mark] : undefined,
          // The block takes the rows it needs; spare rows are split between
          // after the header and before the footer, so the menu sits right
          // under it.
          blockRows: Math.max(1, Math.min(estimated, textRows)),
          blockOffset,
          comment: commented[sel] && mark === 'comment' ? commented[sel] : undefined,
          counter: blockCounter(sel, blocks.length),
          canReadOn: estimated > textRows + blockOffset || blockOffset > 0,
          generation: paneGeneration,
        },
        actions,
        isTyping ? field : undefined,
      )
    }

    return EmptyView({ Box, Text }, 'Waiting for the reply...')
  }).catch(($, e, next) => next(e))

  // --- The band: read-only. Says what you can do now, never names a component.
  //
  // The band is shared by every mod: a hook that answers without next(e) hides
  // every mod beneath it. Synaptik draws whatever the chain beneath returns and
  // adds its lines below it, last, just above the prompt — during a review too,
  // so another mod's buttons stay in the band's ring (#171): `ctrl+x tab` is the
  // band's, not Synaptik's.

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    // Which transcript is on screen, for drawing an agent's replies (D51).
    if (e.props.view.agentId !== viewedAgent) {
      viewedAgent = e.props.view.agentId
      $.ui.invalidate('ui.render')
    }
    if (!(await read($, isOn)) || e.props.hasSurvey || e.props.isWorking) return next(e)
    if (e.surface !== 'terminal') return next(e)
    // An agent's transcript in view (opened from the tasks list): the reply
    // Synaptik holds isn't on screen, and the prompt box talks to that agent.
    // So the band steps aside, and a review running ends.
    if (e.props.view.agentId) {
      if (holder) releaseReview($)
      return next(e)
    }
    const target = await read($, lastText)
    if (!target) return next(e)

    if (e.viewport?.isFullscreen) isFullscreen = true
    const { Box, Text, Button } = $.ui.resolve(e)
    const blocks = segment(target).filter(s => s.isBlock)
    const sel = await read($, selected)
    const isShown = await read($, isPaneShown)
    const reviewing = isNavigatorFocused
    const key = ENTRY_CHORD
    const counted = glyphCounts(await read($, marks), Object.keys(summaries(await read($, threads))).length)
    const staged = summarizing.size > 0 ? [counted, `${THREAD_GLYPH} summarising…`].filter(Boolean).join(' · ') : counted
    const compiled = await compile($)
    const box = await $.prompt.read()

    // Under a "Synaptik" header, each line led by ⎿ as Claude Code nests its own
    // output, so with several mods in the band it is clear which lines are ours.
    // The last line, just above the prompt: what the keys do right now.
    // Inside a code block, and on one: its lines, and the key that steps in.
    const stepCounts = partCounts(await read($, lastText))
    const partName = partsOf(blocks[sel]?.text ?? '')?.kind === 'table' ? 'Row' : 'Line'
    const lineOf = held.review.line === undefined ? '' : `${partName} ${held.review.line + 1} of ${stepCounts[String(sel)] ?? 1}`
    const stepIn = stepCounts[String(sel)] ? ' · s step in' : ''
    const fullscreenAction =
      holder === 'band'
        ? lineOf
          ? `${lineOf} · j/k ${partName.toLowerCase()}s · ←→ actions · ⏎ apply · q step out`
          : `${blockCounter(sel, blocks.length)} · j/k blocks · ←→ actions · ⏎ apply${stepIn} · q done`
        : holder
          ? lineOf
            ? `${lineOf} · ↑↓ ${partName.toLowerCase()}s · ←→ actions · ⏎ apply · ⌫ unmark · q step out`
            : `${blockCounter(sel, blocks.length)} · ↑↓ blocks · ←→ actions · ⏎ apply · ⌫ unmark${stepIn} · q done`
          : `${key} to ${staged ? 'continue reviewing' : 'review the reply'}`
    const action = isFullscreen
      ? fullscreenAction
      : reviewing
        ? `${blockCounter(sel, blocks.length)} · ↑↓ blocks · tab/⇧tab actions · ⏎ apply · esc done`
        : `${key} to ${staged ? 'continue reviewing' : 'review the reply'}`
    const boxText = box.text.trim()
    // Taken: the box holds exactly the suggestion. Edited: it holds something
    // else (what to say then is an open decision; for now, the warning).
    const isTaken = boxText !== '' && boxText === compiled.trim()
    const isTyping = boxText !== '' && !isTaken
    const beneath = await next(e)
    bandRequestId = e.requestId
    // Fullscreen: the hint line is a Client, outside a review cycling between the
    // two ways in; a click on it starts the review and hands it the raw keys, so
    // ↑/↓ move between blocks (client/hint.tsx). It stays drawn during the review,
    // showing the legend: removing it would take the keyboard with it.
    const what = staged ? 'continue reviewing' : 'review the reply'
    const messages = holder ? [fullscreenAction] : [`${key} to ${what}`, `click here to ${what}`]
    const hint =
      isFullscreen && !isHintFaulted
        ? h('Client', {
            key: generational('band-hint', bandGeneration),
            module: './client/hint.tsx',
            props: { messages, everyMs: HINT_EVERY_MS },
          })
        : undefined
    const band = BandView(
      { Box, Text, Button },
      {
        beneath,
        columns: e.props.bodyColumns,
        staged,
        // During a review ⏎ applies an action: nothing to say about the prompt.
        stagedAs:
          holder || reviewing
            ? 'reviewing'
            : isTyping
              ? 'typed'
              : isTaken
                ? 'taken'
                : isSuggested && boxText === ''
                  ? 'suggested'
                  : 'plain',
        action,
        // The navigator not on screen (narrow terminal, or closed): the band
        // offers the press that opens it instead of the action line.
        isNavigatorShown: isShown || reviewing || isFullscreen,
        ...(hint ? { actionElement: hint } : {}),
        entryKey: key,
      },
      () => openPane($),
    )
    if (!isFullscreen) return band
    // Fullscreen's keyboard path (D41): the actions and j / k as the band's own
    // controls, and a comment opened from here typed in the band.
    const { Input } = $.ui.resolve(e)
    const open = holder === 'band' ? held.review.editing : undefined
    return BandKeysView(
      { Box, Button, Input },
      band,
      {
        generation: bandGeneration,
        hasControls: !isBandLettingGo,
        hasHotkeys: holder === 'band',
        ...(open ? { comment: { key: `${BAND_COMMENT_PREFIX}${bandCommentSeq}`, text: open.text } } : {}),
      },
      {
        move: by => bandMove($, by),
        step: () => steer($, { key: 's' }, 'band'),
        end: () => (held.review.line !== undefined ? steer($, { key: 'q' }, 'band') : releaseReview($)),
        verb: n => bandVerb($, n),
        type: text => bandComment($, text, false),
        submit: text => bandComment($, text, true),
      },
    )
  }).catch(($, e, next) => next(e))
}
