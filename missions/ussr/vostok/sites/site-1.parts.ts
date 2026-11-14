import type { Move, Part, Runs } from '../../../../src/types';

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
};
