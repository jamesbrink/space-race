import type { Flight, Move, Part } from '../../../../../src/types.ts';
import { TAIL, TURN } from '../../../places/tyuratam/site-1.parts.ts';
import { SITE1 } from '../../../places/tyuratam/site-1.ts';
import { soyuzPad } from '../../../places/tyuratam/soyuz-pad.ts';
import { soyuzWalker } from '../../crew/walkout.ts';
import { CRAFT, descent, moduleTravel, onSoyuzPad, orbital, service, soyuzGallery, soyuzGallerySpecs } from '../../vehicles/gallery.ts';
import { AREAS } from '../../vehicles/soyuz-7kok-flown.ts';
import { commanded, soyuzChuteLooks, soyuzCommands, soyuzFlies } from '../../vehicles/soyuz-flies.ts';
import { soyuzPlan } from '../../vehicles/soyuz-plan.ts';
import { orbital as ORBITAL } from './orbital.ts';
import { WEATHER } from './weather.ts';

const HERITAGE = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357, §1.12';
const CATALOG = 'Czech Academy of Sciences Space Catalogue, 1980-045A.';
const LOG = 'Yuri Baturin (ed.), Mirovaya pilotiruyemaya kosmonavtika, pp. 288–289.';
const LAUNCHER = 'RKK Energia 1946–1996, ch. 6, type figures for Soyuz-U with Soyuz-T.';
const STATION = 'TASS mission reporting reproduced in NASA’s Astronautics and Aeronautics, 1979–1984, June 1980.';

function solarMoves(side: 'Left' | 'Right'): Move[] {
  const sign = side === 'Left' ? 1 : -1;
  return [
    moduleTravel(service, 4),
    ...[Math.PI / 2, -Math.PI, Math.PI, -Math.PI].map(
      (angle, index): Move => ({
        kind: 'swing',
        node: `Solar${side}Leaf${index + 1}`,
        axis: [0, 1, 0],
        angle: sign * angle,
        from: 0.28,
        to: 0.47,
      }),
    ),
  ];
}

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The forward room gave the crew room to work and rest during rendezvous.',
    detail:
      'Once Soyuz and Salyut were joined, Malyshev and Aksyonov went through the hatch at the nose. The descent capsule was connected to the room by its own hatch below.',
    facts: [['Module', 'БО · бытовой отсек']],
  },
  {
    node: 'DockingCollar',
    name: 'Docking collar and transfer hatch',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The collar closed against the station port to seal the passage between cabins.',
    detail:
      'After the probe made initial capture, it drew the two mating faces together. The crew could then open the forward hatch after checking the seal.',
    facts: [['Target on this flight', 'Salyut 6 aft port']],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The long probe entered a matching cone on Salyut 6.',
    detail:
      'The cone guided the tip into the capture fitting even with small alignment errors. On 6 June Malyshev flew the final approach by hand after the automatic sequence was interrupted.',
    facts: [['Mechanism', 'Probe and drogue with internal crew transfer']],
  },
  {
    node: 'Igla',
    name: 'Igla rendezvous antennas',
    group: CRAFT,
    order: 2,
    explode: orbital,
    moves: [moduleTravel(orbital, 2), { kind: 'swing', node: 'IglaBoom', axis: [1, 0, 0], angle: 1.27, from: 0.28, to: 0.47 }],
    summary: 'Igla gave Soyuz its radar measurements of the station during approach.',
    detail:
      'Igla lost radar lock during the close approach. Malyshev withdrew, found the station again and completed the docking by hand. The exhibit illustrates the deployment of the forward antenna.',
    facts: [['System', 'Игла · “Needle”']],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'The central capsule returned both cosmonauts to the Kazakh steppe.',
    detail:
      'The capsule used an ablative heat shield through entry. A parachute slowed it first and solid motors softened the final touchdown.',
    facts: [['Module', 'СА · спускаемый аппарат']],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Soyuz-T made room to carry three cosmonauts in pressure suits.',
    detail:
      'Two cosmonauts flew this test. The model reconstructs the cabin around Malyshev’s and Aksyonov’s couches and depicts the third position empty.',
    facts: [['Soyuz-T capacity', 'Up to three suited cosmonauts']],
  },
  {
    node: 'NeptunConsole',
    name: 'Neptun crew console',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'The new display showed the crew what the Argon-16 was doing.',
    detail:
      'On this flight Argon-16 asked the crew to authorize key approach maneuvers. Instructor Vasilyev describes a delay confirming braking near 200 m, followed by a turn, loss of Igla lock and a switch to manual control. The matrix command panels and electronic display are reconstructed with illustrative readings.',
    facts: [
      ['Display system', 'Нептун · Neptun'],
      ['Flight computer location', 'Aft instrument compartment'],
    ],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Malyshev and Aksyonov flew in Sokol KV-2 pressure suits.',
    detail:
      'The new suit provided pressure protection for launch, docking and landing. Take either cosmonaut’s couch to see the controls from his position in the reconstructed cabin.',
    facts: [
      ['Commander', 'Yuri Malyshev'],
      ['Flight engineer', 'Vladimir Aksyonov'],
    ],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The aft module housed the Argon-16 and the spacecraft’s propulsion hardware.',
    detail:
      'Argon-16 processed sensor data in three parallel channels. The sealed instrument compartment sat between the descent capsule and the main engine and separated before entry.',
    facts: [['Module', 'ПАО · приборно-агрегатный отсек']],
  },
  {
    node: 'CombinedPropulsion',
    name: 'Combined propulsion system',
    group: CRAFT,
    order: 4,
    explode: service,
    inside: true,
    summary: 'The main engine and the smaller maneuvering thrusters used the same propellant supplies.',
    detail:
      'The main bell at the centre provided larger velocity changes, including the braking burn. Smaller thrusters handled translation and attitude during approach and docking. The model reconstructs the visible aft fittings.',
    facts: [['Propellants', 'Nitrogen tetroxide and UDMH']],
  },
  ...(['Left', 'Right'] as const).map(
    (side): Part => ({
      node: `Solar${side}`,
      name: `${side} solar array`,
      group: CRAFT,
      order: 4,
      explode: service,
      moves: solarMoves(side),
      summary: 'Solar arrays supplied power during independent flight.',
      detail:
        'The wings folded against the spacecraft under the fairing. On the first day in orbit the crew pointed the spacecraft at the Sun to check the new arrays.',
      facts: [['Deployed span', '10.6 m across both wings']],
    }),
  ),
];

const launch = '1980-06-05T14:19:30Z';
const landing = '1980-06-09T12:39:00Z';
const elapsed = (utc: string) => (Date.parse(utc) - Date.parse(launch)) / 1000;
const suitParts = ['SokolHood', 'SokolRim', 'SokolVisor', 'SokolFittings'];
const vehicle = soyuzGallery('soyuz-t-2', 'Soyuz T-2', 'Malyshev', spacecraft, suitParts);
vehicle.name = 'Soyuz T-2 · Soyuz-U';
vehicle.scale = '51.1 m nominal stack · Soyuz-T type dimensions · hardware detail reconstructed';
vehicle.cabin!.within.push('NeptunConsole');
vehicle.lights![0]!.position = [0.596, 3.166, 0.502];

const commander = vehicle.seats![0]!;
commander.from = 'SoyuzT_BO_HatchFace';
commander.hide = commander.hide?.filter((node) => node !== 'Malyshev_Helmet_Cap');
vehicle.seats!.push({
  ...commander,
  node: 'Seat_Port',
  label: 'Aksyonov’s couch',
  hide: commander.hide?.map((node) => node.replace('Malyshev', 'Aksyonov')),
});

vehicle.views.find((view) => view.id === 'launcher')!.label = 'Soyuz-U';
const orbitalView = vehicle.views.find((view) => view.id === 'spacecraft')!;
orbitalView.label = 'Soyuz-T spacecraft';
orbitalView.from = [0.743, 0.22, 0.669];
const dock = vehicle.views.find((view) => view.id === 'dock')!;
dock.label = 'Docking probe and collar';
dock.nodes = ['DockingCollar', 'DockingProbe'];
dock.from = [-0.7, 0.65, 1];
vehicle.views.find((view) => view.id === 'cabin')!.nodes = ['Cabin', 'Couches', 'NeptunConsole'];
vehicle.views.find((view) => view.id === 'service')!.nodes = ['ServiceModule', 'CombinedPropulsion', 'SolarLeft', 'SolarRight'];
vehicle.views.push(
  {
    id: 'console',
    label: 'Neptun crew console',
    nodes: ['NeptunConsole'],
    from: [0.12, -0.9, 0.46],
    isolate: true,
  },
  {
    id: 'propulsion',
    label: 'Combined propulsion system',
    nodes: ['CombinedPropulsion'],
    from: [-0.25, -1, 0.52],
    isolate: true,
  },
);

const fairing = vehicle.parts.find((part) => part.node === 'Fairing')!;
fairing.detail =
  'The Soyuz-T shroud enclosed all three spacecraft modules, with the solar arrays stowed against the service module. The exhibit slides the reconstructed halves outward for inspection.';
const tower = vehicle.parts.find((part) => part.node === 'EscapeTower')!;
tower.detail =
  'The Soyuz-T escape system could pull the orbital and descent modules away together. Small motors on the fairing kept an escape option after the tower was jettisoned. The tower and fairing are reconstructed from the Soyuz-T launcher type.';
const core = vehicle.parts.find((part) => part.node === 'CoreStage')!;
core.detail =
  'Block A lit with the four boosters and continued burning after they separated. The Soyuz-U model uses shared R-7 geometry for hardware whose flight-specific drawings are unavailable.';
const upper = vehicle.parts.find((part) => part.node === 'BlockI')!;
upper.detail =
  'Block I carried the four-chamber RD-0110 and continued the climb after the core separated. The model reconstructs the stage outline and internal stations from shared Soyuz hardware.';

vehicle.seats![0]!.figure = 'crew';
vehicle.seats![1]!.figure = 'engineer';

// what a hand can ask of each part in flight, said with what did each thing on the day (vehicles/soyuz-flies.ts)
vehicle.parts = commanded(
  vehicle.parts,
  soyuzCommands({
    parted: 'the Argon-16’s sequence did, minutes after the burn',
    crew: 'Malyshev and Aksyonov',
    cover: `its barometric switch, ${(ORBITAL.ejection.altitude.value / 1000).toFixed(0)} km`,
  }),
);
/** The descent module's parachutes as drawn, at their areas as the record has them. */
const CHUTES = soyuzChuteLooks([
  { name: 'drogue parachute', area: AREAS.drogue },
  { name: 'main parachute', area: AREAS.main },
]);

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-t-2',
  nation: 'USSR',
  agency: 'NPO Energia',
  program: 'Soyuz',
  designation: 'Soyuz T-2',
  callsign: 'Yupiter',
  spacecraft: 'Soyuz 7K-ST No. 7L · 11F732',
  launchVehicle: 'Soyuz-U 11A511U · Zh15000-196',
  launch,
  site: SITE1,
  weather: WEATHER,
  opens: { at: -7200, model: 'pad', view: 'towers' },
  launchSite: 'Tyuratam (Baikonur), Site 1',
  crew: ['Yuri V. Malyshev', 'Vladimir V. Aksyonov'],
  summary:
    'Malyshev and Aksyonov tested the first crewed Soyuz-T. They checked its solar power in orbit and completed the docking with Salyut 6 by hand after the automatic approach was interrupted.',
  facts: [
    { label: 'Call sign', value: 'Yupiter (Юпитер)' },
    { label: 'Commander', value: 'Yuri Malyshev' },
    { label: 'Flight engineer', value: 'Vladimir Aksyonov' },
    { label: 'Destination', value: 'Salyut 6' },
  ],
  timeline: [
    { t: 0, event: 'The first crewed Soyuz-T lifts off from Site 1 aboard a Soyuz-U.' },
    {
      t: elapsed('1980-06-06T15:58:00Z'),
      event: 'After taking manual control on final approach, Malyshev docks at Salyut 6’s aft port.',
    },
    { t: elapsed(landing), event: 'Malyshev and Aksyonov land in Kazakhstan in their own descent capsule.' },
  ],
  specs: [
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 51.1,
      unit: 'm',
      confidence: 'assumed',
      note: LAUNCHER,
    },
    { group: 'Launch vehicle', label: 'Maximum transverse dimension', value: 10.3, unit: 'm', confidence: 'assumed', note: LAUNCHER },
    ...soyuzGallerySpecs.filter((spec) => spec.label === 'Orbital module side hatch'),
    {
      group: CRAFT,
      label: 'Length overall',
      value: 6.98,
      unit: 'm',
      confidence: 'documented',
      note: `${CATALOG} The model measures from the aft plane to the probe tip.`,
    },
    { group: CRAFT, label: 'Launch mass', value: 6850, unit: 'kg', confidence: 'documented', note: CATALOG },
    { group: CRAFT, label: 'Maximum diameter', value: 2.72, unit: 'm', confidence: 'documented', note: CATALOG },
    { group: CRAFT, label: 'Descent module length', value: 2.14, unit: 'm', confidence: 'documented', note: CATALOG },
    { group: CRAFT, label: 'Descent module diameter', value: 2.2, unit: 'm', confidence: 'documented', note: CATALOG },
    {
      group: CRAFT,
      label: 'Deployed solar array span',
      value: 10.6,
      unit: 'm',
      confidence: 'documented',
      note: `${CATALOG} ${HERITAGE}.1.`,
    },
    { group: 'Flight', label: 'Reported manual-control range', value: 180, unit: 'm', confidence: 'documented', note: STATION },
    {
      group: 'Flight',
      label: 'Duration',
      value: elapsed(landing),
      unit: 's',
      confidence: 'derived',
      note: `${LOG} 14:19:30 UTC on 5 June to 12:39:00 UTC on 9 June.`,
    },
  ],
  motors: [],
  // the flight as flown from its record: the 11A511U's ascent on its steering law, the first day's raise, the orbital module
  // let go, the braking burn, the guided entry and the descent (orbital.ts; mission.md), through the day's air over the pad.
  // The rendezvous and docking with Salyut 6 are not flown
  plan: { ...soyuzPlan(ORBITAL), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is flown on the Soyuz-U to the orbit given for Soyuz T-2, and the fourth revolution’s two-impulse raise to the orbit it closed on Salyut 6 from. The station is not flown: the approach, the docking by hand and the three days docked are on the record only. The orbital module is let go before the braking burn, and Malyshev and Aksyonov come down in the descent module on its own lift (mission.md).',
  flies: soyuzFlies(ORBITAL, CHUTES, {
    orbital: ['OrbitalModule', 'DockingCollar', 'DockingProbe', 'Igla'],
    instrument: ['ServiceModule', 'CombinedPropulsion', 'SolarLeft', 'SolarRight'],
    // the 11D426's bell, 480 mm across its exit (soyuz_7kst.py)
    engine: { node: 'KTDU426_NozzleLiner', radius: 0.24 },
  }),
  models: [
    onSoyuzPad(vehicle, TURN, TAIL),
    soyuzPad,
    soyuzWalker('crew', 'Yuri Malyshev', 'models/ussr/soyuz/soyuz-t-2/crew.glb', 'sokol-kv2', [-23, 0, 8]),
    soyuzWalker('engineer', 'Vladimir Aksyonov', 'models/ussr/soyuz/soyuz-t-2/engineer.glb', 'sokol-kv2', [-26, 0, 5]),
  ],
};
