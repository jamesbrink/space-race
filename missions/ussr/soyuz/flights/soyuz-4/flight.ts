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
import { WEATHER } from './weather.ts';

const SIDDIQI = 'Asif A. Siddiqi, Challenge to Apollo, NASA SP-2000-4408';
const RECORD = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357, §1.3.3';
const FLIGHT_LOG = 'Igor Afanasyev and Dmitry Vorontsov, Pervye Soyuzy, “Soyuz 4/5: First docking of crewed ships”';
const INITIAL_ORBIT = `${SIDDIQI}, appendix Table I, Soyuz 4 row.`;

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The forward room became the receiving airlock for two spacewalkers.',
    detail:
      'Khrunov and Yeliseyev entered through the orbital module’s side hatch. Shatalov separated it from the descent cabin with the transfer hatch while it was depressurized, then welcomed the visitors after repressurization.',
    facts: [['Module', 'БО · бытовой отсек']],
  },
  {
    node: 'EvaHandrails',
    name: 'Spacewalk handrails',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'Exterior handholds led the visitors to Soyuz 4’s side hatch.',
    detail:
      'Yevgeniy Khrunov and Aleksey Yeliseyev crossed outside the docked ships. The exhibit reconstructs the rail layout and joints where the period record leaves those dimensions open.',
    facts: [['Transfer path', 'Exterior of the docked spacecraft']],
  },
  {
    node: 'RendezvousLights',
    name: 'Rendezvous signal lamps',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'Four lights helped the pilot judge which way the other Soyuz was turned.',
    detail:
      'Kamanin described two steady lights above two flashing lights on the earlier 7K-OK spacecraft used for Soyuz 2 and 3. The model takes that arrangement for No. 12, with estimated mounting points.',
    facts: [['Arrangement', 'Two steady and two flashing · assumed from Soyuz 2 and 3']],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'Shatalov guided the probe into the socket on the crewed Soyuz 5.',
    detail:
      'The active probe on No. 12 engaged the passive cone on Soyuz 5. The docking joint had no internal passage, so visitors entered by spacewalk. The probe and ring are reconstructed.',
    facts: [
      ['Docking role', 'Active · documented'],
      ['Target', 'Soyuz 5 · crewed'],
    ],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'The cabin that brought three cosmonauts home.',
    detail:
      'The descent vehicle returned Shatalov and the two cosmonauts who had transferred from Soyuz 5. The cutaway shows its launch seating with two empty return couches.',
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
    summary: 'The Sirius-7K controls and Shatalov’s position for the rendezvous.',
    detail:
      'Shatalov took over the final approach to Soyuz 5 from this cabin. The Sirius-7K board carries the navigation globe and cathode-ray screen, with a command-and-signal panel on either side. Yuri Tyapchenko’s illustrations show the early system. Individual fittings and static instrument faces are reconstructed, including the hand controls.',
    facts: [['Flight displays', 'Sirius-7K · reconstructed']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'One couch was occupied at launch and three at landing.',
    detail:
      'Shatalov launched alone with two vacant return places. Khrunov and Yeliseyev occupied those places after crossing from Soyuz 5. The exhibit retains the launch configuration.',
    facts: [
      ['Launch', 'Vladimir Shatalov'],
      ['Landing', 'Shatalov, Aleksey Yeliseyev and Yevgeniy Khrunov'],
    ],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The module supplied power and carried the engines for orbit changes and return.',
    detail:
      'The aft module held the main propulsion and attitude-control equipment and carried the solar arrays. Soyuz 4 manoeuvred in orbit and used its main engine to brake for entry. The gallery depicts the early Soyuz module’s exterior.',
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
      'The 7K-OK used an infrared sensor to establish the local vertical. This instrument was introduced from spacecraft No. 7, so it belongs on the later 7K-OK type. The housing follows the published type drawing, with an estimated mounting position.',
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
        'Both wings open with the modules still joined at the gallery slider’s midpoint. Leaf shapes, hinges and antenna travel are reconstructed.',
      facts: [['Deployment', 'Illustrative for the type']],
    }),
  ),
  {
    node: 'Igla',
    name: 'Igla rendezvous antennas',
    group: CRAFT,
    order: 2,
    explode: orbital,
    moves: iglaMoves,
    summary: 'Igla guided the automatic approach to Soyuz 5.',
    detail:
      'The automatic rendezvous system used radio measurements to guide Soyuz 4 toward Soyuz 5. Shatalov took control at about 100 metres for the final approach. The folding boom follows a 7K-OK type drawing, with estimated hinge travel.',
    facts: [
      ['System', 'Игла (Igla), “needle”'],
      ['Manual handover', 'About 100 m'],
    ],
  },
];

const launch = '1969-01-14T07:30:00Z';
const landing = '1969-01-17T06:50:47Z';
const elapsed = (utc: string) => (Date.parse(utc) - Date.parse(launch)) / 1000;

const vehicle = soyuzGallery('soyuz-4', 'Soyuz 4', 'Shatalov', spacecraft, ['LowerCap']);
vehicle.scale = '49.913 m nominal stack · 11A511 type drawing · hardware detail reconstructed';
vehicle.views.push({
  id: 'transfer',
  label: 'Spacewalk transfer route',
  nodes: ['OrbitalModule', 'EvaHandrails', 'DockingProbe'],
  from: [-0.18, 0.12, 1],
  isolate: true,
});

const crew = soyuzWalker('crew', 'Vladimir A. Shatalov', 'models/ussr/soyuz/soyuz-4/crew.glb', 'flight', [-48, 0, 3.5], 1.7);
vehicle.seats![0]!.figure = crew.id;

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-4',
  nation: 'USSR',
  agency: 'TsKBEM',
  program: 'Soyuz',
  designation: 'Soyuz 4',
  callsign: 'Amur',
  spacecraft: 'Soyuz 7K-OK(A) No. 12',
  launchVehicle: 'Soyuz 11A511 · Ya15000-012',
  launch,
  opens: { at: -7200, model: 'pad', view: 'platform' },
  launchSite: 'Tyuratam (Baikonur), Site 31',
  site: SITE31,
  weather: WEATHER,
  crew: ['Vladimir A. Shatalov'],
  summary: 'Shatalov launched alone and docked with Soyuz 5. Khrunov and Yeliseyev crossed by spacewalk and returned to Earth with him.',
  facts: [
    { label: 'Call sign', value: 'Amur (Амур)' },
    { label: 'Launch crew', value: 'Vladimir Shatalov' },
    { label: 'Landing crew', value: 'Shatalov, Aleksey Yeliseyev and Yevgeniy Khrunov' },
  ],
  timeline: [
    { t: 0, event: 'Shatalov lifts off from Site 31.' },
    { t: elapsed('1969-01-16T08:20:00Z'), event: 'Shatalov docks Soyuz 4 with the crewed Soyuz 5.' },
    { t: elapsed('1969-01-16T12:55:00Z'), event: 'The vehicles separate after Khrunov and Yeliseyev cross by spacewalk.' },
    { t: elapsed('1969-01-17T06:11:00Z'), event: 'Shatalov starts the braking burn for the return to Earth.' },
    { t: elapsed(landing), event: 'Soyuz 4 lands about 40 km northwest of Karaganda with three aboard.' },
  ],
  specs: [
    ...soyuzGallerySpecs.map((spec) => ({
      ...spec,
      confidence: spec.confidence === 'documented' ? ('assumed' as const) : spec.confidence,
    })),
    {
      group: CRAFT,
      label: 'Mass in orbit',
      value: 6625,
      unit: 'kg',
      confidence: 'documented',
      note: INITIAL_ORBIT,
    },
    { group: 'Flight', label: 'Perigee', value: 173700, unit: 'm', confidence: 'documented', note: INITIAL_ORBIT },
    { group: 'Flight', label: 'Apogee', value: 235300, unit: 'm', confidence: 'documented', note: INITIAL_ORBIT },
    { group: 'Flight', label: 'Inclination', value: 51.72, unit: 'deg', confidence: 'documented', note: INITIAL_ORBIT },
    { group: 'Flight', label: 'Orbits', value: 48, unit: 'orbits', confidence: 'documented', note: INITIAL_ORBIT },
    {
      group: 'Flight',
      label: 'Duration',
      value: elapsed(landing),
      unit: 's',
      confidence: 'derived',
      note: `${FLIGHT_LOG}, 10:30:00 MSK on 14 January to 09:50:47 MSK on 17 January.`,
    },
    { group: 'Flight', label: 'Crew at landing', value: 3, unit: 'people', confidence: 'documented', note: RECORD },
  ],
  motors: [],
  models: [onSoyuzPad(vehicle, TURN, TAIL), site31Pad, crew],
};
