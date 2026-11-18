import { spiderModel, spiderPort, spiderStackParts, spiderViews } from './spider.ts';
import { probePort, cm, sm, lift, doors, rocket, part, escapeParts, nodes, specification } from '../../vehicles/stack-gallery.ts';
import { derived, doc } from '../../../../../src/measure.ts';
import type { Flight, Part } from '../../../../../src/types.ts';
import { blockIICabin } from '../../vehicles/cabin.ts';
import { APOLLO9_THRUST } from '../../vehicles/propulsion.ts';

const inch = 0.0254;
const lb = 0.45359237;
const kit = 'NASA Apollo 9 press kit, February 1969';
const time = 'NASA SP-4029, Apollo 9 timeline';
const orbit = 'NASA SP-4029, Apollo 9, Earth Orbit Phase table and p. 56';
const lm = 'Lunar module · Spider';
const ship = 'Spacecraft';
const gumdropPort = probePort(104);
const command = [
  cm(
    'CommandModule',
    'Command module 104 · Gumdrop',
    'Scott flew this spacecraft alone while Spider was away.',
    'The three crewmen returned together in this cone. Its five apertures and heat-shield profile use the common Block II reconstruction.',
  ),
  cm(
    'SideHatch',
    'Side hatch',
    'Scott opened this door in orbit while Schweickart stood on Spider’s porch.',
    'The hatch opened outward. Its inner structure, latches and circular pressure window can be inspected separately from the cabin skin.',
  ),
  cm(
    'CabinStructure',
    'Pressure vessel',
    'The inner pressure shell carried the crew and their equipment.',
    'A domed aft bulkhead closes the crew compartment. The spaces outside it held recovery gear and the reaction-control system.',
    true,
  ),
  cm(
    'CabinWindows',
    'Window assemblies',
    'The two forward windows gave the pilots a view toward a docking target.',
    'The side and hatch windows on CM-104 used precured silicone seals. The glazing is shown clear.',
  ),
  cm(
    'CrewCouches',
    'Crew couches',
    'McDivitt occupied the left couch, Scott the centre and Schweickart the right.',
    'The folding frames freed room for crew transfer through the forward tunnel. Eye positions and upholstery are reconstructed.',
    true,
  ),
  cm(
    'MainConsole',
    'Main display console',
    'The central display and switch panels faced all three couches.',
    'Instrument positions follow the CM-104 design drawing V36-976021. Registration against the two attitude-indicator openings puts the independent DSKY centre within 0.72 cm.',
    true,
  ),
  cm(
    'FlightDirectorIndicators',
    'Attitude indicators',
    'Two spherical displays let the pilots read spacecraft attitude.',
    'The instruments show a fixed reference attitude. The 4.5-inch ball is the Honeywell type nominal for spacecraft 103 and later.',
    true,
  ),
  cm(
    'ConsoleEquipment',
    'Console equipment',
    'Meters and caution lamps let the crew follow propulsion, electrical power and communications.',
    'The flight qualification recorder switch position was vacant. The two high-gain antenna controls remained. The installed general-purpose timer and flight-specific panel placards await a separate reconstruction.',
    true,
  ),
  cm(
    'DSKYFrontWeb',
    'Guidance computer display and keyboard',
    'The crew addressed the guidance computer with verb and noun keys.',
    'The front face, key travel and glazing follow the programme’s equipment reconstruction. The display is unpowered.',
    true,
  ),
  cm(
    'CabinEquipmentBays',
    'Navigation station and equipment bays',
    'The navigator worked below the main console.',
    'The telescope, sextant and bay faces show the Block II installation. Cabinet depths and local fittings are estimated.',
    true,
  ),
  cm(
    'ForwardCompartment',
    'Forward tunnel and recovery equipment',
    'The docking passage ran through the centre of the parachute compartment.',
    'A removable pressure hatch closed Gumdrop’s end. After hard docking the crew took the probe and drogue inside to clear the passage.',
    true,
  ),
  {
    ...cm(
      gumdropPort.part,
      'Active docking probe',
      'Gumdrop carried the active half of the first Apollo docking in space.',
      'The probe tip entered Spider’s conical drogue. Retraction brought the two rings together so twelve perimeter latches could engage. The model uses the Block II probe’s 10-inch retraction stroke. Its support details are estimated.',
      true,
    ),
    moves: [
      lift(2, 52),
      {
        kind: 'slide' as const,
        node: gumdropPort.piston,
        by: [0, gumdropPort.captureTravel.value, 0] as [number, number, number],
        from: 0.56,
        to: 0.7,
      },
    ],
  },
  part(
    'ForwardShield',
    'Forward heat shield',
    ship,
    1,
    57,
    'This cover protected the parachutes on entry.',
    'It separated during the descent to expose the packed recovery equipment.',
  ),
  part(
    'HeatShield',
    'Aft heat shield',
    ship,
    3,
    48,
    'The broad ablative shield faced the air on return from Earth orbit.',
    'Its spherical contour follows the shared Block II structural survey.',
  ),
];
const service: Part[] = [
  sm(
    'ServiceModule',
    'Service module 104',
    'Six sectors carried the supplies for ten days in Earth orbit.',
    'The white external radiators rejected heat while Gumdrop was alone or joined to Spider.',
  ),
  sm(
    'ReactionControl',
    'Service reaction-control quads',
    'Sixteen small engines controlled attitude and translation.',
    'Their four clusters could turn Gumdrop end for end for docking or translate the spacecraft toward Spider.',
  ),
  sm(
    'ServiceSumpTanks',
    'Service propulsion tanks',
    'Fuel and oxidizer occupied separate tanks.',
    'The cylindrical module wraps around the propulsion system. Its reconstructed storage and sump tanks are visible in cutaway.',
    true,
  ),
  sm(
    'ServicePower',
    'Fuel cells and cryogenic tanks',
    'Gumdrop’s fuel cells supplied electricity and drinking water.',
    'They consumed hydrogen and oxygen stored in the service module. Spider carried its own batteries.',
    true,
  ),
  sm(
    'ServiceHelium',
    'Helium spheres',
    'Pressurized helium displaced propellant from the service-engine tanks.',
    'Two spherical vessels sit aft in the central bay. Their plumbing and mounting fittings are simplified.',
    true,
  ),
  part(
    'ServiceEngine',
    'Service propulsion engine',
    ship,
    5,
    37,
    'The crew fired this engine with both spacecraft docked.',
    'The long expansion bell projected into the adapter above Spider at launch. The final service-engine burn sent the crew home.',
    true,
  ),
  {
    ...sm(
      'HighGainAntenna',
      'High-gain S-band antenna',
      'Four dishes unfolded from beside the service-engine bell.',
      'NASA’s flight photograph of Gumdrop shows the deployed array opposite the docking probe. The common hardware uses four 31-inch reflectors.',
      true,
    ),
    moves: [lift(4, 41), { kind: 'swing', node: 'HGA_Deployment', axis: [0, 0, 1], angle: Math.PI / 2, from: 0.72, to: 1 }],
  },
];
const launcher = [
  {
    ...part(
      'SpacecraftAdapter',
      'Four-panel spacecraft adapter',
      rocket,
      6,
      28,
      'Four spring-loaded release assemblies freed the docked spacecraft from the stage.',
      'After Gumdrop separated, the upper panels opened and were jettisoned. Scott turned around and docked before extracting Spider.',
    ),
    moves: [lift(6, 28), ...doors],
  },
  part(
    'InstrumentUnit',
    'Instrument unit',
    rocket,
    7,
    24,
    'The Saturn guidance system rode above the third stage.',
    'Its computer and stable platform belonged to the launch vehicle. Each spacecraft carried an independent guidance system.',
  ),
  part(
    'InstrumentUnitEquipment',
    'Instrument unit equipment',
    rocket,
    7,
    24,
    'Guidance electronics occupied cooled panels inside the ring.',
    'SA-504 carried a reduced instrumentation installation. Equipment envelopes use the adjacent SA-503 drawings as approximations.',
    true,
  ),
  part(
    'SaturnThirdStage',
    'S-IVB-504 third stage',
    rocket,
    8,
    19,
    'This stage carried both spacecraft into Earth orbit.',
    'Following extraction, the uncrewed stage made two further burns. The stage was 58 ft 4 in long according to the Apollo 9 press kit.',
  ),
  part(
    'ThirdStageTankStructure',
    'S-IVB tanks',
    rocket,
    8,
    19,
    'Liquid hydrogen and oxygen shared an insulated bulkhead.',
    'The large forward tank held hydrogen. Common stage drawings supply the cutaway.',
    true,
  ),
  part(
    'ThirdStageEngine',
    'Third-stage J-2',
    rocket,
    8,
    19,
    'A single restartable engine powered the S-IVB.',
    'At launch its bell was enclosed by the tapered interstage. Its external contour follows the programme’s J-2 reconstruction.',
    true,
  ),
  part(
    'SaturnInterstage',
    'S-II / S-IVB interstage',
    rocket,
    9,
    15,
    'The taper steps down from the wide second stage to the S-IVB.',
    'It stayed with the S-II when the third stage separated.',
  ),
  part(
    'SaturnSecondStage',
    'S-II-4 second stage',
    rocket,
    10,
    12,
    'The first lightweight S-II carried five uprated engines.',
    'Its skirts, tanks and thrust structure were lightened, and each of its five J-2s was rated at 230,000 lbf.',
  ),
  part(
    'SecondStageTankStructure',
    'S-II tanks',
    rocket,
    10,
    12,
    'A common bulkhead kept the two cryogenic propellants apart.',
    'The domes and relative tank volumes use Saturn type stations. Internal details are assumed from the preceding flight.',
    true,
  ),
  part(
    'SecondStageEngines',
    'Five second-stage J-2 engines',
    rocket,
    10,
    12,
    'Four outboard engines surrounded the centre engine.',
    'The interstage shielded the bells on the pad. Open the cutaway to inspect the cluster.',
    true,
  ),
  part(
    'LowerInterstage',
    'S-IC / S-II interstage',
    rocket,
    11,
    6,
    'This collar fell away after first-stage separation.',
    'The staggered releases let the second stage ignite before the interstage cleared it.',
  ),
  part(
    'SaturnFirstStage',
    'S-IC-4 first stage',
    rocket,
    12,
    0,
    'The first stage carried five F-1s beneath the kerosene tank.',
    'SA-504 flew without the previous stage’s film and television cameras. Black roll markings and flags made its attitude visible from the ground.',
  ),
  part(
    'FirstStageTankStructure',
    'S-IC tanks',
    rocket,
    12,
    0,
    'The oxidizer tank stood above the kerosene tank.',
    'The intertank separated their domed ends. The cutaway follows the adjacent SA-503 structural drawing.',
    true,
  ),
  part(
    'FirstStageEngines',
    'Five F-1 engines',
    rocket,
    12,
    -5,
    'Four outer bells could gimbal around a fixed centre engine.',
    'Each outboard engine hung from a thrust post under a half-cone fin fairing. Together the F-1s produced about 7.7 million pounds of thrust at liftoff.',
  ),
];
// Table 7-I defines latitude as geodetic, and both speed and the horizontal plane of heading as inertial.
const tracked = (t: number, latitude: number, longitude: number, height: number, speed: number, flightPath: number, heading: number) => {
  const obs = (v: number) => doc(v, 'MSC-PA-R-69-2, tables 7-I and 7-II. Nautical miles and feet/s converted to SI.');
  return {
    t: obs(t),
    latitude: obs(latitude),
    longitude: obs(longitude),
    height: obs(height * 1852),
    speed: obs(speed * 0.3048),
    flightPath: obs(flightPath),
    heading: obs(heading),
  };
};
// Axial arms use the CSM XA1110.25 / LM X312.5 planes. For the first docking the LM row
// gives its centre in the mated CSM frame. Products of inertia and transverse CG offsets are omitted.
const properties = (inches: number, ixx: number, iyy: number, izz: number) => {
  const units = 0.45359237 * 9.80665 * 0.3048; // slug ft² in kg m²
  const moment = (n: number) =>
    derived(n * units, 'MSC-PA-R-69-2 table A.5-I, diagonal moments about body CG. Body +Y points along the docking axis.');
  return {
    arm: derived(
      inches * inch,
      'MSC-PA-R-69-2 table A.5-I longitudinal CG station; NASA TN D-6854 and LM structures drawing, mating plane stations',
    ),
    inertia: [moment(iyy), moment(ixx), moment(izz)] as const,
  };
};
const carrierRecord = 'AS-504 Flight Evaluation Report, table 21-14, p. 21-18. Actual at spacecraft separation.';
export const flight: Flight = {
  docking: {
    interface: 'probe',
    transpose: {
      at: 2 * 3600 + 41 * 60 + 16,
      startGap: derived(
        (1110.25 - 706) * inch,
        'CSM stations XA706–XA1110.25. The S-IVB payload arrangement puts the LM drogue just aft of the stowed service-engine bell; the bell-to-drogue clearance is neglected.',
      ),
      departing: doc(0.6 * 0.3048, 'MSC-PA-R-69-2 section 10.2.3. Indicated separation speed after the 3 s and 2 s firings.'),
      standOff: doc(60 * 0.3048, 'MSC-PA-R-69-2 section 10.2.3. Crew estimate at the end of the pitch maneuver.'),
      turnAfter: doc(15, 'MSC-PA-R-69-2 section 10.2.3. Pitch maneuver began 15 s after separation.'),
      roll: doc(60, 'MSC-PA-R-69-2 section 10.2.3. Crew rolled left after pitching around.'),
    },
    jets: [
      ...Array.from({ length: 16 }, (_, i) => ({
        body: 0 as const,
        node: 'RCS_Nozzle_' + Math.floor(i / 4) + '_' + (i % 4),
        radius: 2.8 * inch,
      })),
      ...(['I', 'II', 'III', 'IV'] as const).flatMap((quad, i) => {
        const sx = i === 0 || i === 3 ? 1 : -1,
          sz = i < 2 ? -1 : 1;
        const jets: [string, [number, number, number]][] = [
          ['U', [0, 1, 0]],
          ['D', [0, -1, 0]],
          ['F', [sx, 0, 0]],
          ['S', [0, 0, sz]],
        ];
        return jets.map(([label, direction]) => ({
          body: 1 as const,
          node: 'LM3_Thruster_' + quad + '_' + label,
          direction,
          offset: 7 * inch,
          radius: 2.5 * inch,
        }));
      }),
    ],
    controls: (() => {
      const engine = doc(100 * 4.4482216152605, 'Apollo 9 Press Kit, spacecraft reaction-control systems, 100 lbf per R-4D chamber.');
      return { ahead: engine, astern: engine, lateral: engine, attitude: engine };
    })(),
    target: 'Spider',
    targetMass: 'Lunar module mass at first docking',
    carrier: {
      mass: doc(88584, carrierRecord),
      arm: derived(
        ((73.597 - 71.727) * 103591) / (103591 - 88584),
        carrierRecord +
          ' Axial CG separation from the CSM-separated and spacecraft-separated masses and moments, neglecting intervening venting.',
      ),
      inertia: [doc(982000, carrierRecord), doc(111000, carrierRecord), doc(978000, carrierRecord)],
      extractAt: 4 * 3600 + 8 * 60 + 6,
      pulses: [
        { after: 5, seconds: 3 },
        { after: 180, seconds: 6 },
      ], // MSC-PA-R-69-2, section 10.2.3.
      nodes: [
        'SaturnThirdStage',
        'ThirdStageTankStructure',
        'ThirdStageEngine',
        'InstrumentUnit',
        'InstrumentUnitEquipment',
        'SpacecraftAdapter',
      ],
      jettisoned: ['SLA_Door_0', 'SLA_Door_1', 'SLA_Door_2', 'SLA_Door_3'],
    },
    massProperties: [
      [properties(1110.25 - 933, 31593, 74526, 79304), properties(1235.9 - 1110.25, 19996, 25372, 25117)],
      [properties(1110.25 - 961.3, 14938, 50438, 52162), properties(312.5 - 243.5, 5976, 3515, 5195)],
    ],
    fixes: [
      tracked(3 * 3600 + 60 + 59.3, 28.83, -124.36, 108.8, 25549, -0.02, 73.9),
      tracked(98 * 3600 + 30 * 60 + 51.2, 11.42, -168.72, 123.5, 25509.9, 0.03, 58.13),
    ],
    at: 3 * 3600 + 60 + 59.3,
  },
  id: 'usa/apollo/apollo-9',
  nation: 'USA',
  agency: 'NASA',
  program: 'Apollo',
  designation: 'Apollo 9 · AS-504',
  callsign: 'Gumdrop · Spider',
  spacecraft: 'CSM-104 Gumdrop · LM-3 Spider',
  launchVehicle: 'Saturn V · SA-504',
  launch: '1969-03-03T16:00:00Z',
  launchSite: 'Launch Complex 39A, Kennedy Space Center',
  crew: ['James A. McDivitt', 'David R. Scott', 'Russell L. Schweickart'],
  summary:
    'Two spacecraft flew independently in Earth orbit. McDivitt and Schweickart tested Spider’s engines and returned to Scott aboard Gumdrop using the same docking system that would bring lunar crews home.',
  facts: [
    { label: 'Spacecraft', value: 'CSM-104 and LM-3' },
    { label: 'First', value: 'Crewed flight of a lunar module' },
    { label: 'Recovery', value: 'Atlantic Ocean · 13 March 1969' },
  ],
  timeline: [
    { t: 0, event: 'Range zero, with liftoff from Pad 39A 0.7 s after it' },
    { t: 674.66, event: 'Earth orbit insertion' },
    { t: 2 * 3600 + 41 * 60 + 16, event: 'Gumdrop separates and turns to face Spider' },
    { t: 3 * 3600 + 60 + 59.3, event: 'First docking' },
    { t: 4 * 3600 + 8 * 60 + 6, event: 'Docked spacecraft extract from the S-IVB' },
    { t: 49 * 3600 + 41 * 60 + 34.5, event: 'First docked descent-engine firing' },
    { t: 72 * 3600 + 53 * 60, event: 'Spider’s forward hatch opens for EVA' },
    { t: 73 * 3600 + 49 * 60, event: 'Spider’s forward hatch closes' },
    { t: 92 * 3600 + 39 * 60 + 36, event: 'Spider undocks from Gumdrop' },
    { t: 93 * 3600 + 2 * 60 + 54, event: 'Gumdrop moves off from Spider on its service-module thrusters' },
    { t: 96 * 3600 + 58 * 60 + 15, event: 'First ascent-engine firing in rendezvous' },
    { t: 99 * 3600 + 2 * 60 + 26, event: 'Spider’s ascent stage redocks with Gumdrop' },
    { t: 101 * 3600 + 22 * 60 + 45, event: 'Ascent stage jettison' },
    { t: 241 * 3600 + 54, event: 'Atlantic splashdown' },
  ],
  specs: [
    {
      group: ship,
      label: 'Length from engine exit to docking plane',
      value: 404.25 * inch,
      unit: 'm',
      confidence: 'derived',
      note: 'Block II stations XA706 to XA1000 plus the CM docking plane at Xc110.25 in (NASA TN D-6854, fig. A-13). Excludes the projecting probe.',
    },
    specification(rocket, 'Height on the pad', 363 * 12 * inch, 'm', kit + ', Saturn V summary, 363 ft'),
    specification(rocket, 'Liftoff mass', 6397055 * lb, 'kg', 'NASA TM X-70154, Apollo 9 flight summary, 6,397,055 lb'),
    specification(rocket, 'Mass placed in Earth orbit', 292091 * lb, 'kg', 'NASA TM X-70154, Apollo 9 flight summary, 292,091 lb'),
    specification(rocket, 'S-II length', 81.5 * 12 * inch, 'm', kit + ', Saturn V summary'),
    specification(rocket, 'S-IVB length', (58 * 12 + 4) * inch, 'm', kit + ', third stage'),
    specification(rocket, 'S-IVB diameter', 260 * inch, 'm', kit + ', third stage'),
    specification(ship, 'Mass in orbit at transposition (CSM)', 59085 * lb, 'kg', 'MSC-PA-R-69-2 table A.5-I'),
    specification(ship, 'CSM mass at ignition', 59116 * lb, 'kg', 'SP-4029, Ground Ignition Weights, Apollo 9'),
    specification(
      lm,
      'Lunar module mass at first docking',
      32130 * lb,
      'kg',
      'MSC-PA-R-69-2 table A.5-I, command module transposition and docking',
    ),
    specification(lm, 'Ascent stage mass at docking', 9932 * lb, 'kg', 'MSC-PA-R-69-2 table A.5-I, docking'),
    specification(
      ship,
      'CSM mass at LM-active docking',
      26895 * lb,
      'kg',
      'MSC-PA-R-69-2 table A.5-I, command and service modules at lunar module docking',
    ),
    specification(lm, 'Lunar module launch mass', 32132 * lb, 'kg', 'MSC-PA-R-69-2 table A.5-I'),
    specification(lm, 'Ascent stage mass at staging', 10216 * lb, 'kg', 'MSC-PA-R-69-2 table A.5-I'),
    ...(
      [
        ['Height from pad plane', 277],
        ['Span across footpads', 372],
        ['Descent stage width', 166],
        ['Descent stage thickness', 68.86],
        ['Clearance beneath descent stage', 58.3],
      ] as const
    ).map(([label, value]) => specification(lm, label, value * inch, 'm', 'MSC-PA-R-69-2 fig. A.2-2')),
    specification(lm, 'Crew compartment diameter', 92 * inch, 'm', kit + ', p. 42'),
    specification(lm, 'Crew compartment depth', 42 * inch, 'm', kit + ', p. 42'),
    specification(lm, 'Forward hatch side', 32 * inch, 'm', kit + ', p. 42'),
    specification(lm, 'Tunnel diameter', 32 * inch, 'm', kit + ', p. 43'),
    specification(lm, 'Footpad diameter', 37 * inch, 'm', kit + ', p. 43'),
    {
      ...specification(lm, 'Deployed tread radius', 167.57 * inch, 'm', 'NASA TN D-6850, p. 6, type dimension applied to LM-3'),
      confidence: 'assumed',
    },
    specification('Mission', 'Apogee at insertion', 100.74 * 1852, 'm', orbit + ', nautical miles'),
    specification('Mission', 'Perigee at insertion', 99.68 * 1852, 'm', orbit + ', nautical miles'),
    specification('Mission', 'Inclination at insertion', 32.552, 'deg', orbit),
    specification('Mission', 'Period at insertion', 88.2 * 60, 's', orbit),
    specification('Mission', 'Duration of flight', 241 * 3600 + 54, 's', time),
  ],
  motors: APOLLO9_THRUST,
  models: [
    {
      id: 'vehicle',
      name: 'Apollo 9 · Saturn V',
      url: 'models/usa/apollo/apollo-9/vehicle.glb',
      backdrop: 'studio',
      cutaway: true,
      dockingPorts: [gumdropPort, spiderPort],
      ...blockIICabin(3871),
      seats: [
        { node: 'Seat_Commander', label: 'McDivitt’s left couch', from: 'SideHatch', open: [-9000, -6000] },
        { node: 'Seat_CommandModulePilot', label: 'Scott’s centre couch', from: 'SideHatch', open: [-9000, -6000] },
        { node: 'Seat_LunarModulePilot', label: 'Schweickart’s right couch', from: 'SideHatch', open: [-9000, -6000] },
      ],
      scale: '363 ft / 110.64 m to the escape tower tip',
      slider: ['Assembled', 'Taken apart'],
      views: [
        { id: 'launcher', label: 'Saturn V', nodes: nodes(launcher) },
        { id: 'escape', label: 'Escape tower', nodes: nodes(escapeParts) },
        { id: 'gumdrop', label: 'Gumdrop', isolate: true, from: [1, 0.23, -0.5], nodes: [...nodes(command), ...nodes(service)] },
        { id: 'spider', label: 'Spider in adapter', nodes: nodes(spiderStackParts), isolate: true, from: [1, 0.12, -0.25] },
        ...spiderViews.filter((v) => ['porch', 'dps', 'aps', 'drogue'].includes(v.id)),
        { id: 'probe', label: 'Gumdrop docking probe', nodes: [gumdropPort.part], span: 1.55, isolate: true, from: [1, 0.82, 0.4] },
        {
          id: 'console',
          label: 'Main console',
          nodes: ['MainConsole', 'ConsoleEquipment', 'FlightDirectorIndicators', 'DSKYFrontWeb'],
          isolate: true,
          from: [0.3, -1, 0],
        },
        { id: 'dsky', label: 'DSKY', nodes: ['DSKYFrontWeb'], from: [0.3, -1, 0] },
        { id: 'couches', label: 'Crew couches', nodes: ['CrewCouches'], span: 2.1, from: [-1, 0.8, 0.6] },
        { id: 'sps', label: 'Service engine', nodes: ['ServiceEngine'], from: [-1, -0.35, 1] },
        { id: 'antenna', label: 'S-band antenna', nodes: ['HighGainAntenna'], from: [-0.75, -0.5, 0.6] },
        { id: 'f1', label: 'F-1 cluster', nodes: ['FirstStageEngines'], from: [-0.62, 0.08, 0.78] },
      ],
      parts: [...command, ...service, ...spiderStackParts, ...escapeParts, ...launcher],
    },
    spiderModel,
  ],
};
