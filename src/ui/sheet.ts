import './sheet.css';

/**
 * The data panel on a phone is a sheet at the foot of the page, and this is how a finger moves it:
 * the one way, for the launch site's panel (ui.ts) and the gallery's (gallery.ts).
 *
 * It rests at one of three stops: **tucked** (its row of tabs), **half** (`open`: the lower part of
 * the page, the model keeping the rest) and **full** (`open full`: up to under the title). Taken
 * by its tabs or its grip it follows the finger and, let go, settles at the stop it was nearest or
 * was being thrown toward (the next one that way from where it had got to): never between two. Inside its list a finger scrolls the list; only a
 * pull down on a list already at its top takes the sheet, as a pull on its tabs does. While the
 * sheet has the finger the page does not move under it (no pull-to-refresh, no bounce): the tabs
 * take no browser gesture at all (sheet.css), and the one handler that must refuse a gesture in
 * the list is the only one that is not passive.
 *
 * The stops are classes, so everything that follows the sheet (the canvas above it, the controls
 * it covers: style.css) follows them; its height while a finger has it is the only thing set here.
 */
const PHONE = '(max-width: 960px) and (min-height: 521px)';
/** Pixels a finger moves before it has said which way it is going. */
const SLOP = 6;
/** Pixels a second: let go faster than this, the sheet goes on to the next stop that way. */
const THROW = 450;

export type Stop = 0 | 1 | 2;

export interface Sheet {
  /** The stop it is at. */
  readonly stop: Stop;
  /** Put it at a stop. */
  set(stop: Stop): void;
}

/** Make `panel` a sheet. `settled` is told each time it comes to rest at a stop, by a finger or by `set`. */
export function sheet(panel: HTMLElement, settled: (stop: Stop) => void = () => {}): Sheet {
  const phone = () => matchMedia(PHONE).matches;
  const stopNow = (): Stop => (!panel.classList.contains('open') ? 0 : panel.classList.contains('full') ? 2 : 1);
  /** How tall it is at each stop, measured and not assumed (the stylesheet says, in units that follow the browser's bars). */
  const heights = (): [number, number, number] => {
    const was = [panel.className, panel.style.height, panel.style.transition] as const;
    panel.style.transition = 'none';
    panel.style.height = '';
    const at = (cls: string) => {
      panel.classList.remove('open', 'full');
      if (cls) panel.classList.add(...cls.split(' '));
      return panel.getBoundingClientRect().height;
    };
    const all: [number, number, number] = [at(''), at('open'), at('open full')];
    panel.className = was[0];
    panel.style.height = was[1];
    void panel.offsetHeight;
    panel.style.transition = was[2];
    return all;
  };
  const set = (stop: Stop): void => {
    panel.style.transition = '';
    panel.style.height = '';
    panel.classList.toggle('open', stop > 0);
    panel.classList.toggle('full', stop === 2);
    settled(stop);
  };

  let touch: {
    y: number;
    from: number;
    stops: [number, number, number];
    x: number;
    pane: HTMLElement | null;
    dragging: boolean | null;
    last: { y: number; t: number };
    speed: number;
  } | null = null;

  panel.addEventListener(
    'touchstart',
    (e) => {
      touch = null;
      if (!phone() || e.touches.length !== 1) return;
      const target = e.target as HTMLElement;
      // (a slider in the panel is the finger's own business)
      if (target.closest('input')) return;
      const y = e.touches[0]!.clientY;
      touch = {
        y,
        x: e.touches[0]!.clientX,
        from: panel.getBoundingClientRect().height,
        stops: heights(),
        pane: target.closest<HTMLElement>('[data-pane]'),
        dragging: null,
        last: { y, t: e.timeStamp },
        speed: 0,
      };
    },
    { passive: true },
  );
  panel.addEventListener(
    'touchmove',
    (e) => {
      if (!touch) return;
      const y = e.touches[0]!.clientY;
      const dy = y - touch.y;
      if (touch.dragging === null) {
        const dx = e.touches[0]!.clientX - touch.x;
        if (Math.max(Math.abs(dx), Math.abs(dy)) < SLOP) return;
        // a finger going more sideways than up or down is a row's that scrolls sideways (the View pane's), never the
        // sheet's: decided on the vertical alone, a thumb's sideways swipe that drifted 6 px down at the pane's top was
        // taken for a pull on the sheet and the row could not be moved
        if (Math.abs(dx) > Math.abs(dy)) return void (touch = null);
        // in the list a finger scrolls the list, unless it is pulling down a list that is already at its top
        touch.dragging = !touch.pane || (dy > 0 && touch.pane.scrollTop <= 0);
        if (!touch.dragging) return void (touch = null);
        panel.style.transition = 'none';
        panel.classList.add('moving'); // (what it holds is on show while it is pulled: sheet.css)
      }
      if (e.cancelable) e.preventDefault(); // the sheet has the finger: the page and the list stay where they are
      const dt = Math.max(1, e.timeStamp - touch.last.t);
      touch.speed = 0.6 * touch.speed + 0.4 * (((y - touch.last.y) / dt) * 1000);
      touch.last = { y, t: e.timeStamp };
      const [low, , high] = touch.stops;
      panel.style.height = `${Math.min(high, Math.max(low, touch.from - dy))}px`;
    },
    { passive: false },
  );
  const release = (): void => {
    const t = touch;
    touch = null;
    if (!t?.dragging) return;
    panel.classList.remove('moving');
    const now = panel.getBoundingClientRect().height;
    // the stop it is nearest; thrown, the next one that way from where it started
    let to = t.stops.reduce((best, h, i) => (Math.abs(h - now) < Math.abs(t.stops[best]! - now) ? i : best), 0);
    if (Math.abs(t.speed) > THROW) {
      // (the next one that way from where it has got to: a long pull from full goes past half to tucked)
      const up = t.speed < 0;
      const beyond = t.stops.map((h, i) => ({ h, i })).filter(({ h }) => (up ? h > now + 1 : h < now - 1));
      to = beyond.length ? (up ? beyond[0]!.i : beyond.at(-1)!.i) : up ? 2 : 0;
    }
    // from where the finger left it to the stop: the height is the stylesheet's again, and the change is eased
    panel.style.height = `${now}px`;
    void panel.offsetHeight;
    set(to as Stop);
  };
  panel.addEventListener('touchend', release);
  panel.addEventListener('touchcancel', release);

  return {
    get stop() {
      return stopNow();
    },
    set,
  };
}
