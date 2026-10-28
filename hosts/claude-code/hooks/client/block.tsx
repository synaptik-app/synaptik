// One block of the reply in fullscreen, drawn by its own Client (D41), so a click
// lands on exactly that block and hands the reply the keyboard. The block
// clicked keeps the keyboard for the whole review and steers every block: its
// keys become steps (src/review.ts), posted to the hooks, which hold the review
// and hand it back to every block as props. No `$` here: a surface module gets
// plain data in (props) and sends plain data out (post).

import type { ClientModule } from 'claude-code'

import { chunk } from '../../src/blocks'
import { click, current, itemAt, MENU, press, queue } from '../../src/review'
import type { Editing, Local, Review, Step } from '../../src/review'

export type BlockProps = {
  index: number
  text: string
  // Columns in, as Claude Code draws a nested item.
  indent: number
  // The margin: a mark's glyph, or the reply's ⏺ on its first block.
  glyph?: string
  bullet?: string
  first: number
  last: number
  review: Review
  acked: number
  // Staged comment texts by block index: shown under their block, reopened by c.
  comments: Record<string, string>
}

const MARGIN = 2
const LABELS: Record<(typeof MENU)[number], string> = {
  accept: '✓ accept',
  reject: '✗ reject',
  comment: '✎ comment',
  discuss: '💬 discuss',
}
// The menu's items as drawn, in order: what a click is matched against.
const ITEMS = MENU.map(verb => `[ ${LABELS[verb]} ]`)

const Block: ClientModule<BlockProps, Local> = (props, surface) => {
  const { Box, Text, Markdown } = surface.elements
  const review = current(surface.state, props.review)
  const scope = { first: props.first, last: props.last, comments: props.comments }

  const take = (s: Step | undefined) => {
    if (!s) return
    const { local, post } = queue(surface.state, props.acked, s)
    surface.setState(local)
    surface.post(post)
  }

  surface.onKey(key => take(press(review, key, scope)))
  // A click on the menu applies the action under it; anywhere else selects the
  // block. The menu is the module's own drawing, not Buttons: a Button takes the
  // keyboard when clicked, and in the reply that hands it back to the prompt.
  surface.onPointer(event => {
    if (event.type !== 'down') return
    const n = isSelected && !editing && event.y === menuRow() ? itemAt(event.x - menuStart, ITEMS) : -1
    if (n >= 0) take(press({ ...review, selected: props.index, verb: n }, { key: 'return' }, scope))
    else take(click(review, props.index, scope))
  })

  const isSelected = review.isActive && review.selected === props.index
  const editing = review.editing?.index === props.index ? review.editing : undefined
  const staged = !editing && props.glyph === '✎' ? props.comments[String(props.index)] : undefined
  // Where the menu sits in the region: its last row, or the one above a staged
  // comment's (a single row: it is truncated), after the margin, indent and "└ ".
  const menuRow = () => surface.rows - 1 - (staged ? 1 : 0)
  const menuStart = MARGIN + props.indent + 2

  // The comment being typed, dim like a staged one, its cursor an inverse cell.
  const field = (e: Editing) => {
    const before = e.text.slice(0, e.cursor)
    const atLine = before.split('\n').length - 1
    const atColumn = before.length - before.lastIndexOf('\n') - 1
    return Box({
      flexDirection: 'column',
      paddingLeft: MARGIN + props.indent,
      children: e.text.split('\n').map((line, n) =>
        Text({
          dimColor: true,
          children: [
            n === 0 ? '→ ' : '  ',
            ...(n === atLine
              ? [line.slice(0, atColumn), Text({ inverse: true, children: [line[atColumn] ?? ' '] }), line.slice(atColumn + 1)]
              : [line]),
          ],
        }),
      ),
    })
  }

  // The menu under the selected block, drawn as Claude Code draws its buttons;
  // the item under the cursor bold, the others dim.
  const menu = Box({
    flexDirection: 'row',
    paddingLeft: MARGIN + props.indent,
    children: [
      Text({ dimColor: true, children: ['└ '] }),
      ...ITEMS.map((item, n) =>
        Text(n === review.verb ? { weight: 'bold', color: 'suggestion', children: [item] } : { dimColor: true, children: [item] }),
      ),
    ],
  })

  return Box({
    flexDirection: 'column',
    children: [
      Box({
        flexDirection: 'row',
        children: [
          Box({ width: MARGIN, flexShrink: 0, children: [Text({ children: [props.glyph ?? props.bullet ?? ''] })] }),
          Box({
            flexGrow: 1,
            flexDirection: 'column',
            paddingLeft: props.indent,
            backgroundColor: isSelected ? 'selectionBg' : undefined,
            // Pieces of at most 10,000 characters: older Claude Code refuses more.
            children: chunk(props.text).map(piece => Markdown({ text: piece })),
          }),
        ],
      }),
      ...(isSelected && !editing ? [menu] : []),
      ...(editing ? [field(editing)] : []),
      ...(staged
        ? [Box({ paddingLeft: MARGIN + props.indent + 2, children: [Text({ dimColor: true, wrap: 'truncate', children: [`→ ${staged}`] })] })]
        : []),
    ],
  })
}

export default Block
