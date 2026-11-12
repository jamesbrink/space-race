import { wheelZoom } from './maths.ts';

/**
 * The hands: what a mouse, a trackpad, fingers and keys do to the view, read off the page and handed
 * on in one vocabulary, the same in every rig.
 *
 *   drag (one finger)                  turn
 *   right or middle drag, Shift-drag   slide (two fingers moving together do the same)
 *   wheel, two-finger scroll, pinch    zoom (a trackpad's pinch arrives as a wheel with ctrlKey)
 *   two fingers turning                twist
 *   double click                       turn about what was clicked
 *   keys                               held, and read every frame by the rig
 *
 * A press that does not move is a click and belongs to whoever picks things: nothing here acts on
 * it, and the view is not counted as taken until the pointer has moved SLOP pixels.
 */
export interface Hands {
  /** The view is the camera's to move (nobody is being walked as). */
  on(): boolean;
  /** W A S D Q E belong to something else just now (a vehicle being flown). */
  spoken(): boolean;
  grab(): void;
  release(): void;
  drag(dx: number, dy: number, slide: boolean): void;
  /** Let go while moving: pixels a second. */
  fling(vx: number, vy: number): void;
  /** `fresh`: the start of a gesture, so what is under the pointer is looked up again. */
  zoom(nepers: number, x: number, y: number, fresh: boolean): void;
  twist(angle: number): void;
  pivotAt(x: number, y: number): void;
  /** A key the camera reads has gone down (`first`: not a repeat) or up. */
  key(key: string, down: boolean, first: boolean): void;
  shift(on: boolean): void;
  home(): void;
  clear(): void;
}

/** Pixels a press may wander and still be a click. */
const SLOP = 3;
/** A wheel event this long after the last, or this far from it, starts a new gesture: milliseconds, pixels. */
const WHEEL_GAP = 260;
const WHEEL_WANDER = 8;
/** A turn is flung if the pointer was still moving this recently when it was let go, milliseconds, and this fast, pixels a second: a view placed with care stays where it was put. */
const FLING_WINDOW = 90;
const FLING_LEAST = 220;
/** Two fingers must turn this far before the view twists with them, radians: a pinch is not a twist. */
const TWIST_SLOP = 0.1;

/** The keys the camera reads while held. The legend in the corner of the page (ui.ts) lists them. */
export const KEYS = new Set(['w', 'a', 's', 'd', 'q', 'e', 'r', 'f', '+', '=', '-', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);

export function listen(canvas: HTMLElement, hands: Hands): void {
  canvas.style.touchAction = 'none'; // the page does not scroll or zoom under a finger on the view
  const points = new Map<number, { x: number; y: number }>();
  let slide = false;
  let wandered = 0;
  let trail: { t: number; dx: number; dy: number }[] = [];
  let pair: { x: number; y: number; d: number; a: number } | null = null;
  let twisted = 0;
  let pinched = false;

  const measure = () => {
    const [a, b] = [...points.values()] as [{ x: number; y: number }, { x: number; y: number }];
    return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, d: Math.hypot(b.x - a.x, b.y - a.y), a: Math.atan2(b.y - a.y, b.x - a.x) };
  };

  canvas.addEventListener('pointerdown', (e) => {
    if (!hands.on() || points.size >= 2) return;
    points.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try {
      canvas.setPointerCapture(e.pointerId); // the drag goes on if the pointer leaves the view
    } catch {
      // (a pointer that is already gone cannot be captured)
    }
    trail = [];
    if (points.size === 1) {
      slide = e.pointerType === 'mouse' && (e.button !== 0 || e.shiftKey || e.ctrlKey || e.metaKey);
      wandered = 0;
      hands.grab();
    } else {
      pair = measure();
      twisted = 0;
      pinched = false;
    }
  });
  canvas.addEventListener('pointermove', (e) => {
    const p = points.get(e.pointerId);
    if (!p || !hands.on()) return;
    // measured from one event to the next: the browser's own movementX is scaled differently from one display to another
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    p.x = e.clientX;
    p.y = e.clientY;
    if (points.size === 1) {
      if (wandered < SLOP) {
        wandered += Math.hypot(dx, dy);
        if (wandered < SLOP) return;
      }
      hands.drag(dx, dy, slide);
      trail.push({ t: e.timeStamp, dx, dy });
      if (trail.length > 8) trail.shift();
      return;
    }
    if (!pair) return;
    const now = measure();
    hands.drag(now.x - pair.x, now.y - pair.y, true);
    if (pair.d > 1 && now.d > 1) hands.zoom(-Math.log(now.d / pair.d), now.x, now.y, !pinched);
    pinched = true;
    const turn = Math.atan2(Math.sin(now.a - pair.a), Math.cos(now.a - pair.a));
    if (Math.abs(twisted) < TWIST_SLOP) twisted += turn;
    else hands.twist(turn);
    pair = now;
  });
  const up = (e: PointerEvent) => {
    if (!points.delete(e.pointerId)) return;
    pair = null;
    if (points.size) {
      trail = []; // the finger left on the view goes on turning it, from where it is
      wandered = SLOP;
      slide = false;
      return;
    }
    const recent = trail.filter((s) => e.timeStamp - s.t < FLING_WINDOW);
    if (!slide && e.type === 'pointerup' && recent.length >= 2) {
      const seconds = Math.max(0.016, (e.timeStamp - recent[0]!.t) / 1000);
      const vx = recent.reduce((a, s) => a + s.dx, 0) / seconds;
      const vy = recent.reduce((a, s) => a + s.dy, 0) / seconds;
      if (Math.hypot(vx, vy) >= FLING_LEAST) hands.fling(vx, vy);
    }
    hands.release();
  };
  canvas.addEventListener('pointerup', up);
  canvas.addEventListener('pointercancel', up);

  let wheelAt = -Infinity;
  let wheelX = 0;
  let wheelY = 0;
  canvas.addEventListener(
    'wheel',
    (e) => {
      if (!hands.on()) return;
      e.preventDefault(); // (a pinch on a trackpad would otherwise zoom the page)
      const fresh = e.timeStamp - wheelAt > WHEEL_GAP || Math.hypot(e.clientX - wheelX, e.clientY - wheelY) > WHEEL_WANDER;
      wheelAt = e.timeStamp;
      if (fresh) {
        wheelX = e.clientX;
        wheelY = e.clientY;
      }
      hands.zoom(wheelZoom(e.deltaY, e.deltaMode, e.ctrlKey), e.clientX, e.clientY, fresh);
    },
    { passive: false },
  );
  canvas.addEventListener('dblclick', (e) => {
    if (hands.on()) hands.pivotAt(e.clientX, e.clientY);
  });

  window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    hands.shift(e.shiftKey);
    const el = e.target as HTMLElement;
    const typing = el.matches?.('input, textarea, select, [contenteditable]');
    const widget = key.startsWith('arrow') && el.closest?.('[role=tablist], input');
    if (e.metaKey || e.ctrlKey || e.altKey || typing || widget || !hands.on()) return;
    if (hands.spoken() && 'wasdqe'.includes(key)) return;
    if (key === '0') return hands.home(); // 0, since a laptop has no Home key
    if (!KEYS.has(key)) return;
    e.preventDefault();
    hands.key(key, true, !e.repeat);
  });
  window.addEventListener('keyup', (e) => {
    hands.shift(e.shiftKey);
    hands.key(e.key.toLowerCase(), false, false);
  });
  window.addEventListener('blur', () => {
    points.clear();
    pair = null;
    hands.clear();
  });
}
