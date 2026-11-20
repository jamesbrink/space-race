import type { Motor, Part, ViewDef } from '../../../../src/types.ts';
import { lift, part, rocket } from '../../apollo/vehicles/stack-gallery.ts';

const lbf = 4.4482216152605;
export const nominalStageMotors: Motor[] = [
  {
    name: 'H-1',
    count: 8,
    thrustN: 205000 * lbf,
    propellant: 'RP-1 / liquid oxygen',
    operation: 'Four fixed inboard and four gimballed outboard engines',
    confidence: 'documented',
    note: 'MSFC-MAN-206 §IV, engine description. Nominal sea-level rating per engine.',
  },
  {
    name: 'J-2',
    count: 1,
    thrustN: 225000 * lbf,
    propellant: 'Liquid hydrogen / liquid oxygen',
    operation: 'One orbital insertion burn',
    confidence: 'documented',
    note: 'MPR-SAT-FE-73-3, appendix B, p. B-6. Nominal vacuum thrust at the 5.5 mixture ratio.',
  },
  {
    name: 'S-IVB attitude thruster',
    count: 6,
    thrustN: 150 * lbf,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'documented',
    note: 'MSFC-MAN-206 §V, Auxiliary Propulsion System, three attitude thrusters in each of two modules.',
  },
];

export function skylabStages(serial: 206 | 207 | 208): Part[] {
  return [
    part(
      'SaturnSecondStage',
      `S-IVB-${serial} upper stage`,
      rocket,
      8,
      17,
      'A single hydrogen-burning stage delivered the crew to its rendezvous orbit.',
      'A common bulkhead separated the hydrogen and oxygen. The cylinder above the interstage carried the two attitude-control modules and the three small rockets that settled the propellants at staging. The flight evaluation records a single J-2 burn.',
    ),
    part(
      'SecondStageTankStructure',
      'S-IVB tank structure',
      rocket,
      8,
      17,
      'The hydrogen tank occupied most of the stage; helium bottles rode inside it.',
      'The cutaway shows the shared tank wall, baffles, helium storage and the cone carrying the J-2 thrust into the stage. Contours and pipework are reconstructed from the Douglas S-IVB drawing and the Skylab flight manual, figure 5-1.',
      true,
    ),
    ...[1, 2].map(
      (i): Part => ({
        ...part(
          `StageAttitudeModule${i}`,
          `S-IVB attitude module ${i}`,
          rocket,
          8,
          17,
          'Two 80-inch pods faced one another across the upper stage.',
          'Three small engines in each module controlled roll while the J-2 fired. In coast the modules supplied pitch and yaw as well. Each carried its own propellant and pressure supplies. The pod height, count and positions I and III come from MSFC-MAN-206 §V. The fairing sections and vessel shapes are estimated.',
        ),
        moves: [
          lift(8, 17),
          {
            kind: 'slide' as const,
            node: `SA${serial}_APSCover${i}`,
            by: [0.3, 0, 0.95] as [number, number, number],
            from: 0.72,
            to: 1,
          },
        ],
      }),
    ),
    part(
      'UllageRockets',
      'Three ullage rockets',
      rocket,
      8,
      17,
      'Three fairings around the aft skirt housed the motors that settled the upper-stage propellants.',
      'At staging the motors briefly accelerated the upper stage forward and kept the liquids at the tank outlets while the J-2 started. Their stations and contours are estimated from MSFC-MAN-206 figures 5-1 and 5-76; their 120° spacing is documented.',
    ),
    part(
      'SecondStageEngine',
      'J-2 engine',
      rocket,
      9,
      11,
      'One J-2 was recessed inside the interstage until the stages parted.',
      'The gimballed hydrogen engine steered the second stage in pitch and yaw. Its nominal thrust was 225,000 pounds-force. The nozzle, turbomachinery and lines use the Saturn IB drawing as a guide.',
      true,
    ),
    part(
      'SaturnInterstage',
      'S-IVB aft interstage',
      rocket,
      10,
      4,
      'The cylindrical skirt carried the upper stage above the eight-engine booster.',
      'Its 224.5-inch length spans stations 962.304 and 1186.804. At stage separation it stayed with the empty booster. Four external retromotors helped the stages clear.',
    ),
    part(
      'InterstageRetromotors',
      'Four interstage retromotors',
      rocket,
      10,
      4,
      'Four narrow fairings at quarter turns around the interstage covered the retro motors.',
      'The motors slowed the spent first stage as the S-IVB continued forward. The SA-206 manual describes three aerodynamic fairing sections for each installation. Their envelope and mounting heights are estimates from the published side elevation.',
    ),
    part(
      'SaturnFirstStage',
      `S-IB-${serial - 200} first stage`,
      rocket,
      11,
      0,
      `Eight outer tanks surrounded a ninth. The four fuel tanks on SA-${serial} were white.`,
      'Chrysler used a large central oxygen tank surrounded by four oxygen and four kerosene tanks. A spider beam joined the heads of the tanks. The eight fins spanned 40.7 feet. The flight manual dates the switch to white fuel tanks to SA-206.',
    ),
    part(
      'FirstStageTankStructure',
      'S-IB tank cluster and feeds',
      rocket,
      11,
      0,
      'Tank domes, baffles and the spider beam show how nine vessels made one stage.',
      'Alternating fuel and oxygen feeds ran through the tail structure to the H-1 engines. Vessel sizes and arrangement follow the Saturn IB drawings; the pipe routes and folded baffle sections are schematic.',
      true,
    ),
    part(
      'FirstStageEngines',
      'Eight H-1 engines',
      rocket,
      12,
      -4,
      'Four fixed inboard engines and four steerable outboards developed 1.64 million pounds-force at liftoff.',
      'Each engine had a nominal sea-level rating of 205,000 pounds-force. The flight evaluation records the inboards shutting down together before the four outboards. Bell contours and mounted equipment use common H-1 proportions.',
    ),
  ];
}

export const stageViews: ViewDef[] = [
  ...[1, 2].map(
    (i): ViewDef => ({
      id: i === 1 ? 'aps' : 'aps-2',
      label: `S-IVB attitude module ${i}`,
      nodes: [`StageAttitudeModule${i}`],
      onSelect: true,
      isolate: true,
      from: [0.25, 0.15, i === 1 ? 1 : -1],
    }),
  ),
  { id: 'interstage-retros', label: 'Interstage retromotors', nodes: ['InterstageRetromotors'], onSelect: true, isolate: true },
  { id: 'h1-cluster', label: 'Eight H-1 engines', nodes: ['FirstStageEngines'], onSelect: true, isolate: true, from: [0.5, -1, 0.7] },
  { id: 'j2', label: 'J-2 engine', nodes: ['SecondStageEngine'], onSelect: true, isolate: true },
];
