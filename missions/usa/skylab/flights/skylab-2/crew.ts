import { lc39Crew } from '../../../apollo/crew/lc39.ts';

const root = 'models/usa/skylab/skylab-2/';
// Estimated starting place on the southern ramp. The raised Saturn IB is visible from farther down the grade.
const rampDistance = 225;
const ids = ['crew', 'science-pilot', 'pilot'] as const;

// Crew statures from NASA TM X-58163, Appendix A. S73-25901 and the flown suits establish the launch garment.
export const launchCrew = lc39Crew(['Conrad', 'Kerwin', 'Weitz'], false, [
  {
    url: `${root}crew.glb`,
    scale: 'Conrad · 5 ft 6½ in · Skylab A7LB',
    torso:
      'Conrad wore the first visiting crew’s circular Skylab I emblem on his left breast. Two red fittings sit together on his right, opposite the four blue fittings on his flown suit.',
  },
  {
    url: `${root}science-pilot.glb`,
    scale: 'Kerwin · 6 ft · Skylab A7LB',
    torso:
      'The science pilot wore the same Skylab pressure garment as his crewmates. Later Kerwin and Conrad worked outside together, supplied with oxygen through umbilicals from the workshop.',
  },
  {
    url: `${root}pilot.glb`,
    scale: 'Weitz · 5 ft 10 in · Skylab A7LB',
    torso:
      'Weitz wore this suit again in orbit. Standing in the open hatch while Kerwin held his legs, he tried to pry loose the workshop’s jammed solar wing.',
  },
]).map((model, i) => ({
  ...model,
  id: ids[i]!,
  position: [-rampDistance, -47 * 0.3048 - (rampDistance - 170 * 0.3048) * 0.05, -18 + i * 2.2] as [number, number, number],
}));
