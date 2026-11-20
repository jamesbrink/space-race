import type { ChuteDef, Command, Flight, Measure } from '../../../../src/types.ts';
import { BOOSTERS, fairingDrops } from '../../vostok/vehicles/vostok-8k72k.ts';
import { AFT_SECTORS } from '../../voskhod/vehicles/voskhod-11a57-flown.ts';
import { SHIP_0 } from './soyuz-11a511-flown.ts';
import { ORBITAL_MODULE, SKD } from './soyuz-plan.ts';
import type { SoyuzRecord } from './soyuz-record.ts';

export { commanded } from '../../vostok/vehicles/vostok-flies.ts';

/**
 * A Soyuz on its 11A511 as the scene shows it flown (types.ts `Flight.flies`), and what a hand can ask of each part of it in
 * flight (`Part.commands`): the same for every flight of the type, each giving its own record (`orbital`, whose instants
 * place every drop) and what did each thing on its day. The node names are the models' (soyuz_11a511.py, soyuz_7kok.py):
 * the strap-ons, the core and its lattice, Block I and its aft section as the Voskhod's; the escape tower; the fairing's
 * halves; the three modules; the parachute container's cover and the heat shield.
 */

/**
 * The main parachute container's cover: a node of its own in every ship's model (soyuz_7kok.py `descent`, which builds
 * the descent module of the 7K-OK, 7K-OKS, 7K-T, 7K-TM and 7K-ST alike), its origin on its seat and its +Y out along its axis.
 */
export const PARACHUTE_COVER = 'ParachuteCover';

/** What did each of the descent's events on a flight's day, for the labels of the commands a hand can give in its place. */
export interface DescentWords {
  /** What parted the modules ("on the day the sequence did, after the burn"). */
  parted: string;
  /** The crew, as the labels speak of them. */
  crew: string;
  /** The parachute container's cover, shot off at a height. */
  cover: string;
}

/** The commands on each part of the vehicle by its node (orbitdeck.ts `can`, `ask`; main.ts `stage.onSpot`). */
export function soyuzCommands(day: DescentWords): Record<string, Command[]> {
  const OVER = `${day.crew} had no say over the launch vehicle: this takes the flight over`;
  const part: Command = { label: `Part the modules (automatic: ${day.parted})`, ask: 'descent:modules' };
  const cover: Command = { label: `Shoot off the parachute container’s cover (automatic: ${day.cover})`, ask: 'descent:cover-off' };
  const chutes: Command[] = [
    { label: 'Drogue parachute (automatic: with the cover)', ask: 'descent:module/drogue parachute' },
    { label: 'Main parachute (automatic: after the drogue)', ask: 'descent:module/main parachute' },
  ];
  const core: Command[] = [
    { label: `Cut off the core (${OVER})`, ask: 'step:cut:1' },
    { label: `Drop the core (${OVER})`, ask: 'step:separate:1' },
  ];
  const separate: Command = { label: `Separate the spacecraft (${OVER})`, ask: 'step:separate:2' };
  const engine: Command = { label: 'Fire the main engine along the long axis (by hand, the ship turned tail first)', ask: 'retro' };
  return {
    DescentModule: [part, cover, ...chutes],
    [PARACHUTE_COVER]: [cover, ...chutes],
    OrbitalModule: [part],
    ServiceModule: [separate, part, engine],
    EscapeTower: [{ label: `Drop the escape tower (${OVER})`, ask: 'step:drop:escape-tower' }],
    Fairing: [{ label: `Drop the fairing (${OVER})`, ask: 'step:drop:fairing' }],
    BlockI: [
      {
        label: `Light the third stage: hot staging, through the lattice with the core still on, as it flew (${OVER})`,
        ask: 'step:ignite:2',
      },
      { label: `Cut off the third stage (${OVER})`, ask: 'step:cut:2' },
      separate,
    ],
    AftSection: [{ label: `Drop the third stage’s aft section (${OVER})`, ask: 'step:drop:aft-section' }],
    CoreStage: core,
    CoreEngine: core,
    ...Object.fromEntries(
      BOOSTERS.map(([letter]) => [`Booster_${letter}`, [{ label: `Drop the strap-ons (${OVER})`, ask: 'step:separate:0' }]]),
    ),
  };
}

const chosen = (value: number, source: string): Measure => ({ value, confidence: 'estimated', source });

/**
 * The descent module's parachutes as drawn (viewer/chute.ts), each on the module's body of `orbital.descent` (flown there):
 * a flat round canopy of each one's area as the record gives it, every other figure of their making chosen and said so.
 * Both are made fast at the descent module's top.
 */
export function soyuzChuteLooks(areas: { name: string; area: Measure }[]): ChuteDef[] {
  return areas.map(({ name, area }): ChuteDef => {
    const big = area.value > 100;
    const across = Math.sqrt((4 * area.value) / Math.PI);
    return {
      on: name,
      body: 'module',
      at: 'DescentModule',
      cut: 'solid',
      diameter: {
        value: across,
        confidence: area.confidence === 'documented' ? 'derived' : area.confidence,
        source: `${area.value} m² of canopy laid flat as a circle (${area.source})`,
      },
      gores: chosen(big ? 40 : 12, 'not read: drawn so'),
      lines: chosen(big ? 0.85 * across : across, 'not read: a little under its diameter'),
      riser: chosen(big ? 6 : 8, 'not read: clear of the module'),
      colours: {
        value: big ? ['#e2622b', '#f0ece2'] : ['#f0ece2'],
        confidence: 'estimated',
        source: 'not read: orange and white, as the Soyuz canopies are seen in the photographs of the landings',
      },
    };
  });
}

/**
 * The nodes of the ship's model that leave with the orbital module and with the instrument module as the modules part: each
 * flight's model has its own fittings (Soyuz 1's has no infrared vertical or signal lamps, Soyuz 4's the spacewalk handrails).
 */
export interface ShipNodes {
  orbital: string[];
  instrument: string[];
  /** The main engine's bell, whose fire burns from it, and its exit radius, m: the KTDU-35's (`KTDU_Bell0`, 230 mm) unless the ship's is another. */
  engine?: { node: string; radius: number };
  /** What the ship let go in orbit (the record's `ascent.drops` of that id: Soyuz 16's docking ring), and the model's nodes that are it. */
  jettisoned?: { id: string; nodes: string[] }[];
}
/** The 7K-OK's as soyuz_7kok.py builds Soyuz 3. */
export const SHIP_NODES: ShipNodes = {
  orbital: ['OrbitalModule', 'DockingProbe', 'Igla', 'RendezvousLights'],
  instrument: ['ServiceModule', 'InfraredVertical', 'SolarLeft', 'SolarRight'],
};

/**
 * The flight in the scene (`Flight.flies`): the stack off the pad as staged.ts flies it, and what leaves it, each flown on (the
 * record's `ascent.sheds`) or, for the cover and the heat shield, carried on its descent body. The crew stays in the descent
 * module. Every instant is the flight's own record's; the ship's nodes are its model's (`ship`).
 */
export function soyuzFlies(orbital: SoyuzRecord, chutes: ChuteDef[], ship: ShipNodes = SHIP_NODES): NonNullable<Flight['flies']> {
  const at = (id: string) => orbital.events.find((e) => e.id === id)!.at.value;
  const drop = (id: string) => orbital.ascent!.drops.find((d) => d.id === id)!.at.value;
  // (the heat shield goes as the main parachute comes out: so long after the cover)
  const main = orbital.descent?.bodies[0]?.chutes.find((c) => c.name === 'main parachute')?.after?.value ?? 0;
  return {
    model: 'vehicle',
    datum: SHIP_0,
    // Every engine's fire from its own nozzles: the strap-ons' RD-107s and the core's RD-108 from the pad, Block I's RD-0110
    // from its four chambers and four steering nozzles (the viewer finds them in the bells' geometry, viewer/fires.ts), and
    // the main engine's from its bell (230 mm at its exit: estimated, soyuz_7kok.py). Each burns what its engine burned.
    fires: [
      ...BOOSTERS.map(([letter]) => ({ node: `RD107_${letter}_Bells`, on: 'stage:0', burns: 'kerosene-lox' as const })),
      { node: 'RD108_Bells', on: 'stage:1', burns: 'kerosene-lox' },
      { node: 'RD0110_Bells', on: 'stage:2', burns: 'kerosene-lox' },
      { node: ship.engine?.node ?? 'KTDU_Bell0', radius: ship.engine?.radius ?? 0.23, on: SKD, burns: 'amine-nitric' },
    ],
    drops: [
      // each by the plan's joint that lets it go (vostok-plan.ts: a stage's is `stage:<i>`); each strap-on a body of its own
      ...BOOSTERS.map(([letter]) => ({ at: orbital.stages[0]!.separation!.value, nodes: [`Booster_${letter}`], on: `stage:0/${letter}` })),
      { at: drop('escape-tower'), nodes: ['EscapeTower'], on: 'escape-tower' },
      ...fairingDrops(drop('fairing')),
      { at: orbital.stages[1]!.separation!.value, nodes: ['CoreStage', 'CoreEngine', 'Interstage'], on: 'stage:1' },
      ...AFT_SECTORS.map((piece) => ({ at: drop('aft-section'), nodes: [`AftSection_${piece}`], on: `aft-section/${piece}` })),
      { at: orbital.stages[2]!.separation!.value, nodes: ['BlockI'], on: 'stage:2' },
      // the orbital and the instrument modules, let go together as the modules part (the orbital module before the braking
      // burn, where the record has it go in orbit)
      { at: (orbital.modules.parted ?? orbital.entry.separation).value, nodes: ship.orbital, on: ORBITAL_MODULE },
      { at: orbital.entry.separation.value, nodes: ship.instrument, on: 'modules' },
      // what the ship let go in orbit that was no part of either (Soyuz 16's docking ring), each on its own body
      ...(ship.jettisoned ?? []).map((j) => ({ at: drop(j.id), nodes: j.nodes, on: j.id })),
      // the cover, shot off at the height the coast hands over at, and the heat shield, let go under the main parachute,
      // each comes down on its own body (a descent whose shield stayed on has no body for it, and the module keeps it)
      { at: at('cover-off'), nodes: [PARACHUTE_COVER], on: 'cover', rides: [{ body: 'cover' }] },
      ...(orbital.descent?.bodies.some((b) => b.id === 'shield')
        ? [{ at: at('cover-off') + main, nodes: ['SA_Shield'], on: 'shield', rides: [{ body: 'shield' }] }]
        : []),
    ],
    chutes,
    // the shock layer stands off the descent module's heat shield
    air: { shield: 'DescentModule' },
  };
}
