import { lc39Crew } from '../../crew/lc39.ts';

// Apollo 17 Press Kit, p. 80 and pp. 101, 103, 105. NASA KSC-72PC-613 and 627 show the launch garments.
export const launchCrew = lc39Crew(['Cernan', 'Evans', 'Schmitt'], true, [
  {
    url: 'models/usa/apollo/apollo-17/crew.glb',
    scale: 'Cernan · 6 ft · A7LB EV',
    torso:
      'Cernan’s red arm and leg bands identified the commander in lunar photographs. His six chest connectors let him change from cabin oxygen to his portable life-support system.',
  },
  {
    url: 'models/usa/apollo/apollo-17/pilot.glb',
    scale: 'Evans · 5 ft 11½ in · A7LB CMP',
    torso:
      'Evans wore a rear-entry pressure garment with three chest connectors. On the return from the Moon he went outside on an umbilical to collect the sounder and camera film from America.',
  },
  {
    url: 'models/usa/apollo/apollo-17/lmp.glb',
    scale: 'Schmitt · 5 ft 9 in · A7LB EV',
    torso:
      'A flexible waist let Schmitt bend to sample rocks and sit in the rover while his suit was pressurized. The Apollo and eagle emblem on his left breast bears the three crew names.',
  },
]);
