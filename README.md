# Synaptik

Mark up an agent's response in place, then send one prompt.

Claude Code renders a linear transcript. Replying to part of it means scrolling
up and hand-writing prose that points back at it — *"you said in step 3…"*, or a
numbered list reconstructing which suggestions you accepted and which you
didn't. Synaptik lets you mark the response itself and compiles the prompt for
you.

```
  ✓ Use Redis for the session cache
        per-user key prefix
▌ ✗     5 minute TTL
 └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
    Add a rate limiter
  ✎ Run the migration before deploying.
    → do it after the backfill, not before
```

Marks accumulate, and what they compile into appears in the prompt box as a dim
suggestion. `Tab` takes it, `⏎` sends it:

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "5 minute TTL"
✎ "Add a rate limiter" → make it 5 req/sec
💬 "Run the migration" → do it after the backfill, not before
```

Nothing reaches the agent until you send, and what it receives is an ordinary
prompt you saw first — Synaptik adds no markers or identifiers, and never
interferes with the prompt/response flow.

## Requirements

Claude Code **v2.1.287+** in a terminal, or **v2.1.286+** in the Claude desktop
app's Code tab. Mods are enabled by default; `claude --version` reports yours.

## Install

Not yet published to a marketplace. Once it is:

```bash
claude plugin install synaptik@synaptik-app
```

To run it from a clone in the meantime:

```bash
git clone https://github.com/synaptik-app/synaptik
claude --plugin-dir ./synaptik/hosts/claude-code
```

`--plugin-dir` loads the mod for one session only and reloads it when files
change, which is also how you'd develop against it. `/plugin` inside a session
lists what loaded.

A mod runs inside Claude Code with your own permissions and is not sandboxed.
`claude plugin validate ./hosts/claude-code` prints every event it handles and
every API call it makes, without running it.

## Layout

```
docs/SPEC.md                 what to build
docs/DECISIONS.md            why it is built that way
hosts/claude-code/           the mod: hooks, rendering, and pure logic in src/
```

`hosts/` is deliberate. If another terminal agent offers UI extension, the
portable artifact is the spec, not the code — so each host implements the same
behaviour in its own language rather than sharing a runtime.

## Contributing

Design discussion happens in
[Discussions](https://github.com/synaptik-app/synaptik/discussions); tracked work
is in Issues. `docs/DECISIONS.md` records what was decided and what was
deliberately left out, so a proposal is easier to argue for against that than
from scratch.

Not accepting code contributions until phase 1 exists.

## License

Apache 2.0 — see [LICENSE](LICENSE).
