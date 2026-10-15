# Synaptik

A Claude Code mod: mark up the agent's last response in place — accept, reject,
comment, discuss — and compile those marks into one prompt.

## Read first

- **`docs/SPEC.md`** — what to build. Present tense, examples throughout. This is
  the contract; follow it.
- **`docs/DECISIONS.md`** — why it is built this way, and what was deliberately
  left out. Read this before proposing a change to the spec, because most
  obvious ideas were already considered and cut for a reason.

If the two disagree, SPEC.md is wrong — fix it.

Anything marked ⚠️ in the spec is **unverified against the mods API**. Do not
rely on it or build on it without checking first. `docs/SPEC.md` §15 holds what
the spike answered; `docs/DECISIONS.md` §11 lists what is still open.

## Layout

```
hosts/claude-code/
├── hooks/register.tsx   the only file that touches $.
├── types/index.d.ts     the $.state contract
└── src/                 pure logic: blocks, tray, compile
```

## Rules

**`src/` never mentions a host type.** Its functions take and return plain data —
strings, arrays, the `Tray` map. No `$`, no event objects, no element trees in
any signature. `register.tsx` depends on `src/`; never the reverse.

*The test:* `claude plugin test` runs everything in `src/` with no session. **If a
test needs a mock `$`, the separation has leaked.**

**Never interfere with the prompt/response flow.** Nothing reaches the agent that
the person did not see and choose; the mod never writes the prompt box behind
their back, submits on its own, or holds a turn. No markers or identifiers in
what is sent — they are noise. The agent knowing the mod exists is fine
(`DECISIONS.md` P1, revised). Sending is a suggestion the person takes
(`$.prompt.suggest`), or `$.prompt.submit({ text, asUser: true })` on an explicit
key.

**The mod relays; it does not analyse.** It captures what the user meant and
hands it over verbatim. It does not reconcile contradictory marks, decide what is
worth sending, or infer intent. The agent interprets.

**Fail to vanilla.** Every hook registration gets `.catch(handler)` returning
`next(e)`. A hook that throws or exceeds its 10-second budget is skipped, so a
failure must leave plain Claude Code rendering — never a half-drawn transcript.

**Hold no state the conversation depends on.** Blocks are derived at render time;
nothing is written into the conversation. Disabling mid-flow costs only the tray.

**No tool hooks.** The mod reads what the transcript already holds and never
gates, modifies or executes a tool call. See `DECISIONS.md` P3.

## Commands

```bash
claude --plugin-dir ./hosts/claude-code     # load for one session; reloads on save
claude plugin validate ./hosts/claude-code  # list hooks and API calls, without running
claude plugin test ./hosts/claude-code      # run *.test.ts, no session needed
```

## API reference

The authoritative spec for the mods API is the types Claude Code writes for the
installed version:

```
.claude-plugin/types/claude-code/index.d.ts
```

**Trust that over the published docs or over anything in these files** — the API
is young and the docs lag. Published reference:
https://code.claude.com/docs/en/plugins/mods/reference

## Working on this

Keep `docs/DECISIONS.md` current when a decision changes. Decision numbers are
never reused or renumbered; a superseded decision is marked and says what
replaced it. The history is the point.
