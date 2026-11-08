# Navigation

### D20 — Modal navigation with visible controls on the selected block
**Status:** settled · added by 2026-10-13

Review is a mode: entered, moved through block by block, and left. **The selected
block shows its actions** as a row of real buttons with labels — hotkeys work too
(`a` `x` `c` `d`), for whoever learns them — so nothing must be memorized. The row
moves with the selection, so only one block's controls are on screen.

```
▎ Use Redis for the session cache
    [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
▏ Add a rate limiter
▏ Shard by tenant id
```

**A comment is typed in place** under its block — better than a popup, because
the text being commented on stays visible while typing.

**How keys reach the review depends on the renderer**, because a mod gets keys
only through a focus ring (the band's, a pane's) or a `Client` that was clicked:
- **Fullscreen (D41):** the review is in the reply. Once a block is clicked, the
  reply's `Client`s take the keys: ↑/↓ between blocks, ←/→ along the actions. From
  the keyboard, `ctrl+x tab` gives the review to the band, with `j` / `k` between
  blocks.
- **Classic (D31):** a pane, whose scrolling turns ↑/↓ into block moves; ←/→ or
  Tab walk the actions on its ring.

**Entering:** `ctrl+x tab`, Claude Code's `abovePrompt:focus`, or a key the person
binds to it (D32).

**A second level, for code and tables:** a code block or table gets **step in**
(D43, D44). Inside it, ↑/↓ move between lines or rows and the actions apply to the
selected one. Prose stays at block level: splitting a paragraph into sentences
breaks how it wraps.

#### Why it works this way

**No raw keys (Q3).** `ui.press` fires only for `Button`s. Keys reach a mod only
through a focus ring, which only the band and panes have — the reply never takes
focus. And a ring is **linear**: ↑, ←, ⇧Tab all mean "previous"; `ui.focus`
reports where focus goes, never which key sent it.

**A pane turns ↑/↓ into a direction.** In a pane ↑/↓ scroll, and `ui.scroll`
carries a signed direction. With the pane's tree kept two rows taller than its
window and the window pinned in the middle, every ↑/↓ is a direction signal; the
mod moves the selection and cancels the scroll. The band raises no scroll event
when it has nothing to scroll (tested 2026-10-18), and making it overflow would
take half the screen.

**The navigation model, A (#19):** the pane — ↑/↓ blocks, ←/→ verbs — over B (no
pane: every arrow moves blocks on the band's ring, verbs by letter keys). A won on
what the spike found, not on whether the pane earns its space: only a pane
separates ↑/↓ from ←/→; the classic renderer needs a pane regardless, since the
reply above cannot be redrawn once scrolled off (#11, #31); and a pane cannot be
taken by another mod (D33). Fullscreen later moved the review into the reply
(D41), where clicked `Client`s get the arrows directly.

`autoFocus` accepts only `true`, so focus is managed per render rather than by
flipping a prop off.

#### Tried and dropped

- **`Cmd+S` to enter:** the terminal emulator usually swallows Cmd combinations,
  and Cmd does not exist in Linux or Windows terminals. **`Ctrl+S`** is the
  classic terminal XOFF, which some terminals still honour.
- **Verbs and blocks on one band ring:** ↓ walked the verbs, then fell through to
  the next block. Confusing.
- **Borrowed Global actions for blocks** (`app:diffFileListUp/Down`, `ctrl`/`⌥` +
  ↑↓): did not fire on macOS — Mission Control takes `ctrl+↑`, and `⌥` needs the
  terminal's Option-as-Meta. Borrowing another feature's action is fragile anyway.
- **A bare digit from the empty prompt** to enter: it presses a band button, but
  `$.ui.focus` from there is refused; it did not give the band the keyboard.

**Revisions**
- **2026-10-13** — visible controls on the selected block, not hotkeys alone.
- **2026-10-15** — the spike: no raw keys, so ↑/↓ come from a pane's scrolling
  (D31); the entry key is a user binding (D32).
- **2026-10-18** — navigation model A, a pane in both renderers (#19).
- **2026-10-24** — a second level, step into, for code and tables (#105).
- **2026-10-27** — fullscreen reviews in the reply (D41); the pane only in
  classic.
- **2026-11-01** — step in built for code blocks (D43), then tables (D44).

---

### D31 — The navigator: a docked pane that maps the reply
**Status:** settled · added 2026-10-15

**In the classic renderer, a pane carries the review** (fullscreen has none: it
reviews in the reply, D41). It opens **inline**, full width, above the band, and
does two jobs:

1. **Keys** — the scroll trick for ↑/↓, the ring for ←/→ (D20). Its verb buttons
   are drawn hidden; the reply shows the cursor.
2. **A block viewer** (#31) — the selected block in full with its mark, menu and
   comment, its neighbours' opening words, the counts on top and the position at
   the bottom. The reply above cannot be redrawn once scrolled off, so the pane is
   the one surface that stays current. Sized once per reply; trimmed with
   PgUp/PgDn beyond a third of the screen.

**Limits found:** an unasked open waits undrawn below 144 columns; a module reload
closes it; the size a person sets is remembered and wins. Two things were tried and
dropped, both because the mod cannot see how the reply wraps: mirroring the reply
line for line, and highlighting the blocks the terminal shows (§11, item 16).

**Revisions**
- **2026-10-18** — the pane stays, in both renderers (#19, D20). In classic it is a
  block viewer (#31); fullscreen keeps a docked navigator: an overview, one bar per
  block sized by length, marks and opening words, which used the ~23 columns a
  docked pane can't go below.
- **2026-10-27** — classic only: fullscreen reviews in the reply (D41).

---

### D37 — Blocks move by the keys only; the wheel scrolls the reply
**Status:** settled · added 2026-10-20

Decided on #62, #63 and #64; closes #24. In the navigator the selection moves only by keys — ↑/↓ a block,
Home/End the first or last block (#63). The mouse wheel or a trackpad never moves
it: over the navigator it moves nothing (#62), over the transcript it scrolls the
reply. The selection does **not** follow the terminal's scrolling.

**What made it a choice, not a limit:** a logging-only spike (2.1.287, `run
long`, ~120 columns) showed `onScreen` updates on every wheel tick, one row at a
time, and the per-segment row estimate matched the piece's real height exactly
(spike finding 16 had called it never steady). Following the scrolling is
feasible.

**Why not, then:** navigation driven by the mouse is less predictable than by the
keys — the selection would jump as the person reads — and the pane already turns
↑/↓ into blocks. The wheel is what a person reaches for to scroll the reply, so it
stays that.

**Left open:** in fullscreen a reply taller than about two screens has a middle
the mod cannot bring into view (it scrolls only to a whole transcript row, top or
end). Parked on the API (#64), with what would unblock it; no workaround — a band
preview, folding far blocks, and following the scrolling were set aside.

---

### D43 — Step into a code block, drawn as windows of the whole block
**Status:** settled · added 2026-11-01

In fullscreen a code block's menu gets `step in`, and its lines take marks of their
own, nested under the block in the prompt with their number and text. This narrows
D20's step into (#105). Classic is left out: it is legacy. Tables step the same way
(D44).

**Drawing.** `Code` has no background for one line and the menu has to sit between
lines, so the block is drawn in three parts. Cutting the source into three pieces
fails: a piece that starts with a closing `*/` or `"""` reads it as an opening one,
and everything after it changes colour. So each part draws the whole block with
`Markdown`, as Claude Code does, in an `overflow: hidden` box with a negative
`marginTop` showing its rows only. The highlighter never sees a cut.

**No line numbers on screen.** `Markdown` has no gutter, and our own would push the
code sideways on every step in. The person marks the line they see; the number is for
the agent, and the band's hint says `Line 4 of 18`.

**Lines are for the keyboard.** No `Client` per line, and a click doesn't select one.
Marking part of a block with the mouse, and ranges of lines, belong to text selection
(#91, #137), which may make step in unnecessary for the mouse.

**Known limits:**
- Wrapped rows are estimated from the width, so after a very long line the windows,
  margin glyphs and menu clicks may drift by a row.
- A line can move off screen in a tall block: the transcript scrolls to whole rows
  only (#64).

**Taking marks off, and showing them:** Backspace on a block takes its own mark, then
its lines' marks, with no timing to learn; comments' texts stay, as always. Outside a
review a line's glyph can't be placed (no width is known there), so a block with only
marked lines shows `✸`, never sent. Its own mark takes that place, as it says more.

---

### D44 — Step into a table, placing its rows with Claude Code's own layout
**Status:** settled · added 2026-11-01

Extends D43 (#105). A table steps like a code block, drawn with the same windows, so its look is Claude
Code's own rather than a grid of ours. Its data rows take marks; the header doesn't,
since the table's quote already names the columns.

**Rows are worked out, not measured.** No API reports where a row landed, and a row's
height depends on every cell in the table. Assuming one line per row put the selection
on borders as soon as a cell wrapped. So `src/table.ts` ports the layout from Claude
Code 2.1.309, read from its binary: column widths, word wrap, a row as tall as its
tallest cell, the list a table becomes without room for a grid, and the 200-row cap.

**Known limits:**
- If Claude Code changes its layout, the selection drifts until the port follows. The
  table still draws correctly, and marks stay on the right row, because they hold the
  row's number and not its place on screen.
- In a very narrow terminal Claude Code's list format wraps its own 40-column rule, and
  rows below that are off. Left alone on purpose: it's Claude Code's glitch, and
  compensating for it would break when it's fixed.
- A table is laid out for the block's full width, not the narrower room after the
  margin and indent. Claude Code wrapping its rule in that margin shows the layout
  doesn't shrink for it. So a table in a list keeps its top-level columns, and its
  grid can wrap again in a narrow terminal, which throws rows off. Inferred from that
  wrap, and hand-tested on top-level tables only.
- A link in a cell is assumed to draw as its text. Not confirmed.

