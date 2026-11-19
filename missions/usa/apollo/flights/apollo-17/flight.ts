import type { Flight } from '../../../../../src/types.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { boardingHatches } from '../../vehicles/hatch.ts';
import { roverModel } from '../../vehicles/rover-gallery.ts';
import { escapeParts, nodes, rocket, specification } from '../../vehicles/stack-gallery.ts';
import { americaCommand, americaPort, americaService, americaViews } from './america.ts';
import { challengerModel, challengerPort, challengerStackParts, challengerStackViews } from './challenger.ts';
import { APOLLO17_THRUST, launcher, stackViews } from './sa512.ts';

const elapsed = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const lb = 0.45359237;
const report = 'Apollo 17 Mission Report JSC-07904, table 3-I, elapsed from range zero, excluding the mission clock update';
const masses = 'JSC-07904, table A-II, weights at transposition and docking';
// Press kit p. 18 scheduled boarding 2 h 40 before the original launch time. Range zero followed the scheduled time by 2 h 40.
// Closing strokes approximate the closeout interval. The gallery does not reconstruct the terminal holds.
const boarding: [number, number] = [-elapsed(5, 20, 0), -elapsed(4, 25, 0)];
const coverCloseout = -elapsed(4, 0, 0);
const cabin = blockIICabin(3871);

export const flight: Flight = {
  id: 'usa/apollo/apollo-17',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 17 · AS-512',
  callsign: 'America · Challenger',
  spacecraft: 'CSM-114 America · LM-12 Challenger',
  launchVehicle: 'Saturn V · SA-512',
  launch: '1972-12-07T05:33:00Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  crew: ['Eugene A. Cernan', 'Ronald E. Evans', 'Harrison H. Schmitt'],
  summary:
    'Cernan and Schmitt drove through the Taurus–Littrow valley from Challenger. In lunar orbit Evans used America’s cameras, radar sounder, ultraviolet spectrometer and infrared scanner, then recovered three film cassettes on the way home.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-114 and LM-12' },
    { label: 'Landing site', value: 'Taurus–Littrow valley' },
    { label: 'Recovery', value: 'Pacific Ocean · 19 December 1972' },
  ],
  timeline: [
    { t: -elapsed(2, 40, 30), event: 'At the original T−30 seconds, the ground sequencer stops the count' },
    { t: 0.6, event: 'SA-512 lifts off from Kennedy in darkness' },
    { t: elapsed(0, 11, 53), event: 'SA-512 reaches Earth parking orbit' },
    { t: elapsed(3, 12, 37), event: 'S-IVB restarts for translunar injection' },
    { t: elapsed(3, 42, 29), event: 'America separates and turns to face Challenger' },
    { t: elapsed(3, 56, 45), event: 'America docks with Challenger inside SLA-21' },
    { t: elapsed(4, 45, 0), event: 'The docked spacecraft leave the third stage' },
    { t: elapsed(6, 10, 0), event: 'S-IVB fires the ullage jets to target a lunar impact' },
    { t: elapsed(11, 15, 0), event: 'S-IVB refines the lunar targeting burn' },
    { t: elapsed(35, 30, 0), event: 'First midcourse correction' },
    { t: elapsed(65, 0, 0), event: 'Mission Control advances the mission clock by 2 hours 40 minutes' },
    { t: elapsed(81, 32, 40), event: 'The crew jettisons the SIM bay door' },
    { t: elapsed(86, 14, 23), event: 'America enters lunar orbit' },
    { t: elapsed(86, 59, 41), event: 'S-IVB impacts the Moon at 4.1681° south, 12.3307° west' },
    { t: elapsed(107, 47, 56), event: 'Challenger undocks from America' },
    { t: elapsed(109, 17, 29), event: 'Evans circularizes America’s orbit' },
    { t: elapsed(110, 21, 57), event: 'Challenger lands at Taurus–Littrow' },
    { t: elapsed(114, 21, 49), event: 'Cernan and Schmitt begin their first excursion' },
    { t: elapsed(137, 55, 6), event: 'Second excursion begins, with four map sheets ready to repair the rover fender' },
    { t: elapsed(160, 52, 48), event: 'Third excursion begins, toward the North Massif' },
    { t: elapsed(185, 21, 37), event: 'Challenger’s ascent stage lifts off' },
    { t: elapsed(187, 37, 15), event: 'Challenger docks with America' },
    { t: elapsed(191, 18, 31), event: 'Crew releases Challenger’s ascent stage' },
    { t: elapsed(193, 17, 21), event: 'Challenger’s ascent stage impacts the Moon' },
    { t: elapsed(234, 2, 9), event: 'America fires its service engine for Earth' },
    { t: elapsed(254, 54, 40), event: 'Evans begins his spacewalk to retrieve the three film cassettes' },
    { t: elapsed(256, 0, 24), event: 'Transearth spacewalk ends' },
    { t: elapsed(301, 23, 49), event: 'Command and service modules separate' },
    { t: elapsed(301, 51, 59), event: 'America splashes down in the Pacific' },
  ],
  specs: [
    specification(rocket, 'Height on the pad', 363 * 0.3048, 'm', 'Apollo 17 Press Kit, countdown, 363 ft assembled height'),
    specification(
      rocket,
      'Mass at ground ignition',
      2961860,
      'kg',
      'AS-512 Flight Evaluation Report, table 16-1, actual mass at ground ignition',
    ),
    {
      group: 'Spacecraft',
      label: 'Length from engine exit to docking plane',
      value: 404.25 * 0.0254,
      unit: 'm',
      confidence: 'assumed',
      note: 'Block II stations XA706 to XA1000 plus Xc110.25, NASA TN D-6854 fig. A-13, applied to CSM-114.',
    },
    specification(
      rocket,
      'Mass at liftoff',
      2917844,
      'kg',
      'AS-512 Flight Evaluation Report, table 16-1, actual mass at holddown-arm release',
    ),
    specification('Spacecraft', 'CSM at transposition', 66893 * lb, 'kg', masses),
    specification('Lunar module · Challenger', 'LM at transposition', 36274 * lb, 'kg', masses),
    specification('Mission', 'Duration of flight', elapsed(301, 51, 59), 's', report),
  ],
  motors: APOLLO17_THRUST,
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 17 · Saturn V',
      url: 'models/usa/apollo/apollo-17/vehicle.glb',
      backdrop: 'studio',
      cutaway: true,
      dockingPorts: [americaPort, challengerPort],
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser'] },
      seats: [
        { node: 'Seat_Commander', label: 'Cernan’s left couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_CommandModulePilot', label: 'Evans’s centre couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_LunarModulePilot', label: 'Schmitt’s right couch', from: 'SideHatch', open: boarding },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: nodes(launcher) },
        { id: 'escape', label: 'Escape tower', nodes: nodes(escapeParts) },
        ...americaViews,
        { id: 'challenger', label: 'Challenger in adapter', nodes: nodes(challengerStackParts), isolate: true, from: [1, 0.12, -0.25] },
        ...challengerStackViews,
        ...stackViews,
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: boardingHatches([...americaCommand, ...americaService, ...challengerStackParts, ...escapeParts, ...launcher], boarding, {
        openBy: boarding[0],
        coverClosedBy: coverCloseout,
      }),
    },
    challengerModel,
    roverModel(17),
  ],
};
