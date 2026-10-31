# Synaptik

**Synaptik** (with a **k**) is a mod for Claude Code. Review the agent's reply
in place: go through it block by block — a paragraph, a step in its plan, an
item in a list — and accept it, reject it, or comment on it. Synaptik turns
your review into one prompt, written as if you'd typed it yourself.

Your review appears in the prompt box as a dim suggestion: `Tab` takes it, `⏎`
sends it. Nothing reaches the agent until you send.

![Synaptik: reviewing a reply in place, then sending the review as one prompt](https://raw.githubusercontent.com/synaptik-app/synaptik/main/.github/assets/demo.gif)

## Install

Requires Claude Code **v2.1.301+** in a terminal; check yours with `claude --version`.

```bash
claude plugin marketplace add synaptik-app/synaptik
claude plugin install synaptik@synaptik-app
```

## Use

After a reply, the band above the prompt says how to start: `ctrl+x tab` works
in both renderers. `/synaptik` opens the navigator, and `/synaptik help` lists
the rest. The [full guide](https://github.com/synaptik-app/synaptik#readme) has
every key and the known limits.

## Turn it off or remove it

```bash
# inside a session: this session only
/synaptik off
/synaptik on

# from your shell: stays off until you enable it again
claude plugin disable synaptik@synaptik-app
claude plugin enable synaptik@synaptik-app

# from your shell: remove it
claude plugin uninstall synaptik@synaptik-app
```

## What it can access

A Claude Code mod runs with your own permissions and is not sandboxed. Synaptik:

- reads the session's transcript and the prompt box, to draw marks and propose
  your review as a prompt;
- proposes that prompt in the prompt box, as a suggestion. It never submits:
  you take the suggestion and send it yourself.

It reads and writes no files, makes no network requests, runs no commands and
registers no tool hooks. Your marks stay in memory for the session. More in
[SECURITY.md](https://github.com/synaptik-app/synaptik/blob/main/SECURITY.md).

## License

Apache 2.0.

---

Synaptik is an independent open-source project, not affiliated with or endorsed
by Anthropic. Claude and Claude Code are trademarks of Anthropic.
