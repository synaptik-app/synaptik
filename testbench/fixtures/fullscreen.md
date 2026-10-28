## Fullscreen test

Reviewing in the reply itself: ctrl+x tab, then a click or the keys, and a comment typed in place. Run it in fullscreen, at any width.

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

### What to check

- Outside a review the reply is plain: its text can be selected and copied, and no navigator pane opens; the band's hint alternates "ctrl+x tab to review the reply" and "click here to review the reply"
- ctrl+x tab starts a review: the band says "Block N of M · j/k blocks"; j / k move between blocks, ←/→ and ⏎ act, c opens a comment field in the band
- A click on the band's hint starts the review with the arrows: ↑/↓ move between blocks, ←/→ and ⏎ act, a / x / c / d
- A click on any block selects that block — the code block, the table, a nested item, the wrapped paragraph's second line — and the reply takes the keyboard
- After a click, ↑/↓ and Home/End move between blocks, and the band says "Block N of M · ↑↓ blocks"
- ←/→ walk the menu under the selected block, ⏎ applies the action under the cursor, and a click on an action applies it
- a / x / c / d act directly on the selected block
- c opens a comment under the block, dim, with a cursor: type, move with ←/→ and Home/End, Backspace, Delete, then ⏎ stages it
- In a comment, backslash then ⏎ starts a new line (the hint after it says so); ↑/↓ move between its lines and nothing more — ⏎ stages it; Backspace on an empty comment cancels it
- A paste while a comment is open goes into the comment, not the prompt box
- c on a commented block reopens its text
- q ends the review — from the reply, the band or its hint — and the band's legend says "q done"; in a comment, q types a q
- Typing in the prompt ends the review: the reply is plain again, and its text can be selected
- The suggestion in the prompt box follows every mark, and comes back when the prompt box is emptied
- The band: header "Synaptik"; the staged line counts ✓ ✗ ✎ and, outside a review only, says "tab, then ⏎ to send", "⏎ sends your feedback", or in yellow "⏎ sends what you typed"
- Esc does not end the review (known limit: a mod never sees it, #23) — q does
