import './fold.css';
import { prefs } from './prefs';
import type { Sheet } from './sheet';

/**
 * How a place folds on a phone (under 960 px wide or 520 px tall). The gallery is the first place built this way; the
 * launch site, on foot and the flight deck are to follow it:
 *
 * the view, one slim line across the top (the way back, the name, one control for the place) and one **handle** on
 * the bottom edge that holds the place's two or three first actions. Everything else is in the sheet the handle opens
 * (sheet.ts: tucked, half, full; upright it rises from the foot, on its side it is a drawer down the right). Nothing
 * else stands on the view and nothing opens by itself: choosing a part names it in the handle and leaves the sheet
 * where it was put.
 *
 * This file is what such a place uses to do that: moving its control block into the sheet's View pane and back as the
 * page narrows and widens, the handle's own button, and the hint that is shown once.
 */
export const NARROW = '(max-width: 960px), (max-height: 520px)';

/** The page is a phone's or a small tablet's: the layout above is in force. */
export const narrow = (): boolean => typeof matchMedia === 'function' && matchMedia(NARROW).matches;

/**
 * While the page is narrow each block lives in its slot (a place in a pane of the sheet); while it is wide it is back
 * where it was made. `changed` is told each time they move, and once at the start.
 */
export function dock(pairs: [block: HTMLElement, slot: HTMLElement][], changed: (narrow: boolean) => void = () => {}): void {
  const homes = pairs.map(([el]) => ({ el, parent: el.parentNode!, next: el.nextSibling }));
  const query = matchMedia(NARROW);
  const put = (): void => {
    if (query.matches) for (const [el, slot] of pairs) slot.append(el);
    else for (const { el, parent, next } of [...homes].reverse()) parent.insertBefore(el, next?.parentNode === parent ? next : null);
    changed(query.matches);
  };
  query.addEventListener('change', put);
  put();
}

/**
 * The handle's own button: a press opens the sheet at half or tucks it again, and it says which it would do. Where the
 * sheet was left is remembered (`sheetOpen`), so the page comes back the way it was left.
 */
export function handle(button: HTMLElement, panel: HTMLElement, sheet: Sheet): { shown(): void } {
  const shown = (): void => {
    const open = sheet.stop > 0;
    button.setAttribute('aria-expanded', String(open));
    if (narrow()) prefs.set('sheetOpen', open);
    if (open) prefs.set('handleSeen', true);
  };
  button.addEventListener('click', () => {
    if (narrow()) sheet.set(sheet.stop > 0 ? 0 : 1);
  });
  if (narrow() && prefs.get('sheetOpen')) panel.classList.add('open');
  shown();
  return { shown };
}

/**
 * On a first visit, one line in the place's stack of passing notes saying what the handle holds. Shown once and
 * remembered; nothing modal: the page is in use under it. Not for a browser driven by a script (whose pictures are of
 * the page at rest) unless it asks: `?hint`.
 */
export function hintOnce(stack: HTMLElement, title: string, line: string): void {
  if (!narrow() || prefs.get('handleSeen')) return;
  if (navigator.webdriver && !location.search.includes('hint')) return;
  prefs.set('handleSeen', true);
  sayIn(stack, title, line, true);
}

/**
 * How tall a sheet is with its View pane open and nothing in the pane scrolled out of sight, pixels (0 on a wide page,
 * or with nothing in the pane). Measured with the sheet as it would be open, whether or not it is: nothing is drawn
 * in between.
 */
export function viewHeight(panel: HTMLElement): number {
  const pane = panel.querySelector<HTMLElement>('[data-pane=View]');
  if (!pane || pane.hidden || !narrow()) return 0;
  const moving = panel.classList.contains('moving');
  panel.classList.add('moving');
  // (as tall as what it holds, not as the room it has been given: or it would only ever grow)
  pane.style.flex = 'none';
  let tall = pane.scrollHeight + 2;
  pane.style.flex = '';
  for (const el of panel.querySelectorAll<HTMLElement>(':scope > :is(.tabs, .handle)')) tall += el.offsetHeight;
  if (!moving) panel.classList.remove('moving');
  const cs = getComputedStyle(panel);
  return Math.ceil(tall + Number.parseFloat(cs.paddingBottom) + Number.parseFloat(cs.borderTopWidth));
}

/**
 * Say something in a stack of passing notes (a place's `.notes`) for a moment; it goes by itself, and saying something
 * else replaces it. `long`: for a line that is read once and not again (a first visit's hint), it stays a while longer.
 */
export function sayIn(stack: HTMLElement, title: string, line: string, long = false): void {
  const had = stack.querySelector<HTMLElement>('.say');
  const el = had ?? document.createElement('p');
  if (!had) {
    el.className = 'say';
    el.setAttribute('role', 'status');
    stack.append(el);
    // (gone, it takes no room in the stack)
    el.addEventListener('animationend', () => (el.hidden = true));
  }
  el.hidden = false;
  const [b, span] = [document.createElement('b'), document.createElement('span')];
  b.textContent = title;
  span.textContent = line;
  el.replaceChildren(b, span);
  el.classList.remove('going');
  el.classList.toggle('long', long);
  void el.offsetWidth; // (so the fade starts again from the top)
  el.classList.add('going');
}
