// The keys the band names, from the person's ~/.claude/keybindings.json (D32):
// the one that enters the navigator, and the ones that walk its verbs. Plain
// data in, labels out; the hooks read the file.

export type KeyFile = {
  bindings?: readonly { context?: string; bindings?: Readonly<Record<string, string | null>> }[]
}

export type Keys = {
  // Focuses the band and panes: `abovePrompt:focus` in the Chat context.
  entry: string
  // Walks the verbs in the navigator: abovePrompt:previous / :next in Pane.
  choose: string
}

// Claude Code's own defaults, when the file binds nothing: ctrl+x tab enters,
// Tab / Shift+Tab walk a pane's focus ring.
export const DEFAULT_KEYS: Keys = { entry: 'ctrl+x tab', choose: 'tab/⇧tab' }

// The key bound to `action` in `context`. Blocks apply in order, so a later
// binding of a key replaces an earlier one, and `null` unbinds it; of several
// keys still bound to the action, the last one counts.
export function boundKey(file: KeyFile, context: string, action: string): string | undefined {
  const keys = new Map<string, string | null>()
  for (const block of file.bindings ?? []) {
    if (block.context !== context) continue
    for (const [key, bound] of Object.entries(block.bindings ?? {})) {
      keys.delete(key)
      keys.set(key, bound)
    }
  }
  let found: string | undefined
  for (const [key, bound] of keys) if (bound === action) found = key
  return found
}

const GLYPHS: Record<string, string> = { left: '←', right: '→', up: '↑', down: '↓' }

// A binding as the band shows it: `left` → `←`, `shift+tab` → `⇧tab`. Other
// names and chords (`ctrl+x tab`) stay as written.
export function keyLabel(binding: string): string {
  return binding
    .split(' ')
    .map(step => {
      const parts = step.split('+')
      const key = parts.pop() ?? ''
      const mods = parts.map(m => (m === 'shift' ? '⇧' : `${m}+`)).join('')
      return mods + (GLYPHS[key] ?? key)
    })
    .join(' ')
}

export function keysFrom(file: KeyFile): Keys {
  const entry = boundKey(file, 'Chat', 'abovePrompt:focus')
  const previous = boundKey(file, 'Pane', 'abovePrompt:previous')
  const next = boundKey(file, 'Pane', 'abovePrompt:next')
  if (!previous && !next) return { entry: entry ?? DEFAULT_KEYS.entry, choose: DEFAULT_KEYS.choose }
  const back = previous ? keyLabel(previous) : '⇧tab'
  const forward = next ? keyLabel(next) : 'tab'
  const choose = back === '←' && forward === '→' ? '←→' : `${back}/${forward}`
  return { entry: entry ?? DEFAULT_KEYS.entry, choose }
}

// The file's text as Claude Code would take it: not JSON, or no list of
// bindings, binds nothing.
export function parseKeyFile(text: string): KeyFile {
  try {
    const file = JSON.parse(text) as unknown
    const isFile = file !== null && typeof file === 'object' && Array.isArray((file as KeyFile).bindings)
    return isFile ? (file as KeyFile) : {}
  } catch {
    return {}
  }
}
