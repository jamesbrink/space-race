import type { Machine, Move, Part } from '../../../../src/types.ts';

function hatchTravel(
  boarding: readonly [number, number],
  node: string,
  angle: number,
  lead: number,
  machine: Machine,
  closedBy?: number,
): Move[] {
  const open = boarding[0] + lead;
  const close = closedBy === undefined ? boarding[1] - lead : closedBy - 10;
  return [
    { kind: 'swing', node, axis: [0, 1, 0], angle, from: open - 10, to: open, machine },
    { kind: 'swing', node, axis: [0, 1, 0], angle: -angle, from: close, to: close + 10, machine },
  ];
}
export const sideHatchTravel = (boarding: readonly [number, number]): Move[] =>
  hatchTravel(boarding, 'Side_Hatch_Pivot', (108 * Math.PI) / 180, -1, {
    kind: 'door',
    confidence: 'documented',
    source:
      'Walkover, Hart and Zosky, The Apollo Command Module Side Access Hatch System, JPL TM 33-425, §V. The crew or ground team operates the unified hatch by hand.',
  });

export const coverHatchTravel = (boarding: readonly [number, number], closedBy?: number): Move[] =>
  hatchTravel(
    boarding,
    'Boost_Hatch_Pivot',
    (125 * Math.PI) / 180,
    -10,
    {
      kind: 'door',
      confidence: 'estimated',
      source: 'The boost cover had a separate hinged access door. Hand operation and its sound are reconstructed.',
    },
    closedBy,
  );

export function boardingHatches(parts: Part[], boarding: [number, number], closeout?: { openBy: number; coverClosedBy: number }): Part[] {
  // When the flight transcript dates the doors separately, the cover finishes its
  // ten-second closing stroke after the pressure hatch, at the reported endpoint.
  const side: [number, number] = closeout ? [closeout.openBy, boarding[1]] : boarding;
  return parts.map((part) => {
    if (part.node === 'SideHatch') return { ...part, clocked: sideHatchTravel(side) };
    if (part.node === 'BoostCover') return { ...part, clocked: coverHatchTravel(side, closeout?.coverClosedBy) };
    return part;
  });
}
