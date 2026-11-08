# Synaptik — spec

## 1. Problem statement

Claude Code renders a linear transcript. Responding to part of it means
scrolling up, re-reading, and hand-writing prose that points back at it
("you said in step 3…"). Observed friction points:

- **Bulk approval.** A long response contains several suggestions. Responding
  means hand-writing a numbered list: `1. Ok as suggested, 2. use this
  approach instead, 3. change this to 5 and apply`.
- **Minor amendments.** Accepting a suggestion *with a tweak* costs a full
  sentence of prose each time.
- **Proposed commands.** Claude suggests running something as part of a larger
  plan, without calling it. There is no way to respond to that in place.
- **Lost context while discussing.** Clarifying one point means holding the
  others in your head and scrolling back to rephrase.
- **Question collapse.** When Claude asks a group of questions and the user
  picks "Discuss", the agent returns to the main chat and the remaining
  questions are lost — including ones already answered. *(Now E12 — out of MVP.)*

### Core insight

All of these are the same activity: **the user is hand-compiling a diff.**
They read the response, mentally mark each item (accept / reject / comment /
discuss), then serialize those marks into prose by hand.

**The mod's job is to let the user mark in place and compile the prompt for
them.** The response becomes a form to fill in; threads are one verb within
that, not the central metaphor.

---
