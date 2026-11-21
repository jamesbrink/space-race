/**
 * The lunar module as a craft of its own (Architecture 5): its descent stage with the throttleable descent engine (DPS) and
 * its legs, its ascent stage with the fixed-thrust ascent engine (APS) and the sixteen attitude thrusters (lm-rcs.ts), the
 * two held by the staging joint, over which the ascent engine fires into the descent stage ("fire in the hole"). One flight's
 * figures (lm-record.ts) go in; a plan comes out (sim/plan.ts), flown live by sim/craftlive.ts (the engines, the lever,
 * the staging), sim/attitude.ts (its attitude on its jets) and sim/surface.ts (its legs on the ground). It is the lunar
 * module alone, from the instant it is let go of the command and service module: its undocking is the several-craft run's
 * (Architecture 3), and the plan the Saturn V carries it in names it there.
 *
 * Its axes are the lunar module's own (R-567, section 6): +X up the thrust axis, +Y to the crew's right, +Z forward out of the
 * hatch, with LM coordinates' origin (the clusters' plane 254 in above it) as the datum its centres of mass are given from.
 */
import { derived, doc, estimated, type Measure } from '../../../../src/measure.ts';
import { RSPHERE } from '../../../../src/sim/core/gravity.ts';
import type { EngineDef, FlightPlan, GearDef, LegDef } from '../../../../src/sim/plan.ts';
import type { Vec3 } from '../../../../src/world/frames.ts';
import { lmRcsSet } from './lm-rcs.ts';
import type { LmRecord } from './lm-record.ts';

const IN = 0.0254;
const LBF = 4.448221615;
const FT = 0.3048;

const R567 = 'MIT Instrumentation Laboratory R-567, section 6, Control Data (November 1968)';
const AOH = 'Grumman LMA790-3-LM, Apollo Operations Handbook, LM-10 and subsequent, vol. I (1970)';
const DPS_AER = 'NASA TN D-7143, Apollo Experience Report: Descent Propulsion System (1973)';
const GEAR = 'NASA TN D-6850, Apollo Experience Report: Lunar Module Landing Gear Subsystem (1972)';

/** The descent engine's rated thrust, N: what its throttle settings are shares of. */
export const DPS_THRUST = doc(
  46_706.33,
  `${R567}, §6.4.6.1, FMAX: 46,706.33 N, the maximum DPS thrust; ${DPS_AER}, p. 7: "Maximum-rated thrust: 10 500 lb", the full throttle position "optimized at 92.5 percent of maximum-rated thrust". ${AOH}, §2.3.3, gives the full throttle position as "a nominal thrust of 9,870 pounds" (94 per cent): the shares of 10,500 lb are flown`,
);
/** Its throttling range, of rated thrust, and its full throttle position above it. */
export const DPS_RANGE: [number, number] = [0.1, 0.65];
const DPS_RANGE_SOURCE = `${AOH}, §2.1, descent engine throttle control: "from minimum thrust (approximately 10% of 10,500 pounds) to approximately 65% and full throttle (approximately 92.5%)", the range between "a transient region that cannot be used for extended periods", "automatic throttle commands above 65% automatically produce a full throttle output"; ${DPS_AER}, p. 8: "Thrust between 65 and 92.5 percent was considered a nonoperating region"`;
export const DPS_DETENT = doc(0.925, DPS_RANGE_SOURCE);
/** Its specific impulse at full throttle, s, and against its setting. */
export const DPS_ISP = doc(303.0, `${R567}, §6.4.6.1, the DPS specific impulse table: 303.0 s at 0.925 of FMAX`);
export const DPS_ISP_THROTTLED = {
  points: [
    [0.114, 289.7],
    [0.115, 292.7],
    [0.252, 293.6],
    [0.401, 295.0],
    [0.925, 303.0],
  ] as [number, number][],
  confidence: 'documented' as const,
  source: `${R567}, §6.4.6.1, specific impulse of the DPS as a function of normalized thrust (THRUST/FMAX against ISP), erosion included; its last row (0.945, 299.0 s), which models the fall with burn time at full throttle, is not flown`,
};
/** The ascent engine's thrust, N, and specific impulse, s. */
export const APS_THRUST = doc(15_568.8, `${R567}, §6.4.7.1, FASCENTN: the uneroded thrust of the APS engine, 15,568.8 N (3,500 lb)`);
export const APS_ISP = doc(309.0, `${R567}, §6.4.7.1, ISPA: the specific impulse of the APS, 309.0 s`);

/** How often each engine may be started: the handbook sets no number. */
const STARTS = {
  count: 10,
  ground: false,
  confidence: 'estimated' as const,
  source: `${AOH}, §2.3.3 and §2.3.6: each engine "can be shut down and restarted, within operational limitations", which limit the descent engine's chamber to 1,100 s of firing and set no number of starts; ten, more than any mission asked, is ours`,
};

/** The footpads' plane in LM coordinates, inches: the docking plane's 312.5 in less its 238.65 in over the pads (lunar-module.md). */
export const PAD_PLANE = derived(
  312.5 - 238.65,
  `${R567}, §6.4.2: the docking plane at X 312.5 in in LM coordinates; the LM-3 mission drawing (Apollo 9 Mission Report, fig. A.2-2): the ascent stage's top 19 ft 10.65 in over the pads, taken for the docking plane (lunar-module.md): 73.85 in`,
);
/** The footpads' centres from the X axis, inches. */
export const TREAD = doc(167.57, `${GEAR}, p. 6: "The center of each LM footpad is 167.57 inches from the vehicle X-axis"`);
/**
 * The primary strut's line, up and in from the footpad: from the pad (167.57 in out, 2 in up) to its knee on the outrigger
 * (109 in out, 114.87 in up), as the model reconstructs it (lunar_module.py `KNEE`, `KNEE_Z`).
 */
const STRUT_UP = 114.871 - 2;
const STRUT_IN = 167.57 - 109;
/** The primary strut's crush loads and stroke: its two honeycomb cartridges. */
const CRUSH = [
  {
    until: estimated(
      10 * IN,
      `${GEAR}, fig. 7, primary-strut compression load against stroke: the 4,500 lb stage read off the figure's axis as about 10 in`,
    ),
    load: doc(4500 * LBF, `${GEAR}, fig. 7 and fig. 6: the 4,500 lb honeycomb cartridge`),
  },
  {
    until: doc(32 * IN, `${GEAR}, p. 18: "the primary strut is designed for a maximum 32-inch stroke"`),
    load: doc(9500 * LBF, `${GEAR}, fig. 7 and fig. 6: the 9,500 lb honeycomb cartridge`),
  },
];

/** The four legs, on the body's axes: forward (+Z, the ladder's), right (+Y), aft and left. */
function legs(): LegDef[] {
  const k = Math.hypot(STRUT_UP, STRUT_IN);
  const [up, inward] = [STRUT_UP / k, STRUT_IN / k];
  const at = (y: number, z: number): Vec3 => [PAD_PLANE.value * IN, y * TREAD.value * IN, z * TREAD.value * IN];
  const strut = (y: number, z: number): Vec3 => [up, -y * inward, -z * inward];
  const one = (id: string, label: string, y: number, z: number): LegDef => ({ id, label, pad: at(y, z), strut: strut(y, z), crush: CRUSH });
  return [
    one('forward', 'the forward leg', 0, 1),
    one('right', 'the right leg', 1, 0),
    one('aft', 'the aft leg', 0, -1),
    one('left', 'the left leg', -1, 0),
  ];
}

/** The gear, with the probes the flight's legs carried and the flight's centres of mass. */
function gearOf(r: LmRecord): GearDef {
  return {
    body: 'descent',
    legs: legs(),
    probe: {
      length: doc(
        5.6 * FT,
        `${GEAR}, p. 8: "a 5.6-foot probe that is designed to sense lunar-surface proximity", on every footpad but the forward one's from LM-5 on. Its tip is taken that far below the footpad's plane, the probe hanging along -X. Assumed`,
      ),
      on: r.probes,
    },
    friction: doc(
      0.4,
      `${GEAR}, p. 4: "Postflight analysis indicated that a coefficient of sliding friction of 0.4 was a realistic value"`,
    ),
    stiffness: estimated(
      (4500 * LBF) / 0.02,
      'what a leg gives before its strut crushes (the strut, its fittings and the soil under the pad, which the report does not divide): taken so that its first stage’s load deflects it 2 cm. Ours',
    ),
    damping: estimated(0.3, 'the gear’s elastic part’s damping ratio, the soil’s and the structure’s together: ours'),
    limits: {
      vertical: doc(
        10 * FT,
        `${GEAR}, p. 4 and fig. 10: the final touchdown envelope, "for Vv ≤ 7 ft/sec, Vh = 4 ft/sec; and, for 7 ft/sec ≤ Vv ≤ 10 ft/sec, Vh = 40/3 - 4/3 Vv"`,
      ),
      horizontal: doc(4 * FT, `${GEAR}, p. 4 and fig. 10: 4 ft/sec across up to 7 ft/sec down`),
      knee: doc(7 * FT, `${GEAR}, p. 4 and fig. 10`),
      slope: doc(
        12,
        `${GEAR}, p. 4: the surface specified "a mean surface slope of 6° or less and an effective slope of 12° or less, including the effects of depressions or protuberances"`,
      ),
      attitude: doc(
        5.69,
        `${GEAR}, fig. 12: the 3σ limits of the attitude at touchdown in the Apollo 11 stability analysis, pitch 5.69° and roll 5.72°`,
      ),
      rate: doc(6, `${GEAR}, fig. 12: the 3σ limits of the body rates at touchdown, pitch and roll 6.0 deg/s (yaw 1.5)`),
    },
    centres: r.centres.map((c) => ({ mass: c.mass, at: [inches(c.x), inches(c.y), inches(c.z)] })),
  };
}

const inches = (m: Measure): Measure => ({ ...m, value: m.value * IN });

/** The lunar module of one flight as a plan: the craft alone, from its separation from the command and service module. */
export function lmPlan(r: LmRecord): FlightPlan {
  const dps: EngineDef = {
    id: 'dps',
    label: 'the descent engine',
    body: 'descent',
    count: 1,
    tanks: ['dps-propellant'],
    thrust: { vacuum: DPS_THRUST },
    isp: { vacuum: DPS_ISP, throttled: DPS_ISP_THROTTLED },
    kind: 'liquid',
    throttle: { range: DPS_RANGE, detent: DPS_DETENT },
    starts: STARTS,
    burns: 'hydrazine-n2o4',
  };
  const aps: EngineDef = {
    id: 'aps',
    label: 'the ascent engine',
    body: 'ascent',
    count: 1,
    tanks: ['aps-propellant'],
    thrust: { vacuum: APS_THRUST },
    isp: { vacuum: APS_ISP },
    kind: 'liquid',
    starts: STARTS,
    burns: 'hydrazine-n2o4',
  };
  return {
    kind: 'orbital',
    craft: [
      {
        id: 'lm',
        label: `${r.unit} ${r.label}`,
        mass: r.mass,
        bodies: [
          { id: 'descent', label: 'the descent stage', count: 1, mass: r.descent },
          { id: 'ascent', label: 'the ascent stage', count: 1, mass: r.ascent },
        ],
        joints: [
          {
            id: 'staging',
            label: 'the staging',
            gone: ['descent'],
            hot: {
              engine: 'aps',
              open: estimated(
                0.8,
                'the ascent engine fired onto the descent stage’s blast deflector and out between the two stages, whose sides are open but for the four fittings and the deck’s structure: four fifths taken as open. Ours',
              ),
              turn: estimated(10, 'the deflector turns the jet out nearly level: ten degrees below it taken. Ours'),
              endures: estimated(
                1,
                `what the descent stage's deck and deflector stand of the ascent engine's jet: ${R567}, §6.4.8, models its force on the stages for 0.35 s after the engine comes up in a staging; a second at full thrust, a few times that, is ours`,
              ),
              sequence: {
                parts: doc(
                  0.447,
                  `${R567}, §6.4.8, STDEL: the delay from receipt of the abort stage command to mechanical separation of the stages, 0.447 s`,
                ),
                lights: doc(
                  0.687,
                  `${R567}, §6.4.8: the delay from receipt of the abort stage command to ascent engine thrust buildup to 90% of full rated thrust, 0.687 s`,
                ),
              },
            },
          },
        ],
        engines: [dps, aps],
        tanks: [
          {
            id: 'dps-propellant',
            label: 'the descent stage’s propellant',
            body: 'descent',
            load: r.dps.loaded,
            usable: r.dps.usable,
            holds: 'propellant',
          },
          {
            id: 'aps-propellant',
            label: 'the ascent stage’s propellant',
            body: 'ascent',
            load: r.aps.loaded,
            usable: r.aps.usable,
            holds: 'propellant',
          },
        ],
        thrusters: [
          {
            id: 'rcs',
            label: 'the reaction control system',
            body: 'ascent',
            does: ['rotation', 'translation'],
            mode: 'manual',
            ...lmRcsSet({ centre: r.centre, load: r.rcs, inertia: r.inertia }),
          },
        ],
        chutes: [],
        limits: [],
        drag: [],
        gear: gearOf(r),
        lands: { on: 'land', ship: 'the lunar module' },
      },
    ],
    events: [],
    attitude: [
      {
        id: 'free',
        label: 'Left to itself',
        hold: { free: true },
        source: 'the lunar module flown by hand: its attitude is its jets’ (sim/attitude.ts)',
      },
    ],
    gravity: { central: 'moon', terms: ['j2', 'moon', 'sun'], sphere: RSPHERE },
    checks: [],
  };
}
