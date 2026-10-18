## What and why

<!-- What changed, and the issue it serves (Fixes #N / For #N). -->

## Checks

- [ ] `claude plugin test ./hosts/claude-code` passes (CI runs it too)
- [ ] Type-check passes locally: `npx -p typescript tsc -p hosts/claude-code/tsconfig.json` (not in CI — types are generated per Claude Code version)
- [ ] Fixtures changed? `node scripts/fixtures.mjs` re-run and the generated file committed (CI checks it)
- [ ] Docs follow: `docs/SPEC.md` for behaviour, `docs/DECISIONS.md` when a decision changes
- [ ] UI changed? Tried with the test bench — which fixtures, which renderer (fullscreen / classic):
