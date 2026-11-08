# Threads

### D14 — Thread isolation via `$.model.fork`
**Status:** settled · added by 2026-10-14

Threads use `$.model.fork` exclusively. A thread **never** calls
`$.prompt.submit`.

**Rationale:** `fork` is a separate model call whose request and reply never
enter the main conversation's message list, so crosstalk is impossible by
construction. `$.prompt.submit` is the one call that would write into the main
conversation.

**Known limitation:** `fork` is single-shot. For a multi-turn thread the mod
re-sends the accumulated side Q&A on each message and owns that history itself.
This is also what makes E2 possible later — the thread is a clean, mod-owned
transcript that can be handed to another session deliberately. Where threads
are drawn is D45.

---

### D15 — Escalation ladder
**Status:** settled · added by 2026-10-14

```
accept/reject → comment → thread → delegate to main agent
```

Each rung is one keypress from the last. Start at the cheapest; promote when it
is not enough.

**A thread that needs tools does not abandon — it asks.** Its committed conclusion can say "this needs running";
the main agent executes next turn and the result arrives in a response that can
itself be marked up.

**This closes the loop:** thread → conclusion with an action → main agent runs
it → new response → mark that up. The mod is iterative, not one-shot.

**Revisions**
- **by 2026-10-14** — the fourth rung was a branched session with tools; it moved to
  E1, and delegating to the main agent took its place.

---

### D45 — Threads in a pane of their own, one per block
**Status:** settled · added 2026-11-02

**A thread gets its own pane, one per block** (#106). It places D14's threads after
D41: a fullscreen review happens in the reply and the navigator is classic-only,
so the thread can't be the navigator's body. It doesn't go under its block in the
reply either: a conversation grows, would push the reply around, and the
transcript can't scroll to a block (#64). A pane gives typing its own field and
scroll, and sees Esc.

**The field is a fixed 6 rows.** Claude Code wraps and scrolls it, and `\` then ⏎
is a new line.

**Include is a switch**: a button showing its state; no hotkey, since the field
holds the keyboard and ↓ reaches the button. **The thread's own fork adds a summary
and an `include`/`exclude` verdict after each answer**, in tags the pane strips:
one call, about a tenth more per message (#156). The verdict sets the switch until
the person touches it. Once they set it, no verdict is asked for: on, every
answer's summary is written as one the person chose to send (`INCLUDED_ANYWAY`);
off, only the answer is asked for, and switching on writes the summary then.
Closing (Esc) writes a summary only when an answer came without one. This settles
E6, by a verdict in the same call rather than `$.model.classify`.

**The summary is written for its use**, as the person's instruction to the agent,
in sections: `Actions:` (changes and work to carry out — both are what the agent
does next), `Decisions:`, `Open questions:`, and `Context:` for a thread switched
on with nothing else to send, kept to a sentence or two. Not a recap: a thread
can't run commands and the main conversation has to (`src/prompts.ts`). It sticks
to the thread's discussion but may name other parts of the reply, since a row is
often weighed against its neighbours. **It hangs under the switch**, led by `⎿` as
a tool's result hangs from its call, **and only while the switch is on**: what is
shown is what goes. Its state is a note beside the switch. Editing it is the prompt
box's job, as for every other mark.

**From the spike, on 2.1.309:**
- Two forks sent together both answered, 0.8 s apart: they run in parallel, so
  threads need no queue.
- A fork reads the main conversation from the cache (~51,000 tokens) and pays for
  ~16 uncached ones: a thread costs about its own text. A separate fork per answer
  for the summary would have doubled that (each re-reads ~74,000 cached tokens).
- `$.ui.focus` moves focus only inside the site that already holds it, so after a
  thread the keyboard can't go back to the review. Keeping the review on left the
  band naming ↑/↓ while they recalled prompt history, so **the review lets go**
  when a thread takes the keyboard or closes; `ctrl+x tab` or the band's hint
  starts it again (a click on a block doesn't: outside a review the blocks take no
  click).
- A pane opened from the reply is unasked, a `Client`'s post: below 144 columns it
  isn't placed. From the band it is.
- The pane's own close (`$.ui.close`) raised no `ui.close` in the log. Esc does,
  which is the one way out.

**Tried and dropped:**
- **A summary editor in the pane** (2026-11-04). A field holding the summary needs
  its height from how its lines wrap beside Claude Code's key hint, which can't be
  measured: too short, it hid the person's text; one-row fields per line wrapped
  and were cut; a fixed height worked but cost a lot of a narrow pane. Asking the
  thread to change the summary does the same with nothing to build, and the prompt
  box is there for exact wording.
- **A field that grows with its text**, which meant predicting how Claude Code
  wraps it beside its key hint (measured: by word, beside `⏎ send` on one row and
  ` ⏎ send · \⏎ new line` from two). A row counted short hid the text, and some
  wraps hide it whatever the count: an `Input` collapses when a row is filled
  exactly by a word and its space (#146).

**Considered:** `q` or a close button to leave a thread (the field types `q`, and a
close from the plugin hands the keyboard to the prompt just the same, so Esc does
it all); a thread inline under its block (above); one pane switching between
threads (tabs come free when docked).

**Revisions**
- **2026-11-04** — the summary and the switch's default come with each answer
  (#156). Before, the summary was written on close, so it appeared only after the
  person had left, and every switch was set by hand.
- **2026-11-05** — the summary comes in sections: a label on every line
  (`Context:` three times over) read as noise.
- **2026-11-06** — the summary hangs under the switch, only while it is on; a
  `Summary:` heading repeated what the labels say.
- **2026-11-06** — the field is a fixed 6 rows, not grown with its text (#146).
- **2026-11-06** — once the person sets the switch, the prompt follows it: a later
  verdict could come back `exclude` with an empty summary under a switch that was
  on.
- **2026-11-07** — corrected: a click on a block doesn't restart the review.

---

### D46 — A thread on a code line or table row
**Status:** settled · added 2026-11-05

Extends D43, D44 and D45. Stepped into a code block or table, `d` opens a thread
on that part, keyed as its mark is
(`3.5`). It is the block's thread's sibling, not part of it: a code block can hold
a thread on line 4 and another on line 12, each with its own summary and switch.

**The fork reads the whole block, and which part.** A line alone loses what it is
in, so the prompt quotes the block and names the part as the review would
(`line 4: "…"`). **The pane shows the part alone**, as Markdown that draws on its
own: a code line in its block's fences (keeping its colours), a row under its
table's header, drawn whole rather than cut at three rows.

**In the review** the summary nests under the line's reference, as a mark on the
line does, and its block is quoted first for context (SPEC §9). Clearing follows
the marks: Backspace on the block takes out its own mark or included thread first,
then its lines' marks and included threads, so nothing cleared is still sent.

**Considered:** a range of lines (no way to select one yet); a thread on the
block with the line quoted in the first message (the person would type what
stepping in already said, and the margin couldn't show where it is).

**Revisions**
- **2026-11-05** — before, `d` on a line or row toasted "discuss works on whole
  blocks for now".

---

## Extensions

### E1 — Branched sub-sessions (was D16, D17)
**Status:** proposed · added by 2026-10-14

A full Claude Code session **with the mod loaded**, so its responses carry the
same gutter, verb bar and threads — the mod running recursively, not a read-only
subagent view.
**Needs:** depth cap (was 2), lineage in `$.store` (shared machine-wide, 4 MiB).
**Open:** whether a mod can trigger `/branch` via `$.command.run`, or must start
the session another way *(was Q4)*. `session.end` fires on `/branch` with reason
`resume`, so a branch must not be treated as a real session end.
**The case is context isolation**, not tool access (D15's delegate loop covers
that), and it is a real need: one session exploring the database, the cloud setup,
or the front and back ends deserves its own context each. Branching goes through
Claude Code's own `/branch`, from a thread (E2, #106). **Not pursued:** a
Synaptik-owned session tree, and hiding branches from the resume list.

**Revisions**
- **2026-10-24** — the case is **stronger**, not weaker: it was "reconsider only
  after living with D15's delegate loop".

---

### E2 — Promote a thread to a branched session
**Status:** proposed · added by 2026-10-14

A `branch` button sits next to the thread. The branch carries **both contexts**:
the main conversation, which `/branch` gives, and the thread, which is passed
**in full** (summarized only if long). The thread is seeded with `$.prompt.fill`
for the person to send, never auto-submitted. `/branch` typed without the button
carries nothing, which is intended. Design: #106.

**Mechanism:** `/branch` forks the *main* conversation, which by design does
**not** contain the thread (D14). So the mod carries it deliberately: write the
thread to `$.store` → branch → the new session's `session.start` hook reads it
back and seeds the conversation. Better than implicit inheritance — you choose
what crosses over (anchor block + thread) and leave the rest behind.
**Open:** the handshake — how the new session knows it is a branch and which
thread it carries. Probably a `$.store` key written before branching and claimed
on start. Untested. Also *(was Q5)*: what a subagent session view exposes to a
mod, which may provide a ready-made pane for watching a branch.

**Revisions**
- **2026-10-24** — the `branch` button, and both contexts carried (#106).

---

### E3 — Worktree isolation (was D19)
**Status:** proposed · added by 2026-10-14

Branches share the working directory by default; the moment one edits files, the
main session's picture is stale and it does not know. Isolated git worktrees are
the correct answer. **Hooks:** `$.session.cwd`, `$.session.repo`.

---

### E4 — Summary-based merge between sessions (was D18)
**Status:** proposed · added by 2026-10-14

`$.session.send` from branch to parent → `session.receive` hook returns
`{ consumed }` so Claude does not read it immediately. **The branch merges back as
a commit**, as D3 does for a thread, one level up. The branch's result lands in the parent's tray as an editable
include/exclude row, in two parts:
- **Decisions**, a summary the model writes.
- **A change manifest**, which is read, not summarized (P3): files from
  `git diff --stat` against the state recorded when the branch started, and the
  commands run, with their status, from the branch's own transcript. The
  branch's mod instance builds it and sends it with `$.session.send`.

Excluding a branch that changed files raises a loud band warning (as D24 does):
that is exactly the surprise to avoid. With worktrees (E3), the manifest says
where the changes are, and moving them is a git merge. Explicitly lossy for
discussion; applied file changes need a real git merge, not a conversation merge.

**Revisions**
- **2026-10-24** — merge back as a commit, into the parent's tray. Before: the
  summary surfaced in a pane with a Merge button, then `$.prompt.fill`.

---

## Superseded

### E6 — Auto-classify thread outcomes
**Status:** superseded → D45 · added by 2026-10-14

As it stood when D45 took it in: decide automatically whether a thread has something worth appending, removing
the manual commit step.
**Primitive exists:** `$.model.classify`, alongside `complete` and `fork` — a
cheap classification call, so the work is the prompt and threshold, not
machinery.
**Design:** classify **auto-stages into the tray; it never auto-sends.** The
tray stays the one place where everything riding along is visible and removable.
**Show the verdict live in the thread pane** as an include/exclude state the
user can flip, with the summary that would be staged — a state reading
"included" without showing what gets sent is still opaque. Per D3's build note,
MVP already ships this as a toggle, so E6 changes one default.
**Failure modes, both hard to notice:** a false negative silently drops a needed
conclusion; a false positive quietly injects noise.
**Open:** Q9 — whether `classify` is cheap enough to run per thread turn rather
than only on close.

**Done another way (2026-11-04, #156):** D45 has the thread's own fork give a
verdict with each answer, as the switch's default — no `$.model.classify`.

---

### D16–D19 — Branched sessions, depth, merge, worktrees
**Status:** superseded → E1–E4 · added by 2026-10-14

Dropping sub-sessions removes the entire distributed half of the design:
cross-session messaging, lineage tracking, merge semantics and worktree
isolation. MVP is **one session, one process**. Threads are flat — a thread
cannot spawn a thread, and if one surfaces a new question it stays in that
thread.

**Note:** D15's loop *narrows* the case for E1 rather than merely postponing it.
Tool access was the main argument for branching, and the delegate loop now
covers it. What remains is **context isolation** — keeping an hour of
exploratory work out of the main context. Real, but a smaller argument. Re-test
after living with the loop. (E1 found it stronger, 2026-10-24.)

