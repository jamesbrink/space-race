/**
 * What the Skylab visits' plans share (vehicles/saturn-ib-plan.ts `saturnIBPlan`, each visit's orbital.ts): the workshop
 * they went up to as a target given by its orbit (sim/plan.ts `TargetDef` `orbit`), the escape on the Skylab Saturn IB
 * from Launch Complex 39B, and the command module's entry steered to its place. Every figure a visit has its own of is in
 * its record; nothing here names a visit.
 */
import { assumed, derived, doc, estimated, type Measure } from '../../../../src/measure.ts';
import type { AbortMode, AttitudeDef, EngineDef, FlightPlan, TargetDef } from '../../../../src/sim/plan.ts';
import type { Flight, OrbitalFix } from '../../../../src/types.ts';
import { saturnIBFlies } from '../../apollo/vehicles/saturn-ib-flies.ts';
import { EARTH } from '../../../../src/world/bodies.ts';

const FT = 0.3048;
const LB = 0.45359237;
const NMI = 1852;
const DEG = Math.PI / 180;

/** The Saturn Workshop's own report, which gives its masses and sizes. */
export const TMX64814 = 'MSFC Skylab Mission Report — Saturn Workshop (NASA TM X-64814, October 1974)';
/** The history of NASA's rendezvous, whose fifth chapter sets out the Skylab visits' profile. */
export const JSC63400 = 'History of Space Shuttle Rendezvous (JSC-63400, Revision 3, 2011), chapter 5, Skylab';
/** The second visit's mission report, whose appendix D has both visits' workshop masses. */
export const JSC08662 = 'Skylab Mission Report, Second Visit (JSC-08662, January 1974)';

/**
 * The workshop's drag area in its solar-inertial attitude, m²: its axis held square to the Sun, so that over a revolution
 * the motion sees it end-on and side-on in turn, and its arrays face-on to the Sun and edge-on to the motion as often as
 * not. Taken as King-Hele's customary 2.2 on a quarter of the cluster's outside (the area a convex body presents on the
 * average over every way it can lie: Cauchy), the cylinders of TM X-64814, fig. 2-1 (the workshop 22 ft across and 48 ft
 * long, the airlock, docking adapter and their shroud 10 ft across and 52 ft long), with the telescope mount's four wings
 * (521 by 101.5 in each, §7.2.1) at 2/π of their face (their normal along the Sun line, the motion swinging round it).
 * The wings the workshop kept are not counted: at 435 km the air moves the target a few metres a revolution, and the
 * rendezvous is solved on where it is.
 */
export const WORKSHOP_DRAG_AREA: Measure = (() => {
  const side = (d: number, l: number) => Math.PI * d * l + (Math.PI * d * d) / 2;
  const cluster = (side(22 * FT, 48 * FT) + side(10 * FT, 52 * FT)) / 4;
  const wings = (4 * (521 * 0.0254) * (101.5 * 0.0254) * 2) / Math.PI;
  return estimated(
    2.2 * (cluster + wings),
    `m²: 2.2 (King-Hele, The Prediction of Satellite Lifetimes, §9.1) on a quarter of the cluster's outside and 2/π of the telescope mount's four wings (${TMX64814}, fig. 2-1 and §7.2.1), the attitude solar-inertial: chosen`,
  );
})();

/**
 * The workshop as a visit's target (sim/plan.ts `TargetDef` `orbit`): a craft of its own on the orbit the record gives
 * for it at an instant, flown on (and back) from there by gravity and the air, at its mass on the visit.
 */
export function workshopTarget(orbit: { fix: OrbitalFix }, epoch: string, mass: Measure): TargetDef {
  return { orbit, epoch, label: 'Skylab', mass, dragArea: WORKSHOP_DRAG_AREA };
}

/**
 * The workshop's place at an instant, as a launch's commentary gives it (so far downrange of the pad), on the plane the
 * launch put the spacecraft into: a launch to a rendezvous is aimed into the target's plane, so the spacecraft's tracked
 * state at insertion (`insertion`: its place, and its space-fixed heading, which with the latitude gives the plane) is
 * taken to lie in the workshop's. Laid out as a tracking vector at `at` (`OrbitalFix`): the plane carried back by the
 * Earth's turning from the insertion's instant to `at`, the pad's nearest point on it, and from there `downrange` along
 * the ground track the way the workshop goes; the orbit's mean height, the speed of a circle there, level, heading along the
 * plane (the latitudes geocentric, as space-fixed headings are reckoned).
 */
export function workshopInPlane(
  pad: { latitude: number; longitude: number },
  insertion: { at: number; latitude: number; longitude: number; heading: number },
  heights: [Measure, Measure],
  downrange: Measure,
  at: number,
  source: string,
): OrbitalFix {
  const gm = EARTH.gm.value;
  const height = (heights[0].value + heights[1].value) / 2;
  const speed = Math.sqrt(gm / (EARTH.equatorialRadius.value + height));
  const f = 1 / 298.257223563;
  const centric = (lat: number) => Math.atan((1 - f) ** 2 * Math.tan(lat * DEG));
  const unitAt = (lat: number, lon: number): Vec => [Math.cos(lat) * Math.cos(lon), Math.cos(lat) * Math.sin(lon), Math.sin(lat)];
  const [lat0, lon0] = [centric(insertion.latitude), insertion.longitude * DEG];
  const p = unitAt(lat0, lon0);
  const east: Vec = [-Math.sin(lon0), Math.cos(lon0), 0];
  const north = cross(p, east);
  const along = add(scale(east, Math.sin(insertion.heading * DEG)), scale(north, Math.cos(insertion.heading * DEG)));
  // (the plane is fixed among the stars; on the turning Earth at an earlier instant it lies further east)
  const turn = 7.2921159e-5 * (insertion.at - at);
  const n0 = unit(cross(p, along));
  const n: Vec = [n0[0] * Math.cos(turn) - n0[1] * Math.sin(turn), n0[0] * Math.sin(turn) + n0[1] * Math.cos(turn), n0[2]];
  const q = unitAt(centric(pad.latitude), pad.longitude * DEG);
  const foot = unit(add(q, scale(n, -dot(q, n))));
  const arc = downrange.value / 6_371_000;
  const w = add(scale(foot, Math.cos(arc)), scale(cross(n, foot), Math.sin(arc)));
  const motion = cross(n, w);
  const latc = Math.asin(w[2]);
  const lon = Math.atan2(w[1], w[0]);
  const e: Vec = [-Math.sin(lon), Math.cos(lon), 0];
  const heading = Math.atan2(dot(motion, e), dot(motion, cross(w, e)));
  const how = `${source}: on the plane of the spacecraft's tracked state at insertion, ${(downrange.value / NMI).toFixed(0)} nautical miles along it past the pad's nearest point, the orbit's mean height ${(height / 1000).toFixed(1)} km and a circle's speed there`;
  return {
    t: derived(at, how),
    latitude: derived(Math.atan(Math.tan(latc) / (1 - f) ** 2) / DEG, how),
    longitude: derived(lon / DEG, how),
    height: derived(height, how),
    speed: derived(speed, how),
    flightPath: derived(0, `${how}: the orbit near circular (its heights a few nautical miles apart)`),
    heading: derived(heading / DEG, how),
  };
}

type Vec = [number, number, number];
const add = (a: Vec, b: Vec): Vec => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale = (a: Vec, k: number): Vec => [a[0] * k, a[1] * k, a[2] * k];
const dot = (a: Vec, b: Vec): number => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec, b: Vec): Vec => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const unit = (a: Vec): Vec => scale(a, 1 / Math.hypot(...a));

const LES = 'North American Apollo News Reference, Launch Escape Subsystem, pp. 137–140';
const GROUND_TEST = 'Apollo Spacecraft S-64-602, design reference (NTRS 19690017921), figures 107–108';

/** The launch escape motor: the type's, as Apollo 7's (its escape.ts). */
export const escapeEngine: EngineDef = {
  id: 'launch-escape-motor',
  body: 'les',
  label: 'Launch escape motor',
  kind: 'solid',
  count: 1,
  tanks: [],
  starts: { count: 1, ground: true, confidence: 'assumed', source: LES },
  thrust: { vacuum: assumed(147_000 * 4.448221615, `${LES}, p. 140; mean pad thrust held at all altitudes for this model`) },
  burn: assumed(3.2, `${LES}, p. 140, nominal launch-escape motor burn`),
  burns: 'solid-perchlorate',
};

/**
 * The escape modes of a Skylab Saturn IB from Pad 39B, by the type's (Apollo 7's: its escape.ts), with the launch umbilical
 * tower, its crane and the crew access arm as what the tower must clear: Mode I until the tower went, Mode II to the
 * insertion, the abort to orbit from the record's opening of it. `csm`: the spacecraft at first motion, kg.
 */
export function skylabAborts(
  tower: Measure,
  insertion: Measure,
  csm: Measure,
  modes: { second: Measure; orbit: { from: Measure; perigee: Measure } },
): AbortMode[] {
  const translation = {
    engine: 'sm-rcs',
    duration: assumed(20, "Apollo 7 press kit (68-168K), p. 24: the Mode II translation, the type's"),
  };
  return [
    {
      until: tower,
      does: 'Mode I: fire the escape rocket to pull the command module away. After a clear escape, the tower and boost cover leave before the main parachutes.',
      escape: {
        tower: {
          engine: escapeEngine.id,
          cover: 'forward-shield-jettison',
          service: 'cm-sm-separation',
          stages: ['sib-separation', 'spacecraft-separation'],
          tower: 'les-jettison',
          propellant: assumed((4_700 * 2 * LB) / 3, `${LES}, p. 140, about two-thirds of 4,700 pounds`),
          dragArea: estimated(10, 'Projected command module and boost cover; single effective ballistic drag area'),
          hull: {
            centre: estimated(57, 'Escape pivot within the modeled command module, measured from the Saturn IB base'),
            spheres: [
              [-0.8, 1.95],
              [1, 1.15],
              [2.3, 0.85],
              [3.7, 0.75],
              [5, 0.65],
              [6.2, 0.62],
              [7.3, 0.57],
              [8.3, 0.47],
              [9.15, 0.41],
              [9.9, 0.36],
              [10.5, 0.3],
              [11, 0.24],
              [11.24, 0.04],
            ].map(([station, radius]) => ({
              station: estimated(station!, 'Rounded bounds of the modeled boost cover and launch escape tower along the vehicle axis'),
              radius: estimated(radius!, 'Rounded bounds of the modeled boost cover and launch escape tower across the vehicle axis'),
            })),
            obstacles: [
              { node: 'Umbilical_Tower', name: 'Launch umbilical tower' },
              { node: 'Hammerhead_Crane', name: 'Hammerhead crane' },
              { node: 'Service_Arm_9', name: 'Crew access arm' },
            ],
          },
          pitch: {
            until: assumed(42, `${GROUND_TEST}, fig. 107, cutoff for the pitch motor`),
            angle: estimated(30, 'Equivalent initial seaward pitch for the low abort. Pitch torque and aerodynamic moment are simplified.'),
            takes: assumed(0.5, `${LES}, p. 139, pitch motor burn time`),
          },
          canards: assumed(11, `${LES}, p. 137, canards deployed after abort`),
          turn: {
            mach: assumed(3.5, `${GROUND_TEST}, fig. 108, high-altitude turnaround`),
            takes: estimated(3, 'Smooth trim change toward heat shield first once the canards can turn the assembly'),
          },
          jettison: {
            after: assumed(14, `${GROUND_TEST}, fig. 107, low-altitude jettison`),
            height: assumed(24_000 * FT, `${GROUND_TEST}, fig. 108, high-altitude jettison`),
          },
          coverAfter: { low: assumed(0.4, `${GROUND_TEST}, fig. 107`), high: assumed(4, `${GROUND_TEST}, fig. 108`) },
          mainsAfterCover: assumed(
            14,
            'Apollo Operations Handbook SC-012 §2.9, low-altitude barometric bypass sequence; assumed common logic',
          ),
        },
      },
    },
    {
      until: modes.second,
      does: 'Mode II: separate from the S-IVB, translate away on the service-module jets for 20 seconds, then separate the command module for entry.',
      escape: { cut: true, separate: { entry: true, motor: translation } },
    },
    {
      from: modes.orbit.from,
      until: insertion,
      does: 'Mode IV: separate and use the service engine to reach orbit while keeping enough propellant to come back.',
      escape: {
        cut: true,
        separate: { service: { engine: 'sps', translation, mass: csm, goal: { kind: 'orbit', target: modes.orbit.perigee } } },
      },
    },
  ];
}

const CMC_PROGRAM =
  'Colossus 2A (Comanche 055, Apollo 11) flight program listing, REENTRY CONTROL, pp. 844 to 881: taken for the Skylab command modules’ Skylark, whose entry programs the Skylark GSOP (R-693) keeps and whose listing has not been read';

/**
 * A command module's entry steered to its target (sim/entry.ts), from the modules' parting: lift up until the computer's
 * commands are flown (no backup bank by hand is on any record read for the Skylab entries), then the digital autopilot on
 * the computer's commands, with the type's pad loads and roll constants.
 */
export function skylabEntry(target: { latitude: Measure; longitude: Measure }, source: string): AttitudeDef {
  return {
    id: 'entry-steered',
    label: 'Entry',
    source,
    hold: {
      entry: {
        target,
        initial: assumed(
          0,
          'lift up from the modules’ parting until the computer’s commands are flown: the Apollo procedure (Apollo 7 Mission Report §5.16.1), taken',
        ),
        computer: {
          kind: 'apollo',
          lad: assumed(
            0.3,
            'R-577, Colossus GSOP, Section 5 (Rev. 14), Fig. 7.0-1a: LADPAD, nominal 0.3; this flight’s pad load has not been read',
          ),
          lod: assumed(
            0.18,
            'R-577, Colossus GSOP, Section 5 (Rev. 14), Fig. 7.0-1a: LOD, nominal 0.18; this flight’s pad load has not been read',
          ),
          program: { confidence: 'assumed', source: CMC_PROGRAM },
        },
        roll: {
          rate: assumed(
            20,
            'Colossus 2A (Comanche 055) listing, CM ENTRY DIGITAL AUTOPILOT, roll constants: VM = 20 deg/s; taken for Skylark',
          ),
          acceleration: assumed(
            9.1,
            'Colossus 2A (Comanche 055) listing, CM ENTRY DIGITAL AUTOPILOT, roll constants: A = 9.1 deg/s², two jets; taken for Skylark',
          ),
        },
      },
    },
  };
}

/** A firing's impulse as a check (`<id>.velocity`), m/s, and how near: a twentieth where the record does not say. */
export const impulseCheck = (id: string, label: string, value: Measure, tolerance = 0.05 * value.value) => ({
  id: `${id}.velocity`,
  label,
  value: value.value,
  unit: 'm/s',
  tolerance,
  of: 'orbit' as const,
  confidence: value.confidence,
  source: value.source,
});

/** How far the workshop was at an instant (`<id>.range`), m. */
export const rangeCheck = (id: string, label: string, at: number, value: Measure, tolerance: number) => ({
  id: `${id}.range`,
  label,
  value: value.value,
  unit: 'm',
  tolerance,
  of: 'orbit' as const,
  confidence: value.confidence,
  source: value.source,
  when: { at, reading: 'range' as const },
});

const ELS = 'Apollo Experience Report: Earth Landing System (NASA TN D-7437), appendix A';
const MAIN_CHUTE = 'Northrop, Apollo Parachute Performance Analysis (NTRS 19740011560), §2.3';

/**
 * A Skylab visit in the flight scene (types.ts `Flight.flies`): the Saturn IB's drops and fires (saturn-ib-flies.ts), the
 * adapter's four panels swung to 45° on their hinges as the spacecraft left, kept on the stage (the Skylab Operations
 * Handbook, CSM 116 thru 118, vol. I, §1.1: snubbed by cables and attenuators at 45°; not jettisoned, JSC-63400 chapter 5),
 * and the command module's
 * parachutes, the Apollo Earth landing system's as Apollo 7's are drawn.
 */
export function skylabFlies(plan: FlightPlan): NonNullable<Flight['flies']> {
  return {
    ...saturnIBFlies(plan),
    // (stack-gallery.ts `doors`: each panel swings out about the hinge square to its own radius)
    eventRotations: (
      [
        [0, 0, -1],
        [-1, 0, 0],
        [0, 0, 1],
        [1, 0, 0],
      ] as [number, number, number][]
    ).map((axis, i) => ({ event: 'spacecraft-separation', node: `SLA_Door_${i}`, axis, angle: Math.PI / 4, from: -0.35, to: 0.65 })),
    chutes: [
      ...[0, 180].map((azimuth) => ({
        on: 'Twin drogues',
        body: 'cm',
        at: 'ForwardCompartment',
        cut: 'ribbon' as const,
        diameter: doc(16.5 * FT, `${ELS}: the Block II drogue, as the Skylab command modules carried it`),
        gores: estimated(24, 'Conical ribbon drogue reconstruction; gore count not established'),
        lines: estimated(24 * FT, 'Drogue suspension lines reconstructed from canopy scale'),
        riser: estimated(3 * FT, 'Drogue bridle estimated from the canopy installation'),
        colours: {
          value: ['#e66c3e', '#f1eddd'],
          confidence: 'estimated' as const,
          source: 'Apollo Earth Landing System photographs; this module’s pattern uncertain',
        },
        cluster: { azimuth, tilt: estimated(29, 'Estimated visual angle between the two inflating drogues') },
      })),
      ...[0, 120, 240].map((azimuth) => ({
        on: 'Three main parachutes',
        body: 'cm',
        at: 'ForwardCompartment',
        cut: 'ringsail' as const,
        diameter: assumed(83.5 * FT, ELS),
        gores: assumed(68, MAIN_CHUTE),
        lines: assumed(120 * FT, MAIN_CHUTE),
        riser: estimated(7 * FT, 'Main riser estimated from the Earth Landing System installation'),
        colours: {
          value: ['#ee713f', '#f5ecda'],
          confidence: 'assumed' as const,
          source: 'Smithsonian Apollo main ringsail NASM A19700201000, orange and white; arrangement from recovered-capsule photographs',
        },
        disconnect: estimated(
          4,
          'released as soon as possible after water contact (Apollo 7 Mission Report §6); the interval is not on the record',
        ),
        cluster: { azimuth, tilt: estimated(20, 'Estimated visual spread of the three mains about the common bridle') },
      })),
    ],
  };
}
