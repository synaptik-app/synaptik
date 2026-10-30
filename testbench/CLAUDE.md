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
| fullscreen | `fixtures/fullscreen.md` — rendering and reviewing, fullscreen only |
| classic | `fixtures/classic.md` — the navigator, the default renderer only |
| split | `fixtures/split.md` |
| nesting | `fixtures/nesting.md` |
| long | `fixtures/long.md` |
| all, everything, whole test | `fullscreen` or `classic`, for the renderer in use (ask if not stated), then `split`, `nesting`, `long` |
| neighbour | `fixtures/neighbour.md` — only with `neighbour-mod` loaded; not part of "all" |

**Rules — the replies must be identical every run, or results are not comparable:**

1. Read the fixture with the Read tool, then write its content as your reply,
   exactly: same words, same Markdown, same blank lines. Do not summarise, fix,
   reformat or add commentary. Do not wrap it in a code block.
2. A line starting `<<STOP WRITING` is an instruction, not text: never write it.
   End your text there, make the real Bash call it names (`sleep N`), and continue
   with the text after it once the call returns. A reply with no Bash calls has
   failed the test, because the point is a reply split around real tool calls.
3. For "all": before each fixture, output its first heading as written, and run
   `sleep 2` with the Bash tool between fixtures.
4. Read every fixture you need **before** writing any reply text, so that the
   reads are not interleaved with the reply.
5. Nothing after the last fixture line — the checklist at the end of each
   fixture is the end of the reply.

## Taking results

Each fixture ends with **What to check**. The person marks those items with the
mod — ✓ passed, ✗ failed, ✎ with a note — and sends. Their message arrives as
lines like:

```
✓ "Numbered list keeps its numbers 1. 2...."
✗ "The table draws as a table" → rows split onto separate lines
```

In a grouped checklist, a mark arrives under its group's name, unmarked and
indented. The group is not a result.

Then:

1. Summarise the results as a short table: group, item, result, note. Ask what was not
   marked, rather than assuming it passed.
2. Note the environment — ask if not stated: OS, terminal, renderer (fullscreen
   or classic), Claude Code version (`claude --version`), other mods enabled.
3. Offer to post the summary as a comment on the matching GitHub issue, and
   **post only after the person says yes**:
   - classic renderer → #11
   - other mods enabled, or the neighbour test → #12
   - a platform, terminal or surface other than macOS fullscreen → #13
   - anything else → ask which issue
   Use `gh issue comment <n> --body ...` from the repository root.

Do not change the mod or the fixtures from a test session; report what you see.
If a fixture itself seems wrong, say so and leave it as it is.
