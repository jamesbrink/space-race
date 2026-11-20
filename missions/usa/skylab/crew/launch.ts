import type { ModelDef } from '../../../../src/types.ts';
import { lc39Crew } from '../../apollo/crew/lc39.ts';

// Estimated starting places on the southern approach to Pad 39B.
const rampDistance = 225;
const ids = ['crew', 'science-pilot', 'pilot'] as const;

export function skylabCrew(names: [string, string, string], suits: readonly (Pick<ModelDef, 'url' | 'scale'> & { torso: string })[]) {
  return lc39Crew(names, false, suits).map((model, i) => ({
    ...model,
    id: ids[i]!,
    position: [-rampDistance, -47 * 0.3048 - (rampDistance - 170 * 0.3048) * 0.05, -18 + i * 2.2] as [number, number, number],
  }));
}
