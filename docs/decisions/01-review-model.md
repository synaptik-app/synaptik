# Review model

### D1 — The response is a fillable form, not a thread host
**Status:** settled · added by 2026-10-14

The central metaphor is in-place marking of response blocks that
compiles into a single prompt. Interactions fall into three classes:

| Class | Input | Waits for a reply | Resume path |
|---|---|---|---|
| **Options** (accept, reject) | none | no | staged |
| **Comment** ("ok, but change x to 5") | free-form | no | staged |
| **Thread** | free-form | yes | its own, then staged |

**The axis is "does it expect a reply before you continue?"** — *not* "does it
need typing." Comment groups with accept and reject: all three are deferred
marks that compile into one prompt, and only a thread interrupts the flow.

**A comment does not turn into a thread.** Discuss is its own action on the
block: the person decides to open a thread.

**Rationale:** of the five frictions in the problem statement
(`spec/README.md`), only one is genuinely a discussion. The other four are
marking. A thread for each would be heavier than the prose being typed today.

**Accepted consequences:**
- The staging tray and compile step are core infrastructure, built in slice 1.
- Default UI state is *marking*, not *discussing*.
- Threads are cuttable — the mod is useful without them.
- The project's working name, "step threads", is now a misnomer.

**Rejected alternative:** *thread-first* — every interaction opens a discussion
pane, marking is a shortcut for the trivial case. Better if the real pain is
*thinking through* responses; worse if it is *processing* them quickly.

**Revisions**
- **by 2026-10-14** — verbs were grouped by *typed vs untyped*, and the free-form
  mark was "amend": renamed **comment**, since amend implies editing Claude's
  text when the user is annotating it. Regrouped by *deferred vs waiting*.
- **2026-11-08** — no comment ↔ thread conversion. A comment could be promoted to a
  thread with one key, its text the opening message, until the first exchange.

---

### D2 — Verb set: four verbs, two mechanisms
**Status:** settled · added by 2026-10-14

| Verb | Key | Mechanism |
|---|---|---|
| ✓ Accept | `a` | staged mark |
| ✗ Reject | `x` | staged mark |
| ✎ Comment | `c` | staged mark + input |
| 💬 Discuss | `d` | a thread (fork conversation) |

*Discuss* opens a **thread**, which is anchored and private until included, as a
GitHub review thread is. Inside a thread, **branch** would turn it into a session
of its own (E2): Claude Code's `/branch`, which creates a branch of the
conversation at that point (`/fork` is a background session or agent; checked on
2.1.308). Design of the thread pane and of branching: #106.

**Verbs are idempotent entry points.** Pressing a verb again resumes or edits
rather than duplicating: `c` reopens the comment input pre-filled, `d` reopens
the existing thread with its history. **One comment and one thread per block,
maximum.**

**Run was cut.** The mod does not execute anything. If Claude proposes a command
in prose, the user comments *"run this with --verbose"*; the agent runs it next
turn through its own Bash tool and permission flow, and the result returns in
context. Building Run would have meant `$.process.run`, output capture, and
feeding results back — and skipping the feedback would silently desync the
agent's picture of the world. The comment loop removes that trap for free.
*(→ E7.)*

**Known cost of cutting Run:** responding to a proposed command costs a round
trip, because the agent must re-emit it before executing. Accepted, to avoid
maintaining a parallel execution path with its own failure mode.

**Explain is a thread.** Asking for an explanation is what a thread is for; no
separate verb.

**Revisions**
- **by 2026-10-14** — Run cut (E7); Explain collapsed into Thread, as `?`, a
  thread pre-seeded with "explain this".
- **2026-10-24** — the verbs are named accept · reject · comment · discuss (was
  "Thread"); `?` removed: a pre-seeded thread is not worth a second key.

---

### D3 — Deferred vs waiting; threads commit explicitly
**Status:** settled · added by 2026-10-14

- **Accept / reject / comment** — deferred. Nothing reaches the agent until the
  prompt is sent.
- **Thread** — opens immediately, but sends nothing unless included.

**Threads are consequence-free until included.** A thread is fully interactive,
but has no effect on the main conversation unless its switch is on. Leave it off
and it is as if it never happened.

**Rationale:** most threads are read-only understanding, with nothing worth
sending. Auto-sending them would pollute every prompt with explanations requested
purely to understand. It also keeps "never mind, I was wrong" from reaching the
agent.

#### Including a thread

The thread's pane shows an **include/exclude switch** and, while it is on, the
summary that would go (D45). The thread's own fork writes the summary — *what was
decided here, as an instruction to the main agent* — with a verdict that sets the
switch's default; the person flips it, and the switch then follows them. The
summary compiles with the other marks into the suggestion in the prompt box
(D30), where it can be edited before sending.

Per P2, the mod never analyses what is worth sending — the model summarizes and
the person decides. Two review points, both free.

**Rejected alternative:** stage the raw thread transcript. Zero machinery and
nothing lost, but a ten-message thread dumps ten messages into the prompt and
the main agent must re-derive the conclusion anyway.

**Accepted caveat:** summarization is lossy and will occasionally drop the
nuance the thread was about. Mitigated by the summary being editable. If it
needs frequent rewriting, fix the summarizer prompt — not the mod.

`Enter` in the prompt box with text of the person's own sends that text alone,
and the marks are discarded, with a warning (D24).

**Revisions**
- **by 2026-10-14** — commit is a toggle, not a button: an include/exclude state
  showing the summary, so auto-classification (E6) changes one default rather
  than the UI.
- **2026-10-15** — the commit key, the band preview and the tray's submit and copy
  keys give way to the suggestion in the prompt box (D29, D30).
- **2026-11-04** — the switch's default is the thread's own verdict, with each
  answer (D45, settling E6). In MVP it was *excluded*, flipped by a commit key
  that fired one more `fork` for the summary.

---

### D4 — Block segmentation: uniform verbs, flat navigation, structured output
**Status:** settled · added by 2026-10-14

**Every block gets every verb.** No capability matrix: much of Claude's advice
arrives as prose ("I'd recommend Redis here because…"), and accepting it is
perfectly meaningful. Restricting verbs by block type would make the verb bar
useless on half of real responses, and violate P2 — the mod deciding, on the
user's behalf, that a mark is semantically invalid.

**What is a block:**

| Element | Block? |
|---|---|
| Paragraph | Yes |
| List item (incl. nested) | Yes — **flat**, each item its own block |
| Fenced code block | Yes |
| Table, blockquote | Yes, treated as paragraphs |
| Heading | **No** — a label; marking it is ambiguous with marking its section |
| Multi-paragraph list item | One block (kept whole) |

**Flat nesting.** Sub-items are often where the real decisions live, so
collapsing them into a parent would hide exactly what the user wants to mark.

**But segmentation records a parent pointer per block,** because *navigation is
flat while the compiled prompt must preserve hierarchy.* Accepting a parent and
rejecting one child is normal refinement, not a contradiction — and the agent
can only read it that way if the output shows the nesting:

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✓ "5 minute TTL"
    ✗ "write-through on logout"
```

(Format as in D47 and `SPEC.md` §9.)

Cheap to record now, impossible to retrofit once the compile format is fixed.

**Genuinely ambiguous case:** rejecting a parent while accepting a child. Goes
out as-is; the agent resolves it (D22, P2).

**Revisions**
- **by 2026-10-14** — the capability matrix is gone. Verbs were restricted by block
  type — list items got everything, paragraphs discussion only, on the reasoning
  that "accepting a paragraph of prose is meaningless". That was wrong.

---

### D5 — Blocks are derived at render time; no IDs are stored or shown
**Status:** settled · added by 2026-10-14

Split the message text into blocks at render time and key marks by **position**
(the block's index, or `block.line` for a line inside a code block). No stored
IDs, no `session.append` hook, no persistence.

**Stability is free:** per D24 only the completed last message is markable, so
its text is fixed, so parsing it repeatedly yields identical blocks.
Deterministic input, deterministic output. Users never type block references
(D20), so nothing needs an ID.

**Rule that falls out: marking is disabled while streaming.** Mid-stream the
text is still growing, so indices would shift. Gate on `turn.complete`.

**`session.append` is an extension** (E13), where it earns its place:
marks surviving a restart, or multi-message interactivity (E11) where "it is the
last message and the text is fixed" no longer holds.

#### State model

The mod keeps its own structured state and **generates** the final prompt from
it at submit time. Nothing is accumulated as text along the way.

Per block, at most **one mark** and **one committed thread summary** — two
separate channels:

| Action | Effect |
|---|---|
| Change a mark (`a` then `x`) | Overwrites. One slot, last write wins. |
| Press the same verb twice | Unmarks (toggle off). |
| `c` on a commented block | Reopens the input pre-filled — edit, don't retype. |
| `d` on a threaded block | Reopens that thread with its history. |
| `Backspace` on a block | Clears it: mark gone, thread flipped to excluded. |
| Clear-all | Empties the tray in one action. |
| Mark **and** committed thread on one block | Both go out; agent resolves (D22). |

**Invariant: clearing unstages, it never destroys.** A cleared thread keeps its
conversation and can be flipped back to included — that is D3's toggle reached
from the block rather than the pane, not a second mechanism. A cleared comment
keeps its text, so a misfire costs nothing.

The reply shows the result directly: a cleared block drops its glyph. No state
the user cannot see.

**Revisions**
- **by 2026-10-14** — no stored IDs. They were assigned in `session.append` for
  anchor stability, on the assumption that the user would *type* block references
  into a prompt; moved to E13.

---

### D24 — MVP scope: last message only
**Status:** settled · added by 2026-10-13

Only the most recent assistant message is interactive, and only once its turn
has completed (D5). No historic interactivity. Eliminates the stale-mark problem
entirely, and is what makes render-time segmentation safe.

- **Off during a turn.** From `turn.start` to `turn.complete` the reply and band
  draw as vanilla. A reply on its way will replace the tray; staging against it
  has no use.
- **On after a resume.** `session.start` adopts the transcript's last reply, so a
  resumed session is markable without a new turn. A resume appends a synthetic
  `No response requested.` assistant row, skipped by its text — `SessionMessage`
  has no flag for engine-written rows (§11, item 11).

#### Discard with warning (Q7)

**The mod never adds itself to a prompt the user typed.** Type your own prompt,
it goes alone — no appended marks, no interception of `prompt.submit`.

The consequence follows: that prompt produces a new assistant message, only the
newest message is markable, so marks staged on the previous one are orphaned and
go.

**The risk is doing it silently** — sending a quick side question intending to
return to five marks, and finding them gone with no sign they existed.

**Shown in the band, before it happens.** No interception, no double-Enter, no
dialog. When something is staged and the box holds text other than the taken
suggestion, the band's summary line turns **yellow** (SPEC §7):

```
2 accepted · 1 comment staged · ⏎ sends only what you typed and drops them
```

Read one line above the cursor while typing. Loud, because this is the one place
in the mod where work can be lost. Everything else is reversible. The mod reads
the box with `$.prompt.read()` from the band's render hook, which redraws anyway.

**If discarding turns out to be annoying in practice, the fix is E13** —
persisted marks that survive a new message — not a confirm dialog.

**Revisions**
- **2026-10-15** — off during a turn; on after a resume.

---

## Extensions

### E7 — Mod-driven Run verb (cut from D2)
**Status:** proposed · added by 2026-10-14

Execute a proposed command from the response directly, with edits.
**Requires:** `$.process.run`, output capture, and **feeding results back** —
running without feedback silently desyncs the agent's picture of the world.
**Weak case now:** D15's delegate loop covers it at the cost of one round trip.

---

### E9 — Nudge Claude toward `AskUserQuestion` (was D25)
**Status:** proposed · added by 2026-10-14

A `prompt.compose` section could raise the tool-usage rate. **Three cautions:**
it changes behaviour session-wide; the tool's shape (a few short options) does
not fit open-ended questions, so pushing hard would produce *worse questions in
tool form* rather than better ones in prose; and it sits in tension with P1.
Only relevant if E12 is built.

---

### E11 — Multi-message interactivity
**Status:** proposed · added by 2026-10-14

Marking older messages, not just the last (relaxing D24). Reintroduces the
stale-mark problem D24 exists to avoid, and requires E13.

---

### E12 — `AskUserQuestion` interception (was D9, D11, D12, D13)
**Status:** proposed · added by 2026-10-14

Hold the tool call, render questions inline with their options, gate the resume
on all questions being answered, and fix Discuss so it does not destroy its
siblings.
**Why it was cut:** implementation cost, not value. It is the single most
valuable extension — it fixes a real bug in the current UX.
**Carries the riskiest unknowns:** Q1 (how long Claude Code tolerates a held
tool call — **test an intentionally long hold on day one**) and Q2 (the exact
semantics of `$.ui.ask`, which appears purpose-built for holding a call pending
a human answer).
**Reference implementation:** the `blast-radius` sample mod already holds a
risky shell command and shows proceed/cancel buttons. Read it first.
**Design notes preserved:** questions render at the end of the message in order
(D8); the answer-and-forward escape hatch returns partial answers and sends
typed text as a separate turn, without classifying answers as complete or
partial (D13).

---

### E13 — Persisted block identity (was D5's `session.append`)
**Status:** proposed · added by 2026-10-14

Assign stable IDs at store time so marks survive a restart and can attach to
messages that are no longer last. Prerequisite for E11.

---

### E14 — Custom structured payload via `$.tool.register` (was half of D7)
**Status:** proposed · added by 2026-10-14

A mod-registered tool letting Claude hand over arbitrary structured items.
**Depends on** Claude choosing to call a tool it has no habit of calling, and
sits in tension with P1.

---

## Superseded

### D7 — Structure comes from tool payloads, not prose markup
**Status:** superseded → E12, E14 · added by 2026-10-14

The principle survives as P1. Never ask Claude to emit `{?}` / `<block>` markers in prose: a schema cannot
drift, markup degrades indistinguishably from "nothing to mark", must be
stripped before drawing, and leaks into `claude -p` and subagent output.

**Both halves are now out of MVP.** The `AskUserQuestion` half went to E12; the
`$.tool.register` custom-payload half went to E14 — it was a bigger idea than
MVP needs and depended on Claude choosing to call a tool it has no habit of
calling.

**What remains:** MVP asks nothing of the model and parses everything
deterministically from response text (D4, D5).

---

### D8 — Tool-driven items anchor by quote
**Status:** dead · added by 2026-10-14

Killed by P1, then moot under E12. Proposed that each tool-supplied item carry an `anchor_quote` so its control
could be drawn inline. That required the model to send a field it does not
currently send — exactly what P1 forbids. The conflict was not noticed when D8
was written.

**If E12 is ever built:** tool questions render at the end of the message, in
order, which is where Claude Code puts them anyway.

---

### D9 — Unified question model
**Status:** superseded → E12 · added by 2026-10-14

Was the design's keystone: one `Question` schema, two sources (tool and prose),
two resume paths. It was load-bearing only because tool questions existed.

**With `AskUserQuestion` out of MVP, there is no question model at all.** A
question Claude asks in prose is simply a block, and the user comments on it
with `c` like any other block. Same verb, same tray, same compile step.

---

### D10 — Build the prose path first
**Status:** superseded → D4 · added by 2026-10-14

Its content — prose questions need no model cooperation, detection is a dumb
heuristic, a miss is harmless — is now simply how blocks work. There is no
second path to build first.

---

### D11, D12, D13 — Held tool calls, Discuss, answer-and-forward
**Status:** superseded → E12 · added by 2026-10-14

All three existed to manage a held tool call: the gate (D11), the fix for
Discuss destroying sibling questions (D12), and the escape hatch for typing
while a call is held (D13).

**MVP holds no tool calls, so none of this exists.** This also retires **Q1 and
Q2** — the riskiest unknowns in the whole design, since everything rested on how
long Claude Code tolerates a held call.

---

### D25 — Nudging Claude toward `AskUserQuestion`
**Status:** superseded → E9 · added by 2026-10-14

Moved to E9 as an extension; now also in tension with P1.

