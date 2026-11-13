"""The Gemini Launch Vehicle: Martin's Titan II as changed to carry men (GLV), two stages.

Shared by the flights that rode it (GT-3 to Gemini XII); a flight's model/vehicle.py imports this module and
calls build(). Dimensions are inches. Stations are Martin's launch vehicle stations, which run from the nose
toward the tail (the spacecraft's adapter is bolted on at station 276.825, the stages part at station 500, the
first stage's engines end at station 1348.103); `base_z` places that exit plane in the flight's own coordinates,
where +Z is toward the nose.

See ./titan-ii-glv.md for what each number rests on: which are the launch systems report's, and which are read
off the photographs of GLV-3 on Complex 19 and leaving it.

Angles are in the flight's frame, in which the spacecraft's hatches are on +X: that is taken as the side toward
the target (the vehicle's yaw axis), with the pitch axis on Y. The four longerons and the external conduits are
on the diagonals between them.

Top-level nodes: TitanStage2  TitanStage2Engine  TitanInterstage  TitanStage1  TitanStage1Engine
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

import srlib
from srlib import IN, TAU, MeshBuilder, Surf, bore, deg, frame, group, interior, material, prof, text_mesh

# ------------------------------------------------------------------ stations and sizes (in)

R = 60.0  # both stages are 10 ft across
S_IFACE = 276.825  # the spacecraft / launch vehicle interface
S_OX2 = (299.151, 319.522)  # the second stage's oxidiser tank, where its domes meet the wall
S_SPLICE2 = 384.522  # the second stage's manufacturing splice
S_FUEL2 = (424.522, 430.0)  # its fuel tank, likewise
S_FRAMES2 = (351.709, 402.472, 453.375, 485.08)  # other stations the general arrangement gives on the second stage
S_GIMBAL2 = 499.13  # the second stage engine's gimbal
S_SEP = 500.0  # the plane the stages part at
S_EXIT2 = 583.2  # the second stage engine's exit plane
S_PORTS = 596.07  # the head of the ring of exhaust ports
S_TRANSPORT = 621.727  # the transportation splice: the foot of the interstage
S_OX1 = (649.727, 887.826)  # the first stage's oxidiser tank
S_SPLICE1 = 923.326  # the first stage's manufacturing splice
S_FUEL1 = (982.326, 1188.111)  # its fuel tank
S_SKIRT1 = 1224.311  # the foot of the fuel tank's aft skirt, where the engine frame hangs
S_FRAMES1 = (717.25, 918.263, 941.576, 1204.371)
S_GIMBAL1 = 1274.121  # the first stage engines' gimbals
S_EXIT = 1348.103  # the first stage engines' exit plane: 89 ft 3.278 in below the interface
LENGTH = S_EXIT - S_IFACE  # 1071.278

DOME = 34.0  # how far a tank's dome rises from where it meets the wall: estimated
EXIT_R1 = 22.4  # a first stage chamber's exit radius: from an area ratio of 8 (titan-ii-glv.md)
EXIT_R2 = 32.4  # the second stage's, with its ablative skirt: from an area ratio of 49.2
CHAMBERS_AT = 24.0  # a first stage chamber's axis from the vehicle's, on the yaw axis
ROLL_NOZZLE = (44.0, deg(30.65))  # the second stage's roll nozzle: its radius, and its angle from the pitch axis
CONDUIT = (4.4, 2.8)  # an external conduit's half width, and how far it stands off the tank
CONDUIT_1 = (S_OX1[0] + 6.0, S_FUEL1[1] - 2.0)  # the stations a first stage conduit runs between
CONDUIT_2 = ((S_IFACE + 3.0, 337.0), (399.5, 450.0))  # the second stage's, in two pieces, one over each tank
HOLES = (18, 3.4, S_TRANSPORT + 13.0)  # the round holes in the first stage's forward skirt: how many, their radius, their station
PORTS = (4, 4, deg(10.5), deg(2.5))  # the exhaust ports: groups, ports in each, a port's width, the post between two

# paint (titan-ii-glv.md, "Paint": every station here is read off two photographs)
ROLL_RING_2 = 13.0  # the black ring at the head of the interstage, below the separation plane
WHITE_BAND = (S_SPLICE1, 1035.0)
ROLL_RING_1 = (1035.0, 1095.0)
LETTERS = (655.0, 1004.0, (20.0, 16.0))  # UNITED STATES down the first stage: from, to, a letter's height and its widest letter's width
ARROW = (1012.0, 1029.0)  # the mark under the lettering

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "Stage2_Skirt",
    "Stage2_Skin",
    "Stage2_Frames",
    "Stage2_InnerWall",
    "Stage2_SkirtLiner",
    "Interstage_Skin",
    "Interstage_RollRing",
    "Interstage_PanelsBlack",
    "Interstage_PanelsWhite",
    "Interstage_InnerWall",
    "Stage1_ForwardSkirt",
    "Stage1_Skin",
    "Stage1_Frames",
    "Stage1_WhiteBand",
    "Stage1_RollRing",
    "Stage1_PanelsBlack",
    "Stage1_PanelsWhite",
    "Stage1_Lettering",
    "Stage1_InnerWall",
    "Stage1_SkirtLiner",
)


def materials() -> dict:
    m = material
    return {
        # the tanks' walls are the vehicle's skin: aluminium alloy, chemically milled, unpainted
        "skin": m("aluminium-tank", (0.60, 0.61, 0.62), 0.95, 0.42),
        "frame": m("aluminium-frame", (0.52, 0.53, 0.54), 0.95, 0.5),
        "inner": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        # the insulation over the second stage's forward skirt, which only the first three vehicles wore
        "tan": m("insulation-skirt-tan", (0.52, 0.40, 0.25), 0.0, 0.85),
        "white": m("paint-vehicle-white", (0.86, 0.86, 0.84), 0.0, 0.55),
        "black": m("paint-booster-black", (0.018, 0.018, 0.02), 0.0, 0.5),
        "conduit": m("paint-conduit-white", (0.82, 0.82, 0.80), 0.0, 0.6),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "engine": m("engine-steel", (0.30, 0.29, 0.28), 1.0, 0.42, double_sided=True),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "ablative": m("nozzle-ablative", (0.16, 0.12, 0.09), 0.0, 0.8, double_sided=True),
        "alu": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
    }


def reuse(mats: dict) -> dict:
    """Use the materials already in the file where the names match, so the GLB has one of each."""
    out = {}
    for key, mat in mats.items():
        first = bpy.data.materials.get(mat.name.split(".")[0])
        if first is not None and first is not mat:
            bpy.data.materials.remove(mat)
            mat = first
        out[key] = mat
    return out


def say(obj, label: str, about: str):
    """What a thing says of itself when pointed at (the viewer reads `label` and `about` off the mesh under the pointer)."""
    obj["label"], obj["about"] = label, about
    return obj


def hoop(r0: float, r1: float, z0: float, z1: float) -> list[tuple[float, float]]:
    """A ring of rectangular section as a closed profile, faces outward: radii r0 to r1, heights z0 to z1."""
    return prof([(r0, z0), (r1, z0), (r1, z1), (r0, z1), (r0, z0)])


def fluted(mb: MeshBuilder, wall, count: int, tall: float, matrix: Matrix | None = None) -> None:
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


def dome(r: float, z0: float, rise: float, n: int = 12) -> list[tuple[float, float]]:
    """Half an ellipse as an (r, z) run from the wall at z0 in to the axis: `rise` positive bulges toward the nose."""
    return [(r * math.cos(a), z0 + rise * math.sin(a)) for a in (math.pi / 2 * i / n for i in range(n + 1))]


def half_oval(half: float, deep: float, plane: float, n: int = 16) -> list[tuple[float, float]]:
    """The section of a fairing standing on the tank: (across, off the plane it is drawn on) from one foot over to the
    other, its feet carried down through the skin. `plane` is how far that plane is from the vehicle's axis."""
    out = []
    for i in range(n + 1):
        a = math.pi * i / n
        c, s = math.cos(a), math.sin(a)
        out.append((half * math.copysign(abs(c) ** 0.5, c), deep * abs(s) ** 0.5))
    foot = math.sqrt(R**2 - half**2) - plane - 0.4
    out[0], out[-1] = (out[0][0], foot), (out[-1][0], foot)
    return out


def stacked(mb: MeshBuilder, surf: Surf, body: str, s0: float, s1: float, size, theta: float, z_of, font, off: float = 0.3) -> None:
    """Lettering down a tank, each letter upright under the one before: from station s0 to s1. `size`: a letter's height
    and the width of its widest; `z_of` turns a station into a height."""
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
        mid = z_of(s0 + pitch * (i + 0.5))
        # (seen from outside, a letter's right is toward the greater angle)
        mb.add([tuple(surf.p(theta + (x - (x0 + x1) / 2) * kx / surf.r(0.0), mid + (y - (y0 + y1) / 2) * ky, off)) for x, y, _ in verts], faces)


def build(base_z: float, font=None, skirt_insulation: bool = True, conduit_at: float = deg(-45), letters_at: float = deg(-12)) -> None:
    """Build the launch vehicle with its first stage engines' exit plane at `base_z` (inches) of the flight's frame.
    `skirt_insulation`: whether the second stage's forward skirt wears its insulation (GLV-1 to GLV-3 did; GLV-4 on did not).
    `conduit_at`: the angle of the external conduit that the lettering stands beside; `letters_at`: the angle of UNITED STATES."""
    M = reuse(materials())
    z = lambda s: base_z + (S_EXIT - s)  # noqa: E731  a station's height in the flight's frame
    body = Surf(R, 0.0, 0.0)
    radial = lambda a: Vector((math.cos(a), math.sin(a), 0.0))  # noqa: E731
    up = Vector((0, 0, 1))
    at = lambda a, r, s: (radial(a) * r + up * z(s)) * IN  # noqa: E731  a point: angle, radius, station
    diagonals = [conduit_at + TAU * k / 4 for k in range(4)]

    def wall(mb: MeshBuilder, s0: float, s1: float, r: float = R, arc=(0.0, TAU), segs: int = 144, flip: bool = False) -> None:
        """A length of the vehicle's wall from station s0 down to s1."""
        mb.lathe(prof([(r, z(s1)), (r, z(s0))]), max(8, round(segs * (arc[1] - arc[0]) / TAU)), arc=arc, flip=flip)

    def ring(mb: MeshBuilder, s: float, wide: float = 1.4, proud: float = 0.2) -> None:
        """A circumferential splice or weld land standing a little proud of the wall."""
        mb.lathe(
            prof([(R - 0.05, z(s + wide / 2 + 0.3)), (R + proud, z(s + wide / 2)), (R + proud, z(s - wide / 2)), (R - 0.05, z(s - wide / 2 - 0.3))]),
            144,
        )

    def panels(black: MeshBuilder, white: MeshBuilder, s0: float, s1: float) -> None:
        """The roll pattern: eight panels round the vehicle, black on the diagonals and white between."""
        for k in range(8):
            a0 = conduit_at - deg(22.5) + TAU * k / 8
            wall(white if k % 2 else black, s0, s1, arc=(a0, a0 + TAU / 8))

    def conduit(mb: MeshBuilder, bands: MeshBuilder, a: float, s0: float, s1: float, strap: float = 8.5) -> None:
        """An external conduit: a fairing over the wiring and lines that cannot go through a tank, strapped to the wall."""
        er, et = radial(a), Vector((-math.sin(a), math.cos(a), 0.0))
        half, deep = CONDUIT
        plane = R - 1.0
        place = lambda t, r, s: (er * (plane + r) + et * t) * IN + up * (z(s) * IN)  # noqa: E731
        stations = [s0, s0 + 2.5, s0 + 6.0, s1 - 6.0, s1 - 2.5, s1]
        grow = [0.35, 0.8, 1.0, 1.0, 0.8, 0.35]  # rounded off at each end
        cuts = [half_oval(half * k, (deep + 1.0) * k, plane) for k in grow]
        mb.grid(lambda i, j: place(*cuts[j][i], stations[j]), range(len(cuts[0])), range(len(stations)))
        for j, facing in ((0, False), (-1, True)):  # its two ends, closed
            low = min(r for _, r in cuts[j])
            ks = (1.0, 0.0) if facing else (0.0, 1.0)
            mb.grid(lambda i, k, j=j, low=low: place(cuts[j][i][0], low + (cuts[j][i][1] - low) * k, stations[j]), range(len(cuts[0])), ks)
        if srlib.DETAIL >= 0.5:
            cut = half_oval(half + 0.14, deep + 1.14, plane)
            s = s0 + 8.0
            while s < s1 - 7.0:
                bands.grid(lambda i, j, s=s: place(*cut[i], s + 0.5 - 1.0 * j), range(len(cut)), (1, 0))
                s += strap

    def door(mb: MeshBuilder, a: float, s: float, wide: float, tall: float, proud: float = 0.3) -> None:
        """An access door: a plate standing just proud of the wall, `wide` round it and `tall` along it, in inches."""
        half = wide / 2 / R
        angles = [a - half + 2 * half * i / 6 for i in range(7)]
        p = lambda t, st, k=1.0: radial(t) * (R - 0.2 + (proud + 0.2) * k) * IN + up * (z(st) * IN)  # noqa: E731
        s0, s1 = s + tall / 2, s - tall / 2
        mb.grid(p, angles, (s0, s1))
        mb.grid(lambda t, k: p(t, s1, k), angles, (1.0, 0.0))
        mb.grid(lambda t, k: p(t, s0, k), angles, (0.0, 1.0))
        mb.grid(lambda st, k: p(angles[0], st, k), (s0, s1), (0.0, 1.0))
        mb.grid(lambda st, k: p(angles[-1], st, k), (s0, s1), (1.0, 0.0))

    # ------------------------------------------------------------------ second stage
    # Two tanks, oxidiser above fuel, their domes inside the skirts between them; between the tanks the truss that
    # carries the guidance, the flight control and the malfunction detection system; one engine under the fuel tank.
    g = group("TitanStage2")
    skirt, skin, frames, inner, lugs, doors = (MeshBuilder() for _ in range(6))
    wall(skirt, S_IFACE + 1.0, S_OX2[0])
    wall(skin, S_OX2[0], S_SEP)
    for s in (S_OX2[0], S_OX2[1], S_SPLICE2, *S_FUEL2, *S_FRAMES2, S_SEP - 1.0):
        ring(frames, s)
    frames.lathe(hoop(R - 2.6, R + 0.5, z(S_IFACE + 1.0), z(S_IFACE)), 144)  # the interface ring the adapter is bolted to
    for i in range(20):  # the twenty lugs the adapter's bolts go through, outside the wall
        a = TAU * (i + 0.5) / 20
        lugs.box((2.6 * IN, 3.0 * IN, 1.5 * IN), frame(at(a, R + 0.9, S_IFACE + 1.6), radial(a)))
        lugs.disc(at(a, R + 0.9, S_IFACE + 3.1), -up, 0.55 * IN, 0.5 * IN)
    wall(inner, S_OX2[0], S_SEP, r=R - 0.7, segs=96, flip=True)
    liner = MeshBuilder()  # the skirt's inner face: seen from inside only, so a port through the skirt is not shut by it
    wall(liner, S_IFACE + 1.2, S_OX2[0], r=R - 0.7, segs=96, flip=True)
    liner.build("Stage2_SkirtLiner", M["frame"], g, sharp_angle=None)
    # what the photographs show on the second stage's wall: two small doors and one large one (titan-ii-glv.md)
    door(doors, conduit_at - deg(40), 345.0, 9.0, 9.0)
    door(doors, conduit_at + deg(46), 345.0, 9.0, 9.0)
    door(doors, conduit_at - deg(10), 380.0, 30.0, 28.0)
    skirt_obj = skirt.build("Stage2_Skirt", M["tan"] if skirt_insulation else M["skin"], g, sharp_angle=None)
    skin.build("Stage2_Skin", M["skin"], g, sharp_angle=None)
    frames.build("Stage2_Frames", M["frame"], g, sharp_angle=30)
    inner.build("Stage2_InnerWall", M["inner"], g, sharp_angle=None)
    lugs.build("Stage2_InterfaceLugs", M["frame"], g, sharp_angle=35)
    doors.build("Stage2_Doors", M["frame"], g, sharp_angle=40)
    # the two ports the spacecraft's aft-firing thrusters were test-fired through on the pad, opposite each other
    scupper = MeshBuilder()
    bpy.context.view_layer.update()
    for a in (deg(90), deg(-90)):
        port = frame(at(a, R, S_IFACE + 11.0), radial(a))
        scupper.lathe(hoop(3.15, 4.6, -1.6, 0.4), 24, matrix=port)
        if srlib.DETAIL >= 0.5:
            bore((skirt_obj.name,), port, 3.3 * IN, 4.0 * IN)
            scupper.lathe(prof([(3.15, -1.6), (3.15, -8.0), (0.0, -8.0)]), 24, matrix=port, flip=True)
        else:  # (from far off the skirt is not cut: a dark disc in the ring)
            scupper.lathe(prof([(3.15, 0.3), (0.0, 0.3)]), 24, matrix=port)
    say(
        scupper.build("Stage2_ScupperPorts", M["engine"], g, sharp_angle=35),
        "Scupper port",
        "The spacecraft's two aft-firing thrusters point straight down at this stage's oxidiser tank. On the pad, before the "
        "launch, they were fired for a moment to prove them; a lined duct, a scupper, took each one's exhaust out through the "
        "side of the forward skirt here. That there were two, opposite each other, is documented; where round the vehicle is not.",
    )
    fair, bands = MeshBuilder(), MeshBuilder()
    for s0, s1 in CONDUIT_2:
        conduit(fair, bands, conduit_at, s0, s1)
    say(
        fair.build("Stage2_Conduit", M["conduit"], g, sharp_angle=40),
        "External conduit",
        "Wiring cannot go through a tank, so it goes round: under a fairing on the outside of the wall, past the oxidiser tank and "
        "past the fuel tank, and inside the vehicle between them. The missile had two on this stage; Gemini's needed one. "
        "The two lengths are read off the liftoff photograph.",
    )
    bands.build("Stage2_ConduitStraps", M["conduit"], g, sharp_angle=40)
    tanks = MeshBuilder()
    tanks.lathe(prof(dome(R - 1.2, z(S_OX2[0]), DOME)), 96)  # the oxidiser tank's forward dome: its crown stands inside the adapter
    if interior():
        tanks.lathe(prof(dome(R - 1.2, z(S_OX2[1]), -DOME)[::-1]), 64)
        tanks.lathe(prof(dome(R - 1.2, z(S_FUEL2[0]), DOME)), 64)
        tanks.lathe(prof(dome(R - 1.2, z(S_FUEL2[1]), -DOME * 0.55)[::-1]), 64)
    say(
        tanks.build("Stage2_Tanks", M["inner"], g, sharp_angle=None),
        "Second stage tanks",
        "Nitrogen tetroxide above, a half-and-half blend of hydrazine and UDMH below: they burn on touching, so the engine has no "
        "igniter, and they keep at ordinary temperatures, so the vehicle could stand loaded. The oxidiser tank's dome stands up "
        "inside the spacecraft's adapter. Where each dome meets the wall is documented; how far the domes bulge is estimated.",
    )
    if interior():
        # between the tanks: the two equipment trusses, new for Gemini, and what they carried (representative)
        truss, gear = MeshBuilder(), MeshBuilder()
        tz = z(378.0)
        for sy in (1, -1):
            for sx in (-1, 1):
                truss.tube(Vector((sx * 44.0, sy * 22.0, tz)) * IN, Vector((sx * 4.0, sy * 22.0, tz)) * IN, 1.1 * IN, 8)
                truss.tube(Vector((sx * 44.0, sy * 22.0, tz)) * IN, at(math.atan2(sy * 22.0, sx * 52.0), R - 1.5, 378.0), 1.1 * IN, 8)
            truss.tube(Vector((-44.0, sy * 22.0, tz)) * IN, Vector((-44.0, sy * 40.0, tz)) * IN, 1.1 * IN, 8)
            truss.tube(Vector((44.0, sy * 22.0, tz)) * IN, Vector((44.0, sy * 40.0, tz)) * IN, 1.1 * IN, 8)
            for i, (wide, tall) in enumerate(((16.0, 12.0), (12.0, 16.0), (18.0, 10.0), (12.0, 12.0))):
                gear.box((wide * IN, 12.0 * IN, tall * IN), Matrix.Translation(Vector((-33.0 + 22.0 * i, sy * 31.0, tz + 1.4 + tall / 2)) * IN))
        say(
            truss.build("Stage2_EquipmentTruss", M["alu"], g, sharp_angle=35),
            "Equipment truss",
            "Between the two tanks, two trusses carry what flies the vehicle. They were designed again for Gemini to hold what the "
            "missile had not had: the radio guidance in place of the missile's inertial set, a second flight control system that "
            "could take over from the first, and the malfunction detection system that told the crew what the vehicle was doing. "
            "That they were there is documented; their form here is not.",
        )
        gear.build("Stage2_Equipment", M["equipment"], g, sharp_angle=35)
        # the thrust cone under the fuel tank, down to the engine's gimbal
        cone = MeshBuilder()
        for a in (TAU * i / 8 for i in range(8)):
            cone.tube(at(a, R - 2.0, S_FRAMES2[2]), at(a, 5.0, S_GIMBAL2 - 3.0), 1.2 * IN, 8)
        cone.lathe(hoop(0.0, 6.5, z(S_GIMBAL2 - 1.0), z(S_GIMBAL2 - 5.0)), 24)
        cone.build("Stage2_ThrustStructure", M["alu"], g, sharp_angle=35)

    # ------------------------------------------------------------------ second stage engine
    # One chamber of 100,000 lbf hung under the fuel tank, inside the interstage until the stages part. Its bell is
    # tubes down to a ring and an ablative skirt below that; its turbine's exhaust goes out through a small nozzle
    # that swivels, which is all the roll control the stage has.
    g = group("TitanStage2Engine")
    eng, noz, skirt2, pump, roll = (MeshBuilder() for _ in range(5))
    gz, ez = z(S_GIMBAL2), z(S_EXIT2)
    span = gz - ez
    eng.lathe(prof([(0.0, gz - 2.0), (6.0, gz - 2.5), (8.2, gz - 0.07 * span), (8.2, gz - 0.2 * span), (4.7, gz - 0.29 * span)][::-1]), 32)
    fluted(noz, [(4.7, gz - 0.29 * span), (9.5, gz - 0.38 * span), (14.5, gz - 0.48 * span), (17.8, gz - 0.56 * span)][::-1], 64, 0.3)
    noz.lathe(hoop(17.6, 19.0, gz - 0.56 * span - 0.7, gz - 0.56 * span + 0.7), 64)  # where the skirt is bolted on
    skirt2.lathe(prof([(17.8, gz - 0.57 * span), (23.5, gz - 0.7 * span), (28.6, gz - 0.85 * span), (EXIT_R2, ez)][::-1]), 96)
    side = radial(deg(90))
    pump.tube((side * 15.0 + up * (gz - 5.0)) * IN, (side * 15.0 + up * (gz - 27.0)) * IN, 5.5 * IN, 20)
    pump.tube((side * 15.0 + up * (gz - 13.0)) * IN, (side * 4.5 + up * (gz - 9.0)) * IN, 2.0 * IN, 12)
    pump.tube((side * -13.0 + up * (gz - 6.0)) * IN, (side * -13.0 + up * (gz - 20.0)) * IN, 3.6 * IN, 16)
    # the turbine's exhaust, led round to the roll nozzle at its documented place
    ra = deg(90) + ROLL_NOZZLE[1]
    rp = radial(ra) * ROLL_NOZZLE[0]
    pump.loft(
        [(side * 15.0 + up * (gz - 27.0)) * IN, (side * 22.0 + radial(ra) * 8.0 + up * (gz - 31.0)) * IN, (rp + up * (gz - 30.0)) * IN],
        [(2.0 * IN, 2.0 * IN)] * 3,
        12,
        ref=(0, 0, 1),
    )
    roll.lathe(prof([(2.0, 0.0), (2.2, 4.0), (3.6, 9.0)]), 20, matrix=frame((rp + up * (gz - 30.0)) * IN, -up))
    eng.build("Stage2Engine_Chamber", M["engine"], g, sharp_angle=35)
    noz.build("Stage2Engine_Nozzle", M["engine"], g, sharp_angle=35)
    say(
        skirt2.build("Stage2Engine_AblativeSkirt", M["ablative"], g, sharp_angle=None),
        "Ablative skirt",
        "The lower two thirds of the bell is not cooled by fuel as the upper third is: it is a moulded skirt that chars slowly "
        "for the three minutes the engine burns. It widens the bell to the size that pays in a vacuum. Its size here is computed "
        "from the engine's published expansion ratio.",
    )
    pump.build("Stage2Engine_Turbopump", M["alu"], g, sharp_angle=40)
    say(
        roll.build("Stage2Engine_RollNozzle", M["nozzle"], g, sharp_angle=35),
        "Roll nozzle",
        "One gimballed engine can steer in pitch and yaw but cannot roll the stage. The gas that has driven the engine's pumps "
        "is let out here through a small nozzle that swivels, and that is the second stage's roll control. Its place, 44 in from "
        "the axis and 30°39′ from the pitch axis, is the general arrangement's; its form is estimated.",
    )

    # ------------------------------------------------------------------ interstage
    # The first stage's top, round the second stage's engine. The second stage's engine is lit before the stages part
    # ("fire in the hole"), and its exhaust goes out through the ring of ports at the foot. It wears the roll pattern.
    g = group("TitanInterstage")
    sk, rr, pb, pw, wl, ports = (MeshBuilder() for _ in range(6))
    wall(rr, S_SEP, S_SEP + ROLL_RING_2)
    panels(pb, pw, S_SEP + ROLL_RING_2, S_PORTS)
    wall(wl, S_SEP + 0.4, S_PORTS, r=R - 0.7, segs=96, flip=True)
    # the ring of exhaust ports: rails above and below, posts between the ports, and solid wall between the groups
    rail = 2.6
    wall(ports, S_PORTS, S_PORTS + rail)
    wall(ports, S_TRANSPORT - rail, S_TRANSPORT)
    count, each, wide, post = PORTS
    run = each * wide + (each - 1) * post
    for k in range(count):
        mid = conduit_at + deg(45) + TAU * k / count  # the groups stand on the axes, under the white panels
        a = mid - run / 2
        wall(ports, S_PORTS + rail, S_TRANSPORT - rail, arc=(mid - TAU / count + run / 2, a))
        for i in range(each - 1):
            wall(ports, S_PORTS + rail, S_TRANSPORT - rail, arc=(a + wide + (wide + post) * i, a + (wide + post) * (i + 1)), segs=288)
    rr.build("Interstage_RollRing", M["black"], g, sharp_angle=None)
    pb.build("Interstage_PanelsBlack", M["black"], g, sharp_angle=None)
    pw.build("Interstage_PanelsWhite", M["white"], g, sharp_angle=None)
    wl.build("Interstage_InnerWall", M["inner"], g, sharp_angle=None)
    sk.lathe(hoop(R - 2.2, R + 0.25, z(S_SEP + 0.9), z(S_SEP)), 144)  # the frame at the separation plane
    sk.build("Interstage_Skin", M["frame"], g, sharp_angle=30)
    say(
        ports.build("Interstage_ExhaustPorts", M["inner"], g, sharp_angle=30),
        "Exhaust ports",
        "The second stage's engine is started while the stages are still bolted together, and only then are the bolts fired: the "
        "upper stage is never without thrust, so its propellants stay settled over its pumps. For that fraction of a second the "
        "engine fires into the top of the first stage, and these openings let the blast out. Young saw it as a flash of orange "
        "light all round the spacecraft. Their number and size are counted off the photographs.",
    )

    # ------------------------------------------------------------------ first stage
    g = group("TitanStage1")
    fwd, skin, frames, inner, white, ring1, pb, pw = (MeshBuilder() for _ in range(8))
    wall(fwd, S_TRANSPORT, S_OX1[0])
    wall(skin, S_OX1[0], WHITE_BAND[0])
    wall(white, *WHITE_BAND)
    wall(ring1, *ROLL_RING_1)
    panels(pb, pw, ROLL_RING_1[1], S_SKIRT1)
    for s in (S_TRANSPORT + 0.9, *S_OX1, *S_FRAMES1[:2]):  # (none where the wall is painted: the photographs show none there)
        ring(frames, s)
    wall(inner, S_OX1[0], S_SKIRT1, r=R - 0.7, segs=96, flip=True)
    liner = MeshBuilder()  # (as the second stage's: the holes through the skirt are not shut by it)
    wall(liner, S_TRANSPORT + 0.3, S_OX1[0], r=R - 0.7, segs=96, flip=True)
    liner.build("Stage1_SkirtLiner", M["frame"], g, sharp_angle=None)
    fwd_obj = fwd.build("Stage1_ForwardSkirt", M["skin"], g, sharp_angle=None)
    skin.build("Stage1_Skin", M["skin"], g, sharp_angle=None)
    frames.build("Stage1_Frames", M["frame"], g, sharp_angle=30)
    white.build("Stage1_WhiteBand", M["white"], g, sharp_angle=None)
    ring1.build("Stage1_RollRing", M["black"], g, sharp_angle=None)
    pb.build("Stage1_PanelsBlack", M["black"], g, sharp_angle=None)
    pw.build("Stage1_PanelsWhite", M["white"], g, sharp_angle=None)
    inner.build("Stage1_InnerWall", M["inner"], g, sharp_angle=None)
    # the round holes in the forward skirt, under the exhaust ports
    bpy.context.view_layer.update()
    n, hr, hs = HOLES
    rims, dark = MeshBuilder(), MeshBuilder()
    for i in range(n):
        a = conduit_at + TAU * (i + 0.5) / n
        rims.lathe(hoop(hr - 0.15, hr + 0.7, -1.6, 0.2), 20, matrix=frame(at(a, R, hs), radial(a)))
        if srlib.DETAIL >= 0.5:
            bore((fwd_obj.name,), frame(at(a, R, hs), radial(a)), hr * IN, 4.0 * IN)
        else:
            dark.lathe(prof([(hr - 0.15, 0.14), (0.0, 0.14)]), 20, matrix=frame(at(a, R, hs), radial(a)))
    rims.build("Stage1_SkirtHoleRims", M["frame"], g, sharp_angle=35)
    if dark.verts:
        dark.build("Stage1_SkirtHoles", M["black"], g, sharp_angle=None)
    # paint: UNITED STATES down the wall, each letter upright under the last, and a mark under it
    paint = MeshBuilder()
    stacked(paint, body, "UNITED STATES", LETTERS[0], LETTERS[1], LETTERS[2], letters_at, z, font)
    half = 1.3 / R
    for (s0, s1), w in (((ARROW[0], ARROW[1] - 5.0), half), ((ARROW[1] - 5.0, ARROW[1]), half * 2.4)):
        for i in range(4):  # a bar, and a wider foot to it: the photographs show no more
            paint.add(
                [tuple(body.p(letters_at + w * (1 - 2 * (i + k) / 4), z(s), 0.3)) for s in (s0, s1) for k in (0, 1)],
                [(0, 1, 3, 2)],
            )
    paint.build("Stage1_Lettering", M["black"], g, smooth=False)
    fair, bands = MeshBuilder(), MeshBuilder()
    for a in (conduit_at, conduit_at + deg(180)):
        conduit(fair, bands, a, *CONDUIT_1)
    say(
        fair.build("Stage1_Conduits", M["conduit"], g, sharp_angle=40),
        "External conduit",
        "The wiring from the engines and the lines that pressurise the tanks with their own vapour run up the outside of the "
        "wall under these fairings, one each side. The one beside the lettering is the photographs'; the other is the drawing's.",
    )
    bands.build("Stage1_ConduitStraps", M["conduit"], g, sharp_angle=40)
    lon = MeshBuilder()  # the four longerons on the aft skirt that the engine's frame hangs from
    for a in diagonals:
        lon.box((7.0 * IN, 34.0 * IN, 6.0 * IN), frame(at(a, R - 1.0, S_SKIRT1 - 17.0), radial(a)))
    lon.build("Stage1_Longerons", M["frame"], g, sharp_angle=35)
    tanks = MeshBuilder()
    tanks.lathe(prof(dome(R - 1.2, z(S_OX1[0]), DOME)), 96)  # the oxidiser tank's forward dome, under the second stage's engine
    if interior():
        tanks.lathe(prof(dome(R - 1.2, z(S_OX1[1]), -DOME)[::-1]), 64)
        tanks.lathe(prof(dome(R - 1.2, z(S_FUEL1[0]), DOME)), 64)
        tanks.lathe(prof([(8.0, z(S_SKIRT1 + 2.0)), (R - 1.2, z(S_FUEL1[1]))]), 64)  # the fuel tank's conical floor
    say(
        tanks.build("Stage1_Tanks", M["inner"], g, sharp_angle=None),
        "First stage tanks",
        "Oxidiser above, fuel below, as in the second stage, and the walls of the tanks are the walls of the vehicle. The "
        "oxidiser comes down to the engines through a pipe that runs through the middle of the fuel tank. Where each tank "
        "meets the wall is documented; the domes' depth and the floor's shape are estimated.",
    )
    if interior():
        feed = MeshBuilder()
        feed.tube(Vector((0, 0, z(S_OX1[1] + DOME - 2.0))) * IN, Vector((0, 0, z(S_SKIRT1 + 4.0))) * IN, 5.2 * IN, 20)
        say(
            feed.build("Stage1_OxidiserFeedConduit", M["alu"], g, sharp_angle=40),
            "Oxidiser feed line",
            "The oxidiser tank is above the fuel tank, and its feed line goes straight down through the fuel inside a conduit of "
            "its own. On this vehicle that conduit's joints were lapped; from the next they were butt-welded. Documented that it "
            "was so; its size is estimated.",
        )

    # ------------------------------------------------------------------ first stage engine
    # Two chambers on one frame, each with its own pumps: 430,000 lbf between them at liftoff. They hang below the fuel
    # tank's skirt in the open; nothing is faired.
    g = group("TitanStage1Engine")
    eng, noz, pump, stack, fr, pogo, scoop = (MeshBuilder() for _ in range(7))
    gz, ez = z(S_GIMBAL1), z(S_EXIT)
    span = gz - ez
    top = z(S_SKIRT1)
    chambers = [Vector((sx * CHAMBERS_AT, 0.0, 0.0)) for sx in (1, -1)]
    for c in chambers:
        m = Matrix.Translation(c * IN)
        eng.lathe(
            prof([(0.0, gz - 2.0), (9.0, gz - 2.6), (11.5, gz - 0.09 * span), (11.5, gz - 0.27 * span), (7.9, gz - 0.38 * span)][::-1]), 32, matrix=m
        )
        flare = [(7.9, gz - 0.38 * span), (12.6, gz - 0.52 * span), (17.2, gz - 0.69 * span), (20.6, gz - 0.86 * span), (EXIT_R1, ez)]
        fluted(noz, flare[::-1], 72, 0.35, m)
        for k in (0.55, 0.72, 0.9):  # stiffening bands round the tubes
            r = 7.9 + (EXIT_R1 - 7.9) * ((k - 0.38) / 0.62) ** 0.72
            noz.lathe(prof([(r + 0.2, gz - k * span - 0.8), (r + 1.0, gz - k * span), (r + 0.2, gz - k * span + 0.8)]), 48, matrix=m)
        # the frame: from two longerons down to this chamber's gimbal, and a tie across
        for a in diagonals:
            if radial(a).dot(c) > 0:
                fr.tube(at(a, R - 1.5, S_SKIRT1 + 2.0), (c + up * (gz + 1.0)) * IN, 1.9 * IN, 10)
        fr.lathe(hoop(0.0, 5.5, gz - 4.5, gz + 3.0), 20, matrix=m)
        # its pumps, outboard of it on the pitch axis' side, and the turbine's exhaust stack down beside the bell
        for sy in (1, -1):
            p = c + Vector((0.0, sy * 27.0, 0.0))
            if sy > 0:
                pump.tube((p + up * (gz + 20.0)) * IN, (p + up * (gz - 8.0)) * IN, 6.6 * IN, 20)
                pump.tube((p + up * (gz + 6.0)) * IN, (c + Vector((0, 9.0, gz - 6.0))) * IN, 2.3 * IN, 12)
                stack.loft(
                    [(p + up * (gz - 6.0)) * IN, (p + Vector((0, 3.0, gz - 30.0))) * IN, (p + Vector((0, 2.0, ez + 6.0))) * IN],
                    [(3.0 * IN, 3.0 * IN)] * 3,
                    16,
                    ref=(1, 0, 0),
                    caps=(False, True),
                )
            else:
                pump.tube((p + up * (gz + 14.0)) * IN, (p + up * (gz - 2.0)) * IN, 4.4 * IN, 16)  # the gas generator and start cartridge
                pump.tube((p + up * (gz + 6.0)) * IN, (c + Vector((0, -9.0, gz - 5.0))) * IN, 1.6 * IN, 10)
        # the propellant lines down from the tank to the pumps: oxidiser from the middle, fuel from the tank's floor
        ox = [Vector((0, 0, top - 3.0)), c * 0.5 + Vector((0, 14.0, top - 14.0)), c + Vector((0, 25.0, gz + 20.0))]
        pump.loft([p * IN for p in ox], [(3.4 * IN, 3.4 * IN)] * 3, 16, ref=(1, 0, 0))
        fu = [c * 1.4 + Vector((0, 20.0, top + 6.0)), c * 1.3 + Vector((0, 26.0, top - 8.0)), c + Vector((0, 29.0, gz + 20.0))]
        pump.loft([p * IN for p in fu], [(3.0 * IN, 3.0 * IN)] * 3, 16, ref=(1, 0, 0))
        # what was added against the vehicle's lengthwise shaking: a standpipe on the oxidiser line, an accumulator on the fuel
        sp = c * 0.5 + Vector((0, 14.0, top - 14.0))
        pogo.tube((sp + Vector((0, -5.0, 0.0))) * IN, (sp + Vector((0, -5.0, 0.0)) + up * 26.0) * IN, 1.9 * IN, 12)
        pogo.tube(sp * IN, (sp + Vector((0, -5.0, 0.0))) * IN, 1.5 * IN, 10)
        fa = c * 1.3 + Vector((0, 26.0, top - 8.0))
        pogo.tube((fa + Vector((c.x * 0.25, 0.0, 0.0))) * IN, (fa + Vector((c.x * 0.25, 0.0, 0.0)) + up * 9.0) * IN, 3.6 * IN, 16)
    fr.tube((chambers[0] + up * (gz + 1.0)) * IN, (chambers[1] + up * (gz + 1.0)) * IN, 2.2 * IN, 10)
    for sy in (1, -1):  # the two air scoops at the foot of the skirt, on the pitch axis
        a = deg(90) * sy
        scoop.loft(
            [at(a, R + 0.4, S_SKIRT1 - 12.0), at(a, R + 1.8, S_SKIRT1 - 5.0), at(a, R + 2.6, S_SKIRT1 + 3.0)],
            [(1.2 * IN, 0.8 * IN), (4.2 * IN, 2.2 * IN), (5.2 * IN, 2.8 * IN)],
            14,
            ref=tuple(radial(a)),
            caps=(True, False),
        )
    eng.build("Stage1Engine_Chambers", M["engine"], g, sharp_angle=35)
    noz.build("Stage1Engine_Nozzles", M["engine"], g, sharp_angle=35)
    pump.build("Stage1Engine_Turbopumps", M["alu"], g, sharp_angle=40)
    stack.build("Stage1Engine_ExhaustStacks", M["engine"], g, sharp_angle=40)
    fr.build("Stage1Engine_Frame", M["steel"], g, sharp_angle=35)
    scoop.build("Stage1Engine_AirScoops", M["frame"], g, sharp_angle=35)
    say(
        pogo.build("Stage1Engine_PogoSuppressors", M["alu"], g, sharp_angle=40),
        "Standpipe and accumulator",
        "The missile shook along its length for half a minute of first stage flight: the thrust, the propellant in the feed "
        "lines and the stretch of the vehicle fed one another. A warhead did not mind; a crew reading instruments would. So "
        "each oxidiser line has a standpipe, a closed tube with a bubble of gas at its top for the liquid to bounce on, and "
        "each fuel line a small piston accumulator. On this flight the standpipes were charged by hand before the launch; "
        "charging them from the blockhouse came with the next vehicle. That they were there is documented; their form and "
        "place here are not.",
    )
