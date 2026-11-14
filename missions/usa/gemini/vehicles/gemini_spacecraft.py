"""The Gemini spacecraft: McDonnell's two-man ship, re-entry module and adapter.

Shared by the flights that flew it; a flight's model/vehicle.py imports this module, says what its own ship had
(`Fit`), and calls build(). Dimensions are inches and stations are McDonnell's Z stations, which run from the
adapter's base (Z13.44, where it is bolted to the launch vehicle) toward the nose (Z239.28, the tip of the nose
fairing). The model's origin is Z103.44, the line the re-entry module and the adapter meet on: the heat shield's
rim. +Z is toward the nose.

Round the ship the drawings have a top (TY: the side the two hatches are on), a bottom (BY), and the crew's left
and right (LX, RX). The model's +X is TY and its +Y is RX, so an angle here is measured from the top toward the
crew's right: the command pilot's hatch, on the left, is at negative angles.

See ./gemini-spacecraft.md for what each number rests on: which are SEDR 300's, and which are read off the
photographs of spacecraft 3.

Top-level nodes: NoseFairing  RendezvousRecovery  ReentryControl  Hatches  ScannerFairing  Cabin  CrewStation
                 HeatShield  RetroSection  EquipmentSection
"""

from __future__ import annotations

import math
from dataclasses import dataclass

import bpy
from mathutils import Matrix, Vector

import srlib
from gemini_shell import (
    ADAPTER,
    BASE_R,
    CABIN,
    CABIN_A,
    CELL,
    HATCH_OUT,
    LENGTH,
    NECK,
    NECK_R,
    NOSE,
    RCS_AT,
    RCS_ROWS,
    RCS_SPLAY,
    RINGS,
    SHIELD_R,
    SHIELD_SPHERE,
    WALL,
    WINDOW_AFT,
    WINDOW_L,
    WINDOWS,
    Z0,
    Z_BASE,
    Z_HATCH_AFT,
    Z_HATCH_FWD,
    Z_NOSE,
    Z_RCS,
    Z_RR,
    Z_RR_TAPER,
    Z_RR_TOP,
    Z_SHIELD_APEX,
    Z_SILL,
    band,
    chamber,
    depth,
    hatch_in,
    hatch_margin,
    holes,
    radial,
    sheet,
    shingle,
    skin,
    tidy,
    zz,
)
from mercury_capsule import chamfered
from srlib import IN, TAU, MeshBuilder, Surf, bore, deg, frame, group, interior, lettering, material, prof

# What the ship's stations and surfaces are, and what its skins are made of, is in gemini_shell.py.

Z_EQUIP_TOP = 66.74  # the head of the equipment section's skin
Z_RETRO_FOOT = 70.0  # the foot of the retrograde section's: the ring between the two is where the adapter is cut
RETRO = (6.5, 19.5, 84.0)  # a retrograde rocket: its case's radius, how far its axis is from the ship's, its middle's station
SEAT_CANT = (deg(12), deg(8))  # the seats: outboard, and forward

# What is read off NASA S65-21090 (the ship on the launch vehicle, 23 March 1965) through a fitted camera, but the lettering:
# estimated.
COVER = (2.0, 0.35)  # the white strip along the top: its width, and how proud it stands (the second a guess)
COVER_FOOT = (3.4, 6.0, 116.0)  # its aft end: how wide it is there, over what length it widens, and its station
COVER_TOP = 190.4  # the station of its forward end, on the re-entry control section
WHITE_DISC = (deg(-17.5), 165.3, 3.6)  # a white disc forward of the left hatch: round from the top, its station, across
SOCKET = 145.5  # the station of the socket for the outside handle, inboard of each window (and SEDR 300, Figure 2-8)
LETTERS = (137.5, 131.5, 118.0)  # the stations of UNITED, of STATES, and of the flag under them: read off the colour photograph of the liftoff
SCANNER_AT = deg(-84)  # the scanner fairing's middle, round from the top
SCANNER_Z = (166.5, 190.5)  # its ends
SCANNER_HALF = (4.3, 3.0)  # half the width of its face, aft and forward
SCANNER_PROUD = 3.4  # its face from the re-entry control section's skin
# The doors round the cabin below the hatches, by the angles of their edges from the top: the strip under a hatch's
# hinge, the two equipment bay doors, the main landing gear door (SEDR 300, Figure 2-7; Technical Summary, Figure 1;
# S64-04925 for the gear door's taper, which is a sector of about 31 degrees). All estimated.
DOORS = (deg(66), deg(112), deg(143))
# The three fairings over the retaining straps: one is beside a hatch's aft outboard corner in S65-13395; the rest follow
STRAPS = (deg(180), deg(68), deg(-68))
NOZZLE_PLATE = (157.0, 5.2, 7.6)  # the fluid injection nozzles' plate on the right gear door: its station, width, length


@dataclass
class Fit:
    """What one ship had that another had not: a flight's script fills this in, and its spacecraft.md says why."""

    radar: bool = False  # the rendezvous radar in the rendezvous and recovery section's face
    lateral_thrusters: bool = True  # whether the four OAMS chambers that translate sideways, up and down were real ones
    adapter_batteries: int = 3  # silver-zinc batteries in the adapter's module (0: a fuel cell module instead)
    water_tanks: int = 1  # drinking water tanks in the adapter
    experiments: tuple[str, ...] = ()  # of: "sea-urchin", "blood", "reentry-communications"
    names: tuple[str, str] = ("", "")  # the command pilot and the pilot, for what their seats say


# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "NoseFairing_Shell",
    "RR_Shingles",
    "RR_Fasteners",
    "RR_Structure",
    "RCS_Shingles",
    "RCS_Fasteners",
    "RCS_CableCover",
    "RCS_Structure",
    "RCS_Liner",
    "Cabin_Shingles",
    "Cabin_Plain",
    "Cabin_HingePlates",
    "Cabin_CableCover",
    "Cabin_WhiteDisc",
    "Cabin_Fasteners",
    "Cabin_Structure",
    "Cabin_Lettering",
    "Cabin_Flag",
    "Cabin_StrapFairings",
    "Hatches_Skin",
    "Hatches_Fasteners",
    "Hatches_Structure",
    "CrewStation_PressureVessel",
    "HeatShield_Ablator",
    "HeatShield_Structure",
    "Retro_Skin",
    "Retro_Foil",
    "Retro_Rings",
    "Retro_SeparationBand",
    "Equipment_Skin",
    "Equipment_Foil",
    "Equipment_Rings",
    "Equipment_Cover",
)


def materials() -> dict:
    m = material
    return {
        # Rene 41 shingles, black on the outside to radiate
        "shingle": m("shingle-rene41", (0.035, 0.038, 0.046), 0.85, 0.42),
        "beryllium": m("shingle-beryllium", (0.05, 0.052, 0.058), 0.8, 0.5),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "titanium": m("titanium", (0.46, 0.44, 0.42), 1.0, 0.5, double_sided=True),
        "liner": m("titanium-liner", (0.46, 0.44, 0.42), 1.0, 0.5),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "fairing": m("fibreglass-fairing", (0.80, 0.79, 0.74), 0.0, 0.6),
        "ablator": m("heatshield-ablator", (0.66, 0.62, 0.52), 0.0, 0.9),
        # the adapter: magnesium skin under a white ceramic paint, aluminium foil inside, a gold-coated cover across its foot
        "white": m("paint-adapter-white", (0.88, 0.88, 0.86), 0.0, 0.55),
        "foil": m("foil-aluminium", (0.74, 0.73, 0.69), 1.0, 0.36),
        "gold": m("insulation-gold", (0.62, 0.45, 0.16), 1.0, 0.38, double_sided=True),
        "honeycomb": m("fibreglass-shield", (0.58, 0.52, 0.36), 0.0, 0.8, double_sided=True),
        "magnesium": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),
        "void": m("window-void", (0.004, 0.004, 0.005), 0.0, 0.95),
        "paint_white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6, double_sided=True),
        "seat": m("aluminium-seat", (0.50, 0.51, 0.52), 0.9, 0.5, double_sided=True),
        "cushion": m("fabric-nylon", (0.80, 0.76, 0.66), 0.0, 0.9),
        "webbing": m("fabric-webbing", (0.42, 0.44, 0.38), 0.0, 0.9, double_sided=True),
        "panel": m("paint-cabin-grey", (0.30, 0.31, 0.32), 0.1, 0.6),
        "dial": m("instrument-face", (0.015, 0.015, 0.018), 0.0, 0.4),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "tank": m("titanium-tank", (0.50, 0.49, 0.47), 1.0, 0.35),
        "battery": m("battery-case", (0.62, 0.60, 0.50), 0.2, 0.6),
        "case": m("titanium-motor-case", (0.42, 0.41, 0.40), 1.0, 0.45),
        "yellow": m("paint-handle-yellow", (0.75, 0.56, 0.05), 0.0, 0.5),
        # the window's outer frame is gold-coloured in the colour photograph of the morning of the launch (S65-21090)
        "frame": m("window-frame-gold", (0.58, 0.42, 0.17), 1.0, 0.38),
        "well": m("window-well", (0.05, 0.05, 0.055), 0.2, 0.6),
        # and the fairing over the horizon scanners is the colour of bronze
        "bronze": m("fairing-bronze", (0.30, 0.15, 0.07), 0.85, 0.45),
        # and so are the plain plates under each hatch's hinge
        "plate": m("plate-bronze", (0.20, 0.10, 0.055), 0.8, 0.5),
        "cover": m("paint-cover-white", (0.86, 0.86, 0.83), 0.0, 0.6),
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


def P(right: float, top: float, station: float) -> Vector:
    """A point in the ship: inches to the crew's right of the middle, inches toward the top, and its Z station; metres out."""
    return Vector((top, right, zz(station))) * IN


def hoop(r0: float, r1: float, z0: float, z1: float) -> list[tuple[float, float]]:
    """A ring of rectangular section as a closed profile, faces outward: radii r0 to r1, heights z0 to z1."""
    return prof([(r0, z0), (r1, z0), (r1, z1), (r0, z1), (r0, z0)])


def sphere(mb: MeshBuilder, centre: Vector, r: float, segs: int = 24) -> None:
    n = 12 if srlib.DETAIL >= 1.0 else 8
    mb.lathe(
        prof([(r * math.cos(a), r * math.sin(a)) for a in (-math.pi / 2 + math.pi * i / n for i in range(n + 1))]),
        segs,
        matrix=Matrix.Translation(centre),
    )


# ------------------------------------------------------------------ skins


def plates(panels: MeshBuilder, bolts: MeshBuilder, surf: Surf, z0: float, z1: float, t0: float, t1: float, count: int, lift: float = 0.0) -> None:
    """One ring of unbeaded shingles (the beryllium of the forward sections, the plain strips of the cabin)."""
    arc = (t1 - t0) / count
    gap = 0.05
    cols = max(2, round(8 * arc / deg(45)))
    for k in range(count):
        a0 = t0 + k * arc
        theta = lambda s, z, a0=a0: a0 + gap / surf.r(z) + (arc - 2 * gap / surf.r(z)) * s  # noqa: E731
        rows = max(2, round((z1 - z0) / 2.4))
        zs = [z0 + gap + (z1 - z0 - 2 * gap) * j / rows for j in range(rows + 1)]
        panels.grid(lambda s, z, theta=theta: surf.p(theta(s, z), z, lift), [i / cols for i in range(cols + 1)], zs)
        n = max(2, int((z1 - z0) / 2.6))
        for i in range(n):
            z = z0 + 0.8 + (z1 - z0 - 1.6) * i / (n - 1)
            for da in (-0.55, 0.55):
                bolts.disc(surf.p(a0 + da / surf.r(z), z, lift), surf.n(a0), 0.2 * IN, 0.07 * IN)
        across = max(2, round(arc * surf.r(z0) / 2.6))
        for z in (z0 + 0.5, z1 - 0.5):
            for i in range(1, across):
                t = theta(i / across, z)
                bolts.disc(surf.p(t, z, lift), surf.n(t), 0.2 * IN, 0.07 * IN)


def port(names, matrix: Matrix, radius: float, depth: float) -> None:
    if holes():
        bore(names, matrix, radius, depth)


def thruster(noz: MeshBuilder, cup: MeshBuilder, at: Vector, out: Vector, exit_r: float, hole: float = 0.0, sunk: float = 0.3) -> None:
    """A thrust chamber in its port: a cup let into the skin and the chamber's bell in it, its exit just under the skin.
    `at` (metres) is on the skin, `out` the way it fires; `hole` is the radius the skin was bored to (the cup's lip
    stands clear of what the boring did to the skin round it)."""
    f = frame(at, out)
    lip = max(exit_r + 1.3, 1.6 * hole)
    if not holes():  # from far off: a ring on the skin and a dark disc in it
        cup.lathe(prof([(lip, -0.9), (lip, 0.35), (exit_r + 0.45, 0.35)]), 20, matrix=f)
        noz.lathe(prof([(exit_r + 0.45, 0.3), (0.0, 0.3)]), 20, matrix=f)
        return
    cup.lathe(prof([(exit_r + 0.75, 0.35), (exit_r + 0.45, 0.35), (exit_r + 0.45, -exit_r * 3.4), (0.0, -exit_r * 3.4)]), 20, matrix=f, flip=True)
    cup.lathe(prof([(exit_r + 0.75, 0.35), (lip, 0.35), (lip, -0.9)]), 20, matrix=f)
    noz.lathe(prof([(exit_r * 0.35, -exit_r * 3.2), (exit_r * 0.6, -exit_r * 2.0), (exit_r * 0.9, -exit_r * 0.9), (exit_r, -sunk)]), 16, matrix=f)


# ------------------------------------------------------------------ the re-entry module


def build_nose_fairing(M) -> None:
    g = group("NoseFairing")
    mb = MeshBuilder()
    r0 = NOSE.r(zz(Z_RR_TOP))
    top = zz(Z_NOSE)
    mb.lathe(prof([(r0 + 0.25, zz(Z_RR_TOP) - 0.6), (r0 + 0.25, top - 1.6), (r0 - 0.5, top - 0.5), (r0 - 2.2, top), (0.0, top)]), 96)
    mb.build("NoseFairing_Shell", M["fairing"], g, sharp_angle=35)
    handle = MeshBuilder()  # the fitting in its middle that the ejector pushes on
    handle.lathe(prof([(2.2, top - 0.05), (2.2, top + 0.5), (0.0, top + 0.5)]), 20)
    handle.build("NoseFairing_Fitting", M["aluminium"], g, sharp_angle=35)


def build_rendezvous_recovery(M, fit: Fit) -> None:
    """The forward section: beryllium shingles over a titanium frame, the parachutes inside. It leaves with the drogue
    when the main parachute is to come out."""
    g = group("RendezvousRecovery")
    shingles, bolts, inner = MeshBuilder(), MeshBuilder(), MeshBuilder()
    z0, zt, z1 = zz(Z_RR), zz(Z_RR_TAPER), zz(Z_RR_TOP)
    plates(shingles, bolts, NECK, z0 + 0.4, zt, 0.0, TAU, 8)
    plates(shingles, bolts, NOSE, zt, z1 - 0.3, deg(22.5), TAU + deg(22.5), 8)
    r1 = NOSE.r(z1)
    inner.lathe(prof([(NECK_R - 0.8, z0), (NECK_R - 0.8, zt), (r1 - 0.8, z1)]), 64, flip=True)
    inner.lathe(hoop(NECK_R - 2.2, NECK_R - 0.05, z0, z0 + 0.4), 96)  # the ring it is bolted to the next section by
    inner.lathe(prof([(r1 - 0.05, z1 - 0.3), (r1 - 0.05, z1), (r1 - 2.0, z1)]), 96)
    shingles.build("RR_Shingles", M["beryllium"], g, sharp_angle=30)
    bolts.build("RR_Fasteners", M["bolt"], g)
    inner.build("RR_Structure", M["titanium"], g, sharp_angle=30)
    # its forward face: the radar's place. A ship without the radar has a cover there (gemini-spacecraft.md)
    face = MeshBuilder()
    face.lathe(prof([(r1 - 2.0, z1 - 0.6), (0.0, z1 - 0.6)]), 64)
    if srlib.DETAIL >= 0.5:
        for i in range(-5, 6):  # stiffening ribs across the cover
            y = i * 2.4
            half = math.sqrt(max(0.0, (r1 - 2.6) ** 2 - y**2))
            face.box((2 * half * IN, 0.5 * IN, 0.35 * IN), Matrix.Translation(Vector((0.0, y, z1 - 0.42)) * IN))
    say(
        face.build("RR_Face", M["fairing"] if not fit.radar else M["equipment"], g, sharp_angle=35),
        "Forward face" if not fit.radar else "Rendezvous radar",
        "Where a ship going to meet another carries its rendezvous radar. This one was going nowhere near anything, and carried "
        "none: the section held only the parachutes. A photograph of this spacecraft eleven weeks before it flew shows the face "
        "closed by a flat ribbed cover. What, if anything, stood behind it in the radar's place has not been found."
        if not fit.radar
        else "The rendezvous radar: an interferometer that finds a transponder on the target and gives its range and bearing.",
    )
    if not interior():
        return
    chute = MeshBuilder()
    chute.lathe(prof([(0.0, z0 + 3.0), (13.5, z0 + 3.0), (13.5, zt + 14.0), (11.0, z1 - 6.0), (0.0, z1 - 6.0)]), 40)
    say(
        chute.build("RR_MainParachute", M["cushion"], g, sharp_angle=30),
        "Main parachute",
        "One ring-sail parachute 84.2 ft across, packed in this section. The ship hangs from it by its nose at first, then is let "
        "down to hang level by two points so that it meets the sea on the edge of its heat shield. When Grissom threw that "
        "switch the ship dropped into the new attitude hard enough to throw both men into their windows: his faceplate broke. "
        "The pack's form here is estimated.",
    )
    mortar = MeshBuilder()
    side = radial(deg(180)) * 9.0
    mortar.tube((side + Vector((0, 0, z1 - 8.0))) * IN, (side + Vector((0, 0, z1 - 0.9))) * IN, 3.2 * IN, 16)
    mortar.tube((-side + Vector((0, 0, z1 - 7.0))) * IN, (-side + Vector((0, 0, z1 - 0.9))) * IN, 4.6 * IN, 16)
    say(
        mortar.build("RR_DrogueMortar", M["aluminium"], g, sharp_angle=35),
        "Drogue and pilot parachutes",
        "A mortar fires a small drogue out at 50,000 ft to steady the ship; at 10,600 ft the drogue pulls out a pilot "
        "parachute, and the pilot parachute pulls this whole section off the ship and the main parachute out of it. "
        "This ship's mortar had a steel breech; the next had an aluminium one. Their forms and places here are estimated.",
    )


def cable_cover(mb: MeshBuilder, surf: Surf, s0: float, s1: float, foot: bool = False) -> None:
    """The cover over the parachute's control cables: a strip along the top of the ship, from station s0 to s1. With
    `foot` it widens at its aft end, as the photograph has it."""
    wide, proud = COVER
    n = max(2, round((s1 - s0) / 3.0))
    rows = []
    for i in range(n + 1):
        s = s0 + (s1 - s0) * i / n
        hw = wide / 2
        if foot and s - s0 < COVER_FOOT[1]:
            hw += (COVER_FOOT[0] - wide) / 2 * 0.5 * (1.0 + math.cos(math.pi * (s - s0) / COVER_FOOT[1]))
        r = surf.r(zz(s))
        rows.append([surf.p(y / r, zz(s), o) for y, o in ((-hw, -0.15), (-hw, proud), (hw, proud), (hw, -0.15))])
    mb.grid(lambda i, j: rows[j][i], range(4), range(n + 1))
    mb.add([tuple(p) for p in rows[0]], [(3, 2, 1, 0)])
    mb.add([tuple(p) for p in rows[-1]], [(0, 1, 2, 3)])


def build_reentry_control(M) -> None:
    """The short cylinder between the cabin and the forward section: sixteen thrust chambers of 25 lbf in two rings of
    eight, and their tanks. It steers the ship from retrofire to the parachute."""
    g = group("ReentryControl")
    shingles, bolts, inner, noz, cup, cover = (MeshBuilder() for _ in range(6))
    z0, z1 = zz(Z_RCS), zz(Z_RR)
    plates(shingles, bolts, NECK, z0, z1, 0.0, TAU, 8)
    liner = MeshBuilder()  # its inner cylinder: seen from inside only, so the chambers' ports are not shut by it
    liner.lathe(prof([(NECK_R - 0.8, z0), (NECK_R - 0.8, z1)]), 64, flip=True)
    liner.build("RCS_Liner", M["liner"], g, sharp_angle=None)
    inner.lathe(prof([(NECK_R - 0.8, z1 - 0.05), (0.0, z1 - 0.05)]), 64)  # its forward face, the main parachute's adapter on it
    skin_obj = shingles.build("RCS_Shingles", M["beryllium"], g, sharp_angle=30)
    bolts.build("RCS_Fasteners", M["bolt"], g)
    inner.build("RCS_Structure", M["titanium"], g, sharp_angle=30)
    bpy.context.view_layer.update()
    # The sixteen chambers: four clusters, on the diagonals. In each a chamber that pitches the ship and one that yaws
    # it stand side by side, and each is there twice, once for the A ring and once for the B ring, one behind the
    # other. A chamber fires along one of the ship's axes, not out along a radius (SEDR 300, Figure 8-84): so its port
    # is an oval and its bell is cut off at the skin.
    for top in (1, -1):
        for side in (1, -1):
            for k, a in enumerate(RCS_AT):
                theta = side * a if top > 0 else side * (math.pi - a)
                up, across = Vector((top, 0.0, 0.0)), Vector((0.0, side, 0.0))
                out = (up if k == 0 else across) * math.cos(RCS_SPLAY) + (across if k == 0 else up) * math.sin(RCS_SPLAY)
                for station in RCS_ROWS:
                    chamber(noz, cup, (skin_obj.name,), NECK, theta, zz(station), out, 1.25, 1.9, lip=0.32)
    tidy((skin_obj.name,), NECK)
    say(
        noz.build("RCS_ThrustChambers", M["nozzle"], g, sharp_angle=35),
        "Re-entry control thrusters",
        "Sixteen chambers of 25 lbf in four clusters of four, two complete rings of eight with their own tanks: either "
        "ring can bring the ship home. None of them points straight out. In each cluster one pair fires along the "
        "ship's top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll "
        "it. That is why the ports are ovals. Which chamber fires which way is SEDR 300's drawing; where the clusters "
        "stand is read off a photograph of this ship on the morning it flew, and how far each is turned from its axis "
        "is estimated.",
    )
    cup.build("RCS_Ports", M["titanium"], g, sharp_angle=35)
    cable_cover(cover, NECK, Z_RCS + 0.05, COVER_TOP)
    say(
        cover.build("RCS_CableCover", M["cover"], g, sharp_angle=35),
        "Parachute cable cover",
        "The white strip along the top of the ship. It is in the photograph taken on the morning of the launch, running "
        "from near the heat shield up over this section. SEDR 300 lists a cover over the parachute's control cables "
        "here, and that is what it is taken to be; its width is read off the photograph.",
    )
    if interior():
        tanks = MeshBuilder()
        # each ring's own: a ball of nitrogen 7.25 in across, a fuel tank 5.10 in across and 30.7 long and an oxidiser
        # tank 5.10 by 25.2 (SEDR 300, section VIII). The section is 18 in long, so the tanks cannot stand along it:
        # they are laid across, and how is estimated.
        for ring, x in ((0, 5.5), (1, -5.5)):
            up = Vector((x, 0.0, 0.0))
            for length, dz in ((30.7, 4.2), (25.2, 10.8)):
                half = length / 2
                c = up + Vector((0.0, 0.0, z0 + dz))
                tanks.tube((c - Vector((0.0, half, 0.0))) * IN, (c + Vector((0.0, half, 0.0))) * IN, 2.55 * IN, 16)
            sphere(tanks, (Vector((0.0, (1 - 2 * ring) * 9.0, z0 + 14.0))) * IN, 3.625 * IN)
        say(
            tanks.build("RCS_Tanks", M["tank"], g, sharp_angle=35),
            "Re-entry control tanks",
            "Each of the two rings has its own fuel tank, oxidiser tank and ball of nitrogen to push them: six vessels. The "
            "nitrogen balls are 7.25 in across, the fuel tanks 5.10 in across and 30.7 in long and the oxidiser tanks 5.10 by "
            "25.2, which is documented. The tanks are longer than the section, so they must lie across it; how they are "
            "arranged in it is estimated.",
        )


def build_heat_shield(M) -> None:
    g = group("HeatShield")
    cap = SHIELD_SPHERE - math.sqrt(SHIELD_SPHERE**2 - SHIELD_R**2)  # 7.21 in
    apex = zz(Z_SHIELD_APEX)
    centre = apex + SHIELD_SPHERE
    n = 16
    arc = [
        (SHIELD_SPHERE * math.sin(a), centre - SHIELD_SPHERE * math.cos(a))
        for a in (math.asin(SHIELD_R / SHIELD_SPHERE) * i / n for i in range(n + 1))
    ]
    mb = MeshBuilder()
    mb.lathe(prof([*arc, (SHIELD_R, apex + cap + 1.4)]), 144)
    mb.build("HeatShield_Ablator", M["ablator"], g, sharp_angle=40)
    back = MeshBuilder()
    back.lathe(prof([(SHIELD_R - 0.6, apex + cap + 1.4), *[(r * 0.985, z + 1.4) for r, z in arc[::-1]]]), 96)
    back.build("HeatShield_Structure", M["titanium"], g, sharp_angle=40)


def _mirror(side: int, fa, fb):
    """Two edges of something on the crew's right as functions of height, or their mirror images on the left."""
    return (fa, fb) if side > 0 else (lambda z: -fb(z), lambda z: -fa(z))


def build_hatches(M, fit: Fit) -> list[dict]:
    """The two hatches, each hinged along its outboard edge, each with a window at its forward end. Returns where each
    window is."""
    g = group("Hatches")
    skin_, bolts, structure, frames, studs, hinges, wells, latches = (MeshBuilder() for _ in range(8))
    z0, z1 = zz(Z_HATCH_AFT) + 0.06, zz(Z_HATCH_FWD) - 0.06
    whole = interior()
    fine = srlib.DETAIL >= 1.0
    cell = 0.45 if holes() else 0.9
    proud = 0.26 if holes() else 0.55  # how far the window's frame stands off its plate: more where the plate is coarse
    zone = zz(WINDOW_AFT) - 2.2  # where the plate the window is let into begins
    rings = [z0, zz(118.0), zz(129.0), zone, z1]
    windows = []
    inb = lambda z: hatch_in(z) + 0.06 / CABIN.r(z)  # noqa: E731
    outb = lambda z: HATCH_OUT - 0.06 / CABIN.r(z)  # noqa: E731
    for side, name in ((-1, "Left"), (1, "Right")):
        win = WINDOWS[side]
        low = "al" if side > 0 else "ah"
        for i in range(3):  # three rings of beaded cells aft of the window
            band(skin_, bolts, rings[i], rings[i + 1], *_mirror(side, hatch_margin, outb), 5, rivets=low)
            shingle(skin_, bolts, rings[i], rings[i + 1], *_mirror(side, inb, hatch_margin), rivets=low)
        # beside the window the plate along the inboard edge is plain: the socket for the outside handle is in it
        shingle(skin_, bolts, zone, z1, *_mirror(side, inb, hatch_margin), beads=False, rivets=low + "f")
        # the window's plate: smooth, let down round the opening and before it to the trough's floor
        sheet(skin_, *_mirror(side, hatch_margin, outb), zone, z1, 0.0, cell, lambda t, z, win=win: win.covers(t, z, 0.3))
        if holes():
            ta, tb = _mirror(side, hatch_margin, outb)
            n = max(4, round((tb(zone) - ta(zone)) * CABIN.r(zone) / 2.2))
            for i in range(n):  # the plate's aft edge, fastened
                t = ta(zone) + (tb(zone) - ta(zone)) * (i + 0.5) / n
                bolts.disc(skin(t, zone + 0.35, -0.02), CABIN.n(t), 0.19 * IN, 0.09 * IN)
        # the window: a bolted frame round the opening, lying on the pane's plane and over its aft edge onto the skin
        n = 72 if fine else 36
        rim_out, rim_mid, rim_in, rim = win.outline(n, 0.8), win.outline(n, 0.25), win.outline(n, -0.3), win.outline(n)
        m = len(rim)
        rows = [
            [win.lay(u, w, -0.12) for u, w in rim_out],
            [win.lay(u, w, proud) for u, w in rim_out],
            [win.lay(u, w, proud) for u, w in rim_mid],
            [win.lay(u, w, proud) for u, w in rim_in],
            [win.lay(u, w, -0.42) for u, w in rim_in],
        ]
        frames.grid(lambda i, j, rows=rows: rows[j][i], range(m), range(5), closed_u=True, flip=side < 0)
        for u, w in rim_mid[:: n // 24]:
            studs.disc(win.lay(u, w, 0.24), win.np, 0.13 * IN, 0.14 * IN)

        def fan(mb: MeshBuilder, lift: float, grow: float, out: bool, win=win) -> None:
            edge_ = win.outline(n, grow)
            cu, cw = sum(p[0] for p in edge_) / len(edge_), sum(p[1] for p in edge_) / len(edge_)
            pts = [tuple(win.at(cu, cw, lift) * IN)] + [tuple(win.at(u, w, lift) * IN) for u, w in edge_]
            k = len(edge_)
            ccw = (win.side > 0) == out
            mb.add(pts, [(0, 1 + i, 1 + (i + 1) % k) if ccw else (0, 1 + (i + 1) % k, 1 + i) for i in range(k)])

        pane = MeshBuilder()
        fan(pane, -0.3, 0.1, True)
        pane.build(f"Hatch{name}_WindowOuter", M["glass" if whole else "void"], g, sharp_angle=None)
        windows.append({"side": side, "centre": win.at(-1.5, WINDOW_L / 2, -2.4) * IN, "normal": win.np.copy()})
        # three hinges along the outboard edge, and the socket a handle goes into from outside
        th = side * HATCH_OUT
        for z in (z0 + 6.0, (z0 + z1) / 2, z1 - 6.0):
            hinges.tube(CABIN.p(th, z - 2.2, 0.35), CABIN.p(th, z + 2.2, 0.35), 0.6 * IN, 10)
        ts = side * (hatch_in(zz(SOCKET)) + 2.6 / CABIN.r(zz(SOCKET)))
        hinges.lathe(hoop(0.5, 1.05, -0.3, 0.24), 16, matrix=frame(skin(ts, zz(SOCKET)), CABIN.n(ts)))
        if not whole:
            continue
        # inside: the hatch's inner skin, let down under the trough; the well between the panes; the two inner panes
        # in their frame, which is bolted on from inside with 35 bolts (SEDR 300, Figure 2-10)
        sheet(
            structure,
            *_mirror(side, inb, outb),
            z0,
            z1,
            0.0,
            1.5,
            lambda t, z, win=win: win.covers(t, z, 1.5),
            flip=True,
            drop=lambda t, z: max(WALL, depth(t, z) + 0.9),
        )
        wall = [[win.at(u, w, lift) * IN for u, w in rim] for lift in (-0.42, -2.3)]
        wells.grid(lambda i, j, wall=wall: wall[j][i], range(m), range(2), closed_u=True, flip=side < 0)
        inner = MeshBuilder()
        fan(inner, -1.75, 0.1, True)
        fan(inner, -2.1, 0.1, True)
        inner.build(f"Hatch{name}_WindowInner", M["glass"], g, sharp_angle=None)
        ring_in, ring_out = win.outline(n, -0.25), win.outline(n, 1.35)
        rows = [
            [win.at(u, w, -2.32) * IN for u, w in ring_in],
            [win.at(u, w, -2.32) * IN for u, w in ring_out],
            [win.at(u, w, -0.5) * IN for u, w in ring_out],
        ]
        structure.grid(lambda i, j, rows=rows: rows[j][i], range(m), range(3), closed_u=True, flip=side < 0)
        for u, w in win.outline(35, 0.55):
            studs.disc(win.at(u, w, -2.3) * IN, -win.np, 0.15 * IN, 0.1 * IN)
        # twelve latches on the sill (Figure 2-8: "typical 12 places"): the hatch is hinged outboard, so they are put
        # along its other three edges, and how many to an edge is estimated
        places = [(inb(z) + 1.6 / CABIN.r(z), z) for z in (z0 + 3.5 + (z1 - z0 - 12.0) * i / 6 for i in range(7))]
        places += [(deg(a), z0 + 1.6) for a in (20, 35, 50)] + [(deg(14.5), z1 - 1.6), (deg(58.5), z1 - 1.6)]
        for a, z in places:
            t = side * a
            down = max(WALL, depth(t, z) + 0.9)
            at = (radial(t) * (CABIN.r(z) - down - 0.55) + Vector((0.0, 0.0, z))) * IN
            f = frame(at, -radial(t))
            chamfered(latches, (1.3, 2.2, 1.1), f, 0.12)
            latches.tube(f @ (Vector((0.0, 0.0, 0.5)) * IN), f @ (Vector((0.0, 0.0, 1.5)) * IN), 0.3 * IN, 8)
    skin_.build("Hatches_Skin", M["shingle"], g, sharp_angle=None)
    bolts.build("Hatches_Fasteners", M["bolt"], g)
    say(
        frames.build("Hatches_WindowFrames", M["frame"], g, sharp_angle=35),
        "Window",
        "The window is not in the skin. Its outer pane is set at about 35 degrees to the hatch, its aft edge at the skin and "
        "its forward edge sunk, so that it faces forward like a windscreen; and forward of it a trough is cut into the "
        "cone for the pilot to look along. There are three panes of 96 per cent silica glass, one in this outer frame and "
        "two in a frame bolted on inside with 35 bolts; the right-hand window's are optically ground. The 35 degrees is "
        "SEDR 300's section as drawn; where the window is, its outline and the trough's are read off the photograph of "
        "this ship on the morning of the launch.",
    )
    studs.build("Hatches_WindowBolts", M["bolt"], g)
    hinges.build("Hatches_Hinges", M["steel"], g, sharp_angle=35)
    if whole:
        structure.build("Hatches_Structure", M["liner"], g, sharp_angle=30)
        wells.build("Hatches_WindowWells", M["well"], g, sharp_angle=35)
        say(
            latches.build("Hatches_Latches", M["steel"], g, sharp_angle=35),
            "Hatch latches",
            "Twelve latches hold each hatch down on its sill, all worked together by one handle inside; in an ejection "
            "pyrotechnic actuators throw them and push the hatch open. Their number is SEDR 300's; where each is, and "
            "its form, are estimated.",
        )
        build_experiments_on_hatches(M, g, fit)
    return windows


def build_experiments_on_hatches(M, g, fit: Fit) -> None:
    """What rode on the inside of the hatches on a flight that carried it."""
    if "sea-urchin" in fit.experiments:
        mb = MeshBuilder()
        t = -deg(32)
        a = CABIN.p(t, zz(124.0), -WALL - 2.0)
        b = CABIN.p(t, zz(124.0 + 6.75 * math.cos(CABIN_A)), -WALL - 2.0)
        mb.tube(a, b, 1.625 * IN, 20)
        mb.tube(b, b + (b - a).normalized() * 1.4 * IN, 0.5 * IN, 10)  # the handle that is turned
        say(
            mb.build("Experiment_SeaUrchinEggs", M["aluminium"], g, sharp_angle=35),
            "Sea urchin egg experiment",
            "A metal cylinder 3 1/4 in across and 6 3/4 in long on the inside of the left hatch, holding eight chambers of sea "
            "urchin eggs, sperm and a fixative. Turning the handle at its end was to fertilise the eggs, and turning it again "
            "later to stop them, so that it could be seen whether cells divide differently without weight. Grissom turned it; "
            "the handle broke off in his hand. Its size and its hatch are the press kit's; where on the hatch is estimated.",
        )
    if "blood" in fit.experiments:
        mb = MeshBuilder()
        t = deg(32)
        chamfered(mb, (3.7, 3.8, 1.3), frame(CABIN.p(t, zz(126.0), -WALL - 1.1), -CABIN.n(t)), 0.1)
        mb.tube(CABIN.p(t, zz(128.3), -WALL - 1.1), CABIN.p(t, zz(129.5), -WALL - 1.1), 0.45 * IN, 10)
        for dz in (-1.2, 1.2):  # its two feet on the hatch
            mb.tube(CABIN.p(t, zz(126.0 + dz), -WALL + 0.2), CABIN.p(t, zz(126.0 + dz), -WALL - 0.6), 0.4 * IN, 8)
        say(
            mb.build("Experiment_BloodIrradiation", M["aluminium"], g, sharp_angle=35),
            "Blood irradiation experiment",
            "A sealed aluminium box 3.7 by 3.8 by 1.3 in on the inside of the right hatch, holding samples of human blood beside a "
            "source of phosphorus-32. Young twisted its handle to put the blood in the way of the radiation, and again to take it "
            "out; the same was done to a twin of it at the Cape. The blood that had been in orbit showed a little more damage. "
            "Its size and its hatch are the press kit's; where on the hatch is estimated.",
        )


def build_cabin(M, fit: Fit, font, flag) -> None:
    """The cone round the crew: beaded Rene 41 shingles over a titanium frame, with the equipment bays between the two."""
    g = group("Cabin")
    panels, plain, bolts, under, cover, strips = (MeshBuilder() for _ in range(6))
    aft, fwd, neck = zz(Z_HATCH_AFT), zz(Z_HATCH_FWD), zz(RINGS[-1])
    rings = [zz(s) for s in RINGS]
    # the ring the heat shield is bolted to, plain
    sheet(plain, 0.0, TAU, 1.5, aft - 0.05, 0.0, 2.2)
    for i in range(128):
        t = TAU * (i + 0.5) / 128
        bolts.disc(CABIN.p(t, (1.5 + aft) / 2), CABIN.n(t), 0.2 * IN, 0.08 * IN)
    # the beam between the hatches: a plain strip under the cables' cover, and a column of short beads either side of
    # it (S65-13244), cut where the hatches' own rings are
    strip = lambda z: 1.3 / CABIN.r(z)  # noqa: E731
    beam = [aft + 0.06, zz(118.0), zz(129.0), zz(WINDOW_AFT) - 2.2, fwd]
    for za, zb in zip(beam, beam[1:]):
        shingle(plain, bolts, za, zb, lambda z: -strip(z), strip, beads=False, rivets="")
        shingle(panels, bolts, za, zb, strip, lambda z: hatch_in(z) - 0.06 / CABIN.r(z), rivets="a")
        shingle(panels, bolts, za, zb, lambda z: -hatch_in(z) + 0.06 / CABIN.r(z), lambda z: -strip(z), rivets="a")
    # under each hinge a strip of plain plates (S65-13395)
    for side in (1, -1):
        for za, zb in zip(beam, beam[1:]):
            shingle(strips, bolts, za, zb, *_mirror(side, lambda z: HATCH_OUT + 0.06 / CABIN.r(z), lambda z: DOORS[0]), beads=False, rivets="alh")
    # forward of the hatches, over the top: two rings, the troughs running out across them, their beads following
    for za, zb, access in ((fwd, rings[4], False), (rings[4], neck, True)):
        shingle(plain, bolts, za, zb, lambda z: -strip(z), strip, beads=False, rivets="")
        for side in (1, -1):
            edges = [strip, lambda z: deg(22), lambda z: deg(52), lambda z: DOORS[0]]
            for k in range(3):
                # (the plates either side of the cover on the last ring are plain: a white disc sits on the left one)
                into = plain if access and k == 0 else panels
                shingle(into, bolts, za, zb, *_mirror(side, edges[k], edges[k + 1]), beads=into is panels, rivets="al" if side > 0 else "ah")
    # the sides and the bottom: the doors over the equipment bays, the landing gear doors, the doors underneath
    # (SEDR 300, Figure 2-7; the Technical Summary's Figure 1), each a set of cells
    spans = [
        (DOORS[0], DOORS[1]),
        (DOORS[1], DOORS[2]),
        (DOORS[2], TAU - DOORS[2]),
        (TAU - DOORS[2], TAU - DOORS[1]),
        (TAU - DOORS[1], TAU - DOORS[0]),
    ]
    for i in range(5):
        za, zb = rings[i], rings[i + 1]
        r = CABIN.r((za + zb) / 2)
        if i == 4:  # the ring of "Z160.20 equipment access" shingles, all the way round below the top
            band(panels, bolts, za, zb, DOORS[0], TAU - DOORS[0], max(3, round((TAU - 2 * DOORS[0]) * r / CELL)), rivets="al")
            continue
        for t0, t1 in spans:
            band(panels, bolts, za, zb, t0, t1, max(1, round((t1 - t0) * r / CELL)), rivets="al")
    if interior():  # the frame under the shingles: seen only with the ship cut open
        under.lathe(prof([(CABIN.r(0.0) - 1.6, 0.0), (CABIN.r(aft) - 1.6, aft)]), 96, flip=True)
        under.lathe(prof([(CABIN.r(aft) - 1.6, aft), (CABIN.r(zz(Z_RCS)) - 1.6, zz(Z_RCS))]), 96, arc=(HATCH_OUT, TAU - HATCH_OUT), flip=True)
        sheet(under, -HATCH_OUT, HATCH_OUT, fwd, zz(Z_RCS), -1.6, 2.4, flip=True)
        sheet(under, lambda z: -hatch_in(z), hatch_in, aft, fwd, -1.6, 2.4, flip=True)
    under.lathe(hoop(SHIELD_R - 1.2, SHIELD_R + 0.25, 0.1, 1.5), 144)  # the ring the heat shield is bolted to
    under.lathe(hoop(NECK_R - 2.4, NECK_R + 0.2, zz(Z_RCS) - 0.4, zz(Z_RCS)), 96)
    panels.build("Cabin_Shingles", M["shingle"], g, sharp_angle=None)
    plain.build("Cabin_Plain", M["shingle"], g, sharp_angle=30)
    strips.build("Cabin_HingePlates", M["plate"], g, sharp_angle=30)
    bolts.build("Cabin_Fasteners", M["bolt"], g)
    under.build("Cabin_Structure", M["titanium"], g, sharp_angle=30)
    cable_cover(cover, CABIN, COVER_FOOT[2], Z_RCS - 0.05, foot=True)
    say(
        cover.build("Cabin_CableCover", M["cover"], g, sharp_angle=35),
        "Parachute cable cover",
        "The white strip along the top of the ship, between the hatches. It is in the photograph taken on the morning of "
        "the launch. SEDR 300 lists a cover over the parachute's control cables here, and that is what it is taken to be: "
        "the ship comes down hanging level from two points, and the lines to the forward one must run along the outside "
        "until they are pulled free. Its width and where it ends are read off the photograph.",
    )
    disc = MeshBuilder()
    t, z = WHITE_DISC[0], zz(WHITE_DISC[1])
    disc.lathe(prof([(WHITE_DISC[2] / 2, -0.1), (WHITE_DISC[2] / 2, 0.14), (0.0, 0.14)]), 28, matrix=frame(CABIN.p(t, z), CABIN.n(t)))
    say(
        disc.build("Cabin_WhiteDisc", M["cover"], g, sharp_angle=35),
        "White disc",
        "A white disc a few inches across, on the top of the ship just left of the middle, forward of the left hatch. It is "
        "in two photographs of this spacecraft, in January and on the morning of the launch. What it is has not been found.",
    )
    # paint: UNITED STATES in two lines and the flag under it, on each side below the hatch's hinge
    paint, flags = MeshBuilder(), MeshBuilder()
    fw, fh = 15.0, 15.0 / 1.9
    for side in (-1, 1):
        t = side * deg(92)
        for body, station in (("UNITED", LETTERS[0]), ("STATES", LETTERS[1])):
            lettering(paint, CABIN, body, 26.0, t, zz(station), False, font)
        nx, ny = 10, 5
        flags.grid(
            lambda i, j, t=t: CABIN.wrap(t, zz(LETTERS[2]), (i / nx - 0.5) * fw, (j / ny - 0.5) * fh, 0.3),
            range(nx + 1),
            range(ny + 1),
            uv=lambda i, j: (i / nx, j / ny),
        )
    paint.build("Cabin_Lettering", M["paint_white"], g, smooth=False)
    flags.build("Cabin_Flag", flag, g, sharp_angle=None)
    # the three fairings over the straps that hold the re-entry module to the adapter
    fair = MeshBuilder()
    us = [math.pi * k / 8 for k in range(9)]
    vs = [math.pi * k / 10 for k in range(11)]
    for a in STRAPS:
        f = frame(CABIN.p(a, 4.6, 0.0), CABIN.n(a))  # (a blister: across the cone, along it, and proud of it)
        fair.grid(
            lambda u, v: Vector((2.6 * IN * math.sin(v) * math.cos(u), -5.0 * IN * math.cos(v), 1.9 * IN * math.sin(v) * math.sin(u) - 0.25 * IN)),
            us,
            vs,
            matrix=f,
            flip=True,
        )
    say(
        fair.build("Cabin_StrapFairings", M["shingle"], g, sharp_angle=35),
        "Retaining strap fairing",
        "The re-entry module is held to the adapter by three titanium straps across this joint, a third of the way round from one "
        "another, with the wires and pipes crossing beside them. After retrofire a shaped charge cuts the straps and the last of "
        "the adapter is pushed away. The fairings are counted in SEDR 300; where round the ship they stand is estimated.",
    )
    if "reentry-communications" in fit.experiments:
        # on the right landing gear door, near its forward end: a plate with three nozzles in it, and an arming
        # receptacle half way along the door (NASA S64-04925)
        plate, noz = MeshBuilder(), MeshBuilder()
        t = (DOORS[1] + DOORS[2]) / 2
        F = frame(CABIN.p(t, zz(NOZZLE_PLATE[0]), 0.0), CABIN.n(t)) @ Matrix.Rotation(math.pi, 4, "Z")
        wide, tall = NOZZLE_PLATE[1], NOZZLE_PLATE[2]
        chamfered(plate, (wide, tall, 0.9), F, 0.14)
        chamfered(plate, (1.7, 1.3, 0.8), frame(CABIN.p(t - deg(4), zz(138.0), 0.0), CABIN.n(t)), 0.1)
        for x, y, a, b in ((-1.1, 1.3, 1.0, 1.55), (1.25, 1.5, 0.8, 1.25), (0.5, -1.6, 0.65, 1.05)):
            # (No. 3, No. 2 and No. 1 of the figure: each an oval mouth, the nozzle's own holes in a face set down inside it)
            m = F @ Matrix.Translation(Vector((x, y, 0.0)) * IN) @ Matrix.Diagonal((a, b, 1.0, 1.0))
            noz.lathe(prof([(1.12, 0.3), (1.12, 0.62), (1.0, 0.62), (1.0, 0.52), (0.0, 0.52)]), 20, matrix=m)
        say(
            plate.build("Experiment_NozzlePlate", M["steel"], g, sharp_angle=35),
            "Re-entry communications experiment",
            "Coming home, a ship is wrapped in air so hot that it stops radio: for some minutes nothing gets in or out. Here, on "
            "the right landing gear door, is the outside of 85 lb of equipment that tried a cure: three nozzles in a plate, "
            "through which a timer squirted water into the hot air in short pulses for about two and a half minutes. With the "
            "water on, stations on the ground did hear the ship. The plate, its three nozzles and its place near the door's "
            "forward end are NASA's own drawing of it (S64-04925), which has no dimensions: its size here is estimated.",
        )
        noz.build("Experiment_Nozzles", M["nozzle"], g, sharp_angle=35)
        if interior():
            tank = MeshBuilder()
            c = CABIN.p(t, zz(140.0), -6.5)
            tank.tube(c - Vector((0, 0, 7.0)) * IN, c + Vector((0, 0, 7.0)) * IN, 3.8 * IN, 16)
            tank.build("Experiment_WaterTank", M["tank"], g, sharp_angle=35)


def build_scanner_fairing(M) -> None:
    """The horizon scanners look out of the ship's left side at the neck; a fairing covers them on the way up. In the
    photograph of the morning of the launch it is a long flat-faced box the colour of bronze, riveted along its edges,
    lying from the cabin's forward end up over the re-entry control section."""
    g = group("ScannerFairing")
    mb, rivets = MeshBuilder(), MeshBuilder()
    t = SCANNER_AT
    s0, s1 = SCANNER_Z
    rad, tan = radial(t), Vector((-math.sin(t), math.cos(t), 0.0))
    face = NECK_R + SCANNER_PROUD
    body = lambda s: CABIN.r(zz(s)) if s < Z_RCS else NECK_R  # noqa: E731
    stations = [s0, s0 + 4.6, s0 + 9.0, s1 - 2.4, s1]
    rows = []
    for k, s in enumerate(stations):
        ht = SCANNER_HALF[0] + (SCANNER_HALF[1] - SCANNER_HALF[0]) * (s - s0) / (s1 - s0)
        hb = ht + 0.9
        top = body(s) - 3.0 if k in (0, len(stations) - 1) else face
        low = math.sqrt(body(s) ** 2 - hb**2) - (3.3 if k in (0, len(stations) - 1) else 0.4)
        rows.append([(rad * rho + tan * y + Vector((0.0, 0.0, zz(s)))) * IN for y, rho in ((-hb, low), (-ht, top), (ht, top), (hb, low))])
        if 0 < k < len(stations) - 1 and k + 1 < len(stations) - 1:
            s2 = stations[k + 1]
            n = max(2, round((s2 - s) / 1.7))
            for i in range(n + 1):
                sz = s + (s2 - s) * i / n
                h = SCANNER_HALF[0] + (SCANNER_HALF[1] - SCANNER_HALF[0]) * (sz - s0) / (s1 - s0)
                for y in (-h + 0.4, h - 0.4):
                    rivets.disc((rad * face + tan * y + Vector((0.0, 0.0, zz(sz)))) * IN, rad, 0.13 * IN, 0.06 * IN)
    mb.grid(lambda i, j: rows[j][i], range(4), range(len(rows)))
    mb.build("ScannerFairing_Shell", M["bronze"], g, sharp_angle=30)
    rivets.build("ScannerFairing_Rivets", M["aluminium"], g)


def seat(M, g, name: str, side: int, pilot: str) -> None:
    """An ejection seat: a built-up metal seat on a rocket catapult, canted outboard and forward so that two of them
    leave the ship on diverging paths. Empty: nobody is modelled in it."""
    out, fwd = SEAT_CANT
    # the seat's own axes: x to the occupant's right, y the way he faces (the ship's nose), z up his back (the ship's top)
    to_ship = Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    cant = Matrix.Rotation(side * out, 4, "Y") @ Matrix.Rotation(-fwd, 4, "X")
    m = Matrix.Translation(P(side * 12.0, -9.0, 120.0)) @ to_ship @ cant
    S = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    frame_, pad, web, ring = (MeshBuilder() for _ in range(4))

    def box(mb: MeshBuilder, lo, hi) -> None:
        size = [(hi[i] - lo[i]) * IN for i in range(3)]
        mb.box(size, m @ Matrix.Translation(S(*[(hi[i] + lo[i]) / 2 for i in range(3)])))

    for sx in (-1, 1):  # the two side beams of the back, the arm rests, and the legs' guards
        box(frame_, (sx * 8.4 - 0.6, -5.5, -3.0), (sx * 8.4 + 0.6, -1.0, 30.0))
        box(frame_, (sx * 8.5 - 0.5, -1.0, -3.0), (sx * 8.5 + 0.5, 12.0, 4.0))
        box(frame_, (sx * 7.6 - 0.4, 12.0, -3.0), (sx * 7.6 + 0.4, 15.0, 1.0))
    box(frame_, (-7.8, -5.2, -3.0), (7.8, -4.4, 30.0))  # the back's web
    box(frame_, (-8.0, -5.0, -4.2), (8.0, 15.0, -3.2))  # the pan
    box(frame_, (-7.7, -6.5, 25.0), (7.7, 0.6, 31.5))  # the box at its head: the parachute's risers, and the raft above them
    box(frame_, (-5.0, -7.5, 31.5), (5.0, -0.5, 34.0))
    frame_.tube(m @ S(0.0, -8.6, -4.0), m @ S(0.0, -8.6, 31.0), 2.1 * IN, 16)  # the rocket catapult up its back
    for sx in (-1, 1):  # the stirrups, on bars from the pan's front
        frame_.tube(m @ S(sx * 2.6, 15.0, -3.7), m @ S(sx * 2.6, 21.0, -1.6), 0.6 * IN, 8)
        box(frame_, (sx * 2.6 - 1.8, 20.0, -1.6), (sx * 2.6 + 1.8, 26.0, -0.9))
    box(pad, (-6.9, -3.9, 0.6), (6.9, -2.6, 24.5))  # the backboard, and the egress kit he sits on
    box(pad, (-7.3, -2.4, -3.1), (7.3, 14.0, 0.1))
    box(pad, (-3.6, 0.7, 25.6), (3.6, 2.2, 30.6))  # the headrest
    for sx in (-1, 1):  # the shoulder straps down the backboard, and the lap belt's two halves on the kit
        web.ribbon(
            [m @ S(sx * 2.6, -2.45, 23.5), m @ S(sx * 3.0, -2.45, 14.0), m @ S(sx * 3.4, -2.45, 3.0)], m.to_3x3() @ Vector((1, 0, 0)), 1.75 * IN
        )
        web.ribbon([m @ S(sx * 7.2, 2.0, 0.25), m @ S(sx * 1.0, 3.0, 0.25)], m.to_3x3() @ Vector((0, 1, 0)), 1.75 * IN)
    # the D-ring between the knees: pulled, it fires both seats
    ring.lathe(
        prof([(2.1 + 0.4 * math.cos(a), 0.4 * math.sin(a)) for a in (TAU * i / 8 for i in range(9))]),
        20,
        matrix=m @ Matrix.Translation(S(0.0, 14.0, 2.6)) @ Matrix.Rotation(math.pi / 2, 4, "X"),
    )
    about = (
        f"{pilot}'s seat. " if pilot else ""
    ) + "Gemini has no escape tower: for the first fifteen thousand feet and again under a failed parachute the way out is this, an "
    about += (
        "ejection seat on a rocket catapult, as in a fighter. Pulling the ring between the knees blows both hatches open and fires "
        "both seats, which are canted 12° apart and 8° forward so that they do not meet. Nobody ever had to. The seat here is "
        "empty, and is drawn from SEDR 300's figure, which has no dimensions."
    )
    say(frame_.build(f"{name}_Frame", M["seat"], g, sharp_angle=35), "Ejection seat", about)
    pad.build(f"{name}_Cushions", M["cushion"], g, sharp_angle=35)
    web.build(f"{name}_Harness", M["webbing"], g, smooth=False)
    say(
        ring.build(f"{name}_EjectionRing", M["yellow"], g, sharp_angle=None),
        "Ejection control",
        "The D-ring: pulled with both hands, it fires both seats.",
    )


def build_crew_station(M, fit: Fit) -> None:
    """The pressure vessel and what is in it. The vessel is not the cone: it is a welded titanium box inside it, flat
    sided, with the hatches for its roof; the space between its sides and the cone is the equipment bays."""
    g = group("CrewStation")
    v = MeshBuilder()
    za, zb = Z_SILL, Z_HATCH_FWD - 0.8

    def section(station: float, n: int = 48) -> list[Vector]:
        """The vessel's outline at a station: the roof's arc under the hatches, then down one side, across the floor and up."""
        k = (station - za) / (160.2 - za)
        rr = lambda a: CABIN.r(zz(station)) - max(WALL, depth(a, zz(station)) + 0.9) - 0.1  # noqa: E731
        arc = [P(rr(a) * math.sin(a), rr(a) * math.cos(a), station) for a in (-HATCH_OUT + 2 * HATCH_OUT * i / n for i in range(n + 1))]
        half, floor = 26.0 - 13.0 * k, -17.5 + 3.0 * k
        return [*arc, P(half, floor, station), P(-half, floor, station)]

    a, b = section(za), section(zb)
    n = len(a)
    rows = 8
    for i in range(n):  # the sides and the floor (the roof is the hatches and the beam between them)
        j = (i + 1) % n
        if j <= 48 and i < 48:
            continue
        quad = [a[i].lerp(b[i], t / rows) for t in range(rows + 1)] + [a[j].lerp(b[j], t / rows) for t in range(rows + 1)]
        v.add([tuple(p) for p in quad], [(t, t + 1, rows + 2 + t, rows + 1 + t) for t in range(rows)])
    for ring_, facing in ((a, 1), (b, -1)):  # the two pressure bulkheads
        mid = sum(ring_, Vector()) / n
        v.add(
            [tuple(mid)] + [tuple(p) for p in ring_], [(0, 1 + i, 1 + (i + 1) % n) if facing > 0 else (0, 1 + (i + 1) % n, 1 + i) for i in range(n)]
        )
    # the beam between the hatches, inside
    r_of = lambda s: CABIN.r(zz(s)) - WALL  # noqa: E731
    beam = lambda k, s: k * hatch_in(zz(s))  # noqa: E731
    v.grid(lambda k, s: P(r_of(s) * math.sin(beam(k, s)), r_of(s) * math.cos(beam(k, s)), s), [-1, 0, 1], [za + (zb - za) * i / 8 for i in range(9)])
    v.build("CrewStation_PressureVessel", M["titanium"], g, sharp_angle=30)
    if not interior():
        return
    seat(M, g, "SeatCommandPilot", -1, fit.names[0])
    seat(M, g, "SeatPilot", 1, fit.names[1])
    # the instrument panels across the cabin ahead of the seats: one before each man, one between, a pedestal below it
    board, dials, faces = MeshBuilder(), MeshBuilder(), MeshBuilder()
    station = 141.5
    tilt = Matrix.Rotation(deg(-8), 4, "Y")  # leaned back a little toward the eyes

    def panel(right: float, top: float, wide: float, tall: float, turn: float = 0.0) -> Matrix:
        """A panel's own frame: x across it to the crew's right, y up it, z out of its face toward the seats."""
        to_ship = Matrix(((0, 1, 0, 0), (1, 0, 0, 0), (0, 0, -1, 0), (0, 0, 0, 1)))
        at = Matrix.Translation(P(right, top, station)) @ Matrix.Rotation(turn, 4, "X") @ tilt @ to_ship
        board.box((wide * IN, tall * IN, 1.2 * IN), at @ Matrix.Translation(Vector((0, 0, -0.6)) * IN))
        return at

    def dial(at: Matrix, x: float, y: float, r: float) -> None:
        dials.lathe(prof([(r + 0.25, 0.0), (r + 0.25, 0.3), (r, 0.3)]), 20, matrix=at @ Matrix.Translation(Vector((x, y, 0.0)) * IN))
        faces.lathe(prof([(r, 0.22), (0.0, 0.22)]), 20, matrix=at @ Matrix.Translation(Vector((x, y, 0.0)) * IN))

    def strip(at: Matrix, x: float, y: float, wide: float, tall: float) -> None:
        faces.box((wide * IN, tall * IN, 0.24 * IN), at @ Matrix.Translation(Vector((x, y, 0.12)) * IN))

    for side in (-1, 1):  # each man's panel: an attitude ball, round instruments beside it, tapes under
        at = panel(side * 13.5, 8.0, 15.0, 11.0, side * deg(8))
        dial(at, -side * 2.2, 1.6, 2.6)
        for i, (x, y) in enumerate(((3.6, 3.2), (3.6, -0.4), (-5.4, 3.2), (-5.4, -0.4))):
            dial(at, side * x if i < 2 else side * x, y, 1.25)
        strip(at, -side * 2.2, -3.6, 5.2, 1.6)
        strip(at, side * 4.6, -3.8, 3.0, 1.3)
    at = panel(0.0, 10.0, 9.0, 15.0)  # the centre panel: tapes for the propellants and the cabin, rows of switches
    for i in range(4):
        strip(at, -2.7 + 1.8 * i, 3.6, 1.1, 5.2)
    for j in range(3):
        for i in range(5):
            strip(at, -3.2 + 1.6 * i, -2.0 - 1.9 * j, 0.9, 0.9)
    # (the pedestal's own frame: x to the crew's right, y toward the nose, z toward the top)
    ped = Matrix.Translation(P(0.0, -2.0, 132.0)) @ Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
    board.box((5.0 * IN, 20.0 * IN, 5.0 * IN), ped)  # the pedestal between the seats, running aft from the panel
    for j in range(4):
        for i in range(2):
            faces.box((1.0 * IN, 1.0 * IN, 0.24 * IN), ped @ Matrix.Translation(Vector((-1.0 + 2.0 * i, -6.0 + 3.6 * j, 2.62)) * IN))
    stick = MeshBuilder()  # the one attitude hand controller, on the pedestal between them, which either man can reach
    stick.tube(P(0.0, 0.9, 125.0), P(0.0, 6.0, 125.6), 0.6 * IN, 10)
    stick.tube(P(0.0, 6.0, 125.6), P(0.0, 8.5, 125.6), 1.0 * IN, 12)
    say(
        board.build("CrewStation_Panels", M["panel"], g, sharp_angle=35),
        "Instrument panels",
        "One panel before each man, one between them, and a pedestal running back between the seats. The command pilot, on the "
        "left, has the attitude ball, the velocity indicator and the abort handle; the pilot has the computer's keyboard and the "
        "radios. The panels are placed from SEDR 300's figure of a typical cabin; the instruments on them are stand-ins, not "
        "this spacecraft's own panel, which is drawn in a report that has not been read.",
    )
    dials.build("CrewStation_Bezels", M["aluminium"], g, sharp_angle=35)
    faces.build("CrewStation_Instruments", M["dial"], g, sharp_angle=35)
    say(
        stick.build("CrewStation_AttitudeController", M["equipment"], g, sharp_angle=35),
        "Attitude hand controller",
        "One stick between the seats, where either man can reach it: it turns the ship. The thrusters that move it bodily are "
        "worked by a second handle under each man's outboard hand, which is not modelled. Its place is estimated.",
    )


# ------------------------------------------------------------------ the adapter


def adapter_skin(M, g, prefix: str, s0: float, s1: float, ports=()) -> tuple:
    """A length of the adapter's skin from station s0 up to s1: magnesium, white outside, aluminium foil inside, with the
    stringers that carry the coolant on its inner face. `ports`: (angle, station, radius) holes for thrust chambers."""
    skin, foil, rings, stringers = (MeshBuilder() for _ in range(4))
    z0, z1 = zz(s0), zz(s1)
    n = max(6, round((z1 - z0) / 2.6))
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    skin.lathe(prof([(ADAPTER.r(z), z) for z in zs]), 144)
    fs = [z0 + 1.6 + (z1 - z0 - 3.2) * i / n for i in range(n + 1)]  # (between the rings at its ends)
    foil.lathe(prof([(ADAPTER.r(z) - 0.5, z) for z in fs]), 144, flip=True)
    skin_obj = skin.build(f"{prefix}_Skin", M["white"], g, sharp_angle=None)
    foil_obj = foil.build(f"{prefix}_Foil", M["foil"], g, sharp_angle=None)
    bpy.context.view_layer.update()
    for a, s, r in ports:  # (the foil is not cut: it faces inward only, and a chamber's cup stands through it)
        port((skin_obj.name,), frame(ADAPTER.p(a, zz(s)), ADAPTER.n(a)), r * IN, 3.0 * IN)
    for z, wide in ((z0, 1.6), (z1, 1.6)):
        lo, hi = (z, z + wide) if z == z0 else (z - wide, z)
        rings.lathe(
            prof(
                [
                    (ADAPTER.r(lo) - 2.6, lo),
                    (ADAPTER.r(lo) - 0.12, lo),
                    (ADAPTER.r(hi) - 0.12, hi),
                    (ADAPTER.r(hi) - 2.6, hi),
                    (ADAPTER.r(lo) - 2.6, lo),
                ]
            ),
            144,
        )
    if interior():
        for i in range(40):  # the stringers: each a bulb on a web, the bulb hollow for the coolant
            a = TAU * (i + 0.5) / 40
            stringers.tube(ADAPTER.p(a, z0 + 1.8, -1.5), ADAPTER.p(a, z1 - 1.8, -1.5), 0.42 * IN, 6, caps=False)
    rings.build(f"{prefix}_Rings", M["magnesium"], g, sharp_angle=30)
    if stringers.verts:
        say(
            stringers.build(f"{prefix}_Stringers", M["magnesium"], g, sharp_angle=None),
            "Coolant stringers",
            "The adapter is the ship's radiator. Its stringers are extruded with a hollow bulb along them, and the coolant that "
            "has taken the heat from the cabin and the electronics is pumped through the bulbs; the white skin they are fastened "
            "to gives the heat to space. Their section is SEDR 300's; their number here is a guess.",
        )
    return skin_obj, foil_obj


def build_retro_section(M, fit: Fit) -> None:
    """The adapter's upper part: the four retrograde rockets, and six of the OAMS's thrust chambers. It stays on until
    the rockets have fired."""
    g = group("RetroSection")
    lateral = [(deg(a), 86.0, 2.9) for a in (0, 90, 180, 270)]  # the four that translate up, right, down, left
    forward = [(deg(a), 98.5, 2.7) for a in (72, -72)]  # the two that fire forward, to slow the ship
    adapter_skin(M, g, "Retro", Z_EQUIP_TOP, Z0, [*lateral, *forward])
    band = MeshBuilder()  # the ring the adapter is cut round before retrofire: it shows as a band standing a little proud
    band.lathe(
        prof(
            [
                (ADAPTER.r(zz(s)) + o, zz(s))
                for s, o in ((Z_EQUIP_TOP - 0.3, -0.05), (Z_EQUIP_TOP, 0.16), (Z_RETRO_FOOT, 0.16), (Z_RETRO_FOOT + 0.3, -0.05))
            ]
        ),
        144,
    )
    band.build("Retro_SeparationBand", M["white"], g, sharp_angle=30)
    noz, cup, dummy = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for a, s, _r in lateral:
        thruster(noz if fit.lateral_thrusters else dummy, cup, ADAPTER.p(a, zz(s)), ADAPTER.n(a), 2.3, _r)
    for a, s, _r in forward:
        out = (ADAPTER.n(a) * 0.82 + Vector((0, 0, 0.57))).normalized()
        thruster(noz, cup, ADAPTER.p(a, zz(s)), out, 2.1, _r)
    cup.build("Retro_Ports", M["titanium"], g, sharp_angle=35)
    say(
        noz.build("Retro_ForwardThrusters", M["nozzle"], g, sharp_angle=35),
        "Forward-firing thrusters",
        "Two chambers of 85 lbf that fire toward the nose, to slow the ship. An hour and a half after the launch Grissom held "
        "them on for 75 seconds, took 15 metres a second off the ship's speed, and Gemini 3 was in a different orbit: the first "
        "time a crew had changed the path they were on. Their thrust is documented; where they stand is read off SEDR 300's "
        "small drawing.",
    )
    if dummy.verts:
        say(
            dummy.build("Retro_LateralThrusters", M["steel"], g, sharp_angle=35),
            "Lateral thrusters (dummies)",
            "Four chambers of 100 lbf belong here, pointing out to the sides, up and down through the ship's centre of gravity, to "
            "move it bodily without turning it. On this ship all four were dummies: it could go forward and back, and nothing "
            "else. So when the plan called for a push sideways, to tilt the orbit by a fiftieth of a degree, Grissom turned the "
            "whole ship square to its path and used the forward and aft thrusters. The next ship had real ones.",
        )
    if not interior():
        return
    r, at, mid = RETRO
    case, bell, beam = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for k in range(4):
        c = radial(deg(45) + TAU * k / 4) * at + Vector((0, 0, zz(mid)))
        sphere(case, c * IN, r * IN)
        m = Matrix.Translation(c * IN)
        bell.lathe(prof([(1.4, -r + 1.0), (2.2, -r - 1.5), (3.6, -r - 5.5), (4.3, -r - 8.0)][::-1]), 20, matrix=m)
        case.lathe(hoop(2.0, 3.2, -r - 0.3, -r + 1.2), 16, matrix=m)
    for a in (0.0, deg(90)):  # the cross of beams they are bolted to
        e = radial(a)
        along = Matrix((e, Vector((-e.y, e.x, 0.0)), Vector((0, 0, 1)))).transposed().to_4x4()
        along.translation = Vector((0, 0, zz(mid + 2.0))) * IN
        beam.box((2 * (ADAPTER.r(zz(mid + 7.0)) - 3.2) * IN, 0.4 * IN, 9.0 * IN), along)
    beam.tube(Vector((0, 0, zz(mid - 3.5))) * IN, Vector((0, 0, zz(mid + 7.5))) * IN, 2.2 * IN, 16)
    say(
        case.build("Retro_Rockets", M["case"], g, sharp_angle=None),
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 4 hours 33 "
        "minutes 23 seconds they brought Gemini 3 down. Going up they have a second use: fired together, they pull the ship "
        "off a failing Titan. Their size is SEDR 300's; where they sit in the section is read off its small figure.",
    )
    bell.build("Retro_RocketNozzles", M["nozzle"], g, sharp_angle=35)
    beam.build("Retro_Beams", M["aluminium"], g, sharp_angle=35)


def build_equipment_section(M, fit: Fit) -> None:
    """The adapter's lower part: what is needed only in orbit. It is cut away just before retrofire."""
    g = group("EquipmentSection")
    places = [deg(a) for a in (40, 140, 220, 320)]  # the four places the attitude chambers stand at, two to a place
    ports = [(a + da, 27.0, 1.9) for a in places for da in (-deg(4.5), deg(4.5))]
    adapter_skin(M, g, "Equipment", Z_BASE + 1.6, Z_EQUIP_TOP, ports)
    ring = MeshBuilder()  # the machined ring at its foot, bolted to the launch vehicle with twenty bolts
    ring.lathe(hoop(BASE_R - 2.4, BASE_R + 0.45, zz(Z_BASE), zz(Z_BASE + 1.6)), 144)
    for i in range(20):
        a = TAU * (i + 0.5) / 20
        ring.disc(ADAPTER.p(a, zz(Z_BASE + 0.8), 0.45), radial(a), 0.55 * IN, 0.35 * IN)
    ring.build("Equipment_MatingRing", M["aluminium"], g, sharp_angle=30)
    noz, cup = MeshBuilder(), MeshBuilder()
    for a, s, _r in ports:
        # each chamber fires square to the ship's axis, along the top-bottom line or the left-right one by turns
        thruster(noz, cup, ADAPTER.p(a, zz(s)), ADAPTER.n(a), 1.25, _r)
    cup.build("Equipment_Ports", M["titanium"], g, sharp_angle=35)
    say(
        noz.build("Equipment_AttitudeThrusters", M["nozzle"], g, sharp_angle=35),
        "Attitude thrusters",
        "Eight chambers of 25 lbf in pairs at four places round the adapter's foot: one of each pair pitches the ship, the "
        "other yaws it, and fired crosswise they roll it. They are part of the orbit attitude and maneuver system, whose "
        "propellants are in this section. Their number and thrust are documented; their places are read off drawings and one "
        "photograph, and here all eight point straight out, which the real ones do not.",
    )
    aft = MeshBuilder()
    for a in (deg(90), deg(-90)):  # the two that fire aft, at the foot, into the launch vehicle's scuppers on the pad
        c = radial(a) * 49.0 + Vector((0, 0, zz(Z_BASE + 9.0)))
        aft.lathe(
            prof([(1.0, 7.0), (1.6, 4.0), (2.6, 1.5), (3.1, 0.0)][::-1]),
            20,
            matrix=frame(c * IN, Vector((0, 0, -1))) @ Matrix.Translation(Vector((0, 0, -7.0)) * IN),
        )
    say(
        aft.build("Equipment_AftThrusters", M["nozzle"], g, sharp_angle=35),
        "Aft-firing thrusters",
        "Two chambers of 100 lbf at the adapter's foot, firing backward. When the Titan's engine had stopped and a charge "
        "had cut the ship free, Grissom held these on to push it clear and into orbit. He held them a little long. At "
        "4 hours 21 minutes he used them again, for two and a half minutes, to bring the low point of the orbit down into the "
        "air: had the retrograde rockets then failed, the ship would have come home anyway.",
    )
    cover = MeshBuilder()
    cover.lathe(prof([(0.0, zz(Z_BASE + 13.0)), (30.0, zz(Z_BASE + 10.0)), (BASE_R - 3.0, zz(Z_BASE + 2.2))]), 72)
    say(
        cover.build("Equipment_Cover", M["gold"], g, sharp_angle=None),
        "Temperature control cover",
        "The adapter's foot is open once the Titan has gone, and the Sun would shine straight in on the tanks. A cover of glass "
        "fibre with gold deposited on it is stretched across the opening. Documented; its shape here is estimated from a "
        "photograph of this adapter being lowered onto the launch vehicle.",
    )
    if not interior():
        return
    shield = MeshBuilder()
    shield.lathe(prof([(0.0, zz(Z_EQUIP_TOP - 3.0)), (ADAPTER.r(zz(Z_EQUIP_TOP - 3.0)) - 2.8, zz(Z_EQUIP_TOP - 3.0))]), 72)
    say(
        shield.build("Equipment_BlastShield", M["honeycomb"], g, sharp_angle=None),
        "Blast shield",
        "A honeycomb shield across the top of this section, under the retrograde rockets. If the rockets were ever fired to pull "
        "the ship off a failing launch vehicle, this section and the Titan's oxidiser tank would be straight below them.",
    )
    tanks, frames_, gear, batt = (MeshBuilder() for _ in range(4))
    # the OAMS: an oxidiser tank and a fuel tank either side, and the gas that pushes them between
    sphere(tanks, P(-22.0, 6.0, 44.0), 11.0 * IN)
    sphere(tanks, P(22.0, 6.0, 44.0), 11.0 * IN)
    sphere(tanks, P(0.0, 24.0, 40.0), 8.0 * IN)
    say(
        tanks.build("Equipment_OamsTanks", M["tank"], g, sharp_angle=None),
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: an oxidiser tank, a fuel tank, and a bottle of helium to push them, feeding "
        "sixteen thrust chambers round the adapter. About 300 lb of propellant on this flight. With it Gemini 3 changed its "
        "orbit three times. The tanks' sizes and places here are estimated.",
    )
    oxygen = MeshBuilder()
    sphere(oxygen, P(-24.0, -22.0, 42.0), 9.0 * IN)
    say(
        oxygen.build("Equipment_PrimaryOxygen", M["tank"], g, sharp_angle=None),
        "Primary oxygen",
        "The oxygen the crew breathe in orbit: 15.3 lb of it on this flight. When this section is cut away before retrofire they "
        "go on to a smaller supply in the re-entry module. Its size and place here are estimated.",
    )
    n = fit.adapter_batteries
    for i in range(n):
        batt.box((8.0 * IN, 15.0 * IN, 10.0 * IN), Matrix.Translation(P(14.0 + 0.0, -24.0, 40.0) + Vector((0.0, (i - (n - 1) / 2) * 9.0, 0.0)) * IN))
    if n:
        say(
            batt.build("Equipment_Batteries", M["battery"], g, sharp_angle=35),
            "Adapter batteries",
            f"{('Three', 'Six')[n > 3]} silver-zinc batteries of 400 ampere-hours: all the power the ship has in orbit. The fuel "
            "cells that were to make Gemini's electricity from hydrogen and oxygen were not ready, so the first two crews flew on "
            "batteries, and how long the batteries would last set how long the flights could be. Their number and rating are "
            "documented; their size and place here are estimated.",
        )
    for i in range(fit.water_tanks):
        gear.tube(P(-6.0 + 9.0 * i, -30.0, 34.0), P(-6.0 + 9.0 * i, -30.0, 46.0), 3.6 * IN, 16)
    for right, top, size in (
        (-34.0, -4.0, (9.0, 12.0, 14.0)),
        (34.0, -6.0, (9.0, 14.0, 12.0)),
        (0.0, -12.0, (14.0, 10.0, 9.0)),
        (10.0, 34.0, (12.0, 8.0, 10.0)),
    ):
        gear.box(tuple(s * IN for s in size), Matrix.Translation(P(right, top, 40.0)))
    gear.build("Equipment_Modules", M["equipment"], g, sharp_angle=35)
    zf = Z_BASE + 17.5
    for a in (TAU * i / 6 for i in range(6)):  # the frame the modules hang on: spokes from a hub to the adapter's wall
        frames_.tube(P(0.0, 0.0, zf), ADAPTER.p(a, zz(zf), -2.2), 0.9 * IN, 8)
    frames_.build("Equipment_ModuleFrame", M["aluminium"], g, sharp_angle=35)


def build(font, flag, fit: Fit | None = None) -> str:
    """Build the spacecraft with Z103.44 at the origin and the hatches on +X. `flag` is the material the flag is drawn in.
    Returns its overall size."""
    fit = fit or Fit()
    M = reuse(materials())
    build_nose_fairing(M)
    build_rendezvous_recovery(M, fit)
    build_reentry_control(M)
    build_hatches(M, fit)
    build_scanner_fairing(M)
    build_cabin(M, fit, font, flag)
    build_crew_station(M, fit)
    build_heat_shield(M)
    build_retro_section(M, fit)
    build_equipment_section(M, fit)
    return f"spacecraft {LENGTH * IN:.3f} m long, {2 * BASE_R * IN:.3f} m across its base"
