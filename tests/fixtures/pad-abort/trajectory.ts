/**
 * A pad abort that was flown, as a thing the simulator can fly: the Langley full-scale model of
 * the Mercury capsule and its escape system, fired off the beach at Wallops Island on the Grand
 * Central escape motor (Blanchard and Raper, NASA TM X-422, 1960). It is the only abort whose
 * weights, inertias, launcher and trajectory have all been read, so it is the one the simulator's
 * own pad abort can be held to as a like for like.
 *
 * What is the report's: the weights, the centres of mass and the moments of inertia (Table I), the
 * thrust line's 0.78 in (p. 5), the launcher's 71 degrees (p. 6), and what it did (`RECORD`). What
 * is still Freedom 7's (flight.ts), for want of the model's own: the motor's curve (the same
 * motor, from the same report), the shapes the air pushes on and their drag, the parachutes (the
 * model's were a 72 in drogue and a 64 ft ring-sail; Freedom 7's are 6 ft and 63 ft) and the
 * sequence (the model's was two g-switched timers whose settings are not given; it let its tower
 * go at 1,850 ft going up, Freedom 7's lets it go at the top). Nothing here is fitted.
 */
import { flight } from '../../../missions/usa/mercury/flights/mr-3-freedom-7/flight.ts';
import type { AbortRecord, Measure, Trajectory } from '../../../src/types';

const IN = 0.0254;
const FT = 0.3048;
const LB = 0.45359237;
const SLUG_FT2 = 1.3558179619;
const TMX_422 = 'Blanchard and Raper, NASA TM X-422 (1960)';
const doc = (value: number, source: string): Measure => ({ value, confidence: 'documented', source });
const derived = (value: number, source: string): Measure => ({ value, confidence: 'derived', source });

/** The launcher's elevation, degrees: "The model was launched at an elevation angle of 71 degrees to insure a water impact" (p. 6). */
export const ELEVATION = 71;

const TAKE_OFF = 3109;
const CAPSULE = 2169;
const TOWER = TAKE_OFF - CAPSULE;
/** Stations, in from the capsule's greatest diameter (the report's datum): the capsule's centre of mass, the whole's at take-off, and so the tower's. */
const X_CAPSULE = 19.5;
const X_TAKE_OFF = 77.8;
const X_TOWER = (TAKE_OFF * X_TAKE_OFF - CAPSULE * X_CAPSULE) / TOWER;
/** Table I's moments of inertia, kg m^2. */
const I_TAKE_OFF = 6100 * SLUG_FT2;
const I_CAPSULE = 485 * SLUG_FT2;
const I_CAPSULE_ROLL = 236 * SLUG_FT2;
/** What is left for the tower about its own centre, for the whole to be Table I's; and the uniform rod that has it. */
const I_TOWER =
  I_TAKE_OFF - I_CAPSULE - CAPSULE * LB * ((X_TAKE_OFF - X_CAPSULE) * IN) ** 2 - TOWER * LB * ((X_TOWER - X_TAKE_OFF) * IN) ** 2;
const TOWER_LENGTH = Math.sqrt((12 * I_TOWER) / (TOWER * LB));

export function padAbort(): Trajectory {
  const tr = structuredClone(flight.trajectory);
  // in still air: the trial's wind is not in the report, and MR-3's two years later is no part of it
  delete tr.winds;
  const body = tr.body!;
  // where the capsule's greatest diameter is on Freedom 7's stack: the fixture keeps the stack under it, which an abort off the pad leaves behind
  const plane = body.capsule.centre.value - (25 - 9.2) * IN;
  body.capsule.centre = doc(plane + X_CAPSULE * IN, `${TMX_422}, Table I: capsule alone, centre of gravity at station 19.5 in`);
  body.capsule.gyration = {
    roll: derived(Math.sqrt(I_CAPSULE_ROLL / (CAPSULE * LB)), `${TMX_422}, Table I: capsule alone, 236 slug-ft2 in roll on 2,169 lb`),
    across: derived(Math.sqrt(I_CAPSULE / (CAPSULE * LB)), `${TMX_422}, Table I: capsule alone, 485 slug-ft2 in pitch or yaw on 2,169 lb`),
  };
  tr.separation.mass = doc(CAPSULE * LB, `${TMX_422}, Table I: capsule alone, 2,169 lb`);
  // (the model had no retropack: the weight after it is the same weight)
  tr.retropack.mass = doc(CAPSULE * LB, `${TMX_422}, Table I: capsule alone, 2,169 lb; the model carried no retropack`);
  const tower = body.parts.find((p) => p.sheds === 'tower')!;
  const centre = plane + X_TOWER * IN;
  tower.mass = TOWER * LB;
  tower.from = centre - TOWER_LENGTH / 2;
  tower.to = centre + TOWER_LENGTH / 2;
  tower.confidence = 'derived';
  tower.source =
    `${TMX_422}, Table I: 3,109 lb at take-off less the capsule's 2,169 lb, about the centre that puts the whole's at station 77.8 in, ` +
    'as a uniform rod of the length that makes the whole’s moment of inertia in pitch the table’s 6,100 slug-ft2';
  // (the stack under it is left as it was, so the booster the abort leaves standing is heavier by what the model is lighter: only what leaves is flown)
  const rocket = body.escape!;
  rocket.offset = doc(0.78 * IN, `${TMX_422}, p. 5: "a misalinement of the thrust vector of 0.78 inch"`);
  rocket.sequence = { ...rocket.sequence!, retropack: false };
  return tr;
}

/** What the trial did, each with how near the simulator must come: set before the simulator flew it. */
export const RECORD: AbortRecord[] = [
  {
    test: 'TM X-422',
    of: 'apogee',
    label: 'Greatest height',
    value: 1950 * FT,
    unit: 'm',
    tolerance: 0.1 * 1950 * FT,
    confidence: 'documented',
    source: `${TMX_422}, Summary: "Maximum altitude attained was 1,950 feet"`,
  },
  {
    test: 'TM X-422',
    of: 'range',
    label: 'Distance covered',
    value: 1600 * FT,
    unit: 'm',
    tolerance: 0.25 * 1600 * FT,
    confidence: 'documented',
    source: `${TMX_422}, p. 8: "Impact occurred at approximately 1,600 feet from take-off after about 63.1 seconds of flight time"`,
  },
  {
    test: 'TM X-422',
    of: 'duration',
    label: 'Time of flight',
    value: 63.1,
    unit: 's',
    tolerance: 6.31,
    confidence: 'documented',
    source: `${TMX_422}, p. 8: "after about 63.1 seconds of flight time"`,
  },
  {
    test: 'TM X-422',
    of: 'speed',
    label: 'Greatest speed',
    value: 595 * FT,
    unit: 'm/s',
    tolerance: 0.05 * 595 * FT,
    confidence: 'documented',
    source: `${TMX_422}, p. 8: "The maximum velocity occurred at escape motor tail off and was about 595 feet per second"`,
  },
  {
    test: 'TM X-422',
    of: 'landingSpeed',
    label: 'Speed onto the water',
    value: 28 * FT,
    unit: 'm/s',
    tolerance: 0.05 * 28 * FT,
    confidence: 'documented',
    source: `${TMX_422}, p. 8: "Rate of descent was about 28 feet per second at sea level (impact)"; the model’s own 64 ft parachute, where the fixture has Freedom 7’s 63 ft one`,
  },
];
