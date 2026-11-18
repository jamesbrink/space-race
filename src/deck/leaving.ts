/**
 * What an act does to a run flown by hand, as a rule on its own so that it can be held to a table (tests/leaving.test.mjs).
 *
 * A run is at stake once the visitor has taken the flight over (it is no longer as flown) and it has not ended. Watching a
 * flight as flown loses nothing, and neither does leaving one that ended a while ago, whose result has been read.
 *
 * Such a run is never lost by going somewhere: it is kept. Within the flight (its Gallery, its Launch site, the deck put
 * away) the deck parks it with its clock stopped; beyond it (another flight, the Lineup, the front page, which is the page
 * opened again) and by the tab closed or loaded again it is written to the browser's storage (app/runs.ts, deck/tape.ts),
 * and Fly takes it up, now or days later, with the choice to resume or start over. So none of those ways asks anything.
 *
 * Only what really loses something is asked first: starting over while the run goes on (N, New flight; the kept flight's
 * own card is that question already, and the mark beside Fly that throws a kept flight away asks too), and a way beyond the
 * flight when the browser will not keep the run (storage off or full: then it asks, as it always did), or when the run
 * came down a moment ago (its result, not yet read, would go with it).
 */

/** What a flight deck knows of the run on it. */
export interface Stake {
  /** The flight has been taken over: the deck's mode is no longer "as flown". */
  byHand: boolean;
  /** The run has ended: landed, or broken up. */
  over: boolean;
  /** How long ago it ended, seconds of the page's own time; 0 while it has not. */
  since: number;
  /** The browser keeps runs (its storage takes them): one taken beyond the flight is written there and not lost. */
  saved: boolean;
}

/** How long after a run has ended a way out still asks: a press that was meant for something else, as it came down. */
export const GRACE = 4;

/** Where an act takes the visitor: within the flight, beyond it, or back to the pad (starting over). */
export type Way = 'within' | 'beyond' | 'again';
export type Verdict = 'free' | 'keep' | 'ask';

/** A hand-flown run that is going on, or that ended a moment ago. */
export const inProgress = (s: Stake): boolean => s.byHand && (!s.over || s.since < GRACE);

/**
 * What going `way` does to a run: nothing to lose (`free`), it is kept (`keep`: parked within the flight, written to the
 * browser's storage beyond it; only a run that has not ended, for there is nothing to resume after the landing), or the
 * page must ask (`ask`).
 */
export function verdict(s: Stake, way: Way): Verdict {
  if (!inProgress(s)) return 'free';
  if (way === 'again') return s.over ? 'free' : 'ask';
  if (s.over) return way === 'beyond' ? 'ask' : 'free';
  return way === 'within' || s.saved ? 'keep' : 'ask';
}
