"""The erector (установщик, 8У213) standing at the rocket: the way up to the spacecraft.

A rail wagon with a long boom. It brought the rocket out along the centre track lying on the boom, tail first,
and stood it up into the launch system; then, for a three-stage vehicle that stood taller than the launch system's
own service trusses reached, the boom stayed up beside the rocket and carried the platforms round the third stage
and the spacecraft, and the lift. Ivanovsky, who rode it that morning: Gagarin "went up the fifteen steps of the
stair, to the lift's door"; "two or three minutes of climbing, and the upper platform"; and afterwards, from the
ground: "from the rocket, along the rails, slowly rides away the tall metal truss with the platforms and the lift
in which we came down a few minutes ago. This truss, as if by itself, leaning over little by little, lays itself
down on a special wagon, and a motor locomotive draws it off the launch pad." The transcript has the times:
08:35 "now they will draw the erector off"; 08:37 "the erector's boom has come away normally".

What is recorded: that it is a hydraulic rail erector of 87.5 t by TsKBTM, built by the Podyomnik works and
accepted in 1960 (as quoted by militaryrussia.ru); the Soviet gauge it ran on; the fifteen steps, the lift, the
platforms and the upper one at the hatch; how and when it left. A photograph of Gagarin at the head of the stair
shows plate girders pierced with large round holes behind him, and one of a Vostok being raised shows the boom as
a deep girder with a pierced web and a decked head.

Estimated, and much of it ours: every dimension below. No drawing of it was found (modela.lv's were not reached).
How the boom stood clear of the support on its side of the ring is not known: here it stands from a foot outside
the ring and leans in over that support to the third stage, which no photograph read confirms or denies (seen
from behind, as in the one photograph of it at a Vostok, a lean toward the rocket does not show). The rams that
raised the boom, its cradles for the rocket, its jacks, and the locomotive are not modelled. See ../site-1.md.

Built standing at the rocket, in the site's own axes: the centre track runs along X, the rocket is to the east.

Nodes: Erector (the wagon), with Erector_Boom (its origin on its pivot) and Erector_Wheel_1..6 (each an axle)
under it, and Erector_Lift (the car, built at its lowest stop) under the boom.
"""

from __future__ import annotations

import math

from mathutils import Vector

from sitelib import axes, stair_rails, stairs

from .site import MM, TAIL_Z, Parts, beam, box, fine, handrail, obox, profile, stood, truss
from .steel import arc, extra_materials, girder, poly_deck

GAUGE = 1520.0 * MM  # the Soviet gauge, between the rails' inner faces
WHEEL_R = 0.475  # a wheel's tread: the usual 950 mm (estimated)
AXLES = [-13.2, -14.8, -16.4, -27.2, -28.8, -30.4]  # two bogies of three (estimated: 87.5 t and the rocket on six axles)
FRAME = (-33.0, -10.5)  # the wagon's frame, west end and east end: its nose stops short of the ring
DECK_Z = 1.93  # the wagon's deck
PIVOT = (-11.3, 0.0, 3.0)  # the boom's trunnion
LEAN = math.radians(14.0)  # the boom, from upright toward the rocket (ours: see above)
BOOM_D, BOOM_W = 1.0, 1.3  # half its section: toward the rocket, across the track
BOOM_TOP = 30.5  # its head above the deck (estimated: off the photograph of one standing at a Vostok)
ROOT = 5.5  # how far up from the pivot its sides are plate girders with round holes (the photograph at the stair)
# The hatch's opening in the fairing, on the rocket as it hangs (../vehicles/vostok-8k72k.md: its middle is 34.07 m
# above the nozzles' exits, 135 degrees round from the rocket's own +X, on a fairing of 1.35 m radius)
HATCH_Z = TAIL_Z + 34.07
STEPS = 15  # Ivanovsky: fifteen steps to the lift's door
RISER = 0.2  # estimated
LANDING_Z = STEPS * RISER  # the lift's lowest stop
STAGE_Z = 22.6  # the platform round the third stage: its floor (estimated)
BRIDGE_Z = HATCH_Z - 1.2  # the upper platform: the hatch's middle at a standing man's chest (estimated)
CAR = (1.3, 1.16, 2.15)  # the lift's car: along the track, across, high (estimated: three men, one in a pressure suit)
CAR_Y = BOOM_W + 0.14  # its south side, off the boom's north face
SPEED = 0.3  # m/s: 23 m in "a minute" by one of Ivanovsky's tellings and "two or three minutes" by another
DRAWN_BACK = 20.0  # degrees the boom comes away through between 08:35 and 08:37, before the wagon moves (estimated)
ROLL = (30.0, 120.0)  # metres west along the track: where the boom is down, and where it is left (estimated)
TREAD = 0.08


def axis_x(z: float) -> float:
    """Where the boom's middle line is at height z."""
    return PIVOT[0] + (z - PIVOT[2]) * math.tan(LEAN)


def face_x(z: float) -> float:
    """The boom's face toward the rocket at height z, with room for a railing's post."""
    return axis_x(z) + BOOM_D / math.cos(LEAN) + 0.2


def build(parts: Parts) -> None:
    if not stood(
        "Erector 8U213 at the rocket, its boom up",
        since="1957",
        confidence="documented",
        source="Ivanovsky, Vostok; the transcript of 12 April 1961, 08:35 and 08:37; TsKBTM as quoted by militaryrussia.ru (accepted 1960). "
        "It came with each rocket and left before each launch",
    ):
        return
    extra_materials(parts)
    wagon(parts)
    boom(parts)
    lift(parts)


# ----------------------------------------------------------------------------- the wagon


def wagon(parts: Parts) -> None:
    node = "Erector"
    parts.node(node, None, origin=(PIVOT[0], 0.0, 0.0))
    green, dark, deck, rails = parts(node, "green"), parts(node, "dark"), parts(node, "deck"), parts(node, "deck/rails")
    x0, x1 = FRAME
    # the frame: two plate girders with lightening holes, cross members between them, a deck over it
    for s in (-1, 1):
        girder(green, (x0, s * 1.25, 1.3), (x1, s * 1.25, 1.3), (0, 0, 1), 1.1, 0.3, holes=18, hole=0.33)
    for k in range(9):
        x = x0 + 0.4 + (x1 - x0 - 0.8) * k / 8
        box(dark, (x - 0.12, -1.23, 0.95), (x + 0.12, 1.23, 1.7))
    box(deck, (x0, -1.6, 1.854), (PIVOT[0] - 1.0, 1.6, DECK_Z))
    # railed, but for a gap on the south side where a ladder comes up from the ground, and on the north where the
    # lift's car lies when the boom is down
    rail = dict(height=1.0, post=0.05, rail=0.04)
    handrail(rails, [(PIVOT[0] - 1.1, -1.55, DECK_Z), (x0 + 2.0, -1.55, DECK_Z)], **rail)
    handrail(rails, [(x0 + 1.0, -1.55, DECK_Z), (x0 + 0.05, -1.55, DECK_Z), (x0 + 0.05, 1.55, DECK_Z), (PIVOT[0] - 3.2, 1.55, DECK_Z)], **rail)
    parts.ladder(node, "deck", (x0 + 1.5, -1.8, 0.05), (x0 + 1.5, -1.8, DECK_Z), face=(0, 1, 0), mat="deck")
    for x in (-20.0, -30.0):  # the bolsters the boom lies on
        box(dark, (x - 0.3, -1.45, DECK_Z + 0.004), (x + 0.3, 1.45, DECK_Z + 0.05))
    # the trunnion: a plate across the frame's nose, two stands inside the boom's girders, the pin through them
    box(green, (PIVOT[0] - 0.7, -1.23, 1.7), (x1 - 0.05, 1.23, 1.85))
    for s in (-1, 1):
        obox(green, (PIVOT[0], s * 1.02, 2.6), (1, 0, 0), (0, 0, 1), (1.1, 0.07, 1.5))
        obox(green, (PIVOT[0], s * 1.02, PIVOT[2]), (1, 0, 0), (0, 0, 1), (0.5, 0.11, 0.5))
        beam(green, (PIVOT[0] - 0.5, s * 1.02, 3.1), (PIVOT[0] - 1.9, s * 1.02, 1.95), 0.12)
    dark.tube(Vector((PIVOT[0], -BOOM_W - 0.08, PIVOT[2])), Vector((PIVOT[0], BOOM_W + 0.08, PIVOT[2])), 0.12, 16)

    # the bogies: side frames, axle boxes; each axle with its two wheels is its own node
    for bx in (AXLES[1], AXLES[4]):
        for s in (-1, 1):
            box(dark, (bx - 2.3, s * 1.0 - 0.06, 0.36), (bx + 2.3, s * 1.0 + 0.06, 0.72))
            box(dark, (bx - 0.25, s * 1.0 - 0.07, 0.72), (bx + 0.25, s * 1.0 + 0.07, 0.752))
        box(dark, (bx - 0.3, -0.93, 0.5), (bx + 0.3, 0.93, 0.74))
        box(dark, (bx - 0.35, -0.35, 0.742), (bx + 0.35, 0.35, 0.96))  # its pivot, under a member of the frame
        box(dark, (bx - 0.2, -1.228, 0.9), (bx + 0.2, 1.228, 1.7))
    for k, x in enumerate(AXLES, 1):
        wheelset(parts, k, x)
        for s in (-1, 1):
            box(dark, (x - 0.16, s * 1.0 - 0.1, 0.33), (x + 0.16, s * 1.0 + 0.1, 0.62))

    # the stair of fifteen steps up the wagon's north side to the landing at the lift's door, railed
    yc = CAR_Y + CAR[1] + 0.05 + 0.6
    top = (PIVOT[0] - 0.8, yc, LANDING_Z)
    foot = (top[0] - (STEPS - 1) * 0.27, yc, 0.0)
    stairs(dark, foot, top, 1.0, rise=RISER)
    stair_rails(rails, foot, top, 1.0, 1.0)
    y0, y1 = CAR_Y + CAR[1] + 0.05, CAR_Y + CAR[1] + 0.05 + 1.2
    box(deck, (top[0], y0, LANDING_Z - TREAD), (PIVOT[0] + 0.8, y1, LANDING_Z))
    handrail(rails, [(top[0] + 0.25, y1 - 0.04, LANDING_Z), (PIVOT[0] + 0.76, y1 - 0.04, LANDING_Z), (PIVOT[0] + 0.76, y0 + 0.04, LANDING_Z)], **rail)
    for x in (top[0] + 0.15, PIVOT[0] + 0.65):  # the brackets that carry stair and landing off the wagon's side
        beam(green, (x, 1.42, 1.5), (x, y1 - 0.1, LANDING_Z - 0.14), 0.1)
        beam(green, (x, y0 - 0.02, LANDING_Z - 0.14), (x, y1 - 0.05, LANDING_Z - 0.14), 0.1)
    xm = (foot[0] + top[0]) / 2
    beam(green, (xm, 1.42, 1.3), (xm, yc - 0.5, 1.36), 0.1)


def wheelset(parts: Parts, k: int, x: float) -> None:
    """One axle and its two flanged wheels: its own node, origin on the axle, which lies across the track."""
    name = f"Erector_Wheel_{k}"
    parts.node(name, "Erector", origin=(x, 0.0, WHEEL_R))
    steel = parts(name, "tread", True)
    # (radius, outward from the rail's inner face): the flange inside the rail, the tread, the web and the hub
    wheel = [
        (0.0, -0.045), (0.12, -0.045), (0.14, -0.03), (0.44, -0.03), (WHEEL_R + 0.03, -0.028), (WHEEL_R + 0.03, -0.004),
        (WHEEL_R + 0.003, 0.0), (WHEEL_R - 0.003, 0.13), (0.42, 0.13), (0.4, 0.06), (0.13, 0.06), (0.11, 0.16), (0.0, 0.16),
    ]  # fmt: skip
    for s in (-1, 1):
        steel.lathe(profile(wheel), 32, matrix=axes((x, s * (GAUGE / 2 - 0.005), WHEEL_R), (1, 0, 0), (0, s, 0)))
    steel.tube(Vector((x, -GAUGE / 2 + 0.03, WHEEL_R)), Vector((x, GAUGE / 2 - 0.03, WHEEL_R)), 0.09, 12)


# ------------------------------------------------------------------------------ the boom


def on_boom(s: float, a: float, y: float) -> tuple:
    """A point on the boom: s metres up its middle line from the pivot, a toward the rocket, y across the track."""
    d = Vector((math.sin(LEAN), 0.0, math.cos(LEAN)))
    toward = Vector((math.cos(LEAN), 0.0, -math.sin(LEAN)))
    return tuple(Vector(PIVOT) + d * s + toward * a + Vector((0.0, y, 0.0)))


def boom(parts: Parts) -> None:
    node = "Erector_Boom"
    parts.node(node, "Erector", origin=PIVOT)
    green, dark, deck, rails = parts(node, "green"), parts(node, "dark"), parts(node, "deck"), parts(node, "deck/rails")
    length = (BOOM_TOP - PIVOT[2]) / math.cos(LEAN)
    toward = (math.cos(LEAN), 0.0, -math.sin(LEAN))
    # its foot: two plate girders with large round holes, one each side, from below the pivot up
    for s in (-1, 1):
        girder(green, on_boom(-0.7, 0.0, s * BOOM_W), on_boom(ROOT, 0.0, s * BOOM_W), toward, 2 * BOOM_D, 0.26, holes=4, hole=0.58)
    for at in (0.9, 3.2):
        for a in (-BOOM_D + 0.07, BOOM_D - 0.07):
            beam(green, on_boom(at, a, -BOOM_W), on_boom(at, a, BOOM_W), 0.14)
    # above it a box truss to the head
    bays = 10 if fine() else 5
    stations = [ROOT + (length - ROOT) * k / bays for k in range(bays + 1)]

    def corner(i: int, s: float) -> tuple:
        da, dy = ((-1, -1), (1, -1), (1, 1), (-1, 1))[i]
        return on_boom(s, da * (BOOM_D - 0.02), dy * BOOM_W)

    truss(green, corner, stations, 0.2, 0.11)
    # the lift's guides up its north face, and its machinery on the head
    for a in (-0.45, 0.45):
        beam(dark, on_boom(-0.3, a, BOOM_W + 0.05), on_boom(length - 0.2, a, BOOM_W + 0.05), 0.07)
    box_at = on_boom(length + 0.3, 0.0, BOOM_W - 0.3)
    obox(green, box_at, (math.sin(LEAN), 0.0, math.cos(LEAN)), (0.0, 1.0, 0.0), (0.7, 1.2, 1.5))
    beam(dark, on_boom(length + 0.3, 0.0, BOOM_W + 0.5), on_boom(length + 0.3, 0.0, BOOM_W + CAR[1] + 0.2), 0.16)

    # at each of the lift's upper stops: a walk beside the car, an apron across the boom's face, and the platform
    for z, kind in ((STAGE_Z, "stage"), (BRIDGE_Z, "bridge")):
        xc = axis_x(z)
        xe = face_x(z)
        n0, n1 = CAR_Y + CAR[1] + 0.04, CAR_Y + CAR[1] + 1.2  # the walk, north of the car
        south = -1.6
        east = xe + 1.1
        box(deck, (xc - 0.75, n0, z - TREAD), (xe, n1, z))
        box(deck, (xc + CAR[0] / 2 + 0.04, CAR_Y + 0.02, z - TREAD), (xe, n0, z))  # the corner between the car and the apron
        box(deck, (xe, south, z - TREAD), (east, n1, z))

        def rail(pts, z=z) -> None:
            handrail(rails, [(x, y, z) for x, y in pts], height=1.1, post=0.05, rail=0.04)

        rail([(xc + CAR[0] / 2 + 0.08, CAR_Y + 0.06), (xe - 0.06, CAR_Y + 0.06)])  # between the corner and the boom
        north = [(xc - 0.71, n0 + 0.04), (xc - 0.71, n1 - 0.04), (east - 0.04, n1 - 0.04)]
        south_run = [(xe + 0.04, CAR_Y - 0.05), (xe + 0.04, south + 0.04)]
        if kind == "bridge":
            # the upper platform: out to the fairing, cut to its curve, the hatch's opening in front of it
            rho, x1, half = 1.47, -0.8, 1.3
            w = math.sqrt(rho * rho - x1 * x1)
            cut = arc(rho, math.pi + math.asin(w / rho), math.pi - math.asin(w / rho), 10)
            poly_deck(deck, [(east, south), (x1, south), *cut, (x1, half), (east, half)], z - TREAD, z)
            rail([*north, (east - 0.04, half - 0.04), (x1 - 0.04, half - 0.04)])
            rail([*south_run, (x1 - 0.04, south + 0.04)])
            bearers = (south + 0.3, 1.0)
        else:
            # the platform round the west half of the third stage
            rho, x1, half = 1.45, -0.2, 2.2
            w = math.sqrt(rho * rho - x1 * x1)
            cut = arc(rho, math.pi + math.asin(w / rho), math.pi - math.asin(w / rho), 16)
            poly_deck(deck, [(east, -half), (x1, -half), *cut, (x1, half), (east, half)], z - TREAD, z)
            rail([*north, (east - 0.04, half - 0.04), (x1 - 0.04, half - 0.04), (x1 - 0.04, w + 0.1)])
            rail([*south_run, (east + 0.04, south + 0.04), (east + 0.04, -half + 0.04), (x1 - 0.04, -half + 0.04), (x1 - 0.04, -w - 0.1)])
            bearers = (-half + 0.25, half - 0.25)
        # the bearers under it all, and a strut up to each side from the boom
        for y in bearers:
            beam(green, (xe - 0.1, y, z - 0.15), (x1 - 0.45, y, z - 0.15), 0.12)
        for y in (-BOOM_W, BOOM_W):
            low = z - 3.2
            beam(green, (axis_x(low) + BOOM_D / math.cos(LEAN) - 0.05, y, low), (x1 - 1.3, y * 0.8, z - 0.22), 0.11)
        beam(green, (xc - 0.6, n1 - 0.15, z - 0.15), (east - 0.1, n1 - 0.15, z - 0.15), 0.12)
        beam(green, (xe + 0.5, south + 0.1, z - 0.15), (xe + 0.5, n1 - 0.1, z - 0.15), 0.12)


def stops() -> list[tuple[str, float]]:
    return [("Lift door, 15 steps up", LANDING_Z), ("Third stage", STAGE_Z), ("Upper platform, at the hatch", BRIDGE_Z)]


def lift(parts: Parts) -> None:
    """The car: an open cage in an angle frame, sheeted to the waist, open to the north where its floors are, built at
    the stair's landing. It rides the boom's north face, so each stop is a little nearer the rocket than the one below."""
    node = "Erector_Lift"
    z = LANDING_Z
    xc = axis_x(z)
    table = [[round(axis_x(h) - xc, 3), round(h - z, 3)] for _, h in stops()]
    parts.node(node, "Erector_Boom", origin=(xc, CAR_Y + CAR[1] / 2, z), lift=1, stops=table, stop_names=[n for n, _ in stops()])
    frame, floor = parts(node, "dark"), parts(node, "deck")
    x0, x1, y0, y1 = xc - CAR[0] / 2, xc + CAR[0] / 2, CAR_Y, CAR_Y + CAR[1]
    box(floor, (x0, y0, z - TREAD), (x1, y1, z))
    box(frame, (x0 - 0.03, y0 - 0.03, z + CAR[2]), (x1 + 0.03, y1 + 0.03, z + CAR[2] + 0.06))
    waist = 1.05
    for x in (x0 + 0.035, x1 - 0.035):
        for y in (y0 + 0.035, y1 - 0.035):
            beam(frame, (x, y, z), (x, y, z + CAR[2]), 0.07)
    # three sides closed to the waist with sheet, and crossed with bars above it; the fourth, to the north, is the way in
    sides = [
        ((x0 + 0.035, y0 + 0.07), (x0 + 0.035, y1 - 0.07)),
        ((x1 - 0.035, y0 + 0.07), (x1 - 0.035, y1 - 0.07)),
        ((x0 + 0.07, y0 + 0.035), (x1 - 0.07, y0 + 0.035)),
    ]
    for a, b in sides:
        beam(frame, (*a, z + waist), (*b, z + waist), 0.05)
        beam(frame, (*a, z + 0.04), (*b, z + 0.04), 0.05)
        thick = (0.012, 0.0) if a[0] == b[0] else (0.0, 0.012)
        box(frame, (a[0] - thick[0], a[1] - thick[1], z + 0.07), (b[0] + thick[0], b[1] + thick[1], z + waist - 0.03))
        if fine():
            beam(frame, (*a, z + waist + 0.03), (*b, z + CAR[2] - 0.02), 0.03)
            beam(frame, (*b, z + waist + 0.03), (*a, z + CAR[2] - 0.02), 0.03)
    # the shoes that hold it to the guides
    for h in (0.3, CAR[2] - 0.3):
        box(frame, (xc - 0.5, CAR_Y - 0.045, z + h - 0.06), (xc + 0.5, CAR_Y - 0.002, z + h + 0.06))


def summary() -> str:
    return (
        f"erector's boom {BOOM_TOP:.1f} m over the deck, lift from {LANDING_Z:.1f} m to the upper platform at {BRIDGE_Z:.2f} m "
        f"(the hatch's middle {HATCH_Z:.2f} m)"
    )
