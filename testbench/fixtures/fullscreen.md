## Fullscreen test

Rendering and reviewing in the reply itself: ctrl+x tab, then a click or the keys, and a comment typed in place. Run it in fullscreen (`/tui fullscreen`), at any width.

1. Cache sessions in Redis
   - key each entry by user
   - expire after 5 minutes
2. Rate-limit the login endpoint

```sh
npm run migrate
```

| Option | Latency |
|---|---|
| Redis | low |

A closing paragraph, long enough to wrap onto a second line in a typical terminal, so a click on its second line can be tried as well.

- Bullet item with **bold**, *italic* and `inline code`
  - Nested bullet under it

> A blockquote, one block.

---

### Markdown the segmenter has to get right

Steps:
1. Run the tests:

   ```sh
   npm test
   ```
2. Deploy, then check `SESSION_CACHE` in config_prod
   - watch the error rate
   - roll back if it climbs

   Back at item 2's indent, after its nested items.

9. Nine
10. Ten
    - nested under ten
- Nested by four spaces in the source
    - one level down, not two

He wrote:
> The cache is stale
> > and so is this
> - and a list inside the quote

Setext heading
--------------

Option | Latency
--|--
Redis | low

````md
```js
x()
```
````

### What to check

- **Rendering**
  - Mod on and off look the same apart from marks and the selection — compare with `/synaptik off` and `/synaptik on`
  - Numbered list keeps its numbers, nested bullets sit under their parent, the table draws as a table, the code block keeps its styling
  - The heading is skipped by ↑/↓ — it is not a block
  - The selected block shows the selection background, and marking a block puts its glyph before it; unmarked blocks do not move
- **Blocks from Markdown**
  - "Steps:" and the list under it are separate blocks; the code block is a block of its own, nested under item 1 — marking it alone compiles under "1. Run the tests:"
  - Nested items line up exactly as with `/synaptik off`: under `-`, under `1.` and under `10.` — no extra space
  - "Back at item 2's indent" is its own block, nested under item 2
  - "He wrote:" and the quote are separate blocks; the quote, with its nested quote and list, is one block
  - "Setext heading" is drawn as a heading and skipped by ↑/↓
  - The table without outer pipes is one block
  - The four-backtick fence, with a three-backtick one inside, is one block
  - Marking a nested item under item 2 compiles under "2. Deploy, then check SESSION_CACHE…", underscores intact
- **Starting a review**
  - Outside a review the reply is plain: its text can be selected and copied, and no navigator pane opens; the band's hint alternates "ctrl+x tab to review the reply" and "click here to review the reply"
  - ctrl+x tab starts a review: the band says "Block N of M · j/k blocks"; j / k move between blocks, ←/→ and ⏎ act, c opens a comment field in the band
  - A click on the band's hint starts the review with the arrows: ↑/↓ move between blocks, ←/→ and ⏎ act, a / x / c / d
  - A click on any block selects that block — the code block, the table, a nested item, the wrapped paragraph's second line — and the reply takes the keyboard
- **Moving and acting**
  - After a click, ↑/↓ and Home/End move between blocks, and the band says "Block N of M · ↑↓ blocks"
  - ←/→ walk the menu under the selected block, ⏎ applies the action under the cursor, and a click on an action applies it
  - a / x / c / d act directly on the selected block
  - Backspace on a block takes its mark off, after a click only (the legend says "⌫ unmark"); a comment's text comes back with c
- **Comments**
  - c opens a comment under the block, dim, with a cursor: type, move with ←/→ and Home/End, Backspace, Delete, then ⏎ stages it
  - In a comment, backslash then ⏎ starts a new line (the hint after it says so); ↑/↓ move between its lines and nothing more — ⏎ stages it; Backspace on an empty comment cancels it
  - ctrl+u empties the comment being typed, every line, and it stays open; ⏎ then drops it, ✎ included (the hint names it once there is text); after ctrl+x tab the field is Claude Code's, and ctrl+u empties only the current line
  - A paste while a comment is open goes into the comment, not the prompt box
  - c on a commented block reopens its text
- **Marking selected text**
  - Dragging over text, outside a review, puts the actions and the text on the band's hint row, live; nothing in the reply moves
  - A click on ✓ or ✗ stages the text; a click on ✎ opens a comment on that row, and ⏎ stages it; the keyboard goes back to the prompt
  - A click elsewhere clears the selection, and the hint comes back
  - A staged selection is a row under the block it ends in, several in order, and all of them reach the prompt whole, under that block
  - Backspace on that block, in a review, removes its mark and its selections
- **Ending a review**
  - q ends the review — from the reply, the band or its hint — and the band's legend says "q done"; in a comment, q types a q
  - Typing in the prompt ends the review: the reply is plain again, and its text can be selected
  - Esc does not end the review (known limit: a mod never sees it, #23) — q does
- **The prompt and the band**
  - The suggestion in the prompt box follows every mark, and comes back when the prompt box is emptied
  - The band: header "Synaptik"; the staged line counts ✓ ✗ ✎ and, outside a review only, says "tab, then ⏎ to send", "⏎ sends your feedback", or in yellow "⏎ sends what you typed"
  - `/synaptik config` says there is nothing to set in fullscreen
