import type { Part } from '../types';
import { partProgress } from './explode.ts';

/**
 * Names on the parts of a thing taken apart: each a small label out to one side, joined to its
 * part by a leader, as in an exploded drawing. A part is named once it has come clear of the
 * parts beside it, so the names arrive as the thing opens; they stand in a column each side, never
 * on top of one another; and each is a button (the caller says what choosing one does).
 *
 * Which parts are clear and where the labels go is arithmetic (`cleared`, `layOut`:
 * tests/labels.test.mjs); `Labels` only draws the answer.
 */

/** How much of the gap two neighbours will end up with must have opened before either is named. */
const CLEAR = 0.3;

/**
 * Which parts have come clear of their neighbours with the slider at `t`. A part's neighbours are
 * the nearest listed before and after it that do not travel with it; it is clear of one when the gap between them is `CLEAR`
 * of what it will be fully apart. Two that leave together and stay together (the same `explode`)
 * do not hold each other back; a part that does not move is clear when its neighbours have left it.
 * Parts with motions of their own (`moves`) are not judged: they are not part of an exploded view.
 * `orders` is the highest `order` the slider is timed by, where `parts` are only some of a model's.
 */
export function cleared(
  parts: readonly Pick<Part, 'explode' | 'order' | 'moves'>[],
  t: number,
  orders = Math.max(0, ...parts.map((p) => p.order)),
): boolean[] {
  const gone = parts.map((p) => {
    const k = partProgress(t, p.order, orders);
    return p.explode.map((v) => v * k) as [number, number, number];
  });
  const far = (a: readonly number[], b: readonly number[]) => Math.hypot(a[0]! - b[0]!, a[1]! - b[1]!, a[2]! - b[2]!);
  return parts.map((p, i) => {
    if (p.moves?.length) return false;
    let judged = false;
    for (const step of [-1, 1]) {
      // (the nearest part each way that it parts from: ones that travel with it are passed over)
      let j = i + step;
      while (parts[j] && (parts[j]!.moves?.length || far(p.explode, parts[j]!.explode) < 1e-6)) j += step;
      const q = parts[j];
      if (!q) continue;
      const final = far(p.explode, q.explode);
      judged = true;
      if (far(gone[i]!, gone[j]!) < CLEAR * final) return false;
    }
    return judged;
  });
}

/** Something to be named: where its middle is on the page, how far out from it its body reaches, and how wide its name will be, all in pixels. */
export interface Anchor {
  id: string;
  x: number;
  y: number;
  r: number;
  width: number;
}

/** Where a label goes: its near edge at `x` (it runs away from the part), its middle at `y`. */
export interface Placed {
  id: string;
  side: 'left' | 'right';
  x: number;
  y: number;
  /** The part's own middle, where the leader starts. */
  from: { x: number; y: number };
}

export interface Frame {
  left: number;
  right: number;
  top: number;
  bottom: number;
}

/** A label's height and the least room between two, pixels. */
export const LABEL_H = 22;
const GAP = 5;
/** How far beyond the widest part the column of labels stands. */
const OUT = 30;

/**
 * Lay the labels out in `frame` (the part of the page left clear). Each part's label goes to the
 * side its part is on, measured from the middle of them all (a stack's are all in line: those go
 * right); a side's labels share one column, just beyond the widest part on that side, and are
 * spread down it in the order of their parts, no two closer than a label and a gap. A part off
 * the frame is not named; a column with more names than it has room for keeps as many as fit,
 * the ones nearest the middle of the frame. `bodies` is every part that is on show, named or not (a half-fairing that has
 * not come clear yet is not named but is still there): the column stands beyond the widest of them, not only of the named.
 */
export function layOut(anchors: readonly Anchor[], frame: Frame, bodies: readonly Anchor[] = anchors): Placed[] {
  const seen = anchors.filter((a) => a.x >= frame.left && a.x <= frame.right && a.y >= frame.top && a.y <= frame.bottom);
  if (!seen.length) return [];
  const xs = seen.map((a) => a.x).sort((a, b) => a - b);
  const axis = xs[Math.floor(xs.length / 2)]!;
  const out: Placed[] = [];
  for (const side of ['right', 'left'] as const) {
    // (a part well to the left of the rest is named on the left; everything else on the right, where a stack's names read down)
    let column = seen.filter((a) => (a.x < axis - Math.max(18, 0.5 * a.r) ? 'left' : 'right') === side);
    if (!column.length) continue;
    const room = Math.max(1, Math.floor((frame.bottom - frame.top + GAP) / (LABEL_H + GAP)));
    if (column.length > room) {
      const mid = (frame.top + frame.bottom) / 2;
      column = [...column].sort((a, b) => Math.abs(a.y - mid) - Math.abs(b.y - mid)).slice(0, room);
    }
    column.sort((a, b) => a.y - b.y);
    const widest = Math.max(...column.map((a) => a.width));
    const mine = bodies.filter((a) => (a.x < axis - Math.max(18, 0.5 * a.r) ? 'left' : 'right') === side);
    const reach = [...column, ...mine];
    const edge = side === 'right' ? Math.max(...reach.map((a) => a.x + a.r)) : Math.min(...reach.map((a) => a.x - a.r));
    // the column never leaves the frame: against its edge, a label lies over the part it names rather than off the page
    const x = side === 'right' ? Math.min(edge + OUT, frame.right - widest) : Math.max(edge - OUT, frame.left + widest);
    const ys = spread(
      column.map((a) => a.y),
      frame.top + LABEL_H / 2,
      frame.bottom - LABEL_H / 2,
      LABEL_H + GAP,
    );
    column.forEach((a, i) => out.push({ id: a.id, side, x, y: ys[i]!, from: { x: a.x, y: a.y } }));
  }
  return out;
}

/**
 * Move sorted positions apart until no two are closer than `least`, each as near where it wanted
 * to be as that allows, all within [`low`, `high`] (which has room for them: `layOut` sees to it).
 */
export function spread(wanted: readonly number[], low: number, high: number, least: number): number[] {
  const ys = wanted.map((y) => Math.min(high, Math.max(low, y)));
  // down the column, each pushed below the one before; then back up from the foot, each pushed above the one after
  for (let i = 1; i < ys.length; i++) ys[i] = Math.max(ys[i]!, ys[i - 1]! + least);
  if (ys.length && ys.at(-1)! > high) {
    ys[ys.length - 1] = high;
    for (let i = ys.length - 2; i >= 0; i--) ys[i] = Math.min(ys[i]!, ys[i + 1]! - least);
  }
  // (what the two passes leave is pushed apart but leans down: each run of touching labels is centred on what it wanted)
  let i = 0;
  while (i < ys.length) {
    let j = i;
    while (j + 1 < ys.length && ys[j + 1]! - ys[j]! <= least + 1e-6) j++;
    if (j > i) {
      let want = 0;
      for (let k = i; k <= j; k++) want += Math.min(high, Math.max(low, wanted[k]!)) - (ys[i]! + (k - i) * least);
      const above = i > 0 ? ys[i]! - (ys[i - 1]! + least) : ys[i]! - low;
      const below = j + 1 < ys.length ? ys[j + 1]! - least - ys[j]! : high - ys[j]!;
      const shift = Math.max(-above, Math.min(below, want / (j - i + 1)));
      for (let k = i; k <= j; k++) ys[k] = ys[k]! + shift;
    }
    i = j + 1;
  }
  return ys;
}

export interface LabelHost {
  /** A label was chosen. */
  choose(id: string): void;
  /** The pointer is on a label, or has left them. */
  hover(id: string | null): void;
}

/** How wide a pin is: a part's number in place of its name, where the names would lie on the thing itself. */
export const PIN_W = 26;

/**
 * Whether a column of labels lies on the thing it names: its near edge is inside the reach of the parts (with `air`
 * pixels to spare). The names are then too wide for the room beside it, and numbers stand in for them (`Labels.pins`).
 */
export function covers(anchors: readonly Anchor[], placed: readonly Placed[], air = 6, bodies: readonly Anchor[] = anchors): boolean {
  if (!anchors.length) return false;
  const all = [...anchors, ...bodies];
  const right = Math.max(...all.map((a) => a.x + a.r));
  const left = Math.min(...all.map((a) => a.x - a.r));
  return placed.some((p) => (p.side === 'right' ? p.x < right + air : p.x > left - air));
}

/** How wide a name will be drawn, pixels: ten-pixel capitals a tenth apart, and the label's padding. Measured, not guessed, once the page has drawn one. */
const widthOf = (name: string): number => Math.min(190, name.length * 7.25 + 22);

/** The labels, drawn: a button for each name and one SVG of leaders under them. */
export class Labels {
  private readonly root: HTMLElement;
  private readonly lines: SVGSVGElement;
  private readonly made = new Map<string, { button: HTMLButtonElement; line: SVGPolylineElement; dot: SVGCircleElement; width: number }>();
  private selected: string | null = null;
  private hot: string | null = null;
  private numbered = false;
  /** Where the labels last put on show are, in the page: for what else is written on the picture and must keep off them. */
  boxes: { left: number; top: number; right: number; bottom: number }[] = [];

  constructor(parent: HTMLElement, host: LabelHost) {
    this.root = document.createElement('div');
    this.root.className = 'part-labels';
    this.root.innerHTML = '<svg aria-hidden="true"></svg>';
    this.lines = this.root.querySelector('svg')!;
    parent.append(this.root);
    this.root.addEventListener('click', (e) => {
      const id = (e.target as HTMLElement).closest<HTMLElement>('[data-label]')?.dataset.label;
      if (id) host.choose(id);
    });
    this.root.addEventListener('pointerover', (e) =>
      host.hover((e.target as HTMLElement).closest<HTMLElement>('[data-label]')?.dataset.label ?? null),
    );
    this.root.addEventListener('pointerleave', () => host.hover(null));
  }

  /** The names there are to show, by id. Buttons are made once and kept. */
  name(names: readonly { id: string; name: string; n?: number }[]): void {
    for (const { button, line, dot } of this.made.values()) {
      button.remove();
      line.remove();
      dot.remove();
    }
    this.made.clear();
    for (const { id, name, n } of names) {
      const button = document.createElement('button');
      button.dataset.label = id;
      button.title = name;
      // (its name, and its number in the parts list for when there is only room for a pin)
      button.innerHTML = '<i></i><span></span>';
      button.querySelector('i')!.textContent = n === undefined ? '' : String(n).padStart(2, '0');
      button.querySelector('span')!.textContent = name;
      button.tabIndex = -1; // (the parts list is the way to them by key: these are the same choices, on the picture)
      const ns = 'http://www.w3.org/2000/svg';
      const line = document.createElementNS(ns, 'polyline');
      const dot = document.createElementNS(ns, 'circle');
      dot.setAttribute('r', '2.5');
      this.lines.append(line, dot);
      this.root.append(button);
      this.made.set(id, { button, line, dot, width: widthOf(name) });
    }
  }

  /** How wide a label is, for laying out. */
  width(id: string): number {
    const made = this.made.get(id);
    if (!made) return 0;
    if (this.numbered) return PIN_W;
    // (the real width once it has been drawn; before that, an estimate from its length)
    const drawn = made.button.offsetWidth;
    if (drawn && !this.root.classList.contains('pins')) made.width = drawn;
    return made.width;
  }

  /** Numbers in place of names (pins), or names again: for the widths asked for next and the labels placed next. */
  pins(on: boolean): void {
    this.numbered = on;
  }

  get pinned(): boolean {
    return this.numbered;
  }

  /** Which one is marked as chosen, and which as under the pointer. */
  mark(selected: string | null, hot: string | null): void {
    if (selected === this.selected && hot === this.hot) return;
    this.selected = selected;
    this.hot = hot;
    for (const [id, { button, line }] of this.made) {
      button.classList.toggle('on', id === selected);
      button.classList.toggle('hot', id === hot);
      line.classList.toggle('on', id === selected || id === hot);
    }
  }

  /** Show these where they have been laid out; every other label goes. */
  place(placed: readonly Placed[]): void {
    const shown = new Set(placed.map((p) => p.id));
    this.root.classList.toggle('pins', this.numbered);
    this.boxes = [];
    for (const [id, { button, line, dot }] of this.made) {
      const on = shown.has(id);
      button.classList.toggle('shown', on);
      line.classList.toggle('shown', on);
      dot.classList.toggle('shown', on);
    }
    for (const p of placed) {
      const made = this.made.get(p.id);
      if (!made) continue;
      const right = p.side === 'right';
      const width = this.numbered ? PIN_W : made.width;
      made.button.classList.toggle('left', !right);
      made.button.style.transform = `translate(${Math.round(right ? p.x : p.x - width)}px, ${Math.round(p.y - LABEL_H / 2)}px)`;
      const left = right ? p.x : p.x - width;
      this.boxes.push({ left, top: p.y - LABEL_H / 2, right: left + width, bottom: p.y + LABEL_H / 2 });
      // the leader leaves the part for a point just short of the label, then runs level into it
      const elbow = p.x - (right ? 12 : -12);
      made.line.setAttribute('points', `${r(p.from.x)},${r(p.from.y)} ${r(elbow)},${r(p.y)} ${r(p.x)},${r(p.y)}`);
      made.dot.setAttribute('cx', r(p.from.x));
      made.dot.setAttribute('cy', r(p.from.y));
    }
  }

  clear(): void {
    this.place([]);
  }
}

const r = (v: number): string => String(Math.round(v * 2) / 2);
