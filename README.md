# Synaptik

Synaptik is a mod for Claude Code. Pick any part of the agent's reply — a
paragraph, a step in its plan, an item in a list — and accept it, reject it, or
comment on it. Synaptik turns your marks into a single prompt, written as if
you'd typed it yourself.

*Coming next: discussing a part on the side, and marking up the agent's changes
line by line.*

Without it, answering part of a reply means scrolling up and writing prose that
points back at it — *"you said in step 3…"*, or a list rebuilding which
suggestions you took and which you didn't.

```
  ✓ Use Redis for the session cache
        per-user key prefix
▌ ✗     5 minute TTL
 └ [✓ accept] [✗ reject] [✎ comment] [💬 discuss]
  ✎ Add a rate limiter
    → make it 5 req/sec
    Run the migration before deploying.
```

Marks accumulate, and what they compile into appears in the prompt box as a dim
suggestion. `Tab` takes it, `⏎` sends it:

```
✓ "Use Redis for the session cache"
    ✓ "per-user key prefix"
    ✗ "5 minute TTL"
✎ "Add a rate limiter" → make it 5 req/sec
```

Nothing reaches the agent until you send, and what it receives is an ordinary
prompt you saw first — Synaptik adds no markers or identifiers, and never
interferes with the prompt/response flow.

## Status

**Early.** The core loop works and is used daily by its author: accept, reject
and comment on blocks of the last reply, in the fullscreen and the classic
renderer. Phase 1 — refactoring the prototype, a proper Markdown segmenter, and
a release you can install — is in progress; see the
[Phase 1 milestone](https://github.com/synaptik-app/synaptik/milestone/1) and the
[roadmap](https://github.com/orgs/synaptik-app/projects/2).

Not yet there: **💬 discuss** (a side thread about one block) is phase 2 and only
says so when chosen. Expect rough edges, and changes to keys and layout.

## Try it

Claude Code **v2.1.287+** in a terminal — any terminal, including the ones in
VS Code, Cursor and JetBrains IDEs, and over SSH or tmux. Mods are enabled by
default; `claude --version` reports yours.

Synaptik stays out of the Claude Desktop app's Code tab and the mobile app: both
have review features of their own (replies on a passage, side chats, diff
comments). The VS Code extension's panel is planned next.

Download `synaptik-<version>.zip` from
[Releases](https://github.com/synaptik-app/synaptik/releases), then either:

```bash
# every session: unzip it into your skills directory
unzip synaptik-0.1.0-alpha.2.zip -d ~/.claude/skills/

# or one session only, straight from the zip
claude --plugin-dir ./synaptik-0.1.0-alpha.2.zip
```

`/plugin` inside a session lists what loaded (`synaptik@skills-dir` for the
unzipped copy). `/synaptik` opens the navigator, `/synaptik off` and `/synaptik on`
turn it off and on for the session, and `/synaptik help` lists the rest. To update, remove
`~/.claude/skills/synaptik` and unzip the newer release. Installing by name from
a marketplace comes with v0.1.

To work on it, run it from a clone — for one session, reloading when files
change. It replaces an unzipped copy for that session:

```bash
git clone https://github.com/synaptik-app/synaptik
claude --plugin-dir ./synaptik/hosts/claude-code
```

A mod runs inside Claude Code with your own permissions and is not sandboxed.
`claude plugin validate` on the plugin folder prints every event it handles and
every API call it makes, without running it.

### Keys

After a reply, the band above the prompt says how to start. Inside the
navigator:

| | Default | With the bindings below |
|---|---|---|
| Start reviewing | `ctrl+x tab` | `ctrl+s` |
| Move between blocks | ↑ / ↓ | same |
| First / last block | Home / End (`Fn+←` / `Fn+→` on a MacBook) | same |
| Choose an action | Tab / ⇧Tab | ← / → |
| Apply it | ⏎ | same |
| Apply directly | `a` accept · `x` reject · `c` comment | same |
| Done | Esc | same |

A mod cannot ship key bindings, so the better ones go in your own
`~/.claude/keybindings.json`. **`/synaptik config` sets them for you:** pick the
key that opens Synaptik (`ctrl+x tab` or `ctrl+s`) and the keys that move
between actions (Tab / ⇧Tab or ← / →), see exactly what it will add and what it
gives up, and save. For other keys, edit the file by hand — `/synaptik config`
shows them as they are:

```json
{
  "bindings": [
    { "context": "Chat", "bindings": { "ctrl+s": "abovePrompt:focus" } },
    { "context": "Pane", "bindings": { "left": "abovePrompt:previous", "right": "abovePrompt:next" } }
  ]
}
```

`ctrl+s` is Claude Code's default for stashing the prompt; binding it gives that
up. The `Pane` arrows apply to every mod's pane, and clash with `ctrl+x ←/→`,
which resizes it.

### Known limits

- **Fullscreen** reviews the reply in place, with a block map docked beside it.
  **Classic** cannot redraw what has scrolled off, so the navigator shows the
  selected block itself, above the prompt.
- **The navigator may not appear on narrow terminals**: Claude Code holds back
  a pane opened unasked below about 144 columns. The band then offers to open it.
- **Only the last reply** can be marked, and marks last for the session — they
  are not saved, and nothing is written into the conversation.
- **One mod redraws a reply.** Another mod that changes how replies are drawn
  may be bypassed while you review; outside review Synaptik leaves replies alone
  unless they carry marks.
- **Code blocks and tables** are one block each, marked as a whole (#5, #6).

Found something else? A [field note](https://github.com/synaptik-app/synaptik/issues/new/choose)
is the most useful thing you can send.

## Layout

```
docs/SPEC.md                 what to build
docs/DECISIONS.md            why it is built that way
hosts/claude-code/           the mod: hooks, rendering, and pure logic in src/
testbench/                   fixed replies for testing by hand
```

`hosts/` is deliberate. If another terminal agent offers UI extension, the
portable artifact is the spec, not the code — so each host implements the same
behaviour in its own language rather than sharing a runtime.

## Contributing

Field notes, bugs and design discussion are welcome; see
[CONTRIBUTING.md](CONTRIBUTING.md). `docs/DECISIONS.md` records what was decided
and what was deliberately left out, so a proposal is easier to argue for against
that than from scratch. Security issues: [SECURITY.md](SECURITY.md).

## License

Apache 2.0 — see [LICENSE](LICENSE).
