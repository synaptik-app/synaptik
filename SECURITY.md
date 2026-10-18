# Security

## Reporting a vulnerability

Please report it privately, through
[GitHub's private vulnerability reporting](https://github.com/synaptik-app/synaptik/security/advisories/new),
not in a public issue. If you cannot use GitHub, write to
[security@synaptik.app](mailto:security@synaptik.app). You'll get an answer
within a week.

Synaptik has no releases yet, so only the `main` branch is supported.

## What Synaptik can do

A Claude Code mod runs inside Claude Code with **your own permissions and is not
sandboxed**. What Synaptik does with them:

- reads the session's transcript and the prompt box, to draw marks and propose
  the compiled prompt;
- reads `~/.claude/keybindings.json` (found through `$HOME`), to name your key
  in the band — it never writes it;
- proposes text in the prompt box, and submits it only on your explicit key.

It makes no network requests, runs no commands, and registers no tool hooks: it
never gates, changes or runs a tool call. `claude plugin validate
./hosts/claude-code` lists every event it handles and every API call it makes,
without running it.

Something that breaks one of these — Synaptik sending text you did not see, or
acting outside the list above — is a vulnerability worth reporting.
