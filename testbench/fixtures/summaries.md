## Summaries test

What a thread's summary says, whether it is sent, and how the include switch decides. The pane itself is the threads test. Fullscreen (`/tui fullscreen`), at least 144 columns. Each kind of thread below is on its own block; open it with `d`.

For the session store, use Redis with a 5-minute TTL on every entry, keyed by user id.

```ts
export function retry(fn: () => Promise<void>, times = 3) {
  return fn().catch(err => (times > 0 ? retry(fn, times - 1) : Promise.reject(err)))
}
```

| Option | Latency | Durability |
|---|---|---|
| Redis | low | snapshots |
| Postgres | medium | full |

A Markdown blockquote is drawn as an indented, quoted passage, and Synaptik treats the whole quote as one block.

Next, I'll add the rate limiter to the login endpoint and run `npm test` once it's in.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

**What the summary says**

1. **Do:** on the Redis paragraph, ask `should the TTL be longer for admins?`, then `ok, 30 minutes for admins`
   - **Expect:** the answer says what to do, and doesn't claim to have done it
   - **Expect:** under the switch, `⎿  Actions: Use a 30-minute TTL for admin sessions.` or close to it: an instruction, not a recap
   - **Expect:** the switch turned itself on, and the suggestion has the summary under `💬 "For the session store…"`
2. **Do:** on the code block, ask `this retries with no delay, can you add a backoff?`, then `yes, exponential, starting at 100 ms`
   - **Expect:** `Actions:` names the work: what to edit and how, e.g. "Edit retry: add exponential backoff starting at 100 ms"
3. **Do:** on the table, ask `which one for sessions?`, then `Redis then, durability isn't needed`
   - **Expect:** `Decisions:` records it, with its reason in a few words
4. **Do:** on the last paragraph, ask `should the limiter count per IP or per account?`, and don't answer its question back
   - **Expect:** `Open questions:` has it, or the switch stays off
5. **Do:** in any thread with more than one kind of point, read the summary
   - **Expect:** each label appears once; several points under one label are `- ` lines
   - **Expect:** it stands on its own: nothing like "the equivalents" or "as discussed", no "now" or "then"

**A thread that only explains**

6. **Do:** on the blockquote paragraph, ask `what is a blockquote?`
   - **Expect:** no summary under the switch, the switch off, and nothing added to the suggestion
7. **Do:** switch it on
   - **Expect:** "writing…" beside the switch, then a `Context:` of a sentence or two, saying what you asked about, in your voice
8. **Do:** ask `and in HTML?`
   - **Expect:** the switch stays on, and the `Context:` is rewritten to cover both, never "nothing to send"

**The switch by hand**

9. **Do:** in the Redis thread, switch it off
   - **Expect:** the summary disappears from under the switch, and from the suggestion
10. **Do:** ask `and for guests?`
    - **Expect:** an answer, the switch still off, and no summary written
11. **Do:** switch it on again
    - **Expect:** "writing…", then a summary covering the whole thread, guests included

**Changing it, and several threads**

12. **Do:** in a thread with a summary of several points, ask `drop the last point from the summary`
    - **Expect:** the next summary leaves it out, and the suggestion follows
13. **Do:** close the panes, press `q`, look at the suggestion and the band
    - **Expect:** only the threads switched on are in it, in the reply's order
    - **Expect:** the band counts them, e.g. `💬3`

When you're done: close any thread pane, click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
