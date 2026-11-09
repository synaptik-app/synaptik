# Threads

## 8. Threads

A thread is a side conversation about one block, or about one code line or table
row in it. **It never touches the main conversation.**

- Each message calls `$.model.fork`. `fork` is single-shot, so the mod re-sends
  the block and the thread so far on every call.
- A thread **never** calls `$.prompt.submit`, the only call that would write into
  the main conversation.
- Threads are flat. A thread cannot spawn a thread.
- `d` or `💬 discuss` on a block opens its thread; on a threaded block it reopens
  that thread with its history. A block's thread shows `💬` in the margin.
- **Stepped into a code block or table** (`s`, SPEC §10), `d` opens a thread on the
  selected line or row, its own and apart from the block's. The pane shows the
  part alone: a code line in its block's fences, a row under its table's header.
  The fork gets the whole block and which part (`The thread is about line 2:
  "…" of this block`). The line's margin shows `💬`, the block's `✸`.

### The pane

One pane per thread (`$.ui.open`, id `synaptik-thread-<block>`, or
`synaptik-thread-<block>_<line>` for a part: an id takes no dot), opened with the
keyboard in its field and closed by Esc. Docked beside the transcript, several
threads are tabs; inline above the prompt (narrow terminals), one shows at a time.

```
┌ 💬 "Use Redis for the session cache" ─────────────┐
│                                                   │
│   Use Redis for the session cache, keyed by…      │  the block as the reply draws it, dim, 3 rows at most
│                                                   │
│ › why not memcached?                              │  the person's messages at the edge
│                                                   │
│   Memcached has no persistence, so…               │  answers and the summary inset 2 columns
│                                                   │
│ ───────────────────────────────────────────────── │
│ ❯ ask about this block   ⏎ send · \⏎ new line     │  the field: 6 rows, whatever it holds
│ ───────────────────────────────────────────────── │
│ [ ✓ include in review ]                           │  Esc closes the pane, as any pane
│   ⎿  Actions: Add a 5-minute TTL to each entry.   │  the summary under the switch, dim
└───────────────────────────────────────────────────┘
```

**The field is 6 rows**, empty or not; a longer text scrolls within it. `\` then ⏎
(or Shift+⏎ where the terminal tells it apart) is a new line, as in the prompt box.
A field that grew with its text had to predict how Claude Code wraps it beside its
key hint; counted a row short, the text hid, and some wraps hid it whatever the
count (2026-11-06). A fixed height leaves wrapping and scrolling to Claude Code.

**The summary hangs under the switch** (`⎿`), while it is on, with no heading:
its sections' labels say what each line is, and the field keeps it apart from the
answers. Its state, when it has one, is a dim note beside the switch: `writing…`,
`updated with the answer`, `rewritten when you close this`, `nothing to send from
this thread`.

**The include switch** is a button: a click, or ↓ to it and ⏎. It shows
`✓ include in review` when on. No hotkey. ↑/↓ move between the field and the
switch however long the thread; the wheel and the page keys scroll it. The pane
follows the thread: after each change it scrolls to its end, once redrawn.

**A fork with no answer** says why in the pane: a resumed session has nothing to
fork until a turn finishes in it. An answer or summary that arrives after a new
reply is dropped, with the thread it belonged to.

**Threads run at once.** Forks run in parallel, each thread with one message in
flight at a time; the field says it is waiting.

**The review lets go** when a thread takes the keyboard and when it closes: Claude
Code hands the keyboard to the prompt then, and Synaptik can't give it back (#146).
A click on a block doesn't bring it back: outside a review the reply's blocks take
no click. `ctrl+x tab` or a click on the band's hint starts it again.

**Narrow terminals:** below 144 columns a pane is placed only when the person
opened it. `d` from the band (`ctrl+x tab`) counts; a click or key in the reply
doesn't, and a toast says to use the band (#146).

### Include / exclude

**Each answer brings the thread's summary and a verdict** (#156). The thread's
fork is asked to answer, then to add, in tags the pane strips, a summary of the
whole thread so far and `include` or `exclude`. No second call: it costs the
summary's few output tokens and a second or two on the answer. The prompts are in
`src/prompts.ts`.

**The summary is written for its use**: the person's next prompt to the agent,
under the block's quote. It comes in sections, each label once and only when it
has something: `Actions:` (changes to make and work to carry out: commands to run,
files to edit, tests to run; a thread can't run them, so they go to the main
conversation), `Decisions:`, and `Open questions:` only if one is left. A section
with one point keeps it on the label's line; with several, each follows as a
`- ` line. It sticks to what the thread discussed, and may refer to other parts of
the reply. Not what was only explained; no recap, no mention of a thread. A thread
that only explained has an empty summary and `exclude`; switched on anyway, it
gets a `Context:` section of a sentence or two.

**The verdict is the switch's default**, until the person sets the switch; it never
overrides them. Once they set it, no verdict is asked for, since none would change
it. Switched on by them, each answer brings a summary that always sends something
(a `Context:` section when nothing is to be done), and switching on writes one at
once if the last answers came without. Switched off by them, a message asks for the
answer alone. Included, the summary goes into the compiled prompt in document
order under its block's quote (§9). The pane shows the summary only while the
switch is on: what it shows is what goes. Switching on a thread the verdict left
out shows its summary, or writes one. The mod never decides what matters:
the model writes the summary and suggests the verdict, the person sees both. To
change the summary they ask in the thread ("drop the second point"), and the next
answer rewrites it; or they edit it in the prompt box like anything else before
sending. There is no editor in the pane.

**If an answer comes without its tags**, the summary is written when the pane
closes, with one more fork, as before; the band says `💬 summarising…` meanwhile.

`/synaptik off` closes the open threads and proposes nothing; the threads are kept,
and `d` opens them again once Synaptik is on.

Threads are kept with the tray, in `$.state`, and go with it: a new reply discards
them and closes their panes. Fullscreen only; classic's `d` still says phase 2.

`$.model.fork({ prompt })` asks one tool-less question over the session's own
transcript as the main thread last sent it: same model, same system prompt, served
from the prompt cache. Measured on 2.1.309: 16 uncached input tokens, ~51,000 read
from the cache, 2 s. It resolves `isAnswered: false` with a `reason` rather than
rejecting (`nothing-to-fork` before a session's first turn completes, and after a
resume until one does).
