# Synaptik — Build Spec

**What it is:** review an agent's last reply in place — accept, reject,
comment, discuss — and turn that review into one prompt.

**This spec covers the Claude Code host**, the only one that exists. Sections
2–5 and 9 describe host-neutral behaviour; 6, 7, 10 and 11 are Claude Code
specifics. See §14 for how a second host would fit.

**Status:** spike done (branch `spike/rendering`, Claude Code 2.1.287). §15 holds
its answers; §6, §7, §10 and §11 describe what it showed works. Anything still
marked ⚠️ is unverified. Open design questions are listed in `spec/08-claude-code-api.md` §11.

> **For the rationale** behind anything here — why Run was cut, why there are no
> block IDs, what was parked — see `decisions/`. This file says only what to
> build. If the two disagree, this file is wrong; fix it.

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

---

## 1. The loop

```
Claude replies
  → ctrl+x tab, then ↑↓ to a block, tab and ⏎ to accept / reject / comment / discuss
    (←→ in classic with the recommended binding, §10)
  → marks accumulate in a tray
  → the prompt box shows the prompt they compile into, as a dim suggestion
  → tab takes it, ⏎ sends it
```

Nothing reaches the agent until you send, and what it receives is text you saw
first. The mod never interferes with the prompt/response flow: it adds no
markers or IDs, and never writes the box, submits, or holds a turn on its own.

---

## 2. Scope

**Only the last assistant message is interactive, and only after its turn
completes.** Marking is off from `turn.start` until `turn.complete`: the reply
and the band draw as vanilla Claude Code while a turn runs, since the reply that
is coming will replace the tray anyway (§5).

**The reply is the whole last turn**: every assistant message with text since
the last prompt, joined in order. A reply that runs a tool mid-way is stored as
several messages; all of them are markable. Tool results (stored as user rows)
and rows recorded after the turn (a slash command) are skipped.

**A resumed session is markable at once.** On `session.start` the mod reads the
transcript (`$.session.messages()`) and adopts its last turn. A resume ends the
transcript with an engine-written `No response requested.` row, which is
skipped.

`/resume` and `/clear` inside a running session raise no `session.start`: the
session ends (`session.end`, reason `resume` or `clear`) and the process goes on
under another id. So after either, once `$.session.id()` has changed, the mod
adopts the new transcript's last turn, or a cleared one's none (#147).

⚠️ That row is recognised by its text: `SessionMessage` carries no flag for rows
the engine writes itself.

Older messages are inert. Nothing is persisted across sessions.

**Only Claude Code's terminal renderer** (`e.surface === 'terminal'`): any
terminal, IDE-integrated terminals, the JetBrains plugin, tmux, SSH. On the
Desktop app's Code tab and the mobile app — which have review features of their
own — and on every other surface, every hook passes through with `next(e)`
(D40). The VS Code panel is the next surface (#76).

---

## 12. Must-hold properties

**Fail to vanilla.** A hook that throws or exceeds its 10-second budget is
skipped. Give every registration `.catch(handler)` returning `next(e)`, so a
failure leaves **plain Claude Code rendering** — never a half-drawn transcript.

**Hold no state the conversation depends on.** Blocks are derived at render time;
nothing is stored in the conversation. Disabling mid-flow costs only the tray.
Check every future feature against this.

**Ship a kill switch.** A key or `/command` that makes the render hooks pass
through while the session continues. The failure you will actually hit while
developing is rendering being *wrong*, not throwing — and restarting a session to
escape it is painful mid-task. It is `/synaptik off`, for the session (D39); a
slash command's output row is read by the model, which P1 (as revised) allows.

**Never interfere with the prompt/response flow.** The mod proposes and draws; it
never writes the prompt box behind the person's back, never submits on its own,
and never blocks or rewrites a turn.

**Keep the logic free of `$.` calls.** Segmentation, tray state and the compile
step are plain functions over text and data, living in `src/` with the hooks as a
thin shell over them. No `$`, no event objects, no element trees in any `src/`
signature. See §14 — this is what makes the logic testable without a session,
and what a second host would build on.

---
