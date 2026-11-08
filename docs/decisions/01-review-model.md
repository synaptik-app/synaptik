# Review model

### D1 — The response is a fillable form, not a thread host
**Status:** settled · reviewed, revised

**Decision:** The central metaphor is in-place marking of response blocks that
compiles into a single prompt. Interactions fall into three classes:

| Class | Input | Waits for a reply | Resume path |
|---|---|---|---|
| **Options** (accept, reject) | none | no | staged |
| **Comment** ("ok, but change x to 5") | free-form | no | staged |
| **Thread** | free-form | yes | its own, then staged |

**The axis is "does it expect a reply before you continue?"** — *not* "does it
need typing." Comment groups with accept and reject: all three are deferred
marks that compile into one prompt, and only a thread interrupts the flow.

**Comment ↔ thread conversion is free until the first prompt is sent.** Open a
comment, realise you need an answer, promote it with one key and the typed text
becomes the thread's opening message. The reverse works too. After the first
exchange the choice is committed, since a thread has history and a comment does
not.

**Rationale:** of the five frictions above, only one is genuinely a discussion.
The other four are marking. A thread for each would be heavier than the prose
being typed today.

**Revision note:** originally grouped verbs by *typed vs untyped* and named the
free-form mark "amend". Renamed to **comment** — amend implies editing Claude's
text, when the user is annotating it. Regrouped by *deferred vs waiting*.

**Accepted consequences:**
- The staging tray and compile step are core infrastructure, built in slice 1.
- Default UI state is *marking*, not *discussing*.
- Threads are cuttable — the mod is useful without them.
- The project's working name, "step threads", is now a misnomer.

**Rejected alternative:** *thread-first* — every interaction opens a discussion
pane, marking is a shortcut for the trivial case. Better if the real pain is
*thinking through* responses; worse if it is *processing* them quickly.

---

### D2 — Verb set: four verbs, two mechanisms
**Status:** settled · reviewed, revised

| Verb | Key | Mechanism |
|---|---|---|
| ✓ Accept | `a` | staged mark |
| ✗ Reject | `x` | staged mark |
| ✎ Comment | `c` | staged mark + input |
| 💬 Thread | `d` (empty) / `?` (pre-filled "explain this") | fork conversation |

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

**Explain was collapsed into Thread.** `?` opens a thread pre-seeded with
"explain this"; `d` opens an empty one. One mechanism, two entry points,
one-keypress ergonomics retained, one code path removed.

**Known cost of cutting Run:** responding to a proposed command costs a round
trip, because the agent must re-emit it before executing. Accepted, to avoid
maintaining a parallel execution path with its own failure mode.

#### Revision 2026-10-24 — naming; `?` removed

The verbs are **accept · reject · comment · discuss**. *Discuss* opens a
**thread**, which is anchored and private until included, as a GitHub review
thread is. Inside a thread, **branch** turns it into a session of its own:
Claude Code's `/branch`, which creates a branch of the conversation at that
point (`/fork` is a background session or agent; checked on 2.1.308). The table
above keeps its old label and key: read "💬 Thread" as 💬 discuss, on `d`.
**`?` is removed.** A thread pre-seeded with "explain this" is not worth a
second key. Design of the thread pane and of branching: #106.

---

### D3 — Deferred vs waiting; threads commit explicitly
**Status:** settled · reviewed, revised

- **Accept / reject / comment** — deferred. Nothing reaches the agent until the
  main prompt is submitted.
- **Thread** — opens immediately, but sends nothing until committed.

**Threads are consequence-free by default.** A thread is fully interactive, but
has no effect on the main conversation unless committed. Close it and it is as
if it never happened.

**Rationale:** since Explain is now a thread (D2), most threads will be
read-only understanding with nothing worth sending. Auto-staging them would
pollute every prompt with explanations requested purely to understand. It also
keeps "never mind, I was wrong" from reaching the agent.

#### Commit flow

1. **Esc** closes the thread. Nothing sent. *This is the default.*
2. **The commit key** commits. The mod fires one more `fork` call at the thread:
   *"summarize what was decided here as an instruction to the main agent."*
3. The summary lands in the tray as an **editable** row.
4. It compiles with the other marks into the band preview, and goes out with
   them when the tray is submitted (D29). The copy key puts the whole thing in
   the prompt box first, if a final edit is wanted.

Per P2, the mod never analyses what is worth sending — the model summarizes and
the user approves. Two review points, both free.

**Rejected alternative:** stage the raw thread transcript. Zero machinery and
nothing lost, but a ten-message thread dumps ten messages into the prompt and
the main agent must re-derive the conclusion anyway.

**Accepted caveat:** summarization is lossy and will occasionally drop the
nuance the thread was about. Mitigated by the summary being editable. If it
needs frequent rewriting, fix the summarizer prompt — not the mod.

#### Build note — commit is a toggle, not a button

Render the commit control as an **include/exclude state the user can flip**,
showing the summary that would be staged. In MVP it defaults to *excluded* and
the commit key flips it. With auto-classification (E6) it defaults to the
classifier's verdict and the same key overrides it. Costs nothing now; makes E6
a change to one default rather than a UI rework.

#### Two submits, two surfaces

| Action | Where | Effect |
|---|---|---|
| commit key | thread pane | thread summary joins the tray |
| submit key | band | the whole tray compiles and sends (D29) |

`Enter` in the prompt box is **not** a tray submit: with text in the box it
sends that text alone and the marks are discarded, with a warning (D24).

**Key bindings are deliberately unnamed here.** `⌃S` was an early candidate and
is **rejected** — see D20: it is the classic terminal XOFF and some terminals
freeze output on it. Actual bindings are settled in the spike (D27).

This separation is what allows threading on three blocks, committing all three,
and sending once. Requirements must give these distinct keys and clear
affordances, or a user will commit a thread believing they sent a prompt.

---

### D4 — Block segmentation: uniform verbs, flat navigation, structured output
**Status:** settled · reviewed, substantially revised

**Every block gets every verb.** No capability matrix.

**Revision note:** the original restricted verbs by block type — list items got
everything, paragraphs got discussion only, on the reasoning that "accepting a
paragraph of prose is meaningless." **That was wrong.** Much of Claude's advice
arrives as prose ("I'd recommend Redis here because…"), and accepting it is
perfectly meaningful; the matrix would have made the verb bar useless on half of
real responses. It also violated P2 — the mod deciding, on the user's behalf,
that a mark is semantically invalid.

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

(Format as in D6's compile section and `SPEC.md` §9.)

Cheap to record now, impossible to retrofit once the compile format is fixed.

**Genuinely ambiguous case:** rejecting a parent while accepting a child. Goes
out as-is; the agent resolves it (D22, P2).

---

### D5 — Blocks are derived at render time; no IDs are stored or shown
**Status:** settled · reviewed, substantially revised

Split the message text into blocks at render time and key marks by **position**.
No stored IDs, no `session.append` hook, no persistence.

**Revision note:** the original assigned IDs in `session.append` for anchor
stability, on the assumption that the user would *type* block references into a
prompt. Modal navigation (D20) removed that assumption, and the stability
argument turned out to be free: per D24 only the completed last message is
markable, so its text is fixed, so parsing it repeatedly yields identical blocks.
Deterministic input, deterministic output.

**Rule that falls out: marking is disabled while streaming.** Mid-stream the
text is still growing, so indices would shift. Gate on `turn.complete`.

**`session.append` moves to extension points** (E13), where it earns its place:
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

The gutter shows the result directly: a cleared block drops back to a dim `▏`
with no symbol. No state the user cannot see. (Gutter characters are defined in
D21: bright `▎` for the selected block, dim `▏` for the rest.)

---

### D24 — MVP scope: last message only
**Status:** settled · reviewed 2026-10-13

Only the most recent assistant message is interactive, and only once its turn
has completed (D5). No historic interactivity. Eliminates the stale-mark problem
entirely, and is what makes render-time segmentation safe.

#### Q7 resolved: discard with warning

**The mod never adds itself to a prompt the user typed.** Type your own prompt,
it goes alone — no appended marks, no interception of `prompt.submit`.

The consequence follows: that prompt produces a new assistant message, D24 makes
only the newest message markable, so marks staged on the previous one are
orphaned and go.

**The risk is doing it silently** — sending a quick side question intending to
return to five marks, and finding them gone with no sign they existed.

**Shown in the band, before it happens.** No interception, no double-Enter, no
dialog. The mod knows the box has text, and the band line changes:

```
5 marks staged · ⏎ sends your text only — marks discarded · ⇥ to use marks instead
```

Read one line above the cursor while typing. The band should be **loud** here —
different colour, not the usual dim — because this is the one place in the mod
where work can be lost. Everything else is reversible.

**How the mod knows the box has text:** `$.prompt.read()` from the band's render
hook, which needs no extra registration — the band redraws anyway. The
`prompt.edit` event (fires when the user edits the box, observe-only, returns
`next(e)`) is the fallback if `read()` does not serve. Prefer `read()`: one
fewer hook, and the surface stays at four event types (`SPEC.md` §11).

**If discarding turns out to be annoying in practice, the fix is E13** —
persisted marks that survive a new message — not a confirm dialog.

#### Additions 2026-10-15

- **Off during a turn.** From `turn.start` to `turn.complete` the reply and band
  draw as vanilla. A reply on its way will replace the tray; staging against it
  has no use.
- **On after a resume.** `session.start` adopts the transcript's last reply, so a
  resumed session is markable without a new turn. A resume appends a synthetic
  `No response requested.` assistant row, skipped by its text — `SessionMessage`
  has no flag for engine-written rows (§11, item 11).

---

## Extensions

### E7 — Mod-driven Run verb (cut from D2)
**Status:** proposed
Execute a proposed command from the response directly, with edits.
**Requires:** `$.process.run`, output capture, and **feeding results back** —
running without feedback silently desyncs the agent's picture of the world.
**Weak case now:** D15's delegate loop covers it at the cost of one round trip.

### E9 — Nudge Claude toward `AskUserQuestion` (was D25)
**Status:** proposed
A `prompt.compose` section could raise the tool-usage rate. **Three cautions:**
it changes behaviour session-wide; the tool's shape (a few short options) does
not fit open-ended questions, so pushing hard would produce *worse questions in
tool form* rather than better ones in prose; and it sits in tension with P1.
Only relevant if E12 is built.

### E11 — Multi-message interactivity
**Status:** proposed
Marking older messages, not just the last (relaxing D24). Reintroduces the
stale-mark problem D24 exists to avoid, and requires E13.

### E12 — `AskUserQuestion` interception (was D9, D11, D12, D13)
**Status:** proposed
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

### E13 — Persisted block identity (was D5's `session.append`)
**Status:** proposed
Assign stable IDs at store time so marks survive a restart and can attach to
messages that are no longer last. Prerequisite for E11.

### E14 — Custom structured payload via `$.tool.register` (was half of D7)
**Status:** proposed
A mod-registered tool letting Claude hand over arbitrary structured items.
**Depends on** Claude choosing to call a tool it has no habit of calling, and
sits in tension with P1.

## Superseded

### D7 — Structure comes from tool payloads, not prose markup
**Status:** superseded → E12, E14 · the principle survives as P1

Never ask Claude to emit `{?}` / `<block>` markers in prose: a schema cannot
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
**Status:** dead · killed by P1, then moot under E12

Proposed that each tool-supplied item carry an `anchor_quote` so its control
could be drawn inline. That required the model to send a field it does not
currently send — exactly what P1 forbids. The conflict was not noticed when D8
was written.

**If E12 is ever built:** tool questions render at the end of the message, in
order, which is where Claude Code puts them anyway.

---

### D9 — Unified question model
**Status:** superseded → E12 · moved to E12

Was the design's keystone: one `Question` schema, two sources (tool and prose),
two resume paths. It was load-bearing only because tool questions existed.

**With `AskUserQuestion` out of MVP, there is no question model at all.** A
question Claude asks in prose is simply a block, and the user comments on it
with `c` like any other block. Same verb, same tray, same compile step.

---

### D10 — Build the prose path first
**Status:** superseded → D4 · no longer a separate decision

Its content — prose questions need no model cooperation, detection is a dumb
heuristic, a miss is harmless — is now simply how blocks work. There is no
second path to build first.

---

### D11, D12, D13 — Held tool calls, Discuss, answer-and-forward
**Status:** superseded → E12

All three existed to manage a held tool call: the gate (D11), the fix for
Discuss destroying sibling questions (D12), and the escape hatch for typing
while a call is held (D13).

**MVP holds no tool calls, so none of this exists.** This also retires **Q1 and
Q2** — the riskiest unknowns in the whole design, since everything rested on how
long Claude Code tolerates a held call.

---

### D25 — Nudging Claude toward `AskUserQuestion`
**Status:** superseded → E9 · now also in tension with P1

---
