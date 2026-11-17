/**
 * Hunt Club 1, the Marine HUS-1 that hooked Liberty Bell 7 (model/helicopter.py; vehicles/hus-1.md), flown on the record's
 * clock about where the capsule came down (viewer/recovery.ts). Only its order of events is the record's; where it was
 * between them, how high and how fast, are ours, and say so. The second helicopter (Hunt Club 3, ET-30), which picked
 * Grissom up, is not flown: it would be the same model in its own markings, and its bureau number is not legible in any
 * photograph read (helicopter.py). Grissom in the water is not drawn either: no swimming figure has been built.
 */
import { doc, estimated } from '../../../../../src/measure.ts';
import type { RecoveryCraft } from '../../../../../src/types.ts';
import { AFLOAT } from './afloat.ts';

const RESULTS = 'Results of the Second U.S. Manned Suborbital Space Flight (NASA, 1961)';
const TNO = 'This New Ocean (NASA SP-4201)';

/** Two statute miles, m: where Hunt Club 1 called from as the capsule came down. */
const TWO_MILES = 3219;
/** Toward the south-west, the way it came from, as east and north shares. */
const SW = -Math.SQRT1_2;

/** Its holding circle round the capsule: radius, m; height of its wheels over the sea, m; seconds a turn. Ours. */
const CIRCLE = { radius: 200, height: 60, turn: 80 };
/** On the circle from, and off it at: from the call at 18:23 ("we are in orbit now ... around the capsule") to turning base before 26:09. */
const CIRCLING = [1060, 1550] as const;
/** The way it faced to hover: into the wind, from 200 degrees at the Cape that morning (weather.ts), taken for the landing area's too. Ours. */
const INTO = 200;

/** The circle, a point every ten seconds, flown counter-clockwise seen from above (heading the way it goes). */
function circling(): RecoveryCraft['track'] {
  const points: RecoveryCraft['track'] = [];
  for (let t = CIRCLING[0]; t <= CIRCLING[1]; t += 10) {
    // (starting south-west of the capsule, at 225 degrees round from north)
    const bearing = 225 + (360 * (t - CIRCLING[0])) / CIRCLE.turn;
    const b = (bearing * Math.PI) / 180;
    points.push({
      at: t,
      east: CIRCLE.radius * Math.sin(b),
      north: CIRCLE.radius * Math.cos(b),
      height: CIRCLE.height,
      heading: (bearing + 90) % 360,
    });
  }
  return points;
}

const cast = AFLOAT!.record.cast.value;
const taut = AFLOAT!.record.taut.value;
const away = (225 * Math.PI) / 180;

export const HUNT_CLUB_1: RecoveryCraft = {
  name: 'Hunt Club 1',
  url: 'models/usa/mercury/mr-4-liberty-bell-7/helicopter.glb',
  track: [
    // inbound from the south-west at about 85 knots, 150 m up
    { at: 880, east: 2 * TWO_MILES * SW, north: 2 * TWO_MILES * SW, height: 150, heading: 45 },
    { at: 990, east: TWO_MILES * SW, north: TWO_MILES * SW, height: 150, heading: 45 },
    { at: 1035, east: 900 * SW, north: 900 * SW, height: 90, heading: 45 },
    ...circling(),
    // turning base and in, low over the water into the wind, and over the capsule
    {
      at: 1570,
      east: 160 * Math.sin((INTO * Math.PI) / 180),
      north: 160 * Math.cos((INTO * Math.PI) / 180),
      height: 25,
      heading: INTO - 180,
    },
    { at: 1590, east: 0, north: 0, height: 4, heading: INTO - 180 },
    // its wheels in the water as the capsule went under, the copilot hooking the loop on its top
    { at: 1603, east: 0, north: 0, height: -0.3, heading: INTO - 180 },
    { at: taut + 2, east: 0, north: 0, height: -0.3, heading: INTO - 180 },
    // pulling, held over it by the line (viewer/recovery.ts): about where the line holds it, so letting go is no step
    { at: taut + 15, east: 0, north: 0, height: 6, heading: INTO - 180 },
    { at: cast, east: 0, north: 0, height: 6, heading: INTO - 180 },
    // let go, and away to the south-west, climbing
    { at: cast + 25, east: 250 * Math.sin(away), north: 250 * Math.cos(away), height: 30, heading: 225 },
    { at: cast + 90, east: 2500 * Math.sin(away), north: 2500 * Math.cos(away), height: 150, heading: 225 },
    { at: cast + 200, east: 7000 * Math.sin(away), north: 7000 * Math.cos(away), height: 150, heading: 225 },
  ],
  confidence: 'estimated',
  source:
    `The order of events is the record's: "Hunt Club 1 is now 2 miles southwest you" as the capsule came down; at 18:23 "we are in orbit now at this time, around the capsule"; ready to come in from 18:32; "we're turning base at this time" before 26:09 (${RESULTS}, pp. 44 to 46); ` +
    `over the capsule as the hatch went, its copilot cutting the antenna and hooking the loop as the capsule sank, its wheels in the water, the line taut, the pull, and the capsule let go when the second helicopter had Grissom (${TNO}, pp. 373 to 375; ${RESULTS}, p. 55). ` +
    'Where it was between those, its heights, speeds, the circle and the way it faced are ours: no track was recorded',
  rotors: [
    {
      node: 'MainRotor',
      axis: [0, 1, 0],
      rpm: doc(258, 'vehicles/hus-1.md: 258 rpm at most, from 2,914 engine rpm (This Day in Aviation); taken at hover power'),
    },
    {
      node: 'TailRotor',
      axis: [0, 0, 1],
      rpm: estimated(
        1200,
        'its gearing is not read (vehicles/hus-1.md); a tail rotor of 9.5 ft turning at about the main rotor’s tip speed, ours',
      ),
    },
  ],
  line: {
    from: 'CargoHook',
    to: 'RecoveryCompartment',
    on: estimated(1603, `hooked as it sank, a few seconds before the line came taut (${TNO}, p. 373): ours`),
    off: AFLOAT!.record.cast,
    length: estimated(4, 'the cable from the belly hook to the capsule’s loop, with the pickup pole: not recorded, ours'),
    radius: 0.012,
  },
};
