import type { Motor } from '../../../../src/types.ts';

const lbf = 4.4482216152605;
const handbook = 'Skylab Operations Handbook, CSM 116–118, vol. I';
export const spacecraftMotors: Motor[] = [
  {
    name: 'Service propulsion engine',
    count: 1,
    thrustN: 20500 * lbf,
    propellant: 'Aerozine 50 / nitrogen tetroxide',
    operation: 'Rendezvous and deorbit',
    confidence: 'assumed',
    note: `${handbook}, §2.4. The nominal Block II thrust comes from the Apollo 17 press kit, p. 98.`,
  },
  {
    name: 'SM attitude thruster',
    count: 16,
    thrustN: 100 * lbf,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'assumed',
    note: `${handbook}, §2.5. Four quads of four jets. Nominal thrust from the Apollo 13 press kit, p. 82.`,
  },
  {
    name: 'CM attitude thruster',
    count: 12,
    thrustN: 93 * lbf,
    propellant: 'MMH / nitrogen tetroxide',
    confidence: 'assumed',
    note: `${handbook}, §2.5. Two independent entry systems. Nominal thrust from the Apollo 13 press kit, p. 82.`,
  },
];
for (const [name, pounds, seconds] of [
  ['Launch escape motor', 147000, 8],
  ['Pitch control motor', 2850, 0.6],
  ['Tower jettison motor', 32000, 1.1],
] as const) {
  spacecraftMotors.push({
    name,
    count: 1,
    thrustN: pounds * lbf,
    burnS: seconds,
    propellant: 'Ammonium perchlorate / polysulphide',
    kind: 'solid',
    confidence: 'documented',
    note: `${handbook}, §2.9.9.2, pp. 2.9-101–102. Nominal resultant thrust at sea level and 70 °F.`,
  });
}
