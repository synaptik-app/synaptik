## Fullscreen test

Reviewing in the reply itself: a click, the keys, a comment typed in place. Run it in fullscreen, at any width.

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

- No navigator pane opens in fullscreen; the band says "click the reply to respond in place · ctrl+x tab for keys"
- A click on any block selects that block — the code block, the table, a nested item, the wrapped paragraph's second line
- After a click, ↑/↓ and Home/End move between blocks, and the band says "Block N of M · ↑↓ blocks"
- ←/→ walk the menu under the selected block, ⏎ applies the action under the cursor, and a click on an action applies it
- a / x / c / d act directly on the selected block
- c opens a comment under the block, dim, with a cursor: type, move with ←/→ and Home/End, Backspace, Delete, then ⏎ stages it
- In a comment, backslash then ⏎ starts a new line; ↑/↓ stage it and move on; Backspace on an empty comment cancels it
- A paste while a comment is open goes into the comment, not the prompt box
- c on a commented block reopens its text
- Typing in the prompt takes the selection and the menu off the reply; a click brings them back
- The suggestion in the prompt box follows every mark, and comes back when the prompt box is emptied
- Keyboard only: ctrl+x tab focuses the band; j / k move between blocks, ←/→ and ⏎ act, c opens a comment field in the band
- Esc leaves the menu drawn until you type in the prompt (known limit: Esc raises nothing a mod can see, #23)
