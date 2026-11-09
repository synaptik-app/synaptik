# Navigation

## 10. Navigation

### Why a pane

Keyboard input reaches a mod only through a **focus ring**, and only two sites
have one: the band and panes. The reply never takes focus.

A focus ring is **linear**: Tab, ←/→ and ↑/↓ all mean "previous" or "next", and
`ui.focus` names only the element focus moves to, never the key. So inside the
band ↑ cannot be told from ←.

A pane can: there ↑/↓ are bound to **scrolling**, and `ui.scroll` carries a
signed direction (`by`). That was the only way to get ↑/↓ apart from ←/→ —
until the review moved into the reply in fullscreen (below): a `Client` takes
every key once clicked. **The pane is classic's** (D41).

### Stepping into a code block or table (#105)

A code block's or table's menu has a 5th action, `↳ step in`. Its parts are a code
block's lines or a table's data rows (not the header), and the band says `Row 2 of 3`
for a row; what follows holds for both. Inside it the selected line has
the background and the menu right under it, whose 5th action is `↰ step out`. Marks
on lines show in the margin during a review; outside one, a block with only marked
lines shows `✸`, and a block's own mark takes that place. Backspace on a block takes
its own mark, then, pressed again, its lines' marks. An included thread counts as
a mark here: the block's own goes out of the review first, then its lines' (D46). The band's hint says `Line 4 of
18`; no line numbers are drawn. Lines are for the keyboard: a click never selects
one (a mouse's partial mark belongs to text selection, #91). Fullscreen only.

### The navigator (classic)

A pane (id `synaptik-map`), opened when a reply is adopted — in classic only;
in fullscreen a pane opened before the mod knew is closed on its first drawing.
Its body is the block viewer (*The classic renderer*, below); while a turn runs,
`Waiting for the reply...`; before any reply, one line saying so (#73).

**The scroll trick.** The tree is always `bodyRows + 2` rows and its window is
pinned at offset 1, so ↑ and ↓ always have a row to scroll to. Each scroll key
moves the selection by its sign and the window back to offset 1. The keys are told
apart by `by`: an arrow scrolls a row, a page key `bodyRows`, Home and End
`contentRows` — so Home and End jump to the first and last block (#63).

**The wheel moves nothing in the navigator.** A wheel or trackpad over the pane
raises the same `ui.scroll`, told apart by its `pointer` (absent for the scroll
keys). It is passed back pinned at offset 1: blocks are moved by the keys, and
the wheel is for scrolling the reply, over the transcript (#62).

**The verb ring.** The four verbs are drawn in the pane hidden
(`display: none`); they still take focus and arm their hotkeys. A `ui.focus` hook
lets the ring stop on verbs and the comment field only. The menu under the
selected block in the reply shows which verb holds the ring.

**Comments** are typed into an `Input` shown in the pane — of several lines
(`rows`, #16: ⏎ stages, `\` then ⏎ starts a new line; the field says
`⏎ ok · \⏎ new line`), growing with
them to 3 rows and then scrolling with its cursor; the block viewer gives up the
rows. Visible, because only the field knows where its cursor is: its events carry the text, never the cursor,
and moving the cursor raises none. The text also shows under the block in the
reply as it is typed. Each opening of the field gets a fresh
`key` — a field redrawn under the same key and value keeps what was typed last
time. Leaving the field finishes the comment: with text it is staged, empty it is
dropped. `⏎` or backspace on an empty line cancels it.

### Keys

**Fullscreen** needs no setup:

| | With the mouse | With the keyboard |
|---|---|---|
| Start | click the band's hint (↑/↓ from there), then a block | `ctrl+x tab` |
| Move between blocks | ↑ / ↓, Home / End | `j` / `k` |
| Walk the actions | ← / → | ← / → |
| Apply the action under the cursor | ⏎, or click it | ⏎ |
| Apply an action directly | `a` `x` `c` `d` | `a` `x` `c` `d` |
| Take a block's mark off | Backspace | the same action again; a ✎ can't (#100) |
| Step into a code block, or out | `s` or its menu item | `s` |
| Move between its lines | ↑ / ↓, Home / End | `j` / `k` |
| Leave | `q` (Esc is not seen, #23) | `q` |

Inside a code block the actions apply to the selected line, and `q` steps out first,
then ends the review.

**The default renderer** (the pane):

| Key | Default (no setup) | With the recommended bindings |
|---|---|---|
| Enter the navigator | `ctrl+x tab` (`abovePrompt:focus`) | same |
| Move between blocks | ↑ / ↓ | same |
| First / last block | Home / End (`Fn+←` / `Fn+→` on a MacBook) | same |
| Walk the verbs | Tab / ⇧Tab | ← / → |
| Apply the verb under the cursor | ⏎ | same |
| Apply a verb directly | `a` `x` `c` `d` | same |
| Leave | Esc | same |

**A mod cannot ship key bindings,** and Synaptik doesn't touch the person's: the band names Claude Code's defaults (D32).

Esc raises no `ui.focus` event, so whether the navigator holds the keyboard is
read from its own drawing (`e.props.isFocused`) and passed to the band and reply
with a redraw.

### Following the selection in the transcript

`$.ui.scroll({ to: { key } })` does not find elements drawn inside a transcript
message, so the transcript scrolls only to **whole rows** (`to: { requestId }`),
which counts as the person's input when a navigator key caused it. A reply
taller than the window always lands on its **top**, whatever the alignment. So:

- **Review starts on the last block.** A long reply leaves the terminal at its
  end, so the last block is the one already on screen; review runs upwards.
- **Into the first third** of the blocks: the reply is scrolled to its top.
- **Into the last third:** the row Claude Code draws after the turn
  (`TurnDuration`, `✻ … for Ns`) is scrolled to the window's bottom, which shows
  the reply's end just above it. Its id is remembered from its own render hook,
  which passes it through unchanged.
- **The middle third** is the person's to scroll (wheel, PgUp/PgDn).

⚠️ The newest turn row seen is used; a turn drawn without one would scroll to an
older turn's row.

The navigator does not follow the terminal's own scrolling: blocks move by the
keys only, and the wheel scrolls the reply (D37). In a reply taller than about
two screens the middle cannot be brought into view by the mod; the person scrolls
there, and Home/End give the two ends (#64).

### Opening the navigator

A pane opened unasked waits undrawn below 144 terminal columns (110 for an id the
person has opened before), and a module reload closes it. When it is not on
screen, the band's action line becomes a button — `ctrl+x tab, then ⏎ to review
the reply` — since an open answering the person's press is placed at any width.

⚠️ This case is an edge case with its design deferred, as is the navigator's
inline layout below 110 columns, where a vertical map does not fit.

---

### The `/synaptik` command (D39)

| Command | Does |
|---|---|
| `/synaptik` | opens the navigator — also when Claude Code held it back (§10, *Opening the navigator*) |
| `/synaptik help` | lists the commands and what each does |
| `/synaptik on` / `off` | the kill switch (§12), this session only; `/plugin` disables the mod for good |
| `/synaptik log` | what the hooks observed |

---
