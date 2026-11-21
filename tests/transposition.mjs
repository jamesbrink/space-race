// A plan built from Apollo 9's data for its transposition, docking and extraction (sim/proximity.ts's proving case): the
// S-IVB with the lunar module in its adapter and the command and service modules on top, as they stood at the
// separation (2:41:16), flown from the record's first tracking fix coasted back to it. The docking is a joint made in
// flight (`JointDef.formed`), captured by the physics; the extraction a joint between the lunar module and its adapter.
// Not a flight's plan: no flight flies it (a full Apollo 9 is item D4), so it lives with the tests that fly it.
import { flight } from '../missions/usa/apollo/flights/apollo-9/flight.ts';
import { derived, doc } from '../src/measure.ts';
import { orbitalFix } from '../src/sim/approach.ts';
import { startCraft } from '../src/sim/craft.ts';
import { flyProximity } from '../src/sim/proximity.ts';
import { fromAxes } from '../src/sim/rigid.ts';
import { frameOf } from '../src/world/earthframe.ts';
import { cross, unit } from '../src/world/frames.ts';

const IN = 0.0254;
const FT = 0.3048;
const LBF = 4.4482216152605;
const op = flight.docking;
const spec = (label) => {
  const s = flight.specs.find((x) => x.label === label);
  return { value: s.value, confidence: s.confidence, source: s.note ?? s.label };
};
// (the docking body's moments are [across, roll, across]: sim/docking.ts's +Y is the long axis)
const moments = (i) => [i[1], i[0], i[2]];
const [csmProps, lmProps] = op.massProperties[0];
const carrier = op.carrier;
const probe = flight.models[0].dockingPorts.find((p) => p.role === 'probe');
const mm = (m, by, how) => derived(m.value + by, `${m.source}; ${how}`);
const lmCentre = carrier.arm;
const drogue = mm(lmCentre, lmProps.arm.value, 'the lunar module’s centre of mass and its docking arm (MSC-PA-R-69-2 table A.5-I)');
// (the command and service module stood with its engine's exit at the drogue: XA706 there; its centre at XA933, its probe at XA1110.25)
const csmCentre = mm(
  drogue,
  (933 - 706) * IN,
  'the CSM’s stations XA706 (the engine’s exit, at the drogue) and XA933 (its centre of mass): MSC-PA-R-69-2 table A.5-I',
);
const probeAt = mm(drogue, op.transpose.startGap.value, op.transpose.startGap.source);
const rcs = doc(100 * LBF, 'Apollo 9 Press Kit, spacecraft reaction-control systems, 100 lbf per R-4D chamber');

export const plan = {
  kind: 'orbital',
  craft: [
    {
      id: 'stack',
      label: 'Gumdrop on Spider in the S-IVB',
      mass: derived(carrier.mass.value + spec(op.targetMass).value + spec(op.spacecraft.mass).value, 'the three below'),
      bodies: [
        {
          id: 'carrier',
          label: 'S-IVB, instrument unit and adapter',
          count: 1,
          mass: carrier.mass,
          rigid: { centre: derived(0, 'the carrier’s centre of mass is this frame’s origin'), inertia: moments(carrier.inertia) },
        },
        {
          id: 'lander',
          label: 'Spider',
          count: 1,
          mass: spec(op.targetMass),
          rigid: { centre: lmCentre, inertia: moments(lmProps.inertia) },
        },
        {
          id: 'ship',
          label: 'Gumdrop',
          count: 1,
          mass: spec(op.spacecraft.mass),
          crew: ['commander', 'pilot', 'lander-pilot'],
          rigid: { centre: csmCentre, inertia: moments(csmProps.inertia) },
        },
      ],
      joints: [
        { id: 'adapter-separation', label: 'CSM separation from the adapter', gone: ['carrier', 'lander'] },
        {
          id: 'lander-release',
          label: 'Spider released from the adapter',
          // (its side the lander's: the carrier, which has engines in a whole plan, is let go by the separation's joint alone)
          gone: ['lander'],
          // (the first of the service module's backing-away firings, four 100-lbf chambers for 3 s, taken as one instant
          // and shared by the masses as a joint's push is: what the extraction left the two at is not in what was read)
          push: derived(
            (4 * rcs.value * 3) / (spec(op.spacecraft.mass).value + spec(op.targetMass).value),
            'MSC-PA-R-69-2 §10.2.3, the 3 s firing 5 s after release; four chambers; over the docked mass. Taken at the release, not after it',
          ),
        },
        {
          id: 'docking',
          label: 'Probe and drogue',
          gone: [],
          formed: {
            ports: [
              { body: 'ship', station: probeAt, faces: 1, clock: op.transpose.roll },
              { body: 'lander', station: drogue, faces: 1, clock: doc(0, 'the drogue’s key is this frame’s +Z') },
            ],
            capture: {
              stroke: probe.captureTravel,
              radius: doc(FT, 'NASA TN D-6854, requirements: within 1 ft of the axis'),
              tilt: doc(10, 'NASA TN D-6854, requirements: 10 degrees'),
              roll: doc(10, 'NASA TN D-6854, requirements: 10 degrees'),
              closing: doc(FT, 'NASA TN D-6854, requirements: 1 ft/s'),
              sideways: doc(0.5 * FT, 'NASA TN D-6854, requirements: 0.5 ft/s'),
              angular: doc(1, 'NASA TN D-6854, requirements: 1 deg/s'),
              retract: op.retractTime ?? derived(10, 'sim/approach.ts: the probe’s retraction, 10 s for the first Apollo docking'),
            },
            approach: {
              by: 'sm-rcs',
              departing: op.transpose.departing,
              turnAfter: op.transpose.turnAfter,
              standOff: op.transpose.standOff,
              closing: doc(0.3 * FT, 'NASA TN D-6854, table II: the first Apollo 9 docking, 0.3 ft/s'),
              contact: doc(op.at, 'MSC-PA-R-69-2: the first docking, 3:01:59.3'),
            },
          },
        },
      ],
      engines: [],
      tanks: [],
      thrusters: [
        {
          id: 'sm-rcs',
          label: 'Service module reaction control',
          body: 'ship',
          does: ['rotation', 'translation'],
          mode: 'manual',
          push: derived(4 * rcs.value, `${rcs.source}: four chambers along an axis (sim/approach.ts's figure)`),
          torque: (() => {
            const couple = derived(
              2 * rcs.value * 83.56 * IN,
              `${rcs.source}; two chambers at the quads' radius, 83.56 in (MIT R-547 vol. III, table 1.3)`,
            );
            return { roll: couple, pitch: couple, yaw: couple };
          })(),
        },
      ],
      chutes: [],
      limits: [],
      drag: [],
    },
  ],
  events: [
    {
      id: 'separate',
      label: 'CSM separation',
      when: [{ time: op.transpose.at }],
      do: [{ separate: 'adapter-separation' }, { dock: 'docking' }],
      automatic: true,
      at: doc(op.transpose.at, 'MSC-PA-R-69-2'),
      source: 'MSC-PA-R-69-2 §10.2.3',
    },
    {
      id: 'extract',
      label: 'Spider extracted',
      when: [{ time: carrier.extractAt }],
      do: [{ separate: 'lander-release' }],
      automatic: true,
      at: doc(carrier.extractAt, 'MSC-PA-R-69-2'),
      source: 'MSC-PA-R-69-2 §10.2.3',
    },
    {
      id: 'board',
      label: 'Into Spider',
      when: [{ time: carrier.extractAt + 600 }],
      do: [{ board: 'lander-pilot', to: 'lander' }],
      automatic: true,
      source: 'a test of boarding only: not the record’s instant',
    },
  ],
  attitude: [{ id: 'free', label: 'Left to itself', hold: { free: true }, source: 'the stack held as it was' }],
  checks: [],
};

export const frame = frameOf(flight);
export const t0 = op.transpose.at;
export const masses = Object.fromEntries(plan.craft[0].bodies.map((b) => [b.id, b.mass.value]));

/** The stack at the separation: the record's first fix coasted back to it, its long axis along its motion (estimated). */
export function start() {
  const s = orbitalFix(op.fixes[0], frame, t0);
  const x = unit(s.v);
  const y = unit(cross(s.r, s.v));
  return { ...s, bodies: plan.craft[0].bodies.map((b) => b.id), q: fromAxes(x, y, cross(x, y)) };
}

let flown;
/** The proving case flown once, to an hour past the extraction. */
export function flownOnce() {
  flown ??= flyProximity(plan, frame, t0, startCraft(plan), [start()], masses, carrier.extractAt + 3600, 1);
  return flown;
}
