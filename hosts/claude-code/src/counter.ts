// "Block 3 of 12" as the navigator and band say it — nothing when there are no
// blocks, never "of 0" (#73). Plain numbers in, text out.

export function blockCounter(selected: number, count: number): string {
  return count > 0 ? `Block ${Math.min(selected, count - 1) + 1} of ${count}` : ''
}
