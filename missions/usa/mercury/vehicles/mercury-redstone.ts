import { derived, doc, estimated } from '../../../../src/measure.ts';
import type {
  AttitudeDef,
  BodyDef,
  Craft,
  EngineDef,
  EventDef,
  FlightPlan,
  JointDef,
  Lands,
  LimitDef,
  ChuteDef as PlanChute,
  TankDef,
  ThrusterSet,
} from '../../../../src/sim/plan.ts';
import { vacuumOf } from '../../../../src/sim/thrust.ts';
import type {
  AbortRecord,
  Body,
  ChuteDef,
  Curve,
  FlightCheck,
  Heating,
  MassPart,
  Measure,
  RcsSupply,
  ShedBody,
  ShedMotor,
  Thruster,
  Winds,
} from '../../../../src/types.ts';
import { G0 } from '../../../../src/world/bodies.ts';

/**
 * The Mercury-Redstone as the simulator flies it (src/sim: fly.ts, vehicle.ts, shed.ts, heating.ts): what is the same on
 * every flight of it, once, and the shape of what is a flight's own. The hardware's figures (the A-7's nozzle, the tilt
 * programme's curve, the drag curves, the escape rocket, the reaction control system, how the weight lies along the
 * stack, the parachutes, what the air heats) are here, each with its confidence and its source; a flight gives its own
 * day and vehicle (`Day`: the winds, the azimuth, the booster's measured thrust and weights, the spacecraft's weights,
 * when each thing happened) and `plan` puts the two together. Freedom 7 (MR-3) is the flight these were first
 * gathered for, and many were read from its reports: where a figure here cites "the Postlaunch Report" (`PLR`), that is
 * MR-3's, and it stands for the hardware on every flight of the stack. vehicles/redstone-mrlv.md and
 * mercury-capsule.md are the prose.
 */

export const IN = 0.0254;
export const FT = 0.3048;
export const LBF = 4.4482216;
export const LB = 0.45359237;
export const PLR = 'Postlaunch Report for Mercury-Redstone No. 3 (NASA STG, 16 June 1961)';
const TMX_491 = 'NASA TM X-491 (Brown and Moseley, 1961)';

/**
 * MR-3's booster as measured (TM X-53107, Table 8-1) and its cutoff (its Postlaunch Report): the flight the A-7's nozzle
 * exit area is derived on (`EXIT_AREA`). Freedom 7's day quotes the same figures as its own.
 */
export const MR3 = { thrust: 78_860 * LBF, isp: 214.8, cutoff: 141.8, liftoff: 66_098 * LB };
/** What is left at a cutoff: everything, less the propellant the engine has passed. */
export const cutoffMass = (liftoff: number, thrust: number, isp: number, cutoff: number): number =>
  liftoff - (thrust / (9.80665 * isp)) * cutoff;
const MR3_CUTOFF_MASS = cutoffMass(MR3.liftoff, MR3.thrust, MR3.isp, MR3.cutoff);
/** The capsule's greatest cross-section, 74.5 in across: what TM X-491's coefficients are referred to. */
export const CAPSULE_AREA = (Math.PI * (74.5 * IN) ** 2) / 4;
/**
 * The tilt programme as TM X-53107 draws it (Figure 4-9: degrees from the launch vertical against
 * seconds), which is the programme of MR-1 to MR-2, beginning at 24.3 s. MR-3 flew the "flatter
 * trajectory", whose programme began at 15.0 s and was arrested at the same 131.7 s (Table 3-1);
 * its curve is not published, so the drawn one is stretched to begin at 15.0 s.
 */
const TILT_FIGURE: [number, number][] = [
  [24.3, 0],
  [30, 1.4],
  [40, 3.3],
  [50, 6.8],
  [60, 10.6],
  [70, 16.3],
  [80, 21],
  [90, 26.7],
  [100, 31],
  [110, 34.9],
  [120, 37.9],
  [130, 40.7],
  [131.7, 41],
];
const TILT_BEGINS = 15.0;
const TILT_ARREST = 131.7;

const TMX_4 = 'NASA TM X-53107, section 4';
/** Stations on the stack, inches above the fin trailing edges (vehicles/redstone-mrlv.md), where the sections meet. */
const TAIL_TOP = 111.24;
const CENTRE_TOP = TAIL_TOP + 37.5 * 12;
const BOOSTER_TOP = 708;
/** The capsule's plane of greatest diameter on the stack, the tip of its heat shield below that, its canister's top and the tower's spike above. */
export const CAPSULE_PLANE = 716;
export const SHIELD_TIP = CAPSULE_PLANE - 9.2;
const CANISTER_TOP = CAPSULE_PLANE + 104.57;
const SPIKE_TIP = CAPSULE_PLANE + 284.55;
/** The oxygen tank stands on the tail unit and the alcohol tank on it; the 1.87 ft Figure 4-1 leaves unexplained is taken to be above them. */
const LOX_TOP = TAIL_TOP + 16.83 * 12;
const ALCOHOL_TOP = LOX_TOP + 18.8 * 12;
/** The capsule's centre of mass above the tip of its heat shield, inches: a guess. The Postlaunch Report has it; it has not been read for it. */
const CAPSULE_CG = 25;
const STRUCTURE = `${TMX_4}.2.1: structural weights; stations from Figure 4-1 (vehicles/redstone-mrlv.md)`;
const part = (
  name: string,
  from: number,
  to: number,
  pounds: number,
  confidence: MassPart['confidence'],
  source: string,
  more: Partial<MassPart> = {},
): MassPart => ({ name, from: from * IN, to: to * IN, mass: pounds * LB, confidence, source, ...more });

/**
 * The spacecraft's reaction control system as hardware (src/sim/vehicle.ts). The chambers' ratings are Hammack and
 * Heberlig's (p. 7), as spacecraft.md has them, and so is what the tanks held (pp. 7 and 8); where each chamber stands and
 * the specific impulse the chambers delivered are not in anything read, and say so. Places are metres from the spacecraft's centre of mass in the body's axes (+X to the
 * small end); each chamber pushes the spacecraft away from the side its nozzle is on.
 */
const PEROXIDE_ISP = estimated(
  150,
  'what the chambers delivered is not in anything read. Hammack and Heberlig (p. 7) give "a theoretical specific impulse of about 160 pound-seconds" for the decomposing peroxide; ' +
    'the simulator divides each chamber’s rated thrust by this figure for its flow, so it wants the delivered one, which is below the theoretical by the losses of a small nozzle and catalyst bed: 150 s is taken, six per cent under. Ours',
);
const RCS_SUPPLIES: RcsSupply[] = [
  {
    name: 'automatic',
    mode: 'automatic',
    propellant: doc(32 * LB, 'Hammack and Heberlig, p. 7: "A 32-pound supply of hydrogen peroxide is available for the automatic system"'),
    isp: PEROXIDE_ISP,
  },
  {
    name: 'manual',
    mode: 'manual',
    propellant: doc(23 * LB, 'Hammack and Heberlig, p. 8: "A 23-pound supply of hydrogen peroxide is available for the manual system"'),
    isp: PEROXIDE_ISP,
  },
];
/** How far up the axis from the centre of mass the pitch and yaw chambers stand, and how far from the axis; the roll chambers' distance from the axis: all ours. */
const JET_ARM = 1.8;
const JET_OUT = 16 * IN;
const ROLL_OUT = 0.8;
const RATED =
  'Hammack and Heberlig (spacecraft.md, Propulsion): the automatic system has two 24 lbf and two 1 lbf chambers each in pitch and yaw, and two 6 lbf and two 1 lbf in roll';
const PLACED_PY = `on the recovery compartment, taken as ${JET_ARM} m up the axis from the centre of mass assumed above and on its 32 in skin: the place is ours`;
const PLACED_ROLL = `taken as ${ROLL_OUT} m from the axis at the centre of mass’s own station, so that by these figures roll does not pitch: where the roll chambers stood along the cone has not been read`;
const VARIABLE =
  'not in anything read: spacecraft.md has the manual system as six chambers of variable thrust, range not found; 4 to 24 lbf in pitch and yaw and 1 to 6 lbf in roll are the figures commonly quoted';
const jet = (name: string, supply: string, axis: Thruster['axis'], sense: 1 | -1, pounds: number, least?: number): Thruster => {
  // pitch turns about +Y and yaw about +Z, so their chambers push along Z and Y from the small end; one roll chamber pushes across an arm out on +Y
  const at: Thruster['at'] =
    axis === 'pitch' ? [JET_ARM, 0, sense * JET_OUT] : axis === 'yaw' ? [JET_ARM, -sense * JET_OUT, 0] : [0, ROLL_OUT, 0];
  const push: Thruster['push'] = axis === 'pitch' ? [0, 0, -sense] : axis === 'yaw' ? [0, sense, 0] : [0, 0, sense];
  return {
    name,
    supply,
    axis,
    sense,
    at,
    push,
    thrust: pounds * LBF,
    ...(least === undefined ? {} : { least: least * LBF }),
    confidence: 'estimated',
    source: `${supply === 'manual' ? VARIABLE : RATED}. ${axis === 'roll' ? PLACED_ROLL : PLACED_PY}`,
  };
};
const RCS_THRUSTERS: Thruster[] = (['pitch', 'yaw', 'roll'] as const).flatMap((axis) =>
  ([1, -1] as const).flatMap((sense) => {
    const way = `${axis} ${sense > 0 ? '+' : '−'}`;
    return [
      jet(`${way}, automatic high`, 'automatic', axis, sense, axis === 'roll' ? 6 : 24),
      jet(`${way}, automatic low`, 'automatic', axis, sense, 1),
      jet(`${way}, manual`, 'manual', axis, sense, axis === 'roll' ? 6 : 24, axis === 'roll' ? 1 : 4),
    ];
  }),
);

const TMX_422 = 'Blanchard and Raper, NASA TM X-422 (1960)';
const TMX_629 = 'Baber, Carter and English, NASA TM X-629';
const SEDR_109 = 'McDonnell SEDR 109-7, the Capsule Flight Operations Manual for capsule 7 (1960)';

/** The escape rocket: what pulls the spacecraft clear in an abort (`body.escape`), and what carries the tower off a good flight (`body.sheds`). */
export const ESCAPE = {
  thrust: doc(
    52_000 * LBF,
    'McDonnell SEDR 104 (spacecraft.md, Propulsion): 52,000 lbf, the nominal figure along the axis, its three nozzles being canted 19 degrees. ' +
      'Also in print: 58,500 lbf (Hammack and Heberlig, p. 4) and 56,000 lbf (SEDR 104, section 5)',
  ),
  burn: doc(0.78, 'McDonnell SEDR 104 (spacecraft.md, Propulsion): 52,000 lbf for 0.78 s, then decaying'),
  impulse: doc(
    56_500 * LBF,
    'McDonnell SEDR 104 (spacecraft.md, Propulsion): 56,500 lb-s in all. Taken as along the axis, as the thrust is: if it is the motor’s own, the cant makes it 5 per cent less. ' +
      'How the thrust decays is not given: it is taken to fall evenly to nothing, which spends the rest of the impulse in 0.61 s',
  ),
  curve: {
    points: (
      [
        [0, 0],
        [0.03, 30],
        [0.06, 53],
        [0.08, 54.5],
        [0.28, 56],
        [0.3, 62],
        [0.32, 67.5],
        [0.35, 68.5],
        [0.4, 68],
        [0.5, 65.5],
        [0.6, 62.5],
        [0.63, 61],
        [0.7, 54],
        [0.8, 44],
        [0.9, 36],
        [0.97, 31.5],
        [1, 29],
        [1.05, 23],
        [1.1, 17],
        [1.2, 9],
        [1.3, 4.5],
        [1.36, 3],
        [1.5, 1.8],
        [1.8, 0.8],
        [1.9, 0],
      ] as [number, number][]
    ).map(([t, klbf]) => [t, klbf * 1000 * LBF]),
    confidence: 'documented',
    source:
      `${TMX_422}, Figure 9: "Typical variation of thrust with time for capsule motor with three nozzles", a static firing of the Grand Central motor, read to about 1,000 lbf and 0.01 s. ` +
      'The figure’s own legend: burning time 0.601 s, action time 1.248 s, total impulse (10 % to 10 %) 56,795 lb-s, average thrust for action time 45,508 lbf, propellant weight 290.5 lb. ' +
      'The points as read enclose 58,100 lb-s in all, and 56,900 between the 10 per cent points against the legend’s 56,795. One motor on a stand, not capsule 7’s own; the 52,000 lbf for 0.78 s above is the nominal rating of the same motor',
  } as Curve,
  propellant: doc(
    290.5 * LB,
    `${TMX_422}, Figure 9: "Propellent weight, 290.5 lb"; its Table I has the test vehicle 290 lb lighter at burnout (3,109 to 2,819 lb)`,
  ),
  cant: doc(
    19,
    `McDonnell SEDR 104, section 6: "The exit cones are canted at 19 degrees from centerline of rocket case to centerline of exit cones so as to direct the rocket blast outward and away from the tower and capsule"; ${TMX_422}, p. 5, has the same 19 degrees. ` +
      'The thrust figures are taken as the resultant along the motor’s axis (the curve is a stand’s reading), so the cant takes nothing more off them',
  ),
  offset: doc(
    1 * IN,
    `${TMX_629}, p. 7, of a Little Joe flight whose escape system "was composed of current production Mercury components": "The thrust axis of the escape rocket was misalined about 1 inch to the side of the spacecraft-escape-system center of gravity ` +
      `to make certain that this part of the configuration would be pulled out of the flight path of the launch vehicle". ${TMX_422}, p. 5, of the first full-scale firing of the Grand Central motor: "canted in order to obtain a misalinement of the thrust vector of 0.78 inch, to give the capsule a lateral displacement". ` +
      'This New Ocean, p. 141: "about one inch". The system’s figure, to the nearest inch: capsule 7’s own alignment, sighted with the motor’s thrust alignment mirror (SEDR 104, section 6), is not in anything read',
  ),
  toward: estimated(
    0,
    'which side of the vehicle the line was set toward is not in anything read. Taken as downrange, away from the blockhouse and toward the sea, which is where one would choose to be carried. Ours',
  ),
  sequence: {
    retropack: true,
    ceiling: doc(
      42_000 * FT,
      `${SEDR_109}, p. 2-2: "For aborts below 10,000 feet, the drogue chute is deployed 2 seconds after tower jettison. Two seconds later, the antenna fairing is jettisoned and the main chute is deployed. On aborts between 10,000 feet and 42,000 feet, ` +
        'the drogue chute is deployed 2 seconds after tower jettison and the main chute is deployed at 10,000 feet. If the abort is initiated above 42,000 feet, the normal recovery sequence is initiated". ' +
        'The same page: an abort signal will "fire the escape rocket and jettison the retrograde package. At maximum altitude, the escape tower is jettisoned"',
    ),
    drogue: doc(2, `${SEDR_109}, p. 2-2: "the drogue chute is deployed 2 seconds after tower jettison"`),
    main: doc(
      2,
      `${SEDR_109}, p. 2-2: "Two seconds later, the antenna fairing is jettisoned and the main chute is deployed", for an abort below 10,000 ft; above that the main waits for 10,000 ft, which is how both are flown: two seconds after the drogue, once under the main’s own height`,
    ),
  },
  record: [
    {
      test: 'Beach Abort, 9 May 1960',
      of: 'apogee',
      label: 'Greatest height',
      value: 2465 * FT,
      unit: 'm',
      tolerance: 0.15 * 2465 * FT,
      confidence: 'documented',
      source:
        'This New Ocean, p. 262: spacecraft No. 1, from a launcher on the beach at Wallops Island with "its pylon toward the sea", flew "one minute and 16 seconds but covering half a mile in an arc 2465 feet high". ' +
        'How far the launcher leaned and what the spacecraft weighed are not in anything read: the comparison is with this flight’s spacecraft off a launcher leaning as the 1959 trial’s did (71 degrees: NASA TM X-422), which is an assumption',
    },
    {
      test: 'Beach Abort, 9 May 1960',
      of: 'range',
      label: 'Distance covered',
      value: 2640 * FT,
      unit: 'm',
      tolerance: 0.3 * 2640 * FT,
      confidence: 'documented',
      source: 'This New Ocean, p. 262: "half a mile", taken as a statute half mile; a round figure in a history, so held to 30 per cent',
    },
    {
      test: 'Beach Abort, 9 May 1960',
      of: 'duration',
      label: 'Time of flight',
      value: 76,
      unit: 's',
      tolerance: 0.15 * 76,
      confidence: 'documented',
      source: 'This New Ocean, p. 262: "one minute and 16 seconds"; NASA SP-45, the table of flights: 00:01:16',
    },
    {
      test: 'off the pad, upright',
      of: 'apogee',
      label: 'Greatest height',
      value: 2500 * FT,
      unit: 'm',
      tolerance: 0.15 * 2500 * FT,
      confidence: 'documented',
      source:
        'McDonnell SEDR 104, section 6: "For off the pad escapes the rocket will obtain a maximum capsule altitude of approximately 2500 feet". The maker’s expectation for the orbital spacecraft, not a flight',
    },
  ] as AbortRecord[],
};
/** Hammack and Heberlig on how the tower left a good flight. */
const TOWER_FIRED =
  'McDonnell SEDR 109-7, “Tower fails to jettison” (PDF p. 54), describes both motors firing on a normal launch. Hammack and Heberlig, p. 15: "At booster cutoff, the tower clamp ring was released and both the escape and pylon jettison rockets fired to remove the tower"';

export const TOWER_MOTORS: ShedMotor[] = [
  {
    name: 'escape rocket',
    unless: 'abort',
    thrust: doc(ESCAPE.thrust.value, `${TOWER_FIRED}. The rocket’s figures are \`body.escape\`’s: ${ESCAPE.thrust.source}`),
    burn: doc(ESCAPE.burn.value, ESCAPE.burn.source),
    impulse: doc(
      ESCAPE.impulse.value,
      `${ESCAPE.impulse.source}. The tower’s weight is not lightened as the rocket burns, so it is flown a little slow`,
    ),
  },
  {
    name: 'tower jettison rocket',
    thrust: doc(
      800 * LBF,
      `${TOWER_FIRED}. NASA SP-45, Table 3-III (spacecraft.md, Propulsion): the tower jettison motor, 800 lbf nominal (SEDR 104 has 785 lbf, through three nozzles canted 30 degrees). ` +
        'Taken as along the axis, through the centre of mass. After an abort it is this rocket alone that takes the tower off, the escape rocket being spent',
    ),
    burn: doc(1.5, 'NASA SP-45, Table 3-III (spacecraft.md, Propulsion): 1.5 s'),
  },
];

/** The same Mercury hardware, measured in drawing inches from this stack’s capsule plane. */
export function retropack(plane: number, mass: Measure): ShedBody {
  return {
    on: 'retropack-straps',
    name: 'Retropack',
    from: doc(
      (plane - 27) * IN,
      'SEDR 104, Figure 1-3: the retro nozzles’ exits, 27.0 in below the capsule’s widest plane (model/vehicle.py: Z_RETRO_BOTTOM)',
    ),
    to: derived(
      (plane - 9.2) * IN,
      'the tip of the heat shield, which it is strapped under: 9.2 in below the capsule’s widest plane, the depth of a spherical cap of 80 in radius on a 74.5 in chord (both CR-649; spacecraft.md)',
    ),
    radius: estimated(0.38, 'about 30 in across, off the model; no drawing of the housing has been read for it'),
    mass,
    centre: estimated(
      (plane - 17) * IN,
      'the middle of the housing and its motors, 17 in below the capsule’s widest plane, by eye from the model',
    ),
    gyration: {
      roll: estimated(0.27, 'a solid disc of its radius has 0.27 m'),
      across: estimated(0.2, 'a disc 0.45 m deep and 0.38 m in radius has 0.23 m; the motors are near the middle'),
    },
    ahead: estimated(0.45, 'either face on: a disc of its radius (0.45 sq m) at 1.0, by judgement'),
    astern: estimated(0.45, 'as the other face'),
    side: {
      dragArea: estimated(0.35, 'edge on: 0.76 m by 0.45 m at 1.0, by judgement. Its three straps are left out'),
      from: doc((plane - 27) * IN, 'its lower end'),
      to: derived((plane - 9.2) * IN, 'its upper end: the tip of the heat shield, derived as `to` above'),
    },
    push: estimated(
      1,
      'McDonnell SEDR 104 (1959), §8-4: a coil spring ejects the pack when the straps release. §8-9 also describes the spring acting if the straps burn in entry. The relative speed is estimated; no measurement found.',
    ),
  };
}

/**
 * The stack as a body that turns (src/sim/vehicle.ts). The lengths and most of the weights are
 * the reports'; how the weight lies along each section, where the air pushes and how hard the
 * vanes steer are not in anything read, and say so.
 */
export function stack(o: Stack): Body {
  /** Everything liquid aboard at liftoff, lb: the liftoff weight less everything that is not. */
  const FLUIDS = o.liftoff - o.boosterDry - o.capsuleLaunch;
  const PLACED = 902.6 + 1659 + 437.4 + 487 + o.compound;
  return {
    radius: doc(35 * IN, `${TMX_4}, Figure 4-11: body diameter 70 in`),
    parts: [
      part('tail unit', 0, TAIL_TOP, 902.6, 'documented', STRUCTURE),
      part('centre section', TAIL_TOP, CENTRE_TOP, 1659, 'documented', STRUCTURE),
      part(
        'aft section, ballast and damping compound',
        CENTRE_TOP,
        BOOSTER_TOP,
        437.4 + 487 + o.compound,
        'documented',
        `${STRUCTURE}. ${o.compoundSource}`,
      ),
      part(
        'engine and tail equipment',
        0,
        TAIL_TOP,
        (o.boosterDry - PLACED) * 0.55,
        'estimated',
        `the dry booster (${o.boosterDry.toLocaleString('en-US')} lb for ${o.booster}) less the structure, ballast and compound the tables place leaves ${o.boosterDry - PLACED} lb of engine, pumps, pressurisation and instruments: ` +
          '55 per cent of it is put in the tail unit and the rest in the aft section. The split is ours',
      ),
      part(
        'instruments and aft equipment',
        CENTRE_TOP,
        BOOSTER_TOP,
        (o.boosterDry - PLACED) * 0.45,
        'estimated',
        'the rest of the same remainder',
      ),
      part(
        'liquid oxygen',
        TAIL_TOP,
        LOX_TOP,
        (FLUIDS * 29_250) / 53_250,
        'estimated',
        `everything liquid at liftoff (the liftoff weight less the dry booster and the capsule: ${Math.round(FLUIDS).toLocaleString('en-US')} lb, peroxide and nitrogen with it: that much is ${o.fluids}), shared between the tanks as their volumes at assumed densities ` +
          '(29,250 to 24,000 lb: vehicles/redstone-mrlv.md). The densities are assumed and no report read gives either tank’s load, so the share is an estimate: the Firing Site Weight Report has the loads and has not been read. ' +
          'The oxygen tank is the lower (Figure 4-1), 16.83 ft long',
        { fluid: true, propellant: 'oxidizer' },
      ),
      part(
        'alcohol',
        LOX_TOP,
        ALCOHOL_TOP,
        (FLUIDS * 24_000) / 53_250,
        'estimated',
        'the rest of the same, and an estimate for the same reason (the share between the tanks stands on assumed densities); the alcohol tank is 18.8 ft long, over the oxygen',
        { fluid: true, propellant: 'fuel' },
      ),
      part(
        'spacecraft',
        SHIELD_TIP,
        CANISTER_TOP,
        o.capsuleOrbit,
        o.orbitWeight.confidence,
        `${o.orbitWeight.source}; SEDR 104, Figure 1-3 for its length. Taken as a uniform cylinder of 0.6 m radius, which it is not`,
        { radius: 0.6 },
      ),
      part('escape tower', CANISTER_TOP, SPIKE_TIP, o.capsuleLaunch - o.capsuleOrbit, o.towerWeight.confidence, o.towerWeight.source, {
        radius: 0.2,
        sheds: 'tower-clamp',
      }),
    ],
    surfaces: [
      {
        name: 'nose',
        station: (CANISTER_TOP - (104.57 * 2) / 3) * IN,
        slope: 2,
        confidence: 'estimated',
        source:
          'slender-body theory: any nose has a normal-force slope of 2 per radian on its base area, here the capsule’s; a cone’s acts two thirds of the way back from its tip, ' +
          'taken from the canister’s top. The tower ahead of it is left out. Not from a tunnel',
      },
      {
        name: 'fins',
        station: 55.2 * IN,
        slope: 3.15,
        confidence: 'estimated',
        source:
          'Barrowman’s method for four fins of 41 in exposed span, 100 in root and 38 in tip chord (the chords themselves estimated: vehicles/redstone-mrlv.md) on a 70 in body, referred to the capsule’s area. ' +
          'Subsonic, and held at every Mach number: how the real centre of pressure moved through the speed of sound is not taken from any report',
      },
    ],
    control: {
      deflection: estimated(
        4,
        `${TMX_4}.4.8: four carbon jet vanes turning 27.5 degrees either way. How far that turns the thrust is not given: 4 degrees is what vanes of the kind are credited with, and is ours`,
      ),
      station: estimated(0, 'the vanes stand in the exhaust at the nozzle’s exit, taken as the base'),
      rollArm: estimated(0.3, 'the vanes’ distance from the axis, from the 33 in nozzle exit (itself estimated)'),
    },
    engine: {
      kind: 'liquid',
      starts: 1,
      confidence: 'estimated',
      source:
        'the A-7 burned alcohol and liquid oxygen at one thrust, was started once on the pad and was shut down by the velocity integrator’s signal (the cutoff above) or by running dry. ' +
        'That it had no throttle and no means of relighting is what is generally said of it and what the reports’ single thrust figure implies: no page read states it',
    },
    mixture: estimated(
      29_250 / 24_000,
      'the engine’s mixture ratio is not in anything read. Taken as the ratio the two tanks’ loads stand in (29,250 to 24,000 lb: vehicles/redstone-mrlv.md, themselves the tanks’ volumes at assumed densities), ' +
        'so by these figures both run dry together (on MR-3’s figures 147.0 s into the burn), with the peroxide and nitrogen counted in them. That, and not `engine.depletion`’s 143.5 s, ends a burn nobody cuts',
    ),
    tower: { at: o.tower },
    escape: ESCAPE,
    capsule: {
      centre: estimated(
        (SHIELD_TIP + CAPSULE_CG) * IN,
        'the capsule’s centre of mass taken as 25 in above the tip of its heat shield, in the wide end where the weight is. The Postlaunch Report gives it; that page has not been read',
      ),
      gyration: {
        roll: estimated(0.55, 'a solid cone of the capsule’s base has 0.52 m; the weight is nearer the skin than that'),
        across: estimated(
          0.75,
          'judged from its 3.3 m length with most of the weight in the wide end. The Postlaunch Report gives the moments of inertia; not read',
        ),
      },
      surfaces: [
        {
          name: 'heat shield',
          station: (80 - CAPSULE_CG) * IN,
          slope: 0.5,
          confidence: 'estimated',
          source:
            'the pressure on a spherical shield acts through its centre of curvature, 80 in behind its tip (CR-649: an 80 in radius), which is 55 in behind the centre of mass assumed above. ' +
            `The slope, 0.5 per radian, is a guess at ${TMX_491}’s curves, not a reading of them`,
        },
      ],
      rcs: { supplies: RCS_SUPPLIES, thrusters: RCS_THRUSTERS, ...(o.rate ? { rate: o.rate } : {}) },
      base: estimated(CAPSULE_CG * IN, 'the tip of the heat shield, 25 in below the centre of mass assumed above'),
      chuteArm: estimated(
        1.8,
        'the parachutes pull at the top of the recovery compartment, about 1.8 m from the centre of mass assumed above',
      ),
      earthward: o.earthward,
      side: {
        dragArea: estimated(
          3.6,
          'the spacecraft seen from the side is a cone from 74.5 in to 32 in across over 60 in and a 32 in cylinder above it, about 4,600 sq in (3.0 sq m), at 1.2, ' +
            'the drag coefficient of a round body across the flow (the textbook figure for a cylinder below its critical Reynolds number; held at every Mach number). Not from a tunnel',
        ),
        from: estimated(
          -0.41,
          'the side’s area lies about a point 27 in toward the small end from the centre of mass assumed above; it is spread evenly 1.1 m either way of that',
        ),
        to: estimated(1.79, 'as the other end'),
      },
      limits: {
        landingSpeed: LANDING_SPEED,
        load: estimated(
          20,
          'not in anything read. Freedom 7 put 11.0 g on its pilot at entry (Postlaunch Report 4.2) and an abort off the pad is some 13 g by the escape rocket’s figures; 20 g for a few seconds, chest to back on a contour couch, is the figure usually given for what the couch was built to. ' +
            'Documented, and not the same thing: Hammack and Heberlig (p. 6) say tests of the couch "reached values as high as 25g on a profile representing reentry with no injury to the occupant". ' +
            'That is a level tested and come through on one profile, not the most that can be lived through, so it is not taken as the limit: 20 g stays, under it, and is ours',
        ),
      },
    },
    side: {
      dragArea: estimated(
        42,
        'the stack seen from the side: a 70 in body 708 in long and the spacecraft above it, about 54,000 sq in (35 sq m), at 1.2, the drag coefficient of a round body across the flow ' +
          '(the textbook figure for a cylinder below its critical Reynolds number; held at every Mach number). The fins are `surfaces`; the tower is left out. Not from a tunnel',
      ),
      from: doc(0, 'the fins’ trailing edges, the stations’ zero'),
      to: estimated(
        777 * IN,
        'the side’s area lies about station 388.5 in (the body’s 49,560 sq in about 354 in and the spacecraft’s 4,600 about 760 in); spread evenly from the base, that is a stretch 777 in long. ' +
          'The stack itself is 820.6 in to the canister’s top. The spacecraft’s area and its middle are round figures of ours and the even spread is a choice, so this is an estimate, not a derivation',
      ),
    },
    sheds: [
      {
        on: 'tower-clamp',
        name: 'Escape tower',
        from: doc(CANISTER_TOP * IN, 'SEDR 104, Figure 1-3: the tower stands on the canister’s top'),
        to: doc(SPIKE_TIP * IN, 'SEDR 104, Figure 1-3: spike tip at 284.55 in above the capsule’s widest plane'),
        radius: estimated(0.2, 'the escape motor’s case is 15 in across (SEDR 104, Figure 1-3); the pylon under it is wider and open'),
        ahead: estimated(
          0.35,
          'spike first: the 15 in motor case (0.11 sq m) and the open pylon’s tubes behind it, by judgement. Not measured',
        ),
        astern: estimated(0.5, 'clamp ring first: the open pylon, the nozzles and the case’s flat end, by judgement. Not measured'),
        side: {
          dragArea: estimated(1.2, 'side on: a 15 in case 4 ft long, the spike and the pylon’s tubes, about 1 sq m at 1.2. By judgement'),
          from: doc(CANISTER_TOP * IN, 'the tower’s foot'),
          to: doc(SPIKE_TIP * IN, 'the spike’s tip'),
        },
        // The clamp ring is let go first, so both rockets push on the tower alone: the stack feels nothing of them but their exhaust, which is not modelled.
        motors: TOWER_MOTORS,
      },
      {
        on: 'adapter-clamp',
        name: 'Redstone booster',
        from: doc(0, 'the fins’ trailing edges'),
        to: doc(BOOSTER_TOP * IN, `${TMX_4}, Figure 4-1: the booster’s top, 708 in`),
        radius: doc(35 * IN, `${TMX_4}, Figure 4-11: body diameter 70 in`),
        ahead: estimated(
          3.0,
          'adapter first: the open, flat end of a 70 in cylinder (2.48 sq m) at 1.2, between the 0.8 of a flat-faced cylinder below the speed of sound and the 1.6 or so above it. One figure at every Mach number. Not measured',
        ),
        astern: estimated(
          2.7,
          'tail first: the same flat end with the nozzle in it and four fins edge on, taken a little less. By judgement',
        ),
        side: {
          dragArea: estimated(
            38.4,
            '70 in by 708 in is 49,560 sq in (32.0 sq m), at 1.2, the drag coefficient of a round body across the flow. The fins are `surfaces`. Not from a tunnel',
          ),
          from: doc(0, 'the fins’ trailing edges'),
          to: doc(BOOSTER_TOP * IN, 'the booster’s top'),
        },
        surfaces: [
          {
            name: 'fins',
            station: 55.2 * IN,
            slope: 3.15,
            confidence: 'estimated',
            source: 'the stack’s own fins (`body.surfaces`): Barrowman’s method, subsonic, held at every Mach number and at every angle',
          },
        ],
        push: o.push,
      },
      retropack(CAPSULE_PLANE, o.retropackMass),
    ],
    limits: {
      qAlpha: estimated(
        4000 * 47.880259 * (Math.PI / 180),
        'not in anything read: no bending strength, design angle of attack or load factor of the Mercury-Redstone is in the reports here. 4,000 lb/sq ft degrees (3,340 Pa rad) is of the order ' +
          'launch vehicles of the time are credited with, and at Freedom 7’s greatest dynamic pressure (586 lb/sq ft: Postlaunch Report 4.2) it is 6.8 degrees off the wind. Ours',
      ),
      joint: 'adapter-clamp',
      drogue: estimated(
        7000,
        'not in anything read. Opened at Mach 1.5 at 70,000 ft, the most remembered of the Mercury drogue’s qualification, it would meet 7.0 kPa (0.7 times 4.44 kPa times 1.5 squared); ' +
          'a good flight opens it falling at its terminal speed, in about 4 kPa. Ours',
      ),
      main: estimated(
        5000,
        'not in anything read. The main had to open with the drogue failed, the spacecraft falling alone at its terminal speed: its weight over its own drag area, 4.0 kPa at any height. A quarter over that. Ours',
      ),
      torn: estimated(0.05, 'a canopy torn or streaming is taken to keep a twentieth of its drag area: chosen, not recorded'),
      pull: {
        main: estimated(
          80_000,
          'not in anything read: no strength of the ringsail’s lines or riser is in the reports here. Flown here, the main pulls 42 kN at most as it fills behind the drogue (4.0 g) and 52 kN ' +
            'when it has to open with the drogue failed (5.1 g), the case it was built for; half as much again as that. Full, it would pull as hard in 340 Pa, which it never meets ' +
            'unless it is let out above the air and carried into it. Ours',
        ),
      },
    },
  };
}

const HANDBOOK =
  'quoted from memory as the figure the CRC Handbook of Chemistry and Physics gives; the handbook was not opened, no edition or page is recorded, and it is unverified';
/**
 * What the air's heat is worked on (src/sim/heating.ts). The shield's size, shape and thickness are the record's; how the
 * heat is shared out over each surface, and how well each radiates, are not in anything read, and say so. Nothing is fitted:
 * no temperature measured on the flight is in the sources read, so there is nothing here to hold the result against.
 */
export function heated(starts: Measure): Heating {
  return {
    noseRadius: doc(80 * IN, 'NASA CR-649: the heat shield is a spherical cap of 80 in radius'),
    starts,
    surfaces: [
      {
        name: 'Heat shield',
        materials: ['heatsink-beryllium'],
        share: {
          down: estimated(
            0.9,
            'the laminar heat flux over a sphere falls off from its stagnation point about as the cosine of the angle to the power 1.5, and the cap reaches only 27.7 degrees ' +
              '(74.5 in across on an 80 in radius): 0.83 at the rim, some 0.9 over the face. The rise at the corner is left out. No measured distribution read',
          ),
        },
        arealMass: estimated(
          1848 * 1.0 * IN,
          `Hammack and Heberlig (p. 5): a beryllium heat sink "approximately 1-inch-thick"; beryllium taken as 1,848 kg/m3 (${HANDBOOK}): 46.9 kg behind each square metre, 140 kg over the cap's 2.98 m2. ` +
            'The thickness is the record’s and approximate; the density is not from anything read, so the product is an estimate',
        ),
        specificHeat: estimated(
          1825,
          `beryllium at 25 C, ${HANDBOOK}. It rises with temperature (about half as much again by 600 K, also from memory), so held constant it overstates the rise`,
        ),
        emissivity: estimated(
          0.5,
          'between bare polished beryllium (about 0.2) and an oxidised face (about 0.6): the shield’s finish is not in anything read',
        ),
        limit: estimated(1560, `beryllium melts at 1,287 C: ${HANDBOOK}`),
      },
      {
        name: 'Afterbody shingles',
        materials: ['shingle-rene41'],
        share: {
          up: estimated(
            0.3,
            'a 20-degree cone flank in attached flow, against the stagnation point of a 2 m sphere: a judgement. CR-649 has the measurements; not read for them',
          ),
          down: estimated(
            0.05,
            'in the wake behind the shield: a few per cent of the stagnation flux is the usual figure for a blunt body’s afterbody. CR-649 not read for it',
          ),
        },
        arealMass: estimated(
          8250 * 0.016 * IN,
          'Hammack and Heberlig; CR-649: Rene 41 shingles 0.016 in thick, at 8.25 g/cm3 for the alloy: 3.35 kg/m2. The gauge is the record’s; the density is quoted from memory of the maker’s data sheet, ' +
            'which was not opened, so the product is an estimate and unverified. The insulation behind is left out',
        ),
        specificHeat: estimated(
          452,
          'Rene 41 at room temperature, 0.108 Btu/lb F, as its maker’s data sheet is remembered: quoted from memory, not looked up, unverified',
        ),
        emissivity: estimated(0.85, 'the shingles were given a dark oxidised finish so as to radiate: no figure read'),
        limit: estimated(1255, 'Rene 41 is used to about 1,800 F: the shingles’ own limit is not in anything read'),
      },
      {
        name: 'Recovery compartment shingles',
        materials: ['shingle-beryllium'],
        share: {
          up: estimated(0.15, 'a cylinder lying along the flow behind the canister: half the cone’s share, by judgement'),
          down: estimated(0.03, 'furthest back in the wake: by judgement'),
        },
        arealMass: estimated(
          1848 * 0.22 * IN,
          `Hammack and Heberlig; CR-649: beryllium shingles 0.22 in thick, at 1,848 kg/m3 (${HANDBOOK}): 10.3 kg/m2. The gauge is the record’s; the density is not from anything read, so the product is an estimate`,
        ),
        specificHeat: estimated(1825, `beryllium at 25 C, ${HANDBOOK}`),
        emissivity: estimated(0.5, 'as the heat shield: between polished and oxidised beryllium, the finish not read'),
        limit: estimated(1560, `beryllium melts at 1,287 C: ${HANDBOOK}`),
      },
      {
        name: 'Booster skin, aft section',
        materials: [],
        share: { up: estimated(0.1, 'a cylinder’s side at no angle to the flow, far behind the nose: by judgement. No measurement read') },
        arealMass: estimated(
          2680 * 0.09 * IN,
          `${TMX_4}.2.1 (vehicles/redstone-mrlv.md): aft section skin 0.090 in of 5052 aluminium, at 2.68 g/cm3 for the alloy: 6.1 kg/m2. The gauge is the record’s; the density is quoted from memory, ` +
            'from no source opened, so the product is an estimate and unverified',
        ),
        specificHeat: estimated(880, '5052 aluminium at room temperature, as remembered: quoted from memory, not looked up, unverified'),
        emissivity: estimated(0.85, 'white paint: by judgement'),
        limit: estimated(
          475,
          'aluminium alloys of this kind lose their strength from about 200 C: the booster’s own limit is not in anything read',
        ),
      },
    ],
  };
}

/** What the stack's turning body needs from a flight (`stack`): the weights of its own booster and spacecraft, and its own events. */
export interface Stack {
  /** The booster's name ('MR-7') and its dry weight, lb, with the damping compound in its aft unit, lb, and where that figure comes from. */
  booster: string;
  boosterDry: number;
  compound: number;
  compoundSource: string;
  /** The whole vehicle at liftoff, lb, and how sure the liquids it leaves are (`derived`, from documented weights, or `estimated`). */
  liftoff: number;
  fluids: 'derived' | 'estimated';
  /** The spacecraft at launch, with its tower, and in its "orbit" configuration, lb, and what those two rest on. */
  capsuleLaunch: number;
  capsuleOrbit: number;
  orbitWeight: { confidence: MassPart['confidence']; source: string };
  towerWeight: { confidence: MassPart['confidence']; source: string };
  /** The escape tower let go, s. */
  tower: Measure;
  /** The side the automatic control keeps toward the Earth (vehicle.ts `capsule.earthward`). */
  earthward: Measure;
  /** How hard the posigrades push the spacecraft and the booster apart, m/s. */
  push: Measure;
  /** The retropack as it fell away, kg. */
  retropackMass: Measure;
  /** The capsule's rate command mode, if it had one (types.ts `rcs.rate`). */
  rate?: { full: Measure; deadband: Measure };
}

/** A flight of the stack: its day and its vehicle's own figures. The rest is the hardware's, above. */
export interface Day {
  winds: Winds;
  azimuth: Measure;
  liftoffMass: Measure;
  thrust: Measure;
  isp: Measure;
  cutoff: Measure;
  /** The capsule let go: when, s from liftoff. */
  separation: {
    at: Measure;
    /** The capsule alone, kg, and the booster it leaves behind, kg. */
    mass: Measure;
    boosterMass: Measure;
    /** How fast the two part, m/s, shared between them by their masses. */
    speed: Measure;
    /**
     * The Earth-fixed heading at separation, degrees true, where the record gives one. No simulator reads it:
     * tests/sim.test.mjs starts the capsule's half from the record's separation, and takes the run's own heading where this is missing.
     */
    heading?: Measure;
  };
  /** When each retrorocket lights, s from liftoff, and how far below the local horizontal their thrust points, degrees. */
  retro: { fires: Measure[]; pitch: Measure };
  /** The retropack dropped: when, s, and the capsule's mass afterwards, kg. */
  retropack: { at: Measure; mass: Measure };
  /** The heights the drogue and the main parachute are let out at, m. */
  drogue: Measure;
  main: Measure;
  /** What the shield and skin stood at on the pad, K. */
  starts: Measure;
  stack: Stack;
  /** What the pilot came down in and what on, as the deck's card says it (sim/plan.ts `Lands`). */
  lands: Lands;
}

/**
 * The A-7's nozzle as its fire's shape takes it (plan.ts `Nozzle`; only viewer/plume.ts reads it): the same engine on
 * every flight. The exit's pressure is the figure the fire was first drawn by, judged against film of the launches with
 * the chamber's pressure: expanded isentropically through 3.61:1 as a gas of gamma 1.22 the chamber's 318 psia would leave
 * at 1.09 atmospheres, and at sea level the jet is very nearly matched either way.
 */
export const A7_NOZZLE = {
  chamber: doc(318 * 6894.757, 'Aircraft Engine Historical Society, "The Redstone Engine": 318 psia (secondary)'),
  expansion: estimated(3.61, 'not found in anything read: the area ratio the fire was first drawn with'),
  exit: estimated(
    0.9 * 101_325,
    'about nine tenths of an atmosphere: the chamber’s 318 psia over the nozzle’s pressure ratio, as first estimated for the fire',
  ),
};

/** The A-7's nozzle exit area, derived on MR-3's cutoff: the same engine on every flight. */
export const EXIT_AREA = derived(
  (6.3 * 9.80665 * MR3_CUTOFF_MASS - MR3.thrust) / 101_325,
  `${PLR}, section 4.2: the load at cutoff was 6.3 g, so the thrust there, in near vacuum, was 6.3 times the weight left (14,040 lb): 88,450 lbf, 9,590 lbf more than at sea level, ` +
    'which over one atmosphere is 652 sq in of nozzle exit. (The A-7 is elsewhere rated 78,000 lbf at sea level and 89,000 lbf in vacuum: Aircraft Engine Historical Society, "The Redstone Engine". That is 749 sq in, and would give 6.4 g.) ' +
    'The nozzle’s, so the same on every flight of the A-7',
);

/** How long the A-7 can burn before a propellant runs out, s: an estimate on a documented burning time. */
const DEPLETION = estimated(
  143.5,
  `${TMX_4}: a nominal burning time of 143.5 s, taken as when a propellant would have run out, which the report does not say (on MR-3’s figures 1,285 lb of liquids are then still aboard by our count). ` +
    'The 143.5 s is documented as a burning time; that it is depletion is our reading of it, so as this input it is an estimate',
);

/** The tilt programme: degrees from the launch vertical against seconds, in the plane of the azimuth. */
const TILT: Curve = {
  points: TILT_FIGURE.map(([t, tilt]) => [TILT_BEGINS + ((t - 24.3) * (TILT_ARREST - TILT_BEGINS)) / (TILT_ARREST - 24.3), tilt]),
  confidence: 'estimated',
  source:
    'documented: begins 15.0 s (MR-BD, MR-3 and MR-4), arrested 131.7 s (NASA TM X-53107, Table 3-1), 41 degrees at the end (Figure 4-9; Table 8-1). ' +
    'Estimated: the curve between, which is Figure 4-9 (read to about half a degree) stretched from its 24.3 s beginning to 15.0 s',
};

/** The area the drag coefficients are referred to, m^2. */
const AREA = derived(CAPSULE_AREA, 'the capsule is 74.5 in across at its widest (CR-649): 30.27 sq ft');

/** Drag coefficient against Mach number going up on the booster, and coming down heat shield first. */
const ASCENT_DRAG: Curve = {
  points: [
    [0, 0.52],
    [0.5, 0.56],
    [0.8, 0.66],
    [1.0, 0.9],
    [1.1, 0.92],
    [1.5, 0.8],
    [2, 0.7],
    [2.5, 0.58],
    [3, 0.48],
    [4, 0.36],
    [5, 0.31],
    [6, 0.3],
    [7, 0.3],
  ],
  confidence: 'estimated',
  source:
    `${TMX_491}, Figure 20: drag coefficient at no angle of attack of the capsule with its escape tower, alone in the tunnel, read to about 0.02. ` +
    'On the booster the capsule has no wake of its own and the Redstone adds its skin, fins and base: the two are taken to cancel, which nobody measured for us. No drag figure for the whole vehicle was found',
};
const ENTRY_DRAG: Curve = {
  points: [
    [0, 1.0],
    [0.5, 1.05],
    [0.8, 1.2],
    [1, 1.3],
    [1.5, 1.42],
    [2, 1.52],
    [3, 1.57],
    [4, 1.6],
    [20, 1.6],
  ],
  confidence: 'documented',
  source: `${TMX_491}, Figure 22: drag coefficient at no angle of attack of the re-entry configuration, Mach 0.5 to 20, read to about 0.03; "above Mach 4 it remains constant"`,
};

/** Each retrorocket's thrust, N, and burning time, s. */
const RETRO_THRUST = doc(992 * LBF, 'McDonnell SEDR 104: 992 lbf (SP-45 has a nominal 1,000 lbf for 10 s, a quarter less impulse)');
const RETRO_BURN = doc(13.2, 'McDonnell SEDR 104: 13.2 s');

/** The parachutes as the simulator has them: the drag area each adds once full, m^2, and how long it takes to fill, s. */
const DROGUE = {
  dragArea: estimated(
    0.5 * Math.PI * (3 * FT) ** 2,
    'a 6 ft conical ribbon parachute (Hammack p. 9) at a drag coefficient of 0.5, the usual figure for the type: no measured figure found',
  ),
  fills: estimated(1, 'a small ribbon parachute fills in about a second: not recorded'),
};
const MAIN = {
  dragArea: derived(
    (2 * 2579.0 * LB * 9.80665) / (1.225 * (29 * FT) ** 2) - 1.0 * CAPSULE_AREA,
    'what brings Freedom 7’s re-entry weight (2,579.0 lb: the Postlaunch Report, 3.1) down at 29 ft/s at sea level ("descent velocities of 28 to 30 feet per second were always achieved", Hammack p. 25), less the capsule’s own drag: ' +
      '0.82 on a 63 ft canopy. The canopy’s, so the same on every flight',
  ),
  fills: estimated(
    9,
    'it comes out reefed and then opens: Shepard reports "main on green" at 10:15, "main chute is reefed" at 10:18, "coming unreefed" at 10:22 and "good" at 10:28 (Postlaunch Report, air-ground transcript). Nine seconds from out to full, evenly, is ours',
  ),
};

/**
 * The stack's own figures as `plan` flies them, the same on every flight of it: the A-7's exit area and how long it can
 * burn, the tilt programme, the area the drag is referred to and the drag curves, the retrorockets, the parachutes.
 * tests/sim.test.mjs weighs each that is not documented by flying a plan made of a changed copy.
 */
export interface Hardware {
  exitArea: Measure;
  depletion: Measure;
  tilt: Curve;
  area: Measure;
  ascentDrag: Curve;
  entryDrag: Curve;
  retro: { thrust: Measure; burn: Measure };
  drogue: { dragArea: Measure; fills: Measure };
  main: { dragArea: Measure; fills: Measure };
}

/** The fastest a Mercury capsule's pilot walks away from on his couch, m/s: every Mercury capsule's, ballistic or in orbit. */
export const LANDING_SPEED = estimated(
  12,
  'not in anything read. The design landing was 28 to 30 ft/s (8.5 to 9.1 m/s: Hammack p. 25) onto the landing bag; 12 m/s, a third more, is taken as the most a pilot on the couch walks away from. Ours',
);

export const HARDWARE: Hardware = {
  exitArea: EXIT_AREA,
  depletion: DEPLETION,
  tilt: TILT,
  area: AREA,
  ascentDrag: ASCENT_DRAG,
  entryDrag: ENTRY_DRAG,
  retro: { thrust: RETRO_THRUST, burn: RETRO_BURN },
  drogue: DROGUE,
  main: MAIN,
};

const atTime = (at: Measure) => [{ time: at.value }];

/**
 * A Mercury-Redstone flight's plan (src/sim/plan.ts): what the simulators fly. Its bodies base first (the booster, the
 * escape tower, the retropack, the capsule), the joints between them, the A-7 on the booster's propellant, the three
 * retrorockets and the escape rocket, the capsule's attitude jets, its two parachutes, the record's sequence by the
 * clock and the abort a hand's command sets off. Where the plan wants a figure the record does not give it is worked
 * from those it does, `derived`, and says how. `body` is the stack as a rigid body (types.ts `Body`), as `stack` makes it;
 * `hw` the stack's own figures (`HARDWARE`).
 */
export function plan(day: Day, checks: readonly FlightCheck[], body: Body = stack(day.stack), hw: Hardware = HARDWARE): FlightPlan {
  const e = { thrust: day.thrust, isp: day.isp, exitArea: hw.exitArea, cutoff: day.cutoff, depletion: hw.depletion };
  const flow = e.thrust.value / (G0 * e.isp.value);
  const cutoff = e.cutoff.value;
  const vacuum = vacuumOf(e);
  const sep = day.separation;
  const burned = flow * cutoff;
  const towerMass = day.liftoffMass.value - burned - sep.boosterMass.value - sep.mass.value;
  const hasTower = Boolean(body.tower || body.escape);
  const bodies: BodyDef[] = [
    {
      id: 'redstone',
      label: 'Booster',
      count: 1,
      mass: derived(
        sep.boosterMass.value + burned,
        `its mass at separation (${sep.boosterMass.value} kg) and what its engine burns to cutoff, thrust over g0 times specific impulse for ${cutoff} s`,
      ),
      dry: sep.boosterMass,
    },
    ...(hasTower
      ? [
          {
            id: 'escape-tower',
            label: 'Escape tower',
            count: 1,
            mass: derived(towerMass, 'what leaves the pad less the booster at liftoff and the capsule at separation'),
          },
        ]
      : []),
    {
      id: 'retro-package',
      label: 'Retropack',
      count: 1,
      mass: derived(sep.mass.value - day.retropack.mass.value, 'the capsule at separation less the capsule once the retropack has gone'),
    },
    { id: 'mercury-capsule', label: 'Capsule', count: 1, mass: day.retropack.mass, aero: { area: hw.area, drag: hw.entryDrag } },
  ];
  const joints: JointDef[] = [
    ...(hasTower
      ? [{ id: 'tower-clamp', label: 'Tower jettisoned', gone: ['escape-tower'], ...(body.tower ? { at: body.tower.at } : {}) }]
      : []),
    {
      id: 'adapter-clamp',
      label: 'Capsule separation',
      gone: ['redstone'],
      push: sep.speed,
      at: sep.at,
      after: sep.mass,
      leaves: sep.boosterMass,
      ...(sep.heading ? { heading: sep.heading } : {}),
    },
    { id: 'retropack-straps', label: 'Retropack jettisoned', gone: ['retro-package'], at: day.retropack.at, after: day.retropack.mass },
  ];
  const nature = body.engine;
  const engines: EngineDef[] = [
    {
      id: 'a-7',
      label: 'Booster engine',
      body: 'redstone',
      count: 1,
      tanks: ['redstone-propellant'],
      thrust: { seaLevel: e.thrust, vacuum },
      isp: {
        seaLevel: e.isp,
        vacuum: derived(
          vacuum.value / (flow * G0),
          'the vacuum thrust over the flow (sea-level thrust over g0 times specific impulse) and g0',
        ),
      },
      exitArea: e.exitArea,
      nozzle: A7_NOZZLE,
      kind: nature?.kind ?? 'liquid',
      ...(nature?.throttle ? { throttle: { range: nature.throttle } } : {}),
      gimbal: { deflection: body.control.deflection, station: body.control.station },
      starts: nature
        ? { count: nature.starts, ground: false, confidence: nature.confidence, source: nature.source }
        : { count: 1, ground: false, confidence: 'estimated' },
      depletion: e.depletion,
    },
    ...day.retro.fires.map(
      (_, k): EngineDef => ({
        id: `retrorocket-${k + 1}`,
        label: `Retrorocket ${k + 1}`,
        body: 'retro-package',
        count: 1,
        tanks: [],
        thrust: { vacuum: hw.retro.thrust },
        kind: 'solid',
        burn: hw.retro.burn,
        starts: { count: 1, ground: false, confidence: 'documented', source: 'a solid motor: lit once' },
      }),
    ),
    ...(body.escape
      ? [
          {
            id: 'escape-motor',
            label: 'Escape rocket',
            body: 'escape-tower',
            count: 1,
            tanks: [],
            thrust: { vacuum: body.escape.thrust },
            kind: 'solid' as const,
            burn: body.escape.burn,
            impulse: body.escape.impulse,
            ...(body.escape.curve ? { curve: body.escape.curve } : {}),
            starts: { count: 1, ground: false, confidence: 'documented' as const, source: 'a solid motor: lit once' },
          },
        ]
      : []),
  ];
  const tanks: TankDef[] = [
    {
      id: 'redstone-propellant',
      label: 'Booster propellant',
      body: 'redstone',
      load: derived(
        flow * e.depletion.value,
        'the flow (thrust over g0 times specific impulse) for the time it can burn before a propellant runs out',
      ),
      holds: 'propellant',
    },
  ];
  const rcs = body.capsule.rcs;
  for (const s of rcs?.supplies ?? [])
    tanks.push({ id: `rcs:${s.name}`, label: s.name, body: 'mercury-capsule', load: s.propellant, holds: 'control', isp: s.isp });
  const thrusters: ThrusterSet[] = rcs
    ? rcs.supplies.map((s) => ({
        id: `${s.name}-rcs`,
        label: s.name,
        body: 'mercury-capsule',
        does: ['rotation'],
        tank: `rcs:${s.name}`,
        mode: s.mode,
        chambers: rcs.thrusters.filter((t) => t.supply === s.name),
        ...(rcs.rate && s.mode === 'manual' ? { rate: rcs.rate.full } : {}),
      }))
    : body.capsule.jets
      ? [
          {
            id: 'attitude-jets',
            label: 'Attitude jets',
            body: 'mercury-capsule',
            does: ['rotation'],
            mode: 'automatic',
            torque: body.capsule.jets,
          },
        ]
      : [];
  const lim = body.limits;
  const chutes: PlanChute[] = [
    {
      id: 'drogue-chute',
      label: 'Drogue',
      body: 'mercury-capsule',
      ...hw.drogue,
      ...(lim ? { strength: lim.drogue, ...(lim.pull?.drogue ? { pull: lim.pull.drogue } : {}) } : {}),
    },
    {
      id: 'main-chute',
      label: 'Main parachute',
      body: 'mercury-capsule',
      ...hw.main,
      instead: ['drogue-chute'],
      ...(lim ? { strength: lim.main, ...(lim.pull?.main ? { pull: lim.pull.main } : {}) } : {}),
    },
  ];
  const limits: LimitDef[] = [];
  if (lim) limits.push({ of: 'qAlpha', value: lim.qAlpha, at: lim.joint });
  const crewLimits = body.capsule.limits;
  if (crewLimits) limits.push({ of: 'landing-speed', value: crewLimits.landingSpeed }, { of: 'load', value: crewLimits.load });
  const craft: Craft = {
    id: 'mercury-redstone',
    label: 'The stack',
    mass: day.liftoffMass,
    bodies,
    joints,
    engines,
    tanks,
    thrusters,
    chutes,
    limits,
    drag: [{ until: sep.at, area: hw.area, curve: hw.ascentDrag }],
    rigid: body,
    heating: heated(day.starts),
    lands: day.lands,
    ...(body.sheds ? { sheds: body.sheds } : {}),
  };
  const attitude: AttitudeDef[] = [
    { id: 'tilt-programme', label: 'Tilt programme', hold: { programme: hw.tilt, azimuth: day.azimuth }, source: hw.tilt.source },
    { id: 'retro-attitude', label: 'Retro attitude', hold: { retro: day.retro.pitch }, source: day.retro.pitch.source },
    {
      id: 'shield-first',
      label: 'Heat shield first',
      hold: { blunt: true, ...(body.capsule.earthward ? { earthward: body.capsule.earthward } : {}) },
      source: 'the capsule comes down heat shield first',
    },
  ];
  const events: EventDef[] = [
    {
      id: 'a-7-ignition',
      label: 'Ignition',
      when: [{ time: 0 }],
      do: [{ ignite: 'a-7' }],
      automatic: true,
      source: 'the clock starts with the engine',
    },
    {
      id: 'a-7-cutoff',
      label: 'Cutoff',
      when: atTime(e.cutoff),
      do: [{ cut: 'a-7' }],
      automatic: true,
      at: e.cutoff,
      source: e.cutoff.source,
    },
  ];
  if (body.tower)
    events.push({
      id: 'tower-jettison',
      label: 'Tower jettisoned',
      when: atTime(body.tower.at),
      do: [{ separate: 'tower-clamp' }],
      automatic: true,
      at: body.tower.at,
      source: body.tower.at.source,
    });
  const fires = day.retro.fires;
  events.push(
    {
      id: 'capsule-separation',
      label: 'Capsule separation',
      when: atTime(sep.at),
      do: [{ separate: 'adapter-clamp' }, { attitude: 'retro-attitude' }],
      automatic: true,
      at: sep.at,
      source: sep.at.source,
    },
    // the retrorockets' sequence: begun with the first, each other so long after it (a hand may begin it at any time)
    ...fires.map(
      (f, k): EventDef => ({
        id: k === 0 ? 'retrofire' : `retrofire-${k + 1}`,
        label: k === 0 ? 'Retrorocket sequence: the first fires' : `Retrorocket ${k + 1} fires`,
        when: k === 0 ? atTime(f) : [{ after: 'retrofire', wait: f.value - fires[0]!.value }],
        do: [{ ignite: `retrorocket-${k + 1}` }],
        automatic: true,
        at: f,
        source: f.source,
      }),
    ),
    {
      id: 'retropack-jettison',
      label: 'Retropack jettisoned',
      when: atTime(day.retropack.at),
      do: [{ separate: 'retropack-straps' }, { attitude: 'shield-first' }],
      automatic: true,
      at: day.retropack.at,
      source: day.retropack.at.source,
    },
    {
      id: 'drogue-deploy',
      label: 'Drogue out',
      when: [{ after: 'capsule-separation' }, { height: day.drogue.value, going: 'down' }],
      do: [{ deploy: 'drogue-chute' }],
      automatic: true,
      source: day.drogue.source,
    },
    {
      id: 'main-deploy',
      label: 'Main parachute out',
      when: [{ after: 'drogue-deploy' }, { height: day.main.value, going: 'down' }],
      do: [{ deploy: 'main-chute' }],
      automatic: true,
      source: day.main.source,
    },
  );
  if (body.escape)
    events.push({
      id: 'escape-abort',
      label: 'Abort',
      when: [{ command: 'abort-handle' }],
      do: [{ cut: 'a-7' }, { ignite: 'escape-motor' }, { separate: 'adapter-clamp' }],
      automatic: false,
      source: 'the abort handle, or the sequencer’s abort signal',
    });
  if (body.escape?.sequence?.retropack)
    events.push({
      id: 'abort-retropack-drop',
      label: 'Retropack dropped as the spacecraft leaves',
      when: [{ after: 'escape-abort' }],
      do: [{ separate: 'retropack-straps' }],
      automatic: true,
      source: body.escape.sequence.ceiling.source,
    });
  return {
    kind: 'ballistic',
    craft: [craft],
    events,
    attitude,
    winds: day.winds,
    checks: checks.map((c) => ({ ...c, of: 'flight' as const })),
    record: {
      ...(lim ? { torn: lim.torn } : {}),
      ...(body.escape
        ? {
            abort: {
              ...(body.escape.sequence ? { sequence: body.escape.sequence } : {}),
              ...(body.escape.record ? { record: body.escape.record } : {}),
            },
          }
        : {}),
    },
  };
}

/** The drogue and the main as drawn (viewer/chute.ts; `Flight.flies.chutes`): the same canopies on every flight of the stack. */
export const CHUTES: ChuteDef[] = [
  {
    on: 'drogue-chute',
    at: 'AntennaCanister',
    cut: 'ribbon',
    diameter: doc(6 * FT, 'Hammack and Heberlig, p. 9: a 6 ft conical ribbon drogue parachute'),
    gores: estimated(8, 'not in anything read: a ribbon parachute this small is drawn with eight'),
    lines: estimated(12 * FT, 'not recorded: twice the canopy’s diameter, a usual proportion for a drogue'),
    riser: estimated(
      7,
      'not recorded: long enough to carry the canopy clear of the wake of a 74.5 in heat shield, some four of its diameters',
    ),
    colours: {
      value: ['#e9e4d6'],
      confidence: 'estimated',
      source: 'undyed nylon, by judgement: no record of its colour has been read',
    },
    stretch: estimated(
      0.35,
      'not recorded: a mortar throws the pack to the end of 10.7 m of riser and lines at some thirty metres a second, by judgement',
    ),
  },
  {
    on: 'main-chute',
    at: 'RecoveryCompartment',
    cut: 'ringsail',
    diameter: doc(
      63 * FT,
      'Hammack and Heberlig, "Landing system" (p. 9): "the main chute is a 63-foot, ring-sail chute" (as the plan’s `main` parachute has it)',
    ),
    gores: estimated(
      48,
      'not in anything read. Forty-eight is the number remembered for the Mercury ringsail and it is drawn so: unverified',
    ),
    lines: estimated(63 * FT, 'not recorded: a line as long as the canopy is wide, the usual proportion for the type'),
    riser: estimated(3, 'not recorded: a short riser from the top of the recovery compartment, by judgement'),
    colours: {
      value: ['#ee7a30', '#efeadc'],
      confidence: 'documented',
      source:
        'Hammack and Heberlig, p. 9: "a 63-foot, ring-sail chute with alternate international orange and white gores". ' +
        'Which colours, and that they turn about by gore, are the record’s; the two shades drawn are ours, from no colour chip',
    },
    reefed: {
      mouth: estimated(0.25, 'drawn: a reefed ringsail is a narrow bulb. The reefing line’s length is not recorded'),
      until: derived(
        7,
        'Postlaunch Report, air-ground transcript: "main on green" at 10:15, "main chute is reefed" at 10:18, "coming unreefed" at 10:22: about seven seconds after it came out. ' +
          'Drawn only: the simulator’s drag grows evenly over the nine seconds (`HARDWARE.main.fills`)',
      ),
    },
    stretch: estimated(
      0.8,
      'not recorded: the antenna canister, leaving on the drogue, draws 22 m of riser and lines out of the recovery compartment at the 25 to 30 m/s it falls behind by: by judgement',
    ),
  },
];
