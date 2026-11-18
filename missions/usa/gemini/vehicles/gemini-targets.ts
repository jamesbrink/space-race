import { assumed, derived, doc, type Measure, measure } from '../../../../src/measure.ts';
import type { ModelDef, Motor, Part, Spec } from '../../../../src/types.ts';
import { IN, LB, LBF, THRUST } from './gemini-titan.ts';

/**
 * What a Gemini went up to dock with, as flight data said once: the Gemini Agena Target Vehicle
 * (vehicles/agena_target_vehicle.py), the Augmented Target Docking Adapter (vehicles/atda.py) and the Target
 * Docking Adapter both carried (vehicles/target_docking_adapter.py). The dimensions Lockheed's and McDonnell's
 * drawings give are the type's, and the same for every flight that had one; a flight says what was its own vehicle's:
 * its record, its weights, its parts' words. In a flight's model the target stands on the floor beside the launch
 * vehicle (vehicles/gemini_stack.py `TARGET_AT`): an exhibit's arrangement.
 */

export const LAUNCH_SYSTEMS_GATV = 'Gemini Program Launch Systems Final Report (Aerospace, January 1967), section III.C, Figure III.C-2';
export const AGENA_CATALOG = 'NASA Agena D Mission Capabilities and Restraints Catalog, vol. II (Lockheed, LMSC-A604166-2, 8 October 1965)';
export const TECH_SUMMARY = 'Project Gemini: A Technical Summary (McDonnell, NASA CR-1106, June 1968)';

/** The heading a flight's parts list puts its target under, and so the name of the choice that stands it alone in the gallery. */
export const TARGET_GROUP = 'Docking target';

/** The docking adapter's parts, which both targets carried (vehicles/target_docking_adapter.py's top-level nodes), from the cone back. */
const ADAPTER = ['DockingCone', 'MooringLatches', 'StatusDisplay', 'AcquisitionLights', 'TargetDockingAdapter', 'TargetTransponder'];
/** The Agena's parts, nose first (vehicles/agena_target_vehicle.py's top-level nodes, after the adapter's). */
export const AGENA = [
  ...ADAPTER,
  'AgenaRunningLights',
  'AgenaForwardSection',
  'AgenaTankSection',
  'AgenaAftSection',
  'AgenaSecondaryPropulsion',
  'AgenaEngine',
];
/** The ATDA's (vehicles/atda.py). */
export const ATDA = [
  'AtdaShroud',
  'AtdaShroudBand',
  ...ADAPTER,
  'AtdaEquipmentSection',
  'AtdaRunningLights',
  'AtdaReactionControl',
  'AtdaBatteryModule',
];

/**
 * Where a target's part goes as it is taken apart: straight up by `rise`, metres. The target stands on its own floor
 * whatever the launch vehicle beside it does (`ModelDef.target`; Stage.ground keeps each on the floor apart).
 */
export const lifted = (rise: number): [number, number, number] => [0, rise, 0];

/**
 * How far each of a target's parts rises off the floor as it is taken apart, metres: the type's, as how a Titan's parts
 * come away is the type's (gemini-titan.ts `HARDWARE`). A part that hangs on another's skin (the lights, the
 * transponder's antennas) rises by enough less than what carries it to hang clear below it.
 */
const AGENA_RISE: Record<string, number> = {
  DockingCone: 7.0,
  MooringLatches: 6.3,
  StatusDisplay: 5.9,
  AcquisitionLights: 5.5,
  TargetDockingAdapter: 5.0,
  TargetTransponder: 4.3,
  AgenaRunningLights: 4.0,
  AgenaForwardSection: 3.6,
  AgenaTankSection: 2.5,
  AgenaAftSection: 1.5,
  AgenaSecondaryPropulsion: 0.5,
  AgenaEngine: 0,
};
const ATDA_RISE: Record<string, number> = {
  AtdaShroud: 7.6,
  AtdaShroudBand: 6.9,
  DockingCone: 6.1,
  MooringLatches: 5.4,
  StatusDisplay: 5.0,
  AcquisitionLights: 4.6,
  TargetDockingAdapter: 4.1,
  TargetTransponder: 3.4,
  AtdaEquipmentSection: 3.0,
  AtdaRunningLights: 1.2,
  AtdaReactionControl: 0.7,
  AtdaBatteryModule: 0,
};
/** The parts with something inside to be cut open on. */
const INSIDE = new Set([
  'TargetDockingAdapter',
  'AgenaForwardSection',
  'AgenaTankSection',
  'AgenaAftSection',
  'AgenaEngine',
  'AtdaEquipmentSection',
  'AtdaReactionControl',
  'AtdaBatteryModule',
]);

/** What a flight says of one of its target's parts: all of it, or only what was its own vehicle's story over the type's words. */
export type TargetWords = Pick<Part, 'node'> & Partial<Part>;

const SEDR2_TDA = 'SEDR 300 vol. 2, Sections XIII and XIV';

/** The type's words for the docking adapter's own parts, the same hardware on every target that carried one. */
const ADAPTER_WORDS: TargetWords[] = [
  {
    node: 'DockingCone',
    name: 'Docking cone',
    summary: 'What a Gemini’s nose goes into: two skins on seven dampers, with a notch in the top for the ship’s index bar.',
    detail:
      'A double-skinned cone, stiffened with rings and ribs, floating in the adapter on seven dampers so that it ' +
      'gives when it is struck: three of them take it sideways and four along, in three sets 120° apart. In its top ' +
      'is a V-shaped notch with a slot at the bottom. The ship’s index bar goes into the V and is steered down it ' +
      'into the slot, which turns the ship the last few degrees; three hooks in the throat then catch three fittings ' +
      'on the ship’s nose, and a motor draws cone and ship six inches in until the cone is hard against the adapter ' +
      'and the two are one vehicle. Three thin fingers stand in from the cone to bleed off any charge between the ' +
      'two before metal meets metal. The two skins, the dampers, the notch’s form and the six inches are ' +
      'documented. No drawing read gives the cone’s size: its mouth is scaled from the photograph Gemini VIII’s ' +
      'crew took into it (NASA S66-25784), and its depth is worked from where a docked ship’s nose is known to ' +
      'end up. The cone is built at one place and does not move.',
    facts: [
      ['Mouth', 'about 54 in (1.37 m) across: estimated'],
      ['Depth', '22 in to a throat 33.2 in across: derived, with a guess at the clearance'],
      ['Skins', 'two, ring and rib stiffened; 1.3 in apart, a guess'],
      ['Dampers', '7: three across and four along, in three sets'],
      ['Travel', '6.000 in, run out to drawn in'],
      ['Notch', 'V-shaped with a slot at the bottom, in the top'],
      ['Discharge fingers', '3'],
    ],
  },
  {
    node: 'MooringLatches',
    name: 'Mooring latches',
    summary: 'Three hooks in the cone’s throat, which catch the ship’s nose and hold it while the cone draws it in.',
    detail:
      'When the ship’s nose seats in the throat, three latch hooks drop behind three receptacles on its forward ' +
      'section, and the two vehicles are caught. Then the mooring drive draws the cone in and makes the joint ' +
      'rigid. To let go, the hooks are released and the ship backs out on its thrusters; if they would not ' +
      'release, the ship could blow its own receptacles off. A lamp on the status panel, DOCK, says that the cone ' +
      `is run out and the hooks are set for a ship to come. That there are three is documented (${SEDR2_TDA}; ` +
      `${TECH_SUMMARY}, p. 326); they are placed round the throat to meet the ship’s three receptacles, one at the ` +
      'bottom and one 60° either side of the top, and their form is estimated.',
    facts: [
      ['Number', '3, in the throat'],
      ['Places', 'at the bottom and 60° either side of the top: derived from the ship’s receptacles'],
      ['Form', 'estimated'],
    ],
  },
  {
    node: 'StatusDisplay',
    name: 'Status display panel',
    summary: 'The target’s instrument panel, on its outside: lamps and dials for a crew to read through their windows.',
    detail:
      'A target has no cabin, so what a crew needs to know of it is shown on its nose, "just back of the V-notch in ' +
      'the docking cone", where both men can see it all the way in. Its lamps are DOCK (the cone run out and the ' +
      'hooks set), RIGID (the cone drawn in and locked), PWR (every supply working), a red MAIN and a green MAIN ' +
      '(the main engine’s tanks and hydraulics out of limits, or ready), ARMED in amber (an engine may be fired ' +
      'by command), and SEC HI and SEC LO (gas enough for a burn of the secondary engines). With them are two ' +
      'clocks and a dial. A ship’s commands could brighten and dim it. On the vehicle with no engines the engine ' +
      `lamps had nothing to say. What it shows is documented (${SEDR2_TDA}, pp. 13-22 and 13-23); it is drawn as ` +
      'three panels over the notch, the middle one on a damper, their size and layout estimated. Its lamps do ' +
      'not light and its dials are not drawn.',
    facts: [
      ['Where', 'on the adapter just back of the cone’s notch'],
      ['Lamps', 'nine, among them DOCK, RIGID, PWR, MAIN (red and green), ARMED, SEC HI, SEC LO'],
      ['Gauges', 'two clocks and a dial'],
      ['Panels', 'three, the middle one on a damper; sizes estimated'],
    ],
  },
  {
    node: 'AcquisitionLights',
    name: 'Acquisition lights',
    summary: 'Two flashing lights at the adapter’s edge, to find the target by in the dark.',
    detail:
      'Seen from far off at night a target is these: two flashing lamps, "top left and bottom right of the docking ' +
      'cone" as an approaching crew see them, bright enough to be picked up as a star tens of miles out, long ' +
      'before any shape can be made out. A crew switched them by command. That there were two, and at which ' +
      `corners, is documented (${SEDR2_TDA}; ${TECH_SUMMARY}, p. 326); how far round they are (42° from the top ` +
      'and from the bottom) and their form are estimated.',
    facts: [
      ['Number', '2, flashing'],
      ['Places', 'top left and bottom right of the cone, at the adapter’s edge'],
      ['Angles and form', 'estimated'],
    ],
  },
  {
    node: 'TargetTransponder',
    name: 'Radar transponder and antennas',
    summary: 'The other half of the ship’s radar: it hears the call and answers, through two spirals and a dipole on a boom.',
    detail:
      'A Gemini’s rendezvous radar does not listen for an echo. It calls on one frequency, and a transponder in ' +
      'the target’s docking adapter answers on another, so that the answer cannot be mistaken for a reflection and ' +
      'can be timed for range. The transponder answers through two flat spiral antennas let into the adapter’s ' +
      'skin and fed together, and through a dipole on a boom that stands about 85 in off the adapter and covers ' +
      'what the spirals cannot see; the boom runs out by itself once the target is in orbit. The transponder is ' +
      'behind a white cover on the adapter’s side. The three antennas and the boom’s height are documented ' +
      `(${TECH_SUMMARY}, p. 332; SEDR 300 vol. 2, p. 15-20). Where the spirals are is scaled from sketches; that ` +
      'the cover was white is documented, and which side it is on and its size are a guess.',
    facts: [
      ['Antennas', 'two spirals in the skin, and a dipole'],
      ['Dipole boom', 'about 85 in (2.2 m) off the skin'],
      ['Cover', 'white; its side and size a guess'],
      ['Spirals’ places', '24° and 204° round from the top: scaled from sketches'],
    ],
  },
];

/** The type's words for an Agena's smaller parts. */
const AGENA_WORDS: TargetWords[] = [
  {
    node: 'AgenaRunningLights',
    name: 'Agena: running lights',
    summary: 'Green to the right of the top and red to the left, as on a ship, to show which way the vehicle lies.',
    detail:
      'Two coloured lamps on the forward section, green toward the vehicle’s right and red toward its left, each 35° ' +
      'round from its top, so that a crew coming up in the dark can tell which way it is turned. Their colours and ' +
      'angles are the Gemini VIII mission report’s drawing of the vehicle (Figure 3.4-2), which has no dimensions: ' +
      'how far along the vehicle they are is estimated, and so is their form.',
    facts: [
      ['Colours', 'green on the right of the top, red on the left'],
      ['Angles', '35° either side of the top'],
      ['Station', 'estimated'],
    ],
  },
  {
    node: 'AgenaSecondaryPropulsion',
    name: 'Agena: secondary propulsion system',
    summary: 'Two small rocket packs on the sides of the tail: four chambers for what the main engine is too coarse to do.',
    detail:
      'What made an Agena D a Gemini target, with its restartable engine and its docking adapter. Two modules hang ' +
      'on opposite sides of the aft rack, each with its own tanks, a chamber of 200 lb of thrust and one of 16 lb, ' +
      'all four firing aft. The two of 16 lb burn first, to settle the main tanks’ propellants at the outlets ' +
      'before the main engine is lit; the two of 200 lb make the small changes of speed that are less than the ' +
      'least the main engine can give. The modules, their chambers and what each was for are documented ' +
      `(${LAUNCH_SYSTEMS_GATV.replace(', Figure III.C-2', '')}, p. III.C-15), and on which module the small ` +
      'chamber is toward the top. A module’s size is scaled from Lockheed’s figures, and the dark ribbed shields ' +
      'over them are as the photographs taken from Gemini VIII show them.',
    facts: [
      ['Modules', '2, on opposite sides of the aft rack'],
      ['Chambers', '2 of 200 lbf and 2 of 16 lbf, firing aft'],
      ['The 16 lbf pair', 'settle the main propellants before the main engine starts'],
      ['The 200 lbf pair', 'changes of speed below the main engine’s least'],
      ['Size', 'scaled from the Agena D catalog’s Figures 14-5 and 14-6'],
    ],
  },
];

/** The type's words for the ATDA's smaller parts (there was one ATDA: the type is the vehicle). */
const ATDA_WORDS: TargetWords[] = [
  {
    node: 'AtdaShroudBand',
    name: 'ATDA: band clamp and lanyards',
    summary: 'A steel band, four explosive bolts, and two wires that should have pulled free and did not.',
    detail:
      'The shroud’s two halves were held shut by a steel band round them, 22 in forward of where the shroud meets ' +
      'the adapter, joined by explosive bolts. The bolts fired and the band parted, as they should. But the wires ' +
      'that carried the firing current crossed from the adapter to the band, and each had a plug meant to be ' +
      'pulled out by a lanyard as the halves swung away. On the pad the lanyards had been taped down out of the ' +
      'way, by men working from instructions that said "See blueprint" and who had no blueprint. So the wires ' +
      'stayed plugged in, and they were strong: they held the two halves by the ends of the band, open about ' +
      'thirty degrees, for as long as the vehicle flew. Where the band was, that its bolts fired and what held ' +
      'the halves are documented (Gemini IX-A mission report, 5.8.1.2; On the Shoulders of Titans, p. 334). The ' +
      'band’s form and the wires’ paths are estimated.',
    facts: [
      ['Band clamp', '22 in forward of the shroud’s base'],
      ['Bolts', 'fired, as planned'],
      ['Lanyards', 'taped down: the wires’ plugs were never pulled'],
      ['Held', 'both halves, open about 30°'],
      ['Form and the wires’ paths', 'estimated'],
    ],
  },
  {
    node: 'AtdaRunningLights',
    name: 'ATDA: running lights',
    summary: 'Six lamps under quartz domes: green, red and amber, to show an approaching crew how the target lies.',
    detail:
      'Two lamps of each colour on a line along the vehicle: green to the right of its top, red to the left and ' +
      'amber underneath, so that a crew coming up in the dark can tell which way it is turned and how it is ' +
      'rolling. An Agena had two; this vehicle, with no way of holding itself still, had six. Their colours, ' +
      'their number and the two stations they stand at are documented (Gemini IX-A mission report, 3.7.1.3; SEDR ' +
      '300 vol. 2, p. 15-11); how far round from the top the green and the red are is estimated.',
    facts: [
      ['Number', '6: two green, two red, two amber'],
      ['Stations', '5.06 in and 49.00 in aft of the docking adapter'],
      ['Green and red', '45° either side of the top: estimated'],
      ['Amber', 'underneath'],
    ],
  },
  {
    node: 'AtdaBatteryModule',
    name: 'ATDA: battery module',
    summary: 'A can of batteries at the tail, enough for five days, with the rails the vehicle slid out of its Atlas on.',
    detail:
      'Behind the reaction control section is a can 36.2 in across and 17.75 in long with the vehicle’s power in ' +
      'it: three silver-zinc batteries of 400 ampere-hours, "to support a 5-day mission", and two small ones for ' +
      'the pyrotechnics. Four rails run from the equipment section’s rim to the can’s foot: the vehicle slid out ' +
      'of the Atlas’s adapter along them, pulled by bungee cords. A stub antenna stands 12.60 in out of the middle ' +
      'of the can. The sizes are McDonnell’s dimensioned drawing (Project Gemini: A Technical Summary, Figure 66) ' +
      'and the batteries the mission report’s (3.7.2.4; the drawing labels the large ones 350 AH); the batteries’ ' +
      'sizes and places in the can are guesses. In this exhibit the vehicle stands on the tip of the stub ' +
      'antenna, which nothing ever did.',
    facts: [
      ['Can', '17.75 in long, 36.2 in across'],
      ['Batteries', '3 of 400 Ah, and 2 of 15 Ah for pyrotechnics'],
      ['Separation rails', '4'],
      ['Stub antenna', '12.60 in'],
    ],
  },
];

/** A target's parts for the parts list: each of `nodes` under the target's heading, rising as the type's do, with the type's words and then the flight's. */
const targetParts = (whose: string, nodes: string[], rise: Record<string, number>, type: TargetWords[], says: TargetWords[]): Part[] =>
  nodes.map((node) => {
    const words = { ...type.find((w) => w.node === node), ...says.find((w) => w.node === node) };
    if (!words.name || !words.summary || !words.detail) throw new Error(`${whose}: no words for the target's ${node}`);
    return {
      group: TARGET_GROUP,
      ...(INSIDE.has(node) ? { inside: true } : {}),
      explode: lifted(rise[node] ?? 0),
      order: 0,
      ...words,
    } as Part;
  });
/**
 * An Agena's parts, nose first, for a flight's parts list. `says`: the flight's own words for its vehicle's sections
 * and adapter (every part without words of the type's must have them), and anything it says over the type's of the rest.
 */
export const agenaParts = (says: TargetWords[]): Part[] =>
  targetParts('Agena', AGENA, AGENA_RISE, [...ADAPTER_WORDS, ...AGENA_WORDS], says);
/** The ATDA's parts, as `agenaParts`. */
export const atdaParts = (says: TargetWords[]): Part[] => targetParts('ATDA', ATDA, ATDA_RISE, [...ADAPTER_WORDS, ...ATDA_WORDS], says);

/**
 * A Gemini's stack (gemini-titan.ts `geminiTitanStack`) with its target standing beside it: the target's heading among
 * the figures (and what the model says its target is: `ModelDef.target`), and its size in the line that says what
 * is to scale (`says`: 'Agena 7.95 m'). The target's parts are under `TARGET_GROUP` (`agenaParts`, `atdaParts`).
 * `target`: what it is called by itself and how long it was (`AGENA_TARGET`, `ATDA_TARGET`).
 */
export const withTarget = (stack: ModelDef, says: string, target: Pick<NonNullable<ModelDef['target']>, 'name' | 'length'>): ModelDef => ({
  ...stack,
  scale: stack.scale?.replace(' · to scale', ` · ${says} · to scale`),
  specGroups: [...(stack.specGroups ?? []), TARGET_GROUP],
  target: { heading: TARGET_GROUP, ...target },
});

/** The docking adapter's dimensions, which are the type's. `carrier`: what it is bolted to, for the notes. */
const adapter = (lip: number, lipNote: string): Spec[] => [
  {
    group: TARGET_GROUP,
    label: 'Docking adapter, shell',
    value: (229.5 - 205.705) * IN,
    unit: 'm',
    confidence: 'documented',
    note: `23.795 in: GATV station 229.50, where the adapter is bolted on, to 205.705, the plane the ascent shroud is clamped at (Gemini VIII mission report, MSC-G-R-66-4, Figure 3.0-2(b); ${LAUNCH_SYSTEMS_GATV}). 60 in across`,
  },
  {
    group: TARGET_GROUP,
    label: 'Docking cone, lip forward of the adapter’s aft face',
    value: lip * IN,
    unit: 'm',
    confidence: 'documented',
    note: lipNote,
  },
  {
    group: TARGET_GROUP,
    label: 'Docking cone, travel',
    value: 6 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `6.000 in between "EXTENDED" (station 181.875) and "RETRACTED" (187.875): what the mooring drive draws the cone and the docked ship in by (${LAUNCH_SYSTEMS_GATV})`,
  },
  {
    group: TARGET_GROUP,
    label: 'Docking cone, mouth',
    value: 54 * IN,
    unit: 'm',
    confidence: 'estimated',
    note: 'not dimensioned in anything read. 52.6 in across in NASA S66-25782, scaled on the Agena’s 60 in; about 55 in on two schematic drawings. Its depth (22 in) is derived from where the ship’s forward face ends up when docked: vehicles/target-docking-adapter.md',
  },
  {
    group: TARGET_GROUP,
    label: 'L-band dipole boom',
    value: 85 * IN,
    unit: 'm',
    confidence: 'documented',
    note: '"the transponder antenna rises to a height of approximately 85 inches" (SEDR 300 vol. 2, p. 15-20, of the ATDA’s adapter, which was the same); about 80 in to its tip in NASA S66-25782',
  },
];

/** The Gemini Agena Target Vehicle's dimensions, which are the type's. */
export const agenaDimensions = (): Spec[] => [
  {
    group: TARGET_GROUP,
    label: 'Length in orbit, cone run out',
    value: (495.02 - 181.875) * IN,
    unit: 'm',
    confidence: 'derived',
    note: `313.145 in: from the docking cone’s lip, extended, at GATV station 181.875 to the engine’s nozzle exit at 495.02 (${LAUNCH_SYSTEMS_GATV}; Gemini VIII mission report, Figure 3.0-2(a)). The press kit rounds it: "LENGTH (orbit) 26 feet, minus shroud and adapter" (NASA release 66-52, p. 80). Model: 7.954 m, and 9 mm more over the lip’s roll`,
  },
  {
    group: TARGET_GROUP,
    label: 'Diameter',
    value: 60 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `60 in (${LAUNCH_SYSTEMS_GATV})`,
  },
  {
    group: TARGET_GROUP,
    label: 'Auxiliary forward rack',
    value: 17.5 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `"a 17.5-inch extension of the forward midbody", station 229.50 to 247.00, that the docking adapter is bolted to (Launch Systems Final Report, p. III.C-3; ${AGENA_CATALOG}, Figure 13-10)`,
  },
  {
    group: TARGET_GROUP,
    label: 'Forward section',
    value: 40.5 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `"40.5 inches long, extending from Station 247 to Station 287.5" (${AGENA_CATALOG}, section 13.2.1)`,
  },
  {
    group: TARGET_GROUP,
    label: 'Tank section',
    value: (384 - 287.5) * IN,
    unit: 'm',
    confidence: 'documented',
    note: `station 287.5 to 384 (${LAUNCH_SYSTEMS_GATV}); "overall tank length, including the hemispherical ends, was 129.08 inches" (Launch Systems Final Report, p. III.C-7), so each end stands about 16 in beyond the section`,
  },
  {
    group: TARGET_GROUP,
    label: 'Aft bulkhead to nozzle exit',
    value: (495.02 - 462.5) * IN,
    unit: 'm',
    confidence: 'documented',
    note: `station 462.5 to 495.02 (${AGENA_CATALOG}, Figures 13-2 and 14-6; Gemini VIII mission report, Figure 3.0-2(a)). The nozzle’s exit is about 33 in across, scaled from the same figures: estimated`,
  },
  ...adapter(
    229.5 - 181.875,
    `47.625 in with the cone run out, as it waited for a ship (station 181.875); 41.625 in drawn in (${LAUNCH_SYSTEMS_GATV}). The Gemini VIII mission report’s Figure 3.0-2(a) has 183.83 at launch`,
  ),
];

/** The Agena's engines, which are the type's. */
export const agenaMotors = (): Motor[] => [
  {
    name: 'Bell 8247, primary propulsion system',
    count: 1,
    thrustN: 16000 * LBF,
    propellant: 'unsymmetrical dimethylhydrazine / inhibited red fuming nitric acid',
    kind: 'liquid',
    confidence: 'documented',
    note: `"turbopump-fed 16,000-pound thrust engine" (Launch Systems Final Report, p. III.C-13); a nozzle of 45 to 1 with a radiation-cooled titanium extension, restartable from start tanks (${AGENA_CATALOG}, section 14). No burn time is given: it was to be started again in orbit`,
  },
  {
    name: 'Secondary propulsion, Unit II',
    count: 2,
    thrustN: 200 * LBF,
    propellant: 'liquid, in each module’s own tanks: which, not read',
    kind: 'liquid',
    confidence: 'documented',
    note: '"two independent modules mounted on opposite sides of the target vehicle aft section ... a large and a small thrust chamber ... 200 pounds of thrust and 16 pounds of thrust" (Launch Systems Final Report, p. III.C-15)',
  },
  {
    name: 'Secondary propulsion, Unit I',
    count: 2,
    thrustN: 16 * LBF,
    propellant: 'liquid, in each module’s own tanks: which, not read',
    kind: 'liquid',
    confidence: 'documented',
    note: 'the small chamber of each module (Launch Systems Final Report, p. III.C-15): fired before the main engine, to settle its propellants',
  },
  {
    name: 'Attitude control jet',
    count: 6,
    thrustN: 10 * LBF,
    propellant: 'nitrogen',
    confidence: 'documented',
    note: `"six thrust valves in two clusters ... The nozzles have a thrust rating of ten pounds each" (${AGENA_CATALOG}, section 16.3.2.2)`,
  },
];

/** The Augmented Target Docking Adapter's dimensions: there was one. */
export const atdaDimensions = (): Spec[] => [
  {
    group: TARGET_GROUP,
    label: 'Length in orbit',
    value: 146.75 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `"After separation of the ascent shroud, the orbited vehicle was 146.75 inches long" (Gemini IX-A mission report, MSC-G-R-66-6, 3.7.1): the 134.15 in of ${TECH_SUMMARY}, Figure 66, from the cone’s lip to the battery module’s foot, and the 12.60 in of the stub antenna beyond. Model: 3.727 m, and 9 mm more over the lip’s roll`,
  },
  {
    group: TARGET_GROUP,
    label: 'Length with the shroud',
    value: 241.52 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `241.52 in on ${TECH_SUMMARY}, Figure 66, and on SEDR 300 vol. 2, Figure 15-1; the mission report’s text prints 241.25. The model’s shroud is open, so it measures neither`,
  },
  {
    group: TARGET_GROUP,
    label: 'Diameter',
    value: 60 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `60 in across the equipment section, 40.4 in across the reaction control section and 36.2 in across the battery module (${TECH_SUMMARY}, Figure 66, sections C-C, B-B and A-A)`,
  },
  {
    group: TARGET_GROUP,
    label: 'Equipment section',
    value: 54 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `54.00 in (${TECH_SUMMARY}, Figure 66); "approximately 54 inches long and 60 inches in diameter" (Gemini IX-A mission report, 3.7.1.3). The reaction control section is 18.00 in and the battery module 17.75 in`,
  },
  {
    group: TARGET_GROUP,
    label: 'Ascent shroud, length',
    value: 117 * IN,
    unit: 'm',
    confidence: 'documented',
    note: `117.00 in and 65.12 in across its base (${TECH_SUMMARY}, Figure 66); "9 feet 9 inches high and 5 feet 5 inches in diameter" (SEDR 300 vol. 2, p. 15-6); a cylinder 23.5 in long under a cone of 15° (Launch Systems Final Report, p. III.C-3, of the Agena’s shroud, which this was). Its nose’s radius, 9.8 in, is derived from those`,
  },
  {
    group: TARGET_GROUP,
    label: 'Shroud, how far open',
    value: 30,
    unit: 'deg',
    confidence: 'documented',
    note: '"The shroud halves had pivoted to about 30 degrees of separation ... when the wiring became taut on the ends of the band-clamp halves" (Gemini IX-A mission report, 5.8.1.2). Each half is turned 15° in the model',
  },
  ...adapter(
    44.4,
    `44.40 in, as McDonnell drew the ATDA’s (${TECH_SUMMARY}, Figure 66): between the 41.625 in and 47.625 in of an Agena’s cone drawn in and run out`,
  ),
];

/** The ATDA's thrusters: a Gemini spacecraft's re-entry control system. */
export const atdaMotors = (): Motor[] => [
  {
    name: 'Reaction control thruster (ATDA)',
    count: 16,
    thrustN: 23.5 * LBF,
    propellant: 'monomethylhydrazine / nitrogen tetroxide',
    confidence: 'documented',
    note: '"identical to the Gemini spacecraft reentry control system ... Each system had eight thrust chamber assemblies (TCA’s), rated at 23.5 pounds nominal thrust", two systems (Gemini IX-A mission report, 3.7.2.5)',
  },
];

/** A target's own length among its dimensions, as a Measure: the figure written with its name where it is named by itself. */
const lengthOf = (specs: Spec[], label: string): ReturnType<typeof measure> => {
  const spec = specs.find((x) => x.label === label);
  if (!spec) throw new Error(`no such dimension of the target: ${label}`);
  return measure(spec.value, spec.confidence, spec.note ?? '');
};
/** The Agena as a model names its target (`withTarget`): its length in orbit, from the cone's lip run out to the nozzle. */
export const AGENA_TARGET = { name: 'Agena target vehicle', length: lengthOf(agenaDimensions(), 'Length in orbit, cone run out') };
/** The ATDA: its length in orbit as it was meant to fly, without the shroud that stayed on it. */
export const ATDA_TARGET = { name: 'ATDA', length: lengthOf(atdaDimensions(), 'Length in orbit') };

/** Postflight tracking at target insertion. Feet, feet/s and both launch clocks are those printed in the mission report. */
export function targetFix(
  report: string,
  launchOffset: number,
  elapsed: number,
  latitude: number,
  longitude: number,
  feet: number,
  speed: number,
  flightPath: number,
  heading: number,
) {
  const obs = (value: number) => doc(value, report);
  return {
    t: derived(launchOffset + elapsed, report + ', target launch offset from crew launch plus insertion time'),
    latitude: obs(latitude),
    longitude: obs(longitude),
    height: obs(feet * 0.3048),
    speed: obs(speed * 0.3048),
    flightPath: obs(flightPath),
    heading: obs(heading),
  };
}

/** Documented total impulse maneuver in the docked configuration. The measured change of speed includes the start and stop transients. */
export function dockedBurn(label: string, at: number, feetPerSecond: number, pitch: number, yaw: number, source: string, seconds?: number) {
  const main = agenaMotors()[0];
  return {
    label,
    at,
    deltaV: doc(feetPerSecond * 0.3048, source),
    pitch: doc(pitch, source),
    yaw: doc(yaw, source),
    thrust: doc(main.thrustN!, main.note!),
    duration: seconds === undefined ? undefined : doc(seconds, source),
  };
}

/** The hard contact plane is the forward face Z233.97 of Gemini, 19.53 inches forward of the target's aft face.
 * The pressurised craft carries its full equipment section. Roll is about simulator +Y. */
export function dockingProperties(report: string, geminiZ: number, agenaStation: number | null, pounds: number) {
  const slugFoot2 = 0.45359237 * 9.80665 * 0.3048;
  const moment = (v: number) =>
    assumed(
      v * slugFoot2,
      'Gemini II mission report, table 9.1-XIII, on-orbit coast with the equipment section. Sister spacecraft; later equipment and propellant differ.',
    );
  const ship = {
    arm: derived((233.97 - geminiZ) * IN, report + ', section 3.3 launch CG and figure 3.0-2 docking datum; applied at docking.'),
    inertia: [moment(3624.9), moment(1362.4), moment(3568.8)] as const,
  };
  if (agenaStation === null) {
    // Unavailable postlaunch mass properties. Use the actual retained-hardware envelope as a uniform-cylinder surrogate.
    const m = pounds * LB,
      r = 30 * IN,
      h = 241.52 * IN;
    const inertia = (n: number) =>
      derived(
        n,
        report +
          ', section 3.7.1, uniform-cylinder approximation of the retained shroud and adapter; longitudinal mass distribution unknown.',
      );
    return [
      [
        ship,
        {
          arm: assumed((26.3 + 19.53) * IN, report + ', section 3.6 launch CG, used with the shroud retained'),
          inertia: [inertia((m * (3 * r * r + h * h)) / 12), inertia((m * r * r) / 2), inertia((m * (3 * r * r + h * h)) / 12)] as const,
        },
      ],
    ] as const;
  }
  const inertia = (v: number) =>
    assumed(
      (v * slugFoot2 * pounds) / 1450,
      'Lockheed Agena D Mission Capabilities and Restraints Catalog, table 11-2, 1450-lb reference stage. Assumes its mass-normalized moments for the fueled docking vehicle.',
    );
  return [
    [
      ship,
      {
        arm: derived(
          (agenaStation - (229.5 - 19.53)) * IN,
          report + ', section 3.6 in-orbit CG (Gemini VIII’s station 343 used for XI), and Gemini VIII figure 3.0-2(b) mating stations',
        ),
        inertia: [inertia(1951), inertia(136.6), inertia(1926.8)] as const,
      },
    ],
  ] as const;
}
export const geminiControls = { ahead: THRUST.oamsAft, astern: THRUST.oamsForward, lateral: THRUST.oamsAft, attitude: THRUST.oamsAttitude };

/** Measured local-vertical impulse components in ft/s, standardized to forward / down / left.
 * The maneuver tables include IVI zeroing in several elapsed durations. The engine applies
 * the integrated impulse over that interval; this is not a reconstructed valve sequence. */
export function crewTransfer(
  report: string,
  fix: ReturnType<typeof targetFix>,
  rows: readonly (readonly [number, number, number, number, number | Measure])[],
  brake: number,
  station: number,
  feet: number,
  radar?: readonly [number, number, number],
) {
  const burns = rows.map(([at, x, y, z, seconds]) => ({
    at,
    dv: derived(Math.hypot(x, y, z) * 0.3048, report + ' resultant of the three measured components'),
    pitch: derived((Math.atan2(-y, Math.hypot(x, z)) * 180) / Math.PI, report + ' local vertical components'),
    yaw: derived((Math.atan2(-z, x) * 180) / Math.PI, report + ' local vertical components; positive yaw to the right'),
    duration: typeof seconds === 'number' ? doc(seconds, report + ' reported elapsed maneuver interval') : seconds,
  }));
  return {
    radar: radar && {
      at: radar[0],
      range: doc(radar[1] * 1852, report + ' first terminal range'),
      elevation: doc(radar[2], report + ' first terminal elevation'),
    },
    fix,
    burns,
    brake,
    station,
    hold: doc(feet * 0.3048, report + ' reported station-keeping range, approximate'),
  };
}
