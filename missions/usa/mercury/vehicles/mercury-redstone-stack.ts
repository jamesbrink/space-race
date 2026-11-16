import type { MechanismDef, ModelDef, Motor, Part, Spec, ViewDef } from '../../../../src/types.ts';
import { FT, type Hardware, HATCH_AZ, IN, type PartWords, THRUST, WINDOW_AZ, along, stackParts } from './mercury-capsule.ts';

/**
 * A Mercury capsule on its Redstone as flight data, said once for the suborbital flights (MR-3, MR-4): how each part of
 * the stack comes away, where it stands on the launcher, the model as the pad's (`mercuryRedstoneStack`), the
 * Redstone's figures (`SPEC`), and the capsule's motors at the type's thrust (`mercuryRedstoneMotors`), the A-7's being
 * each flight's own as measured. What the stack does in flight is mercury-redstone.ts.
 */

export { DEG, FT, HATCH_AZ, IN, LB, LBF, NMI, PERISCOPE_AZ, STAND, WINDOW_AZ, along, lb } from './mercury-capsule.ts';
export { THRUST as CAPSULE_THRUST } from './mercury-capsule.ts';
export type { PartWords } from './mercury-capsule.ts';

/** The launcher's support level above the pad: 5.5 ft (lc5/site.py: LAUNCHER_TOP). */
export const PEDESTAL = 5.5 * FT;
/** The fins' trailing edges below the model's origin (the capsule's plane of maximum diameter), m: it stands on them. */
export const BASE = 716.0 * IN;

/**
 * How each of the stack's parts comes away: the capsule's pieces lift off its top in turn and the Redstone's units after
 * them. The window is the orbital-type capsule's (MR-4's No. 11 on): Freedom 7's No. 7 had portholes, and leaves it out.
 */
export const HARDWARE: Record<string, Hardware> = {
  EscapeTower: { group: 'Spacecraft', explode: [0, 12.6, 0], order: 0 },
  AntennaCanister: { group: 'Spacecraft', explode: [0, 11.6, 0], order: 1 },
  RecoveryCompartment: { group: 'Spacecraft', explode: [0, 10.8, 0], order: 2 },
  Hatch: { group: 'Spacecraft', explode: along(HATCH_AZ, 8.6, 1.15), order: 3 },
  Window: { group: 'Spacecraft', explode: along(WINDOW_AZ, 9.9, 1.0), order: 3 },
  Afterbody: { group: 'Spacecraft', explode: [0, 9.9, 0], order: 3 },
  CrewCabin: { group: 'Spacecraft', inside: true, explode: [0, 8.9, 0], order: 4 },
  HeatShield: { group: 'Spacecraft', inside: true, explode: [0, 8.3, 0], order: 5 },
  Retropack: { group: 'Spacecraft', inside: true, explode: [0, 7.6, 0], order: 6 },
  RedstoneAdapter: { group: 'Launch vehicle', explode: [0, 6.8, 0], order: 7 },
  RedstoneAftUnit: { group: 'Launch vehicle', explode: [0, 5.8, 0], order: 8 },
  RedstoneCenterUnit: { group: 'Launch vehicle', explode: [0, 4.6, 0], order: 9 },
  RedstoneTailUnit: { group: 'Launch vehicle', explode: [0, 3.4, 0], order: 10 },
  RedstoneEngine: { group: 'Launch vehicle', inside: true, explode: [0, 0, 0], order: 11 },
};

/** A flight's parts, in its order, each from its words (the periscope's `clocked` moves and the commands are the flight's). */
export const mercuryRedstoneParts = (flight: string, words: PartWords[]): Part[] => stackParts(flight, words, HARDWARE, ['Window']);

/** The engine end of the stack: a view every Redstone flight has. */
export const ENGINE_VIEW: ViewDef = { id: 'engine', label: 'Engine', nodes: ['RedstoneTailUnit', 'RedstoneEngine'] };

/**
 * The stack as a model, standing on its launcher at Complex 5 as the pad had it at liftoff (structure at its launch
 * position, masts down, the cab lowered), turned with the launcher's table to the flight's azimuth (`rotationY`: the
 * model's own frame has the hatch on +X). The flight gives its parts, views, cabin lights (each capsule's fittings) and
 * its periscope's programme; its seat and cabin it sets on the model after.
 */
export const mercuryRedstoneStack = (ship: {
  flight: string;
  parts: Part[];
  views: ViewDef[];
  lights: NonNullable<ModelDef['lights']>;
  mechanisms: MechanismDef[];
  rotationY: number;
  slider?: [string, string];
}): ModelDef => ({
  id: 'vehicle',
  name: 'Vehicle',
  url: `models/usa/mercury/${ship.flight}/vehicle.glb`,
  // the periscope on its programme, and in the pilot's hands in a flight flown by hand (vehicles/periscope.ts)
  mechanisms: ship.mechanisms,
  scale: '25.41 m tall · spacecraft 7.91 m · to scale',
  backdrop: 'ground',
  slider: ship.slider ?? ['Assembled', 'Taken apart'],
  cutaway: true,
  specGroups: ['Spacecraft', 'Launch vehicle'],
  parts: ship.parts,
  position: [0, PEDESTAL + BASE, 0],
  rotationY: ship.rotationY,
  lights: ship.lights,
  home: 'stack',
  views: ship.views,
  with: [{ model: 'pad', at: 0 }],
});

/** The Redstone's figures that are the type's. */
export const SPEC = {
  boosterDiameter: {
    group: 'Launch vehicle',
    label: 'Booster diameter',
    value: 70 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '70 in',
  },
  boosterLength: {
    group: 'Launch vehicle',
    label: 'Booster length',
    value: 59 * FT,
    unit: 'm',
    confidence: 'documented',
    note: '59.00 ft (TM X-53107, Figure 4-1)',
  },
} satisfies Record<string, Spec>;

/** What a flight says of one of its motors: its burn (where it is known), how sure, and its note (written from the Measure, `lb`). */
export type Burn = Pick<Motor, 'confidence'> & Partial<Motor>;

const HTP = '90% hydrogen peroxide';
/**
 * The Redstone's engine and the capsule's motors and thrusters. The A-7's thrust is the flight's own, as measured on it
 * (TM X-53107, Table 8-1), so the flight gives it; the capsule's are the type's nominal (mercury-capsule.ts `THRUST`).
 */
export const mercuryRedstoneMotors = (b: {
  booster: Burn & Pick<Motor, 'thrustN'>;
  escape: Burn;
  jettison: Burn;
  posigrade: Burn;
  retrograde: Burn;
  pitchYaw: Burn;
  roll: Burn;
  low: Burn;
}): Motor[] => [
  { name: 'Rocketdyne A-7 (booster)', count: 1, propellant: 'ethyl alcohol / liquid oxygen', kind: 'liquid', ...b.booster },
  { name: 'Escape motor (Grand Central)', count: 1, thrustN: THRUST.escape.value, propellant: 'solid', kind: 'solid', ...b.escape },
  { name: 'Tower jettison motor', count: 1, thrustN: THRUST.towerJettison.value, propellant: 'solid', kind: 'solid', ...b.jettison },
  { name: 'Posigrade motor', count: 3, thrustN: THRUST.posigrade.value, propellant: 'solid', kind: 'solid', ...b.posigrade },
  { name: 'Retrograde motor (Thiokol)', count: 3, thrustN: THRUST.retrograde.value, propellant: 'solid', kind: 'solid', ...b.retrograde },
  { name: 'Pitch and yaw thruster, high', count: 4, thrustN: THRUST.pitchYawHigh.value, propellant: HTP, ...b.pitchYaw },
  { name: 'Roll thruster, high', count: 2, thrustN: THRUST.rollHigh.value, propellant: HTP, ...b.roll },
  { name: 'Attitude thruster, low', count: 6, thrustN: THRUST.low.value, propellant: HTP, ...b.low },
];
