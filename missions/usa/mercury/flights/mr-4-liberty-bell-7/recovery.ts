/**
 * Hunt Club 1, the Marine HUS-1 that hooked Liberty Bell 7 (model/helicopter.py; vehicles/hus-1.md), flown on the record's
 * clock about where the capsule came down (viewer/recovery.ts). Only its order of events is the record's; where it was
 * between them, how high and how fast, are ours, and say so. It is heard at its rotors' and engine's rates (sound/model.ts
 * `rotorcraftTimbres`). The second helicopter, Hunt Club 3 (model/hunt-club-3.py: ET-30, no bureau number legible in any
 * photograph), is flown the same way to where it picked Grissom up in its horse collar, and Grissom is in the sea from
 * the hatch to its hoist (`GRISSOM`: the crew figure, viewer/swimmer.ts), where the record places him.
 */
import { derived, doc, estimated } from '../../../../../src/measure.ts';
import type { RecoveryCraft, SwimmerDef } from '../../../../../src/types.ts';
import { AFLOAT } from './afloat.ts';

const RESULTS = 'Results of the Second U.S. Manned Suborbital Space Flight (NASA, 1961)';
const TNO = 'This New Ocean (NASA SP-4201)';

/** The main rotor's rate, rev/min, the engine's (the main rotor's gearing, 11.3 to 1: hus-1.md), and the engine's gearing to the tail rotor. */
const MAIN_RPM = 258;
const ENGINE_RPM = MAIN_RPM * 11.3;
const TAIL_RATIO = 1.884;

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

/** What turns and is heard on a HUS-1: its rotors and its engine, the same on both helicopters (vehicles/hus-1.md). */
const HUS_1_TURNING: Pick<RecoveryCraft, 'rotors' | 'engine'> = {
  rotors: [
    {
      node: 'MainRotor',
      axis: [0, 1, 0],
      rpm: doc(
        MAIN_RPM,
        'vehicles/hus-1.md: 258 rpm at most (This Day in Aviation; the S-58’s type certificate, EASA.IM.R.109, "Maximum Nr: 258 rpm (104 %)"); taken at hover power',
      ),
      blades: doc(4, 'EASA.IM.R.109, the S-58’s type certificate data sheet, p. 4: "four MR blades (fully articulated)"'),
      main: true,
    },
    {
      node: 'TailRotor',
      axis: [0, 0, 1],
      rpm: derived(
        ENGINE_RPM / TAIL_RATIO,
        `the engine’s ${ENGINE_RPM.toFixed(0)} rpm over its gearing to the tail rotor, 1.884 to 1 (Heli Archive, "Sikorsky S-58", uncited: secondary)`,
      ),
      blades: doc(4, 'EASA.IM.R.109, p. 4: "four TR blades (fully articulated)"'),
      main: false,
    },
  ],
  engine: {
    cylinders: doc(9, 'vehicles/hus-1.md: a Wright R-1820-84, a nine-cylinder radial (Jane’s 1958-59, p. 372)'),
    rpm: derived(ENGINE_RPM, 'the main rotor’s 258 rpm times its gearing, 11.3 to 1 (vehicles/hus-1.md, the Descriptive Arrangement)'),
  },
};

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
  ...HUS_1_TURNING,
  line: {
    from: 'CargoHook',
    to: 'RecoveryCompartment',
    on: estimated(1603, `hooked as it sank, a few seconds before the line came taut (${TNO}, p. 373): ours`),
    off: AFLOAT!.record.cast,
    length: estimated(4, 'the cable from the belly hook to the capsule’s loop, with the pickup pole: not recorded, ours'),
    radius: 0.012,
  },
};

const OUT = AFLOAT!.record.out.value;
/** Lifted out on Hunt Club 3's hoist about when Hunt Club 1 let the capsule go: in the water "about 3 to 4 minutes" (Results, p. 7). Ours, from that. */
const LIFT = cast - 10;
const ABOARD = LIFT + 20;
/** Where he was picked up, m east and north of where the capsule came down: away from Hunt Club 1, "between the two helicopters". Ours. */
const PICKUP = { east: 13, north: -15 };
/** Hunt Club 3's heading hovering, into the wind as Hunt Club 1's, and its origin put so that its hoist's sheave (out to starboard) is over him. */
const HOVER = INTO - 180;
/** hus-1.md: the boom's pivot 0.61 m forward of the rotor's axis, and the sheave 0.99 + 0.899 m out to starboard once it is swung out. */
const SHEAVE = { forward: 0.61, starboard: 1.89 };
const over = (at: { east: number; north: number }) => {
  const h = (HOVER * Math.PI) / 180;
  const [fe, fn] = [Math.sin(h), Math.cos(h)];
  const [se, sn] = [Math.cos(h), -Math.sin(h)];
  return { east: at.east - SHEAVE.forward * fe - SHEAVE.starboard * se, north: at.north - SHEAVE.forward * fn - SHEAVE.starboard * sn };
};
/** Where it was sent at 24:03: "an object on a line in the water ... about 160 degrees ... 3/4 of a mile out from the capsule" (Results, p. 46). */
const MARKER = { east: 1207 * Math.sin((160 * Math.PI) / 180), north: 1207 * Math.cos((160 * Math.PI) / 180) };

export const HUNT_CLUB_3: RecoveryCraft = {
  name: 'Hunt Club 3',
  url: 'models/usa/mercury/mr-4-liberty-bell-7/hunt-club-3.glb',
  track: [
    // on station, sent at 24:03 to look at the dye marker's line three quarters of a mile out at 160 degrees
    { at: 1400, east: MARKER.east - 600, north: MARKER.north - 900, height: 150, heading: 30 },
    { at: 1480, east: MARKER.east, north: MARKER.north, height: 40, heading: 340 },
    { at: 1540, east: MARKER.east + 20, north: MARKER.north + 30, height: 40, heading: 340 },
    // back as the hatch went, and low near Grissom, the collar swinging in the water from its door
    { at: 1610, east: 60, north: -70, height: 25, heading: 330 },
    { at: 1650, east: over(PICKUP).east + 6, north: over(PICKUP).north - 4, height: 9, heading: HOVER },
    { at: 1740, east: over(PICKUP).east + 4, north: over(PICKUP).north - 2, height: 8, heading: HOVER },
    // over him, its hoist out; he is lifted, and it goes off toward the carrier
    { at: 1770, ...over(PICKUP), height: 7, heading: HOVER },
    { at: LIFT - 5, ...over(PICKUP), height: 7, heading: HOVER },
    { at: ABOARD + 5, ...over(PICKUP), height: 7, heading: HOVER },
    { at: ABOARD + 10, ...over(PICKUP), height: 7, heading: HOVER },
    { at: ABOARD + 40, east: PICKUP.east - 300, north: PICKUP.north - 300, height: 60, heading: 225 },
    { at: ABOARD + 160, east: PICKUP.east - 5000, north: PICKUP.north - 5000, height: 150, heading: 225 },
  ],
  confidence: 'estimated',
  source:
    `The order of events is the record's: Hunt Club 1 "will have Hunt Club 3 check" an object on a line 160 degrees, three quarters of a mile out, at 24:03 (${RESULTS}, p. 46); ` +
    `Grissom "could not get close to the second helicopter, even though I could see the copilot in the door with a horsecollar swinging in the water"; Cox "tossed the 'horse-collar' lifeline straight to Grissom" and he was lifted in it (${RESULTS}, p. 55; ${TNO}, p. 375); ` +
    'NASA 61-MR4-82 shows it low over the sea with its hoist out and him on it as the capsule "has just sunk". Where it was between those, its heights and the way it faced are ours: no track was recorded',
  ...HUS_1_TURNING,
  hoist: {
    boom: 'Hoist',
    axis: [0, 1, 0],
    out: Math.PI / 2,
    sheave: 'Hoist_Sheave',
    on: estimated(1740, 'the collar let down to swing in the water near him: ours'),
    grab: estimated(LIFT - 15, `"I knew that I had it on backwards" (${RESULTS}, p. 55): into it some seconds before the lift, ours`),
    lift: estimated(
      LIFT,
      'ten seconds before Hunt Club 1 let the capsule go: 61-MR4-82 has him on the hoist as the capsule "has just sunk", ours',
    ),
    aboard: estimated(ABOARD, 'twenty seconds up the cable to the door: ours'),
    radius: 0.005,
  },
};

/**
 * Grissom in the sea, from the hatch to Hunt Club 3's hoist (viewer/swimmer.ts): the crew figure, in his suit without
 * his helmet, where the record places him. Every place and instant between the record's events is ours.
 */
export const GRISSOM: SwimmerDef = {
  name: 'Grissom',
  model: 'crew',
  by: 'Hunt Club 3',
  track: [
    // out through the hatch (it faces south-west: afloat.ts), the dye marker's line over his shoulder, free of it
    { at: OUT, east: -0.9, north: -0.9, shoulders: 0.15, heading: 45 },
    { at: OUT + 12, east: -2.2, north: -2.0, shoulders: 0.15, heading: 45 },
    // "I swam the 4 or 5 feet to give him some help": Hunt Club 1 over the capsule, its wheels in the water
    { at: OUT + 25, east: -1.5, north: -1.0, shoulders: 0.12, heading: 45 },
    { at: OUT + 45, east: -1.4, north: -0.9, shoulders: 0.1, heading: 45 },
    // away from the primary helicopter, caught in the rotorwash between the two, his suit filling: his armpits at the water
    { at: OUT + 70, east: 2, north: -5, shoulders: 0.05, heading: 140 },
    { at: OUT + 130, east: 7, north: -10, shoulders: 0.02, heading: 140 },
    { at: LIFT - 20, east: PICKUP.east - 0.5, north: PICKUP.north + 0.5, shoulders: 0, heading: 140 },
    { at: LIFT, east: PICKUP.east, north: PICKUP.north, shoulders: 0, heading: 140 },
  ],
  // treading water: arms out to the sides sculling, legs a little bent (by judgement: no photograph of him swimming read)
  swimming: {
    'UpperArm.L': [-25, 60],
    'UpperArm.R': [-25, -60],
    'LowerArm.L': [-35, 0],
    'LowerArm.R': [-35, 0],
    'UpperLeg.L': [-20, -4],
    'UpperLeg.R': [-12, 4],
    'LowerLeg.L': [35, 0],
    'LowerLeg.R': [25, 0],
    'Foot.L': [15, 0],
    'Foot.R': [15, 0],
  },
  // on the hoist as 61-MR4-82 has him: his right hand up on the cable over his head, his left arm down, his legs hanging
  hoisted: {
    'UpperArm.R': [-165, -8],
    'LowerArm.R': [-20, 0],
    'UpperArm.L': [-5, 12],
    'LowerArm.L': [-10, 0],
    'UpperLeg.L': [-4, -2],
    'UpperLeg.R': [-2, 2],
    'LowerLeg.L': [6, 0],
    'LowerLeg.R': [4, 0],
  },
  // "I lifted the helmet from my head and dropped it" (Results, p. 55); the ventilator was left at the pad
  without: [
    'Helmet_Shell',
    'Helmet_Liner',
    'Helmet_Visor',
    'Helmet_VisorFrame',
    'Helmet_VisorSeal',
    'Helmet_Fittings',
    'Helmet_OutletBore',
    'Helmet_Lead',
    'Helmet_LeadPlug',
    'Ventilator',
  ],
  seat: 'CrewCabin_Pilot_',
  confidence: 'estimated',
  source:
    `Out through the hatch at once, "a line from the dyemarker can over my shoulder ... I freed myself from the line and noticed that I was floating with my shoulders above water"; ` +
    `Hunt Club 1 "on top of the spacecraft ... with all three of its landing gear in the water ... I swam the 4 or 5 feet to give him some help"; "I started to swim away from the primary helicopter. ` +
    `I apparently got caught in the rotorwash between the two helicopters"; "my armpits were just about at the water level ... I was going under water quite often. The mild swells we were having were breaking over my head"; ` +
    `in the collar "on backwards" (${RESULTS}, p. 55); in the water "about 3 to 4 minutes" (p. 7). His places between, which way he faced and his pose in the water are ours`,
};
