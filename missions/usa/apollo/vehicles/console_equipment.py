"""Apollo main-panel equipment reconstructed from dated CM-101 and CM-103 design layouts.

V36-976018 revision D and SC101 SCS-2100D establish the arrangement. New
dimensions, case sections, installation and colours are ESTIMATED. The shared
structural plane and fixed interfaces remain unchanged; no later equipment
mesh or texture is imported. Source drawing pixels are registered in physical
survey centimetres, then construction dimensions stay in inches until emission.
Controls and displays are static exhibit references, never flight telemetry.
"""

import json
import math
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

from cm_reference import CM_PER_IN, survey_cm
from panel_equipment import PRINT, InchPanel
from srlib import IN, TAU, MeshBuilder, interior, material

FOLDER = Path(__file__).parent / "reference"
BALL_RADIUS = 2.25  # SC103+ Honeywell 4.5-in diameter: ESTIMATED applicability to CM101.
FDAI_RADIUS = 3.5  # Estimated face envelope from CM101 layout, not the fixed hole radius.
CASE_BACK = -4.5  # Estimated schematic enclosure; not a manufacturing depth.
FACE = 0.15


class Console(InchPanel):
    """Inch construction in the registered panel frame, batched by material."""

    def __init__(self, parent, base, source, layout):
        self.origin = Vector(survey_cm(source["apertures"][0]["probe_cm"], source["registration"])) / CM_PER_IN
        back = Vector(source["extraction"]["plane_normal"])
        raw_u = (Vector((1, 0, 0)) - back * back.x).normalized()
        raw_v = -back.cross(raw_u)
        turn = lambda p: Vector((-p.y, p.x, p.z))  # noqa: E731
        self.u, self.v, self.n = turn(raw_u), turn(raw_v), -turn(back)
        a, b = (Vector(p["probe_cm"]) for p in source["apertures"])
        anchors = layout["registration"]["anchors"]
        self.anchor = anchors[0]["image_px"]
        image_delta = complex(anchors[1]["image_px"][0] - self.anchor[0], self.anchor[1] - anchors[1]["image_px"][1])
        self.scale = complex((b - a).dot(raw_u), (b - a).dot(raw_v)) / image_delta
        self.m = {
            "panel": material("apollo-instrument-grey", (0.38, 0.40, 0.38), roughness=0.7),
            "metal": material("apollo-instrument-metal", (0.48, 0.51, 0.52), metallic=0.6, roughness=0.4),
            "black": material("apollo-instrument-black", (0.012, 0.015, 0.017), roughness=0.7),
            "white": material("apollo-instrument-ivory", (0.78, 0.79, 0.73), roughness=0.65),
            "ink": material("apollo-console-ink", (0.012, 0.015, 0.015), roughness=0.85),
            "lens": material("apollo-annunciator-unlit", (0.10, 0.105, 0.085), roughness=0.45),
            "glass": material("crystal", (0.87, 0.92, 0.94), roughness=0.12, alpha=0.08),
        }

        super().__init__(parent, base, self.origin, self.u, self.v, self.n, self.m)

    def xy(self, x, y):
        p = self.scale * complex(x - self.anchor[0], self.anchor[1] - y) / CM_PER_IN
        return p.real, p.imag

    def size(self, pixels):
        return pixels * abs(self.scale) / CM_PER_IN


def _layout(spacecraft):
    # The later ships use their sister ship’s registered layout until control positions can be resolved individually.
    if spacecraft in (106, 107, 108, 109):
        # CM-106 coordinates are rectified to the CM-104 crop. Only the recorded
        # differences replace the common controls. Each call loads fresh data.
        layout = _layout(104)
        variant = json.loads((FOLDER / "apollo-console-layout-106.json").read_text())
        layout.update({key: variant[key] for key in ("source", "registration", "thumbwheels")})
        rows = {row["id"]: row for row in variant["toggle_rows"]}
        layout["toggle_rows"] = [rows.get(row["id"], row) for row in layout["toggle_rows"]]
        return layout
    file = {101: "apollo-console-layout.json", 103: "apollo-console-layout-103.json", 104: "apollo-console-layout-104.json"}[spacecraft]
    return json.loads((FOLDER / file).read_text())


def _validate(parent, base, *, console_clearance=False):
    """Check actual transformed geometry, including the separate ball nodes."""
    from mathutils.bvhtree import BVHTree

    import pressure_vessel

    bpy.context.view_layer.update()
    meshes = [o for o in parent.children_recursive if o.type == "MESH"]
    panel = [o for o in bpy.data.objects if o.type == "MESH" and o.name.startswith("CM_MainConsole_")]
    vertices, faces = [], []
    for obj in panel:
        obj.data.calc_loop_triangles()
        offset = len(vertices)
        vertices.extend(obj.matrix_world @ v.co for v in obj.data.vertices)
        faces.extend(tuple(offset + i for i in face.vertices) for face in obj.data.loop_triangles)
    tree = BVHTree.FromPolygons(vertices, faces, all_triangles=True) if console_clearance and faces else None
    for obj in meshes:
        coords = [obj.matrix_world @ v.co for v in obj.data.vertices]
        for p in coords:
            z, radius = p.z / IN - base, math.hypot(p.x, p.y) / IN
            if not pressure_vessel.AFT <= z <= pressure_vessel.FORWARD or radius > pressure_vessel.radius(z):
                raise ValueError(f"{obj.name} leaves the nominal cabin envelope at Xc={z:.3f}, r={radius:.3f} in")
            if z < pressure_vessel.bulkhead_x(radius):
                raise ValueError(f"{obj.name} passes through the nominal cabin floor")
        if tree:
            for edge in obj.data.edges:
                a, b = (coords[i] for i in edge.vertices)
                delta = b - a
                if delta.length > 1e-6 and tree.ray_cast(a, delta.normalized(), delta.length)[0] is not None:
                    raise ValueError(f"{obj.name} crosses the main-console surface outside its fixed interface")
    print(f"Apollo {parent.name}: actual {len(meshes)} equipment meshes fit the nominal pressure wall and floor")


def _ball(parent, c, u, v, index):
    """A real spherical surface; the painted grid is a generated texture."""
    from srlib import group

    width, height = 1024, 512
    pixels = np.ones((height, width, 4), np.float32)
    pixels[: height // 2, :, :3] = (0.76, 0.77, 0.72)
    pixels[height // 2 :, :, :3] = (0.015, 0.018, 0.022)
    for j in range(1, 12):
        y = round(height * j / 12)
        colour = (0.02, 0.025, 0.025) if y < height // 2 else (0.80, 0.81, 0.75)
        pixels[max(0, y - 1) : y + 1, :, :3] = colour
    for i in range(12):
        x = round(width * i / 12)
        pixels[: height // 2, max(0, x - 1) : x + 1, :3] = (0.02, 0.025, 0.025)
        pixels[height // 2 :, max(0, x - 1) : x + 1, :3] = (0.80, 0.81, 0.75)
    image = bpy.data.images.get("ApolloFDAIReferenceGrid")
    if image is None:
        image = bpy.data.images.new("ApolloFDAIReferenceGrid", width, height, alpha=False)
        image.pixels.foreach_set(pixels.ravel())
        image.pack()
    paint = material(f"apollo-fdai-ball-{index}", (1, 1, 1), roughness=0.65, image=image)
    pivot = group(f"Ball_ApolloFDAI{index}", parent)
    pivot.matrix_local = c.frame(u, v, -1.5)
    pivot["pose_confidence"] = "estimated"
    pivot["pose_note"] = "Static exhibit reference, not a recorded flight attitude; grid simplified"
    mesh = MeshBuilder()
    vertices, uvs = [], []
    nu, nv = 96, 48
    for j in range(nv + 1):
        latitude = math.pi * (j / nv - 0.5)
        for i in range(nu + 1):
            longitude = TAU * i / nu
            vertices.append(
                (
                    BALL_RADIUS * IN * math.cos(latitude) * math.sin(longitude),
                    BALL_RADIUS * IN * math.sin(latitude),
                    BALL_RADIUS * IN * math.cos(latitude) * math.cos(longitude),
                )
            )
            uvs.append((i / nu, j / nv))
    faces = [(j * (nu + 1) + i, j * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i + 1, (j + 1) * (nu + 1) + i) for j in range(nv) for i in range(nu)]
    mesh.add(vertices, faces, uvs)
    return mesh.build(f"CM_FDAI_Ball_{index}", paint, pivot, sharp_angle=None)


def indicators(parent, base, *, spacecraft=101):
    """Two round FDAI front reconstructions around the unchanged fixed holes."""
    if not interior():
        return
    source = json.loads((FOLDER / "apollo-main-console.json").read_text())
    layout = _layout(spacecraft)
    c = Console(parent, base, source, layout)
    parent["geometry_confidence"] = "estimated"
    parent["source"] = layout["source"]["title"]
    for index, anchor in enumerate(layout["registration"]["anchors"], 1):
        u, v = c.xy(*anchor["image_px"])
        # Finite rear case and front rim. The 2.7-in rear barrel clears both
        # measured interfaces; the larger flange begins 0.1 in in front.
        c.lathe("FDAICase", "metal", u, v, [(0, CASE_BACK), (2.7, CASE_BACK), (2.7, 0.1), (FDAI_RADIUS, 0.1), (FDAI_RADIUS, 1.2), (3.35, 1.2)])
        c.lathe(
            "FDAIFace",
            "black",
            u,
            v,
            [(3.35, 1.2), (2.35, 1.2), (2.35, 0.65), (2.65, 0.65), (2.65, CASE_BACK + 0.25), (0, CASE_BACK + 0.25), (0, CASE_BACK)],
        )
        _ball(parent, c, u, v, index)
        c.lathe("FDAICrystal", "glass", u, v, [(0, 0.94), (2.3, 0.94), (2.3, 1.0), (0, 1.0)])
        c.lathe("FDAIGasket", "black", u, v, [(2.25, 0.88), (2.39, 0.88), (2.39, 1.10), (2.25, 1.10), (2.25, 0.88)])
        for degrees in range(0, 360, 5):
            a = math.radians(degrees)
            r0, r1 = (2.42, 2.59) if degrees % 30 == 0 else (2.48, 2.59)
            c.line(
                "FDAIScales", "white", (u + r0 * math.sin(a), v + r0 * math.cos(a)), (u + r1 * math.sin(a), v + r1 * math.cos(a)), 0.025, 1.2 + PRINT
            )
            if degrees % 30 == 0:
                c.text(str(degrees // 10), u + 2.72 * math.sin(a), v + 2.72 * math.cos(a), 0.13, 1.2 + PRINT, "white", "FDAIScaleNumbers")
        # The fixed crosshair, three rate/error scales and triangular indices
        # follow SC101 SCS-2100D. All needles use a static central reference.
        c.line("FDAIIndex", "white", (u - 1.9, v), (u + 1.9, v), 0.035, 1.08)
        c.line("FDAIIndex", "white", (u, v - 1.9), (u, v + 1.9), 0.035, 1.08)
        for sign in (-1, 1):
            c.line("FDAIErrorScale", "white", (u - 1.55, v + sign * 2.98), (u + 1.55, v + sign * 2.98), 0.16, 1.2 + PRINT)
            for k in range(-5, 6):
                c.line("FDAIErrorTicks", "black", (u + k * 0.28, v + sign * 2.90), (u + k * 0.28, v + sign * 3.06), 0.025, 1.2 + 2 * PRINT)
        c.line("FDAIErrorScale", "white", (u + 2.98, v - 1.55), (u + 2.98, v + 1.55), 0.16, 1.2 + PRINT)
        for k in range(-5, 6):
            c.line("FDAIErrorTicks", "black", (u + 2.90, v + k * 0.28), (u + 3.06, v + k * 0.28), 0.025, 1.2 + 2 * PRINT)
        for x, y, angle in ((0, 2.98, 0), (0, -2.98, math.pi), (2.98, 0, -math.pi / 2)):
            # Separate opposed rate and attitude-error pointers, both centred
            # for the exhibit reference. They meet at a point, never overlap.
            for side in (-1, 1):
                tri = [(-0.12, 0.30 * side), (0.12, 0.30 * side), (0, 0)]
                points = [
                    (
                        (u + x + px * math.cos(angle) - py * math.sin(angle)) * IN,
                        (v + y + px * math.sin(angle) + py * math.cos(angle)) * IN,
                        (1.2 + 3 * PRINT) * IN,
                    )
                    for px, py in tri
                ]
                c.mesh("FDAIErrorIndices", "black").add(points, [(0, 2, 1)] if side == 1 else [(0, 1, 2)], matrix=c.frame(0, 0))
    objects = c.flush()
    _validate(parent, base, console_clearance=True)
    return objects


def equipment(parent, base, *, spacecraft=101):
    """The main-panel equipment layout; no borrowed later side consoles."""
    if not interior():
        return
    source = json.loads((FOLDER / "apollo-main-console.json").read_text())
    layout = _layout(spacecraft)
    c = Console(parent, base, source, layout)
    parent["geometry_confidence"] = "estimated"
    parent["source"] = layout["source"]["title"]

    def dial(item):
        u, v = c.xy(*item["at"])
        radius = c.size(item["radius_px"])
        c.lathe("GaugeCases", "black", u, v, [(0, -0.35), (radius, -0.35), (radius, FACE), (0, FACE)])
        c.lathe(
            "GaugeRims",
            "metal",
            u,
            v,
            [(radius * 0.91, 0.10), (radius * 1.02, 0.10), (radius * 1.02, 0.50), (radius * 0.91, 0.50), (radius * 0.91, 0.10)],
        )
        for j in range(25):
            a = math.radians(-135 + j * 270 / 24)
            r0 = radius * (0.68 if j % 4 == 0 else 0.76)
            c.line(
                "GaugeScales",
                "white",
                (u + r0 * math.sin(a), v + r0 * math.cos(a)),
                (u + radius * 0.84 * math.sin(a), v + radius * 0.84 * math.cos(a)),
                0.025,
                FACE + PRINT,
            )
        c.line("GaugeNeedles", "white", (u - radius * 0.12, v - radius * 0.1), (u + radius * 0.45, v + radius * 0.56), 0.045, FACE + 3 * PRINT)
        c.text(item["label"], u, v - radius - 0.22, 0.085)
        c.lathe("GaugeCrystals", "glass", u, v, [(0, 0.42), (radius * 0.93, 0.42), (radius * 0.93, 0.44), (0, 0.44)])

    for item in layout["round_gauges"]:
        dial(item)
    for bank in layout["tape_banks"]:
        width, height = c.size(bank["width_px"]), c.size(bank["height_px"])
        for x in bank["xs"]:
            u, v = c.xy(x, bank["y"])
            c.box("TapeCases", "metal", u, v, width + 0.12, height + 0.12, -0.35, FACE)
            c.box("TapeFaces", "black", u, v, width, height, FACE - 0.025, FACE + PRINT + 0.05)
            for j in range(11):
                y = v + (j / 10 - 0.5) * height * 0.9
                c.line("TapeScales", "white", (u - width * 0.42, y), (u - width * (0.1 if j % 5 == 0 else 0.25), y), 0.025, FACE + 2 * PRINT + 0.05)
            c.line("TapeIndices", "white", (u + width * 0.1, v), (u + width * 0.42, v), 0.05, FACE + 3 * PRINT + 0.05)
        u, v = c.xy(sum(bank["xs"]) / len(bank["xs"]), bank["y"] - bank["height_px"] / 2 - 6)
        c.text(bank["label"], u, v, 0.09)
    for kind in ("toggle_rows", "rotary_rows"):
        for row in layout[kind]:
            for x in row["xs"]:
                if spacecraft == 108 and row["id"] == "telemetry" and x in (1512, 1533):
                    continue  # These two switches are drawn on the flight-specific telemetry power panel.
                u, v = c.xy(x, row["y"])
                c.box("SwitchBases", "panel", u, v, 0.74, 0.78, -0.10, 0.14)
                c.lathe("SwitchNuts", "metal", u, v, [(0, 0.10), (0.21, 0.10), (0.21, 0.30), (0, 0.30)], segs=6)
                if kind == "toggle_rows":
                    c.lathe("SwitchStems", "metal", u, v, [(0, 0.26), (0.055, 0.26), (0.055, 0.72), (0, 0.72)], segs=12)
                    c.box("SwitchPaddles", "white", u, v, 0.25, 0.12, 0.67, 0.80)
                else:
                    c.lathe("RotaryKnobs", "black", u, v, [(0, 0.26), (0.25, 0.26), (0.25, 0.65), (0, 0.65)], segs=16)
                    c.line("RotaryPointers", "white", (u, v), (u, v + 0.20), 0.035, 0.65 + PRINT)
            if row["label"]:
                u, v = c.xy(sum(row["xs"]) / len(row["xs"]), row["y"] - 13)
                c.text(row["label"], u, v, 0.09)

    # Panel 3 has four indication meters (M5–M8), each with a short pointer
    # between CLOSED and OPEN. They are separate from the crew's controls.
    if valves := layout.get("valve_meters"):
        for x in valves["xs"]:
            u, v = c.xy(x, valves["y"])
            c.lathe("ValveMeters", "metal", u, v, [(0, -0.15), (0.40, -0.15), (0.40, 0.18), (0, 0.18)])
            c.line("ValvePointers", "black", (u - 0.23, v + 0.18), (u + 0.2, v - 0.11), 0.07, 0.18 + PRINT)
        u, v = c.xy(sum(valves["xs"]) / len(valves["xs"]), valves["y"] - 15)
        c.text("SPS ENGINE INJECTOR VALVES", u, v, 0.09)

    # The CM-103 drawing shows broad selector knobs and the two antenna pointing
    # controls in the lower extension of panel 2. The dial poses are illustrative.
    for item in layout.get("selectors", []):
        u, v = c.xy(*item["at"])
        c.lathe("SelectorKnobs", "panel", u, v, [(0, -0.15), (0.85, -0.15), (0.85, 0.19), (0.42, 0.4), (0.42, 0.7), (0, 0.7)], segs=32)
        c.line("SelectorIndices", "black", (u, v), (u, v + 0.35), 0.055, 0.7 + PRINT)
        c.text(item["label"], u, v + 1.10, 0.09)

    for item in layout.get("thumbwheels", []):
        u, v = c.xy(*item["at"])
        c.box("SquelchBody", "panel", u, v, 0.94, 1.62, -0.20, 0.16)
        c.box("SquelchWindow", "black", u, v, 0.52, 1.04, 0.14, 0.23)
        c.box("SquelchWheel", "white", u, v, 0.18, 0.92, 0.21, 0.30)
        for j in range(-3, 4):
            c.line("SquelchRibs", "ink", (u - 0.09, v + j * 0.12), (u, v + j * 0.12), 0.018, 0.30 + PRINT)
        c.text(item["label"], u, v + 0.89, 0.085)

    # Forty-eight physical lenses, including the blank positions shown in the
    # CM101 drawing. No warning light or instrument reading is claimed active.
    warning = layout["caution_warning"]
    for block, field in enumerate(("left", "right")):
        for row, labels in enumerate(warning[field]):
            for col, legend in enumerate(labels):
                u, v = c.xy(warning["x0"] + block * warning["gap"] + col * warning["dx"], warning["y0"] + row * warning["dy"])
                width, height = (c.size(x) for x in warning["cell_px"])
                c.box("WarningFrames", "metal", u, v, width, height, -0.15, FACE)
                c.box("WarningLenses", "lens", u, v, width - 0.07, height - 0.06, FACE - 0.025, FACE + PRINT + 0.05)
                c.text(legend, u, v + 0.04, 0.065, FACE + 2 * PRINT + 0.05, "white", "WarningLegends")

    # Both entry monitors have the same arrangement. Register the local facade
    # to its centre above the left FDAI in each drawing crop.
    def ems(x, y):
        return c.xy(x - 23, y + 13) if spacecraft >= 103 else c.xy(x, y)

    u, v = ems(431, 286)
    width, height = c.size(196), c.size(155)
    c.box("EMSCase", "panel", u, v, width, height, -1.0, FACE)
    for x, y, w, h in ((447, 264, 88, 78), (446, 344, 85, 14)):
        a, b = ems(x, y)
        c.box("EMSWindows", "black", a, b, c.size(w), c.size(h), FACE - 0.025, FACE + PRINT + 0.05)
    for j in range(7):
        a, b = ems(410, 230 + j * 10)
        d, e = ems(486, 230 + j * 10)
        c.line("EMSGraph", "white", (a, b), (d, e), 0.015, FACE + 2 * PRINT + 0.05)
    for j in range(7):
        a, b = ems(412 + j * 12, 228)
        d, e = ems(412 + j * 12, 300)
        c.line("EMSGraph", "white", (a, b), (d, e), 0.015, FACE + 2 * PRINT + 0.05)
    c.text("ENTRY MONITOR", u, v + height / 2 - 0.22, 0.12, FACE + PRINT)
    for x, y, label in ((367, 334, "ROLL"), (360, 238, "ENTRY")):
        a, b = ems(x, y)
        c.lathe(
            "EMSControls", "black", a, b, [(0, FACE - 0.025), (c.size(18), FACE - 0.025), (c.size(18), FACE + PRINT + 0.1), (0, FACE + PRINT + 0.1)]
        )
        c.text(label, a, b, 0.11, FACE + 2 * PRINT + 0.1, "white", "EMSLegends")
    alarms = ((267, 352), (470, 404), (1529, 426)) if spacecraft >= 103 else ((287, 339), (492, 391), (1547, 415))
    for (x, y), label in zip(alarms, ("MASTER\nALARM", "ABORT", "MASTER\nALARM")):
        a, b = c.xy(x, y)
        c.box("AlarmHousings", "metal", a, b, 0.95, 0.95, -0.15, FACE)
        c.box("AlarmFaces", "white", a, b, 0.82, 0.82, FACE - 0.025, FACE + PRINT + 0.05)
        c.text(label, a, b + 0.08, 0.1, FACE + 2 * PRINT + 0.05, "ink", "AlarmLegends")
    # The eight-position (four-hour, two-minute, two-second) mission-timer
    # window is intentionally unlit. Its electronic internals are omitted.
    u, v = c.xy(982, 241) if spacecraft >= 103 else c.xy(1002, 225)
    c.box("MissionTimerCase", "metal", u, v, c.size(95), c.size(23), -0.35, FACE)
    c.box("MissionTimerWindow", "black", u, v, c.size(89), c.size(18), FACE - 0.025, FACE + PRINT + 0.05)
    c.text("HOURS       MIN    SEC", u, v + c.size(17), 0.08)
    c.text("MISSION TIMER", u, v + c.size(27), 0.09)
    objects = c.flush()
    _validate(parent, base)
    return objects


def telemetry_power(parent, base):
    """Panel 3 lower row, SCE and PMP, as drawn in the Apollo 12 Flight Journal panel diagram."""
    if not interior():
        return
    source = json.loads((FOLDER / "apollo-main-console.json").read_text())
    c = Console(parent, base, source, _layout(108))
    c.prefix = "CM108_TelemetryPower"
    # Use the two existing registered control places in the CM-106 drawing.
    # The housing and toggle dimensions are estimates. Both toggles are in NORMAL for launch.
    u, v = c.xy(1512, 736)
    right, _ = c.xy(1533, 736)
    middle = (u + right) / 2
    c.box("Panel", "panel", middle, v, right - u + 0.94, 1.90, -0.12, 0.08)
    for x, label in ((u, "SCE"), (right, "PMP")):
        c.lathe("Nuts", "metal", x, v, [(0, 0.10), (0.21, 0.10), (0.21, 0.32), (0, 0.32)], segs=6)
        lever = c.mesh("Toggle", "metal")
        f = c.frame(x, v, 0.32)
        lever.tube(f.translation, f @ Vector((0, 0.25 * IN, 0.43 * IN)), 0.07 * IN, segs=12)
        c.text(label, x, v + 0.69, 0.12, w=0.08 + PRINT)
    c.text("NORM", middle, v + 0.44, 0.11, w=0.08 + PRINT)
    c.text("AUX", middle, v - 0.55, 0.11, w=0.08 + PRINT)
    c.flush()
    _validate(parent, base)
