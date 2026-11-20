import type { Flight } from '../../../../../src/types.ts';
import { rocket, specification } from '../../../apollo/vehicles/stack-gallery.ts';

const fer = 'SA-206 Flight Evaluation Report MPR-SAT-FE-73-3';
const characteristics = 'NASA Historical Data Book, volume III, table 2-49, Skylab 2 characteristics';
const duration = 28 * 86400 + 49 * 60 + 49;
// NASA, Astronautics and Aeronautics, 1973, pp. 147–152. The parasol times follow Skylab: A Chronology,
// entry for 26 May, which cites the First Visit mission report. Both publications use EDT.
const rangeZero = Date.parse('1973-05-25T13:00:00Z');
const utc = (time: string) => (Date.parse(time) - rangeZero) / 1000;

export const timeline: Flight['timeline'] = [
  { t: -9720, event: 'Scheduled start of crew ingress into CSM-116' },
  { t: -88 * 60, event: 'Launch Control reports the crew aboard and preparations for cabin checks' },
  { t: -58 * 60, event: 'White room secured and closeout crew clearing the pad' },
  { t: -47 * 60, event: 'Crew access arm starts moving to the twelve-degree standby position' },
  { t: -17 * 60, event: 'Two-minute scheduled hold at countdown T−15 minutes' },
  { t: -15 * 60, event: 'Terminal count resumes' },
  { t: -300, event: 'Final retraction of the spacecraft access arm' },
  { t: -3.1, event: 'Engine start command goes to the first stage' },
  { t: 0.02, event: 'Launch commit releases the eight hold-downs' },
  { t: 0.19, event: 'First motion of SA-206 on Pad 39B' },
  { t: 0.53, event: 'The flight computer senses the instrument-unit umbilical disconnect' },
  { t: 60.5, event: 'SA-206 reaches Mach 1 at 7.66 km' },
  { t: 75.5, event: 'Air loads peak at 12.84 km altitude' },
  { t: 142.26, event: 'The flight computer senses outboard engine cutoff on the S-IB' },
  { t: 143.7, event: 'The first and second stages separate' },
  { t: 586.21, event: 'Guidance sends the S-IVB cutoff signal' },
  { t: 960.28, event: 'CSM-116 separates from S-IVB-206' },
  { t: utc('1973-05-25T21:56:00Z'), event: 'First soft dock with Skylab, before the crew backs away to inspect the trapped wing' },
  { t: utc('1973-05-26T00:12:00Z'), event: 'Weitz ends the attempt to free the wing from the open command-module hatch' },
  { t: utc('1973-05-26T03:50:00Z'), event: 'Conrad reports a hard dock with the station' },
  { t: utc('1973-05-26T16:45:00Z'), event: 'The crew enters the multiple docking adapter' },
  { t: utc('1973-05-26T21:00:00Z'), event: 'The crew begins feeding the folding parasol through the scientific airlock' },
  { t: utc('1973-05-26T23:30:00Z'), event: 'The crew finishes deploying the parasol over the exposed workshop skin' },
  { t: utc('1973-06-07T15:23:00Z'), event: 'Conrad and Kerwin open the airlock hatch to free the workshop solar wing' },
  { t: utc('1973-06-07T18:53:00Z'), event: 'The airlock hatch closes after the solar-wing repair' },
  { t: utc('1973-06-19T10:53:00Z'), event: 'Conrad and Weitz start a spacewalk to retrieve telescope film and replace cameras' },
  { t: utc('1973-06-19T12:29:00Z'), event: 'The second station spacewalk ends' },
  { t: utc('1973-06-22T08:55:00Z'), event: 'CSM-116 undocks and circles the station for photographs' },
  { t: utc('1973-06-22T13:11:00Z'), event: 'The service engine fires for the final deorbit maneuver' },
  { t: duration, event: 'CM-116 splashes down in the Pacific near USS Ticonderoga' },
];

export const specs: Flight['specs'] = [
  specification(
    rocket,
    'Height on the pad',
    2681.859 * 0.0254,
    'm',
    'Skylab Saturn IB Flight Manual SA-206, figure 1-1. Q-ball tip at station 2681.859 in above datum.',
  ),
  specification(rocket, 'Mass at ground ignition', 593533, 'kg', `${fer}, table 16-1, actual total vehicle mass at ground ignition.`),
  specification(
    rocket,
    'Mass at liftoff',
    586000,
    'kg',
    `${fer}, tables 16-1 and 16-2, actual total mass at first motion, rounded to the nearest tonne.`,
  ),
  specification(rocket, 'Peak dynamic pressure', 33810, 'Pa', `${fer}, table 4-3, 3.381 N/cm² at 75.5 seconds.`),
  {
    group: 'Spacecraft',
    label: 'Length from engine exit to docking plane',
    value: 404.25 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'Shared Block II stations XA706 to XA1000 plus Xc110.25 at the docking plane, NASA TN D-6854, figure A-13. Applied to CSM-116.',
  },
  specification(
    'Spacecraft',
    'Mass in orbit at CSM separation',
    13978,
    'kg',
    `${fer}, table 16-5, p. 16-6. CSM mass removed from the upper-stage ledger at separation, 30,817 lb.`,
  ),
  specification('Mission', 'Perigee at insertion', 156000, 'm', characteristics),
  specification('Mission', 'Apogee at insertion', 357000, 'm', characteristics),
  specification('Mission', 'Duration of flight', duration, 's', characteristics),
];
