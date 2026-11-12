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
        if (arrows[key]) this.aim(...arrows[key]);
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
      .map((_, i) => {
        const [x, y] = seat(i, items.length);
        return `<button role="menuitem" data-item="${i}" style="--x:${x.toFixed(4)};--y:${y.toFixed(4)}"><kbd>${i + 1}</kbd><span></span></button>`;
      })
      .join('');
    this.ring.querySelectorAll('span').forEach((s, i) => (s.textContent = items[i]!.label));
    this.el.hidden = false;
    this.openedAt = performance.now();
    this.el.classList.remove('pushed');
    this.el.style.removeProperty('--px');
    this.el.style.removeProperty('--py');
    this.pushX = this.pushY = 0;
    this.point(0);
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
    this.aim(this.pushX, this.pushY, DEAD);
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
