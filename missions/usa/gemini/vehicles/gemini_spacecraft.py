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
from srlib import IN, TAU, MeshBuilder, Surf, bore, deg, frame, group, interior, lettering, material, prof

# ------------------------------------------------------------------ stations and sizes (in)

Z0 = 103.44  # the re-entry module / adapter mating line: the model's origin
Z_BASE = 13.44  # the spacecraft / launch vehicle mating line
Z_EQUIP_TOP = 66.74  # the head of the equipment section's skin
Z_RETRO_FOOT = 70.0  # the foot of the retrograde section's: the ring between the two is where the adapter is cut
Z_SHIELD_APEX = 94.4  # the heat shield's crown, inside the retrograde section
Z_SILL = 108.0  # the large pressure bulkhead, and the hatches' aft sills
Z_DOORS = 132.5  # where the equipment bay doors divide
Z_WINDOW = 149.15  # the middle of the windows
Z_SMALL = 160.2  # the small pressure bulkhead, and the hatches' forward sills
Z_RCS = 173.97  # cabin / re-entry control system section
Z_RR = 191.97  # re-entry control system section / rendezvous and recovery section
Z_RR_TAPER = 201.47  # where the rendezvous and recovery section begins to taper
Z_RR_TOP = 233.97  # its forward face
Z_NOSE = 239.28  # the tip of the nose fairing
LENGTH = Z_NOSE - Z_BASE  # 225.84: the launch configuration

BASE_R = 60.0  # 120.00 in across the adapter's base
ADAPTER_TOP_R = 44.15  # 88.30 in across its head
SHIELD_R = 45.0  # 90.00 in across the heat shield
SHIELD_SPHERE = 144.0  # the heat shield's spherical radius
NECK_R = 19.33  # 38.66 in across the re-entry control system section
CABIN_A = deg(20)
ADAPTER_A = math.atan((BASE_R - ADAPTER_TOP_R) / (Z0 - Z_BASE))  # 10 degrees
RR_A = deg(7)

HATCH = (deg(5), deg(62))  # a hatch round the cabin, from the beam between the two out to its hinge: read off photographs
WINDOW_AT = deg(33)  # the middle of a window from the top
WINDOW = (13.0, 10.0, 6.5)  # a window's opening: its length along the cone, its width aft and its width forward
WALL = 2.4  # outer mould line to inner, through a hatch
BEAD = (1.4, 0.18)  # the cabin's shingles: from one bead to the next round the cone, and how proud a bead stands
RETRO = (6.5, 19.5, 84.0)  # a retrograde rocket: its case's radius, how far its axis is from the ship's, its middle's station
SEAT_CANT = (deg(12), deg(8))  # the seats: outboard, and forward


@dataclass
class Fit:
    """What one ship had that another had not: a flight's script fills this in, and its spacecraft.md says why."""

    radar: bool = False  # the rendezvous radar in the rendezvous and recovery section's face
    lateral_thrusters: bool = True  # whether the four OAMS chambers that translate sideways, up and down were real ones
    adapter_batteries: int = 3  # silver-zinc batteries in the adapter's module (0: a fuel cell module instead)
    water_tanks: int = 1  # drinking water tanks in the adapter
    experiments: tuple[str, ...] = ()  # of: "sea-urchin", "blood", "reentry-communications"
    names: tuple[str, str] = ("", "")  # the command pilot and the pilot, for what their seats say


def zz(station: float) -> float:
    """A station as a height in the model."""
    return station - Z0


CABIN = Surf(SHIELD_R, 0.0, CABIN_A)
ADAPTER = Surf(BASE_R, zz(Z_BASE), ADAPTER_A)
NECK = Surf(NECK_R, zz(Z_RCS), 0.0)
NOSE = Surf(NECK_R, zz(Z_RR_TAPER), RR_A)

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "NoseFairing_Shell",
    "RR_Shingles",
    "RR_Fasteners",
    "RR_Structure",
    "RCS_Shingles",
    "RCS_Fasteners",
    "RCS_Structure",
    "RCS_Liner",
    "Cabin_Shingles",
    "Cabin_Plain",
    "Cabin_Fasteners",
    "Cabin_Structure",
    "Cabin_Lettering",
    "Cabin_Flag",
    "Cabin_StrapFairings",
    "Hatches_Skin",
    "Hatches_Sills",
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


def radial(a: float) -> Vector:
    return Vector((math.cos(a), math.sin(a), 0.0))


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


def beaded(panels: MeshBuilder, bolts: MeshBuilder, surf: Surf, z0: float, z1: float, t0: float, t1: float, count: int, ranks: int = 2) -> None:
    """One ring of the cabin's shingles from angle t0 round to t1, `count` of them: each a flat fastened margin round
    `ranks` ranks of short beads, pressed in to stiffen it, that run along the cone."""
    arc = (t1 - t0) / count
    gap = 0.05
    rmid = surf.r((z0 + z1) / 2)
    beads = max(3, round(arc * rmid / BEAD[0]) - 1) if srlib.DETAIL >= 0.5 else 0
    per = 4 if srlib.DETAIL >= 1.0 else 2
    margin = 0.9 / (arc * rmid)
    if beads:
        ss = [0.0, margin * 0.55] + [margin + (1 - 2 * margin) * i / (beads * per) for i in range(beads * per + 1)] + [1 - margin * 0.55, 1.0]
    else:
        ss = [i / 4 for i in range(5)]
    span = (z1 - z0 - 2 * 1.3) / ranks
    rows = [(z0 + gap, 0.0), (z0 + 0.9, 0.0)]
    for k in range(ranks):
        a = z0 + 1.3 + span * k
        rows += [(a + 0.25, 0.0), (a + 0.8, 1.0), (a + span - 0.8, 1.0), (a + span - 0.25, 0.0)]
    rows += [(z1 - 0.9, 0.0), (z1 - gap, 0.0)]

    def height(s: float) -> float:
        if not beads or s <= margin or s >= 1 - margin:
            return 0.0
        return BEAD[1] * math.sin(math.pi * (((s - margin) / (1 - 2 * margin) * beads) % 1.0)) ** 2

    for k in range(count):
        a0 = t0 + k * arc
        theta = lambda s, z, a0=a0: a0 + gap / surf.r(z) + (arc - 2 * gap / surf.r(z)) * s  # noqa: E731
        panels.grid(
            lambda s, j, theta=theta: surf.p(theta(s, rows[j][0]), rows[j][0], height(s) * rows[j][1]),
            ss,
            range(len(rows)),
            uv=lambda s, j, a0=a0: ((a0 + arc * s) * rmid * IN, rows[j][0] * IN),
        )
        n = max(2, int((z1 - z0) / 2.2))
        for i in range(n):  # up the seam on this shingle's leading edge; its neighbour supplies the other
            z = z0 + 0.9 + (z1 - z0 - 1.8) * i / (n - 1)
            bolts.disc(surf.p(a0, z), surf.n(a0), 0.2 * IN, 0.07 * IN)
        across = max(3, round(arc * rmid / 2.4))
        for z in (z0 + 0.45, z1 - 0.45):
            for i in range(1, across):
                t = theta(i / across, z)
                bolts.disc(surf.p(t, z), surf.n(t), 0.2 * IN, 0.07 * IN)


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


class Opening:
    """A window's opening in a hatch: a rounded shape laid on the cone, wider aft than forward."""

    def __init__(self, theta: float) -> None:
        self.t, self.z = theta, zz(Z_WINDOW)

    def width(self, x: float) -> float:
        length, aft, fwd = WINDOW
        return aft + (fwd - aft) * (x / length + 0.5)

    def flat(self, theta: float, z: float) -> tuple[float, float]:
        """A point of the cone as inches along it and across it from the opening's middle."""
        return (z - self.z) / math.cos(CABIN_A), (theta - self.t) * CABIN.r(z)

    def inside(self, theta: float, z: float, grow: float = 0.0) -> bool:
        x, y = self.flat(theta, z)
        half = WINDOW[0] / 2 + grow
        if abs(x) >= half:
            return False
        return abs(x / half) ** 3.2 + abs(y / (self.width(x) / 2 + grow)) ** 3.2 < 1.0

    def edge(self, n: int, grow: float = 0.0) -> list[tuple[float, float]]:
        """The opening's edge, grown by `grow` inches, as (angle, height) points round it."""
        out = []
        half = WINDOW[0] / 2 + grow
        for i in range(n):
            a = TAU * i / n
            c, s = math.cos(a), math.sin(a)
            x = half * math.copysign(abs(c) ** (2 / 3.2), c)
            y = (self.width(max(-WINDOW[0] / 2, min(WINDOW[0] / 2, x))) / 2 + grow) * math.copysign(abs(s) ** (2 / 3.2), s)
            z = self.z + x * math.cos(CABIN_A)
            out.append((self.t + y / CABIN.r(z), z))
        return out


def patch(mb: MeshBuilder, surf: Surf, t0: float, t1: float, z0: float, z1: float, off: float, cell: float, hole=None, flip: bool = False) -> None:
    """A piece of a skin from angle t0 to t1 and height z0 to z1, `off` inches off the surface, cut into cells about
    `cell` inches across; where `hole(theta, z)` is true there is none."""
    nz = max(2, round((z1 - z0) / cell))
    nt = max(2, round(abs(t1 - t0) * surf.r((z0 + z1) / 2) / cell))
    ts = [t0 + (t1 - t0) * i / nt for i in range(nt + 1)]
    zs = [z0 + (z1 - z0) * j / nz for j in range(nz + 1)]
    verts = [tuple(surf.p(t, z, off)) for z in zs for t in ts]
    faces = []
    for j in range(nz):
        for i in range(nt):
            if hole and hole((ts[i] + ts[i + 1]) / 2, (zs[j] + zs[j + 1]) / 2):
                continue
            a, b, c, d = j * (nt + 1) + i, j * (nt + 1) + i + 1, (j + 1) * (nt + 1) + i + 1, (j + 1) * (nt + 1) + i
            faces.append((a, d, c, b) if flip else (a, b, c, d))
    mb.add(verts, faces)


def holes() -> bool:
    """Whether ports are cut through the skins at this level of detail: below it a skin is too coarse to cut cleanly."""
    return srlib.DETAIL >= 0.5


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


def build_reentry_control(M) -> None:
    """The short cylinder between the cabin and the forward section: sixteen thrust chambers of 25 lbf in two rings of
    eight, and their tanks. It steers the ship from retrofire to the parachute."""
    g = group("ReentryControl")
    shingles, bolts, inner, noz, cup = (MeshBuilder() for _ in range(5))
    z0, z1 = zz(Z_RCS), zz(Z_RR)
    plates(shingles, bolts, NECK, z0, z1, 0.0, TAU, 8)
    liner = MeshBuilder()  # its inner cylinder: seen from inside only, so the chambers' ports are not shut by it
    liner.lathe(prof([(NECK_R - 0.8, z0), (NECK_R - 0.8, z1)]), 64, flip=True)
    liner.build("RCS_Liner", M["liner"], g, sharp_angle=None)
    inner.lathe(prof([(NECK_R - 0.8, z1 - 0.05), (0.0, z1 - 0.05)]), 64)  # its forward face, the main parachute's adapter on it
    skin = shingles.build("RCS_Shingles", M["beryllium"], g, sharp_angle=30)
    bolts.build("RCS_Fasteners", M["bolt"], g)
    inner.build("RCS_Structure", M["titanium"], g, sharp_angle=30)
    bpy.context.view_layer.update()
    # the sixteen chambers: one of each ring at each of eight places round the section (the Gemini IV report's Figure
    # 3-12), drawn as a pair side by side, the pairs at two stations by turns (the photograph of this ship)
    for k in range(8):
        mid = TAU * (k + 0.5) / 8
        z = zz(Z_RCS + (6.0 if k % 2 == 0 else 12.0))
        for da in (-deg(8), deg(8)):
            a = mid + da
            at = NECK.p(a, z)
            port((skin.name,), frame(at, NECK.n(a)), 1.75 * IN, 2.0 * IN)
            thruster(noz, cup, at, NECK.n(a), 1.25, 1.75)
    say(
        noz.build("RCS_ThrustChambers", M["nozzle"], g, sharp_angle=35),
        "Re-entry control thrusters",
        "Sixteen chambers, two complete rings of eight, each ring with its own tanks: either can bring the ship home. They "
        "burn the same two liquids as the thrusters in the adapter, which ignite on meeting. That there are sixteen, at eight "
        "places round the section, is documented; their 25 lbf is general knowledge of the type, and how each pair lies is read "
        "off one photograph.",
    )
    cup.build("RCS_Ports", M["titanium"], g, sharp_angle=35)
    if interior():
        tanks = MeshBuilder()
        for k in range(6):
            a = TAU * (k + 0.5) / 6
            c = radial(a) * 11.0
            tanks.tube((c + Vector((0, 0, z0 + 2.0))) * IN, (c + Vector((0, 0, z1 - 3.0))) * IN, 3.2 * IN, 16)
        say(
            tanks.build("RCS_Tanks", M["tank"], g, sharp_angle=35),
            "Re-entry control tanks",
            "Each of the two sets has a fuel tank, an oxidiser tank and a bottle of nitrogen to push them. Six in all, standing "
            "round the section. Their sizes and places here are estimated.",
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


def build_hatches(M, fit: Fit) -> list[dict]:
    """The two hatches, each hinged along its outboard edge, each with a window. Returns where each window is."""
    g = group("Hatches")
    skin, bolts, structure, frames, hinges, sills = (MeshBuilder() for _ in range(6))
    z0, z1 = zz(Z_SILL), zz(Z_SMALL)
    windows = []
    whole = interior()
    cell = 1.0 if srlib.DETAIL >= 1.0 else 2.2
    for side, name in ((-1, "Left"), (1, "Right")):
        t0, t1 = sorted((side * HATCH[0], side * HATCH[1]))
        opening = Opening(side * WINDOW_AT)
        hole = (lambda t, z, opening=opening: opening.inside(t, z)) if whole else None
        patch(skin, CABIN, t0 + 0.05 / 30, t1 - 0.05 / 30, z0 + 0.05, z1 - 0.05, 0.0, cell, hole)
        patch(
            structure,
            CABIN,
            t0,
            t1,
            z0,
            z1,
            -WALL,
            cell * 1.5,
            (lambda t, z, opening=opening: opening.inside(t, z, 0.3)) if whole else None,
            flip=True,
        )
        # the frame round its edge, standing a little proud, and a row of screws inside it
        edge = 0.9
        da = lambda z: edge / CABIN.r(z)  # noqa: E731
        for ta, tb in ((t0, t0 + da(z0)), (t1 - da(z0), t1)):
            patch(sills, CABIN, ta + 0.002, tb - 0.002, z0 + 0.1, z1 - 0.1, 0.16, cell)
        for za, zb in ((z0 + 0.1, z0 + edge), (z1 - edge, z1 - 0.1)):
            patch(sills, CABIN, t0 + da(z0) + 0.004, t1 - da(z0) - 0.004, za, zb, 0.16, cell)
        for k in (1, 2, 3):  # the seams between the plates that skin it
            z = z0 + (z1 - z0) * k / 4
            if abs(z - opening.z) < WINDOW[0] / 2 + 2.5:
                continue
            n = max(6, round((t1 - t0) * CABIN.r(z) / 2.2))
            for i in range(1, n):
                t = t0 + (t1 - t0) * i / n
                for dz in (-0.45, 0.45):
                    bolts.disc(CABIN.p(t, z + dz), CABIN.n(t), 0.2 * IN, 0.07 * IN)
        for t in (t0, t1):
            n = 24
            for i in range(n):
                z = z0 + 1.0 + (z1 - z0 - 2.0) * i / (n - 1)
                bolts.disc(CABIN.p(t + (1.6 / CABIN.r(z)) * (1 if t == t0 else -1), z), CABIN.n(t), 0.2 * IN, 0.07 * IN)
        for z in (z0 + 1.6, z1 - 1.6):
            n = max(6, round((t1 - t0) * CABIN.r(z) / 2.2))
            for i in range(1, n):
                t = t0 + (t1 - t0) * i / n
                bolts.disc(CABIN.p(t, z), CABIN.n(t), 0.2 * IN, 0.07 * IN)
        # the window: a frame standing just proud of the skin, the well under it, and a pane at each end of the well
        edge_n = 40 if srlib.DETAIL >= 1.0 else 20
        rows = (
            ((1.5, -0.06), (1.2, 0.22), (-0.45, 0.22), (-0.45, -WALL - 0.1)) if whole else ((1.5, -0.06), (1.2, 0.22), (-0.45, 0.22), (-0.45, 0.02))
        )
        rings = [opening.edge(edge_n, grow) for grow, _ in rows]
        frames.grid(
            lambda i, j, rings=rings, rows=rows: CABIN.p(rings[j][i][0], rings[j][i][1], rows[j][1]),
            range(edge_n),
            range(len(rows)),
            closed_u=True,
        )
        centre = (opening.t, opening.z)
        if not whole:  # at a distance nothing is behind it: a dark pane on the skin, under the frame
            pane = MeshBuilder()
            lo, hi = opening.z - WINDOW[0] / 2 - 1.5, opening.z + WINDOW[0] / 2 + 1.5
            wide = (WINDOW[1] / 2 + 1.5) / CABIN.r(lo)
            patch(pane, CABIN, opening.t - wide, opening.t + wide, lo, hi, 0.08, 0.7, lambda t, z, opening=opening: not opening.inside(t, z, 0.6))
            pane.build(f"Hatch{name}_WindowOuter", M["void"], g, sharp_angle=None)
        for level, mesh, mat in ((-0.3, "Outer", "glass"), (-WALL + 0.25, "Inner", "glass")) if whole else ():
            pane = MeshBuilder()
            rim = opening.edge(edge_n, -0.4)
            pts = [tuple(CABIN.p(*centre, level))] + [tuple(CABIN.p(t, z, level)) for t, z in rim]
            tris = [(0, 1 + (i + 1) % edge_n, 1 + i) if side * math.cos(CABIN_A) > 0 else (0, 1 + i, 1 + (i + 1) % edge_n) for i in range(edge_n)]
            pane.add(pts, tris)
            pane.build(f"Hatch{name}_Window{mesh}", M[mat], g, sharp_angle=None)
        windows.append({"side": side, "centre": CABIN.p(*centre, -WALL), "normal": CABIN.n(opening.t)})
        # three hinges along the outboard edge, and the socket a handle goes into from outside
        th = side * HATCH[1]
        for z in (z0 + 7.0, (z0 + z1) / 2, z1 - 7.0):
            a = CABIN.p(th, z - 2.2, 0.35)
            b = CABIN.p(th, z + 2.2, 0.35)
            hinges.tube(a, b, 0.6 * IN, 10)
        sock = CABIN.p(side * (HATCH[0] + deg(9)), z0 + 9.0, 0.0)
        hinges.lathe(hoop(0.9, 1.7, -0.3, 0.3), 16, matrix=frame(sock, CABIN.n(side * (HATCH[0] + deg(9)))))
    skin.build("Hatches_Skin", M["shingle"], g, sharp_angle=30)
    sills.build("Hatches_Sills", M["shingle"], g, sharp_angle=30)
    bolts.build("Hatches_Fasteners", M["bolt"], g)
    structure.build("Hatches_Structure", M["titanium"], g, sharp_angle=30)
    frames.build("Hatches_WindowFrames", M["titanium"], g, sharp_angle=35)
    hinges.build("Hatches_Hinges", M["steel"], g, sharp_angle=35)
    if whole:
        build_experiments_on_hatches(M, g, fit)
    return windows


def build_experiments_on_hatches(M, g, fit: Fit) -> None:
    """What rode on the inside of the hatches on a flight that carried it."""
    if "sea-urchin" in fit.experiments:
        mb = MeshBuilder()
        t = -(HATCH[0] + deg(16))
        a = CABIN.p(t, zz(126.0), -WALL - 2.0)
        b = CABIN.p(t, zz(126.0 + 6.75 * math.cos(CABIN_A)), -WALL - 2.0)
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
        t = HATCH[0] + deg(16)
        mb.box((3.7 * IN, 3.8 * IN, 1.3 * IN), frame(CABIN.p(t, zz(128.0), -WALL - 1.1), -CABIN.n(t)))
        mb.tube(CABIN.p(t, zz(130.3), -WALL - 1.1), CABIN.p(t, zz(131.5), -WALL - 1.1), 0.45 * IN, 10)
        for dz in (-1.2, 1.2):  # its two feet on the hatch
            mb.tube(CABIN.p(t, zz(128.0 + dz), -WALL + 0.2), CABIN.p(t, zz(128.0 + dz), -WALL - 0.6), 0.4 * IN, 8)
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
    panels, plain, bolts, under = (MeshBuilder() for _ in range(4))
    aft, fwd = zz(Z_SILL), zz(Z_SMALL)
    # the ring at the heat shield's rim, then four rings beside the hatches, then one forward of them
    plates(plain, bolts, CABIN, 1.5, aft, 0.0, TAU, 16)
    rings = [aft + (fwd - aft) * i / 4 for i in range(5)]
    for i, count in enumerate((12, 12, 10, 10)):
        beaded(panels, bolts, CABIN, rings[i], rings[i + 1], HATCH[1], TAU - HATCH[1], count)
        plates(plain, bolts, CABIN, rings[i], rings[i + 1], -HATCH[0], HATCH[0], 1)  # the beam between the hatches
    beaded(panels, bolts, CABIN, fwd, zz(Z_RCS) - 0.4, deg(15), TAU + deg(15), 10)
    under.lathe(prof([(CABIN.r(0.0) - 1.6, 0.0), (CABIN.r(aft) - 1.6, aft)]), 96, flip=True)
    under.lathe(prof([(CABIN.r(aft) - 1.6, aft), (CABIN.r(fwd) - 1.6, fwd)]), 96, arc=(HATCH[1], TAU - HATCH[1]), flip=True)
    under.lathe(prof([(CABIN.r(fwd) - 1.6, fwd), (CABIN.r(zz(Z_RCS)) - 1.6, zz(Z_RCS))]), 96, flip=True)
    under.lathe(hoop(SHIELD_R - 1.2, SHIELD_R + 0.25, 0.1, 1.5), 144)  # the ring the heat shield is bolted to
    under.lathe(hoop(NECK_R - 2.4, NECK_R + 0.2, zz(Z_RCS) - 0.4, zz(Z_RCS)), 96)
    panels.build("Cabin_Shingles", M["shingle"], g, sharp_angle=None)
    plain.build("Cabin_Plain", M["shingle"], g, sharp_angle=30)
    bolts.build("Cabin_Fasteners", M["bolt"], g)
    under.build("Cabin_Structure", M["titanium"], g, sharp_angle=30)
    # paint: UNITED STATES in two lines and the flag under it, on each side below the hatch's hinge
    paint, flags = MeshBuilder(), MeshBuilder()
    fw, fh = 15.0, 15.0 / 1.9
    for side in (-1, 1):
        t = side * deg(92)
        for body, station in (("UNITED", 137.5), ("STATES", 131.5)):
            lettering(paint, CABIN, body, 26.0, t, zz(station), False, font)
        nx, ny = 10, 5
        flags.grid(
            lambda i, j, t=t: CABIN.wrap(t, zz(118.0), (i / nx - 0.5) * fw, (j / ny - 0.5) * fh, 0.3),
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
    for a in (deg(180), deg(60), deg(-60)):
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
        port = MeshBuilder()
        t = deg(128)
        port.lathe(prof([(1.3, 0.0), (1.3, 0.3), (0.5, 0.3), (0.5, 0.18), (0.0, 0.18)]), 16, matrix=frame(CABIN.p(t, zz(118.0)), CABIN.n(t)))
        say(
            port.build("Experiment_WaterNozzle", M["steel"], g, sharp_angle=35),
            "Re-entry communications experiment",
            "Coming home, a ship is wrapped in air so hot that it stops radio: for some minutes nothing gets in or out. Here, on "
            "the inside of the right landing gear door, was 85 lb of equipment to try a cure: a tank of water and a timer that "
            "squirted it into the hot air in short pulses for about two and a half minutes. With the water on, stations on the "
            "ground did hear the ship. That it was on this door is the press kit's; the nozzle's place on it is estimated.",
        )
        if interior():
            tank = MeshBuilder()
            c = CABIN.p(t, zz(140.0), -6.5)
            tank.tube(c - Vector((0, 0, 7.0)) * IN, c + Vector((0, 0, 7.0)) * IN, 3.8 * IN, 16)
            tank.build("Experiment_WaterTank", M["tank"], g, sharp_angle=35)


def build_scanner_fairing(M) -> None:
    """The horizon scanners look out of the cabin's left side, just aft of the neck; a fairing covers them on the way up."""
    g = group("ScannerFairing")
    mb = MeshBuilder()
    t = deg(-90)
    f = frame(CABIN.p(t, zz(165.0), 0.0), CABIN.n(t))
    us = [math.pi * k / 10 for k in range(11)]
    vs = [math.pi * k / 12 for k in range(13)]
    mb.grid(
        lambda u, v: Vector((3.6 * IN * math.sin(v) * math.cos(u), -7.5 * IN * math.cos(v), 2.6 * IN * math.sin(v) * math.sin(u) - 0.3 * IN)),
        us,
        vs,
        matrix=f,
        flip=True,
    )
    mb.build("ScannerFairing_Shell", M["fairing"], g, sharp_angle=35)


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
    za, zb = Z_SILL, Z_SMALL

    def section(station: float, n: int = 16) -> list[Vector]:
        """The vessel's outline at a station: the roof's arc under the hatches, then down one side, across the floor and up."""
        k = (station - za) / (zb - za)
        r = CABIN.r(zz(station)) - WALL
        arc = [P(r * math.sin(a), r * math.cos(a), station) for a in (-HATCH[1] + 2 * HATCH[1] * i / n for i in range(n + 1))]
        half, floor = 26.0 - 13.0 * k, -17.5 + 3.0 * k
        return [*arc, P(half, floor, station), P(-half, floor, station)]

    a, b = section(za), section(zb)
    n = len(a)
    rows = 8
    for i in range(n):  # the sides and the floor (the roof is the hatches and the beam between them)
        j = (i + 1) % n
        if j <= 16 and i < 16:
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
    v.grid(lambda t, s: P(r_of(s) * math.sin(t), r_of(s) * math.cos(t), s), [-HATCH[0], 0.0, HATCH[0]], [za + (zb - za) * i / 8 for i in range(9)])
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
