import type { Flight } from '../../../../../src/types.ts';
import { rocket, specification } from '../../../apollo/vehicles/stack-gallery.ts';

const fer = 'SA-208 Flight Evaluation Report MPR-SAT-FE-74-1';
const jsc = 'Skylab Mission Report, Third Visit, JSC-08963';
const rangeZero = Date.parse('1973-11-16T14:01:23Z');
const utc = (time: string) => (Date.parse(time) - rangeZero) / 1000;
const duration = 84 * 86400 + 3600 + 15 * 60 + 31;

// Range time in MPR-SAT-FE-74-1, §§2–4. The scheduled ingress includes the
// two-minute countdown hold (§3.3). Crew events: JSC-08963 §§2 and 11 and
// NASA Astronautics and Aeronautics, 1973, pp. 320–323 (EST in 1973, EDT in February 1974).
export const timeline: Flight['timeline'] = [
  { t: utc('1973-11-16T04:56:00Z'), event: 'Ground equipment switches from conditioned air to gaseous nitrogen' },
  { t: utc('1973-11-16T05:42:00Z'), event: 'Liquid-oxygen chilldown begins' },
  { t: utc('1973-11-16T07:20:22Z'), event: 'Liquid-hydrogen loading begins' },
  { t: utc('1973-11-16T08:15:28Z'), event: 'Upper-stage hydrogen reaches normal replenish' },
  { t: -16320, event: 'Countdown T−3 hours 30 minutes holds for one hour' },
  { t: -12720, event: 'The count resumes after the one-hour hold' },
  { t: -9720, event: 'Scheduled crew ingress into CSM-118 at countdown T−2 hours 40 minutes' },
  { t: -17 * 60, event: 'The countdown clock stops for its two-minute hold at T−15' },
  { t: -15 * 60, event: 'The terminal count resumes' },
  { t: -50, event: 'The launch vehicle transfers to internal power' },
  { t: 0.271, event: 'First motion of SA-208 on Pad 39B' },
  { t: 0.471, event: 'The flight computer senses instrument-unit umbilical disconnect' },
  { t: 59.5, event: 'SA-208 passes Mach 1 at 7.48 km altitude' },
  { t: 69.5, event: 'Peak dynamic pressure at 10.72 km altitude' },
  { t: 141.287, event: 'The computer senses S-IB outboard engine cutoff' },
  { t: 142.54, event: 'First-stage separation signal' },
  { t: 577.379, event: 'The computer senses upper-stage engine cutoff' },
  { t: 1080, event: 'CSM-118 separates from the upper stage' },
  { t: utc('1973-11-16T16:23:21.620Z'), event: 'CSM-118 makes the first phasing burn to catch Skylab' },
  { t: 18637.674, event: 'A ground command starts the upper stage’s deorbit sequence' },
  { t: utc('1973-11-16T22:02:00Z'), event: 'Carr hard docks CSM-118 to Skylab on the third attempt' },
  { t: utc('1973-11-17T14:32:00Z'), event: 'The crew enters the multiple docking adapter and begins activating the workshop' },
  { t: utc('1973-11-22T17:44:00Z'), event: 'Gibson and Pogue begin the spacewalk to load telescope film and repair the S193 antenna' },
  { t: utc('1973-12-25T16:55:00Z'), event: 'Carr and Pogue open the hatch to photograph Comet Kohoutek on its way toward the Sun' },
  { t: utc('1973-12-29T17:29:00Z'), event: 'Carr and Gibson go outside to observe Kohoutek after perihelion' },
  { t: utc('1974-02-03T15:19:00Z'), event: 'Carr and Gibson open the hatch for the final spacewalk to recover telescope film and samples' },
  { t: utc('1974-02-08T10:28:00Z'), event: 'At about 10:28 UTC CSM-118 undocks for a final photographic circuit of the workshop' },
  { t: duration, event: 'CM-118 splashes down in the Pacific near USS New Orleans' },
];

export const specs: Flight['specs'] = [
  {
    group: rocket,
    label: 'Height on the pad',
    value: 2681.859 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'SA-206 flight manual, fig. 1-1. The model uses the same Skylab Saturn IB stack stations for SA-208.',
  },
  specification(
    rocket,
    'Mass at ground ignition',
    595000,
    'kg',
    `${fer}, table 16-1, actual ground ignition mass rounded to the nearest tonne.`,
  ),
  specification(rocket, 'Mass at liftoff', 588000, 'kg', `${fer}, table 16-1, actual first-motion mass rounded to the nearest tonne.`),
  specification(rocket, 'Peak dynamic pressure', 32580, 'Pa', `${fer}, table 4-3, 3.258 N/cm² at 69.5 s.`),
  {
    group: 'Spacecraft',
    label: 'Length from engine exit to docking plane',
    value: 404.25 * 0.0254,
    unit: 'm',
    confidence: 'assumed',
    note: 'Block II stations XA706 to XA1000 plus Xc110.25 at the docking plane, NASA TN D-6854, fig. A-13. Applied to CSM-118.',
  },
  specification(
    'Spacecraft',
    'Mass in orbit at CSM separation',
    14916,
    'kg',
    `${fer}, table 16-5, p. 16-7, actual CSM mass removed at separation.`,
  ),
  specification('Mission', 'Perigee at insertion', 150100, 'm', `${fer}, table 4-7, reconstructed parking orbit.`),
  specification('Mission', 'Apogee at insertion', 227080, 'm', `${fer}, table 4-7, reconstructed parking orbit.`),
  specification('Mission', 'Duration of flight', duration, 's', `${jsc}, §2, from range zero to the 15:16:54 UTC landing.`),
];
