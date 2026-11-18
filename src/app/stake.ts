/**
 * The one guard on every way out of a flight's page (another flight, the Lineup, the front page, each of which lets the
 * flight page go). A run flown by hand is not lost by them: the flight page's holder writes it to the browser's storage
 * as it is asked (deck.ts `risks`), and Fly takes it up again. Only where that cannot be done (the browser will not keep
 * it), or the run came down a moment ago, is anything lost (deck/leaving.ts), and then the way out asks first, and is let
 * go on only when the answer is Leave. Nothing else decides whether to ask: a new way out calls this, and no way out has
 * a check of its own.
 */
export interface Holder {
  /** Whether leaving the page now loses a hand-flown run: it is written down first if it can be, and then nothing is lost. */
  stakes(): boolean;
  /** Let it go, whatever it is: the deck is closed and what was kept is dropped. */
  end(): void;
  /** Put the question: `leave` if the answer is Leave, `stay` if it is Keep flying. */
  ask(leave: () => void, stay: () => void): void;
}

let holder: Holder | null = null;

/** The flight page now up holds (or, null, no longer holds) what leaving could lose. */
export function holds(h: Holder | null): void {
  holder = h;
}

/** Whether leaving the page now loses a flight. */
export const loses = (): boolean => holder?.stakes() ?? false;

/**
 * Ask before going, if going loses a flight. True: it has asked, and `go` is called only if the answer is Leave (after the
 * flight has been let go), `stay` otherwise. False: nothing is lost and nothing has been asked: the caller goes on.
 */
export function guarded(go: () => void, stay: () => void = () => {}): boolean {
  const h = holder;
  if (!h?.stakes()) return false;
  h.ask(() => {
    h.end();
    go();
  }, stay);
  return true;
}
