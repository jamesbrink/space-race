"""The railway fillers that stood beside the rocket and left before it did: the liquid oxygen filler (8G117) on the
platform's north track and the kerosene filler (8G119) on its south.

The rocket was fuelled from rail cars. Kamanin to Gagarin at 08:08 Moscow time, 59 minutes before liftoff: "the
railway cars are leaving now" (the transcript: ../site-1.md, "The morning at the pad").

What is recorded:
  The oxygen filler 8G117: "about 25 m over the axes of its couplers, as passenger coaches are"; two vessels with a
    pump compartment between them; "not on the usual two-axle bogies but on four-axle ones" (Cheremnykh, «Создание
    транспортного и заправочного оборудования для ракеты-носителя "Восток"», Технические газы, 2011 No. 3, pp. 3-6).
  The kerosene filler 8G119: "an eight-axle car 24 metres long", two tanks of 50 cubic metres, a pump room between
    them; on 12 April 1961 it "took its position seven metres from the rocket" (Mikheev, «Байконур. Ключ на старт!»,
    2014: a memoir). Today's 8G0119 is 24,820 by 3,088 by 5,265 mm (a later car: its breadth is taken).
  From above, in August 1957: "Nine cars measure 80 feet in length and two are 50 feet ... appearance of standard
    Soviet passenger coaches" (CIA HTA/JR-4/58). 80 ft is 24.4 m.
  That they were green: a drawing in Cheremnykh, and the film of 1961 as others have described it.
Estimated: everything else. Which track each stood on (the oxygen to the north, where the shed over the spur was the
oxygen and nitrogen toppers' shelter; the kerosene to the south: that side is not in anything read), how many stood
there (an artist's view in Cheremnykh has three oxygen fillers end to end; one is built), where along the track, the
body's height and every fitting, and how far they were drawn (the routine was a kilometre: a rail tractor took them).
Not built: the hydrogen peroxide filler (made to look like a passenger coach: no size is published), the oxygen and
nitrogen toppers 8G118 and 8G128 that stood under the shed through the launch, the transport tanks, the tractor.

Nodes: TankCars, with TankCar_Oxygen and TankCar_Kerosene under it, each with its origin on the rails under the
middle of its east bogie (what follows the track as it is drawn off to the west) and TankCar_<which>_Wheel_1..8,
each on its axle.
"""

from __future__ import annotations

from mathutils import Vector

import sitelib
from sitelib import axes

from .deck import NORTH, SOUTH
from .site import GAUGE, MM, RAIL_TOP, Parts, beam, box, fine, handrail, profile, stood
from .steel import extra_materials

WIDTH = 3088.0 * MM  # a car's breadth: today's 8G0119 (documented for the later car)
FLOOR = 1.25  # the underframe's top over the rails, m (estimated: a coach's)
EAVE, CROWN = 3.55, 4.25  # the body's eave and its roof's crown over the rails, m (estimated: an all-metal coach's)
WHEEL_R = 0.475  # the usual 950 mm wheel (estimated)
AXLE_Z = RAIL_TOP + WHEEL_R + 0.0024
BOGIE_IN = 4.2  # a bogie's middle from the car's end over its couplers, m (estimated)
AXLES = (-1.95, -0.65, 0.65, 1.95)  # a four-axle bogie's axles from its middle, m (estimated)
# Each car: its node, what it is, its length over the couplers (m), the track it stands on (deck.py), and where its
# middle is along it (m east of the rocket's axis: estimated, beside the rocket, clear of the track's end)
CARS = (
    ("TankCar_Oxygen", "8G117", 25.0, NORTH, -2.0),
    ("TankCar_Kerosene", "8G119", 24.0, SOUTH, -3.0),
)


def rear(length: float, middle: float) -> float:
    """Where a car's east bogie is, m east of the rocket's axis: its node's origin."""
    return middle + length / 2 - BOGIE_IN


def car(parts: Parts, node: str, length: float, track, middle: float) -> None:
    y = track[0]
    half = length / 2
    x0, x1 = middle - half + 0.5, middle + half - 0.5  # the body's ends: half a metre of coupler beyond each
    parts.node(node, "TankCars", origin=(rear(length, middle), y, RAIL_TOP))
    green, dark, deck = parts(node, "green", True), parts(node, "dark"), parts(node, "deck")
    w = WIDTH / 2
    # the body: plain sides and a low arched roof, as a coach has (the CIA's interpreters took these cars for coaches)
    section = [(-w, FLOOR), (w, FLOOR), (w, EAVE), (w * 0.82, EAVE + 0.42), (w * 0.45, CROWN - 0.06), (0.0, CROWN),
               (-w * 0.45, CROWN - 0.06), (-w * 0.82, EAVE + 0.42), (-w, EAVE)]  # fmt: skip
    sitelib.solid(green, [[(x, y + sy, z) for sy, z in section] for x in (x0, x1)])
    # the underframe: two sills, the headstocks, a truss rod under each side between the bogies
    for s in (-1, 1):
        box(dark, (x0 - 0.1, y + s * (w - 0.22) - 0.1, FLOOR - 0.32), (x1 + 0.1, y + s * (w - 0.22) + 0.1, FLOOR - 0.02))
        a, b = middle - half + BOGIE_IN + 3.2, middle + half - BOGIE_IN - 3.2
        mid = (a + b) / 2
        for p, q in (((a, FLOOR - 0.32), (mid - 1.5, 0.55)), ((mid - 1.5, 0.55), (mid + 1.5, 0.55)), ((mid + 1.5, 0.55), (b, FLOOR - 0.32))):
            beam(dark, (p[0], y + s * (w - 0.3), p[1]), (q[0], y + s * (w - 0.3), q[1]), 0.07)
    for x in (x0 - 0.06, x1 + 0.06):
        box(dark, (x - 0.1, y - w + 0.05, FLOOR - 0.36), (x + 0.1, y + w - 0.05, FLOOR + 0.05))
    # the couplers: a shank and a head at each end, on the car's middle line
    for x, s in ((x0, -1), (x1, 1)):
        box(dark, (min(x, x + s * 0.42), y - 0.09, 0.93), (max(x, x + s * 0.42), y + 0.09, 1.13))
        box(dark, (min(x + s * 0.3, x + s * 0.5), y - 0.17, 0.87), (max(x + s * 0.3, x + s * 0.5), y + 0.17, 1.19))
    # the pump compartment between the two vessels: a pair of doors in each side, and its vents on the roof
    for s in (-1, 1):
        face = y + s * w
        box(dark, (middle - 1.0, min(face, face + s * 0.035), FLOOR + 0.12), (middle + 1.0, max(face, face + s * 0.035), FLOOR + 2.05))
        box(green, (middle - 0.96, min(face, face + s * 0.06), FLOOR + 0.16), (middle - 0.03, max(face, face + s * 0.06), FLOOR + 2.01))
        box(green, (middle + 0.03, min(face, face + s * 0.06), FLOOR + 0.16), (middle + 0.96, max(face, face + s * 0.06), FLOOR + 2.01))
        # the step under them
        box(deck, (middle - 0.9, min(face, face + s * 0.3), FLOOR - 0.5), (middle + 0.9, max(face, face + s * 0.3), FLOOR - 0.45))
    for dx in (-0.5, 0.5):
        box(dark, (middle + dx - 0.2, y - 0.2, CROWN - 0.05), (middle + dx + 0.2, y + 0.2, CROWN + 0.22))
    # over each vessel its manhole and its vent, on the roof's crown
    quarter = (x1 - x0) / 4
    for xc in (middle - quarter - 0.5, middle + quarter + 0.5):
        dome = [(0.0, CROWN - 0.05), (0.42, CROWN - 0.05), (0.42, CROWN + 0.16), (0.36, CROWN + 0.2), (0.0, CROWN + 0.2)]
        dark.lathe(profile(dome), 16, matrix=axes((xc, y, 0.0), (1, 0, 0), (0, 0, 1)))
        pipe = [(0.0, CROWN - 0.05), (0.07, CROWN - 0.05), (0.07, CROWN + 0.5), (0.0, CROWN + 0.5)]
        dark.lathe(profile(pipe), 8, matrix=axes((xc + 1.4, y, 0.0), (1, 0, 0), (0, 0, 1)))
    if fine():
        # a ladder up each end to the roof, on the side away from the rocket, and a rail along the roof's crown walk
        away = 1 if y > 0 else -1
        for x in (x0 + 0.5, x1 - 0.5):
            for dx in (-0.2, 0.2):
                beam(dark, (x + dx, y + away * (w + 0.05), FLOOR - 0.2), (x + dx, y + away * (w + 0.05), EAVE + 0.05), 0.035)
            for k in range(8):
                z = FLOOR + 0.1 + k * 0.3
                beam(dark, (x - 0.2, y + away * (w + 0.05), z), (x + 0.2, y + away * (w + 0.05), z), 0.025)
        handrail(dark, [(x0 + 1.0, y + 0.55, CROWN - 0.12), (x1 - 1.0, y + 0.55, CROWN - 0.12)], height=0.7, post=0.03, rail=0.03)
    # the two bogies: a frame either side with its axle boxes, a bolster, and four wheelsets, each its own node
    n = 0
    for bx in (middle + half - BOGIE_IN, middle - half + BOGIE_IN):  # the east one first
        for s in (-1, 1):
            box(dark, (bx - 2.6, y + s * 1.0 - 0.06, AXLE_Z - 0.03), (bx + 2.6, y + s * 1.0 + 0.06, AXLE_Z + 0.27))
            for ax in AXLES:
                box(dark, (bx + ax - 0.16, y + s * 1.0 - 0.1, AXLE_Z - 0.15), (bx + ax + 0.16, y + s * 1.0 + 0.1, AXLE_Z + 0.14))
        box(dark, (bx - 0.3, y - 0.93, AXLE_Z + 0.02), (bx + 0.3, y + 0.93, AXLE_Z + 0.26))
        box(dark, (bx - 0.35, y - 0.35, AXLE_Z + 0.262), (bx + 0.35, y + 0.35, FLOOR - 0.3))
        for ax in AXLES[::-1]:
            n += 1
            wheelset(parts, node, n, bx + ax, y)


def wheelset(parts: Parts, car_node: str, k: int, x: float, y: float) -> None:
    """One axle and its two flanged wheels: its own node, origin on the axle, which lies across the track."""
    name = f"{car_node}_Wheel_{k}"
    parts.node(name, car_node, origin=(x, y, AXLE_Z))
    steel = parts(name, "tread", True)
    # (radius, outward from the rail's inner face): the flange inside the rail, the tread, the web and the hub
    wheel = [
        (0.0, -0.045), (0.12, -0.045), (0.14, -0.03), (0.44, -0.03), (WHEEL_R + 0.03, -0.028), (WHEEL_R + 0.03, -0.004),
        (WHEEL_R + 0.003, 0.0), (WHEEL_R - 0.003, 0.13), (0.42, 0.13), (0.4, 0.06), (0.13, 0.06), (0.11, 0.16), (0.0, 0.16),
    ]  # fmt: skip
    segs = 32 if fine() else 16
    for s in (-1, 1):
        steel.lathe(profile(wheel), segs, matrix=axes((x, y + s * (GAUGE / 2 - 0.005), AXLE_Z), (1, 0, 0), (0, s, 0)))
    steel.tube(Vector((x, y - GAUGE / 2 + 0.03, AXLE_Z)), Vector((x, y + GAUGE / 2 - 0.03, AXLE_Z)), 0.09, 12)


def build(parts: Parts) -> None:
    if not stood(
        "Railway fillers beside the rocket (oxygen 8G117, kerosene 8G119)",
        since="1961-04-12",
        until="1961-04-12",
        confidence="documented",
        source="with each rocket, for its fuelling, and drawn off before it left: 08:08 on 12 April 1961 (the transcript, Kamanin: "
        "'the railway cars are leaving now'); Cheremnykh (2011); Mikheev (2014)",
    ):
        return
    extra_materials(parts)
    parts.node(
        "TankCars",
        label="Railway fillers",
        about="The liquid oxygen filler on the north track and the kerosene filler on the south, drawn off at 08:08.",
    )
    for node, _, length, track, middle in CARS:
        car(parts, node, length, track, middle)


def summary() -> str:
    return ", ".join(f"{what} filler {length:.0f} m over its couplers, {WIDTH:.2f} m wide" for _, what, length, _, _ in CARS)
