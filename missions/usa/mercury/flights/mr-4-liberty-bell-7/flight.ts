import type { Command, Flight, FlightCheck, Keyframe, ModelDef, Move, Part, Winds } from '../../../../../src/types.ts';
import {
  BY,
  HARDWARE_WORDS,
  held,
  hutLeaves,
  LC5_SPECS,
  launcherSpec,
  launcherTurn,
  lc5Parts,
  ON_ROAD,
  SHOWER_RUNS,
  type PadNode,
  type PadStops,
  type PartWords,
  spareTrailerLeaves,
  swing,
  TOWER,
  X,
  Z,
} from '../../../places/cape-canaveral/lc-5.parts.ts';
import { LC5 } from '../../../places/cape-canaveral/lc-5.ts';
import {
  SPEC,
  DEG,
  mercuryRedstoneStack,
  mercuryRedstoneParts,
  along,
  WINDOW_AZ,
  HATCH_AZ,
  PERISCOPE_AZ,
  ENGINE_VIEW,
  NMI,
  FT,
  LBF,
  IN,
  mercuryRedstoneMotors,
  lb,
  CAPSULE_THRUST,
  type PartWords as StackWords,
} from '../../vehicles/mercury-redstone-stack.ts';
import { SPEC as CAPSULE_SPEC } from '../../vehicles/mercury-capsule.ts';
import {
  MERCURY_STICK,
  mercuryCabin,
  mercuryControls,
  mercuryInstruments,
  mercurySeat,
  OBJECTIVE_OUT,
  sequenceLamp,
} from '../../vehicles/cabin.ts';
import { CAPSULE_PLANE, CHUTES, cutoffMass, type Day, plan as mercuryRedstonePlan, PLR } from '../../vehicles/mercury-redstone.ts';
import { ON_THE_PAD, periscopeMechanism, periscopeMoves } from '../../vehicles/periscope.ts';
import { WEATHER } from './weather.ts';
import { derived, doc, estimated } from '../../../../../src/measure.ts';

/**
 * Liberty Bell 7's periscope, out and in (vehicles/periscope.ts): when. How it moves is the model's own (its door, its
 * objective and the link between them each carry their motion: mercury_capsule.periscope_run).
 * "At T-35 seconds, the spacecraft umbilical was [pulled] and the periscope was retracted", and at separation, ten seconds
 * after cutoff at 02:23, "the periscope was extended" (MR-4 Results, p. 6); "periscope is retracting" at 06:41, thirty
 * seconds and more after the retropack was let go at 06:07 (p. 43); "There's the drogue chute. The periscope has
 * extended" at 09:41.5, the drogue at 09:41 (p. 44): it is put out with the drogue, as SEDR 104 has it, and the call's
 * half second is shorter than the motion's five. Documented.
 */
const PERISCOPE_EVENTS: [number, boolean][] = [
  [ON_THE_PAD, true],
  [-35, false],
  [153, true],
  [401, false],
  [581, true],
];
const PERISCOPE = periscopeMoves(PERISCOPE_EVENTS);

const RESULTS = 'Results of the Second U.S. Manned Suborbital Space Flight (NASA MSC, 1961)';

const parts: StackWords[] = [
  {
    node: 'EscapeTower',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing booster. Grissom watched it go.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for under a ' +
      'second through three nozzles canted 19° clear of the capsule. Unused, it is fired clear at booster cutoff: on ' +
      'this flight at T+2:23. With a window in front of him for the first time, the pilot could see it leave, ' +
      '"climbing off to my right", and thought he was still watching it when the capsule separated ten seconds later. ' +
      'As built for Freedom 7: nothing read gives a difference.',
    facts: [
      ['Escape motor', '52,000 lbf for 0.78 s'],
      ['Nozzles', '3, canted 19°'],
      ['Jettison motor', '800 lbf for 1.5 s, 3 nozzles'],
      ['Pylon', 'about 10 ft of 4130 steel tube'],
      ['Jettisoned', 'T+2:23, at booster cutoff'],
    ],
  },
  {
    node: 'AntennaCanister',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners, drogue parachute.',
    detail:
      'The pale band is an 8-inch dielectric window: the metal above and below it are the two halves of a bicone ' +
      'antenna that handles voice, telemetry and command. Two infrared scanners find the horizon in pitch and ' +
      'roll. The drogue came out of it at 21,000 ft, and Grissom saw that through the window too. ' +
      'As built for Freedom 7: nothing read gives a difference.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Antenna', 'bicone, voice and telemetry'],
      ['Scanners', '2 infrared, pitch and roll'],
      ['Drogue', 'out at T+9:41, 21,000 ft'],
    ],
  },
  {
    node: 'RecoveryCompartment',
    name: 'Recovery compartment',
    summary: 'Main and reserve parachutes; pitch and yaw thrusters.',
    detail:
      'A 32-inch cylinder holding a 63-foot ring-sail main parachute and its reserve, skinned in thick beryllium ' +
      'plates that soak up heat where the cone’s thin shingles radiate it. The main opened at 12,300 ft, about a ' +
      'thousand feet higher than designed, and through the window the pilot could see three quarters of it. ' +
      'After landing this end of the capsule went under the water until it righted itself.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium plates, 0.22 in'],
      ['Main parachute', '63 ft ring-sail, out at T+10:14'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
  },
  {
    node: 'Hatch',
    name: 'Explosive hatch',
    summary: 'Seventy bolts, a fuse to break them all at once, and a plunger. It blew when nobody wanted it to.',
    detail:
      'Freedom 7’s hatch was latched and its mechanism weighed 69 lb, too much to take to orbit. This one is the ' +
      'first design’s bolted hatch made to open itself: seventy quarter-inch titanium bolts, each drilled with a ' +
      '0.06 in hole to weaken it, and a mild detonating fuse in a channel round the sill that breaks them all together. ' +
      'Inside, by the pilot’s right arm, a plunger fires it with a blow of five or six pounds once its cover and ' +
      'safety pin are off; outside, a rescuer takes off a small plate and pulls a lanyard. It went on with one bolt ' +
      'left out, misaligned: the count was held half an hour while it was decided sixty-nine would do. After landing ' +
      'Grissom took off the cover and the pin and lay back to wait for the helicopter. The hatch blew, the sea came ' +
      'in over the sill, and the capsule sank where the sea is about 2,800 fathoms deep. He said he had not touched the plunger; no test ' +
      'afterwards made a hatch fire by itself. It is modelled where this capsule’s photographs have it, close ' +
      'beside the window. The hatch itself was not with the capsule when it was raised.',
    facts: [
      ['Weight', '23 lb, against 69 lb for the latch mechanism'],
      ['Bolts', '70 of 1/4 in titanium; 69 on this flight'],
      ['Released by', 'mild detonating fuse round the sill'],
      ['Inside', 'plunger: 5 to 6 lb, or 40 lb with the pin in'],
      ['Outside', 'a lanyard behind a small plate'],
      ['Lost', 'blown after landing; not raised with the capsule'],
    ],
  },
  {
    node: 'Window',
    name: 'Centreline window',
    summary: 'New with this capsule: a window in front of the pilot’s face, where Freedom 7 had two portholes to the side.',
    detail:
      'The astronauts asked for it. The outer pane is Vycor, 0.35 in thick and curved to the cone, good for 1,500 to ' +
      '1,800 °F; behind it, in a well lined with foil, three flat inner panes hold the cabin’s pressure: one more of ' +
      'Vycor and two of tempered glass. Through it the pilot saw 30° across and 33° up and down, and with the capsule ' +
      'in its retrofire attitude two thirds of that was Earth. Grissom saw the sky go from blue to black, a star ' +
      'that turned out to be Venus, the escape tower leaving, the coast of the Gulf, his parachutes; and, with the ' +
      'capsule on its side in the sea, water over the glass. He found the view so much better than the flight plan ' +
      'that he fell behind in it. The panes’ sizes are the drawing’s; where the window stands along the cone is read ' +
      'off photographs.',
    facts: [
      ['Outer pane', '21.0 in long, 11.25 in to 7.51 in wide, 0.35 in Vycor'],
      ['Inner panes', '12.95 in long, 9.49 in to 7.30 in wide; three'],
      ['Field of view', '30° across, 33° up and down'],
      ['Maker', 'Corning Glass Works'],
      ['Coating', 'magnesium fluoride, against glare'],
    ],
  },
  {
    node: 'Afterbody',
    name: 'Conical afterbody',
    summary: 'René 41 shingles, a name, and a crack painted up the side.',
    detail:
      'Nickel-alloy shingles 0.016 in thick, oxidised blue-black, each stiffened by beads pressed across it and held ' +
      'through oversized holes so that it can grow when hot. Grissom named the capsule for its shape, and had the ' +
      'Liberty Bell’s crack painted on it in white from the base nearly to the nose; the name is under the window in ' +
      'three lines. UNITED STATES stands beside the periscope’s door and the flag on its other side. The shingles ' +
      'are laid out as this capsule’s photographs show them, on the pad and as it was raised from the sea in 1999, ' +
      'with their beads running round the cone. The periscope’s door is shut here as it was at liftoff: the ' +
      'objective was drawn in and the door shut over it when the umbilical was pulled 35 seconds before. It came out ' +
      'at separation, went in for the entry and came out again with the drogue; at the launch site and in flight it ' +
      'does so on the clock. When each motion happened is documented; how long each took, and how far the door ' +
      'opens, are estimated.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Paint', 'LIBERTY BELL 7, the crack, UNITED STATES, the flag'],
      ['Thrusters', 'roll: 6 lbf and 1 lbf'],
    ],
    clocked: PERISCOPE,
  },
  {
    node: 'CrewCabin',
    name: 'Crew cabin',
    summary: 'The same couch under a rearranged panel, with a window above it.',
    detail:
      'Two thin titanium skins holding pure oxygen at about 5 psi, and the pilot on a couch moulded to his back. ' +
      'What Shepard said of his panel was acted on: the instruments were moved so that the eye could go round them ' +
      'more easily. The attitude indicator went to the top, with an Earth-path indicator and the clock under it and ' +
      'the periscope’s 8-inch screen below; the sequence lights went into one column down the left console, each ' +
      'beside the ring or button that does the thing by hand. The Earth-path indicator, a globe turned by ' +
      'clockwork, was not working on this flight. New too was a rate command system: with it the hand controller ' +
      'asked for a rate of turn and the capsule held it. And the couch had more padding at the head, against the ' +
      'vibration that had blurred Shepard’s sight. The panel is the report’s figure; where it stands is as in Freedom 7.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5 psi'],
      ['Panel', 'as Hammack and Heberlig’s Figure 6'],
      ['New on it', 'Earth-path indicator (not working); rate command'],
      ['Periscope', '8 in screen, still carried'],
      ['Window', 'in front of the pilot, above the panel'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'Beryllium heat sink, 74.5 inches across.',
    detail:
      'As Freedom 7’s: a suborbital entry is short enough for a solid beryllium shield that soaks up the heat, where ' +
      'the orbital flights needed one that chars away. Behind it the landing bag dropped before the sea, ' +
      'with a clunk the pilot heard.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Radius of curvature', '80 in'],
      ['Material', 'beryllium heat sink, about 1 in'],
      ['Peak load coming in', '11.1 g'],
    ],
  },
  {
    node: 'Retropack',
    name: 'Retropack',
    summary: 'Three retrograde and three posigrade motors.',
    detail:
      'The three small posigrade motors push the capsule off the spent Redstone: fired inside the adapter they gave ' +
      '78 % more than their open thrust, a "popgun effect" worked out between the two flights. The three large ' +
      'motors are an orbital flight’s way home; here they were fired as a test, this time by the pilot’s own hand, ' +
      'thirty seconds after the timer began the sequence. As built for Freedom 7.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', 'by the pilot, T+5:10'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Jettisoned', 'T+6:07'],
    ],
  },
  {
    node: 'RedstoneAdapter',
    name: 'Spacecraft adapter',
    summary: 'Joins the capsule to the booster. Its bolt covers were rounded for this flight.',
    detail:
      'A short flared ring with the retropack nested inside it and a clamp at its top rim holding the capsule. The ' +
      'fairings over the clamp’s three explosive bolts had been rectangular; for this flight they were made a ' +
      'streamlined shape to cut the buffeting Shepard had reported, and their upper parts were hinged to flip off at ' +
      'separation instead of sliding down, which on an earlier flight had damaged the umbilical connections. ' +
      'Their shape here is the report’s figure; their size is read off it.',
    facts: [
      ['Diameter', '70 in to 73.2 in'],
      ['Clamp', 'Marman ring, three explosive bolts'],
      ['Bolt covers', 'streamlined, hinged at the top: new for MR-4'],
      ['Separation', 'T+2:33'],
    ],
  },
  {
    node: 'RedstoneAftUnit',
    name: 'Aft unit',
    summary: 'Top of the booster: autopilot, abort sensing, ballast, and more damping than before.',
    detail:
      'Booster MR-8. The instrument compartment carries the LEV-3 autopilot and the abort sensing system, under ' +
      '487 lb of steel ballast. Shepard had still felt the vehicle shake on the way up, so another 102 lb of ' +
      'lead-loaded damping compound went into this unit for Grissom, who made no complaint of vibration. Nothing ' +
      'of that shows outside: the model is the booster as built for MR-3.',
    facts: [
      ['Booster', 'MR-8'],
      ['Damping compound', '442 lb: 102 lb more than MR-3'],
      ['Autopilot', 'LEV-3'],
      ['Skin', '0.090 in aluminium'],
    ],
  },
  {
    node: 'RedstoneCenterUnit',
    name: 'Centre unit',
    summary: 'Alcohol above, liquid oxygen below.',
    detail:
      'The tank walls are the airframe: the Jupiter-C’s lengthened tanks, which stretched the burn by twenty seconds. ' +
      'The oxygen went aboard later in this count than in Shepard’s, at T-180 minutes after a planned hold to look ' +
      'at the weather again, so that a scrub for cloud need not cost two days.',
    facts: [
      ['Length', '37.50 ft (11.43 m)'],
      ['Alcohol tank', '18.8 ft · 3,348 US gal'],
      ['Oxygen tank', '16.83 ft · 3,072 US gal'],
      ['Marked', 'UNITED STATES down the two sides abeam of the flight’s line; MR 8 on a plate over each fin'],
      ['Oxygen loaded', 'from T-180 min'],
    ],
  },
  {
    node: 'RedstoneTailUnit',
    name: 'Tail unit',
    summary: 'Four fins, four air rudders, the engine bay.',
    detail:
      'The fins keep the vehicle stable; the rudders at their tips steer it while there is air to push against. ' +
      'The black-and-white paint is a roll pattern for the tracking cameras.',
    facts: [
      ['Length', '9.27 ft (2.83 m)'],
      ['Fins', '4, with air rudders'],
      ['Skin', '0.125 in aluminium'],
    ],
  },
  {
    node: 'RedstoneEngine',
    name: 'A-7 engine',
    summary: '78,000 lbf, steered by vanes in its own exhaust.',
    detail:
      'Rocketdyne’s A-7: a single fixed chamber fed by a turbopump that runs on steam from decomposed hydrogen ' +
      'peroxide, with four graphite vanes in the exhaust to steer by. It was aimed 100° east of north this time ' +
      'instead of 102°: a booster going wrong on Shepard’s heading could have reached the Bahamas. It cut off at ' +
      'T+2:23 with the capsule going about 200 ft/s faster than Freedom 7 had.',
    facts: [
      ['Thrust', '78,000 lbf (347 kN) at sea level'],
      ['Cutoff', 'T+2:23'],
      ['Launch azimuth', '100°, against 102° for MR-3'],
      ['Steering', '4 carbon jet vanes'],
    ],
  },
];

/** The spacecraft without its tower. */
const CAPSULE = ['AntennaCanister', 'RecoveryCompartment', 'Hatch', 'Window', 'Afterbody', 'CrewCabin', 'HeatShield', 'Retropack'];

/**
 * Where the pilot stands: on the hardstand on the blockhouse side, 8 m from the launcher, between the transfer van that
 * brought him and the emergency shower, turned toward the lift he is walking to. It is where NASA's photograph of
 * 21 July has him (61-MR4-83: "strolls toward the loxing Mercury-Redstone 4 as it stands in its gantry", the shower
 * at his left hand): the place read off it, to a couple of metres. Open concrete: 2.6 m from the shower, 2 m from the
 * launcher's cable, 4.5 m from the van's steps. The crew model spreads it (`...PILOT`), as Freedom 7's does.
 */
export const PILOT = { position: [7.92, 0, 1.83] as [number, number, number], rotationY: -2.618 };
/** A direction to look at the pilot from: in front of him (or, with `behind`, at his back), turned `aside` radians, `lift` up. */
const facingPilot = (lift: number, aside = 0.12, behind = false): [number, number, number] => [
  Math.sin(PILOT.rotationY + aside + (behind ? Math.PI : 0)),
  lift,
  Math.cos(PILOT.rotationY + aside + (behind ? Math.PI : 0)),
];

/**
 * The flight's azimuth, degrees true (TM X-53107 7.4.3 and 8.3.2: 100 degrees for MR-4), and how the vehicle therefore
 * stood on the launcher: the table turned until the pitch plane lay on the azimuth, the capsule's hatch 60 degrees
 * round from the site's +X toward the structure's side (places/cape-canaveral/lc-5.parts.ts `launcherTurn`; places/cape-canaveral/lc-5.md, "Which way
 * round the vehicle stood": photographs of 3, 19 and 21 July 1961 put it between 50 and 75). model/pad.py builds the
 * launcher, the cable masts and the umbilical turned by the same figure.
 */
const AZIMUTH = 100;
const PAD_TURN = launcherTurn(AZIMUTH) * DEG;

const vehicle = mercuryRedstoneStack({
  flight: 'mr-4-liberty-bell-7',
  parts: mercuryRedstoneParts('mr-4-liberty-bell-7', parts),
  mechanisms: [periscopeMechanism(PERISCOPE_EVENTS)],
  rotationY: PAD_TURN,
  // the two cabin lights (the panel's switch reads BOTH, OFF, L.H. ONLY): put toward the middle of the cabin, as Freedom 7's
  // are, either side of the pilot's head, in the frame the capsule stands in (turned by STAND)
  lights: [
    { position: [0.304, 0.55, 0.092], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
    { position: [0.092, 0.55, 0.304], colour: 0xfffaf2, intensity: 0.7, reach: 3 },
  ],
  views: [
    { id: 'stack', label: 'Full stack', from: along(WINDOW_AZ + 25, 0.12) },
    // each of these is of named parts, so it stays on them as the slider takes the vehicle apart
    { id: 'spacecraft', label: 'Spacecraft', nodes: [...CAPSULE, 'EscapeTower'], from: along(WINDOW_AZ + 25, 0.1) },
    { id: 'capsule', label: 'Capsule', nodes: CAPSULE, from: along(WINDOW_AZ + 20, 0.15) },
    { id: 'window', label: 'Window', nodes: ['Window'], from: along(WINDOW_AZ, 0.3) },
    { id: 'hatch', label: 'Hatch', nodes: ['Hatch'], from: along(HATCH_AZ + 8, 0.3) },
    { id: 'periscope', label: 'Periscope side', nodes: ['Afterbody'], from: along(PERISCOPE_AZ + 22, 0.2) },
    ENGINE_VIEW,
  ],
});

/**
 * The pad's slider is the morning of 21 July 1961, from the pilot going aboard to the pad standing empty. Its stops
 * are the ones Freedom 7's morning is laid out on (places/cape-canaveral/lc-5.parts.ts: PadStops); `MORNING` says when each fell.
 */
const T: PadStops = {
  platforms: 0.0, // T-85 to T-60: platforms 2, 4 and 3 part (1 had opened at T-200)
  rollback: 0.13, // T-55: the structure rolls to the edge of the pad
  cabIn: 0.33, // the cherry picker is raised and its cab brought to the hatch
  launchPosition: 0.48, // T-8:45: the structure rolls on to its launch position
  cabAway: 0.58, // T-2:30: the cab is lowered "away and down" by remote control
  umbilical: 0.72, // T-35 s: the capsule's umbilical is pulled and its mast goes over
  boom: 0.76, // about T-14 s: "boom drop"
  liftoff: 0.8, // 07:20:36 EST
  stow: 0.82, // afterwards (not documented): the tower is folded down onto the truck
  drive: 0.91, // and driven off
};
const MIN = 60;
/** Seconds from liftoff (07:20:36 EST) of a time on the Cape's clocks that morning. */
const est = (hours: number, minutes: number, seconds = 0): number => (hours * 60 + minutes) * 60 + seconds - (7 * 3600 + 20 * 60 + 36);
const TMX = 'NASA TM X-53107, 7.2.3.2, the countdown for MR-4, pp. 7-25 to 7-33';
const HOLDS = `the day’s three holds (${RESULTS}, p. 6; TM X-53107, 8.3.2): 30 minutes at T-45, 9 at T-30 and 41 at T-15`;
/**
 * When a time in the count fell, in seconds from liftoff: the count ran straight from T-180 at 03:00 but for three
 * holds, so an event before T-45 was 80 minutes earlier than the count reads, one before T-30 50 minutes, one before
 * T-15 41 minutes, and from T-15 on the count is the clock. Derived: no report gives these as times of day.
 */
const count = (minutes: number): number => -(minutes + (minutes > 45 ? 80 : minutes > 30 ? 50 : minutes > 15 ? 41 : 0)) * MIN;
const BY_COUNT = `derived: its time in the count, and ${HOLDS}`;
const NOT_RECORDED = 'not recorded: how long the motion took is ours, from its distance at a walking pace';
const GANTRY_REMOVED = count(55);
const ROLLED_BACK = GANTRY_REMOVED + 5 * MIN;
/**
 * The morning on the clock: when each stop on the pad's slider (T, above) happened, in seconds from liftoff, and the
 * three holds, through which nothing on the pad moved. places/cape-canaveral/lc-5.md, "Where things stood, and when (MR-4)".
 */
const MORNING: Keyframe[] = [
  {
    at: est(3, 58),
    slider: T.platforms,
    event: 'Pilot aboard, from the white room',
    confidence: 'documented',
    source: `${RESULTS}, pp. 6 and 50: in the spacecraft at 3:58 a.m. e.s.t., 3 hours 22 minutes before launch`,
  },
  {
    at: count(85),
    slider: T.platforms,
    event: 'T-85: platform 2 opens; the emergency shower is disconnected and stowed for launch',
    confidence: 'derived',
    source: `${TMX}, p. 7-27; ${BY_COUNT}`,
  },
  {
    at: count(80),
    slider: T.platforms + 0.03,
    event: 'T-80: the spare parts trailer and the transfer van are moved',
    confidence: 'derived',
    source: `${TMX}, p. 7-28: "Move spare parts trailer", "Move transfer van to launch position"; ${BY_COUNT}`,
  },
  {
    at: count(65),
    slider: T.platforms + 0.07,
    event: 'T-65: platform 4 opens',
    confidence: 'derived',
    source: `${TMX}, p. 7-28; ${BY_COUNT}`,
  },
  {
    at: count(60),
    slider: T.platforms + 0.1,
    event: 'T-60: platform 3, the white room, opens',
    confidence: 'derived',
    source: `${TMX}, p. 7-28; ${BY_COUNT}`,
  },
  {
    at: GANTRY_REMOVED,
    slider: T.rollback,
    event: 'T-55: the structure starts for the edge of the pad',
    confidence: 'derived',
    source:
      `${TMX}, p. 7-29: "Move structure to edge of pad and ready remote controls"; ${BY_COUNT}. No report gives the time it rolled ` +
      'that morning: a photograph taken about sunrise, with the searchlights still burning, shows it gone (FHSU Project Mercury item 333, LOD 61-6452)',
  },
  {
    at: ROLLED_BACK,
    slider: T.cabIn - 0.01,
    event: 'The structure stands at the edge of the pad',
    confidence: 'estimated',
    source: NOT_RECORDED,
  },
  {
    at: ROLLED_BACK + 0.5 * MIN,
    slider: T.cabIn,
    event: 'The cherry picker is raised from its truck and its cab brought to the hatch',
    confidence: 'estimated',
    source: `${TMX}, p. 7-29: "Position cherry-picker for emergency egress operation", once the structure had gone; the minute is ours`,
  },
  { at: ROLLED_BACK + 4 * MIN, slider: T.cabIn + 0.09, event: 'The cab is at the hatch', confidence: 'estimated', source: NOT_RECORDED },
  {
    at: count(45) - 30 * MIN,
    slider: T.cabIn + 0.1,
    event: 'T-45: held 30 minutes: one of the hatch’s seventy bolts will not go in, and it is left out',
    confidence: 'documented',
    source: `${RESULTS}, p. 6: "A 30-minute hold was called at this time to install a misalined hatch bolt"; This New Ocean, p. 370. The time of day is derived from ${HOLDS}`,
  },
  {
    at: count(30) - 9 * MIN,
    slider: T.cabIn + 0.12,
    event: 'T-30: held 9 minutes while the searchlights are put out: they upset the telemetry, and it is daylight',
    confidence: 'documented',
    source: `${RESULTS}, pp. 6 and 50; TM X-53107, 8.3.2. The time of day is derived from ${HOLDS}`,
  },
  {
    at: count(15) - 41 * MIN,
    slider: T.cabIn + 0.14,
    event: 'T-15: held 41 minutes for the cloud to open, for the long-focus cameras',
    confidence: 'documented',
    source: `${RESULTS}, pp. 6 and 50: "the existing overcast"; TM X-53107, 8.3.2. The time of day is derived from ${HOLDS}`,
  },
  {
    at: -(8 * MIN + 45),
    slider: T.launchPosition,
    event: 'T-8:45: the structure is driven on to its launch position',
    confidence: 'derived',
    source: `${TMX}, p. 7-32: "Remotely move structure to launch position"; the count was not held after T-15`,
  },
  {
    at: -(6 * MIN + 45),
    slider: T.cabAway - 0.02,
    event: 'The structure is at its launch position',
    confidence: 'estimated',
    source: NOT_RECORDED,
  },
  {
    at: -(2 * MIN + 30),
    slider: T.cabAway,
    event: 'T-2:30: the cab is lowered away and down',
    confidence: 'derived',
    source: `${TMX}, p. 7-33: "Remove cherry-picker to launch position" (7.3.3.1 has T-4); the count was not held after T-15`,
  },
  { at: -(1 * MIN + 30), slider: T.cabAway + 0.12, event: 'The cab is down', confidence: 'estimated', source: NOT_RECORDED },
  {
    at: -35,
    slider: T.umbilical,
    event: 'T-35 s: the capsule umbilical is pulled and the periscope drawn in',
    confidence: 'documented',
    source: `${RESULTS}, p. 6`,
  },
  {
    at: -33,
    slider: T.umbilical + 0.035,
    event: 'The capsule mast is down',
    confidence: 'estimated',
    source: 'a mast pulled over by a bungee falls in a second or two',
  },
  {
    at: -14,
    slider: T.boom,
    event: 'T-14 s: boom drop',
    confidence: 'derived',
    source: `${TMX}, p. 7-33 ("about"); the count was not held after T-15`,
  },
  { at: -12, slider: T.boom + 0.035, event: 'The booster mast is down', confidence: 'estimated', source: 'as the capsule mast' },
  {
    at: 0,
    slider: T.liftoff,
    event: 'Liftoff',
    confidence: 'documented',
    source: `${RESULTS}, Table 5-II (p. 31): 7:20:36 a.m. e.s.t.`,
  },
  {
    at: 10 * MIN,
    slider: T.stow,
    event: 'The cherry picker is folded down',
    confidence: 'estimated',
    source: 'not documented: when the pad was cleared afterwards is ours',
  },
  { at: 13 * MIN, slider: T.drive, event: 'It drives off', confidence: 'estimated', source: 'not documented, as above' },
  {
    at: 13.5 * MIN,
    slider: 1,
    event: 'The pad is clear',
    confidence: 'estimated',
    source: 'not documented, as above; half a minute to cross the apron',
  },
];

/** What this flight says of each part of the pad: the hardware is the site's (places/cape-canaveral/lc-5.parts.ts). */
const PAD_WORDS: Record<PadNode, PartWords> = {
  ...HARDWARE_WORDS,
  ServiceStructure: {
    summary: 'The gantry: round the rocket through the night, rolled back at T−55 minutes.',
    detail:
      'The stand Freedom 7 left from eleven weeks before: a Noble Company open A-frame mast on a steel base that rides ' +
      'four powered rail trucks, its work platforms closing round the vehicle in two halves each. Grissom came by the ' +
      'transfer van at 03:55, rode the open mesh lift up its leg, and was in the capsule from the white room on level 3 ' +
      'at 03:58. Then the hatch went on, with seventy bolts where Shepard’s had latched; one would not go in. By the ' +
      'count the structure rolled to the edge of the pad at T−55 minutes and to its launch position at T−8:45. With the ' +
      'three holds that followed, T−55 was 05:05 by the clock: that is worked from the count, not recorded, though a ' +
      'photograph taken about sunrise shows it gone and the cherry picker’s cab at the capsule.',
    facts: [
      ['Height', 'about 135 ft (41 m); 140 ft is quoted'],
      ['Built', 'Noble Co., Oakland; at this complex from 1955'],
      ['White room', 'level 3, added February–May 1961'],
      ['Platforms', 'four, each in two halves; level 1 open from T−200'],
      ['Moves', 'on rails, under its own power'],
      ['Rolled back', 'T−55 min: 05:05 EST by the count and its holds'],
      ['Lift', 'an open cage up the blockhouse side’s leg, from the pad'],
    ],
  },
  CherryPicker: {
    summary: 'The “cherry picker”: folded on its truck through the night, at the hatch once the gantry had gone.',
    detail:
      'A truck-mounted tower that held a cab at the capsule hatch once the service structure had rolled back, so the ' +
      'pilot could step across and be swung clear. It could reach 125 feet, and a push-button in the blockhouse sent ' +
      'the cab "away and down" in the last minutes. Photographs of this count show how it waited: folded down on its ' +
      'International truck beside the pad while the oxygen went aboard, the cab at the truck’s tail hung with netting; ' +
      'then, with the structure gone and the Sun coming up, raised, the cab against the capsule. The rescue had been ' +
      'practised here with it on 7 July. At liftoff its mast still stood, the cab down. Its folding and driving off ' +
      'afterwards, at the end of the slider, is how such a tower travels, not something the record shows.',
    facts: [
      ['Reach', '125 ft (38 m)'],
      ['Stood', 'about 65 ft from the launcher, on the blockhouse side'],
      ['Through the night', 'folded on its truck'],
      ['At the hatch', 'from T−55 min, once the structure had gone'],
      ['Cab lowered', 'T−4 min, or T−2:30 (sources differ)'],
      ['Control', 'ground, cab, or blockhouse'],
    ],
  },
  Hardstand: {
    summary: 'Two hundred feet of concrete; four rails for the service structure.',
    detail:
      'Pad 5 is one of two pads of Complex 5/6, 520 feet apart on one track, with a blockhouse whose point ' +
      'is about 300 feet from each. The structure’s rails cross the slab flush either side of the launcher and run on to ' +
      'its launch position. Twenty-three rockets left this pad between 1956 and 1961, and this was the last. Pad 6 had ' +
      'flown its last Redstone on 27 June; after Liberty Bell 7 the complex never launched again.',
    facts: [
      ['Slab', 'about 200 ft square'],
      ['Rails', 'four, in two pairs'],
      ['Launch azimuth', '100° for MR-4'],
    ],
  },
  GroundEquipment: {
    summary: 'What stood round the launcher that morning, and what was taken away.',
    detail:
      'Beside the structure’s base as Grissom went aboard stood the emergency shower on its cart, connected, and the ' +
      'white transfer van, NASA TV No 1, that had brought him from Hangar S: photographs of 6 and 19 July show the two ' +
      'there together, and one of the 21st has him walking past the shower. The count stows the shower at T−85 and moves the van and the spare parts trailer at T−80. When is ' +
      'documented; where to is not, and that the trailer lettered SP-No 1 is that trailer is our reading. Behind the ' +
      'launcher, through liftoff: the liquid-oxygen topping trailer and a tank behind their blast screens, the chevron ' +
      'drum, the cameras, as the liftoff photographs of both flights show them. Each hut is dragged off by a pickup, ' +
      'which is estimated: nothing records how the huts were moved, or that they were. The searchlights lit the pad ' +
      'through the night and stay where they stand: at T−30 the count was held nine minutes to put them out, because ' +
      'they upset the telemetry, and by then it was daylight.',
  },
  Floodlights: {
    summary: 'The count ran through the night.',
    detail:
      'Timber poles in the grass at the pad’s edge, each with a crossarm of floodlights; they are still burning in the ' +
      'photographs of the liftoff. Grissom was woken at 01:10, came to the pad at 03:55 and was in the capsule at 03:58, ' +
      'in the dark. He waited there three hours and twenty-two minutes.',
  },
};

/** One of the transfer van's two halves driven straight ahead along the track's side: the tractor in its bay's frame, the van in the pad's. */
const vanLeaves = (from: number, to: number): Move[] => [
  {
    kind: 'drive',
    node: 'GroundEquipment_VanTractor',
    from,
    to,
    // in the frame of the bay it stands in, which faces the way it does: x ahead
    path: [
      [4, 0],
      [40, 0],
      [82.6, 0],
    ],
    pivot: [0, 0.513, 0],
    forward: [1, 0],
    wheelRadius: 0.513,
    wheelbase: 3.607,
    wheels: 'GroundEquipment_VanTractor_Wheel',
    steered: 'GroundEquipment_VanTractor_SteerWheel',
    axle: 'z',
    runs: ON_ROAD,
    machine: BY.tractor,
  },
  {
    kind: 'drive',
    node: 'GroundEquipment_TransferVan',
    from,
    to,
    // the same way, in the pad's own frame: it faces along the rails toward the structure's parking places (viewer -Z)
    path: [
      [0, -4],
      [0, -40],
      [0, -82.6],
    ],
    pivot: [0, 0.472, 0],
    forward: [0, -1],
    wheelRadius: 0.472,
    wheelbase: 5.624,
    wheels: 'GroundEquipment_TransferVan_Wheel',
    steered: 'GroundEquipment_TransferVan_NoSteer',
    axle: 'x',
    runs: ON_ROAD,
    machine: BY.trailer,
  },
];

const padParts: Part[] = lc5Parts({
  T,
  words: PAD_WORDS,
  // Level 1 had opened at T-200, before the pilot came (TM X-53107, p. 7-25; verified open at T-80): it is parted from
  // the start. Then 2 at T-85, 4 at T-65 and 3, the white room, at T-60, as the count has them.
  platforms: [
    [1, -1, -0.5],
    [2, T.platforms, T.platforms + 0.03],
    [4, T.platforms + 0.07, T.platforms + 0.1],
    [3, T.platforms + 0.1, T.platforms + 0.128],
  ],
  // Folded on its truck while the structure stands round the vehicle, as it is photographed through this count (FHSU
  // Project Mercury items 443 and 445, 21 July; item 544, undated): the mast down on its rest, the jib back along it,
  // the cab at the truck's tail. The angles are the stow's (places/cape-canaveral/lc-5.md, "Moving parts"). Once the structure has
  // gone it is raised and the cab brought to the hatch; the cab hangs level throughout.
  tower: [
    held('CherryPicker_Mast', Z, -TOWER.stow),
    held('CherryPicker_Jib', Z, TOWER.lower - TOWER.fold),
    held('CherryPicker_Cab', Z, TOWER.stow + TOWER.fold - TOWER.lower),
    swing('CherryPicker_Mast', Z, TOWER.stow, T.cabIn, T.cabIn + 0.09, BY.hydraulics),
    swing('CherryPicker_Jib', Z, TOWER.fold - TOWER.lower, T.cabIn, T.cabIn + 0.09, BY.hydraulics),
    swing('CherryPicker_Cab', Z, TOWER.lower - TOWER.fold - TOWER.stow, T.cabIn, T.cabIn + 0.09, BY.hydraulics),
  ],
  azimuth: AZIMUTH,
  mastEnds: ['on its rest', 'back on its rest'],
  cleared: [
    // T-85: the shower, disconnected, is wheeled from the structure's base to the pad's north edge, clear of the
    // cameras: along the blockhouse side, then along the edge. When is documented; where to is where May's photographs
    // have it stowed (estimated)
    {
      kind: 'slide',
      node: 'GroundEquipment_Shower',
      by: [0, 0, 26.67],
      from: T.platforms,
      to: T.platforms + 0.03,
      runs: SHOWER_RUNS,
      machine: BY.hand,
    },
    {
      kind: 'slide',
      node: 'GroundEquipment_Shower',
      by: [-23.165, 0, 0],
      from: T.platforms + 0.03,
      to: T.platforms + 0.06,
      runs: SHOWER_RUNS,
      machine: BY.hand,
    },
    // T-80: the door steps of the spare parts trailer and of the transfer van fold up, and both are taken away: the
    // trailer north off the pad past the cherry picker, the van straight ahead along the track's side. That they
    // moved then is the count's; how and where to is estimated throughout
    swing('GroundEquipment_TrailerSteps', Z, 95, T.platforms + 0.03, T.platforms + 0.038, BY.hand),
    swing('GroundEquipment_TransferVanSteps', X, -95, T.platforms + 0.03, T.platforms + 0.038, BY.hand),
    ...spareTrailerLeaves(T.platforms + 0.04, T.platforms + 0.125),
    ...vanLeaves(T.platforms + 0.04, T.platforms + 0.125),
    // each hut dragged off on its skids by a pickup, straight out across the pad's edge to the road behind (estimated)
    ...[1, 2].flatMap((k) => hutLeaves(k, T.platforms + 0.03 * k, T.platforms + 0.03 * k + 0.08)),
  ],
});

const pad: ModelDef = {
  id: 'pad',
  name: 'Launch pad',
  url: 'models/usa/mercury/mr-4-liberty-bell-7/pad.glb',
  scale: 'Launch Complex 5 · hardstand 61 m square · to scale',
  backdrop: 'ground',
  slider: ['Pilot aboard · 03:58', 'Pad clear'],
  sequence: MORNING,
  specGroups: ['Launch pad'],
  parts: padParts,
  views: [
    { id: 'pedestal', label: 'Launcher', nodes: ['LaunchPedestal'] },
    { id: 'hatch', label: 'Hatch level', centreY: 21, span: 12 },
    { id: 'truck', label: 'Cherry picker', nodes: ['CherryPicker'] },
  ],
};

/**
 * Virgil Grissom as he walked to the lift on 21 July 1961: the suit of Freedom 7's crew model (crew/mark_iv_suit.py)
 * on his own measures and with what this flight's had. crew/mark-iv-suit.md, "5 May and 21 July 1961", has each
 * difference with its source and how sure it is; the texts below quote it.
 */
const crewParts: Part[] = [
  {
    node: 'Helmet',
    name: 'Helmet',
    summary: 'The same shell as Shepard’s, with new microphones.',
    detail:
      'Fibreglass, with a clear visor that closes on an inflatable seal. New for this flight are the microphones: ' +
      'Electro-Voice units built into the helmet, one at each corner of the mouth where Shepard’s figure has a ' +
      'single boom. The white lead hanging on his right chest is the helmet’s own: it is plugged in once he is ' +
      'on the couch. After landing he unfastened the helmet to be ready to leave; when the hatch blew he lifted ' +
      'it off and dropped it.',
    facts: [
      ['Microphones', 'two, Electro-Voice, new'],
      ['Shell', 'fibreglass'],
      ['Visor seal', 'pneumatic, fed at the left jaw'],
      ['Lead', 'right side, unplugged on the walk'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Torso',
    name: 'Torso',
    summary: 'Aluminised nylon over a rubber bladder; a neck dam rolled under the ring.',
    detail:
      'B.F. Goodrich’s Navy Mark IV, as Shepard wore: one flow of oxygen in at the waist cools and feeds the pilot. ' +
      'The roll under the neck ring is a rubber neck dam, to be pulled up round the neck once the helmet is off ' +
      'so that a suit in the sea stays full of air. Grissom’s was not up tight, and he had left the inlet at his ' +
      'waist unlocked: in the water the suit let its air go and he sank lower with every swell. Under it he wore ' +
      'a urine reservoir, made the day before the flight.',
    facts: [
      ['Markings', 'NASA insignia, "V. I. GRISSOM"'],
      ['Leak rate that morning', '175 cc/min; Shepard’s suit, 400'],
      ['Oxygen inlet', 'left waist'],
      ['Tie-down strap', 'neck ring to crotch'],
      ['Pressure if the cabin fails', '4.6 psi'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Arms',
    name: 'Arms',
    summary: 'Laced to length; the pressure gauge on the left forearm.',
    detail:
      'Cords and lacing along each arm stop a pressurised sleeve ballooning and set its length to the man. The ' +
      'gauge above the left wrist reads suit pressure; on this suit it sits in a thick white bezel. Shepard had ' +
      'knocked his against the abort handle.',
    facts: [['Gauge', 'left forearm, white bezel']],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Gloves',
    name: 'Gloves',
    summary: 'Locked to bearing rings: the wrists turn under pressure.',
    detail:
      'On Freedom 7 each glove joined its sleeve by a zipper round the wrist. For this flight Goodrich fitted ' +
      'quick-removal rings sealed with nylon ball bearings, "permitting 360 degrees of wrist action when the suit ' +
      'is inflated", and no change to the suit was needed to take them. The palms are dark leather; the middle ' +
      'finger is cut straight for pushing buttons, the others curved to the hand controller.',
    facts: [
      ['Wrist', 'ball-bearing ring, new'],
      ['On MR-3', 'zipper'],
      ['Palms', 'dark leather'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Legs',
    name: 'Legs',
    summary: 'Cut to his measure; the biomedical port is the disc on the right thigh.',
    detail:
      'The round port in its reinforcing disc takes the lead from the sensors on his body: two heart leads, ' +
      'breathing and temperature. His legs are the ones the flight surgeon measured that morning: 21 inches ' +
      'round the right thigh and 15 7/8 round each calf, on a man of 150 pounds.',
    facts: [
      ['Thigh', '21 in (53 cm) round'],
      ['Calf', '15 7/8 in (40 cm) round'],
      ['Biomedical port', 'right thigh, front'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Boots',
    name: 'Boots',
    summary: 'Laced, aluminised leather over the suit’s feet.',
    detail:
      'Separate lace-up boots worn over the pressure suit’s socks, as on Freedom 7. He walked the carrier’s deck in them that morning, ' +
      'still in the suit.',
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Harness',
    name: 'Parachute harness',
    summary: 'Worn over the suit, for a chest parachute he did not wear to the pad.',
    detail:
      'Two straps from the hips over the shoulders, crossed on the back, with leg straps through the crotch and a ' +
      'strap across the chest. The ring on each padded shoulder strap is where a chest parachute would snap on. ' +
      'Shepard’s wrist had bumped that parachute when he worked the hand controller, so for this flight the ' +
      'harness was designed again to keep it out of the way. The white tape on the chest strap says whose it is.',
    facts: [
      ['Pads', 'quilted, slate blue'],
      ['Webbing', 'olive brown'],
      ['Name tape', 'GRISSOM, on the chest strap'],
      ['Parachute', 'not worn to the pad'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Mirror',
    name: 'Chest mirror',
    summary: 'A five-inch convex mirror: the camera read the instruments in it.',
    detail:
      'A camera in the cabin watched the pilot’s face. With a convex mirror on his chest the same film also ' +
      'showed the panel he was looking at. The astronauts called it the hero’s medal. Freedom 7 had none. It ' +
      'went through the hatch and into the sea with him, and is still on his chest in the photographs taken on ' +
      'the carrier.',
    facts: [
      ['Mirror', '5 in (12.7 cm), Plexiglas'],
      ['Rim', 'about 15 cm across'],
      ['Hung', 'between the shoulder straps'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
  {
    node: 'Ventilator',
    name: 'Portable ventilator',
    summary: 'The white case in his right hand.',
    detail:
      'A sealed suit cannot shed heat, so from the suiting room to the capsule he carried his own cooling: "the ' +
      'case containing air conditioning equipment to keep him comfortable in his space suit", as NASA’s caption ' +
      'to the photograph of this walk has it. In the transfer van the van’s own system took over, and he was ' +
      'briefed on the way to save a quarter of an hour; at the pad the case was plugged in again for the walk ' +
      'to the lift.',
    facts: [
      ['Carried', 'right hand, by himself'],
      ['Hose', 'to the inlet at the left waist'],
    ],
    explode: [0, 0, 0],
    order: 0,
  },
];

const crew: ModelDef = {
  id: 'crew',
  name: 'Crew',
  url: 'models/usa/mercury/mr-4-liberty-bell-7/crew.glb',
  scale: 'Virgil I. Grissom · 1.70 m, 1.79 m suited · to scale',
  backdrop: 'ground',
  parts: crewParts,
  ...PILOT,
  walker: {
    eyes: 'Helmet_Eyes',
    forward: [0, 1],
    // the portable ventilator, in his right hand as in the photograph of this walk, its hose up to the inlet at his left waist
    carries: [{ node: 'Ventilator', hand: 'R', hose: { mesh: 'Ventilator_Hose', from: 'Ventilator_HosePort', to: 'Inlet' } }],
  },
  wide: false,
  specGroups: ['Pressure suit'],
  home: 'walk',
  views: [
    // as NASA 61-MR4-83 has him: from behind and low, walking to the lift, the vehicle standing over him
    { id: 'walk', label: 'Walk to the lift', centreY: 2.4, span: 6.2, from: facingPilot(-0.3, 0.35, true) },
    { id: 'figure', label: 'Pilot', centreY: 0.92, span: 2.4, from: facingPilot(0.05) },
    { id: 'helmet', label: 'Helmet', centreY: 1.62, span: 0.62, from: facingPilot(0.05) },
    { id: 'chest', label: 'Mirror and harness', centreY: 1.3, span: 0.62, from: facingPilot(0.05) },
    { id: 'back', label: 'Harness, behind', centreY: 1.15, span: 1.1, from: facingPilot(0.05, 0.12, true) },
    { id: 'hands', label: 'Gloves', centreY: 0.88, span: 0.62, from: facingPilot(0.05) },
    { id: 'boots', label: 'Boots', centreY: 0.2, span: 0.62, from: facingPilot(0.2) },
  ],
  // just after rollback, so that he can be seen: when he walked to the lift, in the dark, the structure still stood round the rocket
  with: [{ model: 'pad', at: ROLLED_BACK }],
};

const PSF = 47.880259; // pascals in a pound per square foot
const TMX_8_1 = 'NASA TM X-53107, Table 8-1, column MR-4';
const HH_20 = 'Hammack and Heberlig, Figure 20 ("Comparison of actual and planned flight parameters")';
/**
 * What the record says happened, for the simulator to be held against (tests/sim.test.mjs). Set from the reports before
 * anything was flown, by Freedom 7's rule: 2 per cent on heights and distances, 1 per cent on speeds, 5 per cent on dynamic
 * pressure, half a g, ten seconds. This flight's record is thinner than Freedom 7's: the Postlaunch Memorandum Report for
 * MR-4, which has the conditions at separation to the tenth, has not been found, so there is no height or climb angle at
 * separation and no 0.05 g time to hold it to. Where the reports disagree the check takes the Results' figure and says what
 * the other gives.
 */
const check = (id: FlightCheck['id'], label: string, value: number, unit: string, tolerance: number, source: string): FlightCheck => ({
  id,
  label,
  value,
  unit,
  tolerance,
  confidence: 'documented',
  source,
});
const checks: FlightCheck[] = [
  check(
    'apogee',
    'Greatest height',
    102.8 * NMI,
    'm',
    0.02 * 102.8 * NMI,
    `${RESULTS}, Table 2-I: maximum altitude 102.8 nautical miles; ${TMX_8_1}: 102.76`,
  ),
  check(
    'apogeeAt',
    'Time of greatest height',
    316,
    's',
    10,
    `${RESULTS}, p. 6: the retro sequence "was initiated by timer at T+4 minutes 46 seconds, which was 30 seconds prior to the spacecraft reaching its apogee": 05:16`,
  ),
  check('range', 'Range', 262.5 * NMI, 'm', 0.02 * 262.5 * NMI, `${RESULTS}, Table 2-I: range 262.5 nautical miles; ${TMX_8_1}: the same`),
  check('duration', 'Liftoff to landing', 937, 's', 10, `${RESULTS}, p. 6: "Landing occurred at T+15 minutes 37 seconds"`),
  check(
    'separationSpeed',
    'Space-fixed speed at separation',
    7580 * FT,
    'm/s',
    0.01 * 7580 * FT,
    `${RESULTS}, Table 2-I: space-fixed velocity 7,580 ft/s; ${TMX_8_1} and Table 8-4 the same, "at cutoff". ` +
      `The tables give MR-3's 7,388 in the same row, which its Postlaunch Report has at capsule separation: so the row is taken as at separation. ${HH_20} gives 7,516 for MR-4 (7,499 planned)`,
  ),
  check(
    'separationGroundSpeed',
    'Earth-fixed speed at separation',
    6618 * FT,
    'm/s',
    0.01 * 6618 * FT,
    `${RESULTS}, Table 2-I: Earth-fixed velocity 6,618 ft/s (TM X-53107, Table 8-4, the same, "at cutoff"); ${HH_20} gives 6,561 (6,540 planned)`,
  ),
  check(
    'exitQ',
    'Greatest dynamic pressure, going up',
    605.5 * PSF,
    'Pa',
    0.05 * 605.5 * PSF,
    `${RESULTS}, Table 2-I: maximum exit dynamic pressure 605.5 lb/sq ft; ${TMX_8_1}: 605`,
  ),
  // independent here, as it is not for Freedom 7: the nozzle's exit area is the A-7's, derived on MR-3's figures
  check('exitG', 'Greatest load, going up', 6.3, 'g', 0.5, `${RESULTS}, Table 2-I: maximum exit longitudinal load factor 6.3 g`),
  check('entryG', 'Greatest load, coming down', 11.1, 'g', 0.5, `${RESULTS}, Table 2-I: maximum reentry longitudinal load factor 11.1 g`),
  check(
    'drogueAt',
    'Drogue parachute',
    581,
    's',
    10,
    `${RESULTS}, p. 6: "The drogue parachute was deployed at T+9 minutes 41 seconds"; the pilot, at 09:41.5: "There's the drogue chute" (p. 44)`,
  ),
  check(
    'mainAt',
    'Main parachute',
    614,
    's',
    10,
    `${RESULTS}, p. 6: "main parachute, at T+10 minutes 14 seconds"; the pilot, at 10:14: "There goes the main chute" (p. 44)`,
  ),
];

/**
 * What each part can be told to do in flight (types.ts `Command`; the part's right-click menu on the flight deck): the
 * same steps as Freedom 7's, on the same hardware.
 */
const COMMANDS: Record<string, Command[]> = {
  EscapeTower: [{ label: 'Jettison the escape tower', ask: 'tower' }],
  AntennaCanister: [{ label: 'Deploy the drogue parachute', ask: 'drogue' }],
  RecoveryCompartment: [{ label: 'Deploy the main parachute', ask: 'main' }],
  Afterbody: [{ label: 'Extend the periscope', back: 'Retract the periscope', ask: 'work:periscope' }],
  Retropack: [
    { label: 'Fire the retrorockets', ask: 'retro' },
    { label: 'Jettison the retropack', ask: 'retropack' },
  ],
  Hatch: [{ label: 'Blow the hatch', ask: 'hatch' }],
  RedstoneAdapter: [{ label: 'Separate the spacecraft', ask: 'separate' }],
  RedstoneTailUnit: [{ label: 'Shut the engine down', ask: 'cutoff' }],
  RedstoneEngine: [{ label: 'Shut the engine down', ask: 'cutoff' }],
};
for (const p of vehicle.parts) if (COMMANDS[p.node]) p.commands = COMMANDS[p.node];

const LB = 0.45359237;
const KT_M = 0.1; // IGRA's speeds are in tenths of a metre a second
const IGRA =
  'NOAA IGRA v2, station USM00074794 (Cape Canaveral), 21 July 1961 12Z: the routine balloon at 07:00 EST, twenty minutes before liftoff';
/**
 * The winds aloft over the Cape that morning: the balloon's mandatory levels, [geopotential height m, pressure hPa, from
 * degrees, speed in tenths of a metre a second], as the archive has them (its 50 hPa level has no wind and is left out).
 * Nothing was drawn for this flight's report as MR-3's Figure 10.3-1 was: only these levels are known, and between them
 * the wind is a straight line. Light all the way up: southerly under 8 km, northerly at 11 and 12, easterly above.
 */
const IGRA_LEVELS: [m: number, hPa: number, from: number, tenths: number][] = [
  [3, 1017, 181, 20],
  [154, 1000, 183, 40],
  [1569, 850, 188, 60],
  [3203, 700, 195, 50],
  [5901, 500, 180, 40],
  [7596, 400, 208, 50],
  [10_925, 250, 5, 60],
  [12_375, 200, 6, 70],
  [14_142, 150, 75, 120],
  [16_566, 100, 56, 70],
  [18_720, 70, 86, 130],
  [24_096, 30, 72, 150],
  [26_743, 20, 89, 160],
  [31_421, 10, 89, 240],
];
const WINDS: Winds = {
  levels: IGRA_LEVELS.map(([m, hPa, from, tenths]) => ({
    height: m,
    speed: {
      value: tenths * KT_M,
      confidence: 'documented',
      source: `${IGRA}, ${hPa} hPa at ${m.toLocaleString('en-US')} m: ${(tenths * KT_M).toFixed(1)} m/s. Geopotential height, taken as height above the sea`,
    },
    from: { value: from, confidence: 'documented', source: `${IGRA}, ${hPa} hPa: from ${from} degrees` },
  })),
  calmAbove: estimated(
    40_000,
    'no wind is recorded above 10 hPa (31.4 km). Taken as falling evenly to nothing by 40 km, where the air is a three-hundredth of the surface’s and what it does to the flight is past measuring. Ours',
  ),
};

/** MR-8 as measured (TM X-53107, Table 8-1, column MR-4). */
const THRUST = 79_220 * LBF;
const ISP = 217.4;
const LIFTOFF = 65_976;
/** Booster cutoff, with the tower; the spacecraft parted ten seconds later (Results, p. 6; the pilot's calls at 02:23 and 02:33, p. 42). */
const CUTOFF = 143;
const SEPARATION = 153;
/**
 * Pounds: capsule No. 11 with its tower and in its "orbit" configuration, and on re-entry. Its Postlaunch Memorandum Report
 * has them and has not been found; nothing read gives them. Taken as No. 7's (MR-3's Postlaunch Report, 3.1) less the 46 lb
 * the explosive hatch saved (23 lb against 69: Results, p. 4). What the window, the rate command system and the new panel
 * weighed against No. 7's portholes and panel is not known, so these are estimates. A figure of 2,835 lb is printed
 * without a source (Wikipedia, "Mercury-Redstone 4": "launch mass"); against the orbit weight here it is 26 lb, 1 per cent.
 */
const HATCH_SAVED = 69 - 23;
const CAPSULE_LAUNCH = 4040.28 - HATCH_SAVED;
const CAPSULE_ORBIT = 2855.14 - HATCH_SAVED;
const CAPSULE_ENTRY = 2579.0 - HATCH_SAVED;
const NO11 = `No. 11’s weights are in its Postlaunch Memorandum Report, which has not been found: taken as No. 7’s (${PLR}, 3.1) less the ${HATCH_SAVED} lb its explosive hatch saved (${RESULTS}, p. 4). The window, the rate command system and the new panel are not counted`;
export const DAY: Day = {
  winds: WINDS,
  azimuth: doc(
    AZIMUTH,
    'NASA TM X-53107, 8.3.2: "the launch azimuth was changed from the 102 degrees used for MR-2, BD, and 3 to 100 degrees east of north"; 7.4.3: "The MR-4 mission was launched at 100 degrees azimuth"',
  ),
  liftoffMass: doc(LIFTOFF * LB, `${TMX_8_1}: weight at liftoff 65,976 lb`),
  thrust: doc(THRUST, `${TMX_8_1}: thrust, sea level, 79,220 lb (MR-3’s was 78,860)`),
  isp: doc(
    ISP,
    `${TMX_8_1}: engine specific impulse, sea level, 217.4 s (so 364.4 lb/s, taken as the whole flow, turbine exhaust included)`,
  ),
  cutoff: doc(
    CUTOFF,
    `${RESULTS}, p. 6: "launch-vehicle cutoff occurred at T+2 minutes 23 seconds"; the pilot at 02:23: "There went the tower" (p. 42). To the second: the tenth is in the memorandum report, not found`,
  ),
  separation: {
    at: doc(
      SEPARATION,
      `${RESULTS}, p. 6: "Ten seconds later, the spacecraft-to-launch-vehicle adapter clamp ring was separated"; the pilot at 02:33: "There went posigrades, capsule has separated" (p. 42)`,
    ),
    mass: estimated(CAPSULE_ORBIT * LB, `${NO11}: ${CAPSULE_ORBIT.toFixed(2)} lb in the "orbit" configuration`),
    boosterMass: estimated(
      cutoffMass(LIFTOFF * LB, THRUST, ISP, CUTOFF) - CAPSULE_LAUNCH * LB,
      `the liftoff weight, less the flow for ${CUTOFF} s, less the capsule and tower at launch (${CAPSULE_LAUNCH.toFixed(2)} lb, estimated: ${NO11})`,
    ),
    speed: estimated(
      30 * FT,
      `not recorded for MR-4. Freedom 7’s, the same posigrades on the same adapter: ${PLR}, section 4.2, separation velocity approximately 30 plus or minus 3 ft/s`,
    ),
  },
  retro: {
    fires: [
      doc(
        310,
        `${RESULTS}, p. 6: "He initiated firing of the retrorockets at T+5 minutes 10 seconds"; the pilot at 05:11.5: "there’s 1 firing" (p. 43)`,
      ),
      ...[315, 320].map((t, i) =>
        derived(
          t,
          `retro no. ${i + 2}: five seconds after the one before, as Figure 2-5 of ${RESULTS} has the motors ("5 SEC INTERVALS"); the pilot at 05:19: "There’s 2 firing … There went 3" (p. 43)`,
        ),
      ),
    ],
    pitch: doc(
      34,
      `${RESULTS}, pp. 35 and 36: "the attitudes were held very close to the proper retroattitude of 0° in roll and yaw and −34° in pitch" (Figure 6-3). The blunt end’s elevation, as Freedom 7’s: the push is rearward and 34 degrees below the level`,
    ),
  },
  retropack: {
    at: doc(367, `${RESULTS}, p. 6: "The retrorocket package was jettisoned at T+6 minutes 7 seconds"`),
    mass: estimated(CAPSULE_ENTRY * LB, `${NO11}: ${CAPSULE_ENTRY.toFixed(2)} lb in the re-entry configuration`),
  },
  drogue: doc(21_000 * FT, 'This New Ocean, p. 372: "The drogue parachute deployed on schedule at 21,000 feet"'),
  main: doc(
    12_300 * FT,
    'This New Ocean, p. 372: "Main parachute deployment occurred at 12,300 feet, which was about 1000 feet higher than the design nominal altitude" (Hammack p. 9 has the design’s 10,000 ft, which is 2,300 lower: the history’s "about 1000" and its own two figures disagree)',
  ),
  starts: estimated(
    299,
    'a July morning at the Cape, 25.5 C at the Skid Strip at 07:00 (weather.ts): what the shield and skin stood at on the pad is not in anything read',
  ),
  stack: {
    booster: 'MR-8',
    boosterDry: 8195,
    compound: 442,
    compoundSource: 'MR-8’s damping compound, 442 lb: MR-3’s and 102 lb more (TM X-53107, 4.2.1 and 8.3.2)',
    liftoff: LIFTOFF,
    fluids: 'estimated',
    capsuleLaunch: CAPSULE_LAUNCH,
    capsuleOrbit: CAPSULE_ORBIT,
    orbitWeight: { confidence: 'estimated', source: `${NO11}: ${CAPSULE_ORBIT.toFixed(2)} lb in the "orbit" configuration` },
    towerWeight: {
      confidence: 'derived',
      source: `the same tower as Freedom 7’s: ${PLR}, section 3.1, its launch weight less its "orbit" weight, 1,185 lb, which is the tower and whatever else left with it`,
    },
    tower: doc(
      CUTOFF,
      `${RESULTS}, p. 6: at cutoff, "the escape tower clamp ring was released, and escape tower was released by firing the escape and tower jettison rockets"`,
    ),
    earthward: derived(
      180,
      'the periscope’s side, by Freedom 7’s reasoning (its `earthward`): the vehicle stood on the launcher with its pitch plane on the azimuth, here 100 degrees ' +
        '(places/cape-canaveral/lc-5.md, "Which way round the vehicle stood"), so the spacecraft rode feet and periscope down range and was turned heat shield first by a yaw, ' +
        '"counter clockwise" (Results, Figure 2-5), into the orbit attitude of 34 degrees (p. 6)',
    ),
    push: estimated(30 * FT, `not recorded for MR-4: Freedom 7’s, ${PLR}, section 4.2, approximately 30 plus or minus 3 ft/s`),
    rate: {
      deadband: doc(
        3,
        `${RESULTS}, p. 3: the rate stabilization and control system "damps to the commanded rate to within ±3 deg/sec. Without manual command, it damps to zero rate within ±3 deg/sec"; the pilot, p. 52: "This system had a deadband of ±3 deg/sec"`,
      ),
      full: estimated(
        10,
        'the rate asked for at full throw of the stick is not in anything read (the record says only that "design turning rates were not achieved with full stick deflection", p. 7, blamed on the linkage): ten degrees a second is ours',
      ),
    },
    retropackMass: derived(
      (2855.14 - 2579.0) * LB,
      `the same pack as Freedom 7’s: ${PLR}, section 3.1, its "orbit" weight less its re-entry weight, 276.14 lb, burned propellant with it (so the pack as it fell was lighter): flown at the whole figure`,
    ),
  },
};

export const flight: Flight = {
  id: 'usa/mercury/mr-4-liberty-bell-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Redstone 4',
  callsign: 'Liberty Bell 7',
  spacecraft: 'Mercury spacecraft No. 11 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Redstone MRLV, MR-8',
  // 07:20:36 EST: Results of the Second U.S. Manned Suborbital Space Flight, Table 5-II (p. 31); 07:20 on p. 6 and in TM X-53107, 8.3.2
  launch: '1961-07-21T12:20:36Z',
  launchSite: LC5.name,
  site: LC5,
  weather: WEATHER,
  crew: ['Virgil I. Grissom'],
  summary:
    'The second American in space. Fifteen minutes from Cape Canaveral into the Atlantic, in the first Mercury ' +
    'capsule with a window in front of its pilot and a hatch that could blow itself off. After landing it did, ' +
    'and the capsule sank; it was raised from the sea floor thirty-eight years later, on 20 July 1999.',
  facts: [
    { label: 'Liftoff', value: '21 July 1961, 12:20 UTC' },
    { label: 'Pilot', value: 'Virgil I. "Gus" Grissom' },
    { label: 'Duration', value: '15 min 37 s' },
    { label: 'Apogee', value: '190.4 km' },
    { label: 'Range', value: '486.2 km' },
    { label: 'Peak velocity', value: '8,317 km/h, space-fixed' },
    { label: 'Peak load', value: '11.1 g on entry' },
    { label: 'Recovery', value: 'pilot by helicopter to USS Randolph; capsule lost' },
  ],
  // Results of the Second U.S. Manned Suborbital Space Flight, pp. 6 and 7 (minutes and seconds, as it gives them)
  timeline: [
    { t: 0, event: 'Liftoff, 07:20 EST' },
    { t: 143, event: 'Booster engine cutoff, 6.3 g; escape tower released and fired clear' },
    { t: 153, event: 'Spacecraft separation: posigrade motors fire' },
    { t: 185, event: 'Grissom takes manual control' },
    { t: 286, event: 'Retro sequence begun by the timer' },
    { t: 310, event: 'Retrofire, by the pilot: three motors, five seconds apart' },
    { t: 316, event: 'Apogee, 190.4 km' },
    { t: 343, event: 'Rate command control, through the entry' },
    { t: 367, event: 'Retropack jettison' },
    { t: 581, event: 'Drogue parachute, 21,000 ft' },
    { t: 614, event: 'Main parachute, 12,300 ft' },
    { t: 937, event: 'Landing' },
  ],
  specs: [
    {
      group: 'Spacecraft',
      label: 'Heat shield diameter',
      value: 74.5 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '74.5 in (NASA CR-649)',
    },
    {
      group: 'Spacecraft',
      label: 'Heat shield radius of curvature',
      value: 80 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '80 in (NASA CR-649)',
    },
    CAPSULE_SPEC.afterbodyHalfAngle,
    {
      group: 'Spacecraft',
      label: 'Length, retro nozzles to canister top',
      value: 131.57 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '131.57 in: Z77.50 to Z209.07 (SEDR 104, Figure 1-3; Hammack & Heberlig, Figure 2)',
    },
    {
      group: 'Spacecraft',
      label: 'Length with escape tower',
      value: 311.55 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '311.55 in: Z77.50 to Z389.05 (SEDR 104, Figure 1-3; Hammack & Heberlig, Figure 2)',
    },
    CAPSULE_SPEC.windowPane,
    {
      group: 'Spacecraft',
      label: 'Window, inner panes length',
      value: 12.95 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '12.950 in by 9.490 in and 7.300 in, corners of 1 3/4 in radius (NASA SP-45, Figure 19-1)',
    },
    {
      group: 'Spacecraft',
      label: 'Window, outer pane thickness',
      value: 0.35 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `0.35 in of Vycor; inner panes 0.17 in of Vycor and two of 0.34 in tempered glass (${RESULTS}, p. 4)`,
    },
    {
      group: 'Spacecraft',
      label: 'Window field of view, across',
      value: 30,
      unit: 'deg',
      confidence: 'documented',
      note: `30° in the horizontal plane and 33° in the vertical (${RESULTS}, p. 3)`,
    },
    {
      group: 'Spacecraft',
      label: 'Window, middle of the outer pane above the widest plane',
      value: 31.5 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '31.5 in, give or take 1.5: no document read gives the window’s station. Measured on photographs of No. 20 (NASA S63-07701) and of No. 13 as it is kept (NASM A19670176000) between the cone’s two ends, and carried to this capsule through the hatch’s opening beside it (Liberty Bell 7 at Bonn, 2014). Its own close photographs (61-MR4-53, MSFC-6116423), their cameras solved for together, agree: they put the glass’s foot 21.3 in above the lower edge of the ring at the cone’s foot. Until November 2026 the model had 35.8',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch weight',
      value: 23 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: `23 lb as installed, against 69 lb for the mechanical one (${RESULTS}, p. 4)`,
    },
    {
      group: 'Spacecraft',
      label: 'Hatch bolts',
      value: 70,
      unit: 'bolts',
      confidence: 'documented',
      note: `seventy 1/4 in titanium bolts, a 0.06 in hole in each (${RESULTS}, p. 4). It flew on 69: one was misaligned and left out (This New Ocean, p. 370)`,
    },
    {
      group: 'Spacecraft',
      label: 'Hatch, middle round from the window',
      value: 45,
      unit: 'deg',
      confidence: 'estimated',
      note: '45° toward the pilot’s right, 55° wide, stations 18.5 to 45.4 in: its edge beside the window’s plate in NASA 61-MR4-53, S61-02881 and MSFC-6116423; SEDR 104 Figure 13-11 has thermocouples on it at Z123.0 to Z147.25',
    },
    {
      group: 'Spacecraft',
      label: 'Periscope objective above the widest plane',
      value: 41.5 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '41.5 in: scaled off NASA S61-03705, where the lens stands level with the upper line of UNITED STATES',
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 102.8 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `102.8 nautical miles (${RESULTS}, Table 2-I)`,
    },
    {
      group: 'Spacecraft',
      label: 'Range',
      value: 262.5 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '262.5 nautical miles (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Velocity at cutoff, space-fixed',
      value: 7580 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: '7,580 ft/s; Earth-fixed 6,618 ft/s (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest dynamic pressure going up',
      value: 605.5 * 47.880259,
      unit: 'Pa',
      confidence: 'documented',
      note: '605.5 lb/sq ft (the same table)',
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 25.414,
      unit: 'm',
      confidence: 'documented',
      note: '83.38 ft, fins to spike (TM X-53107, 4.1); model: 25.414 m',
    },
    SPEC.boosterDiameter,
    SPEC.boosterLength,
    {
      group: 'Launch vehicle',
      label: 'Damping compound in the aft unit',
      value: 442 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: '442 lb of X-306: the 340 lb flown on MR-3 and 102 lb added for MR-4 (TM X-53107, 4.2.1 and 8.3.2)',
    },
    {
      group: 'Launch vehicle',
      label: 'Launch azimuth',
      value: 100,
      unit: 'deg',
      confidence: 'documented',
      note: '100° east of north, changed from the 102° of MR-2, MR-BD and MR-3 (TM X-53107, 8.3.2)',
    },
    {
      group: 'Pressure suit',
      label: 'Pilot height',
      value: 1.702,
      unit: 'm',
      confidence: 'estimated',
      note: 'Grissom is commonly given as 5 ft 7 in; no primary record of his height was found (not in the 1959 press conference, the MR-4 press kit or his NASA biography), and 5 ft 5 in and 5 ft 6 in are also printed',
    },
    {
      group: 'Pressure suit',
      label: 'Pilot weight',
      value: 150.5 * 0.45359237,
      unit: 'kg',
      confidence: 'documented',
      note: `150 lb 8 oz, nude, seven hours before the launch; 147 lb 3 oz aboard the carrier (${RESULTS}, Table 3-I)`,
    },
    {
      group: 'Pressure suit',
      label: 'Round the thigh',
      value: 21 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `21 in right, 20 3/4 in left, at the examination on the morning of the flight (${RESULTS}, p. 9)`,
    },
    {
      group: 'Pressure suit',
      label: 'Round the calf',
      value: 15.875 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `15 7/8 in, both (${RESULTS}, p. 9)`,
    },
    {
      group: 'Pressure suit',
      label: 'Chest mirror',
      value: 5 * IN,
      unit: 'm',
      confidence: 'documented',
      note: '"the 5-inch plexiglas parabolic mirror attached to Grissom’s suit" (NASA’s caption to photograph 61-MR4-79); its rim, about 15 cm across, is read off the photographs',
    },
    {
      group: 'Pressure suit',
      label: 'Operating pressure',
      value: 4.6 * 6.894757,
      unit: 'kPa',
      confidence: 'documented',
      note: '4.6 psi, held by the suit regulator only if the cabin loses pressure (SEDR 104); on this flight the cabin held about 5 psi and the suit was never inflated',
    },
    ...LC5_SPECS,
    launcherSpec(AZIMUTH),
  ],
  motors: mercuryRedstoneMotors({
    booster: {
      thrustN: THRUST,
      burnS: 143,
      confidence: 'documented',
      note: `sea level, as measured on MR-4: 79,220 lbf (${TMX_8_1}); 78,000 lbf nominal. Cutoff on this flight at T+2:23 (${RESULTS}, p. 6)`,
    },
    escape: {
      burnS: 0.78,
      confidence: 'documented',
      note: `${lb(CAPSULE_THRUST.escape)} lbf for 0.78 s, then decaying; three nozzles canted 19° (SEDR 104)`,
    },
    jettison: {
      burnS: 1.5,
      confidence: 'assumed',
      note: 'SP-45 nominal; McDonnell gives 785 lbf. Three nozzles canted 30°',
    },
    posigrade: {
      burnS: 1,
      confidence: 'assumed',
      note: 'SP-45 nominal. Fired into the adapter they gave 78 % more than in the open (This New Ocean, p. 367)',
    },
    retrograde: {
      burnS: 10,
      confidence: 'assumed',
      note: 'SP-45 nominal; McDonnell gives 992 lbf over 13.2 s. Fired 5 s apart',
    },
    pitchYaw: {
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig)',
    },
    roll: {
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig)',
    },
    low: {
      confidence: 'documented',
      note: 'automatic system, all axes (Hammack and Heberlig)',
    },
  }),
  checks,
  plan: mercuryRedstonePlan(DAY, checks),
  flownNote:
    'The powered flight ends 4 % too fast, as Freedom 7’s does and for the same reason (the booster’s modelled burn), and what follows is high and long: 12 % on the apogee, 16 % on the range. ' +
    'Flown from the record’s speed at separation (its height and climb there are not in the record read, so the run’s own are taken), the capsule comes to its top on the record’s second and lets its parachutes out within nine seconds of it; ' +
    'it lands a minute late, the main being let out at the 12,300 ft the history gives (tests/sim.test.mjs).',
  flies: {
    model: 'vehicle',
    drops: [
      { at: CUTOFF, nodes: ['EscapeTower'], on: 'tower' },
      {
        at: SEPARATION,
        on: 'separation',
        nodes: ['RedstoneAdapter', 'RedstoneAftUnit', 'RedstoneCenterUnit', 'RedstoneTailUnit', 'RedstoneEngine'],
      },
      { at: DAY.retropack.at.value, nodes: ['Retropack'], on: 'retropack' },
      // the drogue pulls the antenna canister off, and the canister draws the main parachute out after it
      { at: 614, nodes: ['AntennaCanister'], on: 'main', under: 'drogue' },
      // blown by hand, on a flight flown here (`hatch`, below): the record's run lands with it on, as the capsule did
      { at: Number.POSITIVE_INFINITY, nodes: ['Hatch'], on: 'hatch' },
    ],
    hatch: {
      node: 'Hatch',
      label: 'Blow the hatch',
      aloft:
        'The hatch is gone and the cabin is open to space. Grissom’s suit would have held him at 4.6 psi; the hatch was not made to come off in flight, ' +
        'and what an entry with a hole in the side does to the cabin is not in anything read: the flight is flown on as if it were closed.',
      afloat:
        'The hatch is gone, the sea comes in over the sill, and the spacecraft fills and goes down. Grissom went out through the hatch in a moment; ' +
        'the helicopter already hooked on to it could not lift it full of water, and let it go.',
      under: estimated(
        45,
        'not recorded to the second. The history has the hatch fly off, Grissom out at once, and the helicopter’s copilot clip the antenna and hook on as the capsule "sank out of sight" (This New Ocean, p. 373): under within a minute. Ours',
      ),
      record:
        'On the day the hatch blew some ten minutes after the landing, after Grissom’s last words at 26:09 ("then I’ll power down and blow the hatch": Results, p. 46). ' +
        'He said he had not touched the plunger; no test made a hatch fire by itself. He was in the water three or four minutes, his suit filling through an inlet he had left open, ' +
        'while the first helicopter held the flooded capsule, over 5,000 lb, a thousand beyond what it could lift, until a warning light made its pilot let go. ' +
        'It sank where the sea is about 2,800 fathoms deep, and was raised on 20 July 1999.',
    },
    // in the orbit attitude, heat shield first: "I'm in orbit attitude" at 03:02 (Results, p. 42), the turnaround having begun at 02:38
    turned: 182,
    datum: CAPSULE_PLANE * IN,
    engine: 'RedstoneEngine',
    burns: 'alcohol-lox',
    air: { shield: 'HeatShield', collar: 'HeatShield', frost: ['frost-lox'] },
    chutes: CHUTES,
  },
  models: [vehicle, pad, crew],
  surroundings: 'models/usa/places/cape-canaveral/lc5/1961-07.glb',
};

// The couch as somewhere to sit, and its cabin: No. 11's panel (vehicles/mercury_cabin_11.py, Results Figure 2-3 as Hammack and
// Heberlig print it), its needles reading the flight being flown or the record's, its sequence lights lighting on the
// simulator's events and its rings and buttons asking the deck for them (vehicles/cabin.ts: the instruments and controls
// every capsule of the Redstone flights had, the same nodes as Freedom 7's).
// aboard at 3:58 a.m. e.s.t. (MORNING, above) until the gantry left: as the morning has it
vehicle.seats = [mercurySeat([est(3, 58), GANTRY_REMOVED])];
const DARK = 'Not simulated: it stays dark.';
vehicle.cabin = {
  ...mercuryCabin({
    window: 'Window',
    periscope: {
      about:
        'An 8 in screen of the Earth under the capsule, through a wide-angle objective in the cone below the pilot’s feet. Click to look into it, and again for high power. ' +
        'It shows nothing while its objective is drawn in behind its door: for the climb, from half a minute after the retropack went, and through the entry.',
      at: OBJECTIVE_OUT,
    },
  }),
  instruments: mercuryInstruments({
    Gauge_DescentRate: 'Feet a second downward. Under the main Grissom read "30 feet per, 32 feet per second" on it (Results, p. 44).',
    Gauge_ClockHour:
      'A twelve-hour watch, here on Cape time, under the attitude indicator where No. 11’s panel put it: the Redstone flights had no time-to-retrograde counter.',
  }),
  // the sequence lights in one column down the left console, each beside what does it by hand (Results, p. 5: "the rearrangement
  // of controls and indicators"), and the warning lights down the right of the main panel. "A green light will show that the
  // function occurred and a red light will indicate some failure" (Results of the First U.S. Manned Suborbital Space Flight, p. 23)
  lamps: [
    sequenceLamp('TowerJett', 'Tower jettison', 'tower', 'Green when the escape tower has gone. The ring beside it does it by hand.'),
    sequenceLamp(
      'CapsuleSep',
      'Capsule separation',
      'separated',
      'Green when the spacecraft has left the booster: "cap. sep. is green" at 02:42.5.',
    ),
    sequenceLamp(
      'RetroSeq',
      'Retro sequence',
      'retro',
      'Green when the retrorockets’ sequence has begun: by the timer at 04:46 on the day.',
    ),
    sequenceLamp(
      'RetroAtt',
      'Retro attitude',
      undefined,
      `Whether the capsule is at 34 degrees for retrofire: "retro attitude is still green" at 05:01.5. ${DARK}`,
    ),
    sequenceLamp('RetroFire', 'Retro fire', 'retro', 'Green when the first retrorocket has lit.'),
    sequenceLamp('JettRetro', 'Jettison retro', 'retropack', 'Green when the pack has been dropped.'),
    sequenceLamp('RetractScope', 'Retract scope', undefined, `The periscope drawn in for the entry. ${DARK}`),
    sequenceLamp('PointZeroFiveG', '.05 g', 'entry', 'Green when the air is first felt coming down: a twentieth of a g.'),
    sequenceLamp('Drogue', 'Drogue', 'drogue', 'Green when the drogue parachute is out: "we have a green drogue here" at 09:45.'),
    sequenceLamp('Snorkel', 'Snorkel', undefined, `The cabin’s air inlets opened at 20,000 ft. ${DARK}`),
    sequenceLamp('MainDeploy', 'Main', 'main', 'Green when the main parachute is out.'),
    sequenceLamp('ReserveDeploy', 'Reserve', undefined, `The reserve parachute: not simulated, it stays dark.`),
    sequenceLamp(
      'LandingBag',
      'Landing bag',
      undefined,
      `Green when the bag has dropped: "the landing bag is out green" at 10:14. ${DARK}`,
    ),
    { node: 'Tele_Abort', name: 'Abort', about: 'Warns the astronaut of an abort.', shows: 'abort', colour: 0xff4a36 },
    ...(
      [
        ['FuelQuan', 'Fuel quantity'],
        ['O2Quan', 'Oxygen quantity'],
        ['CabinPress', 'Cabin pressure'],
        ['ExcessCabinWater', 'Excess cabin water'],
        ['ExcessSuitWater', 'Excess suit water'],
        ['O2Emerg', 'O2 emergency'],
        ['RetroWarn', 'Retro warning'],
        ['RetroReset', 'Retro reset'],
        ['StandbyAC', 'Standby A.C. auto'],
        ['StandbyDC', 'Standby D.C. auto'],
        ['HeatersOn', 'Retro heaters on'],
        ['RetroCold', 'Retro rockets cold'],
        ['RescueAids', 'Rescue aids'],
      ] as const
    ).map(([node, name]) => ({ node: `Tele_${node}`, name, about: DARK })),
  ],
  controls: [
    ...mercuryControls({
      Ctl_RetroFire: 'Guarded push button. Grissom fired them himself, on Cap Com’s count, at 05:10; here the guard is off.',
    }),
    { node: 'Ctl_Snorkel', name: 'Snorkel', about: 'Pull ring: opens the cabin’s air inlets by hand. Not simulated.' },
    {
      node: 'Hatch_Plunger',
      name: 'Hatch plunger',
      about:
        'With its cover off and the safety pin out, a blow of five or six pounds fires the fuse round the sill and the hatch blows off (Results, p. 4). Click it to blow the hatch: in flight, or afloat, where the sea comes in.',
      does: 'hatch',
    },
  ],
  stick: MERCURY_STICK,
};
