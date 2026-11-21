"""The Skylab Saturn Workshop as each crew found it: the orbital workshop, airlock, docking adapter and solar
observatory, in inches about the cluster's own axes, with the damage of 14 May 1973 and the two sunshades.

Skylab's axes (MSC 04727, §1.1 and fig. 1.1-3): +X along the cluster toward the docking adapter's axial port, +Z
toward the Sun in the solar-inertial attitude, Y completing a right-handed set. Here +X is Blender's +Z (up, the
viewer's +Y), Skylab Y is Blender X and Skylab Z is Blender Y. Stations are inches along X from the aft end of the
workshop's habitation cylinder; the cluster stands on the aft end of the workshop (the radiator) on the floor.

Every figure here is in workshop.md with its source and confidence. `visit` chooses the station as a crew found it
when they docked: 2 (25 May 1973: no sunshade, wing 1 held by a strap, wing 2 gone), 3 (28 July 1973: the parasol
up and wing 1 out) or 4 (16 November 1973: the twin-pole sail over the parasol).
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import apollo_docking
import srlib
from srlib import IN, TAU, MeshBuilder, group, material

# ---------------------------------------------------------------------------------------------- stations (inches)
# TM X-64814, fig. 2-1: module lengths in feet, laid end to end over the 86-ft cluster.
OWS_LENGTH = 48.1 * 12
IU_LENGTH = 3.0 * 12
AM_LENGTH = 17.6 * 12
MDA_LENGTH = 17.3 * 12
# MSC 04727, §2.0.10.4: the habitation cylinder (TM X-64813, §2.2.1: 268.6 in long), the forward skirt 10.2 ft and
# the aft skirt 7.2 ft high, both 21.7 ft across. Forward dome and aft dome are 260-in hemispheres.
CYLINDER = 268.6
FWD_SKIRT_TOP = CYLINDER + 10.2 * 12
AFT_SKIRT_BOTTOM = -7.2 * 12
SKIRT_R = 21.7 * 12 / 2
TANK_R = 130.0
X_AFT = FWD_SKIRT_TOP - OWS_LENGTH  # the workshop's aft end, on the floor
IU_TOP = FWD_SKIRT_TOP + IU_LENGTH
IU_R = 21.6 * 12 / 2  # MSC 04727, §2.0.2
FAS_TOP = IU_TOP + 80  # §2.0.9.3: about 80 in long, 260 in across
MDA_AFT = IU_TOP + AM_LENGTH
MDA_PORT = MDA_AFT + MDA_LENGTH  # the axial docking plane
DOME_APEX = CYLINDER + TANK_R
# MSC 04727, §2.0.8: the bellows (13 in long, 42.5 in inside diameter), the tunnel (55 in across, 153 in long: 42-in aft
# compartment, 80-in lock, 31-in forward compartment) and the structural transition section (46 in long, 120 in across).
# What the documented lengths leave between the tunnel and the STS's cylinder (25.6 in) is taken as the depth of the
# STS bulkhead, which closes the 120 in down to the tunnel's 65-in ring: derived.
BELLOWS_AFT = DOME_APEX + 2
TUNNEL_AFT = BELLOWS_AFT + 13
TUNNEL_FWD = TUNNEL_AFT + 153
STS_AFT = MDA_AFT - 46
TUNNEL_R = 55 / 2
STS_R = 60.0
SHIELD_R = STS_R + 3  # §2.0.7.3, §2.0.8: radiator and meteoroid shield on 3-in standoffs
# MDA: 10 ft across; the forward bulkhead a 30-degree cone (read as 30 degrees from the transverse plane: see the .md);
# the axial port's tunnel estimated at 20 in proud of the cone. The radial port is 103 in forward of the MDA's aft end.
PORT_TUNNEL_R = 19.5
PORT_TUNNEL = 20.0
CONE_TOP_R = 24.0
CONE_FWD = MDA_PORT - PORT_TUNNEL
CONE_AFT = CONE_FWD - (STS_R + 3 - CONE_TOP_R) * math.tan(math.radians(30))
RADIAL_PORT_X = MDA_AFT + 103
RADIAL_PLANE = 80.0  # radial docking plane from the axis: estimated

# Solar observatory (ATM), deployed: rack 11 ft across and 12 ft high, a 14-ft sun shield at the Sun end, the
# canister 7 ft by 10 ft (MSC 04727, §2.0.5); 13.3 ft long overall (TM X-64814, fig. 2-1). Where it stands over the
# docking adapter is estimated from TM X-64814, figs. 2-1 and 2-2.
ATM_X = 760.0
ATM_BASE = 88.0
RACK_FLATS = 11 * 12
RACK_HIGH = 12 * 12
SUN_SHIELD_R = 14 * 12 / 2
ATM_TOP = ATM_BASE + 13.3 * 12
# ATM wings (TM X-64814, fig. 7-20): 521 in long, 101.5 in wide, four panels of 104.3 in and a half panel, at 45
# degrees to the cluster's axis; their 100-ft span (MSC 04727, §2.0.5.4) puts the roots 79 in from the canister's axis.
ATM_WING_LONG = 521.0
ATM_WING_WIDE = 101.5
ATM_PANEL = 104.3
ATM_ROOT = 100 * 12 / 2 - ATM_WING_LONG
ATM_WING_Z = ATM_BASE + RACK_HIGH - 4

# Workshop solar array (MSC 04727, §2.0.10.4.6; fig. 2.0.10-23): beam fairings 4 ft wide and about 37 ft long, at
# 28 deg 20 min from the Y axis toward +Z; three wing sections each of a truss panel, a dummy panel and ten active
# panels, each panel 120 by 27 in. Wing 2 on +Y, wing 1 on -Y (fig. 2.1.4-2).
BEAM_CLOCK = math.radians(28 + 20 / 60)
BEAM_WIDE = 48.0
BEAM_DEEP = 24.0  # estimated
BEAM_LONG = 37 * 12
# The forward fairing's nose slopes about 20 degrees (§2.0.10.4.6) over the fairing's depth, which puts the hinge
# below the skirt's forward end; the beam then reaches past its tie-down on the aft skirt. Derived from estimates.
BEAM_HINGE_X = FWD_SKIRT_TOP - BEAM_DEEP / math.tan(math.radians(20))
SECTION_WIDE = 120.0
PANEL_DEEP = 27.0
PANELS = 12
DUMMY = BEAM_LONG - 3 * SECTION_WIDE  # the beam's inboard dummy section
JAMMED = math.radians(4)  # wing 1's beam as the first crew found it: estimated from SL2-04-248

SAL_X = 150.0  # the forward compartment's scientific airlocks, on +Z and -Z: station estimated from the parasol's place in S73-34619

V = Vector


def P(x: float, y: float = 0.0, z: float = 0.0) -> Vector:
    """A point in Skylab's axes, inches, as Blender metres."""
    return V((y * IN, z * IN, (x - X_AFT) * IN))


def D(x: float, y: float, z: float) -> Vector:
    """A direction in Skylab's axes, in Blender's."""
    return V((y, z, x)).normalized()


def polar(r: float, theta: float, x: float) -> Vector:
    """theta from +Y toward +Z, about the cluster's axis."""
    return P(x, r * math.cos(theta), r * math.sin(theta))


def turn(mb: MeshBuilder, profile, segs: int = 96, arc=(0.0, TAU)) -> None:
    """Revolve an (r, x) profile in inches about the cluster's axis."""
    mb.lathe([(r * IN, (x - X_AFT) * IN) for r, x in profile], segs, arc=arc)


def turn_about(mb: MeshBuilder, profile, origin: Vector, axis: Vector, segs: int = 32) -> None:
    """Revolve an (r, along) profile in inches about an axis through `origin` (Blender)."""
    mb.lathe([(r * IN, a * IN) for r, a in profile], segs, matrix=srlib.frame(origin, axis))


def slab(mb: MeshBuilder, centre: Vector, u: Vector, v: Vector, size) -> None:
    """A box, `size` in inches along u, v and u x v (Blender unit vectors)."""
    u, v = u.normalized(), v.normalized()
    w = u.cross(v).normalized()
    m = Matrix((u, v, w)).transposed().to_4x4()
    m.translation = centre
    mb.box([s * IN for s in size], m)


def rod(mb: MeshBuilder, a: Vector, b: Vector, radius: float, segs: int = 8) -> None:
    mb.tube(a, b, radius * IN, segs)


def ring_strip(mb: MeshBuilder, r: float, x0: float, x1: float, theta0: float, theta1: float, segs: int) -> None:
    turn(mb, [(r, x0), (r, x1)], segs, arc=(theta0, theta1))


def fine() -> bool:
    """Fasteners, stringers and cell-module lines: left out of the far levels."""
    return srlib.DETAIL >= 0.5


# ------------------------------------------------------------------------------------------------------ materials


def paints():
    return {
        "gold": material("skylab-goldized-kapton", (0.80, 0.56, 0.22), 0.85, 0.32),
        "black": material("skylab-skirt-black", (0.035, 0.035, 0.04), 0.0, 0.62),
        "white": material("skylab-white", (0.84, 0.85, 0.83), 0.0, 0.55),
        "foil": material("skylab-insulation", (0.70, 0.70, 0.67), 0.55, 0.48),
        "alloy": material("aluminium-skylab", (0.62, 0.64, 0.66), 0.7, 0.38),
        "dark": material("skylab-equipment-dark", (0.14, 0.15, 0.16), 0.3, 0.55),
        "cells": material("skylab-solar-cells", (0.045, 0.06, 0.13), 0.5, 0.28),
        "frame": material("skylab-panel-frame", (0.58, 0.60, 0.62), 0.6, 0.42),
        "orange": material("skylab-parasol-nylon", (0.86, 0.42, 0.12), 0.0, 0.7),
        "mylar": material("skylab-parasol-mylar", (0.78, 0.78, 0.76), 0.9, 0.22),
        "sail": material("skylab-sail-white", (0.88, 0.88, 0.85), 0.0, 0.6),
        "window": material("skylab-window", (0.03, 0.05, 0.07), 0.2, 0.08),
        "target": material("skylab-target-black", (0.02, 0.02, 0.02), 0.0, 0.7),
        "day-glo": material("skylab-target-white", (0.92, 0.92, 0.88), 0.0, 0.5),
    }


# ------------------------------------------------------------------------------------------------- orbital workshop


def workshop(node, m) -> None:
    gold, black, white, skin = MeshBuilder(), MeshBuilder(), MeshBuilder(), MeshBuilder()
    # The habitation cylinder, its goldized Kapton bare where the meteoroid shield had been (TM X-64813, §2.2.3).
    turn(gold, [(TANK_R, 0), (TANK_R, CYLINDER)], 128)
    # Skirts, black with a white band at each outer end (SL2-04-248, SL2-07-651: the band widths estimated), each
    # with an inner face so the open ends do not show the sky through the skin.
    turn(black, [(SKIRT_R, AFT_SKIRT_BOTTOM + 18), (SKIRT_R, 0), (TANK_R, 0)], 128)
    turn(white, [(SKIRT_R, AFT_SKIRT_BOTTOM), (SKIRT_R, AFT_SKIRT_BOTTOM + 18)], 128)
    turn(black, [(TANK_R, CYLINDER), (SKIRT_R, CYLINDER), (SKIRT_R, FWD_SKIRT_TOP - 12)], 128)
    turn(white, [(SKIRT_R, FWD_SKIRT_TOP - 12), (SKIRT_R, FWD_SKIRT_TOP)], 128)
    inner = SKIRT_R - 0.5
    aft_meet = -math.sqrt(TANK_R**2 - inner**2)
    turn(skin, [(inner, aft_meet), (inner, AFT_SKIRT_BOTTOM), (SKIRT_R, AFT_SKIRT_BOTTOM)], 128)
    # The aft dome below the skirt, then the thrust structure: a cone 65 in high from 167 in across at the dome to 27
    # in at the engine mount (§2.0.10.4.4).
    dome = MeshBuilder()
    cone_r = 167 / 2
    cone_top = -math.sqrt(TANK_R**2 - cone_r**2)
    steps = 18
    a0 = math.asin(aft_meet / TANK_R)
    a1 = math.asin(cone_top / TANK_R)
    turn(dome, [(TANK_R * math.cos(a1 + (a0 - a1) * i / steps), TANK_R * math.sin(a1 + (a0 - a1) * i / steps)) for i in range(steps + 1)], 128)
    turn(dome, [(0, cone_top - 65), (27 / 2, cone_top - 65), (cone_r, cone_top)], 64)
    # TACS sphere meteoroid shield: an annulus of eight segments over the 23 spheres on the thrust structure; its
    # section is estimated (fig. 2.0.10-20).
    shield = MeshBuilder()
    turn(shield, [(122, -74), (114, -70), (56, -148), (64, -152), (122, -74)], 96)
    # Refrigeration radiator: an irregular octagon of 84 sq ft at the engine mount, 5 degrees off square to the axis.
    mount = MeshBuilder()
    turn(mount, [(0, X_AFT + 9), (10, X_AFT + 9), (10, cone_top - 65)], 24)
    radiator = MeshBuilder()
    across = math.sqrt(84 * 144 / 0.828)  # a regular octagon of that area, across flats
    tilt = Matrix.Rotation(math.radians(5), 4, "X")
    corner = across / 2 / math.cos(math.pi / 8)
    ring = [(corner * math.cos(math.pi / 8 + i * math.pi / 4), corner * math.sin(math.pi / 8 + i * math.pi / 4)) for i in range(8)]
    verts = []
    for z in (-2.0, 2.0):
        verts += [tilt @ V((x * IN, y * IN, z * IN)) + P(X_AFT + 8) for x, y in ring]
    faces = [tuple(range(7, -1, -1)), tuple(range(8, 16))] + [(i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i) for i in range(8)]
    radiator.add(verts, faces)
    # TACS thruster clusters on the aft skirt, at +Z and -Z: positions and sizes estimated.
    tacs = MeshBuilder()
    for theta in (math.pi / 2, 3 * math.pi / 2):
        out, along = D(0, math.cos(theta), math.sin(theta)), D(1, 0, 0)
        centre = polar(SKIRT_R + 7, theta, AFT_SKIRT_BOTTOM + 30)
        slab(tacs, centre, along, out.cross(along), (26, 20, 14))
        for k in (-1, 0, 1):
            tip = centre + along * (k * 7 * IN) + out * (7 * IN)
            turn_about(tacs, [(0, 0), (2.4, 0), (1.2, 4), (0, 4)], tip, out, 12)
    # Wardroom window: 18 5/16 in panes, 25 deg 55 min from -Z toward -Y (§2.0.10.3); station estimated. Scientific
    # airlocks on +Z and -Z, 8.25-in square (§2.0.10.3.1).
    glass, fittings = MeshBuilder(), MeshBuilder()
    theta = math.radians(270 - (25 + 55 / 60))
    out = D(0, math.cos(theta), math.sin(theta))
    turn_about(glass, [(0, 0), (9.2, 0), (9.2, 0.3), (0, 0.3)], polar(TANK_R, theta, 95), out, 32)
    turn_about(fittings, [(9.2, -0.5), (11.5, -0.5), (11.5, 0.6), (9.2, 0.6), (9.2, -0.5)], polar(TANK_R, theta, 95), out, 32)
    for theta in (math.pi / 2, 3 * math.pi / 2):
        out = D(0, math.cos(theta), math.sin(theta))
        slab(fittings, polar(TANK_R + 1.0, theta, SAL_X), D(1, 0, 0), out.cross(D(1, 0, 0)), (14, 14, 2.4))
    # Forward and aft skirt stringers (hat sections: count and size estimated).
    if fine():
        for i in range(64):
            theta = TAU * (i + 0.5) / 64
            out = D(0, math.cos(theta), math.sin(theta))
            for lo, hi in ((CYLINDER + 3, FWD_SKIRT_TOP - 14), (AFT_SKIRT_BOTTOM + 20, -3)):
                slab(black, polar(SKIRT_R + 0.6, theta, (lo + hi) / 2), D(1, 0, 0), out.cross(D(1, 0, 0)), (hi - lo, 1.6, 1.2))
    gold.build("OWS_HabitationWall", m["gold"], node)
    black.build("OWS_Skirts", m["black"], node)
    white.build("OWS_SkirtBands", m["white"], node)
    skin.build("OWS_AftSkirtInner", m["black"], node)
    dome.build("OWS_AftDomeAndThrustStructure", m["foil"], node)
    shield.build("OWS_TACSSphereShield", m["white"], node)
    mount.build("OWS_EngineMount", m["alloy"], node)
    radiator.build("OWS_RefrigerationRadiator", m["white"], node, smooth=False)
    tacs.build("OWS_TACSThrusters", m["dark"], node)
    glass.build("OWS_WardroomWindow", m["window"], node)
    fittings.build("OWS_WindowAndAirlocks", m["alloy"], node)


def wing_axes(theta: float):
    """At a clock angle on the workshop: the radial and tangential unit vectors (Blender), the latter toward rising theta."""
    return D(0, math.cos(theta), math.sin(theta)), D(0, -math.sin(theta), math.cos(theta))


def prism(mb: MeshBuilder, outline, theta: float, half: float, origin: Vector | None = None, turn_by: Matrix | None = None) -> None:
    """Extrude an outline of (station, radius) points in inches, counterclockwise with station to the right and radius
    up, across the workshop's tangent at `theta` by +-half inches; optionally turned about `origin` (Blender)."""
    ur, ut = wing_axes(theta)
    pts = []
    for t in (-half, half):
        for x, r in outline:
            p = P(x) + ur * (r * IN) + ut * (t * IN)
            if turn_by is not None:
                p = origin + turn_by @ (p - origin)
            pts.append(p)
    n = len(outline)
    faces = [tuple(range(n - 1, -1, -1)), tuple(range(n, 2 * n))]
    faces += [(i, (i + 1) % n, n + (i + 1) % n, n + i) for i in range(n)]
    mb.add(pts, faces)


def fairing_outline():
    """A beam fairing's forward fairing, from the hinge to the skirt's forward end, its nose sloping 20 degrees."""
    r0, r1 = TANK_R + 1, TANK_R + 1 + BEAM_DEEP
    return [(BEAM_HINGE_X + 0.5, r0), (FWD_SKIRT_TOP - 1, r0), (FWD_SKIRT_TOP - 1, r0 + 1.5), (BEAM_HINGE_X + 0.5, r1)]


def beam_hinge(theta: float, side: int) -> Vector:
    """The beam's hinge: the forward edge of its fairing farthest out along Y (`side` -1 for wing 1 on -Y), so the
    fairing swings clear of the workshop and of the forward fairing. The hinge axis is Skylab's Z: estimated, so that
    the deployed wing faces the Sun as TM X-64813, fig. 2.2.3-43 draws it."""
    ur, ut = wing_axes(theta)
    corners = [
        (TANK_R + 1 + dr) * V((math.cos(theta), math.sin(theta))) + dt * V((-math.sin(theta), math.cos(theta)))
        for dr in (0, BEAM_DEEP)
        for dt in (-BEAM_WIDE / 2, BEAM_WIDE / 2)
    ]
    y, z = max(corners, key=lambda c: side * c.x)
    return P(BEAM_HINGE_X, y, z)


def swing_of(angle: float, side: int) -> Matrix:
    """The beam's turn about Skylab Z by `angle`, its aft end going outward along `side` Y."""
    return Matrix.Rotation(-side * angle, 3, D(0, 0, 1))


def shield_remnant(node, m, visit: int) -> None:
    """What was left of the meteoroid shield: the longitudinal joint beside wing 1, torn from top to bottom and pulled
    over the beam fairing (TM X-64814, §4.3.1; SL2-04-248). Its extent and set are estimated. On the first visit an
    aluminium strap from it held the beam fairing shut (TM X-64814, §3.3: cut away by Conrad on 7 June 1973); where it
    crossed the fairing is estimated."""
    strip, strap = MeshBuilder(), MeshBuilder()
    wing = math.pi - BEAM_CLOCK
    a0, a1 = wing + math.radians(12), wing + math.radians(18)
    n = 10
    for k in range(n):
        x0 = 30 + (CYLINDER - 50) * k / n
        x1 = 30 + (CYLINDER - 50) * (k + 1) / n
        lift = 2.0 + 1.5 * math.sin(k * 1.7)  # crumpled away from the wall
        r = TANK_R + lift
        turn(strip, [(r - 0.6, x0), (r, x0), (r, x1 - 1), (r - 0.6, x1 - 1), (r - 0.6, x0)], 24, arc=(a0, a1))
    strip.build("OWS_ShieldRemnant", m["white"], node)
    if visit != 2:
        return
    ur, ut = wing_axes(wing)
    hinge = beam_hinge(wing, -1)
    turn_by = swing_of(JAMMED, -1)
    x = 150.0
    centre = P(x) + ur * ((TANK_R + 1 + BEAM_DEEP / 2) * IN)

    def jam(p: Vector) -> Vector:
        return hinge + turn_by @ (p - hinge)

    outer = [jam(centre + ur * ((BEAM_DEEP / 2 + 0.6) * IN) + ut * (s * (BEAM_WIDE / 2 + 0.6) * IN)) for s in (1, -1)]
    path = [polar(TANK_R + 3.5, a0 + math.radians(2), x), *outer, polar(TANK_R + 0.8, wing - math.radians(16), x)]
    for p, q in zip(path, path[1:], strict=False):
        d = q - p
        slab(strap, (p + q) / 2, d, D(1, 0, 0), (d.length / IN + 1.0, 3.0, 0.4))
    strap.build("OWS_RestrainingStrap", m["alloy"], node)


def solar_wing(node, m, visit: int) -> None:
    """Wing 1: the forward fairing fixed to the skirt, the beam fairing on its hinge (node SAS_Wing1_Beam, built stowed
    and turned out), and the three wing sections out of it once the first crew had freed it."""
    swing = JAMMED if visit == 2 else math.pi / 2
    theta = math.pi - BEAM_CLOCK
    ur, ut = wing_axes(theta)
    fixed = MeshBuilder()
    prism(fixed, fairing_outline(), theta, BEAM_WIDE / 2)
    fixed.build("SAS_Wing1_ForwardFairing", m["white"], node)
    hinge = beam_hinge(theta, -1)
    pivot = group("SAS_Wing1_Beam", node)
    pivot.location = hinge
    pivot.rotation_mode = "QUATERNION"
    pivot.rotation_quaternion = swing_of(swing, -1).to_quaternion()
    beam = MeshBuilder()
    r0, r1 = TANK_R + 1, TANK_R + 1 + BEAM_DEEP
    lo = BEAM_HINGE_X - BEAM_LONG
    outline = [(lo, r0), (BEAM_HINGE_X, r0), (BEAM_HINGE_X, r1), (lo, r1)]
    prism(beam, outline, theta, BEAM_WIDE / 2, hinge, Matrix.Identity(3))
    if fine():
        for k in range(1, 8):  # the fairing's frames, read as raised bands
            xk = lo + BEAM_LONG * k / 8
            prism(
                beam,
                [(xk - 1, r0 + 0.3), (xk + 1, r0 + 0.3), (xk + 1, r1 + 0.4), (xk - 1, r1 + 0.4)],
                theta,
                BEAM_WIDE / 2 + 0.4,
                hinge,
                Matrix.Identity(3),
            )
    # (the mesh is in the pivot's frame: the hinge taken off every vertex)
    beam.verts = [tuple(V(v) - hinge) for v in beam.verts]
    beam.build("SAS_Wing1_BeamFairing", m["white"], pivot)
    if visit == 2:
        return
    # Deployed: the sections lie square to Skylab Z through the beam's middle, unfolding aft out of its cavity.
    turn_by = swing_of(swing, -1)
    root = hinge + turn_by @ (P(BEAM_HINGE_X) + ur * ((TANK_R + 1 + BEAM_DEEP / 2) * IN) - hinge)
    a = turn_by @ D(-1, 0, 0)  # along the beam, outward
    b = D(-1, 0, 0)  # aft
    n = D(0, 0, 1)
    start = root + b * ((BEAM_DEEP / 2 + 3) * IN)
    cells, frames, lines = MeshBuilder(), MeshBuilder(), MeshBuilder()
    for s in range(3):
        along0 = DUMMY + s * SECTION_WIDE
        for k in range(PANELS):
            c = start + a * ((along0 + SECTION_WIDE / 2) * IN) + b * ((k + 0.5) * PANEL_DEEP * IN)
            # the truss panel and the dummy panel nearest the beam carry no cells
            slab(cells if k >= 2 else frames, c, a, b, (SECTION_WIDE - 2, PANEL_DEEP - 0.6, 1.0))
            if fine() and k >= 2:
                for q in (1, 2, 3):  # four modules a panel (TM X-64814, fig. 7-10)
                    slab(lines, c + a * ((q / 4 - 0.5) * (SECTION_WIDE - 2) * IN), b, n, (PANEL_DEEP - 1.2, 1.4, 0.5))
        for edge in (0.03, 0.97):  # the two stabilizer beams, 1.75 by 6 in (MSC 04727, §2.0.10.4.6)
            p = start + a * ((along0 + edge * SECTION_WIDE) * IN)
            slab(frames, p + b * (PANELS * PANEL_DEEP / 2 * IN) - n * (2.5 * IN), b, a, (PANELS * PANEL_DEEP, 1.75, 4.0))
    cells.build("SAS_Wing1_Cells", m["cells"], node)
    frames.build("SAS_Wing1_Structure", m["frame"], node)
    if fine():
        lines.build("SAS_Wing1_ModuleLines", m["frame"], node)


def lost_wing(node, m) -> None:
    """Wing 2's forward fairing, all that stayed after the wing tore free at its hinge 593.9 s into the launch
    (TM X-64814, §4.3.2; fig. 4-9 shows the torn attachment). The ragged hinge is estimated."""
    theta = BEAM_CLOCK
    ur, ut = wing_axes(theta)
    fixed, torn = MeshBuilder(), MeshBuilder()
    prism(fixed, fairing_outline(), theta, BEAM_WIDE / 2)
    for k, (dt, dr, length) in enumerate(((-14, 4, 9), (-4, -3, 14), (8, 6, 6), (16, -5, 11))):
        p = P(BEAM_HINGE_X) + ur * ((TANK_R + 1 + BEAM_DEEP / 2 + dr) * IN) + ut * (dt * IN)
        rod(torn, p + D(1, 0, 0) * (2 * IN), p - D(1, 0, 0) * (length * IN) + ur * ((k - 1.5) * 1.5 * IN), 0.5, 6)
    fixed.build("SAS_Wing2_ForwardFairing", m["white"], node)
    torn.build("SAS_Wing2_TornHinge", m["alloy"], node)


# --------------------------------------------------------------------------------------- instrument unit and shroud


def instrument_unit(node, m) -> None:
    mb = MeshBuilder()
    turn(mb, [(SKIRT_R, FWD_SKIRT_TOP), (IU_R, FWD_SKIRT_TOP), (IU_R, IU_TOP), (TANK_R, IU_TOP)], 128)
    mb.build("IU_Skin", m["white"], node)


def airlock_shroud(node, m) -> None:
    """The fixed airlock shroud with its six oxygen tanks and two discone antenna booms (MSC 04727, §2.0.9, §2.4.4)."""
    skin, inner, rings, tanks, booms, cones = (MeshBuilder() for _ in range(6))
    turn(skin, [(TANK_R, IU_TOP), (TANK_R, FAS_TOP)], 128)
    inner_r = IU_R - 0.4
    fwd_meet = CYLINDER + math.sqrt(TANK_R**2 - inner_r**2)
    turn(inner, [(TANK_R, FAS_TOP), (inner_r, FAS_TOP), (inner_r, fwd_meet)], 128)
    # the forward dome inside, from where it meets the inner wall to the 42-in hatch at its apex (§2.0.10.4.3)
    steps = 20
    a0 = math.acos(inner_r / TANK_R)
    a1 = math.acos(21 / TANK_R)
    turn(
        inner,
        [(TANK_R * math.cos(a0 + (a1 - a0) * i / steps), CYLINDER + TANK_R * math.sin(a0 + (a1 - a0) * i / steps)) for i in range(steps + 1)],
        96,
    )
    turn(rings, [(TANK_R, FAS_TOP - 12), (TANK_R + 0.6, FAS_TOP - 12), (TANK_R + 0.6, FAS_TOP), (TANK_R, FAS_TOP)], 128)
    # Oxygen: 45-in cylinders 90 in long with elliptical ends, in pairs between +Z and +Y, +Y and -Z, -Z and -Y
    # (fig. 2.0.9-1); their radius, spacing and station are estimated.
    for mid in (45, 315, 225):
        for off in (-15, 15):
            theta = math.radians(mid + off)
            c = polar(97, theta, FAS_TOP - 25)
            prof = [(0, -45)] + [(22.5 * math.sin(t * math.pi / 16), -45 + 11 * (1 - math.cos(t * math.pi / 16))) for t in range(1, 9)]
            prof += (
                [(22.5, 45 - 11)] + [(22.5 * math.cos(t * math.pi / 16), 45 - 11 + 11 * math.sin(t * math.pi / 16)) for t in range(1, 8)] + [(0, 45)]
            )
            turn_about(tanks, prof, c, D(1, 0, 0), 32)
    # Discone booms: 45 degrees each side of -Z on the forward ring, 36 ft 8 in deployed (§2.0.4); the deployed boom is
    # drawn straight out from the ring, the antenna a disc and cone (sizes estimated).
    for theta in (math.radians(225), math.radians(315)):
        out = D(0, math.cos(theta), math.sin(theta))
        root = polar(TANK_R, theta, FAS_TOP - 6)
        knee = root + out * (220 * IN)
        tip = root + out * ((36 * 12 + 8) * IN)
        rod(booms, root, knee, 1.0, 10)
        rod(booms, knee, tip, 0.75, 10)
        turn_about(cones, [(0, 0), (9, 0), (9, 0.5), (0.8, 0.5), (0.8, 2), (6, 14), (0, 14)], tip, out, 24)
    skin.build("FAS_Skin", m["foil"], node)
    inner.build("FAS_InnerWallAndForwardDome", m["foil"], node)
    rings.build("FAS_ForwardRing", m["alloy"], node)
    tanks.build("FAS_OxygenTanks", m["white"], node)
    booms.build("FAS_DisconeBooms", m["alloy"], node)
    cones.build("FAS_DisconeAntennas", m["alloy"], node)


# ------------------------------------------------------------------------------------------------------- airlock


def airlock(node, m) -> None:
    tunnel, trusses, spheres, windows, hatch, radiator, bellows = (MeshBuilder() for _ in range(7))
    # bellows (42.5 in inside diameter) from the dome's hatch ring, then the tunnel and its end rings
    hatch_ring = CYLINDER + math.sqrt(TANK_R**2 - 21**2) - 0.5  # the OWS hatch's ring on the dome's apex
    turn(
        bellows,
        [(21.0, hatch_ring), (23.0, hatch_ring), (23.0, BELLOWS_AFT)]
        + [(23.0 + (1.0 if i % 2 else 0), BELLOWS_AFT + 13 * i / 12) for i in range(1, 13)],
        48,
    )
    turn(tunnel, [(23.0, TUNNEL_AFT), (32.5, TUNNEL_AFT), (32.5, TUNNEL_AFT + 3), (TUNNEL_R, TUNNEL_AFT + 3), (TUNNEL_R, TUNNEL_FWD)], 64)
    # the STS bulkhead, from the tunnel's 65-in ring to the 120-in cylinder, then the cylinder under its shield
    turn(tunnel, [(TUNNEL_R, TUNNEL_FWD), (32.5, TUNNEL_FWD), (STS_R, STS_AFT), (SHIELD_R, STS_AFT)], 96)
    turn(radiator, [(SHIELD_R, STS_AFT), (SHIELD_R, MDA_AFT)], 96)
    # Four STS windows, 8 by 12 in, equally spaced (§2.0.8.3.1): clocking estimated.
    for i in range(4):
        theta = math.radians(45 + 90 * i)
        out = D(0, math.cos(theta), math.sin(theta))
        slab(windows, polar(SHIELD_R + 0.5, theta, STS_AFT + 22), D(1, 0, 0), out.cross(D(1, 0, 0)), (12, 8, 1.6))
    # The EVA hatch, in the +Z/-Y quadrant of the lock compartment (fig. 2.4.4-4): size and clock estimated.
    theta = math.radians(135)
    out = D(0, math.cos(theta), math.sin(theta))
    slab(hatch, polar(TUNNEL_R + 1.0, theta, TUNNEL_AFT + 42 + 40), D(1, 0, 0), out.cross(D(1, 0, 0)), (40, 30, 3))
    # Four trusses, at +Y (1), -Z (2), -Y (3) and +Z (4), each a single point on the FAS's forward ring to the tunnel's
    # shear webs and octagon ring (§2.0.8.3.4); members laid out to show the form, their nodes estimated.
    # (each leg has its own foot, and members meeting at a node differ in radius, so no two lie within a millimetre)
    for deg in (0, 270, 180, 90):
        theta = math.radians(deg)
        for d in (-10, 10):
            t2 = theta + math.radians(d)
            foot = polar(TANK_R - 4, theta + math.radians(d * 0.27), FAS_TOP - 2)
            low, high, top = polar(TUNNEL_R + 2, t2, TUNNEL_FWD - 60), polar(TUNNEL_R + 2, t2, TUNNEL_FWD - 8), polar(SHIELD_R + 2, t2, STS_AFT + 3)
            rod(trusses, foot, high, 1.4, 8)
            rod(trusses, foot, top, 1.2, 8)
            rod(trusses, foot, low, 1.1, 8)
            rod(trusses, high, top, 1.0, 8)
            rod(trusses, low, high, 0.9, 8)
        # Six 40-in nitrogen spheres, two each on trusses 2, 3 and 4 (§2.0.8.3.4, §2.4.4); places estimated.
        if deg != 0:
            for d in (-24, 24):
                c = polar(80, theta + math.radians(d), FAS_TOP + 50)
                turn_about(spheres, [(20 * math.sin(math.pi * k / 16), -20 * math.cos(math.pi * k / 16)) for k in range(17)], c, D(1, 0, 0), 24)
    bellows.build("AM_Bellows", m["alloy"], node)
    tunnel.build("AM_TunnelAndSTS", m["foil"], node)
    radiator.build("AM_STSRadiator", m["white"], node)
    windows.build("AM_STSWindows", m["window"], node)
    hatch.build("AM_EVAHatch", m["white"], node)
    trusses.build("AM_Trusses", m["alloy"], node)
    spheres.build("AM_NitrogenSpheres", m["alloy"], node)


# ----------------------------------------------------------------------------------------------- docking adapter


def docking_adapter(node, m) -> None:
    white, black, tunnels, kit, targets, crosses = (MeshBuilder() for _ in range(6))
    turn(white, [(SHIELD_R, MDA_AFT), (SHIELD_R, CONE_AFT)], 96)
    turn(black, [(SHIELD_R, CONE_AFT), (CONE_TOP_R, CONE_FWD), (PORT_TUNNEL_R, CONE_FWD)], 96)
    ring_depth = 3.2  # the LM-type docking ring below its plane (apollo_docking.lunar)
    turn(tunnels, [(PORT_TUNNEL_R, CONE_FWD), (PORT_TUNNEL_R, MDA_PORT - ring_depth), (16.0, MDA_PORT - ring_depth)], 48)
    # radial port, on -Z (§2.0.7.3)
    out = D(0, 0, -1)
    turn_about(
        tunnels,
        [(PORT_TUNNEL_R, SHIELD_R - 6), (PORT_TUNNEL_R, RADIAL_PLANE - ring_depth), (16.0, RADIAL_PLANE - ring_depth)],
        P(RADIAL_PORT_X),
        out,
        48,
    )
    turn_about(
        tunnels, [(PORT_TUNNEL_R + 3, SHIELD_R - 1), (PORT_TUNNEL_R + 3, SHIELD_R + 1.5), (PORT_TUNNEL_R, SHIELD_R + 1.5)], P(RADIAL_PORT_X), out, 48
    )

    # Axial docking target: base 17.68 in across, standoff cross 11 in above it, 46 in from the port's centre at 75
    # degrees from -Y toward -Z (§2.0.7.3). The radial port's target is placed by estimate 46 in aft of its port.
    def target(base: Vector, normal: Vector, across: Vector) -> None:
        turn_about(targets, [(0, 0), (17.68 / 2, 0), (17.68 / 2, 0.6), (0, 0.6)], base, normal, 32)
        turn_about(crosses, [(0, 0.6), (5.0, 0.6), (5.0, 0.9), (0, 0.9)], base, normal, 24)
        top = base + normal * (11 * IN)
        rod(crosses, base + normal * (0.9 * IN), top, 0.5, 8)
        slab(crosses, top, across, normal.cross(across), (12, 1.0, 1.0))
        slab(crosses, top, normal.cross(across), across, (12, 1.0, 1.2))

    theta = math.radians(180 + 75)
    x_on_cone = CONE_AFT + (SHIELD_R - 46) * math.tan(math.radians(30))
    normal = (D(1, 0, 0) * math.cos(math.radians(30)) + D(0, math.cos(theta), math.sin(theta)) * math.sin(math.radians(30))).normalized()
    target(polar(46, theta, x_on_cone + 0.3), normal, D(1, 0, 0).cross(normal).normalized())
    target(polar(SHIELD_R + 0.2, 3 * math.pi / 2, RADIAL_PORT_X - 46), D(0, 0, -1), D(1, 0, 0))
    # Earth-observation hardware on -Z (fig. 2.0.7-1): the S190 window and cover forward of the radial port, the S194
    # antenna and the S193 dish. Sizes and places estimated.
    theta = math.radians(258)
    o = D(0, math.cos(theta), math.sin(theta))
    turn_about(kit, [(0, 0), (12, 0), (12, 2.5), (0, 2.5)], polar(SHIELD_R, theta, RADIAL_PORT_X + 40), o, 32)
    theta = math.radians(300)
    o = D(0, math.cos(theta), math.sin(theta))
    slab(kit, polar(SHIELD_R + 2.5, theta, MDA_AFT + 50), D(1, 0, 0), o.cross(D(1, 0, 0)), (44, 44, 4))
    theta = math.radians(235)
    o = D(0, math.cos(theta), math.sin(theta))
    c = polar(SHIELD_R + 14, theta, MDA_AFT + 45)
    rod(kit, polar(SHIELD_R, theta, MDA_AFT + 45), c, 2.0, 10)
    turn_about(kit, [(0, 0), (10, 0.8), (22, 3.5), (22, 4.2), (10, 1.6), (0, 0.8)], c, o, 32)
    white.build("MDA_RadiatorShield", m["white"], node)
    black.build("MDA_ForwardCone", m["black"], node)
    tunnels.build("MDA_PortTunnels", m["alloy"], node)
    kit.build("MDA_EarthObservationKit", m["white"], node)
    targets.build("MDA_DockingTargets", m["day-glo"], node)
    crosses.build("MDA_DockingTargetCrosses", m["target"], node)
    # The two drogue ports: frames at the mating planes, +Z (glTF +Y) outboard, each with the LM-type ring and drogue.
    axial = group("MDA_AxialDockingFrame", node)
    axial.location = P(MDA_PORT)
    apollo_docking.ring(axial, "MDA_Axial", m["alloy"])
    apollo_docking.drogue(axial, "MDA_Axial", m["alloy"], m["dark"])
    radial = group("MDA_RadialDockingFrame", node)
    radial.matrix_basis = Matrix.Translation(P(RADIAL_PORT_X, 0, -RADIAL_PLANE)) @ Matrix.Rotation(math.pi / 2, 4, "X")
    apollo_docking.ring(radial, "MDA_Radial", m["alloy"])
    apollo_docking.drogue(radial, "MDA_Radial", m["alloy"], m["dark"])


# --------------------------------------------------------------------------------------------- solar observatory


def atm_point(r: float, phi: float, z: float) -> Vector:
    """About the canister's axis (Skylab Z through X = ATM_X): phi from +X toward +Y."""
    return P(ATM_X + r * math.cos(phi), r * math.sin(phi), z)


def telescope_mount(node, m) -> None:
    frame, shield, canister, boxes, thermal, outriggers = (MeshBuilder() for _ in range(6))
    up = D(0, 0, 1)
    rr = RACK_FLATS / 2 / math.cos(math.pi / 8)  # octagon corner radius
    corners = [math.pi / 8 + k * math.pi / 4 for k in range(8)]
    z0, z1 = ATM_BASE + 4, ATM_BASE + RACK_HIGH - 2
    for k, phi in enumerate(corners):
        nxt = corners[(k + 1) % 8]
        rod(frame, atm_point(rr, phi, z0), atm_point(rr, phi, z1), 1.6, 8)
        for z in (z0, (z0 + z1) / 2, z1):
            rod(frame, atm_point(rr, phi, z), atm_point(rr, nxt, z), 1.4, 8)
        rod(frame, atm_point(rr, phi, z0), atm_point(rr, nxt, (z0 + z1) / 2), 1.0, 6)
    # The thermal shield over the rack's docking-adapter end (TM X-64814, fig. 2-2), an octagon: across flats estimated.
    verts = []
    tr = (RACK_FLATS + 8) / 2 / math.cos(math.pi / 8)
    for z in (ATM_BASE, ATM_BASE + 2):
        verts += [atm_point(tr, phi, z) for phi in corners]
    thermal.add(verts, [tuple(range(7, -1, -1)), tuple(range(8, 16))] + [(i, (i + 1) % 8, 8 + (i + 1) % 8, 8 + i) for i in range(8)])
    # The canister, 7 ft by 10 ft, with the aperture housing at the Sun end through the 14-ft sun shield.
    c = P(ATM_X, 0, 0)
    turn_about(
        canister,
        [(0, ATM_BASE + 14), (42, ATM_BASE + 14), (42, ATM_BASE + 134), (30, ATM_BASE + 136), (30, ATM_TOP - 2), (24, ATM_TOP), (0, ATM_TOP)],
        c,
        up,
        64,
    )
    sz = ATM_BASE + RACK_HIGH
    turn_about(shield, [(34, sz), (SUN_SHIELD_R, sz), (SUN_SHIELD_R, sz + 3), (34, sz + 3), (34, sz)], c, up, 96)
    # Equipment on the rack's faces: control moment gyros, power conditioners, batteries (fig. 2-2): sizes estimated.
    for k in range(8):
        phi = k * math.pi / 4
        out = D(math.cos(phi), math.sin(phi), 0)
        for z, h in ((ATM_BASE + 30, 36), (ATM_BASE + 84, 30)):
            if (k + (z > ATM_BASE + 50)) % 2:
                slab(boxes, atm_point(RACK_FLATS / 2 - 10, phi, z), up, up.cross(out), (h, 40, 14))
    # Four A-frame outriggers from the rack's sides at the Sun end, on +X, -X, +Y and -Y (MSC 04727, §2.0.5.2; the
    # twin-pole sail's base plate went on one of them): length estimated.
    for k in range(4):
        phi = k * math.pi / 2
        tip = atm_point(rr + 40, phi, sz - 10)
        for d in (-0.18, 0.18):
            rod(outriggers, atm_point(rr * math.cos(math.pi / 8) - 1, phi + d, sz - 2), tip, 1.4, 8)
            rod(outriggers, atm_point(rr * math.cos(math.pi / 8) - 1, phi + d, sz - 40), tip, 1.2, 8)
    frame.build("ATM_Rack", m["alloy"], node)
    thermal.build("ATM_ThermalShield", m["white"], node, smooth=False)
    canister.build("ATM_Canister", m["white"], node)
    shield.build("ATM_SunShield", m["white"], node)
    boxes.build("ATM_RackEquipment", m["foil"], node)
    outriggers.build("ATM_Outriggers", m["alloy"], node)


def atm_wings(node, m) -> None:
    """Four wings at 45 degrees to the cluster's axis, each four full panels and a half panel beyond a deployment
    truss (TM X-64814, §7.3.1, fig. 7-20); the truss is drawn as a lattice (estimated)."""
    for k in range(4):
        phi = math.pi / 4 + k * math.pi / 2
        a = D(math.cos(phi), math.sin(phi), 0)
        n = D(0, 0, 1)
        b = n.cross(a)
        wing = group(f"ATM_Wing_{k + 1}", node)
        cells, frames, lines = MeshBuilder(), MeshBuilder(), MeshBuilder()
        root = atm_point(ATM_ROOT, phi, ATM_WING_Z)
        panels_long = 4 * ATM_PANEL + ATM_PANEL / 2
        truss = ATM_WING_LONG - panels_long
        for s in (-1, 1):
            rod(frames, root + b * (s * 20 * IN), root + a * (truss * IN) + b * (s * ATM_WING_WIDE / 2 * IN), 1.0, 6)
            rod(
                frames,
                root + a * (truss * IN) + b * (s * ATM_WING_WIDE / 2 * IN),
                root + a * (ATM_WING_LONG * IN) + b * (s * ATM_WING_WIDE / 2 * IN),
                0.8,
                6,
            )
        rod(frames, root + b * (-20 * IN), root + b * (20 * IN), 1.2, 6)
        at = truss
        for length in [ATM_PANEL] * 4 + [ATM_PANEL / 2]:
            c = root + a * ((at + length / 2) * IN)
            slab(cells, c, a, b, (length - 1.2, ATM_WING_WIDE - 3, 1.0))
            rod(
                frames,
                root + a * ((at + 0.3) * IN) + b * (-ATM_WING_WIDE / 2 * IN),
                root + a * ((at + 0.3) * IN) + b * (ATM_WING_WIDE / 2 * IN),
                0.8,
                6,
            )
            if fine():
                for q in range(1, 4):  # module lines: estimated as quarters
                    slab(lines, c + b * ((q / 4 - 0.5) * (ATM_WING_WIDE - 3) * IN) + n * (0.7 * IN), a, n, (length - 1.6, 0.4, 0.4))
            at += length
        rod(
            frames,
            root + a * ((ATM_WING_LONG - 0.3) * IN) + b * (-ATM_WING_WIDE / 2 * IN),
            root + a * ((ATM_WING_LONG - 0.3) * IN) + b * (ATM_WING_WIDE / 2 * IN),
            0.8,
            6,
        )
        cells.build(f"ATM_Wing_{k + 1}_Cells", m["cells"], wing)
        frames.build(f"ATM_Wing_{k + 1}_Frame", m["frame"], wing)
        if fine():
            lines.build(f"ATM_Wing_{k + 1}_ModuleLines", m["frame"], wing)


def deployment_assembly(node, m) -> None:
    """The ATM deployment assembly as it stood after the 90-degree swing (MSC 04727, §2.0.6, fig. 2.0.6-1): lower
    truss bipods on the shroud's forward ring, the trunnions on the rack's near side, the latch under it. Member layout
    estimated to show its form."""
    mb = MeshBuilder()
    feet = [polar(TANK_R - 3, math.radians(d), FAS_TOP - 1) for d in (40, 65, 115, 140)]
    trunnions = [P(ATM_X - RACK_FLATS / 2 - 2, s * 62, ATM_BASE - 4) for s in (-1, 1)]
    latch = P(ATM_X + RACK_FLATS / 2 - 8, 0, ATM_BASE - 8)
    # bipods: each foot to the trunnion on its side, the two middle feet to both (members meeting at a node differ in
    # radius, so no two lie within a millimetre of each other)
    for f, t, r in ((0, 1, 1.5), (1, 1, 1.3), (1, 0, 1.6), (2, 1, 1.6), (2, 0, 1.3), (3, 0, 1.5)):
        rod(mb, feet[f], trunnions[t], r, 8)
    rod(mb, trunnions[0], trunnions[1], 1.4, 8)
    for t in trunnions:
        rod(mb, t, latch, 1.2, 8)
    rod(mb, latch, latch + D(0, 0, 1) * (7.6 * IN), 1.7, 8)
    mb.build("DA_Trusses", m["alloy"], node)


# ----------------------------------------------------------------------------------------------------- sunshades


def parasol(node, m) -> None:
    """The JSC parasol: a 24 by 22 ft canopy on four telescoping rods from a centre post through the +Z scientific
    airlock (TM X-64814, §10.4; NASA S73-26380). Orange nylon to the Sun, aluminized Mylar to the workshop (TM
    X-64813, §2.2.3). It did not open to its full rectangle; the sag drawn is estimated."""
    top, under, rods = MeshBuilder(), MeshBuilder(), MeshBuilder()
    half_x, half_y = 24 * 12 / 2, 22 * 12 / 2
    centre_z = 150.0

    def surface(u: float, v: float, lift: float) -> Vector:
        x, y = u * half_x, v * half_y
        z = centre_z - 0.0008 * y * y - 0.0002 * x * x - 4 * abs(u * v) + lift
        return P(SAL_X + x, y, z)

    us = [i / 12 * 2 - 1 for i in range(13)]
    top.grid(lambda u, v: surface(u, v, 0.08), us, us)
    under.grid(lambda u, v: surface(u, v, -0.08), us, us, flip=True)
    hub = P(SAL_X, 0, centre_z + 3)
    rod(rods, polar(TANK_R, math.pi / 2, SAL_X), hub, 1.0, 8)
    for su in (-1, 1):
        for sv in (-1, 1):
            pts = [surface(su * t / 6, sv * t / 6, 1.5) for t in range(7)]
            for p, q in zip(pts, pts[1:], strict=False):
                rod(rods, p, q, 0.7, 6)
    top.build("Parasol_Canopy", m["orange"], node)
    under.build("Parasol_Underside", m["mylar"], node)
    rods.build("Parasol_Rods", m["alloy"], node)


def sail(node, m) -> None:
    """The MSFC twin-pole sail erected by Garriott and Lousma on 6 August 1973: two 55-ft poles of eleven sections from
    a base plate on the ATM's near outrigger, the sail hoisted between them over the parasol (TM X-64814, §10.4; TM
    X-64813, fig. 2.2.3-43: 22 ft 3 in across at its aft edge, 24 ft 5 in long). White S-13G paint to the Sun.
    The poles' line and the sail's set are estimated from that figure."""
    poles, cloth, under = MeshBuilder(), MeshBuilder(), MeshBuilder()
    rr = RACK_FLATS / 2 / math.cos(math.pi / 8)
    base = atm_point(rr + 40, math.pi, ATM_BASE + RACK_HIGH - 10)
    length = 55 * 12
    half = (22 * 12 + 3) / 2
    ends = []
    for s in (-1, 1):
        drop = 62.0
        dx = math.sqrt(length**2 - half**2 - drop**2)
        bx = ATM_X - (rr + 40)
        end = P(bx - dx, s * half, ATM_BASE + RACK_HIGH - 10 - drop)
        ends.append(end)
        rod(poles, base, end, 0.8, 8)
    slant = 24 * 12 + 5
    near = [e + (base - e).normalized() * (slant * IN) for e in ends]

    def at(u: float, v: float, lift: float) -> Vector:
        left = ends[0].lerp(near[0], u)
        right = ends[1].lerp(near[1], u)
        p = left.lerp(right, v)
        sag = 10 * math.sin(math.pi * v) * (1 - 0.5 * u)
        return p - D(0, 0, 1) * ((sag - lift) * IN)

    us = [i / 10 for i in range(11)]
    cloth.grid(lambda u, v: at(u, v, 0.08), us, us)
    under.grid(lambda u, v: at(u, v, -0.08), us, us, flip=True)
    rod(poles, base - D(0, 0, 1) * (2 * IN), base + D(0, 0, 1) * (3 * IN), 4.0, 12)
    poles.build("Sail_Poles", m["alloy"], node)
    cloth.build("Sail_Cloth", m["sail"], node)
    under.build("Sail_Underside", m["mylar"], node)


# ---------------------------------------------------------------------------------------------------------- build


def build(visit: int) -> str:
    if visit not in (2, 3, 4):
        raise ValueError(f"no visit {visit}: 2, 3 or 4")
    m = paints()
    workshop(group("OrbitalWorkshop"), m)
    shield_remnant(group("MeteoroidShieldRemnant"), m, visit)
    solar_wing(group("WorkshopSolarWing"), m, visit)
    lost_wing(group("LostSolarWing"), m)
    instrument_unit(group("InstrumentUnit"), m)
    airlock_shroud(group("FixedAirlockShroud"), m)
    airlock(group("AirlockModule"), m)
    docking_adapter(group("DockingAdapter"), m)
    telescope_mount(group("TelescopeMount"), m)
    atm_wings(group("TelescopeSolarArray"), m)
    deployment_assembly(group("DeploymentAssembly"), m)
    if visit >= 3:
        parasol(group("Parasol"), m)
    if visit >= 4:
        sail(group("TwinPoleSail"), m)
    length = (MDA_PORT - X_AFT) * IN
    span = 2 * (ATM_ROOT + ATM_WING_LONG) * IN
    return f"Skylab as found by the visit-{visit} crew: {length:.2f} m radiator to axial docking plane, {span:.1f} m across the ATM wings"
