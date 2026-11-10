# Rendering

## 6. Rendering the message

Hook: `ui.render` with `{ component: 'AssistantMessage' }`. It fires **once per
text block of a reply** — a reply interleaved with tool calls arrives as several
pieces. `e.props.text` is the piece's markdown; `e.requestId` is its message id.
A rewrite changes the drawing only; the stored message is untouched.

Each piece works out where its blocks start in the whole reply, so block
numbering runs across pieces.

The mod draws the whole reply, so it redraws **Claude Code's frame** too: the
top margin, a 2-cell left margin, and the `⏺` bullet on the reply's first line
(first piece only). Each block is its `Markdown` beside that margin, lined up
exactly with the vanilla drawing. A marked block's glyph sits **in the margin**
(replacing the bullet on a marked first block), so marking moves nothing. Nested
items indent 3 cells per level.

Tried and dropped: a 4-cell gutter of the mod's own (a reply after a tool call
read as that tool's output); a glyph placed absolutely left of the reply (clipped);
no margin at all (text shifted 2 cells left of vanilla); and **wrapping Claude
Code's own drawing per block** — `next(e)` returns an opaque handle
(`{ type: 'engine', ref }`) with its spacing and margin baked in, so blocks drawn
one by one gained gaps and lost the margin. A mod that changes part of a reply
redraws all of it.

- **Selected block:** the `Box` around its `Markdown` gets the theme key
  `selectionBg` as `backgroundColor` — Claude Code's own text-selection colour,
  so it follows `/config`'s light or dark theme. It paints behind the text.
- **Other blocks:** no background. Only their mark glyph, if any, shows.
- **Under the selected block:** the verb menu after a dim `└`. The verb under the
  keyboard cursor (§10) draws as the primary button, the others dim. Outside a
  review, nothing is highlighted. Where the items don't fit on one row (a narrow
  terminal, a deep indent), they are drawn as their glyphs alone —
  `[ ✓ ][ ✗ ][ ✎ ][ 💬 ]`, and `[ ↳ ]` / `[ ↰ ]` — so the menu stays one row.

The reply carries no accent colour. ⚠️ `selectionBg` was found in the Claude Code
binary, not the documented API; an unknown key would make the reply fall back to
Claude Code's own drawing.
- **Under a commented block:** `→ comment text`, dim. In fullscreen the comment is
  typed here, in place; in classic it shows here live, and the field itself, with
  its cursor, is in the navigator (§10).

**The selection shows only during a review.** When it ends, the background and
the menu go, and the reply reads as a plain reply with its mark glyphs and
comments.

**The reply is redrawn only when needed** (D33): during a review, or when a block in that piece of the reply is marked or being
commented. Otherwise the hook passes it through with `next(e)`, so Claude Code
and other mods draw it as usual. Redrawing takes the reply from every mod beneath
Synaptik in the chain, and draws the transcript's text — bypassing any mod beneath
that changes it.

**After a review, marks stay** (D35): a marked piece keeps its glyphs and comment
lines. There is no option to show them only while reviewing.

### Example render

```
  Here's what I'd suggest:

  ✓ Use Redis for the session cache          ← on the selection background
  └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
      per-user key prefix
  ✗   5 minute TTL
  ✎ Add a rate limiter
    → make it 5 req/sec
    Run the migration before deploying.
```

Menu buttons are **mouse-clickable** in the fullscreen terminal. The reply
itself **never takes keyboard focus** — a transcript message has no focus ring —
so every keyboard path goes through the navigator (§10).

The mod cannot measure how Claude Code wraps Markdown, so nothing it draws
elsewhere can be guaranteed to line up with the reply's on-screen lines.

---

### Fullscreen: the review in the reply (D41)

There is **no navigator pane** in fullscreen. **A review starts two ways**, which
the band's hint line names in turn (`ctrl+x tab to review the reply` ↔ `click
here to review the reply`, every 3 s, on the hint `Client`'s own timer): `ctrl+x tab` (the
band's keyboard lands on Synaptik's actions — as a click elsewhere in the band
does, since Claude Code reports both alike), or a click on the hint itself, which
hands that `Client` the raw keys, ↑/↓ included. It lasts until the person types in
the prompt, or the band's focus leaves Synaptik's controls (Esc from the band).
**During a review** each block of the reply is drawn by its own `Client`
(`hooks/client/block.tsx`), so a click on one selects it; headings and rules are
drawn as plain Markdown between them. **Outside a review** the reply is drawn as
in classic — passed through, or with its marks in place (D33, D35) — so its text
can be selected and copied: a `Client` holds the pointer, and the transcript
selects nothing inside one.

```
⏺ Two separate problems, so two fixes:

  1. Cache sessions in Redis
✓    - key each entry by user
     - expire after 5 minutes          ← selected (selection background)
     └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
✎ 2. Rate-limit the login endpoint
    → make it 5 per minute per account
```

**With the mouse**, during a review:
- **A click on a block selects it** and hands the reply the keyboard. The click
  lands on that block's own `Client`, so it is exact.
- ↑/↓ move between blocks, Home/End (and PgUp/PgDn) jump to the first or last.
  They run over the whole reply, across its tool calls.
- ←/→ (and Tab) walk the menu under the selected block; ⏎ applies the action
  under the cursor; a click on an action applies it; `a` `x` `c` `d` act
  directly.
- **A comment is typed in place**, under its block, dim, with a cursor (an
  inverse cell): characters, Space, ←/→, Home/End, Backspace, Delete. `⏎`
  stages it; `\` then `⏎` starts a new line, in every terminal, and the hint
  after the text says so (`⏎ ok · \⏎ new line`); ↑/↓ move between its lines and
  nothing more — past the first or last they leave it open, unstaged; Backspace
  on an empty comment cancels it; `ctrl+u` empties it, every line, and the hint
  names that once there is text; `c` on a commented block reopens its text.
- **A paste** while a comment is open goes into the comment: Claude Code hands
  every paste to the prompt box, and a `prompt.edit` hook moves it.

**With the keyboard:** only a click can focus a `Client`, so the review stays in
the **band**, where `ctrl+x tab` put it. Its ring stops on the four actions (hidden; the menu in the
reply shows the cursor), with `j` / `k` as hotkeys between blocks — ↑/↓ scroll
the band, and Claude Code's own lists use J/K. ←/→ walk the actions (Claude Code
binds them in the band by default), `⏎` applies, `a` `x` `c` `d` act; a comment
opened from the band is typed in a field in the band and shows under its block.

The band's ring is shared. Another mod's button there is a stop like Synaptik's,
so ←/→ past the actions land on it, and the review ends. Synaptik does not refuse
those stops (D41, revision 2026-10-30).

**Status in the band:** the hint line above, or, while reviewing (the hint stays
drawn, showing the legend — removing the `Client` the person clicked would take
the keyboard with it), `Block N of M · ↑↓ blocks · ←→ actions · ⏎ apply ·
⌫ unmark · q done` (from the band, `j/k blocks` and no `⌫`). The staged counts sit above it.

**How the blocks hold together** (`src/review.ts`):
- The block clicked keeps the keyboard and steers every block: its keys become
  steps, posted to the hooks (`ui.message`), which hold the review and hand it
  back to every block as props. A block draws its own newer step at once, until
  the hooks echo it.
- A later post in the same frame replaces an undelivered one, so every post
  carries the whole review and every action not yet confirmed; the hooks apply
  each action once, by id.
- A `Client`'s props are plain data: a missing value is refused and the whole
  reply falls back to Claude Code's own drawing, so a closed comment is left out,
  never `undefined`.
- Each adopted reply gets fresh `Client` instances (`block-<reply>-<index>`).

**Ending a review: `q`**, from the reply, the band or its hint (in a comment, `q`
types a `q`); the legend says `q done`. **Esc does not end it:** a mod never sees
Esc — a `Client` is never told it lost the keyboard, and the band raises nothing
when its focus goes back to the prompt (#23). If Claude Code ever reports it, Esc
joins `q` and `q` stays, unadvertised. Typing in the prompt (any edit but a paste
into an open comment) also ends the review, and the band's focus moving off
Synaptik's controls does, after a short grace (300 ms) in which a click into a
block — which also takes the focus from the band — keeps it going.

**The suggestion** is proposed after every action, and again whenever the prompt
box becomes empty (`prompt.edit`, `prompt.change`): it cannot show while the box
holds text.

**Revealing the reply** as the selection moves works as for the pane (below):
entering the first or last third of the blocks scrolls the reply's top or end
into view, best effort. **Only from `j` / `k`:** Claude Code scrolls a transcript
row only in answer to the person's own input, and a key a `Client` posts does not
count (`not person-initiated`). After a click, ↑/↓ move the selection and the
person scrolls with the wheel (#64).

### The classic renderer: the navigator as a block viewer

In the classic (non-fullscreen) renderer the pane opens **inline**, full width,
above the band. Text scrolled into the terminal's scrollback cannot be redrawn,
and the mod cannot scroll the terminal, so the reply above is reliable only while
the block is on screen. The navigator therefore shows **the selected block
itself** (#31):

```
▲ Your notes · ✎1  § Section two
│
│ ↑ 1. Choose a cache for sessions
│ ✎ 2. Decide the key format, and how it is versioned across deploys
│ [ ✓ accept ][ ✗ reject ][ ✎ comment ][ 💬 discuss ]
│ → keep it short
│ ↓ 3. Set an expiry policy
│
▼ Block 2 of 14
```

- **Header:** your notes and counts, and a breadcrumb — the nearest heading above
  the selected block (`§ Section two`).
- **Between header and footer**, beside a dim `│` edge: the previous block's
  opening words (dim), the **selected block in full** as Markdown with its mark,
  the menu as real buttons (←/→ or Tab walk them), the comment line (`→ …`, or the
  comment field while typing), the next block's opening words (dim). Spare rows
  sit after the header and before the footer, so the menu is right under the block.
- **Height, decided once per reply:** the tallest block's estimated rows (a table
  as drawn, a code block without its fences) plus six, between 7 rows and a third
  of the screen — so the pane does not change height while navigating. A block
  taller than that is trimmed; **PgUp/PgDn** scroll within it (a page-sized `by`
  on `ui.scroll`, where ↑/↓ give 1), and the footer says `PgUp/PgDn to read on`.
- **Claude Code's kept pane size wins over the request.** It keeps one inline
  height and one dock width for all mods' panes, across sessions
  (`pluginPanes.inlineRows` / `dockColumns` in `~/.claude.json`), set whenever the
  person resizes any pane. The layout must stay usable at whatever height it gets.

Fullscreen has no pane: the review happens in the reply itself (above, D41).
