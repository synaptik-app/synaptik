## Nesting test

1. Top level, numbered
   - Second level, bullet
     - Third level, bullet
   - Second level again
2. Top level, numbered, with a second paragraph

   This paragraph belongs to item 2 and should stay part of the same block.
3. Top level, numbered
   1. Second level, numbered
   2. Second level, numbered

- Top level bullet
  1. Numbered under a bullet
  2. Numbered under a bullet

### What to check

- Each list item is its own block, nested ones too
- Indentation of nested items matches the mod-off view
- Item 2 and its second paragraph are one block
- Numbered lists under bullets keep their numbers
- Marking a nested item compiles indented under its parent
- An unmarked parent of a marked item is sent as a plain quote, for context
- Items that open alike can be told apart in the suggestion (numbers kept)
- Accepting a parent and rejecting a child reads correctly in the suggestion
