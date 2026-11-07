## Long test

A reply long enough to fill more than one screen, so the transcript has to scroll to follow the selection. Fullscreen (`/tui fullscreen`). Run it rarely: when Claude Code changes how its transcript scrolls, or when Synaptik's scrolling to the selection changes.

### Section one

1. Choose a cache for sessions
2. Decide the key format
3. Set an expiry policy
4. Plan the invalidation path
5. Measure the hit rate after a week

A paragraph between lists, of ordinary length, so that blocks differ in size.

- Log every cache miss for a day
- Alert when the hit rate drops below ninety percent
- Keep the dashboard on the team screen

### Section two

1. Add a rate limiter at the gateway
2. Start at five requests per second per user
3. Return a clear error with a retry hint
4. Exempt internal health checks
5. Review the limit after launch

A much longer paragraph, to give one tall block among short ones. It goes on for a while about trade-offs: a lower limit protects the database but frustrates power users, a higher one does the opposite, and a burst allowance sits somewhere in between, letting short spikes through while keeping the sustained rate in check. None of this needs deciding now; it only needs to be long.

- Document the limit in the API reference
- Mention it in the changelog

### Section three

1. Write the migration
2. Run it against a copy of production
3. Time it
4. Schedule a window if it takes longer than a minute
5. Prepare the rollback
6. Run it for real
7. Verify row counts
8. Remove the old columns a week later

A short paragraph.

- One more bullet
- And another
- And a last one

A closing paragraph after the final list.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** scroll the transcript so the reply's top is off screen, then press `ctrl+x tab`
   - **Expect:** the review starts on the last block, on screen
2. **Do:** press `k` until the first block, then `j` back down to the last
   - **Expect:** every block is reached, headings skipped, and the band counts them all ("Block 1 of N" at the top)
   - **Expect:** moving into the reply's first third jumps the view to its top; into its last third, to its end
   - **Expect:** in the middle third, the view stays where it is
3. **Do:** click a block, then press `↑` and `↓` past the screen's edge
   - **Expect:** the selection moves, but the view doesn't follow (Claude Code refuses a scroll that isn't "person-initiated"); the wheel still scrolls
4. **Do:** press `Home`, then `End`
   - **Expect:** the first block, then the last, is selected, and `↑` at the first or `↓` at the last goes no further

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
