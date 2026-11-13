/**
 * The recorded misses: where a flown run falls outside a documented check's tolerance, and why. One place, read by
 * the tests (tests/sim.test.mjs holds each run to what is written here: an unrecorded miss fails, and so does a
 * recorded one that has gone away or grown) and by the debrief (cockpit.ts), which says beside a figure that its
 * miss is known. `by` is how far out the run is, as a fraction of the documented value (or in the check's own unit
 * where `absolute`), give or take `slack`; `why` is the reasoning in full, `short` is a few words for the debrief.
 */
export interface Miss {
  by: number;
  slack: number;
  absolute?: boolean;
  why: string;
  short: string;
}

const BOOSTER =
  'the powered flight ends 4 per cent too fast. It leaves the pad at only 1.19 g, so most of the thrust goes to holding it up and the speed gained is ' +
  'four times as sensitive as the thrust: one per cent in thrust, flow or liftoff weight is 3 to 4 per cent in speed (see the last test). The engine is two figures ' +
  'from a summary table (engine.thrust, engine.isp), held steady from liftoff to cutoff with no build-up, tail-off or jet-vane loss; the real vehicle was cut off by ' +
  'its velocity integrator, which hid exactly this. The whole vehicle’s drag (ascentDrag) is the other unknown, but it would have to be half as much again';
const BURNOUT = 'the booster is modelled burning out about 4 per cent too fast';

/** By flight id, then by which run (the whole flight, or the capsule's half flown from the report's separation), then by check id. */
export const MISSES: Record<string, Record<string, Record<string, Miss>>> = {
  'usa/mercury/mr-3-freedom-7': {
    whole: {
      separationSpeed: { by: 0.04, slack: 0.01, why: BOOSTER, short: BURNOUT },
      separationGroundSpeed: { by: 0.045, slack: 0.01, why: BOOSTER, short: BURNOUT },
      separationAltitude: { by: 0.078, slack: 0.015, why: BOOSTER, short: BURNOUT },
      apogee: { by: 0.077, slack: 0.015, why: `follows from the speed at separation: ${BOOSTER}`, short: BURNOUT },
      range: { by: 0.1, slack: 0.02, why: 'follows from the speed at separation', short: `${BURNOUT}, so it flies farther` },
      entryG: { by: 0.062, slack: 0.02, why: 'follows from the apogee: it falls from higher', short: 'it falls from the higher apogee' },
      entryAt: {
        by: 17,
        slack: 4,
        absolute: true,
        why: 'follows from the apogee: it is up longer',
        short: 'it is up longer, from the higher apogee',
      },
      drogueAt: { by: 15, slack: 4, absolute: true, why: 'follows from the apogee', short: 'follows from the higher apogee' },
      mainAt: { by: 16, slack: 4, absolute: true, why: 'follows from the apogee', short: 'follows from the higher apogee' },
      duration: { by: 16, slack: 4, absolute: true, why: 'follows from the apogee', short: 'it is up longer, from the higher apogee' },
    },
    capsule: {
      entryQ: {
        by: -0.054,
        slack: 0.01,
        why: 'just outside 5 per cent: the capsule’s drag coefficient is read off a figure to 0.03, and the air is a standard year’s, not that day’s',
        short: 'the drag coefficient is read off a figure to 0.03',
      },
    },
  },
};
