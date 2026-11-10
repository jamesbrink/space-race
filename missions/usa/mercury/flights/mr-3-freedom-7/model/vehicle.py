"""Mercury spacecraft No. 7, "Freedom 7", as flown on Mercury-Redstone 3 (5 May 1961).

Run headless:
    pnpm model:mr-3            (or: blender -b -P <this file> -- --out <glb> [--preview DIR])

This is the flight's vehicle: spacecraft and launch vehicle. Its pad and its pilot are
pad.py and crew.py beside it.

Every dimension below is in inches (the units of the McDonnell drawings) and converted
once, at the point of use, with IN. Station 0 is the heat shield's maximum-diameter plane;
+Z is toward the nose. See ../spacecraft.md for what each number rests on.

Top-level nodes (the viewer's part list keys on these names):
    HeatShield  Retropack  Afterbody  Hatch  CrewCabin  RecoveryCompartment
    AntennaCanister  EscapeTower
and, from ../../../vehicles/redstone_mrlv.py, the launch vehicle:
    RedstoneAdapter  RedstoneAftUnit  RedstoneCenterUnit  RedstoneTailUnit  RedstoneEngine
"""

from __future__ import annotations

import math
import os
import sys

import bpy
import numpy as np
from mathutils import Matrix, Vector

_root = os.path.dirname(os.path.abspath(__file__))
while not os.path.isdir(os.path.join(_root, "tools", "blender")):
    _root = os.path.dirname(_root)
sys.path.insert(0, os.path.join(_root, "tools", "blender"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "vehicles"))
sys.path.insert(0, os.path.join(_root, "missions", "usa", "mercury", "crew"))
import mark_iv_suit  # noqa: E402
import redstone_mrlv  # noqa: E402
from srlib import (  # noqa: E402
    IN,
    TAU,
    MeshBuilder,
    Surf,
    arc_profile,
    bore,
    decal,
    deg,
    frame,
    group,
    interior,
    lathe_obj,
    lettering,
    load_font,
    mark_shells,
    material,
    prof,
    run,
)

# ------------------------------------------------------------------ dimensions (in)

SHIELD_R = 37.25  # 74.5 in maximum diameter
SHIELD_SPHERE_R = 80.0  # heat shield radius of curvature
SHIELD_EDGE = 2.5  # height of the shield's cylindrical edge
CONE_HALF_ANGLE = math.radians(20.0)
NECK_R = 16.0  # 32 in recovery compartment
CONE_H = (SHIELD_R - NECK_R) / math.tan(CONE_HALF_ANGLE)  # 58.38
# Stations along the axis are measured from the plane of maximum diameter, McDonnell's Z104.50
# (SEDR 104, Figure 1-3): subtract 104.50 from a Z station to get a height here.
Z_CYL = CONE_H
Z_CAN = 81.14  # top of the recovery compartment (CR-649 Figure 1 and Hammack & Heberlig Figure 17)
Z_CAN_TOP = 104.57  # Z209.07
CYL_H = Z_CAN - Z_CYL  # 22.76
CAN_H = Z_CAN_TOP - Z_CAN
CAN_R0, CAN_R1 = 12.0, 10.0  # 24 in tapering to 20 in (CR-649)
SHIELD_CAP = SHIELD_SPHERE_R - math.sqrt(SHIELD_SPHERE_R**2 - SHIELD_R**2)  # 9.20
Z_APEX = -(SHIELD_EDGE + SHIELD_CAP)
Z_SPHERE_C = Z_APEX + SHIELD_SPHERE_R
Z_RETRO_BOTTOM = -27.0  # Z77.50
TRUSS_BAYS = (106.08, 137.03, 167.98, 198.93)  # Z210.58, Z241.53, Z272.48, Z303.43
Z_TRUSS_TOP = TRUSS_BAYS[-1]
Z_MOTOR = 202.0  # bottom of the motor case, above its nozzle manifold: read off the figure
Z_MOTOR_TOP = 249.55  # Z354.05
Z_MOTOR_CAP = 253.55  # Z358.05: the domed cap the spike stands on
Z_BOOSTER_BASE = -redstone_mrlv.LENGTH  # the Redstone's fin trailing edges
Z_TOP = 284.55  # Z389.05, tip of the aerodynamic spike: 311.55 in (7.913 m) above the retro nozzles

# Meshes that enclose something: the viewer's cutaway slices these and leaves the rest whole.
SHELLS = (
    "HeatShield_HeatSink",
    "HeatShield_Fasteners",
    "Retropack_Housing",
    "Afterbody_Shingles",
    "Afterbody_Fasteners",
    "Afterbody_Structure",
    "Afterbody_AttachRing",
    "Afterbody_Fittings",
    "Afterbody_ThrusterThroats",
    "Afterbody_Glass",
    "Afterbody_WindowWells",
    "Afterbody_Lettering",
    "Afterbody_Flags",
    "Hatch_Shingles",
    "Hatch_Latches",
    "Hatch_Structure",
    "CrewCabin_PressureVessel",
    "Recovery_Shingles",
    "Recovery_Fasteners",
    "Recovery_Structure",
    "Recovery_ThrusterPorts",
    "Recovery_ThrusterThroats",
    "Recovery_ParachuteCanisters",
    "Antenna_Housing",
    "Antenna_DielectricWindow",
    "Antenna_Fittings",
    "Tower_EscapeMotor",
    "Tower_MotorBands",
)

PILOT_HIP = (5.0, 9.4)  # the seated pilot's hip joints, (y, z) in the capsule: the only place he fits (mark_iv_suit.seated_fits)
PORTHOLES = ((math.radians(52), 37.0), (math.radians(-128), 31.0))  # angle round the cone, station: two 10 in ports
PANELS = 24  # shingles around the cone
PANEL_ARC = TAU / PANELS
PANEL_PHASE = -1.5 * PANEL_ARC  # puts three panels symmetric about +X: the hatch
HATCH_PANELS = (0, 1, 2)
ROWS = ((2.0, 20.0, 8), (20.0, 44.0, 6), (44.0, CONE_H - 0.4, 4))  # z0, z1, beads per shingle
HATCH_ROW = 1
BEAD = 0.14  # corrugation height
WALL = 1.2  # outer shingle to pressure vessel


# ------------------------------------------------------------------------ surfaces


CONE = Surf(SHIELD_R, 0.0, CONE_HALF_ANGLE)
CYL = Surf(NECK_R, Z_CYL, 0.0)
VESSEL = Surf(SHIELD_R - WALL / math.cos(CONE_HALF_ANGLE), 0.0, CONE_HALF_ANGLE)


# ----------------------------------------------------------------------- materials


def flag_image() -> bpy.types.Image:
    """The 50-star flag (in use since 4 July 1960), 1.9:1."""
    w, h = 570, 300
    px = np.zeros((h, w, 4), dtype=np.float32)
    px[..., 3] = 1.0
    red, white, blue = (0.70, 0.13, 0.20), (0.96, 0.96, 0.94), (0.20, 0.21, 0.42)
    stripe = h / 13
    for i in range(13):  # image row 0 is the bottom; the bottom stripe is red
        px[int(round(i * stripe)) : int(round((i + 1) * stripe)), :, :3] = red if i % 2 == 0 else white
    cw, ch = int(w * 0.4), int(round(7 * stripe))
    px[h - ch :, :cw, :3] = blue
    yy, xx = np.mgrid[0:h, 0:w]
    for row in range(9):
        count = 6 if row % 2 == 0 else 5
        cy = h - ch * (row + 1) / 10
        for col in range(count):
            cx = cw * (2 * col + (1 if row % 2 == 0 else 2)) / 12
            px[(xx - cx) ** 2 + (yy - cy) ** 2 < 5.2**2, :3] = white
    img = bpy.data.images.new("flag-50-star", w, h, alpha=False)
    img.pixels.foreach_set(px.ravel())
    img.file_format = "PNG"
    img.pack()
    return img


def make_materials() -> dict[str, bpy.types.Material]:
    m = material
    return {
        # Rene 41 shingles, oxidised and painted blue-black for emissivity
        "shingle": m("shingle-rene41", (0.035, 0.038, 0.046), 0.85, 0.42),
        "beryllium_shingle": m("shingle-beryllium", (0.05, 0.052, 0.058), 0.8, 0.5),
        "underlay": m("structure-dark", (0.02, 0.02, 0.022), 0.6, 0.7, double_sided=True),
        "bolt": m("fastener", (0.22, 0.215, 0.21), 1.0, 0.62),
        "beryllium": m("heatsink-beryllium", (0.47, 0.46, 0.44), 1.0, 0.38),
        "titanium": m("titanium", (0.46, 0.44, 0.42), 1.0, 0.5, double_sided=True),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "strap": m("strap-steel", (0.62, 0.61, 0.58), 1.0, 0.3, double_sided=True),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "tower": m("tower-red", (0.40, 0.022, 0.012), 0.0, 0.64),
        "dielectric": m("dielectric-window", (0.62, 0.59, 0.50), 0.0, 0.6),
        # the viewer swaps anything named glass for a transparent, reflective material; what is
        # seen through it is the unlit cabin, stood in for by window-void
        "glass": m("glass", (0.6, 0.75, 0.8), 0.0, 0.03),
        "void": m("window-void", (0.004, 0.004, 0.005), 0.0, 0.95),
        "paint_white": m("paint-white", (0.9, 0.9, 0.88), 0.0, 0.6, double_sided=True),
        "flag": m("flag", (1, 1, 1), 0.0, 0.6, double_sided=True, image=flag_image()),
        "couch": m("couch-fibreglass", (0.55, 0.50, 0.38), 0.0, 0.7, double_sided=True),
        "panel": m("panel-grey", (0.20, 0.22, 0.23), 0.2, 0.6, double_sided=True),
        "gauge": m("gauge-face", (0.02, 0.02, 0.02), 0.0, 0.25, emission=(0.55, 1.0, 0.65), emission_strength=0.35),
        "lens": m("lens", (0.01, 0.01, 0.015), 0.0, 0.03),
        # what a cutaway shows
        "suit": m("suit-aluminized-nylon", (0.66, 0.67, 0.69), 0.6, 0.6),
        "helmet": m("helmet-fibreglass-white", (0.85, 0.85, 0.82), 0.0, 0.35),
        "fabric": m("fabric-nylon", (0.80, 0.76, 0.66), 0.0, 0.9),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "bottle": m("bottle-green", (0.10, 0.22, 0.13), 0.4, 0.4),
        "propellant": m("propellant-grain", (0.16, 0.13, 0.11), 0.0, 0.9),
        "copper": m("antenna-copper", (0.72, 0.42, 0.20), 1.0, 0.35),
    }


# ------------------------------------------------------------------------ shingles


def shingle_row(panels: MeshBuilder, bolts: MeshBuilder, surf: Surf, z0: float, z1: float, count: int, phase: float, beads: int, which) -> None:
    """One ring of shingles. Each is its own patch: a flat fastened margin around a field of
    beads (the stiffening corrugations) that run along the meridian and fade out at each end."""
    arc = TAU / count
    margin = 0.07
    gap = 0.045  # inches between neighbouring shingles
    if beads:
        ss = [0.0, margin * 0.6] + [margin + (1 - 2 * margin) * i / (beads * 6) for i in range(beads * 6 + 1)] + [1 - margin * 0.6, 1.0]
    else:
        ss = [i / 6 for i in range(7)]
    rings = [(z0 + gap, 0.0), (z0 + 1.0, 0.0), (z0 + 2.0, 1.0), (z1 - 2.0, 1.0), (z1 - 1.0, 0.0), (z1 - gap, 0.0)]

    def height(s: float) -> float:
        if not beads or s <= margin or s >= 1 - margin:
            return 0.0
        frac = ((s - margin) / (1 - 2 * margin) * beads) % 1.0
        return BEAD * math.sin(math.pi * frac) ** 2

    for k in which:
        t0 = phase + k * arc

        def theta(s: float, z: float) -> float:
            g = gap / surf.r(z)
            return t0 + g + (arc - 2 * g) * s

        rmid = surf.r((z0 + z1) / 2)
        panels.grid(
            lambda s, j: surf.p(theta(s, rings[j][0]), rings[j][0], height(s) * rings[j][1]),
            ss,
            range(len(rings)),
            uv=lambda s, j: ((t0 + arc * s) * rmid * IN, rings[j][0] * IN),
        )
        # fasteners: up the seam, and across both ends between the beads
        n_edge = max(2, int((z1 - z0) / 2.4))
        # one row per seam (on this shingle's leading edge; its neighbour supplies the other)
        for i in range(n_edge):
            z = z0 + 1.6 + (z1 - z0 - 3.2) * i / (n_edge - 1)
            bolts.disc(surf.p(t0, z), surf.n(t0), 0.2 * IN, 0.07 * IN)
        n_end = beads or 4
        for z in (z0 + 0.55, z1 - 0.55):
            for i in range(1, n_end):
                s = margin + (1 - 2 * margin) * i / n_end
                bolts.disc(surf.p(theta(s, z), z), surf.n(theta(s, z)), 0.2 * IN, 0.07 * IN)


# --------------------------------------------------------------------------- parts


def build_heat_shield(M) -> None:
    g = group("HeatShield")
    phi_max = math.asin(SHIELD_R / SHIELD_SPHERE_R)
    cap = [(SHIELD_SPHERE_R * math.sin(phi_max * i / 40), Z_SPHERE_C - SHIELD_SPHERE_R * math.cos(phi_max * i / 40)) for i in range(41)]
    profile = cap + [(SHIELD_R, -0.25), (SHIELD_R - 0.25, 0.0), (SHIELD_R - 2.5, 0.0), (SHIELD_R - 3.0, -0.8), (0.0, -0.8)]
    lathe_obj("HeatShield_HeatSink", prof(profile), M["beryllium"], g, segs=160, sharp_angle=30)
    # attachment ring fasteners around the edge
    mb = MeshBuilder()
    for i in range(72):
        t = TAU * i / 72
        mb.disc(Vector((SHIELD_R * math.cos(t), SHIELD_R * math.sin(t), -1.3)) * IN, (math.cos(t), math.sin(t), 0), 0.28 * IN, 0.08 * IN)
    mb.build("HeatShield_Fasteners", M["bolt"], g)


def build_retropack(M) -> None:
    g = group("Retropack")
    housing = [(0, -23.0), (6, -22.6), (10, -21.6), (12.3, -20.6), (13, -19.5), (13, -10.85), (0, Z_APEX - 0.15)]
    lathe_obj("Retropack_Housing", prof(housing), M["aluminium"], g, segs=96, sharp_angle=35)

    motors, nozzles = MeshBuilder(), MeshBuilder()
    for i in range(3):  # three solid retrograde motors, ripple-fired 5 s apart
        t = TAU * i / 3
        c = Vector((7.0 * math.cos(t), 7.0 * math.sin(t), 0.0))
        m = Matrix.Translation((c + Vector((0, 0, -19.0))) * IN)
        motors.lathe(prof(arc_profile(0, 0, 5.6, -90, 20, 16)), 40, matrix=m)
        bell = [(1.1, -23.4), (1.9, -24.4), (2.7, -25.6), (3.2, -26.5), (3.45, Z_RETRO_BOTTOM)]
        nozzles.lathe(prof(bell), 32, matrix=Matrix.Translation(c * IN))
        nozzles.lathe(prof([(0.0, -23.6), (1.1, -23.4)]), 32, matrix=Matrix.Translation(c * IN))
    for i in range(3):  # three small posigrade motors push the capsule off the booster
        t = TAU * (i + 0.5) / 3
        c = Vector((9.6 * math.cos(t), 9.6 * math.sin(t), 0.0))
        m = Matrix.Translation(c * IN)
        motors.lathe(prof([(1.7, -19.5), (1.7, -23.6), (1.2, -24.2), (0.0, -24.2)]), 20, matrix=m)
        nozzles.lathe(prof([(0.5, -24.2), (1.0, -25.4)]), 16, matrix=m)
    motors.build("Retropack_Motors", M["aluminium"], g)
    nozzles.build("Retropack_Nozzles", M["nozzle"], g)

    straps, clips = MeshBuilder(), MeshBuilder()
    rs = SHIELD_SPHERE_R + 0.22
    for i in range(3):  # three straps hold the pack to the shield until explosive bolts release it
        t = TAU * (i + 0.5) / 3
        rad, side = Vector((math.cos(t), math.sin(t), 0)), (-math.sin(t), math.cos(t), 0)
        pts = [(13.15, -17.5), (13.15, -11.6)]
        pts += [(r, Z_SPHERE_C - math.sqrt(rs**2 - r**2)) for r in np.linspace(14.0, SHIELD_R, 14)]
        pts += [(SHIELD_R + 0.3, -1.2), (SHIELD_R + 0.3, 1.2)]
        path = [(rad * r + Vector((0, 0, z))) * IN for r, z in pts]
        straps.ribbon(path, side, 2.2 * IN)
        clips.box(
            (1.4 * IN, 3.0 * IN, 2.4 * IN), frame((rad * (SHIELD_R + 0.7) + Vector((0, 0, 0.6))) * IN, rad) @ Matrix.Rotation(math.pi / 2, 4, "Y")
        )
        # umbilical conduit beside each strap, pack to shield edge
        o = Vector(side) * 1.9
        straps.tube((rad * 13.2 + o + Vector((0, 0, -14))) * IN, (rad * 14.5 + o + Vector((0, 0, -10.6))) * IN, 0.3 * IN, 8)
    straps.build("Retropack_Straps", M["strap"], g, sharp_angle=25)
    clips.build("Retropack_StrapFittings", M["steel"], g, smooth=False)


def build_afterbody(M, font) -> None:
    g = group("Afterbody")
    hatch = group("Hatch")
    t_h0 = PANEL_PHASE + HATCH_PANELS[0] * PANEL_ARC
    t_h1 = PANEL_PHASE + (HATCH_PANELS[-1] + 1) * PANEL_ARC
    hz0, hz1, _ = ROWS[HATCH_ROW]

    panels, bolts = MeshBuilder(), MeshBuilder()
    hp, hb = MeshBuilder(), MeshBuilder()
    for row, (z0, z1, beads) in enumerate(ROWS):
        skip = HATCH_PANELS if row == HATCH_ROW else ()
        shingle_row(panels, bolts, CONE, z0, z1, PANELS, PANEL_PHASE, beads, [k for k in range(PANELS) if k not in skip])
    shingle_row(hp, MeshBuilder(), CONE, hz0, hz1, PANELS, PANEL_PHASE, ROWS[HATCH_ROW][2], HATCH_PANELS)
    # No. 7 carried the mechanical latch hatch (69 lb), with release handles inside and out.
    # The 70-bolt hatch was the original design and, with a detonating fuse, the later explosive one.
    inset = 1.5  # inches in from the hatch edge, clear of the jamb
    ta, tb = t_h0 + inset / CONE.r(hz0), t_h1 - inset / CONE.r(hz0)
    za, zb = hz0 + inset, hz1 - inset
    for t, z in ((ta, za), (tb, za), (ta, zb), (tb, zb), ((ta + tb) / 2, za), ((ta + tb) / 2, zb), (ta, (za + zb) / 2), (tb, (za + zb) / 2)):
        hb.box((1.5 * IN, 0.9 * IN, 0.6 * IN), CONE.frame(t, z, 0.05))  # latch housings, sunk well through the skin
    hb.box((1.1 * IN, 6.5 * IN, 1.0 * IN), CONE.frame(t_h0 + 0.82 * (t_h1 - t_h0), (za + zb) / 2 - 3.0, 0.25))  # external release handle
    panels.build("Afterbody_Shingles", M["shingle"], g, sharp_angle=None)
    bolts.build("Afterbody_Fasteners", M["bolt"], g)
    hp.build("Hatch_Shingles", M["shingle"], hatch, sharp_angle=None)
    hb.build("Hatch_Latches", M["bolt"], hatch, smooth=False)

    # structure under the shingles, with the hatch opening left out
    under = MeshBuilder()
    r = lambda z: CONE.r(z) - 0.1  # noqa: E731
    under.lathe(prof([(r(0), 0.0), (r(hz0), hz0)]), 144)
    under.lathe(prof([(r(hz0), hz0), (r(hz1), hz1)]), 126, arc=(t_h1, t_h0 + TAU))
    under.lathe(prof([(r(hz1), hz1), (r(CONE_H), CONE_H)]), 144)
    under.build("Afterbody_Structure", M["underlay"], g, sharp_angle=None)
    hu = MeshBuilder()
    hu.lathe(prof([(r(hz0), hz0), (r(hz1), hz1)]), 18, arc=(t_h0, t_h1))
    rv = lambda z: VESSEL.r(z)  # noqa: E731
    hu.lathe(prof([(rv(hz0), hz0), (rv(hz1), hz1)]), 18, arc=(t_h0, t_h1), flip=True)
    hu.build("Hatch_Structure", M["titanium"], hatch, sharp_angle=None)

    # shield attach ring: the smooth band below the first row of shingles
    lathe_obj("Afterbody_AttachRing", prof([(SHIELD_R, 0.02), (SHIELD_R + 0.05, 0.3), (CONE.r(2.0) + 0.12, 2.0)]), M["steel"], g, segs=160)

    detail, dark, glass, void = MeshBuilder(), MeshBuilder(), MeshBuilder(), MeshBuilder()
    # two 10 in portholes: No. 7 predates the trapezoidal overhead window
    for t, z in PORTHOLES:
        f = CONE.frame(t, z)
        # a bezel standing proud of the shingles, a pane set into it, and the dark cabin behind
        detail.lathe(prof([(6.0, -1.0), (6.0, 0.7), (5.0, 0.7), (4.9, 0.22)]), 48, matrix=f)
        if interior():  # a real opening into the cabin (bored below), lined with a sleeve through the wall
            detail.lathe(prof([(4.88, 0.22), (4.88, -2.4), (6.4, -2.4), (6.4, -2.0)]), 48, matrix=f, flip=True)  # and a frame inside
        else:  # with no cabin modelled behind it, a dark disc stands in for one
            void.lathe(prof([(4.9, 0.22), (0.0, 0.22)]), 48, matrix=f)
        glass.lathe(prof([(4.95, 0.52), (0.0, 0.52)]), 48, matrix=f)
        for i in range(16):
            a = TAU * i / 16
            detail.disc(f @ Vector((5.5 * math.cos(a) * IN, 5.5 * math.sin(a) * IN, 0.7 * IN)), CONE.n(t), 0.17 * IN, 0.06 * IN)
    # periscope: door frame and the extended objective, on the Earth-facing side
    f = CONE.frame(deg(180), 11.0)
    detail.box((6.0 * IN, 10.0 * IN, 1.3 * IN), CONE.frame(deg(180), 11.0, -0.4))
    detail.lathe(prof([(2.4, 0.0), (2.4, 3.6), (2.0, 4.0), (1.9, 3.2)]), 32, matrix=f)
    void.lathe(prof([(1.9, 3.2), (0.0, 3.2)]), 32, matrix=f)
    glass.lathe(prof([(1.93, 3.75), (0.0, 3.85)]), 32, matrix=f)  # the objective, slightly domed
    # umbilical receptacle
    f = CONE.frame(deg(-90), 8.0)
    detail.lathe(prof([(2.6, -0.3), (2.6, 0.45), (2.1, 0.45), (2.0, 0.25), (0.0, 0.25)]), 32, matrix=f)
    # roll thrusters: a high (6 lbf) and low (1 lbf) pair each way, low on the cone
    for t0 in (deg(90), deg(270)):
        for dt, rad in ((-0.085, 0.55), (-0.045, 0.3), (0.045, 0.3), (0.085, 0.55)):
            f = CONE.frame(t0 + dt, 4.6, 0.0)
            detail.lathe(prof([(rad + 0.25, -0.2), (rad + 0.25, 0.3), (rad, 0.3)]), 16, matrix=f)
            dark.lathe(prof([(rad, 0.3), (rad * 0.4, -0.3), (0.0, -0.3)]), 16, matrix=f)
    detail.build("Afterbody_Fittings", M["steel"], g)
    dark.build("Afterbody_ThrusterThroats", M["nozzle"], g)
    glass.build("Afterbody_Glass", M["glass"], g)
    void.build("Afterbody_WindowWells", M["void"], g)

    paint, flags = MeshBuilder(), MeshBuilder()
    for t in (deg(135), deg(-45)):
        lettering(paint, CONE, "UNITED STATES", 26.0, t, 28.0, True, font)
        fw, fh, nx = 6.0, 6.0 / 1.9, 8
        verts = [((i / nx - 0.5) * fw, (j - 0.5) * fh, 0.0) for j in range(2) for i in range(nx + 1)]
        base = len(flags.verts)
        decal(flags, CONE, t, 50.5, verts, [(i, i + 1, nx + 2 + i, nx + 1 + i) for i in range(nx)], False)
        flags.uvs[base:] = [(i / nx, j) for j in range(2) for i in range(nx + 1)]
    lettering(paint, CONE, "FREEDOM 7", 15.0, deg(96), 30.0, False, font)
    paint.build("Afterbody_Lettering", M["paint_white"], g, smooth=False)
    flags.build("Afterbody_Flags", M["flag"], g, sharp_angle=None)


def build_crew_cabin(M) -> None:
    g = group("CrewCabin")
    t_h0 = PANEL_PHASE + HATCH_PANELS[0] * PANEL_ARC
    t_h1 = PANEL_PHASE + (HATCH_PANELS[-1] + 1) * PANEL_ARC
    hz0, hz1, _ = ROWS[HATCH_ROW]
    rv = VESSEL.r
    v = MeshBuilder()
    v.lathe(prof([(0.0, 0.5), (rv(0.5), 0.5), (rv(hz0), hz0)]), 144)  # aft pressure bulkhead + wall
    v.lathe(prof([(rv(hz0), hz0), (rv(hz1), hz1)]), 126, arc=(t_h1, t_h0 + TAU))
    v.lathe(prof([(rv(hz1), hz1), (rv(CONE_H - 0.3), CONE_H - 0.3), (0.0, CONE_H - 0.3)]), 144)  # small bulkhead
    # hatch sill: closes the gap between pressure vessel and outer structure
    for t in (t_h0, t_h1):
        v.grid(lambda u, z: CONE.p(t, z, -0.1) * (1 - u) + VESSEL.p(t, z) * u, (0.0, 1.0), (hz0, hz1))
    for z in (hz0, hz1):
        v.grid(lambda t, u: CONE.p(t, z, -0.1) * (1 - u) + VESSEL.p(t, z) * u, [t_h0 + (t_h1 - t_h0) * i / 18 for i in range(19)], (0.0, 1.0))
    v.build("CrewCabin_PressureVessel", M["titanium"], g, sharp_angle=30)

    ribs = MeshBuilder()
    for i in range(12):  # aft bulkhead stiffeners, seen when the shield is off
        t = TAU * i / 12
        ribs.box((26 * IN, 0.8 * IN, 0.9 * IN), Matrix.Rotation(t, 4, "Z") @ Matrix.Translation((21 * IN, 0, 0.1 * IN)))
    ribs.lathe(prof([(7.5, 0.5), (7.5, -0.4), (6.5, -0.4), (6.5, 0.5)]), 48)
    ribs.build("CrewCabin_BulkheadStiffeners", M["titanium"], g, smooth=False)

    # Form-fitted couch, shaped to the seated figure (mark_iv_suit.build_seated): head toward -Y,
    # hatch at his right hand, back to the heat shield, thighs straight up, shins sloping down
    # to a foot rest. That tuck is not a choice: a man 71 in tall lies across a cabin 63 in wide.
    couch = MeshBuilder()
    for (y0, z0), (y1, z1), thick, width in (
        ((-31.0, 2.2), (-20.6, 2.2), 1.2, 15.0),  # head rest, a step below the back
        ((-20.0, 2.9), (7.4, 2.9), 1.6, 21.0),  # back
        ((7.4, 3.3), (13.6, 5.2), 1.4, 21.0),  # seat, rising behind the hips
        ((13.6, 5.2), (13.9, 13.5), 1.2, 21.0),  # and up the back of the thighs
        ((10.2, 21.6), (21.4, 17.1), 1.2, 16.0),  # under the calves
        ((25.3, 16.2), (25.5, 21.8), 0.6, 13.0),  # foot rest, under the heels
    ):
        a, b = Vector((0, y0, z0)), Vector((0, y1, z1))
        d = b - a
        rot = Matrix.Rotation(math.atan2(d.z, d.y), 4, "X")
        couch.box((width * IN, d.length * IN, thick * IN), Matrix.Translation((a + b) / 2 * IN) @ rot)
    for y, z0, z1 in ((16.5, 5.5, 18.6), (25.4, 2.0, 16.4)):  # struts carrying the leg rest down to the floor
        for x in (-8.3, 8.3):
            couch.tube((x * IN, y * IN, z0 * IN), (x * IN, y * IN, z1 * IN), 0.5 * IN, 10)
    couch.build("CrewCabin_Couch", M["couch"], g, smooth=False)

    # main instrument panel above the pilot's chest, periscope display in the middle
    panel, gauges = MeshBuilder(), MeshBuilder()
    pz = 33.0
    pm = Matrix.Translation((0, -3 * IN, pz * IN))
    panel.box((30 * IN, 19 * IN, 1.5 * IN), pm)
    panel.box((8 * IN, 14 * IN, 1.5 * IN), Matrix.Translation((-19 * IN, -3 * IN, (pz - 2) * IN)) @ Matrix.Rotation(deg(-25), 4, "Y"))
    panel.box((8 * IN, 14 * IN, 1.5 * IN), Matrix.Translation((19 * IN, -3 * IN, (pz - 2) * IN)) @ Matrix.Rotation(deg(25), 4, "Y"))
    panel.tube((0, -3 * IN, pz * IN), (0, 14 * IN, (pz - 9) * IN), 2.6 * IN, 20)  # periscope tube
    down = (0, 0, -1)
    gauges.disc((0, -3 * IN, (pz - 0.76) * IN), down, 4.2 * IN, 0.1 * IN, 40)
    for gx in (-12.0, -8.0, 8.0, 12.0):
        for gy in (-9.0, -5.0, -1.0, 3.0):
            gauges.disc((gx * IN, gy * IN, (pz - 0.76) * IN), down, 1.45 * IN, 0.1 * IN, 20)
    panel.build("CrewCabin_InstrumentPanel", M["panel"], g, smooth=False)
    gauges.build("CrewCabin_Instruments", M["gauge"], g)
    if interior():
        build_cabin_contents(M, g)


def build_cabin_contents(M, g) -> None:
    """What a cutaway of the cabin shows. The pilot's pose follows the couch; his size is Shepard's.
    The equipment is representative: the right kinds of thing in roughly the right places, not
    a survey of spacecraft No. 7's installation."""
    P = lambda x, y, z: Vector((x, y, z)) * IN  # noqa: E731
    gear, bottles, bag = (MeshBuilder() for _ in range(3))
    # The pilot: the same suit model as the one standing on the pad (crew/mark_iv_suit.py), posed
    # on the couch. Its seat frame has the hips at the origin; this puts them where the couch is.
    mark_iv_suit.build_seated(g, Matrix.Translation(P(0, PILOT_HIP[0], PILOT_HIP[1])), "CrewCabin_Pilot")
    for sx in (-1, 1):  # attitude stick under the right hand, abort handle under the left
        gear.tube(P(sx * 10.7, 8.6, 2.0), P(sx * 10.7, 8.6, 15.2), 0.5 * IN, 10)
        gear.lathe(prof(arc_profile(0, 0, 0.9, -90, 90, 6)), 12, matrix=Matrix.Translation(P(sx * 10.7, 8.6, 15.2)))
    # environmental control, electrics and recording: boxes and bottles along the cabin floor
    for x, y, z, sx_, sy_, sz_ in (
        (-17.0, -6.0, 3.2, 9, 12, 5),
        (17.0, -6.0, 3.2, 9, 12, 5),
        (0.0, 19.5, 4.2, 14, 9, 7),
        (-19.0, 9.0, 4.0, 7, 9, 6),
        (19.5, 9.5, 5.0, 6, 8, 8),
        (0.0, -27.5, 1.2, 12, 5, 2.4),
    ):
        gear.box((sx_ * IN, sy_ * IN, sz_ * IN), Matrix.Translation(P(x, y, z + sz_ / 2)))
    for x, y in ((-10.5, 21.0), (10.5, 21.0)):  # oxygen: two spherical bottles, primary and reserve
        bottles.lathe(prof(arc_profile(0, 0, 3.7, -90, 90, 12)), 24, matrix=Matrix.Translation(P(x, y, 6.2)))
    # the landing bag, folded flat between the heat shield and the bulkhead
    bag.lathe(prof([(21.5, -0.55), (22.0, -0.7), (33.0, -0.7), (33.5, -0.55), (33.0, -0.42), (22.0, -0.42), (21.5, -0.55)]), 96)
    gear.build("CrewCabin_Equipment", M["equipment"], g, sharp_angle=35)
    bottles.build("CrewCabin_OxygenBottles", M["bottle"], g)
    bag.build("CrewCabin_LandingBag", M["fabric"], g)
    # nothing in the cabin may reach the pressure vessel: the clearance check cannot see a boot
    # through the hull, because the two surfaces cross instead of lying together
    inside = [o.name for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("CrewCabin_Pilot")]
    for name in (*inside, "CrewCabin_Equipment", "CrewCabin_OxygenBottles", "CrewCabin_Couch"):
        for v in bpy.data.objects[name].data.vertices:
            x, y, z = (c / IN for c in v.co)
            room = VESSEL.r(z) - math.hypot(x, y)
            assert room > 0.3, f"{name} is {-room:.1f} in outside the pressure vessel at ({x:.1f}, {y:.1f}, {z:.1f}) in"


def build_recovery_compartment(M) -> None:
    g = group("RecoveryCompartment")
    panels, bolts = MeshBuilder(), MeshBuilder()
    shingle_row(panels, bolts, CYL, Z_CYL + 0.3, Z_CAN - 0.3, 12, deg(15), 0, range(12))
    panels.build("Recovery_Shingles", M["beryllium_shingle"], g, sharp_angle=None)
    bolts.build("Recovery_Fasteners", M["bolt"], g)

    s = MeshBuilder()
    rr = NECK_R - 0.1
    s.lathe(prof([(0.0, Z_CYL + 0.2), (rr, Z_CYL + 0.2), (rr, Z_CAN), (0.0, Z_CAN)]), 96)
    s.build("Recovery_Structure", M["underlay"], g, sharp_angle=30)
    chutes = MeshBuilder()  # main and reserve ring-sail canisters, seen with the antenna canister off
    for y in (-6.6, 6.6):
        chutes.lathe(prof([(6.2, Z_CAN), (6.2, Z_CAN + 0.5), (5.6, Z_CAN + 0.8), (0.0, Z_CAN + 0.8)]), 40, matrix=Matrix.Translation((0, y * IN, 0)))
    chutes.build("Recovery_ParachuteCanisters", M["aluminium"], g)
    if interior():  # the packed main and reserve parachutes under those lids
        packs = MeshBuilder()
        for y in (-6.6, 6.6):
            packs.lathe(
                prof([(0.0, Z_CYL + 1.4), (5.6, Z_CYL + 1.4), (5.9, Z_CYL + 3.0), (5.9, Z_CAN - 2.2), (5.2, Z_CAN - 0.6), (0.0, Z_CAN - 0.6)]),
                32,
                matrix=Matrix.Translation((0, y * IN, 0)),
            )
        packs.build("Recovery_ParachutePacks", M["fabric"], g)

    fit, dark = MeshBuilder(), MeshBuilder()
    for q in range(4):  # pitch and yaw thrusters: a 24 lbf and a 1 lbf nozzle at each quadrant
        t = deg(90 * q + 45)
        fit.box((5.0 * IN, 3.2 * IN, 0.9 * IN), CYL.frame(t, Z_CAN - 4.0, -0.2))  # sunk through the skin, proud by 0.25 in
        for dz, rad in ((0.75, 0.8), (-0.85, 0.35)):
            f = CYL.frame(t, Z_CAN - 4.0 + dz, 0.25)
            fit.lathe(prof([(rad + 0.2, 0.0), (rad + 0.2, 0.25), (rad, 0.25)]), 16, matrix=f)
            dark.lathe(prof([(rad, 0.25), (rad * 0.4, -0.2), (0.0, -0.2)]), 16, matrix=f)
    fit.build("Recovery_ThrusterPorts", M["steel"], g)
    dark.build("Recovery_ThrusterThroats", M["nozzle"], g)


def can_r(z: float) -> float:
    return CAN_R0 + (CAN_R1 - CAN_R0) * (z - Z_CAN) / CAN_H


def build_antenna_canister(M) -> None:
    g = group("AntennaCanister")
    w0, w1 = Z_CAN + 7.0, Z_CAN + 15.0  # the dielectric window is 8 in (SEDR 104, 2-9)
    lower = [(0.0, Z_CAN + 0.05), (CAN_R0, Z_CAN + 0.05), (can_r(w0), w0)]
    upper = [(can_r(w1), w1), (CAN_R1, Z_CAN_TOP - 0.4), (CAN_R1 - 0.4, Z_CAN_TOP), (0.0, Z_CAN_TOP)]
    mb = MeshBuilder()
    mb.lathe(prof(lower), 96)
    mb.lathe(prof(upper), 96)
    fit, lens = MeshBuilder(), MeshBuilder()
    can = Surf(CAN_R0, Z_CAN, math.atan((CAN_R0 - CAN_R1) / CAN_H))
    for i in range(4):  # supports bridging the bicone antenna's dielectric window
        t = deg(45 + 90 * i)
        fit.box((0.9 * IN, 0.25 * IN, (w1 - w0 + 1.2) * IN), can.frame(t, (w0 + w1) / 2, 0.05) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    for z in (w0 - 0.5, w1 + 0.5):
        for i in range(36):
            t = TAU * i / 36
            fit.disc(can.p(t, z), can.n(t), 0.17 * IN, 0.06 * IN)
    for t in (deg(0), deg(90)):  # roll and pitch infrared horizon scanners
        f = can.frame(t, Z_CAN + 18.5)
        fit.lathe(prof([(2.0, -0.4), (2.0, 1.3), (1.5, 1.6), (1.4, 1.3)]), 28, matrix=f)
        lens.lathe(prof([(1.4, 1.3), (0.0, 1.45)]), 28, matrix=f)
    # top: drogue mortar, and the destabilising flap that keeps the capsule from entering nose-first
    fit.lathe(
        prof([(3.2, Z_CAN_TOP), (3.2, Z_CAN_TOP + 1.2), (2.8, Z_CAN_TOP + 1.2), (2.8, Z_CAN_TOP + 0.2), (0.0, Z_CAN_TOP + 0.2)]),
        32,
        matrix=Matrix.Translation((0, -5.5 * IN, 0)),
    )
    fit.box((9.0 * IN, 6.0 * IN, 0.25 * IN), Matrix.Translation((0, 4.0 * IN, (Z_CAN_TOP + 0.55) * IN)) @ Matrix.Rotation(deg(5), 4, "X"))
    for x in (-4.0, 4.0):
        fit.tube((x * IN - 0.8 * IN, 1.2 * IN, (Z_CAN_TOP + 0.3) * IN), (x * IN + 0.8 * IN, 1.2 * IN, (Z_CAN_TOP + 0.3) * IN), 0.3 * IN, 10)
    mb.build("Antenna_Housing", M["beryllium_shingle"], g, sharp_angle=30)
    lathe_obj("Antenna_DielectricWindow", prof([(can_r(w0), w0), (can_r(w1), w1)]), M["dielectric"], g)
    fit.build("Antenna_Fittings", M["steel"], g)
    lens.build("Antenna_ScannerLenses", M["lens"], g)
    if interior():  # the bicone itself: two cones point to point behind the dielectric window
        wm = (w0 + w1) / 2
        cone = MeshBuilder()
        cone.lathe(prof([(can_r(w0) - 0.9, w0 - 0.4), (1.1, wm - 0.25), (1.1, wm + 0.25), (can_r(w1) - 0.9, w1 + 0.4)]), 64)
        cone.lathe(prof([(0.0, Z_CAN + 1.0), (1.0, Z_CAN + 1.0), (1.0, Z_CAN_TOP - 1.0), (0.0, Z_CAN_TOP - 1.0)]), 16)
        cone.build("Antenna_Bicone", M["copper"], g)


def build_escape_tower(M) -> None:
    g = group("EscapeTower")
    ring = [
        (NECK_R + 0.1, Z_CAN - 1.0),
        (NECK_R + 0.75, Z_CAN - 0.6),
        (NECK_R + 0.75, Z_CAN + 1.4),
        (NECK_R - 0.2, Z_CAN + 1.8),
        (CAN_R0 + 0.15, Z_CAN + 1.8),
        (CAN_R0 + 0.15, Z_CAN + 0.1),
    ]
    lathe_obj("Tower_ClampRing", prof(ring), M["steel"], g, sharp_angle=30)

    r_base, r_top = NECK_R + 0.2, 6.5
    legs = [deg(30 + 120 * i) for i in range(3)]

    def node(i: int, z: float) -> Vector:
        r = r_base + (r_top - r_base) * (z - (Z_CAN + 1.8)) / (Z_TRUSS_TOP - (Z_CAN + 1.8))
        return Vector((r * math.cos(legs[i % 3]), r * math.sin(legs[i % 3]), z)) * IN

    truss, steel = MeshBuilder(), MeshBuilder()
    levels = list(TRUSS_BAYS)  # no cross-members until clear of the canister
    for i in range(3):
        truss.tube(node(i, Z_CAN + 1.0), node(i, Z_TRUSS_TOP), 0.8 * IN, 14)
        for z in levels:
            truss.tube(node(i, z), node(i + 1, z), 0.5 * IN, 10)
        for b, (z0, z1) in enumerate(zip(levels, levels[1:])):
            j0, j1 = (i, i + 1) if b % 2 == 0 else (i + 1, i)
            truss.tube(node(j0, z0), node(j1, z1), 0.45 * IN, 10)
        # explosive-bolt housing where each leg meets the clamp ring
        steel.box(
            (3.2 * IN, 2.4 * IN, 3.0 * IN),
            frame(node(i, Z_CAN + 1.2), (math.cos(legs[i]), math.sin(legs[i]), 0)) @ Matrix.Rotation(math.pi / 2, 4, "Y"),
        )
    truss.lathe(
        prof(
            [(0.0, Z_TRUSS_TOP - 0.6), (7.6, Z_TRUSS_TOP - 0.6), (7.6, Z_TRUSS_TOP + 0.6), (5.2, Z_TRUSS_TOP + 0.6), (5.2, Z_MOTOR), (0.0, Z_MOTOR)]
        ),
        48,
    )
    truss.build("Tower_Truss", M["tower"], g, sharp_angle=35)
    steel.build("Tower_BoltHousings", M["steel"], g, smooth=False)

    # escape motor: 52,000 lbf for 0.78 s (SEDR 104) through three nozzles canted 19 degrees off axis
    case = [
        (0.0, Z_MOTOR),
        (7.5, Z_MOTOR),
        (7.5, Z_MOTOR_TOP),
        (7.2, Z_MOTOR_TOP + 1.2),
        (6.2, Z_MOTOR_CAP - 1.2),
        (5.0, Z_MOTOR_CAP),
        (2.2, Z_MOTOR_CAP + 0.6),
        (1.3, Z_MOTOR_CAP + 2.4),
        (0.7, Z_MOTOR_CAP + 3.2),
        (0.7, Z_TOP - 0.4),
        (0.0, Z_TOP),
    ]
    lathe_obj("Tower_EscapeMotor", prof(case), M["tower"], g, segs=64, sharp_angle=30)
    bands = MeshBuilder()
    for z in (Z_MOTOR + 1.0, (Z_MOTOR + Z_MOTOR_TOP) / 2, Z_MOTOR_TOP - 1.0):
        bands.lathe(prof([(7.5, z - 0.6), (7.7, z - 0.4), (7.7, z + 0.4), (7.5, z + 0.6)]), 64)
    bands.build("Tower_MotorBands", M["steel"], g)
    if interior():  # the solid-propellant grain that the case is wrapped round
        grain = MeshBuilder()
        grain.lathe(
            prof([(0.0, Z_MOTOR + 2.0), (6.9, Z_MOTOR + 2.0), (6.9, Z_MOTOR_TOP - 1.0), (5.0, Z_MOTOR_TOP + 2.0), (0.0, Z_MOTOR_TOP + 2.0)]), 40
        )
        grain.build("Tower_PropellantGrain", M["propellant"], g)
    noz = MeshBuilder()
    cant = deg(19)
    for i in range(3):
        t = deg(90 + 120 * i)  # between the legs
        rad = Vector((math.cos(t), math.sin(t), 0))
        origin = (rad * 3.6 + Vector((0, 0, Z_MOTOR + 1.0))) * IN
        axis = rad * math.sin(cant) + Vector((0, 0, -math.cos(cant)))
        noz.lathe(prof([(1.5, 0.0), (1.7, 2.0), (2.7, 5.5), (3.6, 9.0), (4.1, 12.0)]), 32, matrix=frame(origin, axis))
    # tower-jettison motor fires straight down the middle
    noz.lathe(prof([(2.3, Z_MOTOR - 0.2), (2.3, Z_MOTOR - 5.5), (1.2, Z_MOTOR - 6.5), (2.0, Z_MOTOR - 9.0)]), 28)
    noz.build("Tower_Nozzles", M["nozzle"], g)


# ---------------------------------------------------------------------------- main


def build() -> str:
    font = load_font()
    M = make_materials()
    build_heat_shield(M)
    build_retropack(M)
    build_afterbody(M, font)
    build_crew_cabin(M)
    if interior():  # the two portholes go right through shingle, structure and pressure vessel
        for t, z in PORTHOLES:
            bore(("Afterbody_Shingles", "Afterbody_Structure", "CrewCabin_PressureVessel"), CONE.frame(t, z), 4.96 * IN, 3.0 * IN)
            bore(("Afterbody_Fasteners",), CONE.frame(t, z), 5.5 * IN, 3.0 * IN)  # no bolt heads left hanging in the opening
    build_recovery_compartment(M)
    build_antenna_canister(M)
    build_escape_tower(M)
    redstone_mrlv.build(Z_BOOSTER_BASE, font)
    mark_shells(SHELLS + redstone_mrlv.SHELLS)
    return f"{(Z_TOP - Z_BOOSTER_BASE) * IN:.3f} m tall on the pad, spacecraft {(Z_TOP - Z_RETRO_BOTTOM) * IN:.3f} m"


if __name__ == "__main__":
    run(
        "mr-3 vehicle",
        build,
        [
            ("vehicle-stack.png", (0, 0, (Z_TOP + Z_BOOSTER_BASE) / 2 * IN), 70, dict(azimuth=20, res=(700, 1600))),
            ("vehicle-capsule.png", (0, 0, 1.2), 12, dict(azimuth=25, elevation=8, res=(1200, 1200))),
        ],
    )
