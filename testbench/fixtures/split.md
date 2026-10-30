## Split test

Part one, a paragraph before the first tool call.

1. Part one, first item
2. Part one, second item

<<STOP WRITING. Call the Bash tool now with the command: sleep 3. When it returns, continue with the next line. Never write this line in your reply.>>

Part two, a paragraph between the tool calls.

- Part two, a bullet
- Part two, another bullet

<<STOP WRITING. Call the Bash tool now with the command: sleep 3. When it returns, continue with the next line. Never write this line in your reply.>>

Part three, a paragraph after the last tool call.

### What to check

- **Marking each part**
  - Part one can be selected and marked
  - Part two can be selected and marked
  - Part three can be selected and marked
- **Moving across the parts**
  - Block N of M counts all three parts
  - After a click on a block, ↑/↓ and Home/End cross the tool calls, as j / k do after ctrl+x tab
- **The prompt**
  - Marks in different parts all reach the suggestion, in reading order
- **While the tool calls run**
  - Nothing can be marked while the tool calls run: the band offers no review, and the reply is Claude Code's own
