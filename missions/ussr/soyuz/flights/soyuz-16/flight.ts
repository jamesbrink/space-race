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

const HARDWARE = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357, §1.9';
const CATALOG = 'Czech Academy of Sciences Space Catalogue, 1974-096A.';
const ORBIT = 'TASS mission reports reproduced in NASA’s Astronautics and Aeronautics, 1974, pp. 207–208.';
const LOG = 'Afanasyev and Vorontsov, The First Soyuz Spacecraft, flight chronology, Soyuz 16 row.';

function solarMoves(side: 'Left' | 'Right'): Move[] {
  const sign = side === 'Left' ? 1 : -1;
  return [
    moduleTravel(service, 4),
    ...[Math.PI / 2, -Math.PI, Math.PI].map(
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
    summary: 'The forward room carried the hatch through which visiting astronauts would enter.',
    detail:
      'For this rehearsal the two cosmonauts used the room as their own living and working space. The forward hatch and the peripheral docking system above it were the path between cabins planned for the joint flight.',
    facts: [['Module', 'БО · бытовой отсек']],
  },
  {
    node: 'ApasCollar',
    name: 'APAS-75 collar and transfer hatch',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'A broad annular collar left the crew passage clear.',
    detail:
      'American and Soviet engineers designed matching interfaces that could each take the active or passive role. After initial capture, the mechanism pulled the mating faces together to seal the passage. The cabin hatch stayed closed on this solo rehearsal.',
    facts: [['System', 'Androgynous Peripheral Assembly System']],
  },
  {
    node: 'ApasCaptureRing',
    name: 'APAS-75 capture ring',
    group: CRAFT,
    order: 2,
    explode: orbital,
    moves: [moduleTravel(orbital, 2), { kind: 'slide', by: [0, 0.27, 0], from: 0.51, to: 0.55 }],
    summary: 'Three outward-facing guides aligned the mating hardware.',
    detail:
      'The active side extended its ring for initial capture. The guides steered it against the opposite ring, and attenuators absorbed motion before the collars closed. The model reconstructs the guides and mechanism from the ASTP type.',
    facts: [['Geometry', 'Reconstructed from ASTP technical drawings']],
  },
  {
    node: 'TestDockingRing',
    name: 'Apollo simulator ring',
    group: CRAFT,
    order: 2,
    explode: orbital,
    moves: [moduleTravel(orbital, 2), { kind: 'slide', by: [0, 1.5, 0], from: 0.48, to: 0.55 }],
    summary: 'The extra ring represented the American side of the docking interface.',
    detail:
      'It rode on Soyuz 16’s nose so the crew could test capture and release in orbit. The crew released it during the emergency undocking test on 7 December. The slider shows the ring moving clear before the exhibit separates the spacecraft modules.',
    facts: [
      ['Configuration', 'Mounted simulator ring · documented'],
      ['Exhibit motion', 'Illustrative separation'],
    ],
  },
  {
    node: 'RendezvousTarget',
    name: 'Optical rendezvous target',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'A visual reference for the approaching spacecraft.',
    detail:
      'The ASTP Soyuz carried visual aids compatible with the Apollo approach and docking procedure. The exhibit reconstructs the target and its mount from the joint-mission configuration.',
    facts: [['Configuration', 'Assumed from ASTP Soyuz type']],
  },
  {
    node: 'VhfAntennas',
    name: 'Air-to-air antennas and beacons',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The joint flight required the two spacecraft to talk directly.',
    detail:
      'The radio gave the crews a shared communications link, and beacons helped mark Soyuz for Apollo’s approach. The exhibit reconstructs both fittings and their placement.',
    facts: [['Equipment layout', 'Reconstructed']],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'Only the central capsule brought the cosmonauts home.',
    detail:
      'After the braking burn and module separation the capsule protected the crew through atmospheric entry. A parachute and soft-landing rockets brought it down on the Kazakh steppe.',
    facts: [['Module', 'СА · спускаемый аппарат']],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Two suited cosmonauts shared the flight controls in the central capsule.',
    detail:
      'The ASTP spacecraft had revised control systems. The exhibit uses the earlier Soyuz Sirius layout for the globe, television display and command panels, with reconstructed legends and idle readings.',
    facts: [['Display layout', 'Sirius-family reconstruction']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Filipchenko and Rukavishnikov flew in Sokol-K pressure suits.',
    detail:
      'The two couches restrained the crew for launch and landing. The gallery opens the capsule to show the suit hoses, controls and what each cosmonaut could see from his couch.',
    facts: [
      ['Commander', 'Anatoly Filipchenko'],
      ['Flight engineer', 'Nikolai Rukavishnikov'],
    ],
  },
  {
    node: 'LifeSupport',
    name: 'Atmosphere and suit equipment',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Soyuz 16 rehearsed a lower cabin pressure with a higher proportion of oxygen.',
    detail:
      'The change reduced the pressure difference crews would have to cross when visiting from Apollo. The redesigned system could support four occupants during a visit. Its visible packing, hoses and fittings are reconstructed.',
    facts: [['Rehearsal setting', 'About 10.4 psi · 40% oxygen']],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The aft module carried the propulsion, power and control equipment.',
    detail:
      'The main engine changed the orbit and later supplied the braking burn. Solar power supported nearly six days of independent flight while the crew rehearsed the joint mission.',
    facts: [['Module', 'ПАО · приборно-агрегатный отсек']],
  },
  ...(['Left', 'Right'] as const).map(
    (side): Part => ({
      node: `Solar${side}`,
      name: `${side} solar array`,
      group: CRAFT,
      order: 4,
      explode: service,
      moves: solarMoves(side),
      summary: 'The Apollo–Soyuz variant brought back solar power for independent flight.',
      detail:
        'Both wings folded against the spacecraft under the fairing. The gallery unfolds their reconstructed panels after the shroud opens.',
      facts: [['Deployed span', '8.37 m across both wings']],
    }),
  ),
  {
    node: 'InfraredVertical',
    name: 'Infrared vertical sensor',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The Earth’s horizon gave Soyuz a reference for its orientation.',
    detail:
      'The Soyuz orientation system used an infrared horizon sensor as one reference for the local vertical. The exhibit carries over the reconstructed housing from the earlier ferry.',
    facts: [['Housing', 'Assumed from Soyuz ferry type']],
  },
];

const launch = '1974-12-02T09:40:00Z';
const landing = '1974-12-08T08:03:35Z';
const duration = (Date.parse(landing) - Date.parse(launch)) / 1000;

const vehicle = soyuzGallery('soyuz-16', 'Soyuz 16', 'Filipchenko', spacecraft, ['SokolHood', 'SokolRim', 'SokolVisor', 'SokolFittings']);
vehicle.name = 'Soyuz 16 · Soyuz-U';
vehicle.scale = '49.3 m nominal stack · NASA ASTP reference · hardware detail reconstructed';
vehicle.lights![0]!.position = [0.596, 3.166, 0.502];
vehicle.cabin!.within.push('LifeSupport');

const commander = vehicle.seats![0]!;
commander.hide = commander.hide?.filter((node) => node !== 'Filipchenko_Helmet_Cap');
commander.label = 'Filipchenko’s couch';
commander.open = [-9000, -5400]; // Ingress to hatch closure, NASA SP-4209, Soyuz 16 life-support timeline.
vehicle.seats!.push({
  ...commander,
  node: 'Seat_Port',
  label: 'Rukavishnikov’s couch',
  hide: commander.hide?.map((node) => node.replace('Filipchenko', 'Rukavishnikov')),
});

vehicle.views.find((view) => view.id === 'launcher')!.label = 'Soyuz-U';
const dock = vehicle.views.find((view) => view.id === 'dock')!;
dock.label = 'APAS-75 docking system';
dock.nodes = ['ApasCollar', 'ApasCaptureRing'];
dock.from = [-0.7, 0.65, 1];
vehicle.views.find((view) => view.id === 'cabin')!.nodes = ['Cabin', 'Couches', 'LifeSupport'];
vehicle.views.find((view) => view.id === 'service')!.nodes = ['ServiceModule', 'SolarLeft', 'SolarRight', 'InfraredVertical'];
vehicle.views.push({
  id: 'test-ring',
  label: 'Apollo simulator ring',
  nodes: ['TestDockingRing'],
  from: [0.55, 1, 0.78],
  isolate: true,
});

const fairing = vehicle.parts.find((part) => part.node === 'Fairing')!;
fairing.summary = 'The fairing enclosed the folded solar arrays and the wide APAS docking hardware.';
fairing.detail =
  'The ASTP shroud was modified to clear the docking guides. The model reconstructs the profile from the joint-flight type and the Soyuz 16 launch photograph. Its two halves slide outward for inspection.';
const tower = vehicle.parts.find((part) => part.node === 'EscapeTower')!;
tower.detail =
  'The escape tower could pull both crew compartments clear of the launcher. The gallery reconstructs the tower silhouette from the Soyuz 16 launch photograph and uses shared hardware for the smaller fittings.';
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
    parted: 'the sequence did, minutes after the burn',
    crew: 'Filipchenko and Rukavishnikov',
    cover: `its barometric switch, ${(ORBITAL.ejection.altitude.value / 1000).toFixed(0)} km`,
  }),
);
/** The descent module's parachutes as drawn, at their areas as the record has them. */
const CHUTES = soyuzChuteLooks([
  { name: 'drogue parachute', area: AREAS.drogue },
  { name: 'main parachute', area: AREAS.main },
]);

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-16',
  nation: 'USSR',
  agency: 'NPO Energia',
  program: 'Soyuz',
  designation: 'Soyuz 16',
  callsign: 'Buran',
  spacecraft: 'Soyuz 7K-TM No. 73-EPSA · 11F615A12',
  launchVehicle: 'Soyuz-U 11A511U · K 15000-014',
  launch,
  site: SITE1,
  weather: WEATHER,
  opens: { at: -7200, model: 'pad', view: 'towers' },
  launchSite: 'Tyuratam (Baikonur), Site 1',
  crew: ['Anatoliy V. Filipchenko', 'Nikolay N. Rukavishnikov'],
  summary:
    'Filipchenko and Rukavishnikov rehearsed the Soviet side of Apollo–Soyuz. During nearly six days in orbit they tested the cabin atmosphere and worked the new docking mechanism against a ring carried on their own spacecraft.',
  facts: [
    { label: 'Call sign', value: 'Buran (Буран)' },
    { label: 'Commander', value: 'Anatoly Filipchenko' },
    { label: 'Flight engineer', value: 'Nikolai Rukavishnikov' },
  ],
  timeline: [
    { t: 0, event: 'The first crewed 7K-TM lifts off from Site 1 aboard a Soyuz-U.' },
    { t: (6 * 60 + 43) * 60, event: 'The crew starts testing the reduced-pressure cabin atmosphere during its first day in orbit.' },
    { t: 26 * 3600, event: 'Around this point orbit corrections bring Soyuz into a near-circular orbit about 225 km high.' },
    { t: 2 * 86400, event: 'Around this point the crew starts testing docking and undocking with the simulator ring.' },
    { t: (119 * 60 + 20) * 60, event: 'The emergency release sends the Apollo simulator ring away on 7 December.' },
    { t: duration, event: 'The descent capsule lands safely on the steppe north of Dzhezkazgan.' },
  ],
  specs: [
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 49.3,
      unit: 'm',
      confidence: 'assumed',
      note: 'NASA Apollo–Soyuz mission gallery, S75-32339. The caption gives 49.3 m for an earlier Soyuz stack illustrating the approximate ASTP configuration.',
    },
    ...soyuzGallerySpecs.filter((spec) => ['Span across the booster rudders', 'Orbital module side hatch'].includes(spec.label)),
    {
      group: CRAFT,
      label: 'Length with simulator ring as modelled',
      value: 7.6,
      unit: 'm',
      confidence: 'estimated',
      note: `${HARDWARE}.1 gives 7.48 m for sister spacecraft Soyuz 19. The model takes that from the aft plane to the native APAS guides and adds the reconstructed Soyuz 16 test ring.`,
    },
    {
      group: CRAFT,
      label: 'Reported spacecraft mass',
      value: 6680,
      unit: 'kg',
      confidence: 'documented',
      note: `${CATALOG} Siddiqi, Challenge to Apollo, appendix Table IB, gives 6,760 kg.`,
    },
    { group: CRAFT, label: 'Maximum diameter', value: 2.72, unit: 'm', confidence: 'documented', note: CATALOG },
    { group: CRAFT, label: 'Descent module length', value: 2.16, unit: 'm', confidence: 'documented', note: CATALOG },
    { group: CRAFT, label: 'Descent module diameter', value: 2.2, unit: 'm', confidence: 'documented', note: CATALOG },
    {
      group: CRAFT,
      label: 'Deployed solar array span',
      value: 8.37,
      unit: 'm',
      confidence: 'documented',
      note: `${CATALOG} ${HARDWARE}.1.`,
    },
    { group: 'Flight', label: 'Reported early perigee', value: 194000, unit: 'm', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Reported early apogee', value: 280000, unit: 'm', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Circularized orbit altitude', value: 225000, unit: 'm', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Reported orbital inclination', value: 51.8, unit: 'deg', confidence: 'documented', note: ORBIT },
    {
      group: 'Flight',
      label: 'Duration',
      value: duration,
      unit: 's',
      confidence: 'derived',
      note: `${LOG} 09:40:00 UTC on 2 December to 08:03:35 UTC on 8 December.`,
    },
  ],
  motors: [],
  // the flight as flown from its record: the 11A511U's ascent on its steering law, the record's corrections in orbit, the
  // docking ring let go, the braking burn, the guided entry and the descent (orbital.ts; mission.md), through the day's air
  plan: { ...soyuzPlan(ORBITAL), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is flown on the Soyuz-U’s own engines to the orbit Siddiqi’s table gives. The orbit is made the 225 km circle of the joint flight in two burns on the 17th and 18th revolutions, the docking ring is shot off on 7 December, and Filipchenko and Rukavishnikov come down in their Sokol-K suits in the descent module on its own lift (mission.md). Flown live through the day’s winter jet, the stack breaks up at T+57: its bending load passes the R-7’s estimated limit by a per cent. Soyuz 16 did not; the estimate, not the flight, is believed short.',
  flies: soyuzFlies(ORBITAL, CHUTES, {
    orbital: ['OrbitalModule', 'ApasCollar', 'ApasCaptureRing', 'RendezvousTarget', 'VhfAntennas'],
    instrument: ['ServiceModule', 'InfraredVertical', 'SolarLeft', 'SolarRight'],
    jettisoned: [{ id: 'test-ring', nodes: ['TestDockingRing'] }],
  }),
  models: [
    onSoyuzPad(vehicle, TURN, TAIL),
    soyuzPad,
    soyuzWalker('crew', 'Anatoly Filipchenko', 'models/ussr/soyuz/soyuz-16/crew.glb', 'sokol-k', [-23, 0, 8]),
    soyuzWalker('engineer', 'Nikolay Rukavishnikov', 'models/ussr/soyuz/soyuz-16/engineer.glb', 'sokol-k', [-26, 0, 5]),
  ],
};
