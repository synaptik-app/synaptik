## Split test

Part one, a paragraph before the first tool call.

1. Part one, first item
2. Part one, second item

<<sleep 3>>

Part two, a paragraph between the tool calls.

- Part two, a bullet
- Part two, another bullet

<<sleep 3>>

Part three, a paragraph after the last tool call.

### What to check

- Part one can be selected and marked
- Part two can be selected and marked
- Part three can be selected and marked
- Block N of M counts all three parts
- Marks in different parts all reach the suggestion, in reading order
- Nothing can be marked while the tool calls run
