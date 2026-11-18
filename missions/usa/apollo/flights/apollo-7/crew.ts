import type { ModelDef, Part } from '../../../../../src/types.ts';

const parts: Part[] = [
  ['Helmet', 'Pressure helmet', 'The clear bubble locks to the blue neck ring. The communications carrier underneath holds the earphones.'],
  [
    'Torso',
    'Pressure garment',
    'The white Beta-cloth cover protects the pressure layers. Two gas connections hook the suit to the spacecraft air circuit.',
  ],
  ['Arms', 'Sleeves', 'The arms can flex inside the intravehicular pressure garment while the crew work the console.'],
  ['Gloves', 'Pressure gloves', 'Wrist disconnects let the crew take their gloves off inside the pressurized cabin.'],
  ['Legs', 'Trousers', 'Pockets keep equipment within reach when the crew are strapped into their couches.'],
  ['Boots', 'Boots', 'The pressure garment encloses the feet. The intravehicular configuration flew throughout this Earth-orbit mission.'],
].map(([node, name, detail], order) => ({
  node: node!,
  name: name!,
  summary: name!,
  detail: detail!,
  order,
  explode: [0, node === 'Helmet' ? 0.4 : 0, 0],
}));

export const seatedHead = (who: string) =>
  ['Head', 'Eyes', 'Irises', 'Brows', 'Lips', 'Cap', 'PressureBubble', 'NeckRing', 'Earphones'].map((name) => `Crew_${who}_Helmet_${name}`);

export function crewModels(at: [number, number, number], boardAt: number): ModelDef[] {
  return [
    ['crew', 'Schirra', 'Commander'],
    ['pilot', 'Eisele', 'Command module pilot'],
    ['lmp', 'Cunningham', 'Lunar module pilot'],
  ].map(([id, who, role], i) => ({
    id: id!,
    name: role!,
    scale: `${who} in his A7L suit · estimated fit`,
    url: `models/usa/apollo/apollo-7/${id}.glb`,
    backdrop: 'ground',
    parts,
    position: [at[0] + i * 0.85, at[1], at[2]],
    walker: { eyes: 'Helmet_Eyes', forward: [0, 1] },
    home: 'figure',
    views: [{ id: 'figure', label: who!, centreY: 0.94, span: 2.45, from: [-0.6, 0.08, -0.8] }],
    with: [{ model: 'pad', at: boardAt }],
  }));
}
