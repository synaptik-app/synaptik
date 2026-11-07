## Threads test

Discussing a block in a thread (`d`): the pane, its field, several threads at once, and threads on a code line or table row. What the summaries say is the summaries test. Fullscreen (`/tui fullscreen`), at least 144 columns. A thread takes the keyboard, and the review lets go; `Esc` on the pane gives the keyboard to the prompt box. So before clicking a block after a thread, click **the hint**: the band's "click here to review the reply".

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

**One thread**

1. **Do:** click the band's "click here to review the reply", then click the Redis paragraph, press `d`
   - **Expect:** a pane opens beside the transcript, titled `💬 "For the session store…"`, with the paragraph dim at its top
   - **Expect:** the keyboard is in the pane's field, and the review let go: the band no longer says "Block N of M"
2. **Do:** type `why Redis?`, press `⏎`
   - **Expect:** your message, "thinking…", then the answer, and the pane scrolled so the field shows
3. **Do:** type `first line`, then `\` and `⏎`, then `second line`, press `⏎`
   - **Expect:** `\` then `⏎` is a new line in the field, and the message is sent with both lines
4. **Do:** press `↓`, then `↑`
   - **Expect:** `↓` moves to the include switch, `↑` back to the field
5. **Do:** press `Esc`
   - **Expect:** the pane closes, and the paragraph has 💬 in its margin
6. **Do:** click the band's "click here to review the reply"
   - **Expect:** the review resumes: the band says "Block N of M" again
7. **Do:** click the Redis paragraph, press `d`
   - **Expect:** the thread opens again with its messages

**Several threads**

8. **Do:** send a question, then at once press `Esc`, click the hint, click the table, press `d`, and send another
   - **Expect:** both answer, each in its own pane, as tabs
9. **Do:** with the table's tab in front, press `Esc`, click the hint, click the Redis paragraph and press `d`
   - **Expect:** the Redis thread comes to the front

**Lines and rows**

10. **Do:** press `Esc`, click the hint, click the code block, press `s`, `↓` to the `return` line, press `d`
    - **Expect:** the pane's title and the anchor at its top are that line alone, coloured as code
    - **Expect:** after `Esc`, the line's margin shows 💬, and the block's ✸
11. **Do:** press `Esc`, click the hint, click the code block, then `d` on the whole block
    - **Expect:** a different thread opens, about the whole block
12. **Do:** press `Esc`, click the hint, click the table, `s`, `↓` to the Postgres row, press `d`
    - **Expect:** the pane shows the table's header and that row only

**Leaving**

13. **Do:** switch a thread on with its include switch, `Esc`, click the hint, click its block, press `Backspace`
    - **Expect:** the thread's switch is off when you open it again, and its messages are kept
14. **Do:** run `/synaptik off`, then `/synaptik on`, click the hint, then `d` on a block with a thread
    - **Expect:** off closes every thread pane; `d` opens the thread again, messages and all
15. **Do:** narrow the terminal below 144 columns, click the hint, click a block, press `d`
    - **Expect:** a toast says to use the band; `ctrl+x tab`, then `d`, opens the thread above the prompt
16. **Do:** widen it again, and send any prompt to the agent
    - **Expect:** with the new reply, the old threads' panes close, and its blocks have no 💬

When you're done: close any thread pane, click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
