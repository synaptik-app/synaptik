## Long test

A reply long enough to fill more than one screen, so the transcript has to scroll. Run it in either renderer; one group is the default renderer's only.

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

### What to check

- **Moving between blocks**
  - ↑/↓ reach every block, first to last, and stop at the ends
  - Block N of M counts every block, headings excluded
  - Review starts on the last block, already on screen
- **Scrolling the reply**
  - With ctrl+x tab and j / k, or in the default renderer: moving up into the first third jumps the view to the reply's top
  - With ctrl+x tab and j / k, or in the default renderer: moving back down into the last third jumps the view to the reply's end
  - In the middle third the view stays where you scroll it
  - After a click on a block or the band's hint, ↑/↓ never scroll the view; the wheel does (known limit: Claude Code refuses it, "not person-initiated")
- **Marking**
  - Marks spread across sections all reach the suggestion in reading order
- **The default renderer's navigator**
  - The pane shows the selected block in full, with the previous and next blocks dim and the menu right under it
  - The tall paragraph in section two is trimmed, PgUp/PgDn read on, ↑/↓ still move between blocks
