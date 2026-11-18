import { assumed, estimated } from '../../../../src/measure.ts';
import type { DockingPort, Move, Part, Spec } from '../../../../src/types.ts';
const inch = 0.0254;
export const probePort = (serial: number) =>
  ({
    system: 'apollo-probe-and-drogue',
    role: 'probe',
    part: 'DockingProbe',
    frame: 'GumdropDockingFrame',
    piston: 'CM104_ProbeExtension',
    captureHooks: {
      nodes: Array.from({ length: 3 }, (_, i) => `CM104_CaptureHook_${i}`),
      travel: estimated(
        0.34 * inch,
        'Radial motion reconstructed to clear the socket lip and engage its cavity, NASA TN D-6854, fig. A-13.',
      ),
    },
    hinges: Array.from({ length: 12 }, (_, i) => `CM104_LatchHinge_${i}`),
    latchRotation: estimated(
      (24 * Math.PI) / 180,
      'Reconstructed hook sweep from the open position to behind the ring lip, NASA TN D-6854, figs. 9 and A-13.',
    ),
    captureTravel: assumed(
      10 * inch,
      `Apollo Operations Handbook, Block II, vol. 1, §2.13.3.3.4, p. 2.13-17. The type’s 10-inch maximum travel is applied to CSM-${serial}.`,
    ),
  }) satisfies DockingPort;
export const rocket = 'Launch vehicle';
const ship = 'Spacecraft';
const escapeSystem = 'Launch escape system';

export function part(
  node: string,
  name: string,
  group: string,
  order: number,
  lift: number,
  summary: string,
  detail: string,
  inside = false,
  facts?: Part['facts'],
): Part {
  return { node, name, group, order, explode: [0, lift, 0], summary, detail, inside, facts };
}
export const cm = (node: string, name: string, summary: string, detail: string, inside = false) =>
  part(node, name, ship, 2, 52, summary, detail, inside);
export const sm = (node: string, name: string, summary: string, detail: string, inside = false) =>
  part(node, name, ship, 4, 41, summary, detail, inside);
export const lift = (order: number, metres: number): Move => ({
  kind: 'slide',
  by: [0, metres, 0],
  from: order / 24,
  to: order / 24 + 0.5,
});
const radial: [number, number][] = [
  [1, 0],
  [0, -1],
  [-1, 0],
  [0, 1],
];
export const doors: Move[] = radial.flatMap(([x, z], i) => [
  { kind: 'swing', node: `SLA_Door_${i}`, axis: [z, 0, -x], angle: Math.PI / 4, from: 0.4, to: 0.65 },
  { kind: 'slide', node: `SLA_Door_${i}`, by: [8 * x, 0, 8 * z], from: 0.65, to: 1 },
]);
export const escapeParts = [
  part(
    'LaunchEscape',
    'Launch escape tower',
    escapeSystem,
    0,
    66,
    'The solid escape motor could pull the crew free during early ascent.',
    'The tower separated once the spacecraft was safely on its way.',
  ),
  part(
    'BoostCover',
    'Boost protective cover',
    escapeSystem,
    0,
    66,
    'A white cover shielded the command module during launch.',
    'It left with the escape tower, uncovering the command module and docking hardware.',
  ),
];
export const nodes = (parts: Part[]) => parts.map((p) => p.node);
export const specification = (group: string, label: string, value: number, unit: string, note: string): Spec => ({
  group,
  label,
  value,
  unit,
  confidence: 'documented',
  note,
});
