## Agents test

A thread's agent (D51): the thread decides its tasks need an agent with tools, it starts at once in auto mode or after you press start, the thread steers it, and its reports come back to the thread. Fullscreen (`/tui fullscreen`), at least 144 columns. The agent only counts lines; it changes nothing. Before clicking a block after a thread, click **the hint**: the band's "click here to review the reply".

The fixtures folder holds 14 test files, and `fixtures/code.md` is the longest at 120 lines.

Each fixture ends with its steps, and every step has a **Do:** line and at least one **Expect:** line.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

**Starting it**

In the default mode (the footer shows no mode; Shift+Tab until it doesn't), then send any prompt in the main chat, so Synaptik reads the mode.

1. **Do:** click the hint, click the fixtures paragraph, press `d`, send `are those numbers right?`
   - **Expect:** the answer says it can't check from the thread, and ends with a sentence of its own about an agent doing the counting
   - **Expect:** above the field, `▶ Start an agent on these tasks?` with `[ start ]` and `[ not now ]`; no agent in Claude Code's agent list yet
   - **Expect:** if the switch turned on, the answer says so in one sentence of its own (that it put this in your review)
   - **Expect:** no tag (`<next>`, `<summary>`) shows in the answer
2. **Do:** press `start` (a click, or `↑` from the field and `⏎`)
   - **Expect:** the question goes, the agent starts, and the switch is on
   - **Expect:** the summary under the switch has a `Subagent:` section with `- Still on:`
   - **Expect:** Claude Code's agent list under the prompt shows `Synaptik · "The fixtures folder…" · working`
   - **Expect:** while it works, the pane shows a dim line with a turning spinner, what the agent is doing (or `agent working`), its time and its tokens; the line goes when it reports
3. **Do:** press `Esc`, and look at the paragraph's margin
   - **Expect:** ❝, as for any thread in the review
4. **Do:** wait for the agent to finish, then click the hint, click the paragraph, press `d`
   - **Expect:** the pane shows one dim `⏺ Agent finished · <time>` line, not the agent's reply or its report
   - **Expect:** under it, the thread's own answer about it, written without your asking
   - **Expect:** the agent list says `· done`, and the summary's `Subagent:` has `- Done:` and no `- Still on:`
   - **Expect:** the main conversation has no new turn and no new line

**Steering it**

5. **Do:** send `also count the lines of fixtures/tables.md`
   - **Expect:** the answer says what it asked the agent, then one dim `▶ Sent to agent` line under it, and the agent list back at `· working`
   - **Expect:** after its report, one yellow `Prompt dropped by a hook: Synaptik agent notice` line in the main conversation, and no turn there
6. **Do:** send `what does a line count include?`
   - **Expect:** an answer, and nothing sent to the agent: no `▶ Sent to agent`, the agent list stays `· done`

**Its view**

7. **Do:** close the pane, select the agent's row in Claude Code's agent list under the prompt, press `⏎`
   - **Expect:** the agent's transcript is on screen, and the band steps aside
   - **Expect:** its replies show no report tag; each ends with a dim `⎿ reported to the thread · done`
   - **Expect:** the main conversation's reply it starts from (this test) draws whole, with no `⎿ reported to the thread` inside it
8. **Do:** type `count fixtures/smoke.md too, but ask me first whether blank lines count`, `⏎`
   - **Expect:** its reply ends its prose with the question, asked plainly, then `⎿ reported to the thread · waiting for you`
9. **Do:** answer `leave blank lines out`, `⏎`, then go back to the main conversation and open the thread
   - **Expect:** while it waited, the agent list said `· waiting for you`, and the pane `○ Agent waiting for you`
   - **Expect:** the thread shows `› to agent: count fixtures/smoke.md too…` and `› to agent: leave blank lines out`, each before the report that followed it
   - **Expect:** the summary says blank lines are left out, and asks no question about them

**Sending**

10. **Do:** close the pane, press `q`, look at the suggestion
    - **Expect:** under the paragraph's quote, `❝` and the thread's summary with its `Subagent:` section; no report, no report tag
    - **Expect:** the summary opens with a `Context:` line saying where its Actions come from (what the agent found)

**When it fails** (loaded with the fault mod: `--plugin-dir ./fault-mod`, see the test bench's CLAUDE.md; skip these steps without it)

11. **Do:** run `/fault refuse`, open a new thread on the code block, ask `can you run it?`, then press `start`
    - **Expect:** a yellow `✗ Agent not started · refused by the test bench fault mod` line in the thread
    - **Expect:** no agent in Claude Code's agent list, and the include switch as it was
12. **Do:** send `why didn't it start?`
    - **Expect:** the answer knows the agent didn't start, and doesn't talk as if it ran
13. **Do:** run `/fault fail`, then in the same thread send `try again, start it`, and press `start`
    - **Expect:** after a moment, `✗ Agent failed · an API error ended its run`, and no answer to a report under it
    - **Expect:** the agent list says `· stopped`
14. **Do:** run `/fault off`, open a thread, start an agent on a slow task, and stop it from Claude Code's agent list
    - **Expect:** `◼ Agent stopped`, and the agent list `· stopped`

**By the permission mode** (#225)

15. **Do:** with `/fault off`, open a new thread on the code block, ask `can you run it?`, press `not now`
    - **Expect:** the question goes, a dim `◼ Agent not started · tell the thread what to do next`, no agent; nothing else happens
16. **Do:** Shift+Tab to auto mode, send any prompt in the main chat, then open a thread on the table and ask `how many rows does fixtures/tables.md have?`
    - **Expect:** no question: the answer says it is starting an agent, and it starts at once
17. **Do:** still in auto mode, open a thread on another block, Shift+Tab away from auto and back without sending a prompt, and ask something that needs tools
    - **Expect:** the question shows: after a Shift+Tab the mode is unknown until your next prompt, and an unknown mode asks
18. **Do:** Shift+Tab to plan mode, send any prompt, open a thread and ask something that needs tools, press `start`
    - **Expect:** the question shows (plan mode asks), and the agent reads and counts but changes nothing

When you're done: close any thread pane, click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
