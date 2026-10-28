// The key setup (D38): what the person has bound, the file a choice makes, the
// lines that change, and what a choice gives up. Plain data in and out; the
// hooks read and write ~/.claude/keybindings.json.

import { boundKey } from './keys'
import type { KeyFile } from './keys'

// The one setting: the keys that move between the actions in the default
// renderer's pane (`abovePrompt:previous` / `:next` in Pane), default Tab / ⇧Tab.
// `undefined` is Claude Code's own default: nothing bound. The key that opens
// Synaptik is not Synaptik's to set: ctrl+x tab is Claude Code's, and a key the
// person bound themselves stays theirs (#113).
export type Setup = {
  verbs?: { previous: string; next: string }
}

const PREVIOUS = { context: 'Pane', action: 'abovePrompt:previous' } as const
const NEXT = { context: 'Pane', action: 'abovePrompt:next' } as const

// Claude Code's own keys for these actions, bound when the file binds none.
export const DEFAULT_VERBS = { previous: 'shift+tab', next: 'tab' } as const

// The presets the menu offers (custom keys: #80).
export const VERB_PRESETS = [DEFAULT_VERBS, { previous: 'left', next: 'right' }] as const

// What the file binds now, as a Setup.
export function currentSetup(file: KeyFile): Setup {
  const previous = boundKey(file, PREVIOUS.context, PREVIOUS.action)
  const next = boundKey(file, NEXT.context, NEXT.action)
  return previous || next ? { verbs: { previous: previous ?? DEFAULT_VERBS.previous, next: next ?? DEFAULT_VERBS.next } } : {}
}

type Bindings = Record<string, string | null>

// The file with `setup` applied, and nothing else changed: the two actions lose
// every key bound to them, a default's own key loses an unbinding (null), and
// the chosen keys are added to the last Pane block (a new one at the end when
// there is none). Blocks left empty by a removal are dropped.
export function applySetup(file: KeyFile, setup: Setup): KeyFile {
  const blocks = (file.bindings ?? []).map(b => ({ ...b, bindings: { ...(b.bindings ?? {}) } as Bindings }))
  const touched = new Set<number>()
  const unbind = (context: string, action: string, defaultKey: string) =>
    blocks.forEach((b, i) => {
      if (b.context !== context) return
      for (const [key, bound] of Object.entries(b.bindings)) {
        if (bound === action || (key === defaultKey && bound === null)) {
          delete b.bindings[key]
          touched.add(i)
        }
      }
    })
  const bind = (context: string, key: string, action: string) => {
    let i = blocks.map(b => b.context).lastIndexOf(context)
    if (i < 0) i = blocks.push({ context, bindings: {} }) - 1
    blocks[i]!.bindings[key] = action
  }

  unbind(PREVIOUS.context, PREVIOUS.action, DEFAULT_VERBS.previous)
  unbind(NEXT.context, NEXT.action, DEFAULT_VERBS.next)
  if (setup.verbs && !isDefaultVerbs(setup.verbs)) {
    bind(PREVIOUS.context, setup.verbs.previous, PREVIOUS.action)
    bind(NEXT.context, setup.verbs.next, NEXT.action)
  }
  const kept = blocks.filter((b, i) => !touched.has(i) || Object.keys(b.bindings).length > 0)
  return { ...file, bindings: kept }
}

const isDefaultVerbs = (v: { previous: string; next: string }) =>
  v.previous === DEFAULT_VERBS.previous && v.next === DEFAULT_VERBS.next

// The entries that differ between two files, as the menu shows them before
// writing: `+ Pane  left → abovePrompt:previous`, `− Pane  tab → …`.
export function changes(before: KeyFile, after: KeyFile): string[] {
  const entries = (file: KeyFile) => {
    const all = new Map<string, string>()
    for (const b of file.bindings ?? []) {
      for (const [key, bound] of Object.entries(b.bindings ?? {})) {
        all.set(`${b.context ?? '?'}  ${key}`, bound === null ? '(unbound)' : bound)
      }
    }
    return all
  }
  const old = entries(before)
  const now = entries(after)
  const lines: string[] = []
  for (const [where, bound] of old) if (now.get(where) !== bound) lines.push(`− ${where} → ${bound}`)
  for (const [where, bound] of now) if (old.get(where) !== bound) lines.push(`+ ${where} → ${bound}`)
  return lines
}

// What a setup gives up, one short line each, for the menu to say before
// writing. `tip` lines are advice, not a cost.
export function costs(setup: Setup): { line: string; isTip?: true }[] {
  const notes: { line: string; isTip?: true }[] = []
  const verbs = setup.verbs
  if (verbs && [verbs.previous, verbs.next].some(k => k === 'left' || k === 'right')) {
    notes.push({ line: "← → will also move between buttons in other mods' panes" })
    notes.push({ line: 'Tip: ← on an empty prompt opens agent view (/config → leftArrowOpensAgents)', isTip: true })
  }
  return notes
}
