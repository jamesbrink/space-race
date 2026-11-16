"""The Target Docking Adapter: McDonnell's docking collar, which a Gemini's nose went into.

Shared by what carried one: the Gemini Agena Target Vehicle (agena_target_vehicle.py) and the Augmented Target Docking
Adapter (atda.py). Dimensions are inches. A height here is measured forward from the adapter's aft face, where it is
bolted to what carries it (GATV station 229.50, on an Agena; the equipment section's forward ring, on the ATDA): the
adapter's own stations run the same way from 0.030 there.

Round the adapter the documents measure from its top, which is where the V-shaped notch in its cone is and where the
spacecraft's own top (TY, its index bar) comes when the two are docked: the Agena's -Z axis, 0 degrees, the angles
running "clockwise (looking forward)" through +Y at 90 degrees. `Axis` turns such an angle, a distance from the
adapter's axis and a height into a place in the model, where the target stands on its tail beside the launch vehicle.

See ./target-docking-adapter.md for what each number rests on.

Top-level node: TargetDockingAdapter.
"""

from __future__ import annotations

import math

from mathutils import Matrix, Vector

import srlib
from mercury_capsule import chamfered
from srlib import IN, TAU, MeshBuilder, deg, frame, group, interior, material, prof

RADIUS = 30.0  # 60.00 in across, where it meets the Agena's auxiliary rack: documented (Lockheed's catalog, Figure 13-10)
# the adapter's shell, from its aft face to the plane the ascent shroud is clamped at: GATV station 229.50 to 205.705
# (Gemini VIII mission report, Figure 3.0-2(b); Launch Systems Final Report, Figure III.C-2): documented
SHELL = 229.50 - 205.705
# where the shroud's own base comes: 117.00 in aft of its nose at station 90.33 (the same figures), which is 22.17 in up
# the shell. Derived; McDonnell's drawing of the ATDA gives the same 22.17 (Technical Summary, Figure 66: 44.40 less 22.23)
SHROUD_BASE = 229.50 - (90.33 + 117.00)
# the docking cone's lip, forward of the aft face. It moves: "EXTENDED" at GATV station 181.875 and "RETRACTED" at
# 187.875, six inches (Launch Systems Final Report, Figure III.C-2): documented. An Agena's waits for its ship run out;
# the ATDA's is as McDonnell drew it, 44.40 in (Technical Summary, Figure 66)
LIP_EXTENDED = 229.50 - 181.875
LIP_RETRACTED = 229.50 - 187.875
LIP_ATDA = 44.40
# the cone itself: not dimensioned in anything read. Its mouth's radius is scaled on the Agena's 60 in in NASA S66-25782
# (the mouth is 52.6 in across there, and 55 on two schematic drawings: 54 is taken). Its depth and its throat are
# derived: docked and drawn in, the ship's forward face (Z233.97) is 19.53 in forward of the adapter's aft face (spacecraft
# Z253.50 is that face: Gemini VIII mission report, Figure 3.0-2(b)), which is 22.1 in inside the retracted lip; and the
# ship's nose is 30.68 in across there. The throat's clearance round it is a guess
MOUTH_R = 27.0
DEPTH = 22.0
THROAT_R = 16.6
SKIN = 1.3  # between the cone's two skins ("double-skinned, ring and rib stiffened": Technical Summary, p. 323): a guess
# the V-shaped notch in the top of the cone, "with a slot at the bottom of the V" (SEDR 300 volume 2, p. 14-5): half its
# width at the lip, how deep the V is, the slot's half-width (the index bar is 1.2 in across) and how far the slot runs
# on. Scaled from the Technical Summary's Figure 60 and NASA S66-25784: estimated
NOTCH = (4.6, 9.5, 0.85, 7.0)
BOOM = 85.0  # the L-band dipole's boom: "rises to a height of approximately 85 inches" (SEDR 300 volume 2, p. 15-20): documented
LATCHES = (deg(180), deg(60), deg(-60))  # the three latch hooks: where the ship's receptacles come, the lowest under the notch's opposite


class Axis:
    """A vehicle standing on its tail beside the launch vehicle: where its axis is in the model (inches), the model's
    height of its datum, and which way its top (0 degrees) faces in the model (radians from the model's +X)."""

    def __init__(self, at: tuple[float, float], base: float, top: float) -> None:
        self.at, self.base, self.top = Vector((at[0], at[1], 0.0)), base, top

    def radial(self, a: float) -> Vector:
        """The unit vector out from the axis, `a` round from the vehicle's top."""
        return Vector((math.cos(self.top + a), math.sin(self.top + a), 0.0))

    def p(self, a: float, r: float, h: float) -> Vector:
        """A point: round from the top, from the axis, above the datum. Inches in, metres out."""
        return (self.at + self.radial(a) * r + Vector((0.0, 0.0, self.base + h))) * IN

    def m(self, h: float = 0.0, a: float = 0.0) -> Matrix:
        """A frame on the axis at that height: its x toward `a` round from the top, its z forward along the vehicle."""
        return Matrix.Translation((self.at + Vector((0.0, 0.0, self.base + h))) * IN) @ Matrix.Rotation(self.top + a, 4, "Z")

    def on(self, a: float, r: float, h: float, off: float = 0.0) -> Matrix:
        """A frame on a wall `r` from the axis: its x forward along the vehicle, its y round it, its z out of the wall."""
        n = self.radial(a)
        t = Vector((-n.y, n.x, 0.0))
        m = Matrix((Vector((0.0, 0.0, 1.0)), -t, n)).transposed().to_4x4()
        m.translation = self.p(a, r + off, h)
        return m

    def up(self, h: float) -> Axis:
        """The same axis with its datum that much higher."""
        return Axis((self.at.x, self.at.y), self.base + h, self.top)


def materials() -> dict:
    """What a target is made of. A name already in the file (the spacecraft's, built first) is used as it is."""
    import bpy

    def m(name: str, *args, **kw):
        return bpy.data.materials.get(name) or material(name, *args, **kw)

    return {
        "alclad": m("aluminium-alclad", (0.66, 0.67, 0.68), 1.0, 0.34),
        "aluminium": m("aluminium", (0.62, 0.62, 0.61), 1.0, 0.45),
        "structure": m("aluminium-structure", (0.55, 0.56, 0.55), 1.0, 0.5, double_sided=True),
        "steel": m("steel", (0.36, 0.36, 0.37), 1.0, 0.4),
        "black": m("paint-target-black", (0.02, 0.02, 0.022), 0.0, 0.5),
        "white": m("paint-target-white", (0.88, 0.88, 0.85), 0.0, 0.55),
        "shield": m("paint-shield-white", (0.88, 0.88, 0.85), 0.0, 0.55, double_sided=True),
        "cone": m("cone-mooring-surface", (0.17, 0.075, 0.04), 0.7, 0.32),
        "equipment": m("equipment-grey", (0.13, 0.14, 0.15), 0.3, 0.55),
        "panel": m("paint-cabin-grey", (0.30, 0.31, 0.32), 0.1, 0.6),
        "beacon": m("beacon-lens", (0.78, 0.80, 0.82), 0.0, 0.25),
        "green": m("lens-green", (0.10, 0.55, 0.22), 0.0, 0.25),
        "red": m("lens-red", (0.62, 0.07, 0.06), 0.0, 0.25),
        "amber": m("lens-amber", (0.75, 0.48, 0.08), 0.0, 0.25),
        "rod": m("steel-rod", (0.72, 0.72, 0.70), 1.0, 0.3),
        "tank": m("titanium-tank", (0.50, 0.49, 0.47), 1.0, 0.35),
        "nozzle": m("nozzle", (0.09, 0.085, 0.08), 0.9, 0.55, double_sided=True),
        "polished": m("aluminium-polished", (0.78, 0.79, 0.80), 1.0, 0.22),
        "silver": m("insulation-silver", (0.80, 0.80, 0.78), 1.0, 0.32, double_sided=True),
        "gold": m("insulation-gold", (0.62, 0.45, 0.16), 1.0, 0.38, double_sided=True),
        "fibreglass": m("fibreglass-shroud", (0.86, 0.86, 0.82), 0.0, 0.6),
        "liner": m("fibreglass-shroud-inside", (0.05, 0.05, 0.055), 0.0, 0.8),
        "placard": m("paint-placard-red", (0.62, 0.10, 0.08), 0.0, 0.55),
    }


def say(obj, label: str, about: str):
    """What a thing says of itself when pointed at."""
    obj["label"], obj["about"] = label, about
    return obj


def rivets(mb: MeshBuilder, ax: Axis, r: float, h: float, n: int, off: float = 0.0) -> None:
    """A ring of fasteners round a wall."""
    for i in range(n):
        a = TAU * (i + 0.5) / n + off
        mb.disc(ax.p(a, r, h), ax.radial(a), 0.22 * IN, 0.08 * IN)


def ring(mb: MeshBuilder, ax: Axis, r0: float, r1: float, h0: float, h1: float, segs: int = 96) -> None:
    """A ring of rectangular section about the axis."""
    mb.lathe(prof([(r0, h0), (r1, h0), (r1, h1), (r0, h1), (r0, h0)]), segs, matrix=ax.m())


# what a cutaway opens: the shell with its inner face and what lies flush in it, and the cone
SHELLS = ("TDA_Shell", "TDA_ShellInside", "TDA_Fasteners", "TDA_SpiralAntennas", "TDA_TransponderCover", "TDA_Cone", "TDA_ConeOutside", "TDA_ConeLip")


def build(
    ax: Axis, M: dict, lip: float = LIP_EXTENDED, cone_black: bool = True, s10: bool = False, discharge: bool = True, whose: str = "the Agena"
) -> None:
    """The adapter with its aft face at the axis's datum. `lip`: how far forward of that its cone's lip stands.
    `cone_black`: the cone's outside black, as an Agena's was, or painted aluminium, as the ATDA's. `s10`: the
    micrometeorite package (experiment S-10) on its skin. `discharge`: the three static discharge fingers in the cone,
    which the last adapters flew without. `whose`: what it is bolted to, for its words."""
    g = group("TargetDockingAdapter")
    # what a crew came to look for and to meet, each a part of its own: the cone, the latches in its throat, the
    # panel over its notch, the radar's transponder with its antennas, and the two flashing lights
    g_cone, g_latch, g_display = group("DockingCone"), group("MooringLatches"), group("StatusDisplay")
    g_radar, g_lights = group("TargetTransponder"), group("AcquisitionLights")
    fine = srlib.DETAIL >= 0.5
    shell, bolts, struct = MeshBuilder(), MeshBuilder(), MeshBuilder()
    shell.lathe(prof([(RADIUS, 0.0), (RADIUS, SHELL)]), 96, matrix=ax.m())
    for h in (1.8, SHELL / 2, SHELL - 2.0):
        rivets(bolts, ax, RADIUS, h, 72)
    for k in range(24):  # the skin's lengthwise seams
        a = TAU * k / 24
        for i in range(7):
            bolts.disc(ax.p(a, RADIUS, 2.6 + i * (SHELL - 5.2) / 6), ax.radial(a), 0.2 * IN, 0.07 * IN)
    ring(struct, ax, RADIUS - 1.6, RADIUS + 0.35, SHELL - 0.9, SHELL)  # the ring the shroud was clamped to
    ring(struct, ax, RADIUS - 1.8, RADIUS + 0.2, 0.0, 0.8)  # and the ring it is bolted to its carrier by
    # the shell's inner face, and a bulkhead across its aft end, which is assumed: nothing read draws what closes the
    # adapter behind the cone, and the photograph taken into the cone (NASA S66-25784) shows bare metal there
    inner = MeshBuilder()  # (its own mesh: it is cut open with the shell)
    inner.lathe(prof([(RADIUS - 0.3, 0.8), (RADIUS - 0.3, SHELL - 0.9)]), 96, matrix=ax.m(), flip=True)
    inner.build("TDA_ShellInside", M["structure"], g, sharp_angle=None)
    struct.lathe(prof([(RADIUS - 1.8, 0.9), (0.0, 0.9)]), 64, matrix=ax.m())
    say(
        shell.build("TDA_Shell", M["alclad"], g, sharp_angle=None),
        "Adapter shell",
        f"The adapter's own structure: a short cylinder of bare aluminium, five feet across, bolted to {whose}. Everything "
        "else hangs in it: the cone on its dampers, the motor that draws the cone in, the radar transponder, the lights. "
        "Its diameter and its length are documented; that it was bare metal is the report on the next flight's.",
    )
    bolts.build("TDA_Fasteners", M["aluminium"], g)

    # the cone: two skins from the lip down to the throat, with the notch in the top
    cone, outside, lipm = MeshBuilder(), MeshBuilder(), MeshBuilder()
    half, vee, slot, run = NOTCH
    throat = lip - DEPTH

    def gap(d: float) -> float:
        """Half the notch's width, `d` inches in from the lip."""
        return half - (half - slot) * min(1.0, d / vee) if d <= vee + run else 0.0

    def radius(d: float) -> float:
        return MOUTH_R - (MOUTH_R - THROAT_R) * d / DEPTH

    slant = math.atan2(MOUTH_R - THROAT_R, DEPTH)
    rows, round_ = (22, 96) if srlib.DETAIL >= 1.0 else (max(4, round(22 * srlib.DETAIL)), srlib._segs(96))  # (a lower level is seen from far off)
    ds = [DEPTH * i / rows for i in range(rows + 1)]
    ds = sorted({*ds, vee, vee + run, vee + run + 0.01})
    us = [i / round_ for i in range(round_ + 1)]

    def skin_at(u: float, d: float, off: float) -> Vector:
        w = gap(d) / radius(d)
        a = w + (TAU - 2 * w) * u
        return ax.p(a, radius(d) + off * math.cos(slant), lip - d - off * math.sin(slant))

    cone.grid(lambda u, d: skin_at(u, d, 0.0), us, ds)  # the mooring surface, which faces the axis
    outside.grid(lambda u, d: skin_at(u, d, SKIN), us, ds, flip=True)
    # the lip, rolled over between the two skins, and the notch's two edges
    lipm.grid(lambda u, k: skin_at(u, 0.0, SKIN * k / 4) + Vector((0.0, 0.0, 0.35 * math.sin(math.pi * k / 4))) * IN, us, range(5), flip=True)
    for u in (0.0, 1.0):
        edge = [d for d in ds if d <= vee + run]
        lipm.grid(lambda k, d, u=u: skin_at(u, d, SKIN * k), (1, 0) if u == 0.0 else (0, 1), edge)
    foot = [skin_at(u, vee + run, SKIN * k) for u in (0.0, 1.0) for k in (0, 1)]
    lipm.add([tuple(p) for p in foot], [(0, 2, 3, 1)])
    # the throat: a short collar the ship's nose seats in, and the ring the dampers pull on
    cone.lathe(prof([(THROAT_R, throat - 3.0), (THROAT_R, throat)]), 96, matrix=ax.m(), flip=True)
    outside.lathe(prof([(THROAT_R + SKIN, throat - 3.0), (THROAT_R + SKIN, throat - SKIN * math.sin(slant))]), 96, matrix=ax.m())
    ring(struct, ax, THROAT_R, THROAT_R + 3.2, throat - 3.6, throat - 3.0)
    say(
        cone.build("TDA_Cone", M["cone"], g_cone, sharp_angle=None),
        "Docking cone",
        "What the spacecraft's nose goes into: a double-skinned cone, floating on seven dampers so that it gives when it "
        "is struck. In its top is a V-shaped notch with a slot at the bottom. The ship's index bar goes into the V and "
        "is steered down it into the slot, which turns the ship the last few degrees; then three hooks in the throat "
        "drop behind three fittings on the ship's nose, and a motor draws cone and ship six inches in until the cone "
        "is hard against the adapter. Its six inches of travel are documented. No drawing read gives its size: the "
        "mouth is scaled from a photograph taken as Gemini VIII came up to it, and its depth is worked from where the "
        "ship's nose is known to end up.",
    )
    outside.build("TDA_ConeOutside", M["black" if cone_black else "aluminium"], g_cone, sharp_angle=None)
    lipm.build("TDA_ConeLip", M["white"], g_cone, sharp_angle=40)

    # the three latch hooks in the throat, and the three fingers that bleed off any charge before metal meets metal
    hooks, fingers = MeshBuilder(), MeshBuilder()
    for a in LATCHES:
        chamfered(hooks, (2.2, 3.0, 2.6), ax.on(a, THROAT_R + 0.3, throat + 2.2) @ Matrix.Rotation(-slant, 4, "Y"), 0.25)
        chamfered(hooks, (1.2, 1.6, 0.8), ax.on(a, THROAT_R - 1.2, throat + 1.2), 0.15)
    for a in (deg(95), deg(215), deg(335)):
        d = 5.0
        fingers.tube(skin_at(a / TAU, d, -0.1), ax.p(a + 0.25, radius(d) - 9.0, lip - d - 2.0), 0.16 * IN, 6)
    say(
        hooks.build("TDA_LatchHooks", M["steel"], g_latch, sharp_angle=35),
        "Mooring latch hooks",
        "Three spring-loaded hooks in the throat of the cone. The ship's nose pushes them aside as it comes in, and they "
        "drop behind the three fittings on it: that is the moment of docking, and the cone's motor does the rest. To let "
        "the ship go the hooks are drawn back. Their number is documented; their places follow from the ship's "
        "fittings, and their form is estimated.",
    )
    if discharge:
        say(
            fingers.build("TDA_DischargeFingers", M["rod"], g_cone, sharp_angle=35),
            "Static discharge fingers",
            "Three flexible metal fingers standing in from the cone. Two vehicles that have been in orbit apart may carry "
            "different charges, and these touch the ship's nose first, so that whatever passes between the two passes "
            "here. Their number is documented; their places and length are scaled from a photograph.",
        )

    # outside the cone, on the adapter: the status display over the notch, the two flashing lights, the antennas, the boom
    display, lamps, lens = MeshBuilder(), MeshBuilder(), MeshBuilder()
    top = SHELL + 0.4
    for k, wide in ((-1, 6.0), (0, 7.0), (1, 6.0)):  # three panels, the middle one riding on a damper
        a = k * deg(15)
        here = ax.m(top + 2.0, a) @ Matrix.Translation(Vector((RADIUS - 3.4, 0.0, 0.0)) * IN)
        chamfered(display, (4.6, wide, 3.2), here, 0.25)
        for i in range(3):  # its lamps and dials, looking forward at the crew
            for j in (-1, 1):
                lens.lathe(
                    prof([(0.55, 0.0), (0.55, 0.2), (0.0, 0.3)]),
                    10,
                    matrix=here @ Matrix.Translation(Vector((j * 1.1, (i - 1) * wide * 0.3, 1.6)) * IN),
                )
    say(
        display.build("TDA_StatusDisplay", M["panel"], g_display, sharp_angle=35),
        "Status display panel",
        f"Three small panels over the notch, facing the crew of a ship that is docked or about to be: nine lamps, two "
        f"clocks and a dial, which say what {whose} is doing. Whether its engines are armed, how much burning time and "
        "attitude gas it has left, whether the cone is rigid. The crew could command the target by radio and then "
        "read here that it had obeyed. They could not make it out from more than about fifty feet. What it showed and "
        "that it stood over the notch are documented; the panels' size is estimated.",
    )
    for a in (deg(-42), deg(138)):  # the acquisition lights: top left and bottom right, as the crew see them
        base = ax.p(a, RADIUS - 1.6, SHELL + 0.2)
        lamps.lathe(prof([(0.0, 0.0), (1.9, 0.0), (1.9, 1.6), (1.5, 1.9)]), 16, matrix=frame(base, (0.0, 0.0, 1.0)))
        lens.lathe(prof([(1.45, 1.9), (1.3, 3.2), (0.8, 3.9), (0.0, 4.1)]), 16, matrix=frame(base, (0.0, 0.0, 1.0)))
    # the two L-band spiral antennas, flush in the skin: one by the boom, one on the far side
    spirals = MeshBuilder()
    for a in (deg(24), deg(204)):
        at = ax.on(a, RADIUS, SHELL * 0.5)
        lamps.lathe(prof([(3.7, -0.4), (3.7, 0.3), (3.3, 0.3)]), 28, matrix=at)
        spirals.lathe(prof([(3.3, 0.22), (0.0, 0.22)]), 28, matrix=at)
    say(
        spirals.build("TDA_SpiralAntennas", M["white"], g_radar, sharp_angle=35),
        "L-band spiral antennas",
        "Two flat spiral antennas let into the adapter's skin on opposite sides, through which the transponder hears "
        "the ship's radar and answers it. That there were two, fed together, is documented; one is by the boom and "
        "one low on the far side, as McDonnell's drawing has them, and their size is the spacecraft's own pod's.",
    )
    # the transponder's cover, on the side: white
    cover = MeshBuilder()
    for i in range(8):
        a = deg(78) + deg(26) * i / 7
        cover.add(
            [tuple(ax.p(a, RADIUS + 0.22, SHELL * 0.18)), tuple(ax.p(a, RADIUS + 0.22, SHELL * 0.78))],
            [],
        )
    n = len(cover.verts) // 2
    cover.faces.extend((2 * i, 2 * i + 2, 2 * i + 3, 2 * i + 1) for i in range(n - 1))
    say(
        cover.build("TDA_TransponderCover", M["white"], g_radar, sharp_angle=None),
        "Transponder cover",
        "Behind this white panel is the other half of the ship's radar: a transponder, which hears the radar's call "
        "and answers on its own frequency, so that the ship can tell the answer from an echo and time it. It answered "
        "through two flat spiral antennas in the adapter's skin and a dipole on a boom. That it was under a white "
        "cover on the adapter's side is documented; which side, and the cover's size, are not, and are a guess.",
    )
    say(
        lens.build("TDA_Lights", M["beacon"], g_lights, sharp_angle=35),
        "Acquisition lights",
        "Two flashing lights at the edge of the adapter, at the top left and the bottom right as an approaching crew "
        "see them: xenon lamps for finding the target by in the dark, seen as a star long before anything else of it "
        "is. When the cone is drawn in they stand clear of its edge. That there were two, and where, are documented; "
        "their form is estimated.",
    )
    lamps.build("TDA_LightHousings", M["aluminium"], g_lights, sharp_angle=35)

    # the L-band dipole on its boom, run out from the top of the adapter once the shroud had gone
    boom, spiral = MeshBuilder(), MeshBuilder()
    foot = ax.p(0.0, RADIUS - 0.6, 3.4)
    boom.tube(foot, ax.p(0.0, RADIUS + BOOM - 9.0, 3.4), 0.42 * IN, 10)
    boom.lathe(prof([(0.0, 0.0), (2.6, 0.0), (2.6, 9.0), (0.0, 9.0)]), 16, matrix=frame(ax.p(0.0, RADIUS + BOOM - 9.0, 3.4), ax.radial(0.0)))
    boom.lathe(prof([(1.6, -0.3), (1.6, 0.5), (0.45, 0.5)]), 14, matrix=frame(ax.p(0.0, RADIUS, 3.4), ax.radial(0.0)))  # the port it comes out of
    turns, per = 7, 10 if srlib.DETAIL >= 1.0 else 6
    span = BOOM - 22.0
    pts = [
        ax.p(0.0, RADIUS + 8.0 + span * i / (turns * per), 3.4)
        + (Vector((0.0, 0.0, 1.0)) * math.cos(TAU * i / per) + ax.radial(math.pi / 2) * math.sin(TAU * i / per)) * (2.2 * IN)
        for i in range(turns * per + 1)
    ]
    if fine:
        for p0, p1 in zip(pts, pts[1:]):
            spiral.tube(p0, p1, 0.2 * IN, 6, caps=False)
    say(
        boom.build("TDA_DipoleBoom", M["rod"], g_radar, sharp_angle=35),
        "L-band dipole antenna",
        "The transponder's third antenna, on a boom that a motor runs out of the top of the adapter when the shroud has "
        "gone: it stands about 85 in off the skin. The two spiral antennas cannot see a ship that is off to one side, "
        "and this one covers what they miss. Its height is documented; the form of the elements wound round it is "
        "drawn from the photographs Gemini VIII's crew took.",
    )
    if spiral.verts:
        spiral.build("TDA_DipoleElements", M["white"], g_radar, sharp_angle=None)

    if s10:  # experiment S-10: a hinged package on the skin under a fairing, in line with the top acquisition light
        pack = MeshBuilder()
        at = ax.on(deg(-42), RADIUS, SHELL * 0.55)
        chamfered(pack, (8.0, 6.0, 1.6), at @ Matrix.Translation(Vector((0.0, 0.0, 0.55)) * IN), 0.2)
        chamfered(pack, (3.2, 6.6, 1.0), at @ Matrix.Translation(Vector((-5.0, 0.0, 0.3)) * IN), 0.3)  # its fairing, aft of it
        pack.tube(at @ (Vector((-2.4, 3.1, 1.2)) * IN), at @ (Vector((2.4, 3.1, 1.2)) * IN), 0.25 * IN, 8)  # its hinge
        say(
            pack.build("TDA_MicrometeoriteCollector", M["aluminium"], g, sharp_angle=35),
            "Micrometeorite collector",
            "Experiment S-10: a flat package hinged like a book, with eight polished plates inside of metal, plastic and "
            "glass. It went up shut. A man from the spacecraft was to come over, open it, and leave it open to the dust "
            "of space for a later crew to bring home. That it was on the adapter's skin under a fairing, in line with the "
            "upper acquisition light, is documented; its size is a guess.",
        )

    if interior():
        # behind the cone: the seven dampers, three across and four along, in three sets a third of a turn apart; the
        # motor that draws the cone in; the transponder; the two approach lights that shine through the cone
        damp, kit = MeshBuilder(), MeshBuilder()

        def damper(p0: Vector, p1: Vector) -> None:
            mid = p0 + (p1 - p0) * 0.55
            damp.tube(p0, mid, 1.1 * IN, 12)
            damp.tube(mid, p1, 0.5 * IN, 8)

        for a, along in ((0.0, (-0.26, 0.26)), (deg(120), (0.0,)), (deg(240), (0.0,))):
            for da in along:  # a longitudinal one: from the cone's ring back to the adapter's aft ring
                damper(ax.p(a + da, THROAT_R + 2.4, throat - 3.6), ax.p(a + da, RADIUS - 3.0, 1.6))
            damper(ax.p(a - 0.45, THROAT_R + 2.6, throat - 2.0), ax.p(a + 0.5, RADIUS - 1.9, throat - 1.2))  # the lateral one
        chamfered(kit, (9.0, 6.0, 6.0), ax.on(deg(180), RADIUS - 7.0, 9.0), 0.4)  # the mooring drive's power unit
        kit.tube(ax.p(deg(180), RADIUS - 7.0, 9.0), ax.p(deg(180), THROAT_R + 2.0, throat - 3.2), 0.7 * IN, 10)
        chamfered(kit, (12.0, 9.0, 5.0), ax.on(deg(91), RADIUS - 3.6, SHELL * 0.48), 0.4)  # the transponder, behind its cover
        for a in (deg(150), deg(210)):
            kit.lathe(prof([(0.0, 0.0), (1.4, 0.0), (1.4, 2.4), (1.0, 2.8)]), 12, matrix=frame(ax.p(a, RADIUS - 5.0, SHELL - 6.0), (0.0, 0.0, 1.0)))
        chamfered(kit, (4.0, 3.2, 3.2), ax.on(deg(6), RADIUS - 3.2, 3.4), 0.3)  # the boom's extension motor
        say(
            damp.build("TDA_Dampers", M["aluminium"], g, sharp_angle=35),
            "Cone dampers",
            "Seven dampers hold the cone off the adapter: four along the vehicle, to take the push of a ship arriving at "
            "up to a foot and a half a second, and three across it, to take a ship that arrives off centre. They are in "
            "three sets a third of a turn apart, the set behind the notch having one more than the others. Their "
            "number and arrangement are documented; their size and form are estimated.",
        )
        say(
            kit.build("TDA_Equipment", M["equipment"], g, sharp_angle=35),
            "Mooring drive and transponder",
            "What is in the adapter behind the cone: the motor and linkage that draw the cone in against the adapter "
            "once the hooks have caught and push it out again to let the ship go; the radar transponder; the motor "
            "that runs the dipole's boom out; and two lamps that shine through the back of the cone to light it for "
            "the last few feet. What is there is documented; every form and place here is a guess.",
        )
    struct.build("TDA_Structure", M["structure"], g, sharp_angle=30)
