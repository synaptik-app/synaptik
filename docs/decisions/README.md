# Synaptik — Design Decision Record

**Created:** 2026-10-12 · **Last updated:** 2026-10-15 (spike results)
**Status:** Spike done — **32 decisions and 3 principles**; P1, D20, D21, D24 and
D29 revised from it. The build spec is `SPEC.md`; this file holds the rationale
behind it. Open items from the spike are in §11.
**Framework:** Claude Code mods (CLI v2.1.301+ since 2026-10-27, was 2.1.287+; Desktop Code tab v2.1.286+)

> **Review convention.** Decisions keep their original numbers even when revised,
> collapsed or killed, so they stay citable across sessions. Numbers are never
> reused or renumbered. A dead decision says why it died rather than vanishing.

> **Direction of travel.** This pass removed far more than it added. Killed or
> moved out of MVP: the Run verb, Explain as a separate verb, the capability
> matrix, block IDs, ID expansion, tool-payload anchoring, the `session.append`
> hook, `$.tool.register`, the unified question model, and all
> `AskUserQuestion` interception. **The MVP now registers no tool hooks at all.**

---

## Index

| ID | Title | File | Status |
|---|---|---|---|
| P1 | The mod never interferes with the prompt/response flow | [principles](00-principles.md#p1--the-mod-never-interferes-with-the-promptresponse-flow) | settled |
| P2 | The mod relays, it does not analyse | [principles](00-principles.md#p2--the-mod-relays-it-does-not-analyse) | settled |
| P3 | One mechanism, many sources: review what the transcript already holds | [principles](00-principles.md#p3--one-mechanism-many-sources-review-what-the-transcript-already-holds) | settled |
| D1 | The response is a fillable form, not a thread host | [review-model](01-review-model.md#d1--the-response-is-a-fillable-form-not-a-thread-host) | settled |
| D2 | Verb set: four verbs, two mechanisms | [review-model](01-review-model.md#d2--verb-set-four-verbs-two-mechanisms) | settled |
| D3 | Deferred vs waiting; threads commit explicitly | [review-model](01-review-model.md#d3--deferred-vs-waiting-threads-commit-explicitly) | settled |
| D4 | Block segmentation: uniform verbs, flat navigation, structured output | [review-model](01-review-model.md#d4--block-segmentation-uniform-verbs-flat-navigation-structured-output) | settled |
| D5 | Blocks are derived at render time; no IDs are stored or shown | [review-model](01-review-model.md#d5--blocks-are-derived-at-render-time-no-ids-are-stored-or-shown) | settled |
| D6 | Reference expansion by truncated quote | [sending](06-sending.md#d6--reference-expansion-by-truncated-quote) | dead |
| D7 | Structure comes from tool payloads, not prose markup | [review-model](01-review-model.md#d7--structure-comes-from-tool-payloads-not-prose-markup) | reduced to nothing in MVP |
| D8 | Tool-driven items anchor by quote | [review-model](01-review-model.md#d8--tool-driven-items-anchor-by-quote) | dead |
| D9 | Unified question model | [review-model](01-review-model.md#d9--unified-question-model) | dead in MVP |
| D10 | Build the prose path first | [review-model](01-review-model.md#d10--build-the-prose-path-first) | absorbed into D4 |
| D11, D12, D13 | Held tool calls, Discuss, answer-and-forward | [review-model](01-review-model.md#d11-d12-d13--held-tool-calls-discuss-answer-and-forward) | moved to E12 with `AskUserQuestion` |
| D14 | Thread isolation via `$.model.fork` | [thread](05-thread.md#d14--thread-isolation-via-modelfork) | settled |
| D15 | Escalation ladder | [thread](05-thread.md#d15--escalation-ladder) | settled |
| D16–D19 | Branched sessions, depth, merge, worktrees | [thread](05-thread.md#d16d19--branched-sessions-depth-merge-worktrees) | deferred → §5 (E1–E4) |
| D20 | Modal navigation with visible controls on the selected block | [navigation](03-navigation.md#d20--modal-navigation-with-visible-controls-on-the-selected-block) | settled |
| D21 | Selection highlighting is a gutter column | [rendering](02-rendering.md#d21--selection-highlighting-is-a-gutter-column) | settled |
| D22 | Conflicting marks are not resolved by the mod | [principles](00-principles.md#d22--conflicting-marks-are-not-resolved-by-the-mod) | settled |
| D23 | The mod must be trivially disableable, and must fail to vanilla | [principles](00-principles.md#d23--the-mod-must-be-trivially-disableable-and-must-fail-to-vanilla) | settled |
| D24 | MVP scope: last message only | [review-model](01-review-model.md#d24--mvp-scope-last-message-only) | settled |
| D25 | Nudging Claude toward `AskUserQuestion` | [review-model](01-review-model.md#d25--nudging-claude-toward-askuserquestion) | deferred → §5 (E9) |
| D26 | Config surface | [keys](04-keys.md#d26--config-surface) | deferred → §5 (E10) |
| D27 | A throwaway spike, then two thin phases | [project](09-project.md#d27--a-throwaway-spike-then-two-thin-phases) | settled |
| D28 | Mods do not intervene in Claude Code's own tool runs | [principles](00-principles.md#d28--mods-do-not-intervene-in-claude-codes-own-tool-runs) | settled |
| D29 | The band is the source of truth; the prompt box is a scratch copy | [sending](06-sending.md#d29--the-band-is-the-source-of-truth-the-prompt-box-is-a-scratch-copy) | settled |
| D30 | Send by live suggestion in the prompt box | [sending](06-sending.md#d30--send-by-live-suggestion-in-the-prompt-box) | settled |
| D31 | The navigator: a docked pane that maps the reply | [navigation](03-navigation.md#d31--the-navigator-a-docked-pane-that-maps-the-reply) | settled |
| D32 | Key bindings belong to the person | [keys](04-keys.md#d32--key-bindings-belong-to-the-person) | settled |
| D33 | Share Claude Code's surfaces with other mods; redraw only when needed | [rendering](02-rendering.md#d33--share-claude-codes-surfaces-with-other-mods-redraw-only-when-needed) | settled |
| D34 | The spike evolves into phase 1 | [project](09-project.md#d34--the-spike-evolves-into-phase-1) | settled |
| D35 | In-place marks after review: a configuration option, on by default | [rendering](02-rendering.md#d35--in-place-marks-after-review-a-configuration-option-on-by-default) | settled |
| D36 | Distribution: a release zip now, a marketplace at v0.1, npm held | [project](09-project.md#d36--distribution-a-release-zip-now-a-marketplace-at-v01-npm-held) | settled |
| D37 | Blocks move by the keys only; the wheel scrolls the reply | [navigation](03-navigation.md#d37--blocks-move-by-the-keys-only-the-wheel-scrolls-the-reply) | settled |
| D38 | `/synaptik config` writes the key bindings, after the person confirms | [keys](04-keys.md#d38--synaptik-config-writes-the-key-bindings-after-the-person-confirms) | superseded by D42 |
| D39 | The `/synaptik` command | [keys](04-keys.md#d39--the-synaptik-command) | settled |
| D40 | Target surfaces: the terminal only | [project](09-project.md#d40--target-surfaces-the-terminal-only) | settled |
| D41 | Fullscreen reviews in the reply itself; classic keeps its pane | [rendering](02-rendering.md#d41--fullscreen-reviews-in-the-reply-itself-classic-keeps-its-pane) | settled |
| D42 | No key setup: Synaptik reads and writes no key bindings | [keys](04-keys.md#d42--no-key-setup-synaptik-reads-and-writes-no-key-bindings) | settled |
| D43 | Step into a code block, drawn as windows of the whole block | [navigation](03-navigation.md#d43--step-into-a-code-block-drawn-as-windows-of-the-whole-block) | settled |
| D44 | Step into a table, placing its rows with Claude Code's own layout | [navigation](03-navigation.md#d44--step-into-a-table-placing-its-rows-with-claude-codes-own-layout) | settled |
| D45 | Threads in a pane of their own, one per block | [thread](05-thread.md#d45--threads-in-a-pane-of-their-own-one-per-block) | settled |
| D46 | A thread on a code line or table row | [thread](05-thread.md#d46--a-thread-on-a-code-line-or-table-row) | settled |
| E1 | Branched sub-sessions (was D16, D17) | [thread](05-thread.md#e1--branched-sub-sessions-was-d16-d17) | proposed |
| E2 | Promote a thread to a branched session | [thread](05-thread.md#e2--promote-a-thread-to-a-branched-session) | proposed |
| E3 | Worktree isolation (was D19) | [thread](05-thread.md#e3--worktree-isolation-was-d19) | proposed |
| E4 | Summary-based merge between sessions (was D18) | [thread](05-thread.md#e4--summary-based-merge-between-sessions-was-d18) | proposed |
| E5 | Edit and resend a denied command | [rendering](02-rendering.md#e5--edit-and-resend-a-denied-command) | proposed |
| E6 | Auto-classify thread outcomes | [thread](05-thread.md#e6--auto-classify-thread-outcomes) | done 2026-11-04 (#156), as D45's revision: a verdict in the thread's own fork, as the switch's default. |
| E7 | Mod-driven Run verb (cut from D2) | [review-model](01-review-model.md#e7--mod-driven-run-verb-cut-from-d2) | proposed |
| E8 | Other built-in tools | [rendering](02-rendering.md#e8--other-built-in-tools) | proposed |
| E9 | Nudge Claude toward `AskUserQuestion` (was D25) | [review-model](01-review-model.md#e9--nudge-claude-toward-askuserquestion-was-d25) | proposed |
| E10 | Config surface (was D26) | [keys](04-keys.md#e10--config-surface-was-d26) | proposed |
| E11 | Multi-message interactivity | [review-model](01-review-model.md#e11--multi-message-interactivity) | proposed |
| E12 | `AskUserQuestion` interception (was D9, D11, D12, D13) | [review-model](01-review-model.md#e12--askuserquestion-interception-was-d9-d11-d12-d13) | proposed |
| E13 | Persisted block identity (was D5's `session.append`) | [review-model](01-review-model.md#e13--persisted-block-identity-was-d5s-sessionappend) | proposed |
| E14 | Custom structured payload via `$.tool.register` (was half of D7) | [review-model](01-review-model.md#e14--custom-structured-payload-via-toolregister-was-half-of-d7) | proposed |
| E15 | Review the files a turn touched, in the same review | [file-review](07-file-review.md#e15--review-the-files-a-turn-touched-in-the-same-review) | proposed |
| E16 | Extended mode: cooperate with the agent (**analysis needed**) | [principles](00-principles.md#e16--extended-mode-cooperate-with-the-agent-analysis-needed) | proposed |

---

## 3. Decision records

Status values: `settled`, `provisional` (decided, revisit after dogfooding),
`deferred` (moved to extension points, §5), `dead` (no longer exists).

---

## 5. Extension points

Parked capabilities, each with what it needs and which decisions it reactivates.
Nothing in the MVP design blocks any of these.

> These are parked for *different reasons*, which matters. E1 got **weaker** as
> a result of D15, not merely postponed. E5 is blocked on a hook-ordering
> problem that may have no clean solution. E7 is probably dead. E12 is
> straightforwardly valuable and was cut for implementation cost alone.
