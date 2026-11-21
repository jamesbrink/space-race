import type { Measure } from '../../../../../src/measure.ts';
import type { Flight, Move, Part } from '../../../../../src/types.ts';
import { LC39A, mobileLauncher } from '../../../places/cape-canaveral/lc-39.ts';
import { lc39Crew } from '../../crew/lc39.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { boardingHatches } from '../../vehicles/hatch.ts';
import { CSM103_THRUST, SA503_THRUST } from '../../vehicles/propulsion.ts';
import { saturnVFlies } from '../../vehicles/saturn-v-flies.ts';
import { apolloLunarPlan } from '../../vehicles/apollo-lunar-plan.ts';
import { orbital } from './orbital.ts';
import { WEATHER } from './weather.ts';

const IN = 0.0254;
const FT = 12 * IN;
const kit = 'NASA Apollo 8 press kit 68-208, ';
const record = 'NASA SP-4029, Apollo 8 mission summary';
const PLAN = apolloLunarPlan(orbital);
const cabin = blockIICabin(3871); // SA-503 forward SLA station above the F-1 exits (3709 in) + XA1000 − XA838.

// Selected-part cards keep the drawing units. The Specs tab converts their dimensional figures to SI.
const facts: Record<string, Part['facts']> = {
  CommandModule: [
    ['Base diameter', '154 in · press kit p. 33'],
    ['Window apertures', 'CM-107 structural survey · assumed common'],
  ],
  CabinWindows: [['Glazing', 'Five openings, each with one thermal and two pressure panes · Block II reference']],
  MainConsole: [
    ['Panel layout', 'CM-103 drawing V36-976020, revision B'],
    ['Independent registration check', 'DSKY centre offset 0.34 cm · reconstructed'],
  ],
  ConsoleEquipment: [
    ['Main controls', '184 switch levers · reconstructed from CM-103 sheet 1'],
    ['Antenna controls', 'Pitch, signal strength and yaw on panel 2 · V36-976020'],
  ],
  FlightDirectorIndicators: [['Ball diameter', '4.5 in · Honeywell JG264 type figure assumed for CM-103']],
  CrewCouches: [
    ['Flight configuration', 'Three independently folding couch frames · mission report fig. A.1-2'],
    ['Launch pose', 'Estimated installed positions'],
  ],
  ForwardCompartment: [['Crew hatch', 'Combined pressure and ablative plug · mission report fig. A.1-1']],
  CabinEquipmentBays: [['Optics', 'Scanning telescope sun filter and sextant camera adapter · mission report §A.1.5']],
  ServiceModule: [
    ['Body diameter', '154 in · press kit p. 34'],
    ['Construction', 'Six equipment sectors · press kit p. 34'],
  ],
  ServicePower: [['Electrical generation', 'Three 31-cell fuel cells · press kit p. 35']],
  ReactionControl: [['Thrusters', 'Four quads of four · press kit p. 35']],
  HighGainAntenna: [
    ['Reflectors', '4 × 31 in diameter · press kit p. 36'],
    ['Deployment plane', '52.25° from −Y toward +Z · mission report fig. A.1-5'],
  ],
  ServiceEngine: [
    ['Lunar orbit insertion', '246.9 s · SP-4029, Lunar Orbit'],
    ['Transearth injection', '203.7 s · SP-4029, Lunar Orbit'],
  ],
  SpacecraftAdapter: [
    ['Length', '28 ft · press kit p. 34'],
    ['Diameters', '260 in aft, 154 in forward · press kit p. 34'],
  ],
  LunarTestArticle: [
    ['Flight mass', '19,900 lb · mission report p. A-14'],
    ['Mounts and instrumentation', 'Four struts, six accelerometers · M-932-68-08 p. 34'],
  ],
  InstrumentUnit: [['Envelope', '3 ft high, 21 ft 8 in across · press kit p. 42']],
  InstrumentUnitEquipment: [['Arrangement', 'SA-503 flight manual fig. 7-4 sheets 2–5']],
  SaturnFirstStage: [
    ['Body diameter', '33 ft · press kit p. 38'],
    ['Span over fins', '63 ft · SA-503 flight manual fig. 1-3'],
  ],
  FirstStageEngines: [
    ['Arrangement', 'One fixed centre engine, four gimballed outer engines · press kit p. 39'],
    ['Mounting', 'Outboard engines on the thrust posts, below a thrust structure 233.7 in long · SA-503 flight manual fig. 4-1'],
  ],
  SaturnSecondStage: [['Envelope', '81.5 ft long, 33 ft across · press kit p. 39']],
  SaturnThirdStage: [['Envelope', '58 ft 5 in long, 21 ft 8 in across · press kit p. 40']],
  SaturnInterstage: [['Length', '19 ft · SA-503 flight manual fig. 6-1']],
  LowerInterstage: [['Separation planes', 'Saturn stations 1564 and 1760 in · SA-503 flight manual p. 5-24']],
};

function part(
  node: string,
  name: string,
  order: number,
  lift: number,
  group: string,
  summary: string,
  detail: string,
  inside = false,
): Part {
  return { node, name, order, explode: [0, lift, 0], group, summary, detail, inside, facts: facts[node] };
}

const capsule = (node: string, name: string, summary: string, detail: string, inside = false) =>
  part(node, name, 2, 52, 'Spacecraft', summary, detail, inside);
const service = (node: string, name: string, summary: string, detail: string, inside = false) =>
  part(node, name, 4, 41, 'Spacecraft', summary, detail, inside);
const rocket = (node: string, name: string, order: number, lift: number, summary: string, detail: string, inside = false) =>
  part(node, name, order, lift, 'Launch vehicle', summary, detail, inside);

// A sequenced part supplies its own lift. Match the eased translation of the hardware it belongs to.
const liftMove = (order: number, lift: number): Move => ({ kind: 'slide', by: [0, lift, 0], from: order / 24, to: order / 24 + 0.5 });
const outward: [number, number, number][] = [
  [1, 0, 0],
  [0, 0, -1],
  [-1, 0, 0],
  [0, 0, 1],
];
const doors: Move[] = outward.flatMap(([x, , z], i) => [
  { kind: 'swing', node: `SLA_Door_${i}`, axis: [z, 0, -x], angle: Math.PI / 4, from: 0.4, to: 0.65 },
  { kind: 'slide', node: `SLA_Door_${i}`, by: [8 * x, 0, 8 * z], from: 0.65, to: 1 },
]);

const commandParts = [
  capsule(
    'CommandModule',
    'Command module 103',
    'The cabin that carried three people around the Moon and home.',
    'Borman, Lovell and Anders lived inside this cone for six days. The silver outer surface follows the common Block II heat-shield contour. The four fixed window apertures are taken from a survey of CM-107 and assumed here.',
  ),
  capsule(
    'SideHatch',
    'Side hatch',
    'The crew entered through this outward-opening door at Pad 39A.',
    'A round pressure window lets the crew look straight through the hatch. The curved opening follows the shared Block II survey. Its latch linkage and inner frame are reconstructions.',
  ),
  capsule(
    'CabinStructure',
    'Pressure vessel',
    'A second shell holds the cabin air inside the heat shield.',
    'The tapered pressure walls meet a domed aft bulkhead. The model follows the common Block II structural stations. The insulation and honeycomb between the two shells are omitted.',
    true,
  ),
  capsule(
    'CabinWindows',
    'Window assemblies',
    'Two rendezvous windows, two side windows and one hatch window.',
    'Three panes close each opening. The crew reported fogging on the hatch and side windows. The Gallery shows the clear glazing so the panes and frames can be examined.',
  ),
  capsule(
    'CrewCouches',
    'Folding crew couches',
    'Borman sat on the left, Lovell in the centre and Anders on the right.',
    'The folding couch design freed space for the crew to move inside the cabin on the lunar voyage. The exhibit shows the three launch positions. Couch dimensions, padding and eye positions are reconstructed.',
    true,
  ),
  capsule(
    'MainConsole',
    'Main display console',
    'The wide panel arches over the crew’s launch positions.',
    'The panel spans the commander’s flight controls on the left and spacecraft systems on the right. The layout follows CM-103 drawing V36-976020 revision B. Its structural outline follows the shared Block II survey.',
    true,
  ),
  capsule(
    'FlightDirectorIndicators',
    'Attitude indicators',
    'Two attitude balls show the orientation of the spacecraft.',
    'The pointers and balls are presented at rest. The instrument shapes and case depths are estimated inside the surveyed console apertures.',
    true,
  ),
  capsule(
    'ConsoleEquipment',
    'Switches, meters and warning lights',
    'The crew monitored the ship from rows of meters and guarded switches.',
    'The three antenna meters read pitch, signal strength and yaw. North American’s CM-103 drawing V36-976020 places these and the antenna pointing controls on the middle panel. Switch bodies, readings and finishes are estimates.',
    true,
  ),
  capsule(
    'DSKYFrontWeb',
    'Guidance computer display and keyboard',
    'Lovell could enter a verb and a noun to tell the computer what to do.',
    'The nineteen-key display and keyboard is shown unpowered. Its nominal front and glazing follow equipment drawings. The Apollo 7 reference supplies the exterior details where a serial-specific measurement is unavailable.',
    true,
  ),
  capsule(
    'CabinEquipmentBays',
    'Navigation station and equipment bays',
    'The optical station sits below the main panel at the crew’s feet.',
    'On the coast to the Moon, Lovell made navigation sightings through the optics. The telescope, sextant and cabinet faces show their approximate installation.',
    true,
  ),
  capsule(
    'ForwardCompartment',
    'Tunnel hatch and recovery equipment',
    'A combined pressure and ablative hatch closes the forward tunnel.',
    'A ring of recovery equipment occupies the space around the tunnel. The three main parachutes are packed here for the return to Earth. The exhibit shows the stowed arrangement.',
    true,
  ),
  part(
    'ForwardShield',
    'Forward heat shield',
    1,
    57,
    'Spacecraft',
    'The forward shield protects the parachute compartment.',
    'The shield was jettisoned during descent, exposing the recovery system above the cabin. Its shape follows the shared Block II stations.',
  ),
  part(
    'HeatShield',
    'Aft heat shield',
    3,
    48,
    'Spacecraft',
    'The broad ablative face met the atmosphere on return from the Moon.',
    'Apollo 8 crossed the entry interface at more than 36,000 feet per second. The model shows the nominal spherical surface before flight.',
  ),
];

const serviceParts: Part[] = [
  service(
    'ServiceModule',
    'Service module 103',
    'Six sectors surround the central engine bay.',
    'Open the skin to find the propulsion tanks and electrical supplies below the crew. External radiator panels rejected heat during the long coast.',
  ),
  service(
    'ReactionControl',
    'Reaction-control quads',
    'Four clusters of four small thrusters turned and translated the spacecraft.',
    'The projecting clusters sit clear of the cylindrical service module. Nozzle positions and cant are assumed from Block II data.',
  ),
  service(
    'ServiceSumpTanks',
    'Service propulsion tanks',
    'Large tanks fill the service module sectors.',
    'The two propellants were carried separately in storage and sump tanks. The cutaway shows their reconstructed shells and mounting arrangement.',
    true,
  ),
  service(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'The fuel cells supplied electrical power and drinking water.',
    'Hydrogen and oxygen were carried in insulated tanks. The model shows their volumes and the fuel-cell installation using the shared Block II reference.',
    true,
  ),
  service(
    'ServiceHelium',
    'Helium spheres',
    'Two pressure vessels sit above the main engine.',
    'Helium supplied pressure to move propellant from the service module tanks. Fittings and finishes are estimated.',
    true,
  ),
  part(
    'ServiceEngine',
    'Service propulsion engine',
    5,
    37,
    'Spacecraft',
    'This engine slowed Apollo 8 into lunar orbit and sent it home.',
    'Both burns took place behind the Moon, out of radio contact with Earth. The bell projects below the service module into the adapter at launch.',
    true,
  ),
  {
    ...service(
      'HighGainAntenna',
      'High-gain antenna',
      'Four 31-inch reflectors carried the lunar communications link.',
      'Packed beside the engine for launch, the array swung out after the spacecraft cleared the third stage. Move the assembly slider to see it deploy. The sweep is illustrated at exhibit speed.',
      true,
    ),
    moves: [liftMove(4, 41), { kind: 'swing', node: 'HGA_Deployment', axis: [0, 0, 1], angle: Math.PI / 2, from: 0.72, to: 1 }],
  },
];

const parts: Part[] = [
  ...commandParts,
  ...serviceParts,
  part(
    'LaunchEscape',
    'Launch escape tower',
    0,
    66,
    'Launch escape system',
    'A truss carries the escape motor above the crew.',
    'During early ascent the tower could pull the command module clear. The tower and its protective cover were discarded after the first stage separated.',
  ),
  part(
    'BoostCover',
    'Boost protective cover',
    0,
    66,
    'Launch escape system',
    'The white protective shell covers the silver command module for launch.',
    'A small opening gave the commander a view through the cover. It left with the tower during ascent.',
  ),
  {
    ...rocket(
      'SpacecraftAdapter',
      'Spacecraft adapter SLA-11',
      6,
      28,
      'Four panels enclose the spacecraft engine, folded antenna and test article.',
      'At separation the four upper panels opened and were thrown clear. The slider illustrates the hinge motion and jettison with estimated travel.',
    ),
    moves: [liftMove(6, 28), ...doors],
  },
  rocket(
    'LunarTestArticle',
    'Lunar module test article LTA-B',
    6,
    28,
    'A steel cylinder rode where a lunar module would later fly.',
    'Four aluminium struts attached the instrumented mass to the adapter. Six accelerometers measured its loads. LTA-B stayed with the S-IVB after the crew departed.',
    true,
  ),
  rocket(
    'InstrumentUnit',
    'Instrument unit',
    7,
    24,
    'The shallow guidance ring sits immediately below the adapter.',
    'This ring belonged to the launch vehicle. The Apollo crew’s own guidance computer was in the command module above it.',
  ),
  rocket(
    'InstrumentUnitEquipment',
    'Instrument unit equipment',
    7,
    24,
    'Electronic equipment lines the inside wall of the ring.',
    'Four batteries sit on cold plates 4 and 5. The data adapter and computer share bay 19. Their locations follow the SA-503 flight manual, figure 7-4. The case envelopes are estimated from its drawings.',
    true,
  ),
  rocket(
    'SaturnThirdStage',
    'S-IVB third stage',
    8,
    19,
    'The third stage fired twice, first to reach Earth orbit and again to leave it.',
    'The crew spent roughly one and a half orbits checking their spacecraft before the restart. The stage carried its own auxiliary propulsion equipment.',
  ),
  rocket(
    'ThirdStageTankStructure',
    'S-IVB tanks',
    8,
    19,
    'Liquid hydrogen above liquid oxygen in a single stage.',
    'A common bulkhead separated the two cryogenic liquids. Cut away the shell to see how much of the stage the tanks occupied.',
    true,
  ),
  rocket(
    'ThirdStageEngine',
    'Third-stage J-2',
    8,
    19,
    'One bell sits beneath the narrow third stage.',
    'The engine rode inside the tapered interstage during ascent. After the second burn the spacecraft separated, turned around and looked back at the spent stage.',
    true,
  ),
  rocket(
    'SaturnInterstage',
    'S-II / S-IVB interstage',
    9,
    15,
    'A tapered skirt joins stages of two different diameters.',
    'The cone stayed with the wide second stage at separation, exposing the third stage’s single J-2.',
  ),
  rocket(
    'SaturnSecondStage',
    'S-II second stage',
    10,
    12,
    'The second stage continued the climb with five J-2 engines.',
    'Its body shared the first stage’s 33-foot diameter. The taper above it steps down to the narrower S-IVB.',
  ),
  rocket(
    'SecondStageTankStructure',
    'S-II tanks',
    10,
    12,
    'A common bulkhead divides the hydrogen and oxygen tanks.',
    'Hydrogen occupied the large forward tank. The cutaway shows the domes and the relative volumes inside the stage.',
    true,
  ),
  rocket(
    'SecondStageEngines',
    'Second-stage engine cluster',
    10,
    12,
    'Four J-2 bells surround a fifth at the centre.',
    'The cylindrical interstage enclosed this cluster at launch. The cutaway reveals the bells together beneath the aft tank.',
    true,
  ),
  rocket(
    'LowerInterstage',
    'S-IC / S-II interstage',
    11,
    6,
    'The cylindrical collar below the second stage separated in two steps.',
    'The first stage fell away before the interstage itself was released. The collar kept the same outside diameter as the stages it joined.',
  ),
  rocket(
    'SaturnFirstStage',
    'S-IC first stage',
    12,
    0,
    'The wide base of the first Saturn V to carry a crew.',
    'SA-503 had four finned engine fairings around the base. The black tracking pattern made roll visible in launch photography.',
  ),
  rocket(
    'FirstStageTankStructure',
    'S-IC tanks',
    12,
    0,
    'Separate oxygen and kerosene tanks occupy the cylindrical first stage.',
    'The oxygen tank stood above the fuel tank. The gallery cutaway reveals the rounded tank ends inside the long outer skin.',
    true,
  ),
  rocket(
    'FirstStageEngines',
    'Five F-1 engines',
    12,
    -5,
    'Five engines hang in the open below the first stage.',
    'A fixed centre engine sat between four outboard engines, each hung from a thrust post at the rim of the thrust structure. A half-cone fairing covers the head of each outboard engine and carries a fin. Together they give the first stage its flared foot.',
  ),
];

const launchVehicle = parts
  .filter((p) => p.group === 'Launch vehicle' && !['SpacecraftAdapter', 'LunarTestArticle'].includes(p.node))
  .map((p) => p.node);
const command = commandParts.map((p) => p.node);
const sm = serviceParts.map((p) => p.node);
const spec = (label: string, value: number, note: string, group = 'Launch vehicle') => ({
  group,
  label,
  value,
  unit: 'm',
  confidence: 'documented' as const,
  note,
});

const boarding: [number, number] = [-10380, -8220];

export const flight: Flight = {
  id: 'usa/apollo/apollo-8',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 8 · AS-503',
  callsign: 'Apollo 8',
  spacecraft: 'CSM-103 · Block II',
  launchVehicle: 'Saturn V · SA-503',
  launch: '1968-12-21T12:51:00Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  opens: { at: boarding[0], model: 'pad', view: 'launcher' },
  site: LC39A,
  weather: WEATHER,
  plan: { ...PLAN, aloft: WEATHER.aloft },
  flies: saturnVFlies(PLAN, launchVehicle),
  crew: ['Frank Borman', 'James A. Lovell Jr.', 'William A. Anders'],
  summary:
    'The first people to orbit the Moon flew there in a command and service module. Inside the adapter beneath them rode an instrumented steel cylinder. They circled the Moon ten times before turning for home.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-103 · LTA-B in adapter SLA-11' },
    { label: 'Lunar orbit', value: '10 revolutions' },
    { label: 'Return', value: 'Pacific Ocean · 27 December 1968' },
  ],
  timeline: [
    { t: 0, event: 'Liftoff from Pad 39A' },
    { t: 684.98, event: 'S-IVB first cutoff' },
    { t: 10565.51, event: 'Translunar injection' },
    { t: 12059.3, event: 'CSM separates from S-IVB' },
    { t: 3 * 3600 + 40 * 60 + 1, event: 'First separation manoeuvre' },
    { t: 4 * 3600 + 45 * 60 + 1, event: 'Second separation manoeuvre, radially upward' },
    { t: 10 * 3600 + 59 * 60 + 59.5, event: 'First midcourse correction' },
    { t: 60 * 3600 + 59 * 60 + 55.9, event: 'Second midcourse correction' },
    { t: 69 * 3600 + 8 * 60 + 20.4, event: 'Lunar orbit insertion burn begins' },
    { t: 73 * 3600 + 35 * 60 + 6.6, event: 'Lunar orbit circularized' },
    { t: 89 * 3600 + 19 * 60 + 16.6, event: 'Transearth injection burn begins' },
    { t: 103 * 3600 + 59 * 60 + 54, event: 'Third midcourse correction' },
    { t: 146 * 3600 + 28 * 60 + 48, event: 'Service module jettison' },
    { t: 146 * 3600 + 46 * 60 + 12.8, event: 'Entry interface' },
    { t: 147 * 3600 + 42, event: 'Pacific splashdown' },
  ],
  flownNote:
    'The run flies the whole flight on its own forces: the Saturn V to the translunar injection, the spacecraft parting from the S-IVB, each firing after it solved as it lights on the state the run is in (the corrections for the pericynthion each reached on the day, the lunar orbit’s burns for its orbits, the return’s for the entry interface), ten revolutions in the Moon’s field, and the entry steered by the computer to its target. The record’s impulses are what each firing is held to. The S-IVB’s evasive manoeuvre and slingshot are not flown.',
  specs: [
    spec('Height on the pad', 363 * FT, `${kit}p. 38, rounded assembled height to escape tower tip`),
    spec('S-IC stage length', 138 * FT, `${kit}p. 38, rounded envelope`),
    {
      group: 'Launch vehicle',
      label: 'F-1 maximum nozzle exit diameter',
      value: 139 * IN,
      unit: 'm',
      confidence: 'assumed',
      note: 'Rocketdyne F-1 engine fact sheet R-1, Saturn V News Reference: 11 ft 7 in maximum exit diameter. Engine type figure assumed for SA-503.',
    },
    spec('S-IC fin span', 63 * FT, 'MSFC-MAN-503 Fig. 1-3 p. 1-6, base diameter including fins'),
    spec('S-IC body diameter', 33 * FT, `${kit}p. 38, excluding fins and fairings`),
    spec('S-II stage length', 81.5 * FT, `${kit}p. 39, rounded envelope`),
    spec('S-IVB stage length', (58 * 12 + 5) * IN, `${kit}p. 40`),
    spec('S-IVB body diameter', 260 * IN, `${kit}p. 40`),
    spec('Adapter length', 28 * FT, `${kit}p. 34, axial envelope`),
    spec('Command module base diameter', 154 * IN, `${kit}p. 33`, 'Spacecraft'),
    spec('Service module diameter', 154 * IN, `${kit}p. 34`, 'Spacecraft'),
    {
      group: 'Spacecraft',
      label: 'Length from engine exit to forward shield',
      value: 406.25 * IN,
      unit: 'm',
      confidence: 'derived',
      note: 'Nominal Block II stack: engine exit XA706 to CM datum XA1000 plus Xc112.25 in to the shield. Shared drawing stations, not an as-built CSM-103 inspection.',
    },
    {
      group: 'Spacecraft',
      label: 'Forward hatch interface diameter',
      value: 30 * IN,
      unit: 'm',
      confidence: 'assumed',
      note: 'Common Block II forward tunnel opening, NAA Apollo Operations Handbook; assembly changed on CM-103, mission report Fig. A.1-1',
    },
    {
      group: 'Spacecraft',
      label: 'Antenna deployment plane',
      value: 52.25,
      unit: 'deg',
      confidence: 'documented',
      note: 'MSC-PA-R-69-1 Fig. A.1-5, clockwise from −Y toward +Z in the service module end view',
    },
    {
      group: 'Spacecraft',
      label: 'Antenna deployment travel',
      value: 90,
      unit: 'deg',
      confidence: 'documented',
      note: `${kit}p. 36, deployed at right angles to spacecraft longitudinal axis`,
    },
    {
      group: 'Launch vehicle',
      label: 'LTA-B cylinder diameter',
      value: 150 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'M-932-68-08 Fig. 5 p. 34, cylinder width measured against the 260-in adapter ring in the elevation',
    },
    {
      group: 'Launch vehicle',
      label: 'LTA-B cylinder height',
      value: 113 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: 'M-932-68-08 Fig. 5 p. 34, cylinder height measured against the 260-in adapter ring',
    },
    spec('S-IC / S-II separation station', 1564 * IN, 'MSFC-MAN-503 p. 5-24, vehicle station in inches above Saturn station zero'),
    spec('S-II / lower interstage separation station', 1760 * IN, 'MSFC-MAN-503 p. 5-24, vehicle station in inches'),
    spec('S-II forward station', 2519 * IN, 'MSFC-MAN-503 Fig. 5-1, vehicle station in inches'),
    spec('S-IVB aft interstage length', 19 * FT, 'MSFC-MAN-503 Fig. 6-1, rounded length'),
    spec('High-gain reflector diameter', 31 * IN, `${kit}p. 36`, 'Spacecraft'),
    {
      group: 'Launch vehicle',
      label: 'Mass at liftoff',
      value: 6133880 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: 'NASA TM X-70154, Apollo 8 space vehicle and pre-launch data p. 55: 6,133,880 lb at liftoff',
    },
    {
      group: 'Spacecraft',
      label: 'CSM mass in orbit (first lunar coast)',
      value: 46743 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: 'NASA TM X-70154, Apollo 8 space vehicle and pre-launch data p. 55: 46,743 lb placed in lunar orbit',
    },
    {
      group: 'Mission',
      label: 'Apogee of Earth parking orbit',
      value: 99.99 * 1852,
      unit: 'm',
      confidence: 'documented',
      note: `${record}, Earth Orbit, 99.99 nautical miles above the reference Earth`,
    },
    {
      group: 'Mission',
      label: 'Perigee of Earth parking orbit',
      value: 99.57 * 1852,
      unit: 'm',
      confidence: 'documented',
      note: `${record}, Earth Orbit, 99.57 nautical miles`,
    },
    {
      group: 'Mission',
      label: 'Period in Earth parking orbit',
      value: 89.19 * 60,
      unit: 's',
      confidence: 'documented',
      note: `${record}, Earth Orbit, 89.19 minutes as printed. An orbit of the apsides it gives takes 88.2 minutes.`,
    },
    {
      group: 'Mission',
      label: 'Inclination of Earth parking orbit',
      value: 32.509,
      unit: 'deg',
      confidence: 'documented',
      note: `${record}, Earth Orbit, insertion conditions`,
    },
    {
      group: 'Mission',
      label: 'First lunar orbit high point',
      value: 168.5 * 1852,
      unit: 'm',
      confidence: 'documented',
      note: `${record}, Lunar Orbit, 168.5 nautical miles after insertion`,
    },
    {
      group: 'Mission',
      label: 'First lunar orbit low point',
      value: 60 * 1852,
      unit: 'm',
      confidence: 'documented',
      note: `${record}, Lunar Orbit, 60.0 nautical miles after insertion`,
    },
    {
      group: 'Mission',
      label: 'Duration of flight',
      value: 147 * 3600 + 42,
      unit: 's',
      confidence: 'documented',
      note: `${record}, Recovery`,
    },
  ],
  motors: [
    // Nominal ratings from the SA-503 stage table. Burn times are the flight record for the named event.
    ...(
      [
        ['F-1 · centre', 1, SA503_THRUST.f1, 132.52, 'RP-1 / liquid oxygen'],
        ['F-1 · outboard', 4, SA503_THRUST.f1, 160.41, 'RP-1 / liquid oxygen'],
        ['J-2 · second stage', 5, SA503_THRUST.sii, 367.85, 'Liquid hydrogen / liquid oxygen'],
        ['J-2 · third stage, first burn', 1, SA503_THRUST.sivb, 156.69, 'Liquid hydrogen / liquid oxygen'],
      ] satisfies [string, number, Measure, number, string][]
    ).map(([name, count, thrust, burnS, propellant]) => ({
      name,
      count,
      thrustN: thrust.value,
      burnS,
      propellant,
      confidence: thrust.confidence,
      note: `${thrust.source}, nominal thrust. SP-4029, Apollo 8 Ascent Phase, event duration.`,
    })),
    {
      name: 'Service propulsion engine · lunar orbit insertion',
      count: 1,
      thrustN: CSM103_THRUST.sps.value,
      burnS: 246.9,
      propellant: 'Aerozine 50 / nitrogen tetroxide',
      confidence: 'documented',
      note: 'Press kit p. 34, nominal 20,500 lbf. SP-4029, Lunar Orbit, duration of the first lunar insertion burn.',
    },
    {
      name: 'Service module attitude thruster',
      count: 16,
      thrustN: CSM103_THRUST.smRcs.value,
      propellant: 'MMH / nitrogen tetroxide',
      confidence: 'documented',
      note: 'Press kit p. 35, four quads of four 100-lbf thrusters.',
    },
    {
      name: 'Command module attitude thruster',
      count: 12,
      thrustN: CSM103_THRUST.cmRcs.value,
      propellant: 'MMH / nitrogen tetroxide',
      confidence: 'documented',
      note: 'Press kit p. 35, two independent six-engine systems rated at 94 lbf per engine.',
    },
  ],
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 8 · Saturn V',
      url: 'models/usa/apollo/apollo-8/vehicle.glb',
      backdrop: 'ground',
      cutaway: true,
      ...cabin,
      // PAO launch transcript, tape 10: first entry at 04:58 EST, hatch closed at 05:34.
      seats: [
        { node: 'Seat_Commander', figure: 'crew', label: 'Borman’s left couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_CommandModulePilot', figure: 'pilot', label: 'Lovell’s centre couch', from: 'SideHatch', open: boarding },
        { node: 'Seat_LunarModulePilot', figure: 'lmp', label: 'Anders’s right couch', from: 'SideHatch', open: boarding },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip · rounded flight envelope',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: launchVehicle },
        { id: 'escape', label: 'Escape system', nodes: ['LaunchEscape', 'BoostCover'] },
        { id: 'spacecraft', label: 'Spacecraft', nodes: [...command, ...sm] },
        { id: 'cabin', label: 'Command module', nodes: command, from: [1, 0.3, 0.3] },
        {
          id: 'console',
          label: 'Main console',
          nodes: ['MainConsole', 'FlightDirectorIndicators', 'ConsoleEquipment', 'DSKYFrontWeb'],
          isolate: true,
          from: [0.3, -1, 0],
        },
        { id: 'dsky', label: 'DSKY', nodes: ['DSKYFrontWeb'], from: [0.3, -1, 0] },
        { id: 'couches', label: 'Crew couches', nodes: ['CrewCouches'], span: 2.1, from: [-1, 0.8, 0.6] },
        { id: 'engine', label: 'Service engine', nodes: ['ServiceEngine'], from: [-1, -0.35, 1] },
        { id: 'antenna', label: 'Lunar antenna', nodes: ['HighGainAntenna'], from: [-0.75, -0.5, 0.6] },
        { id: 'lta', label: 'Lunar test article', nodes: ['LunarTestArticle'] },
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: boardingHatches(parts, boarding),
    },
    mobileLauncher(1, {
      holdDowns: 'as-503',
      firstMotion: 0.33,
      ingress: boarding[0],
      parkedBy: -3383,
      pao: 'Apollo 8 launch-day PAO commentary, crew insertion and prelaunch countdown.',
      intertankClear: -18.9,
      forwardRetract: -16.2,
      terminalSource: 'AS-503 launch vehicle evaluation, §3.6: 11.1 s to safe angle, then 2.69 s to the arm 2 command at T−16.2 s.',
    }),
    ...lc39Crew(['Borman', 'Lovell', 'Anders'], false),
  ],
};
