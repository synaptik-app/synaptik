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
agent would have to parse. The mod does not ask the model for anything, and does
not teach it any protocol.

**Consequences:**
- The person sees every word before it is sent, in the prompt box (D30), and sends
  it themselves: the mod submits nothing.
- Killed D6 and D8 outright, and reduced D7 to nothing.
- Allowed: a slash command whose output the model reads (the kill switch, D39);
  naming the mod where useful.

**The test** for anything new, E9 and E16 included: does it change the flow, or
only inform it?

**Open edge:** E9 (nudging Claude toward `AskUserQuestion` via `prompt.compose`)
does not touch user prompts, but does make the agent behave differently because
the mod is installed. A softer violation of the same family. Current lean: allow
it, since it changes *behaviour* rather than inventing a protocol. Revisit if
E12 is ever built.

**E16 is the deliberate exception**, and it is scoped as one: an opt-in
"extended" mode where the agent is told its response will be marked up. **P1
stays the default and the documented norm** — extended mode is the deviation, not
the other way round. The reasoning for keeping it that way is in E16.

**Revisions**
- **2026-10-15** — what P1 protects is the flow, not secrecy. It was "the agent
  never knows the mod exists".
- **2026-10-24** — the mod submits nothing (D30); before, it sent with
  `$.prompt.submit({ asUser: true })`, since the plain form names the mod as
  sender.

---

### P2 — The mod relays, it does not analyse
**Status:** settled · added 2026-10-12

The mod never decides what the user meant, what is worth sending, or how to
reconcile contradictions. It captures intent and hands it over verbatim; the
agent does the interpreting.

Visible in D3 (the model summarizes its own thread, the mod does not),
D22 (conflicts go out unresolved), and the deletion of the capability matrix
in D4.

---

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

### D22 — Conflicting marks are not resolved by the mod
**Status:** settled · added by 2026-10-14

If a block is accepted and then threaded to the opposite conclusion, send
**both** without intervention. The agent resolves it in its next response.
Avoids inventing precedence rules the user would have to learn. See P2.

---

### D23 — The mod must be trivially disableable, and must fail to vanilla
**Status:** settled · added by 2026-10-13

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

#### An in-mod kill switch

`/synaptik off` makes the hooks pass through while the session continues, and
`/synaptik on` brings them back (D39). **The failure actually hit during
development is rendering being *wrong*, not throwing** — and restarting a session
to escape it is painful mid-task.

**Other switches:** `claude --plugin-dir ./mod` loads for one session only (and
reloads the hooks module on save); `/plugin` disables an installed one;
`--safe-mode` disables everything for a session.

---

### D28 — Mods do not intervene in Claude Code's own tool runs
**Status:** settled · added by 2026-10-14

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

