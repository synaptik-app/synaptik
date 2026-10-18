// SPIKE — throwaway code. Answers the questions in docs/SPEC.md §15, then is
// deleted. Not phase 1: no real segmentation, no real tray, no compile step.
//
// Layout under test (happy path: fullscreen, wide terminal):
//   reply   the selected block carries ▎, its mark, and the verb menu
//   pane    a narrow docked strip: ▲, a minimap of the blocks, ▼, the verbs.
//           Focused (ctrl+s): ↑↓ move blocks, ←→ walk verbs, ⏎ applies.
//   band    read-only: position, compiled preview, discard warning
//
//   /synaptik         toggle the whole mod (the kill switch, SPEC §12)
//   /synaptik log     show what the hooks observed

import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { SpikeMark } from '../types'
import { quote, segment } from '../src/spike-blocks'
import { lastTurnText } from '../src/spike-turn'
import { compile as compileTray, GLYPH } from '../src/spike-compile'

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
const entryKey = atom({ plugin: 'synaptik', key: 'entryKey' } as const, 'ctrl+x tab')
const commentSeq = atom({ plugin: 'synaptik', key: 'commentSeq' } as const, 0)

// Module variable, not $.state: a render hook may not write state. Lost on reload.
const observed: string[] = []
function observe(line: string) {
  observed.push(line)
  observed.splice(0, Math.max(0, observed.length - 60))
}

const VERBS = [
  { key: 'verb-accept', glyph: '✓', label: '✓ accept', hotkey: 'a' },
  { key: 'verb-reject', glyph: '✗', label: '✗ reject', hotkey: 'x' },
  { key: 'verb-comment', glyph: '✎', label: '✎ comment', hotkey: 'c' },
  { key: 'verb-discuss', glyph: '💬', label: '💬 discuss', hotkey: 'd' },
] as const
// Each opening of the comment field gets a fresh key: a field drawn again
// under the same key and the same value keeps what was typed last time.
const COMMENT_PREFIX = 'comment-'
const commentKey = (seq: number) => `${COMMENT_PREFIX}${seq}`

// The pane's tree is always bodyRows + 2 rows with its window pinned at offset
// 1, so ↑ and ↓ always have a row to scroll to and each raises ui.scroll with a
// direction. The band's focus ring cannot tell ↑ from ← (SPIKE: Q3).
const PANE = 'synaptik-map'
const PANE_ANCHOR = 'pane-anchor'
const PANE_COLUMNS = 4


// A navigator row is bar, space, glyph, space (4 cells), then the block's
// words and "..." (3 cells), sized to the pane's current width less a 2-cell
// margin, which keeps clear of the terminal's scrollbar.
const ROW_CHROME = 9

// Cells of each comment-field line taken by its submit hint (`⏎ ok`) and gaps.
const FIELD_CHROME = 7
const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n)}...` : text)
const ACCENT = 'cyan'

// The selected block's background: Claude Code's own text-selection colour, a
// theme key, so it follows /config's light or dark theme. Painted on the Box
// around the block's Markdown, which takes no background itself. The key is
// found in the binary, not the documented API; an unknown one would make the
// reply fall back to Claude Code's own drawing.
const SELECTED_BACKGROUND = 'selectionBg'

// Claude Code's reply frame, redrawn by the mod: a 2-cell left margin and the
// bullet on the reply's first line.
const MARGIN = 2
const BULLET = '⏺'

// The transcript row of the reply being marked, for revealing it when a block
// key cannot be scrolled to. Set while drawing; lost on reload.
let replyRequestId = ''

// The turn-duration row Claude Code draws after a turn (`✻ Cogitated for 19s`),
// the newest one seen. Scrolling it to the window's bottom brings the end of the
// reply above it into view — the reply itself, taller than the window, can only
// be scrolled to its top. Lost on reload.
let turnRowId = ''

// Whether the navigator holds the keyboard. Esc raises no ui.focus event, so
// the only reliable source is the navigator's own drawing (Pane isFocused);
// a drawing may not write state, so it lands here and asks for a redraw.
let isNavigatorFocused = false

// PREVIEW (classic layout, #31): the terminal's size, as last seen by a drawing;
// how far the selected block is scrolled inside the classic navigator (PgUp/
// PgDn); and how many rows its text area had at the last draw.
let screen = { columns: 120, rows: 40 }
let blockOffset = 0
let blockTextRows = 1
let askedRows = 0

// Whether the compiled prompt is the prompt box's dim suggestion right now
// (Tab takes it). Set from prompt.suggest's answer; the band words itself by it.
let isSuggested = false
const PLACEHOLDER = 'Give me a sec to read through this.'

// The band's header, and the lead of each line under it.
const TAGLINE = 'respond to the reply in place'
const NEST = '⎿  '

// PREVIEW (#31): the classic navigator's smallest height.
const CLASSIC_MIN_ROWS = 7

// The compiled prompt is proposed in the empty prompt box after every change,
// as Claude Code proposes its own: → or Tab takes it, the box is where it is
// edited and sent, ctrl+c clears it (SPIKE: send flow B).
async function suggestTray($: EngineInterface) {
  try {
    const text = await compile($)
    if (!text) {
      // Nothing staged. There is no call to withdraw a suggestion, a blank one
      // cannot show, and emptying the box does not dismiss it — so replace ours
      // with something harmless to send, which guesses nothing about intent.
      if (isSuggested) {
        const shown = await $.prompt.suggest({ text: ` ${PLACEHOLDER}` })
        observe(`suggest placeholder: ${JSON.stringify(shown)}`)
      }
      isSuggested = false
      $.ui.invalidate('ui.render')
      return
    }
    // The box draws its cursor over a suggestion's first cell, hiding it; a
    // leading space takes the cursor so the first mark glyph stays visible.
    const shown = await $.prompt.suggest({ text: ` ${text}` })
    isSuggested = shown.isShown
    observe(`suggest ${text.split('\n').length} lines: ${JSON.stringify(shown)}`)
    $.ui.invalidate('ui.render')
  } catch (err) {
    observe(`suggest failed: ${String(err)}`)
  }
}


// Reads the last assistant reply from the transcript. A different reply than
// the one marked so far starts a fresh tray; the same one (a reload) keeps it.
async function adoptLastReply($: EngineInterface) {
  // The whole last turn, not its last message: text before a tool call is a
  // separate message and was left unmarkable.
  const messages = await $.session.messages()
  const text = lastTurnText(messages)
  observe(`adopt ${messages.length} messages, picked ${text.length} chars`)
  if (text !== (await read($, lastText))) {
    await update($, lastText, () => text)
    // Start on the last block: a long reply leaves the terminal at its end, so
    // that is the block already on screen. Review runs upwards from there.
    const count = segment(text).filter(s => s.isBlock).length
    await update($, selected, () => Math.max(0, count - 1))
    await update($, marks, () => ({}))
    await update($, comments, () => ({}))
    await update($, isCommenting, () => false)
  }
  if (text) await openPane($)
}

// Opened unasked (a new reply, a reload) the pane waits undrawn below 144
// columns; opened from the person's press it is placed at any width. When it
// waits or is closed, the band offers that press.
// Rows the classic (inline) navigator asks for: the tallest block's estimated
// lines plus its six fixed rows (header, previous, menu, comment, next,
// footer), between a floor and a third of the screen. Decided once per reply,
// so the pane does not change height while navigating (each change would shift
// the screen, and the classic renderer redraws by erasing what it printed).
// The dock ignores it.
function classicRows(text: string): number {
  const width = Math.max(20, screen.columns - 8)
  const tallest = Math.max(
    1,
    ...segment(text)
      .filter(b => b.isBlock)
      .map(b => drawnRows(b.text, width)),
  )
  return Math.max(CLASSIC_MIN_ROWS, Math.min(tallest + 6, Math.floor(screen.rows / 3)))
}

// Rows a block takes when Claude Code draws it `width` wide, estimated: a table
// as drawn (a border line around and between its rows), a code block without its
// fence lines, prose wrapped by length.
function drawnRows(text: string, width: number): number {
  const lines = text.split('\n')
  if (lines.every(l => l.trim().startsWith('|'))) {
    const rows = lines.filter(l => !/^\s*\|[\s:|-]+\|\s*$/.test(l)).length
    return 2 * rows + 1
  }
  const body = /^\s*(```|~~~)/.test(lines[0] ?? '') ? lines.slice(1, -1) : lines
  return body.reduce((n, l) => n + Math.max(1, Math.ceil(l.length / width)), 0)
}

async function openPane($: EngineInterface) {
  const rows = classicRows(await read($, lastText))
  askedRows = rows
  const opened = await $.ui.open({ id: PANE, title: 'Synaptik', columns: PANE_COLUMNS, rows })
  await update($, isPaneShown, () => opened.isPlaced)
  const pinned = await $.ui.scroll({ in: PANE, to: { key: PANE_ANCHOR }, block: 'start' })
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
  // The transcript can be scrolled to a whole row only, never to a block in a
  // reply, and a reply taller than the window always lands on its top. So:
  // entering the first third of the blocks brings the reply's top into view;
  // entering the last third brings the row after it (the turn's duration) to the
  // window's bottom, which shows the reply's end. The middle is the person's to
  // scroll (the wheel, PgUp/PgDn).
  const now = await read($, selected)
  const topThird = Math.ceil(count / 3)
  const bottomThird = count - Math.ceil(count / 3)
  if (replyRequestId && now < topThird && before >= topThird) {
    const shown = await $.ui.scroll({ to: { requestId: replyRequestId }, block: 'start' })
    observe(`reveal reply top: ${JSON.stringify(shown)}`)
  }
  if (now >= bottomThird && before < bottomThird) {
    if (!turnRowId) return observe('reveal reply end: no turn row seen')
    const shown = await $.ui.scroll({ to: { requestId: turnRowId }, block: 'end' })
    observe(`reveal reply end via ${turnRowId.slice(0, 12)}: ${JSON.stringify(shown)}`)
  }
}

async function toggle($: EngineInterface, i: number, mark: SpikeMark) {
  await update($, marks, m => {
    const copy = { ...m }
    if (copy[i] === mark) delete copy[i]
    else copy[i] = mark
    return copy
  })
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
  const moved = await $.ui.focus({ requestId: PANE, key: commentKey(await read($, commentSeq)) })
  observe(`focus comment-input: ${JSON.stringify(moved)}`)
}

// Drops the block's comment and its mark and returns to the menu.
async function cancelComment($: EngineInterface, i: number, refocus = true) {
  await update($, comments, c => {
    const copy = { ...c }
    delete copy[i]
    return copy
  })
  await update($, marks, m => {
    const copy = { ...m }
    if (copy[i] === 'comment') delete copy[i]
    return copy
  })
  if (refocus) return leaveComment($)
  await update($, isCommenting, () => false)
  await suggestTray($)
}

// Hands focus from the comment field back to ✎ in the menu before the field
// goes, so the ring keeps a stop and ←→ keep working.
async function leaveComment($: EngineInterface) {
  const moved = await $.ui.focus({ requestId: PANE, key: 'verb-comment' })
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
  if (text.trim() === '') return cancelComment($, i, false)
  await update($, marks, m => ({ ...m, [i]: 'comment' as const }))
  await update($, isCommenting, () => false)
  await suggestTray($)
}

// The compiled prompt: src/spike-compile.ts, over the adopted reply's blocks.
async function compile($: EngineInterface): Promise<string> {
  const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
  return compileTray(blocks, await read($, marks), (await read($, comments)) as Record<number, string>)
}

async function sendTray($: EngineInterface) {
  const text = await compile($)
  if (!text) return
  await $.prompt.submit({ text, asUser: true })
  await update($, marks, () => ({}))
  await update($, comments, () => ({}))
}

// The key that focuses the band and panes: the person's own binding for
// abovePrompt:focus if they made one, else Claude Code's default. A plain read
// of their file; the mod never writes it.
async function readEntryKey($: EngineInterface) {
  try {
    const home = await $.env.get('HOME')
    const file = JSON.parse(await $.fs.read(`${home}/.claude/keybindings.json`)) as {
      bindings?: { context?: string; bindings?: Record<string, string | null> }[]
    }
    const chat = (file.bindings ?? []).filter(b => b.context === 'Chat')
    const key = chat
      .flatMap(b => Object.entries(b.bindings ?? {}))
      .find(([, action]) => action === 'abovePrompt:focus')?.[0]
    if (key) await update($, entryKey, () => key)
  } catch {
    // No file, or not JSON: keep the default.
  }
}

// "2 accepted · 1 rejected · 1 comment", zero counts left out.
async function summary($: EngineInterface): Promise<string> {
  const marked = Object.values(await read($, marks))
  const commented = (await read($, comments)) as Record<number, string>
  const count = (m: SpikeMark) => marked.filter(x => x === m).length
  const notes = Object.entries(await read($, marks)).filter(
    ([i, m]) => m === 'comment' && commented[Number(i)]?.trim(),
  ).length
  return [
    count('accept') && `${count('accept')} accepted`,
    count('reject') && `${count('reject')} rejected`,
    notes && `${notes} comment${notes === 1 ? '' : 's'}`,
  ]
    .filter(Boolean)
    .join(' · ')
}

// Rows per block in the minimap, proportional to each block's length and at
// least one, scaled into `rows`. Happy path: assumes blocks <= rows.
function minimap(lengths: number[], rows: number): number[] {
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  const spare = Math.max(0, rows - lengths.length)
  const shares = lengths.map(len => (len / total) * spare)
  const heights = shares.map(share => 1 + Math.floor(share))
  // Hand the rows lost to rounding down to the largest remainders, so the
  // column fills `rows` exactly instead of leaving space at the bottom.
  let left = rows - heights.reduce((a, b) => a + b, 0)
  const byRemainder = shares
    .map((share, i) => [share - Math.floor(share), i] as const)
    .sort((a, b) => b[0] - a[0])
  for (const [, i] of byRemainder) {
    if (left <= 0) break
    heights[i]! += 1
    left -= 1
  }
  return heights
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'synaptik',
      description: 'Synaptik spike: toggle, or `log` for observations',
    })
    await readEntryKey($)
    // A resumed session (and every reload of this mod) already has a reply.
    await adoptLastReply($)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('command.run', { command: 'synaptik' }, async ($, e) => {
    if ((e.args ?? '').trim() === 'log') {
      return { text: observed.join('\n') || '(nothing observed yet)' }
    }
    await update($, isOn, v => !v)
    return { text: `synaptik spike: ${(await read($, isOn)) ? 'on' : 'off'}` }
  })

  // While a turn runs, a new reply is on its way and will replace the tray
  // (SPEC §5), so marking is off: the reply and the band draw as vanilla.
  on('turn.start', async ($, e, next) => {
    isSuggested = false
    await update($, isWorking, () => true)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    await adoptLastReply($)
    await update($, isWorking, () => false)
    return next(e)
  }).catch(($, e, next) => next(e))

  // The row after a turn, remembered so the reply's end can be scrolled into
  // view. Drawn by Claude Code unchanged.
  on('ui.render', { component: 'TurnDuration' }, ($, e, next) => {
    if (e.requestId !== turnRowId) {
      turnRowId = e.requestId
      observe(`turn row ${e.requestId.slice(0, 12)}`)
    }
    return next(e)
  }).catch(($, e, next) => next(e))

  // --- The reply: the selected block's marker and in-place menu -------------

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!(await read($, isOn)) || (await read($, isWorking))) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)

    const text = e.props.text
    const target = await read($, lastText)
    if (text.trim() === '' || !target.includes(text.trim())) return next(e)

    replyRequestId = e.requestId
    if (e.viewport) screen = { columns: e.viewport.columns, rows: e.viewport.rows }
    const { Box, Text, Button, Markdown } = $.ui.resolve(e)
    const segments = segment(text)
    // Where this piece's blocks start in the whole reply, so numbering runs
    // across the pieces of a reply split around tool calls.
    const offset = segment(target.slice(0, target.indexOf(text.trim()))).filter(s => s.isBlock).length
    const sel = await read($, selected)
    const marked = await read($, marks)
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
    const isMarkedHere = Object.keys(marked).some(k => Number(k) >= offset && Number(k) < offset + pieceBlocks)
    const isTypingHere = isTyping && sel >= offset && sel < offset + pieceBlocks
    if (!isNavigatorFocused && !isMarkedHere && !isTypingHere) return next(e)

    // The mod draws the reply itself, so it redraws Claude Code's frame too: the
    // top margin, the 2-cell left margin, and the ⏺ bullet on the reply's first
    // line. A mark's glyph sits in that margin, so marking moves nothing.
    // Wrapping Claude Code's own drawing per block was tried: next(e) returns an
    // opaque handle ({ type: 'engine', ref }), its spacing and margin baked in,
    // so blocks drawn one by one gained gaps and lost the margin.
    const margin = (glyph: string) => (
      <Box width={MARGIN} flexShrink={0}>
        <Text>{glyph}</Text>
      </Box>
    )
    let index = offset - 1
    return (
      <Box flexDirection="column" marginTop={1}>
        {segments.map((seg, n) => {
          const bullet = n === 0 && e.props.isFirstOfReply ? BULLET : ''
          if (!seg.isBlock) {
            return (
              <Box flexDirection="row" marginTop={seg.hasGapBefore ? 1 : 0}>
                {margin(bullet)}
                <Box flexGrow={1}>
                  <Markdown text={seg.text} />
                </Box>
              </Box>
            )
          }
          index += 1
          const i = index
          const isSelected = i === sel
          // Background and menu only while the navigator holds the keyboard:
          // after Esc the reply reads as a plain reply again.
          const isShownSelected = isSelected && isNavigatorFocused
          const mark = marked[i]
          const isEditing = isSelected && isTyping

          return (
            <Box flexDirection="column" marginTop={seg.hasGapBefore ? 1 : 0}>
              <Box flexDirection="row">
                {margin(mark ? GLYPH[mark] : bullet)}
                <Box
                  flexGrow={1}
                  paddingLeft={seg.depth * 3}
                  backgroundColor={isShownSelected ? SELECTED_BACKGROUND : undefined}
                >
                  <Markdown text={seg.text} />
                </Box>
              </Box>
              {isShownSelected && (
                <Box flexDirection="row" paddingLeft={MARGIN + seg.depth * 3}>
                  <Text dimColor>└ </Text>
                  {VERBS.map(v => (
                    <Button
                      key={v.key}
                      label={v.label}
                      variant={cursor === v.key ? 'primary' : undefined}
                      dimColor={cursor !== v.key}
                      onPress={() => runVerb($, v.key)}
                    />
                  ))}
                </Box>
              )}
              {isEditing || (commented[i] && mark === 'comment') ? (
                <Box paddingLeft={MARGIN + seg.depth * 3 + 2}>
                  <Text dimColor>→ {commented[i] ?? ''}</Text>
                </Box>
              ) : null}
            </Box>
          )
        })}
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // --- The pane: minimap, ↑↓ via scroll, ←→ via the focus ring ---------------

  on('ui.close', { id: PANE }, async ($, e, next) => {
    observe(`pane closed by ${e.origin.kind}`)
    await finishComment($)
    await update($, isPaneShown, () => false)
    isNavigatorFocused = false
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    observe(`scroll by=${e.by} offset=${e.offset} rows=${e.contentRows}/${e.bodyRows} ${e.origin.kind}`)
    if (e.origin.kind !== 'person' || e.by === 0) return next(e)
    // A page key scrolls by more than a row: read further into the selected
    // block instead of moving to another (classic preview, #31).
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
  // them), so a move off the open field onto anything that is not a verb —
  // another button, or Claude Code's own stop on the pane (no element) — is
  // sent to ✎ instead of refused: refusing left the ring stranded off the verbs.
  on('ui.focus', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    observe(`pane focus → ${e.element ?? '(none)'} by ${e.origin.kind}`)
    const isField = e.element?.startsWith(COMMENT_PREFIX) ?? false
    const isVerb = e.element?.startsWith('verb-') ?? false
    const wasField = (await read($, isCommenting)) && !isField
    const target = !isField && !isVerb && wasField ? 'verb-comment' : e.element
    const isStop = target === undefined || target.startsWith('verb-') || isField
    if (!isStop) return { deny: 'synaptik: not a stop' }
    const result = await next(target === e.element ? e : { ...e, element: target })
    // Finish the comment only once the ring has left the field: removing the
    // field while it still holds the ring loses the move, and ←→ with it.
    if (!result.deny && !isField) await finishComment($)
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
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Button, Input, Markdown } = $.ui.resolve(e)
    const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
    const sel = await read($, selected)
    const marked = await read($, marks)
    const seed = await read($, commentSeed)
    const seq = await read($, commentSeq)
    const commented = (await read($, comments)) as Record<number, string>
    const isTyping = await read($, isCommenting)
    const working = await read($, isWorking)

    observe(`pane drawn ${e.props.placement} ${e.props.bodyColumns}×${e.props.scroll.bodyRows} focused=${e.props.isFocused}`)
    if (e.props.isFocused !== isNavigatorFocused) {
      isNavigatorFocused = e.props.isFocused
      // Re-propose on leaving. Entering is handled by ui.focus: a pane hidden
      // behind another mod's tab is not redrawn, so this flag can miss a
      // round trip through another pane.
      if (!isNavigatorFocused) void suggestTray($)
      $.ui.invalidate('ui.render')
    }
    const rows = Math.max(6, e.props.scroll.bodyRows)
    const words = Math.max(4, e.props.bodyColumns - ROW_CHROME)
    const counts = (['accept', 'reject', 'comment'] as const)
      .map(m => [m, Object.values(marked).filter(x => x === m).length] as const)
      .filter(([, n]) => n > 0)
      .map(([m, n]) => `${GLYPH[m]}${n}`)
      .join(' ')
    const heading = working
      ? 'Waiting for the reply...'
      : counts
        ? `Your notes · ${counts}`
        : 'Nothing marked yet'
    // Everything but the heading and position rows, less one row for each
    // comment, which may need a row of its own under a one-row block.
    const commentRows = Object.entries(marked).filter(
      ([i, m]) => m === 'comment' && commented[Number(i)]?.trim(),
    ).length
    // Rows for the comment field while it is open: as many as its text wraps
    // to, so the whole comment — and the cursor, wherever it is — stays in view.
    // The field reports no cursor position, so a window around the cursor is not
    // possible; showing all of it is. Capped at half the pane.
    // The field shares each line with its submit hint (`⏎ ok`, drawn beside
    // it while focused) and wraps at word boundaries, so a line holds well under
    // the pane's width: estimate generously, plus a row of margin.
    const fieldText = commented[sel] ?? seed
    const fieldWidth = Math.max(4, e.props.bodyColumns - FIELD_CHROME)
    const fieldRows = isTyping
      ? Math.min(
          Math.max(1, Math.floor(rows / 2)),
          Math.ceil((fieldText.length * 1.25) / fieldWidth) + 1,
        )
      : 0
    // The comment field — visible: only the field knows where its cursor is (its
    // events carry the text, never the cursor, and ←/→ raise none).
    const field = (
        <Input
          key={commentKey(seq)}
          placeholder="comment"
          submitLabel="ok"
          value={seed}
          onInput={async value => {
            const before = (await read($, comments))[sel] ?? ''
            observe(`comment input ${JSON.stringify(value)} (was ${JSON.stringify(before)})`)
            // Backspace on an already empty line, if the surface reports it.
            if (value === '' && before === '') return cancelComment($, sel)
            await update($, comments, c => ({ ...c, [sel]: value }))
          }}
          onSubmit={async value => {
            await update($, comments, c => ({ ...c, [sel]: value }))
            // Moving focus off the field finishes the comment (ui.focus):
            // staged with text, dropped when empty.
            await leaveComment($)
          }}
        />
    )

    // PREVIEW (#31): the classic renderer places the pane inline, above the
    // prompt — the one surface that stays current there. Show the selected
    // block itself, in full, with its neighbours, menu and comment.
    if (e.props.placement === 'inline' && !working) {
      const all = segment(await read($, lastText))
      let crumb = ''
      let k = -1
      for (const seg of all) {
        if (!seg.isBlock) crumb = seg.text.replace(/^#+\s*/, '')
        else if (++k === sel) break
      }
      const width = Math.max(10, e.props.bodyColumns - 2)
      const textRows = Math.max(1, rows - 6)
      observe(
        `classic pane ${e.props.bodyColumns}×${rows} (asked ${askedRows}, screen ${screen.columns}×${screen.rows}) · text rows ${textRows}`,
      )
      blockTextRows = textRows
      const current = blocks[sel]
      const estimated = drawnRows(current?.text ?? '', width)
      blockOffset = Math.min(blockOffset, Math.max(0, estimated - textRows))
      // The block takes the rows it needs; spare rows are split between after
      // the header and before the footer, so the menu sits right under it.
      const blockRows = Math.max(1, Math.min(estimated, textRows))
      const hasMore = estimated > textRows + blockOffset
      const prev = blocks[sel - 1]
      const nextBlock = blocks[sel + 1]
      const mark = marked[sel]
      const barHeights = minimap(blocks.map(b => b.text.length), Math.max(blocks.length, rows - 2))
      return (
        <Box flexDirection="column" height={rows + 2} overflow="hidden">
          <Text> </Text>
          <Box flexDirection="column" height={rows} overflow="hidden">
            <Box flexDirection="row">
              <Button key={PANE_ANCHOR} plain dimColor label="▲" onPress={() => moveSelection($, -1)} />
              <Text dimColor wrap="truncate">
                {' '}
                {heading}
                {crumb ? `  § ${crumb}` : ''}
              </Text>
            </Box>
            {/* Between header and footer: the bars, no accent colour, beside
                the selected block, its neighbours, menu and comment. */}
            <Box flexDirection="row" height={rows - 2} overflow="hidden">
            <Box flexDirection="column" width={2} flexShrink={0} overflow="hidden">
              {blocks.map((_, i) =>
                // A block viewer, not a navigator: a quiet left edge.
                Array.from({ length: barHeights[i] ?? 1 }, () => <Text dimColor>│</Text>),
              )}
            </Box>
            <Box flexDirection="column" flexGrow={1}>
              <Box flexGrow={1} />
              <Text dimColor wrap="truncate">
                {prev ? `↑ ${quote(prev.text, 10_000)}` : ' '}
              </Text>
              <Box flexDirection="row" height={blockRows} overflow="hidden">
                <Text>{mark ? GLYPH[mark] : ' '} </Text>
                <Box flexDirection="column" flexGrow={1} overflow="hidden">
                  <Box flexDirection="column" marginTop={-blockOffset}>
                    <Markdown text={current?.text ?? ''} />
                  </Box>
                </Box>
              </Box>
              <Box flexDirection="row">
                {VERBS.map((v, n) => (
                  <Button
                    key={v.key}
                    label={v.label}
                    hotkey={v.hotkey}
                    autoFocus={n === 0 ? true : undefined}
                    onPress={() => runVerb($, v.key)}
                  />
                ))}
                <Box display="none">
                  <Button key="send" plain hotkey="s" label="send" onPress={() => sendTray($)} />
                </Box>
              </Box>
              {isTyping ? (
                field
              ) : (
                <Text dimColor wrap="truncate">
                  {commented[sel] && mark === 'comment' ? `→ ${commented[sel]}` : '→'}
                </Text>
              )}
              <Text dimColor wrap="truncate">
                {nextBlock ? `↓ ${quote(nextBlock.text, 10_000)}` : ' '}
              </Text>
              <Box flexGrow={1} />
            </Box>
            </Box>
            <Text dimColor wrap="truncate">
              ▼ Block {sel + 1} of {blocks.length}
              {hasMore || blockOffset > 0 ? ' · PgUp/PgDn to read on' : ''}
            </Text>
          </Box>
          <Text> </Text>
        </Box>
      )
    }

    const mapRows = Math.max(blocks.length, rows - 2 - commentRows - fieldRows)
    const heights = minimap(
      blocks.map(b => b.text.length),
      mapRows,
    )

    return (
      <Box flexDirection="column" height={rows + 2} overflow="hidden">
        <Text> </Text>
        <Box flexDirection="column" height={rows} overflow="hidden">
          <Box flexDirection="row">
            <Button key={PANE_ANCHOR} plain dimColor label="▲" onPress={() => moveSelection($, -1)} />
            <Text dimColor wrap="truncate">
              {' '}
              {clip(heading, words + 2)}
            </Text>
          </Box>
          {working ? (
            <Text dimColor>...</Text>
          ) : (
            blocks.map((_, i) => {
              const mark = marked[i]
              const isSelected = i === sel
              // Selected: a solid accent bar. Staged: a thick bar. The rest: thin
              // and dim. (Tracking which blocks the terminal shows was tried and
              // dropped: estimating rows from text was never steady enough.)
              const bar = isSelected ? '█' : mark ? '┃' : '│'
              // Only staged blocks carry words: one row with the mark and the
              // opening of the block, and the comment beneath. Each row is one
              // Text of fixed length; pieces side by side broke the layout.
              const span = heights[i] ?? 1
              // One row of words per staged block. Mirroring the reply line for
              // line was tried: the mod cannot see how the reply wraps, so the
              // lines never quite aligned.
              const opening = mark ? clip(quote(blocks[i]!.text, 10_000), words) : ''
              const comment = mark === 'comment' ? clip(commented[i]?.trim() ?? '', words - 2) : ''
              const tone = { color: isSelected ? ACCENT : undefined, dimColor: !isSelected && !mark }
              return (
                <Box flexDirection="column">
                  {/* The comment sits right under its block's first row: in the
                      block's own second row, or one more row when it has none. */}
                  {Array.from({ length: Math.max(span, comment ? 2 : 1) }, (_, row) => (
                    <Text {...tone} wrap="truncate">
                      {mark && row === 0
                        ? `${bar} ${GLYPH[mark]} ${opening}`
                        : comment && row === 1
                          ? `${bar}   → ${comment}`
                          : bar}
                    </Text>
                  ))}
                </Box>
              )
            })
          )}
          <Text dimColor wrap="truncate">
            ▼ {working ? '' : clip(`Block ${sel + 1} of ${blocks.length}`, words + 2)}
          </Text>
          {/* Focus stops for ←→ and the hotkeys, hidden: the reply's menu under
              the selected block is where the cursor shows. Always drawn, so
              focus has somewhere to land when the comment field closes. */}
          <Box display="none">
            {VERBS.map((v, n) => (
              <Button
                key={v.key}
                plain
                hotkey={v.hotkey}
                autoFocus={n === 0 ? true : undefined}
                label={v.glyph}
                onPress={() => runVerb($, v.key)}
              />
            ))}
            <Button key="send" plain hotkey="s" label="send" onPress={() => sendTray($)} />
          </Box>
          {isTyping && <Box>{field}</Box>}
        </Box>
        <Text> </Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // --- The band: read-only. Says what you can do now, never names a component.
  //
  // The band is shared by every mod: a hook that answers without next(e) hides
  // every mod beneath it. Outside review, Synaptik draws whatever the chain
  // beneath returns and adds its lines below it, last, just above the prompt.
  // While the navigator holds the keyboard the band is the key legend for that
  // mode, and Synaptik's stands alone (issue #12).

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!(await read($, isOn)) || e.props.hasSurvey || e.props.isWorking) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const target = await read($, lastText)
    if (!target) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const blocks = segment(target).filter(s => s.isBlock)
    const sel = await read($, selected)
    const isShown = await read($, isPaneShown)
    const reviewing = isNavigatorFocused
    const key = await read($, entryKey)
    const staged = await summary($)
    const compiled = await compile($)
    const box = await $.prompt.read()

    // Under a "Synaptik" header, each line led by ⎿ as Claude Code nests its own
    // output, so with several mods in the band it is clear which lines are ours.
    // The last line, just above the prompt: what the keys do right now.
    const action = reviewing
      ? `Block ${sel + 1} of ${blocks.length} · ↑↓ move · ←→ choose · ⏎ apply · esc done`
      : staged && isSuggested && box.text.trim() === ''
        ? `tab to take it into the prompt · ${key} to continue responding`
        : `${key} to ${staged ? 'continue responding' : 'respond in place'}`
    const boxText = box.text.trim()
    // Taken: the box holds exactly the suggestion. Edited: it holds something
    // else (what to say then is an open decision; for now, the warning).
    const isTaken = boxText !== '' && boxText === compiled.trim()
    const isTyping = boxText !== '' && !isTaken
    observe(
      `band shown=${isShown} reviewing=${reviewing} staged=${JSON.stringify(staged)} ` +
        `lines=${compiled ? compiled.split('\n').length : 0} maxRows=${e.props.maxRows} cols=${e.props.bodyColumns}`,
    )
    const beneath = reviewing ? null : await next(e)

    // The tree beneath may hold Claude Code's own drawing (an engine node), and
    // an engine node under a Box with `width` is refused — the whole band then
    // falls back to Claude Code's own. So `width` sits only on Synaptik's lines.
    return (
      <Box flexDirection="column">
        {beneath}
        <Box flexDirection="column" width={e.props.bodyColumns}>
          <Text wrap="truncate">
            Synaptik<Text dimColor> · {TAGLINE}</Text>
          </Text>
          {staged &&
            (isTyping ? (
              <Text color="yellow" wrap="truncate">
                {NEST}
                {staged} staged · ⏎ sends only what you typed and drops them
              </Text>
            ) : isTaken ? (
              <Text wrap="truncate">
                {NEST}
                {staged} · ⏎ sends your feedback
              </Text>
            ) : (
              <Text wrap="truncate">
                {NEST}
                {staged}
              </Text>
            ))}
          {isShown || reviewing ? (
            <Text dimColor wrap="truncate">
              {NEST}
              {action}
            </Text>
          ) : (
            // Edge case, design deferred: the navigator is not on screen (narrow
            // terminal, or closed), so the band offers the press that opens it.
            <Box flexDirection="row">
              <Text dimColor>
                {NEST}
                {key}, then{' '}
              </Text>
              <Button key="open-pane" plain autoFocus label="⏎ to respond in place" onPress={() => openPane($)} />
            </Box>
          )}
        </Box>
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
