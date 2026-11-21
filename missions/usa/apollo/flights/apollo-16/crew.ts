import { lc39Crew, moonSuits } from '../../crew/lc39.ts';

// Apollo 16 Press Kit, p. 126 and the three crew biographies. KSC-72PC-0170 shows the emblem on Duke's left breast.
export const launchCrew = lc39Crew(
  ['Young', 'Mattingly', 'Duke'],
  true,
  [
    {
      url: 'models/usa/apollo/apollo-16/crew.glb',
      scale: 'Young · 5 ft 9 in · A7LB EV',
      torso:
        'Young’s red commander’s bands distinguished him from Duke. Their side-entry suits had a waist joint so they could sit on the lunar rover while pressurized.',
    },
    {
      url: 'models/usa/apollo/apollo-16/pilot.glb',
      scale: 'Mattingly · 5 ft 10 in · A7LB CMP',
      torso:
        'Mattingly’s rear-entry suit has three chest connectors. On the way home he drew oxygen through an umbilical as he went outside Casper for the camera film.',
    },
    {
      url: 'models/usa/apollo/apollo-16/lmp.glb',
      scale: 'Duke · 5 ft 11½ in · A7LB EV',
      torso:
        'Six chest connections let Duke change life-support systems. The eagle and shield on his left breast are visible as he waits in the White Room for his turn to board.',
    },
  ],
  moonSuits('apollo-16', ['Young', 'Duke'], 'A7LB', 7),
);
