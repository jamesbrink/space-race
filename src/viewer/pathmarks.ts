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

/*
 * Chips: a marker that matters now (the next event, the apogee ahead, where it comes down) whose place is not in the
 * clear part of the view, off the window, under a panel or behind the eye, is shown at the edge of that clear part
 * on the bearing to it, as a chip with a pointer toward it.
 *
 * - The clear part is a rectangle: the window less the bands its panels make across the top and the bottom (those
 *   that reach over the middle third of its width). A panel in a corner is not a band: a chip that would lie on one
 *   is brought in toward the middle until it is off it, so it follows the panel's inner edges round the corner.
 * - The bearing is from the middle of the view (where the camera looks) to the marker's place on the page, or, for one
 *   behind the eye, the way its place is from the line of sight: up is up, left is left, never mirrored through the
 *   middle. The two agree where a marker passes from in front of the eye to behind it, so a chip does not leap there.
 * - The chip lies inside the clear part at the point where the ray from the middle meets its edge, slid along the
 *   edge, nearest first, until it is off the vehicle, the markers on the line and the chips laid before it (most
 *   important first). One that fits nowhere is not shown. A chip keeps the way round it slid while that is not much
 *   further, and its slide while that is clear, so it does not swap sides as an edge comes and goes; where its place
 *   does leap, it says so (`leap`), and path.ts fades it out and in again rather than glide it across the page.
 * - A marker whose place is within the clear part and on no panel has no chip: it is on the line, or hidden there by
 *   what is in front of it (the vehicle, the Earth) or by markers that matter more.
 */

export interface ChipIn {
  id: string;
  rank: number;
  w: number;
  h: number;
  /** Its place on the page, CSS pixels, if it is in front of the eye; null if behind. */
  at: { x: number; y: number } | null;
  /** The way to it from the middle of the view on the page, CSS pixels, y down (for one behind the eye: its place across the line of sight). */
  dx: number;
  dy: number;
}

export interface ChipOut {
  id: string;
  /** The chip, or null if it has none (its marker is in view, or there is no room). */
  box: Box | null;
  /** Where its pointer is, on the chip's edge toward the marker, and the way it points, radians from +x (y down). */
  px: number;
  py: number;
  angle: number;
  /** How far it was slid along the edge, CSS pixels (kept from frame to frame). */
  slide: number;
  /** Its place has leapt since the last layout (slid round another chip or a panel, or its bearing turned through the eye): to be gone to by fading out and in, not glided. */
  leap: boolean;
}

/** Margin from the clear part's edge, and the step a chip is slid by. */
const EDGE = 8;
const STEP = 6;
/** How much further round a chip goes the way it went last rather than swap to the other way. */
const KEEP = 160;
/** How far a chip's slide may change from one layout to the next and still be glided along, CSS pixels. */
const LEAP = 60;

/** The clear part of the view: the window less the bands of panels across its top and bottom (over the middle third). */
export function clearArea(field: Pick<Field, 'width' | 'height' | 'panels'>): Box {
  const { width, height } = field;
  let top = 0;
  let bottom = height;
  for (const p of field.panels) {
    if (p.x1 <= width / 3 || p.x0 >= (2 * width) / 3) continue;
    if ((p.y0 + p.y1) / 2 < height / 2) top = Math.max(top, p.y1);
    else bottom = Math.min(bottom, p.y0);
  }
  if (bottom - top < 60) return { x0: 0, y0: 0, x1: width, y1: height };
  return { x0: 0, y0: top, x1: width, y1: bottom };
}

/** Where a ray from (ox, oy) inside a box leaves it. */
function exit(b: Box, ox: number, oy: number, dx: number, dy: number): { x: number; y: number } {
  let t = Number.POSITIVE_INFINITY;
  if (dx > 1e-9) t = Math.min(t, (b.x1 - ox) / dx);
  if (dx < -1e-9) t = Math.min(t, (b.x0 - ox) / dx);
  if (dy > 1e-9) t = Math.min(t, (b.y1 - oy) / dy);
  if (dy < -1e-9) t = Math.min(t, (b.y0 - oy) / dy);
  return Number.isFinite(t) ? { x: ox + dx * t, y: oy + dy * t } : { x: ox, y: b.y1 };
}

/** A point on a box's edge by how far round it is from the top left, clockwise; and the reverse. */
function round(b: Box, s: number): { x: number; y: number } {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  const all = 2 * (w + h);
  let d = ((s % all) + all) % all;
  if (d < w) return { x: b.x0 + d, y: b.y0 };
  d -= w;
  if (d < h) return { x: b.x1, y: b.y0 + d };
  d -= h;
  if (d < w) return { x: b.x1 - d, y: b.y1 };
  return { x: b.x0, y: b.y1 - (d - w) };
}
function along(b: Box, x: number, y: number): number {
  const w = b.x1 - b.x0;
  const h = b.y1 - b.y0;
  // the nearest edge
  const dTop = Math.abs(y - b.y0);
  const dRight = Math.abs(x - b.x1);
  const dBottom = Math.abs(y - b.y1);
  const dLeft = Math.abs(x - b.x0);
  const least = Math.min(dTop, dRight, dBottom, dLeft);
  if (least === dTop) return x - b.x0;
  if (least === dRight) return w + (y - b.y0);
  if (least === dBottom) return w + h + (b.x1 - x);
  return 2 * w + h + (b.y1 - y);
}

/**
 * Lay out the chips. `field` is the window, its panels and the clear zone round the vehicle; `taken` what is on the
 * page already (the markers on the line); `cx, cy` the middle of the view. `before` is what the last frame laid.
 */
export function layChips(
  chips: readonly ChipIn[],
  field: Field,
  cx: number,
  cy: number,
  taken: readonly Box[],
  before?: ReadonlyMap<string, ChipOut>,
): ChipOut[] {
  const area = clearArea(field);
  const inner: Box = { x0: area.x0 + EDGE, y0: area.y0 + EDGE, x1: area.x1 - EDGE, y1: area.y1 - EDGE };
  const ox = Math.min(inner.x1, Math.max(inner.x0, cx));
  const oy = Math.min(inner.y1, Math.max(inner.y0, cy));
  const used: Box[] = [...taken];
  const onPanel = (b: Box, m: number) => field.panels.some((p) => overlaps(b, p, m));
  const out = new Map<string, ChipOut>();
  const none = (id: string): ChipOut => ({ id, box: null, px: 0, py: 0, angle: 0, slide: 0, leap: false });
  for (const c of [...chips].sort((a, b) => b.rank - a.rank || a.id.localeCompare(b.id))) {
    const at = c.at;
    if (at && Number.isFinite(at.x) && Number.isFinite(at.y)) {
      const point: Box = { x0: at.x - GLYPH, y0: at.y - GLYPH, x1: at.x + GLYPH, y1: at.y + GLYPH };
      const within = at.x >= area.x0 && at.x <= area.x1 && at.y >= area.y0 && at.y <= area.y1;
      if (within && !onPanel(point, 0)) {
        out.set(c.id, none(c.id));
        continue;
      }
    }
    // the way to it: from the middle to its place, or (behind the eye, or so far off it has no place) the bearing given
    let dx = at && Number.isFinite(at.x) ? at.x - ox : c.dx;
    let dy = at && Number.isFinite(at.y) ? at.y - oy : c.dy;
    const was = before?.get(c.id);
    if (Math.hypot(dx, dy) < 1e-6) {
      // straight behind: the way it was last, or down
      dx = was?.box ? Math.cos(was.angle) : 0;
      dy = was?.box ? Math.sin(was.angle) : 1;
    }
    const hit = exit(inner, ox, oy, dx, dy);
    const s0 = along(inner, hit.x, hit.y);
    const perimeter = 2 * (inner.x1 - inner.x0 + inner.y1 - inner.y0);
    // a place on the edge, brought in toward the middle until it is off every panel (so it follows a panel's inner
    // edges round a corner instead of jumping round it); null if it would have to come in past the middle
    const boxAt = (slide: number): Box | null => {
      const p = round(inner, s0 + slide);
      const x = Math.min(inner.x1 - c.w / 2, Math.max(inner.x0 + c.w / 2, p.x));
      const y = Math.min(inner.y1 - c.h / 2, Math.max(inner.y0 + c.h / 2, p.y));
      const far = Math.hypot(x - ox, y - oy);
      const ux = far > 1e-6 ? (x - ox) / far : 0;
      const uy = far > 1e-6 ? (y - oy) / far : 0;
      let t = 0;
      for (let i = 0; i < 8; i++) {
        const b = { x0: x - c.w / 2 - ux * t, y0: y - c.h / 2 - uy * t, x1: x + c.w / 2 - ux * t, y1: y + c.h / 2 - uy * t };
        const p = field.panels.find((q) => overlaps(b, q, MARGIN));
        if (!p) return b;
        // the least further in that takes it off this panel
        let need = Number.POSITIVE_INFINITY;
        if (ux > 1e-6) need = Math.min(need, (b.x1 + MARGIN - p.x0) / ux);
        if (ux < -1e-6) need = Math.min(need, (b.x0 - MARGIN - p.x1) / ux);
        if (uy > 1e-6) need = Math.min(need, (b.y1 + MARGIN - p.y0) / uy);
        if (uy < -1e-6) need = Math.min(need, (b.y0 - MARGIN - p.y1) / uy);
        t += need + 0.01;
        if (!(t < far)) return null;
      }
      return null;
    };
    const fits = (b: Box | null): b is Box => b !== null && !inRing(b, field.clear) && !used.some((t) => overlaps(b, t, MARGIN));
    // the nearest clear place each way round
    const nearest = (sign: 1 | -1): number | null => {
      for (let k = sign > 0 ? 0 : 1; k * STEP <= perimeter / 2; k++) if (fits(boxAt(sign * k * STEP))) return sign * k * STEP;
      return null;
    };
    const ahead = nearest(1);
    const back = nearest(-1);
    let slide = ahead === null ? back : back === null || Math.abs(ahead) <= Math.abs(back) ? ahead : back;
    if (slide === null) {
      out.set(c.id, none(c.id));
      continue;
    }
    if (was?.box) {
      // (the way round it went last, while that is not much further: it does not swap sides of a panel as an edge comes and goes;
      // and where it was, while that is clear and hardly further than the nearest)
      const same = was.slide > 0 ? ahead : was.slide < 0 ? back : null;
      if (same !== null && Math.abs(same) <= Math.abs(slide) + KEEP) slide = same;
      if (was.slide !== slide && Math.abs(was.slide) <= Math.abs(slide) + 4 * STEP && fits(boxAt(was.slide))) slide = was.slide;
    }
    const box = boxAt(slide)!;
    used.push(box);
    // the pointer: where the ray from the chip's middle toward the marker leaves the chip
    const mx = (box.x0 + box.x1) / 2;
    const my = (box.y0 + box.y1) / 2;
    const tx = at && Number.isFinite(at.x) ? at.x - mx : dx;
    const ty = at && Number.isFinite(at.y) ? at.y - my : dy;
    const angle = Math.atan2(ty, tx);
    const edge = exit(box, mx, my, Math.cos(angle), Math.sin(angle));
    const turned = was?.box ? Math.abs(Math.atan2(Math.sin(angle - was.angle), Math.cos(angle - was.angle))) : 0;
    const leap = Boolean(was?.box) && (Math.abs(slide - was!.slide) > LEAP || turned > 1);
    out.set(c.id, { id: c.id, box, px: edge.x, py: edge.y, angle, slide, leap });
  }
  return chips.map((c) => out.get(c.id)!);
}

/**
 * The markers and the chips laid together, as the page lays them: the markers on the line first, then a chip for each
 * of `chips` whose marker has no glyph on the line, off what is on it. A marker is laid once: on the line or as a
 * chip, never both. `cx, cy` is the middle of the view; `marks.before` and `chips.before` what the last frame laid.
 */
export function layWords(
  marks: readonly MarkIn[],
  chips: readonly ChipIn[],
  field: Field,
  span: number,
  cx: number,
  cy: number,
  before?: { marks?: ReadonlyMap<string, MarkOut>; chips?: ReadonlyMap<string, ChipOut> },
): { marks: MarkOut[]; chips: ChipOut[] } {
  const laid = layMarks(marks, field, span, before?.marks);
  const taken: Box[] = [];
  const on = new Set<string>();
  laid.forEach((o, i) => {
    const m = marks[i]!;
    if (o.glyph) {
      on.add(o.id);
      taken.push({ x0: m.x - GLYPH, y0: m.y - GLYPH, x1: m.x + GLYPH, y1: m.y + GLYPH });
    }
    if (o.box) taken.push(o.box);
  });
  return {
    marks: laid,
    chips: layChips(
      chips.filter((c) => !on.has(c.id)),
      field,
      cx,
      cy,
      taken,
      before?.chips,
    ),
  };
}

/*
 * A marker's words are drawn in two ways, the label beside its glyph on the line and the chip at the edge, and it
 * goes from one to the other by fading (`crossFade`). It is never drawn at two places at once: while both can be
 * seen, the one going is drawn where the one coming is, so the hand-over is a cross-fade in place.
 */

/** One way of drawing a marker's words as it is now: its box's top left on the page, and how strongly it is drawn (0 to 1). */
export interface Drawn {
  x: number;
  y: number;
  op: number;
}

/** A marker's words as they are drawn. */
export interface Words {
  label: Drawn;
  chip: Drawn;
  /** The chip is where its own layout put it (and its pointer means something); false while it stands over the label, going. */
  own: boolean;
  /** The chip's place has leapt: it fades out where it is, and in again there. */
  leap: boolean;
}

export const unseen = (): Words => ({ label: { x: 0, y: 0, op: 0 }, chip: { x: 0, y: 0, op: 0 }, own: true, leap: false });

/**
 * A step of `step` (the time passed over the time a fade takes) toward what the layout asks for: the label at `label`
 * (null: not on the line), the chip at `chip` (null: none). Each fades in where it is asked for and out where it is
 * not. If both are asked for the label is shown and the chip is not. While both can be seen they are at one place:
 * the one coming where it belongs, the one going drawn over it there (both going, the chip over the label).
 */
export function crossFade(w: Words, label: { x: number; y: number } | null, chip: { x: number; y: number } | null, step: number): void {
  const want = label ? null : chip;
  // (a chip whose place has leapt fades out first, then comes in again at its new place)
  const chipTo = want && !(w.leap && w.chip.op > 0) ? 1 : 0;
  const toward = (d: Drawn, to: number) => {
    d.op = to > d.op ? Math.min(to, d.op + step) : Math.max(to, d.op - step);
  };
  toward(w.label, label ? 1 : 0);
  toward(w.chip, chipTo);
  if (label) {
    w.label.x = label.x;
    w.label.y = label.y;
  }
  w.own = true;
  if (want && chipTo) {
    w.leap = false;
    w.chip.x = want.x;
    w.chip.y = want.y;
  }
  if (w.label.op > 0 && w.chip.op > 0) {
    if (chipTo && !label) {
      w.label.x = w.chip.x;
      w.label.y = w.chip.y;
    } else {
      w.chip.x = w.label.x;
      w.chip.y = w.label.y;
      w.own = false;
    }
  }
}
