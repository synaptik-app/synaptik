# Principles

Principles (P) are constraints that govern decisions rather than being decisions
themselves. The D records here are the decisions closest to them.

---

### P1 — The mod never interferes with the prompt/response flow
**Status:** settled · added 2026-10-12

The mod never puts something into the flow between the person and the agent that
the person did not see and choose, and never blocks, rewrites or holds that flow.
**Interference is the concern, not secrecy:** the agent knowing the mod exists is
fine.

The compiled prompt reads like something the person typed. No markers, no IDs, no
mod structures, no protocol — not to hide the mod, but because they are noise the
agent would have to parse. **In the main conversation** the mod does not ask the
model for anything, and does not teach it any protocol.

**In practice:**
- **The person sends.** Every word is in the prompt box before it goes, and the
  person sends it with their own ⏎. The mod never submits.
- **The mod writes the prompt box only at the person's own gesture.** Taking a
  shortened suggestion fills in its full text, and the person sees all of it
  before sending. Nothing is written into the box behind their back.
- **The main conversation's instructions stay untouched.** No system prompt
  sections and no tool hooks: the session works the same with or without the
  mod.
- **The mod's own model calls are outside the flow.** A thread is a fork, a
  separate call that never enters the main conversation (D14). There the mod
  does instruct the model, with a format for the answer, its summary and an
  include/exclude verdict, which the mod strips. What can reach the main
  conversation is only the summary: shown under the thread's switch, compiled
  into the suggestion, and sent by the person. With Synaptik off, threads are
  gone and the session is unaffected.
- **Naming the mod is fine**, for example a slash command whose output the model
  reads.

**The test for anything new:** does it put something into the flow that the
person didn't see and choose, or block, rewrite or hold the flow? If so, it
breaks P1. An exception has to be a decision of its own that says so.

**Revisions**
- **2026-10-15** — what P1 protects is the flow, not secrecy. It was "the agent
  never knows the mod exists".
- **2026-10-24** — the mod submits nothing; before, it sent with
  `$.prompt.submit({ asUser: true })`, since the plain form names the mod as
  sender.
- **2026-11-10** — rewritten to stand on its own; references to proposals
  dropped. Scoped to the main conversation: the mod's own forks (threads) are
  instructed, and only what the person sees and sends reaches the main flow.

---

### P2 — The mod relays, it does not analyse
**Status:** settled · added 2026-10-12

The mod never decides what the person meant, what is worth sending, or how to
reconcile contradictions. It captures intent and hands it over verbatim; the
agent does the interpreting.

**In practice:**
- **Every block takes every mark.** The mod doesn't judge that a mark makes no
  sense on a kind of block.
- **Contradictions go out as they are.** A block accepted and then discussed to
  the opposite conclusion sends both; the agent reconciles them. No precedence
  rules for the person to learn.
- **Judgement comes from the model, never from mod logic.** A thread's summary,
  and the include/exclude default, are written by the thread's own fork. The
  person sees both and decides: they flip the switch, and edit the summary in
  the prompt box.

**Revisions**
- **2026-11-10** — rewritten to stand on its own: the rules, not references to
  where they show. Takes in D22 (conflicting marks).

---

### P3 — One mechanism, many sources: review what the transcript already holds
**Status:** settled · added 2026-10-13

**Anything Claude produced can be reviewed the same way:** marked with the four
verbs, gathered in one tray, compiled into one prompt. The reply is the first
source, not the only one. A new source reuses the tray, the verbs and the compile
step unchanged; it brings only how its content is read and drawn.

**Review reads; it never intercepts.** Everything a turn produced is already in
the transcript, a plain read with `$.session.messages()`: a command and its
output, a diff, a file path, a plan, a task list. So a source never needs to
gate, hold or replace anything of Claude Code's to be reviewed.

**No tool hooks.** The mod does not gate, modify or execute the tool calls Claude
makes. The seam is natural — two different surfaces, never confusable at runtime:

| | Surface | Synaptik |
|---|---|---|
| A command **in the reply's text** (written, not called) | `AssistantMessage` render site | marked like any block |
| A command Claude **is calling** | `tool.call` | untouched |

Synaptik registers no tool hooks at all; the hooks it does register are listed in
the README.

**Why after, not at the moment of decision:**

| | Gating | Reviewing after |
|---|---|---|
| Hooks needed | tool hooks, held calls | a read |
| Risk to the session | can break the agent's flow | none |
| Content stability | live | fixed — line numbers cannot move |
| The person's state of mind | deciding yes/no under pressure | composing several comments |

At a decision point you want to answer quickly; review is a separate activity.
Conflating them is what makes gating designs hard.

**Revisions**
- **2026-11-10** — rewritten to stand on its own: the pane and "open in
  Synaptik" steps are gone (the reply is reviewed in place), and so is the list
  of candidate sources, which are proposals. Takes in D28 (no tool hooks).

---

### D23 — The mod must be trivially disableable, and must fail to vanilla
**Status:** settled · added by 2026-10-13

Enabling and disabling must be a single step, at any point, leaving a vanilla
Claude Code session behind with the chat and flow unbroken. A hook that throws
or exceeds its 10-second budget is skipped — so a failed hook must degrade to
**plain Claude Code behaviour, never a half-drawn transcript**. `.catch(handler)`
returning `next(e)` on each registration is where this lives.

**The mod holds no state the conversation depends on.** Blocks are derived at
render time (D5) and nothing is written into the conversation; the review — the
tray and its threads — lives in memory. So disabling mid-flow costs only the
review in progress, and re-enabling re-parses whatever reply is current: nothing
to migrate, nothing to recover. **Any new feature that stores something must keep
this true.**

With no tool hooks (P3), the mod cannot interfere with the agent's work at all:
it draws, and it suggests into the prompt box.

**Switches:**
- `/synaptik off` makes the hooks pass through while the session continues;
  `/synaptik on` brings them back (D39). It exists because the failure actually
  hit during development was rendering being *wrong*, not throwing — and
  restarting a session to escape it is painful mid-task.
- `/plugin` disables an installed mod; `--safe-mode` disables every mod for a
  session.

**Revisions**
- **2026-11-10** — rewritten to stand on its own: the review in progress, threads
  included, is what disabling costs; the reference to a proposal dropped.

---

## Extensions

### E16 — Extended mode: cooperate with the agent (**analysis needed**)
**Status:** proposed · added 2026-10-14

**The deliberate inverse of P1 — read that first.**

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

**The coupling is the whole problem.** The design's consistent finding was that
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

## Superseded

### D28 — Mods do not intervene in Claude Code's own tool runs
**Status:** superseded → P3 · added by 2026-10-14

The mod does not gate, modify or execute tool calls Claude makes. The boundary
falls on a natural seam — two different surfaces, never confusable at runtime:

| | Surface | In MVP scope |
|---|---|---|
| Command **in the response text** (written, not called) | `AssistantMessage` render site | Yes — comment and thread apply |
| Command Claude **is calling** | `tool.call` | No — untouched |

**Consequence:** Synaptik registers **no tool hooks at all**. The hooks it does
register are listed in the README.

**The excluded case is real and wanted** — responding to an approval prompt with
"yes, but add `--verbose`" instead of rejecting and retyping. See E5.

**Revisions**
- **2026-11-10** — superseded by P3, which now states the rule and the seam.

---

### D22 — Conflicting marks are not resolved by the mod
**Status:** superseded → P2 · added by 2026-10-14

If a block is accepted and then threaded to the opposite conclusion, send
**both** without intervention. The agent resolves it in its next response.
Avoids inventing precedence rules the user would have to learn.

**Revisions**
- **2026-11-10** — superseded by P2, which now states the rule.
