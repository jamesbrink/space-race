import '../ui/cockpit.css';
import type { Clock } from '../world/clock.ts';
import { capsOf, is, kbd, type KeyName, keyOf } from '../util/keys.ts';

/**
 * The question asked before an act that would lose a flight flown by hand (leaving.ts says which): a small panel in the
 * deck's own style over the middle of the page, not a window of the browser's. Two answers, the safe one ("Keep flying":
 * the one that is focused, that Escape and a press anywhere else choose, and that Enter takes: it is the default) and the
 * act ("Leave", "Start over", "Throw away"), each with its key.
 *
 * While it is up the clock is held, so nothing is lost while deciding, and no key of the page acts: one listener at the
 * window before any other hears the key (as the curtain's, app/curtain.ts), so nothing that listens for keys has to know of
 * it. It is an alert dialog for assistive technology, its focus kept inside it and given back afterwards.
 */
export interface Asking {
  /** What the question is put over. */
  parent: HTMLElement;
  clock: Clock;
  /** The question, and said under it what would be lost. */
  title: string;
  line: string;
  /** The act's answer: its words and its key (`ask.leave`, `ask.again`); and the safe answer's words. */
  go: string;
  key: KeyName;
  stayLabel: string;
  /** The act: the flight is let go (told after the question has gone). */
  leave(): void;
  /** The safe answer: the question has gone and the clock runs as it did. */
  stay(): void;
}

let count = 0;
/** The question that is up, if any. */
let open: HTMLElement | null = null;
/** What the one that is up does with a key. */
let hear: ((e: KeyboardEvent) => void) | null = null;

// One listener, taken when this module is: before the page's own listeners are made (the gallery's, the deck's), so that none
// of them is ahead of it at the window, as the curtain's is (app/curtain.ts).
if (typeof window !== 'undefined') window.addEventListener('keydown', (e) => hear?.(e), true);

/** Whether a question is up. */
export const asking = (): boolean => open !== null;

export function ask(o: Asking): void {
  if (open) return; // (one at a time: a second way out while it is up is the same question)
  const id = `ask-${++count}`;
  const back = document.createElement('div');
  back.className = 'deck-ask';
  back.innerHTML = `
    <section class="deck-ask-box" role="alertdialog" aria-modal="true" aria-labelledby="${id}-t" aria-describedby="${id}-d">
      <h3 id="${id}-t">${o.title}</h3>
      <p id="${id}-d" class="cockpit-why">${o.line}</p>
      <p class="deck-ask-do">
        <button data-ask="stay" title="${o.stayLabel} (${capsOf('ask.stay').join(' ')})">${kbd('ask.stay')}${o.stayLabel}</button>
        <button data-ask="leave" title="${o.go}, and lose the flight (${capsOf(o.key).join(' ')})">${kbd(o.key)}${o.go}</button>
      </p>
    </section>`;
  open = back;
  const before = document.activeElement as HTMLElement | null;
  const wasRunning = o.clock.running;
  o.clock.pause();
  const unhold = o.clock.listen(() => o.clock.running && o.clock.pause()); // (a scrub or a key of the bar's cannot start it under the question)
  const buttons = [...back.querySelectorAll<HTMLButtonElement>('button')];
  const [stay, leave] = buttons as [HTMLButtonElement, HTMLButtonElement];

  const close = (): void => {
    hear = null;
    unhold();
    back.remove();
    open = null;
    before?.isConnected && before !== document.body ? before.focus?.() : (document.activeElement as HTMLElement | null)?.blur?.();
  };
  const answer = (leaving: boolean): void => {
    close();
    if (leaving) o.leave();
    else {
      if (wasRunning) o.clock.play(true);
      o.stay();
    }
  };
  function gate(e: KeyboardEvent): void {
    if (e.metaKey || e.ctrlKey || e.altKey) return; // (the browser's own)
    e.stopImmediatePropagation();
    const key = keyOf(e);
    if (e.repeat) {
      e.preventDefault();
      return;
    }
    if (is(key, 'ask.stay')) {
      e.preventDefault();
      answer(false);
    } else if (is(key, o.key)) {
      e.preventDefault();
      answer(true);
    } else if (is(key, 'ask.step')) {
      // (focus stays between the two)
      e.preventDefault();
      (document.activeElement === stay ? leave : stay).focus();
    } else if (is(key, 'ask.press')) {
      // (what is focused is pressed; Keep flying has it from the start)
      e.preventDefault();
      (buttons.includes(document.activeElement as HTMLButtonElement) ? (document.activeElement as HTMLButtonElement) : stay).click();
    }
  }
  back.addEventListener('click', (e) => {
    const b = (e.target as HTMLElement).closest<HTMLButtonElement>('button');
    if (b) answer(b.dataset.ask === 'leave');
    else if (e.target === back) answer(false); // (a press anywhere else is the safe answer)
  });
  hear = gate;
  o.parent.append(back);
  stay.focus();
}
