## Smoke test

The happy path, start to finish: review this reply, mark it, discuss one block, and send. Run it first on every build. Fullscreen (`/tui fullscreen`), a terminal at least 144 columns wide.

For the session store, use Redis with a 5-minute TTL on every entry, keyed by user id.

Rate-limit the login endpoint to five attempts a minute per IP.

```ts
export function retry(fn: () => Promise<void>, times = 3) {
  return fn().catch(err => (times > 0 ? retry(fn, times - 1) : Promise.reject(err)))
}
```

| Option | Latency | Durability |
|---|---|---|
| Redis | low | snapshots |
| Postgres | medium | full |

Next, I'll add the limiter and run `npm test` once it's in.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** look at the band above the prompt
   - **Expect:** "ctrl+x tab to review the reply" or "click here to review the reply"
2. **Do:** click the band's "click here to review the reply", then click the Redis paragraph
   - **Expect:** it gets the selection background, with a menu under it
   - **Expect:** the band says "Block 2 of N"
3. **Do:** press `a`
   - **Expect:** ✓ in its margin
   - **Expect:** a dim suggestion in the prompt box, starting `✓ "For the session store…`
4. **Do:** press `↓`, then `x`
   - **Expect:** ✗ on the rate-limit paragraph
5. **Do:** press `Backspace`
   - **Expect:** the ✗ is gone, and so is its line in the suggestion
6. **Do:** press `c`, type `per account, not per IP`, press `⏎`
   - **Expect:** ✎ in the margin, and the comment under the paragraph
7. **Do:** press `↓` to the code block, then `s`
   - **Expect:** its first line is selected, with a menu under it
8. **Do:** press `↓`, then `x`, then `q`
   - **Expect:** ✗ on line 2's margin
   - **Expect:** after `q`, the whole block is selected again
9. **Do:** press `↓` to the table, then `d`
   - **Expect:** a thread pane opens beside the transcript, the keyboard in its field
10. **Do:** type `which one for sessions?`, press `⏎`
    - **Expect:** "thinking…", then an answer
    - **Expect:** if the answer recommends one, a summary under the include switch, which is on
11. **Do:** press `Esc`
    - **Expect:** the pane closes, and the table has 💬 in its margin
12. **Do:** look at the reply and the prompt box (the thread took the keyboard, so the review is already over)
    - **Expect:** no selection and no menus; the marks are still in the margins
    - **Expect:** a dim suggestion with the ✓, the ✎ and its comment, line 2 under the code block, and the table's 💬 if it was included
13. **Do:** press `Tab`, then type a space
    - **Expect:** after `Tab`, the suggestion is in the box, its glyphs plain
    - **Expect:** after the space, ✓ is green, ✗ red, ✎ the suggestion's colour
14. **Do:** press `ctrl+c`
    - **Expect:** the box is empty, and the dim suggestion is back (on the `directory` build, at your next keystroke or mark)

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
