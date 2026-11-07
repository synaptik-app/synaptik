## Review test

Reviewing in detail, past the smoke test's happy path: the keyboard path, the menu, and how a review ends. Comments have their own test. Fullscreen (`/tui fullscreen`), at least 144 columns.

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

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

**From the keyboard**

1. **Do:** press `ctrl+x tab`
   - **Expect:** the reply's last block ("When you're done…") is selected, and the band says "Block N of M · j/k blocks"
2. **Do:** press `k` twice, then `j` once
   - **Expect:** the selection moves up two blocks, then down one
3. **Do:** press `→` twice, then `⏎`
   - **Expect:** the cursor walks the menu to "✎ comment", and `⏎` opens a comment field in the band
4. **Do:** type `from the band`, press `⏎`, then `q`
   - **Expect:** ✎ on the block, the comment under it
   - **Expect:** after `q`, the review ends and the band says "ctrl+x tab to review the reply" or "click here…"

**From the band's hint, and the mouse**

5. **Do:** click the band's "click here to review the reply"
   - **Expect:** a review starts, and the band says "Block N of M · ↑↓ blocks"
6. **Do:** press `Home`, then `End`
   - **Expect:** the first block ("Reviewing in detail…"), then the last ("When you're done…"), is selected
7. **Do:** click, in turn: the code block, the table, "key each entry by user", the closing paragraph's second line
   - **Expect:** each click selects the block clicked
8. **Do:** on the table, click `[ ✗ reject ]` in its menu
   - **Expect:** ✗ on the table
9. **Do:** press `Backspace`
   - **Expect:** the ✗ goes; the legend in the band names "⌫ unmark"

**Ending, and the band**

10. **Do:** press `a` on any block, then `Esc`
    - **Expect:** the review goes on (a mod never sees Esc, #23); `q` ends it
11. **Do:** look at the band
    - **Expect:** it counts the marks (e.g. `✓1 ✎1`) and says "tab, then ⏎ to send"
12. **Do:** press `Tab`
    - **Expect:** the band says "⏎ sends your feedback"
13. **Do:** press `ctrl+c`, click a block, then click the prompt box and type `h`
    - **Expect:** the review ends, the reply is plain and its text can be selected
    - **Expect:** the band says, in yellow, "⏎ sends what you typed"

When you're done: empty the box, click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
