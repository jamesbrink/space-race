"""Capsule No. 11's cabin (Liberty Bell 7, MR-4): its own fit of what mercury_cabin.py builds.

What was No. 7's and No. 11's alike is called from there: the lining and its frames, the couch, the
restraints, the two controllers, the stowage, the periscope's display, the attitude indicator, the
clock, the round instruments' faces. What was No. 11's own is here: the panel as rearranged for this
flight, with its Earth-path indicator and the control fuel gauge on the main panel; the left console
and its column of sequence lights; the window's inner frame as it stands into the cabin; the
explosive hatch's inner face with its plunger.

The panel is Hammack and Heberlig's Figure 6, "Main instrument panel and consoles for MR-4
spacecraft" (the same drawing is Figure 2-3 of Results of the Second U.S. Manned Suborbital Space
Flight): a flattened layout, not a dimensioned drawing. Places are measured off it in its own pixels
(the scan at 400 to the inch, counted from the corner (1400, 850) of its main panel's part) and
scaled once, by the periscope's display, which is the one length documented. Dimensions are inches.
The flight's spacecraft.md ("Cabin") says what each number rests on.
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector

import mercury_cabin as mc
from mercury_cabin import BLACK, INK, WHITE, Cabin, Region, Sheet, clock_xy, fuse, plane, round_dial, telelight, toggle
from mercury_capsule import Skin, _reach, outline, trapezoid
from srlib import IN, TAU, MeshBuilder, Surf, interior

# ------------------------------------------------------------------ the fit of capsule 11

FIG_C = (692.0, 1063.0)  # the middle of the periscope's display in the figure
S = 8.0 / 510.0  # inches to a pixel: the display's glass is 510 px across there, and 8 in (Hammack and Heberlig, p. 5)


def fig(px: float, py: float) -> tuple[float, float]:
    """A point of Figure 6, in panel inches from the middle of the periscope's display."""
    return ((px - FIG_C[0]) * S, (FIG_C[1] - py) * S)


# The window's opening through the pressure vessel and the lining: wider than the inner panes, because the well
# between the two windows slopes through the wall (model/vehicle.py: build_window).
WINDOW_OPENING = (math.radians(257.5), math.radians(282.5), 25.8, 44.0)
LAMPS = (
    -128.0,
    -8.0,
)  # where the two cabin lights hang, degrees round the wall, the left hand one first: estimated (CABIN LIGHTS: BOTH, L.H. ONLY, OFF)

MAIN_OUTLINE_PX = [
    (47, 1395),
    (335, 1395),
    (335, 750),
    (1035, 750),
    (1035, 1395),
    (1895, 1395),
    (1915, 1375),
    (1915, 760),
    (1890, 735),
    (1800, 735),
    (1775, 700),
    (1775, 510),
    (1740, 470),
    (1600, 470),
    (1555, 420),
    (1555, 330),
    (1500, 170),
    (1430, 85),
    (350, 85),
    (300, 40),
    (60, 40),
    (47, 75),
]
# The round instruments: where each is in the figure and its diameter there. Their faces are capsule 7's (mercury_cabin.ROUND).
ROUND_AT = {
    "Accelerometer": ((170, 262), 125),
    "DescentRate": ((170, 650), 118),
    "Altimeter": ((162, 878), 178),
    "CabinPressure": ((1155, 268), 125),
    "CabinAir": ((1315, 268), 125),
    "Humidity": ((1150, 460), 122),
    "Coolant": ((1310, 455), 122),
    "Oxygen": ((1462, 460), 125),
    "DCVolts": ((1155, 838), 122),
    "DCAmps": ((1310, 838), 122),
    "ACVolts": ((1310, 1088), 125),
}
# Toggle switches of the main panel: where, the name above, the positions either side, and a third below.
MAIN_SWITCHES = (
    ((118, 1355), "LIGHT\nTEST", ("", ""), ""),
    ((240, 1355), "RATE IND", ("AUTO", "MAN\nON"), ""),
    ((1210, 558), "O2 FLOW", ("EMER", "NORM"), ""),
    ((1462, 605), "SUIT FAN", ("NO. 2", "NORM"), "NO. 1"),
    ((1462, 705), "CABIN FAN", ("OFF", "NORM"), ""),
    ((1462, 860), "STBY BTRY", ("ON", "OFF"), ""),
    ((1462, 940), "ISOL BTRY", ("STBY", "NORM"), ""),
    ((1462, 1015), "ELECT PWR", ("ASCS\nOFF", "NORM"), ""),
    ((1310, 945), "AMMETER", ("BYPASS", "NORM"), "PWR OFF"),
    ((1160, 1185), "AUDIO BUS", ("EMERG", "NORM"), ""),
    ((1310, 1185), "AC VOLTS", ("ASCS", "FANS"), ""),
    ((1462, 1185), "STBY INVERT", ("EMER\nAC", "FANS\nONLY"), "AUTO"),
    ((1480, 1330), "UHF SELECT", ("LO\nPWR", "HI\nPWR"), ""),
    ((1605, 1330), "TRANSMIT", ("HF", "UHF"), "OFF"),
    ((1710, 1330), "BEACON", ("GRND\nCOMD", "CONT"), ""),
    ((1610, 515), "WARN LIGHTS", ("DIM", "BRIGHT"), ""),
)
# The warning lights down the right of the main panel, each with a switch beside it that turned its tone on or off.
WARNINGS = (
    ("CabinPress", "CABIN PRESS", 580),
    ("O2Quan", "O2 QUAN", 645),
    ("O2Emerg", "O2 EMERG", 708),
    ("ExcessSuitWater", "EXCESS\nSUIT H2O", 905),
    ("ExcessCabinWater", "EXCESS\nCABIN H2O", 968),
    ("FuelQuan", "FUEL QUAN", 1030),
    ("RetroWarn", "RETRO WARN", 1095),
    ("RetroReset", "RETRO\nRESET", 1158),
)
# The sequence lights of the left console's strip, top to bottom, with what overrides each and where it is in the figure.
SEQUENCE = (
    ("TowerJett", "JETT TOWER", "ring", 407),
    ("CapsuleSep", "SEP CAPSULE", "ring", 482),
    ("RetroSeq", "RETRO SEQ", "button", 555),
    ("RetroAtt", "RETRO ATT", "switch", 628),
    ("RetroFire", "FIRE RETRO", "guarded", 702),
    ("JettRetro", "JETT RETRO", "guarded", 775),
    ("RetractScope", "RETRACT SCOPE", "switch", 850),
    ("PointZeroFiveG", ".05G", "button", 925),
    ("Drogue", "DROGUE", "button", 998),
    ("Snorkel", "SNORKEL", "ring", 1070),
    ("MainDeploy", "MAIN", "ring", 1142),
    ("ReserveDeploy", "RESERVE", "ring", 1217),
    ("LandingBag", "LANDING BAG", "none", 1290),
)
SWITCH_WAYS = {"RetroAtt": ("AUTO", "BYPASS"), "RetractScope": ("AUTO", "MAN")}


def build(parent, vessel: Surf, M: dict, font, pilot: dict, hip, hatch, ceiling: float, suit, window: dict, scope_z: float) -> dict:
    """Everything inside capsule 11's pressure vessel but the pilot. As mercury_cabin.build, with `window` where the
    flight's script put the inner panes (their frame, as a matrix) and `scope_z` the station the periscope's objective
    leaves the cone at. Returns where things are, metres, in the capsule's frame."""
    mc._font = font
    if not interior():
        return {}
    M.update(mc.materials())
    c = Cabin(parent, vessel, M)
    main = Sheet("cabin-main-panel", 4096)
    side = Sheet("cabin-consoles", 3072)
    faces = Sheet("cabin-faces", 2048, BLACK)
    out: dict = {}

    def seat(p) -> Vector:
        """A point of the seated pilot, in capsule inches."""
        return Vector((p[0] / 2.54, hip[0] + p[1] / 2.54, hip[1] + p[2] / 2.54))

    # (the frames as in capsule 7's model, but the lowest a little lower: it has no port to give way to here, and at
    # station 7 it would lie on a row of the wall's rivets)
    mc.lining(c, hatch, (), ceiling, openings=(WINDOW_OPENING,), frames=((6.1, True), *mc.FRAMES[1:]), scope=scope_z)
    window_inside(c, window)
    mc.couch(c, pilot, seat)
    mc.neck_dam(c, seat, pilot)
    # the panel stands where capsule 7's does: nothing read places either (spacecraft.md)
    P = plane(Vector(mc.PANEL_AT), Vector((1, 0, 0)), Vector((0, -math.cos(mc.PANEL_TILT), math.sin(mc.PANEL_TILT))))
    main_panel(c, P, main, faces)
    # straight from the back of its housing over the pilot's knees to the door: the real instrument stood straight
    mc.periscope(c, P, side, out, box=(fig(335, 750), fig(1035, 1420)), station=scope_z, run=((0.0, 9.0, 36.2), (0.0, 16.5, 39.6)))
    consoles(c, P, side, faces)
    mc.controls(c, seat, pilot, out)
    if suit:
        mc.restraints(c, suit, pilot, seat)
        chest_mirror(c, suit, seat)
    # (what is known only from capsule 7 as it is kept is left out: the runs from its fuse panel, the camera by the head, the coiled cord)
    mc.stowage(c, (), out, lamps_at=LAMPS, fuse_wiring=False, panel_camera=False, cord=False)
    mc.dress(c, M, parent, P, pilot, seat, main, side, faces, out, more={"CrewCabin_WindowShroud": "cabin_paint", "CrewCabin_Mirror": "lever"})
    return out


# --------------------------------------------------------------------------- the window, from inside


def window_inside(c: Cabin, window: dict) -> None:
    """The window's inner frame stands into the cabin, flat where the wall is round: a shroud from the wall's opening
    in to the frame's edge. How it was made is not in anything read; the frame is SEDR 104's Figure 2-3."""
    v = c.vessel
    wall = Skin(Surf(v.r0 - 0.12, v.z0, v.a))
    t0, t1, z0, z1 = WINDOW_OPENING
    mid = ((t0 + t1) / 2, (z0 + z1) / 2)
    edge = wall.bounds(*mid, t0, t1, z0, z1)
    to = wall.flat(*mid)
    F = window["frame"]
    rim = outline(trapezoid(*window["pane"], window["corner"], grow=1.0))  # (clear of the frame's own side all round)
    under = outline(trapezoid(*window["pane"], window["corner"], grow=0.55))  # (and inside it: where the shroud's lip ends)
    # Side to side and corner to corner: the opening is four-sided and so is the frame, but their corners lie at
    # different bearings from the middle, and joined bearing for bearing each corner of the shroud was a twisted facet
    # that stood out of it as a dark spike. Each side of the one is joined to the same side of the other.
    length, low, high = window["pane"]
    corners = lambda pts: [math.atan2(y, x) for x, y in pts]  # noqa: E731
    span = lambda angles: [a if k == 0 else angles[0] + (a - angles[0]) % TAU for k, a in enumerate(angles)] + [angles[0] + TAU]  # noqa: E731
    of_edge = span(corners(edge))
    of_rim = span(
        corners([(low / 2 + 1, -length / 2 - 1), (high / 2 + 1, length / 2 + 1), (-high / 2 - 1, length / 2 + 1), (-low / 2 - 1, -length / 2 - 1)])
    )
    per = 24
    a, b, lip = [], [], []
    for side in range(4):
        for k in range(per):
            f = k / per
            a.append(to(*_reach(edge, of_edge[side] + (of_edge[side + 1] - of_edge[side]) * f)))
            bearing = of_rim[side] + (of_rim[side + 1] - of_rim[side]) * f
            # (a tenth of an inch short of the frame's inner face, and from there a lip in under the frame's side: the
            # slot between the shroud and the frame is then a shallow rebate round it, where it was a way through)
            b.append(F @ Vector((*(v * IN for v in _reach(rim, bearing)), -1.05 * IN)))
            lip.append(F @ Vector((*(v * IN for v in _reach(under, bearing)), -1.05 * IN)))
    shroud = c.into("CrewCabin_WindowShroud")
    shroud.grid(lambda i, j: a[i] * (1 - j) + b[i] * j, range(4 * per), (0.0, 0.5, 1.0), closed_u=True, flip=True)
    shroud.grid(lambda i, j: b[i] * (1 - j) + lip[i] * j, range(4 * per), (0.0, 1.0), closed_u=True, flip=True)


# --------------------------------------------------------------------------- the main panel


def main_panel(c: Cabin, P: Matrix, sheet: Sheet, faces: Sheet) -> None:
    edge = [fig(*p) for p in MAIN_OUTLINE_PX]
    us, vs = [p[0] for p in edge], [p[1] for p in edge]
    rg = sheet.take(max(us) - min(us), max(vs) - min(vs) + 0.4, 69, min(us), min(vs) - 0.4)
    # the seam between the centre and right sections, and the screws along the edges
    seam = fig(1040, 0)[0]
    rg.line((seam, fig(0, 85)[1]), (seam, fig(0, 750)[1]), 0.03, (0.38, 0.39, 0.39))
    rg.edge_screws(edge)
    for side_ in (-0.35, 0.35):
        for k in range(6):
            rg.screw(seam + side_, fig(0, 120)[1] - k * 1.85, 0.09)
    c.flat("CrewCabin_InstrumentPanel", P, edge, rg)
    c.skirt("CrewCabin_PanelStructure", P, edge, 0.0, -0.9)
    c.flat("CrewCabin_PanelStructure", P, edge, None, -0.9, flip=True)

    for name, (at, d) in ROUND_AT.items():
        (u, v), r = fig(*at), d * S / 2
        round_dial(c, P, faces, name, mc.ROUND[name], u, v, r)
        c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -4.2)), r * 0.95 * IN, 12)  # its case behind the panel
    # control fuel, which capsule 7 had on its left console
    (u, v), r = fig(170, 455), 118 * S / 2
    mc.fuel_gauge(c, P, faces, u, v, r)
    c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -4.2)), r * 0.95 * IN, 12)
    # An instrument with two needles under the oxygen flow switch, whose legend the figure does not let us read: its
    # case and a plain face, and no needles of ours.
    (u, v), r = fig(1310, 655), 122 * S / 2
    c.turned("CrewCabin_Bezels", P, u, v, [(r + 0.14, 0.0), (r + 0.14, 0.3), (r * 0.94, 0.3), (r * 0.92, 0.06)], 32)
    c.disc("CrewCabin_Bezels", P, u, v, r * 0.93, 0.06, None)
    c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -4.2)), r * 0.95 * IN, 12)
    # The pilot-observer camera's lens, looking back at him: the figure draws an empty circle here, where capsule 7's
    # panel had the lens, and the camera was aboard (This New Ocean, p. 368: the chest mirror was for it).
    u, v = fig(248, 1130)
    c.turned("CrewCabin_Bezels", P, u, v, [(1.05, 0.0), (1.05, 0.5), (0.8, 0.6), (0.72, 0.3)], 28)
    c.disc("CrewCabin_InstrumentGlass", P, u, v, 0.72, 0.3, None, 16)
    c.disc("CrewCabin_Bezels", P, u, v, 0.74, 0.12, None, 16)

    mc.attitude(c, P, faces, box=(fig(465, 95), fig(890, 340)), k=0.855)
    mc.clock(c, P, faces, box=(fig(697, 385), fig(1018, 738)))
    earth_path(c, P, faces)

    for (px, py), name, (a, b), below in MAIN_SWITCHES:
        u, v = fig(px, py)
        toggle(c, P, u, v, "h")
        rg.text(name, u, v + 0.6 + (0.1 if "\n" in name else 0), 0.15, INK)
        if a:
            rg.text(a, u - 0.42, v, 0.12, INK, align="r")
            rg.text(b, u + 0.42, v, 0.12, INK, align="l")
        if below:
            rg.text(below, u, v - 0.45, 0.12, INK)
    # the warning lights, each with its tone switch
    rg.text("AUDIO\nOFF      TONE", *fig(1715, 532), 0.11, INK)
    for name, legend, py in WARNINGS:
        telelight(c, P, faces, name, legend, *fig(1608, py), size=(1.6, 0.8))
        toggle(c, P, *fig(1705, py), "h")
    for name, legend, at in (("StandbyDC", "STBY\nDC AUTO", (1462, 787)), ("StandbyAC", "STBY\nAC AUTO", (1462, 1100))):
        telelight(c, P, faces, name, legend, *fig(*at), size=(1.6, 0.85))

    # TIME ZERO: a guarded push button under a white cap
    u, v = fig(955, 322)
    c.turned("CrewCabin_PanelFittings", P, u, v, [(0.42, 0.0), (0.42, 0.12), (0.3, 0.12)], 20)
    c.turned("CrewCabin_WhiteCaps", P, u, v, [(0.3, 0.1), (0.3, 0.75), (0.22, 0.9), (0.0, 0.9)], 16)
    rg.text("TIME\nZERO", u, v + 0.95, 0.14, INK)

    # D.C. volts selector: a black rotary knob
    u, v = fig(1155, 965)
    c.turned("CrewCabin_Knobs", P, u, v, [(0.72, 0.0), (0.72, 0.12), (0.5, 0.2), (0.45, 0.62), (0.0, 0.62)], 12)

    # communications: the audio box, three thumbwheels and a key
    (u0, v1), (u1, v0) = fig(1075, 1245), fig(1415, 1355)
    rg.rect(u0, v0, u1, v1, (0.52, 0.53, 0.52), r=0.1)
    rg.text("COMM AUDIO", (u0 + u1) / 2, v0 + 0.14, 0.11, INK)
    for name, px in (("HF", 1175), ("UHF", 1232), ("CMD", 1290)):
        uu = fig(px, 0)[0]
        c.box("CrewCabin_Knobs", P, uu, (v0 + v1) / 2 + 0.08, 0.55, 0.9, 0.0, 0.16)
        rg.text(name, uu, v1 - 0.13, 0.1, INK)
    c.turned("CrewCabin_Knobs", P, fig(1105, 0)[0], (v0 + v1) / 2 + 0.08, [(0.26, 0.0), (0.26, 0.2), (0.0, 0.2)], 12)
    rg.text("KEY", fig(1105, 0)[0], v1 - 0.13, 0.1, INK)
    toggle(c, P, fig(1360, 0)[0], (v0 + v1) / 2 + 0.08, "h")
    rg.text("UHF DF", fig(1360, 0)[0], v1 - 0.13, 0.1, INK)

    # the switch-fuses at the panel's right edge, in pairs
    for (a, b), py in ((("SUIT\nFAN", "ENVIR\nCONTL"), 880), (("RETRO\nJETT", "RETRO\nMAN"), 1085), (("PRO-\nGRAMER", "SPARE"), 1285)):
        u, v = fig(1834, py)
        rg.rect(u - 1.25, v - 1.2, u + 1.25, v + 1.2, BLACK, r=0.08)
        for i, name in enumerate((a, b)):
            fuse(c, P, u + (i - 0.5) * 1.1, v - 0.35)
            rg.text(name, u + (i - 0.5) * 1.1, v + 0.75, 0.1, WHITE)


def earth_path(c: Cabin, P: Matrix, faces: Sheet) -> None:
    """The Earth-path indicator, new on this panel and not working on this flight (Results of the Second U.S. Manned
    Suborbital Space Flight, p. 4): a globe turned by clockwork behind a window, to show an orbiting pilot what was
    under him. Its case and its window are the figure's; the globe is drawn as a bare graticule, not a map of ours."""
    (u0, v1), (u1, v0) = fig(330, 385), fig(668, 738)
    cu, cv, hw, hh = (u0 + u1) / 2, (v0 + v1) / 2, (u1 - u0) / 2, (v1 - v0) / 2
    k = 0.6  # the corners cut off: an octagon
    octagon = [(-hw + k, -hh), (hw - k, -hh), (hw, -hh + k), (hw, hh - k), (hw - k, hh), (-hw + k, hh), (-hw, hh - k), (-hw, -hh + k)]
    rg = faces.take(2 * hw, 2 * hh, 110, -hw, -hh)
    rg.rect(-hw, -hh, hw, hh, (0.05, 0.05, 0.055))
    here = [(cu + x, cv + y) for x, y in octagon]
    c.flat("CrewCabin_Instruments", P, here, Region(rg.sheet, rg.ox, rg.oy, rg.ppi, rg.u0 + cu, rg.v0 + cv), 0.14)
    c.skirt("CrewCabin_Bezels", P, here, 0.14, 0.0)
    rel = lambda px, py: (fig(px, py)[0] - cu, fig(px, py)[1] - cv)  # noqa: E731
    # the globe's window
    (wx0, wy1), (wx1, wy0) = rel(418, 458), rel(525, 665)
    rg.rect(wx0, wy0, wx1, wy1, (0.34, 0.38, 0.40), r=0.25)
    gx, gy, gr = (wx0 + wx1) / 2, (wy0 + wy1) / 2, (wy1 - wy0) * 0.62
    for lat in (-60, -30, 0, 30, 60):
        y = gy + gr * math.sin(math.radians(lat))
        half = min((wx1 - wx0) / 2 - 0.04, gr * math.cos(math.radians(lat)))
        if wy0 + 0.05 < y < wy1 - 0.05:
            rg.line((gx - half, y), (gx + half, y), 0.012, (0.62, 0.66, 0.66))
    for lon in (-40, -20, 0, 20, 40):
        pts = []
        for i in range(13):
            lat = math.radians(-75 + 150 * i / 12)
            x, y = gx + gr * math.cos(lat) * math.sin(math.radians(lon)), gy + gr * math.sin(lat)
            if wx0 + 0.04 < x < wx1 - 0.04 and wy0 + 0.05 < y < wy1 - 0.05:
                pts.append((x, y))
        for a, b in zip(pts, pts[1:]):
            rg.line(a, b, 0.012, (0.62, 0.66, 0.66))
    # its small dials and knobs, with their legends as far as the figure gives them
    for name, at, r in (("ORBIT TIME", (377, 465), 0.42), ("INCLINATION\nDEGREES", (607, 568), 0.5)):
        x, y = rel(*at)
        rg.ring(x, y, r - 0.03, r, WHITE)
        for i in range(12):
            rg.line(
                (x + clock_xy(30 * i, r)[0], y + clock_xy(30 * i, r)[1]),
                (x + clock_xy(30 * i, r * 0.8)[0], y + clock_xy(30 * i, r * 0.8)[1]),
                0.014,
                WHITE,
            )
        rg.text(name, x, y - r - 0.22, 0.075, WHITE)
    for name, at in (("WIND", (378, 668)), ("ORBIT", (606, 678)), ("", (608, 462))):
        x, y = rel(*at)
        c.turned("CrewCabin_Knobs", P, cu + x, cv + y, [(0.2, 0.14), (0.2, 0.5), (0.0, 0.5)], 12)
        if name:
            rg.text(name, x, y - 0.36, 0.075, WHITE)
    mc.chamfered(c.into("CrewCabin_Equipment"), (2 * hw, 2 * hh, 3.6), P @ Matrix.Translation((cu, cv, -2.8)) @ Matrix.Scale(1 / IN, 4), 0.15)
    # the glass over the globe: its own mesh, so that it can say what it is
    glass = MeshBuilder()
    glass.add([tuple(P @ Vector((cu + x, cv + y, 0.2))) for x, y in ((wx0, wy0), (wx1, wy0), (wx1, wy1), (wx0, wy1))], [(0, 1, 2, 3)])
    obj = glass.build("EarthPath_Glass", c.M["crystal"], c.g, smooth=False)
    obj["label"] = "Earth-path indicator"
    obj["about"] = (
        "New on this panel: a small globe turned by clockwork, to show a pilot in orbit what lay under him. "
        "On this flight, which did not go into orbit, it was not working. The globe is drawn as a bare graticule."
    )


# --------------------------------------------------------------------------- the consoles


def consoles(c: Cabin, P: Matrix, sheet: Sheet, faces: Sheet) -> None:
    """The left console in its two parts, each turned further toward the pilot, and the right console. The figure
    draws them flat beside the main panel; how they were canted is taken as capsule 7's (mercury_cabin: estimated)."""
    ex, ey, ez = (Vector(P.col[i][:3]).normalized() for i in range(3))
    hinge = Vector(P @ Vector((fig(47, 0)[0], -mc.STRIP_DROP, 0))) / IN
    a = mc.STRIP_CANT
    Sx = plane(hinge, ex * math.cos(a) - ez * math.sin(a), ey)  # u runs back from the hinge
    sfig = lambda px, py: ((px - 990) * S, (FIG_C[1] - py) * S)  # noqa: E731  (the left part of the figure, counted from (400, 850))
    strip = [sfig(635, 1425), sfig(990, 1305), sfig(990, 50), sfig(790, 130), sfig(635, 355)]
    rg = sheet.take(strip[1][0] - strip[0][0], strip[2][1] - strip[0][1], 74, strip[0][0], strip[0][1], at=(0, 0))
    rg.edge_screws(strip)
    c.flat("CrewCabin_Consoles", Sx, strip, rg)
    c.skirt("CrewCabin_PanelStructure", Sx, strip, 0.0, -0.7)
    c.flat("CrewCabin_PanelStructure", Sx, strip, None, -0.7, flip=True)
    lu, ou = sfig(897, 0)[0], sfig(778, 0)[0]
    # ABORT, a light of its own at the head of the column, and the launch control switch under it
    u, v = sfig(897, 168)
    c.turned("CrewCabin_Bezels", Sx, u, v, [(0.72, 0.0), (0.72, 0.3), (0.6, 0.3), (0.6, 0.12)], 6)
    c.node("Tele_Abort", "red_lamp", Sx, u, v, 0.0, lambda mb: mb.lathe([(0.6, 0.1), (0.56, 0.26), (0.0, 0.3)], 6))
    rg.text("ABORT", u, v - 0.92, 0.13, INK)
    u, v = sfig(897, 262)
    toggle(c, Sx, u, v, "h")
    rg.text("LAUNCH CONTL", u, v + 0.42, 0.1, INK)
    rg.text("READY", u - 0.42, v, 0.1, INK, align="r")
    rg.text("OFF", u + 0.42, v, 0.1, INK, align="l")
    for name, legend, kind, py in SEQUENCE:
        v = sfig(0, py)[1]
        telelight(c, Sx, faces, name, legend, lu, v, size=(2.3, 0.86))
        if kind == "ring":  # a pull ring on its stem, hanging from the panel

            def ring(mb: MeshBuilder) -> None:
                mb.lathe([(0.09, 0.0), (0.09, 0.5), (0.0, 0.5)], 8)
                tube = [(0.4 + 0.08 * math.cos(TAU * k / 8), 0.08 * math.sin(TAU * k / 8)) for k in range(9)]
                mb.lathe(tube, 16, matrix=Matrix.Translation((0, -0.2, 0.62)) @ Matrix.Rotation(math.pi / 2 - 0.5, 4, "X"))

            c.turned("CrewCabin_PanelFittings", Sx, ou, v, [(0.2, 0.0), (0.2, 0.1), (0.1, 0.1)], 10)
            c.node(f"Ctl_{name}", "lever", Sx, ou, v, 0.08, ring, pull=1.2 * IN)
        elif kind in ("button", "guarded"):  # a push button in a black collar; FIRE RETRO and JETT RETRO are guarded
            c.turned("CrewCabin_Knobs", Sx, ou, v, [(0.36, 0.0), (0.36, 0.3), (0.26, 0.3)], 14)
            if kind == "guarded":
                c.turned("CrewCabin_PanelFittings", Sx, ou, v, [(0.52, 0.0), (0.52, 0.62), (0.44, 0.62), (0.44, 0.0)], 16)
            c.node(f"Ctl_{name}", "red", Sx, ou, v, 0.0, lambda mb: mb.lathe([(0.25, 0.2), (0.25, 0.42), (0.0, 0.46)], 12), press=0.12 * IN)
        elif kind == "switch":
            toggle(c, Sx, ou, v, "v")
            rg.text(SWITCH_WAYS[name][0], ou - 0.62, v, 0.09, INK, turn=1)
            rg.text(SWITCH_WAYS[name][1], ou + 0.62, v, 0.09, INK, turn=1)
    u, v = sfig(750, 1295)  # the landing bag's switch, under a guard
    toggle(c, Sx, u, v, "h")
    c.rim("CrewCabin_PanelFittings", Sx, u, v, 1.5, 0.7, 0.08, 0.0, 0.5)
    rg.text("AUTO          MAN", u, v - 0.62, 0.09, INK)

    # the console's outer part, hinged on the strip's far edge and turned further
    hinge = Vector(Sx @ Vector((strip[0][0], mc.STRIP_DROP - mc.CONSOLE_DROP, 0))) / IN
    b = mc.CONSOLE_CANT
    Cx = plane(hinge, ex * math.cos(b) - ez * math.sin(b), ey)
    cfig = lambda px, py: ((px - 632) * S, (FIG_C[1] - py) * S)  # noqa: E731
    part = [cfig(305, 1505), cfig(630, 1420), cfig(630, 355), cfig(445, 640), cfig(100, 665)]
    us = [p[0] for p in part]
    rg2 = sheet.take(max(us) - min(us), part[2][1] - part[0][1], 74, min(us), part[0][1], at=(420, 0))
    rg2.edge_screws(part)
    c.flat("CrewCabin_Consoles", Cx, part, rg2)
    c.skirt("CrewCabin_PanelStructure", Cx, part, 0.0, -0.7)
    c.flat("CrewCabin_PanelStructure", Cx, part, None, -0.7, flip=True)
    for (px, py), name, (p0, p1), below in (
        ((565, 553), "SQUIB", ("ARM", "OFF"), ""),
        ((565, 650), "AUTO RETRO JETT", ("ARM", "OFF"), ""),
        ((265, 772), "", ("NORM", "FLY\nBY WIRE"), "AUX DAMP"),
        ((410, 755), "", ("AUTO", "RATE\nCOMD"), ""),
        ((565, 738), "", ("GYRO\nNORM", "GYRO\nCAGE"), "FREE"),
        ((455, 1080), "RETRO DELAY", ("NORM", "INST"), ""),
        ((455, 1165), "CABIN LIGHTS", ("BOTH", "OFF"), "L.H. ONLY"),
        ((340, 1205), "RETRO HEAT", ("GRND\nPWR", "CAP\nPWR"), "OFF"),
        ((455, 1265), "HI-PWR TLM", ("ON", "OFF"), ""),
        ((395, 1415), "", ("AUTO", "MAN"), ""),
    ):
        u, v = cfig(px, py)
        if name == "CABIN LIGHTS":
            # The floodlights' switch: BOTH at its left, L.H. ONLY in the middle (the figure writes a middle position
            # under its switch, as it does RETRO HEAT's OFF), OFF at its right (Results of the Second flight, Figure
            # 2-3). Built at BOTH: "cabin lights are both" (the same, p. 45). The viewer throws it (mercury_cabin.thrown).
            mc.thrown(c, Cx, u, v, "CabinLights", "h", (-mc.TOGGLE_LEAN, 0.0, mc.TOGGLE_LEAN))
        else:
            toggle(c, Cx, u, v, "h")
        if name:
            rg2.text(name, u, v + 0.5, 0.1, INK)
        rg2.text(p0, u - 0.42, v, 0.09, INK, align="r")
        rg2.text(p1, u + 0.42, v, 0.09, INK, align="l")
        if below:
            rg2.text(below, u, v - 0.42, 0.09, INK)
    rg2.text("ASCS   MODE   SELECT", *cfig(400, 705), 0.11, INK)
    for name, text, (px, py), mat in (
        ("RetroCold", "RETRO\nCOLD", (305, 1070), "red_lamp"),
        ("HeatersOn", "HEAT\nON", (305, 1120), "amber"),
        ("RescueAids", "RESCUE AIDS", (400, 1342), "amber"),
    ):
        u, v = cfig(px, py)
        c.turned("CrewCabin_PanelFittings", Cx, u, v, [(0.22, 0.0), (0.22, 0.1), (0.15, 0.1)], 12)
        c.node(f"Tele_{name}", mat, Cx, u, v, 0.0, lambda mb: mb.lathe([(0.15, 0.08), (0.13, 0.24), (0.0, 0.28)], 12))
        rg2.text(text, u + 0.3, v, 0.09, INK, align="l")
    # the cabin's two pressure handles, in a frame that says CLOSE VISOR
    (bu0, bv1), (bu1, bv0) = cfig(215, 810), cfig(530, 1035)
    rg2.rect(bu0, bv0, bu1, bv1, (0.57, 0.58, 0.57), r=0.3)
    rg2.text("CLOSE\nVISOR", bu0 + 1.3, bv0 + 0.45, 0.14, INK)
    for name, (px, py), note in (
        ("DECOMP", (275, 885), "PULL TO DUMP\n(PUSH TO CLOSE)"),
        ("REPRESS", (430, 870), "PULL TO REPRESS\n(PUSH TO RESET)"),
    ):
        u, v = cfig(px, py)
        c.turned(
            "CrewCabin_RedCaps" if name == "DECOMP" else "CrewCabin_WhiteCaps",
            Cx,
            u,
            v,
            [(0.12, 0.0), (0.12, 0.5), (0.42, 0.55), (0.44, 0.85), (0.0, 0.9)],
            14,
        )
        rg2.text(name, u, v + 0.65, 0.09, INK)
        rg2.text(note, u + 0.55, v - 0.95, 0.075, INK)
    # the fuel handles down the inner edge: MANUAL (pull for the direct system, push for rate command), then roll, yaw, pitch
    for name, (px, py) in (("MANUAL", (590, 870)), ("ROLL", (590, 1020)), ("YAW", (590, 1180)), ("PITCH", (575, 1340))):
        u, v = cfig(px, py)
        c.into("CrewCabin_Knobs" if name == "MANUAL" else "CrewCabin_PanelFittings").box(
            (0.45 * IN, 1.8 * IN, 0.5 * IN), Cx @ Matrix.Translation((u, v, 0.75)) @ Matrix.Scale(1 / IN, 4)
        )
        c.into("CrewCabin_PanelFittings").tube(Cx @ Vector((u, v, 0.0)), Cx @ Vector((u, v, 0.55)), 0.09 * IN, 8)
        rg2.text(name, u - 0.5, v, 0.11, INK, turn=1)
    # (what each handle does is lettered on the strip beside it)
    for text, py in (
        ("PULL\nDIRECT\nPUSH\nRATE\nCOMD", 870),
        ("PULL\nOFF\nPUSH\nON", 1040),
        ("PULL\nOFF\nPUSH\nON", 1200),
        ("PULL\nOFF\nPUSH\nON", 1350),
    ):
        rg.text(text, sfig(660, 0)[0], sfig(0, py)[1], 0.07, INK)
    rg.text("SQUIB", sfig(660, 0)[0], sfig(0, 553)[1], 0.08, INK)
    rg.text("AUTO\nRETRO\nJETT", sfig(660, 0)[0], sfig(0, 650)[1], 0.07, INK)

    # the right console, under the hatch: the emergency oxygen lever and the suit and cabin temperature selectors
    R = plane(Vector((24.6, 3.5, 15.5)), Vector((0.26, -0.966, 0)), Vector((-0.33, -0.09, 0.94)))
    rw, rh = 5.7, 6.7
    rect = [(-rw / 2, -rh / 2), (rw / 2, -rh / 2), (rw / 2, rh / 2), (-rw / 2, rh / 2)]
    rg4 = sheet.take(rw, rh, 74, -rw / 2, -rh / 2, at=(1050, 0))
    rg4.edge_screws(rect)
    c.flat("CrewCabin_Consoles", R, rect, rg4)
    c.skirt("CrewCabin_PanelStructure", R, rect, 0.0, -2.2)
    rg4.text("EMER O2", 0, 2.75, 0.12, INK)
    rg4.text("EMER", -1.0, 2.35, 0.1, INK)
    rg4.text("NORM", 1.0, 2.35, 0.1, INK)
    c.into("CrewCabin_RedCaps").tube(R @ Vector((-2.0, 2.3, 0.3)), R @ Vector((-2.6, 2.7, 0.9)), 0.28 * IN, 10)
    for name, v in (("SUIT TEMP", 0.9), ("CABIN TEMP", -1.6)):
        rg4.text(name, 0.8, v + 0.9, 0.09, INK)
        rg4.text("COOLER", -1.8, v + 0.5, 0.09, INK)
        c.turned("CrewCabin_Knobs", R, -0.3, v, [(0.5, 0.0), (0.5, 0.4), (0.0, 0.45)], 14)
        c.into("CrewCabin_Knobs").box(
            (1.8 * IN, 0.45 * IN, 0.35 * IN), R @ Matrix.Translation((0.45, v + 0.22, 0.33)) @ Matrix.Rotation(0.45, 4, "Z") @ Matrix.Scale(1 / IN, 4)
        )


# --------------------------------------------------------------------------- the pilot's own


def chest_mirror(c: Cabin, suit: dict, seat) -> None:
    """The convex mirror strapped to the chest of Grissom's suit, so that the camera watching him also photographed
    his instruments in it (This New Ocean, p. 368: the "hero's medal"). About 5 to 6 in across its rim: read off NASA
    S61-03698. Laid on the seated figure's own chest."""
    # (on the upper chest, between the shoulder straps and headward of the chest strap; seat-frame centimetres)
    chest = [p for name, pts in suit.items() if name.startswith("Torso") for p in pts if abs(p[0]) < 4.0 and abs(p[1] + 50.0) < 4.0]
    if not chest:
        return
    at = seat((0.0, -50.0, max(p[2] for p in chest) + 1.0))
    F = plane(at, Vector((1, 0, 0)), Vector((0, 1, 0)))  # facing the nose, as his chest does
    c.turned("CrewCabin_WhiteCaps", F, 0, 0, [(2.6, 0.0), (2.6, 0.3), (2.15, 0.3), (2.15, 0.1)], 28)
    dome = [(2.15 * math.cos(math.radians(a)), 0.1 + 0.5 * math.sin(math.radians(a))) for a in range(0, 91, 15)]
    c.turned("CrewCabin_Mirror", F, 0, 0, dome, 28)


# --------------------------------------------------------------------------- the hatch, from inside


def hatch_inside(parent, vessel: Surf, M: dict, hatch) -> None:
    """The explosive hatch's inner face: painted like the wall; the bolts round its edge (69 of the 70); in the corner by the
    window, the initiator with its plunger; and the knife Grissom took off the door after landing."""
    if not interior():
        return
    t0, t1, hz0, hz1 = hatch
    inner = Surf(vessel.r0 - 0.12, vessel.z0, vessel.a)
    mb = MeshBuilder()
    # (in rings as fine as the wall's: its shade is kept at its vertices)
    rings = [hz0 + (hz1 - hz0) * i / round((hz1 - hz0) / 1.5) for i in range(round((hz1 - hz0) / 1.5) + 1)]
    mb.lathe([(inner.r(z) * IN, z * IN) for z in rings], round(math.degrees(t1 - t0) / 2.5), arc=(t0, t1), flip=True)
    mb.build("Hatch_Lining", M["cabin_paint"], parent, sharp_angle=None)

    # seventy bolts round the sill: "Seventy 1/4-inch titanium bolts secure the hatch to the doorsill" (the MR-4 report, p. 4)
    bolts = MeshBuilder()
    cos = math.cos(vessel.a)
    inset = 0.55
    za, zb = hz0 + inset * cos, hz1 - inset * cos
    wide = lambda z: (t1 - t0) * inner.r(z) - 2 * inset  # noqa: E731
    tall = (zb - za) / cos
    around = wide(za) + wide(zb) + 2 * tall
    # seventy places round the sill and sixty-nine bolts: the one left out on the morning is not recorded, so the first is
    for i in range(1, 70):
        d = around * i / 70
        if d < wide(za):
            t, z = t0 + (inset + d) / inner.r(za), za
        elif d < wide(za) + tall:
            z = za + (d - wide(za)) * cos
            t = t1 - inset / inner.r(z)
        elif d < wide(za) + tall + wide(zb):
            t, z = t1 - (inset + d - wide(za) - tall) / inner.r(zb), zb
        else:
            z = zb - (d - wide(za) - tall - wide(zb)) * cos
            t = t0 + inset / inner.r(z)
        bolts.disc(inner.p(t, z), -inner.n(t), 0.19 * IN, 0.12 * IN)
    obj = bolts.build("Hatch_Bolts", M["lever"], parent)
    obj["label"] = "Hatch bolts"
    obj["about"] = (
        "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled with a 0.06 in hole to make a weak point; "
        "a mild detonating fuse in a channel round the hatch broke all of them at once. This hatch went on with sixty-nine: "
        "one would not line up, and after half an hour's hold it was left out. Which one is not recorded."
    )

    # The initiator: in the hatch's corner toward the window and the nose (SEDR 104, 2-4: "the upper aft corner"; which
    # corner that is on the model is our reading). A flange, a body, and the plunger with its knob; the safety pin through it.
    at_t, at_z = t0 + 4.2 / inner.r(hz1 - 5.0), hz1 - 5.0
    F = inner.frame(at_t, at_z) @ Matrix.Rotation(math.pi, 4, "X")  # +Z into the cabin
    body, knob, pin = MeshBuilder(), MeshBuilder(), MeshBuilder()
    body.lathe(
        [(1.7 * IN, 0.0), (1.7 * IN, 0.25 * IN), (1.15 * IN, 0.25 * IN), (1.15 * IN, 1.5 * IN), (0.45 * IN, 1.5 * IN), (0.45 * IN, 1.7 * IN)],
        24,
        matrix=F,
    )
    knob.lathe(
        [(0.2 * IN, 1.5 * IN), (0.2 * IN, 2.5 * IN), (0.55 * IN, 2.55 * IN), (0.62 * IN, 2.9 * IN), (0.45 * IN, 3.15 * IN), (0.0, 3.2 * IN)],
        20,
        matrix=F,
    )
    pin.tube(F @ Vector((-0.75 * IN, 0, 2.05 * IN)), F @ Vector((0.75 * IN, 0, 2.05 * IN)), 0.06 * IN, 8)
    ring = [(0.32 + 0.045 * math.cos(TAU * k / 8), 0.045 * math.sin(TAU * k / 8)) for k in range(9)]
    pin.lathe(
        [(r * IN, z * IN) for r, z in ring], 16, matrix=F @ Matrix.Translation((1.07 * IN, 0, 2.05 * IN)) @ Matrix.Rotation(math.pi / 2, 4, "X")
    )
    says = (
        "Hatch plunger",
        "What blew the hatch from inside: with its cover off and the safety pin out, a blow of five or six pounds on this knob fired the fuse "
        "(forty pounds, with the pin in, sheared it). After landing Grissom took off the cover and the pin, and lay back to wait; "
        "the hatch blew, and he said he had not touched it. It is shown with the cover off and the pin still in.",
    )
    for mesh, name, mat in ((body, "Hatch_Initiator", "lever"), (knob, "Hatch_Plunger", "red"), (pin, "Hatch_SafetyPin", "lever")):
        obj = mesh.build(name, M[mat], parent)
        obj["label"], obj["about"] = says
    # the survival knife in its sheath on the door (the pilot's report: "I removed the knife from the door"): its place there is ours
    knife = MeshBuilder()
    kt, kz = (t0 + t1) / 2 + 3.0 / inner.r(hz0 + 9.0), hz0 + 9.0
    K = inner.frame(kt, kz) @ Matrix.Rotation(math.pi, 4, "X")
    mc.chamfered(knife, (1.5, 8.0, 0.5), K @ Matrix.Translation((0, 0, 0.3 * IN)), 0.12)
    mc.chamfered(knife, (1.1, 4.2, 0.8), K @ Matrix.Translation((0, 6.0 * IN, 0.45 * IN)), 0.15)
    obj = knife.build("Hatch_Knife", M["equipment"], parent, smooth=False)
    obj["label"] = "Survival knife"
    obj["about"] = (
        "The knife rode on the hatch. After landing Grissom took it off the door and put it in his survival pack; "
        "he was wondering whether he could carry it out as a souvenir when the hatch blew. Where on the door it rode is not in anything read."
    )


# What a visitor points at in the cabin says what it is (the viewer reads `label` and `about` off the mesh under the pointer).
THINGS = {
    "CrewCabin_Mirror": (
        "Chest mirror",
        "A convex mirror strapped to the chest of Grissom's suit, so that the camera watching his face also photographed his "
        "instruments in it. The astronauts called it the hero's medal.",
    ),
    "CrewCabin_WindowShroud": (
        "Window, from inside",
        "The window's three inner panes stand in a flat frame a little inside the wall, in front of the pilot's face and above the panel. "
        "The frame is the manual's; how it was faired into the wall is not in anything read.",
    ),
}


def name_things(parent) -> None:
    for name, (label, about) in THINGS.items():
        obj = bpy.data.objects.get(name)
        if obj is not None and obj.parent == parent:
            obj["label"], obj["about"] = label, about
