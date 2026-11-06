// What a thread asks its fork (SPEC §8, #156): the text alone, kept apart from
// the logic so it reads and changes like a document. The mod loader takes only
// code files, so it lives here rather than in a .md file.
//
// Placeholders, filled by src/threads.ts: {{block}}, {{part}}, {{thread}}, {{message}}.

// What the summary is for, and what goes in it. Shared by the thread prompt and
// the fallback that asks for the summary alone.
const SUMMARY_GUIDANCE = `The summary is for the person's next prompt to you in the main conversation. It goes under a quote of this block, next to their other marks on your reply (accept, reject, comment). They read it there and can edit it before sending. Write it as their instruction to you, covering the whole thread so far, in these sections, in this order, each only when it has something:
Actions: what to do, add, drop or redo, and work to carry out: commands to run, files to edit or create, tests to run. Each starts with a verb and is specific enough to act on without this thread, with the exact command or path when the thread settled one (e.g. "Run npm test -- greet", "Edit src/greet.ts: …").
Decisions: what was settled that isn't itself something to do, with the reason in a few words if it isn't obvious.
Open questions: only one the thread left unresolved that you need answered.
Write each section's label once, with its colon. A section with one point keeps it on the label's line ("Decisions: Keep Redis; durability isn't needed."); with several, the label stands alone and each point follows on a line of its own starting with "- ". Say each point once: a decision that is a change goes under Actions, with its reason after it. Stick to what the thread discussed, though it may refer to other parts of your reply. Leave out what the thread only explained or confirmed. No recap of the conversation, no mention that a thread happened, no preamble. Keep it short: one line per point, each as brief as it can be and still be acted on. If nothing in the thread changes what you should do, write nothing.`

const VERDICT_GUIDANCE = `The verdict: include when the summary holds a change, work to carry out, or a decision the main conversation doesn't have yet. Exclude when the thread only explained, confirmed or explored, and the summary is empty.`

// One message of the thread: the answer, then its summary and verdict.
export const THREAD_PROMPT = `The person is reviewing your last reply and opened a side thread about one block of it. The thread branches off the conversation here: you have everything up to now, but nothing in it reaches the main conversation unless the person includes it in their review. Any tool call is refused here, so answer their latest message, about that block, briefly, from what you already know. When something needs doing (a command to run, a file to edit, a test to run), say so, and it will go into the summary for the main conversation to carry out.

The block:
"""
{{block}}
"""
{{part}}
{{thread}}Their message:
{{message}}

After your answer, add the two parts below, exactly in this form. The person doesn't see them as part of your answer.

<summary>
...
</summary>
<verdict>include</verdict> or <verdict>exclude</verdict>

${SUMMARY_GUIDANCE}

${VERDICT_GUIDANCE}`

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
export const INCLUDED_ANYWAY = `The person chose to include this thread in their review, so write something even if it holds no change: a Context section, with what from the thread you should keep in mind when you act on their review. Keep it simple and short, from what the thread discussed: a sentence or two. Use Actions instead only if the thread asked for a change.`
