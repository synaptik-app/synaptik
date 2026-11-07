## Split test

A reply split around a real tool call, so it reaches Synaptik in two parts. Fullscreen (`/tui fullscreen`). Run it rarely: when Claude Code changes how it groups a turn's messages.

Part one, a paragraph before the first tool call.

1. Part one, first item
2. Part one, second item

<<STOP WRITING. Call the Bash tool now with the command: sleep 3. When it returns, continue with the next line. Never write this line in your reply.>>

Part two, a paragraph after the tool call.

- Part two, a bullet
- Part two, another bullet

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** while the agent is still writing (during the pause), look at the band and click the reply
   - **Expect:** the band offers no review, and the reply stays Claude Code's own: no selection, no menu
2. **Do:** once it's done, click the band's "click here to review the reply", then click "Part one, a paragraph…", then press `↓` down to "Part two, another bullet"
   - **Expect:** `↓` crosses the tool call, and the band's "Block N of M" counts the blocks of both parts
3. **Do:** press `Home`, then `End`
   - **Expect:** `Home` goes to part one's first block, `End` to the reply's last, across the tool call
4. **Do:** press `a` on "Part two, another bullet", then `x` on "Part one, first item"
   - **Expect:** both in the suggestion, part one first
5. **Do:** press `q`, then `ctrl+x tab`, and `k`/`j` across the parts
   - **Expect:** `k` and `j` cross the tool call too

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
