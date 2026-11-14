"""The road vehicles on the apron on a launch morning: the cosmonauts' bus, a saloon car, a box-bodied truck.

The film of 12 April 1961 («Первый рейс к звёздам», ЦСДФ 1961) shows all three. At 43:08 the bus comes along a
concrete road; at 43:26, from the erector's head, it stands on the concrete west of the platform, facing the rocket,
its right side a metre south of a track with another track beyond that, a dark saloon car a few metres off its
right side and a dark box-bodied truck beyond the second track, its tail to the camera with white figures on it.

  The bus. A LAZ-695B: the wide air scoop at the back of its roof is that model's (made 1958 to 1964). 9,190 mm long,
    2,500 mm broad, 2,980 mm high on a wheelbase of 4,190 mm (the type's published figures); cream above, a blue band
    under the windows and a blue skirt (the film; "white and blue" in the memoirs); curtains at its windows; three
    hatches in the roof. Its overhangs, the wheels' size, every fitting and the inside are estimated: this one was
    fitted out for the cosmonauts (armchairs, a table: the film), which is not drawn.
  The saloon. Dark, three-box, seen only from above: taken for a GAZ-21 Volga (4,830 by 1,800 by 1,620 mm, 2,700 mm
    wheelbase), the likeliest of the three kinds it could be (a Pobeda is a fastback and a ZIM a metre longer; the
    chief designer was driven in a Volga). Estimated.
  The truck. A dark box body on a two-axle chassis with a bonnet, taken for a GAZ-63 (5,525 by 2,200 mm, 3,300 mm
    wheelbase: the launch roster of 10 April 1961 has a driver for "GAZ-63 No. 34-55-23") carrying a workshop body.
    Estimated; that the roster's truck is the film's is not known, and its number is put on the tail for that reason
    only (the film's figures cannot be read).

Soviet figures, in millimetres. Each vehicle is drawn in its own frame (x ahead from the rear axle, y to its left, z
up from the ground) and set down on the site turned. A vehicle that the flight drives more than once (the bus comes,
backs out and goes) is a nest of nodes, one a drive, and each of its wheels a nest the same way: a `drive` move turns
the node it is given and rolls the wheels named after that node.

Nodes: Bus > Bus_In > Bus_Back > Bus_Away (the body), wheels Bus_Away_Wheel_n > Bus_Back_Wheel_n > Bus_In_Wheel_n (rear, 1 left
and 2 right) and ..._SteerWheel_n (front); Saloon > Saloon_Car (tools/blender/vehicles.py's contract); Truck >
Truck_Lorry, with Truck_Lorry_Wheel_n and Truck_Lorry_SteerWheel_n. See ../site-1.md.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import sitelib
import srlib
import vehicles as cars
from srlib import MeshBuilder, material

from .site import GROUND, MM, Parts, box, stood

# ------------------------------------------------------------------------------ where each stood, and how it went
# Metres east and north of the rocket's axis, and the heading it stood on (degrees anticlockwise from east). The bus's
# place across the tracks is the film's (a metre south of the south track's rail); along them it is derived from the
# film's view, good to some eight metres. The car's and the truck's are read off the same frame against the bus.
BUS_START = (-230.0, -23.35)  # on the road in from the south-west, inside the fences: where the model first has it
BUS_PARKED = (-51.39, -15.2)  # its rear axle, parked: its right side 0.8 m from the south track's rail
SALOON_AT, SALOON_HEADING = (-47.59, -21.31), -45.0
TRUCK_AT, TRUCK_HEADING = (-43.75, -5.4), 180.0


def _local(at, heading: float, pts) -> list[list[float]]:
    """A route given on the site (metres east and north), in the frame of something standing at `at` on `heading`: metres
    ahead of it and to its right, which is what a `drive` move's path is in."""
    h = math.radians(heading)
    f, r = (math.cos(h), math.sin(h)), (math.sin(h), -math.cos(h))
    return [[round((x - at[0]) * f[0] + (y - at[1]) * f[1], 2), round((x - at[0]) * r[0] + (y - at[1]) * r[1], 2)] for x, y in pts]


def routes() -> dict[str, list[list[float]]]:
    """Each drive's route as flight.ts wants it (ahead, right of where it starts, metres): the bus in along the road and
    onto the apron; backing out into the road round the pit; away west. The car round to its right and out; the truck
    west between the tracks, over them where they are painted, and out. Printed by the build: keep flight.ts in step."""
    bx, by = BUS_START
    px, py = BUS_PARKED
    arrive = [(bx + 60, by), (-110, -22.9), (-85.6, -22.6), (-75, -21.6), (-66, -19.0), (-59, -16.2), (px - 4.0, py), (px, py)]
    back_end = (-84.0, -42.0)
    back = [(px - 10.6, py), (-72, -17.5), (-79.5, -21.5), (-83.2, -28), (-84, -36), back_end]
    away = [(-84, -30), (-86, -26), (-91, -23.8), (-100, -23.3), (-300, -24.2), (-480, -25.0), (-512, -25.2)]
    car = [
        (-46.91, -21.85),
        (-46.34, -22.74),
        (-45.98, -25.2),
        (-47.59, -29.09),
        (-51.48, -30.7),
        (-60, -29.5),
        (-74, -24.6),
        (-85.6, -22.9),
        (-110, -23.0),
        (-300, -24.3),
        (-500, -25.2),
        (-540, -25.4),
    ]
    truck = [
        (-70, -5.4),
        (-100, -4.6),
        (-118, -4.6),
        (-128, -7),
        (-136, -13),
        (-143, -19.5),
        (-155, -23),
        (-180, -23.5),
        (-400, -24.6),
        (-500, -25.2),
        (-528, -25.35),
    ]
    return {
        "bus arrives": _local(BUS_START, 0.0, arrive),
        "bus backs out": _local(BUS_PARKED, 0.0, back),
        "bus goes": _local(back_end, 90.0, away),
        "saloon goes": _local(SALOON_AT, SALOON_HEADING, car),
        "truck goes": _local(TRUCK_AT, TRUCK_HEADING, truck),
    }


# ------------------------------------------------------------------------------ what they are made of


def _materials(parts: Parts) -> None:
    m = parts.M
    if "bus-cream" in m:
        return
    m.update(
        {
            # the bus: cream over blue (the film). Enamel, as tools/blender/vehicles.py's paints are
            "bus-cream": material("paint-auto-bus-cream", (0.76, 0.72, 0.6), 0.0, 0.42),
            "bus-blue": material("paint-auto-bus-blue", (0.045, 0.12, 0.3), 0.0, 0.42),
            "truck-green": material("paint-auto-army-green", (0.07, 0.09, 0.055), 0.0, 0.6),
            "curtain": material("curtain-white", (0.8, 0.8, 0.76), 0.0, 0.95),
            "lining": material("interior-lining-grey", (0.42, 0.43, 0.42), 0.0, 0.9),
            "seat": material("upholstery-brown", (0.3, 0.14, 0.1), 0.0, 0.85),
            "tyre": material("rubber", (0.02, 0.02, 0.02), 0.0, 0.9),
            "well": material("wheel-well", (0.012, 0.012, 0.013), 0.0, 1.0),
            "chrome": material("chrome-plate", (0.72, 0.72, 0.71), 0.6, 0.36),
            "glass": material("glass", (0.6, 0.75, 0.8), 0.0, 0.03),
            "headlamp": material("lamp-lens-clear", (0.85, 0.85, 0.8), 0.0, 0.15),
            "taillamp": material("lamp-tail", (0.45, 0.02, 0.02), 0.0, 0.3),
            "numerals": material("paint-numerals-white", (0.8, 0.8, 0.77), 0.0, 0.6),
        }
    )


# ------------------------------------------------------------------------------ nodes


def nest(parts: Parts, names: list[str], at, heading: float, **props) -> str:
    """A nest of nodes for something driven more than once, the first at `at` on the site (metres; z the ground) turned
    to `heading`. Everything under it is drawn in its own frame. Returns the innermost, which carries the meshes."""
    top = parts.node(names[0], None, (0.0, 0.0, 0.0), **props)
    top.location = Vector(at)
    top.rotation_euler = (0.0, 0.0, math.radians(heading))
    for outer, inner in zip(names, names[1:]):
        parts.node(inner, outer, (0.0, 0.0, 0.0))
    return names[-1]


def wheel(
    parts: Parts, names: list[str], which: str, k: int, hub, r: float, w: float, side: int, dual: bool = False, paint: str = "truck-green"
) -> None:
    """A road wheel on its hub (the vehicle's frame, metres), its axle across the vehicle: a nest of nodes, one for each
    of the vehicle's own, named `<node>_<which>_<k>`: the last drive's outermost and the first's innermost, which carries the tyre
    and the wheel (so a wheel is steered about an upright that the drives before have not rolled over). `side` is +1 on the
    left. A `dual` is two tyres on one hub."""
    parent = names[-1]
    for name in reversed(names):  # (each on the hub: a nest's inner nodes sit on its outer one)
        node = f"{name}_{which}_{k}"
        parts.node(node, parent, hub)
        parent = node
    tyre, rim = parts(node, "tyre", True), parts(node, paint, True)
    half = w / 2
    # the tyre's section (radius, across from its middle) and the wheel inside it, dished outward
    section = [(r * 0.62, -half * 0.8), (r * 0.9, -half), (r, -half * 0.6), (r, half * 0.6), (r * 0.9, half), (r * 0.62, half * 0.8)]
    disc = [(r * 0.64, half * 0.75), (r * 0.6, half * 0.75), (r * 0.5, half * 0.1), (r * 0.26, half * 0.05), (r * 0.2, half * 0.3), (0.0, half * 0.2)]
    segs = 20 if sitelib.fine() else 12
    for off in (-(half + 0.02), half + 0.02) if dual else (0.0,):
        m = Matrix.Translation(Vector(hub) + Vector((0.0, off, 0.0))) @ Matrix.Rotation(-side * math.pi / 2, 4, "X")
        tyre.lathe(section, segs, matrix=m)
        rim.lathe(disc, segs, matrix=m)
        rim.lathe([(0.0, -half * 0.5), (r * 0.6, -half * 0.75), (r * 0.64, -half * 0.75)], segs, matrix=m)  # its back


def _inside_box(mb: MeshBuilder, lo, hi, open_side: str | None = None) -> None:
    """A box seen from inside: a wheel's well, a cab's tub. `open_side` ("+y", "-y", "+z") is left off."""
    x0, y0, z0 = lo
    x1, y1, z1 = hi
    c = [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0), (x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)]
    faces = {"-z": (0, 1, 2, 3), "+z": (7, 6, 5, 4), "-y": (0, 4, 5, 1), "+y": (2, 6, 7, 3), "-x": (0, 3, 7, 4), "+x": (1, 5, 6, 2)}
    mb.add(c, [f for key, f in faces.items() if key != open_side])


# ------------------------------------------------------------------------------ the bus

BUS = dict(length=9190.0, width=2500.0, height=2980.0, wheelbase=4190.0)  # the LAZ-695's published figures, mm
BUS_REAR = 2700.0  # behind the rear axle, mm (estimated: the film's side view; the rest of the length is ahead of the front one)
BUS_TYRE = (525.0, 280.0)  # radius and breadth, mm (estimated: a 10.00-20)
BUS_TRACK = (2116.0, 1650.0)  # front, rear (the type's figures as remembered: estimated)
# heights over the ground, mm (estimated off the film): the skirt's foot, the blue skirt's top, the band under the
# windows, the windows' foot and head
BUS_Z = dict(foot=340.0, skirt=980.0, band=1400.0, sill=1500.0, head=2330.0)


def _outline(x0: float, x1: float, hw: float, r_rear: float, r_front: float, marks) -> list[tuple[float, float]]:
    """A body's plan (the vehicle's frame, any unit): straight sides, rounded ends, anticlockwise from above, starting at
    the rear's middle. `marks` are stations along the sides that must be points of it (a pillar's edge, a wheel arch)."""
    pts = []
    n = 6 if sitelib.fine() else 3

    # (each point carries its outward normal: a plan drawn in along normals taken from its neighbours folds over itself
    # where a close pair of points meets a corner)
    def corner(cx, cy, r, a0):
        angles = [a0 + math.pi / 2 * k / n for k in range(n + 1)]
        return [(cx + r * math.cos(a), cy + r * math.sin(a), math.cos(a), math.sin(a)) for a in angles]

    xs = sorted({x for x in marks if x0 + r_rear < x < x1 - r_front})
    pts.append((x0, 0.0, -1.0, 0.0))
    pts += corner(x0 + r_rear, -hw + r_rear, r_rear, math.pi)  # rear right
    pts += [(x, -hw, 0.0, -1.0) for x in xs]
    pts += corner(x1 - r_front, -hw + r_front, r_front, -math.pi / 2)  # front right
    pts += [(x1, -0.04, 1.0, 0.0), (x1, 0.04, 1.0, 0.0)]  # (a post's breadth in the middle of the front)
    pts += corner(x1 - r_front, hw - r_front, r_front, 0.0)  # front left
    pts += [(x, hw, 0.0, 1.0) for x in reversed(xs)]
    pts += corner(x0 + r_rear, hw - r_rear, r_rear, math.pi / 2)  # rear left
    out = []
    for p in pts:
        if not out or math.hypot(p[0] - out[-1][0], p[1] - out[-1][1]) > 1e-6:
            out.append(p)
    return out


def bus(parts: Parts) -> None:
    _materials(parts)
    names = ["Bus", "Bus_In", "Bus_Back", "Bus_Away"]  # the part, which stays; and a node to each of its three drives
    node = nest(
        parts,
        names,
        (*BUS_START, GROUND),
        0.0,
        label="The cosmonauts' bus",
        about="A LAZ-695B, cream over blue: it brought the pilot, his back-up and their party to the pad at about 06:50.",
    )
    L, W, H, wb = (BUS[k] * MM for k in ("length", "width", "height", "wheelbase"))
    x0, x1, hw = -BUS_REAR * MM, L - BUS_REAR * MM, W / 2
    z = {k: v * MM for k, v in BUS_Z.items()}
    R, tw = BUS_TYRE[0] * MM, BUS_TYRE[1] * MM
    arch = R + 0.11
    cream, blue, glass = parts(node, "bus-cream", True), parts(node, "bus-blue", True), parts(node, "glass")
    lining, curtain, dark = parts(node, "lining"), parts(node, "curtain"), parts(node, "well")
    # the side windows (the film's side view): a quarter light at the back, four large ones with their curtains drawn,
    # one more over the front wheel, then the door's, ahead of the front axle, where the pilot stepped down
    door = (x1 - 1.62, x1 - 0.97)
    pillars = [x0 + 1.3 + 1.25 * i for i in range(5)] + [door[0] - 0.035, door[1] - 0.07]
    fine = sitelib.fine()
    step = 0.09 if fine else 0.22
    marks = set(pillars) | {p + 0.07 for p in pillars} | set(door)
    for ax in (0.0, wb):
        k = int(arch / step)
        marks |= {ax + step * i for i in range(-k, k + 1)} | {ax - arch, ax + arch}
    plan = _outline(x0, x1, hw, 0.75, 0.95, marks)
    n = len(plan)

    def at(i: int, inset: float, zz: float) -> tuple[float, float, float]:
        x, y, nx, ny = plan[i]
        return (x - nx * inset, y - ny * inset, zz)

    def foot(i: int) -> float:
        """The body's lower edge at a point of its plan: the skirt's foot, lifted over a wheel on the sides."""
        x, y = plan[i][:2]
        if abs(abs(y) - hw) > 1e-6:
            return z["foot"]
        for ax in (0.0, wb):
            if abs(x - ax) < arch:
                return max(z["foot"], R + math.sqrt(arch**2 - (x - ax) ** 2))
        return z["foot"]

    def band(mb, za, zb, inset_a=0.0, inset_b=0.0, only=None, flip=False, lifted=False) -> None:
        for i in range(n):
            j = (i + 1) % n
            if only and not only(i, j):
                continue
            a0 = max(za, foot(i)) if lifted else za
            a1 = max(za, foot(j)) if lifted else za
            if a0 >= zb and a1 >= zb:
                continue
            quad = [at(i, inset_a, min(a0, zb)), at(j, inset_a, min(a1, zb)), at(j, inset_b, zb), at(i, inset_b, zb)]
            mb.add(quad[::-1] if flip else quad, [(0, 1, 2, 3)])

    # ---- the body: a blue skirt, a cream band, the blue stripe under the windows (a ridge), the window band, the roof
    band(blue, z["foot"], z["skirt"], lifted=True)
    band(cream, z["skirt"], z["band"], lifted=True)
    band(blue, z["band"], z["band"] + 0.05, 0.0, -0.012)
    band(blue, z["band"] + 0.05, z["sill"], -0.012, 0.0)
    lean = 0.07  # the window band leans in toward the roof

    def glazed(i: int, j: int) -> bool:
        """Whether the piece of the window band between two points of the plan is glass."""
        xm, ym = (plan[i][0] + plan[j][0]) / 2, (plan[i][1] + plan[j][1]) / 2
        if abs(ym) < hw - 0.5 and xm < x0 + 0.3:
            return True  # the back window, across the rear between its corners
        if xm > x1 - 0.9:
            return abs(ym) > 0.06  # the windscreen, round the front in two halves with a post between
        if abs(abs(ym) - hw) > 1e-3:
            return False  # the rear corners
        return not any(p <= xm <= p + 0.07 for p in pillars) and xm > pillars[0]

    band(cream, z["sill"], z["head"], 0.0, lean, only=lambda i, j: not glazed(i, j))
    band(glass, z["sill"] + 0.04, z["head"] - 0.05, 0.003, lean * 0.94 + 0.003, only=glazed)
    band(cream, z["sill"], z["sill"] + 0.04, 0.0, lean * 0.05, only=glazed)
    band(cream, z["head"] - 0.05, z["head"], lean * 0.94, lean, only=glazed)
    # the roof: rings drawn in and up from the windows' head to a flat crown
    rings = 7 if fine else 3
    crown = H - z["head"]
    last = (lean, z["head"])
    for k in range(1, rings + 1):
        t = math.pi / 2 * k / rings
        nxt = (lean + 0.62 * (1 - math.cos(t)), z["head"] + crown * math.sin(t))
        for i in range(n):
            j = (i + 1) % n
            cream.add([at(i, last[0], last[1]), at(j, last[0], last[1]), at(j, nxt[0], nxt[1]), at(i, nxt[0], nxt[1])], [(0, 1, 2, 3)])
        last = nxt
    cream.add([at(i, last[0], last[1]) for i in range(n)], [tuple(range(n))])
    # the underside, and the wells the wheels stand in
    parts(node, "well").add([(p[0], p[1], z["foot"] + 0.02) for p in plan], [tuple(reversed(range(n)))])
    for ax, track in ((0.0, BUS_TRACK[1] * MM), (wb, BUS_TRACK[0] * MM)):
        for s in (-1, 1):
            ya, yb = sorted((s * (hw - 0.012), s * (track / 2 - tw - 0.12)))
            _inside_box(dark, (ax - arch, ya, z["foot"]), (ax + arch, yb, R + arch + 0.03), "+y" if s > 0 else "-y")

    # ---- the inside, seen through the glass: a floor, a lining to the walls and the roof, curtains at the side windows,
    # the driver's place, a few seats. (This bus was fitted out for the cosmonauts, with armchairs and a table: not drawn.)
    floor_z = 0.92
    lining.add([at(i, 0.05, floor_z) for i in range(n)], [tuple(range(n))])
    band(lining, floor_z, z["sill"], 0.05, 0.05, flip=True)
    band(lining, z["sill"], z["head"], 0.05, 0.05 + lean, only=lambda i, j: not glazed(i, j), flip=True)
    band(lining, z["head"], H - 0.12, 0.05 + lean, 0.45, flip=True)
    lining.add([at(i, 0.45, H - 0.12) for i in range(n)], [tuple(reversed(range(n)))])
    band(
        curtain,
        z["sill"] + 0.05,
        z["head"] - 0.06,
        0.06,
        0.06 + lean * 0.9,
        only=lambda i, j: (
            glazed(i, j) and abs(abs((plan[i][1] + plan[j][1]) / 2) - hw) < 1e-3 and pillars[0] < (plan[i][0] + plan[j][0]) / 2 < pillars[4]
        ),
    )
    seats = parts(node, "seat")
    for row in range(4 if fine else 0):
        xs = x0 + 2.2 + row * 0.95
        for s in (-1, 1):
            ya, yb = sorted((s * 0.3, s * (hw - 0.16)))
            box(seats, (xs, ya, floor_z), (xs + 0.45, yb, floor_z + 0.42))
            box(seats, (xs - 0.1, ya, floor_z + 0.3), (xs + 0.02, yb, floor_z + 1.0))
    if fine:  # the driver's seat on the left, the wheel on its column, the hump over the front
        box(seats, (x1 - 1.75, 0.35, floor_z), (x1 - 1.3, 0.9, floor_z + 0.45))
        box(seats, (x1 - 1.85, 0.35, floor_z + 0.3), (x1 - 1.73, 0.9, floor_z + 1.05))
        box(dark, (x1 - 0.95, -hw + 0.3, floor_z), (x1 - 0.45, hw - 0.3, floor_z + 0.5))
        col = Matrix.Translation((x1 - 1.0, 0.62, floor_z + 0.78)) @ Matrix.Rotation(math.radians(-62), 4, "Y")
        dark.lathe([(0.0, -0.45), (0.022, -0.45), (0.022, 0.0), (0.0, 0.0)], 6, matrix=col)
        dark.lathe([(0.2, -0.015), (0.235, -0.015), (0.235, 0.015), (0.2, 0.015), (0.2, -0.015)], 14, matrix=col)

    # ---- what is hung on it
    chrome = parts(node, "chrome", True)

    def strip(mb, i0: int, i1: int, za: float, zb: float, out: float) -> None:
        """A bar round part of the plan, standing `out` proud between two heights."""
        idx = [k % n for k in range(i0, i1 + 1)]
        loops = [[at(i, 0.02, za), at(i, -out, za), at(i, -out, zb), at(i, 0.02, zb)] for i in idx]
        sitelib.solid(mb, loops)

    front = [i for i in range(n) if plan[i][0] > x1 - 1.0]
    rear = [i for i in range(n) if plan[i][0] < x0 + 0.8]
    strip(chrome, front[0], front[-1], 0.44, 0.56, 0.07)
    rear_run = sorted(rear, key=lambda i: (i + n // 2) % n)  # (the rear's points straddle the plan's start)
    strip(chrome, rear_run[0], rear_run[0] + len(rear_run) - 1, 0.44, 0.56, 0.07)
    lamps, tails = parts(node, "headlamp", True), parts(node, "taillamp", True)
    for s in (-1, 1):
        for dy, zz, r, back in ((0.78, 0.86, 0.105, 0.135), (0.5, 0.86, 0.07, 0.025)):
            m = Matrix.Translation((x1 - back, s * dy, zz)) @ Matrix.Rotation(math.radians(90), 4, "Y")
            lamps.lathe([(0.0, -0.02), (r, -0.02), (r * 0.8, 0.03), (0.0, 0.05)], 12, matrix=m)
            chrome.lathe([(r, -0.04), (r + 0.02, -0.04), (r + 0.02, 0.012), (r, 0.012)], 12, matrix=m)
        tails.lathe(
            [(0.0, -0.02), (0.06, -0.02), (0.045, 0.02), (0.0, 0.035)],
            8,
            matrix=Matrix.Translation((x0 + 0.045, s * 0.75, 0.9)) @ Matrix.Rotation(math.radians(-90), 4, "Y"),
        )
    # the roof's furniture: the route board over the windscreen, three hatches, the air scoop at the back
    box(cream, (x1 - 1.05, -0.5, H - 0.36), (x1 - 0.86, 0.5, H - 0.1))
    box(dark, (x1 - 0.862, -0.42, H - 0.31), (x1 - 0.85, 0.42, H - 0.15))
    for xc in (x0 + 2.6, x0 + 4.6, x0 + 6.4):
        sitelib.solid(
            cream, [[(xc - 0.4, y, H - 0.02), (xc + 0.4, y, H - 0.02), (xc + 0.36, y, H + 0.05), (xc - 0.36, y, H + 0.05)] for y in (-0.3, 0.3)]
        )
    scoop = [
        [(x0 + 0.5, y, H - 0.7), (x0 + 1.3, y, H - 0.45), (x0 + 1.3, y, H + 0.16), (x0 + 0.95, y, H + 0.2), (x0 + 0.5, y, H + 0.02)]
        for y in (-0.7, 0.7)
    ]
    sitelib.solid(cream, scoop)
    box(dark, (x0 + 1.295, -0.62, H + 0.0), (x0 + 1.31, 0.62, H + 0.13))
    # the doors' edges: the passengers' in the right side, the driver's in the left
    for s, (da, db) in ((-1, door), (1, (x1 - 1.95, x1 - 1.25))):
        for xe in (da, db):
            ya, yb = sorted((s * (hw - 0.01), s * (hw + 0.012)))
            box(dark, (xe - 0.012, ya, z["foot"] + 0.12), (xe + 0.012, yb, z["sill"] - 0.02))
        ya, yb = sorted((s * (hw - 0.01), s * (hw + 0.03)))
        box(chrome, (da + 0.12, ya, 1.18), (da + 0.26, yb, 1.21))  # a handle
    # the wheels: two a side behind on one hub, one a side ahead
    for k, s in ((1, 1), (2, -1)):
        wheel(parts, names[1:], "Wheel", k, (0.0, s * BUS_TRACK[1] * MM / 2, R), R, tw, s, dual=True, paint="bus-blue")
        wheel(parts, names[1:], "SteerWheel", k, (wb, s * (BUS_TRACK[0] * MM / 2), R), R, tw, s, paint="bus-blue")


# ------------------------------------------------------------------------------ the saloon

IN_MM = 1 / 25.4  # tools/blender/vehicles.py draws in inches: a figure in millimetres is divided once


def volga() -> cars.Car:
    """A GAZ-21 Volga of 1958 to 1962: 4,830 mm long, 1,800 broad, 1,620 high on a 2,700 mm wheelbase, 1,410 mm track,
    6.70-15 tyres (the type's published figures); its overhangs and every line of its body estimated, read off
    photographs of the type. Black, as an official car was."""
    k = IN_MM
    wb, nose, length = 2700 * k, 838 * k, 4830 * k
    x1 = wb + nose
    x0 = x1 - length
    return cars.Car(
        what="GAZ-21 Volga, 1958-62",
        about=(
            "A dark saloon car stood beside the bus in the film's view from the erector. Its kind cannot be made out: it is taken for a "
            "GAZ-21 Volga, the likeliest of the three it could be, in an official car's black. Estimated."
        ),
        mass=1460 / 0.45359237,
        turning=12.6 / 0.3048,
        wheelbase=wb,
        length=length,
        width=1800 * k,
        height=1620 * k,
        nose=nose,
        track=1410 * k,
        tyre=(357 * k, 6.7, 7.5),
        top=[(x0, 33.0), (x0 + 3, 36.5), (-8, 39.5), (70, 41.5), (128, 41.0), (x1 - 2, 38.0), (x1, 33.5)],
        shoulder=5.0,
        crown=2.4,
        cabin=(83.0, 71.0, 3.0, -12.0),
        pillars=(37.0,),
        sail=5.0,
        bow=4.0,
        wrap=3.0,
        hood=1.5,
        doors=(79.0, 37.0, -3.0),
        lamp_at=(0.0, 0.0, 3.5),
        tail_at=(0.0, 30.0, 2.6, 1.6),
        grille=(24.0, 17.0, 26.5),
        bumper=(14.0, 0.0),
        spear=[(x1 - 9, 33.5), (x0 + 6, 31.0)],
        seats=(60.0, 27.0),
        cap_r=6.5,
        paint="black",
    )


def saloon(parts: Parts) -> None:
    _materials(parts)
    top = parts.node(
        "Saloon",
        None,
        (0.0, 0.0, 0.0),
        label="Saloon car",
        about="A dark saloon car beside the bus in the film's view from the erector: taken for a GAZ-21 Volga. Estimated.",
    )
    top.location = Vector((*SALOON_AT, GROUND))
    top.rotation_euler = (0.0, 0.0, math.radians(SALOON_HEADING))
    built = volga().build("Saloon_Car", top, (0.0, 0.0, 0.0), 0.0)
    print(f"  Saloon_Car: {built['triangles']:,} triangles")


# ------------------------------------------------------------------------------ the truck

TRUCK = dict(length=5525.0, width=2200.0, wheelbase=3300.0, cab=2245.0)  # the GAZ-63's published figures, mm
TRUCK_NOSE = 1050.0  # ahead of the front axle, mm (estimated)
TRUCK_TYRE = (500.0, 270.0)  # (estimated: a 10.00-18)
TRUCK_TRACK = 1590.0
# the body it carries, mm (estimated off the film: a box as broad as the truck and half as long again as its cab and
# bonnet, a low arched roof): from behind the cab back past the rear axle; its floor, its eave and its crown over the ground
BODY = dict(front=1650.0, back=-1750.0, width=2250.0, floor=1150.0, eave=2750.0, crown=2950.0)
NUMBER = "34-55-23"  # the launch roster's GAZ-63 (10 April 1961): that it is this truck is not known


def truck(parts: Parts) -> None:
    _materials(parts)
    names = ["Truck", "Truck_Lorry"]
    node = nest(
        parts,
        names,
        (*TRUCK_AT, GROUND),
        TRUCK_HEADING,
        label="Box-bodied truck",
        about=(
            "A dark truck with a box body stood north of the tracks in the film's view from the erector, its tail to the rocket, white "
            "figures on it. It is taken for a GAZ-63 with a workshop body: the launch roster has a driver for one. Estimated."
        ),
    )
    wb = TRUCK["wheelbase"] * MM
    R, tw = TRUCK_TYRE[0] * MM, TRUCK_TYRE[1] * MM
    green, dark, glass = parts(node, "truck-green", True), parts(node, "well"), parts(node, "glass")
    fine = sitelib.fine()
    # the frame: two rails from the bumper to the tail, the axles, a bumper
    for s in (-1, 1):
        box(dark, (BODY["back"] * MM + 0.1, s * 0.42 - 0.04, 0.72), (wb + 0.9, s * 0.42 + 0.04, 0.9))
    for ax in (0.0, wb):
        dark.tube(Vector((ax, -TRUCK_TRACK * MM / 2 + 0.1, R)), Vector((ax, TRUCK_TRACK * MM / 2 - 0.1, R)), 0.07, 8)
        dark.lathe(
            [(0.0, -0.17), (0.16, -0.1), (0.16, 0.1), (0.0, 0.17)],
            8,
            matrix=Matrix.Translation((ax, 0.12, R)) @ Matrix.Rotation(math.radians(90), 4, "Y"),
        )
    box(green, (wb + TRUCK_NOSE * MM - 0.1, -0.95, 0.62), (wb + TRUCK_NOSE * MM, 0.95, 0.76))
    # the bonnet and the cab: one skin from the grille back to the cab's rear wall, up to the windows' sill
    xs = [wb + 0.86, wb + 0.7, wb - 0.35, wb - 0.5, wb - 1.5]
    loops = [
        sitelib.arch(xs[0], 0.36, 0.8, 1.42, 0.12),
        sitelib.arch(xs[1], 0.44, 0.8, 1.5, 0.18),
        sitelib.arch(xs[2], 0.62, 0.8, 1.6, 0.2),
        sitelib.arch(xs[3], 0.92, 0.8, 1.62, 0.1),
        sitelib.arch(xs[4], 0.92, 0.8, 1.62, 0.1),
    ]
    sitelib.solid(green, loops)
    # the cab above the sill: four posts, a roof, glass all round, and what is behind it
    sill, top, cab_r = 1.62, TRUCK["cab"] * MM, 0.9
    xa, xb = wb - 1.5, wb - 0.5
    for x, y in ((xa + 0.03, cab_r - 0.03), (xa + 0.03, -cab_r + 0.03), (xb + 0.12, cab_r - 0.03), (xb + 0.12, -cab_r + 0.03)):
        post_top = (x - (0.2 if x > xa + 0.5 else 0.0), y * 0.96, top - 0.1)
        sitelib.beam(green, (x, y, sill - 0.02), post_top, 0.07)
    sitelib.solid(green, [sitelib.arch(xa - 0.02, cab_r * 0.98, top - 0.12, top, 0.08), sitelib.arch(xb - 0.05, cab_r * 0.98, top - 0.12, top, 0.08)])
    glass.add(
        [
            (xb + 0.12, -cab_r + 0.06, sill),
            (xb + 0.12, cab_r - 0.06, sill),
            (xb - 0.08, cab_r * 0.96 - 0.06, top - 0.12),
            (xb - 0.08, -cab_r * 0.96 + 0.06, top - 0.12),
        ],
        [(0, 1, 2, 3)],
    )
    glass.add(
        [
            (xa + 0.03, cab_r - 0.06, sill + 0.1),
            (xa + 0.03, -cab_r + 0.06, sill + 0.1),
            (xa + 0.03, -cab_r * 0.96 + 0.06, top - 0.14),
            (xa + 0.03, cab_r * 0.96 - 0.06, top - 0.14),
        ],
        [(0, 1, 2, 3)],
    )
    for s in (-1, 1):
        quad = [
            (xa + 0.07, s * (cab_r - 0.03), sill),
            (xb + 0.08, s * (cab_r - 0.03), sill),
            (xb - 0.1, s * (cab_r * 0.96 - 0.03), top - 0.12),
            (xa + 0.07, s * (cab_r * 0.96 - 0.03), top - 0.12),
        ]
        glass.add(quad if s < 0 else quad[::-1], [(0, 1, 2, 3)])
    _inside_box(dark, (xa + 0.04, -cab_r + 0.05, 0.95), (xb + 0.05, cab_r - 0.05, sill + 0.01), "+z")
    seat = parts(node, "seat")
    box(seat, (xa + 0.1, -cab_r + 0.1, 0.96), (xa + 0.55, cab_r - 0.1, 1.38))
    box(seat, (xa + 0.06, -cab_r + 0.1, 1.3), (xa + 0.2, cab_r - 0.1, 1.9))
    if fine:
        col = Matrix.Translation((xb - 0.25, 0.45, 1.55)) @ Matrix.Rotation(math.radians(-55), 4, "Y")
        dark.lathe([(0.0, -0.5), (0.02, -0.5), (0.02, 0.0), (0.0, 0.0)], 6, matrix=col)
        dark.lathe([(0.19, -0.015), (0.22, -0.015), (0.22, 0.015), (0.19, 0.015), (0.19, -0.015)], 12, matrix=col)
        for y in (-0.24, -0.12, 0.0, 0.12, 0.24):  # the grille's bars, standing on the nose
            sitelib.solid(
                dark, [[(wb + 0.855, y + dy, 0.9), (wb + 0.885, y, 0.9), (wb + 0.875, y, 1.34), (wb + 0.855, y + dy, 1.34)] for dy in (-0.03, 0.03)]
            )
    # the wings over the front wheels, a lamp on each, and the steps
    lamps = parts(node, "headlamp", True)
    for s in (-1, 1):
        pts = [(wb + (R + 0.14) * math.cos(a), R + (R + 0.14) * math.sin(a) * 0.92) for a in (math.radians(t) for t in range(200, -31, -21))]
        ya, yb = sorted((s * 0.5, s * 1.08))
        sitelib.solid(green, [[(px, ya, pz), (px, yb, pz), (px, yb, pz + 0.05), (px, ya, pz + 0.05)] for px, pz in pts])
        lamps.lathe(
            [(0.0, -0.03), (0.09, -0.03), (0.07, 0.02), (0.0, 0.04)],
            10,
            matrix=Matrix.Translation((wb + 0.72, s * 0.72, 1.22)) @ Matrix.Rotation(math.radians(90), 4, "Y"),
        )
        green.lathe(
            [(0.0, -0.2), (0.1, -0.14), (0.105, -0.03), (0.0, -0.03)],
            10,
            matrix=Matrix.Translation((wb + 0.72, s * 0.72, 1.22)) @ Matrix.Rotation(math.radians(90), 4, "Y"),
        )
        ya, yb = sorted((s * 0.9, s * 1.08))
        box(dark, (xa + 0.1, ya, 0.62), (xb - 0.1, yb, 0.66))
    # the box body: a floor, plain sides, a low arched roof; two doors in its tail with the number on them, a small
    # window in each side, two vents on the roof
    b = {k: v * MM for k, v in BODY.items()}
    hwb = b["width"] / 2
    rise = b["crown"] - b["eave"]

    def section(x: float) -> list:
        pts = [(x, hwb, b["floor"]), (x, hwb, b["eave"])]
        pts += [(x, hwb * math.cos(a), b["eave"] + rise * math.sin(a)) for a in (math.radians(t) for t in (20, 45, 70, 90, 110, 135, 160))]
        return [*pts, (x, -hwb, b["eave"]), (x, -hwb, b["floor"])]

    sitelib.solid(green, [section(b["back"]), section(b["front"])])
    box(dark, (b["back"] + 0.05, -hwb + 0.1, b["floor"] - 0.14), (b["front"] - 0.05, hwb - 0.1, b["floor"] + 0.01))
    void = parts(node, "void")
    for s in (-1, 1):
        ya, yb = sorted((s * (hwb - 0.01), s * (hwb + 0.025)))
        box(dark, (0.3, ya, 2.0), (0.9, yb, 2.45))
        ya, yb = sorted((s * (hwb + 0.01), s * (hwb + 0.035)))
        box(void, (0.35, ya, 2.05), (0.85, yb, 2.4))
        ya, yb = sorted((s * 0.03, s * (hwb - 0.12)))
        box(green, (b["back"] - 0.035, ya, b["floor"] + 0.08), (b["back"] + 0.01, yb, b["eave"] - 0.05))  # a door leaf
        if fine:
            for zc in (b["floor"] + 0.4, b["eave"] - 0.4):
                ya, yb = sorted((s * (hwb - 0.2), s * (hwb - 0.1)))
                box(dark, (b["back"] - 0.055, ya, zc - 0.05), (b["back"] - 0.03, yb, zc + 0.05))
    for xc in (b["back"] + 0.9, b["front"] - 0.9):
        dark.lathe([(0.0, -0.05), (0.16, -0.05), (0.16, 0.1), (0.2, 0.12), (0.0, 0.16)], 8, matrix=Matrix.Translation((xc, 0.0, b["crown"])))
    box(dark, (b["back"] - 0.3, -0.35, b["floor"] - 0.45), (b["back"] - 0.02, 0.35, b["floor"] - 0.4))  # a step under the doors
    if fine:
        sitelib.lettering(parts(node, "numerals"), NUMBER, 0.2, (b["back"] - 0.045, 0.0, b["floor"] + 0.75), (0, -1, 0), (0, 0, 1), srlib.load_font())
    tails = parts(node, "taillamp", True)
    tails.lathe(
        [(0.0, -0.02), (0.05, -0.02), (0.04, 0.015), (0.0, 0.03)],
        8,
        matrix=Matrix.Translation((b["back"] + 0.02, -0.6, 1.0)) @ Matrix.Rotation(math.radians(-90), 4, "Y"),
    )
    for k, s in ((1, 1), (2, -1)):
        wheel(parts, names[1:], "Wheel", k, (0.0, s * TRUCK_TRACK * MM / 2, R), R, tw, s)
        wheel(parts, names[1:], "SteerWheel", k, (wb, s * TRUCK_TRACK * MM / 2, R), R, tw, s)


def build(parts: Parts) -> None:
    if not stood(
        "On the apron: the cosmonauts' bus, a saloon car, a box-bodied truck",
        since="1961-04-12",
        until="1961-04-12",
        confidence="documented",
        source="the film of the morning («Первый рейс к звёздам», ЦСДФ 1961, 43:08 and 43:26); Golovanov, «Королёв: факты и мифы», p. 645; "
        "the launch roster of 10 April 1961 («Первый пилотируемый полёт», 2011, doc 104). The bus's type is the film's; the car's and "
        "the truck's are estimated",
    ):
        return
    bus(parts)
    saloon(parts)
    truck(parts)
    print("  routes for flight.ts (metres ahead and to the right of where each drive starts):")
    for name, path in routes().items():
        print(f"    {name}: {path}")


def summary() -> str:
    truck_length = (TRUCK_NOSE + TRUCK["wheelbase"] - BODY["back"]) * MM
    return f"bus {BUS['length'] * MM:.2f} by {BUS['width'] * MM:.2f} by {BUS['height'] * MM:.2f} m, saloon 4.83 m, truck {truck_length:.2f} m"
