<picture>
  <source media="(prefers-color-scheme: dark)" srcset=".github/assets/readme-banner-dark.png">
  <img alt="Synaptik — accept, reject or comment on any part of the agent's reply" src=".github/assets/readme-banner-light.png">
</picture>

# Synaptik

**Synaptik** (with a **k**) is a mod for Claude Code. Pick any part of the agent's reply — a
paragraph, a step in its plan, an item in a list — and accept it, reject it, or
comment on it. Synaptik turns your marks into a single prompt, written as if
you'd typed it yourself.

![Synaptik: marking up a reply, then sending the marks as one prompt](.github/assets/demo.gif)

Your marks appear in the prompt box as a dim suggestion: `Tab` takes it, `⏎`
sends it. Nothing reaches the agent until you send, and what it receives is an ordinary
prompt you saw first — Synaptik adds no markers or identifiers, and never
interferes with the prompt/response flow.

## Status

**v0.1.0, early.** The core loop works and is used daily by its author:
accept, reject and comment on blocks of the last reply, in the fullscreen and
the classic renderer. What comes next is on the
[roadmap](https://github.com/orgs/synaptik-app/projects/2).

## Install

Claude Code **v2.1.301+** in a terminal — any terminal, including the ones in
VS Code, Cursor and JetBrains IDEs, and over SSH or tmux. Mods are enabled by
default; `claude --version` reports yours.

### From the marketplace

This repository is its own plugin marketplace, `synaptik-app`:

```bash
claude plugin marketplace add synaptik-app/synaptik
claude plugin install synaptik@synaptik-app
```

> [!NOTE]
> No GitHub SSH key? Set `CLAUDE_CODE_PLUGIN_PREFER_HTTPS=1` first.
> `claude plugin update synaptik@synaptik-app` gets new versions.

### Offline or air-gapped

Download `synaptik-<version>.zip` from
[Releases](https://github.com/synaptik-app/synaptik/releases) on a connected
machine and carry it over. Then either:

```bash
# one session only, straight from the zip
claude --plugin-dir ./synaptik-<version>.zip

# every session: unzip it into your skills folder
unzip synaptik-<version>.zip -d ~/.claude/skills/
```

On Windows the skills folder is `%USERPROFILE%\.claude\skills\`. To update,
replace the `synaptik` folder there with the newer zip's. Use one install or the
other: with both, the marketplace copy loads and the unzipped one doesn't.

### Once it's in

`/synaptik` opens the navigator, `/synaptik off` and
`/synaptik on` turn it off and on for the session, and `/synaptik help` lists
the rest.

### Keys

After a reply, the band above the prompt says how to start.

**Fullscreen** — no setup. Click the band's hint ("click here to review the reply")
or press `ctrl+x tab`; then click a block, or stay on the keyboard. Outside a
review the reply is plain text you can select.

| | Mouse | Keyboard |
|---|---|---|
| Start reviewing | click the band's hint, then ↑/↓ or a block | `ctrl+x tab` |
| Move between blocks | ↑ / ↓, Home / End | `j` / `k` |
| Choose an action | ← / → | ← / → |
| Apply it | ⏎, or click it | ⏎ |
| Apply directly | `a` accept · `x` reject · `c` comment | same |
| Done | `q` | `q` |

A comment is typed right under its block; `\` then ⏎ starts a new line, and a
paste goes into it.

**Classic** — the navigator above the band shows the selected block:

| | Default | With the bindings below |
|---|---|---|
| Start reviewing | `ctrl+x tab` | same |
| Move between blocks | ↑ / ↓ | same |
| First / last block | Home / End (`Fn+←` / `Fn+→` on a MacBook) | same |
| Choose an action | Tab / ⇧Tab | ← / → |
| Apply it | ⏎ | same |
| Apply directly | `a` accept · `x` reject · `c` comment | same |
| Done | Esc | same |

In classic's pane, Claude Code binds only Tab / ⇧Tab to move between actions. A
mod cannot ship key bindings, so ← / → go in your own
`~/.claude/keybindings.json`. **`/synaptik config` sets them for you**, in
classic: it shows exactly what it will add and what it gives up, and saves only
when you choose Save. Fullscreen needs no setup — ← / → already work there. By
hand, the entry is:

```json
{
  "bindings": [
    { "context": "Pane", "bindings": { "left": "abovePrompt:previous", "right": "abovePrompt:next" } }
  ]
}
```

### Known limits

- **Fullscreen** reviews the reply in place. **Classic** cannot redraw what has
  scrolled off, so its navigator shows the selected block itself, above the
  prompt — and may not appear on narrow terminals: Claude Code holds back a pane
  opened unasked below about 144 columns. The band then offers to open it.
- **Esc doesn't end a fullscreen review — `q` does**: Claude Code doesn't tell a
  mod about Esc.
- **While reviewing, the reply's text can't be selected**: each block takes the
  mouse. Outside a review it can.
- **Only the last reply** can be marked, and marks last for the session — they
  are not saved, and nothing is written into the conversation.
- **One mod redraws a reply.** In classic, another mod that changes how replies
  are drawn may be bypassed while you review; outside review Synaptik leaves
  replies alone unless they carry marks.
- **Code blocks and tables** are one block each, marked as a whole for now;
  stepping into them is planned (#105).
- **No key clears a mark yet.** Pressing the same verb again unmarks ✓ and ✗; a
  ✎ goes when its text is deleted or another verb replaces it (#100).
- **A Claude Code update can break Synaptik:** it is built on the young mods
  API. [An issue](https://github.com/synaptik-app/synaptik/issues/new/choose)
  with your `claude --version` helps.

## Contributing

Found a bug, or something that felt wrong or missing on a real reply?
[An issue](https://github.com/synaptik-app/synaptik/issues/new/choose) is the
most useful thing you can send. Ideas and design discussion are welcome; see
[CONTRIBUTING.md](CONTRIBUTING.md). `docs/DECISIONS.md` records what was decided
and what was deliberately left out, so a proposal is easier to argue for against
that than from scratch. Security issues: [SECURITY.md](SECURITY.md).

## License

Apache 2.0 — see [LICENSE](LICENSE).

---

Synaptik is an independent open-source project, not affiliated with or endorsed
by Anthropic. Claude and Claude Code are trademarks of Anthropic.
