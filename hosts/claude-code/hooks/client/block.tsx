// One block of the reply in fullscreen, drawn by its own Client (D41), so a click
// lands on exactly that block and hands the reply the keyboard. The block
// clicked keeps the keyboard for the whole review and steers every block: its
// keys become steps (src/review.ts), posted to the hooks, which hold the review
// and hand it back to every block as props. No `$` here: a surface module gets
// plain data in (props) and sends plain data out (post).

import type { ClientModule } from 'claude-code'

import { chunk, lineKey, partsOf } from '../../src/blocks'
import { oneLine, PARTLY } from '../../src/compile'
import type { Mark } from '../../src/compile'
import { COMMENT_HINT } from '../ui'
import { cells, click, current, itemAt, MENU, press, queue } from '../../src/review'
import type { Editing, Local, Review, Step } from '../../src/review'
import { tableLayout } from '../../src/table'

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
  // Staged comment texts by block index or line key: shown under their block or
  // line, reopened by c.
  comments: Record<string, string>
  // How many parts each steppable block in the reply has: a block's keys steer them all.
  partCounts: Record<string, number>
  // The margin of this block's own lines, by line: a mark's glyph, or 💬.
  lineGlyphs: Record<string, string>
  // The marks on them, by line: a comment is drawn under its line.
  lineMarks: Record<string, Mark>
}

const MARGIN = 2
const LABELS: Record<(typeof MENU)[number], string> = {
  accept: '✓ accept',
  reject: '✗ reject',
  comment: '✎ comment',
  discuss: '💬 discuss',
}
// The menu's items as drawn, in order: what a click is matched against. A code block or table
// adds step in, a part inside one step out. Where they don't fit on one row, the
// glyphs alone (#169), so the menu stays one row and a click maps by column.
const ITEMS = MENU.map(verb => `[ ${LABELS[verb]} ]`)
const STEP_IN = '[ ↳ step in ]'
const STEP_OUT = '[ ↰ step out ]'
const SHORT: Record<string, string> = Object.fromEntries(
  [...ITEMS, STEP_IN, STEP_OUT].map(item => [item, item.replace(/^\[ (\S+) .*\]$/u, '[ $1 ]')]),
)

// What a block keeps: the review steps not yet echoed (src/review.ts), and the
// menu item the pointer is over, drawn as a button under the mouse is.
type BlockState = Local & { hovered?: number }

const Block: ClientModule<BlockProps, BlockState> = (props, surface) => {
  const { Box, Text, Markdown } = surface.elements
  const review = current(surface.state, props.review)
  const scope = { first: props.first, last: props.last, comments: props.comments, partCounts: props.partCounts }

  const hovered = surface.state?.hovered
  const take = (s: Step | undefined) => {
    if (!s) return
    const { local, post } = queue(surface.state, props.acked, s)
    surface.setState({ ...local, ...(hovered === undefined ? {} : { hovered }) })
    surface.post(post)
  }
  const hover = (n: number | undefined) => {
    if (n === hovered) return
    const { hovered: _, ...rest } = surface.state ?? { queued: [], nextId: props.acked + 1 }
    surface.setState(n === undefined ? rest : { ...rest, hovered: n })
  }

  surface.onKey(key => take(press(review, key, scope)))
  // A click on the menu applies the action under it; anywhere else selects the
  // block. The menu is the module's own drawing, not Buttons: a Button takes the
  // keyboard when clicked, and in the reply that hands it back to the prompt.
  surface.onPointer(event => {
    const n = isSelected && !editing && !lineEditing && event.y === menuRow() ? itemAt(event.x - menuStart, items) : -1
    if (event.type === 'move' || event.type === 'enter') return hover(n >= 0 ? n : undefined)
    if (event.type === 'leave') return hover(undefined)
    if (event.type !== 'down') return
    if (n >= 0) take(press({ ...review, selected: props.index, verb: n }, { key: 'return' }, scope))
    else if (!stepped) take(click(review, props.index, scope))
  })

  const isSelected = review.isActive && review.selected === props.index
  const editing = review.editing?.index === props.index ? review.editing : undefined
  const parts = props.partCounts[String(props.index)] ? partsOf(props.text) : undefined
  const stepped = parts && isSelected && review.line !== undefined ? { ...parts, at: review.line } : undefined
  const steppedKey = stepped ? lineKey(props.index, stepped.at) : undefined
  const lineEditing = steppedKey !== undefined && review.editing?.index === steppedKey ? review.editing : undefined
  const lineStaged = steppedKey !== undefined && !lineEditing && props.lineMarks[String(stepped?.at)] === 'comment' ? props.comments[steppedKey] : undefined
  const full = stepped ? [...ITEMS, STEP_OUT] : parts ? [...ITEMS, STEP_IN] : ITEMS
  // The room after the margin, indent and "└ "; 0 before the first layout.
  const room = surface.columns - MARGIN - props.indent - 2
  const items = surface.columns > 0 && full.reduce((n, item) => n + cells(item), 0) > room ? full.map(item => SHORT[item]!) : full
  const staged = !editing && props.glyph === '✎' ? props.comments[String(props.index)] : undefined
  // Where the menu sits in the region: its last row, or the one above a staged
  // comment's (a single row: its first line, truncated), after the margin,
  // indent and "└ ".
  const menuRow = () => (stepped ? rowEnd(stepped.at) : surface.rows - 1 - (staged ? 1 : 0))
  const menuStart = MARGIN + props.indent + 2

  // The comment being typed, dim like a staged one, its cursor an inverse cell,
  // and after it the keys, as Claude Code's own fields name theirs.
  const field = (e: Editing, paddingLeft = MARGIN + props.indent) => {
    const before = e.text.slice(0, e.cursor)
    const atLine = before.split('\n').length - 1
    const atColumn = before.length - before.lastIndexOf('\n') - 1
    const lines = e.text.split('\n')
    return Box({
      flexDirection: 'column',
      paddingLeft,
      children: lines.map((line, n) =>
        Text({
          dimColor: true,
          children: [
            n === 0 ? '→ ' : '  ',
            ...(n === atLine && e.cursor >= 0
              ? [line.slice(0, atColumn), Text({ inverse: true, children: [line[atColumn] ?? ' '] }), line.slice(atColumn + 1)]
              : [line]),
            ...(n === lines.length - 1 ? [Text({ dimColor: true, children: [`   ⏎ ${COMMENT_HINT}${e.text === '' ? '' : ' · ctrl+u clear'}`] })] : []),
          ],
        }),
      ),
    })
  }

  // The menu under the selected block, drawn as Claude Code draws its buttons:
  // the item under the keyboard's cursor bold, the one under the mouse inverse,
  // the others dim.
  const menuAt = (paddingLeft: number) => Box({
    flexDirection: 'row',
    paddingLeft,
    children: [
      Text({ dimColor: true, children: ['└ '] }),
      ...items.map((item, n) =>
        Text({
          ...(n === review.verb ? { weight: 'bold' as const, color: 'suggestion' as const } : { dimColor: true }),
          ...(n === hovered ? { inverse: true } : {}),
          children: [item],
        }),
      ),
    ],
  })

  // The block stepped into: every piece draws the WHOLE block and shows a window
  // of its rows, so the highlighter never sees a cut (a closing */ would read as
  // an opening one). A long line wraps, so rows are estimated from the room; a
  // table's rows come from its layout (src/table.ts).
  const table = parts?.kind === 'table' ? tableLayout(props.text, surface.columns) : undefined
  const rowOf = (line: number) => {
    if (table) return table.spans[line]?.top ?? table.end
    const room = Math.max(1, surface.columns - MARGIN - props.indent)
    return (parts?.lines ?? []).slice(0, line).reduce((rows, text) => rows + Math.max(1, Math.ceil(cells(text) / room)), 0)
  }
  const rowEnd = (line: number) => {
    const span = table?.spans[line]
    return span ? span.top + span.height : rowOf(line + 1)
  }
  const lastRow = () => table?.end ?? rowOf(parts?.lines.length ?? 0)
  const whole = () => chunk(props.text).map(piece => Markdown({ text: piece }))
  const windowed = (from: number, to: number, backgroundColor?: 'selectionBg') =>
    Box({
      height: to - from,
      overflow: 'hidden',
      flexShrink: 0,
      ...(backgroundColor ? { backgroundColor } : {}),
      children: [Box({ flexDirection: 'column', flexShrink: 0, flexGrow: 1, marginTop: -from, children: whole() })],
    })
  const lineComment = (text: string) =>
    Box({ paddingLeft: 2, children: [Text({ dimColor: true, wrap: 'truncate', children: [`→ ${oneLine(text)}`] })] })
  const drawCode = (s: NonNullable<typeof stepped>) => {
    const top = rowOf(s.at)
    const bottom = rowEnd(s.at)
    const end = lastRow()
    return [
      ...(top > 0 ? [windowed(0, top)] : []),
      windowed(top, bottom, 'selectionBg'),
      ...(lineEditing ? [field(lineEditing, 0)] : [menuAt(0)]),
      ...(lineStaged ? [lineComment(lineStaged)] : []),
      ...(bottom < end ? [windowed(bottom, end)] : []),
    ]
  }
  // The margin: the block's glyph or bullet on its first row, and each marked
  // line's glyph on that line's row, past what is drawn under the selected line.
  const margin = () => {
    const first = props.glyph ?? props.bullet ?? ''
    const marked = Object.entries(props.lineGlyphs).map(([line, glyph]) => [Number(line), glyph] as const)
    if (!parts || marked.length === 0) return [Text({ children: [first] })]
    const under = stepped ? (lineEditing ? lineEditing.text.split('\n').length : 1) + (lineStaged ? 1 : 0) : 0
    const glyphs = new Map(marked.map(([line, glyph]) => [rowOf(line) + (stepped && line > stepped.at ? under : 0), glyph]))
    return Array.from({ length: Math.max(...glyphs.keys()) + 1 }, (_, row) =>
      Text({
        children: [
          row === 0 && (!stepped || !glyphs.has(0)) && props.glyph
            ? props.glyph
            : // Never an empty row: a Text of '' takes no height, and the glyphs under it would move up (#168).
              (glyphs.get(row) ?? (row > 0 ? ' ' : stepped ? first || ' ' : PARTLY)),
        ],
      }),
    )
  }

  return Box({
    flexDirection: 'column',
    children: [
      Box({
        flexDirection: 'row',
        children: [
          Box({
            width: MARGIN,
            flexShrink: 0,
            flexDirection: 'column',
            children: margin(),
          }),
          Box({
            flexGrow: 1,
            flexDirection: 'column',
            paddingLeft: props.indent,
            backgroundColor: isSelected && !stepped ? 'selectionBg' : undefined,
            // Pieces of at most 10,000 characters: older Claude Code refuses more.
            children: stepped ? drawCode(stepped) : chunk(props.text).map(piece => Markdown({ text: piece })),
          }),
        ],
      }),
      ...(isSelected && !editing && !stepped ? [menuAt(MARGIN + props.indent)] : []),
      ...(editing ? [field(editing)] : []),
      ...(staged
        ? [Box({ paddingLeft: MARGIN + props.indent + 2, children: [Text({ dimColor: true, wrap: 'truncate', children: [`→ ${oneLine(staged)}`] })] })]
        : []),
    ],
  })
}

export default Block
