/**
 * When leaving a flight would lose something, as a rule on its own so that it can be held to a table (tests/leaving.test.mjs):
 * the visitor has taken the flight over (it is no longer as flown) and that run has not ended. Watching a flight as flown
 * loses nothing, and neither does leaving one that ended a while ago, whose result has been read.
 *
 * Where it goes decides what happens to such a run. Within the flight (its Gallery, its Launch site, and the deck again) the
 * deck keeps it, parked with its clock stopped, and Fly resumes it where it was left: nothing is lost, so nothing is asked.
 * Beyond it (another flight, the Lineup, the front page, which is the page opened again) nothing can be kept: the page
 * asks first.
 */

/** What a flight deck knows of the run on it. */
export interface Stake {
  /** The flight has been taken over: the deck's mode is no longer "as flown". */
  byHand: boolean;
  /** The run has ended: landed, or broken up. */
  over: boolean;
  /** How long ago it ended, seconds of the page's own time; 0 while it has not. */
  since: number;
}

/** How long after a run has ended a way out still asks: a press that was meant for something else, as it came down. */
export const GRACE = 4;

export type Way = 'within' | 'beyond';
export type Verdict = 'free' | 'keep' | 'ask';

/** A hand-flown run that is going on, or that ended a moment ago. */
export const inProgress = (s: Stake): boolean => s.byHand && (!s.over || s.since < GRACE);

/**
 * What going `way` does to a run: nothing to lose (`free`), the deck keeps it (`keep`: within the flight, and only a run
 * that has not ended, for there is nothing to resume after the landing), or the page must ask (`ask`).
 */
export function verdict(s: Stake, way: Way): Verdict {
  if (!inProgress(s)) return 'free';
  if (way === 'beyond') return 'ask';
  return s.over ? 'free' : 'keep';
}
