import type { Flight, Keyframe, ModelDef, Move, Part, Runs } from '../../../../src/types';

/**
 * Site 1's pad as a flight's data: the parts of a flight's pad.glb (sites/site_1.py), what each is and how it moves. The
 * hardware is the site's and the same for every flight from it (Vostoks 1 to 6, the Voskhods), so it is said once, here;
 * a flight gives its day (`Site1Day`): where its morning's motions fall on the pad's slider, what it says of each part
 * (or what it adds to the site's own words), when the erector's crew left, and whether the railway fillers stood beside
 * it. The people and road vehicles of a morning are the flight's own parts. sites/site-1.md has every pivot, travel and
 * source. Moved here from Vostok 1's flight.ts unchanged.
 */

export const DEG = Math.PI / 180;

// Where the vehicle hangs at Site 1, as sites/site1/site.py has it (the numbers live there; site-1.md): its nozzles' exits
// 6.75 m under the platform's deck, level with the foot of the launch system's turning part, and the whole system turned
// in the platform's opening to the launch azimuth, 37.5 degrees (derived), with booster B's plane along it (estimated).
/** The nozzles' exits, m above the deck (site.TAIL_Z). */
export const TAIL = -6.75;
/** The vehicle's own +X (booster B's plane) from the site's +X (due east), radians anticlockwise from above (site.TURN). */
export const TURN = (90 - 37.5) * DEG;
/** A direction given in the vehicle's own frame, as it stands turned on the pad (a view's `from` is the scene's). */
export const turned = ([x, y, z]: [number, number, number]): [number, number, number] => [
  x * Math.cos(TURN) + z * Math.sin(TURN),
  y,
  -x * Math.sin(TURN) + z * Math.cos(TURN),
];
/** A swing outward about a hinge at the foot of something standing at this azimuth round the site. */
const outward = (node: string, az: number, degrees: number, from: number, to: number): Move => ({
  kind: 'swing',
  node,
  axis: [-Math.sin(az * DEG), 0, -Math.cos(az * DEG)],
  angle: degrees * DEG,
  from,
  to,
});

// What served the rocket and was taken away before it left, as sites/site1/ has it (service_trusses.py, cable_mast.py,
// erector.py: the numbers live there, and site-1.md tabulates the pivots). Angles round the site are from due east,
// anticlockwise from above; the launch system stands turned TURN, so its north truss is 45 degrees on from that.
/** Where each piece's hinge is round the site, degrees. */
const TRUSS_NORTH = TURN / DEG + 45;
const TRUSS_SOUTH = TURN / DEG + 225;
const MAST_AT = TURN / DEG + 315;
/** How far a service truss is lowered, and the cable mast swings back at 09:06, degrees. */
const TRUSS_FALL = 98;
const MAST_FALL = 40;
/**
 * The launch system's four supports (launch_system.py): where each hinge is round the site, how far each falls back
 * (degrees), and when, in seconds from launch. That they fall back as the rocket rises is the record (Siddiqi; Chertok);
 * the angle is read off a photograph of this launch with the rocket's tail some 20 m over the deck, in which they
 * stand open, 14 to 21 degrees out of upright. The times are a later launch's: film of a Soyuz leaving this pad in
 * 2019 (the same system, since modified) has the trusses begin 0.6 to 0.9 s after the rocket first moves and at rest
 * 1.7 to 2.0 s later, which the photograph of 1961 allows (open by about three seconds) and the rocket needs (the
 * pose check, site-1.md: the strap-ons clear the heads).
 */
const SUPPORT_AT = [45, 135, 225, 315].map((az) => TURN / DEG + az);
const SUPPORT_FALL = 45;
export const SUPPORTS_GO: [from: number, to: number] = [0.7, 2.6];
/**
 * The four guides at the tail, each under its support: they "go back under their own weight" once the rocket's
 * brackets have left their grips, in 2.5 s at most (descriptions and trials of the later system). The model's guide
 * is an arm from the turning cage in to the tail, whose tip goes down: how far is estimated.
 */
const GUIDE_FALL = -25;
const GUIDES_GO: [from: number, to: number] = [0.3, 2.3];
/**
 * The railway fillers (tank_cars.py): each is drawn off west along its own track, its east bogie following the track's
 * line (metres east and south from where that bogie stood: sites/site1/place.py, SPURS and CENTRE_TRACK).
 */
/** The fillers' wheels' radius where the coned tread bears on the rail's head: 950 mm wheels, 2.4 mm out (site1/tank_cars.py `AXLE_Z`). */
const CAR_WHEEL = 0.475 + 0.0024;
/**
 * What a railway wagon runs on (types.ts Runs): the model's own rails, on the deck (DeckRails) and where they come up to
 * the platform over the land (the place's Tracks); beyond the modelled rails the track is painted on the land, and
 * there it runs on that.
 */
export const ON_RAILS: Runs = { on: ['DeckRails', 'Tracks'], ground: true };
/** What a road vehicle runs on: the land, which the roads and the apron are painted on, and a modelled rail it crosses. */
export const ON_ROAD: Runs = { on: ['Tracks'], ground: true };
/**
 * A track's line as a route: its corners (place.py's polylines, which the model's rails follow straight from corner to
 * corner) with a point every few metres between them, so that the drive's smooth curve through its points (explode.ts
 * `Route`) keeps to the rails and does not bow off them between corners.
 */
const alongTrack = (corners: [number, number][], step = 4): [number, number][] => {
  const out: [number, number][] = [];
  let [x0, z0] = [0, 0];
  for (const [x, z] of corners) {
    const n = Math.max(1, Math.ceil(Math.hypot(x - x0, z - z0) / step));
    for (let i = 1; i <= n; i++) out.push([x0 + ((x - x0) * i) / n, z0 + ((z - z0) * i) / n]);
    [x0, z0] = [x, z];
  }
  return out;
};
const carLeaves = (node: string, wheelbase: number, corners: [number, number][], from: number, to: number): Move => ({
  kind: 'drive',
  node,
  from,
  to,
  path: alongTrack(corners),
  pivot: [0, CAR_WHEEL, 0],
  forward: [-1, 0],
  wheelRadius: CAR_WHEEL,
  wheelbase,
  wheels: `${node}_Wheel_`,
  steered: `${node}_Steered_`,
  axle: 'z',
  bogies: true,
  runs: ON_RAILS,
});
/** The erector: its boom's lean toward the rocket, how far it is drawn back before the wagon moves, the wagon's two runs west and its wheels' radius. */
const BOOM_LEAN = 14;
const BOOM_BACK = 20;
const ERECTOR_ROLL = [30, 120];
const ERECTOR_WHEEL = 0.475;
const ERECTOR_AXLES = [1, 2, 3, 4, 5, 6];
/**
 * The wagon on the model's rails all the way it goes (DeckRails, then the place's Tracks, modelled to where it is left).
 * Its wheels bear 2.4 mm out from the nominal radius, where the coned tread meets the rail's head (site1/erector.py `AXLE_Z`).
 */
const ERECTOR_RUNS: Runs = { on: ['DeckRails', 'Tracks'], wheels: 'Erector_Wheel_', wheelRadius: ERECTOR_WHEEL + 0.0024, axle: 'z' };
/** The lift's stops above its lowest, m: it rides the leaning boom, so each is 0.2493 of its height nearer the rocket. */
const LIFT_STOPS: [name: string, up: number][] = [
  ['Lift door, 15 steps up', 0],
  ['Third stage', 19.6],
  ['Upper platform, at the hatch', 23.12],
];

/**
 * The people of a morning stand in groups, each a node of the pad, and are there when the record has them there: a
 * group that leaves is put out of sight between one frame and the next, 90 m under where it stood, and one that comes
 * is built there and brought up. (They do not walk away: the viewer walks one figure, the one being walked as.) Seconds
 * from launch, on the flight's clock.
 */
export const OUT_OF_SIGHT = 90;
export const leaves = (node: string, at: number): Move => ({ kind: 'slide', node, by: [0, -OUT_OF_SIGHT, 0], from: at, to: at + 0.1 });
export const comes = (node: string, at: number): Move => ({ kind: 'slide', node, by: [0, OUT_OF_SIGHT, 0], from: at, to: at + 0.1 });

/**
 * A road vehicle driven on the clock (road_vehicles.py): `path` is where its rear axle goes, metres ahead and to the
 * right of where the drive starts. A vehicle driven more than once is a nest of nodes, a drive to each, and its
 * wheels are named after the node.
 */
export const drives = (
  node: string,
  from: number,
  to: number,
  path: [number, number][],
  wheelbase: number,
  wheelRadius: number,
  reverse = false,
): Move => ({
  kind: 'drive',
  node,
  from,
  to,
  path,
  pivot: [0, wheelRadius, 0],
  forward: [1, 0],
  reverse,
  wheelRadius,
  wheelbase,
  wheels: `${node}_Wheel_`,
  steered: `${node}_SteerWheel_`,
  axle: 'z',
  runs: ON_ROAD,
});
export const BUS = { wheelbase: 4.19, wheel: 0.525 };

/**
 * The cosmonauts' bus (road_vehicles.py: the same LAZ-695B brought each pilot), driven in along the road onto the apron, and
 * at the time the flight gives backed out into the road round the pit and away west. `at`: each drive's start and end,
 * seconds from launch. What is said of it, and the group it is listed under, are the flight's.
 */
export function busPart(
  group: string,
  words: PartWords,
  at: { in: [number, number]; back: [number, number]; away: [number, number] },
): Part {
  return {
    node: 'Bus',
    group,
    name: 'The cosmonauts’ bus',
    ...words,
    explode: [0, 0, 0],
    order: 0,
    clocked: [
      // in along the road and onto the apron; at thirty minutes' readiness, back out into the road round the pit, then away west
      {
        ...drives(
          'Bus_In',
          at.in[0],
          at.in[1],
          [
            [60, 0],
            [120, -0.45],
            [144.4, -0.75],
            [155, -1.75],
            [164, -4.35],
            [171, -7.15],
            [174.61, -8.15],
            [178.61, -8.15],
          ],
          BUS.wheelbase,
          BUS.wheel,
        ),
      },
      drives(
        'Bus_Back',
        at.back[0],
        at.back[1],
        [
          [-10.6, 0],
          [-20.61, 2.3],
          [-28.11, 6.3],
          [-31.81, 12.8],
          [-32.61, 20.8],
          [-32.61, 26.8],
        ],
        BUS.wheelbase,
        BUS.wheel,
        true,
      ),
      drives(
        'Bus_Away',
        at.away[0],
        at.away[1],
        [
          [12, 0],
          [16, -2],
          [18.2, -7],
          [18.7, -16],
          [17.8, -216],
          [17.0, -396],
          [16.8, -428],
        ],
        BUS.wheelbase,
        BUS.wheel,
      ),
    ],
  };
}

/** The pad's parts that are the site's hardware, by their nodes in pad.glb. */
export type Site1Node =
  | 'Platform'
  | 'DeckRails'
  | 'Masts'
  | 'DeckFittings'
  | 'FlamePit'
  | 'FlameDeflector'
  | 'LaunchRing'
  | 'TankCars'
  | 'Erector'
  | 'ServiceTrusses'
  | 'UpperCableMast';

/** What is said of one part. */
export interface PartWords {
  summary: string;
  detail: string;
  facts?: [string, string][];
}

/**
 * Where a morning's motions fall on the pad's slider (0 to 1): the fillers drawn off (from, to), the erector's boom
 * come away, down on its wagon and the wagon off the pad, each service truss lowered (from, to), the cable mast swung
 * clear (from, to). A flight's `sequence` says when each fell on the clock.
 */
export interface Site1Stops {
  cars: [number, number];
  erector: number;
  boomAway: number;
  boomDown: number;
  cleared: number;
  north: [number, number];
  south: [number, number];
  mast: [number, number];
}

/** A flight's morning at Site 1. */
export interface Site1Day {
  stops: Site1Stops;
  /** What the flight says of each part, in place of the site's own words (`SITE1_WORDS`). */
  words?: Partial<Record<Site1Node, PartWords>>;
  /** Or what it adds to them: a line on its own morning, and facts of the day. */
  adds?: Partial<Record<Site1Node, { detail?: string; facts?: [string, string][] }>>;
  /** When the two of the erector's crew at its rail left, seconds from launch, or null where they are not built that day. */
  erectorCrew: number | null;
  /** Whether the railway fillers stood beside the rocket (their node is built only for a day that has them: tank_cars.py). */
  fillers: boolean;
}

/** The pad's hardware, its words and motions, for a flight's day. Its order is the pad's parts list. */
export function site1Parts(day: Site1Day): Part[] {
  const s = day.stops;
  const said = (node: Site1Node): PartWords => {
    const own = day.words?.[node];
    if (own) return own;
    const site = SITE1_WORDS[node];
    if (!site) throw new Error(`site1Parts: nothing is said of ${node}, by the site or the flight`);
    const add = day.adds?.[node];
    return {
      summary: site.summary,
      detail: add?.detail ? `${site.detail} ${add.detail}` : site.detail,
      ...(site.facts || add?.facts ? { facts: [...(site.facts ?? []), ...(add?.facts ?? [])] } : {}),
    };
  };
  // the railway fillers, on a day they stood beside the rocket
  const fillers: Part = {
    node: 'TankCars',
    group: 'Taken away before launch',
    name: 'Railway fillers',
    ...said('TankCars'),
    explode: [0, 0, 0],
    order: 0,
    functions: [
      { nodes: ['TankCar_Oxygen'], name: 'Oxygen filler', ends: ['beside the rocket', 'drawn off'], seconds: 120 },
      { nodes: ['TankCar_Kerosene'], name: 'Kerosene filler', ends: ['beside the rocket', 'drawn off'], seconds: 240 },
    ],
    moves: [
      // west along the north track to short of its end (documented that they left, and when; how far and how fast are ours)
      carLeaves(
        'TankCar_Oxygen',
        16.6,
        [
          [-66.3, 0],
          [-196.3, -1.394],
        ],
        s.cars[0],
        s.cars[1],
      ),
      // west along the south track, onto the centre track where it joins it, and out through the fence
      carLeaves(
        'TankCar_Kerosene',
        15.6,
        [
          [-64.8, 0],
          [-160.2, -2.275],
          [-291.0, -13.475],
          [-524.8, -15.452],
        ],
        s.cars[0],
        s.cars[1],
      ),
    ],
  };
  return [
    {
      node: 'Platform',
      group: 'Site 1',
      name: 'Launch platform',
      ...said('Platform'),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'DeckRails',
      group: 'Site 1',
      name: 'Tracks on the deck',
      ...said('DeckRails'),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'Masts',
      group: 'Site 1',
      name: 'Corner mast',
      ...said('Masts'),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'DeckFittings',
      group: 'Site 1',
      name: 'On the deck',
      ...said('DeckFittings'),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'FlamePit',
      group: 'Site 1',
      name: 'Flame pit',
      ...said('FlamePit'),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'FlameDeflector',
      group: 'Site 1',
      name: 'Flame deflector',
      ...said('FlameDeflector'),
      explode: [0, 0, 0],
      order: 0,
    },
    {
      node: 'LaunchRing',
      group: 'Site 1',
      name: 'Launch system',
      ...said('LaunchRing'),
      explode: [0, 0, 0],
      order: 0,
      // each support about its hinge on the ring, its head going outward (documented that they do; the angle read off a
      // photograph of the launch; the times off film of the later system); each guide about its foot on the cage, its
      // tip going down (documented for the later system that they fall away; the angle estimated)
      clocked: [
        ...SUPPORT_AT.map((az, i) => outward(`Support_${i + 1}`, az, SUPPORT_FALL, ...SUPPORTS_GO)),
        ...SUPPORT_AT.map((az, i) => outward(`Guide_${i + 1}`, az, GUIDE_FALL, ...GUIDES_GO)),
      ],
    },
    ...(day.fillers ? [fillers] : []),
    {
      node: 'Erector',
      group: 'Taken away before launch',
      name: 'Erector',
      ...said('Erector'),
      actions: [
        {
          // The car rides the leaning boom's north face: `by` is from where it is built, at the stair's landing.
          id: 'lift',
          label: 'Lift',
          on: 'Erector_Lift',
          do: {
            kind: 'lift',
            node: 'Erector_Lift',
            stops: LIFT_STOPS.map(([name, up]) => ({ name, by: [up * Math.tan(BOOM_LEAN * DEG), up, 0] as [number, number, number] })),
            // 23 m in "a minute" by one of Ivanovsky's tellings and "two or three minutes" by another
            speed: 0.3,
          },
        },
      ],
      explode: [0, 0, 0],
      order: 0,
      functions: [
        { nodes: ['Erector_Boom'], name: 'Boom', ends: ['up at the rocket', 'down on the wagon'], seconds: 120 },
        {
          nodes: ['Erector', ...ERECTOR_AXLES.map((n) => `Erector_Wheel_${n}`)],
          name: 'Along the track',
          ends: ['at the rocket', 'drawn off'],
          seconds: 150,
          needs: [{ node: 'Erector_Boom', atLeast: 0.15, why: 'the boom is still against the rocket' }],
        },
      ],
      moves: [
        // the boom comes away (documented, 08:35 to 08:37), then goes down as the wagon rides off (documented that it
        // did; how far it had gone before it lay down is ours), and the wagon is drawn on (documented; how far, ours), on
        // its rails and its wheels turning as it goes (ERECTOR_RUNS)
        { kind: 'swing', node: 'Erector_Boom', axis: [0, 0, 1], angle: BOOM_BACK * DEG, from: s.erector, to: s.boomAway },
        {
          kind: 'swing',
          node: 'Erector_Boom',
          axis: [0, 0, 1],
          angle: (90 + BOOM_LEAN - BOOM_BACK) * DEG,
          from: s.boomAway,
          to: s.boomDown,
        },
        { kind: 'slide', by: [-ERECTOR_ROLL[0]!, 0, 0], from: s.boomAway, to: s.boomDown, runs: ERECTOR_RUNS },
        { kind: 'slide', by: [-(ERECTOR_ROLL[1]! - ERECTOR_ROLL[0]!), 0, 0], from: s.boomDown, to: s.cleared, runs: ERECTOR_RUNS },
      ],
      // two of its crew at the wagon's rail (a colour photograph), until thirty minutes' readiness (the roster)
      ...(day.erectorCrew !== null ? { clocked: [leaves('Erector_Crew', day.erectorCrew)] } : {}),
    },
    {
      node: 'ServiceTrusses',
      group: 'Taken away before launch',
      name: 'Service trusses',
      ...said('ServiceTrusses'),
      explode: [0, 0, 0],
      order: 0,
      functions: [
        { nodes: ['ServiceTruss_North'], name: 'North truss', ends: ['raised', 'lowered'], seconds: 90 },
        { nodes: ['ServiceTruss_South'], name: 'South truss', ends: ['raised', 'lowered'], seconds: 90 },
      ],
      moves: [
        // lowered about their hinges on the ring (documented that they were, and when they began; how long each took and
        // which went first are ours)
        outward('ServiceTruss_North', TRUSS_NORTH, TRUSS_FALL, s.north[0], s.north[1]),
        outward('ServiceTruss_South', TRUSS_SOUTH, TRUSS_FALL, s.south[0], s.south[1]),
      ],
    },
    {
      node: 'UpperCableMast',
      group: 'Taken away before launch',
      name: 'Cable mast',
      ...said('UpperCableMast'),
      explode: [0, 0, 0],
      order: 0,
      functions: [{ nodes: ['UpperCableMast'], name: 'Swing clear', ends: ['at the rocket', 'swung clear'], seconds: 10 }],
      // back the whole way at 09:06 (the minute documented; the angle and the ten seconds estimated)
      moves: [outward('UpperCableMast', MAST_AT, MAST_FALL, s.mast[0], s.mast[1])],
    },
  ];
}

/** What is said of the hardware no flight's day changes (a flight's `words` can still replace it). */
export const SITE1_WORDS: Partial<Record<Site1Node, PartWords>> = {
  Platform: {
    summary: 'A concrete deck 41 m square, three sides of it standing out over a pit.',
    detail:
      'The rocket was brought onto it lying down, along the tracks from the west, where the deck rests on the ground; its ' +
      'other three sides stand out over the flame pit on four pylons, and a low fence keeps people back from the drop. In ' +
      'its middle is the round opening, 20 m across, that the launch system turns in and the rocket hangs through. Its ' +
      'north-east corner is carried 10 ft further out, for one of the two masts; its south-east corner is cut off. On its ' +
      'west side is a small building the CIA took for the head of a stair down into it: what is under it is not recorded, ' +
      'and its door is shut. Nobody has published a drawing of the platform. Its size is what the CIA’s photographic ' +
      'interpreters measured off U-2 pictures of 1957 to 1959, which agrees with the 40 by 40 m in Russian print; its ' +
      'thickness is read off their elevation and is estimated (a Russian account has it three storeys of bridge trusses). ' +
      'Sputnik left from it, and every crewed Vostok.',
    facts: [
      ['Deck', '135 ft (41.15 m) square'],
      ['Opening', '65 ft (19.8 m) across'],
      ['Pylons', '4, each 30 by 10 ft, 115 ft over the four'],
      ['Thickness', 'about 10 ft (estimated)'],
      ['Lip', '10 ft out at the north-east corner'],
      ['In use', '1957 to 2019'],
    ],
  },
  FlamePit: {
    summary: 'The pad stands on the edge of a quarry 43 m deep, and the flame is turned out along its floor.',
    detail:
      'Under the platform the pit is a slot between retaining walls 110 ft apart. East of it lies the pit base, 60 ft ' +
      'wide between two concrete trenches that run 60 ft to a sump built into the floor, whose face stands 10 ft over ' +
      'them: for the water that flushed the pit, the CIA thought, and for dumped propellant. From the sump the floor ' +
      'climbs east to the pit’s point, and a road came down it from there. Round the slot the sides come down in two ' +
      'terraces, and in 1959 a cut ran north out of the rim, beside which the cables to the bunker came in. The outline ' +
      'is today’s map, which matches the 880 by 550 ft the CIA measured in 1957, with that cut put back. The depth is in ' +
      'dispute: 43 m is modelled, the sum of two of the CIA’s figures, where Russian print gives 45 m and "almost 50". ' +
      'The plan of the base is the CIA’s; the trenches’ depth, the road’s surface and the ladders are estimated.',
    facts: [
      ['Rim', '880 by 550 ft (268 by 168 m), as measured in 1957'],
      ['Depth', 'about 43 m under the deck (in dispute)'],
      ['Rim’s height', 'the deck’s level on the west and south, 8 m under it on the north (derived from SRTM)'],
      ['Pit base', '60 ft wide, between two trenches 60 ft long'],
      ['Sump', '75 by 110 ft, its face 10 ft high'],
      ['Lining', 'concrete under the platform, gunite on the west'],
    ],
  },
  FlameDeflector: {
    summary: 'A curved chute under the opening that turns twenty chambers’ fire from straight down to due east.',
    detail:
      'The rocket’s tail hangs 6.75 m under the deck, and below it the back wall of the pit curves forward and down to ' +
      'the floor: the exhaust strikes it and runs out along the pit base. No photograph taken from above could show it. ' +
      'The CIA drew only a "possible base of flame deflector", and in 1959 saw a curved deflector plate being built in ' +
      'the same place at the second pad. Its form here is from a scale model of the pad as it was in 1957: an arc from ' +
      'the back wall, 16 m under the deck, to the pit base at the platform’s east edge, as wide as the slot. Every size ' +
      'of it is estimated.',
    facts: [
      ['Form', 'a curved chute, back wall to pit base (off a scale model)'],
      ['From', '16 m under the deck (estimated)'],
      ['To', 'the pit base at the platform’s east edge, 43 m down'],
      ['Arc', '44.9 m radius (derived from those two)'],
    ],
  },
  // The rest as the site's hardware, the same on any morning: what each is, how it moved, what its sizes rest on. A flight
  // adds what its own record says of its day (`Site1Day.adds`), or says all of it (`words`: Vostok 1's, from its own morning).
  DeckRails: {
    summary: 'The railway runs on to the platform and stops at the edge of the hole.',
    detail:
      'Everything came to this pad by rail, so the rails are laid in the concrete of the deck itself, their heads flush with ' +
      'it. The centre track runs to the edge of the opening: the erector brought the rocket along it and stood on it until it ' +
      'was drawn off. A track on the platform’s north part and one on its south flank the launch system, for the propellant ' +
      'trains; a short spur between ends just on the abutment. Either side of the centre track lies one more rail, 7 m apart: ' +
      'the CIA’s interpreters called them gantry tracks, and nothing read says what rode them. Where each track lies is scaled ' +
      'off the CIA’s plan of March 1961; today’s map agrees to about a metre. The gauge was 1,524 mm, as every Soviet railway’s ' +
      'was until 1970.',
    facts: [
      ['Gauge', '1,524 mm (5 ft)'],
      ['Centre track', 'to the opening’s edge, on the rocket’s axis'],
      ['North and south tracks', '13.6 m and 12.4 m from it (scaled off the CIA’s plan)'],
      ['Gantry rails', 'two, 23 ft (7.0 m) apart (scaled; the figure is redacted)'],
      ['Heads', 'flush in the deck (a photograph of 12 April 1961; 9 mm proud in the model)'],
    ],
  },
  Masts: {
    summary: 'A mast 110 ft tall that the CIA measured and could not explain.',
    detail:
      'It stands at the platform’s north-east corner, on a lip built out over the pit to carry it. The CIA’s interpreters ' +
      'measured two in 1957, this one and another at the south-west corner, each 110 ft with an array at the top at least 5 ft ' +
      'wide and 10 ft high, and by March 1961 wrote that their function could not be determined. The photographs of 12 April ' +
      '1961 show only this one, so the south-west mast had been taken down since July 1959. What they show of it is a slender ' +
      'cross-braced lattice and a railed head with lamps at its corners. The height, the array’s size and where it stands are ' +
      'the CIA’s; the lattice’s section, the lamps’ number and aim, the rod and the ladder are estimated.',
    facts: [
      ['Height', '110 ft (33.5 m)'],
      ['Where', 'the north-east corner, 29.4 m from the axis (scaled off the CIA’s plan)'],
      ['Its twin', 'at the south-west corner in 1957 and July 1959; gone by 12 April 1961'],
      ['What for', 'not established; drawn as floodlights (estimated)'],
    ],
  },
  DeckFittings: {
    summary: 'A wire railing at the edge, two cabinets, a loudspeaker.',
    detail:
      'Nothing published describes the deck’s furniture, so this is one photograph’s worth, taken from beyond the south fence on ' +
      'the morning of 12 April 1961: a low railing of posts and wires along the platform’s edge, and near the south-west corner ' +
      'two dark cabinets some 2.2 m high, one with a horn on its side, taken for a loudspeaker. When they came is not known; ' +
      'nothing read says they went. The slabs’ size, 6 m by 3 m, is estimated.',
    facts: [
      ['Railing', 'about 1.1 m high, at the edge (a photograph of 12 April 1961)'],
      ['Cabinets', '2.7 m and 1.1 m broad, 2.2 m high'],
      ['Slabs', 'rectangular, the rails flush (film); 6 m by 3 m here (estimated)'],
    ],
  },
  LaunchRing: {
    summary: 'Four arms that hold the rocket by its waist, and let it go.',
    detail:
      'Barmin’s launch system, the "tulip": a ring that turns in the platform’s opening to aim the rocket, and on it four trusses ' +
      'that lean in to the core just under the strap-ons’ tips, where their thrust goes into it. The rocket is not bolted down. ' +
      'It hangs on the four heads by its own weight, its tail 6.75 m down in the pit, steadied lower down by four guides; as its ' +
      'thrust overcomes its weight the heads are unloaded and each truss falls back under its counterweights, and the tulip ' +
      'opens. That it works so is the record. How far the trusses fall is read off a photograph of Vostok 1’s launch (45° from ' +
      'where they held the rocket); how long they took is read off film of a Soyuz leaving this pad in 2019, on the same system ' +
      'since modified. The ring and its heights are from a Soviet description of the later system; the trusses’ members, ' +
      'platforms and counterweights are drawn from film and are estimated.',
    facts: [
      ['Ring', '14.92 m inside, 19.35 m over its corners'],
      ['Turning part', '20.35 m above the deck, 6.75 m below'],
      ['Supports', '4, at the strap-ons’ tips, 13 m above the deck'],
      ['Turned to', '37.5° east of north (derived)'],
      ['Fall back', '45° (off a photograph), from 0.7 s after liftoff to 2.6 s (off film of a later launch)'],
    ],
  },
  TankCars: {
    summary: 'The rocket was fuelled from railway cars, which were drawn away before it left.',
    detail:
      'Everything the rocket burned came to it by rail and was pumped aboard from cars standing either side of it: the liquid ' +
      'oxygen filler, 8G117, "about 25 m over its couplers", and the kerosene filler, 8G119, "an eight-axle car 24 metres long" ' +
      'with two tanks of 50 cubic metres. A rail tractor took them off before the launch. One of each is built, the oxygen on ' +
      'the north track and the kerosene on the south, as a colour photograph of 12 April 1961 has one of them; their height and ' +
      'every fitting but that photograph’s are estimated.',
    facts: [
      ['Oxygen filler', '8G117: about 25 m over its couplers, 8 axles'],
      ['Kerosene filler', '8G119: 24 m, 8 axles, two tanks of 50 m³'],
      ['Breadth', '3.09 m (today’s 8G0119)'],
    ],
  },
  Erector: {
    summary: 'The wagon that stood the rocket up, and then was the way to the spacecraft.',
    detail:
      'A hydraulic rail erector of 87.5 t: the rocket came out along the centre track lying on its boom, tail first, and was ' +
      'stood up into the launch system. A three-stage rocket stood taller than the launch system’s own service trusses reached, ' +
      'so the boom stayed up beside it and carried the platforms round the third stage and the spacecraft, and the lift: fifteen ' +
      'steps of stair on its south side to the lift’s door, and the lift to the upper platform at the hatch. Before the launch ' +
      'its boom came away from the rocket, and it rode away along the rails and laid itself down on its wagon. No drawing was ' +
      'found: its shape is drawn from photographs and film, with a boom that leans in over the launch system’s support, which ' +
      'is our way of standing it there.',
    facts: [
      ['Kind', 'hydraulic, on rails (8U213, TsKBTM)'],
      ['Mass', '87.5 t'],
      ['To the lift', '15 steps, on the south side (film; a photograph)'],
      ['Upper platform', '26.1 m over the deck (estimated)'],
      ['Lift', '"two or three minutes" to the top'],
    ],
  },
  ServiceTrusses: {
    summary: 'Two arms that close round the rocket with rings of platforms, and are laid down before it goes.',
    detail:
      'The launch system’s own way to the rocket: two trusses hinged on the turning ring, one to the north and one to the south. ' +
      'Raised, their half rings meet round the core above the strap-ons’ tips; from them the rocket was fuelled and checked. ' +
      'Lowered, each lies level out over the edge of the platform with its half rings standing up. Their size is published ' +
      '(21.6 m long, 7.9 m across, 20 m high, 56 t each); their members and the heights of their platforms are estimated. These ' +
      'were the first pair, built for the R-7 in 1957.',
    facts: [
      ['Type', '8T119, TsKBTM, 1957'],
      ['Each', '21.6 m long, 7.9 m across, 56 t'],
      ['Standing', '20 m from hinge to head'],
    ],
  },
  UpperCableMast: {
    summary: 'The last thing to let go: the third stage’s cables, away a minute before ignition.',
    detail:
      'Power and commands for the third stage came up this mast from the ring and across its arm to plugs under the fairing’s ' +
      'foot; it swung clear a minute before ignition. The CIA’s interpreters found it on a U-2 photograph, 85 to 95 ft above the ' +
      'platform; the middle of that is modelled. How far it swung is read off two photographs of 12 April 1961. Which side of ' +
      'the ring it stood on is not recorded: it is put on the east, opposite the erector.',
    facts: [
      ['Height', '85 to 95 ft over the deck (90 ft, 27.4 m, modelled)'],
      ['Swings', '40° from where it stood (estimated)'],
    ],
  },
};

/** The views of the pad's hardware, the same for every flight from it; a flight adds its own morning's (its people, its bus). */
export const SITE1_VIEWS: ModelDef['views'] = [
  { id: 'tulip', label: 'Launch system', nodes: ['LaunchRing'] },
  { id: 'support', label: 'Support truss', nodes: ['Support_1'] },
  // (the erector and the hatch level from the south-west: its stair and lift are on its south side)
  { id: 'erector', label: 'Erector', nodes: ['Erector'], from: [-0.45, 0.12, 0.88] },
  { id: 'cars', label: 'Railway fillers', nodes: ['TankCars'], from: [-0.3, 0.25, -0.92] },
  { id: 'hatch', label: 'Hatch level', centreY: 26.6, span: 10, from: [-0.6, 0.18, 0.78] },
  { id: 'trusses', label: 'Service trusses', nodes: ['ServiceTrusses'], from: [0.75, 0.2, 0.63] },
  { id: 'masts', label: 'Corner mast', nodes: ['Masts'], from: [0.35, 0.12, 0.93] },
  { id: 'deflector', label: 'Flame deflector', nodes: ['FlameDeflector'], from: [0.97, -0.1, 0.2] },
  { id: 'pit', label: 'Flame pit', nodes: ['FlamePit'], from: [-0.5, 0.55, 0.67] },
];

/** A flight's pad model at Site 1: its file, its slider's two ends, its morning (`sequence`), its parts and its own views. */
export const site1Pad = (m: {
  url: string;
  slider: [string, string];
  sequence: Keyframe[];
  parts: Part[];
  views?: ModelDef['views'];
}): ModelDef => ({
  id: 'pad',
  name: 'Launch pad',
  url: m.url,
  scale: 'Site 1 · platform 41.15 m square over a pit 43 m deep · to scale',
  backdrop: 'tyuratam',
  slider: m.slider,
  sequence: m.sequence,
  specGroups: ['Launch pad'],
  parts: m.parts,
  // (the whole of it is the pit too, 270 m long: the launch system is what is come to see)
  home: 'tulip',
  views: [...SITE1_VIEWS, ...(m.views ?? [])],
});

/** The pad's figures, the same for every flight from it (the specs' 'Launch pad' group). */
export const SITE1_SPECS: Flight['specs'] = [
  {
    group: 'Launch pad',
    label: 'Platform',
    value: 41.15,
    unit: 'm',
    confidence: 'documented',
    note: '135 ft square, measured off U-2 photographs (CIA PIC/JR-2/60); "40 by 40 m" (RussianSpaceWeb). No drawing has been published: sites/site-1.md',
  },
  {
    group: 'Launch pad',
    label: 'Opening in the platform',
    value: 19.81,
    unit: 'm',
    confidence: 'documented',
    note: 'a dark circle 65 ft across (CIA PIC/JR-2/60); the launch system’s ring is 19.35 m over its corners (a Soviet description of the later system)',
  },
  {
    group: 'Launch pad',
    label: 'Flame pit depth',
    value: 43,
    unit: 'm',
    confidence: 'derived',
    note: 'under the deck: 80 ft and 60 ft, two CIA figures (PIC/JR-2/60), summed. Russian print gives 45 m and "almost 50"; the CIA’s own figure is redacted',
  },
  {
    group: 'Launch pad',
    label: 'Steppe north of the tracks, below the deck',
    value: 8,
    unit: 'm',
    confidence: 'derived',
    note: 'the pad stands on the brow of a scarp: SRTM (2000, a 30 m grid) reads 113 to 114 m along the tracks and 104 to 107 m from 65 m north of them, where the command bunker stands; the CIA has the track on "a man-made embankment", its height redacted. Good to some 2 m: sites/site-1.md, "The lie of the land"',
  },
  {
    group: 'Launch pad',
    label: 'Nozzles below the deck',
    value: 6.75,
    unit: 'm',
    confidence: 'derived',
    note: 'level with the foot of the launch system’s turning part, 6,750 mm below the zero mark (the later system’s description); "about 7 m below" in print',
  },
];
