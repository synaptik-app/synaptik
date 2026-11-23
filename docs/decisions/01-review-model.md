# Review model

### D1 — The response is a fillable form, not a thread host
**Status:** settled · added by 2026-10-14

**The reply is a form to fill in.** Each block is marked in place, and the marks
compile into a single prompt. Most of what a person does with a reply is marking
— approving in bulk, a small amendment, a word on a proposed command — and only
some of it is discussion. A thread for each would be heavier than the prose being
typed today.

Interactions fall into three classes:

| Class | Input | Waits for a reply | Reaches the prompt as |
|---|---|---|---|
| **Options** (accept, reject) | none | no | a mark |
| **Comment** ("ok, but change x to 5") | free-form | no | a mark with its text |
| **Thread** | free-form | yes | its summary, if included |

**The axis is "does it expect a reply before you continue?"** — *not* "does it
need typing." Comment groups with accept and reject: all three are deferred
marks, and only a thread interrupts the flow. **A comment does not turn into a
thread:** discuss is its own action on the block, and the person decides to open
one.

**Marking is the default,** not discussing. Threads are optional: the mod is
useful without them.

**Rejected alternative:** *thread-first* — every interaction opens a discussion
pane, and marking is a shortcut for the trivial case. Better if the real pain is
*thinking through* replies; worse if it is *processing* them quickly.

**Revisions**
- **by 2026-10-14** — verbs were grouped by *typed vs untyped*, and the free-form
  mark was "amend": renamed **comment**, since amend implies editing Claude's
  text when the user is annotating it. Regrouped by *deferred vs waiting*.
- **2026-11-08** — no comment ↔ thread conversion. A comment could be promoted to
  a thread with one key, its text the opening message, until the first exchange.
- **2026-11-10** — rewritten to stand on its own; history dropped from the
  consequences.

---

### D2 — Verb set: four verbs, two mechanisms
**Status:** settled · added by 2026-10-14

| Verb | Key | Mechanism |
|---|---|---|
| ✓ Accept | `a` | staged mark |
| ✗ Reject | `x` | staged mark |
| ✎ Comment | `c` | staged mark + text |
| ❝ Discuss | `d` | a thread: a fork conversation, private until included |

The verbs act on a block, or, stepped into a code block or table, on a line or
row. **A code block or table has a fifth action, step in (`s`)**: it moves rather
than marks. Inside, `s` steps out, the menu's verbs apply to the selected line or
row, and `q` steps out before it ends the review (D43, D44).

**Verbs are idempotent entry points.** Pressing one again never duplicates:
accept or reject again unmarks; `c` reopens the comment pre-filled; `d` reopens
the block's thread with its history. **One mark and one thread per block,
maximum.**

**The mod executes nothing — no Run verb.** If Claude proposes a command in
prose, the person comments *"run this with --verbose"*; the agent runs it next
turn through its own tools and permission flow, and the result returns in
context. A Run verb would need `$.process.run`, output capture and feeding the
result back — and skipping that feedback would silently desync the agent's
picture of the world. **Cost, accepted:** responding to a proposed command takes
a round trip, since the agent re-emits it before running it.

**No Explain verb.** Asking for an explanation is what a thread is for.

**Revisions**
- **by 2026-10-14** — Run cut; Explain collapsed into Thread, as `?`, a thread
  pre-seeded with "explain this".
- **2026-10-24** — the verbs are named accept · reject · comment · discuss (was
  "Thread"); `?` removed: a pre-seeded thread is not worth a second key.
- **2026-11-01** — step in, a fifth action on code blocks, then tables (D43, D44).
- **2026-11-10** — rewritten to stand on its own; the branch proposal dropped.
- **2026-11-23** — discuss's glyph is `❝`, plain text that takes the theme's
  colour like ✓ ✗ ✎, not the `💬` emoji, which brought its own colours and two
  columns.

---

### D3 — A thread sends nothing unless included
**Status:** settled · added by 2026-10-14

**A thread is consequence-free until included.** It is fully interactive, but has
no effect on the main conversation unless its switch is on. Leave it off and it
is as if it never happened.

**Why:** most threads are read-only understanding, with nothing worth sending.
Sending them by default would pollute every prompt with explanations asked for
purely to understand. It also keeps "never mind, I was wrong" from reaching the
agent.

**What is sent is a summary, never the transcript.** The thread's own fork writes
it, as an instruction to the main agent, with a verdict that sets the switch's
default; the person flips the switch, and edits the summary in the prompt box
before sending. The model summarizes and the person decides (P2). How the pane
shows all this is D45.

**Rejected alternative:** stage the raw thread transcript. Zero machinery and
nothing lost, but a ten-message thread dumps ten messages into the prompt and
the main agent must re-derive the conclusion anyway.

**Accepted caveat:** summarization is lossy and will occasionally drop the nuance
the thread was about. Mitigated by the summary being editable. If it needs
frequent rewriting, fix the summarizer prompt — not the mod.

**Revisions**
- **by 2026-10-14** — commit is a toggle, not a button: an include/exclude state
  showing the summary, so auto-classification changes one default rather than
  the UI.
- **2026-10-15** — the commit key, the band preview and the tray's submit and copy
  keys give way to the suggestion in the prompt box (D30).
- **2026-11-04** — the switch's default is the thread's own verdict, with each
  answer (D45). It was *excluded*, flipped by a commit key that fired one more
  `fork` for the summary.
- **2026-11-10** — scoped to threads, standing on its own; retitled from
  "Deferred vs waiting; threads commit explicitly".

---

### D4 — Block segmentation: uniform verbs, flat navigation, structured output
**Status:** settled · added by 2026-10-14

**Every block gets every verb.** No capability matrix: much of Claude's advice
arrives as prose ("I'd recommend Redis here because…"), and accepting it is
perfectly meaningful. Restricting verbs by block type would make the menu useless
on half of real replies, and violate P2 — the mod deciding, on the person's
behalf, that a mark is semantically invalid.

**What is a block:**

| Element | Block? |
|---|---|
| Paragraph | yes |
| List item, including nested | yes — **flat**, each item its own block |
| List item spanning several paragraphs | yes, as **one** block |
| Fenced code block, table, blockquote | yes — **always its own block**, also inside a list item |
| Heading | **no** — a label; marking it is ambiguous with marking its section |
| Horizontal rule | **no** |

The detailed rules — what belongs to a list item, nesting by structure — are
`spec/01-review-model.md` §3.

**Flat navigation.** Sub-items are often where the real decisions live, so
collapsing them into a parent would hide exactly what the person wants to mark.
Code, a table or a quote inside an item is its own block for the same reason: it
can be marked apart from the item.

**Nested output.** Each block records its parent, because navigation is flat
while the compiled prompt must keep the hierarchy. Accepting a parent and
rejecting one child is normal refinement, not a contradiction — and the agent can
only read it that way if the prompt shows the nesting:

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "write-through on logout"
```

Rejecting a parent while accepting a child goes out as it is; the agent resolves
it (P2).

**Revisions**
- **by 2026-10-14** — the capability matrix is gone. Verbs were restricted by
  block type — list items got everything, paragraphs discussion only, on the
  reasoning that "accepting a paragraph of prose is meaningless". That was wrong.
- **2026-11-10** — the block table follows the segmenter: code, tables and quotes
  are blocks of their own inside list items; rules aren't blocks.

---

### D5 — Blocks are derived at render time; no IDs are stored or shown
**Status:** settled · added by 2026-10-14

Split the reply into blocks at render time and key marks by **position**: the
block's index, or `block.line` (`3.5`) for a line or row stepped into. No stored
IDs, no persistence.

**Stability is free:** only the completed last reply is markable (D24), so its
text is fixed, so parsing it again yields identical blocks. Deterministic input,
deterministic output. Nobody types block references, so nothing needs an ID.
**Marks live as long as the reply:** they don't survive a restart or a new
reply.

**Marking is off while streaming.** Mid-stream the text is still growing, so
positions would shift. Marking starts at `turn.complete`.

#### State model

The mod keeps its own structured state, the tray, and **generates** the prompt
from it after every change. Nothing is accumulated as text along the way.

Per block, at most **one mark** and **one thread** — two separate channels:

| Action | Effect |
|---|---|
| Change a mark (`a` then `x`) | Overwrites. One slot, last write wins. |
| Accept or reject twice | Unmarks. |
| `c` on a commented block | Reopens the comment pre-filled — edit, don't retype. |
| `d` on a block with a thread | Reopens that thread with its history. |
| `Backspace` on a block | Clears it in steps. First the block's own mark and included thread; a second Backspace clears everything on its lines or rows. A block with nothing of its own is cleared inside on the first Backspace. Threads cleared this way are excluded, not deleted. |
| Mark **and** included thread on one block | Both go out; the agent resolves (P2). |

The tray empties when the prompt is sent, and when a new reply arrives.

**Clearing unstages; it never destroys.** A cleared thread keeps its
conversation and can be switched back on. A cleared comment keeps its text, so a
misfire costs nothing.

The reply shows the result directly: a cleared block drops its glyph. No state
the person cannot see.

**Revisions**
- **by 2026-10-14** — no stored IDs. They were assigned in `session.append` for
  anchor stability, on the assumption that the person would *type* block
  references into a prompt.
- **2026-11-10** — rewritten to stand on its own: the prompt is generated after
  every change, lines and rows have positions, Backspace clears in steps, and
  there is no clear-all.

---

### D24 — Only the last reply is reviewed
**Status:** settled · added by 2026-10-13

**Only the last reply is interactive, and only once its turn has completed.** The
reply is the whole turn since the last prompt: every assistant piece with text,
across tool calls. No earlier replies. This removes the stale-mark problem
entirely, and is what makes render-time segmentation safe (D5).

- **Off during a turn.** From `turn.start` to `turn.complete` the reply and band
  draw as vanilla. A reply on its way will replace the tray; staging against it
  has no use.
- **On after a resume.** `session.start` adopts the transcript's last reply, so a
  resumed session is markable without a new turn. A resume appends a synthetic
  `No response requested.` assistant row, skipped by its text: `SessionMessage`
  has no flag for engine-written rows.
- **A background run is one reply, and its review survives it.** A subagent's
  completion is stored as a user row (`<task-notification>…`), skipped by its
  text, so the reply runs from the person's last prompt across every follow-up.
  A reply that only grows, blocks added after the unchanged ones, keeps its
  review: an event the person didn't cause never loses their marks.

#### Marks are discarded with a warning

**The mod never adds itself to a prompt the person typed.** Type your own prompt
and it goes alone: no appended marks, no interception of `prompt.submit`. That
prompt brings a new reply, so marks staged on the previous one go.

**The one prompt Synaptik stops is not the person's:** Claude Code's notice that
one of Synaptik's own agents stopped (D51), submitted on its own as a prompt.
It is dropped in `prompt.submit`, so the main conversation gets no turn and
keeps no transcript row, and the reply and its review stay as they are. Every other
notice, and everything the person types, goes through untouched.

**The risk is losing them silently**: sending a quick side question intending to
return to five marks, and finding them gone with no sign they existed.

**So the band warns before it happens.** No interception, no double-Enter, no
dialog. When something is staged and the box holds text other than the taken
suggestion, the band's summary line turns **yellow**:

```
2 accepted · 1 comment staged · ⏎ sends only what you typed and drops them
```

It sits one line above the cursor while typing. Loud, because this is the one
place in the mod where work can be lost; everything else is reversible. The mod
reads the box with `$.prompt.read()` from the band's render hook, which redraws
anyway.

**If discarding proves annoying in use, the fix is marks that survive a new
reply,** not a confirm dialog.

**Revisions**
- **2026-10-15** — off during a turn; on after a resume.
- **2026-10-17** — the whole turn is the reply: adopting only the last message
  left text before a tool call unmarkable.
- **2026-11-10** — rewritten to stand on its own; retitled from "MVP scope: last
  message only".
- **2026-11-15** — the session's plan is reviewed too, on request (D49).
- **2026-11-15** — declined questions join the reply's review (D50).
- **2026-11-15** — a background run is one reply, and a reply that grows keeps
  its review (#213, from #162's spike).
- **2026-11-21** — Claude Code's notices about Synaptik's own agents are dropped
  in `prompt.submit` (D51); before, the mod intercepted no prompt at all.

---

### D49 — The plan is reviewed on request, in Synaptik's own row
**Status:** settled · added 2026-11-15

**`/synaptik plan` makes the session's plan reviewable in place.** Claude Code's
plan flow stays its own: the approval panel, its options, `shift+tab` and
`/plan` are untouched, and Synaptik hooks none of them. The plan is reviewed
only when the person asks for it.

- **Found by a read, no hooks** (P3). The path is the session's last `Write` or
  `Edit` to `~/.claude/plans/`, in `$.session.messages()`, and `$.fs.read` reads
  that file (checked in the spike on 2.1.325). A session has one plan file: a revision
  overwrites it. With none, the command says so.
- **The file over the transcript:** edits made in the editor (`ctrl+g`,
  `/plan open`) reach only the file. That goes one step past P3's "what the
  transcript holds", and stays within it: a read, at the person's request, of the
  file a turn wrote and the transcript names, with nothing hooked or held. If the
  file can't be read, the last `ExitPlanMode`'s `input.plan` is reviewed, and
  the command says that edits made in the editor may be missing.
- **Drawn in the command's own output row,** as blocks, with the reply's actions:
  accept, reject, comment, discuss, step in. It is reviewed between turns, as a
  reply is (D24), and in fullscreen only.
- **The suggestion starts with `On the plan`,** the marks on the lines after it.
  It names what was reviewed and asks nothing: Claude updates the plan or not,
  and Claude Code's panel takes it from there.

**Why not where Claude Code shows the plan** (spike on 2.1.325, #155):
- **The approval panel** is a dialog no mod can draw into, open inside a running
  turn. Its feedback field is not the prompt box.
- **`/plan`'s output** is drawn by its own component: `command.run` fires, but no
  `CommandOutput` row follows, so there is nothing to hook.
- **The plan is never a reply.** After Esc on the panel the turn ends with no
  text; the plan shows only in the `ExitPlanMode` tool row. Reviewing that row
  would make Synaptik adopt something new on its own, which this keeps to the
  person's request.

**Built in #208. Later:** the same row reviews any file read from disk (#108), and a plan can be
set beside its previous version (#110): the transcript holds each `Write` in
full and each `ExitPlanMode`'s plan.

---

### D50 — Declined questions are reviewed with the reply
**Status:** settled · added 2026-11-15

**Claude's questions stay Claude Code's to ask:** the `AskUserQuestion` panel is
untouched, and answering there is Claude Code as usual. A mod can't redraw the
panel or answer it, and while it is open the turn is running (D24). **When the
person leaves it with Esc**, the turn ends and Claude waits for the next
message; Synaptik then reviews the reply and its questions together, and the
marks and the answers go as one prompt.

- **Found by a read, no hooks** (P3). The turn's last tool call is an
  `AskUserQuestion` whose row is errored: declined, not answered. Its input holds
  every question in full: text, `header`, options with their descriptions,
  `multiSelect`.
- **Drawn in the call's own row,** one block per question, numbered on from the
  reply's blocks. Claude Code's "User declined to answer questions" row stays as
  it is, so its one-line summary shows under them.
- **A question's menu is its own options:** each a button, its digit the hotkey,
  several picked where `multiSelect` allows; a free answer is a comment, and a
  thread on the question is discuss.
- **One suggestion:** the marks, then `Header? → answer` for each answered
  question; an unanswered one is left out. In fullscreen only.

**Why not hold the call and answer inside the turn:** it takes tool hooks (P3)
and holds a turn, and the panel's answers can carry nothing else. Esc is Claude
Code's own way out, and the person's choice.

**Later:** drawing the questions once, in the declined row itself, if that row
can be redrawn (#153).

**Revisions**
- **2026-11-15** — from the spike on 2.1.325 (#153); replaces E12's design.

---

## Extensions

### E7 — Mod-driven Run verb (cut from D2)
**Status:** proposed · added by 2026-10-14

Execute a proposed command from the response directly, with edits.
**Requires:** `$.process.run`, output capture, and **feeding results back** —
running without feedback silently desyncs the agent's picture of the world.
**Weak case now:** a comment, or a thread's summary (D45), hands the command to
the main agent, at the cost of one round trip.

---

### E9 — Nudge Claude toward `AskUserQuestion` (was D25)
**Status:** proposed · added by 2026-10-14

A `prompt.compose` section could raise the tool-usage rate. **Three cautions:**
it changes behaviour session-wide; the tool's shape (a few short options) does
not fit open-ended questions, so pushing hard would produce *worse questions in
tool form* rather than better ones in prose; and it sits in tension with P1.
Relevant now that D50 reviews declined questions with the reply: more of them in
the tool means more answered in a review, and the cautions stand.

**Revisions**
- **2026-11-15** — its condition was E12 being built; E12 is superseded by D50.

---

### E11 — Multi-message interactivity
**Status:** proposed · added by 2026-10-14

Marking older messages, not just the last (relaxing D24). Reintroduces the
stale-mark problem D24 exists to avoid, and requires E13.

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

### E12 — `AskUserQuestion` interception (was D9, D11, D12, D13)
**Status:** superseded → D50 · added by 2026-10-14

Hold the tool call, render questions inline with their options, gate the resume
on all questions being answered, and fix Discuss so it does not destroy its
siblings. Cut for its cost: a held tool call, and the unknowns of holding one.

**Replaced by D50:** the questions are read from the transcript after the person
leaves the panel with Esc, and reviewed with the reply; nothing is held.

---

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

