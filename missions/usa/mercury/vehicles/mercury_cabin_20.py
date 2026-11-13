"""Capsule No. 20's cabin (Faith 7, MA-9): capsule No. 11's fit, and what the record changes in it.

No. 20 flew without a periscope (NASA SP-45, Table 3-II, p. 52), so the middle of its panel was not a display but
more panel. The one drawing of it read is NASA SP-45's Figure 17-7(b), "Spacecraft instrument panels: MA-9
configuration" (p. 291): a flattened layout about four inches across on the page, with no dimensions and most of its
legends too small to read. What can be read off it is built here, in the place the periscope's display has on No. 11's
drawing: a temperature indicator with the two rotary switches that chose what it read, two instruments with two
needles each (one is taken as the control fuel gauge, which the figure no longer has in the left column), and a bank
of toggle switches for the programmer, the radiation experiment, the television, the tape recorder and the telemetry.
The left console's column of lights is the figure's: UMBILICAL DOOR at its head, no RETRACT SCOPE. The rest of the
panel is still No. 11's drawing (mercury_cabin_11.py), and the flight's spacecraft.md ("Cabin") says where the figure
shows otherwise. The slow-scan television camera is here too, on a bracket by the pilot's right hand.

Dimensions are inches.
"""

from __future__ import annotations

import bpy
from mathutils import Matrix, Vector

import mercury_cabin as mc
import mercury_cabin_11
import mercury_cabin_13
from mercury_cabin import INK, Cabin, Sheet, toggle
from srlib import IN, MeshBuilder, Surf, frame, interior, prof

WINDOW_OPENING = mercury_cabin_11.WINDOW_OPENING

# The left console's column of sequence lights, top to bottom, as NASA SP-45's Figure 17-7(b) has them (the figure
# also draws three small lamps by FIRE RETRO, one for each rocket: not built). Each stands in one of No. 11's thirteen
# places, with what overrode it there: the figure's own controls beside the column cannot be told apart at its size.
SEQUENCE = (
    ("UmbilicalDoor", "UMBILICAL\nDOOR", "none", 407),
    ("TowerJett", "JETT TOWER", "ring", 482),
    ("CapsuleSep", "SEP CAPSULE", "ring", 555),
    ("RetroSeq", "RETRO SEQ", "button", 628),
    ("RetroAtt", "RETRO ATT", "switch", 702),
    ("RetroFire", "FIRE RETRO", "guarded", 775),
    ("JettRetro", "JETT RETRO", "guarded", 850),
    ("PointZeroFiveG", ".05G", "button", 925),
    ("Drogue", "DROGUE", "button", 998),
    ("Snorkel", "SNORKEL", "ring", 1070),
    ("MainDeploy", "MAIN", "ring", 1142),
    ("ReserveDeploy", "RESERVE", "ring", 1217),
    ("LandingBag", "LANDING BAG", "none", 1290),
)

# The middle of the panel, where the periscope's display had been: places measured off Figure 17-7(b) as fractions of
# that section's width and height (from its upper left corner), which is then laid over the opening No. 11's drawing
# has for the display. Estimated: the figure is small, and the two drawings' sections are not the same shape.
TEMPERATURE = (0.19, 0.20, 0.92)  # the temperature indicator: where, and its radius
SELECTORS = ((0.19, 0.44), (0.19, 0.81))  # the two rotary switches under it: SENSOR TEMP SELECT
# what each chose, round its knob (degrees clockwise from the top), so far as the figure can be read
SELECTS = (
    (("PITCH\nUP", -62), ("YAW\nL", -28), ("YAW\nR", 28), ("ROLL\nCCW", 62), ("PITCH\nDOWN", -105), ("ROLL\nCW", 105), ("RETRO", -140)),
    (("H2O2\nAUTO", -40), ("CABIN\nOUTLET", 40), ("H2O2\nMAN", -80), ("MAIN\nINVERT", 80), ("H2O2\nRES", -125), ("FANS\nINVERT", 112), ("STBY\nINVERT", 150)),
)
DUALS = ((0.57, 0.18, 0.92), (0.78, 0.18, 0.92))  # the two instruments with two needles each
# the toggle switches: where, the legend over each (empty where the figure cannot be read), and its two positions
SWITCHES = (
    ((0.41, 0.32), "PROGRAM", ("AUTO", "OFF")),
    ((0.58, 0.40), "ASCS CONTL", ("AUTO", "SELECT")),
    ((0.735, 0.40), "MODE SELECT", ("", "")),
    ((0.88, 0.40), "", ("", "")),
    ((0.58, 0.53), "", ("OFF", "ON")),
    ((0.735, 0.53), "GYRO", ("", "")),
    ((0.88, 0.53), "ATTITUDE", ("", "")),
    ((0.40, 0.62), "RAD EXPER", ("OFF", "ON")),
    ((0.435, 0.75), "", ("", "NORM")),
    ((0.43, 0.86), "TV CONTL", ("TV", "T/M")),
    ((0.61, 0.75), "", ("CONT", "PROGRAM")),
    ((0.84, 0.82), "TELEMETRY", ("GRND\nCOMD", "CONT")),
)
RECORDING = (0.61, 0.84, 1.5, 0.75)  # the RECORDING light: where, and its size

# The slow-scan television camera (NASA SP-45, p. 56 and Figure 3-12; the MA-9 press kit, pp. 22 to 24): "can be
# hand-held or mounted on a bracket to the right of the pilot's hand controller", where "the camera is normally directed
# at the pilot". Documented: that it was aboard, on a bracket there, looking at him. Its size is scaled off Figure 3-12
# against nothing but the bench it lies on, and where the bracket stood is ours. Estimated.
CAMERA = (1.35, 7.4)  # its body: radius and length
CAMERA_LENS = (0.9, 1.9)  # the lens on its end
CAMERA_AT = (16.2, 6.2, 17.6)  # the middle of its body, in the capsule

# What a visitor points at in this cabin says: No. 11's meshes (and No. 13's seventieth bolt), with this flight's words.
THINGS = {
    "CrewCabin_PanelBlanks": (
        "Blanked instruments",
        "Where two instruments stood on the earlier panel: the Earth-path indicator, which went out with Aurora 7, and the "
        "control fuel gauge, which this capsule carried lower down, in the middle of the panel. The one drawing of this "
        "panel read shows a hinged plate where the Earth-path indicator had been. The plain plates are ours.",
    ),
    "Hatch_Bolts": (
        "Hatch bolts",
        "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled to make a weak point; a mild detonating fuse in a "
        "channel round the hatch broke all of them at once. Cooper stayed in the capsule until it stood on the deck of USS Kearsarge, "
        "forty minutes after landing, and blew them there.",
    ),
    "Hatch_BoltSeventieth": (
        "Hatch bolts",
        "Seventy quarter-inch titanium bolts held the hatch to its sill, each drilled to make a weak point; a mild detonating fuse in a "
        "channel round the hatch broke all of them at once. Cooper stayed in the capsule until it stood on the deck of USS Kearsarge, "
        "forty minutes after landing, and blew them there.",
    ),
    "Hatch_Knife": (
        "Survival knife",
        "The knife rode on the hatch, as in Liberty Bell 7. Where on the door it rode is not in anything read.",
    ),
}
PLUNGER = (
    "Hatch plunger",
    "What blew the hatch from inside: with its cover off and the safety pin out, a blow of five or six pounds on this knob fired the fuse. "
    "Cooper used it on the carrier's deck, as Glenn and Schirra had on theirs. It is shown with the cover off and the pin in.",
)
CENTRE = (
    "Centre panel",
    "Where every Mercury capsule before this one had the periscope's screen, eight inches across. With the periscope gone the space was "
    "given to what a day in orbit needed watching: a temperature gauge that two rotary switches could point at any of fourteen places, "
    "from the thrusters to the peroxide tanks to the inverters; the fuel gauges; and switches for the programmer, the radiation "
    "experiment, the television camera, the tape recorder and the telemetry. It was these temperatures that Cooper read out, pass after "
    "pass. Laid out from one small drawing; legends that drawing does not let us read are left off.",
)
TV = (
    "Television camera",
    "A slow-scan television camera, the first on an American manned spacecraft: one picture every two seconds, sent down over its own "
    "transmitter to three stations that could turn it back into a picture. It rode on a bracket by the pilot's right hand, pointed at "
    "him, and he could take it off to point it out of the window. The pictures were poor, and the report judged them of little use. "
    "That it was aboard, and looked at him from beside the hand controller, is the record's; its size and its bracket are ours.",
)


def build(parent, vessel: Surf, M: dict, font, pilot: dict, hip, hatch, ceiling: float, suit, window: dict) -> dict:
    """Everything inside capsule 20's pressure vessel but the pilot: capsule 11's fit (mercury_cabin_11.build) with no
    periscope, this capsule's own middle panel in the display's place and its own column of sequence lights, less what
    it flew without; then its television camera, and this flight's words."""
    out = mercury_cabin_11.build(
        parent,
        vessel,
        M,
        font,
        pilot,
        hip,
        hatch,
        ceiling,
        suit,
        window,
        0.0,
        earth_path_indicator=False,
        without=("ControlFuel",),
        knee_and_chest_straps=False,
        periscope=False,
        centre=centre_panel,
        sequence=SEQUENCE,
        more={"CrewCabin_CentrePanel": "panel_side"},
    )
    mercury_cabin_11.name_things(parent)
    if interior():
        television(parent, M, out)
        plate = bpy.data.objects.get("CrewCabin_CentrePanel")
        if plate is not None:
            plate["label"], plate["about"] = CENTRE
    name_things(parent)
    return out


def centre_panel(c: Cabin, P: Matrix, sheet: Sheet, faces: Sheet, box) -> None:
    """The middle of the main panel, in the periscope display's place: a plate flush with the panel, drawn and fitted
    from NASA SP-45's Figure 17-7(b) (TEMPERATURE, SELECTORS, DUALS, SWITCHES, RECORDING)."""
    (u0, v1), (u1, v0) = box
    at = lambda fx, fy: (u0 + fx * (u1 - u0), v1 - fy * (v1 - v0))  # noqa: E731  a place on the section, from its upper left corner
    rg = sheet.take(u1 - u0, v1 - v0, 64, u0, v0, at=(1216, 1124))
    rect = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    c.flat("CrewCabin_CentrePanel", P, rect, rg)
    # its own outline, the lines the figure parts it by, and its screws
    grey = (0.38, 0.39, 0.39)
    for a, b in ((rect[0], rect[1]), (rect[1], rect[2]), (rect[2], rect[3]), (rect[3], rect[0])):
        rg.line(a, b, 0.05, grey)
    rg.line(at(0.34, 0.0), at(0.34, 0.68), 0.03, grey)
    rg.line(at(0.34, 0.68), at(1.0, 0.68), 0.03, grey)
    rg.line(at(0.525, 0.68), at(0.525, 1.0), 0.03, grey)
    rg.edge_screws(rect)

    # the temperature indicator, and the two rotary switches that chose what it read
    fx, fy, r = TEMPERATURE
    u, v = at(fx, fy)
    mc.round_dial(c, P, faces, "Temperature", TEMPERATURE_DIAL, u, v, r)
    c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -3.6)), r * 0.95 * IN, 12)
    for (fx, fy), around in zip(SELECTORS, SELECTS):
        u, v = at(fx, fy)
        c.turned("CrewCabin_Knobs", P, u, v, [(0.62, 0.0), (0.62, 0.12), (0.46, 0.2), (0.42, 0.6), (0.0, 0.6)], 14)
        c.box("CrewCabin_WhiteCaps", P, u, v + 0.24, 0.1, 0.5, 0.58, 0.64)  # the knob's pointer
        for legend, a in around:
            x, y = mc.clock_xy(a, 1.38)
            rg.text(legend, u + x, v + y, 0.085, INK)
            rg.line((u + 0.72 * x / 1.38, v + 0.72 * y / 1.38), (u + 0.98 * x / 1.38, v + 0.98 * y / 1.38), 0.02, INK)
    rg.text("SENSOR TEMP SELECT", at(SELECTORS[1][0], 0.0)[0], v0 + 0.3, 0.11, INK)

    # the two instruments with two needles each: the first taken as control fuel, the second a plain face
    fx, fy, r = DUALS[0]
    u, v = at(fx, fy)
    mc.fuel_gauge(c, P, faces, u, v, r)
    c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -3.6)), r * 0.95 * IN, 12)
    fx, fy, r = DUALS[1]
    u, v = at(fx, fy)
    c.turned("CrewCabin_Bezels", P, u, v, [(r + 0.14, 0.0), (r + 0.14, 0.3), (r * 0.94, 0.3), (r * 0.92, 0.06)], 32)
    c.disc("CrewCabin_Bezels", P, u, v, r * 0.93, 0.06, None)
    c.into("CrewCabin_Equipment").tube(P @ Vector((u, v, -0.95)), P @ Vector((u, v, -3.6)), r * 0.95 * IN, 12)

    for (fx, fy), name, (a, b) in SWITCHES:
        u, v = at(fx, fy)
        toggle(c, P, u, v, "h")
        if name:
            rg.text(name, u, v + 0.5, 0.11, INK)
        if a:
            rg.text(a, u - 0.4, v, 0.085, INK, align="r")
        if b:
            rg.text(b, u + 0.4, v, 0.085, INK, align="l")
    # the RECORDING light under the recorder's switch
    fx, fy, su, sv = RECORDING
    mc.telelight(c, P, faces, "Recording", "RECORDING", *at(fx, fy), size=(su, sv))


# The temperature indicator's face. That it read in degrees Fahrenheit and what it could be pointed at are the
# flight's (the pilot read "manual peroxide tank, 69 [degrees] ... pitch down thruster, 58" off it: NASA SP-45, the
# air-ground transcript); its scale is not legible in the figure: 0 to 250, as the cabin air gauge beside it. Estimated.
TEMPERATURE_DIAL = dict(
    scale=[(0, 225), (250, 495)],
    majors=[(v, str(v)) for v in range(0, 251, 50)],
    minor=10,
    titles=[("TEMP", 0, 0.2, 0.06), ("DEG F", 0, -0.32, 0.05)],
    rest=70.0,
    pointer="white",
)


def television(parent, M: dict, out: dict) -> None:
    """The television camera on its bracket to the right of the hand controller, pointed at the pilot's face: a
    tube with a lens on its end and a connector on its back, a clamp round it, and a post from the clamp down to a
    foot on the hand controller's box."""
    eye = Vector(out["eye"])
    at = Vector(CAMERA_AT)
    aim = (eye - at).normalized()
    F = frame(at * IN, aim)
    r, long = CAMERA
    lr, ll = CAMERA_LENS
    body, glass, mount = MeshBuilder(), MeshBuilder(), MeshBuilder()
    # the body, a little waisted at its ends, and the cap on its back with the cable's connector
    body.lathe(
        prof(
            [
                (0.0, -long / 2 - 0.5),
                (0.55, -long / 2 - 0.5),
                (0.55, -long / 2),
                (r - 0.12, -long / 2),
                (r, -long / 2 + 0.15),
                (r, long / 2 - 0.15),
                (r - 0.12, long / 2),
                (lr + 0.12, long / 2),
                (lr + 0.12, long / 2 + 0.35),
                (lr, long / 2 + 0.35),
                (lr, long / 2 + ll),
                (lr - 0.14, long / 2 + ll),
                (lr - 0.2, long / 2 + ll - 0.3),
            ]
        ),
        24,
        matrix=F,
    )
    glass.lathe(prof([(lr - 0.2, long / 2 + ll - 0.3), (0.0, long / 2 + ll - 0.22)]), 20, matrix=F)
    # the clamp round its middle and the post down to its foot, toward the hand controller's box
    mount.lathe(prof([(r + 0.06, -0.55), (r + 0.2, -0.55), (r + 0.2, 0.55), (r + 0.06, 0.55)]), 24, matrix=F)
    foot = Vector(out["Ctl_HandController"]) / IN + Vector((1.45, -0.6, 0.0))  # on the box's top, beside the grip
    down = (foot - at).normalized()
    side = (down - aim * down.dot(aim)).normalized()  # square to the camera's own line
    mount.tube((at + side * (r + 0.1)) * IN, (foot + Vector((0, 0, 0.15))) * IN, 0.3 * IN, 10)
    mount.lathe(prof([(0.7, 0.0), (0.7, 0.2), (0.3, 0.27)]), 14, matrix=Matrix.Translation(foot * IN))
    for mb, name, mat in ((body, "TV_Camera", "bezel"), (glass, "TV_Lens", "crystal"), (mount, "TV_Bracket", "lever")):
        obj = mb.build(name, M[mat], parent, sharp_angle=35)
        obj["label"], obj["about"] = TV


def hatch_inside(parent, vessel: Surf, M: dict, hatch) -> None:
    """The explosive hatch's inner face as No. 13's, with all seventy bolts in (mercury_cabin_13.hatch_inside), and
    this flight's words on it."""
    mercury_cabin_13.hatch_inside(parent, vessel, M, hatch)
    if not interior():
        return
    for name in ("Hatch_Initiator", "Hatch_Plunger", "Hatch_SafetyPin"):
        bpy.data.objects[name]["label"], bpy.data.objects[name]["about"] = PLUNGER
    name_things(parent)


def name_things(parent) -> None:
    for name, (label, about) in THINGS.items():
        obj = bpy.data.objects.get(name)
        if obj is not None and obj.parent == parent:
            obj["label"], obj["about"] = label, about

