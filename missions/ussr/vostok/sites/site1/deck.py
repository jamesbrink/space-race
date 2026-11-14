"""What was fixed on the launching platform's deck: the rails in it, the tall masts at its north-east and south-west
corners, and the small building on its west side. And the same rails where they run on over the land (the place's:
`land_rails`). What a photograph of the day shows standing on the deck is deck_fittings.py.

Nodes in the pad: DeckRails; Masts, with Mast_NE (and Mast_SW, for a date on which it stood); StairHead under
Platform. In the place: Tracks.

The rails. PIC/JR-2/61 Figure 1 (March 1961, from the photographs of 1957 and 1959) draws them on the plan of the
platform: the centre track into the opening, a track along the platform's north part to near its east fence and one
along its south part, a short spur that ends just on the abutment, and either side of the centre track the two rails of
the "gantry tracks", from short of the abutment to the opening. Where each lies across the platform is scaled off that
figure (4.73 px a foot at 500 dpi: good to a foot or two), which today's map agrees with to about a metre once its own
centre track is put on the rocket's axis. A photograph of the morning (the pilot walking to the rocket) shows rails
lying flush in the concrete. What rode the gantry tracks is not said in anything read; nothing is put on them.

The masts. "Two towers ... one at the northeast and the other at the southwest corner ... 110 feet high and have a
large array on top at least 5 feet wide and 10 feet high. The tower at the northeast corner is supported on a concrete
lip" (HTA/JR-4/58); "positioned precisely equidistant from the center of the launching platform", on a line through
it; their function "cannot be determined" (PIC/JR-2/61, which doubted that they were either collimation towers or
floodlights). A photograph of the launch has one beside the rocket: a slender lattice with a head near its top and a rod
above. They are drawn so: the height, the array's size and the places are the CIA's; the lattice, the lamps, the rod
and the ladder are ours.

**The south-west mast was gone by 12 April 1961.** The two mirror each other through the rocket's axis, so from
wherever a camera stands the south-west one is as far to one side of the rocket as the north-east one is to the other.
Three photographs of the day taken from the south (one before liftoff, one of the liftoff in colour, and the cover of a
booklet of 1961 lettered "12 IV 61", which reads the right way round) have the north-east mast at the right and clear
sky where its twin would stand. The CIA saw both in August 1957 and July 1959, and its report of March 1961 repeats
those photographs. So the south-west one is dated: it stood until July 1959 at the least, and not in April 1961.

The north-east mast in those photographs is a slender cross-braced lattice with a railed head carrying lamps at its
corners, the lattice going on above it to a rod. A photograph of a later launch (which one is not known) shows raking
struts at its foot, splayed to some 4.5 m, and a ring of floodlights at two fifths of its height: the struts are built
as far as the concrete lip can hold them (the lip's breadth is scaled off a drawing), and the ring is not built, since
the photograph of the day does not show it.

The small building: "on the west side of the launching platform, about 60 feet northwest of the servicing tower ...
may serve as a covered entryway for a stairway leading below the surface" (PIC/JR-2/61). Its size is redacted and is
scaled off Figure 1; what is under it is not recorded, so its door is shut. See ../site-1.md.
"""

from __future__ import annotations

import math

import sitelib

from . import place
from .platform import ABUTMENT, HALF, LIP
from .site import FT, GAUGE, GROUND, OPENING_R, RAIL_TOP, Parts, beam, box, fine, handrail, lattice, stood

# ---- the tracks on the platform: each one's middle line north of the rocket's axis, and where its rails end, east of
# it (PIC/JR-2/61 Figure 1, scaled; the centre track's line is the axis itself). Feet, as the figure is.
NORTH = (44.5 * FT, 49.0 * FT)  # "extended 10 feet farther east" between the two coverages: to near the east fence
SOUTH = (-40.6 * FT, 35.8 * FT)
SHORT = (-27.3 * FT, -HALF - ABUTMENT + 4.6 * FT)  # "extends onto the platform for only a short distance": 4.6 ft of the abutment
CENTRE = (0.0, -OPENING_R - 0.045)  # to the opening's edge
GANTRY = 23.0 * FT  # between the gantry tracks' two rails (their separation is redacted: scaled off Figure 1)
GANTRY_WEST = -HALF - ABUTMENT - 11.0 * FT  # where they begin, short of the abutment (Figure 1)
EDGE = -HALF - ABUTMENT + 0.05  # just inside the abutment's west face: where the pad's rails end and the land's begin
# How far west the land's rails are modelled before the land's own painted rails take over, and over what length their
# heads come down to the land for it (ours): the centre track as far as the erector is drawn off, the others a hundred metres.
LAND = {"centre": -160.0, "spur": -100.0}
RAMP = 10.0
SLEEPER = 0.015  # where the land's paint takes over, a rail's head is this far above it

# ---- the masts
MAST_HEIGHT = 110.0 * FT  # to the top of the array (HTA/JR-4/58)
ARRAY = (5.0 * FT, 10.0 * FT)  # wide and high: "at least"
# The north-east mast, east and north of the axis: 4.9 ft out past the platform's east edge on the lip and 3.9 ft in
# from its north edge (scaled off Figure 1). The south-west one is its mirror through the axis, which puts it on the
# abutment (PIC/JR-2/61: "precisely equidistant", "a line drawn between the two masts passes through the center").
MAST_AT = (HALF + 4.9 * FT, HALF - 3.9 * FT)
MAST_BASE, MAST_HEAD = 0.6, 0.32  # half the lattice's breadth at its foot and under its head, m (estimated)
MAST_TOP = 0.2  # and at its top, above the head, m (estimated)
ROD = 4.0  # the rod above the array, m (estimated, off the photograph of the launch)
HEAD = 1.2  # half the railed head's breadth, m (measured off the photograph of the day: some 2.9 m over its lamps)
# The raking struts at the foot: from each leg, STRUT_Z up, out to a plate STRUT_OUT further from the mast's middle
# along each axis. A photograph of a later launch has them splayed to some 4.5 m; the lip the mast stands on is 8 ft
# broad (scaled off a drawing), and 0.85 m either side of the mast's middle is what it holds.
STRUT_Z, STRUT_OUT = 4.5, 0.25
# The south-west mast: last seen on the U-2's photographs of July 1959, absent from every photograph of 12 April 1961
SW_UNTIL = "1959-07"

# ---- the small building: its middle 60.4 ft west and 25.6 ft north of the axis, 16 by 8.5 ft, 8 ft high (scaled off
# Figure 1's plan and front view: its dimensions are redacted)
HEAD_AT = (-60.4 * FT, 25.6 * FT)
HEAD_SIZE = (16.0 * FT, 8.5 * FT, 8.0 * FT)


def _pair(mb, path, half: float) -> None:
    """Two rails either side of a middle line: `path` is (x, y, the heads' height) along it, east or west."""
    off = half + sitelib.RAIL_HEAD * sitelib.inch() / 2
    for s in (-1, 1):
        sitelib.rail(mb, [(x, y + s * off, top) for x, y, top in path])


def rails(parts: Parts) -> None:
    """The rails on the platform, from the abutment's west edge to where each track ended."""
    g = "DeckRails"
    parts.node(g)
    steel = parts(g, "rail")
    for y, x_end in (CENTRE, NORTH, SOUTH, SHORT):
        _pair(steel, [(EDGE, y, RAIL_TOP), (x_end, y, RAIL_TOP)], GAUGE / 2)
    for s in (-1, 1):  # the gantry tracks: one rail each, as far as the opening's edge at that distance from the axis
        y = s * GANTRY / 2
        sitelib.rail(steel, [(EDGE, y, RAIL_TOP), (-math.sqrt(OPENING_R**2 - y**2) - 0.13, y, RAIL_TOP)])


def slab_tracks() -> list[tuple[float, float]]:
    """The tracks whose running rails lie in the slab itself, for its flangeways (platform.build)."""
    return [CENTRE, NORTH, SOUTH]


def _at(line, x: float) -> float:
    """A track's middle line (points in order, east or west) at a distance east of the axis."""
    pts = sorted(line)
    for (ax, ay), (bx, by) in zip(pts, pts[1:]):
        if ax <= x <= bx:
            return ay + (by - ay) * (x - ax) / (bx - ax)
    raise ValueError(f"no track at {x}")


def land_rails(parts: Parts) -> None:
    """The same rails where they stand on the land west of the platform, on the sleepers the land paints: the place's.
    Their lines are the land's own (place.CENTRE_TRACK, place.SPURS: keep the three in step)."""
    g = "Tracks"
    parts.node(
        g,
        label="Tracks onto the platform",
        about=(
            "The centre track the erector brought the rocket along, and the spurs beside it that the propellant trains stood on, "
            "where they come up to the platform. Their lines are today's map's, brought to where the CIA's plan of March 1961 has "
            "them on the platform; the gauge was 1,524 mm. Further west they are painted on the land."
        ),
    )
    steel = parts(g, "rail")
    low = GROUND + SLEEPER
    for line, far in (
        (place.CENTRE_TRACK, LAND["centre"]),
        (place.SPURS[0], LAND["spur"]),
        (place.SPURS[1], LAND["spur"]),
        (place.SPURS[2], LAND["spur"]),
    ):
        xs = sorted({far - RAMP, far, EDGE, *[x for x, _ in line if far < x < EDGE]})
        _pair(steel, [(x, _at(line, x), low if x < far else RAIL_TOP) for x in xs], GAUGE / 2)
    strip = parts(g, "concrete/strips")
    for s in (-1, 1):
        y = s * GANTRY / 2
        sitelib.rail(steel, [(GANTRY_WEST, y, RAIL_TOP), (EDGE, y, RAIL_TOP)])
        # (what a gantry rail lay on short of the abutment is not recorded: a strip of concrete level with the abutment's top)
        box(strip, (GANTRY_WEST - 0.2, y - 0.3, -place.FOOTING), (-HALF - ABUTMENT, y + 0.3, -0.03))


def mast(parts: Parts, name: str, at, sign: int, foot: float) -> None:
    """One mast: `sign` is +1 for the north-east one (the rocket to its south-west) and -1 for its mirror; `foot` is
    the height of what it stands on."""
    x, y = at
    parts.node(
        name,
        "Masts",
        (x, y, 0.0),
        label="Mast, 110 ft",
        about=(
            "A mast 110 ft high at the platform's corner, with an array at its top: the CIA measured two of them in 1957, at "
            "opposite corners, and by 1961 could not say what they were for. Drawn as the photographs of 12 April 1961 have the "
            "north-east one: a slender cross-braced lattice, a railed head with lamps at its corners, the lattice going on above "
            "it to a rod. The lattice's size, the lamps' number and aim, the struts at its foot and the ladder are estimated."
        ),
    )
    steel, lamps = parts(name, "galv/lattice"), parts(name, "lamp/floods", True)
    parts.mark(name, "lamp/floods", lens_out=1)
    deck_z = MAST_HEIGHT - ARRAY[1]  # the head's deck: the array stands on it
    under = deck_z - 0.1  # the lattice's top, under the deck

    def corner(i: int, z: float):
        half = MAST_BASE + (MAST_HEAD - MAST_BASE) * (z - foot) / (under - foot)
        sx, sy = ((1, 1), (-1, 1), (-1, -1), (1, -1))[i]
        return (x + sx * half, y + sy * half, z)

    n = 20 if fine() else 10
    lattice(steel, corner, [foot + (under - foot) * k / n for k in range(n + 1)], 0.09, 0.05)
    plates = parts(name, "dark/feet")
    for i in range(4):  # a foot plate under each leg, bolted down, and a raking strut from the leg out to a plate of its own
        cx, cy, _ = corner(i, foot)
        box(plates, (cx - 0.17, cy - 0.17, foot - 0.3), (cx + 0.17, cy + 0.17, foot + 0.04))
        sx, sy = ((1, 1), (-1, 1), (-1, -1), (1, -1))[i]
        ox, oy = cx + sx * STRUT_OUT, cy + sy * STRUT_OUT
        beam(steel, corner(i, foot + STRUT_Z), (ox, oy, foot + 0.05), 0.08)
        box(plates, (ox - 0.13, oy - 0.13, foot - 0.3), (ox + 0.13, oy + 0.13, foot + 0.05))
        if fine():  # a tie from the strut back to the leg, half way up
            mid = tuple((a + b) / 2 for a, b in zip(corner(i, foot + STRUT_Z), (ox, oy, foot + 0.05)))
            beam(steel, mid, corner(i, foot + STRUT_Z / 2 - 0.4), 0.045)
    # the head: a deck with a rail, open where the ladder comes up (the side away from the rocket's quarter, toward the slab)
    half = HEAD
    floor = parts(name, "deck")
    lx = -sign  # the ladder's side: west of the north-east mast, east of the south-west one
    slot = MAST_HEAD + 0.06  # the deck is cut back to here on that side, between two wings, for the ladder to come up through
    box(floor, (min(x - lx * half, x + lx * slot), y - half, deck_z - 0.05), (max(x - lx * half, x + lx * slot), y + half, deck_z))
    for s in (-1, 1):
        xa, xb = sorted((x + lx * slot, x + lx * half))
        ya, yb = sorted((y + s * 0.35, y + s * half))
        box(floor, (xa, ya, deck_z - 0.05), (xb, yb, deck_z))
    e = half - 0.05
    ring = [(lx * e, -0.35), (lx * e, -e), (-lx * e, -e), (-lx * e, e), (lx * e, e), (lx * e, 0.35)]
    handrail(steel, [(x + a, y + b, deck_z) for a, b in ring], height=1.1, post=0.04, rail=0.035)
    for s in (-1, 1):  # four brackets under the deck, out from the lattice
        for t in (-1, 1):
            beam(steel, (x + s * MAST_HEAD, y + t * MAST_HEAD, deck_z - 1.0), (x + s * (half - 0.2), y + t * (half - 0.2), deck_z - 0.07), 0.045)
    # the lamps: one at each corner of the rail, on a short post, turned down to the launch system (the photograph of
    # the day has them at the head's corners; how many there were and where they pointed are estimated)
    for sx, sy in ((1, 1), (-1, 1), (-1, -1), (1, -1)):
        c = (x + sx * (half - 0.03), y + sy * (half - 0.03), deck_z + 1.42)
        beam(steel, (c[0], c[1], deck_z + 1.0), (c[0], c[1], c[2] - 0.1), 0.05)
        aim = (-c[0], -c[1], 8.0 - c[2])  # the launch system's supports, 8 m over the deck
        sitelib.lamp_head(steel, lamps, c, aim, 0.26)
    # above the head the lattice goes on, slighter, to the mast's top (the CIA's "array ... 10 feet high"); the rod above
    top = MAST_HEIGHT

    def upper(i: int, z: float):
        h = MAST_HEAD + (MAST_TOP - MAST_HEAD) * (z - deck_z) / (top - deck_z)
        sx, sy = ((1, 1), (-1, 1), (-1, -1), (1, -1))[i]
        return (x + sx * h, y + sy * h, z)

    m = 4 if fine() else 2
    # (open on the ladder's side, where a man comes up through the deck)
    lattice(
        steel, upper, [deck_z + 0.02 + (top - deck_z - 0.02) * k / m for k in range(m + 1)], 0.06, 0.035, faces=(0, 2, 3) if sign > 0 else (0, 1, 2)
    )
    pole = parts(name, "galv/rod", True)
    pole.tube(sitelib.P(x, y, top - 0.6), sitelib.P(x, y, top + 0.3), 0.045, 8)
    pole.tube(sitelib.P(x, y, top + 0.3), sitelib.P(x, y, top + ROD), 0.016, 6)
    # the ladder up the face toward the slab, to the gap in the head's rail
    parts.ladder(name, "up", (x + lx * (MAST_BASE + 0.14), y, foot), (x + lx * (MAST_HEAD + 0.14), y, deck_z), face=(-lx, 0, 0), mat="galv")


def masts(parts: Parts) -> None:
    parts.node("Masts")
    mast(parts, "Mast_NE", MAST_AT, 1, 0.0)
    if stood(
        "Mast 110 ft high at the platform's south-west corner",
        since="1957",
        until=SW_UNTIL,
        confidence="documented",
        source="HTA/JR-4/58 (August 1957); PIC/JR-2/60 (July 1959: 'no change'); PIC/JR-2/61 repeats those photographs. Absent from three "
        "photographs of 12 April 1961 taken from the south, where its place is clear sky: when it was taken down is not known",
    ):
        mast(parts, "Mast_SW", (-MAST_AT[0], -MAST_AT[1]), -1, -0.03)


def stair_head(parts: Parts) -> None:
    g = "StairHead"
    parts.node(
        g,
        "Platform",
        (HEAD_AT[0], HEAD_AT[1], 0.0),
        label="Small building on the platform",
        about=(
            "A small building on the platform's west side, some 60 ft north-west of the launch system: the CIA's interpreters "
            "found it on the photographs of 1959 and took it for the covered head of a stair down into the platform. Its size is "
            "scaled off their plan; what is under it is not recorded, so its door is shut."
        ),
    )
    conc = parts(g, "concrete")
    (cx, cy), (w, d, h) = HEAD_AT, HEAD_SIZE
    outline = [(cx - w / 2, cy - d / 2), (cx + w / 2, cy - d / 2), (cx + w / 2, cy + d / 2), (cx - w / 2, cy + d / 2)]
    walls = sitelib.ring(outline, 0.25)
    door = (d / 2 - 0.45, d / 2 + 0.45, 0.04, 1.95)  # in its east end, toward the launch system (which end is not recorded)
    for i, wall in enumerate(walls):
        wall.build(conc, -0.3, h, [door] if i == 1 else [])
    sitelib.wall_door(parts, f"{g}_Door", g, walls[1], *door, depth=0.1, fittings="none", works=False)
    obj = parts.nodes[f"{g}_Door"][0]
    obj["label"], obj["about"] = "Door, kept shut", "What is under this building is not recorded, so its inside is not drawn and its door stays shut."
    sitelib.slab(conc, sitelib.offset_poly(outline, 0.15), h, h + 0.2, bottom=True)


def build(parts: Parts) -> None:
    """The pad's share: the rails on the platform, the masts, the small building."""
    if stood(
        "Rails on the platform (centre track, north and south tracks, short spur, gantry tracks)",
        since="1957",
        confidence="documented",
        source="HTA/JR-4/58; PIC/JR-2/61 Figure 1 and text; flush in the deck in a photograph of 12 April 1961",
    ):
        rails(parts)
    if stood(
        "Mast 110 ft high at the platform's north-east corner",
        since="1957",
        confidence="documented",
        source="HTA/JR-4/58; PIC/JR-2/60; PIC/JR-2/61; in the photographs of the launch of 12 April 1961",
    ):
        masts(parts)
    if stood(
        "Small building on the platform's west side",
        since="1959",
        confidence="documented",
        source="PIC/JR-2/61: found on the photographs of 1959 (not reported in 1957); assumed for 1961",
    ):
        stair_head(parts)


def summary() -> str:
    return (
        f"rails to {GAUGE * 1000:.0f} mm, gantry rails {GANTRY:.2f} m apart, mast {MAST_HEIGHT:.2f} m at "
        f"({MAST_AT[0]:.2f}, {MAST_AT[1]:.2f}) (its mirror until {SW_UNTIL}), lip {LIP[0]:.2f} by {LIP[1]:.2f} m"
    )
