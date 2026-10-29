# Reviewing a Synaptik pull request

How to review a change here. The project's rules are in `CLAUDE.md` — read it
first; this file does not repeat them. It says what to look for, what to leave
alone, and how to report.

## Who reads the review

The maintainer does not read TypeScript fluently. Every finding must be
judgeable without reading the code:

- **What breaks, for whom, when.** A concrete scenario — "pressing `j` on the
  last block throws, and the transcript falls back to plain rendering" — not
  "possible undefined access".
- **Why it matters here**, in one sentence, naming the rule or decision
  (`CLAUDE.md`, `docs/DECISIONS.md` D-number) when there is one.
- **The fix in words**; a suggestion block only when it is short.

If you cannot state a concrete failure, it is not a finding.

## What CI already does

Do not re-check it; trust its result. CI runs on Claude Code 2.1.301 (the
oldest supported) and 2.1.308 (the newest tested):

- `claude plugin validate` on the mod, the marketplace and the test bench's
  neighbour mod
- `claude plugin test` — the unit tests in `src/` and the UI tests in `tests/`
- the fixtures check (`scripts/fixtures.mjs --check`)

CI does **not** type-check: the API types are generated per Claude Code version
and are not in the repository. So a type error can merge — watch for one.

## What to look for, in order

1. **The rules in `CLAUDE.md`.** A break is the most serious finding there is:
   `$` outside `register.tsx`, a host type in `src/`, a hook registration
   without `.catch` to `next(e)`, anything that writes the prompt box or
   submits, a tool hook, state the conversation depends on.
2. **Hooks that can fail or stall.** A hook is skipped after 10 seconds or on a
   throw. Look for work that grows with the transcript inside a render hook,
   anything awaited without need, and redraws on every event rather than on a
   change (D33).
3. **The mods API.** A `$` call new to this PR, or used in a new way, must
   exist in the oldest supported version. The tests run on both versions, so a
   missing call fails CI — but only on a path a test reaches. Flag a new `$`
   call, or a new argument shape, on a path no test exercises: that is where
   one gets through. The types are not in the checkout: do not guess — say
   which call to check against `.claude-plugin/types/claude-code/index.d.ts`.
   Anything marked ⚠️ in `docs/SPEC.md` must not be relied on.
4. **Correctness.** Wrong behavior against `docs/SPEC.md`; edge cases — an
   empty reply, one block, a very long reply, the last block, the classic and
   fullscreen renderers (D41); keys the person rebound (D32).
5. **Tests.** A change to `src/` without a test that would have failed before
   it. A test that cannot fail.
6. **Docs.** Behavior changed but `docs/SPEC.md` did not; a decision changed
   but `docs/DECISIONS.md` did not, or a decision was renumbered or reused.
7. **TypeScript that hides a bug**: `any`, `!` or `as` that silences a real
   `undefined`, a promise that is neither awaited nor caught, mutating data the
   caller still holds.

## What not to flag

- Style, naming or formatting the surrounding code already uses.
- Ideas `docs/DECISIONS.md` already considered and cut — check before
  proposing a feature, a setting or an abstraction.
- "Add a comment", "extract a helper", "consider renaming" — unless the current
  form causes a bug.
- Anything CI checks, as above.
- Hypotheticals with no path from real input.

## How to report

- One inline comment per real problem, on the line concerned, most severe
  first.
- Then one short top-level comment: **merge**, **merge after fixes** or
  **don't merge**, and anything that did not fit inline — for example a missing
  test or doc change.
- No praise, no summary of the diff, no list of what was checked. If nothing is
  wrong, say so in one line.
