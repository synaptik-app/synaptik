## Comments test

Commenting on a block in detail: editing in the field, several lines, reopening, clearing, pasting. Fullscreen (`/tui fullscreen`).

Cache sessions in Redis, keyed by user id.

Rate-limit the login endpoint.

Run `npm test` once the limiter is in.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** click the band's "click here to review the reply", then click "Rate-limit the login endpoint", press `c`, type `per IP`, press `Home`, type `only `, press `End`, then `Backspace`
   - **Expect:** the field reads `only per I`, the cursor where you typed
2. **Do:** type `\`, press `⏎`, type `second line`, press `↑`, then `↓`
   - **Expect:** `\` then `⏎` starts a new line; `↑` and `↓` move between the comment's lines, and the selection stays on the block
3. **Do:** press `⏎`
   - **Expect:** ✎ on the block; the suggestion has both lines, the second lined up under the first
4. **Do:** press `c` again
   - **Expect:** the comment opens with its text
5. **Do:** press `ctrl+u`, then `⏎`
   - **Expect:** `ctrl+u` empties every line and the field stays open; `⏎` drops the comment, ✎ included
6. **Do:** press `c`, paste some text (`cmd+v`), type `q`
   - **Expect:** the paste and the `q` go into the comment, not the prompt box, and the review goes on
7. **Do:** press `Backspace` until the field is empty, then once more
   - **Expect:** the field closes, and nothing is staged

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
