// Walks a launch site on foot in the running page, with the real W key held, along ways a person could really have
// gone, and checks that each can be gone: every leg arrives, nobody falls, and the feet are where the ground or the
// floor is said to be (docs/agents/walking.md; AGENTS.md, "Being there": if something can be seen it can be gone to).
//   node tools/walk-test.mjs [url] [--flight <id>] [--only <regex of route names>] [--shots <dir>]      (default url: http://localhost:5180/)
// A route is a place to start and a list of legs. A leg goes to a point over the ground (`to`: metres east and south
// of the site's origin, the viewer's x and z), or works something on the way:
//   to      walk there (`run`: at a run); arrived within `within` metres (default 0.6)
//   y       where the feet must be on arrival, metres from the deck's level, to within `tol` (default 0.35)
//   climb   a ladder is in the way: keep walking into it until the feet are at this height (`down`: from its top)
//   lift    ride the lift this leg stands on to a stop of an action of a part: { model, part, action, stop }
//   falls   a drop of this many metres in one frame on the way is meant (a kerb, the last rung): default 0.45; and no leg
//           may be more than 0.7 s in the air, which is a fall whatever it lands on
// --shots writes a still from the walker's eyes at the end of every leg.
// After the routes, one case of its own (`--only Escape` runs it alone): the first Escape frees a captured mouse and the
// walk goes on, a second leaves (walking.md, "Escape frees the mouse first"; escapeCase says how headless Chrome is driven).
// The ways are a site's, and walked at any flight from it: each is walked at a reading of the place's slider (`slider`, the
// hardware where the way wants it), put on the clock by that flight's own morning (its model's `sequence`).
import { globSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { launch, open, opt, url as urlOf } from './browser.mjs';

const args = process.argv.slice(2);
const flight = opt(args, '--flight', 'ussr/vostok/vostok-1');
const only = opt(args, '--only', null);
const shots = opt(args, '--shots', null);
const url = urlOf(args);

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { timeAt } = await import(pathToFileURL(join(root, 'src/world/sequence.ts')).href);
const flown = await (async () => {
  for (const file of globSync('missions/*/*/flights/*/flight.ts', { cwd: root })) {
    const { flight: f } = await import(pathToFileURL(join(root, file)).href);
    if (f.id === flight) return f;
  }
  return null;
})();
if (!flown) {
  console.error(`walk-test: no flight ${flight}`);
  process.exit(2);
}

/**
 * Readings of Site 1's pad slider (the layout every flight from it lays its morning out on: the bus stops at 0.03, the pilot
 * is in his seat at 0.1, the fillers are off the pad at 0.136, the erector is drawn off from 0.19): where the hardware is
 * for a way, whatever the flight. On Vostok 1's morning they are 06:55, 07:10 and 08:20.
 */
const SITE1 = {
  /** The bus has stopped and nobody has gone up yet: the concrete round its door. */
  arrived: 0.045,
  /** The pilot in his seat: the erector at the rocket, its lift at the landing, the trusses up. */
  seated: 0.1,
  /** The fillers have left the north and south tracks; the erector still stands. */
  fillersGone: 0.15,
};

// --- Launch Complex 19: routes ---
/**
 * Launch Complex 19's ways, in the viewer's frame: x along the stand to the south, z to the west, y up from the launch
 * deck, metres. `F` takes a place in the pad's own feet as its scripts have it (x south, y east, z up: lc19/site.py and
 * erector.py), so each leg reads as the model does. The erector stands for all of them (slider 0: the crew going up).
 */
const F = (x, y) => [x * 0.3048, -y * 0.3048];
const FT = (z) => z * 0.3048;
const LC19_FOOT = 3; // the floor at the erector's foot
const LC19_ROOM = [91 + 2 / 12, 102 + 2 / 12, 109 + 2 / 12, 118 + 2 / 12]; // the white room's four floors
/** One level of the erector's stairs, from the south landing at `from` up the inner lane, across the landing between, and back up the outer lane to `to`. */
const lc19Flight = (from, to) => [
  { to: F(3.4, -14.3), y: FT(from), note: `the foot of the flight at ${Math.round(from)} ft` },
  { to: F(-3.6, -14.3), y: FT((from + to) / 2), tol: 0.4, note: 'up the inner lane to the landing between' },
  { to: F(-4.2, -17.9), y: FT((from + to) / 2), tol: 0.4 },
  { to: F(4.4, -17.9), y: FT(to), tol: 0.4, note: `up the outer lane to ${Math.round(to)} ft` },
  { to: F(4.6, -14.3), y: FT(to) },
];
const LC19 = [
  {
    name: 'the crew’s way: up the red ramp to the erector’s foot, the express elevator to the white room, the stairs to the spacecraft’s level',
    slider: 0,
    from: [...F(34, 8.1).slice(0, 1), 0, F(34, 8.1)[1]],
    legs: [
      { to: F(26.5, 8.1), y: 0, note: 'to the foot of the ramp' },
      { to: F(14.2, 8.1), y: FT(LC19_FOOT), tol: 0.2, note: 'up the ramp to its landing' },
      { to: F(9.4, 8.6), y: FT(LC19_FOOT), note: 'on to the floor at the erector’s foot' },
      { to: F(9.6, 15.4), y: FT(LC19_FOOT), note: 'east into the elevator’s car' },
      {
        lift: { model: 'pad', part: 'Erector', action: 'express-elevator', stop: 1 },
        y: FT(LC19_ROOM[0]),
        note: 'the express elevator, to the white room’s 91 ft level',
      },
      { to: F(9.8, 10.2), y: FT(LC19_ROOM[0]), note: 'out of the car through the east doorway' },
      { to: F(10.4, -9.4), y: FT(LC19_ROOM[0]), note: 'along the south wall, past the adapter' },
      { to: F(4.6, -10.2), y: FT(LC19_ROOM[0]) },
      { to: F(4.6, -14.3), y: FT(LC19_ROOM[0]), note: 'out through the west doorway to the stairs' },
      ...lc19Flight(LC19_ROOM[0], LC19_ROOM[1]),
      { to: F(4.6, -10.2), y: FT(LC19_ROOM[1]), note: 'in at the spacecraft’s level' },
      { to: F(10.2, -8.0), y: FT(LC19_ROOM[1]) },
      { to: F(9.6, 0), y: FT(LC19_ROOM[1]), note: 'to the hatches' },
    ],
  },
  {
    name: 'the service elevator to the fifth work platform, the stairs to the top of the white room, the ladder to the bridge crane',
    slider: 0,
    from: [...F(22, -8).slice(0, 1), 0, F(22, -8)[1]],
    legs: [
      { to: F(18.9, -8), y: 0, note: 'to the foot of the steps' },
      { to: F(13.6, -8), y: FT(LC19_FOOT), tol: 0.2, note: 'up the steps' },
      { to: F(9.4, -8.6), y: FT(LC19_FOOT) },
      { to: F(9.6, -15.4), y: FT(LC19_FOOT), note: 'west into the service elevator’s car' },
      {
        lift: { model: 'pad', part: 'Erector', action: 'service-elevator', stop: 5 },
        y: FT(80),
        note: 'the service elevator, to the 80 ft level',
      },
      { to: F(9.4, -9.6), y: FT(80), note: 'out of the car on to the platform' },
      { to: F(4.6, -9.6), y: FT(80) },
      { to: F(4.6, -14.3), y: FT(80), note: 'out through the west face to the stairs' },
      ...lc19Flight(80, LC19_ROOM[0]),
      ...lc19Flight(LC19_ROOM[0], LC19_ROOM[1]),
      ...lc19Flight(LC19_ROOM[1], LC19_ROOM[2]),
      ...lc19Flight(LC19_ROOM[2], LC19_ROOM[3]),
      { to: F(4.6, -10.2), y: FT(LC19_ROOM[3]), note: 'in at the white room’s top level' },
      { to: F(9.6, -8.6), y: FT(LC19_ROOM[3]), note: 'to the foot of the ladder' },
      { climb: FT(132.1), to: F(12.4, -8.6), note: 'up the ladder to the bridge crane’s rail' },
    ],
  },
  {
    name: 'round the deck: the thrust mount, the second-stage position, the hoisting crane, the umbilical tower’s foot',
    slider: 0,
    from: [...F(40, 20).slice(0, 1), 0, F(40, 20)[1]],
    legs: [
      { to: F(18, 21.5), y: 0 },
      { to: F(4, 22), y: 0, note: 'past the erector’s east side, on the steel deck' },
      { to: F(-24, 22), y: 0, note: 'between the two firing positions' },
      { to: F(-37, 8), y: 0, note: 'along the deck’s north edge, over the flame buckets' },
      { to: F(-37, -3), y: 0, note: 'to the hoisting crane' },
      { to: F(-29.5, -4.5), y: 0, note: 'round the crane’s east side' },
      { to: F(-29, -16.5), y: 0, note: 'to the umbilical tower’s foot' },
    ],
  },
  {
    name: 'from the land to the deck by the stand’s west stair, and down the ramp',
    slider: 0,
    from: [...F(112, -34).slice(0, 1), FT(-28), F(112, -34)[1]],
    legs: [
      { to: F(107.5, -22.5), y: FT(-28), tol: 0.4, note: 'to the stair’s foot, on the land' },
      { to: F(89.2, -22.5), y: FT(-18.67), tol: 0.4, note: 'up the first flight' },
      { to: F(73.6, -22.5), y: FT(-9.33), tol: 0.4, note: 'the second' },
      { to: F(58.2, -22.5), y: 0, tol: 0.3, note: 'the third, to the head landing' },
      { to: F(57.8, -17), y: 0, tol: 0.6, note: 'through the gap in the rail on to the deck' },
      { to: F(150, 10), run: true, y: 0, note: 'south along the deck' },
      { to: F(262, 12), run: true, y: 0, tol: 0.4, note: 'to the head of the ramp' },
      { to: F(380, 12), run: true, y: FT((-28 * (380 - 258)) / 220), tol: 0.6, note: 'down the ramp' },
      { to: F(476, 12), run: true, y: FT(-28), tol: 0.7, note: 'to its foot, on the land' },
    ],
  },
];
// --- Launch Complex 19: end ---

/**
 * Readings of Complex 14's pad slider (places/cape-canaveral/lc-14.parts.ts `PadStops`, as a flight's pad.ts lays its morning out):
 * the service structure round the vehicle with its lift at the ground, and the structure parked 300 ft east.
 */
const LC14 = { serviced: 0, away: 0.78 };
const FOOT = 0.3048;
/** A place in Complex 14's own frame (feet: x along 105 degrees, y along 015; lc14/site.py) as the viewer's [x, z], metres. */
const at14 = (x, y) => [Number((x * FOOT).toFixed(3)), Number((-y * FOOT).toFixed(3))];
/** A height in feet above Complex 14's deck, metres. */
const up14 = (z) => Number((z * FOOT).toFixed(3));
/**
 * The legs of a switchback stair in that frame: from each of `floors` (feet over the deck) up to the next by two half
 * flights along y, the first at x = `xa` from `ya` to `yb`, the second at `xb` back from `yb` to `ya`; `on` is how far
 * past a flight's end the landing's middle is.
 */
const switchback = (floors, xa, xb, ya, yb, on = 1.1) => {
  const out = [];
  const far = yb + Math.sign(yb - ya) * on;
  const near = ya - Math.sign(yb - ya) * on;
  for (let k = 0; k + 1 < floors.length; k++) {
    const mid = (floors[k] + floors[k + 1]) / 2;
    out.push({ to: at14(xa, near), y: up14(floors[k]), within: 0.35 });
    out.push({ to: at14(xa, far), y: up14(mid), within: 0.35 });
    out.push({ to: at14(xb, far), y: up14(mid), within: 0.35 });
    out.push({ to: at14(xb, near), y: up14(floors[k + 1]), within: 0.35 });
  }
  return out;
};
/** The egress tower's ten levels over the deck, feet (lc14/tower.py `LEVELS`). */
const TOWER14 = [0, 9.74, 19.48, 29.22, 38.96, 48.7, 55.86, 63.02, 70.18, 77.34, 84.5];
/**
 * Complex 14's ways, in the site's own frame (x along 105 degrees true, z along 195, y up from the deck; the paving is
 * 22 ft under it): where each thing stands is from the modules that build it (missions/usa/places/cape-canaveral/lc14/).
 */
const LC14_ROUTES = [
  {
    name: 'up the ramp from its foot to the stand’s deck',
    slider: LC14.away,
    from: [...at14(0, -412).slice(0, 1), up14(-22), at14(0, -412)[1]],
    legs: [
      { to: at14(0, -280), y: up14(-10.98), tol: 0.4, note: 'half way up the slope' },
      { to: at14(0, -150), y: 0, note: 'over the knee on to the level' },
      { to: at14(0, -56), y: 0 },
      { to: at14(-10, -30), y: 0, note: 'on to the stand, between the huts and the tower' },
    ],
  },
  {
    name: 'the stair down the ramp’s west side to the paving',
    slider: LC14.away,
    from: [at14(-9, -84)[0], 0, at14(-9, -84)[1]],
    legs: [
      { to: at14(-14.6, -84.5), y: 0, tol: 0.4, note: 'over the coping on to the stair’s head' },
      { to: at14(-14.6, -105.6), y: up14(-11), note: 'the first flight, to the half landing' },
      { to: at14(-14.6, -128.5), y: up14(-22), note: 'the second, to the paving' },
    ],
  },
  {
    name: 'the service structure’s stair from the paving, and its gangway on to the stand’s deck',
    slider: LC14.serviced,
    from: [at14(-48, 9)[0], up14(-22), at14(-48, 9)[1]],
    legs: [
      ...switchback([-22, -11, 0], -41, -37.8, 6.6, 1.4, 1.6),
      { to: at14(-35.2, 9), y: 0, note: 'off the landing on to the gangway' },
      { to: at14(-31.5, 9), y: 0, note: 'through the leg along it' },
      { to: at14(-27, 9), y: 0, note: 'on to the deck, through the gap in its rail' },
    ],
  },
  {
    name: 'on up that stair to the first level, and the tower’s stair to the second',
    slider: LC14.serviced,
    from: [at14(-39, 9)[0], 0, at14(-39, 9)[1]],
    legs: [
      ...switchback([0, 10, 20], -41, -37.8, 6.6, 1.4, 1.6),
      { to: at14(-33.5, 9), y: up14(20), note: 'over the bridge on to the first level' },
      { to: at14(-29, 8), y: up14(20) },
      ...switchback([20, 29.84], -20.44, -23.54, 2.6, -2.6, 1.2),
    ],
  },
  {
    name: 'the lift to the sixth level, round behind the vehicle, the stair to the white room’s roof and the ladders to the top deck',
    slider: LC14.serviced,
    from: [at14(62, -2)[0], up14(-22), at14(62, -2)[1]],
    legs: [
      { to: at14(37.55, 7.5), y: up14(-22), note: 'round the car to the gap between it and the leg' },
      { to: at14(37.55, 0), y: up14(-21.7), tol: 0.2, note: 'on to the step' },
      { to: at14(41.3, 0), y: up14(-21.4), tol: 0.2, note: 'into the car' },
      { lift: { model: 'pad', part: 'ServiceStructure', action: 'lift', stop: 6 }, y: up14(69.21), note: 'the lift, to the sixth level' },
      { to: at14(24, 0), y: up14(69.21), note: 'out of the car on to the east tower’s floor' },
      { to: at14(12, 6.85), y: up14(69.21) },
      { to: at14(-12, 6.85), y: up14(69.21), note: 'over the bridge behind the vehicle' },
      ...switchback([69.21, 79.05], -20.44, -23.54, 2.6, -2.6, 1.2),
      ...switchback([79.05, 90.35], -20.44, -23.54, 2.6, -2.6, 1.2),
      { to: at14(-23.4, 3.7), y: up14(90.35), note: 'along the roof to the ladder’s foot' },
      { climb: up14(114), to: at14(-19.2, 3.7), note: 'the ladder up the head’s west face' },
      { to: at14(-15.5, 0), y: up14(114), note: 'across the head to the crown' },
      { climb: up14(129.17), to: at14(-10.8, 0), note: 'the ladder up the crown to the top deck' },
    ],
  },
  {
    name: 'the egress tower: its stair from the deck to the bascule’s level, and out to where the bascule is boarded',
    slider: LC14.away,
    from: [at14(5, -29.5)[0], 0, at14(5, -29.5)[1]],
    legs: [
      ...switchback(TOWER14.slice(0, 9), 10.9, 13.9, -28.3, -24.5, 1.1),
      { to: at14(7.9, -29.5), y: up14(70.18), note: 'out through the tower’s west face' },
      { to: at14(7.9, -32.6), y: up14(70.18), note: 'to the stage behind the bascule’s hinge' },
    ],
  },
  {
    name: 'on up the egress tower to its top platform',
    slider: LC14.away,
    from: [at14(13.9, -29.5)[0], up14(70.18), at14(13.9, -29.5)[1]],
    legs: [
      ...switchback(TOWER14.slice(8), 10.9, 13.9, -28.3, -24.5, 1.1),
      { to: at14(26, -29.5), y: up14(84.5), note: 'out along the platform' },
    ],
  },
  {
    name: 'down into the transfer table’s pit, over its two rails and up the other side',
    slider: LC14.serviced,
    from: [at14(62, 27)[0], up14(-22), at14(62, 27)[1]],
    legs: [
      { to: at14(62, 38), y: up14(-25), note: 'down the steps on the south wall' },
      { to: at14(62, 71), y: up14(-25), note: 'across, over the near rail' },
      { to: at14(62, 80), y: up14(-22), note: 'up the steps on the north wall' },
    ],
  },
  {
    name: 'across the service structure’s rail and under the stand',
    slider: LC14.away,
    from: [at14(-46, 6)[0], up14(-22), at14(-46, 6)[1]],
    legs: [{ to: at14(-24, 6), y: up14(-22), note: 'over the west rail, between the stand’s columns' }],
  },
  {
    name: 'the blockhouse: the ladder up its wall and the two flights to its platforms',
    slider: LC14.away,
    from: [at14(-722.6, 26.3)[0], up14(-22), at14(-722.6, 26.3)[1]],
    legs: [
      { climb: up14(-11.8), to: at14(-735.9, 22.7), note: 'the ladder up the retaining wall' },
      { to: at14(-748.6, 19.3), y: up14(-0.1), tol: 0.4, note: 'up the dome to the lower platform' },
      { to: at14(-765.1, 14.9), y: up14(6.3), tol: 0.4, note: 'and to the upper' },
    ],
  },
];

/** The Apollo 7 boarding route, read in the LC-34 model's feet above the apron. */
const LC34_APRON = FT(-27);
const LC34_TOWER_LANDING = FT(220 - 27);
const LC34_HATCH_APPROACH = FT(213 - 27);
const LC34_ROUTES = [
  {
    name: 'Complex 34: from the apron to the crew elevator, then across the white room to the hatch',
    slider: 0.44,
    from: [FT(45), LC34_APRON, FT(8)],
    legs: [
      { to: F(45, -16), y: LC34_APRON, note: 'inside the elevator car', within: 0.35 },
      {
        lift: { model: 'pad', part: 'Umbilical_Tower', action: 'crew-elevator', stop: 7 },
        y: LC34_TOWER_LANDING,
        note: 'ride to the 220-foot level',
      },
      { to: F(45, 0), y: LC34_TOWER_LANDING, note: 'out of the elevator and across the tower', within: 0.35 },
      { to: F(8, 0), y: LC34_HATCH_APPROACH, note: 'down the connected access arm to the command module hatch', within: 0.22 },
      { board: { seat: 'Seat_Commander', hatch: [1.23, 57.02, -0.68], label: 'Schirra’s left couch' } },
    ],
  },
];

/** Walk from each crew member’s starting place on the crawlerway to the hatch at the opening of crew ingress. */
function lc39Routes(flight) {
  const seats = flight.models.find((m) => m.id === 'vehicle').seats;
  const deck = -47 * 0.3048;
  const level = FT(320.85);
  return seats.map((seat) => ({
    name: `Complex 39: crawlerway, launcher stairs, elevator and white room to ${seat.label}`,
    walker: seat.figure,
    at: flight.opens.at,
    from: flight.models.find((m) => m.id === seat.figure).position,
    legs: [
      { to: [-49, -16], y: deck, run: true, note: 'up the approach ramp' },
      { to: [-24, -20], y: deck, run: true },
      { to: [6, -24], y: deck, run: true },
      { to: F(39, 88), y: deck, within: 0.12, note: 'at the foot of the access stairs' },
      { to: F(110, 88), y: 0, within: 0.15, note: 'up the full flight onto the landing' },
      { to: F(110, 62), y: 0, within: 0.15, note: 'through the rail opening onto the launcher deck' },
      { to: F(77, 50), y: 0, within: 0.18 },
      { to: F(77, 20), y: 0.09, within: 0.18, note: 'inside the elevator' },
      { lift: { model: 'pad', part: 'Umbilical_Tower', action: 'crew-elevator', stop: 15 }, y: level + 0.09, note: 'ride to level 320' },
      { to: F(75, 10), y: level, within: 0.15, note: 'out through the tower railing' },
      { to: F(75, 0), y: level, within: 0.15 },
      { to: F(33, 0), y: FT(320.44), within: 0.12, note: 'cross the hinge and the arm' },
      { to: F(8, 0), y: FT(326.4), within: 0.1, note: 'up the inner stair and into the white room' },
      { board: { seat: seat.node, hatch: [1.6, 99.88, -0.76], label: seat.label } },
    ],
  }));
}

/**
 * The ways walked, by site (SiteDef.name). Site 1 is in the site's own frame: x east, z south, y up from the deck
 * (places/tyuratam/site-1.md); where each thing stands is from the modules that build it (missions/ussr/places/tyuratam/site1/).
 */
const ROUTES = {
  'Cape Canaveral, Launch Complex 14': LC14_ROUTES,
  'Cape Kennedy, Launch Complex 19': LC19,
  'Cape Kennedy, Launch Complex 34': LC34_ROUTES,
  ...(flown.site?.name.startsWith('Kennedy Space Center, Launch Complex 39') ? { [flown.site.name]: lc39Routes(flown) } : {}),
  'Tyuratam (Baikonur), Site 1': [
    {
      name: 'the pilot’s own way: from the bus’s door past the State Commission to the stair’s foot',
      slider: SITE1.arrived, // the bus has stopped; on Vostok 1's morning the send-off and the Commission stand on the concrete
      from: [-46.4, -0.12, 17.6],
      legs: [
        { to: [-38.6, 17.5], y: -0.12, tol: 0.2, note: 'east from the door to the Commission, ten metres off' },
        { to: [-33.6, 15.0], y: -0.12, tol: 0.2, note: 'round the knot, between it and the south track' },
        { to: [-26.8, 9.0], y: -0.03, tol: 0.2, note: 'over the tracks onto the abutment' },
        { to: [-20.0, 5.6], y: 0, note: 'onto the deck' },
        { to: [-16.6, 3.3], y: 0, note: 'to the foot of the fifteen steps' },
      ],
    },
    {
      name: 'the erector: fifteen steps, the lift, the upper platform at the hatch',
      slider: SITE1.seated,
      // (the stair and the lift are on the erector's south side: the film of the morning)
      from: [-19, 0, 3.25],
      legs: [
        { to: [-16.2, 3.25], y: 0 },
        { to: [-11.6, 3.25], y: 3.0, note: 'up the stair to the landing at the lift’s door' },
        { to: [-11.3, 2.1], y: 3.0, note: 'into the car, between its open doors' },
        { lift: { model: 'pad', part: 'Erector', action: 'lift', stop: 2 }, y: 26.12, note: 'the lift, to the upper platform' },
        { to: [-5.5, 3.25], y: 26.12, note: 'out of the car, south, onto the walk' },
        { to: [-3.9, 3.2], y: 26.12 },
        { to: [-3.6, -0.3], y: 26.12, note: 'across the boom’s face' },
        { to: [-2.0, -0.3], y: 26.12, note: 'out along the platform to the hatch' },
      ],
    },
    {
      name: 'round the deck: the abutment, the three sides over the pit, the rails',
      slider: SITE1.fillersGone,
      from: [-19.5, 0, 6.5],
      legs: [
        { to: [-17, 14], y: 0 },
        { to: [0, 14.5], y: 0, note: 'along the south side, inside the fence' },
        { to: [13.5, 12], y: 0 },
        { to: [14.5, 0], y: 0, note: 'between the opening and the east fence' },
        { to: [13.5, -12], y: 0 },
        { to: [0, -14.5], y: 0, note: 'along the north side, over its track' },
        { to: [-17, -13], y: 0 },
        { to: [-24, -4.5], y: 0, note: 'back over the abutment, north of the erector' },
      ],
    },
    {
      name: 'down the road into the pit, the sump, the pit base, a trench and out again',
      slider: SITE1.seated,
      from: [248, -5.7, 0],
      legs: [
        { to: [236, 0], run: true, tol: 0.8, y: -5.3, note: 'off the road round the pit’s point' },
        { to: [150, 0], run: true, y: -20.2, tol: 0.5, note: 'down the road' },
        { to: [64, 0], run: true, y: -35.6, tol: 0.5 },
        { to: [42, 8.34], y: -39.5, tol: 0.5, note: 'over the sump’s roof to its face, at the pit base’s south edge' },
        { to: [39.6, 8.34], y: -39.9, tol: 0.5 },
        { climb: -43.0, down: true, to: [38.2, 8.34], note: 'down the ladder on the sump’s face' },
        { to: [36, 4], y: -43.12, note: 'out onto the pit base' },
        { to: [23, 0], y: -43.12, note: 'to the foot of the launching structure' },
        { to: [36.9, -8.2], y: -43.12, note: 'to the head of the north trench’s ladder' },
        { climb: -47.6, down: true, to: [36.9, -10.2], note: 'down into the trench' },
        { to: [24, -12], y: -47.69, note: 'along the trench to its west end' },
        { to: [36.9, -10.4], y: -47.69 },
        { climb: -43.2, to: [36.9, -8.0], note: 'and up out of it' },
      ],
    },
    {
      name: 'the cut in the north rim: from the steppe down into the pit and back',
      slider: SITE1.seated,
      from: [0, -8, -124],
      legs: [
        { to: [0, -112], y: -8.12, tol: 0.4, note: 'into the cut’s head' },
        { to: [-1, -104], y: -8.3, tol: 0.4, note: 'along its shallow head to where the floor starts down' },
        { to: [-2.6, -92], tol: 3, note: 'down the cut' },
        { to: [-2, -74], tol: 6, note: 'out of its mouth onto the pit’s side' },
        { to: [-2.6, -92], tol: 3 },
        { to: [-1, -104], y: -8.3, tol: 0.4, note: 'and back up' },
        { to: [0, -124], y: -8.12, tol: 0.3, note: 'onto the steppe' },
      ],
    },
    {
      name: 'from the pad down the road’s ramp to the bunker and round the buildings',
      slider: SITE1.seated,
      from: [-30, 0, -20],
      legs: [
        { to: [-78, -20], run: true, y: -0.12, tol: 0.2, note: 'west along the apron, between the spurs' },
        { to: [-83.4, -40], run: true, y: -0.12, tol: 0.3, note: 'to the head of the road' },
        { to: [-82.6, -145], run: true, y: -7.9, tol: 0.5, note: 'down its ramp' },
        { to: [-60, -207.4], run: true, y: -8.12, tol: 0.2, note: 'to the storage bunker’s middle gate' },
        { to: [-55.5, -207.4], y: -8.12, tol: 0.25 },
        { to: [-82.5, -207.4], run: true, y: -8.12, tol: 0.2, note: 'back to the road' },
        { to: [-82.5, -249.4], run: true, y: -8.12, tol: 0.2 },
        { to: [-30, -250], run: true, y: -8.12, tol: 0.2, note: 'east along the road, north of the storage bunker' },
        { to: [-30, -224], run: true, y: -8.12, tol: 0.3 },
        { to: [-16, -222], y: -8.12, tol: 0.3, note: 'to the command bunker’s door' },
        { to: [-30, -250], run: true, y: -8.12, tol: 0.2 },
        { to: [-84, -249.4], run: true, y: -8.12, tol: 0.2 },
        { to: [-84, -230.3], run: true, y: -8.12, tol: 0.2 },
        { to: [-96, -230.3], y: -8.12, tol: 0.25, note: 'to the check-out shop’s gate' },
        { to: [-84, -230.3], run: true, y: -8.12, tol: 0.2 },
        { to: [-84, -112], run: true, y: -5.3, tol: 0.6, note: 'back down the road to the foot of its ramp' },
        { to: [-95, -76], run: true, y: -5.66, tol: 0.4, note: 'off the ramp’s side' },
        { to: [-105.4, -78.5], y: -8.12, tol: 0.25, note: 'to the support building’s door' },
        { to: [-47, -91.6], run: true, y: -8.12, tol: 0.25, note: 'over the road’s ramp to the work shop’s door' },
        { to: [-52, -60], run: true, y: -4.4, tol: 0.6 },
        { to: [-40.7, -53], y: -4.27, tol: 0.4, note: 'up to the pump house’s door, on its plot' },
        { to: [-52, -43], run: true, y: -0.2, tol: 0.4, note: 'up the fall to the propellant shed’s open side' },
      ],
    },
    {
      // (site1/south.py: what one photograph of July 1959 shows south of the tracks, inside the inner fence)
      name: 'south of the embankment: round the two buildings to the pump hut',
      slider: SITE1.seated,
      from: [-60, -0.12, 30],
      legs: [
        { to: [-150, 45], run: true, y: -0.12, tol: 0.3, note: 'south-west off the apron' },
        { to: [-170, 60.3], y: -0.12, tol: 0.3, note: 'to the north wall of the gable-roofed building' },
        { to: [-187, 66], y: -0.12, tol: 0.3, note: 'round its west end' },
        { to: [-187, 81], y: -0.12, tol: 0.3 },
        { to: [-161, 81], run: true, y: -0.12, tol: 0.3, note: 'between it and the store, clear of the store’s extensions' },
        { to: [-144.8, 96], y: -0.12, tol: 0.3, note: 'to the door in the store’s east end' },
        { to: [-117, 135.6], run: true, y: -0.12, tol: 0.3, note: 'to the pump hut’s door, the inner fence behind it' },
      ],
    },
    {
      name: 'outside the south fence: the vehicle shed, the building with a mast, the tents, the yard',
      slider: SITE1.seated,
      from: [-60, -0.12, 240],
      legs: [
        { to: [-92, 250.4], run: true, y: -0.12, tol: 0.3, note: 'to the shed’s doors, along its north side' },
        { to: [-116, 250.4], run: true, y: -0.12, tol: 0.3 },
        { to: [-116, 270], y: -0.12, tol: 0.3, note: 'round its west end' },
        { to: [-100, 277.6], y: -0.12, tol: 0.3, note: 'to the north wall of the building with a mast' },
        { to: [-80, 277.6], run: true, y: -0.12, tol: 0.3 },
        { to: [-80, 296], y: -0.12, tol: 0.3, note: 'round its east end, past the mast’s stays' },
        { to: [-91, 318], run: true, y: -0.12, tol: 0.3, note: 'to the first tent’s end' },
        { to: [-84, 362], run: true, y: -0.12, tol: 0.3, note: 'down the line of tents' },
        { to: [-120, 414], run: true, y: -0.12, tol: 0.3, note: 'to the gap in the yard’s fence' },
        { to: [-120, 427], y: -0.12, tol: 0.3, note: 'and in' },
      ],
    },
  ],
};

/** The instant a way is walked at on this flight: its reading of the slider on the flight's own morning. */
const atOf = (route) => {
  if (route.at !== undefined) return route.at;
  const sequence = flown.models.find((m) => m.id === (route.model ?? 'pad'))?.sequence;
  return sequence ? timeAt(sequence, route.slider) : 0;
};
const routes = (ROUTES[flown.site?.name] ?? []).filter((r) => !only || new RegExp(only).test(r.name));
/** The case of its own after the routes (escapeCase below): run unless --only names something else. */
const ESCAPE = 'Escape frees the mouse first, and a second Escape leaves';
const escaping = Boolean(ROUTES[flown.site?.name]?.length) && (!only || new RegExp(only).test(ESCAPE));
if (!routes.length && !escaping) {
  console.error(`walk-test: no routes for ${flight}'s site (${flown.site?.name ?? 'none'})${only ? ` matching ${only}` : ''}`);
  process.exit(2);
}
if (shots) mkdirSync(shots, { recursive: true });

const browser = await launch();
let failed = 0;
let legsGone = 0;
for (const [n, route] of routes.entries()) {
  // (the dev server's reloads are kept from the page under test)
  const { page, errors, context } = await open(browser, `${url}#${flight}/site/${route.model ?? 'pad'}`, { console: [], timeout: 90000 });
  await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
  const hidePanels = await page.addStyleTag({ content: '#ui, #gallery, #title { display: none !important }' });
  // the morning's hardware where the route wants it, then on foot there
  await page.evaluate(
    async ({ at, from, figure }) => {
      const sr = window.sr;
      sr.stage.setAutoRotate(false);
      sr.clock.pause();
      sr.clock.seek(at);
      await new Promise((done) => setTimeout(done, 4000)); // (the hardware hurries to where the clock was put)
      const walker = figure ?? sr.flight.models.find((m) => m.walker).id;
      sr.stage.enterWalk(walker, { x: from[0], y: from[1], z: from[2] });
      await new Promise((done) => setTimeout(done, 1500));
    },
    { at: atOf(route), from: route.from, figure: route.walker },
  );
  console.log(`${route.name} (T${atOf(route) < 0 ? '' : '+'}${Math.round(atOf(route))} s)`);
  let ok = true;
  for (const [k, leg] of route.legs.entries()) {
    if (leg.board) {
      await hidePanels.evaluate((style) => style.remove());
      await page.evaluate(([x, y, z]) => {
        const walk = window.sr.stage.walk;
        const feet = walk.body.position;
        const dx = x - feet.x;
        const dz = z - feet.z;
        walk.yaw = Math.atan2(-dx, -dz);
        walk.pitch = Math.atan2(y - feet.y - walk.eye, Math.hypot(dx, dz));
      }, leg.board.hatch);
      await page.waitForTimeout(500);
      await page.keyboard.press('e');
      await page.waitForTimeout(300);
      const choices = await page.locator('.wheel [data-item]').allTextContents();
      const choice = choices.findIndex((label) => label.includes(`Board: ${leg.board.label}`));
      if (choice >= 0) await page.keyboard.press(String(choice + 1));
      const seated =
        choice >= 0 &&
        (await page
          .waitForFunction((seat) => window.sr.stage.onFoot.seated?.seat === seat, leg.board.seat, { timeout: 7000 })
          .then(
            () => true,
            () => false,
          ));
      console.log(`  ${seated ? 'ok  ' : 'FAIL'} ${String(k + 1).padStart(2, '0')} board ${leg.board.label}`);
      if (!seated) ok = false;
    } else if (leg.lift) {
      const got = await page.evaluate(async ({ model, part, action, stop }) => {
        const sr = window.sr;
        const def = sr.flight.models
          .find((m) => m.id === model)
          .parts.find((p) => p.node === part)
          .actions.find((a) => a.id === action);
        const body = sr.stage.walk.body;
        if (!sr.stage.onFoot.workings.riding(model, def.do.node, def)) return { error: 'not standing on the lift', y: body.position.y };
        sr.stage.onFoot.workAction(model, def.do.node, def, stop);
        const t0 = performance.now();
        let last = body.position.y;
        let still = 0;
        while (performance.now() - t0 < 180000 && still < 1.5) {
          await new Promise((done) => setTimeout(done, 250));
          still = Math.abs(body.position.y - last) < 1e-4 ? still + 0.25 : 0;
          last = body.position.y;
        }
        return { y: body.position.y, x: body.position.x, z: body.position.z, s: (performance.now() - t0) / 1000 };
      }, leg.lift);
      const bad =
        got.error ??
        (leg.y !== undefined && Math.abs(got.y - leg.y) > (leg.tol ?? 0.35) ? `the feet are at ${got.y.toFixed(2)} m, not ${leg.y}` : null);
      console.log(
        `  ${bad ? 'FAIL' : 'ok  '} ${String(k + 1).padStart(2)} ${leg.note ?? 'the lift'}: ${bad ?? `${got.s.toFixed(0)} s, feet at ${got.y.toFixed(2)} m`}`,
      );
      if (bad) ok = false;
    } else {
      await page.keyboard.down('w');
      if (leg.run) await page.keyboard.down('Shift');
      const got = await page.evaluate(
        async ({ to, within, climb, down, run }) => {
          const walk = window.sr.stage.walk;
          const body = walk.body;
          const start = body.position.clone();
          const far = Math.hypot(to[0] - start.x, to[1] - start.z);
          const limit = 8 + (far / (run ? 3 : 0.5)) * 1.5 + (climb !== undefined ? 60 : 0);
          const t0 = performance.now();
          let drop = 0;
          let air = 0;
          let lastY = body.position.y;
          let lastT = t0;
          let best = far;
          let since = t0;
          let onLadder = false;
          let low = body.position.y;
          let high = body.position.y;
          for (;;) {
            await new Promise((done) => requestAnimationFrame(done));
            const now = performance.now();
            const p = body.position;
            const dx = to[0] - p.x;
            const dz = to[1] - p.z;
            const d = Math.hypot(dx, dz);
            if (body.on) onLadder = true;
            // steer: forward is (-sin yaw, -cos yaw) over the ground; from a ladder's top, looking down it
            if (!body.on) walk.yaw = Math.atan2(-dx, -dz);
            walk.pitch = down && !body.on && d < 1.5 ? -0.9 : 0;
            if (!body.on && !body.grounded) air += (now - lastT) / 1000;
            if (!body.on) drop = Math.max(drop, lastY - p.y);
            lastY = p.y;
            lastT = now;
            low = Math.min(low, p.y);
            high = Math.max(high, p.y);
            if (d < best - 0.05 || body.on) {
              best = Math.min(best, d);
              since = now;
            }
            const there =
              climb === undefined ? d < within : !body.on && onLadder && Math.abs(p.y - climb) < 0.5 && d < Math.max(within, 1.2);
            if (there) return { ok: true, x: p.x, y: p.y, z: p.z, s: (now - t0) / 1000, drop, air, low, high, onLadder };
            if (now - since > 6000 || now - t0 > limit * 1000)
              return {
                ok: false,
                why: now - since > 6000 ? 'stopped' : 'too long',
                x: p.x,
                y: p.y,
                z: p.z,
                s: (now - t0) / 1000,
                drop,
                air,
                low,
                high,
                onLadder,
                d,
              };
          }
        },
        { to: leg.to, within: leg.within ?? 0.6, climb: leg.climb, down: !!leg.down, run: !!leg.run },
      );
      await page.keyboard.up('w');
      if (leg.run) await page.keyboard.up('Shift');
      await page.waitForTimeout(400);
      const feet = await page.evaluate(() => window.sr.stage.walk.body.position.y);
      const allowed = leg.falls ?? 0.45;
      const bad = !got.ok
        ? `${got.why} at ${got.x.toFixed(1)}, ${got.z.toFixed(1)} (feet ${got.y.toFixed(2)} m), ${got.d.toFixed(1)} m short`
        : got.drop > allowed
          ? `fell ${got.drop.toFixed(2)} m in one frame on the way`
          : got.air > 0.7
            ? `was ${got.air.toFixed(1)} s in the air on the way (down to ${got.low.toFixed(1)} m)`
            : leg.climb !== undefined && !got.onLadder
              ? 'never took hold of the ladder'
              : leg.y !== undefined && Math.abs(feet - leg.y) > (leg.tol ?? 0.35)
                ? `the feet are at ${feet.toFixed(2)} m, not ${leg.y}`
                : null;
      const where = leg.climb !== undefined ? `the ladder to ${leg.climb} m` : `to ${leg.to[0]}, ${leg.to[1]}`;
      console.log(
        `  ${bad ? 'FAIL' : 'ok  '} ${String(k + 1).padStart(2)} ${where}${leg.note ? ` (${leg.note})` : ''}: ${bad ?? `${got.s.toFixed(0)} s, feet at ${feet.toFixed(2)} m (${got.low.toFixed(1)} to ${got.high.toFixed(1)} on the way)`}`,
      );
      if (bad) ok = false;
    }
    if (shots) await page.screenshot({ path: join(shots, `walk-${n + 1}-${String(k + 1).padStart(2, '0')}.png`) });
    legsGone++;
    if (!ok) break; // (the rest of the way is from where this leg should have ended)
  }
  if (errors.length) {
    console.log(`  FAIL the page threw: ${errors[0]}`);
    ok = false;
  }
  if (!ok) failed++;
  await context.close();
}

/**
 * Escape on foot (walking.md, "Escape frees the mouse first"), with the page's panels on show, from where the site's first
 * route starts. Headless Chrome gives a captured pointer's Escape to the page and lets nothing go itself, so the real key
 * is heard by the walker, which lets the pointer go as a desktop browser would; a desktop browser lets it go and the page
 * hears only that, which is driven here by `document.exitPointerLock()` with the page in focus. The window going (alt-tab)
 * is the same with `document.hasFocus()` answering false.
 */
async function escapeCase() {
  console.log(ESCAPE);
  const first = ROUTES[flown.site.name][0];
  const { page, errors, context } = await open(browser, `${url}#${flight}/site/${first.model ?? 'pad'}`, { console: [], timeout: 90000 });
  await page.evaluate(() => Promise.allSettled(window.sr.stage.arriving ?? []));
  let bad = 0;
  const check = (ok, what) => {
    console.log(`  ${ok ? 'ok  ' : 'FAIL'} ${what}`);
    if (!ok) bad++;
  };
  const state = () =>
    page.evaluate(() => {
      const walk = window.sr.stage.walk;
      const say = document.querySelector('#ui .notes .say');
      return {
        active: walk.active,
        locked: document.pointerLockElement === document.querySelector('#stage'),
        at: walk.body.position.toArray(),
        yaw: walk.yaw,
        third: walk.third,
        said: say && !say.hidden ? say.textContent : '',
        location: document.querySelector('[data-walk-location]')?.textContent ?? '',
        bar: document.querySelector('#ui .walkbar span')?.textContent ?? '',
      };
    });
  const apart = (a, b) => Math.hypot(a.at[0] - b.at[0], a.at[2] - b.at[2]);
  const hush = () =>
    page.evaluate(() => {
      const say = document.querySelector('#ui .notes .say');
      if (say) say.textContent = '';
    });
  // a point on the view that nothing of the page's lies over: a click there is a click on the view
  const onView = await page.evaluate(() => {
    const stage = document.querySelector('#stage');
    for (let y = 0.3; y < 0.75; y += 0.05)
      for (let x = 0.3; x < 0.75; x += 0.05) {
        const p = [Math.round(innerWidth * x), Math.round(innerHeight * y)];
        if (document.elementFromPoint(...p) === stage) return p;
      }
    return null;
  });
  const walkers = await page.evaluate(() => window.sr.flight.models.filter((m) => m.walker).map((m) => m.id));
  /** On foot where the first route starts, the mouse captured (by a click on the view, if starting did not capture it). */
  const onFoot = async (as = walkers[0]) => {
    await page.evaluate(
      async ({ as, from }) => {
        window.sr.stage.enterWalk(as, { x: from[0], y: from[1], z: from[2] });
        await new Promise((done) => setTimeout(done, 1500));
      },
      { as, from: first.from },
    );
    if (!(await state()).locked && onView) await page.mouse.click(...onView);
    await page.waitForTimeout(300);
    return state();
  };
  const press = async (key, ms = 400) => {
    await page.keyboard.press(key);
    await page.waitForTimeout(ms);
    return state();
  };
  const hold = async (key, ms) => {
    await page.keyboard.down(key);
    await page.waitForTimeout(ms);
    await page.keyboard.up(key);
    await page.waitForTimeout(300);
    return state();
  };
  await page.evaluate(async (at) => {
    const sr = window.sr;
    sr.stage.setAutoRotate(false);
    sr.clock.pause();
    sr.clock.seek(at);
    await new Promise((done) => setTimeout(done, 4000));
  }, atOf(first));

  check(onView !== null, `a place on the view to click: ${onView}`);
  const s0 = await onFoot();
  check(s0.active && s0.locked, `on foot, the mouse captured (on foot ${s0.active}, captured ${s0.locked})`);
  check(s0.location.includes(flown.launchSite) && s0.location.includes('Near '), `site and landmark named: ${s0.location}`);
  check(/frees the mouse/.test(s0.bar), `the walk bar says what Esc does with it captured: "${s0.bar}"`);
  const s1 = await hold('w', 800);
  check(apart(s0, s1) > 0.3, `W walks with the mouse captured (${apart(s0, s1).toFixed(2)} m)`);
  // the first Escape: a real key
  await hush();
  const s2 = await press('Escape');
  check(s2.active, 'the first Escape (the real key): still on foot');
  check(!s2.locked, 'the first Escape: the mouse is free');
  check(
    apart(s1, s2) < 0.05 && Math.abs(s2.yaw - s1.yaw) < 1e-3 && s2.third === s1.third,
    'the first Escape: where he stood, facing as he faced, nothing reset',
  );
  check(/mouse is free/i.test(s2.said) && /click the view/i.test(s2.said) && /Esc leaves/.test(s2.said), `the notes say so: "${s2.said}"`);
  check(/Click the view/.test(s2.bar), `the walk bar says how to look round again: "${s2.bar}"`);
  const s3 = await hold('w', 800);
  check(s3.active && apart(s2, s3) > 0.3, `W walks with the mouse free (${apart(s2, s3).toFixed(2)} m)`);
  const s4 = await hold('ArrowLeft', 500);
  check(s4.active && Math.abs(s4.yaw - s3.yaw) > 0.1, `the left arrow turns with the mouse free (${(s4.yaw - s3.yaw).toFixed(2)} rad)`);
  if (onView) await page.mouse.click(...onView);
  await page.waitForTimeout(400);
  const s5 = await state();
  check(s5.active && s5.locked, `a click on the view captures it again, still on foot (captured ${s5.locked})`);
  // the first Escape as a desktop browser has it: the pointer let go, and no key
  await hush();
  await page.evaluate(() => document.exitPointerLock());
  await page.waitForTimeout(400);
  const s6 = await state();
  check(
    s6.active && !s6.locked && /mouse is free/i.test(s6.said),
    "the capture lost (a desktop browser's Escape): still on foot, free, and said",
  );
  const s7 = await press('Escape', 1500);
  check(!s7.active, 'a second Escape, the mouse free, leaves');
  // the window going is no Escape
  const s8 = await onFoot();
  await hush();
  await page.evaluate(() => {
    document.hasFocus = () => false;
    document.exitPointerLock();
  });
  await page.waitForTimeout(400);
  await page.evaluate(() => delete document.hasFocus);
  const s9 = await state();
  check(s8.locked && s9.active && !s9.locked && s9.said === '', 'the window going lets the mouse go: still on foot, and nothing said');
  const s10 = await press('Escape', 1500);
  check(!s10.active, 'then one Escape leaves, as from any free mouse');
  // V leaves at once, from either; so does the Exit walk bar
  const s11 = await onFoot(walkers.at(-1));
  const s12 = await press('v', 1500);
  check(s11.locked && !s12.active, 'V leaves at once with the mouse captured');
  await onFoot(walkers.at(-1));
  await press('Escape');
  const s13 = await press('v', 1500);
  check(!s13.active, 'V leaves at once with the mouse freed');
  const start = await onFoot();
  const moved = await hold('w', 900);
  await press('Escape');
  await page.click('[data-walk-return]');
  await page.waitForTimeout(400);
  const returned = await state();
  check(
    apart(start, moved) > 0.3 && returned.active && apart(start, returned) < 0.1,
    'Back to start restores the starting position on foot',
  );
  if (returned.locked) await press('Escape');
  await page.click('[data-walk-exit]');
  await page.waitForTimeout(1500);
  check(!(await state()).active, 'the Exit walk bar leaves with the mouse freed');
  // never captured: one Escape leaves
  await page.evaluate(() => {
    HTMLCanvasElement.prototype.requestPointerLock = () => Promise.reject(new Error('refused'));
  });
  const s14 = await onFoot();
  const s15 = await press('Escape', 1500);
  check(s14.active && !s14.locked && !s15.active, 'a capture refused: one Escape leaves');
  if (errors.length) check(false, `the page threw: ${errors[0]}`);
  await context.close();
  return bad;
}
let escapeFailed = 0;
if (escaping) escapeFailed = await escapeCase();
await browser.close();
if (escapeFailed) failed++;
console.log(
  `walk-test: ${failed ? `${failed} of ${routes.length + (escaping ? 1 : 0)} cases FAILED` : `ok, ${routes.length} routes, ${legsGone} legs${escaping ? ', and Escape' : ''}`}`,
);
process.exit(failed ? 1 : 0);
