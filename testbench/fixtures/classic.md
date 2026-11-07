## Classic test

Reviewing from the navigator above the band. Run it in the default renderer (`/tui default`). A plain paragraph, so the first block is ordinary prose. It is long enough to wrap onto a second line in a typical terminal, which shows whether wrapped lines stay aligned with the first.

### A heading is not a block

1. Numbered item one
2. Numbered item two, with `inline code` in it
3. Numbered item three

- Bullet item
- Bullet item with **bold** and *italic*
  - Nested bullet under it
  - Second nested bullet

| Option | Latency | Cost |
|---|---|---|
| Redis | low | medium |
| Postgres | medium | low |

```ts
function greet(name: string): string {
  return `hello, ${name}`
}
```

> A blockquote, one block.

---

A closing paragraph after a horizontal rule.

### Steps

The basics of the classic renderer, nothing more. Each step says what to **do**, then what to **expect**. Mark each expectation: ✓ if you saw it, ✗ with a comment if not. Marks on the reply above are part of the test, not results.

1. **Do:** run `/synaptik off`, look at the reply, then `/synaptik on`
   - **Expect:** the reply looks the same both ways: list numbers, nesting, the table, the code's colours
2. **Do:** press `ctrl+x tab`
   - **Expect:** the navigator opens above the band, the keyboard in it, showing the reply's last block
   - **Expect:** the band says "Block N of M · ↑↓ blocks · tab/⇧tab actions · ⏎ apply · esc done"
3. **Do:** press `↑` up through the reply
   - **Expect:** the selected block has the background in the reply, and the navigator shows it; the heading is skipped
   - **Expect:** on the table, the navigator shows it whole
4. **Do:** press `a` on a block, `x` on another; on a third, `Tab` to "comment", `⏎`, type `why?`, `⏎`
   - **Expect:** each glyph before its block; no other block moves
   - **Expect:** the suggestion in the prompt box follows every mark
5. **Do:** press `Esc`
   - **Expect:** the navigator gives the keyboard back to the prompt box
   - **Expect:** the band counts the marks and says "tab, then ⏎ to send"
6. **Do:** run `/synaptik`
   - **Expect:** the navigator opens again

When you're done: press `Esc`, `Tab` to take the suggestion with your marks on these steps, then `⏎`. The test session answers with a table of your results.
