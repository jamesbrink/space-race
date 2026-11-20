import type { Flight } from '../../../../../src/types.ts';
import { rocket, specification } from '../../../apollo/vehicles/stack-gallery.ts';

const fer = 'SA-207 Flight Evaluation Report MPR-SAT-FE-73-5';
const jsc = 'Skylab Mission Report, Second Visit, JSC-08662';
const rangeZero = Date.parse('1973-07-28T11:10:50Z');
const utc = (time: string) => (Date.parse(time) - rangeZero) / 1000;
const duration = 59 * 86400 + 11 * 3600 + 9 * 60 + 4;

// Ascent uses range time in MPR-SAT-FE-73-5, §§2, 4 and 18. JSC-08662 §§2, 7.7 and 12
// and NASA's Astronautics and Aeronautics, 1973, pp. 224–229, record the crew events.
export const timeline: Flight['timeline'] = [
  // Prelaunch T-times use range time. FER §3.3 records the two-minute hold at countdown T−15.
  // Ingress is scheduled (SL-3 press kit, p. 20). MC1, 3, 4, 6 and 8 are launch-day reports.
  { t: -9720, event: 'Scheduled start of crew ingress into CSM-117' },
  { t: -69 * 60, event: 'Launch Control reports the boost-cover hatch pulled shut and the white-room connections being removed' },
  { t: -47 * 60, event: 'Access arm 9 starts moving to its twelve-degree standby position' },
  { t: -37 * 60, event: 'Launch Control reports that the closeout crew has cleared the pad' },
  { t: -17 * 60, event: 'Countdown clock holds at T−15 minutes to align liftoff with the workshop orbit' },
  { t: -15 * 60, event: 'Terminal countdown resumes at 06:55:50 EDT' },
  { t: -300, event: 'Access arm 9 starts its final withdrawal' },
  { t: -3.1, event: 'Engine start command goes to the S-IB' },
  { t: 0.3, event: 'First motion of SA-207 on Pad 39B' },
  { t: 0.48, event: 'The flight computer senses the instrument-unit umbilical disconnect' },
  { t: 59, event: 'SA-207 reaches Mach 1 at 7.54 km altitude' },
  { t: 75, event: 'Peak dynamic pressure on the ascending Saturn IB' },
  { t: 140.72, event: 'The flight computer senses outboard engine cutoff on the S-IB' },
  { t: 142.02, event: 'The first and second stages separate' },
  { t: 592.93, event: 'Guidance commands cutoff of the upper stage’s J-2 engine' },
  { t: 1080.44, event: 'The crew separates CSM-117 from S-IVB-207' },
  { t: 31 * 60, event: 'At about 31 minutes the S-150 X-ray detector reaches operating pressure on the spent stage' },
  { t: 140 * 60, event: 'At about 2 hours 20 minutes low detector pressure ends X-ray collection' },
  { t: 3 * 3600, event: 'About three hours into the flight the crew isolates leaking service-module thruster quad B' },
  { t: 19193.27, event: 'A ground command starts the spent upper stage’s deorbit sequence' },
  { t: utc('1973-07-28T20:00:00Z'), event: 'After docking on the fifth orbit, the crew enters Skylab’s multiple docking adapter' },
  {
    t: utc('1973-08-02T10:47:00Z'),
    event: 'Falling temperature in quad D triggers a warning near the start of a second oxidizer leak investigation',
  },
  { t: utc('1973-08-06T17:30:00Z'), event: 'Garriott and Lousma begin the spacewalk to erect the twin-pole sunshade over the workshop' },
  { t: utc('1973-08-24T16:24:00Z'), event: 'Airlock depressurization begins for the spacewalk to connect the replacement rate gyros' },
  { t: utc('1973-09-22T11:18:00Z'), event: 'Bean and Garriott begin the final spacewalk to recover telescope film and experiment samples' },
  { t: utc('1973-09-25T19:49:42Z'), event: 'CSM-117 separates from the workshop' },
  { t: utc('1973-09-25T21:38:18Z'), event: 'The service engine fires the single deorbit maneuver' },
  { t: duration, event: 'CM-117 splashes down in the Pacific near USS New Orleans' },
];

export const specs: Flight['specs'] = [
  {
    group: rocket,
    label: 'Height on the pad',
    value: 2681.859 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'SA-206 flight manual, fig. 1-1. The same Skylab Saturn IB stack stations are used for SA-207.',
  },
  specification(rocket, 'Mass at ground ignition', 594299, 'kg', `${fer}, table 16-1, actual ground ignition mass.`),
  specification(
    rocket,
    'Mass at liftoff',
    588000,
    'kg',
    `${fer}, tables 16-1 and 16-2, actual first-motion mass rounded to the nearest tonne.`,
  ),
  specification(rocket, 'Peak dynamic pressure', 35230, 'Pa', `${fer}, table 4-3, 3.523 N/cm² at 75.0 s.`),
  {
    group: 'Spacecraft',
    label: 'Length from engine exit to docking plane',
    value: 404.25 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'Shared Block II stations XA706 to XA1000 plus Xc110.25 at the docking plane, NASA TN D-6854, figure A-13. Applied to CSM-117.',
  },
  specification(
    'Spacecraft',
    'Mass in orbit at CSM separation',
    14167,
    'kg',
    `${fer}, table 16-5, p. 16-8, actual CSM mass removed from the upper stage’s ledger.`,
  ),
  specification('Mission', 'Perigee at insertion', 149870, 'm', `${fer}, table 4-7, reconstructed parking orbit before CSM separation.`),
  specification('Mission', 'Apogee at insertion', 226290, 'm', `${fer}, table 4-7, reconstructed parking orbit before CSM separation.`),
  specification('Mission', 'Duration of flight', duration, 's', `${jsc}, §2, 1,427 hours 9 minutes 4 seconds.`),
];
