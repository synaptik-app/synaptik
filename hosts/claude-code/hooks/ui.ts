// What the hooks and the views share, with no `$` in it: the actions, the pane's
// keys, and the sizes and colours the drawings use. Claude Code's mod loader
// follows `$` only into functions in the same file, so everything that touches
// it stays in register.tsx; views (hooks/views/) take plain data and callbacks.

export const VERBS = [
  { key: 'verb-accept', glyph: '✓', label: '✓ accept', hotkey: 'a' },
  { key: 'verb-reject', glyph: '✗', label: '✗ reject', hotkey: 'x' },
  { key: 'verb-comment', glyph: '✎', label: '✎ comment', hotkey: 'c' },
  { key: 'verb-discuss', glyph: '💬', label: '💬 discuss', hotkey: 'd' },
] as const
// Each opening of the comment field gets a fresh key: a field drawn again
// under the same key and the same value keeps what was typed last time.
// The band's j / k hotkeys in fullscreen (D41): hotkeys, never ring stops.
export const NEXT_BLOCK = 'block-next'
export const PREVIOUS_BLOCK = 'block-previous'
// The band's q hotkey: ends the review (Esc would, but a mod never sees it).
export const END_REVIEW = 'review-end'

// The band's controls are keyed per generation: ending a review draws them under
// fresh keys, so the one holding the keyboard disappears and Claude Code hands
// the keyboard back to the prompt (a mod cannot move it there). `@<n>` after the
// base key; the first generation has none.
export const generational = (key: string, generation: number) => (generation ? `${key}@${generation}` : key)
export const baseKey = (key: string) => key.split('@')[0] ?? key
// The comment field the band shows when a comment is opened from there.
export const BAND_COMMENT_PREFIX = 'band-comment-'

export const COMMENT_PREFIX = 'comment-'
export const commentKey = (seq: number) => `${COMMENT_PREFIX}${seq}`

// The pane's tree is always bodyRows + 2 rows with its window pinned at offset
// 1, so ↑ and ↓ always have a row to scroll to and each raises ui.scroll with a
// direction. The band's focus ring cannot tell ↑ from ← (SPEC §10, *Why a pane*).
export const PANE = 'synaptik-map'
export const PANE_ANCHOR = 'pane-anchor'
export const PANE_COLUMNS = 4

export const ACCENT = 'cyan'

// The selected block's background: Claude Code's own text-selection colour, a
// theme key, so it follows /config's light or dark theme. Painted on the Box
// around the block's Markdown, which takes no background itself. The key is
// found in the binary, not the documented API; an unknown one would make the
// reply fall back to Claude Code's own drawing.
export const SELECTED_BACKGROUND = 'selectionBg'

// Claude Code's reply frame, redrawn by the mod: a 2-cell left margin and the
// bullet on the reply's first line.
export const MARGIN = 2
export const BULLET = '⏺'

// The longest reply piece Synaptik draws itself. One drawing holds 100,000
// characters in all, its markup included; a longer piece is left to Claude
// Code, which draws any length, and is reviewed from the navigator alone.
export const MAX_DRAWN = 90_000
