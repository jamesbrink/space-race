"""The Gemini crew station as spacecraft 3 flew it: the pressure vessel, the two ejection seats, the panels of
SEDR 300's Figure 3-5 sheets 1 and 2 ("S/C 3"), the controls and the stowage.

gemini_spacecraft.build_crew_station calls build(). Dimensions are inches; a point is (inches toward the ship's top,
inches to the crew's right, McDonnell's Z station). The men sit with their backs to the large pressure bulkhead and
their heads toward the hatches, facing the nose.

Nothing read gives the pressure vessel's own dimensions, or a seat's place in it. The vessel is laid out here so that
what is documented fits: the seats at 12 degrees outboard and 8 forward on the large bulkhead with a helmet clear of
the hatch, the panels at the sizes Figure 3-5 scales to, the hatches' sills, and a seated eye that looks along the
trough through its window. ./gemini-spacecraft.md, "Crew station", says what each figure rests on.

What the viewer is promised is what the Mercury cabin promises (../../mercury/vehicles/mercury-cabin.md): `Seat_...`
empties at the eyes, `Gauge_...` needles and bars with their scales in their extras, `Tele_...` lamps, `Ctl_...`
controls. The drawing and the instruments' parts are that module's.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

import mercury_cabin as mc
from gemini_shell import CABIN, HATCH_OUT, IN, WALL, WINDOWS, Z0, Z_ACCESS, Z_HATCH_FWD, Z_SILL, depth, hatch_in, zz
from mercury_cabin import Sheet, plane, pointer, rigid, round_dial, soft, telelight, toggle
from mercury_capsule import chamfered
from srlib import TAU, MeshBuilder, deg, frame, interior, prof

# ------------------------------------------------------------------ the layout (all estimated but the seats' cant)

SEAT_CANT = (deg(12), deg(8))  # the seats: outboard, and forward (SEDR 300, p. 3-3): documented
SEAT_AT = (-12.0, 13.2, 117.0)  # a seat's reference point (the top of its pan, at the front of its back): toward the top, off the middle, station
SEAT = dict(wide=22.0, top=40.5, drop=10.0, deep=19.0)  # the back's width; pan to the shroud's top; pan to the stirrups' foot; the bucket's depth
EYE = (0.0, 6.5, 33.5)  # a seated man's eyes in his seat's own frame (to his right, the way he faces, up his back): on the egress kit
WALLS = ((108.0, 28.4), (131.0, 26.8), (150.8, 23.5), (160.2, 17.0))  # the vessel's flat sides: station, and half the width between them
FLOOR = (-29.0, 17.5)  # the floor's deepest, and half the width of its flat
GEAR_BAY = -17.0  # below this the vessel's sides are let in for the landing gear's wells
SKIN = 2.6  # the cone's skin to the vessel where it follows it
PANEL_TILT = deg(30)  # the main panels lean back from square to the ship's axis, their tops forward
PANEL_FOOT = (3.0, 141.5)  # their lower edge: toward the top, and its station
PANEL_WRAP = deg(14)  # each man's panel is turned toward him
PANEL_DROOP = deg(12.6)  # and its lower edge falls away outboard by this much (Figure 3-5)
CENTRE = (11.2, 18.5)  # the centre panel: wide, tall
PEDESTAL = (12.5, 5.8, deg(65))  # the pedestal under it: long, wide at its foot, and how far it leans back
# each man's panel as Figure 3-5 draws the command pilot's: inches from its outboard lower corner
OUTLINE = [(0, 0), (14.5, 0), (17.0, 12.45), (14.2, 12.74), (13.4, 9.55), (8.55, 10.41), (3.77, 10.5), (1.27, 9.09), (0.43, 7.76)]
OUTLINE_P = [(0, 0), (14.5, 0), (16.6, 10.6), (12.0, 11.3), (8.55, 10.41), (3.77, 10.5), (1.27, 9.09), (0.43, 7.76)]

GREY = (0.33, 0.35, 0.37)


def V(top: float, right: float, station: float) -> Vector:
    """A point of the ship in the model's axes, inches."""
    return Vector((top, right, station - Z0))


def inner(theta: float, z: float) -> float:
    """The cabin's roof at an angle and a height: the hatch's inner skin, let down under the trough; forward of the
    hatches, the vessel's own roof under the cabin's frame."""
    return CABIN.r(z) - max(WALL, depth(theta, z) + (0.9 if z < zz(Z_HATCH_FWD) - 0.1 else 2.3))


class Station(mc.Cabin):
    """The Mercury cabin's builder, with nothing to say about how near the wall things are: this vessel is not a cone."""

    def room(self, p: Vector) -> float:
        return 99.0


# ------------------------------------------------------------------ the pressure vessel


def half_width(station: float) -> float:
    for (s0, w0), (s1, w1) in zip(WALLS, WALLS[1:]):
        if station <= s1:
            return w0 + (w1 - w0) * (station - s0) / (s1 - s0)
    return WALLS[-1][1]


def section(station: float) -> list[tuple[float, float]]:
    """Half the vessel's outline at a station, as (toward the top, to the right) from the hinge down to the middle of
    the floor: the sill under the hinge, the shoulder, the flat side, the corner let in where the cone is close, the
    floor."""
    z = zz(station)
    w = half_width(station)
    r = CABIN.r(z) - SKIN
    hinge = (inner(HATCH_OUT, z) * math.cos(HATCH_OUT), inner(HATCH_OUT, z) * math.sin(HATCH_OUT))
    floor = max(FLOOR[0], -math.sqrt(max(1.0, r * r - FLOOR[1] ** 2)))
    low = max(floor, GEAR_BAY, -math.sqrt(max(0.0, r * r - w * w)) + 0.4)  # where the flat side ends, going down
    shoulder = min(hinge[0] - 3.0, max(low + 3.0, hinge[0] - 16.0)) if hinge[1] > w + 0.5 else hinge[0] - 3.0
    top_w = min(w, hinge[1] - 0.2)
    return [hinge, (shoulder, top_w), (low, top_w), (floor, min(FLOOR[1], top_w)), (floor, 0.0)]


def vessel(c: Station) -> None:
    v = c.into("CrewStation_PressureVessel")
    stations = [Z_SILL, 112.0, 118.0, 124.0, 131.0, 137.0, 143.0, 150.8, 155.0, Z_ACCESS]
    rings = []
    for s in stations:
        half = section(s)
        ring = [V(x, y, s) * IN for x, y in half] + [V(x, -y, s) * IN for x, y in half[-2::-1]]
        rings.append(ring)
    n = len(rings[0])
    v.grid(lambda i, j: rings[j][i], range(n), range(len(rings)))
    for ring, out in ((rings[0], False), (rings[-1], True)):  # the two pressure bulkheads, closed across under the roof
        z = ring[0].z / IN
        k = 24
        arc = [
            Vector((inner(a, z) * math.cos(a), inner(a, z) * math.sin(a), z)) * IN for a in (HATCH_OUT - 2 * HATCH_OUT * i / k for i in range(1, k))
        ]
        loop = ring + arc[::-1]
        mid = sum(loop, Vector()) / len(loop)
        m = len(loop)
        v.add([tuple(mid)] + [tuple(p) for p in loop], [(0, 1 + (i + 1) % m, 1 + i) if out else (0, 1 + i, 1 + (i + 1) % m) for i in range(m)])
    # the roof forward of the hatches, under the troughs, and the beam between the hatches
    za, zb = zz(Z_HATCH_FWD) - 0.05, zz(Z_ACCESS)
    nz, nt = 6, 40

    def roof(i: int, j: int) -> Vector:
        a, z = -HATCH_OUT + 2 * HATCH_OUT * i / nt, za + (zb - za) * j / nz
        return Vector((inner(a, z) * math.cos(a), inner(a, z) * math.sin(a), z)) * IN

    v.grid(roof, range(nt + 1), range(nz + 1), flip=True)
    zs = [zz(Z_SILL) + (za - zz(Z_SILL)) * j / 10 for j in range(11)]
    v.grid(
        lambda k, z: Vector(((CABIN.r(z) - WALL) * math.cos(k * hatch_in(z)), (CABIN.r(z) - WALL) * math.sin(k * hatch_in(z)), z)) * IN,
        [-1.0, -0.5, 0.0, 0.5, 1.0],
        zs,
        flip=True,
    )
    # stiffeners on the large bulkhead, behind the seats (its skins are double, with stiffeners spot-welded on: p. 2-8)
    ribs = c.into("CrewStation_Stiffeners")
    for y in (-18.0, -6.0, 6.0, 18.0):
        chamfered(ribs, (56.0, 1.2, 0.7), Matrix.Translation(V(2.0, y, Z_SILL + 0.35) * IN), 0.1)
    for x in (-20.0, -6.0, 8.0, 22.0):
        chamfered(ribs, (1.2, 46.0, 0.5), Matrix.Translation(V(x, 0.0, Z_SILL + 0.25) * IN), 0.1)


# ------------------------------------------------------------------ an ejection seat


def prism(mb: MeshBuilder, m: Matrix, pts, x0: float, x1: float) -> None:
    """A flat shape in the seat's (forward, up) plane, made a slab from x0 to x1 across it. `m` takes inches to metres."""
    n = len(pts)
    area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
    if area < 0:
        pts = pts[::-1]
    lo = [tuple(m @ Vector((x0, y, z))) for y, z in pts]
    hi = [tuple(m @ Vector((x1, y, z))) for y, z in pts]
    mb.add(lo + hi, [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)])
    for a, b, d in tessellate_polygon([[Vector((y, z, 0)) for y, z in pts]]):
        turn = (pts[b][0] - pts[a][0]) * (pts[d][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[d][0] - pts[a][0])
        t = (a, b, d) if turn > 0 else (a, d, b)
        mb.add([hi[i] for i in t], [(0, 1, 2)])
        mb.add([lo[i] for i in t[::-1]], [(0, 1, 2)])


def seat_frame(side: int) -> Matrix:
    """A seat's own axes in the ship: x to the man's right, y the way he faces (the nose), z up his back (the top);
    canted outboard and forward. Inches in, metres out."""
    out, fwd = SEAT_CANT
    to_ship = Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    cant = Matrix.Rotation(side * out, 4, "Y") @ Matrix.Rotation(-fwd, 4, "X")
    return Matrix.Translation(V(SEAT_AT[0], side * SEAT_AT[1], SEAT_AT[2]) * IN) @ to_ship @ cant @ Matrix.Scale(IN, 4)


def seat(c: Station, name: str, side: int, who: str, say) -> None:
    """An ejection seat, as the Smithsonian's two are (A19690023001, A19710058000): a channelled back with a faceted
    shroud over the man's head, holed rails behind it, a bucket with arm sides, a guard before the shins and two
    stirrups; on a rocket catapult, on rails on the large bulkhead."""
    m = seat_frame(side)
    R = m.to_3x3().normalized()
    box = lambda mb, size, at, bevel=0.12: chamfered(mb, size, rigid(m) @ Matrix.Translation(Vector(at) * IN), bevel)  # noqa: E731
    tube = lambda mb, a, b, r, segs=10: mb.tube(m @ Vector(a), m @ Vector(b), r * IN, segs)  # noqa: E731
    fr, pad, web, ring, rail, cap = (MeshBuilder() for _ in range(6))
    h, top, drop = SEAT["wide"] / 2, SEAT["top"], SEAT["drop"]
    back = top - 8.5  # where the shroud begins
    # the back: a pan with turned-up sides and a box channel up its middle
    box(fr, (2 * h, 0.5, back + 2.0), (0, -0.25, back / 2 - 1.0))
    for sx in (-1, 1):
        box(fr, (0.5, 4.6, back + 2.0), (sx * (h - 0.25), 2.0, back / 2 - 1.0))
    box(fr, (4.4, 1.5, back - 1.5), (0, 0.7, back / 2 + 0.2), 0.3)
    for z in (6.0, 14.0, 22.0):  # the beads pressed across it either side of the channel
        for sx in (-1, 1):
            box(fr, (5.6, 0.6, 0.9), (sx * 6.2, 0.0, z), 0.15)
    # the shroud over his head: five-sided, a fitting at its peak (the parachute's and the drogue's gear is under it)
    hood = [(-h, back), (h, back), (3.2, top), (-3.2, top)]
    prism(cap, m @ Matrix(((0, 1, 0, 0), (1, 0, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))), [(x, z) for x, z in hood], -3.6, 2.5)
    box(cap, (3.0, 2.4, 1.6), (0, 0.5, top + 0.6), 0.25)
    # the rails behind the back, with their lightening holes, and the rocket catapult between them
    for sx in (-1, 1):
        box(rail, (0.9, 5.6, back + drop - 1.5), (sx * 8.6, -3.4, (back - drop) / 2 + 0.25), 0.15)
        for k in range(9):
            z = -drop + 4.5 + k * 4.9
            for face in (-1, 1):
                at_ = m @ Vector((sx * 8.6 + face * 0.47, -3.4, z))
                rail.lathe(prof([(1.5, -0.02), (1.5, 0.08), (1.25, 0.08), (1.2, 0.04), (0.0, 0.04)]), 16, matrix=frame(at_, R @ Vector((face, 0, 0))))
    tube(rail, (0, -3.4, -drop + 1.0), (0, -3.4, top - 4.0), 2.1, 16)
    tube(rail, (0, -3.4, top - 4.0), (0, -3.4, top - 1.5), 1.2, 12)
    for sx in (-1, 1):  # the tee rails on the bulkhead that the seat's blocks slide in
        box(rail, (1.6, 1.0, back + drop - 4.0), (sx * 8.6, -6.9, (back - drop) / 2), 0.12)
    # the bucket: a pan, two arm sides with their tops rounded down to the front, a guard before the shins
    box(fr, (2 * h - 2.6, SEAT["deep"] - 1.0, 0.6), (0, SEAT["deep"] / 2, -0.3))
    arm = [(-0.5, -4.5), (SEAT["deep"] - 1.5, -4.5), (SEAT["deep"], -2.0), (SEAT["deep"], 3.0), (SEAT["deep"] - 2.5, 7.0), (11.0, 8.6), (-0.5, 9.6)]
    for sx in (-1, 1):
        prism(fr, m, arm, sx * (h - 1.1) - 0.3, sx * (h - 1.1) + 0.3)
        for y in (3.0, 7.0, 11.0):  # the beads pressed in each side
            box(fr, (0.3, 0.9, 6.0), (sx * (h - 0.72), y, 1.0), 0.12)
        # the loop of half-inch tube his arm is held in if the seat goes
        loop = [(sx * (h - 1.1), 5.0, 9.4), (sx * (h - 1.1), 5.5, 12.4), (sx * (h - 1.1), 9.5, 12.0), (sx * (h - 1.1), 10.5, 8.8)]
        for a, b in zip(loop, loop[1:]):
            tube(ring, a, b, 0.25, 8)
    guard_y = SEAT["deep"] + 0.3
    for x, wide in ((-(h - 4.6), 1.2), (0.0, 2.6), (h - 4.6, 1.2)):
        box(fr, (wide, 0.5, drop - 4.0), (x, guard_y, -drop / 2 - 2.6))
    for z in (-4.9, -drop + 1.6):
        box(fr, (2 * h - 8.0, 0.5, 1.2), (0, guard_y, z))
    for sx in (-1, 1):  # the stirrups: a loop of tube under each foot
        u = [
            (sx * 1.9, guard_y + 0.6, -drop + 5.0),
            (sx * 1.9, guard_y + 0.9, -drop + 0.9),
            (sx * 5.6, guard_y + 0.9, -drop + 0.9),
            (sx * 5.6, guard_y + 0.6, -drop + 5.0),
        ]
        for a, b in zip(u, u[1:]):
            tube(ring, a, b, 0.42, 10)
    # what he sits on and against: the egress kit in the bucket, the backboard and its cushion, the headrest
    soft(pad, rigid(m) @ Matrix.Translation(Vector((0, SEAT["deep"] / 2 + 0.2, 1.35)) * IN), (2 * h - 3.4, SEAT["deep"] - 2.0, 2.5), 0.8)
    soft(pad, rigid(m) @ Matrix.Translation(Vector((0, 2.45, 14.5)) * IN), (15.0, 1.5, 23.0), 0.6)
    soft(pad, rigid(m) @ Matrix.Translation(Vector((0, 1.75, back - 3.0)) * IN), (7.0, 2.6, 5.4), 0.7)
    for sx in (-1, 1):  # the shoulder straps down the backboard from the inertia reel, and the lap belt's two halves
        web.ribbon(
            [m @ Vector(p) for p in ((sx * 2.4, 3.32, back - 6.2), (sx * 3.0, 3.32, 14.0), (sx * 3.6, 3.32, 4.0))], R @ Vector((1, 0, 0)), 1.75 * IN
        )
        web.ribbon([m @ Vector(p) for p in ((sx * (h - 2.2), 3.0, 2.7), (sx * 1.2, 6.0, 2.7))], R @ Vector((0, 1, 0)), 1.75 * IN)
    box(fr, (5.0, 1.4, 2.0), (0, 2.3, back - 7.6), 0.3)  # the inertia reel
    # the D-ring between his knees: pulled, it fires both seats
    mb = MeshBuilder()
    mb.lathe(prof([(2.1 + 0.4 * math.cos(a), 0.4 * math.sin(a)) for a in (TAU * i / 8 for i in range(9))]), 20)
    grip = mb.build(f"Ctl_Eject{name}", c.M["yellow"], c.g, sharp_angle=None)
    grip.matrix_local = rigid(m @ Matrix.Translation(Vector((0, SEAT["deep"] - 0.4, 3.4)))) @ Matrix.Rotation(math.pi / 2, 4, "X")
    grip["pull"] = 0.06
    grip["reach"] = 0.07
    say(grip, "Ejection control", "The D-ring between the knees. Pulled with both hands, it blows both hatches open and fires both seats.")
    about = (
        f"{who}'s seat. " if who else ""
    ) + "Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the way out is this, an "
    about += (
        "ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows both hatches open and fires "
        "both seats up their rails on the bulkhead, which are canted 12° apart and 8° forward so that the two do not meet. Nobody "
        "ever had to. Its form is the two seats the Smithsonian holds (one a spare that was fitted in this very spacecraft), 22 in "
        "wide and 54 in tall; where it stands in the cabin is laid out so that a helmet clears the hatch."
    )
    say(fr.build(f"Seat{name}_Frame", c.M["seat"], c.g, sharp_angle=35), "Ejection seat", about)
    rail.build(f"Seat{name}_Rails", c.M["seat"], c.g, sharp_angle=35)
    cap.build(f"Seat{name}_Shroud", c.M["paint_white"], c.g, sharp_angle=35)  # (white in S65-13244)
    pad.build(f"Seat{name}_Cushions", c.M["cushion"], c.g, sharp_angle=None)
    web.build(f"Seat{name}_Harness", c.M["webbing"], c.g, smooth=False)
    ring.build(f"Seat{name}_Tubes", c.M["aluminium"], c.g, sharp_angle=35)
    # the seat's node, at a seated man's eyes: in the file its +Z looks ahead and its +Y is the top of his head
    eye = m @ Vector(EYE)
    look, over = R @ Vector((0, 1, 0)), R @ Vector((0, 0, 1))
    node = bpy.data.objects.new(f"Seat_{name}", None)
    bpy.context.scene.collection.objects.link(node)
    node.parent = c.g
    node.matrix_local = Matrix.Translation(eye) @ Matrix(((-look).cross(over), -look, over)).transposed().to_4x4()
    win = WINDOWS[side]
    to_pane = (win.at(0.0, 4.0) * IN - eye).normalized()
    print(
        f"gemini cabin: {name}'s eyes at {tuple(round(v / IN, 1) for v in eye)} in (model axes), the middle of his window "
        f"{math.degrees(to_pane.angle(Vector((0, 0, 1)))):.1f} degrees off the ship's axis from there"
    )


# ------------------------------------------------------------------ the panels


def frames() -> dict:
    """Each panel's own frame: u to the reader's right, v up it, w toward him."""
    t = PANEL_TILT
    ex0, ey0 = Vector((0.0, 1.0, 0.0)), Vector((math.cos(t), 0.0, math.sin(t)))
    w0 = ex0.cross(ey0)
    a = PANEL_WRAP
    foot = lambda right: V(PANEL_FOOT[0], right, PANEL_FOOT[1])  # noqa: E731
    exl, exr = ex0 * math.cos(a) - w0 * math.sin(a), ex0 * math.cos(a) + w0 * math.sin(a)
    tp = PEDESTAL[2]
    eyp = Vector((math.cos(tp), 0.0, math.sin(tp)))
    droop = PANEL_DROOP
    out = {
        "centre": plane(foot(-CENTRE[0] / 2), ex0, ey0),
        "left": plane(foot(-CENTRE[0] / 2) - exl * 14.5, exl, ey0)
        @ Matrix.Translation((14.5, 0, 0))
        @ Matrix.Rotation(droop, 4, "Z")
        @ Matrix.Translation((-14.5, 0, 0)),
        "right": plane(foot(CENTRE[0] / 2), exr, ey0) @ Matrix.Rotation(-droop, 4, "Z"),
        "pedestal": plane(foot(-CENTRE[0] / 2) - eyp * PEDESTAL[0], ex0, eyp),
    }
    # the overhead panel under the beam between the hatches, read looking up: its top is toward the men
    zo = zz(149.5)
    under = 1.4  # (its face from the beam: its back clear of it)
    eo = Vector((math.sin(deg(20)), 0.0, -math.cos(deg(20))))
    out["overhead"] = plane(Vector((CABIN.r(zo) - WALL - under, -4.9, zo)), ex0, eo)
    # the switch and circuit breaker panels on the side walls, each leaning up toward its man
    lean = deg(25)
    for side, key in ((-1, "left_cb"), (1, "right_cb")):
        ex = Vector((0.0, 0.0, -side))
        ey = Vector((math.cos(lean), side * math.sin(lean), 0.0))
        corner = V(-9.0, side * (half_width(142.0) - 4.8), 142.25 + side * 6.25)  # (forward of the seat's bucket, beside the knee)
        out[key] = plane(corner, ex, ey)
    # the centre console between the seats, read from above, and the water management panel on the bulkhead between them
    out["console"] = plane(V(-5.0, -2.9, 116.0), ex0, Vector((0.0, 0.0, 1.0)))
    out["water"] = plane(V(12.0, 2.4, Z_SILL + 1.2), Vector((0.0, -1.0, 0.0)), Vector((1.0, 0.0, 0.0)))
    return out


def plate(c: Station, F: Matrix, outline, sheet: Sheet, thick: float = 1.1, ppi: float = 40.0):
    """A panel: its face with its drawing, its edge, its back. Returns the drawing."""
    us, vs = [p[0] for p in outline], [p[1] for p in outline]
    rg = sheet.take(max(us) - min(us) + 0.1, max(vs) - min(vs) + 0.1, ppi, min(us) - 0.05, min(vs) - 0.05)
    c.flat("CrewCabin_InstrumentPanel", F, outline, rg)
    c.skirt("CrewCabin_PanelStructure", F, outline, -thick, 0.0)
    c.flat("CrewCabin_PanelStructure", F, outline, None, -thick, flip=True)
    rg.edge_screws(outline, pitch=3.2, inset=0.3)
    return rg


def switches(c: Station, F: Matrix, rg, row, cap: float = 0.085) -> None:
    """A row of toggle switches, each with its legend over it: (u, v, legend)."""
    for u, v, legend in row:
        toggle(c, F, u, v, "v", True)
        if legend:
            rg.text(legend, u, v + 0.52, cap, mc.INK)


def breakers(c: Station, F: Matrix, rg, u0: float, v: float, pitch: float, legends) -> None:
    """A row of circuit breakers: a collar and a black button, its legend under it."""
    for i, legend in enumerate(legends):
        u = u0 + i * pitch
        c.turned("CrewCabin_PanelFittings", F, u, v, [(0.24, 0.0), (0.24, 0.07), (0.17, 0.07)], 12)
        c.turned("CrewCabin_Knobs", F, u, v, [(0.15, 0.02), (0.15, 0.26), (0.11, 0.3), (0.0, 0.3)], 10)
        if legend:
            rg.text(legend, u, v - 0.42, 0.07, mc.INK)


def lamp(c: Station, F: Matrix, faces: Sheet, name: str, legend: str, u: float, v: float, size=(1.25, 0.6)) -> None:
    telelight(c, F, faces, name, legend, u, v, 0.0, size)


def tape(
    c: Station, F: Matrix, rg, faces: Sheet, name: str, title: str, u: float, v: float, wide: float, tall: float, top: float, rest: float
) -> None:
    """A vertical scale with a pointer that runs up it: the pointer its own node, sliding along its own X."""
    c.rim("CrewCabin_Bezels", F, u, v, wide, tall, 0.12, 0.0, 0.22)
    face = faces.take(wide, tall, 110, -wide / 2, -tall / 2)
    face.rect(-wide / 2, -tall / 2, wide / 2, tall / 2, mc.BLACK)
    for i in range(11):
        y = -tall / 2 + 0.2 + (tall - 0.4) * i / 10
        face.line((-wide * 0.28, y), (wide * (0.28 if i % 5 == 0 else 0.12), y), 0.02, mc.WHITE)
    c.box("CrewCabin_Instruments", F, u, v, wide, tall, 0.0, 0.06, face, 0.0, 0.0)
    if title:
        rg.text(title, u, v + tall / 2 + 0.3, 0.085, mc.INK)
    run = tall - 0.4

    def bar(mb: MeshBuilder) -> None:
        mb.add([(-0.04, -wide * 0.4, 0), (0.04, -wide * 0.4, 0), (0.04, wide * 0.4, 0), (-0.04, wide * 0.4, 0)], [(0, 1, 2, 3)])

    c.node(
        f"Gauge_{name}",
        "needle_white",
        F,
        u,
        v - run / 2 + run * rest / top,
        0.12,
        bar,
        spin=math.pi / 2,
        slide=[0.0, -run * rest / top * IN, float(top), run * (1 - rest / top) * IN],
        rest=float(rest),
    )


def counter(c: Station, F: Matrix, rg, faces: Sheet, u: float, v: float, digits: str, wide: float = 0.34, tall: float = 0.5, w: float = 0.0) -> None:
    """A row of counter wheels behind a window, standing at the figures given."""
    n = len(digits)
    face = faces.take(n * wide, tall, 110, -n * wide / 2, -tall / 2)
    face.rect(-n * wide / 2, -tall / 2, n * wide / 2, tall / 2, mc.BLACK)
    for i, d in enumerate(digits):
        face.text(d, (i - (n - 1) / 2) * wide, 0, tall * 0.55, mc.WHITE)
    c.rim("CrewCabin_Bezels", F, u, v, n * wide, tall, 0.08, w, w + 0.14)
    c.box("CrewCabin_Instruments", F, u, v, n * wide, tall, w, w + 0.06, face, 0.0, 0.0)


def knob(c: Station, F: Matrix, u: float, v: float, r: float = 0.42, bar: bool = True) -> None:
    c.turned("CrewCabin_Knobs", F, u, v, [(r, 0.0), (r, 0.3), (r * 0.8, 0.42), (0.0, 0.42)], 16)
    if bar:
        c.box("CrewCabin_Knobs", F, u, v, r * 0.5, r * 2.3, 0.3, 0.72)


def button(c: Station, F: Matrix, u: float, v: float, r: float, mat: str = "CrewCabin_WhiteCaps") -> None:
    c.turned("CrewCabin_PanelFittings", F, u, v, [(r + 0.12, 0.0), (r + 0.12, 0.12), (r + 0.02, 0.12)], 20)
    c.turned(mat, F, u, v, [(r, 0.04), (r, 0.3), (r * 0.9, 0.36), (0.0, 0.36)], 20)


ACCELEROMETER = dict(
    scale=[(-6, -100), (0, 0), (16, 250)],
    majors=[(v, str(v)) for v in (-6, -4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16)],
    minor=1,
    titles=[("LONGITUDINAL", 0, 0.3, 0.05), ("ACCEL", 0, 0.14, 0.05), ("G", 0, -0.4, 0.06)],
    rest=1.0,
    pointer="white",
)
ALTIMETER = dict(
    scale=[(0, 0), (10, 360)],
    majors=[(v, str(v)) for v in range(10)],
    minor=0.2,
    titles=[("ALT", -0.25, 0.0, 0.07)],
    rest=0.0,
    pointer="white",
)
DESCENT = dict(
    scale=[(0, 300), (10, 262), (20, 232), (30, 205), (50, 172), (70, 148)],
    majors=[(0, "0"), (10, "10"), (20, "20"), (30, "30"), (50, "50"), (70, "70")],
    minor=0,
    titles=[("DESCENT", 0.25, 0.1, 0.05), ("FT/SEC", 0.25, -0.1, 0.05)],
    rest=0.0,
    pointer="white",
)
RANGE = dict(
    scale=[(0, 210), (100, 330), (300, 450)],
    majors=[(0, "0"), (50, ""), (100, "100"), (200, "200"), (300, "300")],
    minor=0,
    titles=[("RANGE", 0, 0.34, 0.05), ("RANGE RATE", 0, -0.2, 0.045), ("FT/SEC", 0, -0.36, 0.045)],
    rest=0.0,
    pointer="white",
)


def ball(c: Station, F: Matrix, faces: Sheet, name: str, u: float, v: float) -> None:
    """A flight director attitude indicator: a five-inch square case with a ball in it that turns about all three axes.
    The ball is its own node, its origin at its middle."""
    c.rim("CrewCabin_Bezels", F, u, v, 3.4, 3.4, 0.8, 0.0, 0.85)
    c.box("CrewCabin_PanelStructure", F, u, v, 5.0, 5.0, -4.4, -1.15)  # its case behind the panel
    for su in (-1, 1):
        for sv in (-1, 1):
            c.turned("CrewCabin_PanelFittings", F, u + su * 2.15, v + sv * 2.15, [(0.13, 0.85), (0.13, 0.92), (0.0, 0.92)], 8)
    wide, tall = 4.0, 2.0
    rg = faces.take(wide, tall, 110, 0.0, 0.0)
    rg.rect(0, 0, wide, tall / 2, mc.BLACK)
    rg.rect(0, tall / 2, wide, tall, (0.78, 0.78, 0.74))
    for k in range(1, 12):  # a line of latitude every 15 degrees, a meridian every 30
        y = tall * k / 12
        rg.line((0, y), (wide, y), 0.012, mc.WHITE if y < tall / 2 else mc.BLACK)
    for k in range(12):
        x = wide * k / 12
        rg.line((x, 0.25), (x, tall / 2), 0.012, mc.WHITE)
        rg.line((x, tall / 2), (x, tall - 0.25), 0.012, mc.BLACK)
    rg.line((0, tall / 2), (wide, tall / 2), 0.035, mc.WHITE)
    mb = MeshBuilder()
    r, nu, nv = 2.4 * IN, 32, 16
    verts, uvs = [], []
    for j in range(nv + 1):
        lat = -math.pi / 2 + math.pi * j / nv
        for i in range(nu + 1):
            lon = TAU * i / nu
            # (the ball's own +Z is toward the reader; its poles lie along the panel's v)
            verts.append((r * math.cos(lat) * math.sin(lon), r * math.sin(lat), r * math.cos(lat) * math.cos(lon)))
            uvs.append(rg.uv(wide * i / nu, tall * j / nv))
    faces_ = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    mb.add(verts, faces_, uvs)
    obj = mb.build(f"Ball_{name}", c.M["faces"], c.g, sharp_angle=None)
    obj.matrix_local = rigid(F @ Matrix.Translation((u, v, -1.75)))
    obj["reach"] = 2.0 * IN
    c.disc("CrewCabin_InstrumentGlass", F, u, v, 1.7, 0.76, None, 24)


def main_panels(c: Station, P: dict, sheet: Sheet, faces: Sheet) -> None:
    # ---- the command pilot's (Figure 3-5 sheet 1, measured from its outboard lower corner at 47 px to the inch)
    F = P["left"]
    rg = plate(c, F, OUTLINE, sheet)
    ball(c, F, faces, "CommandPilot", 8.32, 5.99)
    lamp(c, F, faces, "AbortCP", "ABORT", 15.05, 11.9, (1.5, 0.7))
    round_dial(c, F, faces, "Accelerometer", ACCELEROMETER, 15.12, 10.35, 0.96, rim=True)
    for name, legend, u, v in (
        ("AttRate", "ATT RATE", 10.43, 9.59),
        ("Guidance", "GUIDANCE", 12.28, 9.57),
        ("Engine1", "ENGINE I", 12.06, 8.6),
        ("Engine2", "ENGINE II", 14.58, 8.44),
    ):
        lamp(c, F, faces, name, legend, u, v, (1.3, 0.62))
    tape(c, F, rg, faces, "Stage1Fuel", "FUEL 1 OXID", 11.68, 6.7, 0.5, 2.0, 100, 100)
    tape(c, F, rg, faces, "Stage1Oxidiser", "", 12.54, 6.7, 0.5, 2.0, 100, 100)
    tape(c, F, rg, faces, "Stage2Fuel", "FUEL 2 OXID", 13.84, 6.7, 0.5, 2.0, 100, 100)
    tape(c, F, rg, faces, "Stage2Oxidiser", "", 14.7, 6.7, 0.5, 2.0, 100, 100)
    # the event timer: its minutes and seconds on wheels, a switch either side, and a knob to set it
    rg.rect(11.0, 3.6, 14.75, 5.25, (0.44, 0.45, 0.45), r=0.2)
    counter(c, F, rg, faces, 12.87, 4.75, "0000")
    rg.text("MIN        SEC", 12.87, 5.12, 0.07, mc.INK)
    switches(c, F, rg, [(11.5, 4.3, "STBY"), (14.25, 4.3, "UP")])
    knob(c, F, 12.87, 3.95, 0.3)
    round_dial(c, F, faces, "RangeRate", RANGE, 12.66, 1.53, 1.38, rim=True)
    # the incremental velocity indicator: three counters, fore and aft, left and right, up and down (3.25 by 5.05 in)
    c.box("CrewCabin_Bezels", F, 8.32, 1.63, 5.05, 3.25, 0.0, 0.16)
    for du in (-1.6, 0.0, 1.6):  # (fore and aft, left and right, down and up)
        counter(c, F, rg, faces, 8.32 + du, 2.1, "000", 0.3, 0.46, 0.16)
        knob(c, F, 8.32 + du, 0.85, 0.36)
    rg.text("ΔV FT/SEC", 8.32, 3.5, 0.085, mc.INK)
    # the reference and mode selectors beside the ball
    rg.rect(2.9, 6.5, 5.7, 8.4, (0.2, 0.2, 0.21), r=0.15)
    rg.text("REF", 3.55, 8.6, 0.085, mc.INK)
    rg.text("MODE", 5.0, 8.6, 0.085, mc.INK)
    for u in (3.55, 5.0):
        c.box("CrewCabin_Knobs", F, u, 7.45, 0.5, 1.2, 0.0, 0.5)
    # the drogue's emergency handle and the two altitude lamps
    c.box("CrewCabin_RedCaps", F, 1.3, 7.2, 0.6, 1.6, 0.0, 0.55)
    rg.text("DROGUE", 1.3, 8.25, 0.075, mc.INK)
    lamp(c, F, faces, "Barostat40K", "40K", 2.43, 7.63, (0.62, 0.62))
    lamp(c, F, faces, "Barostat10K", "10.6K", 2.23, 6.74, (0.62, 0.62))
    round_dial(c, F, faces, "RateOfDescent", DESCENT, 2.25, 4.88, 0.96, rim=True)
    # (the round space beside it is blank on spacecraft 3, which had no G.m.t. clock here: GIV, 3.1.2.5)
    c.turned("CrewCabin_PanelFittings", F, 4.62, 4.85, [(0.98, 0.0), (0.98, 0.05), (0.0, 0.05)], 28)
    round_dial(c, F, faces, "Altimeter", ALTIMETER, 2.22, 1.84, 1.21, rim=True)
    tape(c, F, rg, faces, "PropellantQuantity", "PROP QTY", 4.92, 1.6, 0.7, 2.4, 100, 100)
    # the manoeuvre hand controller under the panel: pushed in, it stows
    c.box("CrewCabin_PanelStructure", F, 3.6, -1.5, 3.4, 2.6, -1.0, 0.3)
    hand = MeshBuilder()
    hand.lathe(prof([(0.3, 0.0), (0.3, 1.5), (0.75, 1.7), (0.85, 2.3), (0.6, 2.9), (0.0, 3.0)]), 16)
    stick = hand.build("Ctl_ManeuverController", c.M["grip"], c.g, sharp_angle=35)
    stick.matrix_local = rigid(F @ Matrix.Translation((3.6, -1.6, 0.3)))
    stick["reach"] = 0.06
    # ---- the pilot's
    F = P["right"]
    out = [(14.5 - u, v) for u, v in OUTLINE_P][::-1]
    rg = plate(c, F, out, sheet)
    X = lambda u: 14.5 - u  # noqa: E731  (the figure's distances are from this panel's outboard corner too)
    ball(c, F, faces, "Pilot", X(8.3), 6.0)
    lamp(c, F, faces, "AbortP", "ABORT", X(11.3), 10.5, (1.5, 0.7))
    for i, legend in enumerate(("1A", "1B", "1C", "2A", "2B", "2C")):  # the fuel cell stacks' lamps: dark on this ship, which had batteries
        lamp(c, F, faces, f"Stack{legend}", legend, X(15.9 - 0.84 * i), 9.05, (0.56, 0.56))
    switches(
        c, F, rg, [(X(15.8 - 0.95 * i), 7.0, legend) for i, legend in enumerate(("SECT 1\nPWR", "SECT 1\nCNTL", "SECT 2\nPWR", "SECT 2\nCNTL"))], 0.06
    )
    rg.text("PROPELLANT RCS", X(14.3), 5.85, 0.075, mc.INK)
    switches(c, F, rg, [(X(14.8), 4.8, "A"), (X(13.85), 4.8, "B"), (X(12.8), 4.8, "X OVER")], 0.07)
    tape(c, F, rg, faces, "MainBusAmps1", "NO 1   NO 2", X(11.82), 6.1, 0.44, 2.6, 50, 20)
    tape(c, F, rg, faces, "MainBusAmps2", "", X(10.98), 6.1, 0.44, 2.6, 50, 20)
    # the clock: an 8-day movement, 2 1/4 in square (SEDR 300, section VIII), with its hands on their own nodes
    c.box("CrewCabin_Bezels", F, X(3.39), 8.02, 2.25, 2.25, 0.0, 0.2)
    c.rim("CrewCabin_Bezels", F, X(3.39), 8.02, 2.0, 2.0, 0.125, 0.2, 0.62)
    face = faces.take(2.1, 2.1, 125, -1.05, -1.05)
    mc.draw_dial(face, 0.95, [(0, 0), (12, 360)], [(h, str(h) if h else "12") for h in range(12)], 0.2, [("GMT", 0, -0.35, 0.06)])
    c.disc("CrewCabin_Instruments", F, X(3.39), 8.02, 0.97, 0.27, face)
    c.disc("CrewCabin_InstrumentGlass", F, X(3.39), 8.02, 0.97, 0.56, None, 20)
    for name, length, wide, period, lift in (("Hours", 0.5, 0.08, 43200.0, 0.33), ("Minutes", 0.78, 0.06, 3600.0, 0.38)):
        c.node(
            f"Gauge_Clock{name}",
            "needle_white",
            F,
            X(3.39),
            8.02,
            lift,
            pointer(length, wide, 0.12, hub=0.06),
            turn=[0.0, 0.0, period, -TAU],
            rest=0.0,
            wrap=period,
        )
    lamp(c, F, faces, "ComputerRunning", "COMP", X(1.56), 7.7, (0.6, 0.6))
    rg.rect(X(4.4), 4.2, X(1.5), 6.1, (0.2, 0.2, 0.21), r=0.15)
    for u in (X(3.6), X(2.3)):
        c.box("CrewCabin_Knobs", F, u, 5.15, 0.5, 1.2, 0.0, 0.5)
    # the computer's readout (3.26 by 5.01 in) and its keyboard (3.38 in square): SEDR 300, section VIII
    c.box("CrewCabin_Bezels", F, X(7.94), 2.23, 5.01, 3.26, 0.0, 0.18)
    counter(c, F, rg, faces, X(7.94), 2.75, "0000000", 0.42, 0.6, 0.18)
    rg.text("ADDRESS             MESSAGE", X(7.94), 3.45, 0.07, mc.INK)
    for i in range(3):  # (READ OUT, CLEAR, ENTER)
        c.box("CrewCabin_WhiteCaps", F, X(7.94) + (i - 1) * 1.25 + 0.4, 1.35, 0.95, 0.7, 0.18, 0.42)
    c.box("CrewCabin_Bezels", F, X(3.12), 2.77, 3.38, 3.38, 0.0, 0.18)
    for row in range(4):
        for col in range(3):
            if row == 3 and col != 1:
                continue
            c.box("CrewCabin_WhiteCaps", F, X(3.12) + (col - 1) * 0.95, 2.77 + 1.15 - row * 0.78, 0.72, 0.6, 0.18, 0.42)
    # ---- the centre panel
    F = P["centre"]
    W, H = CENTRE
    rg = plate(c, F, [(0, 0), (W, 0), (W, H), (0, H)], sheet)
    k = W / 11.2  # (the figure's own inches across it)
    row = [
        (0.7, "SUIT\nFAN"),
        (2.35, "PUMP A"),
        (3.35, "PUMP B"),
        (4.55, "RAD\nFLOW"),
        (5.75, "EVAP\nHEAT"),
        (6.9, "EVAP\nFLOW"),
        (8.0, "PUMP A"),
        (9.1, "PUMP B"),
        (10.3, "CABIN\nFAN"),
    ]
    switches(c, F, rg, [(u * k, H - 2.95, legend) for u, legend in row], 0.06)
    rg.text("PRIMARY", 2.85 * k, H - 1.25, 0.08, mc.INK)
    rg.text("SECONDARY", 8.55 * k, H - 1.25, 0.08, mc.INK)
    rg.text("EVAP PRESS", 5.7 * k, H - 1.25, 0.07, mc.INK)
    for u in (2.35, 2.85, 3.35, 5.7, 8.0, 8.55, 9.1):
        c.turned("CrewCabin_RedCaps", F, u * k, H - 1.7, [(0.17, 0.0), (0.17, 0.12), (0.0, 0.16)], 10)
    # down its left side: the lamps the men press as the flight's events are called (the sequence, top to bottom)
    column = (
        "JETT\nFAIRING",
        "SEP\nSPCFT",
        "IND\nRETRO ATT",
        "O2\nHIGH RATE",
        "BTRY\nPWR",
        "RCS",
        "SEP\nOAMS LINE",
        "SEP\nELEC",
        "SEP\nADAPT",
        "ARM\nAUTO RETRO",
        "MAN\nFIRE RETRO",
        "JETT\nRETRO",
    )
    for i, legend in enumerate(column):
        lamp(c, F, faces, legend.title().replace("\n", "").replace(" ", ""), legend, 0.95, H - 4.45 - i * 1.08, (1.3, 0.8))
    for i, legend in enumerate(("FUEL\nCELL", "H2O\nPRESS", "RCS\nHTR")):
        lamp(c, F, faces, legend.title().replace("\n", "").replace(" ", ""), legend, W - 0.85, H - 4.0 - i * 1.0, (0.95, 0.7))
    for i, name in enumerate(("CabinPressure", "SuitPressure", "CoolantTemp")):
        tape(c, F, rg, faces, name, "", (3.0 + i * 2.25) * k, H - 4.85, 1.5, 2.2, 10, 5)
    tape(c, F, rg, faces, "EcsOxygen", "ECS O2", 3.0 * k, H - 8.2, 1.5, 3.2, 100, 100)
    tape(c, F, rg, faces, "Propellant", "PROP", (W / k - 1.75) * k, H - 8.2, 1.5, 3.2, 100, 100)
    rg.rect(4.2 * k, H - 9.9, (W / k - 2.8) * k, H - 6.5, (0.86, 0.86, 0.8), r=0.1)  # the card in the middle
    for i in range(9):
        rg.line((4.5 * k, H - 6.9 - i * 0.32), ((W / k - 3.1) * k, H - 6.9 - i * 0.32), 0.03, (0.3, 0.3, 0.3))
    switches(c, F, rg, [(2.4 * k, H - 11.0, "QTY"), (4.3 * k, H - 11.0, "AUTO"), (5.75 * k, H - 11.0, "AUTO"), (W - 1.2, H - 11.0, "EXP")], 0.065)
    rg.text("HEATERS", 5.0 * k, H - 11.75, 0.07, mc.INK)
    c.box("CrewCabin_RedCaps", F, 8.1 * k, H - 11.0, 0.5, 1.0, 0.0, 0.5)  # the squib switch under its guard
    # the radios: each man's own selectors and volume wheels, and between them the keying
    rg.rect(2.0 * k, 0.45, 7.75 * k, 6.6, (0.44, 0.45, 0.45), r=0.15)
    for u in (2.9, 6.8):
        rg.text("MODE", u * k, 4.45, 0.07, mc.INK)
        knob(c, F, u * k, 5.4, 0.36)
        for j in range(3):
            c.box("CrewCabin_Knobs", F, u * k, 3.6 - j * 1.0, 0.85, 0.5, 0.0, 0.24)
    for v, legend in ((5.6, "UHF"), (4.4, "HF"), (1.45, "KEYING")):
        rg.text(legend, 4.85 * k, v + 0.45, 0.075, mc.INK)
        toggle(c, F, 4.85 * k, v - 0.15, "v", True)
    rg.text("NO. 1 AUDIO", 2.9 * k, 0.65, 0.07, mc.INK)
    rg.text("NO. 2 AUDIO", 6.8 * k, 0.65, 0.07, mc.INK)
    for j, (title, legends) in enumerate(
        (("BEACON CONTROL", ("RESC", "S-BAND", "C-BAND")), ("TM CONTROL", ("CALIB", "STBY TM", "T/M")), ("", ("ANT\nSEL", "HF\nANT", "TAPE\nPLYBK")))
    ):
        v = 5.0 - j * 2.0
        if title:
            rg.text(title, 9.45 * k, v + 1.05, 0.07, mc.INK)
        switches(c, F, rg, [((8.45 + i * 1.0) * k, v, legend) for i, legend in enumerate(legends)], 0.055)
    # ---- the pedestal
    F = P["pedestal"]
    L, foot = PEDESTAL[0], PEDESTAL[1]
    rg = plate(c, F, [((W - foot) / 2, 0), ((W + foot) / 2, 0), (W, L), (0, L)], sheet)
    rg.text("RADAR", 3.3, L - 1.9, 0.075, mc.INK)
    lamp(c, F, faces, "RadarLockOn", "LOCK\nON", 1.6, L - 0.8, (0.7, 0.6))
    for u in (2.9, 3.9):
        knob(c, F, u, L - 0.95, 0.3, False)
    switches(c, F, rg, [(1.9, L - 2.6, ""), (4.9, L - 1.0, "")])
    for v, legend in ((L - 3.7, "PLATFORM"), (L - 5.6, "COMPUTER"), (L - 7.6, "ATTITUDE CONTROL")):
        knob(c, F, 3.3, v + 0.9, 0.42)
        rg.text(legend, 3.3, v, 0.075, mc.INK)
    rg.text("SCANNER", 6.25, L - 0.4, 0.07, mc.INK)
    switches(c, F, rg, [(6.25, L - 1.5, "PRI")], 0.06)
    rg.text("RATE GYROS", 8.9, L - 0.4, 0.07, mc.INK)
    switches(c, F, rg, [(7.7 + i * 1.2, L - 1.5, legend) for i, legend in enumerate(("YAW", "PITCH", "ROLL"))], 0.06)
    rg.text("OAMS PWR", 6.25, L - 2.65, 0.065, mc.INK)
    switches(c, F, rg, [(6.25, L - 3.7, "")])
    rg.text("ACME LOGIC", 8.9, L - 2.65, 0.07, mc.INK)
    switches(c, F, rg, [(7.7 + i * 1.2, L - 3.7, legend) for i, legend in enumerate(("YAW", "PITCH", "ROLL"))], 0.06)
    rg.text("PROP", 6.25, L - 4.8, 0.065, mc.INK)
    switches(c, F, rg, [(6.25, L - 5.8, "")])
    rg.text("RCS", 8.3, L - 4.8, 0.07, mc.INK)
    switches(c, F, rg, [(7.7, L - 5.8, "RING A"), (8.9, L - 5.8, "RING B")], 0.06)
    for i, legend in enumerate(("DROGUE", "PARA", "LDG\nATT", "PARA\nJETT")):  # the four he presses on the way down
        u = 3.6 + i * 1.35
        button(c, F, u, L - 8.6, 0.48)
        rg.text(legend, u, L - 9.45, 0.065, mc.INK)
    for u, legend in ((W / 2 - 1.5, "SUIT FLOW"), (W / 2 + 1.5, "SUIT FLOW")):
        rg.rect(u - 0.18, 0.7, u + 0.18, 2.9, (0.12, 0.12, 0.13))
        c.box("CrewCabin_Knobs", F, u, 2.2, 0.7, 0.5, 0.0, 0.7)
        rg.text(legend, u, 3.15, 0.06, mc.INK)
    knob(c, F, W / 2, 1.7, 0.6)
    rg.text("REPRESS", W / 2, 2.75, 0.065, mc.INK)


def side_panels(c: Station, P: dict, sheet: Sheet) -> None:
    # ---- overhead: seven rows of eight circuit breakers, a switch at the head of four of them, five pull handles
    F = P["overhead"]
    Wd, Ht = 9.8, 11.4
    rg = plate(c, F, [(0, 0), (Wd, 0), (Wd, Ht), (0, Ht)], sheet, 0.8)
    rows = (
        ("COOLANT PUMPS / BEACONS", ("", "", "", "", "", "", "", "")),
        ("XMTRS / SUIT FAN", ("", "", "", "", "", "", "", "")),
        ("LIGHTS / COOL VALVES", ("", "", "", "", "", "", "")),
        ("ACME / OAMS CNTL / RCS SQUIB", ("", "", "", "", "", "", "", "")),
        ("MANEUVER THRUSTERS", ("9", "10", "11", "12", "13", "14", "15", "16")),
        ("ATTITUDE THRUSTERS", ("1", "2", "3", "4", "5", "6", "7", "8")),
        ("LIGHTS / RCS A / RCS B", ("", "", "", "", "", "", "", "")),
    )
    for j, (title, legends) in enumerate(rows):
        v = Ht - 1.0 - j * 1.5
        breakers(c, F, rg, 2.3, v, 0.96, legends)
        rg.text(title, 5.6, v - 0.72, 0.075, mc.INK)
        if j >= 3:
            toggle(c, F, 0.9, v, "v", True)
    rg.text("CENTER\nLIGHT", 0.9, Ht - 10.75, 0.06, mc.INK)
    for i, legend in enumerate(("CABIN\nRECIRC", "O2 HIGH\nRATE", "CABIN\nVENT", "WATER\nSEAL", "HI RATE\nRECOCK")):
        u = 1.3 + i * 1.8
        c.into("CrewCabin_PanelFittings").tube(F @ Vector((u, -0.2, 0.2)), F @ Vector((u, -2.6, 0.9)), 0.11 * IN, 8)
        c.turned("CrewCabin_RedCaps", F @ Matrix.Translation((u, -2.6, 0.9)), 0.0, 0.0, [(0.34, -0.3), (0.34, 0.3), (0.0, 0.3)], 12)
        rg.text(legend, u, 0.3, 0.055, mc.INK)
    # ---- the left and right switch and circuit breaker panels
    for key, top3, last, experiment in (
        (
            "left_cb",
            (
                "AUDIO & UHF T/R · HF XMTR-RCVR · WHIP ANTENNAS",
                "ELECT TIMER · BOOST CUTOFF · RETRO · SEQ LIGHTS · PARA CNTL",
                "ATT IND CNTL · BOOST INSERT · RETRO SEQ · LANDING SEQ",
            ),
            ("BOOST\nINSERT", "RETRO\nPWR", "LANDING", "1", "2", "3", "4"),
            False,
        ),
        (
            "right_cb",
            (
                "BOOST INST · RETRO INST · DC PWR · FC O2 & H2 · SCAN",
                "RADAR · AC INV · RCS HTRS · TAPE RCDR · FUEL CELL",
                "ATT IND · AC POWER · BIO MED RCDR · RCS HTR · BUSS TIE",
            ),
            ("1", "2", "3", "4", "1", "2", "3"),
            True,
        ),
    ):
        F = P[key]
        Wd, Ht = 12.5, 8.0
        rg = plate(c, F, [(0, 0), (Wd, 0), (Wd, Ht), (0, Ht)], sheet, 0.8)
        for j, title in enumerate(top3):
            v = Ht - 1.0 - j * 1.75
            breakers(c, F, rg, 0.9, v, 0.94, [""] * (11 if j < 2 else 9))
            rg.text(title, Wd / 2 - 0.6, v + 0.55, 0.07, mc.INK)
        for i, legend in enumerate(last):  # the bottom row: armed and safed, or on and off
            u = 1.2 + i * 1.45
            toggle(c, F, u, 1.25, "v", False)
            rg.text(legend, u, 0.45, 0.065, mc.INK)
        rg.text("RETRO ROCKET SQUIB" if not experiment else "MAIN BATTERIES          SQUIB BATTERIES", Wd / 2, 2.3, 0.07, mc.INK)
        if experiment:  # the switch for this flight's experiment in the cone's glow, on the pilot's side
            rg.rect(Wd - 1.9, 2.9, Wd - 0.3, 4.6, (0.44, 0.45, 0.45), r=0.1)
            rg.text("RE ENT ANT\nEXP", Wd - 1.1, 4.25, 0.065, mc.INK)
            toggle(c, F, Wd - 1.1, 3.4, "v", False)
        # the secondary oxygen shutoff beside it: a quadrant and a lever with a ball on it
        c.turned("CrewCabin_PanelStructure", F, -2.2 if key == "left_cb" else Wd + 2.2, Ht / 2, [(1.9, -0.6), (1.9, 0.0), (0.0, 0.0)], 24)
        u = -2.2 if key == "left_cb" else Wd + 2.2
        c.into("CrewCabin_PanelFittings").tube(F @ Vector((u, Ht / 2, 0.0)), F @ Vector((u + 0.8, Ht / 2 + 1.5, 1.2)), 0.14 * IN, 8)
        c.turned("CrewCabin_RedCaps", F @ Matrix.Translation((u + 0.8, Ht / 2 + 1.5, 1.2)), 0.0, 0.0, [(0.42, -0.35), (0.42, 0.35), (0.0, 0.35)], 12)
    # ---- the centre console between the seats: the attitude hand controller at its forward end, the temperature controls
    F = P["console"]
    rg = plate(c, F, [(0, 0), (5.8, 0), (5.8, 12.0), (0, 12.0)], sheet, 2.2)
    rg.text("TEMP CONTROL", 2.9, 6.9, 0.075, mc.INK)
    for v, legend in ((5.6, "SUIT"), (3.6, "CABIN")):
        knob(c, F, 2.9, v, 0.75)
        rg.text(legend, 4.6, v, 0.065, mc.INK)
    c.box("CrewCabin_PanelFittings", F, 2.9, 1.2, 1.6, 0.6, 0.0, 0.5)
    rg.text("O2 HIGH RATE", 2.9, 2.0, 0.06, mc.INK)
    hand = MeshBuilder()
    hand.lathe(prof([(0.35, 0.0), (0.35, 2.4), (0.8, 2.7), (0.95, 4.6), (0.75, 5.6), (0.0, 5.8)]), 16)
    stick = hand.build("Ctl_AttitudeController", c.M["grip"], c.g, sharp_angle=35)
    stick.matrix_local = rigid(F @ Matrix.Translation((2.9, 9.8, 0.0)))
    stick["reach"] = 0.08
    c.turned("CrewCabin_PanelStructure", F, 2.9, 9.8, [(1.5, 0.0), (1.3, 0.5), (0.5, 0.7)], 20)
    # ---- the water management panel on the bulkhead between the men, at shoulder height: three valves
    F = P["water"]
    rg = plate(c, F, [(0, 0), (4.8, 0), (4.8, 3.6), (0, 3.6)], sheet, 0.6)
    for u, v, legend in ((1.2, 2.5, "CNDSATE VALVE"), (3.6, 2.5, "H2O TANK VALVE"), (2.4, 0.9, "WASTE VALVE")):
        c.box("CrewCabin_Knobs", F, u, v, 0.4, 1.0, 0.0, 0.5)
        rg.text(legend, u, v + 0.75, 0.06, mc.INK)


def fittings(c: Station, say) -> None:
    """What else is in the cabin: the abort handle, the water, the stowage, the lights, the curtains along the hinges."""
    eq, fab = c.into("CrewCabin_Equipment"), c.into("CrewCabin_Stowage")
    # the abort handle on the left wall beside the command pilot's panel: a lever in a slotted quadrant
    w = half_width(137.0)
    base = V(4.0, -(w - 0.9), 137.0)
    chamfered(eq, (4.2, 1.6, 5.0), Matrix.Translation(base * IN), 0.2)
    lever = MeshBuilder()
    lever.tube(Vector((0, 0, 0)), Vector((0.02, 0.07, 0.01)), 0.22 * IN, 8)
    lever.lathe(prof([(0.0, -0.6), (0.6, -0.4), (0.6, 0.4), (0.0, 0.6)]), 14, matrix=Matrix.Translation(Vector((0.02, 0.085, 0.01))))
    handle = lever.build("Ctl_Abort", c.M["red"], c.g, sharp_angle=35)
    handle.matrix_local = Matrix.Translation((base + Vector((1.0, 0.8, 0.0))) * IN)
    handle["reach"] = 0.06
    say(
        handle,
        "Abort handle",
        "By the command pilot's left hand: a lever in a slotted quadrant, normal at one end and abort at the other, with the "
        "engines' shutdown between. Gemini's aborts are the crew's to call. Below 15,000 ft the answer is the seats; above "
        "it, this handle shuts the Titan down and fires the retrograde rockets together to pull the ship off it. Its form is "
        "SEDR 300's figure; where it is on the wall is laid out.",
    )
    # sixteen pounds of drinking water in a container forward of the bulkhead between the seats (p. 3-26)
    eq.tube(V(-9.0, 0.0, Z_SILL + 3.6) * IN, V(6.5, 0.0, Z_SILL + 3.6) * IN, 3.0 * IN, 20)
    # the stowage: a box on the centreline, one aft on each hand, one on each side wall; the food and the cameras went in them
    soft(fab, Matrix.Translation(V(18.5, 0.0, Z_SILL + 3.0) * IN), (7.0, 9.0, 4.6), 0.6)
    for side in (-1, 1):
        soft(fab, Matrix.Translation(V(24.0, side * 24.0, Z_SILL + 2.6) * IN), (5.0, 7.0, 4.0), 0.6)
    # a floodlight on each side and one at the centre (p. 3-20): their places estimated
    for name, at in (
        ("Left", V(13.0, -half_width(139.0) + 0.9, 139.0)),
        ("Right", V(13.0, half_width(139.0) - 0.9, 139.0)),
        ("Centre", V(CABIN.r(zz(136.0)) - WALL - 1.6, 0.0, 136.0)),
    ):
        chamfered(eq, (1.4, 1.4, 3.4), Matrix.Translation(at * IN), 0.2)
        lens = MeshBuilder()
        chamfered(lens, (1.0, 1.0, 2.6), Matrix.Translation((at + Vector((-0.5, 0.0, 0.0))) * IN), 0.15)
        lens.build(f"Lamp_{name}", c.M["cabin_lamp"].copy(), c.g, sharp_angle=35)
    # the hatch curtain along each hinge, held by five snaps (p. 2-19)
    cur, snaps = c.into("CrewCabin_HatchCurtains"), c.into("CrewCabin_PanelFittings")
    for side in (-1, 1):
        zs = [zz(112.0) + (zz(148.0) - zz(112.0)) * j / 12 for j in range(13)]
        for j in range(12):
            quad = []
            for z, a in ((zs[j], HATCH_OUT - deg(1)), (zs[j + 1], HATCH_OUT - deg(1)), (zs[j + 1], HATCH_OUT - deg(8)), (zs[j], HATCH_OUT - deg(8))):
                r = inner(side * a, z) - 0.35
                quad.append(tuple(Vector((r * math.cos(side * a), r * math.sin(side * a), z)) * IN))
            cur.add(quad, [(0, 1, 2, 3)])
        for k in range(5):
            z = zz(115.0 + k * 7.5)
            a = side * (HATCH_OUT - deg(2.5))
            r = inner(a, z) - 0.37
            p = Vector((r * math.cos(a), r * math.sin(a), z)) * IN
            snaps.disc(p, -Vector((math.cos(a), math.sin(a), 0.0)), 0.22 * IN, 0.1 * IN, 10)


MATERIALS = {
    "CrewStation_PressureVessel": "titanium",
    "CrewStation_Stiffeners": "titanium_ribs",
    "CrewCabin_InstrumentPanel": "panel_main",
    "CrewCabin_PanelStructure": "cabin_paint",
    "CrewCabin_Instruments": "faces",
    "CrewCabin_Bezels": "bezel",
    "CrewCabin_InstrumentGlass": "crystal",
    "CrewCabin_PanelFittings": "lever",
    "CrewCabin_Knobs": "bezel",
    "CrewCabin_RedCaps": "red",
    "CrewCabin_WhiteCaps": "white_plastic",
    "CrewCabin_Equipment": "equipment",
    "CrewCabin_Stowage": "cushion",
    "CrewCabin_HatchCurtains": "webbing",
}
SMOOTH = (
    "CrewCabin_Bezels",
    "CrewCabin_PanelFittings",
    "CrewCabin_Knobs",
    "CrewCabin_RedCaps",
    "CrewCabin_WhiteCaps",
    "CrewCabin_InstrumentGlass",
    "CrewCabin_Stowage",
)


def build(parent, M: dict, font, names: tuple[str, str], say) -> None:
    """Everything in the pressure vessel, and the vessel. The vessel's walls are built at every level of detail (they
    close the hatches' openings from behind); the rest only where an inside is built."""
    c = Station(parent, CABIN, M)
    vessel(c)
    if not interior():
        c.mb.pop("CrewStation_Stiffeners", None)
        c.finish({"CrewStation_PressureVessel": "titanium"})
        return
    mc._font = font
    for key, mat in mc.materials().items():
        M.setdefault(key, mat)
    M["titanium_ribs"] = M["liner"]
    sheet = Sheet("gemini-panels", 4096)
    faces = Sheet("gemini-faces", 2048, mc.BLACK)
    P = frames()
    main_panels(c, P, sheet, faces)
    side_panels(c, P, sheet)
    fittings(c, say)
    for name, side, who in (("CommandPilot", -1, names[0]), ("Pilot", 1, names[1])):
        seat(c, name, side, who, say)
    c.finish(MATERIALS, smooth=SMOOTH)
    for sh, key in ((sheet, "panel_main"), (faces, "faces")):
        img = sh.image()
        for k in (key, *(("telelight", "drum") if key == "faces" else ())):
            mat = M[k]
            tex = mat.node_tree.nodes.new("ShaderNodeTexImage")
            tex.image = img
            bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
            mat.node_tree.links.new(tex.outputs["Color"], bsdf.inputs["Base Color"])
    for obj in c.lenses:
        obj.data.materials[0] = M["telelight"].copy()
    for name, label, about in (
        ("CrewCabin_InstrumentPanel", "Instrument panels", PANELS_ABOUT),
        ("CrewStation_PressureVessel", "Pressure vessel", VESSEL_ABOUT),
    ):
        say(bpy.data.objects[name], label, about)


PANELS_ABOUT = (
    "The panels as spacecraft 3 flew them, from McDonnell's own drawing of this ship's. Before the command pilot: the ball that "
    "shows which way the ship points, the accelerometer and the abort lamp above it, the Titan's tank pressures, the event "
    "timer, the counters that say how much speed is still to be added, the rate of descent and the altimeter for the way down. "
    "The round space beside the rate of descent is blank: this ship had no clock there. Before the pilot: a second ball, the "
    "clock, the computer's readout and its keyboard. Between them the environment, the radios and the column of lamps pressed "
    "as each event of the flight is called; below, the pedestal with the modes of the radar, the platform, the computer and "
    "the attitude control, and the four buttons for the parachutes. Their layout is the drawing's; their sizes are scaled from "
    "it on the keyboard, which is 3.38 in square; the instruments' graduations are estimated."
)
VESSEL_ABOUT = (
    "The pressure vessel: a welded titanium box inside the cone, its sides and bulkheads double skins with stiffeners between, "
    "the hatches for its roof. The room between its flat sides and the cone is equipment bays. No drawing read gives its "
    "dimensions: it is laid out here so that what is documented fits in it, the seats at their cant with a helmet clear of the "
    "hatch, the panels at their sizes, and a seated eye that looks along the trough through its window."
)
