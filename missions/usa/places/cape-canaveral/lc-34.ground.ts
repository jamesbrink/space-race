import type { PadGround } from './ground.ts';
import { LC34 } from './lc-34.ts';

/** The same surviving access roads traced by grounds.py. The Blender roads supply the actual surface. */
const ROADS: [number, number][][] = [
  [
    [428, 32],
    [487, 184],
    [484, 252],
    [433, 325],
    [357, 450],
    [270, 590],
    [159, 802],
    [147, 855],
    [171, 900],
    [274, 967],
    [342, 1012],
    [403, 1011],
    [684, 879],
    [824, 815],
    [943, 755],
  ],
  [
    [480, 243],
    [519, 299],
    [547, 337],
    [551, 407],
  ],
  [
    [438, 315],
    [482, 303],
    [522, 310],
    [649, 376],
    [766, 445],
    [858, 507],
    [891, 536],
  ],
  [
    [277, 598],
    [334, 634],
    [367, 674],
  ],
  [
    [348, 700],
    [458, 576],
    [471, 554],
  ],
  [
    [693, 875],
    [701, 830],
    [681, 773],
    [638, 659],
    [606, 577],
    [600, 568],
  ],
];
const turn = (LC34.bearingX.value * Math.PI) / 180;
const north = Math.cos(turn);
const east = Math.sin(turn);
function frame([x, y]: [number, number]): [number, number] {
  // Same north-up Esri imagery crop, origin, and 2.3 ft/pixel scale as lc34/site.py.
  const e = (x - 526) * 2.3;
  const n = (502 - y) * 2.3;
  return [e * east + n * north, -e * north + n * east];
}

const shoulders = ROADS.flatMap((road, ix) => {
  const points = road.map(frame);
  return points.slice(1).map((to, i): PadGround['strips'][number] => [...points[i]!, ...to, ix === 0 ? 11 : 9]);
});

/** Ground around the LC-34 model, in feet, in its own frame from the launch axis. */
export const LC34_GROUND: PadGround = {
  clear: 100,
  kept: [
    [0, 0, 215],
    [...frame([339, 905]), 80],
    [...frame([648, 304]), 65],
    [...frame([605, 632]), 54],
    [...frame([656, 804]), 65],
    [...frame([223, 1018]), 105],
  ],
  strips: [[-680, 0, 0, 0, 79], ...shoulders],
  ways: [],
  sunk: [],
};
