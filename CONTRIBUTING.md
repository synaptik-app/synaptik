# Contributing

Synaptik is early and maintained by one person, so the most useful contribution
is **what you saw using it**.

## Issues

[New issue](https://github.com/synaptik-app/synaptik/issues/new/choose) offers:

- **Field note** — something that felt wrong or missing while marking up a real
  reply. Say what you were doing and what you expected; a screenshot helps.
- **Bug** — with your Claude Code version, terminal, and renderer (fullscreen or
  classic).
- **Design** — a proposal. Read [`docs/DECISIONS.md`](docs/DECISIONS.md) first:
  most obvious ideas were already considered, and many were cut for a reason. A
  proposal that answers that reason is easy to take up.

Open-ended questions go to
[Discussions](https://github.com/synaptik-app/synaptik/discussions).

## Pull requests

Welcome for fixes and for issues marked ready; for anything larger, agree on the
design in an issue first. The prototype is being refactored in phase 1 (#49), so
expect files to move.

Before opening one:

- **Read `CLAUDE.md`** — the rules every change keeps: `src/` holds pure logic and
  never touches the host; the mod never interferes with the prompt/response flow;
  every hook fails back to plain Claude Code.
- **Run the tests** — CI runs the same on every PR:

  ```bash
  node scripts/fixtures.mjs --check          # the UI tests' fixtures are current
  claude plugin validate ./hosts/claude-code
  claude plugin test ./hosts/claude-code     # unit and UI tests, no session needed
  ```

- **For a change you can see**, try it on the test bench:
  `cd testbench && claude --plugin-dir ../hosts/claude-code`, then ask it to run
  `rendering`, `split`, `nesting`, `long` or `all`.
- **Keep the docs true** — `docs/SPEC.md` when behaviour changes,
  `docs/DECISIONS.md` when a decision does.

The PR template lists the same checks.

## License

By contributing, you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE).
