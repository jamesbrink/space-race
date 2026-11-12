/**
 * Vostok 1 as an orbital flight: what `flight.ts` gives as `Flight.orbital` (src/sim/orbital.ts). The record with its
 * sources and disagreements is set out in mission.md beside this file; the numbers live here.
 *
 * SI throughout, with the source's own units in each `source`. Times are seconds from liftoff, 09:06:59.7 Moscow time
 * (06:06:59.7 UTC). Nothing here was adjusted after the simulator was run: the checks' tolerances were written before
 * `flyOrbit` existed (the commit that added this file has no simulator in it).
 */
import type { Confidence, Measure } from '../../../../../src/types';
import type { OrbitalFlight } from '../../../../../src/sim/orbital.ts';

const m = (value: number, confidence: Confidence, source: string): Measure => ({ value, confidence, source });
const doc = (value: number, source: string): Measure => m(value, 'documented', source);
const derived = (value: number, source: string): Measure => m(value, 'derived', source);
const guess = (value: number, source: string): Measure => m(value, 'estimated', source);

/** Seconds from liftoff of a Moscow time on the morning of 12 April 1961. */
export const MSK = (h: number, min: number, s = 0): number => (h - 9) * 3600 + (min - 6) * 60 + (s - 59.7);

const G0 = 9.80665;
const OKB1 =
  'OKB-1, preliminary report of 3 May 1961 (Korolev, Bushuyev, Tikhonravov; RKK Energia archive 13029; Wilson Center record 260547)';
const GAGARIN = 'Gagarin’s report to the State Commission, 13 April 1961 (APRF f. 3, op. 47, d. 278; Wilson Center record 260544)';
const SIDDIQI = 'Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
const ZAK = 'Zak, RussianSpaceWeb';
const ENERGOMASH = 'NPO Energomash’s table by vehicle, row 8K72K, as reproduced by Brügge (b14643.eu): secondary';
const MINAKOV = 'Minakov, «Ракета, поднявшая в космос Ю. Гагарина», Modelist-Konstruktor';
const ASTRONAUTIX = 'Encyclopedia Astronautica, Vostok 8K72K stage data: secondary';

/** The command to the braking engine (OKB-1: "the TDU was turned on at 1025:04.2"), which everything about the burn is timed from. */
const TDU = MSK(10, 25, 4.2);

export const orbital: OrbitalFlight = {
  liftoffMass: doc(
    287_000,
    'RKK Energia 1946–1996, of this flight: «со стартовой массой 287 т»; Minakov; Siddiqi. Also in print: 290.5 t (Zak), 291.15 t (Brügge), 281.4 t (Astronautix)',
  ),
  stages: [
    {
      name: 'Strap-on boosters, Blocks B, V, G, D',
      count: 4,
      engine: 'RD-107 (8D74)',
      nodes: ['Booster_B', 'Booster_V', 'Booster_G', 'Booster_D'],
      mass: doc(43_300, `${ASTRONAUTIX}: 43.3 t each. Minakov’s table has 170 t for the four (42.5 t); Brügge 177.65 t (44.4 t)`),
      dry: doc(3_750, `${MINAKOV}: 3.75 t. Astronautix has 3.71 t`),
      propellant: doc(
        39_160,
        'Brügge: 39.16 t each, of which 1.47 t is peroxide and nitrogen: secondary. Mass less dry is 39.55 t: the three are from three sources and do not sum',
      ),
      thrust: {
        seaLevel: doc(815_900, `${ENERGOMASH}: 815.9 kN. Minakov’s table: 82 tf (804 kN)`),
        vacuum: doc(997_700, `${ENERGOMASH}: 997.7 kN`),
      },
      isp: {
        seaLevel: doc(2510 / G0, `${ENERGOMASH}: 2,510 N·s/kg (256 s)`),
        vacuum: doc(3069 / G0, `${ENERGOMASH}: 3,069 N·s/kg (313 s)`),
      },
      ignition: guess(
        0,
        'lit on the pad before liftoff, through a preliminary and an intermediate stage of thrust (Gagarin’s report); how many seconds before has not been read, and the propellant burned before liftoff is not known',
      ),
      cutoff: doc(
        119,
        `${SIDDIQI}, p. 277, and ${ZAK}: separation at T+119 s; the engines were throttled back before it (RKK Energia 1946–1996) by a profile that was not found. Rated burns in print: 118 s (Minakov), 120.5 s (Brügge, computed)`,
      ),
      separation: doc(119, `${SIDDIQI}, p. 277; ${ZAK}`),
    },
    {
      name: 'Core, Block A',
      count: 1,
      engine: 'RD-108 (8D75)',
      nodes: ['CoreStage', 'CoreEngine', 'Interstage'],
      mass: doc(100_400, `${ASTRONAUTIX}: 100.4 t. Brügge 99.76 t; Minakov 102 t`),
      dry: doc(6_800, `${ASTRONAUTIX}: 6.8 t. Minakov: 7 t for the 8K71’s core, 8 t in his 8K72 table`),
      propellant: doc(
        90_100,
        'Brügge: 90.1 t, of which 3.12 t is peroxide and nitrogen: secondary. Mass less dry is 93.6 t: from different sources, and they do not sum',
      ),
      thrust: {
        seaLevel: doc(744_300, `${ENERGOMASH}: 744.3 kN. Minakov’s table: 81.2 tf`),
        vacuum: doc(945_400, `${ENERGOMASH}: 945.4 kN`),
      },
      isp: {
        seaLevel: doc(2432 / G0, `${ENERGOMASH}: 2,432 N·s/kg (248 s)`),
        vacuum: doc(3089 / G0, `${ENERGOMASH}: 3,089 N·s/kg (315 s)`),
      },
      ignition: guess(0, 'lit on the pad with the strap-ons, as theirs'),
      cutoff: doc(
        300,
        `${SIDDIQI}, p. 277: T+300 s. ${ZAK}: 299 s, and half a second or so later than commanded (the radio guidance’s fault), which is one of the two explanations in print of the high apogee`,
      ),
      separation: doc(
        300,
        `${SIDDIQI}; ${ZAK}: the third stage lights through the lattice and the core is cut loose. No separate instant is given`,
      ),
    },
    {
      name: 'Third stage, Block E',
      count: 1,
      engine: 'RD-0109 (8D719)',
      nodes: ['BlockE'],
      mass: doc(7_984, `${MINAKOV}: 7,984 kg, of the 8K72’s stage. Astronautix 7,775 kg; RKK Energia “8 t”; Brügge 8.36 t`),
      dry: doc(1_472, `${MINAKOV}: 1,472 kg burnt out. Astronautix 1,440 kg; Zak 1.34 t dry`),
      propellant: derived(6_512, 'Minakov’s two figures, 7,984 less 1,472 kg. Brügge has 6.93 t'),
      thrust: { vacuum: doc(54_500, 'Brügge: 54.5 kN; Astronautix 54.52 kN: secondary') },
      isp: { vacuum: doc(3172 / G0, 'Brügge: 3,172 N·s/kg (323.5 s); Astronautix 324 s: secondary') },
      ignition: doc(
        300,
        `${SIDDIQI}; ${ZAK}: “about 300 s”, lit while the core still burned (hot staging: Minakov; RKK Energia). Gagarin felt 10 to 15 s of weightlessness between the two (${GAGARIN}), which that does not explain: not reconciled`,
      ),
      cutoff: doc(
        676,
        `${SIDDIQI}, p. 277: T+676 s. It burned long: a valve assembled wrongly (Siddiqi 2015, from the documents published in 2011). 376 s of burning at 54.5 kN and 323.5 s would use 6,460 kg, all but 50 kg of Minakov’s load`,
      ),
      separation: doc(
        MSK(9, 18, 28),
        `${OKB1}: “separated from the booster at 0918:28”. ${ZAK} notes 09:18:07 from another source (Novosti Kosmonavtiki)`,
      ),
    },
  ],
  events: [
    { id: 'liftoff', label: 'Liftoff', at: doc(0, `${SIDDIQI}, launch log: 09:06:59.7 Moscow time. ${OKB1}: 0906:59`) },
    { id: 'boosters', label: 'The four strap-ons separate', at: doc(119, `${SIDDIQI}, p. 277; ${ZAK}`) },
    {
      id: 'fairing',
      label: 'Fairing jettisoned',
      at: doc(150, `${GAGARIN}: “At second 150 the fairing separated”: a round figure, from memory the next day`),
      also: '154 s (Zak); 156 s (the figure in Siddiqi). Zak has the radio guidance’s power failing at 156 s',
    },
    { id: 'core', label: 'Core cut off; third stage alight', at: doc(300, `${SIDDIQI}, p. 277`), also: '299 s (Zak)' },
    { id: 'orbit', label: 'Third stage cut off: in orbit', at: doc(676, `${SIDDIQI}, p. 277`) },
    {
      id: 'separation',
      label: 'Spacecraft separates from the third stage; the Granit-5V timer starts',
      at: doc(MSK(9, 18, 28), `${OKB1}: 0918:28. Gagarin: “about 10 seconds” after the cutoff, and the clock and cycle 1 started with it`),
      also: '09:18:07 (Zak, citing Novosti Kosmonavtiki)',
    },
    {
      id: 'orientation',
      label: 'Solar orientation switched on, in the Earth’s shadow',
      at: m(MSK(9, 50), 'documented', `${ZAK}: planned for 09:50, and “around 09:50” Gagarin confirmed it. To the minute at best`),
    },
    { id: 'retro-command', label: 'Braking engine commanded on', at: doc(TDU, `${OKB1}: 1025:04.2 (“pressurize”)`) },
    {
      id: 'retro-on',
      label: 'Braking engine at thrust',
      at: derived(TDU + 2.2 + 1.5, `${OKB1}: “launch” 2.2 s after the command, and at its working mode 1.5 s after that`),
    },
    {
      id: 'retro-off',
      label: 'Braking engine starved: thrust ends',
      at: derived(TDU + 42.2, `${OKB1}: fuel pressure after the pump fell 42.2 s after the command`),
      also: 'Gagarin timed the burn at “exactly 40 seconds” on his stopwatch; Siddiqi (2015) writes of 44 s of firing, which is the timer’s cutoff, not the thrust’s end',
    },
    {
      id: 'retro-timer',
      label: 'Braking engine shut down by its timer; separation cancelled',
      at: doc(TDU + 44, `${OKB1}: 44.0 s after the command, 1025:48.2`),
    },
    {
      id: 'modules',
      label: 'Descent module and instrument module separate',
      at: doc(MSK(10, 36), `${OKB1}: “at 1036 (evidently, from the emergency separation system, from temperature-sensitive elements)”`),
      also: '10:35 (Gagarin). Lissov (in Zak) doubts the thermal sensors could have fired so high; unresolved',
    },
    {
      id: 'ejection',
      label: 'Hatch No. 1 off and the seat out, at about 7 km',
      at: doc(MSK(10, 42), `${ZAK}: 10:42, to the minute. The height is Gagarin’s`),
      also: 'planned for 10:44:12 (Zak’s table of the plan)',
    },
    { id: 'module-down', label: 'Descent module lands', at: doc(MSK(10, 48), `${OKB1}: 1048`) },
    {
      id: 'pilot-down',
      label: 'Gagarin lands',
      at: doc(MSK(10, 53), `${OKB1}: 1053`),
      also: '10:55 (TASS, the marker put up at the place, and Major Gasiev); 10:52 by Private Pekarsky’s watch (Zak)',
    },
  ],
  orbit: {
    radius: derived(
      6_371_000,
      'not stated in the report. Its two heights and its period agree by Kepler’s law only if the heights are over a ball of 6,371 km (mean height 254 km on 6,371 gives 89.44 min; on the equatorial 6,378 it gives 89.58). TASS’s figures of the day fit the same ball, and NSSDC’s fit 6,378: tests/orbit.test.mjs',
    ),
    perigee: doc(
      181_000,
      `${OKB1}: perigee 181 km. TASS on the day: 175 km. NSSDC 1961-012A: 169 km (over 6,378 km). US radar, of Block E: 190.6 km (Zak, after Lissov)`,
    ),
    apogee: doc(
      327_000,
      `${OKB1}: apogee 327 km. TASS on the day: 302 km. NSSDC: 315 km. US radar, of Block E: 326.2 km. The FAI record: 327 km. Planned: 230 km`,
    ),
    inclination: doc(64.95, `${OKB1}: 64°57′. TASS on the day: 65°4′. NSSDC: 64.95°`),
    period: doc(89.44 * 60, `${OKB1}: 89.44 min. TASS on the day: 89.1 min. NSSDC: 89.34 min`),
  },
  injection: {
    at: doc(
      676,
      `${SIDDIQI}, p. 277: third stage cutoff at T+676 s. The orbit is taken to begin here; the push of separation twelve seconds later is not known and is left out`,
    ),
    heading: 'north',
    arc: guess(
      27.5,
      'NOT documented: no source read gives where the spacecraft was at cutoff. Reckoned by hand from the record’s times and round speeds: some 45 km downrange when the strap-ons left, ' +
        '580 km more to the core’s cutoff at “about 5.5 km/s” (Zak), then 376 s on the third stage rising to the 7.84 km/s the orbit needs at perigee, at a mean of 6.5 km/s: 2,440 km. ' +
        'About 3,070 km in all, 27 to 28 degrees of arc; good to perhaps 3 degrees, which is 340 km along the track. It is the weakest input the coast has, and flying the ascent is what replaces it',
    ),
    anomaly: guess(
      0,
      'NOT documented. Perigee is put at the cutoff: a stage that burns a little long along a level path raises the far side of the orbit and leaves its low point where it stopped. ' +
        'Gagarin’s “about when I was passing Cape Horn (at apogee)” is the only word on it in the record, and is loose',
    ),
  },
  mass: doc(4_725, 'RKK Energia 1946–1996, of this flight; the FAI record; Encyclopedia Astronautica. The type: 4.73 t (Siddiqi)'),
  retro: {
    on: derived(TDU + 3.7, `${OKB1}: command at 1025:04.2, “launch” 2.2 s later, at its working mode 1.5 s after that`),
    off: derived(
      TDU + 42.2,
      `${OKB1}: the fuel pressure after the pump fell 42.2 s after the command; the timer shut the engine down at 44.0 s. So 38.5 s of thrust; Gagarin timed 40 s`,
    ),
    deltaV: doc(
      132,
      `${ZAK}, after Lissov in Novosti Kosmonavtiki: 132 m/s where 136 were programmed: secondary. ${OKB1} says only that the impulse “was close to the estimated one”. ` +
        'What the gas that went on escaping afterwards added is not known and is left out. (1,614 kgf for 38.5 s on 4.7 t would be about 131 m/s.)',
    ),
    aim: {
      along: 'sun',
      sense: -1,
      confidence: 'documented',
      source: `${GAGARIN}: “The TDU was directed to the Sun and quite steadily”; ${OKB1}: “oriented toward the Sun before the braking engine unit was turned on”. The nozzle to the Sun, so the push is away from it. How exactly the sensor’s axis lay to the engine’s is not stated; taken as the same line`,
    },
  },
  entry: {
    separation: doc(MSK(10, 36), `${OKB1}: 1036. Gagarin: 10:35`),
    mass: doc(2_460, `${SIDDIQI}, p. 195: 2.46 t for the type, the pilot and his seat aboard. No. 3’s own figure has not been found`),
    area: derived(Math.PI * 1.15 ** 2, 'the disc of the 2.3 m ball (Siddiqi p. 195; RKK Energia’s drawing: Ø2300)'),
    drag: {
      points: [
        [0, 0.47],
        [0.7, 0.5],
        [1, 0.75],
        [1.5, 1.0],
        [3, 0.95],
        [6, 0.92],
        [25, 0.92],
      ],
      confidence: 'estimated',
      source:
        'a smooth sphere’s drag coefficient against Mach number as the textbooks plot it (Hoerner, Fluid-Dynamic Drag; Bailey and Hiatt, AIAA Journal 1972), set down from memory: neither was opened, ' +
        'so it is an estimate until one is. 0.92 above Mach 6 is the figure that matters (it sets the load and how far the ball carries); below Mach 1 a ball this size may be past its drag crisis ' +
        'and lower than 0.47. Nothing published for the Vostok ball itself, charred and with its straps’ stubs, was found. Free-molecule drag above 120 km (about 2) is left out: it is worth nothing in ten minutes',
    },
  },
  ejection: { altitude: doc(7_000, `${GAGARIN}: “approximately at the altitude of 7,000 meters, the hatch cover of hatch Nº 1 ejected”`) },
  landing: {
    latitude: doc(
      51 + 16 / 60,
      `${OKB1}: the pilot’s landing, 51°16′ N: to the minute of arc, 1.9 km. The descent module came down about 1.5 km away (the report; Gagarin thought four). The monument is at 51.2707° N (Wikipedia, from maps)`,
    ),
    longitude: doc(
      45 + 59 / 60,
      `${OKB1}: 45°59′ E: to the minute of arc, 1.2 km. The monument: 45.9973° E. Zak’s table prints “51.16 North, 45.58 East”, the minutes written as decimals`,
    ),
    at: doc(MSK(10, 48), `${OKB1}: the reentry apparatus at 1048, the pilot at 1053`),
  },
  // Tolerances were set here before src/sim/orbital.ts could fly anything (see the file's history), from how well each figure is known.
  checks: [
    {
      id: 'period',
      label: 'Period, from the published heights',
      value: 89.44 * 60,
      unit: 's',
      tolerance: 2,
      confidence: 'documented',
      source: `${OKB1}: 89.44 min, printed to 0.01 min (0.6 s); the heights to 1 km, which is 0.6 s each`,
    },
    {
      id: 'apogee',
      label: 'Apogee, as flown round',
      value: 327_000,
      unit: 'm',
      tolerance: 5_000,
      confidence: 'documented',
      source: `${OKB1}: 327 km. The oblateness moves the height round an orbit by more than the report’s last figure; 5 km allows for the report not saying what kind of elements its are`,
    },
    {
      id: 'separationAltitude',
      label: 'Height when the modules separated',
      value: 155_000,
      unit: 'm',
      tolerance: 15_000,
      confidence: 'derived',
      source: `Lissov’s reckoning, in ${ZAK}: “by 10:36 the spacecraft could only have descended to an altitude of 150-160 kilometers”; Siddiqi (2015): 150 to 170 km. Another’s calculation, not a measurement`,
    },
    {
      id: 'entryG',
      label: 'Greatest load in the entry',
      value: 10,
      unit: 'g',
      tolerance: 2,
      confidence: 'documented',
      source: `${GAGARIN}: “According to my sensations the G-force was beyond 10g”; to the questions: “to 10 and even somewhat higher”. Siddiqi (2015): 10 to 12. A man’s sense of it, not an accelerometer’s trace; about 8 is also in print, unsourced`,
    },
    {
      id: 'ejectionAt',
      label: 'Reaching 7 km',
      value: MSK(10, 42),
      unit: 's',
      tolerance: 60,
      confidence: 'documented',
      source: `${ZAK}: ejection at 10:42, given to the minute`,
    },
    {
      id: 'crossTrack',
      label: 'Landing, across the track',
      value: 0,
      unit: 'm',
      tolerance: 25_000,
      confidence: 'documented',
      source: `${OKB1}: 51°16′ N, 45°59′ E. Wind on the parachutes is not flown, the descent module landed 1.5 km from the pilot, and the orbit’s plane is derived from the inclination and the pad alone: 25 km is what those allow`,
    },
    {
      id: 'alongTrack',
      label: 'Landing, along the track',
      value: 0,
      unit: 'm',
      tolerance: 100_000,
      confidence: 'documented',
      source: `${OKB1}: 51°16′ N, 45°59′ E. Held to 100 km as a record-grade answer would be, knowing that the place on the orbit at cutoff is an estimate good to 340 km: a miss here is that input’s until the ascent is flown`,
    },
  ],
};
