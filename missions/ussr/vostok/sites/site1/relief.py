"""The lie of the land round Site 1: how high the ground is, metres from the level the tracks and the platform's
deck are at. Pure arithmetic (no Blender), written three times and kept in step: here, for whatever is built on the
land; in src/viewer/tyuratamrelief.ts for the walker and the plants (JavaScript) and for the land's mesh (GLSL).
tests/tyuratam.test.mjs holds the JavaScript to the figures this file prints (`python3 relief.py`).

The pad stands on the brow of a scarp. South of the tracks the ground is at the tracks' level; north of them it
falls some 8 m to the steppe the bunker and the buildings stand on, and east of the pit it lies some 5 m down.

What that rests on (../site-1.md, "The land"):
  documented  that the track "approaches the launching structure on a man-made embankment" (CIA HTA/JR-4/58; its
              height redacted), with a "north side of the rail embankment near the Probable Liquid Propellant Handling
              Shed" and a "road embankment" north of that (PIC/JR-2/60); the embankment's hachures on Figure 5.
  derived     how far down each part lies: SRTM 1 arc-second (2000), read on its own grid round the pad: 113 to 114 m
              along the tracks, 104 to 107 m from 65 m north of them to 400 m north, 100 to 103 m north-west,
              107 to 109 m east of the pit. A 30 m grid, good to several metres, of the ground as it was in 2000.
  estimated   the brow's line (it is drawn 5 to 7 m outside the northernmost track's bed, and round the shed), the
              breadth of the fall, its section (a smooth S), the road's ramp, the plot the pump house stands on, and
              that the ground comes back to the tracks' level 2.5 km out, which is only so that the land meets the
              globe: nothing was read out there.
Not here: the rise of some 3 m in 100 that SRTM has south of the fence, the ditches, the drainage basin.

Metres; +X east, +Y north, the origin the rocket's axis.
"""

from __future__ import annotations

import math

# The brow: the line north and east of which the ground falls. West to east; the low side is on the left.
BROW = [
    (-3000.0, 17.0),
    (-1400.0, 17.0),
    (-335.0, 8.0),
    (-125.0, 31.0),
    (-75.0, 41.0),
    (40.0, 41.0),
    (166.0, -33.0),
    (200.0, -110.0),
    (330.0, -230.0),
    (3000.0, -400.0),
]
DEPTH = 8.0  # how far down the steppe north of the tracks lies, m
DEPTH_WEST = 4.0  # and how much further down it is north-west, past 450 m west
DEPTH_EAST = -2.5  # and less far down east of the pit, past 300 m east
BREADTH = 40.0  # how far from the brow the fall is spent, m: 1 in 3.3 at its steepest
BREADTH_WEST = 80.0  # more to the west, where SRTM has it gentler
BREADTH_EAST = 60.0  # and to the south-east, where the road round the pit comes up it
# The road from the storage bunker comes up the fall on a ramp of its own (the CIA's "road embankment"): its
# middle line, from the brow to where it is down; 1 in 14
RAMP = ((-83.4, 39.5), (-82.5, 149.5))
RAMP_HALF = (5.0, 18.0)  # level across this far from its middle line, m, then down to the fall by this far
# The pump house's plot: its middle, its half breadth and half depth, m (buildings.py: PUMP)
PLOT = ((-40.7, 61.5), (6.2, 7.0))
PLOT_EDGE = (1.5, 14.0)  # level this far outside the plot, m, and back on the fall by this far
FAR = (900.0, 2500.0)  # from here to here from the pad the ground comes back to the tracks' level, m


def smooth(a: float, b: float, x: float) -> float:
    t = min(1.0, max(0.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def past_brow(x: float, y: float) -> float:
    """How far a point is past the brow, m: over the low ground positive, on the high ground negative."""
    best, sign = 1e12, 1.0
    for (ax, ay), (bx, by) in zip(BROW, BROW[1:]):
        dx, dy = bx - ax, by - ay
        t = min(1.0, max(0.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
        ex, ey = x - ax - t * dx, y - ay - t * dy
        d = ex * ex + ey * ey
        if d < best:
            best = d
            sign = 1.0 if dx * (y - ay) - dy * (x - ax) > 0.0 else -1.0
    return sign * math.sqrt(best)


def scarp(x: float, y: float) -> float:
    """The fall alone."""
    west = 1.0 - smooth(-450.0, -150.0, x)
    depth = DEPTH + DEPTH_WEST * west + DEPTH_EAST * smooth(120.0, 300.0, x)
    breadth = BREADTH + BREADTH_WEST * west + BREADTH_EAST * smooth(60.0, 200.0, x)
    return -depth * smooth(0.0, breadth, past_brow(x, y))


PLOT_LEVEL = scarp(*PLOT[0])


def ground(x: float, y: float) -> float:
    """The ground's height at a point, m from the level of the tracks and the deck (the land's own base level)."""
    g = scarp(x, y)
    # the road's ramp
    (ax, ay), (bx, by) = RAMP
    dx, dy = bx - ax, by - ay
    t = min(1.0, max(0.0, ((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy)))
    off = math.hypot(x - ax - t * dx, y - ay - t * dy)
    g += (max(g, -DEPTH * t) - g) * (1.0 - smooth(RAMP_HALF[0], RAMP_HALF[1], off))
    # the pump house's plot
    (cx, cy), (hx, hy) = PLOT
    out = math.hypot(max(abs(x - cx) - hx, 0.0), max(abs(y - cy) - hy, 0.0))
    g = PLOT_LEVEL + (g - PLOT_LEVEL) * smooth(PLOT_EDGE[0], PLOT_EDGE[1], out)
    return g * (1.0 - smooth(FAR[0], FAR[1], math.hypot(x, y)))


def samples() -> list[tuple[float, float]]:
    """Where the test holds the JavaScript to this: on a grid over the site, and at what stands on it."""
    pts = [(x, y) for x in range(-1600, 1601, 200) for y in range(-600, 601, 100)]
    pts += [(x, y) for x in range(-130, 261, 26) for y in range(-140, 161, 20)]
    pts += [(-40.7, 61.5), (-83.0, 80.0), (-83.0, 120.0), (-70.0, 80.0), (3.6, 206.6), (-47.0, 207.4), (8.0, 92.0), (239.0, 1.5), (-484.0, 60.0)]
    return pts


if __name__ == "__main__":
    import json

    print(json.dumps([[x, y, round(ground(x, y), 9)] for x, y in samples()]))
