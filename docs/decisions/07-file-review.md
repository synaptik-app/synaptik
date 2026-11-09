# File review

## Extensions

### E15 — Review the files a turn touched, in the same review
**Status:** proposed · added 2026-10-13

**Likely the strongest extension point** — possibly worth more than phase 2's
threads, since reviewing generated code is where comments batch up most.

Claude edits or creates a file. You want to leave **several comments across it
and submit once** — how a pull-request review works, and the same batching
insight the whole mod rests on (D1). Today each comment costs a round trip or
gets hand-assembled into prose.

#### The reframe: files are more of the same review, not a parallel surface

**One review scope per turn.** A turn completes; the review window covers the
reply **and the files that turn touched**. Marks on both go into **one tray** and
compile into **one prompt**. Submit, the tray clears, the next turn brings a new
reply and new files.

```
turn completes → review the reply + the files it touched
  → marks accumulate in one tray
  → submit → tray clears
  → next turn: new reply, new files
```

**This dissolves the staleness problem rather than mitigating it.** During review
the agent is idle, waiting for input — so nothing can move under you. No
snapshotting, no re-reading, no stale line numbers. It is D24's guarantee
("only the last turn, only once it is complete") extended to the files, and the
same reasoning as D5: derive once from fixed input.

*Caveat:* the agent is idle, but the person is not — they can edit a file, or run
a `!` command, mid-review, and a background agent can too. Rare, and the person
did it, but line numbers can then shift; re-read on opening a file rather than
caching across the review.

The turn boundary is the same one the reply already uses: **the whole turn is the
reply** (§11 item 12, fixed in #25), so text and files written between tool calls
belong to the same review. The turn boundary covers diffs and created files
alike.

**Another approach, on #108:** a git snapshot per `turn.complete`, since the last
reply or the last review — its concerns and the first test are there. To consider
in detail later.

#### Shape: additive, never a restyle

**Nothing of Claude Code's is replaced.** The mod reads what the turn produced
and offers its own pane.

**The permission prompt is off-limits** — the docs are unambiguous that a mod
"can't change what a prompt shows you" (the same wall as E5). So the diff shown
*with* an approval request is untouchable. That is fine: this feature is not
about the approval moment. At a permission prompt you are deciding yes-or-no
under time pressure, not writing four comments. Review belongs *after* the change
lands.

#### Surface: the navigator lists files; ⏎ opens one

*Written for model A of the navigation model (#19)* — a navigator pane with ↑/↓
for rows and ←/→ for verbs.

The navigator (`synaptik-map`, SPEC §10) already lists the reply's blocks. Files
the turn touched are listed in it too, below the blocks. `⏎` on a file opens a
**file review pane**:

| | Navigator | File review pane |
|---|---|---|
| ↑ / ↓ | blocks, then files | lines |
| ← / → (or Tab) | the verb ring | the verb ring |
| ⏎ | open the selected file | apply the verb under the cursor |
| Esc | leave | back to the navigator |

**The mechanics already exist.** SPEC §10's scroll trick — a tree of
`bodyRows + 2` rows with its window pinned at offset 1, so ↑/↓ always have a row
to scroll to — is what separates ↑/↓ from ←/→ in a pane. A file pane gets its own
instance of it, with lines in place of blocks. The hidden verb ring works
unchanged.

**Staging a file** puts its comments in the tray like any block's.

#### Fetching the content

| | Fetch with | View |
|---|---|---|
| **Created** file | `$.fs.read(path)` — 4 MiB per file | whole content, line-numbered |
| **Updated** file | `$.process.run` → `git diff -- <path>` | diff, line-numbered |

Paths come from the `Edit`/`Write` tool calls in `$.session.messages()` (newest
4,096 entries) — so the mod knows which files the turn touched **even when the
reply never mentions them**.

**Verified (2026-10-17, types of 2.1.287):** each `messages()` row
carries `toolUses[]`, and every entry has `input` — "the arguments the model gave
it" — as well as `result` and `text`. So an `Edit` or `Write` call gives its
`file_path`, and an `Edit` call gives its own before/after (`old_string` /
`new_string`). A `/command` taking a path stays a possible simplest first
version.

#### Why this is easier than the main feature, not harder

**The pane is the mod's own surface.** Content is drawn from source text, so the
mod controls every character — **Q10 does not apply at all.** No reproducing
Claude Code's markdown rendering, nothing to match. By contrast SPEC §6 has to
redraw a reply that Claude Code already renders well.

**The pane shape is proven.** The built-in
[`diff` mod](https://github.com/anthropics/claude-code/tree/main/mods/diff) draws
a scrollable pane with buttons bound to keyboard actions and handles its own
scrolling. Public source, closest reference implementation.

#### Compile format

File comments join the reply's marks in the same prompt, grouped by file and
anchored by line:

```
✓ "Use Redis for the session cache"
✎ "Add a rate limiter" → make it 5 req/sec

in DbConnection.java
  line 5 — this should come from config, not a literal
  line 8 — close this in a finally block
in index.js
  line 42 — behind the feature flag please
```

Consistent with SPEC §9: no prose scaffolding, no explanation that a review
happened. The reply's marks keep document order; files follow, since they are a
different axis and interleaving them with prose blocks would read as noise.

#### Still open

- **Render cost for a large diff.** `Text` per line avoids the 10,000-character
  `Markdown` cap, but a 2,000-line file redrawing on each keypress may need
  windowing. `diff`'s source shows how it handles this.
- **Hunk-level verbs.** Accept/reject reads naturally on a hunk; comment and
  discuss read naturally on a line. Whether both granularities are needed, or
  lines suffice, is a feel question.
- **Which diff source.** `messages()` does give tool inputs, so the choice is
  real: the `Edit` call's own before/after says exactly what Claude changed;
  `git diff` on the working tree shows the file as it stands but cannot tell
  your edits from Claude's. Possibly both — Claude's change, with the file
  around it.
- **Many files in one turn.** A refactor touching twenty files makes the
  navigator long. Possibly a count with the files collapsed until opened.

#### Relationship to E8, P3 and issue #5

E8's `Edit`/`Write` entry is about **gating** a tool call before it runs. This is
reviewing **after** — a different moment, and it keeps P3 intact: the mod never
touches a tool call, it only reads what already happened.

**Field note #5** (code blocks need line-level granularity) wanted this same pane
for a fenced code block inside a reply. It was met another way: stepping into a
code block, line by line, in the reply itself (D43). Its windows are a starting
point for a file's lines.

**After phase 1**, so the tray, navigator and compile step exist to reuse rather
than guess at.

**Revisions**
- **2026-10-14, 2026-10-16** — reframed: files are more of the same review, in the
  same tray and prompt, not a separate feature with its own lifecycle. An earlier
  draft argued stability only for diffs (frozen), not for created files (live).
- **2026-10-17** — `messages()` rows carry each tool call's `input`, so the paths
  and the `Edit` before/after are available; no fallback needed.
- **2026-10-24** — the git-snapshot approach, on #108.
