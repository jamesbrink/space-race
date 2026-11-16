import type { PadGround } from './ground.ts';

/**
 * Launch Complex 14's own ground, round it as the origin (ground.ts `PadGround`): feet in the complex's frame, as its
 * scripts have it (lc14/site.py: x along 105 degrees true, y along 015), 14 ft south of OpenStreetMap's own count from
 * the middle of the stand's ruin. The roads are OpenStreetMap's lines of what survives (ways 10766824, 10766850 and
 * 1264975423: derived), their widths read off the aerials of May 1963 (estimated: some 20 ft); the car park is its
 * outline there (way 1264975410). The clearing is the mown ground inside the perimeter road in those aerials, taken
 * as a round of 190 m about the stand and one of 100 m about the blockhouse: estimated. What is sunk is the model's
 * own (lc14/grounds.py `SUNK`), the fan in three steps inside its copings.
 */
export const LC14_GROUND: PadGround = {
  clear: 190,
  cleared: [[-800, -90, 330]],
  kept: [
    [0, -25, 195], // the paving round the stand
    [-809.5, 3, 95], // the blockhouse's dome
    [-900, 2, 62], // the Equipment Shelter and the breezeway
    [-837, -210, 72], // the Ready Building
    [-860, -112, 12], // the Sentry House
    [-954, 38, 22], // the Subcable Hut
    [-300, -193, 88], // the liquid oxygen area and its wall's fill
    [124, -100, 46], // the fuel tank and its wall
    [88, -280, 14], // the POL building
  ],
  strips: [
    [30, -135, 30, -412, 85], // the paving along the ramp, the ramp's fill and the buildings by it
    [-50, 54, 560, 54, 30], // the transfer table's pit and its copings
    [0, 77, 0, 590, 17], // the flume
    [0, 590, 0, 786, 66], // the skimming basin
    [-701, -103, -442, -104, 6], // the cableway
    [-442, -104, -421, -81, 6],
    [-421, -81, -374, -82, 6],
    [-374, -82, -350, -103, 6],
    [-350, -103, -150, -103, 6],
  ],
  ways: [
    // the road in from ICBM Road, past the blockhouse to the paving, and on round the ramp's foot
    [-1383, -120, -997, -123, 11, 1],
    [-997, -123, -199, -125, 11, 1],
    [-199, -125, -139, -206, 11, 1],
    [-139, -206, -50, -401, 11, 1],
    [-50, -401, 3, -469, 11, 1],
    // east of the ramp, out to the service structure's parking area
    [28, -453, 32, -166, 10, 1],
    [32, -166, 151, 12, 10, 1],
    [151, 12, 394, 13, 10, 1],
    // the perimeter road: north of the blockhouse, round the flume's north side and the east, back to the ramp's foot
    [-997, -123, -997, 48, 10, 1],
    [-997, 48, -965, 86, 10, 1],
    [-965, 86, -749, 96, 10, 1],
    [-749, 96, -215, 344, 10, 1],
    [-215, 344, -66, 395, 10, 1],
    [-66, 395, 84, 391, 10, 1],
    [84, 391, 214, 340, 10, 1],
    [214, 340, 310, 252, 10, 1],
    [310, 252, 374, 143, 10, 1],
    [374, 143, 394, 13, 10, 1],
    [394, 13, 384, -115, 10, 1],
    [384, -115, 330, -232, 10, 1],
    [330, -232, 262, -305, 10, 1],
    [262, -305, 138, -381, 10, 1],
    [138, -381, 3, -469, 10, 1],
    // the car park by the Ready Building: paved, drawn as one broad way
    [-927, -396, -927, -146, 120, 1],
  ],
  sunk: [
    [-50, 30.6, 555, 77.4, 3], // the pit
    [-20, 77.4, 20, 85, 3], // the flume's fan
    [-16, 85, 16, 93, 4],
    [-12, 93, 12, 101, 5],
    [-7.5, 101, 7.5, 590, 5], // the ditch
    [-58, 590, 57, 783, 7], // the basin
  ],
};
