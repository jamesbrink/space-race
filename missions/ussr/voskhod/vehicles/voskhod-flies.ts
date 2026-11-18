import type { ChuteDef, Command, Flight, Measure } from '../../../../src/types.ts';
import { BOOSTERS, fairingDrops } from '../../vostok/vehicles/vostok-8k72k.ts';
import type { VostokRecord } from '../../vostok/vehicles/vostok-record.ts';
import { BASE } from './voskhod-11a57.ts';
import { AFT_SECTORS } from './voskhod-11a57-flown.ts';

export { commanded } from '../../vostok/vehicles/vostok-flies.ts';

/**
 * A Voskhod on its 11A57 as the scene shows it flown (types.ts `Flight.flies`), and what a hand can ask of each part of it in
 * flight (`Part.commands`): the same for both flights of the type, each giving its own record (`orbital`, whose instants
 * place every drop) and what did each thing on its day. As vostok-flies.ts for the Vostoks, with what the Voskhod had
 * instead: Block I and its aft section in place of Block E, and a descent in which nobody leaves the ball.
 */

/** What did each of the descent's events on a flight's day, for the labels of the commands a hand can give in its place. */
export interface DescentWords {
  /** What parted the modules ("on the day the sequence did, after the burn"). */
  parted: string;
  /** The crew, as the labels speak of them. */
  crew: string;
  /** The descent's own events by the record's ids: the parachute container's cover off, and each of the module's parachutes by name with the height it came out at. */
  cover: { id: string; at: string };
  chutes: { name: string; at: string }[];
}

/** The commands on each part of the vehicle by its node (orbitdeck.ts `can`, `ask`; main.ts `stage.onSpot`). */
export function voskhodCommands(day: DescentWords): Record<string, Command[]> {
  const OVER = `${day.crew} had no say over the launch vehicle: this takes the flight over`;
  const part: Command = { label: `Part the modules (${day.crew} could not: ${day.parted})`, ask: 'descent:modules' };
  const cover: Command = {
    label: `Shoot off the parachute container’s cover (automatic: ${day.cover.at})`,
    ask: `descent:${day.cover.id}`,
  };
  const chutes: Command[] = day.chutes.map((c) => ({ label: `Module’s ${c.name} (automatic: ${c.at})`, ask: `descent:module/${c.name}` }));
  const core: Command[] = [
    { label: `Cut off the core (${OVER})`, ask: 'step:cut:1' },
    { label: `Drop the core (${OVER})`, ask: 'step:separate:1' },
  ];
  const separate: Command = { label: `Separate the spacecraft (${OVER})`, ask: 'step:separate:2' };
  return {
    DescentModule: [part, cover, ...chutes],
    ParachuteHatch: [cover, ...chutes],
    InstrumentModule: [separate, part],
    RetroEngine: [
      { label: 'Fire the braking engine along the long axis (by hand, once the code had freed the hand controls)', ask: 'retro' },
    ],
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
const CLOTH = (value: string[], source: string): ChuteDef['colours'] => ({ value, confidence: 'estimated', source });

/**
 * The descent module's parachutes as drawn (viewer/chute.ts), each on its body of `orbital.descent` (flown there): a flat
 * round canopy of each one's area as the record gives it (`area`, m², with its source), every other figure of their making
 * chosen and said so. All are made fast at the parachute container.
 */
export function voskhodChutes(areas: { name: string; area: Measure }[]): ChuteDef[] {
  return areas.map(({ name, area }, i): ChuteDef => {
    const big = area.value > 100;
    return {
      on: name,
      body: 'module',
      at: 'ParachuteContainer',
      cut: 'solid',
      diameter: {
        value: Math.sqrt((4 * area.value) / Math.PI),
        confidence: area.confidence === 'documented' ? 'derived' : area.confidence,
        source: `${area.value} m² of canopy laid flat as a circle (${area.source})`,
      },
      gores: chosen(big ? 28 : i === 0 ? 8 : 16, 'not read: drawn so'),
      lines: chosen(
        big ? 0.85 * Math.sqrt((4 * area.value) / Math.PI) : Math.sqrt((4 * area.value) / Math.PI),
        'not read: a little under its diameter',
      ),
      riser: chosen(big ? 4 : 8, 'not read: clear of the ball'),
      colours: CLOTH(
        big ? ['#e2622b', '#f0ece2'] : ['#f0ece2'],
        'not read: orange and white, as the Vostoks’ canopies are shown on the ground',
      ),
    };
  });
}

/**
 * The flight in the scene (`Flight.flies`): the stack off the pad as staged.ts flies it, and what leaves it, each flown on
 * (the record's `ascent.sheds`) or, for the parachute container's cover, carried on its descent body. The crew stays in the
 * ball: nothing hangs under a canopy of its own. Every instant is the flight's own record's.
 */
export function voskhodFlies(
  orbital: VostokRecord,
  chutes: ChuteDef[],
  /** What the ship let go in orbit (the record's `ascent.drops` of that id: Voskhod 2's airlock), and the model's nodes that are it. Its detached body is supplied with the same record. */
  jettisoned: { id: string; nodes: string[] }[] = [],
): NonNullable<Flight['flies']> {
  const at = (id: string) => orbital.events.find((e) => e.id === id)!.at.value;
  const drop = (id: string) => orbital.ascent!.drops.find((d) => d.id === id)!.at.value;
  return {
    model: 'vehicle',
    datum: BASE,
    // Every engine's fire from its own nozzles: the strap-ons' RD-107s and the core's RD-108 from the pad, Block I's RD-0108
    // from its four chambers and four steering nozzles (the viewer finds them in the bells' geometry, viewer/fires.ts), and
    // the braking engine's (280 mm: estimated, vostok_3ka.py). Each burns what its engine burned (viewer/flames.ts).
    fires: [
      ...BOOSTERS.map(([letter]) => ({ node: `RD107_${letter}_Bells`, on: 'stage:0', burns: 'kerosene-lox' as const })),
      { node: 'RD108_Bells', on: 'stage:1', burns: 'kerosene-lox' },
      { node: 'RD0108_Bells', on: 'stage:2', burns: 'kerosene-lox' },
      { node: 'RetroEngine_Nozzle', radius: 0.14, on: 'tdu-1', burns: 'amine-nitric' },
    ],
    drops: [
      // each by the plan's joint that lets it go (vostok-plan.ts: a stage's is `stage:<i>`); each strap-on a body of its own
      ...BOOSTERS.map(([letter]) => ({ at: orbital.stages[0]!.separation!.value, nodes: [`Booster_${letter}`], on: `stage:0/${letter}` })),
      ...fairingDrops(drop('fairing')),
      { at: orbital.stages[1]!.separation!.value, nodes: ['CoreStage', 'CoreEngine', 'Interstage'], on: 'stage:1' },
      ...AFT_SECTORS.map((piece) => ({ at: drop('aft-section'), nodes: [`AftSection_${piece}`], on: `aft-section/${piece}` })),
      { at: at('spacecraft-separates'), nodes: ['BlockI'], on: 'stage:2' },
      {
        at: orbital.entry.separation.value,
        nodes: ['InstrumentModule', 'RetroEngine', 'Antennas', 'GasBottles', 'RetainingStraps', 'CableMast'],
        on: 'modules',
      },
      ...jettisoned.map((j) => ({ at: drop(j.id), nodes: j.nodes, on: j.id })),
      // the parachute container's cover, shot off at the height the coast hands over at, comes down on its own body
      { at: at('cover-off'), nodes: ['ParachuteHatch'], on: 'cover', rides: [{ body: 'cover' }] },
    ],
    chutes,
    // the shock layer stands off the ball's face: its brightness is the heat flux worked on its 1.15 m radius (the record's `heating`)
    air: { shield: 'DescentModule' },
  };
}
