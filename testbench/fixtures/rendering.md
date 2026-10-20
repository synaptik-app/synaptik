## Rendering test

A plain paragraph, so the first block is ordinary prose. It is long enough to wrap onto a second line in a typical terminal, which shows whether wrapped lines stay aligned with the first.

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

### What to check

- Mod on and off look the same apart from marks and the selection — compare with `/synaptik off` and `/synaptik on`
- Numbered list keeps its numbers 1. 2. 3.
- Nested bullets sit under their parent
- The table draws as a table
- The code block keeps its styling
- The heading is skipped by ↑/↓ — it is not a block
- The selected block shows the selection background, and only while the navigator has focus
- Marking a block puts its glyph before it, and unmarked blocks do not move
- Classic renderer: selecting the table shows it whole in the pane, and a neighbouring table reads as "table: Option · Latency · Cost"
