import type { Flight, Part } from '../../../../../src/types.ts';
import { TAIL, TURN } from '../../../places/tyuratam/site-1.parts.ts';
import { SITE31, site31Pad } from '../../../places/tyuratam/site-31.ts';
import { soyuzWalker } from '../../crew/walkout.ts';
import {
  CRAFT,
  descent,
  iglaMoves,
  onSoyuzPad,
  orbital,
  service,
  soyuzGallery,
  soyuzGallerySpecs,
  wingMoves,
} from '../../vehicles/gallery.ts';

const TASS = 'TASS communiqué, Pravda no. 301 (27 October 1968), p. 1 (preliminary orbit)';
const SIDDIQI = 'Asif A. Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
const RECORD = 'Igor Afanasyev and Dmitry Vorontsov, Pervye Soyuzy, Soyuz 2 and Soyuz 3';

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'A separate room for work and rest during the four days in orbit.',
    detail:
      'The orbital module gave Beregovoy room to move about between tests. It had its own side hatch and windows and was discarded before entry. Beregovoy described a worktable and mahogany-finished sideboard, and used a portable cine camera in orbit. Its shape follows the flight’s television images, with an estimated stowage position.',
    facts: [['Module', 'БО · бытовой отсек']],
  },
  {
    node: 'RendezvousLights',
    name: 'Rendezvous signal lamps',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'Four lights helped the pilot judge which way the other Soyuz was turned.',
    detail:
      'Kamanin’s diary describes two steady lights above two flashing lights on each spacecraft. The pattern gave Beregovoy a reference during the approach in darkness. The gallery shows the lens housings in an estimated arrangement.',
    facts: [['Arrangement', 'Two steady and two flashing · Kamanin, 29 October']],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The probe was meant to catch the socket on the uncrewed Soyuz 2.',
    detail:
      'The active probe on No. 10 would have engaged the passive cone on Soyuz 2, No. 11. Beregovoy flew within docking distance, but the spacecraft never coupled. The probe and ring are reconstructed, with static geometry.',
    facts: [
      ['Docking role', 'Active · documented'],
      ['Target', 'Soyuz 2 · uncrewed'],
    ],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'The cabin that brought Beregovoy back to Kazakhstan.',
    detail:
      'The rounded descent module brought Beregovoy through a guided entry and landed north of Karaganda. The parachute system had been revised after Soyuz 1. The cutaway shows the cabin, with its shape based on published 7K-OK dimensions.',
    facts: [
      ['Module', 'СА · спускаемый аппарат'],
      ['Return', 'Guided entry and landing on land'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'The Sirius-7K controls and Beregovoy’s position for the rendezvous.',
    detail:
      'Beregovoy took over the final approach to Soyuz 2 from this cabin. The Sirius-7K board carries the navigation globe and cathode-ray screen, with a command-and-signal panel on either side. Yuri Tyapchenko’s illustrations show the early system. Individual fittings and static instrument faces are reconstructed, including the hand controls.',
    facts: [['Flight displays', 'Sirius-7K · reconstructed']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Beregovoy flew alone on the first crewed Soyuz since Komarov.',
    detail:
      'The capsule was designed for up to three people. The model places Beregovoy in the centre couch, with the other two empty. The exact couch dimensions, his pose and the details of his flight clothing are reconstructed.',
    facts: [['Crew aboard', 'Georgiy T. Beregovoy']],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The module supplied power and carried the engines for orbit changes and return.',
    detail:
      'The aft module held the main propulsion and attitude-control equipment and carried the solar arrays. Soyuz 3 manoeuvred in orbit and used its main engine to brake for entry. The gallery depicts the early Soyuz module’s exterior.',
    facts: [['Module', 'ПАО · приборно-агрегатный отсек']],
  },
  {
    node: 'InfraredVertical',
    name: 'Infrared vertical sensor',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'A sensor that helped orient Soyuz with respect to Earth.',
    detail:
      'The 7K-OK used an infrared sensor to establish the local vertical. This instrument was introduced from spacecraft No. 7, and Kamanin records its use on Soyuz 3 during the descent sequence. The housing follows the published type drawing, with an estimated mounting position.',
    facts: [['Equipment', 'Fitted from spacecraft No. 7 · GCTC 7K-OK description']],
  },
  ...(['Left', 'Right'] as const).map(
    (side): Part => ({
      node: `Solar${side}`,
      name: `${side} solar array`,
      group: CRAFT,
      order: 4,
      explode: service,
      moves: wingMoves(side),
      summary: 'A folding solar wing that charged the spacecraft batteries.',
      detail:
        'Ground tracking confirmed the solar panels deployed after insertion. Both wings open with the modules still joined at the gallery slider’s midpoint. Leaf shapes, hinges and antenna travel are reconstructed.',
      facts: [['Deployment', 'Reported by the Sary Shagan and Ussuriisk tracking stations']],
    }),
  ),
  {
    node: 'Igla',
    name: 'Igla rendezvous antennas',
    group: CRAFT,
    order: 2,
    explode: orbital,
    moves: iglaMoves,
    summary: 'Igla brought Soyuz 3 within a few hundred metres of the target.',
    detail:
      'The automatic rendezvous system used radio measurements to guide Soyuz 3 toward Soyuz 2. Beregovoy took control at about 200 metres for the final approach. The folding boom follows a 7K-OK type drawing, with estimated hinge travel.',
    facts: [
      ['System', 'Игла (Igla), “needle”'],
      ['Manual handover', 'About 200 m'],
    ],
  },
];

const launch = '1968-10-26T08:34:18Z';
const landing = '1968-10-30T07:25:03Z';
const elapsed = (utc: string) => (Date.parse(utc) - Date.parse(launch)) / 1000;
const duration = elapsed(landing);

const vehicle = soyuzGallery('soyuz-3', 'Soyuz 3', 'Beregovoy', spacecraft, ['LowerCap']);
vehicle.scale = '49.913 m nominal stack · 11A511 type drawing · hardware detail reconstructed';

const crew = soyuzWalker('crew', 'Georgiy T. Beregovoy', 'models/ussr/soyuz/soyuz-3/crew.glb', 'flight', [-48, 0, 3.5], 1.8);
vehicle.seats![0]!.figure = crew.id;

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-3',
  nation: 'USSR',
  agency: 'TsKBEM (formerly OKB-1)',
  program: 'Soyuz',
  designation: 'Soyuz 3',
  callsign: 'Argon',
  spacecraft: 'Soyuz 7K-OK(A) No. 10',
  launchVehicle: 'Soyuz 11A511 · Ya15000-10',
  launch,
  launchSite: 'Tyuratam (Baikonur), Site 31',
  site: SITE31,
  crew: ['Georgiy T. Beregovoy'],
  summary:
    'The first crewed Soyuz after the loss of Soyuz 1. Georgiy Beregovoy approached the uncrewed Soyuz 2 but did not dock. He returned safely after nearly four days in orbit.',
  facts: [
    { label: 'Spacecraft', value: '7K-OK(A) No. 10 · active docking probe' },
    { label: 'Call sign', value: 'Argon (Аргон)' },
    { label: 'Rendezvous target', value: 'Soyuz 2 · uncrewed 7K-OK(P) No. 11' },
    { label: 'Landing', value: '70 km north of Karaganda' },
  ],
  timeline: [
    { t: 0, event: 'Liftoff from Site 31 at Tyuratam.' },
    { t: elapsed('1968-10-26T09:15:00Z'), event: 'During rendezvous, Mishin’s diary logs the two spacecraft about 80 m apart.' },
    { t: elapsed('1968-10-30T06:45:05Z'), event: 'The braking engine starts the return burn, as recorded in Mishin’s diary.' },
    { t: duration, event: 'Guided descent and landing north of Karaganda.' },
  ],
  specs: [
    ...soyuzGallerySpecs.map((spec) =>
      spec.label === 'Height on the pad'
        ? {
            ...spec,
            confidence: 'assumed' as const,
            note: 'The 49,913 mm main-nozzle-to-tip dimension in the RKK Energia 11A511 cutaway is taken for this vehicle.',
          }
        : spec,
    ),
    {
      group: CRAFT,
      label: 'Mass in orbit',
      value: 6575,
      unit: 'kg',
      confidence: 'documented',
      note: `${SIDDIQI}, appendix, Table I, Soyuz 3 row.`,
    },
    {
      group: 'Flight',
      label: 'Orbits',
      value: 64,
      unit: 'orbits',
      confidence: 'documented',
      note: `${SIDDIQI}, appendix, Table I, Soyuz 3 row.`,
    },
    { group: 'Flight', label: 'Apogee', value: 225000, unit: 'm', confidence: 'documented', note: TASS },
    { group: 'Flight', label: 'Perigee', value: 205000, unit: 'm', confidence: 'documented', note: TASS },
    { group: 'Flight', label: 'Period', value: 88.6, unit: 'min', confidence: 'documented', note: TASS },
    {
      group: 'Flight',
      label: 'Inclination',
      value: 51.67,
      unit: 'deg',
      confidence: 'derived',
      note: `${TASS}: 51°40′, converted to decimal degrees and rounded to 0.01°.`,
    },
    {
      group: 'Flight',
      label: 'Duration',
      value: duration,
      unit: 's',
      confidence: 'derived',
      note: `${RECORD}: 08:34:18 UTC on 26 October to 07:25:03 UTC on 30 October.`,
    },
  ],
  motors: [],
  models: [onSoyuzPad(vehicle, TURN, TAIL), site31Pad, crew],
};
