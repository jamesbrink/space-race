"""The buildings near the pad that the U-2's photographs show: the propellant shed on the northern spur, the
cascade of gas receivers at the platform's south-west corner, the booster pump house and the work shop north-west
of it, the support building, the component check-out shop and the security building at the gate.

Each was measured or drawn by the CIA's interpreters (HTA/JR-4/58 from the photographs of August 1957; PIC/JR-2/60
from those of 1959; PIC/JR-2/61 measured the shed and the cascade again), and none later than that: these are the
last photographs taken before 12 April 1961. Three of them stand on today's map where the drawing has them (the
support building, the check-out shop, the security building) and are placed from it. The others are placed from
Figure 5 of PIC/JR-2/60, which is good to some ten metres.

What a photograph taken from 21 km up does not give is a face. So of every building here the plan is the record's
and the walls are ours: heights where the CIA's figure is redacted, every door and window, every colour. Their
insides are not recorded, and they are not offered empty: doors are built shut and windows dark.

Nodes: PropellantShed, CascadeFacility, PumpHouse, WorkShop, SupportBuilding, CheckoutShop, SecurityBuilding.
"""

from __future__ import annotations

import math

from mathutils import Matrix

import sitelib

from .place import FLOOR, FOOTING, SPURS, Local, bank, double_door, shell, turned
from .site import FT, GROUND, P, Parts, box, fine, profile, stood

# ---- the propellant shed: "a shed 105 [ft] ... which is open at least on the north side. There are six supports on
# this side equally spaced"; "the east end of the shed has earth embanked against it"; "entered by a rail line"
# (PIC/JR-2/60). Its width and height are redacted there and again in PIC/JR-2/61.
SHED_LENGTH = 105.0 * FT
SHED_WIDTH = 9.0  # m (estimated: Figure 5 draws it some 30 ft wide)
# The roof's underside over the ground, m (estimated). HTA/JR-4/58 calls the shed "high", and a tank car stands 4.7 m. The
# colour photograph of the liftoff of 12 April 1961, taken from beyond the south fence, has a long white box at the
# deck's level from 43 m west of the rocket's axis to the frame's edge at 57 m, which is where this shed's south wall is
# seen from there: some 4.8 m of it stands over the deck's line (16.6 px a metre), its foot hidden. It was drawn 6.5 m.
SHED_EAVE = 5.2
SHED_END = SPURS[3][-1]  # the northern spur's end, which the shed stands over (OpenStreetMap way 172441879)
SHED_HEADING = math.degrees(math.atan2(SPURS[3][-1][1] - SPURS[3][-2][1], SPURS[3][-1][0] - SPURS[3][-2][0]))

# ---- the cascade: "two banks of cascades, each with 8 to 10 tanks which individually measure approximately 40 by
# [redacted]", on a plot 55 by 40 ft "near the southwest corner of the launching platform ... approximately 135 feet
# from the servicing tower" (PIC/JR-2/60); confirmed, no longer "probable", in PIC/JR-2/61.
CASCADE = (55.0 * FT, 40.0 * FT)  # east-west, north-south
CASCADE_AT = (-38.6, -23.3)  # its middle, m: against the abutment's south-west corner (Figure 5; 45 m from the axis against the text's 41)
TANKS, TANK_LENGTH = 9, 37.0 * FT  # a bank's tanks ("8 to 10"), and one's length (the CIA's 40 ft less the manifold: estimated)
TANK_R = 0.35  # m (estimated: nine side by side fill half the plot's breadth)

# ---- buildings as rectangles (x0, y0, x1, y1), m
PUMP_HOUSE = (-46.0, 55.4, -35.4, 67.6)  # 35 by 40 ft (PIC/JR-2/60: "40' x 35'"), placed from Figure 5
WORK_SHOP = (-44.2, 86.2, -36.8, 96.8)  # 24 by 35 ft scaled off Figure 5: its size is redacted
SUPPORT = (-110.73, 80.63, -100.07, 101.97)  # 35 by 70 ft (PIC/JR-2/60), on OpenStreetMap way 172571597's middle
SUPPORT_EAVE = 20.0 * FT  # "70' x 35' x 20' h" (Figure 5)
CHECKOUT_X = (-109.6, -98.0)  # OpenStreetMap way 172571590: 11.6 m wide, 32.4 m long
CHECKOUT_Y = (212.0, 212.0 + 35.0 * FT, 212.0 + 85.0 * FT, 244.4)  # south section 35 ft, centre 50 ft (PIC/JR-2/60), the north what is left
SECURITY = (-482.0, -62.6, -471.3, -39.7)  # 35 by 75 ft (HTA/JR-4/58), on OpenStreetMap way 172571623


def _named(parts: Parts, node: str, label: str, about: str) -> None:
    parts.node(node, label=label, about=about)


def shed(parts: Parts) -> None:
    g = "PropellantShed"
    _named(
        parts,
        g,
        "Propellant shed",
        "A shed 105 ft long over the end of the northern spur, open to the north on six supports, with earth banked against its east "
        "end toward the pad: the CIA took it for where tank cars stood before fuelling. Its length is measured. It is white in the "
        "colour photograph of the liftoff of 12 April 1961, taken from the south, which also gives its height to about a metre; its "
        "width and its walls are estimated.",
    )
    k = Local()
    conc, roof = k("white/shed"), k("tar")
    x0, x1, h = -SHED_LENGTH + 1.5, 1.5, SHED_WIDTH / 2
    ze = GROUND + SHED_EAVE
    box(conc, (x0, -h, -FOOTING), (x1, -h + 0.4, ze))  # the south wall
    box(conc, (x1 - 0.4, -h + 0.4, -FOOTING), (x1, h - 0.6, ze))  # the east end
    n = 6
    for i in range(n):  # the six supports of the open north side
        x = x0 + 0.3 + (SHED_LENGTH - 0.6) * i / (n - 1)
        box(conc, (x - 0.3, h - 0.6, -FOOTING), (x + 0.3, h, ze))
    box(conc, (x0, -h - 0.3, ze), (x1 + 0.3, h + 0.3, ze + 0.5))  # the roof slab, oversailing
    box(roof, (x0 + 0.15, -h - 0.15, ze + 0.45), (x1 + 0.15, h + 0.15, ze + 0.58))
    box(conc, (x0, -h + 0.4, ze - 0.7), (x0 + 0.4, h - 0.6, ze))  # the beam over the west end, where the spur comes in
    if fine():  # the beams under the roof, one over each support
        for i in range(n):
            x = x0 + 0.3 + (SHED_LENGTH - 0.6) * i / (n - 1)
            if 0 < i < n - 1:
                box(conc, (x - 0.2, -h + 0.4, ze - 0.55), (x + 0.2, h - 0.6, ze))
    # the buffer at the spur's end: two timber baulks on steel posts
    wood, iron = k("tie/buffer"), k("dark/buffer")
    for y in (-0.76, 0.76):
        box(iron, (0.35, y - 0.08, -FOOTING), (0.51, y + 0.08, GROUND + 1.25))
    box(wood, (0.1, -1.2, GROUND + 0.75), (0.35, 1.2, GROUND + 1.2))
    k.put(parts, g, (*SHED_END, 0.0), SHED_HEADING)
    # the earth against the east end, toward the pad
    c = [turned(SHED_END, SHED_HEADING, x, y) for x, y in ((x1 - 0.2, -h + 0.2), (x1 + 1.2, -h + 0.2), (x1 + 1.2, h - 0.2), (x1 - 0.2, h - 0.2))]
    bank(parts(g, "earth", True), c, GROUND + SHED_EAVE - 1.2, 5.5)


def cascade(parts: Parts) -> None:
    g = "CascadeFacility"
    _named(
        parts,
        g,
        "Gas receivers (the 'cascade')",
        "Two banks of long pressure vessels beside the platform, which the CIA's interpreters called a cascade facility: compressed "
        "gas for the pad. The plot (55 by 40 ft) and the count (8 to 10 a bank, 40 ft long) are theirs; the vessels' girth, the "
        "cradles and the pipes are estimated.",
    )
    cx, cy = CASCADE_AT
    w, d = CASCADE
    conc, tank, pipe = parts(g, "concrete/plot"), parts(g, "tank", True), parts(g, "grey/pipes", True)
    box(conc, (cx - w / 2, cy - d / 2, -FOOTING), (cx + w / 2, cy + d / 2, 0.0))
    pitch = 2 * TANK_R + 0.14
    zc = 0.55 + TANK_R
    y0 = cy - d / 2 + 0.25  # the tanks' south ends; their heads and the manifold are at the north, toward the track
    head = [(0.0, 0.0), (0.2, 0.02), (0.31, 0.1), (TANK_R, 0.28)]
    prof = head + [(r, TANK_LENGTH - z) for r, z in reversed(head)]
    lie = Matrix.Rotation(math.radians(-90), 4, "X")
    ym = y0 + TANK_LENGTH + 0.45
    ends = []
    for side in (-1, 1):
        mid = cx + side * (pitch * TANKS / 2 + 0.55)
        xs = [mid + pitch * (i - (TANKS - 1) / 2) for i in range(TANKS)]
        for x in xs:
            tank.lathe(profile(prof), 20, matrix=Matrix.Translation(P(x, y0, zc)) @ lie)
        for t in (0.12, 0.5, 0.88):  # three cradles under each bank
            y = y0 + TANK_LENGTH * t
            box(conc, (xs[0] - TANK_R - 0.15, y - 0.2, -0.05), (xs[-1] + TANK_R + 0.15, y + 0.2, zc - 0.12))
        # a neck from each vessel to the manifold across the north ends, with its stop valve
        for x in xs:
            pipe.tube(P(x, y0 + TANK_LENGTH - 0.03, zc), P(x, ym, zc), 0.035, 8)
            if fine():  # the valve's body and handwheel
                pipe.lathe(
                    profile([(0.0, 0.0), (0.06, 0.0), (0.06, 0.16), (0.012, 0.16), (0.012, 0.3), (0.09, 0.3), (0.09, 0.32), (0.0, 0.32)]),
                    10,
                    matrix=Matrix.Translation(P(x, y0 + TANK_LENGTH + 0.22, zc)),
                )
        ends.append((xs[0], xs[-1]))
    # one manifold for both banks, and the line down from it toward the platform
    pipe.tube(P(ends[0][0], ym, zc), P(ends[1][1], ym, zc), 0.06, 10)
    xd = ends[1][1] + 0.4
    pipe.tube(P(ends[1][1], ym, zc), P(xd, ym, zc), 0.045, 10)
    pipe.tube(P(xd, ym, zc + 0.04), P(xd, ym, -0.1), 0.045, 10)  # (into the plot: the line to the platform ran under the ground)


def _hut(parts: Parts, g: str, key: str, rect, eave: float, openings: dict, **kw) -> list:
    return shell(parts, g, key, rect, GROUND + eave, openings, **kw)


def _win(a: float, b: float, lo: float = 1.1, hi: float = 2.5):
    return (a, b, FLOOR + lo, FLOOR + hi, "blind")


def _door(a: float, lo: float = 0.0, w: float = 1.0, h: float = 2.1):
    return (a, a + w, FLOOR + lo, FLOOR + h, "shut")


PLAN = "Its plan is the CIA's, off photographs of 1957 and 1959; its walls, doors and windows are estimated, and its inside is not recorded."


def small(parts: Parts) -> None:
    """The pump house and the work shop: two small buildings between the tracks and the pit's north-west rim."""
    g = "PumpHouse"
    _named(parts, g, "Booster pump house", "The CIA's name for a building 40 by 35 ft on the water lines to the launching structure. " + PLAN)
    r = PUMP_HOUSE
    _hut(parts, g, "pump", r, 3.8, {0: [_door(4.6, w=1.4)], 1: [_win(2.5, 4.5), _win(7.6, 9.6)], 3: [_win(2.5, 4.5), _win(7.6, 9.6)]})
    grey = parts(g, "grey/vents", True)
    for y in (r[1] + 3.5, r[3] - 3.5):
        sitelib.roof_vent(grey, (r[0] + r[2]) / 2, y, GROUND + 3.8 + 0.2, 1.4)
    g = "WorkShop"
    _named(
        parts, g, "Work shop", "A small building the CIA labelled a work shop; its size is scaled off their drawing (the figure is redacted). " + PLAN
    )
    _hut(parts, g, "shop", WORK_SHOP, 3.2, {3: [_door(4.6, w=1.2)], 0: [_win(2.6, 4.8)], 2: [_win(2.6, 4.8)]})


def support(parts: Parts) -> None:
    g = "SupportBuilding"
    _named(
        parts,
        g,
        "Support building",
        "Built between the photographs of 1957 and 1959, 400 ft north-west of the platform: 70 by 35 ft and 20 ft high, all three "
        "measured by the CIA, and a building of that plan stands there today. Its walls, doors and windows are estimated, and its "
        "inside is not recorded.",
    )
    wins = [_win(a, a + 2.0, 1.4, 4.4) for a in (1.6, 6.2, 13.1, 17.7)]
    shell(parts, g, "support", SUPPORT, GROUND + SUPPORT_EAVE, {0: [_door(4.6, w=1.4)], 1: sorted(wins), 3: sorted(wins)})


def checkout(parts: Parts) -> None:
    g = "CheckoutShop"
    _named(
        parts,
        g,
        "Component check-out shop",
        "A drive-in building of a tall centre section 50 ft long between two lower ends, the southern 35 ft long (CIA, 1957 and "
        "1959), on the road to the storage bunker; a building of its plan stands there today. Its heights, gate and windows are "
        "estimated, and its inside is not recorded.",
    )
    x0, x1 = CHECKOUT_X
    ya, yb, yc, yd = CHECKOUT_Y
    shell(
        parts, g, "south", (x0, ya, x1, yb), GROUND + 4.4, {0: [_door(5.3)], 1: [_win(3.0, 5.4), _win(6.4, 8.8)], 3: [_win(1.9, 4.3), _win(5.3, 7.7)]}
    )
    shell(parts, g, "north", (x0, yc, x1, yd), GROUND + 4.4, {1: [_win(2.1, 4.5)], 3: [_win(2.0, 4.4)], 2: [_door(5.3)]})
    # the centre: a hall with a gate a lorry drives in by, on the side of the road (east)
    eave = GROUND + 7.6
    rect = [(x0, yb), (x1, yb), (x1, yc), (x0, yc)]
    walls = sitelib.ring(rect, 0.45)
    skin = parts(g, "plaster/centre")
    s0, s1 = (yc - yb) / 2 - 2.0, (yc - yb) / 2 + 2.0
    high = [(a, a + 2.4, GROUND + 5.0, GROUND + 6.6) for a in (1.6, 6.4, 11.2)]
    for i, w in enumerate(walls):
        w.build(skin, -FOOTING, eave, [(s0, s1, GROUND + 0.03, GROUND + 4.2)] if i == 1 else high if i == 3 else [])
    for a, b, lo, hi in high:
        sitelib.window(parts, g, walls[3], a, b, lo, hi, mullions=[(a + b) / 2], pane="void")
    double_door(parts, f"{g}_Gate", g, walls[1], s0, s1, GROUND + 0.03, GROUND + 4.2, depth=0.18)
    for leaf in ("L", "R"):
        obj = parts.nodes[f"{g}_Gate{leaf}"][0]
        obj["label"] = "Gate, kept shut"
        obj["about"] = "What stood in this building is not recorded, so its inside is not drawn and its gate stays shut. The gate is estimated."
    sitelib.flat_roof(parts, g, "centre", (x0, yb, x1, yc), eave, over=0.35, mat="plaster")
    box(parts(g, "concrete/apron"), (x1 + 0.02, yb + s0 - 1.0, -FOOTING), (x1 + 6.0, yb + s1 + 1.0, 0.0))


def security(parts: Parts) -> None:
    g = "SecurityBuilding"
    _named(
        parts,
        g,
        "Security building",
        "At the fence where the road and the track come in: 75 by 35 ft, 'of standard Soviet design' as at Kapustin Yar (CIA, "
        "1957), and a building stands there today. Its walls, doors and windows are estimated, and its inside is not recorded.",
    )
    wins = [_win(a, a + 1.6) for a in (2.0, 6.0, 14.0, 18.5)]
    shell(parts, g, "guard", SECURITY, GROUND + 3.4, {1: sorted([*wins, _door(10.4)]), 0: [_win(4.2, 6.2)], 2: [_win(4.2, 6.2)]})


def build(parts: Parts) -> None:
    last = "the last photographs before the flight"
    if stood(
        "Propellant shed",
        since="1957",
        confidence="documented",
        source=f"HTA/JR-4/58; PIC/JR-2/60 (1959); measured again in PIC/JR-2/61, from {last}",
    ):
        shed(parts)
    if stood(
        "Gas receivers (cascade facility)",
        since="1959",
        confidence="documented",
        source=f"PIC/JR-2/60: new since 1957; confirmed in PIC/JR-2/61, from {last}",
    ):
        cascade(parts)
    if stood(
        "Booster pump house and work shop", since="1957", confidence="documented", source=f"HTA/JR-4/58; on Figure 5 of PIC/JR-2/60 (1959), {last}"
    ):
        small(parts)
    if stood(
        "Support building",
        since="1959",
        confidence="documented",
        source="PIC/JR-2/60: added between the photographs of 1957 and 1959; a building of its plan stands today",
    ):
        support(parts)
    if stood(
        "Component check-out shop", since="1957", confidence="documented", source="HTA/JR-4/58; PIC/JR-2/60; a building of its plan stands today"
    ):
        checkout(parts)
    if stood("Security building", since="1957", confidence="documented", source="HTA/JR-4/58; a building stands there today"):
        security(parts)


def summary() -> str:
    shed_ = f"propellant shed {SHED_LENGTH:.1f} m ({SHED_LENGTH / FT:.0f} ft)"
    return f"{shed_}, cascade {CASCADE[0]:.1f} by {CASCADE[1]:.1f} m, support building {SUPPORT_EAVE:.1f} m high"
