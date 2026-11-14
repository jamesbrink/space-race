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
from collections.abc import Callable
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
    Z_DIVISION,
    Z_HATCH_AFT,
    Z_HATCH_FWD,
    Z_MATING_TOP,
    Z_NOSE,
    Z_RCS,
    Z_RR,
    Z_RR_TAPER,
    Z_RR_TOP,
    Z_SHIELD_APEX,
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
from srlib import IN, TAU, MeshBuilder, Surf, deg, frame, group, interior, lettering, material, prof

# What the ship's stations and surfaces are, and what its skins are made of, is in gemini_shell.py.

RETRO = (6.5, 19.5, 84.0)  # a retrograde rocket: its case's radius, how far its axis is from the ship's, its middle's station

# The orbit attitude and maneuver system's sixteen chambers, by SEDR 300's Figure 8-72 and its table. Which way each
# fires is documented; these places are read off the figure, which is a sketch in perspective: estimated.
OAMS_ATTITUDE = (deg(36), deg(54))  # a cluster's two chambers at the adapter's foot, round from the top or the bottom
OAMS_ATTITUDE_Z = 27.0  # their station
OAMS_AFT = (0.0, math.pi)  # 9 and 10, which push the ship forward: at the foot, top and bottom
OAMS_FORWARD = (deg(78), 95.5)  # 11 and 12, which slow it: round from the top on either side, and their station
OAMS_LATERAL = 86.0  # 13 to 16: the station they push through
# its tanks, as (inches to the crew's right, inches toward the top, station): fuel, oxidiser, helium
OAMS_TANKS = ((9.0, 21.0, 44.0), (20.0, 2.0, 44.0), (-8.0, -2.0, 46.0))

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
    crew: Callable | None = None  # builds the man in each seat (gemini_cabin.seat); without it the seats are empty


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


def sphere(mb: MeshBuilder, centre: Vector, r: float, segs: int = 32) -> None:
    """A ball: its middle and its radius in metres. (The first model of this ship gave the radius in metres to a
    profile that took inches, and every tank in it was a fortieth of its size.)"""
    n = 16 if srlib.DETAIL >= 1.0 else 8
    mb.lathe(
        [(r * math.cos(a), r * math.sin(a)) for a in (-math.pi / 2 + math.pi * i / n for i in range(n + 1))],
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


# where an experiment rides on the inside of a hatch: round from the top, and the station of its aft end. Estimated: clear
# of a seated man's helmet, which is within an inch of the hatch from Z120 to Z134, and inboard of the window
EXPERIMENT_AT = (deg(20), 134.5)


def build_experiments_on_hatches(M, g, fit: Fit) -> None:
    """What rode on the inside of the hatches on a flight that carried it."""
    if "sea-urchin" in fit.experiments:
        mb = MeshBuilder()
        t = -EXPERIMENT_AT[0]
        a = CABIN.p(t, zz(EXPERIMENT_AT[1]), -WALL - 2.0)
        b = CABIN.p(t, zz(EXPERIMENT_AT[1] + 6.75 * math.cos(CABIN_A)), -WALL - 2.0)
        mb.tube(a, b, 1.625 * IN, 20)
        mb.tube(b, b + (b - a).normalized() * 1.4 * IN, 0.5 * IN, 10)  # the handle that is turned
        say(
            mb.build("Experiment_SeaUrchinEggs", M["aluminium"], g, sharp_angle=35),
            "Sea urchin egg experiment",
            "A metal cylinder 3 1/4 in across and 6 3/4 in long on the inside of the left hatch, holding eight chambers of sea "
            "urchin eggs, sperm and a fixative. Turning the handle at its end was to fertilise the eggs, and turning it again "
            "later to stop them, so that it could be seen whether cells divide differently without weight. Grissom turned it; "
            "the handle broke off in his hand. Its size and its hatch are the press kit's; where on the hatch is estimated: "
            "forward of his helmet and inboard of the window, where there is room for it and his hand comes to it.",
        )
    if "blood" in fit.experiments:
        mb = MeshBuilder()
        t, z = EXPERIMENT_AT[0], EXPERIMENT_AT[1] + 2.0
        chamfered(mb, (3.7, 3.8, 1.3), frame(CABIN.p(t, zz(z), -WALL - 1.1), -CABIN.n(t)), 0.1)
        mb.tube(CABIN.p(t, zz(z + 2.3), -WALL - 1.1), CABIN.p(t, zz(z + 3.5), -WALL - 1.1), 0.45 * IN, 10)
        for dz in (-1.2, 1.2):  # its two feet on the hatch
            mb.tube(CABIN.p(t, zz(z + dz), -WALL + 0.2), CABIN.p(t, zz(z + dz), -WALL - 0.6), 0.4 * IN, 8)
        say(
            mb.build("Experiment_BloodIrradiation", M["aluminium"], g, sharp_angle=35),
            "Blood irradiation experiment",
            "A sealed aluminium box 3.7 by 3.8 by 1.3 in on the inside of the right hatch, holding samples of human blood beside a "
            "source of phosphorus-32. Young twisted its handle to put the blood in the way of the radiation, and again to take it "
            "out; the same was done to a twin of it at the Cape. The blood that had been in orbit showed a little more damage. "
            "Its size and its hatch are the press kit's; where on the hatch is estimated: forward of his helmet and inboard "
            "of the window.",
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
            # (its water, in the landing gear's well behind the door, outside the pressure vessel: its size and place a guess)
            tank = MeshBuilder()
            tank.tube(CABIN.p(t, zz(111.0), -5.0), CABIN.p(t, zz(125.0), -5.0), 2.2 * IN, 16)
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


def build_crew_station(M, fit: Fit, font=None) -> None:
    """The pressure vessel and what is in it: gemini_cabin.py. The vessel is not the cone: it is a welded titanium box
    inside it, flat sided, with the hatches for its roof; the space between its sides and the cone is the equipment bays."""
    import gemini_cabin

    gemini_cabin.build(group("CrewStation"), M, font or srlib.load_font(), fit.names, say, fit.crew)


# ------------------------------------------------------------------ the adapter


def adapter_skin(M, g, prefix: str, s0: float, s1: float) -> tuple:
    """A length of the adapter's skin from station s0 up to s1: magnesium, white outside, aluminium foil inside, with the
    stringers that carry the coolant on its inner face."""
    skin_, foil, rings, stringers = (MeshBuilder() for _ in range(4))
    z0, z1 = zz(s0), zz(s1)
    n = max(6, round((z1 - z0) / 2.6))
    zs = [z0 + (z1 - z0) * i / n for i in range(n + 1)]
    skin_.lathe(prof([(ADAPTER.r(z), z) for z in zs]), 144)
    fs = [z0 + 1.6 + (z1 - z0 - 3.2) * i / n for i in range(n + 1)]  # (between the rings at its ends)
    foil.lathe(prof([(ADAPTER.r(z) - 0.5, z) for z in fs]), 144, flip=True)
    skin_obj = skin_.build(f"{prefix}_Skin", M["white"], g, sharp_angle=None)
    foil_obj = foil.build(f"{prefix}_Foil", M["foil"], g, sharp_angle=None)
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
    bpy.context.view_layer.update()
    return skin_obj, foil_obj


def i_beam(mb: MeshBuilder, along: Matrix, length: float, deep: float, flange: float) -> None:
    """A beam of I section lying along its frame's x, `deep` along its z: a web, a flange top and bottom, and stiffeners
    across the web."""
    chamfered(mb, (length - 0.2, 0.3, deep - 0.5), along, 0.05)
    for s in (-1, 1):
        chamfered(mb, (length, flange, 0.35), along @ Matrix.Translation(Vector((0.0, 0.0, s * (deep / 2 - 0.17))) * IN), 0.06)
    n = max(2, round(length / 9.0))
    for i in range(n + 1):
        x = -length / 2 + 1.0 + (length - 2.0) * i / n
        if abs(x) < 3.0:
            continue
        chamfered(mb, (0.25, flange * 0.8, deep - 0.8), along @ Matrix.Translation(Vector((x, 0.0, 0.0)) * IN), 0.04)


def build_retro_section(M, fit: Fit) -> None:
    """The adapter's upper part: the four retrograde rockets, and six of the OAMS's thrust chambers. It stays on until
    the rockets have fired."""
    g = group("RetroSection")
    skin_obj, _ = adapter_skin(M, g, "Retro", Z_DIVISION, Z0)
    band = MeshBuilder()  # where the adapter is cut round before retrofire: the two sections' rings meet in a band
    band.lathe(
        prof(
            [
                (ADAPTER.r(zz(s)) + o, zz(s))
                for s, o in ((Z_DIVISION - 1.5, -0.05), (Z_DIVISION - 1.2, 0.16), (Z_DIVISION + 1.2, 0.16), (Z_DIVISION + 1.5, -0.05))
            ]
        ),
        144,
    )
    band.build("Retro_SeparationBand", M["white"], g, sharp_angle=30)
    noz, cup, dummy = MeshBuilder(), MeshBuilder(), MeshBuilder()
    skins = (skin_obj.name,)
    # 13 to 16, which move the ship bodily to the right, to the left, up and down: each on the far side from the way it
    # pushes, firing straight out, at the station of the ship's centre of gravity (SEDR 300, Figure 8-72)
    for theta in (deg(-90), deg(90), deg(180), 0.0):
        chamber(noz if fit.lateral_thrusters else dummy, cup, skins, ADAPTER, theta, zz(OAMS_LATERAL), radial(theta), 2.3, 2.9)
    # 11 and 12, which slow it: one on each side, firing forward and out
    forward = MeshBuilder()
    for side in (1, -1):
        theta = side * OAMS_FORWARD[0]
        out = (radial(theta) * 0.82 + Vector((0.0, 0.0, 0.57))).normalized()
        chamber(forward, cup, skins, ADAPTER, theta, zz(OAMS_FORWARD[1]), out, 2.1, 2.7)
    tidy(skins, ADAPTER)
    cup.build("Retro_Ports", M["titanium"], g, sharp_angle=35)
    say(
        forward.build("Retro_ForwardThrusters", M["nozzle"], g, sharp_angle=35),
        "Forward-firing thrusters",
        "Chambers 11 and 12: two of 85 lbf, one on each side, that fire toward the nose to slow the ship. An hour and a half "
        "after the launch Grissom held them on for 75 seconds, took 15 metres a second off the ship's speed, and Gemini 3 was "
        "in a different orbit: the first time a crew had changed the path they were on. Their thrust is documented; where "
        "they stand is read off SEDR 300's sketch of the system, and how far they lean forward is estimated.",
    )
    if noz.verts:
        say(
            noz.build("Retro_LateralThrusters", M["nozzle"], g, sharp_angle=35),
            "Lateral thrusters",
            "Four chambers of 100 lbf that move the ship bodily.",
        )
    if dummy.verts:
        say(
            dummy.build("Retro_LateralThrusters", M["steel"], g, sharp_angle=35),
            "Lateral thrusters (dummies)",
            "Chambers 13 to 16: four of 100 lbf belong here, pointing out to the sides, up and down through the ship's centre of "
            "gravity, to move it bodily without turning it. McDonnell's manual says it in a note on the drawing: inoperative on "
            "spacecraft 3. It could go forward and back, and nothing else. So when the plan called for a push sideways, to tilt "
            "the orbit by a fiftieth of a degree, Grissom turned the whole ship square to its path and used the forward and aft "
            "thrusters. The next ship had real ones. What stood in the ports of this one is not recorded; here they are the "
            "chambers' shapes in plain steel.",
        )
    if not interior():
        return
    r, at, mid = RETRO
    case, bell, beam, fit_ = (MeshBuilder() for _ in range(4))
    for k in range(4):
        a = deg(45) + TAU * k / 4
        c = radial(a) * at + Vector((0, 0, zz(mid)))
        sphere(case, c * IN, r * IN)
        m = Matrix.Translation(c * IN)
        bell.lathe(prof([(1.4, -r + 1.0), (2.2, -r - 1.5), (3.6, -r - 5.5), (4.3, -r - 8.0)][::-1]), 20, matrix=m)
        case.lathe(hoop(2.0, 3.4, -r - 0.5, -r + 1.2), 16, matrix=m)  # the flange the nozzle is bolted to
        for i in range(12):
            b = TAU * i / 12
            fit_.disc(m @ (Vector((2.75 * math.cos(b), 2.75 * math.sin(b), -r - 0.5)) * IN), (0, 0, -1), 0.2 * IN, 0.2 * IN)
        # the igniter beside the nozzle, and a lug to the beam on either hand
        ig = c + radial(a + deg(90)) * 3.9 + Vector((0, 0, -r + 0.6))
        fit_.tube(ig * IN, (ig + Vector((0, 0, -2.6))) * IN, 0.8 * IN, 10)
        for da in (-deg(45), deg(45)):
            e = radial(a + da)
            foot = e * e.dot(c) + Vector((0, 0, zz(mid)))  # the nearest point of that beam's web
            start = c + (foot - c).normalized() * (r - 0.3)
            fit_.tube(start * IN, (foot - (foot - c).normalized() * 0.15) * IN, 0.55 * IN, 8)
            chamfered(fit_, (2.2, 1.0, 2.2), frame(foot * IN, (c - foot).normalized()) @ Matrix.Translation(Vector((0, 0, 0.5)) * IN), 0.1)
    span = 2 * (ADAPTER.r(zz(mid + 7.0)) - 3.4)
    for a, pieces in ((0.0, ((0.0, span),)), (deg(90), ((span / 4 + 0.9, span / 2 - 1.8), (-span / 4 - 0.9, span / 2 - 1.8)))):
        # the cross of beams they hang in: one whole, the other in two halves that meet it
        e = radial(a)
        for at_, length in pieces:
            along = Matrix((e, Vector((-e.y, e.x, 0.0)), Vector((0, 0, 1)))).transposed().to_4x4()
            along.translation = (e * at_ + Vector((0, 0, zz(mid + 1.0)))) * IN
            i_beam(beam, along, length, 11.0, 3.2)
    beam.tube(Vector((0, 0, zz(mid - 5.0))) * IN, Vector((0, 0, zz(mid + 7.0))) * IN, 2.4 * IN, 16)
    say(
        case.build("Retro_Rockets", M["case"], g, sharp_angle=None),
        "Retrograde rockets",
        "Four solid rockets in titanium balls about 13 in across, one in each quarter of a cross of beams. Each gives about "
        "2,500 lbf for five and a half seconds, and they are fired one after another: a ripple, not a blow. At 4 hours 33 "
        "minutes 23 seconds they brought Gemini 3 down. Going up they have a second use: fired together, they pull the ship "
        "off a failing Titan. Their size is SEDR 300's; where they sit in the section is read off its figure.",
    )
    bell.build("Retro_RocketNozzles", M["nozzle"], g, sharp_angle=35)
    fit_.build("Retro_RocketFittings", M["steel"], g, sharp_angle=35)
    say(
        beam.build("Retro_Beams", M["aluminium"], g, sharp_angle=35),
        "Retrograde rocket beams",
        "A cross of aluminium I-beams across the section, each rocket hung in one of its quarters by lugs. The beams and the "
        "rockets on them are SEDR 300's figure; the beams' depth and the flanges' width are estimated from it.",
    )


def build_equipment_section(M, fit: Fit) -> None:
    """The adapter's lower part: what is needed only in orbit. It is cut away just before retrofire."""
    g = group("EquipmentSection")
    skin_obj, _ = adapter_skin(M, g, "Equipment", Z_MATING_TOP, Z_DIVISION)
    ring = MeshBuilder()  # the machined ring at its foot, bolted to the launch vehicle with twenty bolts
    ring.lathe(hoop(BASE_R - 2.4, BASE_R + 0.45, zz(Z_BASE), zz(Z_MATING_TOP)), 144)
    for i in range(20):
        a = TAU * (i + 0.5) / 20
        ring.disc(ADAPTER.p(a, zz((Z_BASE + Z_MATING_TOP) / 2), 0.45), radial(a), 0.55 * IN, 0.35 * IN)
    ring.build("Equipment_MatingRing", M["aluminium"], g, sharp_angle=30)
    noz, cup = MeshBuilder(), MeshBuilder()
    skins = (skin_obj.name,)
    # 1 to 8, which turn the ship: four clusters at the foot, on the diagonals. In each, the chamber nearer the top or
    # the bottom fires along the ship's top-to-bottom line and pitches it; the other fires sideways and yaws it; a pair
    # in opposite corners rolls it (SEDR 300, Figure 8-72 and its table). None fires out along a radius.
    for top in (1, -1):
        for side in (1, -1):
            for k, a in enumerate(OAMS_ATTITUDE):
                theta = side * a if top > 0 else side * (math.pi - a)
                out = Vector((top, 0.0, 0.0)) if k == 0 else Vector((0.0, side, 0.0))
                chamber(noz, cup, skins, ADAPTER, theta, zz(OAMS_ATTITUDE_Z), out, 1.25, 1.9, lip=0.4)
    tidy(skins, ADAPTER)
    cup.build("Equipment_Ports", M["titanium"], g, sharp_angle=35)
    say(
        noz.build("Equipment_AttitudeThrusters", M["nozzle"], g, sharp_angle=35),
        "Attitude thrusters",
        "Chambers 1 to 8: eight of 25 lbf in four clusters round the adapter's foot. In each cluster one fires along the ship's "
        "top-to-bottom line, to pitch it, and the other sideways, to yaw it; fired in opposite corners they roll it. They are "
        "part of the orbit attitude and maneuver system, whose propellants are in this section. Their number, thrust and which "
        "way each fires are documented; where the clusters stand round the foot is read off SEDR 300's sketch.",
    )
    aft = MeshBuilder()
    for a in OAMS_AFT:  # 9 and 10, which push the ship forward: at the foot, top and bottom, firing aft
        c = radial(a) * 49.0 + Vector((0, 0, zz(Z_BASE + 9.0)))
        aft.lathe(
            prof([(1.0, 7.0), (1.6, 4.0), (2.6, 1.5), (3.1, 0.0)][::-1]),
            20,
            matrix=frame(c * IN, Vector((0, 0, -1))) @ Matrix.Translation(Vector((0, 0, -7.0)) * IN),
        )
    say(
        aft.build("Equipment_AftThrusters", M["nozzle"], g, sharp_angle=35),
        "Aft-firing thrusters",
        "Chambers 9 and 10: two of 100 lbf at the adapter's foot, firing backward. When the Titan's engine had stopped and a "
        "charge had cut the ship free, Grissom held these on to push it clear and into orbit. He held them a little long. At "
        "4 hours 21 minutes he used them again, for two and a half minutes, to bring the low point of the orbit down into the "
        "air: had the retrograde rockets then failed, the ship would have come home anyway. SEDR 300's sketch puts one at "
        "the top of the foot and one at the bottom; there they lean outward, and here they fire straight aft.",
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
    shield.lathe(prof([(0.0, zz(Z_DIVISION - 3.0)), (ADAPTER.r(zz(Z_DIVISION - 3.0)) - 2.8, zz(Z_DIVISION - 3.0))]), 72)
    say(
        shield.build("Equipment_BlastShield", M["honeycomb"], g, sharp_angle=None),
        "Blast shield",
        "A honeycomb shield across the top of this section, under the retrograde rockets. If the rockets were ever fired to pull "
        "the ship off a failing launch vehicle, this section and the Titan's oxidiser tank would be straight below them.",
    )
    tanks, frames_, gear, batt = (MeshBuilder() for _ in range(4))
    # the OAMS's own: a fuel tank, an oxidiser tank and the helium that pushes them, each a ball (SEDR 300, section
    # VIII: 21.13, 21.12 and 16.20 in across). Spacecraft 3 has one of each
    for (right, top, station), across in zip(OAMS_TANKS, (21.13, 21.12, 16.20)):
        sphere(tanks, P(right, top, station), across / 2 * IN)
        # (a boss at each pole, where the lines come in)
        for s in (-1, 1):
            tanks.tube(P(right, top, station + s * (across / 2 - 0.3)), P(right, top, station + s * (across / 2 + 1.1)), 1.1 * IN, 12)
    say(
        tanks.build("Equipment_OamsTanks", M["tank"], g, sharp_angle=None),
        "OAMS propellant tanks",
        "The orbit attitude and maneuver system: a fuel tank 21.13 in across, an oxidiser tank 21.12 in across and a ball "
        "of helium 16.20 in across to push them, feeding sixteen thrust chambers round the adapter. About 300 lb of "
        "propellant on this flight. With it Gemini 3 changed its orbit three times. The sizes are SEDR 300's; the sketch of "
        "the system shows the two propellant tanks together on one side and the helium near the middle, and exactly where "
        "they are here is estimated.",
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
        chamfered(batt, (12.0, 7.4, 10.0), Matrix.Translation(P(16.0 + (i - (n - 1) / 2) * 8.6, -26.0, 40.0)), 0.3)
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
        gear.tube(P(-6.0 - 9.0 * i, -30.0, 34.0), P(-6.0 - 9.0 * i, -30.0, 46.0), 3.6 * IN, 16)
    for right, top, size in (
        (-34.0, -4.0, (9.0, 12.0, 14.0)),
        (36.0, -18.0, (9.0, 14.0, 12.0)),
        (-26.0, 14.0, (12.0, 9.0, 10.0)),
        (-16.0, 34.0, (12.0, 8.0, 10.0)),
    ):
        chamfered(gear, size, Matrix.Translation(P(right, top, 40.0)), 0.25)
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
    build_crew_station(M, fit, font)
    build_heat_shield(M)
    build_retro_section(M, fit)
    build_equipment_section(M, fit)
    return f"spacecraft {LENGTH * IN:.3f} m long, {2 * BASE_R * IN:.3f} m across its base"
