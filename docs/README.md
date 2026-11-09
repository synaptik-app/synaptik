# Docs

| Folder | What it holds |
|---|---|
| [`spec/`](spec/README.md) | **what to build** — the contract, in the present tense |
| [`decisions/`](decisions/README.md) | **why** — the decision records (DRs), and what was left out |
| [`log/`](log/) | **history** — per-issue logs of what was tried, and the early design notes |

`spec/` and `decisions/` share file numbers and names: `spec/03-navigation.md`
says what navigation does, `decisions/03-navigation.md` why. A topic with no
spec file of its own (principles, keys, project) has a gap there.

## Reading order

1. [`spec/README.md`](spec/README.md) — the problem, the loop, scope, and what
   must always hold.
2. [`decisions/00-principles.md`](decisions/00-principles.md) — the three
   principles every decision answers to.
3. The topic you're working on: its spec file, then its DRs.

Before proposing a change, read the DRs for that topic: most obvious ideas were
already considered, and many were cut for a reason.

## Glossary

| Term | Meaning |
|---|---|
| **reply** | the agent's last turn: every assistant message with text since the last prompt, across tool calls |
| **block** | one markable piece of the reply — a paragraph, list item, code block, table or quote |
| **review** | the mode in which blocks are selected and marked; entered with `ctrl+x tab` or a click, left with `q` |
| **mark** | what a verb leaves on a block: ✓ accept, ✗ reject, ✎ comment |
| **verb** | accept, reject, comment, discuss — the four actions on a block |
| **step in** | the fifth action on a code block or table: mark its lines or rows one by one |
| **thread** | a side conversation about one block (discuss), private until included |
| **summary** | what a thread sends when included: written by its own fork, as an instruction to the agent |
| **tray** | the marks and included threads of the current review, in memory |
| **suggestion** | the compiled prompt, proposed in the empty prompt box; `tab` takes it, `⏎` sends it |
| **band** | Synaptik's lines above the prompt box: counts, hints, the discard warning |
| **navigator** | classic's pane: a block viewer that takes the keys during a review |
| **fullscreen / classic** | Claude Code's two terminal renderers; fullscreen reviews in the reply, classic in the navigator |
| **DR** | decision record: `P` principle, `D` decision, `E` extension (proposed) |
