# Navigation

### D20 — Modal navigation with visible controls on the selected block
**Status:** settled · reviewed 2026-10-13, revised

Enter navigation → arrows move between blocks → Esc backs out one level per
nesting depth.

**Revision: visible controls, not hotkeys alone.** The selected block shows a
row of real `Button` elements; hotkeys work too, for whoever learns them. This
is the primary interaction — not a fallback.

```
▎ Use Redis for the session cache
    [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
▏ Add a rate limiter
▏ Shard by tenant id
```

The row moves with the selection, so **only one block's controls are on screen**
— which resolves D20's original tension without hiding the verbs. Labels are
visible, so nothing must be memorized, and `Button` takes both `label` and
`hotkey`, so both paths work from one definition.

**Comment is an inline `Input`** appearing in place under the block — better
than a popup, because the text being commented on stays visible while typing.

`Button`, `Input` and `Select` all render in the terminal.

#### Entry key — open, and less important than it looked

**`Cmd+S` is rejected.** On macOS the terminal emulator usually swallows Cmd
combinations before they reach the TUI, and Cmd does not exist in Linux or
Windows terminals. **`Ctrl+S` is worse** — it is the classic terminal XOFF and
some terminals still honour it, freezing output until `Ctrl+Q`.

Candidates, in order:

1. **A plain unmodified key while the prompt box is empty** — the way Claude
   Code already treats digits in the band. No modifiers, nothing to swallow.
2. **`Ctrl+G`** — rarely bound, reaches the TUI reliably.
3. **Esc-prefixed** (Esc then a key) — portable, slightly awkward.
4. **`Button`'s `action` prop**, which names one of Claude Code's own
   [keybinding actions](https://code.claude.com/docs/en/keybindings) and fires on
   whatever the user has bound — inheriting a key that is already portable and
   already consistent with the rest of the app.

**Settle by feel in the spike** (D27), alongside Q3 — the key cannot be chosen
without knowing what `ui.press` actually receives. Visible controls make the
mode self-evident once entered, so the entry key matters less than it first
appeared.

#### Notes for implementation

- `autoFocus` accepts only `true`, so focus is managed per render rather than
  by flipping a prop off.
- `Box` has a `hover` prop, which suggests **mouse interaction may work in the
  terminal**. Worth checking in the spike — if clicking works, discoverability
  comes free without touching the keyboard design.

#### Revision 2026-10-15 — what the spike found

**Q3 answered: no raw keys.** `ui.press` fires only for `Button`s. Keys reach a
mod only through a focus ring, which only the band and panes have — the reply
never takes focus. And a ring is **linear**: ↑, ←, ⇧Tab all mean "previous";
`ui.focus` reports where focus goes, never which key sent it. Arrowing through
blocks *of the reply*, as designed, is not possible.

**What works: a pane, and its scrolling.** In a pane ↑/↓ scroll, and `ui.scroll`
carries a signed direction. With the pane's tree kept two rows taller than its
window and the window pinned in the middle, every ↑/↓ is a direction signal; the
mod moves the selection and cancels the scroll. ←/→ (or Tab) walk the verbs on
the ring. That is D31.

**Tried and dropped along the way:**
- *Verbs and blocks on one band ring*: ↓ walked the verbs, then fell through to
  the next block. Confusing.
- *Borrowed Global actions for blocks* (`app:diffFileListUp/Down`, `ctrl`/`⌥` +
  ↑↓): did not fire on macOS — Mission Control takes `ctrl+↑`, and `⌥` needs the
  terminal's Option-as-Meta. Borrowing another feature's action is fragile anyway.
- *A bare digit from the empty prompt* to enter: it presses a band button, but
  `$.ui.focus` from there is refused; it did not give the band the keyboard.

**Entry key: settled as a user binding** (D32). `abovePrompt:focus` is an
ordinary action, `ctrl+x tab` by default.

**The navigation model — decided 2026-10-18: A, a pane in both renderers (#19).**
The options were A (the pane: ↑/↓ blocks, ←/→ verbs) and B (no pane: every arrow
moves blocks on the band's ring, verbs by letter keys). A won on what the spike
found, not on whether the pane earns its space:
- **↑/↓ apart from ←/→ needs a pane.** Only a pane turns ↑/↓ into a direction
  (`ui.scroll`); the band raises no scroll event for them when it has nothing to
  scroll (tested 2026-10-18), and making it overflow would take half the screen.
- **The classic renderer needs a pane regardless** — the reply above cannot be
  redrawn once scrolled off, so the pane is the one surface that stays current
  (#11, #31).
- **A pane cannot be taken by another mod** (D33): a greedy mod above Synaptik
  removed its in-place view, never the navigator.

Classic: the pane is a block viewer (#31, SPEC §10). Fullscreen: the docked
navigator, its design to be finished on #39.

#### Revision 2026-10-24 — a second level, for code and tables

**Revised 2026-11-01 by D43:** built for code blocks in fullscreen, with `step in` and
`step out`. Tables are still to come.

A code block or a table gets a 5th action, **step into**. Inside it, ↑/↓ move
between lines or rows, and the menu holds the four verbs plus **step back**,
which returns to the blocks. Prose stays at block level: splitting a paragraph
into sentences breaks how it wraps. Design and rendering: #105 (for #5, #6).

**Revised 2026-10-27 by D41:** in fullscreen the reply's own `Client`s take the
keys once clicked, so the scroll trick and the pane are needed only in classic.
The keyboard path in fullscreen goes through the band, with `j` / `k`.

---

### D31 — The navigator: a docked pane that maps the reply
**Status:** settled · added 2026-10-15 · **the pane stays, in both renderers**
(#19, 2026-10-18; see D20) · fullscreen design to finish on #39 · **revised
2026-10-27 by D41: classic only; fullscreen reviews in the reply**

A pane beside the transcript serves two jobs:

1. **Keys** — the scroll trick for ↑/↓, the ring for ←/→ (D20 revision). Its
   verb buttons and comment field are drawn hidden; the reply shows the cursor.
2. **Overview** — one bar per block sized by length; selected, staged and
   other bars distinct; staged blocks show their mark and opening words;
   comments under their block; `Your notes · ✓2 ✗1 ✎1` on top, the position at
   the bottom.

The overview exists because the pane could not be made narrow: a request for 4
columns drew ~23, so the width is spent on content.

**Limits found:** an unasked open waits undrawn below 144 columns; a module
reload closes it; the width a person sets is remembered and wins. Two things
were tried and dropped, both because the mod cannot see how the reply wraps:
mirroring the reply line for line, and highlighting the blocks the terminal
shows (§11, item 16).

**Classic renderer, 2026-10-18 (#31):** the same pane, placed inline, is a
**block viewer** — the selected block in full with its neighbours, menu and
comment — since the reply above cannot be redrawn once scrolled off. Sized once
per reply; trimmed with PgUp/PgDn beyond a third of the screen. Fullscreen keeps
the docked navigator with in-place review.

---

### D37 — Blocks move by the keys only; the wheel scrolls the reply
**Status:** settled · added 2026-10-20 · decided on #62, #63, #64; closes #24

**Decision:** in the navigator the selection moves only by keys — ↑/↓ a block,
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
**Status:** settled · added 2026-11-01 · narrows D20's step into (#105) · tables added by D44

In fullscreen a code block's menu gets `step in`, and its lines take marks of their
own, nested under the block in the prompt with their number and text. Tables and
classic are left out: tables need our own grid, and classic is legacy. (D44 found
tables don't need one.)

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
**Status:** settled · added 2026-11-01 · extends D43 (#105)

A table steps like a code block, drawn with the same windows, so its look is Claude
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

