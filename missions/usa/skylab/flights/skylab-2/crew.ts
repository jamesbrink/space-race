import { skylabCrew } from '../../crew/launch.ts';

const root = 'models/usa/skylab/skylab-2/';
// Crew statures from NASA TM X-58163, Appendix A. S73-25901 and the flown suits establish the launch garment.
export const launchCrew = skylabCrew(
  ['Conrad', 'Kerwin', 'Weitz'],
  [
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
  ],
);
