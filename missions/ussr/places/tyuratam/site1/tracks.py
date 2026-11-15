"""The tracks that come onto Site 1's platform: where their middle lines run, and the same lines with the bends
nearest the platform curved. Pure arithmetic (no Blender), written twice and kept in step: here, for the rails the
place's model lays (deck.py `land_rails`) and whatever has to keep off a track (place.py); and in
missions/ussr/places/tyuratam/tracks.ts, for the rails the land paints (ground.ts) and the ways the wagons are drawn
off by (site-1.parts.ts). tests/tyuratam.test.mjs holds the TypeScript to the figures this file prints
(`python3 tracks.py`).

The lines are today's map's (OpenStreetMap), brought near the platform to where the CIA's plan of March 1961 has them
(../site-1.md, "The site's frame", "The platform"). A map's line is corners; a track is not. Where the rails are
modelled, each bend (0.5 to 1.4 degrees: at 60 m west on the three spurs, at 160 m on the centre track) is an arc of
RADIUS, tangent to the line either side of it, cut into chords of CHORD at the most. The radius is ours (estimated: a
yard's curve; the bends are so slight that an arc of 200 m leaves the corner by 14 mm at the most, and what radius the
real track had cannot be read off anything). Further west the lines are paint on the land and keep the map's corners.

Metres; +X east, +Y north, the origin the rocket's axis.
"""

from __future__ import annotations

import math

# The centre track is on the rocket's axis from 160 m out (the erector carried the rocket along it to the axis); the three
# beside it are brought, over their last 60 m, to where the CIA's plan of March 1961 has them on the platform (deck.py).
CENTRE_TRACK = [(-1400.7, 10.6), (-160.0, 0.0), (-25.8, 0.0)]
SPURS = [
    [(15.0, 13.564), (-60.0, 13.564), (-212.6, 15.2)],
    [(-204.5, -5.9), (-60.0, -8.321), (-26.8, -8.321)],
    [(10.9, -12.375), (-60.0, -12.375), (-155.4, -10.1), (-286.2, 1.1)],
    [(-330.6, 1.5), (-121.8, 25.7), (-39.8, 28.9)],
]
RADIUS = 200.0  # a bend's radius, m (estimated)
CHORD = 1.0  # an arc is cut into chords no longer than this, m: each within 0.6 mm of the arc
# How far west each track's rails are modelled, m east of the axis (deck.py: LAND less RAMP): a bend east of this is curved
MODELLED = {"centre": -170.0, "spur": -110.0}


def curved(line, west: float) -> list[tuple[float, float]]:
    """A track's line with each of its bends east of `west` made an arc of RADIUS: the corner is left out, and in its
    place are the two points where the arc leaves the line's legs and the points between them, CHORD apart at the most."""
    out = [line[0]]
    for a, b, c in zip(line, line[1:], line[2:]):
        ux, uy = b[0] - a[0], b[1] - a[1]
        vx, vy = c[0] - b[0], c[1] - b[1]
        ul, vl = math.hypot(ux, uy), math.hypot(vx, vy)
        ux, uy, vx, vy = ux / ul, uy / ul, vx / vl, vy / vl
        turn = math.atan2(ux * vy - uy * vx, ux * vx + uy * vy)  # anticlockwise from above is positive
        if b[0] <= west or abs(turn) < 1e-9:
            out.append(b)
            continue
        back = RADIUS * math.tan(abs(turn) / 2)  # from the corner back along each leg to where the arc begins
        if back > 0.5 * min(ul, vl):
            raise ValueError(f"the bend at {b} has no room for an arc of {RADIUS} m")
        side = 1.0 if turn > 0 else -1.0
        px, py = b[0] - ux * back, b[1] - uy * back
        ox, oy = px - side * RADIUS * uy, py + side * RADIUS * ux  # the arc's centre: square to the first leg, on the bend's inside
        n = max(1, math.ceil(RADIUS * abs(turn) / CHORD))
        for k in range(n + 1):
            cos, sin = math.cos(turn * k / n), math.sin(turn * k / n)
            dx, dy = px - ox, py - oy
            out.append((ox + dx * cos - dy * sin, oy + dx * sin + dy * cos))
    out.append(line[-1])
    return out


CENTRE_CURVED = curved(CENTRE_TRACK, MODELLED["centre"])
SPURS_CURVED = [curved(line, MODELLED["spur"]) for line in SPURS]

if __name__ == "__main__":
    import json

    print(json.dumps({"centre": CENTRE_CURVED, "spurs": SPURS_CURVED}))
