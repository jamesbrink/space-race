import type { Flight, Part } from '../../../../../src/types.ts';
import { TAIL, TURN } from '../../../places/tyuratam/site-1.parts.ts';
import { SITE1 } from '../../../places/tyuratam/site-1.ts';
import { soyuzPad } from '../../../places/tyuratam/soyuz-pad.ts';
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
import { AREAS } from '../../vehicles/soyuz-7kok-flown.ts';
import { commanded, soyuzChuteLooks, soyuzCommands, soyuzFlies } from '../../vehicles/soyuz-flies.ts';
import { soyuzPlan } from '../../vehicles/soyuz-plan.ts';
import { orbital as ORBITAL } from './orbital.ts';
import { WEATHER } from './weather.ts';

const HARDWARE = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357, §1.7';
const FLIGHT_LOG = 'Igor Afanasyev and Dmitry Vorontsov, The First Soyuz Spacecraft, “Soyuz 10: Failure of the First Expedition”';
const ORBIT = 'Asif A. Siddiqi, Challenge to Apollo, NASA SP-2000-4408, appendix Table IB, p. 877, Soyuz 10 row.';

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The forward room led to a new pressurized passage to Salyut.',
    detail:
      'The 7K-OKS adapted the earlier Soyuz living compartment for station visits. After a complete docking, the crew would move from the descent cabin through this room and the forward hatch into Salyut 1.',
    facts: [['Module', 'БО · бытовой отсек']],
  },
  {
    node: 'DockingCollar',
    name: 'Docking collar and transfer hatch',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The collars had to meet and seal before anyone could open the passage.',
    detail:
      'The collar carried the interface that was meant to lock against Salyut 1. Soyuz 10 remained about 90 mm short of closing the joint. The crew kept the hatches shut and stayed aboard Soyuz.',
    facts: [['Crew transfer', 'Internal passage · planned']],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The probe captured Salyut 1 but could not draw the two collars together.',
    detail:
      'The tip caught in the station’s receiving cone. The alignment mechanism was damaged after capture and the probe stopped short of drawing the joint shut. The gallery reconstructs the active mechanism in its approach configuration.',
    facts: [
      ['Target', 'Salyut 1 · uncrewed'],
      ['Outcome', 'Soft capture only · documented'],
    ],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'All three cosmonauts returned in this capsule after the shortened mission.',
    detail:
      'The orbital and propulsion modules were discarded for entry. The descent module followed a controlled descent and set down in Kazakhstan in the first Soviet crewed landing at night.',
    facts: [['Module', 'СА · спускаемый аппарат']],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Shatalov flew the final approach from the centre couch.',
    detail:
      'The Sirius-A8 was a development of the earlier Soyuz display system. The exhibit uses early Sirius instruments as a baseline for the globe, television display and command panels. The arrangement and static readings are reconstructed.',
    facts: [['Display family', 'Sirius-A8 · reconstructed']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Three couches filled the cabin for launch and landing.',
    detail:
      'Vladimir Shatalov commanded, Aleksey Yeliseyev was flight engineer, and Nikolay Rukavishnikov was test engineer. They flew in soft flight clothing with communications headgear. The side positions and clothing details are reconstructed.',
    facts: [
      ['Centre couch', 'Vladimir Shatalov'],
      ['Side couches', 'Aleksey Yeliseyev and Nikolay Rukavishnikov · positions estimated'],
    ],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'The aft module powered the spacecraft and carried the engines for manoeuvre and return.',
    detail:
      'The aft engines changed orbit and braked for entry. Moving the Igla equipment forward and removing a command radio link let engineers omit the original Soyuz’s toroidal equipment compartment around the engine bells.',
    facts: [['Module', 'ПАО · приборно-агрегатный отсек']],
  },
  {
    node: 'InfraredVertical',
    name: 'Infrared vertical sensor',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'An Earth sensor that helped establish the local vertical.',
    detail:
      'The gallery carries over the infrared orientation sensor from later original Soyuz hardware. Its mounting and housing are reconstructed.',
    facts: [['Equipment', 'Assumed from late 7K-OK']],
  },
  ...(['Left', 'Right'] as const).map(
    (side): Part => ({
      node: `Solar${side}`,
      name: `${side} solar array`,
      group: CRAFT,
      order: 4,
      explode: service,
      moves: wingMoves(side),
      summary: 'A folding solar wing provided power for independent flight.',
      detail:
        'Both wings open with the modules joined at the gallery slider’s midpoint. The wings could supplement the station’s power after a complete docking. Leaf shapes and antenna travel are reconstructed.',
      facts: [['Deployment', 'Illustrative for the type']],
    }),
  ),
  {
    node: 'Igla',
    name: 'Igla rendezvous antennas',
    group: CRAFT,
    order: 2,
    explode: orbital,
    moves: [
      ...iglaMoves,
      { kind: 'swing', node: 'IglaAuxLeft', axis: [0, 0, 1], angle: Math.PI / 2, from: 0.28, to: 0.47 },
      { kind: 'swing', node: 'IglaAuxRight', axis: [0, 0, 1], angle: -Math.PI / 2, from: 0.28, to: 0.47 },
    ],
    summary: 'Igla guided Soyuz 10 toward Salyut 1 before Shatalov took control.',
    detail:
      'After orbit corrections brought the two vehicles within about 16 km, the radio system acquired the station. Shatalov took over for the last part of the approach. The gallery uses the early Soyuz boom mechanism with reconstructed mounting and travel.',
    facts: [
      ['System', 'Игла (Igla), “needle”'],
      ['Manual handover', 'About 200 m · Kamanin’s diary'],
    ],
  },
];

const launch = '1971-04-22T23:54:06Z';
const capture = '1971-04-24T01:47:00Z';
const separation = '1971-04-24T07:17:00Z';
const landing = '1971-04-24T23:40:00Z';
const elapsed = (utc: string) => (Date.parse(utc) - Date.parse(launch)) / 1000;

const vehicle = soyuzGallery('soyuz-10', 'Soyuz 10', 'Shatalov', spacecraft);
vehicle.scale = '49.913 m nominal stack · 11A511 type drawing · hardware detail reconstructed';
vehicle.lights![0]!.position = [0.596, 3.166, 0.502];

const centre = vehicle.seats![0]!;
vehicle.seats!.push(
  {
    ...centre,
    node: 'Seat_Port',
    label: 'Rukavishnikov’s couch',
    hide: centre.hide?.map((node) => node.replace('Shatalov', 'Rukavishnikov')),
  },
  {
    ...centre,
    node: 'Seat_Starboard',
    label: 'Yeliseyev’s couch',
    hide: centre.hide?.map((node) => node.replace('Shatalov', 'Yeliseyev')),
  },
);

const dock = vehicle.views.find((view) => view.id === 'dock')!;
dock.label = 'Docking system';
dock.nodes = ['OrbitalModule', 'DockingCollar', 'DockingProbe'];
dock.from = [0.7, 0.8, 1];
vehicle.views.push({
  id: 'transfer',
  label: 'Forward transfer hatch',
  nodes: ['DockingCollar', 'DockingProbe'],
  from: [-0.18, 1, 0.28],
  isolate: true,
});

const fairing = vehicle.parts.find((part) => part.node === 'Fairing')!;
fairing.detail =
  'The shroud enclosed the 7K-OKS and its folded solar wings during ascent. The exhibit slides the two halves apart to reveal the spacecraft. The model assumes the early 11A511 profile and reconstructs the seams and fittings.';

vehicle.seats![0]!.figure = 'crew';
vehicle.seats![1]!.figure = 'researcher';
vehicle.seats![2]!.figure = 'engineer';

// what a hand can ask of each part in flight, said with what did each thing on the day (vehicles/soyuz-flies.ts)
vehicle.parts = commanded(
  vehicle.parts,
  soyuzCommands({
    parted: 'the sequence did, minutes after the burn',
    crew: 'The crew',
    cover: `its barometric switch, ${(ORBITAL.ejection.altitude.value / 1000).toFixed(1)} km`,
  }),
);
/** The descent module's parachutes as drawn, at their areas as the record has them. */
const CHUTES = soyuzChuteLooks([
  { name: 'drogue parachute', area: AREAS.drogue },
  { name: 'main parachute', area: AREAS.main },
]);

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-10',
  nation: 'USSR',
  agency: 'TsKBEM',
  program: 'Soyuz',
  designation: 'Soyuz 10',
  callsign: 'Granit',
  spacecraft: 'Soyuz 7K-OKS No. 31 · 11F615A8',
  launchVehicle: 'Soyuz 11A511 · Kh15000-025',
  launch,
  site: SITE1,
  weather: WEATHER,
  opens: { at: -7200, model: 'pad', view: 'towers' },
  launchSite: 'Tyuratam (Baikonur), Site 1',
  crew: ['Vladimir A. Shatalov', 'Aleksey S. Yeliseyev', 'Nikolay N. Rukavishnikov'],
  summary:
    'The first crew sent to Salyut 1 captured the station with a new docking probe. The joint failed to seal, and all three returned without entering.',
  facts: [
    { label: 'Call sign', value: 'Granit (Гранит)' },
    { label: 'Commander', value: 'Vladimir Shatalov' },
    { label: 'Flight engineer', value: 'Aleksey Yeliseyev' },
    { label: 'Test engineer', value: 'Nikolay Rukavishnikov' },
  ],
  timeline: [
    { t: 0, event: 'Soyuz 10 lifts off from Site 1 with Shatalov, Yeliseyev and Rukavishnikov.' },
    { t: elapsed('1971-04-24T00:00:00Z'), event: 'Around this time Soyuz begins its automatic approach to Salyut 1.' },
    { t: elapsed(capture), event: 'Shatalov guides the docking probe into Salyut 1. The collars stop short of sealing.' },
    { t: elapsed(separation), event: 'Soyuz 10 separates from Salyut 1 after hours of troubleshooting.' },
    { t: elapsed('1971-04-24T22:59:00Z'), event: 'Soyuz 10 fires its main engine to brake for entry.' },
    { t: elapsed(landing), event: 'All three cosmonauts land near Karaganda in Kazakhstan.' },
  ],
  specs: [
    ...soyuzGallerySpecs
      .filter((spec) =>
        [
          'Height on the pad',
          'Span across the booster rudders',
          'Descent module length',
          'Descent module diameter',
          'Orbital module side hatch',
        ].includes(spec.label),
      )
      .map((spec) => ({ ...spec, confidence: 'assumed' as const })),
    {
      group: CRAFT,
      label: 'Length with probe as modelled',
      value: 7.5,
      unit: 'm',
      confidence: 'estimated',
      note: `${HARDWARE}, §1.7.1 gives about 7.5 m overall. The model takes this from the aft nozzle plane to the probe tip.`,
    },
    {
      group: CRAFT,
      label: 'Maximum diameter',
      value: 2.72,
      unit: 'm',
      confidence: 'assumed',
      note: `${HARDWARE}, §1.7.1, Salyut 1-type spacecraft.`,
    },
    {
      group: CRAFT,
      label: 'Orbital module length',
      value: 2.65,
      unit: 'm',
      confidence: 'assumed',
      note: `${HARDWARE}, §1.7.2. The model uses this from the descent-module hatch datum to the forward docking face.`,
    },
    {
      group: CRAFT,
      label: 'Span across the deployed solar arrays',
      value: 8.37,
      unit: 'm',
      confidence: 'assumed',
      note: 'Czech Academy of Sciences Space Catalogue, 1971-034A. Portree §1.7.1 gives 10 m for the type.',
    },
    {
      group: CRAFT,
      label: 'Forward transfer opening as modelled',
      value: 0.808,
      unit: 'm',
      confidence: 'estimated',
      note: `${HARDWARE}, fig. 1-19 shows the later docking unit used as a guide for the opening. The mission-specific opening diameter is unverified.`,
    },
    { group: CRAFT, label: 'Mass in orbit', value: 6575, unit: 'kg', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Perigee', value: 209600, unit: 'm', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Apogee', value: 248400, unit: 'm', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Inclination', value: 51.6, unit: 'deg', confidence: 'documented', note: ORBIT },
    { group: 'Flight', label: 'Orbits', value: 32, unit: 'orbits', confidence: 'documented', note: ORBIT },
    {
      group: 'Flight',
      label: 'Time in soft capture',
      value: elapsed(separation) - elapsed(capture),
      unit: 's',
      confidence: 'derived',
      note: 'TASS completion report, published 26 April 1971, gives contact at 04:47 Moscow time and 5 h 30 min together. Chertok gives a different release time.',
    },
    {
      group: 'Flight',
      label: 'Duration',
      value: elapsed(landing),
      unit: 's',
      confidence: 'derived',
      note: `${FLIGHT_LOG}, 02:54:06 Moscow time on 23 April to 02:40 on 25 April.`,
    },
  ],
  motors: [],
  // the flight as flown from its record: the 11A511's ascent on its steering law, the record's burns in orbit, the braking
  // burn, the guided entry and the descent (orbital.ts; mission.md), through the day's air over the pad
  plan: { ...soyuzPlan(ORBITAL), aloft: WEATHER.aloft },
  flownNote:
    'The ascent is flown on the 11A511 type’s instants to the orbit Siddiqi’s table gives. The rendezvous and soft docking with Salyut 1 are not flown: the ship goes round alone, the main engine fired as the record has it at 01:34 on 24 April, to the braking burn at 01:59 on 25 April, and the crew come down in the dark in the descent module on its own lift (mission.md).',
  flies: soyuzFlies(ORBITAL, CHUTES, {
    orbital: ['OrbitalModule', 'DockingCollar', 'DockingProbe', 'Igla'],
    instrument: ['ServiceModule', 'InfraredVertical', 'SolarLeft', 'SolarRight'],
  }),
  models: [
    onSoyuzPad(vehicle, TURN, TAIL),
    soyuzPad,
    soyuzWalker('crew', 'Vladimir Shatalov', 'models/ussr/soyuz/soyuz-10/crew.glb', 'flight', [-23, 0, 8]),
    soyuzWalker('engineer', 'Aleksey Yeliseyev', 'models/ussr/soyuz/soyuz-10/engineer.glb', 'flight', [-26, 0, 5]),
    soyuzWalker('researcher', 'Nikolay Rukavishnikov', 'models/ussr/soyuz/soyuz-10/researcher.glb', 'flight', [-26, 0, 11]),
  ],
};
