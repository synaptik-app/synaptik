# Synaptik test bench

This folder exists to test the Synaptik mod by hand. A session here is a **test
session**: your job is to produce fixed replies the person can mark up with the
mod, and to turn their marks into results.

Start it from this folder with the mod loaded:

```bash
claude --plugin-dir ../hosts/claude-code
# the default renderer, this launch only (issue #11); /tui default also switches:
CLAUDE_CODE_DISABLE_ALTERNATE_SCREEN=1 claude --plugin-dir ../hosts/claude-code
# next to another mod (issue #12): the test bench's own neighbour mod
claude --plugin-dir ../hosts/claude-code --plugin-dir ./neighbour-mod
```

`neighbour-mod/` is a deliberately well-behaved companion mod: it shares the
band, the reply and the prompt box with Synaptik and always calls
`next(e)`, so anything that breaks points at Synaptik.

## Running a test

When the person asks to run a test — "run the rendering test", "run split",
"run everything" — reply with the matching fixture **verbatim**:

| Asked for | Fixture |
|---|---|
| smoke | `fixtures/smoke.md` — the happy path, start to finish; run it first on every build, fullscreen |
| render | `fixtures/render.md` — how the reply is drawn: mod off vs on, the selection, marks, widths; fullscreen |
| review | `fixtures/review.md` — reviewing in detail: the keyboard path, the menu, ending; fullscreen |
| comments | `fixtures/comments.md` — commenting in detail: editing, several lines, reopening, clearing, pasting; fullscreen |
| code | `fixtures/code.md` — stepping into code blocks: colours, margins, marks on lines; fullscreen |
| tables | `fixtures/tables.md` — stepping into tables: rows, wrapped rows, a table drawn as a list; fullscreen |
| threads | `fixtures/threads.md` — the thread pane: opening, its field, several threads, lines and rows; fullscreen |
| summaries | `fixtures/summaries.md` — what a thread's summary says, and the include switch; fullscreen |
| nesting | `fixtures/nesting.md` — which Markdown makes which block, and how nested blocks compile |
| classic | `fixtures/classic.md` — the basics in the default renderer only |
| split | `fixtures/split.md` — a reply split around a real tool call; fullscreen, run rarely |
| long | `fixtures/long.md` — a reply taller than the screen: the view following the selection; fullscreen, run rarely |
| neighbour | `fixtures/neighbour.md` — next to `neighbour-mod`, loaded as its steps say; run rarely |
| all, everything, whole test | one fixture per reply, in the order above from `smoke` to `nesting`; in the default renderer, `classic` alone. Write the next only when the person asks for it |

**Rules — the replies must be identical every run, or results are not comparable:**

1. Read the fixture with the Read tool, then write its content as your reply,
   exactly: same words, same Markdown, same blank lines. Do not summarise, fix,
   reformat or add commentary. Do not wrap it in a code block.
2. A line starting `<<STOP WRITING` is an instruction, not text: never write it.
   End your text there, make the real Bash call it names (`sleep N`), and continue
   with the text after it once the call returns. A reply with no Bash calls has
   failed the test, because the point is a reply split around real tool calls.
3. Read the fixture **before** writing any reply text, so that the read is not
   interleaved with the reply.
4. Nothing after the last fixture line — its closing paragraph is the end of the
   reply.

## Taking results

Each fixture ends with **Steps**: numbered **Do:** lines, each with **Expect:**
lines under it. The person marks the **Expect:** lines with the mod — ✓ passed,
✗ failed, ✎ with a note — and sends.
Marks on the fixture's reply itself are part of the test: list them apart, as what
the person marked, not as results. A **Do:** line arrives as the group of its
**Expect:** lines. Their message arrives as lines like:

```
"3. Do: press a"
    ✓ "Expect: ✓ in its margin"
    ✗ "Expect: a dim suggestion in the prompt box,..." → no suggestion
```

The **Do:** line arrives unmarked, as the group of its marks: it is not a result.

Then:

1. Summarise the results as a short table: group, item, result, note. Ask what was not
   marked, rather than assuming it passed.
2. Note the environment — ask if not stated: OS, terminal, renderer (fullscreen
   or classic), Claude Code version (`claude --version`), other mods enabled.
3. Offer to post the summary as a comment on the matching GitHub issue, and
   **post only after the person says yes**:
   - smoke → only if something failed; then ask which issue
   - classic renderer → #11
   - other mods enabled, or the neighbour test → #12
   - a platform, terminal or surface other than macOS fullscreen → #13
   - anything else → ask which issue
   Use `gh issue comment <n> --body ...` from the repository root.

Do not change the mod or the fixtures from a test session; report what you see.
If a fixture itself seems wrong, say so and leave it as it is.
