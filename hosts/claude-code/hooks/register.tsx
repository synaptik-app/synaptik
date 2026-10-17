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

const GLYPH: Record<SpikeMark, string> = { accept: '✓', reject: '✗', comment: '✎' }
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

const blockKey = (i: number) => `block-${i}`

// A navigator row is bar, space, glyph, space (4 cells), then the block's
// words and "..." (3 cells), sized to the pane's current width less a 2-cell
// margin, which keeps clear of the terminal's scrollbar.
const ROW_CHROME = 9
const clip = (text: string, n: number) => (text.length > n ? `${text.slice(0, n)}...` : text)
const ACCENT = 'cyan'

// The selected block's background: Claude Code's own text-selection colour, a
// theme key, so it follows /config's light or dark theme. Painted on the Box
// around the block's Markdown, which takes no background itself. The key is
// found in the binary, not the documented API; an unknown one would make the
// reply fall back to Claude Code's own drawing.
const SELECTED_BACKGROUND = 'selectionBg'

// The transcript row of the reply being marked, for revealing it when a block
// key cannot be scrolled to. Set while drawing; lost on reload.
let replyRequestId = ''

// Whether the navigator holds the keyboard. Esc raises no ui.focus event, so
// the only reliable source is the navigator's own drawing (Pane isFocused);
// a drawing may not write state, so it lands here and asks for a redraw.
let isNavigatorFocused = false

// Whether the compiled prompt is the prompt box's dim suggestion right now
// (Tab takes it). Set from prompt.suggest's answer; the band words itself by it.
let isSuggested = false
const PLACEHOLDER = 'Give me a sec to read through this.'

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

// Assistant rows the engine writes itself, never the model: a resumed session
// ends with one. SessionMessage carries no flag for them, so match the text.
const SYNTHETIC = new Set(['No response requested.'])

// Reads the last assistant reply from the transcript. A different reply than
// the one marked so far starts a fresh tray; the same one (a reload) keeps it.
async function adoptLastReply($: EngineInterface) {
  const messages = await $.session.messages()
  const last = [...messages]
    .reverse()
    .find(m => m.role === 'assistant' && m.text.trim() && !SYNTHETIC.has(m.text.trim()))
  const text = last?.text ?? ''
  observe(`adopt ${messages.length} messages, picked ${text.length} chars`)
  if (text !== (await read($, lastText))) {
    await update($, lastText, () => text)
    await update($, selected, () => 0)
    await update($, marks, () => ({}))
    await update($, comments, () => ({}))
    await update($, isCommenting, () => false)
  }
  if (text) await openPane($)
}

// Opened unasked (a new reply, a reload) the pane waits undrawn below 144
// columns; opened from the person's press it is placed at any width. When it
// waits or is closed, the band offers that press.
async function openPane($: EngineInterface) {
  const opened = await $.ui.open({ id: PANE, title: 'Synaptik', columns: PANE_COLUMNS })
  await update($, isPaneShown, () => opened.isPlaced)
  const pinned = await $.ui.scroll({ in: PANE, to: { key: PANE_ANCHOR }, block: 'start' })
  observe(`pane open ${JSON.stringify(opened)} · pin ${JSON.stringify(pinned)}`)
}

// Moves the selection and brings the block into view in the transcript. The
// transcript only scrolls while answering the person's own input.
async function moveSelection($: EngineInterface, by: number) {
  await finishComment($)
  const count = segment(await read($, lastText)).filter(s => s.isBlock).length
  await update($, selected, s => Math.max(0, Math.min(count - 1, s + by)))
  const key = blockKey(await read($, selected))
  const shown = await $.ui.scroll({ to: { key } })
  observe(`reveal ${key}: ${JSON.stringify(shown)}`)
  if (shown.deny && replyRequestId) {
    const reply = await $.ui.scroll({ to: { requestId: replyRequestId } })
    observe(`reveal reply ${replyRequestId.slice(0, 12)}: ${JSON.stringify(reply)}`)
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

async function compile($: EngineInterface): Promise<string> {
  const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
  const marked = await read($, marks)
  const commented = (await read($, comments)) as Record<number, string>
  const lines = blocks.flatMap((b, i) => {
    const m = marked[i]
    if (!m || (m === 'comment' && !commented[i]?.trim())) return []
    const tail = m === 'comment' ? ` → ${commented[i]}` : ''
    return [`${'    '.repeat(b.depth)}${GLYPH[m]} "${quote(b.text)}"${tail}`]
  })
  return lines.join('\n')
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

  // --- The reply: the selected block's marker and in-place menu -------------

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    if (!(await read($, isOn)) || (await read($, isWorking))) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)

    const text = e.props.text
    const target = await read($, lastText)
    if (text.trim() === '' || !target.includes(text.trim())) return next(e)

    replyRequestId = e.requestId
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

    let index = offset - 1
    // Lines up with Claude Code's own drawing: no column of our own, and the
    // top margin its reply rows carry. A 4-cell gutter made the reply read as a
    // child of the row above it (a tool call's output).
    return (
      <Box flexDirection="column" marginTop={1}>
        {segments.map(seg => {
          if (!seg.isBlock) {
            return (
              <Box marginTop={seg.hasGapBefore ? 1 : 0}>
                <Markdown text={seg.text} />
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
                {/* Only a marked block gets a 2-cell glyph column, so unmarked
                    blocks line up exactly with Claude Code's drawing. A glyph
                    placed absolutely in the margin was clipped. */}
                {mark ? <Text>{GLYPH[mark]} </Text> : null}
                <Box
                  flexGrow={1}
                  paddingLeft={seg.depth * 3}
                  backgroundColor={isShownSelected ? SELECTED_BACKGROUND : undefined}
                >
                  <Markdown text={seg.text} />
                </Box>
              </Box>
              {isShownSelected && (
                <Box flexDirection="row" paddingLeft={seg.depth * 3}>
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
                <Box paddingLeft={seg.depth * 3 + 2}>
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
    await moveSelection($, e.by < 0 ? -1 : 1)
    return next({ ...e, offset: 1 })
  }).catch(($, e, next) => next(e))

  // The ring stops on the verbs and the comment field only, so ←→ walk them.
  on('ui.focus', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    observe(`pane focus → ${e.element ?? '(none)'} by ${e.origin.kind}`)
    const isField = e.element?.startsWith(COMMENT_PREFIX) ?? false
    const isStop = e.element === undefined || e.element.startsWith('verb-') || isField
    if (!isStop) return { deny: 'synaptik: not a stop' }
    const result = await next(e)
    // Finish the comment only once the ring has left the field: removing the
    // field while it still holds the ring loses the move, and ←→ with it.
    if (!result.deny && !isField) await finishComment($)
    if (!result.deny) {
      await update($, focusedVerb, () => e.element ?? '')
    }
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Button, Input } = $.ui.resolve(e)
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
      const hasLeft = isNavigatorFocused && !e.props.isFocused
      isNavigatorFocused = e.props.isFocused
      if (hasLeft) void suggestTray($)
      else isSuggested = false
      $.ui.invalidate('ui.render')
    }
    const rows = Math.max(6, e.props.scroll.bodyRows)
    const words = Math.max(4, e.props.bodyColumns - ROW_CHROME)
    const counts = (['accept', 'reject', 'comment'] as const)
      .map(m => [m, Object.values(marked).filter(x => x === m).length] as const)
      .filter(([, n]) => n > 0)
      .map(([m, n]) => `${GLYPH[m]}${n}`)
      .join(' ')
    const heading = counts ? `Your notes · ${counts}` : 'Nothing marked yet'
    // Everything but the heading and position rows, less one row for each
    // comment, which may need a row of its own under a one-row block.
    const commentRows = Object.entries(marked).filter(
      ([i, m]) => m === 'comment' && commented[Number(i)]?.trim(),
    ).length
    // A row for the comment field while it is open.
    const mapRows = Math.max(blocks.length, rows - 2 - commentRows - (isTyping ? 1 : 0))
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
            ▼ {clip(`Block ${sel + 1} of ${blocks.length}`, words + 2)}
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
          {isTyping && (
            // Visible: only the field knows where its cursor is (its events carry
            // the text, never the cursor, and ←/→ raise none), so it is shown
            // here; the reply mirrors the full text under the block.
            <Box>
              <Input
                key={commentKey(seq)}
                label="✎"
                placeholder="comment"
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
            </Box>
          )}
        </Box>
        <Text> </Text>
      </Box>
    )
  }).catch(($, e, next) => next(e))

  // --- The band: read-only. Says what you can do now, never names a component.

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

    // Bottom line, just above the prompt: what the keys do right now.
    const action = reviewing
      ? `Block ${sel + 1} of ${blocks.length} · ↑↓ move · ←→ choose · ⏎ apply · esc done`
      : staged && isSuggested && box.text.trim() === ''
        ? `Synaptik · tab to take it into the prompt · ${key} to continue responding`
        : `Synaptik · ${key} to ${staged ? 'continue responding' : 'respond in place'}`
    const boxText = box.text.trim()
    // Taken: the box holds exactly the suggestion. Edited: it holds something
    // else (what to say then is an open decision; for now, the warning).
    const isTaken = boxText !== '' && boxText === compiled.trim()
    const isTyping = boxText !== '' && !isTaken
    observe(
      `band shown=${isShown} reviewing=${reviewing} staged=${JSON.stringify(staged)} ` +
        `lines=${compiled ? compiled.split('\n').length : 0} maxRows=${e.props.maxRows} cols=${e.props.bodyColumns}`,
    )

    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        {staged &&
          (isTyping ? (
            <Text color="yellow">{staged} staged · ⏎ sends only what you typed and drops them</Text>
          ) : isTaken ? (
            <Text>{staged} · ⏎ sends your feedback</Text>
          ) : (
            <Text>{staged}</Text>
          ))}
        {isShown || reviewing ? (
          <Text dimColor wrap="truncate">{action}</Text>
        ) : (
          // Edge case, design deferred: the navigator is not on screen (narrow
          // terminal, or closed), so the band offers the press that opens it.
          <Box flexDirection="row">
            <Text dimColor>Synaptik · {key}, then </Text>
            <Button key="open-pane" plain autoFocus label="⏎ to respond in place" onPress={() => openPane($)} />
          </Box>
        )}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
