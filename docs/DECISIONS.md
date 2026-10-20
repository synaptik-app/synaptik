# Synaptik — Design Decision Record

**Created:** 2026-10-12 · **Last updated:** 2026-10-15 (spike results)
**Status:** Spike done — **32 decisions and 3 principles**; P1, D20, D21, D24 and
D29 revised from it. The build spec is `SPEC.md`; this file holds the rationale
behind it. Open items from the spike are in §11.
**Framework:** Claude Code mods (CLI v2.1.287+, Desktop Code tab v2.1.286+)

> **Review convention.** Decisions keep their original numbers even when revised,
> collapsed or killed, so they stay citable across sessions. Numbers are never
> reused or renumbered. A dead decision says why it died rather than vanishing.

> **Direction of travel.** This pass removed far more than it added. Killed or
> moved out of MVP: the Run verb, Explain as a separate verb, the capability
> matrix, block IDs, ID expansion, tool-payload anchoring, the `session.append`
> hook, `$.tool.register`, the unified question model, and all
> `AskUserQuestion` interception. **The MVP now registers no tool hooks at all.**

---

## 1. Problem statement

Claude Code renders a linear transcript. Responding to part of it means
scrolling up, re-reading, and hand-writing prose that points back at it
("you said in step 3…"). Observed friction points:

- **Bulk approval.** A long response contains several suggestions. Responding
  means hand-writing a numbered list: `1. Ok as suggested, 2. use this
  approach instead, 3. change this to 5 and apply`.
- **Minor amendments.** Accepting a suggestion *with a tweak* costs a full
  sentence of prose each time.
- **Proposed commands.** Claude suggests running something as part of a larger
  plan, without calling it. There is no way to respond to that in place.
- **Lost context while discussing.** Clarifying one point means holding the
  others in your head and scrolling back to rephrase.
- **Question collapse.** When Claude asks a group of questions and the user
  picks "Discuss", the agent returns to the main chat and the remaining
  questions are lost — including ones already answered. *(Now E12 — out of MVP.)*

### Core insight

All of these are the same activity: **the user is hand-compiling a diff.**
They read the response, mentally mark each item (accept / reject / comment /
discuss), then serialize those marks into prose by hand.

**The mod's job is to let the user mark in place and compile the prompt for
them.** The response becomes a form to fill in; threads are one verb within
that, not the central metaphor.

---

## 2. Principles

Constraints that govern decisions rather than being decisions themselves.

### P1 — The mod never interferes with the prompt/response flow
**Status:** settled · added 2026-10-12 · **revised 2026-10-15** (was: "the agent
never knows the mod exists" — see the revision note at the end)

The compiled prompt reads exactly like something the user typed. No markers, no
IDs, no mod structures, no sender attribution. The mod does not ask the model
for anything, and does not teach it any protocol.

**Consequences:**
- The user always sees the exact text before it goes — in the band preview
  (D29), whether they submit it directly or copy it to the box first.
- Submission uses `$.prompt.submit({ asUser: true })`. The plain form prepends
  a sentence naming the mod as sender.
- Killed D6 and D8 outright, and reduced D7 to nothing.

**Open edge:** E9 (nudging Claude toward `AskUserQuestion` via `prompt.compose`)
does not touch user prompts, but does make the agent behave differently because
the mod is installed. A softer violation of the same family. Current lean: allow
it, since it changes *behaviour* rather than inventing a protocol. Revisit if
E12 is ever built.

**E16 is the deliberate exception**, and it is scoped as one: an opt-in
"extended" mode where the agent is told its response will be marked up. **P1
stays the default and the documented norm** — extended mode is the deviation, not
the other way round. The reasoning for keeping it that way is in E16.

#### Revision 2026-10-15 — what P1 actually protects

Secrecy was never the point. The concern is **interference**: the mod must never
put something into the flow between the person and the agent that the person did
not see and choose, and never block, rewrite or hold that flow. The agent
knowing the mod exists is fine.

**What stays:** no markers, IDs or protocol in the compiled prompt — not to hide
the mod, but because they are noise the agent would have to parse. The person
sees every word before it is sent (now in the prompt box, D30). `asUser: true`
stays, because the text *is* the person's.

**What this frees:** a slash command whose output the model reads (the kill
switch, a `/synaptik configure`); naming the mod where useful. E9 and E16 are
judged by the same test: do they change the flow, or only inform it?

### P2 — The mod relays, it does not analyse
**Status:** settled · added 2026-10-12 (implicit from the start)

The mod never decides what the user meant, what is worth sending, or how to
reconcile contradictions. It captures intent and hands it over verbatim; the
agent does the interpreting.

Visible in D3 (the model summarizes its own thread, the mod does not),
D22 (conflicts go out unresolved), and the deletion of the capability matrix
in D4.

### P3 — One mechanism, many sources: review what the transcript already holds
**Status:** settled · added 2026-10-13

> **Anything Claude produced, opened in a Synaptik pane, marked with the four
> verbs, compiled into one prompt.**

Response blocks are the first source, not the only one. The source list is
**configuration, not architecture** — each new one reuses the tray, the verbs and
the compile step unchanged.

**The enabler is that `$.session.messages()` is a plain read** — the newest 4,096
entries, no hook, no interception. Everything a turn produced is already there:
a denied command and its text, a diff, a file path, a plan, a task list, a failed
command's output. **Nothing needs gating, because none of it needs intercepting.**

#### The shape every source follows

1. The mod **reads** what the turn produced. It replaces nothing and gates
   nothing.
2. It offers *"open in Synaptik"* — a small additive affordance.
3. It draws **its own pane**, where it controls every character. Q10 does not
   apply: there is no Claude Code rendering to reproduce or match.
4. The four verbs apply. Marks join the same tray.
5. One prompt compiles out.

#### Why this beats gating, every time

The earlier instinct was to **intercept** the moment a decision is made — hold
the tool call, restyle the approval prompt, replace the diff row. That instinct
produced the two hardest and least tractable entries in this document (E5's
hook-ordering dead end, E12's held-call timeout risk).

Reviewing **after** is better on every axis:

| | Gating | Reviewing after |
|---|---|---|
| Hooks needed | tool hooks, held calls | a read |
| Risk to the session | can break the agent's flow | none (D23, D28) |
| Content stability | live | frozen snapshot — line numbers cannot move |
| The user's state of mind | deciding yes/no under pressure | composing several comments |

**At a decision point you want to answer quickly; review is a separate
activity.** Conflating them is what made the gating designs hard.

#### Sources, by promise

| Source | Where it comes from | Note |
|---|---|---|
| Response blocks | the message text | **Phase 1.** The spec. |
| Diffs and generated files | `git diff` via `$.process.run`, or `$.fs.read` | **E15** — likely worth more than phase 2 |
| A denied command | its text, read from the transcript | **E5**, rebuilt additively — see that entry |
| `TodoWrite` lists | arrives as structured data | zero parsing; comment, reorder, drop |
| Failed command output | the tool result | comment on specific stderr lines instead of describing which error |
| Plans (`ExitPlanMode`) | possibly just text in the transcript | **may come free** — if the plan renders as text, phase 1 marks it up already. Check in the spike. |

---

## 3. Decision records

Status values: `settled`, `provisional` (decided, revisit after dogfooding),
`deferred` (moved to extension points, §5), `dead` (no longer exists).

---

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

### D6 — Reference expansion by truncated quote
**Status:** **dead** · killed by D5 + P1

Existed only because the user was assumed to type block references. They never
do. Nothing to expand.

What survives is a formatting detail of the compile step, not a decision:
quotes run to roughly the first 6–8 words — long enough to locate, short enough
to stay readable in a stack of marks.

#### Compile format

No prose scaffolding. No "the user approved step 3", no "the user asked to
explain…". A marked-up outline of what Claude wrote:

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "write-through on logout"
✎ "Add a rate limiter" → make it 5 req/sec
💬 "Shard by tenant id" → defer sharding until >10k tenants
```

**Revision 2026-10-15:** the `Re your last message:` header is dropped. It read
like an email reply; the quotes alone locate everything, and no header is the
closest thing to text a person would type. Cut quotes end in three plain dots
(`...`), not the single `…` character.

Symbol, short quote, optional text, nesting preserved. The agent wrote this
message one turn ago, so a six-word quote locates anything — the user is
annotating, not re-explaining. **Threads contribute only their committed
summary**, with no mention that a discussion happened or what was asked.

---

### D7 — Structure comes from tool payloads, not prose markup
**Status:** reduced to nothing in MVP · the principle survives as P1

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
**Status:** **dead** · killed by P1, then moot under E12

Proposed that each tool-supplied item carry an `anchor_quote` so its control
could be drawn inline. That required the model to send a field it does not
currently send — exactly what P1 forbids. The conflict was not noticed when D8
was written.

**If E12 is ever built:** tool questions render at the end of the message, in
order, which is where Claude Code puts them anyway.

---

### D9 — Unified question model
**Status:** **dead in MVP** · moved to E12

Was the design's keystone: one `Question` schema, two sources (tool and prose),
two resume paths. It was load-bearing only because tool questions existed.

**With `AskUserQuestion` out of MVP, there is no question model at all.** A
question Claude asks in prose is simply a block, and the user comments on it
with `c` like any other block. Same verb, same tray, same compile step.

---

### D10 — Build the prose path first
**Status:** **absorbed into D4** · no longer a separate decision

Its content — prose questions need no model cooperation, detection is a dumb
heuristic, a miss is harmless — is now simply how blocks work. There is no
second path to build first.

---

### D11, D12, D13 — Held tool calls, Discuss, answer-and-forward
**Status:** **moved to E12** with `AskUserQuestion`

All three existed to manage a held tool call: the gate (D11), the fix for
Discuss destroying sibling questions (D12), and the escape hatch for typing
while a call is held (D13).

**MVP holds no tool calls, so none of this exists.** This also retires **Q1 and
Q2** — the riskiest unknowns in the whole design, since everything rested on how
long Claude Code tolerates a held call.

---

### D14 — Thread isolation via `$.model.fork`
**Status:** settled

Threads use `$.model.fork` exclusively. A thread **never** calls
`$.prompt.submit`.

**Rationale:** `fork` is a separate model call whose request and reply never
enter the main conversation's message list, so crosstalk is impossible by
construction. `$.prompt.submit` is the one call that would write into the main
conversation.

**Known limitation:** `fork` is single-shot. For a multi-turn thread the mod
re-sends the accumulated side Q&A on each message and owns that history itself.
This is also what makes E2 possible later — the thread is a clean, mod-owned
transcript that can be handed to another session deliberately.

---

### D15 — Escalation ladder
**Status:** settled · revised

```
accept/reject → comment → thread → delegate to main agent
```

Each rung is one keypress from the last. Start at the cheapest; promote when it
is not enough.

**Revision note:** the original fourth rung was a branched session with tools.
That moved to E1. The replacement is better: **a thread that needs tools does
not abandon — it asks.** Its committed conclusion can say "this needs running";
the main agent executes next turn and the result arrives in a response that can
itself be marked up.

**This closes the loop:** thread → conclusion with an action → main agent runs
it → new response → mark that up. The mod is iterative, not one-shot.

---

### D16–D19 — Branched sessions, depth, merge, worktrees
**Status:** deferred → §5 (E1–E4)

Dropping sub-sessions removes the entire distributed half of the design:
cross-session messaging, lineage tracking, merge semantics and worktree
isolation. MVP is **one session, one process**. Threads are flat — a thread
cannot spawn a thread, and if one surfaces a new question it stays in that
thread.

**Note:** D15's loop *narrows* the case for E1 rather than merely postponing it.
Tool access was the main argument for branching, and the delegate loop now
covers it. What remains is **context isolation** — keeping an hour of
exploratory work out of the main context. Real, but a smaller argument. Re-test
after living with the loop.

---

### D20 — Modal navigation with visible controls on the selected block
**Status:** settled · reviewed 2026-10-13, revised

Enter navigation → arrows move between blocks → Esc backs out one level per
nesting depth.

**Revision: visible controls, not hotkeys alone.** The selected block shows a
row of real `Button` elements; hotkeys work too, for whoever learns them. This
is the primary interaction — not a fallback.

```
▎ Use Redis for the session cache
    [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
▏ Add a rate limiter
▏ Shard by tenant id
```

The row moves with the selection, so **only one block's controls are on screen**
— which resolves D20's original tension without hiding the verbs. Labels are
visible, so nothing must be memorized, and `Button` takes both `label` and
`hotkey`, so both paths work from one definition.

**Comment is an inline `Input`** appearing in place under the block — better
than a popup, because the text being commented on stays visible while typing.

`Button`, `Input` and `Select` all render in the terminal.

#### Entry key — open, and less important than it looked

**`Cmd+S` is rejected.** On macOS the terminal emulator usually swallows Cmd
combinations before they reach the TUI, and Cmd does not exist in Linux or
Windows terminals. **`Ctrl+S` is worse** — it is the classic terminal XOFF and
some terminals still honour it, freezing output until `Ctrl+Q`.

Candidates, in order:

1. **A plain unmodified key while the prompt box is empty** — the way Claude
   Code already treats digits in the band. No modifiers, nothing to swallow.
2. **`Ctrl+G`** — rarely bound, reaches the TUI reliably.
3. **Esc-prefixed** (Esc then a key) — portable, slightly awkward.
4. **`Button`'s `action` prop**, which names one of Claude Code's own
   [keybinding actions](https://code.claude.com/docs/en/keybindings) and fires on
   whatever the user has bound — inheriting a key that is already portable and
   already consistent with the rest of the app.

**Settle by feel in the spike** (D27), alongside Q3 — the key cannot be chosen
without knowing what `ui.press` actually receives. Visible controls make the
mode self-evident once entered, so the entry key matters less than it first
appeared.

#### Notes for implementation

- `autoFocus` accepts only `true`, so focus is managed per render rather than
  by flipping a prop off.
- `Box` has a `hover` prop, which suggests **mouse interaction may work in the
  terminal**. Worth checking in the spike — if clicking works, discoverability
  comes free without touching the keyboard design.

#### Revision 2026-10-15 — what the spike found

**Q3 answered: no raw keys.** `ui.press` fires only for `Button`s. Keys reach a
mod only through a focus ring, which only the band and panes have — the reply
never takes focus. And a ring is **linear**: ↑, ←, ⇧Tab all mean "previous";
`ui.focus` reports where focus goes, never which key sent it. Arrowing through
blocks *of the reply*, as designed, is not possible.

**What works: a pane, and its scrolling.** In a pane ↑/↓ scroll, and `ui.scroll`
carries a signed direction. With the pane's tree kept two rows taller than its
window and the window pinned in the middle, every ↑/↓ is a direction signal; the
mod moves the selection and cancels the scroll. ←/→ (or Tab) walk the verbs on
the ring. That is D31.

**Tried and dropped along the way:**
- *Verbs and blocks on one band ring*: ↓ walked the verbs, then fell through to
  the next block. Confusing.
- *Borrowed Global actions for blocks* (`app:diffFileListUp/Down`, `ctrl`/`⌥` +
  ↑↓): did not fire on macOS — Mission Control takes `ctrl+↑`, and `⌥` needs the
  terminal's Option-as-Meta. Borrowing another feature's action is fragile anyway.
- *A bare digit from the empty prompt* to enter: it presses a band button, but
  `$.ui.focus` from there is refused; it did not give the band the keyboard.

**Entry key: settled as a user binding** (D32). `abovePrompt:focus` is an
ordinary action, `ctrl+x tab` by default.

**The navigation model — decided 2026-10-18: A, a pane in both renderers (#19).**
The options were A (the pane: ↑/↓ blocks, ←/→ verbs) and B (no pane: every arrow
moves blocks on the band's ring, verbs by letter keys). A won on what the spike
found, not on whether the pane earns its space:
- **↑/↓ apart from ←/→ needs a pane.** Only a pane turns ↑/↓ into a direction
  (`ui.scroll`); the band raises no scroll event for them when it has nothing to
  scroll (tested 2026-10-18), and making it overflow would take half the screen.
- **The classic renderer needs a pane regardless** — the reply above cannot be
  redrawn once scrolled off, so the pane is the one surface that stays current
  (#11, #31).
- **A pane cannot be taken by another mod** (D33): a greedy mod above Synaptik
  removed its in-place view, never the navigator.

Classic: the pane is a block viewer (#31, SPEC §10). Fullscreen: the docked
navigator, its design to be finished on #39.

---

### D21 — Selection highlighting is a gutter column
**Status:** settled · reviewed 2026-10-13

A single gutter column to the left of the text — bright `▎` on the selected
block, dim `▏` on the others — also carrying mark state (`✓ ✗ ✎ 💬`):

```
  Here's what I'd suggest:

▎ ✓ Use Redis for the session cache
▏   Add a rate limiter
▏   Shard by tenant id
```

One `Box` per block with a narrow left column, then the text.

**Rationale:** per-block borders are noisy and cost two rows each. One column
means no layout shift. **And the gutter cannot fail** — it is the mod's own
column, not a restyling of Claude's text.

#### Background highlighting is a nice-to-have, not the design

`Box` takes `backgroundColor`; `Text` takes `backgroundColor` and `inverse`
(the closest thing to a selection highlight in a terminal). But **`Markdown`
lists no background prop** — only `text`, `dimColor` and the link props. So
highlighting a block means either wrapping it in a `Box` with a background and
hoping that paints behind the child text, or rendering the block as `Text` and
giving up markdown formatting inside it. Neither is certain from the docs.

**This is the same uncertainty as Q10** — how much control a `ui.render` hook
has over message text. One question, two outcomes: good control means
highlighting is available; poor control still leaves the gutter working.

**This is the one part of the design that cannot be settled on paper.**
Everything else was decided by reasoning; how a marked-up transcript actually
*looks* in a terminal is only learned by drawing it. The
[interface gallery](https://code.claude.com/docs/en/plugins/mods/gallery) has
screenshots of most elements — the fastest way to judge a background behind
markdown before building it.

#### Revision 2026-10-15 — an accent bar on the selected block only

In use, a dim `▏` on every block was noise, and a single `▎` on the selected
block was too faint: the selection and its menu blended into the reply.

**Now:** unselected blocks carry no gutter, only their mark glyph. The selected
block gets a **solid accent bar down its full height** — a 1-cell `Box` with a
`backgroundColor` beside the text, which stretches to the block's height
(`Markdown` itself still takes no background). The menu hangs off it with an
accent `└`; the verb under the cursor is the primary button, the rest dim. A
comment shows under its block as `→ text`, not a second ✎.

The original gutter's promise survives: it is the mod's own column, so it cannot
fail by restyling Claude's text.

**Revision 2026-10-17 — the selection colour instead of a bar.** A `Box`
background wrapped around a block's `Markdown` does paint behind the text (Q10's
open half, answered). The selected block now takes Claude Code's text-selection
colour, theme key `selectionBg`, and the cyan bar goes: the reply carries no
accent colour, and the theme key follows light and dark themes. Tried: `gray`
(too strong), `blackBright` (close, still bright), a raw hex (too faint), a
background for staged blocks (too much colour in the reply). `selectionBg` comes
from the binary, not the documented API.

---

### D22 — Conflicting marks are not resolved by the mod
**Status:** settled

If a block is accepted and then threaded to the opposite conclusion, send
**both** without intervention. The agent resolves it in its next response.
Avoids inventing precedence rules the user would have to learn. See P2.

---

### D23 — The mod must be trivially disableable, and must fail to vanilla
**Status:** settled · reviewed 2026-10-13

Enabling and disabling must be a single step, at any point, leaving a vanilla
Claude Code session behind with the chat and flow unbroken. A hook that throws
or exceeds its 10-second budget is skipped — so a failed `ui.render` hook must
degrade to **plain Claude Code rendering, never a half-drawn transcript**.
`.catch(handler)` returning `next(e)` on each registration is where this lives.

**Now nearly free.** With no tool hooks (D28, E12), the mod cannot interfere
with the agent's operation at all. It draws, and it writes the prompt box.

#### The guarantee that makes this true

**The mod holds no state the conversation depends on.** D5 is what delivers
this: blocks are derived at render time and nothing is stored in the
conversation, so disabling mid-flow costs only the tray. The transcript is
untouched, and re-enabling just re-parses whatever message is current — nothing
to migrate, nothing to recover.

**This is a constraint to check future features against.** E13's persisted
block identity would be the first thing to test it.

#### Add: an in-mod kill switch

Beyond `--safe-mode` and `/plugin`, provide a key or `/command` that makes the
render hooks pass through while the session continues. **The failure actually
hit during development is rendering being *wrong*, not throwing** — and
restarting a session to escape it is painful mid-task.

**Available switches:** `claude --plugin-dir ./mod` loads for one session only
(and reloads the hooks module on save); `/plugin` disables an installed one;
`--safe-mode` disables everything for a session.

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

### D25 — Nudging Claude toward `AskUserQuestion`
**Status:** deferred → §5 (E9) · now also in tension with P1

---

### D26 — Config surface
**Status:** deferred → §5 (E10)

---

### D27 — A throwaway spike, then two thin phases
**Status:** settled · reviewed 2026-10-13, revised · **"throwaway" revised by D34**
(2026-10-18): the spike evolves into phase 1

Each phase is **thin but end-to-end** rather than a layer (all the parsing, then
all the state, then all the UI), so something usable exists at the end of each.

| | What | Delivers |
|---|---|---|
| **Spike** | a throwaway mod drawing one hardcoded message with a gutter, fake mark symbols and a selected row | answers Q3, Q10, the highlight question and the entry key — and whether the look holds up |
| **Phase 1** | real segmentation, accept/reject/comment, tray, band preview, submit | a mod usable daily. **No threads.** |
| **Phase 2** | threads via `fork`, commit toggle, model-written summary | the discussion half |

**The spike is not phase 1** — it is throwaway code written to answer questions,
then deleted.

**Revision note:** the original first slice bundled rendering and state
together, which would have meant discovering a rendering problem *after*
building the machinery that depends on it. D21 is the one part of the design
that cannot be settled on paper, so it goes first and costs almost nothing:
`--plugin-dir`, one `register.ts`, reloads on save.

**Phase 1 is the real test.** If marking without threads does not change how the
work feels, phase 2 will not save it.

**Rationale:** the project's real risk is scope growth, not poor tracking.

---

### D28 — Mods do not intervene in Claude Code's own tool runs
**Status:** settled

The mod does not gate, modify or execute tool calls Claude makes. The boundary
falls on a natural seam — two different surfaces, never confusable at runtime:

| | Surface | In MVP scope |
|---|---|---|
| Command **in the response text** (written, not called) | `AssistantMessage` render site | Yes — comment and thread apply |
| Command Claude **is calling** | `tool.call` | No — untouched |

**Consequence, now stronger than when written:** MVP registers **no tool hooks
at all**. The surface is three render sites (`AssistantMessage`, `AbovePrompt`,
`Pane`), the `ui.*` events, and `turn.complete`.

**The excluded case is real and wanted** — responding to an approval prompt with
"yes, but add `--verbose`" instead of rejecting and retyping. See E5.

---

### D29 — The band is the source of truth; the prompt box is a scratch copy
**Status:** settled · added and resolved 2026-10-12

**The whole decision:**

1. The generated prompt appears as a **dim preview in the band above the prompt
   box** (`AbovePrompt`), regenerating live as marks change.
2. **One key submits it** — straight to the agent via
   `$.prompt.submit({ asUser: true })`.
3. **One key copies it into the box**, overwriting whatever is there, for when
   the user wants to edit before sending.

Default path is one keypress. The edit path exists and is never touched unless
wanted.

#### Why the band, not the box

The box is where the user types; the band is the mod's own surface. Putting the
preview there means the user's typing is never disturbed, the preview
regenerates freely, and there is no divergence state to explain or display.
`AbovePrompt` is a documented render site and the `token-weather` sample already
draws there, so this needs no verification.

#### Band is authoritative, box is scratch

| | Behaviour |
|---|---|
| Band | always reflects current marks. Never edited, never stale. |
| Copy to box | **overwrites** the box every time. |
| Edits in the box | the user's, until they copy again — which discards them. |

**Overwrite-on-copy is correct** because copying is an explicit keypress, not a
side effect. The data-loss objection applies to *automatic* overwriting; an
explicit "give me a fresh copy" replacing the box is ordinary behaviour.

It also removes all merge logic: copy replaces, so there is no case where mod
text and user text must be combined.

**Possible mitigation, only if it stings in use:** show `box has edits — copy
will replace` in the band. Not worth building until felt.

#### `asUser: true` is required

The plain form of `$.prompt.submit` prepends a sentence naming the mod as
sender, which would tell the agent the mod exists. `asUser: true` sends the text
as the user's own words. See P1.

**P1 is not violated by direct submission.** The band already showed the user
the exact text; submitting it is not sending something behind their back. An
earlier draft of this decision routed everything through the box to preserve
P1 — that round trip bought only an edit the user did not want.

#### Rejected alternatives

| | Why rejected |
|---|---|
| Regenerate into the box, overwriting user edits automatically | data loss as a side effect of marking |
| Live preview in the box until the user edits it, then detach | needs a divergence state and a destructive re-sync key; the band makes it unnecessary |
| Merge mod text with typed text on submit via `prompt.submit` | the agent would receive text the user never saw |

#### Still open

- **The accept gesture** — which key submits, which copies. A candidate worth
  trying: `Tab` or Enter-on-empty-box to accept the band's preview, so it reads
  as accepting a suggestion rather than invoking a command. Settle by feel in
  slice 1.
- **`prompt.suggest`** (Q11) might allow the preview to live in the box as a
  true separate layer, skipping the copy step. **Not a dependency** — the band
  works. If `suggest` turns out nicer, it swaps in without redesigning anything.
- ~~**After sending, the tray clears**~~ — **resolved** together with Q7 (D24):
  the tray clears after sending, since the marks were consumed, and is
  discarded with a warning when a new message arrives by any other route.

#### Revision 2026-10-15 — the box, not the band, shows the prompt

The band preview worked, but the spike found a better place: **the prompt box
itself, as a dim suggestion** (D30). The band keeps a one-line summary and an
action line (SPEC §7) and no longer holds the compiled text. The principle of
this decision — the person sees the exact text, and the mod never merges into
what they typed — carries over unchanged.

---

### D30 — Send by live suggestion in the prompt box
**Status:** provisional · added 2026-10-15

The compiled prompt is proposed with `$.prompt.suggest` into the **empty** prompt
box after every tray change. `→`/`Tab` takes it, the box is where it is edited,
`⏎` sends it, `ctrl+c` clears it — all Claude Code's own gestures for its own
suggestions. A multi-line suggestion renders fine.

**Why:** the person sees the prompt where they will send it, and the edit step
comes free. It answers Q11: a suggestion cannot sit beside typed text, but it
need not — it is only proposed into an empty box, and the discard warning covers
the other case.

**Mechanics the spike settled:**
- A leading space: the box's cursor sits on a suggestion's first cell and would
  hide the first mark glyph.
- Comments re-propose when they finish (⏎, or focus leaving the field), not per
  keystroke.
- A suggestion **cannot be withdrawn**. When the last mark is cleared, a harmless
  placeholder replaces it (`Give me a sec to read through this.`) — something a
  person might type and safe to send by accident, guessing nothing about intent.
- When the box holds exactly the taken suggestion the band says `⏎ sends your
  feedback`; any other text brings back the discard warning.

**Open:** what the band says once the taken suggestion is edited (§11, item 6);
whether to veto Claude Code's own suggestions while feedback is staged (item 7);
surfaces where plugin suggestions never show (item 4) — there `s` in the
navigator sends directly.

---

### D31 — The navigator: a docked pane that maps the reply
**Status:** settled · added 2026-10-15 · **the pane stays, in both renderers**
(#19, 2026-10-18; see D20) · fullscreen design to finish on #39

A pane beside the transcript serves two jobs:

1. **Keys** — the scroll trick for ↑/↓, the ring for ←/→ (D20 revision). Its
   verb buttons and comment field are drawn hidden; the reply shows the cursor.
2. **Overview** — one bar per block sized by length; selected, staged and
   other bars distinct; staged blocks show their mark and opening words;
   comments under their block; `Your notes · ✓2 ✗1 ✎1` on top, the position at
   the bottom.

The overview exists because the pane could not be made narrow: a request for 4
columns drew ~23, so the width is spent on content.

**Limits found:** an unasked open waits undrawn below 144 columns; a module
reload closes it; the width a person sets is remembered and wins. Two things
were tried and dropped, both because the mod cannot see how the reply wraps:
mirroring the reply line for line, and highlighting the blocks the terminal
shows (§11, item 16).

**Classic renderer, 2026-10-18 (#31):** the same pane, placed inline, is a
**block viewer** — the selected block in full with its neighbours, menu and
comment — since the reply above cannot be redrawn once scrolled off. Sized once
per reply; trimmed with PgUp/PgDn beyond a third of the screen. Fullscreen keeps
the docked navigator with in-place review.

---

### D32 — Key bindings belong to the person
**Status:** settled · added 2026-10-15

A mod cannot declare key bindings or actions. So the mod **works with Claude
Code's defaults** (`ctrl+x tab`, ↑↓, Tab, ⏎, letter hotkeys, Esc), and better keys
are the person's own `keybindings.json` — documented, never written silently.
The band names whatever chord the person bound to `abovePrompt:focus`, read from
that file.

Recommended: a single chord for `abovePrompt:focus` in `Chat`, and ←/→ for
`abovePrompt:previous/next` in `Pane`. Costs to state alongside: `ctrl+s` gives up
`chat:stash`; the `Pane` arrows apply to every mod's pane and swallow the second
key of `ctrl+x ←/→` (pane resize).

**Candidate:** a `/synaptik configure` that shows the bindings it would add, asks
for confirmation, and merges them into the file (§11, item 10). Allowed under P1
as revised.

---

### D33 — Share Claude Code's surfaces with other mods; redraw only when needed
**Status:** settled · added 2026-10-17 · tested with the bench's `neighbour-mod` (#12)

Every surface Synaptik draws on except its own pane is shared with other mods,
and each is a **chain**: a hook that answers without `next(e)` hides every mod
beneath it. Found with the test bench's neighbour mod and its greedy toggle:

- **Chain order follows load order** — the order of `--plugin-dir` flags. The
  first loaded sits highest.
- **One mod redraws a reply.** Synaptik's in-place marks redraw the whole reply
  (`next(e)` returns an opaque handle that cannot be edited), so it cannot add to
  what a mod beneath draws. Whichever mod is higher wins that reply; a mod above
  that wraps with `next(e)` coexists.
- **The navigator cannot be taken away.** A pane belongs to one mod; with several,
  they become tabs. A greedy mod above Synaptik removed its in-place marks and
  band lines — and the navigator kept working: ↑/↓, verbs, comments, the
  suggestion.

**Decisions:**
1. **The band composes** with `next(e)`, Synaptik's lines last under a header —
   except **while reviewing**, when its band stands alone as the key legend for
   that mode. Brief, bounded, and the one deliberate exception.
2. **The reply is redrawn only when needed:** while the navigator holds the
   keyboard, or when a block in that piece of the reply is marked or being
   commented. Otherwise it is passed through with `next(e)`. Most replies are
   never marked, so for most of a session Synaptik is invisible in the chain.
3. **Everything essential lives in the navigator.** The in-place view is a bonus
   another mod can take; the function must survive any neighbour (bears on #19).

**Rejected:** calling `next(e)` for the reply and discarding the result — other
mods would run, nothing of theirs would show, and the reply would be drawn twice.

**Known risk, accepted for now:** while Synaptik redraws a reply it draws the
**transcript's** text. A mod beneath it that changes a reply's text — hiding
secrets, translating — is bypassed for that reply. Decision 2 narrows the window
to reviewing and marked pieces; it does not close it. Revisit if such a mod
appears; the upstream fix is a way to share one reply drawing (#23).

---

### D34 — The spike evolves into phase 1
**Status:** settled · added 2026-10-18 · **revises D27** ("the spike is throwaway")

D27 called the spike throwaway: write it to answer questions, then delete it, and
build phase 1 fresh from `SPEC.md`. By the end of spike 0 the code had outgrown
that: tested against the bench's fixtures, the classic renderer and a second mod,
with real fixes in it — the whole turn as the reply, multi-paragraph items, the
shared band, focus handling, the suggestion's re-proposal.

**Phase 1 evolves it, deliberately:**
- **Keep** the hooks file's tested behaviour and the tested `src/` pieces
  (`lastTurnText`, the compile step), renamed out of `spike-*`.
- **Rewrite the segmenter** properly from SPEC §3 — the most naive part; tables,
  quotes, code and multi-paragraph items with tests from the bench's fixtures.
- **Add a tray module** for §5's state rules, with tests.
- **Split the hooks file** (~700 lines) into a few files by surface.

**Why not rewrite:** it would redo work that was tested against real use, and
D27's reason — finding out whether rendering could work before building state on
it — has been served. D27's other point stands: phases stay thin but end-to-end.

---

### D35 — In-place marks after review: a configuration option, on by default
**Status:** settled · added 2026-10-18 · decided on #36

While the navigator holds the keyboard the reply always shows the selection,
menu, glyphs and comments. The question was what stays after Esc.

**Decision:** glyphs and comment lines **stay on marked pieces** of the reply by
default — the reply reads as the form you filled (D1). An option turns that off,
so the reply shows marks **only while reviewing** and is otherwise left to Claude
Code and other mods (D33). Tracked on #8.

**Why both:** for someone using Synaptik alone, persistent marks are the better
view. With other mods drawing on replies, or a mod that changes a reply's text,
Synaptik's redraw of a marked piece takes that piece from them (D33). The option
is the advice to give then: "switch off in-place marks after review".

**Unaffected either way:** the navigator's overview, the band summary and the
compiled prompt in the prompt box show everything staged.

---

### D36 — Distribution: a release zip now, a marketplace at v0.1, npm held
**Status:** settled · added 2026-10-18

How people get Synaptik before and after phase 1.

**Now: a zip on every release.** Pushing a tag `v<version>` builds
`synaptik-<version>.zip` from git and drafts a GitHub release with it
(`release.yml`). It is unzipped into `~/.claude/skills/` (every session) or passed
to `--plugin-dir` (one session). A file is easier to hand over than a clone,
works while the repository is private, and works on machines with no network.
Releases are cut when something visible lands, not after every PR.

**At v0.1 (#52): the repository becomes its own marketplace** —
`.claude-plugin/marketplace.json` listing `./hosts/claude-code`, installed with
`claude plugin marketplace add synaptik-app/synaptik`. Tried and working in #54,
then held back: by-name install and `claude plugin update` are worth offering
once phase 1 is done, not for an alpha. The zip stays on each release.

**npm: the scope is reserved, nothing is published.** `@synaptik-app` exists on
npm (`synaptik` unscoped is taken). A marketplace entry can name an npm package,
fetched through the person's own npm setup — which is what makes a corporate
mirror work — but the marketplace file itself cannot come from npm, so npm adds a
moving part without removing one. `claude plugin install <package>@npm` appears
in the CLI's help (2.1.287) but not in the docs, and is untested. Revisit if
Claude Code installs plugins from npm directly.

**Why not npm or a marketplace first:** the zip covers every case seen so far —
colleagues, a private repository, air-gapped machines (a mirror can host the zip
as an `archive` source) — with one artifact and no account on anyone's side.

---

### D37 — Blocks move by the keys only; the wheel scrolls the reply
**Status:** settled · added 2026-10-20 · decided on #62, #63, #64; closes #24

**Decision:** in the navigator the selection moves only by keys — ↑/↓ a block,
Home/End the first or last block (#63). The mouse wheel or a trackpad never moves
it: over the navigator it moves nothing (#62), over the transcript it scrolls the
reply. The selection does **not** follow the terminal's scrolling.

**What made it a choice, not a limit:** a logging-only spike (2.1.287, `run
long`, ~120 columns) showed `onScreen` updates on every wheel tick, one row at a
time, and the per-segment row estimate matched the piece's real height exactly
(spike finding 16 had called it never steady). Following the scrolling is
feasible.

**Why not, then:** navigation driven by the mouse is less predictable than by the
keys — the selection would jump as the person reads — and the pane already turns
↑/↓ into blocks. The wheel is what a person reaches for to scroll the reply, so it
stays that.

**Left open:** in fullscreen a reply taller than about two screens has a middle
the mod cannot bring into view (it scrolls only to a whole transcript row, top or
end). Parked on the API (#64), with what would unblock it; no workaround — a band
preview, folding far blocks, and following the scrolling were set aside.

---

## 4. MVP definition

**The whole of it:**

1. Parse the last **completed** assistant message into blocks (D4, D5)
2. Modal navigation, gutter highlight, visible controls on the selected block (D20, D21)
3. Four verbs: accept, reject, comment, thread (D2)
4. Tray state keyed by block position, with overwrite/toggle/clear (D5)
5. Show the compiled prompt as a live preview in the band; one key submits it, one key copies it to the box (D6 §compile, D29)
6. Threads via `$.model.fork`, include/exclude toggle, model-written summary (D3, D14)

Items 1–5 are phase 1; item 6 is phase 2 (D27).

**Hooks registered** — six registrations across four event types, as in
`SPEC.md` §11:

| Hook | Purpose |
|---|---|
| `ui.render` on `AssistantMessage` | Gutter, marks, selection |
| `ui.render` on `AbovePrompt` | Status band |
| `ui.render` on `Pane` | Thread pane (phase 2) |
| `ui.press` | Navigation, verbs, buttons |
| `ui.input` | Comment input, thread input |
| `turn.complete` | Open marking once the message is final |

**No tool hooks. No prompt-composition hooks. Nothing the agent can observe.**

**Out of MVP:** everything in §5.

---

## 5. Extension points

Parked capabilities, each with what it needs and which decisions it reactivates.
Nothing in the MVP design blocks any of these.

> These are parked for *different reasons*, which matters. E1 got **weaker** as
> a result of D15, not merely postponed. E5 is blocked on a hook-ordering
> problem that may have no clean solution. E7 is probably dead. E12 is
> straightforwardly valuable and was cut for implementation cost alone.

### E1 — Branched sub-sessions (was D16, D17)
A full Claude Code session **with the mod loaded**, so its responses carry the
same gutter, verb bar and threads — the mod running recursively, not a read-only
subagent view.
**Needs:** depth cap (was 2), lineage in `$.store` (shared machine-wide, 4 MiB).
**Open:** whether a mod can trigger `/branch` via `$.command.run`, or must start
the session another way *(was Q4)*. `session.end` fires on `/branch` with reason
`resume`, so a branch must not be treated as a real session end.
**Reconsider only after** living with D15's delegate loop — the remaining
argument is context isolation, not tool access.

### E2 — Promote a thread to a branched session
**Mechanism:** `/branch` forks the *main* conversation, which by design does
**not** contain the thread (D14). So the mod carries it deliberately: write the
thread to `$.store` → branch → the new session's `session.start` hook reads it
back and seeds the conversation. Better than implicit inheritance — you choose
what crosses over (anchor block + thread) and leave the rest behind.
**Open:** the handshake — how the new session knows it is a branch and which
thread it carries. Probably a `$.store` key written before branching and claimed
on start. Untested. Also *(was Q5)*: what a subagent session view exposes to a
mod, which may provide a ready-made pane for watching a branch.

### E3 — Worktree isolation (was D19)
Branches share the working directory by default; the moment one edits files, the
main session's picture is stale and it does not know. Isolated git worktrees are
the correct answer. **Hooks:** `$.session.cwd`, `$.session.repo`.

### E4 — Summary-based merge between sessions (was D18)
`$.session.send` from branch to parent → `session.receive` hook returns
`{ consumed }` so Claude does not read it immediately → summary surfaces in a
pane with a Merge button → `$.prompt.fill`. Explicitly lossy for discussion;
applied file changes need a real git merge, not a conversation merge.

### E5 — Edit and resend a denied command
**Rebuilt additively 2026-10-13 under P3. The gating design below is abandoned.**

The case: Claude proposes a Bash command, you deny it — but you did not want to
refuse the *command*, only to change a flag. Today that means denying, then
retyping the whole thing as a prompt.

#### The additive design

Deny normally, through Claude Code's own prompt, untouched. **The mod then sees
the denied call in the transcript** (`$.session.messages()`) and offers *"edit
and resend"*: an `Input` pre-filled with the command. Edit it, and it compiles to

```
run this instead: npm test -- --verbose
```

No tool hooks. No interception. The permission prompt is never touched, so its
hard constraint is simply irrelevant.

**It is also better UX than gating.** At a permission prompt you want to say no
quickly; composing a modified command is a separate activity. Denying first and
editing after matches what the user is actually doing at each moment.

#### The abandoned gating design, and why

Originally: intercept the approval and let the user answer it with an
instruction. **A mod can restyle most of the interface but not the permission
prompt** — the docs are unambiguous that "it can't change what a prompt shows
you."

The workaround was to compose two hooks: `tool.call` can return
`{ deny: reason }` and the reason reaches Claude (that *is*
reject-with-a-comment), while `tool.check` fires afterwards and reveals the
decision the rules and permission mode reached, which would let the mod act only
on calls that *would* have been asked about.

**The blocker:** `tool.check` returns only a decision, with no documented reason
field — and the reason lives on `tool.call`, which fires *earlier*, before the
mod knows whether approval will be asked for at all. The design is ordered
wrong, with no clean fix visible from the docs.

**Kept as a record of why not to try it again.** The additive version needs none
of it.

### E6 — Auto-classify thread outcomes
Decide automatically whether a thread has something worth appending, removing
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

### E7 — Mod-driven Run verb (cut from D2)
Execute a proposed command from the response directly, with edits.
**Requires:** `$.process.run`, output capture, and **feeding results back** —
running without feedback silently desyncs the agent's picture of the world.
**Weak case now:** D15's delegate loop covers it at the cost of one round trip.

### E8 — Other built-in tools
**Largely superseded by P3.** Most of what this entry wanted is reached by
*reading* the transcript rather than hooking the tool:

| Tool | Reached by | Entry |
|---|---|---|
| `Edit` / `Write` | reading the diff after the fact | **E15** |
| `Bash` (denied) | reading the denied call | **E5** |
| `TodoWrite` | reading the list | P3 source table |
| `ExitPlanMode` | possibly already text in the transcript | P3 source table — may come free in phase 1 |

**What is left that genuinely needs a hook:**

| Tool | Why | Gate or enrich |
|---|---|---|
| `Task` (subagents) | a *live* status pane needs to follow the run, not read it afterwards | Enrich |
| `WebSearch` / `WebFetch` | results as a pickable list, if picking should feed back into the same turn | Enrich |

**The principle worth keeping from the original entry:** `AskUserQuestion` is the
only built-in tool whose *purpose* is a human decision. Every other tool is
Claude doing work — so intercepting those adds interruptions rather than
decisions. Confusing the two produces a mod that interrupts constantly.

### E9 — Nudge Claude toward `AskUserQuestion` (was D25)
A `prompt.compose` section could raise the tool-usage rate. **Three cautions:**
it changes behaviour session-wide; the tool's shape (a few short options) does
not fit open-ended questions, so pushing hard would produce *worse questions in
tool form* rather than better ones in prose; and it sits in tension with P1.
Only relevant if E12 is built.

### E10 — Config surface (was D26)
The `userConfig` manifest field declares options and gives a `/config` surface
for free — rows rendered by Claude Code, with `config.set` and `config.describe`
hooks available if a row needs guarding or relabelling.

**Its real purpose is hedging the unknowns.** Several decisions in this document
were made on reasoning rather than use, and the honest position is that some will
be wrong. Making those configurable converts a wrong guess from a rewrite into a
default change:

| Option | Hedges |
|---|---|
| Which verbs are enabled | D2 — maybe reject is never used, maybe comment is everything |
| Entry key | D20 — unresolved, and terminal-dependent |
| Gutter vs background highlight | D21 — depends on Q10's answer |
| Submit directly vs copy to box | D29 — the "natural UX" question left to feel |
| Threads default excluded or included | D3 — flips to classifier-driven under E6 |
| Quote length in the compile format | §9 of the spec — 6–8 words is a guess |

**But config is not a substitute for deciding.** A mod with twenty options is a
mod nobody tuned. Add an option when use reveals a genuine split, not in
anticipation of one.

### E11 — Multi-message interactivity
Marking older messages, not just the last (relaxing D24). Reintroduces the
stale-mark problem D24 exists to avoid, and requires E13.

### E12 — `AskUserQuestion` interception (was D9, D11, D12, D13)
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
Assign stable IDs at store time so marks survive a restart and can attach to
messages that are no longer last. Prerequisite for E11.

### E14 — Custom structured payload via `$.tool.register` (was half of D7)
A mod-registered tool letting Claude hand over arbitrary structured items.
**Depends on** Claude choosing to call a tool it has no habit of calling, and
sits in tension with P1.

### E15 — Review the files a turn touched, in the same review
**Added 2026-10-13. Reframed 2026-10-14 and 2026-10-16. Likely the strongest
extension point — possibly worth more than phase 2's threads, since reviewing
generated code is where comments batch up most.**

Claude edits or creates a file. You want to leave **several comments across it
and submit once** — how a pull-request review works, and the same batching
insight the whole mod rests on (D1). Today each comment costs a round trip or
gets hand-assembled into prose.

#### The reframe: files are more of the same review, not a parallel surface

**One review scope per turn.** A turn completes; the review window covers the
reply **and the files that turn touched**. Marks on both go into **one tray** and
compile into **one prompt**. Submit, the tray clears, the next turn brings a new
reply and new files.

```
turn completes → review the reply + the files it touched
  → marks accumulate in one tray
  → submit → tray clears
  → next turn: new reply, new files
```

**This dissolves the staleness problem rather than mitigating it.** During review
the agent is idle, waiting for input — so nothing can move under you. No
snapshotting, no re-reading, no stale line numbers. It is D24's guarantee
("only the last turn, only once it is complete") extended to the files, and the
same reasoning as D5: derive once from fixed input.

*Caveat:* the agent is idle, but the person is not — they can edit a file, or run
a `!` command, mid-review, and a background agent can too. Rare, and the person
did it, but line numbers can then shift; re-read on opening a file rather than
caching across the review.

The turn boundary is the same one the reply already uses: **the whole turn is the
reply** (§11 item 12, fixed in #25), so text and files written between tool calls
belong to the same review.

An earlier draft of this entry treated files as a separate feature with their own
lifecycle, and argued the stability case only for diffs (frozen) and not for
created files (live). The turn boundary already covers both.

#### Shape: additive, never a restyle

**Nothing of Claude Code's is replaced.** The mod reads what the turn produced
and offers its own pane.

**The permission prompt is off-limits** — the docs are unambiguous that a mod
"can't change what a prompt shows you" (the same wall as E5). So the diff shown
*with* an approval request is untouchable. That is fine: this feature is not
about the approval moment. At a permission prompt you are deciding yes-or-no
under time pressure, not writing four comments. Review belongs *after* the change
lands.

#### Surface: the navigator lists files; ⏎ opens one

*Depends on the navigation model (#19).* This surface is model A — a navigator
pane with ↑/↓ for rows and ←/→ for verbs. Under model B there is no navigator to
list files in, and file review needs its own entry point.

The navigator (`synaptik-map`, SPEC §10) already lists the reply's blocks. Files
the turn touched are listed in it too, below the blocks. `⏎` on a file opens a
**file review pane**:

| | Navigator | File review pane |
|---|---|---|
| ↑ / ↓ | blocks, then files | lines |
| ← / → (or Tab) | the verb ring | the verb ring |
| ⏎ | open the selected file | apply the verb under the cursor |
| Esc | leave | back to the navigator |

**The mechanics already exist.** SPEC §10's scroll trick — a tree of
`bodyRows + 2` rows with its window pinned at offset 1, so ↑/↓ always have a row
to scroll to — is what separates ↑/↓ from ←/→ in a pane. A file pane gets its own
instance of it, with lines in place of blocks. The hidden verb ring works
unchanged.

**Staging a file** puts its comments in the tray like any block's.

#### Fetching the content

| | Fetch with | View |
|---|---|---|
| **Created** file | `$.fs.read(path)` — 4 MiB per file | whole content, line-numbered |
| **Updated** file | `$.process.run` → `git diff -- <path>` | diff, line-numbered |

Paths come from the `Edit`/`Write` tool calls in `$.session.messages()` (newest
4,096 entries) — so the mod knows which files the turn touched **even when the
reply never mentions them**.

**Precondition verified (2026-10-17, types of 2.1.287):** each `messages()` row
carries `toolUses[]`, and every entry has `input` — "the arguments the model gave
it" — as well as `result` and `text`. So an `Edit` or `Write` call gives its
`file_path`, and an `Edit` call gives its own before/after (`old_string` /
`new_string`). No fallback needed; a `/command` taking a path stays a possible
simplest first version.

#### Why this is easier than the main feature, not harder

**The pane is the mod's own surface.** Content is drawn from source text, so the
mod controls every character — **Q10 does not apply at all.** No reproducing
Claude Code's markdown rendering, nothing to match. By contrast SPEC §6 has to
redraw a reply that Claude Code already renders well.

**The pane shape is proven.** The built-in
[`diff` mod](https://github.com/anthropics/claude-code/tree/main/mods/diff) draws
a scrollable pane with buttons bound to keyboard actions and handles its own
scrolling. Public source, closest reference implementation.

#### Compile format

File comments join the reply's marks in the same prompt, grouped by file and
anchored by line:

```
✓ "Use Redis for the session cache"
✎ "Add a rate limiter" → make it 5 req/sec

in DbConnection.java
  line 5 — this should come from config, not a literal
  line 8 — close this in a finally block
in index.js
  line 42 — behind the feature flag please
```

Consistent with SPEC §9: no prose scaffolding, no explanation that a review
happened. The reply's marks keep document order; files follow, since they are a
different axis and interleaving them with prose blocks would read as noise.

#### Still open

- **Render cost for a large diff.** `Text` per line avoids the 10,000-character
  `Markdown` cap, but a 2,000-line file redrawing on each keypress may need
  windowing. `diff`'s source shows how it handles this.
- **Hunk-level verbs.** Accept/reject reads naturally on a hunk; comment and
  discuss read naturally on a line. Whether both granularities are needed, or
  lines suffice, is a feel question.
- **Which diff source.** `messages()` does give tool inputs, so the choice is
  real: the `Edit` call's own before/after says exactly what Claude changed;
  `git diff` on the working tree shows the file as it stands but cannot tell
  your edits from Claude's. Possibly both — Claude's change, with the file
  around it.
- **Many files in one turn.** A refactor touching twenty files makes the
  navigator long. Possibly a count with the files collapsed until opened.

#### Relationship to E8, D28 and issue #5

E8's `Edit`/`Write` entry is about **gating** a tool call before it runs. This is
reviewing **after** — a different moment, and it keeps D28 intact: the mod never
touches a tool call, it only reads what already happened.

**Field note #5** (code blocks need line-level granularity) wants this same pane
for a fenced code block inside a reply — line-numbered, same verbs, no file path.
If E15 is built, #5 is close to free.

**Do this after phase 1**, when the tray, navigator and compile step exist to
reuse rather than guess at.

### E16 — Extended mode: cooperate with the agent (**analysis needed**)
**Added 2026-10-14. The deliberate inverse of P1 — read that first.**

A mode switch: **simple** (the default, P1 intact — the agent never knows the mod
exists) versus **extended**, where the mod modifies the system prompt so the
agent *knows* its response will be marked up, and writes accordingly.

**Mechanism exists and is not in doubt.** `prompt.compose` hands over the system
prompt as a list of `{ id, text, scope }` sections and takes a modified list
back; `prompt.section` rewrites one section by name. So the question is never
*can* we — it is *what is worth asking for*.

#### What the agent could be asked to do, best ratio first

| Ask | Buys | Costs |
|---|---|---|
| **One decision per list item** — don't bury three choices in a paragraph | the single biggest win for marking: every decision becomes markable | low compliance risk; changes writing style on every turn |
| **Prefer `AskUserQuestion` when concrete options exist** (E9) | structured payloads instead of prose to parse | the tool's shape fits short options, not open questions — push too hard and you get *worse questions in tool form* |
| **Semantic tags** — mark which blocks are decisions vs explanation | the gutter could offer verbs only where they mean something | highest compliance risk, and markers must be stripped before drawing — the failure that killed D7 |

#### Why this is filed as analysis, not design

**The coupling is the whole problem.** This session's consistent finding was that
every design depending on model cooperation got harder (D7, D8, E9) and every
design depending only on reading got simpler (P3). Extended mode reintroduces
that dependency on purpose.

Specific costs, all real:

- **Variance.** Compliance is good but never total. A missed item means the UI
  silently degrades, indistinguishable from "there was nothing to mark" — the
  exact failure mode that killed prose markup in D7.
- **Session-wide.** A prompt section cannot be scoped to the moments it helps. It
  shapes every response, including ones never marked up.
- **Leakage.** `claude -p`, subagents and cloud sessions inherit the modified
  prompt. Output drifts from what the same model gives without the mod
  installed.
- **Doubled test surface.** Every feature now has two behaviours, and bugs can
  live in the interaction between them.
- **Harder to attribute.** When something feels off, is it the mod, the prompt
  section, or the model?

#### The honest conclusion

**This analysis cannot usefully be done yet, because the question is not
answerable from the armchair.** The right order is:

1. Build phase 1 with P1 intact.
2. Use it, and record **specifically** where marking is awkward — decisions
   buried mid-paragraph, options stated as prose, questions that should have been
   a tool call.
3. Ask for exactly the thing that fixes the observed friction, and nothing else.

Designing the prompt section before knowing the friction produces a wishlist, and
a wishlist is how compliance budget gets spent on things that did not matter.

**If it ships, it ships off by default**, with the switch as an `E10` option, and
P1 remains the documented norm rather than a legacy mode.

---

## 6. Open questions

To verify against the build's own TypeScript declarations
(`.claude-plugin/types/claude-code/index.d.ts`, written per installed version)
rather than the published docs.

| # | Question | Answer (spike, 2026-10-15) |
|---|---|---|
| Q3 | Does `ui.press` see raw arrow keys? | **No.** Keys reach a mod only through a linear focus ring; ↑/↓ apart from ←/→ needs a pane's scroll. See D20's revision. |
| Q6 | `$.model.fork` signature and context | From the types: one tool-less question over the session's own transcript, same model and system prompt, cached. Concurrency unknown. Not exercised. |
| Q8 | The hook framework in depth | Learned in use: `on(event, matcher, hook)`, `.catch` for fail-to-vanilla, render hooks may not write state but may `$.ui.invalidate`, `$.state` contracts in `types/`. Chain order among several mods untested (§11, item 15). |
| Q9 | Is `$.model.classify` cheap enough per thread turn? | Open — E6 only. |
| Q10 | Can the `AssistantMessage` hook match Claude Code's markdown? | **Yes.** Compared on and off construct by construct (lists, nesting, table, code, blockquote): identical once the mod draws no column of its own and keeps the top margin. A `Box` background around `Markdown` paints behind the text. |
| Q11 | Is `prompt.suggest` a separate layer beside typed text? | **No** — it shows only in an empty box. Turned out not to matter: D30. |
| Q12 | Do mouse clicks work in the terminal? | **Yes**, on `Button`s drawn in a reply, in the fullscreen terminal. |

*Q1, Q2, Q4, Q5 retired or moved into §5 with their features. Q7 resolved —
discard with warning, see D24.*

**`SPEC.md` §15** holds the full spike checklist, with the questions not numbered
here. New open questions are in §11.

---

## 7. Framework primitives in use

| Primitive | Role | MVP? |
|---|---|---|
| `ui.render` on `AssistantMessage` | Redraw the reply with the accent bar, marks, menu and comments | Yes |
| `ui.render` on `AbovePrompt` | Band: summary, discard warning, action line | Yes |
| `ui.render` on `Pane` | The navigator (D31), later threads | Yes |
| `ui.scroll` on the pane | ↑/↓ as block moves (D20 revision) | Yes |
| `ui.focus` on the pane | Keep the ring on the verbs | Yes |
| `ui.close` | Know whether the navigator is on screen | Yes |
| `Button.onPress`, `Input.onInput/onSubmit` | Verbs, comments — closures, no `ui.press`/`ui.input` hooks needed | Yes |
| `$.prompt.read()` | Tell whether the box has text, for the discard warning (D24) | Yes |
| `turn.start` / `turn.complete` | Marking off during a turn; adopt the new reply | Yes |
| `session.start` + `$.session.messages()` | Adopt the last reply on resume | Yes |
| `$.prompt.suggest` | Send by suggestion (D30) | Yes |
| `$.prompt.submit({ asUser: true })` | Direct send, `s` in the navigator | Yes |
| `$.env.get` + `$.fs.read` | Read the person's entry-key binding (D32) | Yes |
| `$.ui.scroll` | Bring the reply into view (whole reply only) | Yes |
| `$.model.fork` | Thread conversations and the commit summary | Phase 2 |
| `$.prompt.fill` | No longer used — the suggestion replaced the copy key | No |
| `$.store` | Thread persistence within the session | Phase 2 |
| `tool.call` | E5, E12 | No |
| `session.append` | E13 | No |
| `$.model.classify` | E6 | No |
| `$.tool.register` | E14 | No |
| `$.session.send` / `session.receive` | E4 | No |
| `prompt.compose` | E9 | No |

**Known limits:** `Markdown` and `Code` elements cap at 10,000 characters — long
responses need chunking regardless, which suits per-block rendering. Hook
execution: 10s. `$.model.complete`: 1024 max tokens by default, raisable to
64,000. `$.session.messages()`: newest 4,096 entries.

**Security note (relevant to corporate use):** mods are not sandboxed and run
with the user's full permissions. Administrators can set `allowManagedModsOnly`
to block user-installed mods.

### Pane layout sketch

```
┌─ Thread: "Use Redis for the session cache" ──┐
│ <anchor text pinned>                          │
│                                               │
│ <exchange scrolls here>                       │
│                                               │
│ > <Input>                                     │
│ ○ excluded — <key> to include                 │
│ ⏎ send · Esc close                            │
└───────────────────────────────────────────────┘
```

The include/exclude row is D3's toggle. When included, it shows the summary that
would be staged.

---

## 8. Dogfooding note

The mod will be used to build the mod, and a broken `ui.render` hook makes the
authoring session unusable. Run two checkouts, or `--plugin-dir` in one terminal
and plain `claude` in another.

### First real use — 2026-10-17

The spike was used for real in a separate Claude Code session, answering a reply
about key bindings with two accepts and a comment in one send. What it showed:

- **The compiled prompt needed no explanation.** The agent read `✓ "…"` as
  approval and `✎ "…" → …` as an instruction on that point, and acted on both.
  Evidence for D6's format as revised: no header, no prose scaffolding, a short
  quote locates the point.
- **Batching worked.** Mixed verbs in one prompt got one coherent answer — the
  premise of D1, which quote-reply cannot reach.
- **No interference.** The agent answered the content, not the mechanism (P1 as
  revised).

One data point, not a verdict: D27 still holds that phase 1 is the real test.

---

## 9. Next step

Spike 0 is done: tested against the bench's fixtures, the classic renderer (#11)
and a second mod (#12); findings in D33 and §11, open work in GitHub issues.

**Nothing blocks phase 1.** The navigation model is decided — a pane in both
renderers (#19, D20); the classic pane is a block viewer (#31); the fullscreen
navigator's design is finished alongside (#39).

**Phase 1 evolves the spike** (D34), in order:
1. the segmenter, rewritten from SPEC §3 with tests;
2. the tray and compile modules, with tests;
3. the hooks shell split by surface — reply (whole turn, redraw only when
   needed, D35's option), navigator, shared band, suggestion;
4. minimal versions of the edge cases: navigator not on screen (#20), classic
   mode (#31);
5. the test bench passing; a baseline on #13;
6. packaging — marketplace install and README (D36; the zip ships already).

Not blocking: wording and the edited suggestion (#21), configuration (#8), mouse
(#14), multi-line comments (#16), code and tables (#5, #6), platforms (#13).

**This file is no longer the working document.** It records why the design is
what it is. When a decision changes, update it here *and* in `SPEC.md`; when
proposing a change, read the relevant entry first — most obvious ideas were
already considered and cut for a reason.

---

## 10. Review status

| # | Decision | Status |
|---|---|---|
| P1 | Never interfere with the prompt/response flow | ✅ revised 2026-10-15 |
| P2 | The mod relays, it does not analyse | ✅ settled |
| P3 | One mechanism, many sources — review, never gate | ✅ settled |
| D1 | Response is a fillable form | ✅ reviewed, revised |
| D2 | Four verbs, two mechanisms | ✅ reviewed, revised |
| D3 | Deferred vs waiting; threads commit explicitly | ✅ reviewed, revised |
| D4 | Block segmentation | ✅ reviewed, substantially revised |
| D5 | Render-time blocks, no IDs | ✅ reviewed, substantially revised |
| D6 | Reference expansion | ☠️ dead (compile format survives) |
| D7 | Structure from tool payloads | ☠️ reduced to nothing in MVP |
| D8 | Anchor by quote | ☠️ dead |
| D9 | Unified question model | ☠️ dead in MVP → E12 |
| D10 | Prose path first | ☠️ absorbed into D4 |
| D11–D13 | Held calls, Discuss, answer-and-forward | ☠️ moved to E12 |
| D14 | Thread isolation via `fork` | ✅ settled |
| D15 | Escalation ladder | ✅ revised |
| D16–D19 | Branched sessions, depth, merge, worktrees | ☠️ deferred → E1–E4 |
| D20 | Modal nav + visible controls on the selected block | ✅ revised by the spike; model A — a pane in both renderers (#19) |
| D21 | Accent bar on the selected block (was: gutter column) | ✅ revised by the spike |
| D22 | Conflicts not resolved by the mod | ✅ settled |
| D23 | Trivially disableable, fails to vanilla | ✅ reviewed, extended |
| D24 | Last message only (**Q7 resolved**); off during turns, on after resume | ✅ reviewed, extended |
| D25 | Nudge toward `AskUserQuestion` | ☠️ deferred → E9 |
| D26 | Config surface | ☠️ deferred → E10 |
| D27 | Spike, then two thin phases | ✅ reviewed, revised |
| D28 | No intervention in Claude Code's tool runs | ✅ settled |
| D29 | Band is source of truth, box is scratch | ✅ revised — the box shows it (D30) |
| D30 | Send by live suggestion | 🟡 provisional |
| D31 | The navigator pane | ✅ settled — both renderers; fullscreen design on #39 |
| D32 | Key bindings belong to the person | ✅ settled |
| D33 | Share surfaces with other mods; redraw the reply only when needed | ✅ settled |
| D34 | The spike evolves into phase 1 (revises D27) | ✅ settled |
| D35 | In-place marks after review: configurable, on by default | ✅ settled |

### Open questions, by weight

Superseded by §11, which lists what the spike left open.

### Prior art noted 2026-10-13

The Claude Mac app now shows a **reply button on selected text**, which copies
it into the prompt as a quotation.

**It validates the premise** — pointing at part of a response is a real
friction, and someone else reached the same conclusion.

**It solves a different piece.** Quote-reply is one-at-a-time: select, quote,
type a response in prose, send. That fixes scrolling, not batching. This design's
value is marking five blocks with five keypresses and sending once — no quote
mechanism reaches that, because each quote still needs a hand-written sentence.
**The tray is the part nobody else is building.**

**Strategic read:** if Anthropic is working this seam in the chat app, something
similar landing in Claude Code is not unlikely. That argues for phase 1 being
small and fast — find out whether marking changes the work before another
version arrives, and if theirs ships first, know exactly what is missing from it.

It also supports the gutter over text selection: mouse drag-select is not
available in the terminal, and block-level selection is arguably better for
marking anyway — whole decisions, not arbitrary character ranges.

---

## 11. Spike findings — open items

Recorded 2026-10-15 from the spike (`spike/rendering`). Numbered for reference;
the numbers are not decision numbers.

### Design decisions to make

1. **Navigation model — decided: A, a pane in both renderers** (#19, D20). Classic
   design settled (#31); fullscreen design to finish (#39).
2. **The pane is shared space.** With other mods, panes become tabs; check how
   the navigator reads as one tab among several.
3. **Navigator not on screen** (narrow terminal, closed, after a reload): the band
   offers `ctrl+s, then ⏎`. Edge case, design deferred; below 110 columns the
   pane opens inline, where a vertical map does not fit.
4. **Surfaces where `$.prompt.suggest` always returns `isShown: false`** (from the
   published docs; surface unconfirmed). Needs a fallback — `s` to send, or a
   copy into the box — and the band should switch to it automatically.
5. **Placeholder wording** for an emptied suggestion, and the band wording overall
   ("respond in place"), are provisional.
6. **What the band says once a taken suggestion is edited.** Today: the discard
   warning, which is no longer accurate. Escalated.
7. **Whether to veto Claude Code's own suggestions** (a `prompt.suggest` hook
   answering `{ isShown: false }`) while feedback is staged. Would be interference
   with Claude Code's behaviour — decide deliberately. Seen in use 2026-10-17: a
   one-line suggestion stood where the multi-line compiled prompt was expected,
   most likely Claude Code's own after-turn suggestion replacing ours.

### Limits found

8. **The docked pane is ~23 columns**; a request for 4 was not honoured, and no
   way to go narrower was found. **Kept pane sizes are global**: Claude Code keeps
   one dock width and one inline height for all mods' panes, across sessions
   (`pluginPanes.dockColumns` / `inlineRows` in `~/.claude.json`), set by any
   resize; they override a mod's request. Clearing those keys resets them.
9. **The transcript scrolls to whole rows, never to a block**:
   `$.ui.scroll({ to: { key } })` does not find elements inside a transcript
   message, and a reply taller than the window always lands on its top. Worked
   around 2026-10-17: review starts on the last block; the reply's top is
   revealed on entering the first third, its end on entering the last third (by
   scrolling the turn-duration row after it to the window's bottom); the middle
   is scrolled by hand.
10. **Key bindings cannot ship with the mod** (D32). Candidate: `/synaptik
    configure`.
11. **Engine-written rows are recognised by text** (`No response requested.`).
12. **A reply split around tool calls** arrives as several `AssistantMessage`
    pieces, and the transcript holds them as separate messages. Adopting only the
    last message left text before a tool call unmarkable (confirmed 2026-10-17).
    **Fixed 2026-10-17:** the spike adopts the whole turn — every assistant row
    with text since the last prompt, tool results skipped (`src/spike-turn.ts`,
    tested) — and numbers blocks across its pieces. Phase 1 keeps both.
13. **The mod cannot see how Claude Code wraps Markdown**, so nothing it draws can
    be guaranteed to line up with the reply's on-screen lines. Nor can it adjust
    Claude Code's drawing: a render hook's `next(e)` returns an **opaque handle**
    (`{ type: 'engine', ref }`), to place or wrap whole, never to edit. Changing
    part of a reply means redrawing all of it, Claude Code's frame (left margin,
    `⏺` bullet) included — copied by the mod, so it can drift if Claude Code
    changes it. Upstream request: #23.
14. **Esc raises no `ui.focus`**; the navigator's own `isFocused` prop is the
    reliable signal. **An `Input` keeps typed text** across redraws under the
    same key and value — each opening needs a fresh key.

### To test

15. **Coexistence with other mods** — tested 2026-10-17 with the bench's
    `neighbour-mod` (#12). Panes: tabs, both work. **Band:** now composed with
    `next(e)` outside review, alone while reviewing; Synaptik's lines sit under a
    `Synaptik ·` header. An engine node under a `Box` with `width` is refused
    (undocumented). Another mod's band button adds a stop before the navigator for
    the entry key. **Reply: one mod redraws it** — whichever is higher in the chain
    wins; a mod beneath Synaptik keeps its drawing only on replies Synaptik passes
    through. **Suggestion:** the last proposed wins; Synaptik re-proposes when the
    navigator takes the keyboard (its `ui.focus` with origin `plugin` — the
    pane's own redraws miss a round trip through another mod's tab, since a
    hidden pane is not redrawn) and when it is left. **Chain order follows
    `--plugin-dir` order**; a greedy mod above Synaptik takes its in-place view
    but not the navigator. Decisions in D33.
16. **Following terminal scrolling — dropped for now** (2026-10-15). Estimating
    on-screen blocks from `onScreen` was never steady. If it returns: an honest
    coarse indicator (reply above / below / in view, or a thumb from
    `first`/`last`/`of`), a navigator that scrolls with the terminal, or the
    upstream request below. **Superseded by D37** (2026-10-20): measured again,
    the estimate was exact and `onScreen` updates per wheel tick, but following
    the scrolling was decided against. The tall-reply middle is #64.

### Extension points noted

- **Navigation inside tables** — rows, possibly cells, as blocks of their own.

### To ask upstream

- Plugin-declared actions with default chords, as `userConfig` declares options
  (removes D32's gap).
- `$.ui.scroll` to an element inside a transcript message, by key.
- A way for a plugin to withdraw its own prompt suggestion.
- `onScreen`, or a row measurement, per element rather than per message.
- A narrower floor for a docked pane, or a reason it is ~23 columns.
- A flag on `SessionMessage` for engine-written rows.
