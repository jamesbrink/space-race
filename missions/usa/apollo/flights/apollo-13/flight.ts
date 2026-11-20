import type { Flight } from '../../../../../src/types.ts';
import { LC39A, mobileLauncher } from '../../../places/cape-canaveral/lc-39.ts';
import { lc39Crew } from '../../crew/lc39.ts';
import { boardingHatches } from '../../vehicles/hatch.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { saturnVFlies } from '../../vehicles/saturn-v-flies.ts';
import { saturnVPlan } from '../../vehicles/saturn-v-plan.ts';
import { escapeParts, nodes, rocket, specification } from '../../vehicles/stack-gallery.ts';
import { aquariusModel, aquariusPort, aquariusStackParts, aquariusStackViews } from './aquarius.ts';
import { odysseyCommand, odysseyPort, odysseyService, odysseyViews } from './odyssey.ts';
import { orbital } from './orbital.ts';
import { APOLLO13_THRUST, impactRadioView, launcher } from './sa508.ts';
import { WEATHER } from './weather.ts';

const elapsed = (h: number, m: number, s: number) => h * 3600 + m * 60 + s;
const lb = 0.45359237;
const report = 'Apollo 13 Mission Report MSC-02680, table 3-I';
const masses = 'MSC-02680, appendix A, table A-I; postflight reconstruction at transposition and docking';
// Launch Control logged Lovell aboard at 11:32 EST. The T−2:12:23 report authorizes closing the hatch.
const boarding: [number, number] = [-elapsed(2, 41, 0), -elapsed(2, 12, 23)];
// The closeout crew had the hatch open during the T−3:30 hold. The endpoint is a bound.
const closeout = { openBy: -elapsed(3, 30, 0), coverClosedBy: -elapsed(1, 29, 57) };
const cabin = blockIICabin(3871);
const PLAN = saturnVPlan(orbital);

export const flight: Flight = {
  id: 'usa/apollo/apollo-13',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 13 · AS-508',
  callsign: 'Odyssey · Aquarius',
  spacecraft: 'CSM-109 Odyssey · LM-7 Aquarius',
  launchVehicle: 'Saturn V · SA-508',
  launch: '1970-04-11T19:13:00Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  opens: { at: boarding[0], model: 'pad', view: 'launcher' },
  site: LC39A,
  weather: WEATHER,
  plan: { ...PLAN, aloft: WEATHER.aloft },
  flies: saturnVFlies(PLAN, nodes(launcher)),
  crew: ['James A. Lovell Jr.', 'John L. Swigert Jr.', 'Fred W. Haise Jr.'],
  summary:
    'When an oxygen tank failed in Odyssey, all three men took shelter in Aquarius. They used the lunar module’s descent engine to turn the docked spacecraft back toward Earth. They returned to Earth in Odyssey, splashing down in the Pacific on 17 April.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-109 and LM-7' },
    { label: 'Planned landing', value: 'Fra Mauro' },
    { label: 'Recovery', value: 'Pacific Ocean · 17 April 1970' },
  ],
  timeline: [
    { t: boarding[0], event: 'Lovell boards Odyssey’s left couch' },
    { t: -elapsed(2, 35, 0), event: 'Haise boards the right couch' },
    { t: -elapsed(2, 29, 0), event: 'Swigert takes the centre couch' },
    { t: boarding[1], event: 'Closeout crew receives clearance to close the hatch' },
    { t: closeout.coverClosedBy, event: 'Launch Control reports the boost protective cover closed' },
    { t: 0.3, event: 'First motion of SA-508 on mobile launcher 3' },
    { t: 0.61, event: 'IU umbilical disconnect starts time base 1' },
    { t: 0.65, event: 'Liftoff reference in the spacecraft mission report' },
    { t: elapsed(0, 3, 21), event: 'Launch escape tower jettison' },
    { t: 330.65, event: 'S-II centre engine cuts off early during longitudinal oscillations' },
    { t: elapsed(0, 12, 30), event: 'S-IVB cuts off in Earth parking orbit' },
    { t: elapsed(2, 35, 46), event: 'S-IVB restarts for translunar injection' },
    { t: elapsed(3, 6, 39), event: 'Odyssey separates and turns toward Aquarius' },
    { t: elapsed(3, 19, 9), event: 'Swigert docks Odyssey with Aquarius' },
    { t: elapsed(4, 1, 1), event: 'Odyssey extracts Aquarius from SLA-16' },
    { t: elapsed(30, 40, 50), event: 'Service engine fires for the first midcourse correction' },
    { t: elapsed(55, 54, 53), event: 'Oxygen tank 2 fails in the service module' },
    { t: elapsed(61, 0, 10), event: 'Haise confirms Aquarius’s landing gear down and locked' },
    { t: elapsed(61, 29, 43), event: 'Aquarius fires its descent engine to restore a free-return trajectory' },
    { t: elapsed(77, 56, 40), event: 'S-IVB strikes the Moon for the seismic experiment' },
    { t: elapsed(79, 27, 39), event: 'After lunar flyby, Aquarius fires its descent engine to shorten the return' },
    { t: elapsed(105, 18, 28), event: 'Descent engine fires for an entry-corridor correction' },
    { t: elapsed(137, 39, 52), event: 'Aquarius uses its reaction-control thrusters for the final correction' },
    { t: elapsed(138, 1, 48), event: 'Crew jettisons the damaged service module' },
    { t: elapsed(141, 30, 0), event: 'Odyssey and Aquarius undock before entry' },
    { t: elapsed(142, 40, 46), event: 'Odyssey reaches entry interface' },
    { t: elapsed(142, 54, 41), event: 'Pacific splashdown' },
  ],
  specs: [
    specification(rocket, 'Height on the pad', 363 * 0.3048, 'm', 'Apollo 13 Press Kit, Saturn V launch vehicle'),
    specification(
      rocket,
      'Mass at ground ignition',
      6501733 * lb,
      'kg',
      'AS-508 Flight Evaluation Report, table 16-2, actual ground ignition weight, 6,501,733 lb',
    ),
    {
      group: 'Spacecraft',
      label: 'Length from engine exit to docking plane',
      value: 404.25 * 0.0254,
      unit: 'm',
      confidence: 'assumed',
      note: 'Block II stations XA706 to XA1000 plus Xc110.25, NASA TN D-6854 fig. A-13, applied to CSM-109.',
    },
    specification(
      rocket,
      'Mass at liftoff',
      6414967 * lb,
      'kg',
      'AS-508 Flight Evaluation Report, table 16-2, actual weight at holddown-arm release, 6,414,967 lb',
    ),
    specification('Spacecraft', 'CSM at transposition', 63720.3 * lb, 'kg', masses),
    specification('Lunar module · Aquarius', 'LM at transposition', 33499.1 * lb, 'kg', masses),
    specification('Mission', 'Duration of flight', elapsed(142, 54, 41), 's', report),
  ],
  motors: APOLLO13_THRUST,
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 13 · Saturn V',
      url: 'models/usa/apollo/apollo-13/vehicle.glb',
      backdrop: 'ground',
      cutaway: true,
      dockingPorts: [odysseyPort, aquariusPort],
      ...cabin,
      cabin: { ...cabin.cabin, within: [...cabin.cabin.within, 'WaterDispenser'] },
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Lovell’s left couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_CommandModulePilot', figure: 'pilot', label: 'Swigert’s centre couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_LunarModulePilot', figure: 'lmp', label: 'Haise’s right couch', from: 'SideHatch', open: boarding },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: nodes(launcher) },
        { id: 'escape', label: 'Escape tower', nodes: nodes(escapeParts) },
        ...odysseyViews,
        { id: 'aquarius', label: 'Aquarius in adapter', nodes: nodes(aquariusStackParts), isolate: true, from: [1, 0.12, -0.25] },
        ...aquariusStackViews,
        impactRadioView,
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: boardingHatches(
        [...odysseyCommand, ...odysseyService, ...aquariusStackParts, ...escapeParts, ...launcher],
        boarding,
        closeout,
      ),
    },
    aquariusModel,
    mobileLauncher(3, {
      holdDowns: 'as-508',
      ingress: boarding[0],
      parkCommand: -elapsed(0, 43, 0),
      parkedBy: -elapsed(0, 42, 31),
      pao: 'Kennedy Launch Control, 11 April 1970. Arm 9 moved at T−43:00, was reported about 10 ft away by T−42:31, and retracted from standby at T−5 minutes.',
      intertankClear: -17,
      forwardRetract: -16.2,
      firstMotion: 0.3,
      terminalSource:
        'Saturn V Flight Manual SA-508, §VIII, figure 8-20 (nominal strokes); AS-508 Flight Evaluation Report, table 2-2 and §3.6.1 (first motion and panel indications).',
    }),
    ...lc39Crew(['Lovell', 'Swigert', 'Haise'], true),
  ],
};
