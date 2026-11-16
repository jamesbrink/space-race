import type { PadGround } from './ground.ts';

/**
 * Launch Complex 19's own ground, for when it is the pad a flight left from: the clearing round the stand, where
 * nothing grows, and its roads, in the pad's own frame in feet as its Blender scripts have it (x along the stand toward
 * the ramp, y east: lc19/site.py). The Cape's ground (ground.ts) lays it round the origin; from another pad the complex
 * keeps what its entry in scenery.ts says.
 *
 * Every line and place here is lc19/grounds.py's and lc19/site.py's, measured off imagery of what is left of the
 * complex (lc-19.md, "The layout"): change them together. The clearing's reach is the complex's own: "400 x 300 yards
 * at its widest points" (Martin's press handbook, p. 7-2), which the loop road and the fence run round.
 */

/** The perimeter road's middle line, clockwise from the north: lc19/grounds.py `LOOP`. */
const LOOP: [number, number][] = [
  [-436, 16],
  [-372, 253],
  [-345, 415],
  [-220, 464],
  [-16, 416],
  [128, 382],
  [292, 290],
  [425, 131],
  [511, 20],
  [579, -90],
  [500, -230],
  [320, -480],
  [160, -660],
  [73, -737],
  [-20, -800],
  [-133, -719],
  [-250, -470],
  [-360, -200],
];

/** A road as one straight piece: from, to, half its width, its kind (1: a shell road). */
type Way = [x0: number, y0: number, x1: number, y1: number, half: number, kind: number];
const along = (line: [number, number][], half: number): Way[] =>
  line.slice(1).map(([x, y], i): Way => [line[i]![0], line[i]![1], x, y, half, 1]);

export const LC19_GROUND: PadGround = {
  /** The radius round the vehicle kept as mown clearing and levelled, metres: out past the loop road and the blockhouse. */
  clear: 270,
  /** Discs where nothing grows: [x, y, radius], feet. The blockhouse's mound, the two holding areas, the decontamination building, the basin. */
  kept: [
    [-33, -723, 110],
    [-270, 378, 62],
    [242, 212, 62],
    [201, -501, 52],
    [-692, 5, 115],
    [45, -72, 48],
    [45, 108, 48],
  ] as [number, number, number][],
  /** Strips where nothing grows: [x0, y0, x1, y1, half], feet. The stand and its ramp, the flume's apron and channel, the cableway, the building under the stand's east wall. */
  strips: [
    [-46, 12, 258, 12, 46],
    [258, 12, 490, 12, 52],
    [-46, 12, -245, 12, 56],
    [-245, 12, -600, 12, 16],
    [-27, -647, 50, -21, 9],
    [105, 61, 220, 61, 20],
  ] as [number, number, number, number, number][],
  /** The roads, painted and heard: the loop, the road from the ramp's foot, the roads to the holding areas, the one north-west from the stand's foot, the one north along the flume. */
  ways: [
    ...along([...LOOP, LOOP[0]!], 9),
    ...along(
      [
        [476, 12],
        [505, 14],
      ],
      14,
    ),
    ...along(
      [
        [149, 129],
        [260, 134],
        [366, 141],
        [418, 136],
      ],
      7.5,
    ),
    ...along(
      [
        [60, 78.5],
        [20, 150],
        [13, 404],
      ],
      7.5,
    ),
    ...along(
      [
        [60, 78.5],
        [149, 129],
      ],
      7.5,
    ),
    ...along(
      [
        [20, -50.5],
        [-42, -70],
        [-289, -334],
      ],
      7.5,
    ),
    ...along(
      [
        [-436, 16],
        [-560, -22],
      ],
      6,
    ),
  ] as Way[],
  /** Where the land is let down, for the model's own concrete to line: none yet. The flume and the basin are built standing on the land (lc-19.md, "What the model gets wrong or leaves out"). */
  sunk: [] as [number, number, number, number, number][],
};
