# Navigation

### D20 — Modal navigation with visible controls on the selected block
**Status:** settled · added by 2026-10-13

**Review is a mode:** entered, moved through block by block, and left. **The
selected block shows its actions** under it, as a row of real buttons with
labels — hotkeys work too (`a` `x` `c` `d`) — so nothing must be memorized. The
row moves with the selection, so only one block's controls are on screen.

```
  1. Cache sessions in Redis
✓    - key each entry by user
     - expire after 5 minutes          ← selected (selection background)
     └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
✎ 2. Rate-limit the login endpoint
    → make it 5 per minute per account
```

**A comment is typed in place** under its block — better than a popup, because
the text being commented on stays visible while typing.

**Prose stays at block level.** Code blocks and tables can be stepped into, line
by line or row by row (D2, D43, D44); a paragraph is not split into sentences,
since that breaks how it wraps.

**Entering:** `ctrl+x tab` (Claude Code's `abovePrompt:focus`, or a key the person
binds to it, D32), or in fullscreen a click on the band's hint (D41).

**How keys reach the review shapes both renderers.** `ui.press` fires only for
`Button`s; keys reach a mod only through a focus ring — the band's or a pane's —
or a `Client` that was clicked. The reply itself never takes focus. And a ring
is **linear**: ↑, ←, ⇧Tab all mean "previous", and `ui.focus` reports where
focus goes, never which key sent it. So:
- **Fullscreen** reviews in the reply, whose clicked `Client`s get every key; from
  the keyboard, through the band (D41).
- **Classic** uses a pane, whose scrolling turns ↑/↓ into block moves (D31).

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
- **2026-11-10** — the renderer detail left to D31 and D41; the drawing updated.

---

### D31 — Classic reviews in a pane: the navigator
**Status:** settled · added 2026-10-15

**In the classic renderer, a pane carries the review** (fullscreen has none: it
reviews in the reply, D41). It opens **inline**, full width, above the band, and
does two jobs:

1. **Keys.** A pane's ↑/↓ scroll, and `ui.scroll` carries a signed direction. The
   pane's tree is kept two rows taller than its window, with the window pinned in
   the middle, so every ↑/↓ is a direction signal: the mod moves the selection
   and cancels the scroll. ←/→ or Tab walk the verbs on the pane's ring; the verb
   buttons are drawn hidden, and the reply shows the cursor.
2. **A block viewer** (#31) — the selected block in full with its mark, menu and
   comment, its neighbours' opening words, the counts on top and the position at
   the bottom. Sized once per reply; trimmed with PgUp/PgDn beyond a third of the
   screen.

**Why a pane:**
- **Only a pane separates ↑/↓ from ←/→.** The band raises no scroll event when it
  has nothing to scroll (tested 2026-10-18), and making it overflow would take
  half the screen.
- **Classic cannot redraw a reply once it has scrolled off,** so the pane is the
  one surface that stays current.
- **No other mod can take it** (D33).

Chosen over a review on the band alone: every arrow moving blocks on the band's
ring, verbs by letter keys (#19).

**Limits found:** an unasked open waits undrawn below 144 columns; a module reload
closes it; the size a person sets is remembered and wins. Two things were tried and
dropped, both because the mod cannot see how the reply wraps: mirroring the reply
line for line, and highlighting the blocks the terminal shows.

**Revisions**
- **2026-10-18** — the pane stays, in both renderers (#19, D20). In classic it is a
  block viewer (#31); fullscreen keeps a docked navigator: an overview, one bar per
  block sized by length, marks and opening words, which used the ~23 columns a
  docked pane can't go below.
- **2026-10-27** — classic only: fullscreen reviews in the reply (D41).
- **2026-11-10** — takes in the scroll trick and the reasons for a pane, from D20;
  retitled from "The navigator: a docked pane that maps the reply".

---

### D37 — Blocks move by keys or a click; the wheel scrolls the reply
**Status:** settled · added 2026-10-20

**The selection moves only by the keys, or by a click on a block in fullscreen.**
↑/↓ (or `j` / `k` from the band) move a block; Home/End jump to the first or last
(#63). The mouse wheel or a trackpad never moves it: over classic's pane it moves
nothing (#62), and over the transcript it scrolls the reply. The selection does
**not** follow the terminal's scrolling. Decided on #62, #63 and #64; closes #24.

**A choice, not a limit:** a logging-only spike (2.1.287, ~120 columns) showed
`onScreen` updates on every wheel tick, one row at a time, and the per-segment
row estimate matched the piece's real height exactly. Following the scrolling is
feasible.

**Why not, then:** navigation driven by the wheel is less predictable than by the
keys — the selection would jump as the person reads — and the keys already move
blocks. The wheel is what a person reaches for to scroll the reply, so it stays
that.

**Left open:** in fullscreen a reply taller than about two screens has a middle
the mod cannot bring into view: it scrolls only to a whole transcript row, top or
end, and only from `j` / `k` (D41). Parked on the API (#64), with what would
unblock it; no workaround — a band preview, folding far blocks, and following the
scrolling were set aside.

**Revisions**
- **2026-10-27** — fullscreen: a click on a block selects it (D41).
- **2026-11-10** — covers both renderers; retitled from "Blocks move by the keys
  only; the wheel scrolls the reply".

---

### D43 — Step into a code block, drawn as windows of the whole block
**Status:** settled · added 2026-11-01

In fullscreen a code block's menu gets `step in`, and its lines take marks of their
own, nested under the block in the prompt with their number and text. Classic is
left out: it is legacy. Tables step the same way (D44).

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

**Revisions**
- **2026-11-01** — narrows D20's step into, planned for code and tables alike, to
  code blocks in fullscreen (#105).

---

### D44 — Step into a table, placing its rows with Claude Code's own layout
**Status:** settled · added 2026-11-01

Extends D43 (#105). A table steps like a code block, drawn with the same windows,
so its look is Claude Code's own rather than a grid of ours. Its data rows take marks; the header doesn't,
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

