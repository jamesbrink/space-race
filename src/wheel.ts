/**
 * A radial menu: a few choices set round a centre, picked by the direction you push toward
 * them. It is one component, used wherever a handful of verbs apply to one thing (today: what a
 * walker is looking at). It knows nothing about what the choices mean.
 *
 * Every way in works: the mouse's direction (captured or not) and a click, the arrow keys and
 * Enter, the digits, a tap. Escape, or the key that opened it, shuts it without choosing.
 */

export interface WheelItem {
  id: string;
  label: string;
}

/** Where item `i` of `count` sits on the unit circle, screen coordinates (y down): the first at the top, then clockwise. */
export function seat(i: number, count: number): [x: number, y: number] {
  const a = (i / Math.max(1, count)) * Math.PI * 2;
  return [Math.sin(a), -Math.cos(a)];
}

/**
 * Which item a push of (dx, dy) points at: the one whose seat is nearest in direction. A push
 * shorter than `dead` points at nothing. Exactly between two, the clockwise one.
 */
export function sector(dx: number, dy: number, count: number, dead = 0): number | null {
  if (count < 1 || Math.hypot(dx, dy) <= dead) return null;
  const turn = Math.atan2(dx, -dy) / (Math.PI * 2); // 0 at the top, clockwise, -0.5 to 0.5
  return (((Math.floor(turn * count + 0.5) % count) + count) % count) as number;
}

/** A choice's size on the page, or the room there is for all of them, CSS pixels. */
export interface Box {
  w: number;
  h: number;
}

/** The ring's least radii, across and down, pixels; the least clear space between two choices; and what is kept clear at the room's edges. */
export const RING: readonly [number, number] = [124, 102];
export const GAP = 8;
export const MARGIN = 10;
const LEAST = 48;

/**
 * Where the middle of each choice goes, pixels from the centre, so that no two overlap however many there are and
 * however long their names: each sits outward of its seat on an ellipse (its near edge on the ellipse, so a long name
 * grows away from the centre and not across it), and the ellipse is the smallest, from `RING` up, on which every pair
 * is `GAP` apart and all are clear of `keep`, the title in the middle. `reach` is how far below the centre the lowest
 * one ends. Null when no ellipse that fits in `room` will do (or only one so flat that a choice no longer lies the way
 * its seat does): then they are a list.
 */
export function spread(sizes: readonly Box[], room: Box, keep: Box): { at: [number, number][]; reach: number } | null {
  const count = sizes.length;
  const seats = sizes.map((_, i) => seat(i, count));
  // the most the ellipse can be, across and down, with every choice still inside the room
  let [mostX, mostY] = [Infinity, Infinity];
  sizes.forEach((b, i) => {
    const [x, y] = seats[i]!.map(Math.abs) as [number, number];
    if (x > 1e-9) mostX = Math.min(mostX, (room.w / 2 - MARGIN - ((1 + x) * b.w) / 2) / x);
    else if (b.w / 2 > room.w / 2 - MARGIN) mostX = -1;
    if (y > 1e-9) mostY = Math.min(mostY, (room.h / 2 - MARGIN - ((1 + y) * b.h) / 2) / y);
    else if (b.h / 2 > room.h / 2 - MARGIN) mostY = -1;
  });
  const apart = (a: [number, number], sa: Box, b: [number, number], sb: Box): boolean =>
    Math.abs(a[0] - b[0]) >= (sa.w + sb.w) / 2 + GAP - 1e-9 || Math.abs(a[1] - b[1]) >= (sa.h + sb.h) / 2 + GAP - 1e-9;
  // (a narrow room has a narrower ring than `RING`, down to `LEAST`: under that it is no ring)
  const [fromX, fromY] = [Math.min(RING[0], mostX), Math.min(RING[1], mostY)];
  if (fromX < LEAST || fromY < LEAST) return null;
  // wider first, then taller: a ring grows across before it grows down (names are wider than they are tall)
  for (let ry = fromY; ry <= mostY + 1e-9; ry += 6) {
    for (let rx = fromX; rx <= mostX + 1e-9 && rx <= Math.max(fromX, 2.2 * ry); rx += 6) {
      const at = seats.map(([x, y], i): [number, number] => [x * (rx + sizes[i]!.w / 2), y * (ry + sizes[i]!.h / 2)]);
      // (and each still lies the way its seat does, so a push toward it means it: a ring pulled too flat fails this)
      const clear = at.every(
        (a, i) =>
          sector(a[0], a[1], count) === i &&
          apart(a, sizes[i]!, [0, 0], keep) &&
          at.every((b, j) => j <= i || apart(a, sizes[i]!, b, sizes[j]!)),
      );
      if (clear) return { at, reach: Math.max(...at.map((a, i) => a[1] + sizes[i]!.h / 2)) };
    }
  }
  return null;
}

/** How far the captured mouse has to be pushed from the centre before it points at something, pixels; and the most it is let run. */
const DEAD = 14;
const LEASH = 60;

export class Wheel {
  private readonly el: HTMLElement;
  private readonly title: HTMLElement;
  private readonly ring: HTMLElement;
  private items: WheelItem[] = [];
  private at = 0;
  /** The captured mouse's push from the centre, pixels. */
  private pushX = 0;
  private pushY = 0;
  private onPick: (id: string) => void = () => {};
  private onClose: () => void = () => {};
  /** The key that opened it also shuts it. */
  private toggleKey = '';
  private openedAt = 0;

  constructor(parent: HTMLElement) {
    this.el = document.createElement('div');
    this.el.className = 'wheel';
    this.el.hidden = true;
    this.el.setAttribute('role', 'menu');
    this.el.innerHTML =
      '<p class="wheel-title"></p><div class="wheel-ring"></div><p class="wheel-hint"><span class="keys">Point and click, or press its number · <kbd>Esc</kbd> closes</span><span class="touch">Tap one · tap elsewhere to close</span></p>';
    this.title = this.el.querySelector('.wheel-title')!;
    this.ring = this.el.querySelector('.wheel-ring')!;
    parent.append(this.el);
    window.addEventListener('resize', () => this.place());
    this.ring.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
      if (b) this.pick(Number(b.dataset.item));
    });
    this.ring.addEventListener('pointerover', (e) => {
      const b = (e.target as HTMLElement).closest<HTMLElement>('[data-item]');
      if (b) this.point(Number(b.dataset.item));
    });
    // a click outside the choices shuts it (but not the lifting of the finger whose rest opened it)
    this.el.addEventListener('click', (e) => {
      if (e.target === this.el && performance.now() - this.openedAt > 400) this.close();
    });
    // capture: while it is open the keys are its own, whatever else is listening
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.isOpen || e.metaKey || e.ctrlKey || e.altKey) return;
        const key = e.key.toLowerCase();
        const arrows: Record<string, [number, number]> = { arrowup: [0, -1], arrowright: [1, 0], arrowdown: [0, 1], arrowleft: [-1, 0] };
        if (arrows[key] && this.listed)
          this.point((this.at + (arrows[key][0] + arrows[key][1] > 0 ? 1 : this.items.length - 1)) % this.items.length);
        else if (arrows[key]) this.aim(...arrows[key]);
        else if (key === 'enter' || key === ' ') this.pick(this.at);
        else if (key === 'tab') this.point((this.at + (e.shiftKey ? this.items.length - 1 : 1)) % this.items.length);
        else if (/^[1-9]$/.test(key) && Number(key) <= this.items.length) this.pick(Number(key) - 1);
        else if (key === this.toggleKey) this.close();
        else if (key !== 'escape') return; // Escape is left to whoever has the controls: it may arrive as a lost pointer instead
        if (key !== 'escape') {
          e.preventDefault();
          e.stopImmediatePropagation();
        }
      },
      true,
    );
  }

  get isOpen(): boolean {
    return !this.el.hidden;
  }

  /** The choices are a list down the middle, there being no room for a ring of them. */
  private get listed(): boolean {
    return this.el.classList.contains('listed');
  }

  /**
   * Show these choices under a title. `onPick` gets the id chosen; `onClose` is called however it
   * shuts, chosen or not, after `onPick`. `toggleKey` (lower case) is the key that opened it.
   */
  open(title: string, items: WheelItem[], onPick: (id: string) => void, onClose: () => void, toggleKey = ''): void {
    if (!items.length) return;
    this.items = items;
    this.onPick = onPick;
    this.onClose = onClose;
    this.toggleKey = toggleKey;
    this.title.textContent = title;
    this.el.setAttribute('aria-label', title);
    this.ring.innerHTML = items
      .map((_, i) => `<button role="menuitem" data-item="${i}"><kbd>${i + 1}</kbd><span></span></button>`)
      .join('');
    this.ring.querySelectorAll('span').forEach((s, i) => (s.textContent = items[i]!.label));
    this.el.hidden = false;
    this.place();
    this.openedAt = performance.now();
    this.el.classList.remove('pushed');
    this.el.style.removeProperty('--px');
    this.el.style.removeProperty('--py');
    this.pushX = this.pushY = 0;
    this.point(0);
  }

  /**
   * Set the choices out: round the centre where a ring of them fits the window with none touching another (`spread`),
   * and otherwise as a list down the middle. Measured as they stand, so it is their real sizes that are kept apart.
   */
  private place(): void {
    if (!this.isOpen) return;
    const buttons = [...this.ring.querySelectorAll<HTMLElement>('[data-item]')];
    this.el.classList.remove('listed');
    for (const b of buttons) b.style.removeProperty('left'), b.style.removeProperty('top');
    const sizes = buttons.map((b) => ({ w: b.offsetWidth, h: b.offsetHeight }));
    const hint = this.el.querySelector<HTMLElement>('.wheel-hint')!;
    // (the hint goes under the ring: the room the ring has is short by it, both ways, so the ring stays in the middle)
    const room = { w: this.el.clientWidth, h: this.el.clientHeight - 2 * (hint.offsetHeight + 16) };
    const laid = spread(sizes, room, { w: this.title.offsetWidth, h: this.title.offsetHeight });
    this.el.classList.toggle('listed', !laid);
    if (!laid) return;
    buttons.forEach((b, i) => {
      b.style.left = `${laid.at[i]![0].toFixed(1)}px`;
      b.style.top = `${laid.at[i]![1].toFixed(1)}px`;
    });
    this.el.style.setProperty('--reach', `${laid.reach.toFixed(1)}px`);
  }

  /** Shut it without choosing. */
  close(): void {
    if (!this.isOpen) return;
    this.el.hidden = true;
    this.onClose();
  }

  /** The captured mouse moved: push toward a choice. (An uncaptured one just hovers over them.) */
  nudge(dx: number, dy: number): void {
    if (!this.isOpen) return;
    this.pushX += dx;
    this.pushY += dy;
    this.el.classList.add('pushed');
    const length = Math.hypot(this.pushX, this.pushY);
    if (length > LEASH) {
      this.pushX *= LEASH / length;
      this.pushY *= LEASH / length;
    }
    this.el.style.setProperty('--px', `${this.pushX}px`);
    this.el.style.setProperty('--py', `${this.pushY}px`);
    // (down a list, the push picks by how far down it is)
    if (this.listed) this.point(Math.round(((this.pushY + LEASH) / (2 * LEASH)) * (this.items.length - 1)));
    else this.aim(this.pushX, this.pushY, DEAD);
  }

  /** Choose what is pointed at (a click with the mouse captured lands on no button). */
  confirm(): void {
    if (this.isOpen) this.pick(this.at);
  }

  private aim(dx: number, dy: number, dead = 0): void {
    const to = sector(dx, dy, this.items.length, dead);
    if (to !== null) this.point(to);
  }

  private point(i: number): void {
    this.at = i;
    this.ring.querySelectorAll<HTMLElement>('[data-item]').forEach((b, n) => {
      b.classList.toggle('hot', n === i);
      b.tabIndex = n === i ? 0 : -1;
      if (n === i) b.focus({ preventScroll: true });
    });
  }

  private pick(i: number): void {
    const item = this.items[i];
    if (!item || !this.isOpen) return;
    this.el.hidden = true;
    this.onPick(item.id);
    this.onClose();
  }
}
