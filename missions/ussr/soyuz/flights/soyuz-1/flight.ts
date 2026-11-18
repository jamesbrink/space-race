import type { Flight, Part } from '../../../../../src/types.ts';
import { CRAFT, descent, iglaMoves, orbital, service, soyuzGallery, soyuzGallerySpecs, wingMoves } from '../../vehicles/gallery.ts';

const TASS = 'TASS communiqué of 23 April 1967, NASA translation ST-PR-10595, p. 1 (preliminary orbit)';
const SIDDIQI = 'Asif A. Siddiqi, Challenge to Apollo, NASA SP-2000-4408';

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The extra room ahead of the entry cabin, with a side hatch for spacewalks.',
    detail:
      'Komarov would have received two spacewalking cosmonauts here after docking with the planned Soyuz 2. A bench and sideboard furnish the extra room, following early Soyuz designs in the Moscow Museum of Cosmonautics’ Balashova collection. The orbital module was discarded before entry. The outline follows the 7K-OK type, with estimated individual fittings and blanket seams.',
    facts: [
      ['Module', 'БО · бытовой отсек'],
      ['Crew transfer', 'By spacewalk'],
    ],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The probe would have caught the socket on Soyuz 2.',
    detail:
      'The forward probe and its surrounding ring were the active half of the first Soyuz docking system. Soyuz 1 was to close in and capture the passive port on Soyuz 2. The coupled ships would have had no passage through the docking mechanism. Here the exterior of the probe and ring are reconstructed and static.',
    facts: [
      ['Docking role', 'Active · documented'],
      ['Planned partner', 'Soyuz 2 · launch cancelled'],
    ],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'The rounded cabin that took Komarov to orbit and back through the atmosphere.',
    detail:
      'The descent module was the only part of Soyuz meant to reach the ground. It came in with its broad heat shield forward. On Soyuz 1 the main parachute stayed in its container and the reserve failed to fill. The cutaway exposes a reconstruction of the pressure cabin and couch bay.',
    facts: [
      ['Module', 'СА · спускаемый аппарат'],
      ['Return', 'Heat shield, parachutes and soft-landing engines'],
    ],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'The cabin around Komarov’s couch and flight controls.',
    detail:
      'Komarov launched and came down in this cabin. When the automatic orientation system inhibited the first attempted braking burn, he aligned the ship by hand for the next attempt. The Sirius-7K layout follows engineer Yuri Tyapchenko’s account of the original type. The centre board has a navigation globe and a cathode-ray screen, flanked by two command-and-signal panels with numbered keys. The exhibit’s controls and displays are static.',
    facts: [['Exhibit', 'Reconstructed cabin and static controls']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Komarov flew alone, with two cosmonauts expected to join him for the return.',
    detail:
      'The spacecraft was meant to return with three cosmonauts after two transferred from Soyuz 2. Komarov flew the mission alone. The couch shapes and their mounting are reconstructed from early Soyuz references.',
    facts: [
      ['Crew aboard', 'Vladimir M. Komarov'],
      ['Planned return crew', 'Three'],
    ],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'Power, attitude control and the engine that brought Soyuz out of orbit.',
    detail:
      'The aft module housed the equipment that ran the ship and supported its two solar wings. Its engine performed the braking burn after Komarov had oriented the ship manually. The module separated before atmospheric entry. Its exterior and visible fittings are reconstructed.',
    facts: [
      ['Module', 'ПАО · приборно-агрегатный отсек'],
      ['Maximum diameter', '2.72 m · assumed from the published type figure'],
    ],
  },
  {
    node: 'SolarLeft',
    name: 'Left solar array',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The left wing stayed folded throughout the flight.',
    detail:
      'Soyuz 1 reported that its left solar wing had failed to deploy after launch. Losing the wing reduced power and complicated attitude control. In this exhibit the left wing stays stowed as it did on the flight.',
    facts: [['Flight state', 'Stowed · documented']],
  },
  {
    node: 'SolarRight',
    name: 'Right solar array',
    group: CRAFT,
    order: 4,
    explode: service,
    moves: wingMoves('Right'),
    summary: 'The one wing that opened and supplied power in sunlight.',
    detail:
      'Komarov reported the right wing opening after separation. At the slider’s midpoint the right wing is open and the three spacecraft modules are still joined. The movement shows the result of deployment, with estimated hinge positions and travel.',
    facts: [['Flight state', 'Deployed · documented']],
  },
  {
    node: 'Igla',
    moves: iglaMoves,
    name: 'Igla rendezvous antennas',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'Radar equipment for finding and closing on the second Soyuz.',
    detail:
      'The Igla system used radio measurements to find the target and guide the two ships together. Soyuz 2 never launched, so Soyuz 1 had no target to acquire. The folding truss follows the training center’s 7K-OK section. Its opening angle and motion are illustrative.',
    facts: [
      ['System', 'Игла (Igla), “needle”'],
      ['Purpose', 'Rendezvous'],
    ],
  },
];

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-1',
  nation: 'USSR',
  agency: 'TsKBEM (formerly OKB-1)',
  program: 'Soyuz',
  designation: 'Soyuz 1',
  callsign: 'Rubin',
  spacecraft: 'Soyuz 7K-OK No. 4',
  launchVehicle: 'Soyuz 11A511',
  launch: '1967-04-23T00:35:00Z',
  launchSite: 'Tyuratam (Baikonur), Site 1',
  crew: ['Vladimir M. Komarov'],
  summary:
    'Vladimir Komarov flew the first crewed Soyuz and was to dock with a second ship. A solar wing stayed folded, the second launch was cancelled, and Komarov died when the parachutes failed during his early return.',
  facts: [
    { label: 'Spacecraft', value: '7K-OK No. 4 · active docking probe' },
    { label: 'Call sign', value: 'Rubin (Рубин), “ruby”' },
    { label: 'Model status', value: 'Gallery · reconstructed 7K-OK and 11A511' },
  ],
  timeline: [
    { t: 0, event: 'Liftoff from Site 1 at Tyuratam.' },
    { t: 540, event: 'Ground control confirms spacecraft separation and orbit. The left solar wing remains stowed.' },
    { t: 84072, event: 'The first attempted braking burn is inhibited when the automatic orientation sequence fails.' },
    { t: 95078.5, event: 'Komarov reports that the braking engine shut down after a successful burn.' },
    { t: 96540, event: 'Approximate impact time near Orsk. The main and reserve parachutes fail to arrest the descent.' },
  ],
  specs: [
    ...soyuzGallerySpecs,
    {
      group: CRAFT,
      label: 'Mass in orbit',
      value: 6450,
      unit: 'kg',
      confidence: 'documented',
      note: `${SIDDIQI}, appendix, Table I, Soyuz 1 row.`,
    },
    {
      group: 'Flight',
      label: 'Orbits',
      value: 18,
      unit: 'orbits',
      confidence: 'documented',
      note: `${SIDDIQI}, appendix, Table I, Soyuz 1 row.`,
    },
    { group: 'Flight', label: 'Apogee', value: 224000, unit: 'm', confidence: 'documented', note: TASS },
    { group: 'Flight', label: 'Perigee', value: 201000, unit: 'm', confidence: 'documented', note: TASS },
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
      label: 'Duration to reported impact',
      value: 96540,
      unit: 's',
      confidence: 'derived',
      note: `${SIDDIQI}, pp. 581 and 585: 03:35 MSK to the approximate ballistics estimate of 06:24 MSK the next day.`,
    },
  ],
  motors: [],
  models: [soyuzGallery('soyuz-1', 'Soyuz 1', 'Komarov', spacecraft)],
};
