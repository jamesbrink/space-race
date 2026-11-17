/**
 * A Mercury capsule in the sea, as sim/afloat.ts floats it: its outside from the heat shield, hung four feet under it on
 * the landing bag, to the top of the recovery compartment (the antenna canister having gone with the main parachute), and
 * the four spaces in it the sea can fill: the bag, the gap between the shingles and the pressure vessel, the cabin, and
 * the recovery compartment. Every dimension is the drawing's, in inches as mercury_capsule.py has them, multiplied by IN
 * once here; what the spaces hold, how much of the bag is open and how the hatch's water goes are estimated, and say so.
 * A capsule's own figures (its weight afloat, its pilot, its hatch's opening) are its flight's.
 */
import { derived, doc, estimated, type Measure } from '../../../../src/measure.ts';
import type { AfloatDef, OpeningDef, Profile, SpaceDef } from '../../../../src/types.ts';
import { IN } from './mercury-capsule.ts';

/** From mercury_capsule.py, inches: the shield's radius, its sphere's, its edge; the cone's half-angle; the neck; the cone's top and the recovery compartment's. */
const SHIELD_R = 37.25;
const SHIELD_SPHERE_R = 80;
const SHIELD_EDGE = 2.5;
const HALF = (20 * Math.PI) / 180;
const NECK_R = 16;
const CONE_H = (SHIELD_R - NECK_R) / Math.tan(HALF);
const Z_CAN = 81.14;
/** The outer shingles to the pressure vessel, in (mercury_capsule.py `WALL`), and the shield's beryllium, in. */
const WALL = 1.2;
const SHELL = 1;
/** How far the shield drops on the landing bag, in: "the heatshield and porous bag were to drop down about four feet" (This New Ocean, p. 311; "its four-foot impact skirt", p. 356). */
export const BAG_DROP = 48;
const SHIELD_CAP = SHIELD_SPHERE_R - Math.sqrt(SHIELD_SPHERE_R ** 2 - SHIELD_R ** 2);
/** The hull's lowest point (the shield's, dropped on the bag), in, under the plane of the greatest diameter (station 0): heights here are from it. */
export const LOWEST = BAG_DROP + SHIELD_EDGE + SHIELD_CAP;
/** A height over the hull's lowest point, m, from a station, in. */
const up = (station: number) => (station + LOWEST) * IN;
const cone = (station: number) => SHIELD_R - station * Math.tan(HALF);

const SOURCE =
  'mercury_capsule.py (the shield, 74.5 in across on a sphere of 80 in radius with a 2.5 in edge; the 20 degree cone to the 32 in recovery compartment; ' +
  'its top at station 81.14, CR-649 Figure 1) with the shield dropped 4 ft on the landing bag (This New Ocean, p. 311; "its four-foot impact skirt", p. 356) and the bag drawn as a cylinder ' +
  'of the shield’s width: derived from documented dimensions, but for the bag’s shape, which is ours';

/** The outside: the shield's dish, its edge, the bag, the cone and the recovery compartment, m from the lowest point. */
function hull(): Profile {
  const dish = [0, 0.4, 1, 2.5, 5, 7.5, SHIELD_CAP].map((d): [number, number] => [
    d * IN,
    Math.sqrt(Math.max(0, SHIELD_SPHERE_R ** 2 - (SHIELD_SPHERE_R - d) ** 2)) * IN,
  ]);
  return [
    ...dish,
    [(SHIELD_CAP + SHIELD_EDGE) * IN, SHIELD_R * IN],
    [up(0), SHIELD_R * IN],
    [up(CONE_H), NECK_R * IN],
    [up(Z_CAN), NECK_R * IN],
  ];
}

/** The bag: inside the beryllium (taken an inch in, every way) up to the cone's foot. */
function bag(): Profile {
  const dish = [SHELL, 2.5, 5, 7.5, SHIELD_CAP].map((d): [number, number] => [
    d * IN,
    Math.max(0, Math.sqrt(Math.max(0, SHIELD_SPHERE_R ** 2 - (SHIELD_SPHERE_R - d) ** 2)) - SHELL) * IN,
  ]);
  return [
    ...dish,
    [(SHIELD_CAP + SHIELD_EDGE) * IN, (SHIELD_R - SHELL) * IN],
    [(SHIELD_CAP + SHIELD_EDGE + 0.1) * IN, (SHIELD_R - 0.1) * IN],
    [up(0), (SHIELD_R - 0.1) * IN],
  ];
}

/** The gap between the shingles and the vessel over the cone, as the solid of revolution with the same section: root(R^2 - r^2). */
function skins(): Profile {
  const t = WALL / Math.cos(HALF);
  return [0, 0.25, 0.5, 0.75, 1].map((k): [number, number] => {
    const r = cone(k * CONE_H);
    return [up(k * CONE_H), Math.sqrt(r * r - (r - t) ** 2) * IN];
  });
}

/** The pressure vessel: the cone inside the wall, from its foot to the small bulkhead at the cone's top (the large bulkhead's dish left out). */
function vessel(): Profile {
  const t = WALL / Math.cos(HALF);
  return [
    [up(0), (cone(0) - t) * IN],
    [up(CONE_H), (cone(CONE_H) - t) * IN],
  ];
}

export interface CapsuleAfloat {
  /** What it weighed afloat, lb. */
  flotation: Measure;
  /**
   * Its balance at that weight, its shield in place: the centre of mass's station, in (over the plane of greatest
   * diameter, station 0), and its distance off the long axis toward the hatch, in; its moment of inertia about a level
   * axis through that centre, slug ft^2.
   */
  balance: { station: Measure; out: Measure; inertia: Measure };
  /** What drops on the landing bag and hangs four feet under: the heat shield, lb. */
  shield: Measure;
  /** The pilot, lb, as he went out, and his centre of mass in the couch: its station, in, on the long axis. */
  pilot: Measure;
  seat: Measure;
  /** The hatch's opening: the stations of its sill and head, in, and the arc of the cone it spans, degrees. And the hatch's own weight, lb. */
  hatch: { from: number; to: number; arc: number; weight: Measure; source: string };
  /** The damping of its rolling, a share of critical. */
  rolling: Measure;
  /** The seconds before he is out that the pilot is on his way out over the sill, his weight going to the hatch's side. */
  egress: Measure;
  /** The ids its hatch's opening and the parts that leave it go by. */
  ids: { opening: string; pilot: string; hatch: string };
}

/** Pounds to kilograms; slug ft^2 to kg m^2. */
const LB = 0.45359237;
const SLUG_FT2 = 14.5939029 * 0.3048 ** 2;

/**
 * How a capsule heels afloat, from its balance with its shield in place: the shield let down `BAG_DROP` on the bag
 * (the two bodies, the shield's dish and the rest, drawn apart along the axis: the centre falls by the shield's share of
 * the drop, and the moment of inertia grows by m_s m_r / M of the difference of the squares of their distances apart),
 * then the pilot and the hatch taken out of it as masses at their places (`leaves`), leaving what stays aboard.
 */
function heelOf(c: CapsuleAfloat, hatchOut: number, hatchUp: number): NonNullable<AfloatDef['heel']> {
  const M = c.flotation.value * LB;
  const ms = c.shield.value * LB;
  const mr = M - ms;
  // (heights from the hull's lowest point, m: its centre with the shield in place, the dish's centre, mid-depth of its zone)
  const g0 = up(c.balance.station.value);
  const dish = (SHIELD_CAP / 2 + SHIELD_EDGE) * IN;
  const rest = (M * g0 - ms * (dish + BAG_DROP * IN)) / mr;
  const apart = rest - (dish + BAG_DROP * IN);
  const g1 = g0 - (ms / M) * BAG_DROP * IN;
  const i1 = c.balance.inertia.value * SLUG_FT2 + ((ms * mr) / M) * ((apart + BAG_DROP * IN) ** 2 - apart ** 2);
  const x1 = c.balance.out.value * IN;
  // (the pilot on the axis in his couch, the hatch at its middle: taken out as points)
  const parts = [
    { m: c.pilot.value * LB, x: 0, h: up(c.seat.value) },
    { m: c.hatch.weight.value * LB, x: hatchOut, h: hatchUp },
  ];
  const mc = M - parts.reduce((s, p) => s + p.m, 0);
  const xc = (M * x1 - parts.reduce((s, p) => s + p.m * p.x, 0)) / mc;
  const hc = (M * g1 - parts.reduce((s, p) => s + p.m * p.h, 0)) / mc;
  const ic = i1 - mc * ((xc - x1) ** 2 + (hc - g1) ** 2) - parts.reduce((s, p) => s + p.m * ((p.x - x1) ** 2 + (p.h - g1) ** 2), 0);
  const how =
    `from its balance with the shield in place (${c.balance.station.source}), the ${c.shield.value.toFixed(0)} lb shield let down ${BAG_DROP} in on the bag ` +
    `(its dish's centre at mid-depth), and the pilot (${c.pilot.value} lb at station ${c.seat.value} in, on the axis) and the hatch (${c.hatch.weight.value} lb at its middle) taken out as points`;
  return {
    centre: {
      up: estimated(
        hc,
        `${(hc / IN - LOWEST).toFixed(1)} in up the axis from station 0: ${how}. Estimated, as the shield’s weight and the pilot’s place are`,
      ),
      out: estimated(xc, `${(xc / IN).toFixed(2)} in toward the hatch: ${how}`),
    },
    gyration: estimated(Math.sqrt(ic / mc), `${(ic / SLUG_FT2).toFixed(0)} slug ft^2 about a level axis through it: ${how}`),
    damping: c.rolling,
  };
}

/** A capsule afloat, from its own figures. */
export function capsuleAfloat(c: CapsuleAfloat): AfloatDef {
  const lb = (m: Measure): Measure => ({ ...m, value: m.value * LB });
  const arc = (station: number) => ((c.hatch.arc * Math.PI) / 180) * cone(station) * IN;
  const hatch: OpeningDef = {
    id: c.ids.opening,
    label: 'the hatch’s opening',
    from: up(c.hatch.from),
    to: up(c.hatch.to),
    width: [arc(c.hatch.from), arc(c.hatch.to)],
    cd: estimated(0.6, 'a sharp-edged opening’s discharge coefficient, as any hydraulics text gives it: none is read for a capsule’s sill'),
    shut: true,
    arc: c.hatch.arc,
  };
  // (the hatch's middle: up the axis and out to the cone there)
  const middle = (c.hatch.from + c.hatch.to) / 2;
  const hatchAt = { out: cone(middle) * IN, up: up(middle) };
  const spaces: SpaceDef[] = [
    {
      id: 'landing-bag',
      label: 'the landing bag',
      shape: bag(),
      free: estimated(0.995, 'the bag and the shield’s back, less its harness of straps and cables, a half per cent: ours'),
      openings: [
        {
          id: 'bag-pores',
          label: 'the bag’s pores',
          from: (SHIELD_CAP + SHIELD_EDGE) * IN,
          to: up(0),
          // (1 per cent of the skirt open, spread up its height: a porous bag that breathed as it dropped, This New Ocean, p. 311; "its four-foot impact skirt", p. 356)
          width: [0.01 * 2 * Math.PI * SHIELD_R * IN, 0.01 * 2 * Math.PI * SHIELD_R * IN],
          cd: estimated(0.6, 'as the hatch’s'),
          arc: 360,
        },
      ],
      drains: true,
    },
    {
      id: 'skins',
      label: 'between the shingles and the vessel',
      shape: skins(),
      free: estimated(0.5, 'the 1.2 in gap, less its stringers and insulation: ours'),
      openings: [
        {
          id: 'shingle-joints',
          label: 'the shingles’ joints',
          from: up(0),
          to: up(CONE_H),
          width: [0.2 * IN, 0.2 * IN],
          cd: estimated(0.6, 'as the hatch’s; the joints’ width open to the sea is ours'),
          arc: 360,
        },
      ],
    },
    {
      id: 'cabin',
      label: 'the cabin',
      shape: vessel(),
      free: estimated(
        0.75,
        'the pressure vessel’s volume (2.0 m^3, derived from the drawing) less the couch, the panel and its consoles and the equipment round the pilot, ' +
          'and him until he is out: a quarter, ours. No document read gives the cabin’s free volume',
      ),
      openings: [hatch],
    },
    {
      id: 'recovery-compartment',
      label: 'the recovery compartment',
      shape: [
        [up(CONE_H), (NECK_R - 0.2) * IN],
        [up(Z_CAN), (NECK_R - 0.2) * IN],
      ],
      free: estimated(0.8, 'the parachutes gone, what is left of the canister’s mounting, the antenna and the recovery aids: ours'),
      openings: [
        {
          id: 'canister-mouth',
          label: 'its top, open since the antenna canister went with the main parachute',
          from: up(Z_CAN) - 0.5 * IN,
          to: up(Z_CAN),
          // (half its mouth open, π (15.8 in)^2 / 2, as a band half an inch deep)
          width: [(Math.PI * (NECK_R - 0.2) ** 2 * 0.5 * IN) / 0.5, (Math.PI * (NECK_R - 0.2) ** 2 * 0.5 * IN) / 0.5],
          cd: estimated(0.6, 'as the hatch’s; how much of the mouth is clear is ours'),
        },
      ],
    },
  ];
  return {
    hull: { profile: hull(), confidence: 'derived', source: SOURCE },
    datum: derived(
      LOWEST * IN,
      'the flown model’s origin is station 0, the plane of the greatest diameter: the shield’s depth, its edge and the bag’s 4 ft under it',
    ),
    mass: lb(c.flotation),
    leaves: [
      {
        id: c.ids.pilot,
        label: 'the pilot',
        mass: lb(c.pilot),
        at: { out: doc(0, 'on the axis'), up: estimated(up(c.seat.value), c.seat.source) },
        // (out through the hatch: he goes to its sill, where he pulls himself out, over the seconds before he is out)
        through: {
          out: derived(cone(c.hatch.from) * IN, 'the cone’s radius at the hatch’s sill'),
          up: derived(up(c.hatch.from) + 0.25, 'a quarter of a metre over the sill, his body going out over it: ours'),
          over: c.egress,
        },
      },
      {
        id: c.ids.hatch,
        label: 'the hatch',
        mass: lb(c.hatch.weight),
        at: { out: derived(hatchAt.out, 'the cone’s radius at the hatch’s middle'), up: derived(hatchAt.up, 'the hatch’s middle station') },
      },
    ],
    heel: heelOf(c, hatchAt.out, hatchAt.up),
    spaces,
    heave: estimated(0.2, 'a fifth of critical: the waves a body of its size makes as it rises and falls are not worked out'),
    drag: estimated(0.9 * Math.PI * (SHIELD_R * IN) ** 2, 'a blunt disc’s 0.9 on the shield’s 74.5 in, going down shield first: ours'),
    rights: doc(
      58,
      'Results of the Second U.S. Manned Suborbital Space Flight, p. 45: down at 15:37, "the capsule is floating, slowly coming vertical" at 16:35; Freedom 7 "heeled over to approximately 60° ... slowly righted ... a minute or less" (Postlaunch Report for MR-3, 5.6.2)',
    ),
  };
}
