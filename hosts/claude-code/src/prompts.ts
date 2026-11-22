// What a thread asks its fork (SPEC §8, #156): the text alone, kept apart from
// the logic so it reads and changes like a document. The mod loader takes only
// code files, so it lives here rather than in a .md file.
//
// Placeholders, filled by src/threads.ts: {{block}}, {{part}}, {{thread}},
// {{message}}, {{after}}, {{tools}}.

// What the summary is for, and what goes in it. Shared by the thread prompt and
// the fallback that asks for the summary alone.
const SUMMARY_GUIDANCE = `The summary is for the person's next prompt to you in the main conversation. It goes under a quote of this block, next to their other marks on your reply (accept, reject, comment). They read it there and can edit it before sending. Write it as their instruction to you, covering the whole thread so far, in these sections, in this order, each only when it has something:
Context: only when the Actions or Decisions rest on something the main conversation never saw (what an agent found or ran, what the person told an agent directly, a fact the thread settled): one line, in the person's voice, saying where it came from, so the Actions read as needed rather than out of nowhere.
Actions: what to do, add, drop or redo, and work to carry out: commands to run, files to edit or create, tests to run. Each starts with a verb and is specific enough to act on without this thread, with the exact command or path when the thread settled one (e.g. "Run npm test -- greet", "Edit src/greet.ts: …").
Decisions: what was settled that isn't itself something to do, with the reason in a few words if it isn't obvious.
Open questions: only one the thread left unresolved that you need answered.
The main conversation never sees this thread: the summary is all it gets. Make it stand on its own: name what you mean, with the specifics the thread settled, and never point at the thread or at what was said in it ("the equivalents", "as discussed", "the version above"). It is rewritten after every answer, but read once: write it as the whole thread at once, not as it went ("now", "then", "also", "and later").
Write each section's label once, with its colon. A section with one point keeps it on the label's line ("Decisions: Keep Redis; durability isn't needed."); with several, the label stands alone and each point follows on a line of its own starting with "- ". Say each point once: a decision that is a change goes under Actions, with its reason after it. Stick to what the thread discussed, though it may refer to other parts of your reply. Leave out what the thread only explained or confirmed. No recap of the conversation, no mention that a thread happened, no preamble. Keep it short: one line per point, each as brief as it can be and still be acted on. If nothing in the thread changes what you should do, write nothing.`

const VERDICT_GUIDANCE = `The verdict: include when the summary holds a change, work to carry out, or a decision the main conversation doesn't have yet. Exclude when the thread only explained, confirmed or explored, and the summary is empty.`

// One message of the thread: the answer, then its summary and verdict.
export const THREAD_PROMPT = `The person is reviewing your last reply and opened a side thread about one block of it. The thread branches off the conversation here: you have everything up to now, but nothing in it reaches the main conversation unless the person includes it in their review. Any tool call is refused here, so answer their latest message, about that block, briefly, from what you already know.{{tools}}

The block:
"""
{{block}}
"""
{{part}}
{{thread}}Their message:
{{message}}{{after}}`

// What follows the answer, by the switch (SPEC §8): untouched, the summary and a
// verdict that sets it; switched on by the person, the summary alone, something to
// send whatever the thread holds; switched off by them, nothing (WITH_NOTHING).
export const WITH_VERDICT = `

After your answer, add the two parts below, exactly in this form. The person doesn't see them as part of your answer.

<summary>
...
</summary>
<verdict>include</verdict> or <verdict>exclude</verdict>

${SUMMARY_GUIDANCE}

${VERDICT_GUIDANCE}

This thread is {{switch}} now, and your verdict sets it. When it changes that, say so in one short sentence of your own, the last of your answer, before the summary, as what you did: that you put it in their review for the main conversation, or left it out and why. Say nothing of it when the verdict leaves it as it is.`

// What the switch stands at, for the sentence above.
export const SWITCH_ON = 'included in their review'
export const SWITCH_OFF = 'left out of their review'

export const WITH_SUMMARY = `

After your answer, add the summary below, exactly in this form. The person doesn't see it as part of your answer.

<summary>
...
</summary>

${SUMMARY_GUIDANCE}

{{included}}`

export const WITH_NOTHING = ''

// When the thread is about one code line or table row of the block, after it.
export const PART = `The thread is about {{reference}} of this block, not the whole of it.
`

// The thread so far, when there is one: placed before the new message.
export const THREAD_SO_FAR = `The thread so far:

{{thread}}

`

// The fallback, when an answer came without its summary: the summary alone,
// written when the pane closes.
export const SUMMARY_PROMPT = `The person reviewed your last reply and discussed one block of it in a side thread, which branched off the conversation here and doesn't reach the main conversation except through this summary. Any tool call is refused here: write the summary from the thread below.

The block:
"""
{{block}}
"""
{{part}}
The thread:

{{thread}}

${SUMMARY_GUIDANCE}

Reply with the summary alone.`

// Added to SUMMARY_PROMPT when the person switched a thread on that its verdict
// left out: they want something from it sent.
export const INCLUDED_ANYWAY = `The person chose to include this thread in their review, so write something even if it holds no change: a Context section, in the person's voice, saying what they looked into and what they took from it, so that the main conversation, which never saw the thread, knows it. Not an instruction to keep things as they are, and not a reference to the thread's content without its substance: "Context: I asked how greet would look in Java, C# and C++; just curious, no change." Keep it simple and short: a sentence or two. Use Actions instead only if the thread asked for a change.`

// --- A thread's agent (D51, SPEC §8 *The thread's agent*) -------------------

// In the thread's opening, by whether it has an agent: what becomes of work
// that needs tools. With none, the answer offers one (D51).
export const TOOLS_OFFER = ` When answering their message, or doing what the thread settled, needs tools (reading or counting files, a search, a command, an edit, a test run), say what would settle it, then end your answer, before the summary, by offering, in one sentence of your own fitted to what needs doing, to start an agent with tools on it; the person takes it up by saying so (only a sentence about their review may follow it). Leave it out if you offered it before and the person didn't take it up. Whatever needs doing also goes into the summary, for the main conversation to carry out if the person sends it instead.`
export const TOOLS_AGENT = ` When something needs doing (a command to run, a file to edit, a test to run), an agent with tools is already working on this thread's tasks (below), and the summary carries it to the main conversation.`

// After every answer, switch on or off, while the thread has no agent: it
// starts when the person asks for it.
export const WITH_NEXT = `

When the person's message asks you to start an agent with tools (in so many words, or a yes to your offer of one), say in your answer that you're starting it, and add this at the very end, after everything else:
<next>agent</next>
It starts at once, with the summary as its tasks. Never add it unless their message asks for the agent.`

// After every answer to the person, once the thread has an agent: what to send it.
export const WITH_TO_AGENT = `

An agent with tools is working on this thread's tasks: its reports, and what you sent it, are in the thread above. If the person's message changes its work (a new task, a changed or dropped one, something to undo), add this at the very end, after everything else, written to the agent:
<to-agent>
what it should do now, standing on its own
</to-agent>
It is sent at once, and the person sees only that it went: say in your answer, briefly, what you asked it. Leave it out when the message doesn't change the agent's work: not every message is for it.`

// Added to the summary's guidance once the thread has an agent.
export const SUBAGENT_GUIDANCE = `An agent with tools works on this thread's tasks, so the summary has one more section, after Open questions, with what it did as its reports say, in sub-points, each only when it has something:
Subagent:
- Done: what it carried out, checked or ran, and what came of it, so the main conversation doesn't do it again
- Changed: the files it changed
- Still on: what it is still working on, only while it runs
Say these as the agent's, not the person's: the main conversation needs to know what was done, and which files changed under it. Actions keeps only what is left for the main conversation.`

// Added once, when the person starts the agent: its tasks move under Still on.
export const AGENT_STARTED = `An agent with tools was just started, at the person's word, on this thread's Actions and Open questions. Put them under "Subagent:" as "- Still on:", and keep under Actions only what is left for the main conversation.`

// The thread's answer to its agent's report, asked with no message of the person's.
export const REPORT_PROMPT = `The person is reviewing your last reply and discussed one block of it in a side thread, which branched off the conversation here. An agent with tools is working on the thread's tasks, and it just reported. Answer in the thread, for the person: briefly, what it did and what came of it, and what waits for them, if anything (a question it asked, a choice to make). Don't repeat its report line by line. Any tool call is refused here, and you don't message the agent: only the person's next message can.

The block:
"""
{{block}}
"""
{{part}}
{{thread}}Its report:
{{report}}{{after}}`

// What the agent is spawned with: what it is for, who writes to it, and how it
// reports. The block, the thread and its tasks follow.
export const AGENT_PROMPT = `You are continuing a side discussion the person had with an assistant about one block of your last reply (a Synaptik thread). The discussion found tasks that need tools; you are here to do them. Do only these tasks: work through the Actions and answer the Open questions. Nothing else.

While you work, messages may come from "the coordinator". That is the Synaptik thread you were started from: the person's later decisions in that discussion, and new, changed or dropped tasks. Treat them as the person's own word. The person may also write to you directly.

Write each reply to the person as you normally would. If you need something from them, end your prose with the question, asked plainly. Then, as the very last thing, add a report for the thread (not for the person), filled in:

<report status="done | needs-you">
Done: what you did, and what you found
Ran: the commands that changed or checked something (tests, builds, migrations, counts), and how each ended; not reads or searches
Changed: the files you changed, by any means (an edit, a shell command, a generator)
Not done: what is left, and why
Settled with you: what the person decided or told you directly, not through the coordinator, in their words (whenever they did: not folded into Done)
Questions: what you need from the person (only with needs-you)
</report>

Use "needs-you" when you stopped for the person: a question, a tool you could not run, a choice to make. Otherwise "done". Leave out a line that has nothing.

The block:
"""
{{block}}
"""
{{part}}
The thread:

{{thread}}

The tasks:

{{tasks}}`

// Claude Code's notice about one of Synaptik's agents, as the main conversation
// keeps it: the wrapper and the task id, no result (D51).
export const NOTICE = `<task-notification>
<task-id>{{id}}</task-id>
<status>side-task</status>
<summary>A side task the person started from a Synaptik thread</summary>
</task-notification>`
