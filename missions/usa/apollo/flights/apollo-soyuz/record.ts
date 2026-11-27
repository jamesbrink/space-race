import type { Flight } from '../../../../../src/types.ts';
import { rocket, specification } from '../../vehicles/stack-gallery.ts';

const report = 'Apollo Soyuz Mission Evaluation Report JSC-10607';
export const launchUTC = '1975-07-15T19:50:00Z';
const utc = (time: string) => (Date.parse(time) - Date.parse(launchUTC)) / 1000;
const duration = utc('1975-07-24T21:18:24Z');

// JSC-10607 table 3-II gives times from Soyuz launch and in GMT. The
// Gallery's clock takes the Apollo range zero in the table's footnote.
export const timeline: Flight['timeline'] = [
  { t: utc('1975-07-15T12:20:00Z'), event: 'Soyuz 19 launches from Baikonur with Leonov and Kubasov' },
  { t: -10080, event: 'Launch Control reports Stafford inside CSM-111' }, // Launch commentary MC34/1, 17:02 GMT.
  { t: 0, event: 'Apollo range zero at Pad 39B' },
  { t: 0.6, event: 'The instrument-unit umbilical disconnect marks Apollo lift-off' }, // §3.1; table 3-IV defines the event.
  { t: utc('1975-07-15T19:59:56Z'), event: 'SA-210 inserts Apollo into a 148.9 by 168.2 km orbit' },
  { t: utc('1975-07-15T21:04:01Z'), event: 'CSM-111 separates from the S-IVB and turns back toward the adapter' },
  { t: utc('1975-07-15T21:28:00Z'), event: 'Apollo’s probe captures the drogue on the docking module' },
  { t: utc('1975-07-15T22:24:00Z'), event: 'Apollo extracts the docking module from the upper stage' },
  { t: utc('1975-07-15T23:31:02Z'), event: 'The service engine makes the circularization burn' },
  { t: utc('1975-07-16T01:05:45Z'), event: 'The upper stage begins its deorbit sequence' },
  { t: utc('1975-07-16T01:28:30Z'), event: 'Apollo makes the first phasing burn to catch Soyuz 19' },
  { t: utc('1975-07-17T15:16:42Z'), event: 'The final transfer burn puts Apollo on an intercept with Soyuz' },
  { t: utc('1975-07-17T16:09:09Z'), event: 'First capture at the international docking ring, with Apollo active' },
  // NASA History, ASTP chronology, gives hatch opening to the nearest minute.
  { t: utc('1975-07-17T19:17:00Z'), event: 'Stafford opens the hatch into Soyuz and shakes hands with Leonov' },
  { t: utc('1975-07-19T12:03:20Z'), event: 'First undocking. Apollo backs away to shade Soyuz for a solar corona experiment' },
  { t: utc('1975-07-19T12:33:39Z'), event: 'Second docking, this time with the Soyuz mechanism active' },
  { t: utc('1975-07-19T15:26:12Z'), event: 'Final undocking. The ultraviolet absorption experiment follows' },
  { t: utc('1975-07-21T10:50:54Z'), event: 'Soyuz 19 lands in Kazakhstan' },
  { t: utc('1975-07-23T19:47:00Z'), event: 'Apollo jettisons the docking module for the Doppler tracking experiment' },
  { t: utc('1975-07-24T20:37:47Z'), event: 'CSM-111 makes its deorbit burn on revolution 138' },
  { t: utc('1975-07-24T20:44:09Z'), event: 'The command module separates from the service module' },
  { t: utc('1975-07-24T20:59:00Z'), event: 'CM-111 reaches entry interface at 122 km' },
  { t: utc('1975-07-24T21:15:17Z'), event: 'The three main parachutes deploy' },
  { t: duration, event: 'CM-111 splashes down in the Pacific near USS New Orleans' },
];

export const specs: Flight['specs'] = [
  {
    group: rocket,
    label: 'Height on the pad',
    value: 2681.859 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'SA-206 flight manual, fig. 1-1, station datum carried to SA-210. The ASTP press kit p. 82 rounds its height to 224 ft.',
  },
  specification(rocket, 'Mass at liftoff (planned)', 600000, 'kg', 'ASTP press kit, p. 82, approximate preflight figure.'),
  {
    group: 'Spacecraft',
    label: 'Length from engine exit to docking plane',
    value: 404.25 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'Block II stations XA706 to XA1000 plus Xc110.25 at the docking plane, NASA TN D-6854, fig. A-13. Applied to CSM-111.',
  },
  specification(
    'Spacecraft',
    'CSM mass in orbit at insertion',
    12904.5,
    'kg',
    `${report}, table F-I, excluding the docking module and adapter.`,
  ),
  specification('Spacecraft', 'Docking module mass at orbit insertion', 2006.3, 'kg', `${report}, table F-I.`),
  specification('Spacecraft', 'Docking module length between interfaces', 3.15, 'm', `${report}, §A.1.1.`),
  specification('Spacecraft', 'Docking module pressure-vessel inner diameter', 1.42, 'm', `${report}, §A.1.1.`),
  specification('Mission', 'Perigee at insertion', 148900, 'm', `${report}, table 3-I.`),
  specification('Mission', 'Apogee at insertion', 168200, 'm', `${report}, table 3-I.`),
  {
    group: 'Mission',
    label: 'Inclination at insertion',
    value: (0.904 * 180) / Math.PI,
    unit: '°',
    confidence: 'derived',
    note: `${report}, table 3-I, 0.904 rad converted to degrees.`,
  },
  specification(
    'Mission',
    'Duration of flight',
    duration,
    's',
    `${report}, table 3-II. Elapsed time from Apollo range zero to splashdown.`,
  ),
];
