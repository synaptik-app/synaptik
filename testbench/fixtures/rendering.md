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

### Markdown the segmenter has to get right

Steps:
1. Run the tests:

   ```sh
   npm test
   ```
2. Deploy, then check `SESSION_CACHE` in config_prod
   - watch the error rate
   - roll back if it climbs

   Back at item 2's indent, after its nested items.

9. Nine
10. Ten
    - nested under ten
- Nested by four spaces in the source
    - one level down, not two

He wrote:
> The cache is stale
> > and so is this
> - and a list inside the quote

Setext heading
--------------

Option | Latency
--|--
Redis | low

````md
```js
x()
```
````

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
- "Steps:" and the list under it are separate blocks; the code block is a block of its own, nested under item 1 — marking it alone compiles under "1. Run the tests:"
- Nested items line up exactly as with `/synaptik off`: under `-`, under `1.` and under `10.` — no extra space
- "Back at item 2's indent" is its own block, nested under item 2
- "He wrote:" and the quote are separate blocks; the quote, with its nested quote and list, is one block
- "Setext heading" is drawn as a heading and skipped by ↑/↓
- The table without outer pipes is one block; in the classic renderer, its neighbour shows it as "table: Option · Latency"
- The four-backtick fence, with a three-backtick one inside, is one block
- Marking a nested item under item 2 compiles under "2. Deploy, then check SESSION_CACHE…", underscores intact
