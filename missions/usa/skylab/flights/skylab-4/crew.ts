import { skylabCrew } from '../../crew/launch.ts';

const root = 'models/usa/skylab/skylab-4/';
// NASA TM X-58163, Appendix A. NASA’s November 16 photographs show the launch garments.
export const launchCrew = skylabCrew(
  ['Carr', 'Gibson', 'Pogue'],
  [
    {
      url: `${root}crew.glb`,
      scale: 'Carr · 5 ft 9 in · Skylab A7LB',
      torso:
        'Carr led the crew from their quarters to the transfer van with his clear pressure helmet closed. Brown webbing crossed his shoulders. The commander boarded CSM-118 through the side hatch and occupied the left couch.',
    },
    {
      url: `${root}science-pilot.glb`,
      scale: 'Gibson · 5 ft 9 in · Skylab A7LB',
      torso:
        'Gibson followed Carr to the van and took the centre couch for launch. His white pressure garment carried the third crew’s blue emblem on his left breast. Its tree represented Skylab’s observations of Earth.',
    },
    {
      url: `${root}pilot.glb`,
      scale: 'Pogue · 5 ft 9 in · Skylab A7LB',
      torso:
        'Pogue wore the same third-crew emblem and his own name tape. He walked out behind Gibson, carrying a portable ventilator for his suit. He occupied the right couch for launch.',
    },
  ],
);
