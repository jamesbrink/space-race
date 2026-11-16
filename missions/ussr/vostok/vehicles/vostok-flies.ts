import type { VostokRecord } from './vostok-record.ts';
import type { ChuteDef, Command, Flight, Measure, Part } from '../../../../src/types.ts';
import { BOOSTERS } from './vostok-8k72k.ts';

/**
 * A Vostok on its 8K72K as the scene shows it flown (types.ts `Flight.flies`), and what a hand can ask of each part of it
 * in flight (`Part.commands`): the same for every flight in the type (Vostoks 1 to 6), each flight giving its own record
 * (`orbital`, whose instants place every drop) and what did each thing on its day, since its pilot could do none of the
 * descent's. Moved here from Vostok 1's flight.ts unchanged.
 */

/** The main nozzles' exits below the model's origin (the spacecraft's braking nozzle), m: vehicles/vostok_8k72k/ (the number lives there). */
export const BASE = 30.53;

/** What did each of the descent's events on a flight's day, for the labels of the commands a hand can give in its place. */
export interface DescentWords {
  /** What parted the modules ("on the day the thermal backup did, 10:36"). */
  parted: string;
  /** What put out the reserve canopy, or null where it was not put out. */
  reserve: string | null;
  /** The pilot, as the labels speak of them: the word for them in a sentence ("he") and for what was theirs ("his"). */
  pilot: { they: string; theirs: string };
}

/** The commands on each part of the vehicle by its node (orbitdeck.ts `can`, `ask`; main.ts `stage.onSpot`). */
export function vostokCommands(day: DescentWords): Record<string, Command[]> {
  const { they, theirs } = day.pilot;
  const OVER = `${they} had no say over the launch vehicle: this takes the flight over`;
  const part: Command = { label: `Part the modules (${they} could not: ${day.parted})`, ask: 'descent:modules' };
  const eject: Command = {
    label: `Blow the hatch and eject (${they} could not: the barometric switch, 7 km)`,
    ask: 'descent:seat-ejection',
  };
  const chutes: Command[] = [
    { label: 'Module’s pilot parachute: the cover off (automatic: with the hatch, 7 km)', ask: 'descent:module/pilot parachute' },
    { label: 'Module’s braking parachute (automatic: its barometric switch, 4 km)', ask: 'descent:module/braking parachute' },
    { label: 'Module’s main parachute (automatic: its barometric switch, 2.5 km)', ask: 'descent:module/main parachute' },
  ];
  const core: Command[] = [
    { label: `Cut off the core (${OVER})`, ask: 'step:cut:1' },
    { label: `Drop the core (${OVER})`, ask: 'step:separate:1' },
  ];
  const separate: Command = { label: `Separate the spacecraft (${OVER})`, ask: 'step:separate:2' };
  return {
    DescentModule: [part, ...chutes],
    EntryHatch: [eject],
    ParachuteHatch: chutes,
    EjectionSeat: [
      eject,
      { label: 'Seat’s stabilising parachute (automatic: its timer, half a second out)', ask: 'descent:pilot/seat’s braking parachute' },
      { label: 'Leave the seat: main canopy (automatic: its barometric switch, 4 km)', ask: 'descent:pilot/main canopy' },
      ...(day.reserve
        ? [{ label: `Reserve canopy (automatic: ${day.reserve})`, ask: 'descent:pilot/reserve canopy' } satisfies Command]
        : []),
    ],
    InstrumentModule: [separate, part],
    RetroEngine: [
      { label: `Fire the braking engine along the long axis (${theirs}, once the code had freed the hand controls)`, ask: 'retro' },
    ],
    Fairing: [{ label: `Drop the fairing (${OVER})`, ask: 'step:drop:fairing' }],
    BlockE: [
      {
        label: `Light the third stage: hot staging, through the lattice with the core still on, as it flew (${OVER})`,
        ask: 'step:ignite:2',
      },
      { label: `Cut off the third stage (${OVER})`, ask: 'step:cut:2' },
      separate,
    ],
    CoreStage: core,
    CoreEngine: core,
    ...Object.fromEntries(
      BOOSTERS.map(([letter]) => [`Booster_${letter}`, [{ label: `Drop the strap-ons (${OVER})`, ask: 'step:separate:0' }]]),
    ),
  };
}

/** The parts with the commands a hand can give each (`vostokCommands`), by node. */
export const commanded = (parts: Part[], commands: Record<string, Command[]>): Part[] =>
  parts.map((p) => (commands[p.node] ? { ...p, commands: commands[p.node] } : p));

/**
 * The descent's parachutes as drawn (viewer/chute.ts), each on its body of `orbital.descent` (flown there: when it comes
 * out, its drag, how long it takes to fill). Their areas are the record's (Bobkov; the GCTC page: mission.md, "The last
 * minutes"); each is drawn as a flat round canopy of that area (its diameter derived), and every other figure of their
 * making (gores, lines, colours) is chosen and says so. The module's three are made fast at its parachute container; the
 * seat's stabilising parachute at the seat's top; the pilot's two at his harness.
 */
const ROUND = (area: number, what: string): Measure => ({
  value: Math.sqrt((4 * area) / Math.PI),
  confidence: 'derived',
  source: `${what}: ${area} m² of canopy laid flat as a circle (Bobkov; GCTC)`,
});
const chosen = (value: number, source: string): Measure => ({ value, confidence: 'estimated', source });
const CLOTH = (value: string[], source: string): ChuteDef['colours'] => ({ value, confidence: 'estimated', source });
export const CHUTES: ChuteDef[] = [
  {
    on: 'pilot parachute',
    body: 'module',
    at: 'ParachuteContainer',
    cut: 'solid',
    diameter: ROUND(1.5, 'the module’s pilot parachute'),
    gores: chosen(8, 'not read: drawn with eight'),
    lines: chosen(1.5, 'not read: about its diameter'),
    riser: chosen(4, 'not read: clear of the ball'),
    colours: CLOTH(['#f0ece2'], 'not read: undyed'),
  },
  {
    on: 'braking parachute',
    body: 'module',
    at: 'ParachuteContainer',
    cut: 'solid',
    diameter: ROUND(18, 'the module’s braking parachute'),
    gores: chosen(16, 'not read: drawn with sixteen'),
    lines: chosen(5, 'not read: about its diameter'),
    riser: chosen(8, 'not read: some three of the ball’s diameters, clear of its wake'),
    colours: CLOTH(['#f0ece2', '#e2622b'], 'not read: orange and white, as the later Vostoks’ canopies are shown on the ground'),
  },
  {
    on: 'main parachute',
    body: 'module',
    at: 'ParachuteContainer',
    cut: 'solid',
    diameter: ROUND(574, 'the module’s main parachute'),
    gores: chosen(28, 'not read: drawn with twenty-eight'),
    lines: chosen(24, 'not read: a little under its diameter'),
    riser: chosen(4, 'not read'),
    colours: CLOTH(['#e2622b', '#f0ece2'], 'not read: orange and white, as the later Vostoks’ canopies are shown on the ground'),
  },
  {
    on: 'seat’s braking parachute',
    body: 'pilot',
    at: 'EjectionSeat',
    cut: 'solid',
    diameter: ROUND(2, 'the seat’s stabilising parachute'),
    gores: chosen(8, 'not read: drawn with eight'),
    lines: chosen(1.8, 'not read: about its diameter'),
    riser: chosen(3, 'not read'),
    colours: CLOTH(['#f0ece2'], 'not read: undyed'),
  },
  {
    on: 'main canopy',
    body: 'pilot',
    at: 'Harness',
    cut: 'solid',
    diameter: ROUND(83.5, 'the pilot’s main canopy'),
    gores: chosen(24, 'not read: drawn with twenty-four'),
    lines: chosen(8.5, 'not read: a little under its diameter, as a man’s canopy'),
    riser: chosen(0.6, 'not read: from his shoulders to where the lines meet'),
    colours: CLOTH(['#f0ece2', '#e2622b'], 'not read: orange and white'),
  },
  {
    on: 'reserve canopy',
    body: 'pilot',
    at: 'Harness',
    cut: 'solid',
    diameter: ROUND(56, 'the pilot’s reserve canopy'),
    gores: chosen(20, 'not read: drawn with twenty'),
    lines: chosen(7, 'not read: a little under its diameter'),
    riser: chosen(0.6, 'not read'),
    colours: CLOTH(['#f0ece2'], 'not read: undyed'),
  },
];

/**
 * The flight in the scene (`Flight.flies`): the stack off the pad as staged.ts flies it, and what leaves it, each flown on
 * (orbital.ts `ascent.sheds`) or, for the hatch and the seat, let go unseen: what comes down with the pilot is not flown
 * as a body. Every instant is the flight's own record's. `crew`: the model of the pilot who hangs under his canopy.
 */
export function vostokFlies(orbital: VostokRecord, crew = 'crew'): NonNullable<Flight['flies']> {
  const at = (id: string) => orbital.events.find((e) => e.id === id)!.at.value;
  const EJECTION = at('seat-ejected');
  return {
    model: 'vehicle',
    datum: BASE,
    // Every engine's fire from its own nozzles. The four strap-ons' RD-107s and the core's RD-108 burn from the pad, each
    // node the engine's bells, whose chambers (four main and two or four steering) the viewer finds in the model's own
    // geometry (viewer/fires.ts): each fire is sized from its nozzles' exits and burns at its stage's throttle. Then Block
    // E's from its nozzle (733 mm across: KBKhA; that it is the exit's is derived), and the braking engine's (280 mm:
    // estimated, vostok_3ka.py). Each burns what its engine burned, which gives its fire its look (viewer/flames.ts): the
    // first three stages kerosene and oxygen, luminous with soot; the braking engine amine and nitric acid
    fires: [
      ...BOOSTERS.map(([letter]) => ({ node: `RD107_${letter}_Bells`, on: 'stage:0', burns: 'kerosene-lox' as const })),
      { node: 'RD108_Bells', on: 'stage:1', burns: 'kerosene-lox' },
      { node: 'BlockE_Engine', radius: 0.3665, on: 'stage:2', burns: 'kerosene-lox' },
      { node: 'RetroEngine_Nozzle', radius: 0.14, on: 'tdu-1', burns: 'amine-nitric' },
    ],
    drops: [
      // each by the plan's joint that lets it go (vostok-plan.ts: a stage's is `stage:<i>`); each strap-on a body of its own
      // (vostok-8k72k.ts `sheds`: the strap-ons' joint and its letter), leaving at the stage's separation
      ...BOOSTERS.map(([letter]) => ({ at: orbital.stages[0]!.separation!.value, nodes: [`Booster_${letter}`], on: `stage:0/${letter}` })),
      { at: orbital.ascent!.drops.find((d) => d.id === 'fairing')!.at.value, nodes: ['Fairing'], on: 'fairing' },
      { at: orbital.stages[1]!.separation!.value, nodes: ['CoreStage', 'CoreEngine', 'Interstage'], on: 'stage:1' },
      { at: at('spacecraft-separates'), nodes: ['BlockE'], on: 'stage:2' },
      {
        at: orbital.entry.separation.value,
        nodes: ['InstrumentModule', 'RetroEngine', 'Antennas', 'GasBottles', 'RetainingStraps', 'CableMast'],
        on: 'modules',
      },
      // what leaves at the ejection height comes down on the descent's own bodies (orbital.ts `descent`, flown by flyDown)
      { at: EJECTION, nodes: ['EntryHatch'], on: 'hatch-1', rides: [{ body: 'hatch-1' }] },
      { at: EJECTION, nodes: ['ParachuteHatch'], on: 'cover', rides: [{ body: 'cover' }] },
      // the seat with him in it to 4 km, then the seat alone under its stabilising parachute: he has left it
      { at: EJECTION, nodes: ['EjectionSeat'], on: 'pilot', rides: [{ body: 'pilot' }, { body: 'seat', hide: ['Pilot'] }] },
    ],
    // and from 4 km the pilot himself, the figure in his suit, hanging in his harness under his own canopy
    hangs: [{ model: crew, body: 'pilot', from: 'main canopy' }],
    chutes: CHUTES,
    // the shock layer stands off the ball's face: its brightness is the heat flux worked on its 1.15 m radius (orbital.ts `heating`)
    air: { shield: 'DescentModule' },
  };
}
