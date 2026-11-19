import type { Flight } from '../../../../../src/types.ts';
import { boardingHatches } from '../../vehicles/hatch.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { escapeParts, nodes, rocket, specification } from '../../vehicles/stack-gallery.ts';
import { antaresModel, antaresPort, antaresStackParts, antaresStackViews } from './antares.ts';
import { kittyCommand, kittyPort, kittyService, kittyViews } from './kitty-hawk.ts';
import { APOLLO14_THRUST, stackViews, launcher } from './sa509.ts';

const elapsed = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const lb = 0.45359237;
const report = 'Apollo 14 Mission Report MSC-04112, table 6-I';
const masses = 'MSC-04112, appendix A, table A-II; postflight reconstruction at transposition and docking';
// The Flight Journal places crew ingress about three hours before launch.
// The twenty-minute Gallery boarding window and hatch travel are estimated.
const boarding: [number, number] = [-elapsed(3, 0, 0), -elapsed(2, 40, 0)];
// At T−90 on the countdown, Launch Control reported the crew finishing the cover.
const weatherHold = elapsed(0, 40, 2); // AS-509 Flight Evaluation Report, §3.3.
const coverCloseout = -elapsed(1, 30, 0) - weatherHold;
const cabin = blockIICabin(3871);

export const flight: Flight = {
  id: 'usa/apollo/apollo-14',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 14 · AS-509',
  callsign: 'Kitty Hawk · Antares',
  spacecraft: 'CSM-110 Kitty Hawk · LM-8 Antares',
  launchVehicle: 'Saturn V · SA-509',
  launch: '1971-01-31T21:03:02Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  crew: ['Alan B. Shepard Jr.', 'Stuart A. Roosa', 'Edgar D. Mitchell'],
  summary:
    'Roosa docked Kitty Hawk with Antares on the sixth attempt. Shepard and Mitchell landed in the Fra Mauro highlands and pulled a two-wheeled cart toward Cone Crater. Roosa photographed the Moon from orbit while they worked on the surface.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-110 and LM-8' },
    { label: 'Landing site', value: 'Fra Mauro highlands' },
    { label: 'Recovery', value: 'South Pacific · 9 February 1971' },
  ],
  timeline: [
    { t: coverCloseout, event: 'Launch Control reports the cabin purged and the closeout crew finishing the boost cover' },
    { t: -elapsed(0, 8, 2) - weatherHold, event: 'Countdown holds for weather at T−8 minutes 2 seconds' },
    { t: -elapsed(0, 8, 2), event: 'Countdown resumes' },
    { t: 0.6, event: 'SA-509 lifts off from Pad 39A after a weather hold' },
    { t: elapsed(2, 28, 32), event: 'S-IVB restarts for translunar injection' },
    { t: elapsed(3, 2, 29), event: 'Kitty Hawk separates and turns toward Antares' },
    { t: elapsed(4, 56, 56), event: 'Roosa docks with Antares on the sixth attempt' },
    { t: elapsed(5, 47, 14), event: 'The crew extracts Antares from SLA-17' },
    { t: elapsed(30, 36, 8), event: 'Service engine fires for the first midcourse correction' },
    { t: elapsed(54, 53, 36), event: 'Crew advances the onboard mission clock by 40 minutes 2.90 seconds' },
    { t: elapsed(81, 56, 41), event: 'Kitty Hawk fires its service engine to enter lunar orbit' },
    { t: elapsed(82, 37, 52), event: 'S-IVB strikes the Moon for the seismic experiment' },
    { t: elapsed(86, 10, 53), event: 'Service engine lowers the docked spacecraft into descent orbit' },
    { t: elapsed(103, 47, 42), event: 'Antares and Kitty Hawk separate' },
    { t: elapsed(108, 2, 27), event: 'Antares begins powered descent' },
    { t: elapsed(108, 15, 9), event: 'Antares touches down at Fra Mauro' },
    { t: elapsed(113, 39, 11), event: 'First surface excursion begins with cabin depressurization' },
    { t: elapsed(116, 47, 58), event: 'First data arrive from the surface experiment package' },
    { t: elapsed(131, 8, 13), event: 'Second surface excursion begins, toward Cone Crater' },
    { t: elapsed(135, 42, 54), event: 'Second surface excursion ends' },
    { t: elapsed(141, 45, 40), event: 'Antares lifts off from Fra Mauro' },
    { t: elapsed(143, 32, 51), event: 'Kitty Hawk docks with the returning ascent stage' },
    { t: elapsed(145, 44, 58), event: 'Crew jettisons the ascent stage' },
    { t: elapsed(147, 42, 23), event: 'Antares ascent stage strikes the Moon' },
    { t: elapsed(148, 36, 2), event: 'Kitty Hawk fires its service engine for Earth' },
    { t: elapsed(215, 32, 42), event: 'Command and service modules separate' },
    { t: elapsed(215, 47, 45), event: 'Kitty Hawk reaches entry interface' },
    { t: elapsed(216, 1, 58), event: 'Pacific splashdown' },
  ],
  specs: [
    specification(rocket, 'Height on the pad', 363 * 0.3048, 'm', 'Apollo 14 Press Kit, Saturn V launch vehicle'),
    specification(
      rocket,
      'Mass at ground ignition',
      6505548 * lb,
      'kg',
      'AS-509 Flight Evaluation Report, table 16-2, actual ground ignition weight, 6,505,548 lb',
    ),
    {
      group: 'Spacecraft',
      label: 'Length from engine exit to docking plane',
      value: 404.25 * 0.0254,
      unit: 'm',
      confidence: 'assumed',
      note: 'Block II stations XA706 to XA1000 plus Xc110.25, NASA TN D-6854 fig. A-13, applied to CSM-110.',
    },
    specification(
      rocket,
      'Mass at liftoff',
      6417871 * lb,
      'kg',
      'AS-509 Flight Evaluation Report, table 16-2, actual weight at holddown-arm release, 6,417,871 lb',
    ),
    specification('Spacecraft', 'CSM at transposition', 64388.0 * lb, 'kg', masses),
    specification('Lunar module · Antares', 'LM at transposition', 33649.2 * lb, 'kg', masses),
    specification('Mission', 'Duration of flight', elapsed(216, 1, 58), 's', report),
  ],
  motors: APOLLO14_THRUST,
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 14 · Saturn V',
      url: 'models/usa/apollo/apollo-14/vehicle.glb',
      backdrop: 'studio',
      cutaway: true,
      dockingPorts: [kittyPort, antaresPort],
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser'] },
      seats: [
        { node: 'Seat_Commander', label: 'Shepard’s left couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_CommandModulePilot', label: 'Roosa’s centre couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_LunarModulePilot', label: 'Mitchell’s right couch', from: 'SideHatch', open: boarding },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: nodes(launcher) },
        { id: 'escape', label: 'Escape tower', nodes: nodes(escapeParts) },
        ...kittyViews,
        { id: 'antares', label: 'Antares in adapter', nodes: nodes(antaresStackParts), isolate: true, from: [1, 0.12, -0.25] },
        ...antaresStackViews,
        ...stackViews,
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: boardingHatches([...kittyCommand, ...kittyService, ...antaresStackParts, ...escapeParts, ...launcher], boarding, {
        openBy: boarding[0],
        coverClosedBy: coverCloseout,
      }),
    },
    antaresModel,
  ],
};
