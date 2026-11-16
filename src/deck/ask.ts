import '../ui/cockpit.css';
import type { Clock } from '../world/clock.ts';
import { is, kbd, keyOf } from '../util/keys.ts';

/**
 * The question asked before a way out that would lose a flight flown by hand (leaving.ts says when): a small panel in the
 * deck's own style over the middle of the page, not a window of the browser's. Two answers, "Keep flying" (the one that is
 * focused, that Escape and a press anywhere else choose, and that Enter takes: the safe answer is the default) and "Leave".
 *
 * While it is up the clock is held, so nothing is lost while deciding, and no key of the page acts: one listener at the
 * window before any other hears the key (as the curtain's, app/curtain.ts), so nothing that listens for keys has to know of
 * it. It is an alert dialog for assistive technology, its focus kept inside it and given back afterwards.
 */
export interface Asking {
  /** What the question is put over. */
  parent: HTMLElement;
  clock: Clock;
  /** Said under the title: what would be lost. */
  line: string;
  /** Leave: the flight is let go (told after the question has gone). */
  leave(): void;
  /** Keep flying: the question has gone and the clock runs as it did. */
  stay(): void;
}

let count = 0;
/** The question that is up, if any. */
let open: HTMLElement | null = null;

/** Whether a question is up. */
export const asking = (): boolean => open !== null;

export function ask(o: Asking): void {
  if (open) return; // (one at a time: a second way out while it is up is the same question)
  const id = `ask-${++count}`;
  const back = document.createElement('div');
  back.className = 'deck-ask';
  back.innerHTML = `
    <section class="deck-ask-box" role="alertdialog" aria-modal="true" aria-labelledby="${id}-t" aria-describedby="${id}-d">
      <h3 id="${id}-t">Leave this flight?</h3>
      <p id="${id}-d" class="cockpit-why">${o.line}</p>
      <p class="deck-ask-do">
        <button data-ask="stay" title="Keep flying (Esc)">${kbd('ask.stay')}Keep flying</button>
        <button data-ask="leave" title="Leave, and lose the flight (L)">${kbd('ask.leave')}Leave</button>
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
    window.removeEventListener('keydown', gate, true);
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
    if (e.repeat) return e.preventDefault();
    if (is(key, 'ask.stay')) {
      e.preventDefault();
      answer(false);
    } else if (is(key, 'ask.leave')) {
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
  window.addEventListener('keydown', gate, true);
  o.parent.append(back);
  stay.focus();
}
