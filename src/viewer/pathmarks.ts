/**
 * Where the predicted path's markers go on the page (viewer/path.ts): each is a glyph on its point
 * of the line and a label beside it, and they are laid out together, most important first.
 *
 * - A glyph sits on its point or is not shown: never on a panel, never inside the clear ring round
 *   the vehicle (nothing of the path is drawn there), never on a glyph laid before it.
 * - A label goes above its glyph if it can, else below, right or left; never off the window, on a
 *   panel, inside the ring, or on another marker's glyph or label. A label that fits nowhere is
 *   left off and its glyph kept.
 * - What fits is decided most important first, so a crowded view keeps the apogee and where it
 *   comes down; and when the whole arc is small on the screen only the most important are offered.
 * - Nothing jumps for no reason: a label keeps the side it had while that side is clear, and one
 *   shown last frame is tested with less margin than one that was not (`HOLD`), so it does not
 *   come and go as an edge passes back and forth over the margin.
 *
 * Pure: boxes in CSS pixels in, places out. Tested in tests/pathmarks.test.mjs.
 */

export interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface MarkIn {
  id: string;
  /** Its point on the page, CSS pixels. */
  x: number;
  y: number;
  /** Larger is more important. */
  rank: number;
  /** The label's size, CSS pixels. */
  w: number;
  h: number;
}

export type Side = 'above' | 'below' | 'right' | 'left';

export interface MarkOut {
  id: string;
  glyph: boolean;
  /** Where the label is, or null if it is not shown. */
  side: Side | null;
  /** The label's box, when shown. */
  box: Box | null;
}

/** What the path keeps clear of round the vehicle on the page: everything within `r` of the segment from a to b, CSS pixels (r 0: none). */
export interface Clear {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}

export interface Field {
  width: number;
  height: number;
  /** The page's panels: nothing of a marker on them. */
  panels: readonly Box[];
  clear: Clear;
}

/** Half a glyph's size, the gap between it and its label, and the margin kept from a panel or another label. */
export const GLYPH = 6;
const GAP = 5;
const MARGIN = 4;
/** The margin a label that was shown keeps instead: less, so that it stays rather than flickers. */
const HOLD = 0;
/** Ranks offered when the arc is small on the screen: under `SMALL` pixels across only these. */
export const SMALL = 140;
export const MIDDLE = 300;
export const FIRST = 90;
export const SECOND = 60;

const overlaps = (a: Box, b: Box, m: number): boolean => a.x1 + m > b.x0 && a.x0 - m < b.x1 && a.y1 + m > b.y0 && a.y0 - m < b.y1;

/** How far a box is from a segment: the nearest of the segment's points to the box, found by halving where it is nearest. */
export function boxToSegment(b: Box, ax: number, ay: number, bx: number, by: number): number {
  const to = (s: number): number => {
    const x = ax + (bx - ax) * s;
    const y = ay + (by - ay) * s;
    return Math.hypot(Math.max(b.x0 - x, 0, x - b.x1), Math.max(b.y0 - y, 0, y - b.y1));
  };
  // the distance along the segment is convex: narrowed by thirds to where it is least
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i++) {
    const m1 = lo + (hi - lo) / 3;
    const m2 = hi - (hi - lo) / 3;
    if (to(m1) <= to(m2)) hi = m2;
    else lo = m1;
  }
  return to((lo + hi) / 2);
}

/** Whether a box comes within the clear zone round the vehicle. */
const inRing = (b: Box, c: Clear): boolean => c.r > 0 && boxToSegment(b, c.ax, c.ay, c.bx, c.by) < c.r;

/** A label's box on each side of its point. */
export function labelBox(m: Pick<MarkIn, 'x' | 'y' | 'w' | 'h'>, side: Side): Box {
  const off = GLYPH + GAP;
  switch (side) {
    case 'above':
      return { x0: m.x - m.w / 2, x1: m.x + m.w / 2, y0: m.y - off - m.h, y1: m.y - off };
    case 'below':
      return { x0: m.x - m.w / 2, x1: m.x + m.w / 2, y0: m.y + off, y1: m.y + off + m.h };
    case 'right':
      return { x0: m.x + off, x1: m.x + off + m.w, y0: m.y - m.h / 2, y1: m.y + m.h / 2 };
    case 'left':
      return { x0: m.x - off - m.w, x1: m.x - off, y0: m.y - m.h / 2, y1: m.y + m.h / 2 };
  }
}

const SIDES: readonly Side[] = ['above', 'below', 'right', 'left'];

/**
 * Lay the markers out. `before` is what the last frame laid (by id): a label keeps its side while it
 * can. `span` is how far across the screen the arc reaches, CSS pixels: under `SMALL` only ranks of
 * `FIRST` and over are offered, under `MIDDLE` only `SECOND` and over.
 */
export function layMarks(marks: readonly MarkIn[], field: Field, span: number, before?: ReadonlyMap<string, MarkOut>): MarkOut[] {
  const least = span < SMALL ? FIRST : span < MIDDLE ? SECOND : Number.NEGATIVE_INFINITY;
  const order = [...marks].sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id));
  const taken: Box[] = [];
  const out = new Map<string, MarkOut>();
  const window: Box = { x0: 0, y0: 0, x1: field.width, y1: field.height };
  const inside = (b: Box, m: number): boolean =>
    b.x0 >= window.x0 + m && b.y0 >= window.y0 + m && b.x1 <= window.x1 - m && b.y1 <= window.y1 - m;
  const clear = (b: Box, m: number): boolean =>
    inside(b, m) && !field.panels.some((p) => overlaps(b, p, m)) && !inRing(b, field.clear) && !taken.some((t) => overlaps(b, t, m));
  for (const m of order) {
    const was = before?.get(m.id);
    const glyph: Box = { x0: m.x - GLYPH, y0: m.y - GLYPH, x1: m.x + GLYPH, y1: m.y + GLYPH };
    if (m.rank < least || !Number.isFinite(m.x) || !Number.isFinite(m.y) || !clear(glyph, was?.glyph ? HOLD : 1)) {
      out.set(m.id, { id: m.id, glyph: false, side: null, box: null });
      continue;
    }
    taken.push(glyph);
    const sides = was?.side ? [was.side, ...SIDES.filter((s) => s !== was.side)] : SIDES;
    let placed: MarkOut = { id: m.id, glyph: true, side: null, box: null };
    for (const side of sides) {
      const box = labelBox(m, side);
      if (clear(box, side === was?.side ? HOLD : MARGIN)) {
        placed = { id: m.id, glyph: true, side, box };
        taken.push(box);
        break;
      }
    }
    out.set(m.id, placed);
  }
  return marks.map((m) => out.get(m.id)!);
}
