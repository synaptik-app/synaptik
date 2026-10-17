## Long test

A reply long enough to fill more than one screen, so the navigator has to scale and the transcript has to scroll.

### Section one

1. Choose a cache for sessions
2. Decide the key format
3. Set an expiry policy
4. Plan the invalidation path
5. Measure the hit rate after a week

A paragraph between lists, of ordinary length, so that blocks differ in size and the minimap shows it.

- Log every cache miss for a day
- Alert when the hit rate drops below ninety percent
- Keep the dashboard on the team screen

### Section two

1. Add a rate limiter at the gateway
2. Start at five requests per second per user
3. Return a clear error with a retry hint
4. Exempt internal health checks
5. Review the limit after launch

A much longer paragraph, to give the minimap one tall block among short ones. It goes on for a while about trade-offs: a lower limit protects the database but frustrates power users, a higher one does the opposite, and a burst allowance sits somewhere in between, letting short spikes through while keeping the sustained rate in check. None of this needs deciding now; it only needs to be long.

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

- ↑/↓ reach every block, first to last, and stop at the ends
- The minimap fits all blocks, sized by length
- The tall paragraph in section two shows as a taller bar
- Block N of M counts every block, headings excluded
- Review starts on the last block, already on screen
- Moving up into the first third jumps the view to the reply's top
- Moving back down into the last third jumps the view to the reply's end
- In the middle third the view stays where you scroll it
- Marks spread across sections all reach the suggestion in reading order
- The navigator's staged rows show the right opening words
