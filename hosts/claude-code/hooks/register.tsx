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
import { quote, segment } from '../src/blocks'
import { lastTurnText } from '../src/turn'
import { compile as compileTray, GLYPH } from '../src/compile'
import { draftComment, dropComment, EMPTY, finishComment as finishTrayComment, toggle as toggleMark } from '../src/tray'
import type { Tray } from '../src/tray'
import { DEFAULT_KEYS, keyLabel, keysFrom, parseKeyFile } from '../src/keys'
import type { KeyFile, Keys } from '../src/keys'
import { applySetup, changes, costs, currentSetup, DEFAULT_ENTRY, DEFAULT_VERBS } from '../src/keysetup'
import type { Setup } from '../src/keysetup'
import { keybindingsPath, shownPath } from '../src/configpath'
import { blockCounter } from '../src/counter'
import { classicRows, clip, drawnRows, minimap } from '../src/layout'
import { commentCount, glyphCounts, summary } from '../src/tally'
import {
  ACCENT,
  BULLET,
  COMMENT_PREFIX,
  commentKey,
  FIELD_CHROME,
  MARGIN,
  MAX_DRAWN,
  PANE,
  PANE_ANCHOR,
  PANE_COLUMNS,
  ROW_CHROME,
  SELECTED_BACKGROUND,
  VERBS,
} from './ui'
import { KeyMenuView } from './views/keymenu'
import { ClassicView, EmptyView, MapView } from './views/navigator'
import type { NavigatorActions } from './views/navigator'
import { ReplyView } from './views/reply'
import { BandView } from './views/band'
import type { KeyMenuModel } from './views/keymenu'
import type { ConfigEnv } from '../src/configpath'

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

// Synaptik draws only in the terminal renderer (D40): every render hook passes
// any other surface (the Desktop app, the mobile app, VS Code) to next(e).

// What happened, for `/synaptik log` and bug reports: events and failures —
// adopting, suggesting, scrolling and focus moves, comments, the key setup —
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
  '  /synaptik config   customize Synaptik',
  '  /synaptik log      what Synaptik observed, for bug reports',
  '  /synaptik help     this list',
].join('\n')

// The compiled prompt is proposed in the empty prompt box after every change,
// as Claude Code proposes its own: → or Tab takes it, the box is where it is
// edited and sent, ctrl+c clears it (SPEC §7, *Sending*).
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
    await writeTray($, () => EMPTY)
    await update($, isCommenting, () => false)
  }
  if (text) await openPane($)
}

// Opened unasked (a new reply, a reload) the pane waits undrawn below 144
// columns; opened from the person's press it is placed at any width. When it
// waits or is closed, the band offers that press.
async function openPane($: EngineInterface, focus = false) {
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

// The tray (src/tray.ts) as $.state holds it: two atoms, marks and comments.
async function readTray($: EngineInterface): Promise<Tray> {
  return { marks: await read($, marks), comments: (await read($, comments)) as Record<number, string> }
}

async function writeTray($: EngineInterface, change: (tray: Tray) => Tray) {
  const next = change(await readTray($))
  await update($, marks, () => ({ ...next.marks }))
  await update($, comments, () => ({ ...next.comments }))
}

async function toggle($: EngineInterface, i: number, mark: Mark) {
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

// The compiled prompt: src/compile.ts, over the adopted reply's blocks.
async function compile($: EngineInterface): Promise<string> {
  const blocks = segment(await read($, lastText)).filter(s => s.isBlock)
  const tray = await readTray($)
  return compileTray(blocks, tray.marks, tray.comments)
}

// The keys the band names (src/keys.ts), from the person's own keybindings.json
// (written only by `/synaptik config`, on Save: D38). Claude Code applies an
// edited file at once, so the band reads it again whenever its mtime changes.
// Module variable, not $.state: the band's render hook reads it.
let keyFile: { mtimeMs: number; keys: Keys } | undefined

async function currentKeys($: EngineInterface): Promise<Keys> {
  try {
    const path = await keyFilePath($)
    if (!path) throw new Error('no config folder')
    const { mtimeMs } = await $.fs.stat(path)
    if (keyFile?.mtimeMs !== mtimeMs) keyFile = { mtimeMs, keys: keysFrom(parseKeyFile(await $.fs.read(path))) }
    return keyFile.keys
  } catch {
    // No file: Claude Code's defaults.
    keyFile = undefined
    return DEFAULT_KEYS
  }
}

// The variables that place Claude Code's config folder (src/configpath.ts).
// Names written out: `claude plugin validate` lists what the mod reads.
async function configEnv($: EngineInterface): Promise<ConfigEnv> {
  return {
    CLAUDE_CONFIG_DIR: await $.env.get('CLAUDE_CONFIG_DIR'),
    HOME: await $.env.get('HOME'),
    USERPROFILE: await $.env.get('USERPROFILE'),
  }
}

// Where keybindings.json is, or undefined when no variable names a folder.
async function keyFilePath($: EngineInterface): Promise<string | undefined> {
  return keybindingsPath(await configEnv($))
}

// The person's keybindings.json, whole: `{}` when there is none yet,
// `undefined` when it is there but not JSON — the key setup then writes nothing.
async function readKeyFile($: EngineInterface, path: string): Promise<KeyFile | undefined> {
  let text: string
  try {
    text = String(await $.fs.read(path))
  } catch {
    return {} // no file yet: the setup creates it
  }
  try {
    const file = JSON.parse(text) as unknown
    return file !== null && typeof file === 'object' && !Array.isArray(file) ? (file as KeyFile) : undefined
  } catch {
    return undefined
  }
}

// The key setup (D38, `/synaptik config`): while it is open the navigator pane
// draws it instead of the map. A module variable, as the pane's own drawing
// ends it (Esc) and a render hook may not write state. Lost on reload.
type KeyMenu = {
  // The file as read when the menu opened, and the choice so far.
  file: KeyFile
  choice: Setup
  // A line for the person: why the save failed.
  note?: string
  // The file's path, and as the menu shows it (`~/.claude/keybindings.json`).
  path: string
  shown: string
  // Seen holding the keyboard: losing it after that is Esc.
  hasFocus: boolean
  // Where the person is: the list of rows, or one setting's options; the row
  // and option under the cursor; the setting whose options are open.
  view: 'rows' | 'options'
  row: number
  option: number
  editing?: 'entry' | 'verbs'
}
let keyMenu: KeyMenu | undefined

type MenuRow = 'entry' | 'verbs' | 'save' | 'cancel'
const MENU_ROWS: readonly MenuRow[] = ['entry', 'verbs', 'save', 'cancel']
const MENU_LABEL: Record<MenuRow, string> = {
  entry: 'Open Synaptik',
  verbs: 'Move between actions',
  save: 'Save',
  cancel: 'Cancel',
}

// One setting's choice as an option's value: the entry key, or the two
// action keys as `previous next`.
function currentValue(menu: KeyMenu, setting: 'entry' | 'verbs') {
  if (setting === 'entry') return menu.choice.entry ?? DEFAULT_ENTRY
  const verbs = menu.choice.verbs ?? DEFAULT_VERBS
  return `${verbs.previous} ${verbs.next}`
}

// One setting's choice as the row shows it.
function menuValue(menu: KeyMenu, setting: 'entry' | 'verbs') {
  if (setting === 'entry') return keyLabel(currentValue(menu, 'entry'))
  const verbs = menu.choice.verbs
  // The default as its option names it; otherwise previous / next.
  return verbs ? `${keyLabel(verbs.previous)} / ${keyLabel(verbs.next)}` : 'tab / ⇧tab'
}

// The options of the setting being edited: back to the rows (Esc cannot be
// that: it gives the keyboard to the prompt, and a mod cannot take it back),
// the presets, and the person's own key when the file binds one that is none
// of them, so a hand-made binding is never lost by opening the menu. Custom
// keys are a feature request: the presets only, for now (#80).
function menuOptions(menu: KeyMenu): { value: string; label: string }[] {
  const setting = menu.editing ?? 'entry'
  const now = currentValue(menu, setting)
  const presets =
    setting === 'entry'
      ? [
          { value: DEFAULT_ENTRY, label: `${DEFAULT_ENTRY} (default)` },
          { value: 'ctrl+s', label: 'ctrl+s' },
        ]
      : [
          { value: `${DEFAULT_VERBS.previous} ${DEFAULT_VERBS.next}`, label: 'tab / ⇧tab (default)' },
          { value: 'left right', label: '← / →' },
        ]
  const own = presets.some(p => p.value === now) ? [] : [{ value: now, label: menuValue(menu, setting) }]
  return [
    { value: 'back', label: '‹ back' },
    ...presets,
    ...own,
  ]
}

// ↑/↓ in the menu: the cursor, over the rows or the open setting's options.
function moveMenu(by: number) {
  const menu = keyMenu
  if (!menu) return
  const count = menu.view === 'rows' ? MENU_ROWS.length : menuOptions(menu).length
  if (menu.view === 'rows') menu.row = Math.max(0, Math.min(count - 1, menu.row + by))
  else menu.option = Math.max(0, Math.min(count - 1, menu.option + by))
}

// ⏎ in the menu: open a setting's options, take an option, save or cancel.
async function enterMenu($: EngineInterface) {
  const menu = keyMenu
  if (!menu) return
  if (menu.view === 'rows') {
    const row = MENU_ROWS[menu.row]!
    if (row === 'save') return saveKeyMenu($)
    if (row === 'cancel') return closeKeyMenu($)
    menu.editing = row
    menu.view = 'options'
    menu.option = Math.max(0, menuOptions(menu).findIndex(o => o.value === currentValue(menu, row)))
    observe(`key menu: options of ${row}`)
    return $.ui.invalidate('ui.render')
  }
  const setting = menu.editing!
  const picked = menuOptions(menu)[menu.option]!
  observe(`key menu: ${setting} picked ${picked.value}`)
  menu.view = 'rows'
  menu.note = undefined
  if (picked.value === 'back') {
    // Nothing chosen: the setting stays as it was.
  } else if (setting === 'entry') {
    menu.choice = { ...menu.choice, entry: picked.value === DEFAULT_ENTRY ? undefined : picked.value }
  } else {
    const [previous, nextKey] = picked.value.split(' ') as [string, string]
    const isDefault = previous === DEFAULT_VERBS.previous && nextKey === DEFAULT_VERBS.next
    menu.choice = { ...menu.choice, verbs: isDefault ? undefined : { previous, next: nextKey } }
  }
  $.ui.invalidate('ui.render')
}

async function openKeyMenu($: EngineInterface): Promise<string | undefined> {
  const env = await configEnv($)
  const path = keybindingsPath(env)
  if (!path) return "can't find Claude Code's config folder: CLAUDE_CONFIG_DIR, HOME and USERPROFILE are all unset. Nothing to edit."
  const file = await readKeyFile($, path)
  if (!file) return `can't read ${path}: it isn't JSON. Fix it by hand, then try again.`
  const shown = shownPath(path, env)
  keyMenu = { file, path, shown, choice: currentSetup(file), hasFocus: false, view: 'rows', row: 0, option: 0 }
  await openPane($, true)
  $.ui.invalidate('ui.render')
  return undefined
}

// Ends the key setup. With no reply to review (a new session: `/synaptik
// config` opens the pane all the same), the pane closes too, which hands the
// keyboard back to the prompt — an empty navigator is nothing to hold it (#73).
async function closeKeyMenu($: EngineInterface) {
  keyMenu = undefined
  if (!(await read($, lastText))) {
    await $.ui.close({ id: PANE }).catch((err: unknown) => observe(`close empty pane: ${String(err)}`))
  }
  $.ui.invalidate('ui.render')
}

// Writes the choice into the file as it is now, changing only the setup's own
// entries. Saving is the person's confirmation: the menu showed the changes.
async function saveKeyMenu($: EngineInterface) {
  const menu = keyMenu
  if (!menu) return
  const file = await readKeyFile($, menu.path)
  if (!file) {
    menu.note = "the file changed and isn't JSON any more: nothing written"
    return $.ui.invalidate('ui.render')
  }
  const after = applySetup(file, menu.choice)
  const changed = changes(file, after)
  if (changed.length) {
    try {
      await $.fs.write(menu.path, `${JSON.stringify(after, null, 2)}\n`)
    } catch (err) {
      // The menu stays, with the choice, and says why: a failed save is never silent.
      menu.note = `couldn't write ${menu.shown}: ${String(err)}`
      observe(`key setup failed to write ${menu.path}: ${String(err)}`)
      return $.ui.invalidate('ui.render')
    }
    observe(`key setup wrote ${menu.path}: ${changed.join(' | ')}`)
  }
  await $.ui.toast(changed.length ? 'Synaptik: keys saved' : 'Synaptik: no changes')
  await closeKeyMenu($)
}

// What the key setup's view draws (views/keymenu.tsx), from its state.
function keyMenuModel(menu: KeyMenu, bodyRows: number): KeyMenuModel {
  const after = applySetup(menu.file, menu.choice)
  return {
    view: menu.view,
    rows: MENU_ROWS.map((row, i) => ({
      text: `${MENU_LABEL[row]}${row === 'entry' || row === 'verbs' ? ` · ${menuValue(menu, row)}` : ''}`,
      isAt: i === menu.row,
      hasGapAfter: row === 'verbs',
    })),
    editing: menu.editing ? MENU_LABEL[menu.editing] : '',
    options: menuOptions(menu).map((option, i) => ({
      text: option.label,
      isAt: i === menu.option,
      isNow: option.value === currentValue(menu, menu.editing ?? 'entry'),
    })),
    note: menu.note,
    changed: changes(menu.file, after),
    costs: costs(menu.choice),
    shown: menu.shown,
    bodyRows,
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'synaptik',
      description: "Mark up the agent's reply in place · help for more",
      argumentHint: '[help|on|off|config|log]',
      // So `off` works while a turn runs, when a drawing gone wrong hurts most.
      immediate: true,
    })
    // A resumed session (and every reload of this mod) already has a reply.
    await adoptLastReply($)
    return next(e)
  }).catch(($, e, next) => next(e))

  // `/synaptik` and its subcommands (D39, SPEC §10).
  on('command.run', { command: 'synaptik' }, async ($, e, next) => {
    const args = (e.args ?? '').trim()
    if (args === '') {
      if (!(await read($, isOn))) return { text: 'off for this session · /synaptik on turns it back on' }
      if (!(await read($, lastText))) return { text: 'nothing to respond to yet — the navigator opens on the next reply' }
      await openPane($, true)
      return {}
    }
    if (args === 'help') return { text: HELP }
    if (args === 'on' || args === 'off') {
      const wanted = args === 'on'
      const was = await read($, isOn)
      await update($, isOn, () => wanted)
      // Redraw at once: the reply, band and navigator read it.
      $.ui.invalidate('ui.render')
      const now = wanted ? 'on' : 'off for this session'
      if (was === wanted) return { text: `already ${now}` }
      return { text: wanted ? 'on' : 'off for this session · /synaptik on turns it back on, /plugin disables it for good' }
    }
    if (args === 'log') return { text: observed.join('\n') || '(nothing observed yet)' }
    if (args === 'config') {
      if (!(await read($, isOn))) return { text: 'off for this session · /synaptik on turns it back on' }
      const refused = await openKeyMenu($)
      return refused ? { text: refused } : {}
    }
    return { text: `unknown: /synaptik ${args}\n\n${HELP}` }
  }).catch(($, e, next) => next(e))

  // While a turn runs, a new reply is on its way and will replace the tray
  // (SPEC §5), so marking is off: the reply and the band draw as vanilla.
  // Since Claude Code 2.1.300 these also hear subagents' and teammates' turns,
  // told apart by `e.agentId`: only the main loop's turn brings a new reply, so
  // only it switches marking off and on.
  on('turn.start', async ($, e, next) => {
    if (e.agentId) return next(e)
    isSuggested = false
    await update($, isWorking, () => true)
    return next(e)
  }).catch(($, e, next) => next(e))

  on('turn.complete', async ($, e, next) => {
    if (e.agentId) return next(e)
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
    if (e.surface !== 'terminal') return next(e)

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
            glyph: mark ? GLYPH[mark] : undefined,
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

  // --- The pane: minimap, ↑↓ via scroll, ←→ via the focus ring ---------------

  on('ui.close', { id: PANE }, async ($, e, next) => {
    observe(`pane closed by ${e.origin.kind}`)
    await finishComment($)
    await update($, isPaneShown, () => false)
    isNavigatorFocused = false
    return next(e)
  }).catch(($, e, next) => next(e))

  on('ui.scroll', { component: 'Pane', requestId: PANE }, async ($, e, next) => {
    // The key setup: ↑/↓ move its cursor, as they move the navigator's
    // selection; the wheel and the other scroll keys move nothing.
    if (keyMenu) {
      if (e.origin.kind === 'person' && !e.pointer && Math.abs(e.by) === 1) {
        moveMenu(e.by)
        $.ui.invalidate('ui.render')
      }
      return next(e.origin.kind === 'person' ? { ...e, offset: 1 } : e)
    }
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
    // The key setup's lists and buttons are all stops.
    if (keyMenu) return next(e)
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
    const { Box, Text, Button, Input, Markdown } = $.ui.resolve(e)

    // The key setup, drawn instead of the map while it is open. Esc gives the
    // keyboard back, and closes it unsaved.
    if (keyMenu) {
      const menu = keyMenu
      if (e.props.isFocused) menu.hasFocus = true
      else if (menu.hasFocus) {
        observe('key menu closed: the pane lost the keyboard (Esc?)')
        // A drawing can't wait on the close; the empty navigator below draws
        // meanwhile.
        void closeKeyMenu($)
      }
    }
    if (keyMenu) {
      isNavigatorFocused = false // the reply is not under review meanwhile
      return KeyMenuView({ Box, Text, Button }, keyMenuModel(keyMenu, e.props.scroll.bodyRows), () => enterMenu($))
    }
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
    const words = Math.max(4, e.props.bodyColumns - ROW_CHROME)
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
    }
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

    // Classic (#31): the classic renderer places the pane inline, above the
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
          // One truncated line each; clipped, since a Text over 10,000
          // characters is refused before Claude Code 2.1.304.
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
        },
        actions,
        isTyping ? field : undefined,
      )
    }

    // Everything but the heading and position rows, less one row for each
    // comment, which may need a row of its own under a one-row block.
    const commentRows = commentCount(marked, commented)
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
      ? Math.min(Math.max(1, Math.floor(rows / 2)), Math.ceil((fieldText.length * 1.25) / fieldWidth) + 1)
      : 0
    const heights = minimap(
      blocks.map(b => b.text.length),
      Math.max(blocks.length, rows - 2 - commentRows - fieldRows),
    )
    return MapView(
      { Box, Text, Button },
      {
        rows,
        heading: clip(heading, words + 2),
        isWorking: working,
        bars: blocks.map((block, i) => {
          const mark = marked[i]
          return {
            isSelected: i === sel,
            glyph: mark ? GLYPH[mark] : undefined,
            // One row of words per staged block. Mirroring the reply line for
            // line was tried: the mod cannot see how the reply wraps, so the
            // lines never quite aligned.
            opening: mark ? clip(quote(block.text, 10_000), words) : '',
            comment: mark === 'comment' ? clip(commented[i]?.trim() ?? '', words - 2) : '',
            span: heights[i] ?? 1,
          }
        }),
        counter: working ? '' : clip(blockCounter(sel, blocks.length), words + 2),
      },
      actions,
      isTyping ? field : undefined,
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
    if (e.surface !== 'terminal') return next(e)
    const target = await read($, lastText)
    if (!target) return next(e)

    const { Box, Text, Button } = $.ui.resolve(e)
    const blocks = segment(target).filter(s => s.isBlock)
    const sel = await read($, selected)
    const isShown = await read($, isPaneShown)
    const reviewing = isNavigatorFocused
    const keys = await currentKeys($)
    const key = keys.entry
    const staged = summary(await read($, marks), (await read($, comments)) as Record<number, string>)
    const compiled = await compile($)
    const box = await $.prompt.read()

    // Under a "Synaptik" header, each line led by ⎿ as Claude Code nests its own
    // output, so with several mods in the band it is clear which lines are ours.
    // The last line, just above the prompt: what the keys do right now.
    const action = keyMenu
      ? 'customizing Synaptik'
      : reviewing
      ? `${blockCounter(sel, blocks.length)} · ↑↓ move · ${keys.choose} choose · ⏎ apply · esc done`
      : staged && isSuggested && box.text.trim() === ''
        ? `tab to take it into the prompt · ${key} to continue responding`
        : `${key} to ${staged ? 'continue responding' : 'respond in place'}`
    const boxText = box.text.trim()
    // Taken: the box holds exactly the suggestion. Edited: it holds something
    // else (what to say then is an open decision; for now, the warning).
    const isTaken = boxText !== '' && boxText === compiled.trim()
    const isTyping = boxText !== '' && !isTaken
    const beneath = reviewing ? null : await next(e)
    return BandView(
      { Box, Text, Button },
      {
        beneath,
        columns: e.props.bodyColumns,
        staged,
        stagedAs: isTyping ? 'dropped' : isTaken ? 'taken' : 'plain',
        action,
        // The navigator not on screen (narrow terminal, or closed): the band
        // offers the press that opens it instead of the action line.
        isNavigatorShown: isShown || reviewing,
        entryKey: key,
      },
      () => openPane($),
    )
  }).catch(($, e, next) => next(e))
}
