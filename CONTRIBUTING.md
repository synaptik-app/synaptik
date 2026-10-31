# Contributing

Synaptik is early and maintained by one person, so the most useful contribution
is **what you saw using it**.

## Issues

[New issue](https://github.com/synaptik-app/synaptik/issues/new/choose) offers:

- **Bug report** — with your Claude Code version, how Synaptik is installed, the
  renderer (fullscreen or classic), and your terminal.
- **Feature or idea** — a proposal, or a field note: something that felt wrong
  or missing while marking up a real reply. Say what you were doing and what you
  expected; a screenshot helps. For a design, read
  [`docs/DECISIONS.md`](docs/DECISIONS.md) first: most obvious ideas were already
  considered, and many were cut for a reason. A proposal that answers that reason
  is easy to take up.

Questions and open-ended design talk go to
[Discussions](https://github.com/synaptik-app/synaptik/discussions);
vulnerabilities to private reporting ([SECURITY.md](SECURITY.md)).

## Pull requests

Welcome for fixes and for issues marked ready; for anything larger, agree on the
design in an issue first. The prototype is being refactored in phase 1 (#49), so
expect files to move.

Before opening one:

- **Read `CLAUDE.md`** — the rules every change keeps: `src/` holds pure logic and
  never touches the host; the mod never interferes with the prompt/response flow;
  every hook fails back to plain Claude Code.
- **Run the tests** — CI runs these on every PR:

  ```bash
  node scripts/fixtures.mjs --check          # the UI tests' fixtures are current
  claude plugin validate ./hosts/claude-code
  claude plugin test ./hosts/claude-code     # unit and UI tests, no session needed
  ```

- **Check the types** — locally only, since CI can't. Claude Code writes the API
  types when a session loads the mod, which takes a login, so load it once first
  (`claude --plugin-dir ./hosts/claude-code`):

  ```bash
  npx -y -p typescript@7.0.2 tsc --noEmit -p hosts/claude-code
  ```

- **For a change you can see**, try it from a clone on the test bench —
  `git clone https://github.com/synaptik-app/synaptik`, then
  `cd synaptik/testbench && claude --plugin-dir ../hosts/claude-code` (one
  session, reloading when files change; it replaces an installed copy for that
  session), and ask it to run
  `fullscreen`, `classic`, `split`, `nesting`, `long` or `all`.
- **Keep the docs true** — `docs/SPEC.md` when behaviour changes,
  `docs/DECISIONS.md` when a decision does.

The PR template lists the same checks.

## License

By contributing, you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE).
