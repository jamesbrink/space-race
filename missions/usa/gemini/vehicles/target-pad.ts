import type { ModelDef, Move, Part } from '../../../../src/types.ts';
import { LAUNCHER_TOP } from '../../places/cape-canaveral/lc-14.parts.ts';
import type { targetLaunches } from './target-launches.ts';

const IN = 0.0254;
const exterior = (node: string, name: string, summary: string, detail: string): Part => ({
  node,
  name,
  summary,
  detail,
  order: 0,
  explode: [0, 0, 0],
});

/**
 * The umbilical boom drawn back from the vehicle at liftoff, about its foot on the tower: 12 degrees in a second, which
 * takes its tip from 3 ft off the axis to 16 ft before the Atlas, 5 ft in radius, comes up through where it stood.
 * Estimated throughout: nothing read says how the boom cleared the vehicle, only that it stood beside the Agena
 * (NASA 66-H-989) and that the Atlas passed (lc-14.md). The axis is level and square to the boom's reach.
 */
const BOOM_BACK: Move = {
  kind: 'swing',
  node: 'AgenaUmbilicalTower_Boom',
  axis: [0.881, 0, -0.472],
  angle: (12 * Math.PI) / 180,
  from: 0,
  to: 1,
  machine: {
    kind: 'release',
    confidence: 'estimated',
    source: 'the boom stands beside the Agena in NASA 66-H-989: how it was drawn clear at liftoff is not in anything read',
  },
};

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch Complex 14',
  url: 'models/usa/places/cape-canaveral/lc14/1965-10-pad.glb',
  backdrop: 'ground',
  scale: '101 ft from the stand deck to the top of the target umbilical tower',
  parts: [
    {
      ...exterior(
        'AgenaUmbilicalTower',
        'Target umbilical tower',
        'A narrow 101-foot tower served the Gemini targets.',
        'Complex 14 lost its Mercury escape gangway when it was rebuilt. The replacement has upper galleries and a long jointed boom, both visible in NASA’s photographs of the Gemini VIII launch and the Gemini X pad tests. The platform widths and access ladder are estimates. The boom reaches to the Agena, inside the width of the Atlas below it, so it is drawn back as the vehicle lifts: that it went so, how far and how fast are estimated.',
      ),
      clocked: [BOOM_BACK],
    },
    exterior(
      'ServiceStructure',
      'Mobile service structure',
      'The tall gantry stands clear of the Atlas on its transfer table.',
      'It rolled north from the stand, then the table carried it east. The Gemini conversion included a spacecraft clean room. Its outer panels are reconstructed from the Gemini X photograph.',
    ),
    exterior(
      'LaunchStand',
      'Launch stand',
      'The deck stands 22 feet above the apron.',
      'A steel-framed platform and the concrete ramp supported the launcher. Their dimensions come from the Historic American Engineering Record for Complex 14.',
    ),
    exterior(
      'Launcher',
      'Atlas launcher',
      'The Atlas rests on the launcher above the deck.',
      'Its position is taken from the Complex 14 record. The detailed shapes of the cradle and arms follow the earlier Mercury configuration.',
    ),
    exterior(
      'FlameDeflector',
      'Flame deflector',
      'A curved deflector fills the space beneath the Atlas.',
      'It turned the exhaust toward the flume beyond the stand. The shared structure follows the Complex 14 survey.',
    ),
  ],
  views: [
    { id: 'tower', label: 'Umbilical tower', nodes: ['AgenaUmbilicalTower'], from: [1, 0.18, 1] },
    { id: 'gantry', label: 'Parked gantry', nodes: ['ServiceStructure'], from: [1, 0.2, 1] },
    { id: 'stand', label: 'Stand', nodes: ['LaunchStand', 'Launcher'], from: [1, 0.35, 0.7] },
  ],
};
type Launch = (typeof targetLaunches)[keyof typeof targetLaunches];
export function targetSiteModels(id: string, record: Launch): ModelDef[] {
  const augmented = id === 'atda';
  const target = augmented
    ? ['AtdaEquipmentSection', 'AtdaRunningLights']
    : ['AgenaTankSection', 'AgenaForwardSection', 'AgenaRunningLights'];
  const parts: Part[] = [
    exterior(
      'AtlasTank',
      'Atlas SLV-3 ' + record.atlas,
      'The ten-foot-diameter Atlas below the target.',
      'The nose narrows to the target adapter. The Atlas dimensions follow the mission report’s launch outline. Smaller exterior fittings are reconstructed from the earlier Atlas.',
    ),
    exterior(
      'AtlasPods',
      'Equipment pods',
      'Long housings flank the Atlas.',
      'Their unequal lengths and the conduit running up the side give the Atlas a different silhouette from each direction. The placement is assumed from the earlier Atlas exterior.',
    ),
    exterior(
      'AtlasBoosterSection',
      'Booster fairings',
      'The base spreads outward on two sides.',
      'The raised nacelles and corrugated skirt are assumed from the Mercury Atlas. The Gemini mission drawings show the same distinctive outline.',
    ),
    exterior(
      'AtlasBoosterEngines',
      'Outer nozzle exits',
      'Two nozzle exits are visible below the fairings.',
      'The walk-around shows their outer surfaces as they appeared beneath the launcher.',
    ),
    exterior(
      'AtlasSustainer',
      'Central nozzle exit',
      'A third exit stands between the outer pair.',
      'It can be seen between the two large side nacelles when viewed from beneath the stand.',
    ),
    exterior(
      'AtlasVerniers',
      'Side fairings',
      'Two small fairings are set across the line of the main pods.',
      'The exposed shape follows the earlier Atlas model.',
    ),
    exterior(
      'AtlasTargetAdapter',
      'Target adapter',
      'The dark adapter joins the target to the narrower top of the Atlas.',
      augmented
        ? 'This was the special adapter for the shorter ATDA. Its height comes from Figure 3.0-2 of the Gemini IX-A mission report.'
        : 'The Agena’s aft rack and nozzle rode inside the adapter. Its outline follows Figure 3.0-2 of the Gemini VIII mission report.',
    ),
    exterior(
      'TargetCollar',
      'Docking adapter collar',
      'An outer collar lies below the white nose shroud.',
      'The collar covers the docking equipment that the gallery shows exposed.',
    ),
    exterior(
      'TargetAscentShroud',
      'Closed nose shroud',
      'The white shroud covered the docking cone on the pad.',
      augmented
        ? 'Both halves were closed at launch. The gallery shows their position when Stafford and Cernan found them still attached in orbit.'
        : 'The shroud hid the docking cone on the pad. The gallery shows the exposed spacecraft hardware separately.',
    ),
  ];
  if (augmented)
    parts.push(
      exterior(
        target[0]!,
        'ATDA equipment section',
        'The silver equipment section sits above the special adapter.',
        'This shorter target had no Agena below the collar.',
      ),
    );
  else
    parts.push(
      exterior(
        'AgenaAftSection',
        'Agena aft rack',
        'The open frame round the engine rode inside the dark adapter.',
        'It is out of sight on the pad. It left the adapter with the Agena when the two retrorockets on the adapter pulled the Atlas back.',
      ),
      exterior(
        'AgenaSecondaryPropulsion',
        'Secondary propulsion modules',
        'Two small engines on the rack settled the propellants before the main engine started.',
        'They fired for twenty seconds before the main engine on each ascent.',
      ),
      exterior(
        'AgenaEngine',
        'Agena main engine',
        'The engine that put the Agena in orbit, hidden in the adapter at launch.',
        'It was started about seventy seconds after the Agena left the Atlas and burned for three minutes.',
      ),
      exterior(
        target[0]!,
        'Agena tank section',
        'The slender body of the Agena stands above the Atlas adapter.',
        'The outer fittings and paint follow this target’s own gallery model.',
      ),
      exterior(
        target[1]!,
        'Agena forward section',
        'The forward section carries the docking adapter.',
        'Its skin and markings are those of this target’s gallery exhibit.',
      ),
    );
  parts.push(
    exterior(
      target.at(-1)!,
      'Running lights',
      'Rings of lights marked the target in orbit.',
      'The lamp housings can be examined on the assembled stack.',
    ),
  );
  const height = (augmented ? 808 + 198.38 + 139.17 : 1244.2) * IN;
  return [
    {
      id: 'vehicle',
      name: 'Atlas ' + record.atlas,
      url: 'models/usa/gemini/' + id + '/atlas.glb',
      backdrop: 'ground',
      position: [0, LAUNCHER_TOP, 0],
      scale: height.toFixed(2) + ' m from nozzle exits to nose shroud',
      parts,
      views: [
        { id: 'atlas', label: 'Complete stack', nodes: parts.map((p) => p.node), from: [1, 0.14, 0.75] },
        {
          id: 'payload',
          label: record.name,
          nodes: [...target, 'TargetCollar', 'TargetAscentShroud', 'AtlasTargetAdapter'],
          from: [1, 0.12, 0.6],
        },
      ],
      home: 'atlas',
    },
    pad,
  ];
}
