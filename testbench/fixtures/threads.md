## Threads test

Discussing a block in a thread (`d`), its summary, and whether it goes into the review. Run it in fullscreen (`/tui fullscreen`). Each block below is meant for one kind of thread; the checklist says what to ask in each.

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

### What to check

- **A thread that ends in a change** (the Redis paragraph): ask "should the TTL be longer for admins?", then "ok, 30 minutes for admins"
  - The answer says what to do, and doesn't claim to have done it: the thread can't change files
  - The pane's summary is an instruction to the agent, e.g. "Use a 30-minute TTL for admin sessions", not a recap
  - The switch turns itself on, and the suggestion has the summary under 💬 and the block's quote
- **A thread that ends in work to carry out** (the code block): ask "this retries with no delay, can you add a backoff?", then "yes, exponential, starting at 100 ms"
  - The summary names the work: the file or function to change and what to do, e.g. "Edit retry: add exponential backoff starting at 100 ms"
  - The switch turns itself on
- **A thread that only explains** (the blockquote paragraph): ask "what is a blockquote?"
  - The pane shows no summary, and the switch stays off
  - Nothing is added to the suggestion
  - Switching it on writes a summary that starts with "Context:", not an instruction
- **A thread that settles a choice** (the table): ask "which one for sessions?", then "Redis then, durability isn't needed"
  - The summary records the decision, with its reason in a few words
- **A thread that leaves a question open** (the last paragraph): ask "should the limiter count per IP or per account?", and don't answer the agent's question back
  - The summary has the open question for the agent, or the switch stays off if nothing was decided
- **Changing the summary**
  - In a thread with a summary, ask "drop the last point from the summary": the next answer's summary leaves it out, and the suggestion follows
- **Several threads**
  - Open two threads at once: each answers in its own pane, and the suggestion holds only the included ones, in the reply's order
  - The band counts the included threads, e.g. 💬2
