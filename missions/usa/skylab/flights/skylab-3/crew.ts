import { skylabCrew } from '../../crew/launch.ts';

const root = 'models/usa/skylab/skylab-3/';
// NASA TM X-58163 Appendix A gives each crew member’s stature. S73-31800 shows the three launch garments.
export const launchCrew = skylabCrew(
  ['Bean', 'Garriott', 'Lousma'],
  [
    {
      url: `${root}crew.glb`,
      scale: 'Bean · 5 ft 9½ in · Skylab A7LB',
      torso:
        'Bean wore the crew’s Skylab II patch on his left breast as he suited up. He boarded CSM-117 as commander and occupied the left couch.',
    },
    {
      url: `${root}science-pilot.glb`,
      scale: 'Garriott · 5 ft 9 in · Skylab A7LB',
      torso:
        'The science pilot’s flown suit has two red disconnects on his right. Four blue fittings extend up across the front below the embroidered mission patch. Garriott took the centre couch.',
    },
    {
      url: `${root}pilot.glb`,
      scale: 'Lousma · 6 ft · Skylab A7LB',
      torso:
        'Lousma took the right couch for launch. His suit carried the same insignia as his crewmates’ garments, with a human figure across the Sun and Earth and the three names along the rim.',
    },
  ],
);
