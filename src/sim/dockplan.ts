/** Build the two independently flyable craft from their phase's mass records and exhibit parts.
 * This orbital operations plan uses the same craft[] and mass type as a launch plan. */

import type { Measure } from '../measure.ts';
import type { Flight } from '../types.ts';
import type { Craft, FlightPlan } from './plan.ts';

export function dockPlan(flight: Flight, redock: boolean): Pick<FlightPlan, 'craft'> {
  const op = flight.docking!,
    spec = op.spacecraft;
  const ids = [spec.id, op.target.toLowerCase().replaceAll(' ', '-')],
    labels = [flight.spacecraft, op.target];
  const masses = [redock ? spec.lateMass! : spec.mass, redock ? spec.lateTargetMass! : op.targetMass];
  const craft = ids.map((id, i): Craft => {
    const source = flight.specs.find((s) => s.label === masses[i]);
    if (!source || source.confidence === 'estimated' || !(source.value > 0)) throw Error('Missing orbital mass for ' + id);
    const mass: Measure = { value: source.value, confidence: source.confidence, source: source.note ?? source.label };
    const model = i === 1 && op.interface === 'probe' ? flight.models.find((m) => m.id === spec.targetModel)! : flight.models[0];
    const nodes = model.parts
      .filter((p) =>
        i === 0
          ? p.group === 'Spacecraft'
          : op.interface === 'probe'
            ? !redock || p.group !== 'Descent stage'
            : p.group === 'Docking target',
      )
      .map((p) => p.node);
    return {
      id,
      label: labels[i],
      mass,
      bodies: [{ id, label: labels[i], mass, count: 1, nodes }],
      joints: [],
      engines: [],
      tanks: [],
      thrusters: [],
      chutes: [],
      limits: [],
      drag: [],
    };
  });
  return { craft };
}
