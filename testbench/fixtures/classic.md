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

### What to check

- **The reply**
  - Mod on and off look the same apart from marks and the selection — compare with `/synaptik off` and `/synaptik on`
  - Numbered list keeps its numbers 1. 2. 3.
  - Nested bullets sit under their parent
  - The table draws as a table
  - The code block keeps its styling
- **Opening the navigator**
  - The band says "ctrl+x tab to review the reply"; ctrl+x tab puts the keyboard in the navigator
  - `/synaptik` opens the navigator too
  - Below about 144 columns the navigator waits after a reply, and the band offers "⏎ to review the reply"
- **Moving between blocks**
  - The heading is skipped by ↑/↓ — it is not a block
  - The selected block shows the selection background, and only while the navigator has focus
  - The navigator shows the selected block, and the band says "Block N of M · ↑↓ blocks · tab/⇧tab actions · ⏎ apply · esc done"
  - Selecting the table shows it whole in the pane, and a neighbouring table reads as "table: Option · Latency · Cost"
- **Marking**
  - Tab / ⇧Tab walk the actions and ⏎ applies the one chosen; a / x / c act directly
  - Marking a block puts its glyph before it, and unmarked blocks do not move
  - c opens a comment field in the pane, with "ok · \⏎ new line": backslash then ⏎ starts a new line, up to 3 rows show, ⏎ stages it
- **The prompt**
  - The suggestion in the prompt box follows every mark; Tab takes it and ⏎ sends it
  - The band counts ✓ ✗ ✎ and says "tab, then ⏎ to send", "⏎ sends your feedback", or in yellow "⏎ sends what you typed"
- **Ending and setup**
  - Esc ends the review and gives the keyboard back; q does too, unadvertised
  - `/synaptik config` offers one setting, Move between actions; after choosing ← / → and Save, ← / → walk the actions
