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
  [`docs/decisions/`](docs/decisions/README.md) first: most obvious ideas were already
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
- **Keep the docs true** — `docs/spec/` when behaviour changes,
  `docs/decisions/` when a decision does.

The PR template lists the same checks.

## 14. Repo layout

```
synaptik/
├── docs/
│   ├── SPEC.md                    this file
│   ├── decisions/                 rationale, one file per topic
│   ├── log/                       history
│   └── spec/                      the spec, as it is split out of this file
├── hosts/
│   └── claude-code/
│       ├── .claude-plugin/
│       │   └── plugin.json        manifest
│       ├── hooks/
│       │   ├── hooks.json         { "modules": ["./register.tsx"] }
│       │   ├── register.tsx       every hook; the only file that touches $
│       │   ├── ui.ts              constants shared with the views
│       │   └── views/             reply, navigator, band, key menu: data in, elements out
│       ├── types/
│       │   └── index.d.ts         $.state contract, named in plugin.json
│       └── src/
│           ├── blocks.ts          text → Block[]
│           ├── tray.ts            state + transitions (#51)
│           ├── compile.ts         Tray + Block[] → string
│           ├── turn.ts            transcript rows → the last reply
│           ├── layout.ts, tally.ts, counter.ts       sizes and counts
│           └── *.test.ts

**`$` never crosses an import:** the mod loader follows it only into functions
in the same file, so every hook and every `$` call is in `register.tsx`; views
take elements, plain data and callbacks (#49).
└── CLAUDE.md
```

### Extensibility, without the abstraction

Another terminal agent may one day offer a UI-extension framework. **Do not
build for it yet** — an abstraction designed against an unknown API is usually
the wrong one. Two things make a second host cheap, and both are free today:

**1. `docs/SPEC.md` is the portable artifact, not the code.** Other agents are
written in other languages (Codex's CLI is Rust), so a shared TypeScript core
would be worth nothing to them. A second host reimplements this spec in its own
language. Sections 2–5 and 9 are host-neutral behaviour; 6, 7, 10 and 11 are
Claude Code specifics.

**2. `src/` never mentions a host type.** Its functions take and return plain
data — strings, arrays, the `Tray` map. No `$`, no event objects, no element
trees in any signature. `register.ts` depends on `src/`; never the reverse.

**The test for whether this has held:** `claude plugin test` runs everything in
`src/` with no session. **If a test needs a mock `$`, the separation has
leaked.**

Deliberately **not** done now: interfaces with one implementor, an abstract
renderer, a host-adapter layer. When `hosts/codex/` exists, lift the shared part
out then — by which point the real boundary will be known rather than guessed.

### Commands

```bash
claude --plugin-dir ./hosts/claude-code    # load for one session; reloads on save
claude plugin validate ./hosts/claude-code # list hooks and API calls without running
claude plugin test ./hosts/claude-code     # run *.test.ts with no session
```

⚠️ `--plugin-dir` makes `hosts/claude-code/` the plugin root, so `register.ts`
importing from `./src/` stays inside it. Keep it that way — imports *above* the
plugin root may not resolve, which is the reason `src/` lives under the host
rather than at the top level.

Requires Claude Code **v2.1.301+**, in the terminal (D40): the fullscreen review watches the prompt box with `prompt.change` (2.1.300), and multi-line comments use `Input`'s `rows` (2.1.301, #16). `Raster` and `Image`
are terminal-only and unused; the mod draws with `Box`, `Text`, `Button`,
`Input` and `Markdown`.

## License

By contributing, you agree that your contribution is licensed under the
[Apache License 2.0](LICENSE).
