/**
 * Liberty Bell 7 after it came down: the capsule in the sea (sim/afloat.ts), its hatch blown off as a body of its own
 * (sim/loose.ts), the record's instants from the landing to the capsule's going down, and the first helicopter that could
 * not lift it. The capsule's hull and spaces are every Mercury capsule's (vehicles/mercury-afloat.ts); what is this
 * one's is here. The sea it floated on is weather.ts `sea`.
 */
import { assumed, derived, doc, estimated } from '../../../../../src/measure.ts';
import type { Flight } from '../../../../../src/types.ts';
import { capsuleAfloat, LOWEST } from '../../vehicles/mercury-afloat.ts';

const IN = 0.0254;
const LB = 0.45359237;
const LBF = 4.4482216;
const RESULTS = 'Results of the Second U.S. Manned Suborbital Space Flight (NASA, 1961)';
const TNO = 'This New Ocean (NASA SP-4201)';

/** The explosive hatch's opening: stations 18.5 to 45.4, 55 degrees of the cone (vehicle.py `HATCH`: 287.5 to 342.5 round it). */
const SILL = 18.5;
const HEAD = 45.4;
const ARC = 55;
/** The hatch, 23 lb (Results, p. 4); No. 7's latched one was 69. */
const HATCH_LB = 23;
/** The hatch's middle: its station, and the cone's radius there, in. */
const MIDDLE = (SILL + HEAD) / 2;
const OUT = 37.25 - MIDDLE * Math.tan((20 * Math.PI) / 180);

/**
 * The speed the bolts' charge threw the hatch off at: from where it struck the water. Reinhard saw it "fly off, strike the
 * water at a distance of about five feet from the hatch, and then go skipping over the waves" (This New Ocean, p. 373).
 * Thrown along the cone's outward normal, 20 degrees above the level, from its middle 0.40 m over the sea (where sim/afloat.ts
 * floats the capsule, the sea at station 16.2: the middle at 31.95), a body that lands 5 ft out left at 3.68 m/s. The air is
 * left out of that working (it takes 2 per cent of the speed in the half second).
 */
const THROWN = 3.675;

/**
 * No. 7's balance afloat (Postlaunch Report for MR-3, 3.1, p. 4, "Flotation"): 2,316.03 lb, its centre at Z 119.77 in,
 * "maximum diameter of the capsule is at Z = 104.50", so 15.27 in over station 0; X −0.10 and Y 0.02 in off the axis;
 * moments of inertia 248 (roll), 332 (pitch) and 347 (yaw) slug ft^2. Its shield is taken to be in place in these: from
 * the re-entry weights' 124.61 in, the 263 lb that leave at the top with the parachutes and the canister account for
 * the fall to 119.77 by themselves.
 */
const NO7 = { lb: 2316.03, station: 119.77 - 104.5, pitch: 332, yaw: 347 };
const MR3 = 'Postlaunch Report for MR-3, 3.1 (p. 4)';
/** What No. 11's explosive hatch saved on No. 7's latched one, lb, taken off at the hatch's middle. */
const SAVED = 69 - HATCH_LB;
/** No. 11's balance: No. 7's with the hatch's saving taken off at its middle (a point mass), on No. 7's inertia across, the mean of its pitch and yaw. */
function balance() {
  const M = NO7.lb;
  const m = SAVED;
  const hatch = { station: MIDDLE, out: OUT };
  const station = (M * NO7.station - m * hatch.station) / (M - m);
  // (a capsule was balanced: No. 7's centre was a tenth of an inch off its axis, and No. 11's is taken to be as near, on it)
  const out = 0;
  const across = (NO7.pitch + NO7.yaw) / 2;
  // (slug ft^2 from lb in^2: over 32.174 lb a slug and 144 in^2 a ft^2)
  const lbin2 = 32.174 * 144;
  const inertia =
    across -
    (m * ((hatch.station - NO7.station) ** 2 + hatch.out ** 2)) / lbin2 -
    ((M - m) * ((station - NO7.station) ** 2 + out ** 2)) / lbin2;
  const why = `No. 7’s (${MR3}: 2,316.03 lb at station 15.27 in, Z 119.77 over the greatest diameter’s 104.50) less the ${SAVED} lb its explosive hatch saved (Results, p. 4) at the hatch’s middle`;
  return {
    station: derived(station, why),
    out: assumed(
      out,
      `on the axis, as No. 7’s was within a tenth of an inch (X −0.10, Y 0.02 in: ${MR3}): a capsule was balanced, and No. 11’s own figures (its Postlaunch Memorandum Report) are not found`,
    ),
    inertia: derived(
      inertia,
      `${why}, on the mean of No. 7’s 332 (pitch) and 347 (yaw) slug ft^2: which of the two is square to the hatch is not worked out`,
    ),
  };
}

export const AFLOAT: NonNullable<Flight['flies']>['afloat'] = {
  body: capsuleAfloat({
    flotation: estimated(
      2316.03 - (69 - HATCH_LB),
      'No. 11’s flotation weight is in its Postlaunch Memorandum Report, not found: No. 7’s 2,316.03 lb (Postlaunch Report for MR-3, 3.1), with the pilot, ' +
        'less the 46 lb its explosive hatch saved (Results, p. 4), as this flight’s other weights are taken. The preflight summary (TM X-51305, read through its OCR only) has 2,311.5',
    ),
    balance: balance(),
    shield: estimated(
      // (1,848 kg/m^3 of beryllium an inch thick over the dish's zone, 2 pi 80 in by its 9.2 in depth)
      (1848 * IN * (2 * Math.PI * 80 * 9.2 * IN * IN)) / LB,
      'the beryllium heat sink: "approximately 1-inch-thick" (Hammack and Heberlig, p. 6) over its 2.98 m^2 dish at 1,848 kg/m^3, 140 kg, as vehicles/mercury-redstone.ts takes it for the entry’s heating. ' +
        'No weight for the shield or the bag is in anything read (SP-45, This New Ocean, the MR-3 Postlaunch Report, Results, SEDR 104, Hammack and Heberlig); the bag’s cloth, straps and cables are left out',
    ),
    seat: estimated(
      18,
      'Grissom’s centre of mass in his couch, lying on his back over the large pressure bulkhead: station 18 in on the axis, ours. No document read places it',
    ),
    rolling: estimated(
      0.2,
      'a fifth of critical, as its rise and fall: the bag hung under it full of the sea was "a sort of sea anchor" (This New Ocean, p. 311), and what it and the hull shed into the sea as it rolls is not worked out',
    ),
    egress: estimated(
      4,
      `"I lifted the helmet from my head and dropped it, reached for the right side of the instrument panel, and pulled myself through the hatch" (${RESULTS}, p. 55): the last four of the five seconds he is taken to go out in, ours`,
    ),
    pilot: estimated(
      150.5 + 20,
      `Grissom, 150 lb 8 oz nude seven hours before the launch (${RESULTS}, Table 3-I), in a suit of about 20 lb (NASA’s MA-8 fact sheet): his helmet he dropped in the cabin`,
    ),
    hatch: {
      from: SILL,
      to: HEAD,
      arc: ARC,
      weight: doc(HATCH_LB, `${RESULTS}, p. 4: "23 pounds" against the latch hatch’s 69`),
      source: 'vehicle.py `HATCH`',
    },
    ids: { opening: 'hatch-opening', pilot: 'grissom', hatch: 'hatch' },
  }),
  crew: 'grissom',
  goesOut: estimated(
    5,
    `"I lifted the helmet from my head and dropped it, reached for the right side of the instrument panel, and pulled myself through the hatch" (${RESULTS}, p. 55): at once; five seconds, ours`,
  ),
  record: {
    hatch: estimated(
      26 * 60 + 20,
      `not recorded. The last words are at 26:09, "Ah, roger", after "when you blow the hatch, the collar will already be down there waiting for you, and we’re turning base at this time" (${RESULTS}, p. 46); ` +
        `the helicopter was on its final approach, its copilot getting ready to cut the antenna, when the hatch went (${TNO}, p. 373). Ten seconds after the last words: ours`,
    ),
    out: estimated(
      26 * 60 + 25,
      `the hatch and the five seconds he took to go out (${RESULTS}, p. 7: "egressed from the spacecraft immediately after hatch actuation")`,
    ),
    taut: estimated(
      26 * 60 + 50,
      `not recorded: the helicopter reached the capsule, its copilot cut the antenna, threw the cutter aside, threaded the hook through the loop on the top, and "Liberty Bell 7 sank out of sight, but the pickup pole twanged as the attached cable went taut" (${TNO}, p. 373). Thirty seconds after the hatch: ours`,
    ),
    cast: estimated(
      30 * 60 + 5,
      `not recorded. Grissom was in the water "about 3 to 4 minutes" (${RESULTS}, p. 7; "four or five minutes", ${TNO}, p. 375), and the first helicopter let the capsule go about when the second had him (the pilot, ${RESULTS}, p. 55). Four minutes after he went out: ours`,
    ),
  },
  hoist: {
    capacity: derived(
      4000 * LBF,
      `"The flooded Liberty Bell 7 weighed over 5000 pounds, a thousand pounds beyond the helicopter’s lifting capacity" (${TNO}, p. 375): 4,000 lbf. Hammack and Heberlig (p. 35): "greater than the lifting capability of the helicopter"`,
    ),
    climb: estimated(0.3, 'how fast the pilot took up the line, m/s: not recorded, ours'),
    clear: estimated(1, 'the lowest point a metre out of the sea, lifted clear: ours'),
    takes: estimated(0.5, 'how far the line and the helicopter gave under its full pull: ours'),
  },
  sight: estimated(30, 'how far down a capsule is seen in clear ocean water from above: ours'),
  seen: ['cabin'],
  checks: [
    {
      id: 'flooded',
      label: 'Flooded weight',
      value: 5500,
      unit: 'lb',
      tolerance: 500,
      source: `"weighed over 5000 pounds" (${TNO}, p. 375): read as between 5,000 and 6,000 lb, the cabin full; the bag’s water, which drains as it is lifted, left out. Set before it was run`,
    },
    {
      id: 'heeled',
      label: 'Heel as it went under',
      value: 35,
      unit: 'deg',
      tolerance: 5,
      source:
        'NASA S61-02921, "the top of the capsule before it sinks beneath the waves": the recovery compartment and the top of the cone out of the sea, the axis 30 to 40 degrees ' +
        'off the plumb line, read off the photograph with the camera’s own tilt taken out by the horizon (an estimate: which way it leant from the hatch cannot be told). Set before the run was read',
    },
    {
      id: 'under',
      label: 'Hatch to under the sea',
      value: 30,
      unit: 's',
      tolerance: 30,
      source: `"shipping water and sinking fast"; it "sank out of sight" as the line came taut, the helicopter having come over it, its antenna cut and its loop hooked "in record time" (${TNO}, p. 373): within a minute of the hatch. Set before it was run`,
    },
  ],
};

/** The hatch, thrown off: its mass, the impulse that threw it, its drag tumbling, and where it is on the hull. */
export const HATCH_LOOSE = {
  loose: {
    mass: doc(HATCH_LB * LB, `${RESULTS}, p. 4`),
    impulse: derived(
      HATCH_LB * LB * THROWN,
      `${HATCH_LB} lb at ${THROWN} m/s: what lands it "about five feet from the hatch" (${TNO}, p. 373) from its middle 0.40 m over the sea along the cone’s normal. No figure for the charge’s impulse is read`,
    ),
    drag: estimated(0.36, 'a plate of 0.45 m^2 tumbling, Cd about 0.8: ours'),
  },
  at: {
    height: derived((MIDDLE + LOWEST) * IN, 'the middle of the opening, station 31.95, over the shield dropped on its bag'),
    out: derived(OUT * IN, 'the cone’s radius at station 31.95'),
    tilt: doc(20, 'the cone’s half-angle: its outward normal tilts up by that'),
    round: estimated(
      90,
      'where round the long axis the hatch is in the body’s axes is not worked out from how the vehicle stood on its pad: ours. In flight it moves where the hatch comes down by metres',
    ),
    heading: estimated(
      225,
      'which way the capsule lay in the sea is not recorded: its hatch toward the south-west, where the helicopters came from (Results, p. 45: "2 miles southwest"), ours',
    ),
  },
};
