# Design history

> **Direction of travel.** This pass removed far more than it added. Killed or
> moved out of MVP: the Run verb, Explain as a separate verb, the capability
> matrix, block IDs, ID expansion, tool-payload anchoring, the `session.append`
> hook, `$.tool.register`, the unified question model, and all
> `AskUserQuestion` interception. **The MVP now registers no tool hooks at all.**

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

### Ideas from pull-request review (2026-10-24)

- **Suggested change**, a comment pre-filled with the block's own text to edit:
  worth having, low priority. #107.
- **Model-written comment suggestions** (dim candidates in the field, from
  `$.model.fork`): low priority, and they pull against "the mod relays; it does
  not analyse". #107.
- **Jump to the next unmarked block**, and progress in the band: **not now**.
  Navigation stays simple. Reconsider if people ask for it.
- **A verdict for unmarked blocks** ("rest: go ahead"): **no.** Unmarked means
  nothing was said. The agent decides, or asks when something is unclear, which
  is better than a blanket "the rest is fine".
- **Outdated marks:** not applicable while only the last reply can be marked
  (needs E11 or E13).

---

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
| D30 | Send by live suggestion | ✅ settled — no send key (2026-10-24) |
| D31 | The navigator pane | ✅ revised — classic only (D41) |
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

---

## 13. Build order

| | What | Done when |
|---|---|---|
| **Spike** ✅ | throwaway mod on the real last reply: marks, navigator, band, suggestion | §15 answered; branch `spike/rendering` |
| **Phase 1** | evolves the spike (D34): real segmentation (§3), tray (§5), compile (§9), the reply in place, navigator, shared band, sending by suggestion; minimal navigator-off-screen and classic-mode handling; packaging. **No threads.** | usable daily, installable |
| **Phase 2** | threads, commit toggle, summary | §8 works |

**The spike answered its questions and evolves into phase 1** (D34, revising
D27's "throwaway"): its tested behaviour is kept, the segmenter is rewritten
properly, and the hooks file is split. Rendering came first because §6's
uncertainty was the only thing that could still change the design.

**Phase 1 is the real test.** If marking without threads does not change how the
work feels, phase 2 will not save it.

---
