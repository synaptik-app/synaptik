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
const COMMENT_INPUT = 'comment-input'

// The pane's tree is always bodyRows + 2 rows with its window pinned at offset
// 1, so ↑ and ↓ always have a row to scroll to and each raises ui.scroll with a
// direction. The band's focus ring cannot tell ↑ from ← (SPIKE: Q3).
const PANE = 'synaptik-map'
const PANE_ANCHOR = 'pane-anchor'
const PANE_COLUMNS = 4

const blockKey = (i: number) => `block-${i}`
const ACCENT = 'cyan'

// The transcript row of the reply being marked, for revealing it when a block
// key cannot be scrolled to. Set while drawing; lost on reload.
let replyRequestId = ''

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

function toggle($: EngineInterface, i: number, mark: SpikeMark) {
  return update($, marks, m => {
    const copy = { ...m }
    if (copy[i] === mark) delete copy[i]
    else copy[i] = mark
    return copy
  })
}

async function runVerb($: EngineInterface, verb: string) {
  const i = await read($, selected)
  if (verb === 'verb-accept') return toggle($, i, 'accept')
  if (verb === 'verb-reject') return toggle($, i, 'reject')
  if (verb === 'verb-discuss') return $.ui.toast('discuss: phase 2')
  const existing = (await read($, comments))[i] ?? ''
  await update($, commentSeed, () => existing)
  await update($, isCommenting, () => true)
  const moved = await $.ui.focus({ requestId: PANE, key: COMMENT_INPUT })
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
  return lines.length ? ['Re your last message:', ...lines].join('\n') : ''
}

async function sendTray($: EngineInterface) {
  const text = await compile($)
  if (!text) return
  await $.prompt.submit({ text, asUser: true })
  await update($, marks, () => ({}))
  await update($, comments, () => ({}))
}

// Rows per block in the minimap, proportional to each block's length and at
// least one, scaled into `rows`. Happy path: assumes blocks <= rows.
function minimap(lengths: number[], rows: number): number[] {
  const total = lengths.reduce((a, b) => a + b, 0) || 1
  const spare = Math.max(0, rows - lengths.length)
  return lengths.map(len => 1 + Math.floor((len / total) * spare))
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'synaptik',
      description: 'Synaptik spike: toggle, or `log` for observations',
    })
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
    const sel = await read($, selected)
    const marked = await read($, marks)
    const commented = (await read($, comments)) as Record<number, string>
    const isTyping = await read($, isCommenting)
    const cursor = await read($, focusedVerb)

    let index = -1
    return (
      <Box flexDirection="column">
        {segments.map(seg => {
          if (!seg.isBlock) {
            return (
              <Box marginTop={seg.hasGapBefore ? 1 : 0} paddingLeft={4}>
                <Markdown text={seg.text} />
              </Box>
            )
          }
          index += 1
          const i = index
          const isSelected = i === sel
          const mark = marked[i]

          return (
            <Box flexDirection="column" marginTop={seg.hasGapBefore ? 1 : 0}>
              <Box flexDirection="row">
                <Button key={blockKey(i)} plain label=" " onPress={() => update($, selected, () => i)} />
                <Box width={1} backgroundColor={isSelected ? ACCENT : undefined} />
                <Text color={isSelected ? ACCENT : undefined}> {mark ? GLYPH[mark] : ' '} </Text>
                <Box flexGrow={1} paddingLeft={seg.depth * 2}>
                  <Markdown text={seg.text} />
                </Box>
              </Box>
              {isSelected && (
                <Box flexDirection="row" paddingLeft={1}>
                  <Text color={ACCENT}>└ </Text>
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
              {(isSelected && isTyping) || (commented[i] && mark === 'comment') ? (
                <Box paddingLeft={4}>
                  <Text dimColor>
                    ✎ {commented[i] ?? ''}
                    {isSelected && isTyping ? '▏' : ''}
                  </Text>
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
    const isStop =
      e.element === undefined || e.element.startsWith('verb-') || e.element === COMMENT_INPUT
    if (!isStop) return { deny: 'synaptik: not a stop' }
    if (e.element !== COMMENT_INPUT) await finishComment($)
    const result = await next(e)
    if (!result.deny) await update($, focusedVerb, () => e.element ?? '')
    return result
  }).catch(($, e, next) => next(e))

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const { Box, Text, Button, Input } = $.ui.resolve(e)
    const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
    const sel = await read($, selected)
    const marked = await read($, marks)
    const seed = await read($, commentSeed)
    const isTyping = await read($, isCommenting)
    const working = await read($, isWorking)

    observe(`pane drawn ${e.props.placement} ${e.props.bodyColumns}×${e.props.scroll.bodyRows} focused=${e.props.isFocused}`)
    const rows = Math.max(6, e.props.scroll.bodyRows)
    const mapRows = Math.max(blocks.length, rows - 5)
    const heights = minimap(
      blocks.map(b => b.text.length),
      mapRows,
    )

    return (
      <Box flexDirection="column" height={rows + 2} overflow="hidden">
        <Text> </Text>
        <Box flexDirection="column" height={rows} overflow="hidden">
          <Button key={PANE_ANCHOR} plain dimColor label="▲" onPress={() => moveSelection($, -1)} />
          {working ? (
            <Text dimColor>…</Text>
          ) : (
            blocks.map((_, i) => {
              const mark = marked[i]
              const isSelected = i === sel
              return (
                <Box flexDirection="column">
                  {Array.from({ length: heights[i] ?? 1 }, (_, row) => (
                    <Text color={isSelected ? ACCENT : undefined} dimColor={!isSelected} wrap="truncate">
                      {isSelected ? '█' : '│'}
                      {row === 0 && mark ? ` ${GLYPH[mark]}` : ''}
                    </Text>
                  ))}
                </Box>
              )
            })
          )}
          <Text dimColor>▼</Text>
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
            // Hidden too: the text shows under the block as it is typed.
            <Box display="none">
              <Input
                key={COMMENT_INPUT}
                placeholder="✎"
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

  // --- The band: read-only ----------------------------------------------------

  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (!(await read($, isOn)) || e.props.hasSurvey || e.props.isWorking) return next(e)
    if (e.surface !== 'terminal' && e.surface !== 'desktop') return next(e)
    const target = await read($, lastText)
    if (!target) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const blocks = segment(target).filter(s => s.isBlock)
    const sel = await read($, selected)
    const isShown = await read($, isPaneShown)
    const compiled = await compile($)
    const count = compiled ? compiled.split('\n').length - 1 : 0
    const box = await $.prompt.read()

    return (
      <Box flexDirection="column" width={e.props.bodyColumns}>
        <Box flexDirection="row">
          <Text dimColor>
            synaptik · {sel + 1}/{blocks.length} · {count} marks ·{' '}
            {isShown ? 'ctrl+s to mark · s in the pane sends' : 'ctrl+s then '}
          </Text>
          {!isShown && (
            <Button key="open-pane" plain autoFocus label="⏎ open the pane" onPress={() => openPane($)} />
          )}
        </Box>
        {count > 0 && box.text.trim() !== '' && (
          <Text color="yellow">{count} marks staged · ⏎ sends your text only — marks discarded</Text>
        )}
        {compiled && <Text dimColor>{compiled}</Text>}
      </Box>
    )
  }).catch(($, e, next) => next(e))
}
