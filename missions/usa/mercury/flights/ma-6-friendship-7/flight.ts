import type { Command, Flight } from '../../../../../src/types.ts';
import { LC14 } from '../../../places/cape-canaveral/lc-14.ts';
import {
  SPEC,
  mercuryAtlasStack,
  mercuryAtlasParts,
  VIEW,
  LB,
  IN,
  NMI,
  FT,
  LBF,
  mercuryAtlasMotors,
  ATLAS,
} from '../../vehicles/mercury-atlas.ts';
import { SPEC as CAPSULE_SPEC, type PartWords, lb, THRUST } from '../../vehicles/mercury-capsule.ts';
import { ON_THE_PAD, periscopeMechanism, periscopeMoves } from '../../vehicles/periscope.ts';
import { mercuryCabin, OBJECTIVE_OUT } from '../../vehicles/cabin.ts';
import { LAUNCHER_TOP, STAND_TURN } from '../../../places/cape-canaveral/lc-14.parts.ts';
import { crew, pad, PAD_SPECS } from './pad.ts';
import { WEATHER } from './weather.ts';
import { BASE, MA2_NOZZLES } from '../../vehicles/mercury-atlas.ts';
import { mercuryAtlasPlan } from '../../vehicles/mercury-atlas-plan.ts';
import { CHUTES } from '../../vehicles/mercury-redstone.ts';
import { orbital } from './orbital.ts';

const RESULTS = 'Results of the First United States Manned Orbital Space Flight (NASA MSC, 1962)';

/**
 * Friendship 7's periscope, out and in (vehicles/periscope.ts): when, as this flight went. How it moves is the model's
 * own, and No. 11's (mercury_capsule.ScopeWorks: no photograph of this side of No. 13 has been read).
 * - Out on the pad: Glenn looked through it after 7:10 that morning (This New Ocean, p. 423). Drawn in when the
 *   umbilical was thrown off at T-35 s (the README's count): that it went in then is the programme (SEDR 104, 12-2),
 *   assumed of this capsule as of No. 11; the report does not say it.
 * - Out at separation, 00:05:03.6 (Results, Table 6-II, p. 71): "Capsule did damp okay and turned around. Scope has
 *   extended, okay", in the minute after (the transcript, p. 150). Documented that it was out by then; the instant is
 *   the programme's.
 * - In by hand at 04:40:30: the retropack was kept on, which stopped the sequence that would have drawn it in thirty
 *   seconds after the pack went, so "retract the scope manually at this time", "Roger, retracting scope manually"
 *   (p. 189); "The periscope was retracted by pumping the manual retraction lever" (the pilot's report, p. 133).
 * - Out by hand from 04:49:34: the drogue came out at 04:49:17.2 and the periscope did not follow it, "Scope did not
 *   come out" at 04:49:31, "Roger, pumping the scope out" at 04:49:34 (p. 191); extending it was one of the events
 *   left to the pilot (p. 115).
 * The times are documented. How long the pumping took either way is not in the record: each is drawn as the motor's
 * five seconds (periscope.ts, TAKES), which is estimated.
 */
const PERISCOPE_EVENTS: [number, boolean][] = [
  [ON_THE_PAD, true],
  [-35, false],
  [303.6, true],
  [16830, false],
  [17374, true],
];
const PERISCOPE = periscopeMoves(PERISCOPE_EVENTS);

const parts: PartWords[] = [
  {
    node: 'EscapeTower',
    name: 'Launch escape tower',
    summary: 'Pulls the capsule off a failing Atlas. It left 24 seconds after the booster engines.',
    detail:
      'A welded steel-tube pylon about ten feet tall carrying a solid motor of 52,000 lbf that burns for a second ' +
      'through three nozzles canted clear of the capsule. An Atlas could fail faster than a man could act, so an ' +
      'abort sensing system in the launch vehicle watched its tank pressures, its turning rates and its engines, ' +
      'and would have fired this by itself. Unused, it was released at T+2:33.3, once the vehicle was above the air ' +
      'and the booster section had gone, and its own rocket carried it clear. As built for the Redstone flights: ' +
      'nothing read gives a difference.',
    facts: [
      ['Escape motor', '52,000 lbf for about 1 s'],
      ['Nozzles', '3, canted'],
      ['Jettison motor', '800 lbf for 1.5 s'],
      ['Released', 'T+2:33.3'],
      ['Fired by', 'the pilot, the ground, or the Atlas’s abort sensing system'],
    ],
  },
  {
    node: 'AntennaCanister',
    name: 'Antenna canister',
    summary: 'Bicone antenna, horizon scanners, drogue parachute.',
    detail:
      'The pale band is a dielectric window: the metal above and below it are the two halves of a bicone antenna ' +
      'for voice, telemetry and command. Two infrared scanners find the horizon in pitch and roll and keep the ' +
      'attitude gyros true through each orbit; for this flight they were given heater blankets. The drogue ' +
      'parachute is in its top. Coming down, with both fuel tanks dry and the capsule swinging "like a falling ' +
      'leaf", Glenn reached for the switch to let it out early; it came out by itself as he did, at 30,000 ft by his reading ' +
      'where 21,000 was planned. As built for the Redstone flights: nothing read gives a difference in its shape.',
    facts: [
      ['Length', '24 in (0.61 m)'],
      ['Antenna', 'bicone, voice and telemetry'],
      ['Scanners', '2 infrared, pitch and roll'],
      ['Drogue', 'out at 04:49:17, at 30,000 ft'],
    ],
  },
  {
    node: 'RecoveryCompartment',
    name: 'Recovery compartment',
    summary: 'Main and reserve parachutes; pitch and yaw thrusters.',
    detail:
      'A 32-inch cylinder holding the 63-foot ring-sail main parachute and its reserve, skinned in thick beryllium ' +
      'plates that soak up heat where the cone’s thin shingles radiate it. The main opened at 04:50:11. The pitch ' +
      'and yaw jets are here too: late in the first orbit one of the small yaw jets stopped working, the capsule ' +
      'began to drift, and Glenn flew most of the rest of the flight by hand.',
    facts: [
      ['Diameter', '32 in (0.81 m)'],
      ['Length', '22.8 in (0.58 m)'],
      ['Skin', 'beryllium plates, 0.22 in'],
      ['Main parachute', '63 ft ring-sail, out at 04:50:11'],
      ['Thrusters', 'pitch and yaw: 24 lbf and 1 lbf'],
    ],
  },
  {
    node: 'Hatch',
    name: 'Explosive hatch',
    summary: 'Seventy bolts and a fuse to break them. It went on twice that morning.',
    detail:
      'The hatch Liberty Bell 7 first carried: seventy quarter-inch titanium bolts, each drilled to weaken it, and ' +
      'a mild detonating fuse round the sill that breaks them all together when a plunger inside is struck. At ' +
      '7:10 on the morning, with most of the bolts in, one was found broken. Grissom had flown with one missing; ' +
      'this time the hatch was taken off and bolted on again, which cost forty minutes. After the flight Glenn ' +
      'stayed in the capsule until the destroyer Noa had it on deck, meaning to climb out through the top; it was ' +
      'too hot and too slow, so he warned the crew and hit the plunger with the back of his hand. It kicked back ' +
      'and cut his knuckles through the glove: the only injury of the flight. Its place on the cone is as ' +
      'Liberty Bell 7’s, which this capsule as it is kept bears out.',
    facts: [
      ['Bolts', '70 of 1/4 in titanium, all in'],
      ['Released by', 'mild detonating fuse round the sill'],
      ['Refitted', 'one bolt broken at 7:10 a.m.: about 40 min'],
      ['Blown', 'by the pilot, on the deck of USS Noa'],
    ],
  },
  {
    node: 'Window',
    name: 'Window',
    summary: 'In front of the pilot’s face: three sunsets, the lights of Perth, and a retropack burning.',
    detail:
      'An outer pane of Vycor curved to the cone and, behind it in a well, three flat inner panes that hold the ' +
      'cabin’s pressure. Through it Glenn watched the spent Atlas tumbling a hundred yards behind him, the lights ' +
      'of Perth, three sunsets, and at each sunrise a cloud of small bright specks drifting past, which he called ' +
      'fireflies and nobody could explain that day. On the way down a strap of the retropack swung round and ' +
      'fluttered over it, and then burning pieces of the pack went by: "a real fireball outside". By the time the ' +
      'parachutes were out it was too filmed with smoke to see through. This capsule carried filters for the ' +
      'window, a red one among them. The panes’ sizes are the drawing’s; where the window stands along the cone is ' +
      'as Liberty Bell 7’s.',
    facts: [
      ['Outer pane', '21.0 in long, 11.25 in to 7.51 in wide, 0.35 in Vycor'],
      ['Inner panes', '12.95 in long, 9.49 in to 7.30 in wide; three'],
      ['Filters', 'carried for this flight'],
      ['Seen through it', '"a real fireball", T+4:43:37'],
    ],
  },
  {
    node: 'Afterbody',
    name: 'Conical afterbody',
    summary: 'René 41 shingles, UNITED STATES twice, and a name lettered by hand.',
    detail:
      'Nickel-alloy shingles 0.016 in thick, oxidised blue-black, each stiffened by beads pressed across it and ' +
      'held through oversized holes so that it can grow when hot: 1,300 °F going up through the air, less coming ' +
      'down, because behind the heat shield the cone is in dead air. Glenn’s family chose the name. Shepard’s and ' +
      'Grissom’s had been stencilled; he wanted this one done by hand, and Cecelia Bibby, an artist working at the ' +
      'Cape, lettered it in the gantry in white script with a red 7 through it, under the window. UNITED STATES ' +
      'stands on the cone twice, each with a flag under it: to the left of the window and round to the right of ' +
      'the hatch. The periscope’s door is shut, as at liftoff: it opened at separation, on a link from the ' +
      'periscope as that came out. With the retropack kept on, nothing drew it in for the entry, and Glenn pumped it ' +
      'in with the hand lever; under the drogue it did not come out, and he pumped it out again. The paint is placed ' +
      'from photographs taken on the pad and at liftoff; the script is a typeface, not her hand; the shingles and ' +
      'the periscope’s door are laid out as Liberty Bell 7’s.',
    facts: [
      ['Half-angle', '20°'],
      ['Length', '58.4 in (1.48 m)'],
      ['Skin', 'René 41 shingles, 0.016 in'],
      ['Paint', 'Friendship 7; UNITED STATES and the flag, twice'],
      ['Lettered by', 'Cecelia Bibby, by hand'],
    ],
    // the periscope as this flight went (vehicles/periscope.ts): played on the clock, where there is one
    clocked: PERISCOPE,
  },
  {
    node: 'CrewCabin',
    name: 'Crew cabin',
    summary: 'A couch, a panel, and four ways to steer.',
    detail:
      'Two thin titanium skins holding pure oxygen at about 5 psi, and the pilot on a couch moulded to his back. ' +
      'The panel is the one Liberty Bell 7 introduced, with the attitude indicator at the top and under it a clock ' +
      'that counted down to retrofire and an Earth-path indicator, a globe turned by clockwork that only a flight ' +
      'in orbit had a use for. The capsule could be steered four ways: by its autopilot; by fly-by-wire, the hand ' +
      'controller working the autopilot’s jets; by a second set of jets worked directly; or by those through rate ' +
      'gyros. When a small jet failed at the end of the first orbit Glenn went to fly-by-wire and stayed mostly on ' +
      'his own hands for the next two. He carried a hand camera, and small red lights on two fingertips of each ' +
      'glove for reading in the dark. The panel is the report’s figure, which is the drawing of ' +
      'Liberty Bell 7’s; what this capsule’s differed in is listed in its record, not modelled.',
    facts: [
      ['Structure', 'two skins of 0.010 in titanium'],
      ['Atmosphere', 'pure oxygen, 5 psi'],
      ['Control', 'automatic, fly-by-wire, manual, rate command'],
      ['Thrusters', '18: 12 automatic, 6 manual'],
      ['Fuel', '60.4 lb of hydrogen peroxide'],
      ['Pilot', '171 lb that morning; 166 lb that evening'],
    ],
  },
  {
    node: 'HeatShield',
    name: 'Heat shield',
    summary: 'Glass fibre and resin, made to char away. For four hours nobody knew whether it was still latched.',
    detail:
      'The Redstone capsules came down from 190 km behind a slab of beryllium that soaked the heat up. From orbit ' +
      'there is too much of it: this shield is glass fibre in resin, and the resin boils off and carries the heat ' +
      'away. Only a few pounds went. It is also the bottom of a cushion: before landing it is unlatched and drops ' +
      'four feet on a skirt of rubberised cloth, the landing bag, to take the blow of the sea. As the capsule came ' +
      'over the Cape at the end of its first orbit a signal reached the ground that the latch had let go. If it ' +
      'had, only the retropack’s three straps were holding the shield to the capsule. Station after station asked ' +
      'Glenn to check that his landing-bag switch was off, until he guessed why; then he was told to leave the ' +
      'pack on. The signal was a faulty switch.',
    facts: [
      ['Diameter', '74.5 in (1.89 m)'],
      ['Material', 'glass fibre and resin, ablating'],
      ['Surface in the entry', 'about 3,000 °F'],
      ['Landing bag', 'about 4 ft, rubberised cloth'],
      ['The signal', '"Segment 51": a limit switch, false'],
    ],
  },
  {
    node: 'Retropack',
    name: 'Retropack',
    summary: 'Three rockets to come home on, kept on through the entry in case they were all that held the shield.',
    detail:
      'Three solid motors of 1,000 lbf fired five seconds apart over California at 04:33:08 slowed the capsule ' +
      'enough to fall out of orbit; three smaller ones had pushed it off the Atlas five hours before. A minute ' +
      'after retrofire the pack should have been dropped. It was kept: if the heat shield was loose, the pack’s ' +
      'straps would hold it until the air did. So Friendship 7 came into the atmosphere with the pack still ' +
      'strapped across its shield. Glenn felt a bump, thought the pack had gone, and then watched pieces of it ' +
      'burn past the window. He was not sure at the time that they were not pieces of the shield. The model is ' +
      'the capsule as launched.',
    facts: [
      ['Retro motors', '3 × 1,000 lbf, 10 s each'],
      ['Fired', '04:33:08, 04:33:13, 04:33:18'],
      ['Posigrade motors', '3 × 400 lbf, 1 s'],
      ['Jettisoned', 'never: kept on, and burned away'],
    ],
  },
  {
    node: 'AtlasAdapter',
    name: 'Spacecraft adapter',
    summary: 'A ribbed titanium ring between a capsule and a balloon. The first Mercury-Atlas broke here.',
    detail:
      'About four feet of corrugated titanium, slightly tapered, bolted to the tank’s forward ring and holding the ' +
      'capsule by a clamp round its heat shield: three segments drawn tight by three explosive bolts. The ' +
      'retropack hangs down inside it, over a cup that keeps its debris off the oxygen tank’s thin dome. In July ' +
      '1960 the first Mercury-Atlas came apart a minute after launch, somewhere between the top of the tank and ' +
      'this ring; after that the adapter was stiffened and the tank’s forward skins made thicker. At sustainer ' +
      'cutoff the bolts fire, and two seconds later the capsule is gone. The band shows red in the photographs of ' +
      'the liftoff; the ribs are counted off a photograph.',
    facts: [
      ['Length', '50.75 in (1.29 m)'],
      ['Skin', 'corrugated titanium over a titanium inner skin'],
      ['Clamp ring', '3 segments, 3 explosive bolts'],
      ['Capsule released', 'T+5:03.6'],
      ['Stays with', 'the Atlas, into orbit'],
    ],
  },
  {
    node: 'AtlasSustainer',
    name: 'Sustainer engine',
    summary: 'One engine on the centreline, alight from the pad to orbit.',
    detail:
      'A single chamber of 57,000 lbf hung on a gimbal from the point of the fuel tank’s cone. It is lit on the ' +
      'ground with the boosters and burns on alone after they go, lighter by their weight, until the guidance ' +
      'computer on the ground has the speed it wants: 25,730 ft/s on this flight, seven short of the plan, at ' +
      '5 minutes 1.4 seconds. Its oxygen comes from the tank above the fuel, down a duct outside the fuel tank’s ' +
      'wall. Its place is scaled off a small drawing; its form is representative.',
    facts: [
      ['Thrust', '57,000 lbf (254 kN)'],
      ['Gimbal', '3° in pitch and yaw'],
      ['Cutoff', 'T+5:01.4, at 25,730 ft/s'],
      ['Pumps', 'its own; they feed the verniers too'],
    ],
  },
  {
    node: 'AtlasVerniers',
    name: 'Vernier engines',
    summary: 'Two small engines on the tank’s sides: they roll it.',
    detail:
      'A single engine on the centreline cannot roll the vehicle, so two chambers of 1,000 lbf stand out from the ' +
      'foot of the tank, square to the equipment pods, each swivelling through 140° one way and 50° the other. ' +
      'Two seconds after liftoff they and the boosters began turning the Atlas from the way the pad faces, 105°, ' +
      'to the way the flight goes, about 75°. From one of them the oxygen tank’s pressurisation line runs up the ' +
      'outside of the tank to its top. The vehicle’s number, 109 D, is painted across the other. On a missile ' +
      'they burn on after the sustainer to trim the speed; on Mercury they do not.',
    facts: [
      ['Thrust', '1,000 lbf each (4.4 kN)'],
      ['Swivel', '140° in pitch, 50° in yaw'],
      ['Roll programme', 'T+2 s to T+15 s, about 30°'],
      ['Fed by', 'the sustainer’s pumps'],
    ],
  },
  {
    node: 'AtlasPods',
    name: 'Equipment pods',
    summary: 'What cannot go inside a balloon rides outside it.',
    detail:
      'The tank has no frames to hang anything on, so the electronics ride in fairings on its skin: a long pod on ' +
      'one side, a short one opposite, each standing over a booster engine. Guidance, the autopilot, telemetry and ' +
      'the range safety receivers are here, and Mercury’s own addition: the abort sensing system, which watched ' +
      'the tank pressures, the turning rates, the engines’ pressures and the electrical power, two sensors to ' +
      'each, and would have fired the escape tower if any left its limits. A fairing over wiring and plumbing ' +
      'runs on from the long pod to the adapter, with a package of rate gyros on it. Their outlines are scaled ' +
      'off a small drawing and the photographs; what is in which pod is not established.',
    facts: [
      ['Pods', 'a long one and a short one, opposite'],
      ['Abort sensing', 'tank pressures, rates, engine pressures, power'],
      ['Guidance', 'radio, from a computer on the ground'],
      ['Stay with', 'the tank, when the booster section goes'],
    ],
  },
  {
    node: 'AtlasTank',
    name: 'Tank section',
    summary: 'A stainless steel balloon ten feet across, thinner than a coin, that went into orbit too.',
    detail:
      'The Atlas has no skeleton. Its body is one welded tank of stainless steel between 0.048 and 0.015 inch ' +
      'thick, liquid oxygen above a bulkhead and kerosene below, and it stands up only because it is kept blown ' +
      'up: let the pressure out and it folds. The rings are the welds between its sheets. At launch the oxygen ' +
      'tank is white with frost from the adapter down to the bulkhead, which hid UNITED STATES on its side; the ' +
      'model shows both. The engines push on a cone at its foot. Empty, the whole of it followed Friendship 7 into ' +
      'orbit: Glenn turned the capsule round and watched it tumbling end over end, a hundred yards off, then two.',
    facts: [
      ['Diameter', '10 ft (3.05 m); about 70 in at the top'],
      ['Skin', 'stainless steel, 0.048 in to 0.015 in'],
      ['Held up by', 'its own pressure'],
      ['Oxygen above', 'frosted; kerosene below, bare'],
      ['Marked', 'UNITED STATES; 109 D'],
    ],
  },
  {
    node: 'AtlasBoosterSection',
    name: 'Booster section',
    summary: 'The half of a stage and a half: it is dropped two minutes up, with both booster engines in it.',
    detail:
      'The Atlas lights all its engines on the ground, where a failure to start can still be shut down, and then ' +
      'throws most of them away. This is what goes: a skirt round the foot of the tank carrying the two booster ' +
      'engines, their pumps and a fairing over each. It hangs from the tank’s thrust ring on a latch; at booster ' +
      'cutoff, 2 minutes 9.6 seconds up on this flight, the latch lets go and the section slides off aft on ' +
      'tracks, over the sustainer engine, which burns on to orbit. Glenn saw a wisp of smoke go by his window and ' +
      'thought for a moment the escape tower had gone early. Its form here is from the report’s drawings and the ' +
      'photographs of the liftoff; the ribbed skin is the photographs’.',
    facts: [
      ['Width across the fairings', '16 ft (4.9 m)'],
      ['Booster engine cutoff', 'T+2:09.6'],
      ['Held by', 'a latch at the tank’s thrust ring'],
      ['Leaves on', 'jettison tracks, sliding aft'],
      ['Under it', 'a radiation shield against the exhaust'],
    ],
  },
  {
    node: 'AtlasBoosterEngines',
    name: 'Booster engines',
    summary: 'Two chambers of 154,000 lbf each, burning for the first two minutes.',
    detail:
      'Rocketdyne’s MA-2 engine group has three main chambers and two small ones, all burning kerosene and liquid ' +
      'oxygen and all lit on the pad. These are the two outboard chambers, each on a gimbal that swivels five ' +
      'degrees, fed by a pair of turbopumps that one gas generator drives. They stand outside the line of the tank, ' +
      'under the fairings that carry on the line of the equipment pods. On the morning the count was held at T-22 ' +
      'minutes for a fuel pump outlet valve that stuck. The chambers’ places are scaled off a small drawing; their ' +
      'form, and the pumps’, are representative.',
    facts: [
      ['Thrust', '154,000 lbf each (685 kN)'],
      ['Propellants', 'RP-1 kerosene and liquid oxygen'],
      ['Gimbal', '5° in pitch and yaw'],
      ['Burn', 'ignition to T+2:09.6'],
      ['Walls', 'tubes carrying the fuel, brazed side by side'],
    ],
  },
];

// What a hand can ask of each part in flight (the deck's part menu: orbitdeck.ts `can`, `ask`), each saying what Glenn could do
const OVER = 'Glenn had no say over the Atlas but the abort: this takes the flight over';
const COMMANDS: Record<string, Command[]> = {
  AtlasBoosterEngines: [{ label: `Cut off the booster engines (${OVER})`, ask: 'step:cut:0' }],
  AtlasBoosterSection: [{ label: `Drop the booster section (${OVER})`, ask: 'step:separate:0' }],
  EscapeTower: [
    { label: 'Release the escape tower (he could: its switch; on the day the sequence did, at 2:33)', ask: 'step:drop:tower-clamp' },
  ],
  AtlasSustainer: [{ label: `Cut off the sustainer (${OVER})`, ask: 'step:cut:1' }],
  AtlasAdapter: [
    { label: 'Separate the spacecraft (he could: the capsule-separation switch; the sequence did it at 5:03.6)', ask: 'step:separate:1' },
  ],
  Retropack: [
    { label: 'Fire the retrorockets by hand (he could: the retro switch, along the long axis)', ask: 'retro' },
    { label: 'Jettison the retropack (he kept it on, as the ground asked)', ask: 'descent:retropack-off' },
  ],
  Afterbody: [{ label: 'Extend the periscope', back: 'Retract the periscope', ask: 'work:periscope' }],
  AntennaCanister: [
    {
      label: 'Drogue parachute (its barostat; he was reaching for its switch when it came)',
      ask: 'descent:mercury-capsule/drogue parachute',
    },
  ],
  RecoveryCompartment: [{ label: 'Main parachute (its barostat, at 10,800 ft)', ask: 'descent:mercury-capsule/main parachute' }],
};

const vehicle = mercuryAtlasStack({
  // on the stand at Complex 14, the hatch on 240 degrees true (pad.ts, lc-14.parts.ts)
  stand: { over: LAUNCHER_TOP, rotationY: STAND_TURN },
  flight: 'ma-6-friendship-7',
  parts: mercuryAtlasParts(
    'ma-6-friendship-7',
    parts.map((p) => (COMMANDS[p.node] ? { ...p, commands: COMMANDS[p.node] } : p)),
  ),
  // the periscope as it went on this flight (vehicles/periscope.ts)
  mechanisms: [periscopeMechanism(PERISCOPE_EVENTS)],
  views: [
    VIEW.stack,
    VIEW.spacecraft,
    VIEW.capsule,
    VIEW.painted('name', 'Name'),
    VIEW.hatch,
    VIEW.periscope,
    VIEW.adapter,
    VIEW.pod,
    VIEW.booster,
    VIEW.engines,
  ],
  // the couch as somewhere to sit, and its cabin (../../vehicles/cabin.ts: from the model's own nodes)
  cabin: mercuryCabin({
    window: 'Window',
    periscope: {
      about:
        'An 8 in screen of the Earth under the capsule, through a wide-angle objective in the cone below the pilot’s feet. Click to look into it, and again for high power.',
      at: OBJECTIVE_OUT,
    },
  }),
});

export const flight: Flight = {
  id: 'usa/mercury/ma-6-friendship-7',
  nation: 'USA',
  agency: 'NASA',
  program: 'Project Mercury',
  designation: 'Mercury-Atlas 6',
  callsign: 'Friendship 7',
  spacecraft: 'Mercury spacecraft No. 13 (McDonnell Aircraft)',
  launchVehicle: 'Mercury-Atlas, Atlas 109-D (Convair)',
  // 14:47:39 UTC: "the time of launch", Results of the First United States Manned Orbital Space Flight, Appendix A (p. 139)
  launch: '1962-02-20T14:47:39Z',
  launchSite: LC14.name,
  site: LC14,
  weather: WEATHER,
  crew: ['John H. Glenn, Jr.'],
  summary:
    'The first American in orbit. Three times round the Earth in 4 hours 55 minutes, most of it flown by hand ' +
    'after a small jet failed, and down through the atmosphere with the retropack still strapped on, because a ' +
    'faulty switch said the heat shield might have come loose.',
  facts: [
    { label: 'Liftoff', value: '20 February 1962, 14:47:39 UTC' },
    { label: 'Pilot', value: 'John H. Glenn, Jr.' },
    { label: 'Duration', value: '4 h 55 min 23 s' },
    { label: 'Orbits', value: '3' },
    { label: 'Orbit', value: '161 km by 261 km, 32.54°' },
    { label: 'Period', value: '88 min 29 s' },
    { label: 'Speed at cutoff', value: '28,234 km/h' },
    { label: 'Peak load', value: '7.7 g, going up and coming down' },
    { label: 'Recovery', value: 'USS Noa, north of Puerto Rico' },
  ],
  // Results of the First United States Manned Orbital Space Flight: Table 6-II (p. 71) for the events, and the
  // air-ground transcript (Appendix A, pp. 163 to 191) for what was said and when; minutes and seconds as they give them
  timeline: [
    { t: 0, event: 'Liftoff, 09:47:39 EST' },
    { t: 129.6, event: 'Booster engine cutoff; the booster section is dropped' },
    { t: 153.3, event: 'Escape tower released' },
    { t: 301.4, event: 'Sustainer engine cutoff: 25,730 ft/s' },
    { t: 303.6, event: 'Spacecraft separation: posigrade rockets fire; the capsule turns round' },
    { t: 5411, event: '"Yaw is drifting out of orbit attitude": a small yaw jet has failed' },
    { t: 5485, event: 'Glenn goes to fly-by-wire' },
    { t: 16335, event: '"Leave your retropack on through your pass over Texas"' },
    { t: 16388, event: 'Retrofire: three motors, five seconds apart' },
    { t: 17011, event: '0.05 g, switched by the pilot; the retropack is still on' },
    { t: 17017, event: '"A real fireball outside"' },
    { t: 17357.2, event: 'Drogue parachute, at 30,000 ft: out by itself as the pilot reached to let it out early' },
    { t: 17411, event: 'Main parachute' },
    { t: 17723, event: 'Landing, 21°26′ N 68°37′ W' },
  ],
  specs: [
    ...PAD_SPECS,
    SPEC.heatShield,
    CAPSULE_SPEC.afterbodyHalfAngle,
    SPEC.capsuleLength,
    SPEC.towerLength,
    {
      group: 'Spacecraft',
      label: 'Weight at launch',
      value: 4265 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: `4,265 lb (${RESULTS}, p. 7)`,
    },
    {
      group: 'Spacecraft',
      label: 'Weight in orbit',
      value: 2987 * LB,
      unit: 'kg',
      confidence: 'documented',
      note: '2,987 lb at insertion; 2,970 lb at retrofire; 2,493 lb at landing; 2,422 lb as recovered (the same page)',
    },
    CAPSULE_SPEC.windowPane,
    {
      group: 'Spacecraft',
      label: 'Window, middle of the outer pane above the widest plane',
      value: 31.5 * IN,
      unit: 'm',
      confidence: 'estimated',
      note: '31.5 in, give or take 1.5: measured on this capsule as it is kept (NASM A19670176000: the glass from station 21.9 to 41.3, between the cone’s joint with the cylinder and the shield’s ring) and on No. 20 (NASA S63-07701). No document read gives it. Until November 2026 the model had 35.8, as Liberty Bell 7’s then was',
    },
    {
      group: 'Spacecraft',
      label: 'Hatch bolts',
      value: 70,
      unit: 'bolts',
      confidence: 'documented',
      note: 'seventy; one found broken at 7:10 a.m. and the hatch refitted (This New Ocean, p. 423)',
    },
    {
      group: 'Spacecraft',
      label: 'Perigee',
      value: 86.92 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: `86.92 nautical miles (${RESULTS}, Table 6-I, p. 71)`,
    },
    {
      group: 'Spacecraft',
      label: 'Apogee',
      value: 140.92 * NMI,
      unit: 'm',
      confidence: 'documented',
      note: '140.92 nautical miles (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Period',
      value: 88 * 60 + 29,
      unit: 's',
      confidence: 'documented',
      note: '88 min 29 s (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Inclination',
      value: 32.54,
      unit: 'deg',
      confidence: 'documented',
      note: 'the same table',
    },
    {
      group: 'Spacecraft',
      label: 'Velocity at cutoff',
      value: 25730 * FT,
      unit: 'm/s',
      confidence: 'documented',
      note: '25,730 ft/s at 528,381 ft, the flight path 0.047° below level (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest load',
      value: 7.7,
      unit: 'g',
      confidence: 'documented',
      note: '7.7 g on the way up and 7.7 g in the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Greatest dynamic pressure going up',
      value: 982 * 47.880259,
      unit: 'Pa',
      confidence: 'documented',
      note: '982 lb/sq ft; 472 lb/sq ft in the entry (the same table)',
    },
    {
      group: 'Spacecraft',
      label: 'Duration, liftoff to landing',
      value: 4 * 3600 + 55 * 60 + 23,
      unit: 's',
      confidence: 'documented',
      note: '04:55:23 (the same report, Table 6-II; NASA SP-45, Table 3-I)',
    },
    {
      group: 'Launch vehicle',
      label: 'Height on the pad',
      value: 95 * FT + 4 * IN,
      unit: 'm',
      confidence: 'documented',
      note: `95 ft 4 in, engines to the tower’s tip (${RESULTS}, Figure 4-11, p. 49); model: 29.067 m (1,144.36 in, by SEDR 104’s stations)`,
    },
    SPEC.atlasLength,
    SPEC.tank,
    { ...SPEC.fairings, note: `16 ft (${RESULTS}, Figures 4-3 and 4-11); model: 16 ft 4 in, scaled off NASA SP-45, Figure 5-4` },
    SPEC.adapter,
    SPEC.skin,
    {
      group: 'Launch vehicle',
      label: 'Thrust at liftoff',
      value: 360000 * LBF,
      unit: 'N',
      confidence: 'documented',
      note: `"approximately 360,000 pounds" (${RESULTS}, p. 45); the engines’ ratings in NASA SP-45 (p. 85) add to 367,000 lbf`,
    },
    {
      group: 'Launch vehicle',
      label: 'Heading at insertion',
      value: 75,
      unit: 'deg',
      confidence: 'documented',
      note: `about 75°; on the pad the vehicle’s pitch axis lay on 105°, and it rolled between T+2 s and T+15 s (${RESULTS}, p. 46). This New Ocean has 72.51° for the launch azimuth of the flight before, which this one was to follow`,
    },
  ],
  motors: mercuryAtlasMotors({
    booster: {
      burnS: 129.6,
      confidence: 'documented',
      note: `${lb(ATLAS.booster)} lbf each, rated (NASA SP-45, p. 85); the press kit for MA-9 gives 150,000. Cutoff on this flight at 00:02:09.6 (${RESULTS}, Table 6-II). No figure measured on Atlas 109-D has been read`,
    },
    sustainer: {
      burnS: 301.4,
      confidence: 'documented',
      note: `${lb(ATLAS.sustainer)} lbf, rated (NASA SP-45, p. 88); the press kit for MA-9 gives 60,000. Cutoff at 00:05:01.4 (the same table)`,
    },
    verniers: {
      burnS: 301.4,
      confidence: 'documented',
      note: `${lb(ATLAS.vernier)} lbf each (NASA SP-45, p. 88). Mercury’s Atlas had no vernier solo: they stopped with the sustainer`,
    },
    escape: {
      burnS: 1,
      confidence: 'assumed',
      note: `${lb(THRUST.escape)} lb for about 1 s, nominal (${RESULTS}, p. 9)`,
    },
    jettison: {
      burnS: 1.5,
      confidence: 'assumed',
      note: `${lb(THRUST.towerJettison)} lb for 1.5 s, nominal (the same table)`,
    },
    posigrade: {
      burnS: 1,
      confidence: 'assumed',
      note: `${lb(THRUST.posigrade)} lb for 1 s, nominal (the same table). On the missile these were retrorockets on the Atlas; Mercury moved them to the capsule (NASA SP-45, p. 93)`,
    },
    retrograde: {
      burnS: 10,
      confidence: 'assumed',
      note: `${lb(THRUST.retrograde)} lb for 10 s, nominal (the same table). Fired at 04:33:08, :13 and :18 (Table 6-II)`,
    },
    pitchYaw: {
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig; the Results’ Table 2-I has the same systems: 18 thrusters, 12 automatic and 6 manual)',
    },
    roll: {
      confidence: 'documented',
      note: 'automatic system (Hammack and Heberlig)',
    },
    low: {
      confidence: 'documented',
      note: 'automatic system, all axes (Hammack and Heberlig). One of the two in yaw stopped late in the first orbit, the other in the second',
    },
  }),
  // the flight as the simulator flies it, from its record (orbital.ts; mission.md)
  plan: { ...mercuryAtlasPlan(orbital), aloft: WEATHER.aloft },
  // the flight in the scene: the stack off the pad, what leaves it, and the capsule down on its parachutes
  flies: {
    model: 'vehicle',
    datum: BASE,
    // each engine's fire from its own nozzles: the two booster chambers, the sustainer and its verniers, all on kerosene
    // and oxygen; and the retrorockets' three, burning as the plan flies them, evenly from the first's lighting
    fires: [
      { node: 'BoosterEngines_Chambers', on: 'booster-engines', burns: 'kerosene-lox' },
      { node: 'Sustainer_Chamber', radius: 24 * IN, on: 'sustainer', burns: 'kerosene-lox' },
      { node: 'Verniers_Nozzles', on: 'sustainer', burns: 'kerosene-lox', nozzle: MA2_NOZZLES.vernier },
      { node: 'Retropack_RetroNozzles', on: 'retrorockets', burns: 'solid-perchlorate' },
    ],
    // each by the plan's joint that lets it go (vehicles/mercury-atlas-plan.ts), at the record's instant
    drops: [
      { at: orbital.atlas.booster.separation.value, nodes: ['AtlasBoosterSection', 'AtlasBoosterEngines'], on: 'booster-latch' },
      { at: orbital.tower.separation.value, nodes: ['EscapeTower'], on: 'tower-clamp' },
      {
        at: orbital.separation.at.value,
        nodes: ['AtlasAdapter', 'AtlasTank', 'AtlasSustainer', 'AtlasVerniers', 'AtlasPods'],
        on: 'adapter-clamp',
      },
      // (kept on through the entry, and gone in pieces as its straps burned through)
      { at: orbital.retro.gone.value, nodes: ['Retropack'], on: 'retropack-straps' },
      { at: orbital.events.find((e) => e.id === 'main-deployment')!.at.value, nodes: ['AntennaCanister'], under: 'drogue parachute' },
    ],
    // the Redstone flights' drogue and main, the same canopies, on the capsule's own descent
    chutes: [
      { ...CHUTES[0]!, on: 'drogue parachute', body: 'mercury-capsule' },
      { ...CHUTES[1]!, on: 'main parachute', body: 'mercury-capsule' },
    ],
    air: { shield: 'HeatShield', collar: 'HeatShield', frost: ['frost-lox'] },
  },
  models: [vehicle, pad, crew],
  surroundings: 'models/usa/places/cape-canaveral/lc14/1962-02.glb',
};
