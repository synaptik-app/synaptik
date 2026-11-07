# Privacy

Synaptik is a mod for Claude Code. It runs on your machine, inside your Claude
Code session.

## What Synaptik collects

Nothing. Synaptik has no server, no analytics and no telemetry. Its authors
receive no data from it.

## What it sends

Only one thing goes anywhere. When you discuss a block, Synaptik asks Claude
your question, and later asks for the thread's summary, through Claude Code
(`$.model.fork`). That request carries the session's transcript and goes to the
same model and account as your session. [Anthropic's privacy
policy](https://www.anthropic.com/legal/privacy) covers it, as it covers the
rest of your session.

Your review reaches the agent only when you send it yourself, as an ordinary
prompt.

## What it keeps

Your marks, comments and threads stay in Claude Code's memory for the session.
Synaptik never saves them to a file, and nothing is written into the
conversation. Other mods running in the same session can read them, as they
can read any mod's session values.

## Contact

[hello@synaptik.app](mailto:hello@synaptik.app). For security issues, see
[SECURITY.md](SECURITY.md).
