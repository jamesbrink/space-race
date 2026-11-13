"""The Mercury-Atlas launch vehicle: Convair's Atlas D as changed for Mercury (LV-3B), a stage and a half.

Shared by the flights that rode it (MA-6 to MA-9); a flight's model/vehicle.py imports this module and
calls build(). Dimensions are inches. Stations are Convair's, which run from the nose toward the tail
(the tank's forward mating ring is station 502, the staging plane station 1133); `base_z` places the
booster engines' exit plane in the flight's own coordinates, where +Z is toward the nose.

See ./atlas-lv3b.md for what each number rests on: which are a report's, and which are read off the
photographs of Atlas 109-D on Complex 14 and leaving it.

Angles are in the flight's frame, in which the capsule's hatch is on +X. The Atlas has two axes: the one
its two equipment pods and its two booster engines lie on, and the one its two verniers lie on, square to
it. `pods_at` is where the first pod stands: under the capsule's window, as MA-6's photographs have it.

Top-level nodes: AtlasAdapter  AtlasTank  AtlasPods  AtlasVerniers  AtlasSustainer  AtlasBoosterSection  AtlasBoosterEngines
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import srlib
from redstone_mrlv import _reuse
from srlib import IN, TAU, MeshBuilder, Surf, arc_profile, deg, frame, group, interior, material, prof, text_mesh

# ------------------------------------------------------------------ stations and sizes (in)

TANK_R = 60.0  # the tank is 10 ft across
S_MATE = 502.0  # the forward mating ring, where the Mercury adapter is bolted on
MATE_R = 35.0  # the tank's radius there: "approximately 70 inches" across
S_SHOULDER = 642.0  # where the forward taper reaches the full 10 ft
S_BULKHEAD = 958.0  # where the intermediate bulkhead meets the wall: oxygen above it, fuel below
BULKHEAD_RISE = 45.0  # how far that bulkhead bulges forward into the oxygen
INSULATION = 2.5  # the insulation under it, where a vehicle kept it, and its retaining bulkhead: how far below the bulkhead's crown: estimated
DOME_RISE = 18.0  # how far the oxygen tank's forward dome stands above the mating ring, inside the adapter
S_STAGING = 1133.0  # the plane the booster section parts from the tank at
S_TANK_AFT = 1135.0  # the thrust ring, just under the staging plane, where the tank's wall turns in to the thrust cone
S_GIMBAL = 1206.0  # the sustainer's gimbal, at the thrust cone's apex
S_SKIRT = 1212.0  # the foot of the booster section's ribbed skin
S_FAIRING = 1283.0  # the foot of the booster section: the engines stand 2 ft 3 in below it
S_BOOSTER_GIMBAL = 1230.0  # the booster engines' gimbals
S_EXIT = 1310.0  # the booster engines' exit plane: 67 ft 4 in below the mating ring
S_SUSTAINER_EXIT = 1308.0
ADAPTER_H = 50.75  # the Mercury adapter: the capsule's stations Z52.69 to Z103.44
ADAPTER_R = (35.3, 36.6)  # its radius at the mating ring and at the clamp ring, just inside the capsule's 74.5 in heat shield
Z_CLAMP = 1.06  # the adapter's top below the capsule's plane of maximum diameter, Z104.50
# Engine exit plane to the capsule's plane of maximum diameter.
LENGTH = (S_EXIT - S_MATE) + ADAPTER_H + Z_CLAMP

SEAM = 32.0  # from one ring weld of the tank to the next
POD_LONG = (855.0, 30.0)  # the long pod: the station of its point, and the length of its pointed fairing
POD_STUB = (980.0, 42.0)  # the short pod opposite
POD = (19.5, 14.0)  # a pod's half width, and how far it stands off the tank
RATE_GYRO = 686.0  # the station of the rate gyro package on the wiring fairing
LOX_LINE = (935.0, 5.3)  # the oxygen duct: the station it leaves the tank at, and its radius
SKIRT_R = 60.6  # the booster section's skin, a cylinder on the tank's own line
NACELLE = (35.0, 98.0)  # a booster engine's fairing at its foot: its half width, and how far its crest is from the vehicle's axis
BOOSTER_AT = 63.0  # a booster engine's axis from the vehicle's
BOOSTER_EXIT_R = 24.5  # a booster engine's nozzle at its exit
SUSTAINER_EXIT_R = 24.0
VERNIER_LINE = (88.0, 3.0)  # the slender fairing above the first vernier's own: its length and radius
PRESSURE_LINE = 1.9  # the radius of the pressurisation line that runs from the second vernier to the top of the tank
LETTERS = (648.0, 950.0, (13.0, 19.0))  # UNITED STATES down the tank: from, to, and a letter's height (round the tank) and width (along it)
SERIAL_S = 1089.0  # the serial number's station

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "Adapter_Skin",
    "Adapter_Structure",
    "Adapter_ClampRing",
    "Adapter_Rings",
    "Adapter_Door",
    "Tank_Skin",
    "Tank_Frost",
    "Tank_Seams",
    "Tank_FrostSeams",
    "Tank_InnerWall",
    "Tank_DomeShield",
    "Tank_Lettering",
    "Tank_Serial",
    "Pods_Fairings",
    "Pods_Bands",
    "Pods_Fasteners",
    "Booster_Skirt",
    "Booster_Fairings",
    "Booster_InnerWall",
    "Booster_HeatShield",
)


def materials() -> dict:
    m = material
    return {
        # type 301 stainless, cold-rolled and bright: the tank is its own skin, and is not painted
        "stainless": m("stainless-301", (0.70, 0.71, 0.72), 1.0, 0.34),
        "stainless_in": m("stainless-inner", (0.50, 0.51, 0.52), 1.0, 0.5),
        "frost": m("frost-lox", (0.90, 0.93, 0.96), 0.0, 0.95),
        "adapter": m("paint-adapter-black", (0.02, 0.02, 0.022), 0.2, 0.55),
        "clamp": m("paint-clamp-red", (0.50, 0.035, 0.02), 0.0, 0.5),
        "black": m("paint-booster-black", (0.018, 0.018, 0.02), 0.0, 0.5),
        "fibreglass": m("fibreglass-shield", (0.58, 0.52, 0.36), 0.0, 0.8),
        "pod": m("aluminium-sheet", (0.56, 0.57, 0.57), 0.9, 0.66),
        "skirt": m("aluminium-corrugated", (0.66, 0.67, 0.67), 0.9, 0.5),
        "inner": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "alu": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "engine": m("engine-steel", (0.30, 0.29, 0.28), 1.0, 0.42, double_sided=True),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
    }


def tank_r(s: float) -> float:
    """The tank's radius at a station: a straight taper from the mating ring to the shoulder, then 10 ft."""
    if s >= S_SHOULDER:
        return TANK_R
    return MATE_R + (TANK_R - MATE_R) * (s - S_MATE) / (S_SHOULDER - S_MATE)


def _oval(half: float, deep: float, power: float, plane: float, n: int = 24) -> list[tuple[float, float]]:
    """Half a superellipse standing on a round skin: (across, off the plane it is drawn on) points from one foot over to
    the other. `power` 2 is half an ellipse; 4 and more a box with round shoulders. `plane` is how far that plane is
    from the axis of the skin, which is a cylinder of TANK_R: the two feet are carried down through it."""
    out = []
    for i in range(n + 1):
        a = math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        out.append((half * math.copysign(abs(c) ** (2 / power), c), deep * abs(s) ** (2 / power)))
    foot = math.sqrt(TANK_R**2 - min(half, TANK_R - 1.0) ** 2) - plane - 1.0
    out[0], out[-1] = (out[0][0], foot), (out[-1][0], foot)
    return out


def _close(mb: MeshBuilder, at, cut, s: float, up: bool) -> None:
    """The end of a fairing whose section is `cut`: a flat face across it at station s, facing the nose (`up`) or the tail."""
    low = min(r for _, r in cut)
    mb.grid(lambda i, k: at(cut[i][0], low + (cut[i][1] - low) * k, s), range(len(cut)), (0.0, 1.0) if up else (1.0, 0.0))


def _say(obj, label: str, about: str):
    """What a thing says of itself when pointed at (the viewer reads `label` and `about` off the mesh under the pointer)."""
    obj["label"], obj["about"] = label, about
    return obj


def _hoop(r0: float, r1: float, z0: float, z1: float) -> list[tuple[float, float]]:
    """A ring of rectangular section as a closed profile, faces outward: radii r0 to r1, heights z0 to z1."""
    return prof([(r0, z0), (r1, z0), (r1, z1), (r0, z1), (r0, z0)])


def _fluted(mb: MeshBuilder, wall, count: int, tall: float, matrix: Matrix | None = None) -> None:
    """A thrust chamber's bell made of tubes brazed side by side: `wall` is its (r, z) profile in inches, walked upward;
    `count` tubes round it, each standing `tall` proud at the bell's exit and in proportion above it."""
    if srlib.DETAIL < 0.5:
        mb.lathe(prof(wall), 48, matrix=matrix)
        return
    per = 4 if srlib.DETAIL >= 1.0 else 2
    widest = max(r for r, _ in wall)
    mb.grid(
        lambda u, j: (
            (wall[j][0] + tall * wall[j][0] / widest * max(0.0, math.cos(u * count))) * math.cos(u) * IN,
            (wall[j][0] + tall * wall[j][0] / widest * max(0.0, math.cos(u * count))) * math.sin(u) * IN,
            wall[j][1] * IN,
        ),
        [TAU * i / (count * per) for i in range(count * per)],
        range(len(wall)),
        closed_u=True,
        matrix=matrix,
    )


def _down(mb: MeshBuilder, surf: Surf, body: str, s0: float, s1: float, size, theta: float, z_of, font, off: float = 0.3) -> None:
    """Lettering down a tank: one letter under the next, evenly, from station s0 to s1, read from the nose toward the
    tail with the letters' heads toward the greater angle. `size`: a letter's height (which lies round the tank) and the
    width of its widest (which lies along it); `z_of` turns a station into a height."""
    tall, wide = size
    pitch = (s1 - s0) / len(body)
    marks = {}
    for ch in set(body.replace(" ", "")):
        verts, faces = text_mesh(ch, 1.0, font)
        xs, ys = [v[0] for v in verts], [v[1] for v in verts]
        marks[ch] = (verts, faces, min(xs), max(xs), min(ys), max(ys))
    kx = wide / max(m[3] - m[2] for m in marks.values())
    for i, ch in enumerate(body):
        if ch == " ":
            continue
        verts, faces, x0, x1, y0, y1 = marks[ch]
        ky = tall / (y1 - y0)
        mid = s0 + pitch * (i + 0.5)
        mb.add(
            [tuple(surf.p(theta + (y - (y0 + y1) / 2) * ky / surf.r(0.0), z_of(mid + (x - (x0 + x1) / 2) * kx), off)) for x, y, _ in verts],
            faces,
        )


def build(base_z: float, font=None, serial: str = "10 9D", pods_at: float = deg(-45), insulation_bulkhead: bool = False) -> None:
    """Build the launch vehicle with its booster engines' exit plane at `base_z` (inches) of the flight's frame.
    `serial`: the vehicle's number as painted on the fuel tank, in two parts either side of a vernier's line.
    `pods_at`: the angle of the first equipment pod (the one the conduit from the adapter runs down to).
    `insulation_bulkhead`: whether the vehicle flew with the insulation under its intermediate bulkhead and the
    bulkhead that kept it there: 109-D had them taken out on the pad, 107-D kept them (atlas-lv3b.md)."""
    M = _reuse(materials())
    z = lambda s: base_z + (S_EXIT - s)  # noqa: E731  a station's height in the flight's frame
    detail = srlib.DETAIL
    body = Surf(TANK_R, 0.0, 0.0)
    radial = lambda a: Vector((math.cos(a), math.sin(a), 0.0))  # noqa: E731
    verniers_at = (pods_at + deg(90), pods_at - deg(90))

    def ribbed(mb: MeshBuilder, r_of, s0: float, s1: float, count: int, tall: float, rows: int = 2) -> None:
        """A skin stiffened by ribs pressed along it, `count` of them round, standing `tall` proud: from station s0 down to s1."""
        if detail < 0.5:
            mb.lathe(prof([(r_of(s1 + (s0 - s1) * j / rows), z(s1 + (s0 - s1) * j / rows)) for j in range(rows + 1)]), 96)
            return
        per = 4 if detail >= 1.0 else 2
        us = [TAU * i / (count * per) for i in range(count * per)]
        stations = [s1 + (s0 - s1) * j / rows for j in range(rows + 1)]  # walked upward
        mb.grid(
            lambda u, s: (
                (r_of(s) + tall * max(0.0, math.cos(u * count))) * math.cos(u) * IN,
                (r_of(s) + tall * max(0.0, math.cos(u * count))) * math.sin(u) * IN,
                z(s) * IN,
            ),
            us,
            stations,
            closed_u=True,
        )

    # ------------------------------------------------------------------ adapter
    # A ring of titanium, stiffened along its length, between the tank's mating ring and the clamp ring that holds the
    # capsule's heat shield. It stays on the Atlas: the capsule leaves it when the clamp's bolts are fired.
    g = group("AtlasAdapter")
    s_top = S_MATE - ADAPTER_H
    ad_r = lambda s: ADAPTER_R[0] + (ADAPTER_R[1] - ADAPTER_R[0]) * (S_MATE - s) / ADAPTER_H  # noqa: E731
    skin = MeshBuilder()
    ribbed(skin, ad_r, s_top, S_MATE - 1.2, 108, 0.42)
    skin.build("Adapter_Skin", M["adapter"], g, sharp_angle=None)
    inner = MeshBuilder()
    inner.lathe(prof([(ad_r(S_MATE) - 0.5, z(S_MATE)), (ad_r(s_top) - 0.5, z(s_top))]), 96, flip=True)
    inner.build("Adapter_Structure", M["inner"], g, sharp_angle=None)
    rings = MeshBuilder()  # the frame at its foot, proud of the ribs, where it is bolted to the tank's mating ring
    rings.lathe(_hoop(ad_r(S_MATE) - 0.8, ad_r(S_MATE) + 0.75, z(S_MATE), z(S_MATE - 1.6)), 128)
    rings.build("Adapter_Rings", M["adapter"], g, sharp_angle=30)
    # The clamp ring: three segments drawn round the capsule's rim by explosive bolts, a fairing over each bolt. It shows
    # red in the photographs of the liftoff.
    clamp = MeshBuilder()
    cz = z(s_top)
    clamp.lathe(prof([(ADAPTER_R[1], cz), (ADAPTER_R[1] + 0.9, cz), (ADAPTER_R[1] + 0.9, cz + 0.96), (ADAPTER_R[1] - 0.3, cz + 0.96)]), 128)
    for i in range(3):
        a = pods_at + deg(60) + TAU * i / 3
        at = frame(radial(a) * (ADAPTER_R[1] + 0.2) * IN + Vector((0, 0, (cz + 0.5) * IN)), radial(a))
        us = [math.pi * k / 10 for k in range(11)]
        vs = [math.pi * k / 12 for k in range(13)]
        clamp.grid(
            lambda u, v: Vector((2.4 * IN * math.sin(v) * math.cos(u), -3.4 * IN * math.cos(v), 1.7 * IN * math.sin(v) * math.sin(u))),
            us,
            vs,
            matrix=at,
            flip=True,
        )
    _say(
        clamp.build("Adapter_ClampRing", M["clamp"], g, sharp_angle=30),
        "Clamp ring",
        "What holds the capsule to the Atlas: a band in three segments round the heat shield's rim, drawn tight by three explosive bolts. "
        "At sustainer cutoff the bolts are fired, the band flies apart and the posigrade rockets push the capsule away. "
        "Its colour is the liftoff photograph's; its section and the bolts' fairings are estimated.",
    )
    # the access door in its side, standing proud of the ribs: where it is and how big are read off one photograph
    door = MeshBuilder()
    d0, d1 = s_top + 14.0, S_MATE - 12.0
    a0, a1 = pods_at - deg(44), pods_at - deg(14)
    out = 0.75
    at = lambda a, s, k=1.0: radial(a) * (ad_r(s) - 0.2 + (out + 0.2) * k) * IN + Vector((0, 0, z(s) * IN))  # noqa: E731
    angles = [a0 + (a1 - a0) * i / 8 for i in range(9)]
    door.grid(at, angles, (d1, d0))
    door.grid(lambda a, k: at(a, d0, k), angles, (1.0, 0.0))  # its upper edge
    door.grid(lambda a, k: at(a, d1, k), angles, (0.0, 1.0))  # its lower edge
    door.grid(lambda s, k: at(a0, s, k), (d1, d0), (0.0, 1.0))
    door.grid(lambda s, k: at(a1, s, k), (d1, d0), (1.0, 0.0))
    door.build("Adapter_Door", M["adapter"], g, sharp_angle=40)

    # ------------------------------------------------------------------ tank
    # One stainless balloon, oxygen above the intermediate bulkhead and fuel below it, held in shape by its own
    # pressure. At launch the oxygen tank's wall is white with frost from the mating ring down to the bulkhead.
    g = tank = group("AtlasTank")
    frost, bare, seams, fseams = (MeshBuilder() for _ in range(4))
    taper = [S_MATE + (S_SHOULDER - S_MATE) * i / 6 for i in range(7)]
    frost.lathe(prof([(tank_r(s), z(s)) for s in (S_BULKHEAD, *taper[::-1])]), 144)
    bare.lathe(prof([(TANK_R, z(S_TANK_AFT)), (TANK_R, z(S_BULKHEAD))]), 144)
    bare.tube((0, 0, (z(S_GIMBAL) - 1.8) * IN), (0, 0, (z(S_GIMBAL) + 1.5) * IN), 7.0 * IN, 24)  # the gimbal block in the cone's apex
    # the thrust cone, from the aft ring in to the sustainer's gimbal
    bare.lathe(prof([(7.0, z(S_GIMBAL)), (TANK_R, z(S_TANK_AFT))]), 144)
    s = S_MATE + SEAM
    while s < S_STAGING - 4:  # the ring welds, each sheet lapped on the next
        band = [(tank_r(s + d) + o, z(s + d)) for d, o in ((0.7, -0.05), (0.55, 0.07), (-0.55, 0.07), (-0.7, -0.05))]
        if abs(s - S_BULKHEAD) > 1.5:
            (fseams if s < S_BULKHEAD else seams).lathe(prof(band), 144)
        s += SEAM
    # the two rings that show: the mating ring at the top, the bulkhead's ring where the frost ends
    for s, mb in ((S_MATE + 1.4, fseams), (S_BULKHEAD, seams)):
        mb.lathe(prof([(tank_r(s + d) + o, z(s + d)) for d, o in ((1.3, -0.05), (1.0, 0.22), (-1.0, 0.22), (-1.3, -0.05))]), 144)
    frost.build("Tank_Frost", M["frost"], g, sharp_angle=None)
    bare.build("Tank_Skin", M["stainless"], g, sharp_angle=None)
    seams.build("Tank_Seams", M["stainless"], g, sharp_angle=None)
    fseams.build("Tank_FrostSeams", M["frost"], g, sharp_angle=None)
    wall = MeshBuilder()  # the skin's inner face, standing off it: what is sunk through the skin ends behind this
    wall.lathe(prof([(tank_r(s) - 0.7, z(s)) for s in (S_TANK_AFT, S_BULKHEAD, *taper[::-1])]), 96, flip=True)
    wall.build("Tank_InnerWall", M["stainless_in"], g, sharp_angle=None)
    # Over the oxygen tank's forward dome, inside the adapter: the fibreglass shield that keeps the capsule's posigrade
    # rockets' fire off the thin dome, and on its crown the boil-off valve
    dome_h = DOME_RISE
    shield = MeshBuilder()
    shield.lathe(prof([((MATE_R - 1.5) * math.cos(a), z(S_MATE) + dome_h * math.sin(a)) for a in (math.pi / 2 * i / 12 for i in range(13))]), 96)
    shield.build("Tank_DomeShield", M["fibreglass"], g, sharp_angle=None)
    valve = MeshBuilder()
    top = z(S_MATE) + dome_h
    valve.lathe(prof([(6.0, top - 1.2), (6.0, top + 1.8), (5.0, top + 2.6), (0.0, top + 2.6)]), 32)
    # its vent: a tube from the valve out through a port in the adapter's wall, opposite the access door
    vent_a = (a0 + a1) / 2 + deg(180)
    valve.tube(
        (radial(vent_a) * 4.0 + Vector((0, 0, top + 0.2))) * IN,
        (radial(vent_a) * (ad_r(S_MATE - 18) + 1.6) + Vector((0, 0, top + 0.2))) * IN,
        2.2 * IN,
        16,
    )
    _say(
        valve.build("Tank_BoilOffValve", M["alu"], g, sharp_angle=40),
        "Liquid oxygen boil-off valve",
        "On the crown of the oxygen tank, inside the adapter: it lets the boiling oxygen's vapour out while the tank is being filled "
        "and topped up, and is shut for flight. Mercury's Atlas had a lighter valve than the missile's. "
        "That it was there, and that its tube left through a port opposite the adapter's door, is documented; its form here is estimated.",
    )
    if interior():  # the cup hung on three straps under the retropack, to keep its debris off the dome
        cup = MeshBuilder()
        cup_z = top + 4.3
        cup.lathe(prof([(0.0, cup_z), (13.0, cup_z), (15.0, cup_z + 1.6)]), 48)
        for i in range(3):
            a = pods_at + deg(60) + TAU * i / 3
            cup.tube(
                (radial(a) * 15.0 + Vector((0, 0, cup_z + 1.6))) * IN,
                (radial(a) * (ad_r(s_top + 6.0) - 0.9) + Vector((0, 0, z(s_top + 6.0)))) * IN,
                0.4 * IN,
                8,
            )
        _say(
            cup.build("Adapter_RetroRetainer", M["inner"], g, sharp_angle=35),
            "Retropack retainer",
            "A cup on three straps inside the adapter, under the capsule's retropack: what falls from the pack when the capsule "
            "leaves is caught here and kept off the oxygen tank's thin dome. Documented; its size is estimated.",
        )
    domes = MeshBuilder()
    rise = BULKHEAD_RISE
    # the oxygen tank's forward dome, under the shield
    domes.lathe(
        prof([((MATE_R - 2.6) * math.cos(a), z(S_MATE) + (dome_h - 1.2) * math.sin(a)) for a in (math.pi / 2 * i / 10 for i in range(11))]), 64
    )
    # the intermediate bulkhead, bulging forward into the oxygen
    domes.lathe(prof([((TANK_R - 1.4) * math.cos(a), z(S_BULKHEAD) + rise * math.sin(a)) for a in (math.pi / 2 * i / 12 for i in range(13))]), 64)
    domes.lathe(prof([(TANK_R - 1.6, z(S_BULKHEAD)), (TANK_R - 0.6, z(S_BULKHEAD))]), 64)
    domes.build("Tank_Bulkheads", M["stainless_in"], g, sharp_angle=None)
    if insulation_bulkhead:
        # Under the intermediate bulkhead, on the fuel's side: insulation between the cold oxygen and the kerosene, and
        # a thin bulkhead that keeps it there. That a vehicle had them is its report's; how thick the insulation was and
        # what the bulkhead was made of are not in anything read.
        keep = MeshBuilder()
        under = INSULATION + 0.6  # the retaining bulkhead's own depth under the insulation
        keep.lathe(
            prof(
                [
                    ((TANK_R - 1.4) * math.cos(a), z(S_BULKHEAD) + (rise - INSULATION) * math.sin(a) - under * (1.0 - math.sin(a)))
                    for a in (math.pi / 2 * i / 12 for i in range(13))
                ]
            ),
            64,
        )
        keep.lathe(prof([(TANK_R - 1.6, z(S_BULKHEAD) - under), (TANK_R - 0.6, z(S_BULKHEAD) - under)]), 64)
        # (seen from the fuel's side, and from the oxygen's where the tank is cut: its own material, drawn both ways)
        lagging = material("insulation-bulkhead", (0.50, 0.44, 0.30), 0.0, 0.85, double_sided=True)
        _say(
            keep.build("Tank_InsulationBulkhead", lagging, g, sharp_angle=None),
            "Insulation bulkhead",
            "Between the liquid oxygen above and the kerosene below there is one thin steel dome. On the fuel's side of it the Atlas "
            "carried a layer of insulation, held up by a second, lighter bulkhead: this. On the vehicle before this one fuel was "
            "found to have leaked into the insulation, and both were cut out on the pad; this vehicle kept them. "
            "That it had them is documented; their thickness and material here are estimated.",
        )
    # paint: UNITED STATES down the oxygen tank, beside the first vernier's line, and the vehicle's number above that
    # vernier, in two parts either side of the slender fairing that runs up from it
    paint, number = MeshBuilder(), MeshBuilder()
    _down(paint, body, "UNITED STATES", LETTERS[0], LETTERS[1], LETTERS[2], verniers_at[0] + deg(15), z, font)
    paint.build("Tank_Lettering", M["black"], g, smooth=False)
    tall = 13.0
    for part, side in zip(serial.split(), (-1, 1)):
        verts, faces = text_mesh(part, 1.0, font)
        xs, ys = [v[0] for v in verts], [v[1] for v in verts]
        k = tall / (max(ys) - min(ys))
        # (the part to the left of the line ends 5 in from it; the part to the right begins 5 in from it)
        x0 = -(max(xs) * k + 5.0) if side < 0 else 5.0 - min(xs) * k
        cy = (max(ys) + min(ys)) / 2
        number.add([tuple(body.wrap(verniers_at[0], z(SERIAL_S), x0 + x * k, (y - cy) * k, 0.3)) for x, y, _ in verts], faces)
    number.build("Tank_Serial", M["black"], g, smooth=False)

    # ------------------------------------------------------------------ pods
    # Fairings down the tank's sides over what could not go inside a tank: guidance, autopilot, telemetry, range safety,
    # the abort sensing system. A long one on one side and a short one opposite; a fairing over the wiring and plumbing
    # runs on from the long one's point to the top of the tank. They stay with the tank when the booster section goes.
    g = group("AtlasPods")
    fair, bands, lines, rivets = (MeshBuilder() for _ in range(4))
    half, deep = POD
    for a, tip, nose in ((pods_at, *POD_LONG), (pods_at + deg(180), *POD_STUB)):
        er, et = radial(a), Vector((-math.sin(a), math.cos(a), 0.0))
        at = lambda t, r, s, er=er, et=et: (er * (TANK_R - 1.0 + r) + et * t) * IN + Vector((0, 0, z(s) * IN))  # noqa: E731
        stations = [tip + nose * i / 6 for i in range(7)] + [S_STAGING - 0.5]
        # (from a blunt point to the full section: 0 at the point, 1 where the fairing is full)
        grow = [0.1 + 0.9 * min(1.0, (s - tip) / nose) for s in stations]
        cuts = [_oval(half * k, deep * k, 2.0 + 2.5 * (k - 0.1) / 0.9, TANK_R - 1.0) for k in grow]
        fair.grid(lambda i, j, cuts=cuts, stations=stations, at=at: at(*cuts[j][i], stations[j]), range(25), range(len(stations)))
        _close(fair, at, cuts[-1], S_STAGING - 0.5, up=False)  # its foot
        _close(fair, at, cuts[0], tip, up=True)  # its point, cut off blunt
        s = tip + nose + 2.0
        while s < S_STAGING - 10:  # the straps round it, and a row of screws down each side of its face between them
            cut = _oval(half + 0.16, deep + 0.16, 4.5, TANK_R - 1.0)
            bands.grid(lambda i, j, cut=cut, s=s, at=at: at(*cut[i], s + 0.9 - 1.8 * j), range(25), (1, 0))
            for q in range(1, 12):
                sq = s + 58.0 * q / 12
                if sq < S_STAGING - 4:
                    for t in (-half * 0.52, half * 0.52):
                        rivets.disc(at(t, deep + 1.0, sq), er, 0.3 * IN, 0.07 * IN)
            s += 58.0
    # the fairing over the wiring and plumbing, from the adapter down the taper to the long pod's point, and the rate gyro
    # package on it under the shoulder
    er = radial(pods_at)
    path = [S_MATE - 6.0, S_MATE + 2.0, *[S_MATE + (S_SHOULDER - S_MATE) * i / 4 for i in range(1, 5)], POD_LONG[0] + 4.0]
    pts = [(er * ((ad_r(s) if s < S_MATE else tank_r(s)) + 2.6) + Vector((0, 0, z(s)))) * IN for s in path]
    for p0, p1 in zip(pts, pts[1:]):
        lines.tube(p0, p1, 1.5 * IN, 12)
    for s in path[1:-1]:  # its clips
        lines.tube((er * (tank_r(s) - 0.35) + Vector((0, 0, z(s)))) * IN, (er * (tank_r(s) + 2.6) + Vector((0, 0, z(s)))) * IN, 0.6 * IN, 8)
    gyro = MeshBuilder()
    gz = z(RATE_GYRO)
    gyro.lathe(
        prof([(0.0, gz - 13.0), (2.8, gz - 11.5), (3.6, gz - 8.0), (3.6, gz + 8.0), (2.8, gz + 11.5), (0.0, gz + 13.0)]),
        20,
        matrix=Matrix.Translation(er * (TANK_R + 5.2) * IN),  # (clear of the skin: it rides on the fairing's line)
    )
    fair.build("Pods_Fairings", M["pod"], g, sharp_angle=35)
    bands.build("Pods_Bands", M["pod"], g, sharp_angle=35)
    rivets.build("Pods_Fasteners", M["bolt"], g)
    lines.build("Pods_Conduit", M["pod"], g, sharp_angle=40)
    _say(
        gyro.build("Pods_RateGyro", M["pod"], g, sharp_angle=35),
        "Rate gyro package",
        "Gyros that feel how fast the vehicle is turning, for the autopilot. Mercury's Atlas carried a set well forward on the tank, "
        "because the long capsule and tower made the thin tank bend, and the turning had to be felt where it mattered. "
        "This one is where the Atlas D's drawing has a rate gyro and the photographs of 109-D show a canister; its size is estimated.",
    )
    if interior():  # what a pod held, as plain cases: representative
        gear = MeshBuilder()
        for a, tip, nose, cases in ((pods_at, *POD_LONG, (34.0, 26.0, 40.0, 30.0, 22.0)), (pods_at + deg(180), *POD_STUB, (30.0, 24.0))):
            for i, tall in enumerate(cases):
                s = tip + nose + 20.0 + 44.0 * i
                # (a frame's own axes: across the pod, up it, and out from the tank)
                gear.box((22.0 * IN, tall * IN, 8.0 * IN), frame((radial(a) * (TANK_R + 6.0) + Vector((0, 0, z(s) - tall / 2))) * IN, radial(a)))
        gear.build("Pods_Equipment", M["equipment"], g, sharp_angle=35)

    # ------------------------------------------------------------------ verniers
    # Two small engines on the tank's sides at the foot of its cylinder, square to the pods, fed by the sustainer's
    # pumps: they roll the vehicle, which one gimballed sustainer cannot, and trim its speed.
    g = group("AtlasVerniers")
    fair, chamber, bell, pipes = (MeshBuilder() for _ in range(4))
    for k, a in enumerate(verniers_at):
        axis = Matrix.Translation((radial(a) * (TANK_R + 4.5)) * IN)
        foot = z(S_STAGING) + 2.0
        # its fairing: a flared hood over the engine, pointed at the top
        hood = [(8.6, foot), (8.2, foot + 6.0), (5.6, foot + 16.0), (3.2, foot + 25.0), (2.6, foot + 31.0)]
        fair.lathe(prof(hood), 28, matrix=axis)
        if k == 0:  # a slender fairing up the tank from the hood, pointed at its top
            top = foot + 31.0 + VERNIER_LINE[0]
            fair.lathe(prof([(VERNIER_LINE[1], foot + 29.0), (VERNIER_LINE[1], top), (0.3, top + 9.0)]), 16, matrix=axis)
        else:  # the oxygen tank's pressurisation line, from the hood to a cap under the mating ring
            run = [S_STAGING - 30.0, S_SHOULDER, *[S_MATE + (S_SHOULDER - S_MATE) * i / 4 for i in range(3, 0, -1)], S_MATE + 14.0]
            pts = [(radial(a) * (tank_r(s) + 4.5) + Vector((0, 0, z(s)))) * IN for s in run]
            for p0, p1 in zip(pts, pts[1:]):
                pipes.tube(p0, p1, PRESSURE_LINE * IN, 12)
            pipes.lathe(prof(arc_profile(0, 0, 3.0, -90, 90, 8)), 16, matrix=Matrix.Translation(pts[-1]))
            clips = [S_STAGING - 30.0 - 60.0 * i for i in range(1, 8)] + run[2:-1]
            for s in clips:
                pipes.tube(
                    (radial(a) * (tank_r(s) - 0.35) + Vector((0, 0, z(s)))) * IN,
                    (radial(a) * (tank_r(s) + 4.5) + Vector((0, 0, z(s)))) * IN,
                    0.6 * IN,
                    8,
                )
        # the engine: a small chamber on a gimbal under the hood, its nozzle at the staging plane
        down = (radial(a) * 0.12 + Vector((0, 0, -1))).normalized()
        f = frame((radial(a) * (TANK_R + 5.2) + Vector((0, 0, foot + 7.0))) * IN, down)
        chamber.lathe(prof([(0.0, -1.0), (2.4, -1.0), (2.6, 2.5), (1.5, 6.5)]), 16, matrix=f)
        bell.lathe(prof([(1.5, 6.5), (2.6, 10.0), (3.6, 14.0), (4.1, 17.5)]), 20, matrix=f)
    fair.build("Verniers_Fairings", M["pod"], g, sharp_angle=35)
    chamber.build("Verniers_Chambers", M["engine"], g, sharp_angle=35)
    bell.build("Verniers_Nozzles", M["nozzle"], g, sharp_angle=35)
    _say(
        pipes.build("Verniers_PressureLine", M["pod"], g, sharp_angle=40),
        "Oxygen tank pressurisation line",
        "Helium from the bottles in the booster section, warmed by the engines' exhaust, goes up this pipe outside the tank to the top of "
        "the oxygen tank: the tank is a balloon, and its pressure is its strength. The line is the Atlas D drawing's; its size is estimated.",
    )

    # ------------------------------------------------------------------ sustainer
    # One engine on the vehicle's axis, hung from the apex of the thrust cone, burning from the pad to orbit. Until
    # staging it is inside the booster section, between the two booster engines. The oxygen comes to it down a duct
    # outside the fuel tank.
    g = group("AtlasSustainer")
    eng, noz, pump, duct = (MeshBuilder() for _ in range(4))
    gz = z(S_GIMBAL)
    ez = z(S_SUSTAINER_EXIT)
    span = gz - ez
    wall = [(0.0, gz - 3.0), (7.5, gz - 3.5), (9.0, gz - 0.08 * span), (9.0, gz - 0.2 * span), (5.2, gz - 0.3 * span)]
    eng.lathe(prof(wall[::-1]), 32)
    flare = [(5.2, gz - 0.3 * span), (10.5, gz - 0.45 * span), (16.5, gz - 0.65 * span), (21.3, gz - 0.85 * span), (SUSTAINER_EXIT_R, ez)]
    _fluted(noz, flare[::-1], 60, 0.35)
    for k in (0.5, 0.7, 0.9):  # stiffening hoops round the tubular bell
        r = 5.2 + (SUSTAINER_EXIT_R - 5.2) * ((k - 0.3) / 0.7) ** 0.75
        noz.lathe(prof([(r + 0.2, gz - k * span - 0.8), (r + 1.0, gz - k * span), (r + 0.2, gz - k * span + 0.8)]), 48)
    # its turbopump and gas generator beside the chamber, square to the booster engines
    side = radial(verniers_at[0])
    pump.tube((side * 17.0 + Vector((0, 0, gz - 4.0))) * IN, (side * 17.0 + Vector((0, 0, gz - 30.0))) * IN, 6.0 * IN, 20)
    pump.tube((side * 17.0 + Vector((0, 0, gz - 12.0))) * IN, (side * 4.0 + Vector((0, 0, gz - 9.0))) * IN, 2.2 * IN, 12)
    pump.tube((side * -15.0 + Vector((0, 0, gz - 6.0))) * IN, (side * -15.0 + Vector((0, 0, gz - 24.0))) * IN, 4.2 * IN, 16)
    pump.tube((side * -15.0 + Vector((0, 0, gz - 24.0))) * IN, (side * -29.0 + Vector((0, 0, ez + 10.0))) * IN, 1.8 * IN, 12)  # the turbine's exhaust
    # the oxygen duct: out of the tank's wall above the bulkhead, down the outside of the fuel tank, in under the skirt
    la = pods_at - deg(60)
    lr = TANK_R + LOX_LINE[1] + 1.2
    lox = [(radial(la) * (TANK_R - 2.0) + Vector((0, 0, z(LOX_LINE[0])))) * IN, (radial(la) * lr + Vector((0, 0, z(LOX_LINE[0])))) * IN]
    lox += [(radial(la) * lr + Vector((0, 0, z(S_STAGING + 16.0)))) * IN, (radial(la) * 30.0 + Vector((0, 0, z(S_GIMBAL - 6.0)))) * IN]
    for p0, p1 in zip(lox, lox[1:]):
        duct.tube(p0, p1, LOX_LINE[1] * IN, 20)
    for elbow in lox[1:3]:  # (a ball at each elbow, a little fuller than the duct)
        duct.lathe(prof(arc_profile(0, 0, LOX_LINE[1] + 0.5, -90, 90, 10)), 20, matrix=Matrix.Translation(elbow))
    for s in (LOX_LINE[0] + 50.0, LOX_LINE[0] + 110.0, S_STAGING - 14.0):  # the bands that hold it to the tank
        duct.lathe(_hoop(LOX_LINE[1] - 0.3, LOX_LINE[1] + 0.5, z(s) - 1.2, z(s) + 1.2), 24, matrix=Matrix.Translation(radial(la) * lr * IN))
        duct.tube((radial(la) * (TANK_R - 0.35) + Vector((0, 0, z(s)))) * IN, (radial(la) * (lr - 1.0) + Vector((0, 0, z(s)))) * IN, 1.2 * IN, 8)
    eng.build("Sustainer_Chamber", M["engine"], g, sharp_angle=35)
    noz.build("Sustainer_Nozzle", M["engine"], g, sharp_angle=35)
    pump.build("Sustainer_Turbopump", M["alu"], g, sharp_angle=40)
    _say(
        duct.build("Tank_LoxLine", M["pod"], tank, sharp_angle=40),  # (the tank's own plumbing: it stays on the tank)
        "Liquid oxygen line",
        "The oxygen tank is above the fuel tank, so its oxygen comes down to the engines in a duct outside the fuel tank's wall. "
        "Where it leaves the tank and runs is the Atlas D drawing's and the photographs'; its size is scaled off the drawing.",
    )

    # ------------------------------------------------------------------ booster section
    # The half stage: a skirt round the thrust cone carrying the two booster engines, their pumps, and a fairing over
    # each engine that takes up the line of the pod above it. About two minutes up it is unlatched from the tank's
    # thrust ring and slides off aft on tracks, over the sustainer, which burns on.
    g = group("AtlasBoosterSection")
    skirt, fairs, inside, shield, fit = (MeshBuilder() for _ in range(5))
    ribbed(skirt, lambda s: SKIRT_R, S_STAGING + 3.0, S_SKIRT, 96, 0.5)
    skirt.lathe(_hoop(SKIRT_R - 0.4, SKIRT_R + 0.9, z(S_STAGING + 3.4), z(S_STAGING + 0.5)), 144)  # the ring at the staging plane

    def nacelle(s: float) -> tuple[float, float, float]:
        """A booster engine's fairing at a station: its half width, how far it stands off the skirt, and how square it is."""
        k = (s - S_STAGING) / (S_FAIRING - S_STAGING)  # 0 at the staging plane, where it takes up the pod's section; 1 at its foot
        return half + (NACELLE[0] - half) * k, deep + (NACELLE[1] - SKIRT_R + 1.4 - deep) * k, 4.5 - 2.3 * k

    # the plain skin below the ribs, left open under each engine's fairing, which is the skin there
    rows = [S_SKIRT + (S_FAIRING - S_SKIRT) * j / 4 for j in range(5)]
    gap = lambda s: math.asin((nacelle(s)[0] - 2.5) / SKIRT_R)  # noqa: E731
    for a in (pods_at, pods_at + math.pi):
        span_of = lambda s, a=a: (a + gap(s), a + math.pi - gap(s))  # noqa: E731
        point = lambda f, s, off=0.0, span_of=span_of: (  # noqa: E731
            radial(span_of(s)[0] + (span_of(s)[1] - span_of(s)[0]) * f) * (SKIRT_R + off) * IN + Vector((0, 0, z(s) * IN))
        )
        fs = [i / 40 for i in range(41)]
        skirt.grid(lambda f, s, point=point: point(f, s, 0.5 if s == S_SKIRT else 0.0), fs, rows[::-1])
        skirt.grid(lambda f, k, point=point: point(f, S_SKIRT, 0.5 - 0.9 * k), fs, (0.0, 1.0))  # the lip under the ribs
        inside.grid(lambda f, s, point=point: point(f, s, -0.55), fs, rows)
    inside.lathe(prof([(SKIRT_R - 0.55, z(S_SKIRT)), (SKIRT_R - 0.55, z(S_STAGING + 3.8))]), 96, flip=True)  # (to under the ring)
    for a in (pods_at, pods_at + deg(180)):
        er, et = radial(a), Vector((-math.sin(a), math.cos(a), 0.0))
        at = lambda t, r, s, er=er, et=et: (er * (SKIRT_R - 1.4 + r) + et * t) * IN + Vector((0, 0, z(s) * IN))  # noqa: E731
        stations = [S_STAGING + 0.9 + (S_FAIRING - S_STAGING - 0.9) * i / 8 for i in range(9)]
        cuts = [_oval(*nacelle(s), SKIRT_R - 1.4) for s in stations]
        fairs.grid(lambda i, j, cuts=cuts, stations=stations, at=at: at(*cuts[j][i], stations[j]), range(25), range(len(stations)))
        _close(fairs, at, cuts[0], S_STAGING + 0.9, up=True)  # its head
        # its inner face
        within = lambda s: _oval(nacelle(s)[0] - 0.5, nacelle(s)[1] - 0.5, nacelle(s)[2], SKIRT_R - 1.4)  # noqa: E731
        lining = [within(s) for s in stations]
        inside.grid(lambda i, j, lining=lining, stations=stations, at=at: at(*lining[j][i], stations[j]), range(25), range(len(stations)), flip=True)
    # the radiation shield across the foot, with the engines through it
    sz = z(S_FAIRING - 9.0)
    holes = (SUSTAINER_EXIT_R * 0.9, BOOSTER_EXIT_R * 0.92)  # round the sustainer, and round each booster engine

    def shield_edge(a: float) -> float:
        """How far out the shield reaches on a bearing from the vehicle's axis: to the skirt, or to a booster engine's hole."""
        off = abs((a - pods_at + math.pi / 2) % math.pi - math.pi / 2)  # the bearing's angle from the booster engines' line
        under = holes[1] ** 2 - (BOOSTER_AT * math.sin(off)) ** 2
        return min(SKIRT_R - 0.7, BOOSTER_AT * math.cos(off) - math.sqrt(under)) if under > 0 else SKIRT_R - 0.7

    shield.grid(
        lambda a, k: radial(a) * (holes[0] + (shield_edge(a) - holes[0]) * k) * IN + Vector((0, 0, sz * IN)),
        [TAU * i / 240 for i in range(240)],
        (1.0, 0.0),
        closed_u=True,
    )
    skirt.build("Booster_Skirt", M["skirt"], g, sharp_angle=None)
    fairs.build("Booster_Fairings", M["skirt"], g, sharp_angle=35)
    inside.build("Booster_InnerWall", M["inner"], g, sharp_angle=None)
    shield.build("Booster_HeatShield", M["inner"], g, sharp_angle=None)
    boosters_at = [radial(a) * BOOSTER_AT for a in (pods_at, pods_at + deg(180))]
    # the thrust structure: a ring beam under the staging plane, and a barrel over each booster engine's gimbal
    fit.lathe(_hoop(SKIRT_R - 9.0, SKIRT_R - 0.8, z(S_STAGING + 23.0), z(S_STAGING + 17.0)), 96)
    for b in boosters_at:
        fit.lathe(_hoop(8.0, 10.5, z(S_BOOSTER_GIMBAL - 2.0), z(S_BOOSTER_GIMBAL - 20.0)), 28, matrix=Matrix.Translation(b * IN))
    fit.build("Booster_ThrustStructure", M["inner"], g, sharp_angle=35)

    # ------------------------------------------------------------------ booster engines
    g = group("AtlasBoosterEngines")
    eng, noz, pump = MeshBuilder(), MeshBuilder(), MeshBuilder()
    gz, ez = z(S_BOOSTER_GIMBAL), z(S_EXIT)
    span = gz - ez
    for b in boosters_at:
        m = Matrix.Translation(b * IN)
        eng.lathe(
            prof([(0.0, gz - 2.0), (8.5, gz - 2.5), (10.5, gz - 0.07 * span), (10.5, gz - 0.2 * span), (7.6, gz - 0.3 * span)][::-1]), 32, matrix=m
        )
        flare = [(7.6, gz - 0.3 * span), (12.5, gz - 0.45 * span), (17.8, gz - 0.63 * span), (22.0, gz - 0.82 * span), (BOOSTER_EXIT_R, ez)]
        _fluted(noz, flare[::-1], 72, 0.35, m)
        for k in (0.5, 0.68, 0.86):
            r = 7.6 + (BOOSTER_EXIT_R - 7.6) * ((k - 0.3) / 0.7) ** 0.75
            noz.lathe(prof([(r + 0.2, gz - k * span - 0.8), (r + 1.0, gz - k * span), (r + 0.2, gz - k * span + 0.8)]), 48, matrix=m)
    # the two engines' pumps stand between them, either side of the sustainer, with one gas generator for both; its
    # exhaust leaves through a duct at the foot of the skirt
    side = radial(verniers_at[1])
    for sx in (1, -1):
        c = side * (33.0 * sx)
        pump.tube((c + Vector((0, 0, gz + 14.0))) * IN, (c + Vector((0, 0, gz - 16.0))) * IN, 7.0 * IN, 20)
        for b in boosters_at:  # each pump feeds both chambers
            pump.tube((c + Vector((0, 0, gz + 6.0))) * IN, (b * 0.86 + c * 0.2 + Vector((0, 0, gz - 1.0))) * IN, 2.4 * IN, 12)
    pump.lathe(
        prof(arc_profile(0, 0, 6.0, -90, 90, 10)),
        20,
        matrix=Matrix.Translation((side * 33.0 + radial(pods_at) * 18.0 + Vector((0, 0, gz + 2.0))) * IN),
    )
    pump.loft(
        [
            (side * 33.0 + Vector((0, 0, gz - 16.0))) * IN,
            (side * 40.0 + Vector((0, 0, gz - 40.0))) * IN,
            (side * 52.0 + Vector((0, 0, z(S_FAIRING) - 4.0))) * IN,
        ],
        [(3.4 * IN, 3.4 * IN)] * 3,
        16,
        ref=tuple(radial(pods_at)),
    )
    eng.build("BoosterEngines_Chambers", M["engine"], g, sharp_angle=35)
    noz.build("BoosterEngines_Nozzles", M["engine"], g, sharp_angle=35)
    pump.build("BoosterEngines_Turbopumps", M["alu"], g, sharp_angle=40)
