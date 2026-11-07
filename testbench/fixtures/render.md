## Render test

How Synaptik draws the reply: the same as Claude Code with the mod off, plus the selection, the marks and comments, at any width. Fullscreen (`/tui fullscreen`).

A paragraph with **bold**, *italic*, `inline code` and a [link](#a-heading-between-blocks), long enough to wrap onto a second line, and a third in a narrow terminal, so that a selection has to cover every row of it.

### A heading between blocks

1. A numbered item
   - a nested bullet under it
2. A second numbered item

```ts
// a comment, coloured as one
const greeting: string = `hello, ${name}` // a string, and a line long enough to wrap in a narrow terminal
export function retry(fn: () => Promise<void>, times = 3) {
  return fn().catch(err => (times > 0 ? retry(fn, times - 1) : Promise.reject(err)))
}
```

| Option | Latency | Durability | Notes |
|---|---|---|---|
| Redis | low | snapshots | fast, but only durable once persistence is configured, which wraps |
| Postgres | medium | full | slower |

> A quote, drawn with its bar,
> over two lines.

---

Wide characters: 日本語のテキスト, and an emoji 🚀 in the middle of a sentence.

The last paragraph.

### Steps

Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** run `/synaptik off`, look at the reply, then run `/synaptik on`
   - **Expect:** the reply looks the same both ways: wraps, indents, list numbers, the code's colours, the table's borders, the quote's bar, the rule
   - **Expect:** ⏺ before the first block both ways
2. **Do:** click the band's "click here to review the reply", then click the first paragraph's second line
   - **Expect:** the selection background covers every row of the paragraph, and only it
   - **Expect:** the menu sits right under the paragraph; no text moves sideways
3. **Do:** press `↓` through the blocks, down to "The last paragraph."
   - **Expect:** the heading is never selected
   - **Expect:** the code block keeps its colours under the background
   - **Expect:** on the table, the background covers the whole grid, borders included
   - **Expect:** on the quote, its bar stays
   - **Expect:** the wide characters and the emoji stay aligned, the background covering them
4. **Do:** press `a` on the nested bullet, `x` on the table, then `c` on the code block, type `too clever`, press `⏎`
   - **Expect:** each glyph sits in the margin on its block's first row, and no text moves
   - **Expect:** the comment shows dim under the code block
5. **Do:** press `q`
   - **Expect:** the reply looks as with the mod off, apart from the glyphs and the comment
6. **Do:** narrow the terminal to about 80 columns, then about 50
   - **Expect:** at each width, the wraps match `/synaptik off` at that width
   - **Expect:** at 50, the table turns into a list, as with the mod off
   - **Expect:** the glyphs stay on their blocks' first rows
7. **Do:** widen it again, and scroll up to an older reply
   - **Expect:** older replies are Claude Code's own: no glyphs, no menus

When you're done: click the first **Expect:**, mark every expectation, press `q`, `Tab`, then `⏎`. The test session answers with a table of your results.
