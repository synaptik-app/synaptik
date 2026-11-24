# Threads

### D14 — Thread isolation via `$.model.fork`
**Status:** settled · added by 2026-10-14

**A thread is a `$.model.fork`,** a separate model call whose request and reply
never enter the main conversation's message list, so crosstalk is impossible by
construction. Nothing from a thread reaches the main conversation except its
summary, when included: compiled into the suggestion and sent by the person (P1,
D3).

**The fork carries the mod's own instructions** (`src/prompts.ts`): answer the
person's message about the block, briefly; any tool call is refused; then a
summary and an include/exclude verdict, in tags the pane strips before anything
is shown or sent. This is the mod instructing its own call, outside the main
conversation (P1).

**`fork` is single-shot.** For a multi-turn thread the mod re-sends the
accumulated side Q&A on each message and owns that history itself, in memory. It
reads the main conversation from the cache, so a thread costs about its own text
(D45). Where threads are drawn is D45.

**Revisions**
- **2026-11-04** — the fork also writes the summary and a verdict with each answer
  (D45).
- **2026-11-10** — states the fork's instructions; "a thread never calls
  `$.prompt.submit`" dropped, since the mod never submits.

---

### D45 — Threads in a pane of their own, one per block
**Status:** settled · added 2026-11-02

**A thread gets its own pane, one per block** (#106). It places D14's threads after
D41: a fullscreen review happens in the reply and the navigator is classic-only,
so the thread can't be the navigator's body. It doesn't go under its block in the
reply either: a conversation grows, would push the reply around, and the
transcript can't scroll to a block (#64). A pane gives typing its own field and
scroll, and sees Esc.

**The field is a fixed 6 rows.** Claude Code wraps and scrolls it, and `\` then ⏎
is a new line. Grown to fit its text, it would have to predict how Claude Code
wraps it beside its key hint, and a row counted short hides the text (#146).

**Include is a switch**: a button showing its state; no hotkey, since the field
holds the keyboard and ↓ reaches the button. **The thread's own fork adds a summary
and an `include`/`exclude` verdict after each answer**, in tags the pane strips:
one call, about a tenth more per message (#156). The verdict sets the switch until
the person touches it. Once they set it, no verdict is asked for: on, every
answer's summary is written as one the person chose to send (`INCLUDED_ANYWAY`);
off, only the answer is asked for, and switching on writes the summary then.
Closing (Esc) writes a summary only when an answer came without one. A verdict in
the same call, rather than a separate classifier call (`$.model.classify`).

**The summary is written for its use**, as the person's instruction to the agent,
in sections: `Actions:` (changes and work to carry out — both are what the agent
does next), `Decisions:`, `Open questions:`, and `Context:`: for a thread switched
on with nothing else to send, kept to a sentence or two, and first, in a line,
when the Actions rest on something the main conversation never saw (an agent's
finding, what the person told the agent). Not a recap: a thread
can't run commands and the main conversation has to (`src/prompts.ts`). It sticks
to the thread's discussion but may name other parts of the reply, since a row is
often weighed against its neighbours. **It hangs under the switch**, led by `⎿` as
a tool's result hangs from its call, **and only while the switch is on**: what is
shown is what goes. Its state is a note beside the switch. Editing it is the prompt
box's job, as for every other mark: an editor in the pane would need its height
from how the summary wraps, which can't be measured, and asking the thread to
change it does the same with nothing to build.

**The review lets go** when a thread takes the keyboard and when it closes:
`$.ui.focus` can't move the keyboard back to it, and a review left on named ↑/↓
on the band while they recalled prompt history.

**Rests on the spike on 2.1.309:** forks run in parallel, so threads need no
queue, and a thread costs about its own text (spec 08, Q6).

**Considered:** `q` or a close button to leave a thread (the field types `q`, and a
close from the plugin hands the keyboard to the prompt just the same, so Esc does
it all); a thread inline under its block (above); one pane switching between
threads (tabs come free when docked).

**Revisions**
- **2026-11-04** — the summary and the switch's default come with each answer
  (#156). Before, the summary was written on close, so it appeared only after the
  person had left, and every switch was set by hand.
- **2026-11-05** — the summary comes in sections: a label on every line
  (`Context:` three times over) read as noise.
- **2026-11-06** — the summary hangs under the switch, only while it is on; a
  `Summary:` heading repeated what the labels say.
- **2026-11-06** — the field is a fixed 6 rows, not grown with its text (#146).
- **2026-11-06** — once the person sets the switch, the prompt follows it: a later
  verdict could come back `exclude` with an empty summary under a switch that was
  on.
- **2026-11-07** — corrected: a click on a block doesn't restart the review.
- **2026-11-21** — with an agent (D51), the summary gains a `Subagent:` section
  (`Done:`, `Changed:`, `Still on:`), and every answer
  carries `<next>agent</next>` when its tasks need tools.
- **2026-11-22** — the answer says when its verdict changes the switch; the
  summary opens with `Context:` when its Actions rest on what the main
  conversation never saw; `<next>agent</next>` starts the agent, on the
  person's word (D51).
- **2026-11-24** — the sentence saying a verdict changed the switch is only in the
  answer to the person's message, never in the answer to an agent's report.

---

### D46 — A thread on a code line or table row
**Status:** settled · added 2026-11-05

Extends D43, D44 and D45. Stepped into a code block or table, `d` opens a thread
on that part, keyed as its mark is (`3.5`). It is the block's thread's sibling,
not part of it: a code block can hold a thread on line 4 and another on line 12,
each with its own summary and switch.

**The fork reads the whole block, and which part.** A line alone loses what it is
in, so the prompt quotes the block and names the part as the review would
(`line 4: "…"`). **The pane shows the part alone**, as Markdown that draws on its
own: a code line in its block's fences (keeping its colours), a row as a record
of its header's names and its cells (`Option: Redis`, one a line), drawn
whole rather than cut at three rows. A one-row table drawn as a grid is laid
out by the terminal's width, not the pane's, and wraps in a narrow pane; a
record reads the same at any width (#233).

**In the review** the summary nests under the line's reference, as a mark on the
line does, and its block is quoted first for context (`spec/06-sending.md` §9). Clearing follows
the marks: Backspace on the block takes out its own mark or included thread first,
then its lines' marks and included threads, so nothing cleared is still sent.

**Considered:** a range of lines (no way to select one yet); a thread on the
block with the line quoted in the first message (the person would type what
stepping in already said, and the margin couldn't show where it is).

**Revisions**
- **2026-11-05** — before, `d` on a line or row toasted "discuss works on whole
  blocks for now".
- **2026-11-23** — a row shows as a record, not a one-row table under its
  header (#233).

---

### D51 — A thread's tasks run in its agent
**Status:** settled · added 2026-11-21

Replaces E2 (#158). **A thread can hand its tasks to an agent of its own**, a
fork subagent with tools, when the thread's agent says they need them. The
thread then works like the main conversation with its subagents: the thread's
agent hears every report, steers the agent on the person's word, and its
summary is the one account that goes into the review. Discuss is not another
way to start agents: Claude Code has `/btw`, forks and its own agents for that.

**The thread's agent offers, the person asks.** While the thread has no
agent, an answer whose Actions or Open questions need tools (a search, a
command, an edit) ends with a one-line offer in its own words, fitted to the
work, with the include switch on or off: "I can start an agent to run those
two counts and report the real numbers." When the
person's message asks for one, in so many words or as a yes to the offer, the
answer says it is starting it and carries `<next>agent</next>`, and Synaptik
starts it at once: the person chose it when they sent the message, as with
`<to-agent>` (D30). Nothing runs, costs or asks for permission unless they
asked, and whether it should run is the thread's agent's call, made in its
answer: Synaptik starts it whatever the summary holds (P2). Its tasks are the
summary as it stands, or, with none (a thread switched off asks for the
answer alone, D45), the thread itself; no summary is written first. The
include switch turns on unless the person set it. The agent is not tied to the
switch after that.

**The pane has no button for it**, to start it or to open it: the thread is a
conversation, so the person asks there, and Claude Code's agent list already
holds the agent, with its state, and opens its view.

**The agent is a fork** (`$.agent.spawn({ subagentType: 'fork' })`): it has the
main conversation, plus the block, the thread's messages and its summary
whole, as its tasks. It runs under the session's permission mode. Its prompt
(`src/prompts.ts`) says what it is for, and who "the coordinator" is: Claude
Code frames Synaptik's messages to it as the coordinator's, and the agent
can't know that this is the thread.

**The loop:**

| Event | What happens |
|---|---|
| The person writes in the thread | The thread's agent answers. If the answer changes the agent's work (a new, changed or dropped task, a revert), it carries `<to-agent>…</to-agent>`, which Synaptik sends at once (`$.session.send`): the person chose to send when they pressed ⏎. Otherwise no tag, and the agent is left alone. |
| The agent reports | The thread's agent answers on its own, in the pane ("it finished X and changed these files; it waits for you to choose A or B"), and rewrites the summary. That answer never carries `<to-agent>`, so a report never starts another agent turn: only the person's next message can. |
| The person answers the agent in the thread | It reaches the agent through `<to-agent>`. |
| The person talks to the agent in its view | What they type joins the thread as theirs, to the agent (`› to agent: …`), taken in `session.append` from the agent's rows the person sent; what Synaptik sent comes stamped as the coordinator's, and the thread has it already. The agent's next report says what was settled (`Settled with you:`), and the thread carries on from both. |

**The thread's agent, and what it is sent, are outside the main flow**, as a
thread's fork is (P1): neither reaches the main conversation, and what the
agent did reaches it only in the thread's summary, which the person sends
(D30). So `<to-agent>` needs no press of its own, and it is no exception to
P1: the answer says what it asked the agent, a dim `▶ Sent to agent` line
under it shows that it went, and the words are in the agent's view.

Nothing is queued on Synaptik's side: Claude Code hands a message for a
running agent over at its next tool call, inside its turn, and a message for
a finished one resumes it. Every agent turn ends in its `turn.complete`, with
the whole answer, however it was woken: the automatic answer hangs off that.

**It always reports.** It writes to the person as in any chat, ending its
prose with any question, asked plainly. Then, last, one tag:

```
<report status="done | needs-you">
Done: what it did, and what it found
Ran: the commands that changed or checked something (tests, builds,
  migrations), and how each ended; not reads or searches
Changed: the files it changed, by any means
Not done: what is left, and why
Settled with you: what the person decided or told it directly, in their words
Questions: what it needs from the person (only with needs-you)
</report>
```

`status` is about its tasks: `done`, resolved; `needs-you`, it stopped with
something for the person (a question, a tool it couldn't run, a choice).
Whether it is running at all is Claude Code's (`$.agent.list()`). The files
come from the report: Synaptik reads nothing out of its transcript, and a file
written by a shell command has no `Edit` or `Write` call.

**In its view, the report is cut.** Its rows draw without the tag
(`AssistantMessage`, the text rewritten: the transcript, and `turn.complete`,
keep it whole), and a dim `⎿ reported to the thread · <state>` takes its
place. Only a `<report status="…">` tag opening a line, only in the view of
one of Synaptik's agents: a tag it asked its own agent for, not something read
out of the main conversation. A `<report` inside a line is text: a fork's view
shows the main conversation's reply too, and that may mention one. A closed tag is cut alone; an open one, still streaming, to the
end of the text.

**The summary is the one account.** Only the thread's summary goes into the
suggestion, written knowing the agent's reports. What the agent did is said
as the agent's, so the main Claude knows the files changed under it:

```
Context: …                     where the Actions come from, when the main conversation never saw it
Actions: …                     what is left for the main conversation
Decisions: …
Open questions: …
Subagent:
- Done: …                      what it carried out, checked or ran, so it isn't done again
- Changed: …                   the files
- Still on: …                  only while it runs
```

Without its `Context:` line, an Action that rests on the agent's finding, or
on what the person told the agent, reads as out of nowhere (D45).

`Subagent:` holds only the sub-points that have something. When the agent
starts, the summary is rewritten with the tasks moved to `Still on:`; each
report's answer moves them on. Each report is a thread entry, which the
thread's agent reads whole; the pane draws it as one dim line, how the run
ended and how long it took (`⏺ Agent finished · 15s`), since the thread's
answer under it already says what the agent did. None goes into the suggestion.

**In the UI it is "agent"**, as Claude Code says, and a stopped one is
"waiting for you". In the tag it stays `needs-you`, which is clearer for the
agent.

| Where | What it shows |
|---|---|
| The pane | no button: a line for each report, what was sent to the agent and what the person wrote to it, as the thread's entries |
| Claude Code's agent list | its row relabelled, `Synaptik · <block> · <state>` (`AgentRow`), and the way into its view. Claude Code decides when it hides; Synaptik reads `isHidden` and never sets it |
| The block's margin | `❝`, with an agent or without: the agent is the discussion's tool, not a mark of its own |
| The band | nothing of the agent |

**Its results stay out of the main conversation.** The first time it stops,
Claude Code tells the main conversation nothing. After a resume (a send, or
the person in its view), each stop adds a `<task-notification>` there, the
whole answer in `<result>`, and submits it as a prompt, which would start a
main turn. For Synaptik's own agents only, the notice is **reworded** (the
wrapper and task id kept, the text "A side task the person started from a
Synaptik thread", no result) and the prompt **dropped**: no turn, no transcript
row, one yellow "Prompt
dropped by a hook" line. This is the one exception to P1 and to D24's "no
interception of `prompt.submit`", and it holds only for these notices.

**State:** the agent ids are kept with the threads in `$.state`; after a
module reload, Synaptik claims the threads' agents again from them. An
agent's first `turn.start` comes before `spawn` returns its id, so when it
returns, `$.agent.list()` is checked: an agent already `completed` is read from
`$.session.messages({ agentId })` and handled as its `turn.complete`.

**Limits:** a thread is discarded with its reply (D24), so the person waits for
the agent before taking the review onward; one still running when a new reply
arrives keeps running, and its result joins no review (#194). Reviewing the
agent's own replies in its view is #219: a suggestion shows only in the main
view. Fullscreen only.

**Rests on the spike on 2.1.328** (#158); what it answered is in spec 08.

**Considered:**
- A press to send `<to-agent>`: friction, since the person just sent the
  message it answers. The answer says what it asked.
- Automatic rounds, the thread answering a report with `<to-agent>`: a loop
  with nobody watching. Left for later, once this has matured.
- The agent's report in the suggestion beside the summary, or in its place: two
  accounts of one thread, and the report is written for the thread.
- A list of Synaptik's agents, or the band naming one waiting for you: Claude
  Code's agent list already is the list, with its keys and opening, and the
  label says it.
- A fresh agent in place of the fork (#223): it hands every report back to the
  main conversation, where it starts a turn.

**Revisions**
- **2026-11-22** — no buttons: the answer offers the agent and starts it when
  the person asks; what the person types in the agent's view joins the thread;
  the report is cut only where its tag opens a line; the summary opens with
  `Context:` when its Actions rest on what the main conversation never saw;
  a report, and a message sent to the agent, each draw as one line in the
  pane.
- **2026-11-23** — the margin keeps `❝`: the agent's state glyphs read as a
  mark of their own. A report draws as `⏺ Agent finished · 15s`, or
  `○ Agent waiting for you`, with its run's time.
- **2026-11-24** — an agent that doesn't start, or a run that ends without a
  report, is a line in the thread, not a toast alone; a run that ended so
  leaves the agent `stopped` (#239).
- **2026-11-24** — no summary written before the start, and no start refused for
  an empty one: the agent works from the summary as it stands, or the thread.

---

## Extensions

### E1 — Branched sub-sessions (was D16, D17)
**Status:** dead · added by 2026-10-14

A full Claude Code session split off from a thread with Synaptik loaded, for
work that deserves a context of its own (#158).

**Why it died:** Claude Code's own `/branch` already gives a session of its
own, and a thread's tasks run in its agent, with tools, inside the session
(D51). Synaptik has nothing to add to either.

**Revisions**
- **2026-11-20** — a thread no longer leads here: its tasks run in a subagent
  inside the session.
- **2026-11-23** — dead: `/branch` covers it, and D51 the thread's tools.

---

### E2 — A thread's tasks run in a subagent (was: promote a thread to a branched session)
**Status:** superseded → D51 · added by 2026-10-14

**A thread could hand its tasks to a fork subagent with tools**, started by the
person when the thread's agent said they needed tools. The subagent reported at
the end of every reply, and its report went into the suggestion beside the
thread's summary, or in its place once it was done. Design and spikes: #158.

**Replaced by D51:** the thread's agent steers the agent and answers its
reports; `<to-agent>` goes out at once; only the thread's summary goes into
the suggestion, with what the agent did in sections of its own; one
`<report status>` tag, cut in the agent's view.

**Revisions**
- **2026-10-24** — the `branch` button, and both contexts carried (#106).
- **2026-11-15** — a fork subagent, not a session (#158): Claude Code keeps
  every session and a mod can't delete one.
- **2026-11-20** — the thread's tasks, not the thread: the thread's agent marks
  them, the person runs them; the report in the suggestion.
- **2026-11-21** — superseded by D51: the thread steers its agent.

---

### E3 — Worktree isolation (was D19)
**Status:** dead · added by 2026-10-14

Branched sessions (E1) in git worktrees of their own, so one editing files
wouldn't leave the main session's picture of them stale.

**Why it died:** with E1. A thread's agent works in the session's own
directory, and the files it changes reach the main conversation in the
thread's summary (D51).

**Revisions**
- **2026-11-23** — dead, with E1.

---

### E4 — Summary-based merge between sessions (was D18)
**Status:** dead · added by 2026-10-14

A branched session's result (E1) brought back into the parent's review as an
editable include/exclude row: a summary of its decisions, and a change
manifest read from `git diff --stat` and its transcript (#159).

**Why it died:** with E1. What a thread's agent did reaches the review in the
thread's summary, under `Subagent:` (D51).

**Revisions**
- **2026-10-24** — merge back as a commit, into the parent's tray.
- **2026-11-21** — under D51, the thread's summary carries what its agent did.
- **2026-11-23** — dead, with E1.

---

## Superseded

### D15 — Escalation ladder
**Status:** dead · added by 2026-10-14

```
accept/reject → comment → thread → delegate to main agent
```

Each rung is one keypress from the last. Start at the cheapest; promote when it
is not enough.

**A thread that needs tools does not abandon — it asks.** Its committed conclusion
can say "this needs running";
the main agent executes next turn and the result arrives in a response that can
itself be marked up.

**This closes the loop:** thread → conclusion with an action → main agent runs
it → new response → mark that up. The mod is iterative, not one-shot.

**Revisions**
- **by 2026-10-14** — the fourth rung was a branched session with tools, now a
  proposal; delegating to the main agent took its place.
- **2026-11-10** — dead: there is no ladder. Each action stands on its own (D1),
  and a comment doesn't turn into a thread. That a thread hands tool work to the
  main agent, through its summary, is D14 and D45.

---

### E6 — Auto-classify thread outcomes
**Status:** superseded → D45 · added by 2026-10-14

As it stood when D45 took it in: decide automatically whether a thread has
something worth sending, with `$.model.classify`. It would stage, never send,
and show the verdict in the thread pane as a state the person can flip, with
the summary it would send: a false negative silently drops a needed
conclusion, a false positive quietly adds noise.

**Done another way (2026-11-04, #156):** D45 has the thread's own fork give a
verdict with each answer, as the switch's default — no `$.model.classify`.

---

### D16–D19 — Branched sessions, depth, merge, worktrees
**Status:** superseded → E1–E4 · added by 2026-10-14

Dropping sub-sessions removes the entire distributed half of the design:
cross-session messaging, lineage tracking, merge semantics and worktree
isolation. MVP is **one session, one process**. Threads are flat — a thread
cannot spawn a thread, and if one surfaces a new question it stays in that
thread.

**Note:** D15's loop *narrows* the case for E1 rather than merely postponing it.
Tool access was the main argument for branching, and the delegate loop now
covers it. What remains is **context isolation** — keeping an hour of
exploratory work out of the main context. Real, but a smaller argument. Re-test
after living with the loop. (E1 found it stronger, 2026-10-24.)

