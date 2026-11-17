import { doc, estimated } from '../../../../src/measure.ts';
import type { ChuteDef, Command, Flight } from '../../../../src/types.ts';
import type { GeminiTitanRecord } from './gemini-titan-plan.ts';
import { BASE, FT } from './gemini-titan.ts';

/**
 * A Gemini on its Titan as the scene shows it flown (types.ts `Flight.flies`), and what a hand can ask of each part of it in
 * flight (`Part.commands`), from a flight's record (`GeminiTitanRecord`, whose instants place every drop). The ids are
 * vehicles/gemini-titan-plan.ts's: the hardware's own names.
 */

/** The re-entry module's parachutes as drawn (viewer/chute.ts), on the plan's descent body. */
export const GEMINI_CHUTES: ChuteDef[] = [
  {
    on: 'drogue parachute',
    body: 'reentry-module',
    at: 'RendezvousRecovery',
    cut: 'ribbon',
    diameter: doc(8.3 * FT, 'an 8.3 ft conical ribbon drogue, twelve lines (Project Gemini: A Technical Summary, NASA CR-1106, p. 218)'),
    gores: doc(12, 'twelve lines (NASA CR-1106, p. 218): a gore to each'),
    lines: estimated(16.6 * FT, 'not read: twice the canopy’s diameter, a usual proportion for a drogue'),
    riser: estimated(30 * FT, 'not read: long enough to carry it clear of the wake of a 90 in heat shield'),
    colours: { value: ['#ee7a30', '#efeadc'], confidence: 'estimated', source: 'not read: orange and white, as the main’s' },
    stretch: estimated(0.4, 'not read: a mortar throws the pack out to the end of its lines, by judgement'),
  },
  {
    on: 'main parachute',
    body: 'reentry-module',
    at: 'ReentryControl',
    cut: 'ringsail',
    diameter: doc(84.2 * FT, 'an 84.2 ft ringsail, 72 lines (NASA CR-1106, p. 222)'),
    gores: doc(72, 'seventy-two lines (NASA CR-1106, p. 222): a gore to each'),
    lines: estimated(84.2 * FT, 'not read: a line as long as the canopy is wide, the usual proportion for the type'),
    riser: estimated(6, 'not read: the bridle from the re-entry module, by judgement'),
    colours: {
      value: ['#ee7a30', '#efeadc'],
      confidence: 'estimated',
      source: 'orange and white gores, as photographs of Gemini’s main parachutes over the sea show them: not read in a document',
    },
    reefed: {
      mouth: estimated(0.3, 'reefed to a third of its width: not read'),
      until: doc(10, 'disreefed at 10 s (NASA CR-1106, p. 222)'),
    },
  },
];

/** The commands on each part of the vehicle by its node (orbitdeck.ts `can`, `ask`; main.ts `stage.onSpot`). */
export function geminiCommands(): Record<string, Command[]> {
  const OVER = 'the crew had no say over the launch vehicle but to abort: this takes the flight over';
  const separate: Command = { label: `Separate the spacecraft (${OVER})`, ask: 'step:separate:1' };
  const first: Command[] = [
    { label: `Cut off the first stage (${OVER})`, ask: 'step:cut:0' },
    { label: `Drop the first stage (${OVER})`, ask: 'step:separate:0' },
  ];
  return {
    TitanStage1: first,
    TitanStage1Engine: first,
    TitanInterstage: [{ label: `Drop the first stage (${OVER})`, ask: 'step:separate:0' }],
    TitanStage2: [
      { label: `Light the second stage: through the interstage with the stages still joined, as it flew (${OVER})`, ask: 'step:ignite:1' },
      { label: `Cut off the second stage (${OVER})`, ask: 'step:cut:1' },
      separate,
    ],
    TitanStage2Engine: [{ label: `Cut off the second stage (${OVER})`, ask: 'step:cut:1' }, separate],
    EquipmentSection: [
      {
        label: 'Jettison the equipment section (the crew’s switch; on the day 30 s before retrofire)',
        ask: 'descent:equipment-section-off',
      },
    ],
    RetroSection: [
      { label: 'Fire the retrograde rockets by hand (the crew could: the retrofire switch, along the long axis)', ask: 'retro' },
      { label: 'Jettison the retrograde section (the crew’s switch, once its light was on)', ask: 'descent:retro-section-off' },
    ],
    RendezvousRecovery: [
      {
        label: 'Drogue parachute (the crew’s switch: at an indicated 60,000 ft on the day)',
        ask: 'descent:reentry-module/drogue parachute',
      },
    ],
    ReentryControl: [{ label: 'Main parachute (the crew’s PARA switch, at 10,600 ft)', ask: 'descent:reentry-module/main parachute' }],
  };
}

/** Each part with its commands, where it has any. */
export const commanded = <P extends { node: string }>(parts: P[], commands: Record<string, Command[]>): (P & { commands?: Command[] })[] =>
  parts.map((p) => (commands[p.node] ? { ...p, commands: commands[p.node] } : p));

/**
 * The flight in the scene (`Flight.flies`): the stack off the pad as staged.ts flies it, and what leaves it, each flown on
 * (the record's `ascent.sheds`): the first stage with the interstage, the second stage, the equipment section and the
 * retrograde section; the fairings in orbit; the rendezvous and recovery section with the main.
 */
export function geminiFlies(o: GeminiTitanRecord): NonNullable<Flight['flies']> {
  const at = (id: string) => o.events.find((e) => e.id === id)!.at.value;
  return {
    model: 'vehicle',
    datum: BASE,
    // Every engine's fire from its own nozzles: the first stage's two chambers, the second stage's one, the four retrograde
    // rockets (burning as the plan flies them, evenly from the first's lighting), and each pair of thrusters, a fire to each
    // of its lightings in order (sim/run.ts `firesOf`). All but the rockets burn Aerozine or monomethylhydrazine and
    // nitrogen tetroxide, which burn clear
    fires: [
      { node: 'Stage1Engine_Nozzles', on: 'first-stage-engine', burns: 'hydrazine-n2o4' },
      { node: 'Stage2Engine_Nozzle', on: 'second-stage-engine', burns: 'hydrazine-n2o4' },
      { node: 'Retro_RocketNozzles', on: 'retrorockets', burns: 'solid-perchlorate' },
      ...o.moves.map((m) => ({
        node: m.thrusters === 'aft' ? 'Equipment_AftThrusters' : 'Retro_ForwardThrusters',
        on: m.thrusters === 'aft' ? 'aft-thrusters' : 'forward-thrusters',
        burns: 'hydrazine-n2o4' as const,
      })),
    ],
    // each by the plan's joint that lets it go (vehicles/gemini-titan-plan.ts), at the record's instant
    drops: [
      { at: o.titan.staging.value, nodes: ['TitanStage1', 'TitanStage1Engine', 'TitanInterstage'], on: 'staging-nuts' },
      { at: o.separation.at.value, nodes: ['TitanStage2', 'TitanStage2Engine'], on: 'adapter-separation' },
      // (thrown off in orbit by the crew's switch: not flown, their few pounds left aboard)
      { at: at('fairings'), nodes: ['NoseFairing', 'ScannerFairing'] },
      { at: o.adapter.equipment.gone.value, nodes: ['EquipmentSection'], on: 'equipment-section-release' },
      { at: o.retro.gone.value, nodes: ['RetroSection'], on: 'retro-section-release' },
    ],
    chutes: GEMINI_CHUTES,
    air: { shield: 'HeatShield' },
  };
}
