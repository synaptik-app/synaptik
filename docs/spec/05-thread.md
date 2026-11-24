# Threads

## 8. Threads

A thread is a side conversation about one block, or about one code line or table
row in it. **It never touches the main conversation.**

- Each message calls `$.model.fork`. `fork` is single-shot, so the mod re-sends
  the block and the thread so far on every call.
- Nothing from a thread reaches the main conversation except its summary, when
  included: compiled into the suggestion and sent by the person (D3, D14).
- Threads are flat. A thread cannot spawn a thread.
- `d` or `❝ discuss` on a block opens its thread; on a threaded block it reopens
  that thread with its history. A block's thread shows `❝` in the margin, with an
  agent or without: the agent is the discussion's tool, not a mark of its own.
- **Stepped into a code block or table** (`s`, `03-navigation.md`), `d` opens a thread on the
  selected line or row, its own and apart from the block's. The pane shows the
  part alone: a code line in its block's fences, a row as a record, each header
  with its cell on a line of its own (`Option: Redis`, `Latency: low`); an
  empty header, or a cell past the last, is `Column N`; an empty cell is left
  out; a row with nothing in it shows `(empty row)`.
  The fork gets the whole block and which part (`The thread is about line 2:
  "…" of this block`). The line's margin shows `❝`, the block's `✸`.

### The pane

One pane per thread (`$.ui.open`, id `synaptik-thread-<block>`, or
`synaptik-thread-<block>_<line>` for a part: an id takes no dot), opened with the
keyboard in its field and closed by Esc. Docked beside the transcript, several
threads are tabs; inline above the prompt (narrow terminals), one shows at a time.

```
┌ ❝ "Use Redis for the session cache" ─────────────┐
│                                                   │
│   Use Redis for the session cache, keyed by…      │  the block as the reply draws it, dim, 3 rows at most
│                                                   │
│ ───────────────────────────────────────────────── │  a rule under it, once a message is sent
│                                                   │
│ › why not memcached?                              │  the person's messages at the edge
│                                                   │
│   Memcached has no persistence, so…               │  answers and the summary inset 2 columns
│                                                   │
│ ───────────────────────────────────────────────── │
│ ❯ ask about this block   ⏎ send · \⏎ new line     │  the field: 6 rows, whatever it holds
│ ───────────────────────────────────────────────── │
│ [ ✓ include in review ]                           │  Esc closes the pane, as any pane
│   ⎿  Actions: Add a 5-minute TTL to each entry.   │  the summary under the switch, dim
└───────────────────────────────────────────────────┘
```

**The field is 6 rows**, empty or not; a longer text scrolls within it. `\` then ⏎
(or Shift+⏎ where the terminal tells it apart) is a new line, as in the prompt box.
A field that grew with its text had to predict how Claude Code wraps it beside its
key hint; counted a row short, the text hid, and some wraps hid it whatever the
count (2026-11-06). A fixed height leaves wrapping and scrolling to Claude Code.

**Tables are laid out for the pane.** `Markdown` lays a table out by the
terminal's width, not the pane's: in a pane narrower than the terminal, a grid
drawn whole for the terminal wraps. So in the block shown and in the answers, a
table whose grid, every column at its natural width, doesn't fit the pane's
width (less its inset) is drawn as records: each row's cells as `Header:
value`, a line each, a blank line between rows. A table that fits is drawn as a
grid, by Claude Code. Inside a code fence, a table is code and stays as written.
Display only: the fork, the summary and the review get the table as written.

**While it waits**, the pane shows a dim line under the thread, inset as the
answers are, its spinner turning (Claude Code's frames) and its time counting:

```
⠋ Thinking… · 4s                                       an answer on its way
⠹ Counting the fixture files · 1m 12s · 3.4k tokens    the thread's agent at work
```

A thread's answer is one fork, which resolves once: it shows no text or
thinking along the way, and can't be stopped, so its line is the spinner and the
time. An agent at work says what it is doing, read about once a second: its
latest progress summary's first line (`label` in `$.agent.list()`, as Claude
Code's agent list has it); before Claude Code has written one, which a short
task never gets, its latest tool call, from the newest rows of its transcript
(the call's own description, else the tool and its command or path: `Bash: wc
-l fixtures/*.md`); else `agent working`. One timer,
every 200 ms, redraws while any thread waits or has an agent working, and stops
when none does: an answer still pending after 10 minutes, or an agent Claude
Code no longer lists as running, no longer keeps it going. An agent's time
counts from its current run's start, its spawn or its resume.

**The summary hangs under the switch** (`⎿`), while it is on, with no heading:
its sections' labels say what each line is, and the field keeps it apart from the
answers. Its state, when it has one, is a dim note beside the switch: `writing…`,
`updated with the answer`, `rewritten when you close this`, `nothing to send from
this thread`.

**The include switch** is a button: a click, or ↓ to it and ⏎. It shows
`✓ include in review` when on. No hotkey. ↑/↓ move between the field and the
switch however long the thread; the wheel and the page keys scroll it. The pane
follows the thread: after each change it scrolls to its end, once redrawn.

**A fork with no answer** says why in the pane: a resumed session has nothing to
fork until a turn finishes in it. An answer or summary that arrives after a new
reply is dropped, with the thread it belonged to.

**Threads run at once.** Forks run in parallel, each thread with one message in
flight at a time; the field says it is waiting.

**The review lets go** when a thread takes the keyboard and when it closes: Claude
Code hands the keyboard to the prompt then, and Synaptik can't give it back (#146).
A click on a block doesn't bring it back: outside a review the reply's blocks take
no click. `ctrl+x tab` or a click on the band's hint starts it again.

**Narrow terminals:** below 144 columns a pane is placed only when the person
opened it. `d` from the band (`ctrl+x tab`) counts; a click or key in the reply
doesn't, and a toast says to use the band (#146).

### Include / exclude

**Each answer brings the thread's summary and a verdict** (#156). The thread's
fork is asked to answer, then to add, in tags the pane strips, a summary of the
whole thread so far and `include` or `exclude`. No second call: it costs the
summary's few output tokens and a second or two on the answer. The prompts are in
`src/prompts.ts`.

**The summary is written for its use**: the person's next prompt to the agent,
under the block's quote. It comes in sections, each label once and only when it
has something: `Context:` first, in a line, only when the Actions or Decisions
rest on something the main conversation never saw (an agent's finding, what the
person told the agent: "Context: The agent counted the fixtures: `code.md` is 99
lines, not 120."), `Actions:` (changes to make and work to carry out: commands to run,
files to edit, tests to run; a thread can't run them, so they go to the main
conversation), `Decisions:`, and `Open questions:` only if one is left; with an
agent, `Subagent:` after them (below). A section
with one point keeps it on the label's line; with several, each follows as a
`- ` line. It sticks to what the thread discussed, and may refer to other parts of
the reply. Not what was only explained; no recap, no mention of a thread. A thread
that only explained has an empty summary and `exclude`; switched on anyway, it
gets a `Context:` section of a sentence or two.

**The verdict is the switch's default**, until the person sets the switch; it never
overrides them. When a verdict changes the switch, the answer to the person's
message says so in one sentence of its own, as the thread's agent's doing: "I
put this in your review so the main conversation runs the check." Never when
it stays as it was, and never in the answer to an agent's report, which the
person didn't ask for. Once they set it, no verdict is asked for, since none would change
it. Switched on by them, each answer brings a summary that always sends something
(a `Context:` section when nothing is to be done), and switching on writes one at
once if the last answers came without. Switched off by them, a message asks for the
answer alone. Included, the summary goes into the compiled prompt in document
order under its block's quote (§9). The pane shows the summary only while the
switch is on: what it shows is what goes. Switching on a thread the verdict left
out shows its summary, or writes one. The mod never decides what matters:
the model writes the summary and suggests the verdict, the person sees both. To
change the summary they ask in the thread ("drop the second point"), and the next
answer rewrites it; or they edit it in the prompt box like anything else before
sending. There is no editor in the pane.

**If an answer comes without its tags**, the summary is written when the pane
closes, with one more fork, as before; the band says `❝ summarising…` meanwhile.

`/synaptik off` closes the open threads and proposes nothing; the threads are kept,
and `d` opens them again once Synaptik is on.

Threads are kept with the tray, in `$.state`, and go with it: a new reply discards
them and closes their panes. Fullscreen only; classic's `d` still says phase 2.

`$.model.fork({ prompt })` asks one tool-less question over the session's own
transcript as the main thread last sent it: same model, same system prompt, served
from the prompt cache. Measured on 2.1.309: 16 uncached input tokens, ~51,000 read
from the cache, 2 s. It resolves `isAnswered: false` with a `reason` rather than
rejecting (`nothing-to-fork` before a session's first turn completes, and after a
resume until one does).

### The thread's agent

A thread can hand its tasks to an agent of its own, a fork subagent with tools
(D51). The thread's agent says when, the person starts it, and the thread then
steers it.

**When.** While the thread has no agent, an answer whose Actions or Open
questions need tools (a search, a command, an edit) ends with a one-line offer
in its own words, the switch on or off:

```
› are those numbers right?
  The 14 is right; I can't measure code.md from here. I can start an agent
  to run those counts and report the real numbers.
› yes, start it
  Starting an agent on the count.
```

**When the person asks for one**, in so many words or as a yes to the offer,
the answer says it is starting it and carries `<next>agent</next>`, stripped
with the summary's tags. Synaptik then starts it at once, whatever the summary
holds: the thread's agent decided. It turns the switch on unless the person set
it, rewrites the summary with the tasks under `Subagent:` `Still on:`, and spawns
the agent (`$.agent.spawn({ prompt, description, subagentType: 'fork' })`, its
`description` `Synaptik · <block>`). The pane has no button for it, to start
it or to open it. Its prompt (`src/prompts.ts`) holds the
block, the thread's messages and its summary whole as its tasks (with none,
which a switched-off thread has: `No summary was written for this thread. Carry
out what the thread above settled needs doing, and answer what it left open.`),
says who "the
coordinator" is (the thread, passing on what the person decided), and asks it
to write to the person as usual, any question last in its prose, then report:

```
<report status="done | needs-you">
Done: what it did, and what it found
Ran: the commands that changed or checked something, and how each ended
Changed: the files it changed, by any means
Not done: what is left, and why
Settled with you: what the person decided or told it directly, in their words
Questions: what it needs from the person (only with needs-you)
</report>
```

**Claude Code's agent list** shows it as `Synaptik · <block> · working` (or
`waiting for you`, `done`), relabelled in `AgentRow`, and opens its view; when
its row hides is Claude Code's. The block's margin keeps `❝`, and the band
shows nothing of it.

**The person writes in the thread.** The thread's agent answers as before. When
the answer changes the agent's work (a new, changed or dropped task, a revert),
it says briefly what it asks the agent and adds `<to-agent>…</to-agent>`,
stripped from the answer and drawn as one dim line, `▶ Sent to agent`, and
Synaptik sends it at once
(`$.session.send({ to: { agentId }, text })`). Claude Code hands it to a running
agent at its next tool call, and resumes a finished one.

**The agent reports.** Each of its turns ends in its `turn.complete`
(`agentId`). Synaptik adds the answer to the thread whole, drawn as one dim line
saying how the run ended, and how long it took (`turn.complete`'s
`durationMs`; none for a run caught up from the transcript): `⏺ Agent
finished · 15s`, an open `○ Agent waiting for you · 42s`, or `⏺ Agent reported` when
the report's status can't be read. Then it
asks the thread's fork for an answer of its own: what the agent did, what waits
for the person, and the summary rewritten. That answer carries no
`<to-agent>`, so a report never wakes the agent; the person's next message can.

**The person writes to the agent in its view.** What they type joins the
thread as theirs, `› to agent: …`, before the report that follows it, and the
thread's agent reads it there. It is taken from the agent's rows in
`session.append`: those the person sent ⚠️ (`origin.kind` `composer`, or
`bridge`, assumed from the types: the stored rows say `human`), the words taken
out of Claude Code's wrapping when they were typed while it ran. What Synaptik
sent comes stamped as the coordinator's and is the thread's already.

**The summary** gains one section, after `Open questions:`, with a sub-point
for each that has something:

```
Subagent:
- Done: what it carried out, checked or ran, and what came of it
- Changed: the files
- Still on: what it is working on, only while it runs
```

Only the summary goes into the suggestion, never a report.

**In the agent's view**, its replies draw without the report: the
`AssistantMessage` text is rewritten from a line opening `<report status="` to
`</report>` (to the end of the text while it streams), and a dim line follows:

```
Should the index be ordered by title or by topic?
  ⎿ reported to the thread · waiting for you
```

A `<report` inside a line is text: a fork's view shows the main conversation's
reply too, and that may mention one.

The transcript and `turn.complete` keep the whole answer.

**Its notices stay out of the main conversation.** After a resume, each stop
adds a `<task-notification>` there with the whole answer and submits it. For
Synaptik's own agents, `session.append` rewords it (wrapper and `<task-id>`
kept: "A side task the person started from a Synaptik thread", no result) and
`prompt.submit` drops it: no turn, no transcript row, one yellow `Prompt dropped by a hook:
Synaptik agent notice` line.

**When it doesn't start, or a run ends without a report**, the thread says so
in a dim line of its own, in its history, and a toast too while its pane is
closed (#239):

| What happened | The line |
|---|---|
| the spawn refused | `✗ Agent not started · <why>`, a known reason in plain words: `Claude Code won't start an agent until you send something in the main chat` (#237); any other as given |
| the spawn failed, or gave no id | `✗ Agent not started · <the error>`, `· Claude Code didn't report it` |
| a run interrupted (`turn.complete` `aborted`) | `◼ Agent stopped` |
| a run refused or cut by an API error | `✗ Agent failed · <the model's explanation>`, `· an API error ended its run` |

A failure's line is in Claude Code's warning colour, yellow, as its own warnings
are; `◼ Agent stopped`, which the person did, is dim. The thread's fork reads the line as
Synaptik's, so its next answer doesn't assume the agent ran. A run that ended
without a report gets no answer of its own, and the agent's state is `stopped`
(Claude Code's agent list: `· stopped`). An agent that didn't start leaves the
include switch as it was. `/synaptik log` keeps the raw reason.

**Its ids are kept with the thread**, in `$.state`. When `spawn` returns,
`$.agent.list()` is checked: an agent already `completed` is read from
`$.session.messages({ agentId })` as its `turn.complete`. After a module reload,
the threads' agents are claimed again from them. A new reply discards the
thread, and an agent still running joins no review (#194). Fullscreen only.
