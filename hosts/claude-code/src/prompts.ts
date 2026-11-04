// What a thread asks its fork (SPEC §8, #156): the text alone, kept apart from
// the logic so it reads and changes like a document. The mod loader takes only
// code files, so it lives here rather than in a .md file.
//
// Placeholders, filled by src/threads.ts: {{block}}, {{thread}}, {{message}}.

// What the summary is for, and what goes in it. Shared by the thread prompt and
// the fallback that asks for the summary alone.
const SUMMARY_GUIDANCE = `The summary is for the person's next prompt to you in the main conversation. It goes under a quote of this block, next to their other marks on your reply (accept, reject, comment). They read it there and can edit it before sending. Write it as their instruction to you, covering the whole thread so far:
- Changes to make: what to do, add, drop or redo, one per line, each starting with a verb, specific enough to act on without this thread.
- Work to carry out: commands to run, files to edit or create, tests to run, each with the exact command or path when the thread settled one (e.g. "Run npm test -- greet", "Edit src/greet.ts: …").
- Decisions taken: start the line with "Decision:", then what was settled, and the reason in a few words if it isn't obvious.
- Open questions: start the line with "Open question:", then only one the thread left unresolved that you need answered.
Say each point once: a decision that is a change goes in once, as the change, with its reason after it; "Decision:" is for what was settled that isn't itself something to do. Changes and work start with their verb, no label before it. Leave out what the thread only explained or confirmed. No recap of the conversation, no mention that a thread happened, no preamble, no Markdown. At most 6 short lines. If nothing in the thread changes what you should do, write nothing.`

const VERDICT_GUIDANCE = `The verdict: include when the summary holds a change, work to carry out, or a decision the main conversation doesn't have yet. Exclude when the thread only explained, confirmed or explored, and the summary is empty.`

// One message of the thread: the answer, then its summary and verdict.
export const THREAD_PROMPT = `The person is reviewing your last reply and opened a side thread about one block of it. This thread is private: nothing here reaches the main conversation unless the person includes it in their review. Answer their latest message, about that block, briefly. Do not act on it: you can't run commands or change files here. When something needs doing (a command to run, a file to edit, a test to run), say so, and it will go into the summary for the main conversation to carry out.

The block:
"""
{{block}}
"""

{{thread}}Their message:
{{message}}

After your answer, add the two parts below, exactly in this form. The person doesn't see them as part of your answer.

<summary>
...
</summary>
<verdict>include</verdict> or <verdict>exclude</verdict>

${SUMMARY_GUIDANCE}

${VERDICT_GUIDANCE}`

// The thread so far, when there is one: placed before the new message.
export const THREAD_SO_FAR = `The thread so far:

{{thread}}

`

// The fallback, when an answer came without its summary: the summary alone,
// written when the pane closes.
export const SUMMARY_PROMPT = `The person reviewed your last reply and discussed one block of it in a private side thread, which can't run commands or change files. Write the summary of it.

The block:
"""
{{block}}
"""

The thread:

{{thread}}

${SUMMARY_GUIDANCE}

Reply with the summary alone.`

// Added to SUMMARY_PROMPT when the person switched a thread on that its verdict
// left out: they want something from it sent.
export const INCLUDED_ANYWAY = `The person chose to include this thread in their review, so write something even if it holds no change: what from it they want you to keep in mind, as context, in at most 3 short lines. Phrase it as an instruction only if the thread asked for a change; otherwise start with "Context:".`
