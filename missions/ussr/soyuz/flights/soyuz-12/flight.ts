import type { Flight, Part } from '../../../../../src/types.ts';
import { CRAFT, descent, iglaMoves, moduleTravel, orbital, service, soyuzGallery, soyuzGallerySpecs } from '../../vehicles/gallery.ts';

const HARDWARE = 'David S. F. Portree, Mir Hardware Heritage, NASA RP-1357, §1.8';
const INSERTION = 'Nauka i zhizn, “Flights Continue,” 1973, reported initial orbit.';
const RAISED_ORBIT = 'TASS figures reproduced in NASA’s Astronautics and Aeronautics, 1973, p. 273.';
const LOG = 'Afanasyev and Vorontsov, The First Soyuz Spacecraft, flight chronology, Soyuz 12 row.';
const ORBIT = 'Asif A. Siddiqi, Challenge to Apollo, NASA SP-2000-4408, appendix Table IB, Soyuz 12 row.';

const spacecraft: Part[] = [
  {
    node: 'OrbitalModule',
    name: 'Orbital module',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The forward room gave Lazarev and Makarov space to work once in orbit.',
    detail: 'The crew could leave their couches and work in this room once in orbit. The side hatch was their way in on the ground.',
    facts: [['Module', 'БО · бытовой отсек']],
  },
  {
    node: 'LksaCamera',
    name: 'LKSA-3 multispectral camera',
    group: CRAFT,
    order: 2,
    explode: orbital,
    inside: true,
    summary: 'Makarov photographed the Earth in six spectral bands.',
    detail:
      'Originally developed for lunar surface photography, the instrument coupled three 35 mm film channels, each with three lenses. Lazarev and airborne teams photographed the same terrain for comparison.',
    facts: [
      ['Instrument', 'ЛКСА-3 · 35 mm film'],
      ['Gallery camera', 'Reconstructed from a photograph at the window'],
    ],
  },
  {
    node: 'DockingCollar',
    name: 'Docking collar and transfer hatch',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'The forward hatch reflects the spacecraft’s original role as a station ferry.',
    detail:
      'Period drawings of Soyuz 12 show a forward transfer tunnel. Soyuz 12 flew independently after its prospective station was lost. The gallery reconstructs the collar and closed hatch from the ferry type.',
    facts: [['Crew transfer', 'Ferry hardware · unused']],
  },
  {
    node: 'DockingProbe',
    name: 'Active docking probe',
    group: CRAFT,
    order: 2,
    explode: orbital,
    summary: 'A ferry’s probe would catch the receiving cone at a station.',
    detail:
      'The active probe would draw the two vehicles together for the collars to seal. Soyuz 12 had no station to approach. The probe shape and pose follow the early ferry type.',
    facts: [['Probe geometry', 'Reconstructed']],
  },
  {
    node: 'DescentModule',
    name: 'Descent module',
    group: CRAFT,
    order: 3,
    explode: descent,
    summary: 'Only the central capsule carried the crew back through the atmosphere.',
    detail:
      'After the braking burn the other two modules separated. The capsule landed under parachute with a final burst from its soft-landing rockets, about 400 km southwest of Karaganda.',
    facts: [['Module', 'СА · спускаемый аппарат']],
  },
  {
    node: 'Cabin',
    name: 'Descent cabin',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'The redesigned cabin had room for two cosmonauts in pressure suits.',
    detail:
      'The Sirius-A8 display system developed from the early Soyuz Sirius-7K. The globe, television display and command panels follow the early Sirius layout. Their faces, arrangement and idle readings are reconstructed.',
    facts: [['Display family', 'Sirius-A8 · reconstructed']],
  },
  {
    node: 'Couches',
    name: 'Crew couches',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Lazarev and Makarov wore Sokol-K pressure suits during launch and return.',
    detail:
      'The lightweight suits and their support equipment were added after cabin depressurization killed the Soyuz 11 crew. The redesign reduced the cabin from three seats to two.',
    facts: [
      ['Commander', 'Vasily Lazarev'],
      ['Flight engineer', 'Oleg Makarov'],
    ],
  },
  {
    node: 'SuitSupply',
    name: 'Pressure-suit support equipment',
    group: CRAFT,
    order: 3,
    explode: descent,
    inside: true,
    summary: 'Support equipment for the suits took space freed by removing the third couch.',
    detail:
      'The suits connected to the spacecraft’s life-support equipment. If cabin pressure fell, the system supplied oxygen to keep the suits pressurized. The installation shown uses a reconstructed casing and fittings.',
    facts: [['Equipment layout', 'Estimated']],
  },
  {
    node: 'ServiceModule',
    name: 'Instrument and propulsion module',
    group: CRAFT,
    order: 4,
    explode: service,
    summary: 'Batteries powered the two-day flight, and the main engine raised the orbit and braked for return.',
    detail:
      'The redesigned ferry relied on chemical batteries for independent flight and was meant to draw power from a station when docked. Without solar wings it could operate on its own for about two days.',
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
      'The ferry’s orientation system used an infrared horizon sensor alongside ion sensors and gyroscopes. The exhibit reconstructs the sensor’s housing and mount.',
    facts: [['Equipment', 'Assumed from 7K-T ferry type']],
  },
  ...(['Left', 'Right'] as const).map(
    (side): Part => ({
      node: `WhipAntenna${side}`,
      name: `${side} whip antenna`,
      group: CRAFT,
      order: 4,
      explode: service,
      moves: [
        moduleTravel(service, 4),
        {
          kind: 'swing',
          node: `Whip${side}Mast`,
          axis: [0, 0, 1],
          angle: (side === 'Left' ? Math.PI : -Math.PI) / 2,
          from: 0.28,
          to: 0.47,
        },
      ],
      summary: 'The ferry carried its whip antennas on the service module.',
      detail:
        'On earlier Soyuz spacecraft the whips rode on the solar wings. Engineers moved them to the service-module sides when they removed the wings. The exhibit reconstructs their mounts and geometry.',
      facts: [['Configuration', 'Assumed from 7K-T ferry type']],
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
    summary: 'The ferry type used radio antennas to measure the approach to a station.',
    detail:
      'Soyuz 12 exercised its flight controls and raised its orbit during a solo test. The gallery uses the early ferry antenna arrangement as a reconstruction.',
    facts: [
      ['System', 'Игла (Igla), “needle”'],
      ['Antenna fit', 'Assumed from 7K-T ferry type'],
    ],
  },
];

const launch = '1973-09-27T12:18:16Z';
const landing = '1973-09-29T11:33:48Z';
const duration = (Date.parse(landing) - Date.parse(launch)) / 1000;

const vehicle = soyuzGallery('soyuz-12', 'Soyuz 12', 'Lazarev', spacecraft, ['SokolHood', 'SokolRim', 'SokolVisor', 'SokolFittings']);
vehicle.scale = '49.913 m nominal stack · 11A511 type drawing · hardware detail reconstructed';
vehicle.lights![0]!.position = [0.596, 3.166, 0.502];
vehicle.cabin!.within.push('SuitSupply');

const commander = vehicle.seats![0]!;
commander.hide = commander.hide?.filter((node) => node !== 'Lazarev_Helmet_Cap');
vehicle.seats!.push({
  ...commander,
  node: 'Seat_Port',
  label: 'Makarov’s couch',
  hide: commander.hide?.map((node) => node.replace('Lazarev', 'Makarov')),
});
commander.label = 'Lazarev’s couch';

const dock = vehicle.views.find((view) => view.id === 'dock')!;
dock.label = 'Docking hardware';
dock.nodes = ['OrbitalModule', 'DockingCollar', 'DockingProbe'];
dock.from = [0.7, 0.8, 1];
vehicle.views.find((view) => view.id === 'cabin')!.nodes = ['Cabin', 'Couches', 'SuitSupply'];
vehicle.views.find((view) => view.id === 'service')!.nodes = ['ServiceModule', 'InfraredVertical', 'WhipAntennaLeft', 'WhipAntennaRight'];
vehicle.views.push({
  id: 'lksa-camera',
  label: 'LKSA-3 multispectral camera',
  nodes: ['LksaCamera'],
  from: [1, 0.35, -0.7],
  isolate: true,
});

const fairing = vehicle.parts.find((part) => part.node === 'Fairing')!;
fairing.summary = 'The fairing shielded the three spacecraft modules during ascent.';
fairing.detail =
  'The exhibit slides the two halves apart to reveal the compact battery-powered ferry. The model assumes the early 11A511 profile and reconstructs the seams and fittings.';
const tower = vehicle.parts.find((part) => part.node === 'EscapeTower')!;
tower.detail =
  'The escape tower could pull the descent capsule and orbital module clear together. For Soyuz 12 the lower casing was omitted. The gallery reconstructs the exposed supports and the narrower outline from a period drawing.';

export const flight: Flight = {
  id: 'ussr/soyuz/soyuz-12',
  nation: 'USSR',
  agency: 'TsKBEM',
  program: 'Soyuz',
  designation: 'Soyuz 12',
  callsign: 'Ural',
  spacecraft: 'Soyuz 7K-T No. 37 · 11F615A8',
  launchVehicle: 'Soyuz 11A511 · S15000-026',
  launch,
  launchSite: 'Tyuratam (Baikonur), Site 1',
  crew: ['Vasily G. Lazarev', 'Oleg G. Makarov'],
  summary:
    'The Soviet Union resumed crewed spaceflight after Soyuz 11. Lazarev and Makarov tested the redesigned two-person ferry, its new pressure suits and its life-support equipment on a two-day solo flight.',
  facts: [
    { label: 'Call sign', value: 'Ural (Урал)' },
    { label: 'Commander', value: 'Vasily Lazarev' },
    { label: 'Flight engineer', value: 'Oleg Makarov' },
  ],
  timeline: [
    { t: 0, event: 'Soyuz 12 lifts off from Site 1 with Lazarev and Makarov for a two-day test.' },
    { t: 7 * 3600, event: 'During the first day Soyuz raises its orbit to a reported 326 × 345 km. Accounts differ on the burn time.' },
    { t: 18 * 3600, event: 'Around this part of the flight the crew takes multispectral photographs of the Earth.' },
    { t: duration, event: 'The two crew land safely in Kazakhstan, about 400 km southwest of Karaganda.' },
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
      note: `${HARDWARE}.1 gives about 7.5 m overall for the ferry. The model takes this from the aft nozzle plane to the probe tip.`,
    },
    { group: CRAFT, label: 'Maximum diameter', value: 2.72, unit: 'm', confidence: 'assumed', note: `${HARDWARE}.1, ferry type.` },
    {
      group: CRAFT,
      label: 'Mass in orbit',
      value: 6570,
      unit: 'kg',
      confidence: 'documented',
      note: 'Approximate. Czech Academy of Sciences Space Catalogue, 1973-067A, and Challenge to Apollo, appendix Table IB.',
    },
    { group: 'Flight', label: 'Initial perigee', value: 194000, unit: 'm', confidence: 'documented', note: INSERTION },
    { group: 'Flight', label: 'Initial apogee', value: 249000, unit: 'm', confidence: 'documented', note: INSERTION },
    { group: 'Flight', label: 'Raised perigee', value: 326000, unit: 'm', confidence: 'documented', note: RAISED_ORBIT },
    { group: 'Flight', label: 'Raised apogee', value: 345000, unit: 'm', confidence: 'documented', note: RAISED_ORBIT },
    { group: 'Flight', label: 'Raised orbit inclination', value: 51.6, unit: 'deg', confidence: 'documented', note: RAISED_ORBIT },
    { group: 'Flight', label: 'Orbits', value: 31, unit: 'orbits', confidence: 'documented', note: ORBIT },
    {
      group: 'Flight',
      label: 'Duration',
      value: duration,
      unit: 's',
      confidence: 'derived',
      note: `${LOG} 12:18:16 UTC on 27 September to 11:33:48 UTC on 29 September.`,
    },
  ],
  motors: [],
  models: [vehicle],
};
