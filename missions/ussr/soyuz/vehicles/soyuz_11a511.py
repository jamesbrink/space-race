"""Early Soyuz 11A511 with the original enclosed escape system, for the 7K-OK.

Millimetres above the main nozzle exits unless stated otherwise. See soyuz-11a511.md for the
references, where dimensions are taken off the drawings, and what was inherited from 11A57.
"""

from __future__ import annotations

import math

import bpy

from srlib import TAU, frame, group, mark_shells
from voskhod_11a57 import upper as voskhod_upper
from vostok_8k72k import booster, core
from vostok_8k72k import upper as vostok_upper
from vostok_8k72k.common import BOOSTER_AZ, BOOSTER_BASE_R, BOOSTER_R, BOOSTER_TILT, MM, Local, V, core_frame, hang, materials, pivot, rehang, reuse

LENGTH = 49913.0  # RKK Energia's dimensioned 11A511 cutaway
SPAN = 10412.0  # same cutaway, measured across the opposite rudders
CORE_TOP = 27622.0  # same cutaway, from nozzle datum to the core/lattice joint
# The booster slopes inward by BOOSTER_TILT. Undo that tilt at the rudder's outer lower corner
# to place it at the documented radial limit without moving the booster or its attachments.
RUDDER_SPAN = (SPAN / 2 - BOOSTER_BASE_R + booster.RUDDER_FOOT * math.sin(BOOSTER_TILT)) / math.cos(BOOSTER_TILT) - BOOSTER_R
LATTICE_TOP = 28300.0  # read from the cutaway
ADAPTER = 650.0  # estimated short spacecraft support above the stage
FAIRING_FOOT = LATTICE_TOP + voskhod_upper.BLOCK_I + ADAPTER
BASE_Z = -FAIRING_FOOT  # spacecraft aft is z=0
FAIRING_R = 1460.0  # image estimate, allowing for the model's stowed fittings
FAIRING_SHOULDER = 43500.0
FAIRING_TIP = 45250.0
FAIRING_LIP_R = 320.0
WALL = 18.0

FAIRING_PROFILE = [
    (FAIRING_R - 34, FAIRING_FOOT),
    (FAIRING_R, FAIRING_FOOT + 260),
    (FAIRING_R, FAIRING_SHOULDER),
    (FAIRING_LIP_R, FAIRING_TIP),
]

SHELLS = (
    "BlockI_FairingSupport",
    "Fairing_AccessPanel",
    *core.SHELLS,
    *(name for letter in BOOSTER_AZ for name in booster.shells(letter)),
    *(name for name in voskhod_upper.SHELLS if not name.startswith("Fairing")),
    *(f"Fairing_{side}_{part}" for side in ("Left", "Right") for part in ("Skin", "Wall", "Fittings", "Grids")),
)


def stabilizers(X, M, node, az: float, side: str) -> None:
    """Two of the four folded lattice stabilizers on each fairing half."""
    grids = Local(X)
    for offset in (-math.pi / 4, math.pi / 4):
        a = az + offset
        c, s = math.cos(a), math.sin(a)
        z = FAIRING_FOOT + 2490  # the bottom of the upper section, above the service module
        on_skin = frame(V((FAIRING_R + 34) * c, (FAIRING_R + 34) * s, z), (c, s, 0))
        # Panel strips share only an edge. One face per opening gives each hole its own inner wall.
        w, h, rib, depth = 480.0, 560.0, 22.0, 24.0
        xs = [-w / 2, *[x + d for x in (-w / 4, 0, w / 4) for d in (-rib / 2, rib / 2)], w / 2]
        ys = [-h / 2, *[y + d for y in (-h / 4, 0, h / 4) for d in (-rib / 2, rib / 2)], h / 2]
        xs[1:1] = [-w / 2 + rib]
        xs.insert(-1, w / 2 - rib)
        ys[1:1] = [-h / 2 + rib]
        ys.insert(-1, h / 2 - rib)

        def point(x, y, radial):
            return tuple((on_skin @ V(x, y, radial)) / MM)

        for ix, (x0, x1) in enumerate(zip(xs, xs[1:])):
            for iy, (y0, y1) in enumerate(zip(ys, ys[1:])):
                if ix % 2 and iy % 2:
                    for x, flip in ((x0, False), (x1, True)):
                        grids.grid(lambda y, r: point(x, y, r), [y0, y1], [0, depth], flip=flip)
                    for y, flip in ((y0, True), (y1, False)):
                        grids.grid(lambda x, r: point(x, y, r), [x0, x1], [0, depth], flip=flip)
                else:
                    for r, flip in ((0, True), (depth, False)):
                        grids.grid(lambda x, y: point(x, y, r), [x0, x1], [y0, y1], flip=flip)
        for x, flip in ((-w / 2, True), (w / 2, False)):
            grids.grid(lambda y, r: point(x, y, r), ys, [0, depth], flip=flip)
        for y, flip in ((-h / 2, False), (h / 2, True)):
            grids.grid(lambda x, r: point(x, y, r), xs, [0, depth], flip=flip)
        for y in (-h / 2 + 40, h / 2 - 40):
            grids.box((110, 44, 68), frame(V((FAIRING_R + 5) * c, (FAIRING_R + 5) * s, z + y), (c, s, 0)))
    hang(grids.build(f"Fairing_{side}_Grids", M["steel"], None, sharp_angle=30), node)


def build_fairing(X, M, hatch_az: float, hatch_z: float, *, shoulder=FAIRING_SHOULDER, transport=False) -> None:
    tip = TRANSPORT_FAIRING_TIP if transport else FAIRING_TIP
    profile = [*FAIRING_PROFILE[:2], (FAIRING_R, shoulder), (FAIRING_LIP_R, tip)]
    adapter = Local(X)
    adapter.lathe(
        [(voskhod_upper.BLOCK_I_R - 4, FAIRING_FOOT - 170), (profile[0][0] - 8, FAIRING_FOOT - 4)],
        96,
    )
    adapter.build("BlockI_FairingSupport", M["lacquer"], bpy.data.objects["BlockI"], sharp_angle=30)
    g = group("Fairing")
    inner = [(r - WALL, z) for r, z in profile]
    gap = math.radians(0.16)
    hatch_az = math.radians(hatch_az)
    hatch_z += FAIRING_FOOT
    for side, az in (("Left", hatch_az), ("Right", hatch_az + math.pi)):
        arc = (az - math.pi / 2 + gap, az + math.pi / 2 - gap)
        node = pivot(f"Fairing_{side}", g, X @ V(FAIRING_R * math.cos(az), FAIRING_R * math.sin(az), FAIRING_FOOT))
        skin, wall, fit = Local(X), Local(X), Local(X)
        skin.lathe(profile, 64, arc=arc)
        wall.lathe(inner, 64, arc=arc, flip=True)
        for (r, z), flip in ((profile[0], True), (profile[-1], False)):
            skin.lathe([(r - WALL, z), (r, z)], 64, arc=arc, flip=flip)
        for a, flip in ((arc[0], False), (arc[1], True)):
            c, s = math.cos(a), math.sin(a)

            def edge(u, v, c=c, s=s):
                r, z = profile[int(v)]
                return ((r - WALL * u) * c, (r - WALL * u) * s, z)

            skin.grid(edge, [0.0, 1.0], list(range(len(profile))), flip=flip)
        for z in (FAIRING_FOOT + 294, FAIRING_FOOT + 2170, shoulder - 65):
            fit.lathe(
                [(FAIRING_R - 3, z - 18), (FAIRING_R + 8, z - 10), (FAIRING_R + 8, z + 10), (FAIRING_R - 3, z + 18)],
                64,
                arc=arc,
            )
        # Access hatch sits closed for launch. A shallow panel with rolled corners shows where it lies.
        if side == "Left":
            cover_node = group("Fairing_AccessCover")
            cover = Local(X)
            cover.lathe(
                [(FAIRING_R - 4, hatch_z - 500), (FAIRING_R + 16, hatch_z - 480), (FAIRING_R + 16, hatch_z + 480), (FAIRING_R - 4, hatch_z + 500)],
                28,
                arc=(az - 0.33, az + 0.33),
            )
            cover.build("Fairing_AccessPanel", M["pale"], cover_node, sharp_angle=30)
            rehang(cover_node, node)
        for part, builder, mat in (("Skin", skin, "pale"), ("Wall", wall, "wall"), ("Fittings", fit, "pale")):
            hang(builder.build(f"Fairing_{side}_{part}", M[mat], None, sharp_angle=30), node)
        stabilizers(X, M, node, az, side)
        if transport:
            # The Energia drawing shows the four auxiliary abort motors at the fairing shoulder.
            motor, jets = Local(X), Local(X)
            for off in (-0.76, 0.76):
                c, s = math.cos(az + off), math.sin(az + off)
                motor.tube((1010 * c, 1010 * s, shoulder + 600), (1480 * c, 1480 * s, shoulder + 164), 100, 24)
                motor.tube((1450 * c, 1450 * s, shoulder + 187), (1536 * c, 1536 * s, shoulder + 76), 118, 24, caps=False)
                jets.tube((1478 * c, 1478 * s, shoulder + 147), (1505 * c, 1505 * s, shoulder + 114), 92, 24)
            hang(motor.build(f"Fairing_{side}_SASCases", M["pale"], None), node)
            hang(jets.build(f"Fairing_{side}_SASNozzles", M["steel"], None), node)


def build_tower(X, M, *, exposed=False, height=LENGTH) -> None:
    """External silhouette of the original SAS, including the broad shrouded lower body."""
    node = group("EscapeTower")
    cover, metal, cap = Local(X), Local(X), Local(X)
    z = FAIRING_TIP
    enclosed_profile = [
        (315, z + 4),
        (325, z + 100),
        (520, z + 420),
        (575, z + 730),
        (570, z + 980),
        (350, z + 1310),
        (180, z + 1600),
        (147, z + 1950),
        (147, z + 3580),
    ]
    # Narimanov's 1976 survey shows the lower aerodynamic casing removed from Soyuz 12.
    # The shoulders, exposed support and finishes are estimates from the exterior drawing.
    exposed_profile = [
        (315, z + 4),
        (260, z + 90),
        (215, z + 440),
        (225, z + 600),
        (226, z + 950),
        (193, z + 1200),
        (174, z + 1480),
        (147, z + 1950),
        (147, z + 3580),
    ]

    # Shorten the shaft above the motor bank for the later Soyuz-U stack datum.
    def tower_height(station):
        datum = z + 1310
        return station if height == LENGTH or station <= datum else datum + (station - datum) * (height - datum) / (LENGTH - datum)

    cover.lathe([(r, tower_height(station)) for r, station in (exposed_profile if exposed else enclosed_profile)], 64)
    cap.lathe(
        [
            (146, tower_height(z + 3584)),
            (190, tower_height(z + 3620)),
            (194, tower_height(z + 4050)),
            (102, tower_height(z + 4180)),
            (36, tower_height(z + 4280)),
            (29, height - 30),
            (0, height),
        ],
        64,
    )
    # The shroud's openings read as a dark ring beneath the rounded cover. Only the exterior is represented.
    if exposed:
        metal.lathe([(223, z + 484), (253, z + 501), (253, z + 540), (228, z + 565)], 48)
        for k in range(6):
            a = TAU * k / 6
            u, v = math.cos(a), math.sin(a)
            metal.tube((237 * u, 237 * v, z + 765), (468 * u, 468 * v, z + 412), 60, 16)
    else:
        metal.lathe([(342, z + 140), (410, z + 248), (438, z + 375), (448, z + 450)], 48)
        for k in range(6):
            a = TAU * k / 6
            u, v = math.cos(a), math.sin(a)
            metal.tube((384 * u, 384 * v, z + 465), (505 * u, 505 * v, z + 287), 57, 12, caps=False)
    for mesh, name, mat in ((cover, "Skin", "pale"), (metal, "Fittings", "steel"), (cap, "Cap", "lacquer")):
        mesh.build(f"EscapeTower_{name}", M[mat], node, sharp_angle=32)


# RKK Energia 1946–1996, ch. 6, silhouette and cutaway of the 11A511U/7K-ST.
TRANSPORT_FAIRING_TIP = 44700
TRANSPORT_LENGTH = 51100
TRANSPORT_SPAN = 10300


def build_transport_tower(X, M):
    """The two separate motors visible on the Soyuz-T escape tower."""
    node = group("EscapeTower")
    skin, bands, main, secondary, cap = (Local(X) for _ in range(5))
    tip = TRANSPORT_FAIRING_TIP
    skin.lathe(
        [
            (313, tip + 4),
            (256, tip + 62),
            (166, tip + 315),
            (166, 47370),
            (256, 47700),
            (258, 48328),
            (182, 48585),
            (145, 48942),
            (145, 49529),
            (175, 49770),
            (172, 50800),
        ],
        64,
    )
    for r, z in ((168, 45190), (168, 46826), (261, 48106), (176, 49935), (176, 50775)):
        bands.lathe([(r - 6, z - 15), (r + 1, z - 8), (r + 1, z + 10), (r - 6, z + 19)], 64)
    for az in (0, 60, 120, 180, 240, 300):
        c, s = math.cos(math.radians(az)), math.sin(math.radians(az))
        main.tube((202 * c, 202 * s, 48010), (575 * c, 575 * s, 47565), 102, 24)
    for az in (45, 135, 225, 315):
        c, s = math.cos(math.radians(az)), math.sin(math.radians(az))
        secondary.tube((144 * c, 144 * s, 49895), (239 * c, 239 * s, 49755), 43, 20)
    cap.lathe([(170, 50803), (158, 50883), (118, 50951), (26, 51037), (21, 51083), (0, TRANSPORT_LENGTH)], 48)
    for mesh, name, finish in (
        (skin, "Skin", "pale"),
        (bands, "Bands", "steel"),
        (main, "MainBank", "steel"),
        (secondary, "SecondaryBank", "steel"),
        (cap, "Cap", "lacquer"),
    ):
        mesh.build(f"EscapeTower_{name}", M[finish], node, sharp_angle=32)


def build(hatch_az: float, hatch_z: float, *, exposed_tower=False, height=LENGTH, fairing_shoulder=FAIRING_SHOULDER, transport=False) -> str:
    M = reuse(materials())
    span = TRANSPORT_SPAN if transport else SPAN
    if transport:
        height = TRANSPORT_LENGTH
    rudder_span = RUDDER_SPAN + (span - SPAN) / (2 * math.cos(BOOSTER_TILT))
    core.build(BASE_Z, M, web_foot=244.0, top=CORE_TOP)
    for letter, az in BOOSTER_AZ.items():
        booster.build(BASE_Z, M, letter, az, rudder_span=rudder_span)
    X = core_frame(BASE_Z)
    vostok_upper.build_interstage(X, M, LATTICE_TOP, foot=CORE_TOP)
    block_frame = core_frame(BASE_Z + LATTICE_TOP - voskhod_upper.LATTICE_TOP)
    voskhod_upper.build_aft_section(block_frame, M)
    voskhod_upper.build_block_i(block_frame, M, adapter=ADAPTER, engine="RD0110")
    build_fairing(X, M, hatch_az, hatch_z, shoulder=fairing_shoulder, transport=transport)
    if transport:
        build_transport_tower(X, M)
    else:
        build_tower(X, M, exposed=exposed_tower, height=height)
    mark_shells(SHELLS)
    return f"{height * MM:.3f} m on the pad, {span * MM:.3f} m over the rudders"
