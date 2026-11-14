"""The Vostok cabin's fit of 1961: what the pilot of Vostok 1 had in front of him and at his hands.

The pilot's information display system SIS-1-3KA of the Flight Research Institute's laboratory 47 (Darevsky): the
instrument board PD-1-3KA with the Globus, the control panel PU-1-3KA with the logical lock, the hand controller
RU-1A; the Vzor on the porthole at his feet; the television camera and its lamp between the board and the Vzor; the
cabin's two lamps; the broadcast receiver at his right. vostok_3ka.build(fit="1961") builds it in place of the plain
board, panel, grip and sight the type has otherwise. What each thing rests on is in the flight's spacecraft.md,
"Cabin"; almost every size here is read off photographs and is estimated.

Millimetres. Places in the cabin are given from the sphere's centre as (left, head, up): toward the pilot's left,
level toward the entry hatch over his head, and along the spacecraft's long axis toward the forward pole. A panel has
its own frame: origin in its middle, +X to its reader's right, +Y up its face, +Z out of it at the reader.

What the viewer is promised (types.ts: CabinDef), the same names the Mercury cabin keeps to:
    Gauge_<Name>    a needle or hand, its origin on its pivot, turning about its face's normal: `turn` (value, radians
                    anticlockwise from straight up the face, pairs), `rest` (the value it was built at), `wrap`
    Tele_<Name>     a signal lamp's lens, with a material of its own
    Ctl_<Name>      a control: `press` (metres) for a key or a button, `throw` for a lever (radians about its own X)
    Lamp_<n>        a cabin lamp's lens, with a material of its own
    Vzor_Screen     the Vzor's central screen (`screen_radius`), and Vzor_Ring, its ring of eight ports
    Globus_Globe    the Globus's globe, its origin at its centre, its own +Z the Earth's axis toward the north
"""

from __future__ import annotations

import math

import bpy
from mathutils import Matrix, Vector
from mathutils.geometry import tessellate_polygon

import vostok_3ka as ka
from srlib import TAU, MeshBuilder, load_font, material, text_mesh

MM = ka.MM

# ------------------------------------------------------------------ where things are (mm)

# The board. It hangs above the Vzor with its face at 45 degrees to the long axis (the installation drawing, as quoted
# second hand); where its middle is, is read off the photograph of the flown cabin through hatch No. 1: some 490 mm
# higher than the Vzor's middle, on the ship's plane of symmetry, close under the lining.
BOARD_AT = (0.0, -520.0, 720.0)
BOARD_TILT = math.radians(45.0)
BOARD_W, BOARD_H, BOARD_DEEP = 400.0, 350.0, 86.0
# its outline, from its top left corner: across and down. The bottom edge is notched between the clock and the gauge of
# pressures, which hangs lower than the others
BOARD_OUTLINE = [(0, 0), (400, 0), (400, 366), (275, 366), (262, 325), (150, 325), (138, 350), (0, 350)]
GLOBUS_PLATE = (56.0, 19.0, 288.0, 234.0)  # left, top, right, bottom on the board's face
GLOBE_AT = (140.0, 154.0)
GLOBE_D = 127.0  # the globe (published for the instrument as Voskhod carried it; taken as the same)
GLOBE_WINDOW = 50.0  # the radius of the opening it is seen through
CLOCK_AT, CLOCK_R = (92.0, 294.0), 39.0
GAUGE_R = 31.0
GAUGES_AT = {"air": (176.0, 280.0), "gas": (248.0, 280.0), "pressures": (316.0, 323.0)}
LAMP_BLOCKS = (("TS1", 304.0, 396.0, 10.0, 133.0, 5), ("TS2", 304.0, 396.0, 137.0, 238.0, 5), ("TS3", 304.0, 396.0, 242.0, 284.0, 2))

# The control panel: a black box at his left with its face to the middle of the cabin and its raked side toward his head.
# (as far toward the pilot as the descent module's parachute container, which fills the cabin's upper left, lets it come)
PANEL_AT = (270.0, -558.0, 460.0)  # the middle of its face
PANEL_W, PANEL_H, PANEL_DEEP = 330.0, 470.0, 75.0
PANEL_RAKE = math.radians(30.0)

# The hand controller, on a bracket at his right.
STICK_AT = (-400.0, -150.0, 330.0)

# The Vzor: on the porthole of hatch No. 3. Sizes off the photograph of the flown cabin, give or take 15 per cent.
VZOR_BEZEL_R = 150.0
VZOR_SCREEN_R = 80.0
VZOR_DEEP = 232.0  # its face, inward from the pressure hull
VZOR_PORTS = 8

# The television camera and its lamp, under the board's lower edge; the cabin's two lamps; the receiver.
TV_AT = (-40.0, -705.0, 505.0)
TV_LAMP_AT = (62.0, -705.0, 505.0)
LAMPS_AT = ((235.0, -150.0, 850.0), (-235.0, -150.0, 850.0))
# What the Globus's correction window read on the pad: the orbit's period as a three-figure code (spacecraft.md, "Globus").
GLOBUS_CORRECTION = "710"
RADIO_AT = (-455.0, -455.0, 470.0)

# ---------------------------------------------------------------------- what the gauges show

# Each of the three round gauges has three scales, each with a needle on a hub of its own. A scale: its hub on the
# face (across, up, in radii from the gauge's middle), the arc's radius (radii), and (value, degrees clockwise from
# straight up the face) at its two ends; the figures written on it; the reading it is built at. The scales' ranges and
# figures are read off the board of a later Vostok kept at the Armed Forces Museum (Commons: Vostokpanel.jpg), which
# carries the same three gauges; where each scale's ends stand round its hub is estimated from it.
SCALES = {
    # the cabin's air: pressure, humidity, temperature. Built at Gagarin's readings before launch: 1.0, 65 per cent, 19 degrees
    "CabinPressure": ("air", (0.0, 0.26), 0.56, (0.0, -68.0), (1.5, 68.0), (0.0, 0.5, 1.0, 1.5), 0.1, 1.0),
    "Humidity": ("air", (-0.44, -0.40), 0.43, (30.0, 152.0), (90.0, 28.0), (50.0, 70.0, 90.0), 10.0, 65.0),
    "Temperature": ("air", (0.44, -0.40), 0.43, (0.0, -152.0), (40.0, -28.0), (10.0, 20.0, 30.0, 40.0), 5.0, 19.0),
    # the cabin's gas and the instrument module's pressure. The module's is built at his reading, 1.2; the two gases at fresh air's
    "CarbonDioxide": ("gas", (0.0, 0.26), 0.56, (0.0, -68.0), (4.0, 68.0), (0.0, 1.0, 2.0, 3.0, 4.0), 0.5, 0.0),
    "Oxygen": ("gas", (-0.44, -0.40), 0.43, (0.0, 152.0), (40.0, 28.0), (20.0, 30.0, 40.0), 5.0, 21.0),
    "ModulePressure": ("gas", (0.44, -0.40), 0.43, (0.0, -152.0), (2.0, -28.0), (0.5, 1.0, 1.5, 2.0), 0.25, 1.2),
    # the gas for turning the ship, by hand and automatic, and the braking engine's bottle. Built at his readings: 155, 320, 155
    "ManualGas": ("pressures", (0.0, 0.26), 0.56, (0.0, -68.0), (200.0, 68.0), (50.0, 100.0, 150.0, 200.0), 10.0, 155.0),
    "RetroPressure": ("pressures", (-0.44, -0.40), 0.43, (0.0, 152.0), (360.0, 28.0), (100.0, 200.0, 300.0), 20.0, 320.0),
    "AutomaticGas": ("pressures", (0.44, -0.40), 0.43, (0.0, -152.0), (200.0, -28.0), (100.0, 200.0), 20.0, 155.0),
}
HUB_LETTERS = {
    "CabinPressure": "Pк",
    "Humidity": "ВЛ",
    "Temperature": "°C",
    "CarbonDioxide": "CO2",
    "Oxygen": "O2",
    "ModulePressure": "ОТСЕК",
    "ManualGas": "АТА",
    "RetroPressure": "АТА",
    "AutomaticGas": "АТА",
}
# the words on each face, left and right of its upper hub
GAUGE_TITLES = {"air": ("ВОЗДУХ", "КАБИНЫ"), "gas": ("КАБИНА", "ОТСЕК"), "pressures": ("ТДУ", "ОРИЕНТ.")}

# The signal lamps: three blocks down the board's right side, two columns each. Colours and words are a
# reconstruction (vostoksupersite, from archive documents it names, with doubts of its own): the lenses are plain.
LAMPS = {
    "TS1": ("red", "red", "red", "red", "red", "red", "amber", "amber", "amber", "amber"),
    "TS2": ("amber", "amber", "amber", "amber", "green", "green", "green", "green", "green", "green"),
    "TS3": ("green", "green", "green", "green"),
}


# ------------------------------------------------------------------------------ frames


def place(left: float, head: float, up: float) -> Vector:
    """A place in the cabin, in the scene's millimetres."""
    h = Vector((math.cos(ka.HATCH_AZ), math.sin(ka.HATCH_AZ), 0.0))
    u = Vector((0.0, 0.0, 1.0))
    return Vector((0.0, 0.0, ka.Z_C)) + h.cross(u) * left + h * head + u * up


def way(left: float, head: float, up: float) -> Vector:
    """A direction in the cabin, in the scene's axes."""
    return (place(left, head, up) - place(0, 0, 0)).normalized()


def face(at: Vector, out: Vector, top: Vector) -> Matrix:
    """A panel's frame (millimetres): origin `at`, +Z `out` at its reader, +Y as near `top` as that allows."""
    z = out.normalized()
    y = (top - z * top.dot(z)).normalized()
    m = Matrix((y.cross(z), y, z)).transposed().to_4x4()
    m.translation = at
    return m


def board_frame() -> Matrix:
    """The board's face: its origin at the face's top left corner turned so that +X is across and +Y is DOWN the face
    is awkward to build in, so this is the usual frame at the middle of a rectangle BOARD_W by BOARD_H."""
    out = way(0, math.cos(BOARD_TILT), -math.sin(BOARD_TILT))
    return face(place(*BOARD_AT), out, way(0, 0, 1))


def on_board(x: float, y: float) -> tuple[float, float]:
    """A place on the board's face given across and down from its top left corner, in the board's frame."""
    return x - BOARD_W / 2, BOARD_H / 2 - y


def board_in_seat() -> Vector:
    """The middle of the board's face in the seat's frame, millimetres: what the seated pilot looks at."""
    return ka.seat_frame().inverted() @ place(*BOARD_AT)


# ----------------------------------------------------------------------------- the builder


class Fit:
    """What is being built: meshes by name, each in one material, and the nodes the viewer moves or lights."""

    def __init__(self, parent: bpy.types.Object, M: dict) -> None:
        self.g, self.M = parent, M
        self.mb: dict[str, tuple[MeshBuilder, str]] = {}
        self.font = load_font()
        self.letters: dict[str, tuple] = {}

    def into(self, name: str, mat: str) -> MeshBuilder:
        return self.mb.setdefault(name, (MeshBuilder(), mat))[0]

    def node(self, name: str, mat: str, F: Matrix, shape, own: bool = False, **props) -> bpy.types.Object:
        """Something the viewer moves, lights or names: an object of its own with its origin at F's (the node keeps F's
        turn, so its own +Z is the panel's normal), built by shape(mb) in millimetres about that origin."""
        mb = MeshBuilder()
        shape(mb)
        mb.verts = [tuple(Vector(p) * MM) for p in mb.verts]
        props.setdefault("reach", max(Vector(p).length for p in mb.verts))
        obj = mb.build(name, self.M[mat].copy() if own else self.M[mat], self.g, smooth=False)
        m = F.to_3x3().normalized().to_4x4()
        m.translation = F.translation * MM
        obj.matrix_local = m
        for key, value in props.items():
            obj[key] = value
        return obj

    def finish(self) -> None:
        for name, (mb, mat) in self.mb.items():
            if not mb.verts:
                continue
            mb.verts = [tuple(Vector(p) * MM) for p in mb.verts]
            ka.inside_cabin(mb.build(name, self.M[mat], self.g, sharp_angle=35), 10.0)

    # -- shapes on a panel ------------------------------------------------------

    def flat(self, mb: MeshBuilder, F: Matrix, pts, w: float) -> None:
        """A flat polygon facing the reader, `w` above the panel."""
        tris = []
        for a, b, d in tessellate_polygon([[Vector((u, v, 0)) for u, v in pts]]):
            area = (pts[b][0] - pts[a][0]) * (pts[d][1] - pts[a][1]) - (pts[b][1] - pts[a][1]) * (pts[d][0] - pts[a][0])
            tris.append((a, b, d) if area > 0 else (a, d, b))
        mb.add([tuple(F @ Vector((u, v, w))) for u, v in pts], tris)

    def wall(self, mb: MeshBuilder, F: Matrix, pts, w0: float, w1: float) -> None:
        """A wall round a polygon's edge (listed anticlockwise as its reader sees it) from w0 to w1, facing outward."""
        n = len(pts)
        for i in range(n):
            (u0, v0), (u1, v1) = pts[i], pts[(i + 1) % n]
            mb.add([tuple(F @ Vector(q)) for q in ((u0, v0, w0), (u1, v1, w0), (u1, v1, w1), (u0, v0, w1))], [(0, 1, 2, 3)])

    def block(self, mb: MeshBuilder, F: Matrix, u: float, v: float, su: float, sv: float, w0: float, w1: float) -> None:
        mb.box((su, sv, w1 - w0), F @ Matrix.Translation((u, v, (w0 + w1) / 2)))

    def disc(self, mb: MeshBuilder, F: Matrix, u: float, v: float, r: float, w: float, segs: int = 40) -> None:
        mb.lathe([(r, 0.0), (0.0, 0.0)], segs, matrix=F @ Matrix.Translation((u, v, w)))

    def turned(self, mb: MeshBuilder, F: Matrix, u: float, v: float, profile, segs: int = 24, w: float = 0.0) -> None:
        mb.lathe(profile, segs, matrix=F @ Matrix.Translation((u, v, w)))

    def tick(self, mb: MeshBuilder, F: Matrix, u: float, v: float, cw: float, r0: float, r1: float, width: float, w: float) -> None:
        """A stroke of a scale: along the radius at `cw` degrees clockwise from straight up, from r0 to r1."""
        a = math.radians(cw)
        along, across = Vector((math.sin(a), math.cos(a), 0)), Vector((math.cos(a), -math.sin(a), 0)) * (width / 2)
        c = Vector((u, v, w))
        pts = [c + along * r0 - across, c + along * r0 + across, c + along * r1 + across, c + along * r1 - across]
        mb.add([tuple(F @ p) for p in pts], [(0, 1, 2, 3)])

    def text(self, mb: MeshBuilder, F: Matrix, body: str, u: float, v: float, height: float, w: float, spin: float = 0.0) -> None:
        """Lettering lying on a panel, its middle at (u, v), its capitals `height` tall, turned `spin` degrees anticlockwise."""
        if not body:
            return
        if body not in self.letters:
            verts, faces = text_mesh(body, 1.0, self.font, cuts=0)
            xs, ys = [p[0] for p in verts], [p[1] for p in verts]
            self.letters[body] = (verts, faces, (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2)
        verts, faces, cx, cy = self.letters[body]
        k = height / 0.716  # (the font's capitals are 0.716 of its size)
        turn = Matrix.Rotation(math.radians(spin), 4, "Z")
        mb.add([tuple(F @ (Vector((u, v, w)) + turn @ Vector(((x - cx) * k, (y - cy) * k, 0)))) for x, y, _ in verts], faces)


def pointer(length: float, width: float, tail: float = 0.0, hub: float = 0.0, lift: float = 0.0):
    """A needle lying along +Y from its pivot, flat, facing the reader; `hub`: a cap on its pivot."""

    def shape(mb: MeshBuilder) -> None:
        w = width / 2
        mb.add(
            [
                (-w, -tail, lift),
                (w, -tail, lift),
                (w, length * 0.7, lift),
                (w * 0.3, length, lift),
                (-w * 0.3, length, lift),
                (-w, length * 0.7, lift),
            ],
            [(0, 1, 2, 5), (5, 2, 3, 4)],
        )
        if hub:
            mb.lathe([(hub, lift - 0.4), (hub, lift + 1.6), (0.0, lift + 1.6)], 14)

    return shape


def scale_at(lo: tuple[float, float], hi: tuple[float, float], value: float) -> float:
    """Degrees clockwise from straight up at which a value stands on a scale between its two ends."""
    return lo[1] + (hi[1] - lo[1]) * (value - lo[0]) / (hi[0] - lo[0])


def figure(value: float) -> str:
    return f"{value:g}".replace(".", ",")


# -------------------------------------------------------------------------------- materials


def materials(M: dict) -> dict:
    def m(name: str, *args, **kw):
        return bpy.data.materials.get(name) or material(name, *args, **kw)

    return {
        **M,
        # hammered grey enamel, as every photograph of a board of this family has it
        "board": m("paint-hammer-grey", (0.36, 0.38, 0.39), 0.35, 0.5),
        "plate": m("paint-hammer-grey-light", (0.42, 0.44, 0.45), 0.35, 0.5),
        "bezel": m("bezel-black", (0.012, 0.012, 0.014), 0.2, 0.42),
        "dial": m("dial-black", (0.02, 0.02, 0.022), 0.0, 0.6),
        "marks": m("dial-marks-white", (0.86, 0.86, 0.8), 0.0, 0.6),
        "marks_dark": m("panel-marks-white", (0.8, 0.8, 0.76), 0.0, 0.6),
        "crystal": m("crystal", (0.75, 0.82, 0.85), 0.0, 0.04, alpha=0.06),
        "needle": m("needle-white", (0.9, 0.9, 0.86), 0.0, 0.6),
        "hub": m("hub-blue-green", (0.07, 0.3, 0.3), 0.0, 0.45),
        "sea": m("globe-sea", (0.25, 0.52, 0.56), 0.0, 0.35),
        "graticule": m("globe-graticule", (0.04, 0.07, 0.08), 0.0, 0.6),
        "knob": m("knob-black", (0.015, 0.015, 0.017), 0.0, 0.4),
        "lever": m("lever-steel", (0.55, 0.55, 0.54), 1.0, 0.32),
        "red": m("cap-red", (0.5, 0.03, 0.02), 0.0, 0.45),
        "key": m("key-ivory", (0.74, 0.72, 0.62), 0.0, 0.5),
        "cover": m("crystal-cover", (0.8, 0.85, 0.85), 0.0, 0.08, alpha=0.12),
        "lamp_red": m("lamp-red", (0.55, 0.04, 0.03), 0.0, 0.3),
        "lamp_amber": m("lamp-amber", (0.75, 0.38, 0.04), 0.0, 0.3),
        "lamp_green": m("lamp-green", (0.05, 0.4, 0.2), 0.0, 0.3),
        "cabin_lamp": m("cabinlight-lens", (0.9, 0.9, 0.85), 0.0, 0.3, emission=(1.0, 0.95, 0.85), emission_strength=0.6),
        "screen": m("vzor-screen", (0.55, 0.62, 0.66), 0.0, 0.25),
        "port": m("vzor-port", (0.12, 0.2, 0.26), 0.0, 0.12),
        "enamel": m("enamel-grey", (0.3, 0.32, 0.33), 0.3, 0.5),
    }


# -------------------------------------------------------------------------------- the board


def round_gauge(c: Fit, F: Matrix, name: str, u: float, v: float) -> None:
    """One of the three gauges of three scales: a black face under a crystal in a black bezel, three hubs, three needles."""
    r = GAUGE_R
    c.turned(c.into("Cabin_Bezels", "bezel"), F, u, v, [(r + 4.5, 0.0), (r + 4.5, 11.0), (r + 1.0, 12.5), (r, 11.0), (r, 1.0)], 40)
    c.disc(c.into("Cabin_Dials", "dial"), F, u, v, r, 1.5, 40)
    c.disc(c.into("Cabin_Crystals", "crystal"), F, u, v, r, 10.2, 24)
    marks = c.into("Cabin_DialMarks", "marks")
    left, right = GAUGE_TITLES[name]
    c.text(marks, F, left, u - r * 0.5, v + r * 0.03, r * 0.075, 3.0)
    c.text(marks, F, right, u + r * 0.5, v + r * 0.03, r * 0.075, 3.0)
    for key, (gauge, hub, radius, lo, hi, figures, minor, rest) in SCALES.items():
        if gauge != name:
            continue
        hu, hv = u + hub[0] * r, v + hub[1] * r
        rr = radius * r
        steps = round((hi[0] - lo[0]) / minor)
        for i in range(steps + 1):
            value = lo[0] + (hi[0] - lo[0]) * i / steps
            major = any(abs(value - f) < 1e-6 for f in figures) or i in (0, steps)
            c.tick(marks, F, hu, hv, scale_at(lo, hi, value), rr * (0.84 if major else 0.9), rr, 0.5 if major else 0.32, 3.0)
        for f in figures:
            a = math.radians(scale_at(lo, hi, f))
            out = 1.2 if hub[0] == 0.0 else 0.62  # (a lower scale's figures stand inside its arc: outside, the two scales' would meet)
            c.text(marks, F, figure(f), hu + math.sin(a) * rr * out, hv + math.cos(a) * rr * out, r * 0.085, 3.0)
        # the hub's cap, lettered with what its needle shows
        c.turned(c.into("Cabin_Hubs", "hub"), F, hu, hv, [(r * 0.15, 3.0), (r * 0.15, 7.2), (0.0, 7.2)], 16)
        c.text(c.into("Cabin_HubLetters", "marks"), F, HUB_LETTERS[key], hu, hv, r * (0.06 if len(HUB_LETTERS[key]) > 3 else 0.085), 8.6)
        at = F @ Matrix.Translation((hu, hv, 4.7)) @ Matrix.Rotation(-math.radians(scale_at(lo, hi, rest)), 4, "Z")
        c.node(
            f"Gauge_{key}",
            "needle",
            at,
            pointer(rr * 0.98, 1.1, 0.0),
            turn=[float(lo[0]), -math.radians(lo[1]), float(hi[0]), -math.radians(hi[1])],
            rest=float(rest),
        )


def clock(c: Fit, F: Matrix, u: float, v: float) -> None:
    """The IVK clock: Moscow time on twelve hours, with a second hand; its flight-time ring and the small dial of days
    are drawn and do not run."""
    r = CLOCK_R
    c.turned(c.into("Cabin_Bezels", "bezel"), F, u, v, [(r + 9.0, 0.0), (r + 9.0, 4.0), (r + 5.0, 12.0), (r + 1.0, 13.0), (r, 11.0), (r, 1.0)], 48)
    c.disc(c.into("Cabin_Dials", "dial"), F, u, v, r, 1.5, 48)
    c.disc(c.into("Cabin_Crystals", "crystal"), F, u, v, r, 10.9, 24)
    marks = c.into("Cabin_DialMarks", "marks")
    for i in range(60):
        c.tick(marks, F, u, v, 6.0 * i, r * (0.86 if i % 5 == 0 else 0.92), r * 0.97, 0.9 if i % 5 == 0 else 0.35, 3.0)
    for h in range(1, 13):
        a = math.radians(30.0 * h)
        c.text(marks, F, str(h), u + math.sin(a) * r * 0.72, v + math.cos(a) * r * 0.72, r * 0.12, 3.0)
    # the small dial of days below the middle, and the two crowns: the hours' at three o'clock, the seconds' at six
    for i in range(12):
        c.tick(marks, F, u, v - r * 0.38, 30.0 * i, r * 0.13, r * 0.17, 0.3, 3.0)
    c.turned(c.into("Cabin_Knobs", "knob"), F, u + r + 10.0, v, [(5.0, 4.0), (5.0, 22.0), (0.0, 22.0)], 12)
    c.turned(c.into("Cabin_Knobs", "knob"), F, u, v - r - 9.0, [(5.0, 4.0), (5.0, 22.0), (0.0, 22.0)], 12)
    for name, period, length, width, lift in (("Hour", 43200.0, 0.5, 2.6, 4.7), ("Minute", 3600.0, 0.78, 1.9, 6.2), ("Second", 60.0, 0.84, 0.7, 7.7)):
        c.node(
            f"Gauge_Clock{name}",
            "needle",
            F @ Matrix.Translation((u, v, 0.0)),
            pointer(r * length, width, r * 0.14, hub=2.4 if name == "Second" else 0.0, lift=lift),
            turn=[0.0, 0.0, period, -TAU],
            wrap=period,
            rest=0.0,
        )


def globus(c: Fit, F: Matrix) -> None:
    """The Globus: a globe that turns under a ring with a cross, on its own plate; the window of the correction counter
    and the switch under it; the two knobs."""
    x0, y0, x1, y1 = GLOBUS_PLATE
    (u0, v1), (u1, v0) = on_board(x0, y0), on_board(x1, y1)
    plate = [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]
    c.flat(c.into("Cabin_GlobusPlate", "plate"), F, plate, 3.0)
    c.wall(c.into("Cabin_GlobusPlate", "plate"), F, plate, 0.0, 3.0)
    gu, gv = on_board(*GLOBE_AT)
    rw = GLOBE_WINDOW
    c.turned(c.into("Cabin_Bezels", "bezel"), F, gu, gv, [(rw + 12.0, 3.0), (rw + 12.0, 9.0), (rw + 4.0, 13.0), (rw, 13.0), (rw, 4.0)], 56)
    # the globe sits with its middle behind the plate, so that a cap of it stands in the window
    sink = math.sqrt((GLOBE_D / 2) ** 2 - (rw - 2.0) ** 2) - 6.0
    centre = F @ Matrix.Translation((gu, gv, -sink))

    def ball(mb: MeshBuilder) -> None:
        rg = GLOBE_D / 2
        mb.lathe([(rg * math.cos(math.radians(a)), rg * math.sin(math.radians(a))) for a in range(-90, 91, 6)], 48)

    # (its axis lies along the board's own up as built: how it stood at any instant is the orbit's, and is not built in)
    tilt = Matrix.Rotation(math.radians(-90.0), 4, "X")
    globe = c.node("Globus_Globe", "sea", centre @ tilt, ball, reach=rw * MM)

    def lines(mb: MeshBuilder) -> None:
        rg = GLOBE_D / 2 + 1.5
        for lat in range(-60, 61, 30):
            a = math.radians(lat)
            mb.lathe([(rg * math.cos(a) - 0.01, rg * math.sin(a) - 0.4), (rg * math.cos(a) + 0.01, rg * math.sin(a) + 0.4)], 48)
        for k in range(12):
            m = Matrix.Rotation(TAU * k / 12, 4, "Z") @ Matrix.Rotation(math.radians(90), 4, "X")
            mb.lathe([(rg, -0.4), (rg, 0.4)], 24, matrix=m, arc=(-math.pi / 2 + 0.17, math.pi / 2 - 0.17))

    lines_ = c.node("Globus_Graticule", "graticule", centre @ tilt, lines, reach=rw * MM)
    lines_.parent = globe  # (it turns with the globe)
    lines_.matrix_local = Matrix.Identity(4)
    # the cross over it, on the crystal
    cross = c.into("Cabin_GlobusCross", "graticule")
    top = GLOBE_D / 2 - sink + 3.6
    for turn in (0.0, 90.0):
        c.tick(cross, F, gu, gv, turn, -rw * 0.5, rw * 0.5, 0.6, top)
    c.turned(c.into("Cabin_Crystals", "crystal"), F, gu, gv, [(rw, 5.0), (rw * 0.86, top + 0.4), (rw * 0.5, top + 2.2), (0.0, top + 2.6)], 32)
    marks = c.into("Cabin_BoardMarks", "marks_dark")
    # the window "landing place" over the globe
    lu, lv = gu, gv + rw + 26.0
    c.block(c.into("Cabin_Bezels", "bezel"), F, lu, lv, 44.0, 13.0, 3.0, 6.0)
    c.block(c.into("Cabin_Windows", "dial"), F, lu, lv, 38.0, 8.0, 6.0, 7.4)
    # the correction counter's window: Gagarin read 710 in it at 07:29 («коррекция цифра 710»: the transcript as the
    # archive's two prints have it; a newspaper's print has 510, and other figures of the same report wrong: spacecraft.md)
    cu, cv = on_board(232.0, 44.0)
    c.block(c.into("Cabin_Bezels", "bezel"), F, cu, cv, 34.0, 15.0, 3.0, 6.0)
    c.block(c.into("Cabin_Windows", "dial"), F, cu, cv, 29.0, 10.0, 6.0, 7.4)
    c.text(c.into("Cabin_DialMarks", "marks"), F, GLOBUS_CORRECTION, cu, cv, 6.2, 8.9)
    # the switch under it: С, П, Л round a black knob
    su, sv = on_board(238.0, 92.0)
    c.turned(c.into("Cabin_Knobs", "knob"), F, su, sv, [(13.0, 3.0), (13.0, 9.0), (8.0, 12.0), (8.0, 26.0), (0.0, 26.0)], 16)
    c.block(c.into("Cabin_Knobs", "knob"), F, su, sv, 5.0, 26.0, 26.0, 31.0)
    for letter, (du, dv) in (("С", (-17.0, 15.0)), ("П", (-22.0, 0.0)), ("Л", (-17.0, -15.0))):
        c.text(marks, F, letter, su + du, sv + dv, 4.4, 4.4)
    c.text(marks, F, "КОРРЕКЦИЯ", su, sv - 26.0, 4.2, 4.4)
    # the two knobs under the globe
    for letter, x in (("Э", 78.0), ("О", 202.0)):
        ku, kv = on_board(x, 214.0)
        c.turned(c.into("Cabin_Knobs", "knob"), F, ku, kv, [(11.0, 3.0), (9.0, 22.0), (0.0, 22.0)], 16)
        c.text(c.into("Cabin_HubLetters", "marks"), F, letter, ku, kv, 6.0, 23.4)


def lamp_blocks(c: Fit, F: Matrix) -> None:
    """The three blocks of signal lamps: each lens its own mesh in its own material, in a black grille."""
    for name, x0, x1, y0, y1, rows in LAMP_BLOCKS:
        (u0, v1), (u1, v0) = on_board(x0, y0), on_board(x1, y1)
        c.block(c.into("Cabin_Bezels", "bezel"), F, (u0 + u1) / 2, (v0 + v1) / 2, u1 - u0, v1 - v0, 0.0, 5.0)
        pitch_u, pitch_v = (u1 - u0) / 2, (v1 - v0) / rows
        for i, colour in enumerate(LAMPS[name]):
            row, col = divmod(i, 2)
            lu, lv = u0 + pitch_u * (col + 0.5), v1 - pitch_v * (row + 0.5)

            def lens(mb: MeshBuilder, su=pitch_u - 9.0, sv=pitch_v - 7.0) -> None:
                mb.box((su, sv, 3.0), Matrix.Translation((0, 0, 1.5)))

            c.node(f"Tele_{name}_{i + 1}", f"lamp_{colour}", F @ Matrix.Translation((lu, lv, 6.4)), lens, own=True)
        # the grille: a bar along each row's upper and lower edge, in each column
        for col in (0, 1):
            lu = u0 + pitch_u * (col + 0.5)
            for b in range(rows + 1):
                thick = 6.0 if 0 < b < rows else 3.0
                lv = v1 - pitch_v * b + (-3.0 if b == 0 else 3.0 if b == rows else 0.0)
                c.block(c.into("Cabin_Bezels", "bezel"), F, lu, lv, pitch_u - 5.0, thick, 5.0, 11.0)


def board(c: Fit) -> Matrix:
    F = board_frame()
    outline = [on_board(x, y) for x, y in reversed(BOARD_OUTLINE)]  # (anticlockwise as its reader sees it)
    body = c.into("Cabin_InstrumentBoard", "board")
    c.flat(body, F, outline, 0.0)
    c.wall(body, F, outline, -BOARD_DEEP, 0.0)
    c.flat(body, F @ Matrix.Translation((0, 0, -BOARD_DEEP)) @ Matrix.Rotation(math.pi, 4, "Y"), [(-u, v) for u, v in reversed(outline)], 0.0)
    globus(c, F)
    lamp_blocks(c, F)
    clock(c, F, *on_board(*CLOCK_AT))
    for name, at in GAUGES_AT.items():
        round_gauge(c, F, name, *on_board(*at))
    # what it hangs by: two arms from its back up to the cabin's frame
    arms = c.into("Cabin_Brackets", "enamel")
    for sx in (-1, 1):
        arms.box((28.0, 36.0, 60.0), F @ Matrix.Translation((sx * 120.0, 60.0, -BOARD_DEEP - 30.0)))
    return F


# ----------------------------------------------------------------------- the control panel


def tumbler(c: Fit, F: Matrix, u: float, v: float, up: bool = True, name: str | None = None, throw=None) -> None:
    """A tumbler: a hexagonal nut and its lever, leaning up or down the face. `name`: the lever is a node the viewer
    throws, built in the first of its positions (`throw`: where it leans in each, degrees up the face)."""
    c.turned(c.into("Cabin_Fittings", "lever"), F, u, v, [(5.5, 0.0), (5.5, 2.6), (3.6, 2.6), (3.6, 4.6), (0.0, 4.6)], 6)

    def lever(mb: MeshBuilder) -> None:
        mb.lathe([(0.0, 0.0), (1.5, 0.0), (1.5, 15.0), (2.2, 17.0), (2.2, 19.5), (0.0, 20.5)], 8)

    if name:
        leans = [math.radians(a) for a in throw]
        at = F @ Matrix.Translation((u, v, 4.8)) @ Matrix.Rotation(-leans[0], 4, "X")
        c.node(name, "lever", at, lever, throw=[leans[0] - a for a in leans])
    else:
        mb = MeshBuilder()
        lever(mb)
        at = F @ Matrix.Translation((u, v, 4.8)) @ Matrix.Rotation(math.radians(-24.0 if up else 24.0), 4, "X")
        c.into("Cabin_Fittings", "lever").add(mb.verts, mb.faces, None, at)


def knob(c: Fit, F: Matrix, u: float, v: float, r: float = 9.0, tall: float = 16.0, pointer_bar: bool = False) -> None:
    c.turned(c.into("Cabin_Knobs", "knob"), F, u, v, [(r, 0.0), (r, tall * 0.55), (r * 0.8, tall), (0.0, tall)], 16)
    if pointer_bar:
        c.block(c.into("Cabin_Knobs", "knob"), F, u, v, r * 0.5, r * 2.6, tall, tall + 4.0)


def button(c: Fit, F: Matrix, u: float, v: float, mat: str = "knob", name: str | None = None, r: float = 5.0) -> None:
    c.turned(c.into("Cabin_Fittings", "lever"), F, u, v, [(r + 2.5, 0.0), (r + 2.5, 3.0), (r + 0.6, 3.0)], 12)

    def cap(mb: MeshBuilder) -> None:
        mb.lathe([(r, 0.0), (r, 5.0), (0.0, 5.0)], 12)

    if name:
        c.node(name, mat, F @ Matrix.Translation((u, v, 2.0)), cap, press=0.003)
    else:
        mb = MeshBuilder()
        cap(mb)
        c.into("Cabin_Caps" if mat == "red" else "Cabin_Knobs", mat).add(mb.verts, mb.faces, None, F @ Matrix.Translation((u, v, 2.0)))


def control_panel(c: Fit) -> dict:
    """PU-1-3KA. Its face, top to bottom, as the factory's photograph of it reads; its raked side toward the pilot with
    the lock's six keys and, under a clear cover, the switches that take the ship into the pilot's hands."""
    out = way(-1, 0, 0)
    F = face(place(*PANEL_AT), out, way(0, 0, 1))
    w, h, deep = PANEL_W, PANEL_H, PANEL_DEEP
    body = c.into("Cabin_ControlPanel", "bezel")
    rect = [(-w / 2, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)]
    c.flat(body, F, rect, 0.0)
    # three plain sides, and the fourth raked: the side toward the pilot's head, which is the reader's left
    rake = deep * math.tan(PANEL_RAKE)
    back = [(-w / 2 - rake, -h / 2), (w / 2, -h / 2), (w / 2, h / 2), (-w / 2 - rake, h / 2)]
    for i in (0, 1, 2):
        (u0, v0), (u1, v1) = rect[i], rect[i + 1]
        (b0u, b0v), (b1u, b1v) = back[i], back[i + 1]
        body.add([tuple(F @ Vector(q)) for q in ((b0u, b0v, -deep), (b1u, b1v, -deep), (u1, v1, 0.0), (u0, v0, 0.0))], [(0, 1, 2, 3)])
    c.flat(body, F @ Matrix.Translation((0, 0, -deep)) @ Matrix.Rotation(math.pi, 4, "Y"), [(-u, v) for u, v in reversed(back)], 0.0)
    marks = c.into("Cabin_PanelMarks", "marks_dark")

    def title(body_: str, u: float, v: float, size: float = 4.2) -> None:
        c.text(marks, F, body_, u, v, size, 1.4)

    def rule(v: float, u0: float = -w / 2 + 14.0, u1: float = w / 2 - 14.0) -> None:
        c.block(marks, F, (u0 + u1) / 2, v, u1 - u0, 0.6, 0.0, 1.4)

    # row 1: the cabin's temperature, and the gas analyser's clockwork
    title("ТЕПЛЕЕ   ХОЛОДНЕЕ", -40.0, 196.0, 3.6)
    knob(c, F, -40.0, 172.0, 11.0, 15.0, True)
    title("ГАЗОАНАЛИЗАТОР", 78.0, 196.0, 3.6)
    c.into("Cabin_Fittings", "lever").tube(F @ Vector((78.0, 172.0, 0.0)), F @ Vector((96.0, 160.0, 14.0)), 2.2, 8)
    c.turned(c.into("Cabin_Fittings", "lever"), F, 78.0, 172.0, [(7.0, 0.0), (7.0, 4.0), (0.0, 4.0)], 12)
    rule(146.0)
    # row 2: the Globus, and which set of gas bottles the gauge shows
    title("ГЛОБУС", -62.0, 134.0)
    title("МЕСТО ПОЛОЖЕНИЯ", -100.0, 122.0, 2.6)
    title("ВКЛ", -30.0, 122.0, 2.6)
    # (the Globus's mode: built at "место положения", the place under the ship, as it flew; thrown to "место посадки",
    # where a burn begun now would land: Tyapchenko, fig. 16's caption, «тумблера «Глобус» на пульте»)
    tumbler(c, F, -100.0, 104.0, name="Ctl_GlobusMode", throw=(24.0, -24.0))
    tumbler(c, F, -30.0, 104.0)
    title("МЕСТО ПОСАДКИ", -100.0, 88.0, 2.6)
    title("ВЫКЛ", -30.0, 88.0, 2.6)
    title("ДАВЛЕНИЕ ОРИЕНТАЦИИ", 82.0, 134.0, 3.4)
    title("I", 82.0, 122.0, 3.0)
    tumbler(c, F, 82.0, 104.0)
    title("II", 82.0, 88.0, 3.0)
    rule(76.0)
    # row 3: the lamps' test, the Vzor's light, the three blinds
    title("КОНТРОЛЬ ЛАМП", -112.0, 64.0, 2.8)
    button(c, F, -112.0, 46.0)
    title("ПОДСВЕТ", -52.0, 64.0, 2.8)
    knob(c, F, -52.0, 44.0, 8.0, 13.0)
    title("ШТОРКИ", 70.0, 66.0)
    for label, u in (("ВЗОР", 22.0), ("ПРАВ.", 72.0), ("ЗАДН.", 122.0)):
        tumbler(c, F, u, 46.0)
        title(label, u, 30.0, 2.6)
    rule(18.0)
    # row 4: the transmitters, the sound, the television's lamp, the cabin's lamps
    title("ПЕРЕДАТЧИКИ", -92.0, 8.0, 3.4)
    for label, u in (("УКВ", -116.0), ("КВ", -68.0)):
        title(label, u, -2.0, 2.6)
        tumbler(c, F, u, -20.0)
    title("ЗВУК", -14.0, 8.0, 3.0)
    tumbler(c, F, -14.0, -20.0)
    title("СВЕТ ТЕЛЕВИД.", 46.0, 8.0, 2.6)
    tumbler(c, F, 46.0, -20.0)
    title("ОСВЕЩЕНИЕ", 112.0, 8.0, 3.0)
    title("ДЕЖУРН.   РАБОЧЕЕ", 112.0, -3.0, 2.2)
    # (built at "working", as he flew: three positions, working, duty, off)
    tumbler(c, F, 112.0, -20.0, name="Ctl_Lighting", throw=(24.0, 0.0, -24.0))
    title("ВЫКЛ", -92.0, -38.0, 2.4)
    title("ВЫКЛ", 112.0, -38.0, 2.4)
    rule(-48.0)
    # row 5: the tape recorder, the telephones
    title("МАГНИТОФОН", -72.0, -58.0, 3.4)
    for label, u in (("ПЕРЕМОТКА", -118.0), ("ПУСК", -74.0)):
        title(label, u, -68.0, 2.2)
        button(c, F, u, -84.0)
    title("ЗАПИСЬ", -28.0, -68.0, 2.2)
    tumbler(c, F, -28.0, -86.0)
    title("ТЕЛЕФОНЫ", 86.0, -58.0, 3.4)
    for label, u in (("ДИНАМИК", 56.0), ("КВ II", 116.0)):
        title(label, u, -68.0, 2.2)
        tumbler(c, F, u, -86.0)
    rule(-112.0)
    # row 6: which microphone, and the three volumes
    title("ЛАРИНГ.  МИКРОФОН", -92.0, -124.0, 2.4)
    knob(c, F, -92.0, -148.0, 10.0, 14.0, True)
    title("ГРОМКОСТЬ", 56.0, -124.0, 3.4)
    for label, u in (("КВ I", 6.0), ("КВ II", 56.0), ("УКВ", 106.0)):
        knob(c, F, u, -148.0, 8.5, 13.0)
        title(label, u, -168.0, 2.6)

    # the raked side: its own frame, in the middle of the strip, facing the pilot's head and the middle of the cabin
    slant = math.hypot(deep, rake)
    turn = Matrix.Translation((-w / 2, 0.0, 0.0)) @ Matrix.Rotation(-(math.pi / 2 - PANEL_RAKE), 4, "Y") @ Matrix.Translation((-slant / 2, 0.0, 0.0))
    G = F @ turn
    side = c.into("Cabin_ControlPanel", "bezel")
    half = slant / 2
    c.flat(side, G, [(-half, -h / 2), (half, -h / 2), (half, h / 2), (-half, h / 2)], 0.0)
    smarks = c.into("Cabin_PanelMarks", "marks_dark")
    c.text(smarks, G, "КОД", 0.0, 214.0, 3.4, 1.4)
    c.block(c.into("Cabin_Windows", "dial"), G, 0.0, 200.0, 22.0, 5.0, 0.0, 1.4)  # the slot the code's plug goes in
    for k in range(6):  # the six keys, in one column as the factory's photograph has them
        v = 176.0 - 25.0 * k

        def key(mb: MeshBuilder) -> None:
            mb.box((15.0, 15.0, 7.0), Matrix.Translation((0, 0, 3.5)))

        c.node(f"Ctl_Code{k + 1}", "key", G @ Matrix.Translation((0.0, v, 1.6)), key, press=0.003)
        c.text(c.into("Cabin_KeyFigures", "graticule"), G, str(k + 1), 0.0, v, 6.0, 10.0)
    # under the cover: manual orientation, descent III, the braking engine's start (red, guarded), oxygen, the alarm
    for i, (name, kind) in enumerate((("ManualOrientation", "t"), ("Descent3", "t"), ("RetroFire", "b"), ("Oxygen", "t"), ("Alarm", "b"))):
        v = 4.0 - 44.0 * i
        if kind == "t":
            tumbler(c, G, 0.0, v, False, name=f"Ctl_{name}", throw=(-24.0, 24.0))
        else:
            button(c, G, 0.0, v, "red", name=f"Ctl_{name}", r=6.0)
    cover = c.into("Cabin_Covers", "cover")
    cover.box((slant - 14.0, 232.0, 1.6), G @ Matrix.Translation((0.0, -84.0, 30.0)))
    for sv in (-1, 1):
        c.into("Cabin_Fittings", "lever").box((slant - 10.0, 3.0, 36.0), G @ Matrix.Translation((0.0, -84.0 + sv * 117.5, 18.0)))
    return {"face": F, "side": G}


# ---------------------------------------------------------------------- the hand controller


def hand_controller(c: Fit) -> Matrix:
    """RU-1A: a domed box on a bracket, a short stalk on a ball, and across it a black ribbed grip. Its own frame: +Z
    up the stalk, toward the pilot's hand; +X along the grip."""
    at = place(*STICK_AT)
    grasp = ka.seat_frame() @ Vector((-150.0, 250.0, 330.0))  # about where his right hand comes to: estimated
    F = face(at, grasp - at, way(1, 0, 0))
    base = c.into("Cabin_StickBase", "enamel")
    base.box((95.0, 95.0, 60.0), F @ Matrix.Translation((0, 0, -30.0)))
    c.turned(base, F, 0.0, 0.0, [(44.0, 0.0), (40.0, 14.0), (26.0, 24.0), (14.0, 27.0)], 28)
    # the bracket to the wall
    out = (at - place(0, 0, 0)).normalized()
    c.into("Cabin_Brackets", "enamel").tube(at - (F.to_3x3() @ Vector((0, 0, 40.0))), at + out * 170.0, 16.0, 12)

    def stick(mb: MeshBuilder) -> None:
        mb.lathe([(13.0, -2.0), (13.0, 6.0), (6.0, 12.0), (6.0, 52.0), (0.0, 52.0)], 14)
        ribs = 9
        for i in range(ribs):
            x = -55.0 + 110.0 * (i + 0.5) / ribs
            mb.lathe(
                [(0.0, -5.6), (13.0, -5.6), (14.2, 0.0), (13.0, 5.6), (0.0, 5.6)],
                14,
                matrix=Matrix.Translation((x, 0, 64.0)) @ Matrix.Rotation(math.pi / 2, 4, "Y"),
            )

    c.node("Ctl_HandController", "knob", F @ Matrix.Translation((0, 0, 27.0)), stick)
    return F


# ------------------------------------------------------------------------------- the Vzor


def vzor(c: Fit) -> None:
    """The Vzor, on the porthole of hatch No. 3: a ring of eight ports in which the horizon stands as a ring when the
    ship's long axis is level, and in the middle a screen, ruled and arrowed, on which the ground runs."""
    F = ka.INNER.frame(*ka.TECHNOLOGICAL)
    F.translation = F.translation / MM
    F = F @ Matrix.Rotation(math.pi, 4, "Y")  # (its face looks inward: +Z into the cabin)
    # which way up it is: the top of its screen toward the board over it
    up = (place(*BOARD_AT) - F.translation).normalized()
    F = face(F.translation, F.to_3x3() @ Vector((0, 0, 1)), up)
    rb, rs, d = VZOR_BEZEL_R, VZOR_SCREEN_R, VZOR_DEEP
    body = c.into("Cabin_Vzor", "enamel")
    c.turned(
        body,
        F,
        0.0,
        0.0,
        [(ka.PORT_R + 62.0, 44.0), (ka.PORT_R + 62.0, d - 62.0), (rb, d - 10.0), (rb, d + 4.0), (rb - 20.0, d + 4.0), (rb - 20.0, d - 6.0)],
        56,
    )
    c.turned(body, F, 0.0, 0.0, [(rs + 7.0, d - 6.0), (rs + 7.0, d + 4.0), (rs, d + 4.0), (rs, d - 4.0)], 48)
    # the ring: eight ports between eight webs
    web = c.into("Cabin_Vzor", "enamel")

    def ports(mb: MeshBuilder) -> None:
        for k in range(VZOR_PORTS):
            a0, a1 = TAU * (k + 0.1) / VZOR_PORTS, TAU * (k + 0.9) / VZOR_PORTS
            mb.lathe([(rb - 20.0, 0.0), (rs + 7.0, 0.0)], 8, arc=(a0, a1))

    c.node("Vzor_Ring", "port", F @ Matrix.Translation((0, 0, d - 8.0)), ports, reach=rb * MM)
    for k in range(VZOR_PORTS):  # (a web between each two ports: a fifth of the pitch, as wide as that is at the ring's middle)
        c.tick(web, F, 0.0, 0.0, 90.0 - 360.0 * k / VZOR_PORTS, rs + 7.0, rb - 20.0, 0.2 * TAU / VZOR_PORTS * (rs + rb - 13.0) / 2, d - 5.0)

    def screen(mb: MeshBuilder) -> None:
        mb.lathe([(rs, 0.0), (0.0, 0.0)], 48)

    c.node("Vzor_Screen", "screen", F @ Matrix.Translation((0, 0, d - 4.0)), screen, screen_radius=rs * MM, reach=rs * MM)
    # the rulings on it, along the way the ground must run, and the arrows at their ends
    lines = c.into("Cabin_VzorRulings", "graticule")
    for i in range(-3, 4):
        x = i * rs * 0.22
        reach = math.sqrt(max(0.0, (rs * 0.9) ** 2 - x * x))
        c.block(lines, F, x, 0.0, 0.7, 2 * reach, d - 2.4, d - 1.8)
    for x in (-rs * 0.44, 0.0, rs * 0.44):
        c.flat(lines, F, [(x - 3.2, rs * 0.52), (x + 3.2, rs * 0.52), (x, rs * 0.66)], d - 0.3)
    c.disc(c.into("Cabin_Crystals", "crystal"), F, 0.0, 0.0, rs, d + 1.4, 32)


# --------------------------------------------------------- television, lamps, the receiver


def television(c: Fit) -> None:
    """The camera that watched his face, under the board, and the lamp that lit him for it. Its form is not in anything
    read: a plain case and a lens. The second camera, at his right for a view in profile, is a plain barrel."""
    eyes = ka.seat_frame() @ Vector((0.0, 690.0, 150.0))
    for at, size in ((place(*TV_AT), (86.0, 96.0, 170.0)),):
        F = face(at, eyes - at, way(0, 0, 1))
        case = c.into("Cabin_Television", "enamel")
        case.box(size, F @ Matrix.Translation((0, 0, -size[2] / 2)))
        c.turned(c.into("Cabin_Bezels", "bezel"), F, 0.0, 0.0, [(27.0, 0.0), (27.0, 26.0), (22.0, 30.0), (22.0, 20.0)], 24)
        c.disc(c.into("Cabin_Lenses", "lens"), F, 0.0, 0.0, 22.0, 20.0, 20)
    at = place(*TV_LAMP_AT)
    F = face(at, eyes - at, way(0, 0, 1))
    c.turned(c.into("Cabin_Television", "enamel"), F, 0.0, 0.0, [(0.0, -46.0), (30.0, -46.0), (42.0, 0.0), (42.0, 6.0), (36.0, 6.0)], 28)

    def lens(mb: MeshBuilder) -> None:
        mb.lathe([(36.0, 0.0), (0.0, 0.0)], 24)

    c.node("Lamp_Television", "cabin_lamp", F @ Matrix.Translation((0, 0, 3.0)), lens, own=True)
    side = place(-560.0, 60.0, 430.0)
    F = face(side, eyes - side, way(0, 0, 1))
    c.turned(c.into("Cabin_Television", "enamel"), F, 0.0, 0.0, [(0.0, -150.0), (38.0, -150.0), (38.0, 0.0), (30.0, 8.0)], 16)
    c.disc(c.into("Cabin_Lenses", "lens"), F, 0.0, 0.0, 30.0, 8.0, 16)


def cabin_lamps(c: Fit) -> list[Vector]:
    """The cabin's lamps, worked by one switch of three positions (off, duty, working). How many there were and where
    they hung is in nothing read: two are put high on either side, over the pilot's knees. Returns where each is."""
    out = []
    for i, at in enumerate(LAMPS_AT):
        p = place(*at)
        F = face(p, place(0, 0, 250.0) - p, way(0, 1, 0))
        c.turned(c.into("Cabin_LampCases", "enamel"), F, 0.0, 0.0, [(0.0, -34.0), (26.0, -34.0), (34.0, 0.0), (34.0, 5.0), (29.0, 5.0)], 24)

        def lens(mb: MeshBuilder) -> None:
            mb.lathe([(29.0, 0.0), (0.0, 0.0)], 20)

        c.node(f"Lamp_{i + 1}", "cabin_lamp", F @ Matrix.Translation((0, 0, 2.5)), lens, own=True)
        out.append(p)
    return out


def receiver(c: Fit) -> None:
    """The broadcast receiver at his right: a case with a tuning scale, two knobs and the round aircraft clock beside it.
    Its place is known only as "at the right"; its face is not copied from anything."""
    at = place(*RADIO_AT)
    eyes = ka.seat_frame() @ Vector((0.0, 690.0, 150.0))
    F = face(at, eyes - at, way(0, 0, 1))
    case = c.into("Cabin_Receiver", "enamel")
    case.box((190.0, 120.0, 90.0), F @ Matrix.Translation((0, 0, -45.0)))
    c.block(c.into("Cabin_Windows", "dial"), F, -30.0, 22.0, 96.0, 26.0, 0.0, 1.5)
    marks = c.into("Cabin_DialMarks", "marks")
    for i in range(13):
        c.block(marks, F, -72.0 + 7.0 * i, 22.0, 0.5, 14.0 if i % 4 == 0 else 8.0, 1.5, 2.9)
    for u in (-58.0, -6.0):
        knob(c, F, u, -26.0, 10.0, 15.0)
    # the clock: a round black face, twelve strokes, in a bezel
    cu, cv, r = 56.0, 0.0, 32.0
    c.turned(c.into("Cabin_Bezels", "bezel"), F, cu, cv, [(r + 5.0, 0.0), (r + 5.0, 9.0), (r, 10.0), (r, 1.0)], 32)
    c.disc(c.into("Cabin_Dials", "dial"), F, cu, cv, r, 1.5, 32)
    for i in range(12):
        c.tick(marks, F, cu, cv, 30.0 * i, r * 0.8, r * 0.95, 1.0, 3.0)
    c.disc(c.into("Cabin_Crystals", "crystal"), F, cu, cv, r, 8.0, 20)


# ---------------------------------------------------------------------------------- build


def build(parent: bpy.types.Object, M: dict) -> None:
    """Fit the cabin. `parent` is the spacecraft's `Cabin` node; `M` its materials. Prints, in the file's axes and
    metres, what a flight's data needs to be told: the lamps' places and the windows'."""
    c = Fit(parent, materials(M))
    board(c)
    control_panel(c)
    hand_controller(c)
    vzor(c)
    television(c)
    lamps = cabin_lamps(c)
    receiver(c)
    c.finish()

    def told(v: Vector) -> str:
        # (Blender's +Z is the file's +Y and its +Y the file's -Z)
        return f"[{v.x:.3f}, {v.z:.3f}, {-v.y:.3f}]"

    middle = place(0, 0, 250.0)
    for i, p in enumerate(lamps):
        light = p + (middle - p).normalized() * 220.0  # (a hand's breadth and more in from the wall: a bare point at the wall burns it)
        print(f"cabin: lamp {i + 1} at {told(p * MM)}; its light at {told(light * MM)}")
    for name, where in (("entry hatch's porthole", ka.ENTRY), ("right porthole", ka.RIGHT_PORT)):
        print(f"cabin: {name} at {told(ka.INNER.p(*where))}, out {told(ka.Ball.n(*where))}, {2 * ka.PORT_R * MM:.3f} m of glass")
    print(f"cabin: the Vzor looks out along {told(ka.Ball.n(*ka.TECHNOLOGICAL))} from {told(ka.OUTER.p(*ka.TECHNOLOGICAL))}")
